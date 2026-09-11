# Message Templates + Delivery Status + SMS + Suppression Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Production-grade sales-inbox messaging — reusable message templates (with placeholders), persisted per-message delivery status captured from the real send path, the inbox SMS channel wired to the existing provider, and per-contact suppression honoured on send.

**Architecture:** A `message_templates` table + CRUD + a render helper; additive delivery columns on `communications` and do-not-contact flags on `contacts`; a `dispatchAndRecord` helper in `salesInbox.controller` that calls the existing `sendEmail`/`sendSMS` and persists their structured results. Provider signatures unchanged; rental inbox + campaign sender untouched.

**Tech Stack:** Node/Express/Sequelize (`:50001`), React 18 + Vite. Verification = migrate + live curls + `npm run build` + browser + harnesses.

**Spec:** `docs/superpowers/specs/2026-09-11-comm-templates-delivery-sms-design.md`

## Global Constraints

- **Provider seam unchanged:** do NOT change `sendEmail`/`sendSMS` signatures; only capture their existing `{success,simulated,error,message,response}` results.
- **Simulation-safe:** no SMTP/SMS config → record `simulated`, never a false `sent`.
- **Additive schema** (migration 0113) with `down`; defaults preserve today's behaviour. Rental inbox + campaign sender + generic communications untouched.
- **Sales-inbox-scoped:** all send changes live in `salesInbox.controller`; templates are `scope:'sales'`.
- **Delivery mapping** (from provider result): `simulated`→simulated; real success→sent (+provider_message_id); failure/throw→failed (+delivery_error); internal→logged; suppressed recipient→suppressed. `sent_at` on any dispatch attempt.
- Branch `air-conditioning/phase-0-duplicate`. Commit after each task. Footer:
  `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.
- Backend `npm test` (7+5+27) + `npm run test:full` (28/0) green; build clean.

## File Structure

- `backend/migrations/0113-comm-templates-delivery.js` — **create**: table + 6 columns.
- `backend/models/MessageTemplate.js` — **create**.
- `backend/models/Communication.js` — **modify**: +4 delivery fields.
- `backend/models/Contact.js` — **modify**: +`do_not_email`,+`do_not_sms`.
- `backend/controllers/contact.controller.js` — **modify**: whitelist the 2 flags.
- `backend/controllers/messageTemplate.controller.js` + `backend/routes/messageTemplate.routes.js` — **create**: CRUD.
- `backend/controllers/salesInbox.controller.js` — **modify**: renderTemplate + dispatchAndRecord + suppression; reply/compose/thread stamp + return delivery.
- `backend/server.js` + `backend/routes/manifest.js` — **modify**: mount `/api/message-templates`.
- `admin-portal/src/screens/sales/SalesInbox.jsx` — **modify**: template picker + delivery chips.

**Schema:** migration 0113.

---

### Task 1: Migration + models + whitelist

**Files:** Create `backend/migrations/0113-comm-templates-delivery.js`, `backend/models/MessageTemplate.js`; modify `backend/models/Communication.js`, `backend/models/Contact.js`, `backend/controllers/contact.controller.js`.

- [ ] **Step 1: Migration** (guarded):
```js
'use strict';
module.exports = {
  up: async (q, S) => {
    if (!(await q.describeTable('message_templates').catch(() => null))) {
      await q.createTable('message_templates', {
        id: { type: S.INTEGER, autoIncrement: true, primaryKey: true },
        branch_id: { type: S.INTEGER, allowNull: false },
        name: { type: S.STRING, allowNull: false },
        channel: { type: S.ENUM('email', 'sms', 'any'), defaultValue: 'any' },
        scope: { type: S.STRING(40), allowNull: false, defaultValue: 'sales' },
        subject: { type: S.STRING, allowNull: true },
        body: { type: S.TEXT, allowNull: false },
        is_active: { type: S.BOOLEAN, defaultValue: true },
        created_by: { type: S.INTEGER, allowNull: true },
        created_at: { type: S.DATE, defaultValue: S.literal('CURRENT_TIMESTAMP') },
        updated_at: { type: S.DATE, defaultValue: S.literal('CURRENT_TIMESTAMP') },
      });
      await q.addIndex('message_templates', ['branch_id', 'scope']);
    }
    const c = await q.describeTable('communications');
    if (!c.delivery_status) await q.addColumn('communications', 'delivery_status', { type: S.ENUM('pending', 'sent', 'simulated', 'failed', 'suppressed', 'logged'), allowNull: true });
    if (!c.provider_message_id) await q.addColumn('communications', 'provider_message_id', { type: S.STRING, allowNull: true });
    if (!c.delivery_error) await q.addColumn('communications', 'delivery_error', { type: S.STRING, allowNull: true });
    if (!c.sent_at) await q.addColumn('communications', 'sent_at', { type: S.DATE, allowNull: true });
    const ct = await q.describeTable('contacts');
    if (!ct.do_not_email) await q.addColumn('contacts', 'do_not_email', { type: S.BOOLEAN, defaultValue: false });
    if (!ct.do_not_sms) await q.addColumn('contacts', 'do_not_sms', { type: S.BOOLEAN, defaultValue: false });
  },
  down: async (q) => {
    await q.dropTable('message_templates').catch(() => {});
    for (const col of ['delivery_status', 'provider_message_id', 'delivery_error', 'sent_at']) await q.removeColumn('communications', col).catch(() => {});
    for (const col of ['do_not_email', 'do_not_sms']) await q.removeColumn('contacts', col).catch(() => {});
  },
};
```

- [ ] **Step 2: MessageTemplate model.**
```js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/db.config');
const MessageTemplate = sequelize.define('MessageTemplate', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  branch_id: { type: DataTypes.INTEGER, allowNull: false },
  name: { type: DataTypes.STRING, allowNull: false },
  channel: { type: DataTypes.ENUM('email', 'sms', 'any'), defaultValue: 'any' },
  scope: { type: DataTypes.STRING(40), defaultValue: 'sales' },
  subject: DataTypes.STRING, body: { type: DataTypes.TEXT, allowNull: false },
  is_active: { type: DataTypes.BOOLEAN, defaultValue: true }, created_by: DataTypes.INTEGER,
}, { tableName: 'message_templates', underscored: true });
module.exports = MessageTemplate;
```

- [ ] **Step 3: Communication + Contact fields.** Communication += `delivery_status: DataTypes.ENUM('pending','sent','simulated','failed','suppressed','logged'), provider_message_id: DataTypes.STRING, delivery_error: DataTypes.STRING, sent_at: DataTypes.DATE`. Contact += `do_not_email: { type: DataTypes.BOOLEAN, defaultValue: false }, do_not_sms: { type: DataTypes.BOOLEAN, defaultValue: false }`. Add `'do_not_email','do_not_sms'` to `CONTACT_FIELDS`.

- [ ] **Step 4: Migrate + verify.** `db:migrate` → 0113; `node -e` confirm `message_templates` exists + `communications` has the 4 cols + `contacts` has the 2 flags.

- [ ] **Step 5: Commit** — `feat(comms): migration 0113 — message_templates + delivery cols + suppression flags`

---

### Task 2: Message-template CRUD

**Files:** Create `backend/controllers/messageTemplate.controller.js`, `backend/routes/messageTemplate.routes.js`; modify `backend/server.js`, `backend/routes/manifest.js`.

**Interfaces:** `GET /api/message-templates?scope&channel`, `POST`, `PUT /:id`, `DELETE /:id`.

- [ ] **Step 1: Controller** (mirror the Buyer Mandates CRUD; branch-scoped, `pick`):
```js
const MessageTemplate = require('../models/MessageTemplate');
const { asyncHandler, branchScope, resolveBranchId, pick } = require('../utils/controllerHelpers');
const FIELDS = ['name', 'channel', 'scope', 'subject', 'body', 'is_active'];
exports.list = asyncHandler(async (req, res) => {
  const where = { ...branchScope(req) };
  if (req.query.scope) where.scope = req.query.scope;
  if (req.query.channel && req.query.channel !== 'any') where.channel = [req.query.channel, 'any'];
  res.json({ data: await MessageTemplate.findAll({ where, order: [['name', 'ASC']] }) });
});
exports.create = asyncHandler(async (req, res) => {
  const b = pick(req.body, FIELDS);
  if (!b.name || !b.body) return res.status(400).json({ error: 'name and body are required.' });
  res.status(201).json({ data: await MessageTemplate.create({ ...b, scope: b.scope || 'sales', branch_id: resolveBranchId(req, req.body.branch_id), created_by: req.user?.id || null }) });
});
exports.update = asyncHandler(async (req, res) => {
  const row = await MessageTemplate.findOne({ where: { id: req.params.id, ...branchScope(req) } });
  if (!row) return res.status(404).json({ error: 'Template not found.' });
  await row.update(pick(req.body, FIELDS)); res.json({ data: row });
});
exports.remove = asyncHandler(async (req, res) => {
  const n = await MessageTemplate.destroy({ where: { id: req.params.id, ...branchScope(req) } });
  if (!n) return res.status(404).json({ error: 'Template not found.' }); res.json({ ok: true });
});
```

- [ ] **Step 2: Routes + mount.** `messageTemplate.routes.js`: authMiddleware + CRM/sales roles; `GET /`, `POST /`, `PUT /:id`, `DELETE /:id`. Mount `/api/message-templates` in server.js + manifest.js (top-level, order irrelevant). Load-check + restart.

- [ ] **Step 3: Verify (live).** `POST /api/message-templates {name:'Viewing follow-up',channel:'email',subject:'About {{property}}',body:'Hi {{contact_name}}, ...'}` → 201; `GET ?scope=sales` lists it; `GET ?scope=sales&channel=email` includes email+any; `PUT`/`DELETE` work. Paste.

- [ ] **Step 4: Commit** — `feat(comms): message-template CRUD (/api/message-templates)`

---

### Task 3: Dispatch-and-record + suppression + render in salesInbox

**Files:** Modify `backend/controllers/salesInbox.controller.js`.

- [ ] **Step 1: Helpers.** Add near the top:
```js
const Contact = require('../models/Contact'); // already imported — keep single
function renderTemplate(str, ctx) {
  return String(str || '').replace(/\{\{(\w+)\}\}/g, (_, k) => (ctx[k] != null ? String(ctx[k]) : ''));
}
// Dispatch via the right provider and map the result → delivery columns.
async function dispatchAndRecord(row, { channel, to, subject, body, visibility, suppressed }) {
  const upd = { sent_at: new Date() };
  if (visibility === 'internal') { upd.delivery_status = 'logged'; upd.sent_at = null; }
  else if (suppressed) { upd.delivery_status = 'suppressed'; upd.sent_at = null; }
  else if (channel === 'email') {
    if (!to.email) { upd.delivery_status = 'logged'; upd.sent_at = null; }
    else {
      try { const { sendEmail } = require('../services/communication.service'); const r = await sendEmail(to.email, subject || 'Seventh Sky Residential Property Services', `<p>${String(body).replace(/\n/g, '<br>')}</p>`);
        if (r && r.success) { upd.delivery_status = r.simulated ? 'simulated' : 'sent'; upd.provider_message_id = r.message || null; }
        else { upd.delivery_status = 'failed'; upd.delivery_error = (r && r.error) || 'send failed'; }
      } catch (e) { upd.delivery_status = 'failed'; upd.delivery_error = e.message; }
    }
  } else if (channel === 'sms') {
    if (!to.phone) { upd.delivery_status = 'logged'; upd.sent_at = null; }
    else {
      try { const { sendSMS } = require('../services/communication.service'); const r = await sendSMS(to.phone, String(body));
        if (r && r.success) { upd.delivery_status = r.simulated ? 'simulated' : 'sent'; upd.provider_message_id = (r.response && (r.response.message_id || JSON.stringify(r.response))) || null; }
        else { upd.delivery_status = 'failed'; upd.delivery_error = (r && r.error) || 'sms failed'; }
      } catch (e) { upd.delivery_status = 'failed'; upd.delivery_error = e.message; }
    }
  } else { upd.delivery_status = 'logged'; upd.sent_at = null; }
  await row.update(upd);
  return upd.delivery_status;
}
```

- [ ] **Step 2: Recipient contact for suppression.** Extend `recipientOf` (or add a lookup) so a sales_enquiry recipient resolves its `Contact` (`enquiry.contact_id`) to read `do_not_email`/`do_not_sms`; property/deal recipients have no single contact → not suppressed. Provide `{ email, phone, name, suppress_email, suppress_sms }`.

- [ ] **Step 3: Rewrite `reply`.** Resolve key + recipient; compute `suppressed = channel==='email' ? recipient.suppress_email : channel==='sms' ? recipient.suppress_sms : false`; `writeOutbound(...)` (delivery_status defaults 'pending'); `const status = await dispatchAndRecord(row, { channel, to: recipient, subject, body, visibility, suppressed })`; mark inbound read + bump enquiry stage as before; `res.json({ data: row, delivery: status })`. Remove the old inline sendEmail/`delivery` logic.

- [ ] **Step 4: Rewrite `compose`** the same way (respecting `is_draft` → `delivery_status:'pending'`, no dispatch).

- [ ] **Step 5: `thread` returns delivery.** Add `delivery_status, provider_message_id, delivery_error, sent_at` to each message in the `thread` map.

- [ ] **Step 6: Verify (live).** Restart. On `sales_enquiry:7` (has an email): email reply → row `delivery_status` = `simulated` (dev) or `sent`, `sent_at` set; internal reply → `logged`; set the enquiry's contact `do_not_email=true` → email reply → `suppressed` (no dispatch); `sms` reply with a phone → `simulated`/`sent`; `thread` returns the fields. Paste each `delivery_status`. Clean up test comms after.

- [ ] **Step 7: Commit** — `feat(sales-inbox): dispatch-and-record delivery status + SMS wiring + suppression`

---

### Task 4: Frontend — template picker + delivery chips

**Files:** Modify `admin-portal/src/screens/sales/SalesInbox.jsx`.

- [ ] **Step 1: Template picker.** In the composer, add a `<select>` "Insert template…" populated from `GET /message-templates?scope=sales&channel=<channel>`; on select, render its subject/body against the open thread context (`{ contact_name: thread.context.name, property: thread.context.property?.title, property_code: thread.context.property?.property_code, agent: <current user name> }`) client-side (same `{{token}}` replace) and set the reply body (+ a subject state if email). Refetch templates when channel changes.

- [ ] **Step 2: Delivery chips.** On each outbound thread message, render a chip from `m.delivery_status`: sent→green "Sent", simulated→grey "Simulated", failed→red "Failed" (title=`m.delivery_error`), suppressed→amber "Suppressed", logged→muted "Logged". (Messages without a status — pre-existing — show nothing.)

- [ ] **Step 3: Build + browser.** `npm run build` clean. Open the Sales Inbox → a thread: pick a template → the body fills rendered; send an email reply → the message shows a "Simulated"/"Sent" chip; an internal note → "Logged". Screenshot.

- [ ] **Step 4: Commit** — `feat(sales-inbox): template picker + delivery-status chips`

---

### Task 5: End-to-end verification + wrap-up

- [ ] **Step 1: Harnesses.** `cd backend && npm test` → 7+5+27; `npm run test:full` → 28/0.
- [ ] **Step 2: Non-regression:** rental inbox + campaign send unaffected; `sendEmail`/`sendSMS` signatures unchanged (grep). Suppression flags save through the contact update.
- [ ] **Step 3: Rebuild dist + work-log.** `admin-portal npm run build`; append an AGENT_WORK_LOG COMPLETED entry (templates + delivery status + SMS wiring + suppression; email builder deferred; Phase-5 sub-project B); `git add admin-portal/dist AGENT_WORK_LOG.md`.
- [ ] **Step 4: Commit** — `chore(comms): work-log + rebuild dist; Phase-5 sub-project B done`

---

## Self-Review

**Spec coverage:** §2 migration → Task 1; templates CRUD → Task 2; delivery mapping + SMS + suppression + render → Task 3; §5 picker + chips → Task 4; §6 testing → Tasks 2–5. Deferred (email builder, inbound, retries, webhooks, rental/campaign) absent — correct.

**Placeholder scan:** the migration, model, CRUD controller, and the full `dispatchAndRecord` (with the exact result→column mapping) are real code; Task 3 Steps 3–4 specify rewriting reply/compose to use it (concrete transform of existing handlers), Task 4 the picker + chip mapping. No "TBD".

**Type consistency:** `dispatchAndRecord(row, {channel,to,subject,body,visibility,suppressed}) → status` used by reply + compose (Task 3). Delivery columns (`delivery_status` ENUM + provider_message_id + delivery_error + sent_at) consistent across migration, model, dispatchAndRecord, thread map, and the UI chip switch. `renderTemplate(str,ctx)` shared shape server (Task 3) + client (Task 4). `/api/message-templates` CRUD consistent controller↔routes↔picker. Suppression flags consistent migration↔Contact↔CONTACT_FIELDS↔recipientOf.

**Provider safety (explicit):** `communication.service` is not in the modify list; `sendEmail`/`sendSMS` are only *called* and their results captured. Additive columns default to today's behaviour → rental inbox, campaign sender, and existing comms unaffected. Task 5 Step 2 re-checks.
