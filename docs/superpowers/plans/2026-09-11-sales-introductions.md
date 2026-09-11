# Sales Introductions (Clause 22) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire the unused `non_circumvention_records` table for sales — register protected buyer↔property introductions with a computed 12-month protection window and manual breach/close — surfaced on the property file and a branch-level Introductions page.

**Architecture:** Migration 0108 adds `context`/`deal_id`/`introduced_by` (additive). A sales-introductions controller reuses the rental columns with sales semantics (owner_contact_id=seller, tenant_contact_id=buyer) and is the single translation point; the API speaks buyer/seller. Protection window is derived at read time. UI mirrors Buyer Mandates.

**Tech Stack:** Node/Express/Sequelize (`:50001`, sequelize-cli), React 18 + Vite. Verification = migrate + live curls + `npm run build` + browser + harnesses.

**Spec:** `docs/superpowers/specs/2026-09-11-sales-introductions-design.md`

## Global Constraints

- **Additive only.** Migration 0108 adds 3 nullable/defaulted columns with `down`; no table/rename. Rental behavior unchanged (no rental code reads the new columns).
- **Rental/sales separation.** Every sales query filters `context='sale'`; existing rows backfilled `context='rental'`.
- **Controller is the only place** the rental column names appear; the HTTP API and UI use buyer/seller.
- **Mount routes in BOTH** `server.js` (explicit `mount()`) and `manifest.js`.
- **Codes** via `generateCode(NonCircumventionRecord, 'record_code', 'SSPC-IN-')`.
- Branch `air-conditioning/phase-0-duplicate`. Commit after each task. Footer:
  `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.
- Backend `npm test` (27/0 + businessDays) + `npm run test:full` (28/0) green; build clean.

## File Structure

- `backend/migrations/0108-sales-introductions.js` — **create**: +3 columns.
- `backend/models/NonCircumventionRecord.js` — **modify**: +3 fields.
- `backend/controllers/salesIntroduction.controller.js` — **create**: list/create/getOne/update + `hydrate`.
- `backend/routes/salesIntroduction.routes.js` — **create**.
- `backend/server.js` + `backend/manifest.js` — **modify**: mount.
- `admin-portal/src/screens/sales/SalesIntroductions.jsx` — **create**: branch list.
- `admin-portal/src/screens/sales/SalesPropertyFile.jsx` — **modify**: Introductions section.
- `admin-portal/src/config/consoles.js` — **modify**: Assurance nav item.
- `admin-portal/src/App.jsx` — **modify**: route.

**Schema:** migration 0108 (3 additive columns).

---

### Task 1: Migration + model

**Files:** Create `backend/migrations/0108-sales-introductions.js`; modify `backend/models/NonCircumventionRecord.js`.

- [ ] **Step 1: Migration** (guarded, idiom from 0105):
```js
'use strict';
module.exports = {
  up: async (q, S) => {
    const t = await q.describeTable('non_circumvention_records');
    if (!t.context) await q.addColumn('non_circumvention_records', 'context', { type: S.STRING(20), allowNull: false, defaultValue: 'sale' });
    if (!t.deal_id) await q.addColumn('non_circumvention_records', 'deal_id', { type: S.INTEGER, allowNull: true });
    if (!t.introduced_by) await q.addColumn('non_circumvention_records', 'introduced_by', { type: S.INTEGER, allowNull: true });
    // Existing rows predate sales — mark them rental so sales lists exclude them.
    await q.sequelize.query("UPDATE non_circumvention_records SET context='rental' WHERE context='sale' AND tenancy_id IS NOT NULL");
  },
  down: async (q) => {
    for (const c of ['context', 'deal_id', 'introduced_by']) { await q.removeColumn('non_circumvention_records', c).catch(() => {}); }
  },
};
```

- [ ] **Step 2: Model.** Add to `NonCircumventionRecord` attributes: `context: { type: DataTypes.STRING(20), defaultValue: 'sale' }, deal_id: DataTypes.INTEGER, introduced_by: DataTypes.INTEGER,`.

- [ ] **Step 3: Migrate + verify.** `cd backend && npx sequelize-cli db:migrate` → 0108 up. `node -e "const s=require('./config/db.config');s.query('DESCRIBE non_circumvention_records',{type:s.QueryTypes.SELECT}).then(r=>{console.log(r.map(x=>x.Field).filter(f=>['context','deal_id','introduced_by'].includes(f)));process.exit(0)})"` → the 3 fields.

- [ ] **Step 4: Commit** — `feat(introductions): migration 0108 + model fields (context/deal_id/introduced_by)`

---

### Task 2: Controller + routes

**Files:** Create `backend/controllers/salesIntroduction.controller.js`, `backend/routes/salesIntroduction.routes.js`; modify `backend/server.js`, `backend/manifest.js`.

**Interfaces:** `GET /api/sales/introductions[?property_id&status&expiry]`, `POST /api/sales/introductions`, `GET /:id`, `PUT /:id`. API fields: `buyer_contact_id`, `seller_contact_id`, `property_id`, `deal_id`, `introduction_date`, `protection_basis`, `direct_communication_allowed`, `breach_risk`, `protected_relationship`, `monitoring_notes`, `status`.

- [ ] **Step 1: Controller.**
```js
const { Op } = require('sequelize');
const NonCircumventionRecord = require('../models/NonCircumventionRecord');
const Contact = require('../models/Contact');
const Property = require('../models/Property');
const { generateCode } = require('../utils/codeGenerator');
const { asyncHandler, branchScope, pick } = require('../utils/controllerHelpers');

