# Buyer Mandates + Shortlist Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a propertyless buyer mandate (requirements brief) with a shortlist of candidate properties, and a one-action convert of a shortlisted candidate into a property-linked buy PropertyDeal.

**Architecture:** Two new models (`BuyerMandate`, `MandateCandidate`) + migration 0105; a REST controller/routes at `/api/buyer-mandates`; a transactional convert that reuses the deal-create pattern; two React pages (list + detail) under a new nav entry. No change to existing tables or money flow.

**Tech Stack:** Node/Express/Sequelize (`:50001`, sequelize-cli migrations — no `sync()`), React 18 + Vite (`admin-portal`), `ui/kit.jsx`, `ui/pickers` `Combo`, `services/api`, `react-router-dom`. Verification = migrate + live endpoint curls + `npm run build` + browser walkthrough + unchanged backend harnesses.

**Spec:** `docs/superpowers/specs/2026-09-11-buyer-mandates-design.md`

## Global Constraints

- **No change to existing tables or money flow.** Only two new tables (migration 0105). Backend `npm test` (27/0) + `npm run test:full` (28/0) stay green.
- **Migration discipline:** follow the 0103 guarded idiom (`describeTable`/`createTable` guards); provide `down` dropping both tables; never edit an applied migration. Next number is **0105**.
- **Branch-scoped + role-gated** like every module: `roleMiddleware(['super_admin','branch_admin','property_manager','sales_executive'])`, `...branchScope(req)` on every query, `resolveBranchId` + `created_by` on create, `generateCode(Model,'field','SSPC-XX-')` for codes.
- **Convert is one transaction:** create the buy deal + flip the candidate + advance the mandate atomically; reject a re-convert.
- **Reuse UI idioms:** `Combo` from `../ui/pickers` (`endpoint`, `labelFn`, `value`, `onChange`, `placeholder`), `ui/kit` components, `settlementDeskPath`/`propertyFilePath` for links. `ClipboardList` is already imported in `consoles.js`.
- Branch `air-conditioning/phase-0-duplicate`. Commit after each task. Footer: `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.

## File Structure

- `backend/migrations/0105-buyer-mandates.js` — **create**: `buyer_mandates` + `mandate_candidates`.
- `backend/models/BuyerMandate.js`, `backend/models/MandateCandidate.js` — **create**.
- `backend/controllers/buyerMandate.controller.js` — **create**: list/get/create/update + candidate add/patch/remove + convert.
- `backend/routes/buyerMandate.routes.js` — **create**.
- `backend/routes/manifest.js` — **modify**: register `/api/buyer-mandates`.
- `admin-portal/src/screens/sales/BuyerMandates.jsx`, `BuyerMandateDetail.jsx` — **create**.
- `admin-portal/src/App.jsx`, `admin-portal/src/config/consoles.js`, `admin-portal/src/screens/sales/paths.js` — **modify**: routes, nav, path helpers.

---

### Task 1: Migration + models

**Files:** Create `backend/migrations/0105-buyer-mandates.js`, `backend/models/BuyerMandate.js`, `backend/models/MandateCandidate.js`.

- [ ] **Step 1: Migration.** Create `0105-buyer-mandates.js` (guarded idiom):
```js
'use strict';
module.exports = {
  up: async (q, S) => {
    const ts = {
      created_at: { type: S.DATE, allowNull: false, defaultValue: S.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: S.DATE, allowNull: false, defaultValue: S.literal('CURRENT_TIMESTAMP') },
    };
    if (!(await q.describeTable('buyer_mandates').catch(() => null))) {
      await q.createTable('buyer_mandates', {
        id: { type: S.INTEGER, autoIncrement: true, primaryKey: true },
        branch_id: { type: S.INTEGER, allowNull: false, defaultValue: 1 },
        mandate_code: { type: S.STRING(40), allowNull: false },
        buyer_client_id: S.INTEGER, buyer_contact_id: S.INTEGER,
        status: { type: S.ENUM('active', 'engaged', 'fulfilled', 'cancelled'), allowNull: false, defaultValue: 'active' },
        budget_min: S.DECIMAL(15, 2), budget_max: S.DECIMAL(15, 2),
        areas: S.STRING, property_type: S.STRING, beds_min: S.INTEGER, baths_min: S.INTEGER,
        timeframe: S.STRING, notes: S.TEXT, assigned_to: S.INTEGER, cancel_reason: S.TEXT,
        created_by: S.INTEGER, ...ts,
      });
    }
    if (!(await q.describeTable('mandate_candidates').catch(() => null))) {
      await q.createTable('mandate_candidates', {
        id: { type: S.INTEGER, autoIncrement: true, primaryKey: true },
        branch_id: { type: S.INTEGER, allowNull: false, defaultValue: 1 },
        mandate_id: { type: S.INTEGER, allowNull: false },
        property_id: { type: S.INTEGER, allowNull: false },
        status: { type: S.ENUM('shortlisted', 'viewing', 'rejected', 'converted'), allowNull: false, defaultValue: 'shortlisted' },
        fit_note: S.TEXT, feedback: S.TEXT, converted_deal_id: S.INTEGER,
        created_by: S.INTEGER, ...ts,
      });
    }
  },
  down: async (q) => { await q.dropTable('mandate_candidates').catch(() => {}); await q.dropTable('buyer_mandates').catch(() => {}); },
};
```

- [ ] **Step 2: Models.** `backend/models/BuyerMandate.js`:
```js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/db.config');
const Client = require('./Client');
const Contact = require('./Contact');
const User = require('./User');

