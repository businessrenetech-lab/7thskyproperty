# Sales Inbox Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A dedicated residential-sales inbox over the existing `Communication` model — sales-enquiry + deal/property conversations, explicit thread participants, per-message internal/client visibility, and per-thread assignment — leaving the rental inbox untouched.

**Architecture:** A self-contained `salesInbox.controller` (its own resolveKey/writeOutbound/recipientOf for sales keys) at `/api/sales/inbox`, a new `comm_participants` table + additive `visibility`/`assigned_to` columns on `Communication`, and a `SalesInbox.jsx` two-pane screen. The rental `communications.controller` is NOT modified.

**Tech Stack:** Node/Express/Sequelize (`:50001`), React 18 + Vite. Verification = migrate + live curls + `npm run build` + browser + harnesses.

**Spec:** `docs/superpowers/specs/2026-09-11-sales-inbox-design.md`

## Global Constraints

- **Rental inbox untouched:** do NOT edit `communications.controller.js`; the sales inbox has its own key/resolve/write helpers. Generic `communications` endpoints keep working as-is.
- **Additive schema** (migration 0112: 1 table + 2 nullable columns) with `down`. `visibility` defaults `'client'`, `assigned_to` null → today's behaviour for all existing comms.
- **Internal messages never email** (logged only); client messages email/log as the rental reply does.
- **Route ordering:** mount `/api/sales/inbox` BEFORE `/api/sales` in server.js + manifest.js.
- **Branch-scoped** everywhere; thread keys: `sales_enquiry:<id>`, `property:<id>`, `deal:<id>`.
- Branch `air-conditioning/phase-0-duplicate`. Commit after each task. Footer:
  `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.
- Backend `npm test` (7+5+27) + `npm run test:full` (28/0) green; build clean.

## File Structure

- `backend/migrations/0112-sales-inbox.js` — **create**: comm_participants + 2 columns.
- `backend/models/CommParticipant.js` — **create**.
- `backend/models/Communication.js` — **modify**: +`visibility`, +`assigned_to`.
- `backend/controllers/salesInbox.controller.js` — **create**: inbox/thread/reply/compose/participants/assign.
- `backend/routes/salesInbox.routes.js` — **create**.
- `backend/server.js` + `backend/routes/manifest.js` — **modify**: mount before `/api/sales`.
- `admin-portal/src/screens/sales/SalesInbox.jsx` — **create**.
- `admin-portal/src/config/consoles.js` + `admin-portal/src/App.jsx` — **modify**: nav + route.

**Schema:** migration 0112.

---

### Task 1: Migration + models

**Files:** Create `backend/migrations/0112-sales-inbox.js`, `backend/models/CommParticipant.js`; modify `backend/models/Communication.js`.

- [ ] **Step 1: Migration** (guarded, idiom from 0110/0111):
```js
'use strict';
module.exports = {
  up: async (q, S) => {
    if (!(await q.describeTable('comm_participants').catch(() => null))) {
      await q.createTable('comm_participants', {
        id: { type: S.INTEGER, autoIncrement: true, primaryKey: true },
        branch_id: { type: S.INTEGER, allowNull: false },
        thread_key: { type: S.STRING(80), allowNull: false },
        contact_id: { type: S.INTEGER, allowNull: true },
        user_id: { type: S.INTEGER, allowNull: true },
        role: { type: S.STRING(40), allowNull: true },
        added_by: { type: S.INTEGER, allowNull: true },
        created_at: { type: S.DATE, defaultValue: S.literal('CURRENT_TIMESTAMP') },
        updated_at: { type: S.DATE, defaultValue: S.literal('CURRENT_TIMESTAMP') },
      });
      await q.addIndex('comm_participants', ['branch_id', 'thread_key']);
    }
    const t = await q.describeTable('communications');
    if (!t.visibility) await q.addColumn('communications', 'visibility', { type: S.ENUM('internal', 'client'), allowNull: false, defaultValue: 'client' });
    if (!t.assigned_to) await q.addColumn('communications', 'assigned_to', { type: S.INTEGER, allowNull: true });
  },
  down: async (q) => {
    await q.dropTable('comm_participants').catch(() => {});
    await q.removeColumn('communications', 'visibility').catch(() => {});
    await q.removeColumn('communications', 'assigned_to').catch(() => {});
  },
};
```

- [ ] **Step 2: CommParticipant model.**
```js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/db.config');
const CommParticipant = sequelize.define('CommParticipant', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  branch_id: { type: DataTypes.INTEGER, allowNull: false },
  thread_key: { type: DataTypes.STRING(80), allowNull: false },
  contact_id: DataTypes.INTEGER, user_id: DataTypes.INTEGER,
  role: DataTypes.STRING(40), added_by: DataTypes.INTEGER,
}, { tableName: 'comm_participants', underscored: true });
module.exports = CommParticipant;
```

- [ ] **Step 3: Communication model.** Add `visibility: { type: DataTypes.ENUM('internal','client'), defaultValue: 'client' },` and `assigned_to: DataTypes.INTEGER,`.

- [ ] **Step 4: Migrate + verify.** `npx sequelize-cli db:migrate` → 0112 up. `node -e` DESCRIBE `communications` shows `visibility`+`assigned_to`; `comm_participants` exists.

- [ ] **Step 5: Commit** — `feat(sales-inbox): migration 0112 + CommParticipant + Communication visibility/assigned_to`

---

### Task 2: salesInbox controller + routes

**Files:** Create `backend/controllers/salesInbox.controller.js`, `backend/routes/salesInbox.routes.js`; modify `backend/server.js`, `backend/routes/manifest.js`.

**Interfaces:** `GET /api/sales/inbox`, `GET /api/sales/inbox/thread?key=`, `POST /api/sales/inbox/reply`, `POST /api/sales/inbox/compose`, `GET /api/sales/inbox/:threadKey/participants`, `POST /api/sales/inbox/:threadKey/participants`, `DELETE /api/sales/inbox/participants/:id`, `POST /api/sales/inbox/:threadKey/assign`.

- [ ] **Step 1: Controller — helpers (sales-scoped, self-contained).**
```js
const { Op } = require('sequelize');
const Communication = require('../models/Communication');
const CommParticipant = require('../models/CommParticipant');
const SalesEnquiry = require('../models/SalesEnquiry');
const Property = require('../models/Property');
const Contact = require('../models/Contact');
const User = require('../models/User');
const { asyncHandler, branchScope, resolveBranchId } = require('../utils/controllerHelpers');