const MONTHS = 12;
const addMonths = (d, n) => { const x = new Date(d); x.setMonth(x.getMonth() + n); return x; };
const hydrate = (row) => {
  const o = row.toJSON ? row.toJSON() : row;
  if (o.introduction_date) {
    const until = addMonths(new Date(o.introduction_date + 'T00:00:00'), MONTHS);
    o.protection_until = until.toISOString().slice(0, 10);
    const ms = until - new Date(new Date().toISOString().slice(0, 10) + 'T00:00:00');
    o.days_remaining = Math.round(ms / 86400000);
    o.expired = o.days_remaining < 0;
  } else { o.protection_until = null; o.days_remaining = null; o.expired = false; }
  return o;
};
const INC = [
  { model: Contact, as: 'vendor', foreignKey: 'owner_contact_id', attributes: ['id', 'full_name', 'primary_phone'] },
  { model: Contact, as: 'buyer', foreignKey: 'tenant_contact_id', attributes: ['id', 'full_name', 'primary_phone'] },
  { model: Property, as: 'property', attributes: ['id', 'property_code', 'title'] },
];

exports.list = asyncHandler(async (req, res) => {
  const where = { ...branchScope(req), context: 'sale' };
  if (req.query.property_id) where.property_id = req.query.property_id;
  if (req.query.status) where.status = req.query.status;
  const rows = await NonCircumventionRecord.findAll({ where, include: INC, order: [['created_at', 'DESC']] });
  let data = rows.map(hydrate);
  if (req.query.expiry === 'active') data = data.filter((r) => !r.expired && r.status === 'active');
  if (req.query.expiry === 'expired') data = data.filter((r) => r.expired);
  res.json({ data });
});

exports.getOne = asyncHandler(async (req, res) => {
  const row = await NonCircumventionRecord.findOne({ where: { id: req.params.id, ...branchScope(req), context: 'sale' }, include: INC });
  if (!row) return res.status(404).json({ error: 'Introduction not found.' });
  res.json({ data: hydrate(row) });
});

exports.create = asyncHandler(async (req, res) => {
  const b = req.body;
  if (!b.property_id || !b.buyer_contact_id || !b.introduction_date) return res.status(400).json({ error: 'property_id, buyer_contact_id and introduction_date are required.' });
  const property = await Property.findOne({ where: { id: b.property_id, ...branchScope(req) } });
  if (!property) return res.status(404).json({ error: 'Property not found.' });
  const row = await NonCircumventionRecord.create({
    branch_id: property.branch_id, context: 'sale',
    record_code: await generateCode(NonCircumventionRecord, 'record_code', 'SSPC-IN-'),
    property_id: property.id, deal_id: b.deal_id || null,
    owner_contact_id: b.seller_contact_id || null, tenant_contact_id: b.buyer_contact_id,
    protected_relationship: b.protected_relationship || 'Agency-introduced buyer',
    introduction_date: b.introduction_date,
    protection_basis: b.protection_basis || 'Clause 22 — 12-month non-circumvention',
    direct_communication_allowed: !!b.direct_communication_allowed,
    breach_risk: ['low', 'medium', 'high'].includes(b.breach_risk) ? b.breach_risk : 'medium',
    monitoring_notes: b.monitoring_notes || null, status: 'active',
    introduced_by: req.user?.id || null, created_by: req.user?.id || null,
  });
  const fresh = await NonCircumventionRecord.findByPk(row.id, { include: INC });
  res.status(201).json({ data: hydrate(fresh) });
});