const BuyerMandate = sequelize.define('BuyerMandate', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  branch_id: { type: DataTypes.INTEGER, allowNull: false },
  mandate_code: { type: DataTypes.STRING(40), unique: true },
  buyer_client_id: DataTypes.INTEGER, buyer_contact_id: DataTypes.INTEGER,
  status: { type: DataTypes.ENUM('active', 'engaged', 'fulfilled', 'cancelled'), defaultValue: 'active' },
  budget_min: DataTypes.DECIMAL(15, 2), budget_max: DataTypes.DECIMAL(15, 2),
  areas: DataTypes.STRING, property_type: DataTypes.STRING, beds_min: DataTypes.INTEGER, baths_min: DataTypes.INTEGER,
  timeframe: DataTypes.STRING, notes: DataTypes.TEXT, assigned_to: DataTypes.INTEGER, cancel_reason: DataTypes.TEXT,
  created_by: DataTypes.INTEGER,
}, { tableName: 'buyer_mandates', underscored: true });

BuyerMandate.belongsTo(Client, { as: 'buyerClient', foreignKey: 'buyer_client_id' });
BuyerMandate.belongsTo(Contact, { as: 'buyerContact', foreignKey: 'buyer_contact_id' });
BuyerMandate.belongsTo(User, { as: 'assignee', foreignKey: 'assigned_to' });
module.exports = BuyerMandate;
```
`backend/models/MandateCandidate.js`:
```js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/db.config');
const Property = require('./Property');
const BuyerMandate = require('./BuyerMandate');

const MandateCandidate = sequelize.define('MandateCandidate', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  branch_id: { type: DataTypes.INTEGER, allowNull: false },
  mandate_id: { type: DataTypes.INTEGER, allowNull: false },
  property_id: { type: DataTypes.INTEGER, allowNull: false },
  status: { type: DataTypes.ENUM('shortlisted', 'viewing', 'rejected', 'converted'), defaultValue: 'shortlisted' },
  fit_note: DataTypes.TEXT, feedback: DataTypes.TEXT, converted_deal_id: DataTypes.INTEGER,
  created_by: DataTypes.INTEGER,
}, { tableName: 'mandate_candidates', underscored: true });