const snippet = (s) => (s ? String(s).replace(/\s+/g, ' ').slice(0, 120) : '');
// Sales thread key from a Communication row.
function saleKey(c) {
  if (c.entity_type === 'sales_enquiry') return `sales_enquiry:${c.entity_id}`;
  if (c.entity_type === 'sale_deal' || c.entity_type === 'deal') return `deal:${c.entity_id}`;
  if (c.property_id) return `property:${c.property_id}`;
  if (c.entity_type === 'property') return `property:${c.entity_id}`;
  return `comm:${c.id}`;
}
async function resolveSaleKey(key, scope) {
  const [type, idStr] = String(key || '').split(':'); const id = Number(idStr);
  if (type === 'sales_enquiry') { const enquiry = await SalesEnquiry.findOne({ where: { id, ...scope } }); return { type, id, enquiry, where: { entity_type: 'sales_enquiry', entity_id: id } }; }
  if (type === 'property') { const property = await Property.findByPk(id); return { type, id, property, where: { [Op.or]: [{ property_id: id }, { entity_type: 'property', entity_id: id }] } }; }
  if (type === 'deal') return { type, id, where: { entity_type: 'sale_deal', entity_id: id } };
  return { type: 'comm', id, where: { id } };
}
function recipientOf(r) {
  if (r.type === 'sales_enquiry') return { email: r.enquiry?.email, phone: r.enquiry?.phone, name: r.enquiry?.enquirer_name };
  if (r.type === 'property') return { email: null, phone: null, name: r.property?.title };
  return {};
}
async function writeOutbound(req, r, { channel, subject, body, is_draft = false, visibility = 'client' }) {
  const branch_id = resolveBranchId(req);
  const base = { branch_id, channel: channel || 'note', direction: 'outbound', subject: subject || null, body: body || null, user_id: req.user?.id || null, status: 'done', occurred_at: new Date(), is_draft: !!is_draft, visibility };
  if (r.type === 'sales_enquiry') return Communication.create({ ...base, entity_type: 'sales_enquiry', entity_id: r.id, property_id: r.enquiry?.property_id || null });
  if (r.type === 'property') return Communication.create({ ...base, entity_type: 'property', entity_id: r.id, property_id: r.id });
  if (r.type === 'deal') return Communication.create({ ...base, entity_type: 'sale_deal', entity_id: r.id });
  return Communication.create({ ...base, entity_type: 'contact', entity_id: r.id || 0 });
}
```

- [ ] **Step 2: `inbox` handler.** Seed from SalesEnquiry + attach sales-keyed comms; enrich with participants + assignee:
```js
exports.inbox = asyncHandler(async (req, res) => {
  const scope = branchScope(req); const { status, channel, property_id, q, assigned_to, mine } = req.query;
  const enqWhere = { ...scope }; if (property_id) enqWhere.property_id = Number(property_id);
  const enquiries = await SalesEnquiry.findAll({ where: enqWhere, include: [{ model: Property, as: 'property', attributes: ['id', 'title', 'property_code'] }], order: [['updated_at', 'DESC']], limit: 500 });
  const comms = await Communication.findAll({ where: { ...scope, entity_type: { [Op.in]: ['sales_enquiry', 'sale_deal', 'property'] } }, order: [['occurred_at', 'DESC']], limit: 2000, raw: true });
  const byKey = new Map(); for (const c of comms) { const k = saleKey(c); (byKey.get(k) || byKey.set(k, []).get(k)).push(c); }
  // participants for all keys in one query
  const parts = await CommParticipant.findAll({ where: { ...scope }, raw: true });
  const cIds = [...new Set(parts.filter((p) => p.contact_id).map((p) => p.contact_id))];
  const contacts = cIds.length ? await Contact.findAll({ where: { id: cIds }, attributes: ['id', 'full_name'], raw: true }) : [];
  const cName = new Map(contacts.map((c) => [c.id, c.full_name]));
  const partsByKey = new Map(); for (const p of parts) { (partsByKey.get(p.thread_key) || partsByKey.set(p.thread_key, []).get(p.thread_key)).push({ id: p.id, name: p.contact_id ? cName.get(p.contact_id) : `User ${p.user_id}`, role: p.role }); }
  const items = [];
  for (const e of enquiries) {
    const j = e.toJSON(); const key = `sales_enquiry:${e.id}`; const thread = byKey.get(key) || [];
    const last = thread[0]; const assignee = last?.assigned_to || j.assigned_officer_id || null;
    items.push({ key, source: 'sales_enquiry', title: j.enquirer_name, subtitle: j.property?.title || j.preferred_area || 'Sales enquiry', channel: (j.source || 'web'), snippet: snippet(last?.body || j.next_action || 'New sales enquiry'), last_at: last ? last.occurred_at : (j.updated_at || j.created_at), status: j.status, needs_reply: !thread.some((c) => c.direction === 'outbound') || j.status === 'new', unread: thread.some((c) => c.direction === 'inbound' && !c.read_at) || j.status === 'new', messages: thread.length + 1, property_id: j.property_id, participants: partsByKey.get(key) || [], assigned_to: assignee });
  }
  // property/deal threads without an enquiry seed
  for (const [key, thread] of byKey) {
    if (key.startsWith('sales_enquiry:')) continue;
    const last = thread[0];
    items.push({ key, source: key.split(':')[0], title: key, subtitle: '', channel: last?.channel || 'note', snippet: snippet(last?.body), last_at: last?.occurred_at, status: last?.status, needs_reply: false, unread: thread.some((c) => c.direction === 'inbound' && !c.read_at), messages: thread.length, property_id: last?.property_id || null, participants: partsByKey.get(key) || [], assigned_to: last?.assigned_to || null });
  }
  let out = items;
  if (status) out = out.filter((i) => i.status === status);
  if (channel) out = out.filter((i) => i.channel === channel);
  if (q) out = out.filter((i) => JSON.stringify(i).toLowerCase().includes(String(q).toLowerCase()));
  if (assigned_to) out = out.filter((i) => String(i.assigned_to) === String(assigned_to));
  if (mine === '1' && req.user?.id) out = out.filter((i) => String(i.assigned_to) === String(req.user.id));
  out.sort((a, b) => new Date(b.last_at || 0) - new Date(a.last_at || 0));
  res.json({ data: out });
});
```

- [ ] **Step 3: `thread` + `reply` + `compose`.** `thread` mirrors the rental one over `resolveSaleKey` (seed a sales-enquiry first message from the enquiry), returns `messages` incl. each `visibility`. `reply` (`{ key, channel, subject, body, visibility }`): resolve key; if `visibility==='internal'` → `delivery='internal'`, no email; else email (client) exactly like the rental reply (email/log/sms_logged); `writeOutbound(...)`; mark inbound read. `compose` similar with an explicit key. (Copy the rental handlers' bodies, swapping resolveKey→resolveSaleKey and honouring `visibility`.)

- [ ] **Step 4: participants + assign.**
```js
exports.participants = asyncHandler(async (req, res) => { res.json({ data: await CommParticipant.findAll({ where: { ...branchScope(req), thread_key: req.params.threadKey } }) }); });
exports.addParticipant = asyncHandler(async (req, res) => {
  const { contact_id, user_id, role } = req.body || {};
  const row = await CommParticipant.create({ branch_id: resolveBranchId(req), thread_key: req.params.threadKey, contact_id: contact_id || null, user_id: user_id || null, role: role || 'other', added_by: req.user?.id || null });
  res.status(201).json({ data: row });
});
exports.removeParticipant = asyncHandler(async (req, res) => { const n = await CommParticipant.destroy({ where: { id: req.params.id, ...branchScope(req) } }); if (!n) return res.status(404).json({ error: 'Participant not found.' }); res.json({ ok: true }); });
exports.assign = asyncHandler(async (req, res) => {
  const r = await resolveSaleKey(req.params.threadKey, branchScope(req));
  await Communication.update({ assigned_to: req.body.assigned_to || null }, { where: { ...branchScope(req), ...r.where } });
  res.json({ assigned_to: req.body.assigned_to || null });
});
```

- [ ] **Step 5: Routes + mounts.** `salesInbox.routes.js`: authMiddleware + PREPARE/READ roles; `GET /`, `GET /thread`, `POST /reply`, `POST /compose`, `GET /:threadKey/participants`, `POST /:threadKey/participants`, `DELETE /participants/:id`, `POST /:threadKey/assign`. Mount `/api/sales/inbox` in server.js + manifest.js BEFORE `/api/sales`. Load-check + restart.

- [ ] **Step 6: Verify (live).** `GET /api/sales/inbox` → sales-enquiry conversations for the branch (each with participants:[], assigned_to). Add a property thread comm (or use an existing sales enquiry): `POST /api/sales/inbox/:key/participants {contact_id, role:'buyer'}` twice → `GET …/participants` returns 2; `POST /reply {key, body, visibility:'internal'}` → stored `visibility:'internal'`, `delivery:'internal'`, no email; `POST /reply {key, body, channel:'email', visibility:'client'}` on an enquiry with an email → emailed/logged; `POST /:key/assign {assigned_to:<uid>}` → the thread's comms carry `assigned_to`, and `GET /api/sales/inbox?mine=1` as that user includes it. Paste results.

- [ ] **Step 7: Commit** — `feat(sales-inbox): /api/sales/inbox endpoints (conversations, participants, visibility, assign)`

---

### Task 3: SalesInbox screen + nav + route

**Files:** Create `admin-portal/src/screens/sales/SalesInbox.jsx`; modify `admin-portal/src/config/consoles.js`, `admin-portal/src/App.jsx`.

- [ ] **Step 1: Two-pane screen.** Left: `GET /sales/inbox` list (title/subtitle, channel, unread dot, participant count, assignee chip, needs-reply flag) with filters (status, channel, `mine` toggle, search — URL-backed). Right: on select, `GET /sales/inbox/thread?key=` → messages (each with a visibility badge: muted "Internal" vs "Client"); a participants strip (list + add via `Combo endpoint="/contacts"` + role select → `POST /:key/participants`, remove → `DELETE /participants/:id`); an assignee `Combo`/select on users → `POST /:key/assign`; a reply composer with an **Internal / Client** toggle + channel (email/note) → `POST /sales/inbox/reply { key, channel, body, subject, visibility }`, refetch thread. Reuse `ui/kit` + `ui/pickers` + `.pm-*`.

- [ ] **Step 2: Nav + route.** `config/consoles.js` Home group: `{ to: '/residential/inbox', label: 'Sales Inbox', icon: Inbox }` (Inbox already imported). `App.jsx`: import `SalesInbox`; `<Route path="/residential/inbox" element={<SalesInbox />} />`.

- [ ] **Step 3: Build + browser.** `npm run build` clean. Open `/residential/inbox` → conversations list; open a thread → messages + participants + assignee; add a participant; assign; send an internal reply (no email) and a client reply. Screenshot.

- [ ] **Step 4: Commit** — `feat(sales-inbox): SalesInbox screen + nav + route`

---

### Task 4: End-to-end verification + wrap-up

- [ ] **Step 1: Harnesses.** `cd backend && npm test` → 7+5+27; `npm run test:full` → 28/0.
- [ ] **Step 2: Rental non-regression:** `GET /api/communications/inbox` still returns the rental conversations unchanged (the shared controller was not edited); spot-check in the browser or via API.
- [ ] **Step 3: Rebuild dist + work-log.** `admin-portal npm run build`; append an AGENT_WORK_LOG COMPLETED entry (sales inbox: conversations + participants + visibility + assignment; Phase-5 sub-project A); `git add admin-portal/dist AGENT_WORK_LOG.md`.
- [ ] **Step 4: Commit** — `chore(sales-inbox): work-log + rebuild dist; Phase-5 sub-project A done`

---

## Self-Review

**Spec coverage:** §2 schema → Task 1; inbox/thread/reply + participants/assign/visibility → Task 2; §5 screen → Task 3; §6 testing → Tasks 2–4. Deferred (templates, delivery status, SMS provider, service coordination, rental changes) absent — correct.

**Placeholder scan:** migration, both models, the controller helpers + inbox + participant/assign handlers are real code; thread/reply/compose (Task 2 Step 3) are specified as copies of the verified rental handlers with resolveKey→resolveSaleKey + visibility — a concrete transform, not a placeholder. No "TBD".

**Type consistency:** inbox item shape (`key, source, title, participants[], assigned_to, …`) produced Task 2, consumed by the screen Task 3. `saleKey`/`resolveSaleKey` keys (`sales_enquiry:`/`property:`/`deal:`) consistent across write/resolve/inbox. `visibility` ENUM('internal','client') + `assigned_to` match migration, model, writeOutbound, reply, and assign. Participant endpoints (`:threadKey/participants`, `/participants/:id`) consistent controller↔routes↔screen.

**Rental safety (explicit):** `communications.controller.js` is not in the modify list; the sales inbox is a parallel controller; `visibility`/`assigned_to` default to today's behaviour so existing comms/rental inbox are unaffected. Task 4 Step 2 re-checks the rental inbox.
