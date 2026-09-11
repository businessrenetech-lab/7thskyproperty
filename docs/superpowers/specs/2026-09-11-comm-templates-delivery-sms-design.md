# Message Templates, Delivery Status, SMS & Suppression — design spec

**Date:** 2026-09-11 · **Branch:** `air-conditioning/phase-0-duplicate` (not merged)
**Plan:** `PROPERTY_SALES_SAAS_PHASED_PLAN.md` §Phase 5 (templates, delivery status, tested email/SMS providers, suppression preferences).
**Status:** design approved in brainstorming; awaiting spec review before the implementation plan.

**Phase 5, sub-project B of 3** (A = sales inbox ✅; C = service coordination).
Make the sales inbox's messaging production-grade: reusable **message
templates**, **persisted delivery status** on every sent message, wire the inbox
**SMS** channel to the existing provider, and honour a per-contact
**suppression** preference. A full email-template **builder** (rich/visual) is
explicitly a **later** scope item; this sub-project ships lightweight
subject+body templates with `{{placeholders}}`.

Verified against current source 2026-09-11. `communication.service` has
`sendEmail(to,subject,html,attachments,fromAccount)` and `sendSMS(to,message)` —
both config-driven (getConfig), both fall back to `[SIMULATION]`, both return
`{ success, simulated?, error?, message? }`. The sales inbox
(`salesInbox.controller`) currently ignores those results (transient `delivery`
hint only), and its `sms` channel just logs (`sms_logged`). `Communication` has
NO delivery columns. No `message_templates` table exists. `Contact` has
`preferred_contact_method` but no do-not-contact flags.

---

## 1. Goal

When staff reply/compose in the Sales Inbox, they can insert a template (subject
+ body with placeholders filled from the thread), and every dispatched message
records whether it actually sent (sent/simulated/failed, provider id, error) —
visible per message. SMS replies go through the real BulkSMSBD provider, and a
contact flagged do-not-email / do-not-sms is never dispatched to (logged as
`suppressed`).

## 2. Scope

**In:**
- **Message templates:** `message_templates` table (`id, branch_id, name,
  channel ENUM('email','sms','any'), scope STRING default 'sales', subject, body,
  is_active, created_by, timestamps`) + CRUD at `/api/message-templates`
  (list?scope&channel / create / update / delete). A `render(template, ctx)`
  helper fills `{{contact_name}}`, `{{property}}`, `{{agent}}`, `{{property_code}}`
  from the thread context (unknown tokens → blank). Composer picker in the Sales
  Inbox loads sales templates, fills subject/body on pick (staff edit before send).
- **Persisted delivery status:** additive columns on `communications` —
  `delivery_status ENUM('pending','sent','simulated','failed','suppressed','logged')`,
  `provider_message_id STRING`, `delivery_error STRING`, `sent_at DATE`. The sales
  inbox reply/compose capture `sendEmail`/`sendSMS`'s structured result and stamp
  them; the thread returns them per message; the UI shows a small status chip.
- **Wire SMS:** the sales inbox `sms` channel (client visibility) calls
  `sendSMS(to.phone, body)`, capturing status like email. No phone → `logged`.
- **Suppression:** additive `Contact.do_not_email` / `do_not_sms` booleans
  (whitelisted in the contact update). On a client send, if the recipient contact
  is suppressed for that channel, skip dispatch and record `delivery_status:'suppressed'`.
- **Reuse across senders:** a tiny `dispatchAndRecord(row, channel, to, {subject,
  body})` helper in the sales inbox (or a small shared module) that calls the
  right provider, maps the result → the four columns, and updates the
  Communication row — used by both reply and compose.

**Out (deferred / non-goals):**
- **Email template builder** (rich/visual, blocks, drag-drop) — later scope
  (user-noted). Only plain subject+body templates here.
- Inbound reply ingestion, retries/scheduling, delivery webhooks/receipts →
  future (the columns support a later retry table without rework).
- Applying templates/delivery to the **rental** inbox or campaign sender (those
  keep their current behaviour; this is sales-inbox-scoped).
- WhatsApp provider.

## 3. Delivery-status mapping

From the provider result:
- `{ success:true, simulated:true }` → `simulated` (no real send configured).
- `{ success:true }` (real) → `sent`, `provider_message_id` from the result where
  present (`message`/`response`).
- `{ success:false }` or thrown → `failed`, `delivery_error` = the message.
- internal-visibility message → not dispatched, `delivery_status:'logged'`
  (unchanged behaviour, just now persisted).