MandateCandidate.belongsTo(Property, { as: 'property', foreignKey: 'property_id' });
BuyerMandate.hasMany(MandateCandidate, { as: 'candidates', foreignKey: 'mandate_id' });
MandateCandidate.belongsTo(BuyerMandate, { as: 'mandate', foreignKey: 'mandate_id' });
module.exports = MandateCandidate;
```

- [ ] **Step 3: Migrate + verify.** `cd backend && npx sequelize-cli db:migrate` → 0105 applied; `node -e "require('./models/BuyerMandate');require('./models/MandateCandidate');console.log('models load OK')"`. Confirm both tables exist (`db:migrate:status` shows 0105 up).

- [ ] **Step 4: Commit** — `feat(mandates): buyer_mandates + mandate_candidates (migration 0105 + models)`

---

### Task 2: Controller + routes

**Files:** Create `backend/controllers/buyerMandate.controller.js`, `backend/routes/buyerMandate.routes.js`; modify `backend/routes/manifest.js`.

**Interfaces:** `/api/buyer-mandates` (GET list, POST create, GET/:id, PUT/:id), `/:id/candidates` (POST), `/candidates/:cid` (PATCH, DELETE), `/:id/candidates/:cid/convert` (POST).

- [ ] **Step 1: Controller.** Create `buyerMandate.controller.js`:
```js
const BuyerMandate = require('../models/BuyerMandate');
const MandateCandidate = require('../models/MandateCandidate');
const PropertyDeal = require('../models/PropertyDeal');
const Property = require('../models/Property');
const Client = require('../models/Client');
const Contact = require('../models/Contact');
const User = require('../models/User');
const sequelize = require('../config/db.config');
const { generateCode } = require('../utils/codeGenerator');
const { asyncHandler, branchScope, resolveBranchId, pick } = require('../utils/controllerHelpers');

const MANDATE_FIELDS = ['buyer_client_id', 'buyer_contact_id', 'status', 'budget_min', 'budget_max', 'areas', 'property_type', 'beds_min', 'baths_min', 'timeframe', 'notes', 'assigned_to', 'cancel_reason'];
const buyerName = (m) => m.buyerClient?.Contact?.full_name || m.buyerContact?.full_name || m.buyerClient?.name || '—';

exports.list = asyncHandler(async (req, res) => {
  const where = { ...branchScope(req) };
  if (req.query.status) where.status = req.query.status;
  if (req.query.assigned_to) where.assigned_to = req.query.assigned_to;
  const rows = await BuyerMandate.findAll({
    where, order: [['created_at', 'DESC']],
    include: [
      { model: Client, as: 'buyerClient', include: [{ model: Contact, attributes: ['id', 'full_name'] }] },
      { model: Contact, as: 'buyerContact', attributes: ['id', 'full_name'] },
      { model: User, as: 'assignee', attributes: ['id', 'name'] },
      { model: MandateCandidate, as: 'candidates', attributes: ['id', 'status'] },
    ],
  });
  res.json({ data: rows.map((m) => ({ ...m.toJSON(), buyer_name: buyerName(m), candidate_count: (m.candidates || []).length })) });
});

exports.getOne = asyncHandler(async (req, res) => {
  const m = await BuyerMandate.findOne({
    where: { id: req.params.id, ...branchScope(req) },
    include: [
      { model: Client, as: 'buyerClient', include: [{ model: Contact, attributes: ['id', 'full_name'] }] },
      { model: Contact, as: 'buyerContact', attributes: ['id', 'full_name'] },
      { model: User, as: 'assignee', attributes: ['id', 'name'] },
      { model: MandateCandidate, as: 'candidates', include: [{ model: Property, as: 'property', attributes: ['id', 'property_code', 'title', 'area', 'price', 'owner_contact_id'] }] },
    ],
  });
  if (!m) return res.status(404).json({ error: 'Mandate not found.' });
  res.json({ data: { ...m.toJSON(), buyer_name: buyerName(m) } });
});

exports.create = asyncHandler(async (req, res) => {
  const data = pick(req.body, MANDATE_FIELDS);
  if (!data.buyer_client_id && !data.buyer_contact_id) return res.status(400).json({ error: 'A buyer client or contact is required.' });
  data.branch_id = resolveBranchId(req, req.body.branch_id);
  data.created_by = req.user?.id || null;
  data.mandate_code = await generateCode(BuyerMandate, 'mandate_code', 'SSPC-BM-');
  const m = await BuyerMandate.create(data);
  res.status(201).json({ data: m, message: 'Mandate created.' });
});