exports.update = asyncHandler(async (req, res) => {
  const row = await NonCircumventionRecord.findOne({ where: { id: req.params.id, ...branchScope(req), context: 'sale' } });
  if (!row) return res.status(404).json({ error: 'Introduction not found.' });
  const patch = pick(req.body, ['protected_relationship', 'introduction_date', 'protection_basis', 'direct_communication_allowed', 'breach_risk', 'monitoring_notes', 'deal_id']);
  if (req.body.seller_contact_id !== undefined) patch.owner_contact_id = req.body.seller_contact_id || null;
  if (['active', 'breached', 'closed'].includes(req.body.status)) patch.status = req.body.status;
  await row.update(patch);
  const fresh = await NonCircumventionRecord.findByPk(row.id, { include: INC });
  res.json({ data: hydrate(fresh) });
});
```
(Confirm `Contact`/`Property` association aliases: the includes use `as:'vendor'`/`'buyer'`/`'property'` with explicit `foreignKey`. If Sequelize rejects an on-the-fly include alias without a defined association, fall back to plain `attributes` on the row and resolve the two contacts with a follow-up `Contact.findAll({where:{id:[...]}})` map in `hydrate` — Step 3 verifies which is needed.)

- [ ] **Step 2: Routes.**
```js
const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/salesIntroduction.controller');
const { authMiddleware, roleMiddleware } = require('../middleware/auth.middleware');
const ROLES = ['super_admin', 'branch_admin', 'property_manager', 'sales_executive'];
router.use(authMiddleware, roleMiddleware(ROLES));
router.get('/', ctrl.list);
router.post('/', ctrl.create);
router.get('/:id', ctrl.getOne);
router.put('/:id', ctrl.update);
module.exports = router;
```

- [ ] **Step 3: Mount in BOTH.** `server.js`: add `mount('/api/sales/introductions', './routes/salesIntroduction.routes');` near the other sales mounts. `manifest.js`: add the matching entry. Load-check: `node -e "require('./controllers/salesIntroduction.controller');require('./routes/salesIntroduction.routes');console.log('load OK')"`.

- [ ] **Step 4: Live verify.** Restart `:50001`. `POST /api/sales/introductions {property_id, buyer_contact_id, introduction_date:'2026-09-11'}` → 201 with `record_code SSPC-IN-…`, `context:'sale'`, `status:'active'`, `protection_until:'2027-09-11'`, `expired:false`, `days_remaining>0`. `GET …?property_id=` returns it. `PUT :id {status:'breached'}` → breached; `{status:'closed'}` → closed. `POST` with a past `introduction_date` (2 years ago) → `expired:true`. Paste results. (If the include aliases errored, apply the hydrate-map fallback and re-verify.)

- [ ] **Step 5: Commit** — `feat(introductions): sales-introductions endpoints (buyer/seller semantics, 12-month window)`

---

### Task 3: Property-file Introductions section

**Files:** Modify `admin-portal/src/screens/sales/SalesPropertyFile.jsx`.

- [ ] **Step 1: SECTIONS + state.** Add `{ key: 'introductions', label: 'Introductions', icon: ShieldCheck }` (import `ShieldCheck` from lucide-react if not present) to SECTIONS after `documents`. Add state `const [intros, setIntros] = useState(undefined)`; on entering the section, `GET /sales/introductions?property_id=:id` → `setIntros(data.data)`.

- [ ] **Step 2: Render + add drawer.** In a `section === 'introductions'` block:
  - List each record: buyer name, seller name (or —), `introduction_date`, `protection_until` with a Badge (`expired`→red "Expired", else green "Protected · Nd"), `breach_risk`, `StatusBadge status`. Per-row (when `canPrepare` and status active): "Mark breached" and "Close" buttons → `PUT /sales/introductions/:id {status}` then refetch.
  - "Add introduction" opens a Drawer: buyer `Combo endpoint="/contacts"`, optional seller `Combo endpoint="/contacts"`, `introduction_date` Input(type date), `protection_basis` Input, direct-contact `Select`(yes/no), `breach_risk` Select, `monitoring_notes` Textarea → `POST /sales/introductions {property_id: id, ...}` then refetch. Reuse `ui/kit` + `Combo` from `ui/pickers` (both already imported in this file? import `Combo` if not).

- [ ] **Step 3: Build.** `cd admin-portal && npm run build` → `✓ built`. Paste tail.

- [ ] **Step 4: Browser.** On a sale property → Introductions → add a record (buyer + date) → row shows with a "Protected · Nd" badge; Mark breached flips status. Screenshot.

- [ ] **Step 5: Commit** — `feat(introductions): property-file Introductions section`

---

### Task 4: Branch-level Introductions page + nav + route

**Files:** Create `admin-portal/src/screens/sales/SalesIntroductions.jsx`; modify `admin-portal/src/config/consoles.js`, `admin-portal/src/App.jsx`.

- [ ] **Step 1: List page** (mirror `BuyerMandates.jsx`): `PageHead` + filters (status Select, expiry Select active/expired, URL-backed via `useSearchParams`) + `DataTable` of `GET /sales/introductions` (+ query params). Columns: record_code, property (code/title, links to its file via `settlementDeskPath('residential', property_id).replace('/settlement','')?section=introductions`), buyer, seller, introduction_date, protection_until (+ expired/active badge), status. Row click → the property file Introductions section.

- [ ] **Step 2: Nav.** In `config/consoles.js` Assurance group, add `{ to: '/residential/introductions', label: 'Introductions', icon: ShieldCheck }` (ShieldCheck already imported there for Compliance).

- [ ] **Step 3: Route.** In `App.jsx`: import `SalesIntroductions`; add `<Route path="/residential/introductions" element={<SalesIntroductions />} />` near the mandates routes (~line 928).

- [ ] **Step 4: Build + browser.** `npm run build` clean; open `/residential/introductions` → list renders with filters; a row opens the property file. Screenshot.

- [ ] **Step 5: Commit** — `feat(introductions): branch-level Introductions page + Assurance nav`

---

### Task 5: End-to-end verification + wrap-up

- [ ] **Step 1: Harnesses.** `cd backend && npm test` → businessDays + 27/0; `npm run test:full` → 28/0 (additive; unaffected).
- [ ] **Step 2: Full flow (browser):** create an introduction on a property, see it on the branch page (active), mark breached, filter expired (back-date one via API), confirm exclusion of any rental-context row.
- [ ] **Step 3: Rebuild dist + work-log.** `admin-portal npm run build`; append an AGENT_WORK_LOG COMPLETED entry (table wired for sales, semantics, window, breach/close, 2 surfaces; sub-project A of Phase-3 completion); `git add admin-portal/dist AGENT_WORK_LOG.md`.
- [ ] **Step 4: Commit** — `chore(introductions): work-log + rebuild dist; Phase-3 sub-project A done`

---

## Self-Review

**Spec coverage:** §3 migration/model → Task 1; §4 controller/routes → Task 2; §5 property-file section → Task 3, branch page + nav → Task 4; §6 testing → Tasks 2–5. Deferred (auto-detect, rental wiring, e-sign) absent — correct.

**Placeholder scan:** the migration, model fields, full controller, routes, mounts, and both UI screens are real code; the one open decision (Sequelize include-alias vs hydrate-map) is explicitly flagged with a fallback and resolved in Task 2 Step 4. No "TBD"/"similar to".

**Type consistency:** API speaks `buyer_contact_id`/`seller_contact_id`; the controller maps to `tenant_contact_id`/`owner_contact_id` in exactly two places (create, update) and back via the `INC` aliases (`buyer`/`vendor`) — the UI never sees rental names. `hydrate` adds `protection_until`/`days_remaining`/`expired`, consumed identically by the property-file section (Task 3) and branch page (Task 4). `context='sale'` filter on every query (list/getOne/update). Codes `SSPC-IN-`. Routes `/api/sales/introductions` match controller, routes, both mounts, and both UI screens.

**Rental safety:** columns additive; `context` backfilled `'rental'` for pre-existing rows; every sales query scoped `context='sale'`; no rental code path touched.