- suppressed recipient → `suppressed`, no dispatch.
`sent_at` set when a real/simulated dispatch is attempted.

## 4. Backend

- **Migration 0113:** `message_templates` table (+ index branch_id, scope);
  `communications` += `delivery_status`/`provider_message_id`/`delivery_error`/
  `sent_at`; `contacts` += `do_not_email`/`do_not_sms` (BOOLEAN default false).
- **Models:** new `MessageTemplate`; `Communication` + `Contact` fields;
  `CONTACT_FIELDS` += the two flags.
- **`messageTemplate.controller` + routes** `/api/message-templates` (CRUD, branch
  + scope scoped), mirroring the Buyer Mandates CRUD shape.
- **salesInbox.controller:** add `renderTemplate` + `dispatchAndRecord`; `reply`
  and `compose` use them — resolve the recipient contact (for suppression),
  dispatch via email/SMS, and persist the four delivery columns on the created
  Communication; `thread` returns them per message. `writeOutbound` sets
  `delivery_status:'pending'` initially, then the row is updated post-dispatch.

## 5. Frontend (Sales Inbox composer)

`SalesInbox.jsx`: in the reply composer, add a **template picker**
(`GET /message-templates?scope=sales&channel=<current>`) that fills subject/body
on select (rendered against the open thread's context); and render a **delivery
status chip** on each outbound message in the thread (sent=green, simulated=grey
"Simulated", failed=red with the error tooltip, suppressed=amber, logged=muted).
A small "Templates" management affordance can live on a simple settings list
(or defer the management UI and seed a few templates) — **the picker is in
scope; a full template-admin screen is optional this sub-project** (CRUD endpoint
exists regardless).

## 6. Testing & verification

- **Migration 0113:** table + all columns added; `down` reverses.
- **Templates (live):** create a sales email template with `{{contact_name}}`;
  `GET /message-templates?scope=sales` lists it; the inbox picker fills a rendered
  subject/body for a chosen thread.
- **Delivery status (live):** an email reply on a thread with a contact →
  Communication row gets `delivery_status` (`simulated` in dev, or `sent`) +
  `sent_at`; a reply to a bad address/forced failure → `failed` + `delivery_error`;
  an internal note → `logged`; the thread API returns these and the UI shows the chip.
- **SMS (live):** a client `sms` reply on a thread with a phone → `sendSMS` called,
  status recorded (`simulated` in dev); no phone → `logged`.
- **Suppression (live):** set a contact `do_not_email` → a client email reply is
  not dispatched and records `suppressed`; `do_not_sms` likewise for SMS.
- **Non-regression:** rental inbox, campaign sender, and the raw `sendEmail`/
  `sendSMS` signatures are unchanged; backend `npm test` (7+5+27) + `npm run
  test:full` (28/0) green; build clean.
- **Acceptance:** templated, delivery-tracked email/SMS from the sales inbox with
  suppression honoured; simulation still works with no provider configured.

## 7. File plan

**Backend (new):** `migrations/0113-comm-templates-delivery.js`,
`models/MessageTemplate.js`, `controllers/messageTemplate.controller.js`,
`routes/messageTemplate.routes.js`.
**Backend (modify):** `models/Communication.js` (+4 fields), `models/Contact.js`
(+2 flags), `controllers/contact.controller.js` (`CONTACT_FIELDS`),
`controllers/salesInbox.controller.js` (renderTemplate + dispatchAndRecord +
suppression; reply/compose/thread), `server.js` + `routes/manifest.js` (mount
`/api/message-templates`).
**Frontend (modify):** `admin-portal/src/screens/sales/SalesInbox.jsx` (template
picker + delivery-status chips).
**Schema:** migration 0113 (1 table + 6 columns).

## 8. Risks & non-goals

- **Provider seam unchanged:** `sendEmail`/`sendSMS` keep their signatures; this
  only *captures* their existing return values — no risk to other senders.
- **Simulation-safe:** with no SMTP/SMS config, sends record `simulated` and the
  UI shows it plainly (no false "sent").
- **Suppression is a send-time guard**, not a hard block on logging — staff still
  see the attempt recorded as `suppressed` so nothing silently vanishes.
- **Additive columns default to today's behaviour** (`delivery_status` nullable/
  'pending', flags false) — existing comms and the rental inbox unaffected.
- **Email builder deferred** to a later scope per the user; templates here are
  plain subject+body with `{{placeholders}}`.