exports.update = asyncHandler(async (req, res) => {
  const m = await BuyerMandate.findOne({ where: { id: req.params.id, ...branchScope(req) } });
  if (!m) return res.status(404).json({ error: 'Mandate not found.' });
  const data = pick(req.body, MANDATE_FIELDS);
  if (data.status === 'cancelled' && !String(data.cancel_reason || m.cancel_reason || '').trim()) return res.status(400).json({ error: 'A reason is required to cancel a mandate.' });
  await m.update(data);
  res.json({ data: m, message: 'Mandate updated.' });
});

exports.addCandidate = asyncHandler(async (req, res) => {
  const m = await BuyerMandate.findOne({ where: { id: req.params.id, ...branchScope(req) } });
  if (!m) return res.status(404).json({ error: 'Mandate not found.' });
  const property_id = Number(req.body.property_id);
  if (!property_id) return res.status(400).json({ error: 'property_id is required.' });
  if (await MandateCandidate.count({ where: { mandate_id: m.id, property_id } })) return res.status(409).json({ error: 'That property is already on this shortlist.' });
  const c = await MandateCandidate.create({ branch_id: m.branch_id, mandate_id: m.id, property_id, fit_note: req.body.fit_note || null, created_by: req.user?.id || null });
  const withProp = await MandateCandidate.findOne({ where: { id: c.id }, include: [{ model: Property, as: 'property', attributes: ['id', 'property_code', 'title', 'area', 'price', 'owner_contact_id'] }] });
  res.status(201).json({ data: withProp });
});

exports.patchCandidate = asyncHandler(async (req, res) => {
  const c = await MandateCandidate.findOne({ where: { id: req.params.cid, ...branchScope(req) } });
  if (!c) return res.status(404).json({ error: 'Candidate not found.' });
  await c.update(pick(req.body, ['status', 'feedback', 'fit_note']));
  res.json({ data: c });
});

exports.removeCandidate = asyncHandler(async (req, res) => {
  const c = await MandateCandidate.findOne({ where: { id: req.params.cid, ...branchScope(req) } });
  if (!c) return res.status(404).json({ error: 'Candidate not found.' });
  if (c.status === 'converted') return res.status(409).json({ error: 'A converted candidate cannot be removed.' });
  await c.destroy();
  res.json({ message: 'Candidate removed.' });
});

exports.convert = asyncHandler(async (req, res) => {
  const result = await sequelize.transaction(async (transaction) => {
    const m = await BuyerMandate.findOne({ where: { id: req.params.id, ...branchScope(req) }, transaction, lock: transaction.LOCK.UPDATE });
    if (!m) { const e = new Error('Mandate not found.'); e.status = 404; throw e; }
    const c = await MandateCandidate.findOne({ where: { id: req.params.cid, mandate_id: m.id }, transaction, lock: transaction.LOCK.UPDATE });
    if (!c) { const e = new Error('Candidate not found.'); e.status = 404; throw e; }
    if (c.status === 'converted') { const e = new Error('This candidate is already converted.'); e.status = 409; throw e; }
    const property = await Property.findByPk(c.property_id, { transaction });
    const deal = await PropertyDeal.create({
      branch_id: m.branch_id, deal_type: 'buy', property_id: c.property_id,
      buyer_client_id: m.buyer_client_id || null, owner_contact_id: property?.owner_contact_id || null,
      status: 'lead', assigned_to: m.assigned_to || null,
      deal_code: await generateCode(PropertyDeal, 'deal_code', 'SSPC-DL-'), created_by: req.user?.id || null,
    }, { transaction });
    await c.update({ status: 'converted', converted_deal_id: deal.id }, { transaction });
    if (m.status === 'active') await m.update({ status: 'engaged' }, { transaction });
    return { deal, candidate: c };
  }).catch((e) => { res.status(e.status || 500).json({ error: e.message }); return null; });
  if (result) res.status(201).json({ data: result, message: 'Converted to a buy deal.' });
});
```

- [ ] **Step 2: Routes.** Create `buyerMandate.routes.js`:
```js
const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/buyerMandate.controller');
const { authMiddleware, roleMiddleware } = require('../middleware/auth.middleware');
const ROLES = ['super_admin', 'branch_admin', 'property_manager', 'sales_executive'];
router.use(authMiddleware, roleMiddleware(ROLES));
router.get('/', ctrl.list);
router.post('/', ctrl.create);
router.get('/:id', ctrl.getOne);
router.put('/:id', ctrl.update);
router.post('/:id/candidates', ctrl.addCandidate);
router.patch('/candidates/:cid', ctrl.patchCandidate);
router.delete('/candidates/:cid', ctrl.removeCandidate);
router.post('/:id/candidates/:cid/convert', ctrl.convert);
module.exports = router;
```

- [ ] **Step 3: Register.** In `backend/routes/manifest.js`, add near the deal line: `['/api/buyer-mandates', './buyerMandate.routes'],`.

- [ ] **Step 4: Restart + verify (live, admin token, X-Branch-Id:1).**
  - `POST /api/buyer-mandates {buyer_contact_id:<some contact>, budget_max:5000000, areas:'Gulshan', property_type:'apartment'}` → 201 with `mandate_code`.
  - `POST /api/buyer-mandates/:id/candidates {property_id:<a sale property>, fit_note:'good fit'}` → 201 with `property`.
  - `GET /api/buyer-mandates/:id` → mandate + candidates[].property.
  - `POST /api/buyer-mandates/:id/candidates/:cid/convert` → 201, `data.deal.deal_type==='buy'`, `data.deal.status==='lead'`, `data.deal.property_id` = the candidate's; re-POST convert → 409. `GET` shows candidate `status:'converted'` + mandate `status:'engaged'`.
  Paste the codes/statuses into the report.

- [ ] **Step 5: Commit** — `feat(mandates): REST controller + routes (CRUD, candidates, convert)`

---

### Task 3: Frontend — list page + path helpers + nav + route

**Files:** Create `admin-portal/src/screens/sales/BuyerMandates.jsx`; modify `admin-portal/src/screens/sales/paths.js`, `admin-portal/src/App.jsx`, `admin-portal/src/config/consoles.js`.

- [ ] **Step 1: Path helpers.** In `paths.js` add:
```js
export const mandatesPath = (category) => `${salesBase(category)}/mandates`;
export const mandateDetailPath = (category, id) => `${salesBase(category)}/mandates/${id}`;
```

- [ ] **Step 2: List page.** Create `BuyerMandates.jsx`: `PageHead` + a "New mandate" `Drawer` (buyer combo `Combo endpoint="/clients?role=buyer"` OR `/contacts`, budget min/max, areas, property_type, beds_min, timeframe, notes → `POST /buyer-mandates`), a status filter `Select`, `SearchInput`, and a `DataTable` (columns: code, buyer_name, budget range `money(min)–money(max)`, areas, status `StatusBadge`, candidates count, assignee name) with `onRowClick` → `navigate(mandateDetailPath('residential', row.id))`. Fetch `GET /buyer-mandates`. Reuse `Combo` from `../../ui/pickers`.

- [ ] **Step 3: Route + nav.** In `App.jsx`: `import BuyerMandates from './screens/sales/BuyerMandates';` + `<Route path="/residential/mandates" element={<BuyerMandates />} />` under the residential layout. In `config/consoles.js` `RESIDENTIAL_NAV` `buying` group items, add `{ to: '/residential/mandates', label: 'Buyer Mandates', icon: ClipboardList }` (already imported).

- [ ] **Step 4: Verify.** `cd admin-portal && npm run build` → `✓ built`. Browser `/residential/mandates`: list renders; New-mandate drawer creates one (appears in the table); status filter + search work. Paste the build tail.

- [ ] **Step 5: Commit** — `feat(mandates): Buyer Mandates list page + nav + routes`

---

### Task 4: Frontend — mandate detail (requirements + shortlist + convert)

**Files:** Create `admin-portal/src/screens/sales/BuyerMandateDetail.jsx`; modify `admin-portal/src/App.jsx`.

- [ ] **Step 1: Detail page.** Create `BuyerMandateDetail.jsx` (reads `:id` from `useParams`, fetches `GET /buyer-mandates/:id`):
  - **Requirements panel**: buyer name, budget range, areas, type, beds/baths, timeframe, notes, status badge; an "Edit" drawer (`PUT /buyer-mandates/:id`) and a status control (Cancel prompts a reason → `PUT {status:'cancelled', cancel_reason}`).
  - **Shortlist**: a `DataTable`/list of `data.candidates` (property code/title, area, price, fit note, status, feedback). Controls: "Add candidate" (property `Combo endpoint="/properties?category=residential"` + fit note → `POST /:id/candidates`), inline status `Select` + feedback edit (`PATCH /candidates/:cid`), Remove (`DELETE /candidates/:cid`, hidden when converted), and a **Convert** button on `shortlisted`/`viewing` rows → `POST /:id/candidates/:cid/convert`, then on success `toast` + link to the new deal (navigate to the property file `propertyFilePath('residential', property_id)` or show the deal code). A converted row shows "Converted → <deal_code>" and no Convert/Remove.
  - Refetch after each action.

- [ ] **Step 2: Route.** In `App.jsx`: `import BuyerMandateDetail from './screens/sales/BuyerMandateDetail';` + `<Route path="/residential/mandates/:id" element={<BuyerMandateDetail />} />`.

- [ ] **Step 3: Verify (browser).** `npm run build` clean. On a mandate: add 2 candidates; edit one's status→viewing + feedback; Convert one → toast + the row shows converted, and the new buy deal appears on `/residential/buy` (Lead column); cancel the mandate (reason required). Paste results.

- [ ] **Step 4: Commit** — `feat(mandates): mandate detail — requirements, shortlist, convert`

---

### Task 5: End-to-end verification + wrap-up

**Files:** none (verification); then docs/log + dist.

- [ ] **Step 1: Harnesses unchanged.** `cd backend && npm test` → 27/0; `npm run test:full` → 28/0 (new tables/endpoints don't touch money).
- [ ] **Step 2: Full flow (browser).** Create mandate → add candidates → convert → the buy deal is on the board and opens the Settlement-Desk-capable property file; converted candidate is locked; mandate is `engaged`. Confirm branch scoping (a mandate created under branch 1 doesn't leak).
- [ ] **Step 3: Migration reversibility spot-check (optional, non-destructive):** confirm `down` exists and drops both tables (do NOT run undo on shared data unless safe).
- [ ] **Step 4: Rebuild dist + work-log.** `admin-portal npm run build`; append an AGENT_WORK_LOG entry; `git add admin-portal/dist AGENT_WORK_LOG.md`.
- [ ] **Step 5: Commit** — `chore(mandates): work-log + rebuild dist; Phase 3 sub-project 2 done`

---

## Self-Review

**Spec coverage:** §3 models/migration → Task 1; §4 endpoints (CRUD + candidates + convert) → Task 2; §5 list page + nav → Task 3, detail + shortlist + convert → Task 4; §6 testing → Task 2/4 verifies + Task 5. Deferred items (compare, suggestions, viewings) absent — correct.

**Placeholder scan:** migration, both models, the full controller, and routes are real code; frontend tasks specify exact endpoints, fields, Combo usage, and nav wiring. No "TBD"/"handle errors"/"similar to". Verification steps are concrete curls/clicks with expected shapes.

**Type consistency:** `buyerName`/`buyer_name` + `candidate_count` produced in `list` and consumed by the table (Task 3). `convert` returns `{ deal, candidate }`, consumed in Task 4 Step 1. Candidate objects carry `property` (code/title/area/price/owner_contact_id) from every include, used in the shortlist. Endpoint paths (`/buyer-mandates`, `/:id/candidates`, `/candidates/:cid`, `/:id/candidates/:cid/convert`) match between controller, routes, and both pages. `mandate_code` prefix `SSPC-BM-`, deal via `SSPC-DL-` (existing).

**Open item carried to execution:** the buyer combo may reference a client or a contact; the list's `buyer_name` falls back across `buyerClient.Contact.full_name → buyerContact.full_name → buyerClient.name`. If `Client` has no `Contact` include shape as assumed, confirm against `models/Client.js` in Task 2 Step 1 and adjust the include (defined output: the exact buyer display path).
