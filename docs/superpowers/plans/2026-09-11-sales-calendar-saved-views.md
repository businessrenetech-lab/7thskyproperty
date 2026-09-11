# Sales Calendar + Saved Views Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A branch-wide sales month Calendar aggregating SOP deadlines, offer expiries, buyer viewings and follow-ups; and per-user Saved Views (filter presets) on the Deals board and Work Queue.

**Architecture:** One read endpoint aggregates the 4 date sources (no new data). A `saved_views` table + `/api/saved-views` CRUD stores per-user presets. Calendar page is an in-house month grid; a shared `SavedViews` dropdown wires into two screens by getting/setting their existing filter state.

**Tech Stack:** Node/Express/Sequelize (`:50001`, sequelize-cli), React 18 + Vite. Verification = migrate + live curls + `npm run build` + browser + harnesses.

**Spec:** `docs/superpowers/specs/2026-09-11-sales-calendar-saved-views-design.md`

## Global Constraints

- **Read-only calendar** (no event creation); aggregation only, no new date data.
- **Route prefix:** mount `/api/sales/calendar` BEFORE `/api/sales` in both server.js and manifest.js (like `/api/sales/introductions`). `/api/saved-views` is its own top-level mount.
- **Saved views are per-user + per-branch**, scoped to `req.user.id`; params are opaque JSON the client owns (no shape validation server-side).
- **Additive migration** (0109 `saved_views`) with `down`; no change to existing tables.
- Branch `air-conditioning/phase-0-duplicate`. Commit after each task. Footer:
  `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.
- Backend `npm test` (27/0 + businessDays) + `npm run test:full` (28/0) green; build clean.

## Event types & sources: sop_deadline (ProjectStage.due_date, vertical properties_sale, status pending/in_progress) · offer_expiry (SaleOffer.expiry_date, status submitted/countered) · viewing (SalesEnquiry.viewing_date) · follow_up (SalesEnquiry.follow_up_date)

## File Structure

- `backend/controllers/salesCalendar.controller.js` — **create**: aggregate.
- `backend/routes/salesCalendar.routes.js` — **create**.
- `backend/migrations/0109-saved-views.js` — **create**.
- `backend/models/SavedView.js` — **create**.
- `backend/controllers/savedView.controller.js` — **create**.
- `backend/routes/savedView.routes.js` — **create**.
- `backend/server.js` + `backend/routes/manifest.js` — **modify**: mounts.
- `admin-portal/src/screens/sales/SalesCalendar.jsx` — **create**.
- `admin-portal/src/screens/sales/SavedViews.jsx` — **create**.
- `admin-portal/src/screens/DealsBoard.jsx` — **modify**: SavedViews.
- `admin-portal/src/screens/sales/SalesWorkQueue.jsx` — **modify**: SavedViews.
- `admin-portal/src/config/consoles.js` — **modify**: Calendar nav.
- `admin-portal/src/App.jsx` — **modify**: Calendar route.

**Schema:** migration 0109 (saved_views table).

---

### Task 1: Calendar aggregation endpoint

**Files:** Create `backend/controllers/salesCalendar.controller.js`, `backend/routes/salesCalendar.routes.js`; modify `backend/server.js`, `backend/routes/manifest.js`.

**Interfaces:** `GET /api/sales/calendar?from=YYYY-MM-DD&to=YYYY-MM-DD[&category]` → `{ events: [{ date, type, label, property_id, property_code, ref_id }] }`.

- [ ] **Step 1: Controller.**
```js
const { Op } = require('sequelize');
const { SaleOffer } = require('../models/SalesModels');
const ProjectStage = require('../models/ProjectStage');
const Project = require('../models/Project');
const SalesEnquiry = require('../models/SalesEnquiry');
const Property = require('../models/Property');
const { asyncHandler, branchScope } = require('../utils/controllerHelpers');

const monthBounds = () => { const d = new Date(); const from = new Date(d.getFullYear(), d.getMonth(), 1); const to = new Date(d.getFullYear(), d.getMonth() + 1, 0); const iso = (x) => x.toISOString().slice(0, 10); return { from: iso(from), to: iso(to) }; };
const dpart = (v) => (v ? String(v).slice(0, 10) : null);

exports.calendar = asyncHandler(async (req, res) => {
  const def = monthBounds();
  const from = req.query.from || def.from;
  const to = req.query.to || def.to;
  const between = { [Op.between]: [from, to] };
  const scope = branchScope(req);
  const catProps = req.query.category
    ? (await Property.findAll({ where: { ...scope, listing_type: 'sale', category: req.query.category }, attributes: ['id'], raw: true })).map((p) => p.id)
    : null;
  const propFilter = catProps ? { [Op.in]: catProps } : undefined;
  const events = [];

  // sop_deadline
  const stages = await ProjectStage.findAll({ where: { due_date: between, status: { [Op.in]: ['pending', 'in_progress'] } }, include: [{ model: Project, as: 'Project', required: true, where: { vertical_key: 'properties_sale', ...scope, ...(propFilter ? { property_id: propFilter } : {}) } }] }).catch(() => []);
  for (const s of stages) { const pj = s.Project || s.project; if (pj) events.push({ date: dpart(s.due_date), type: 'sop_deadline', label: s.stage_name, property_id: pj.property_id, ref_id: s.id }); }

  // offer_expiry
  const offers = await SaleOffer.findAll({ where: { ...scope, expiry_date: between, status: { [Op.in]: ['submitted', 'countered'] }, ...(propFilter ? { property_id: propFilter } : {}) }, raw: true });
  for (const o of offers) events.push({ date: dpart(o.expiry_date), type: 'offer_expiry', label: o.offer_code, property_id: o.property_id, ref_id: o.id });

  // viewing + follow_up
  const enq = await SalesEnquiry.findAll({ where: { ...scope, ...(propFilter ? { property_id: propFilter } : {}), [Op.or]: [{ viewing_date: between }, { follow_up_date: between }] }, raw: true });
  for (const e of enq) {
    if (e.viewing_date && dpart(e.viewing_date) >= from && dpart(e.viewing_date) <= to) events.push({ date: dpart(e.viewing_date), type: 'viewing', label: e.enquirer_name || 'Viewing', property_id: e.property_id, ref_id: e.id });
    if (e.follow_up_date && dpart(e.follow_up_date) >= from && dpart(e.follow_up_date) <= to) events.push({ date: dpart(e.follow_up_date), type: 'follow_up', label: e.enquirer_name || 'Follow-up', property_id: e.property_id, ref_id: e.id });
  }

  // resolve property codes in one query
  const ids = [...new Set(events.map((e) => e.property_id).filter(Boolean))];
  const props = new Map((ids.length ? await Property.findAll({ where: { id: ids }, attributes: ['id', 'property_code', 'title'], raw: true }) : []).map((p) => [Number(p.id), p]));
  for (const e of events) { const p = props.get(Number(e.property_id)); e.property_code = p ? p.property_code : null; }

  res.json({ events: events.filter((e) => e.date) });
});
```
(Confirm the `Project`↔`ProjectStage` include alias in Step 3: `ProjectStage.belongsTo(Project)` — the default alias is `Project`. If the include errors, drop the `as` and use the default association or a two-query map like the offers path.)

- [ ] **Step 2: Routes.**
```js
const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/salesCalendar.controller');
const { authMiddleware, roleMiddleware } = require('../middleware/auth.middleware');
router.use(authMiddleware, roleMiddleware(['super_admin', 'branch_admin', 'property_manager', 'sales_executive', 'accounts']));
router.get('/', ctrl.calendar);
module.exports = router;
```

- [ ] **Step 3: Mount (BOTH, before /api/sales).** server.js: `mount('/api/sales/calendar', './routes/salesCalendar.routes');` just above the introductions/sales mounts. manifest.js: `['/api/sales/calendar', './salesCalendar.routes'],` above `/api/sales`. Load-check + restart.

- [ ] **Step 4: Verify (live).** `GET /api/sales/calendar?from=2026-09-01&to=2026-09-30` (admin) → `{events:[...]}` including the property-51 `sop_deadline` (Inspection due 2026-09-15) with `property_code`; add/confirm an offer with an expiry in range shows `offer_expiry`; out-of-range excluded; `&category=residential` still returns. Paste a few events.

- [ ] **Step 5: Commit** — `feat(sales-calendar): aggregate SOP/offer/viewing/follow-up dates endpoint`

---

### Task 2: saved_views table + model + endpoint

**Files:** Create `backend/migrations/0109-saved-views.js`, `backend/models/SavedView.js`, `backend/controllers/savedView.controller.js`, `backend/routes/savedView.routes.js`; modify `backend/server.js`, `backend/routes/manifest.js`.

**Interfaces:** `GET /api/saved-views?scope=deals` → `{ data: [...] }`; `POST /api/saved-views {scope,name,params}` → `{ data }`; `DELETE /api/saved-views/:id`.

- [ ] **Step 1: Migration** (guarded createTable, idiom from 0105/0108):
```js
'use strict';
module.exports = {
  up: async (q, S) => {
    if (await q.describeTable('saved_views').catch(() => null)) return;
    await q.createTable('saved_views', {
      id: { type: S.INTEGER, autoIncrement: true, primaryKey: true },
      branch_id: { type: S.INTEGER, allowNull: false },
      user_id: { type: S.INTEGER, allowNull: false },
      scope: { type: S.STRING(40), allowNull: false },
      name: { type: S.STRING, allowNull: false },
      params: { type: S.JSON, allowNull: false, defaultValue: {} },
      created_at: { type: S.DATE, defaultValue: S.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: S.DATE, defaultValue: S.literal('CURRENT_TIMESTAMP') },
    });
    await q.addIndex('saved_views', ['branch_id', 'user_id', 'scope']);
  },
  down: async (q) => { await q.dropTable('saved_views').catch(() => {}); },
};
```

- [ ] **Step 2: Model.** `backend/models/SavedView.js`:
```js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/db.config');
const SavedView = sequelize.define('SavedView', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  branch_id: { type: DataTypes.INTEGER, allowNull: false },
  user_id: { type: DataTypes.INTEGER, allowNull: false },
  scope: { type: DataTypes.STRING(40), allowNull: false },
  name: { type: DataTypes.STRING, allowNull: false },
  params: { type: DataTypes.JSON, defaultValue: {} },
}, { tableName: 'saved_views', underscored: true });
module.exports = SavedView;
```

- [ ] **Step 3: Controller.**
```js
const SavedView = require('../models/SavedView');
const { asyncHandler, branchScope, resolveBranchId, pick } = require('../utils/controllerHelpers');

exports.list = asyncHandler(async (req, res) => {
  const where = { ...branchScope(req), user_id: req.user.id };
  if (req.query.scope) where.scope = req.query.scope;
  const rows = await SavedView.findAll({ where, order: [['created_at', 'ASC']] });
  res.json({ data: rows });
});
exports.create = asyncHandler(async (req, res) => {
  const b = pick(req.body, ['scope', 'name', 'params']);
  if (!b.scope || !b.name) return res.status(400).json({ error: 'scope and name are required.' });
  const row = await SavedView.create({ branch_id: resolveBranchId(req, req.body.branch_id), user_id: req.user.id, scope: b.scope, name: b.name, params: b.params || {} });
  res.status(201).json({ data: row });
});
exports.remove = asyncHandler(async (req, res) => {
  const n = await SavedView.destroy({ where: { id: req.params.id, ...branchScope(req), user_id: req.user.id } });
  if (!n) return res.status(404).json({ error: 'Saved view not found.' });
  res.json({ ok: true });
});
```

- [ ] **Step 4: Routes + mount.** `savedView.routes.js`: authMiddleware + all roles; `GET /`, `POST /`, `DELETE /:id`. Mount `/api/saved-views` in server.js + manifest.js (top-level, order irrelevant). Migrate (`db:migrate` → 0109), load-check, restart.

- [ ] **Step 5: Verify (live).** `POST /api/saved-views {scope:'deals',name:'My leads',params:{fStage:'negotiation'}}` → 201; `GET ?scope=deals` → the row; `DELETE /:id` → ok; `GET` empty. Paste.

- [ ] **Step 6: Commit** — `feat(saved-views): saved_views table + per-user CRUD endpoint`

---

### Task 3: Calendar page + nav + route

**Files:** Create `admin-portal/src/screens/sales/SalesCalendar.jsx`; modify `admin-portal/src/config/consoles.js`, `admin-portal/src/App.jsx`.

- [ ] **Step 1: Page.** In-house month grid:
  - State `month` (Date at day 1). Compute the 6-week visible span: `gridStart` = the Sunday on/before the 1st; 42 cells. `from`/`to` = ISO of first/last cell.
  - On month change, `GET /sales/calendar?from&to` → group events by `date` into a `Map`.
  - Render weekday header row + 42 day cells (`.cal-cell`); each cell: day number (dim for out-of-month, ring for today) + up to 3 type dots (`TYPE = { sop_deadline:['#2563eb','SOP'], offer_expiry:['#d97706','Offer'], viewing:['#059669','Viewing'], follow_up:['#6b7280','Follow-up'] }`) with a `+k` overflow; clicking a cell sets `selected`.
  - Selected-day panel: list events (colored type badge, label, property_code) each a button → `navigate(propertyFilePath('residential', e.property_id) + section)` where section = `?section=workflow` (sop), `?section=offers` (offer), `?section=enquiries` (viewing/follow_up).
  - Header: ‹ Month YYYY ›, Today button, a legend. Minimal inline CSS or a small `sales-calendar.css`.
  - Reuse `PageHead`, `Spinner`, `Badge`. Responsive: grid `grid-template-columns: repeat(7,1fr)`; min cell height; wraps the day panel below on narrow.

- [ ] **Step 2: Nav.** In `config/consoles.js`, add a nav item. Add a **Planning** group (or place under Selling): `{ to: '/residential/calendar', label: 'Calendar', icon: Calendar }` (import `Calendar` from lucide-react in consoles.js if not already imported).

- [ ] **Step 3: Route.** In `App.jsx`: import `SalesCalendar`; add `<Route path="/residential/calendar" element={<SalesCalendar />} />` near the other residential sales routes.

- [ ] **Step 4: Build + browser.** `npm run build` clean. Open `/residential/calendar` → current month renders; the day with property-51's SOP deadline shows a blue dot; selecting it lists the item; clicking opens the property file Workflow; ‹/› change month + refetch. Screenshot.

- [ ] **Step 5: Commit** — `feat(sales-calendar): month calendar page + nav + route`

---

### Task 4: SavedViews component + wire Deals board & Work Queue

**Files:** Create `admin-portal/src/screens/sales/SavedViews.jsx`; modify `admin-portal/src/screens/DealsBoard.jsx`, `admin-portal/src/screens/sales/SalesWorkQueue.jsx`.

**Interfaces:** `<SavedViews scope={'deals'|'work-queue'} current={obj} onApply={(params)=>void} />`.

- [ ] **Step 1: Component.**
```jsx
import React, { useCallback, useEffect, useState } from 'react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { Button, Select } from '../../ui/kit';

export default function SavedViews({ scope, current, onApply }) {
  const toast = useToast();
  const [views, setViews] = useState([]);
  const load = useCallback(async () => {
    try { const { data } = await api.get(`/saved-views?scope=${scope}`); setViews(data.data || []); } catch { /* non-fatal */ }
  }, [scope]);
  useEffect(() => { load(); }, [load]);
  const apply = (id) => { const v = views.find((x) => String(x.id) === String(id)); if (v) onApply(v.params || {}); };
  const saveCurrent = async () => {
    const name = window.prompt('Name this view');
    if (!name) return;
    try { await api.post('/saved-views', { scope, name, params: current }); toast.success('View saved'); load(); }
    catch { toast.error('Could not save view'); }
  };
  const del = async () => {
    if (!views.length) return;
    const name = window.prompt(`Delete which view? Type its exact name:\n${views.map((v) => v.name).join(', ')}`);
    const v = views.find((x) => x.name === name);
    if (!v) return;
    try { await api.delete(`/saved-views/${v.id}`); toast.success('Deleted'); load(); } catch { toast.error('Delete failed'); }
  };
  return (
    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
      <Select value="" onChange={(e) => apply(e.target.value)}>
        <option value="">Saved views…</option>
        {views.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
      </Select>
      <Button size="sm" variant="ghost" onClick={saveCurrent}>Save view</Button>
      {views.length > 0 && <Button size="sm" variant="ghost" onClick={del}>Delete</Button>}
    </div>
  );
}
```
(`window.prompt` is acceptable here — matches the app's lightweight admin patterns; no dialog-modal blocking concern in the app runtime, only in the browser-automation tool.)

- [ ] **Step 2: Deals board.** Import `SavedViews`. In the filter bar (after the Overdue label, before the view-toggle `marginLeft:auto` group), add:
```jsx
<SavedViews scope="deals" current={{ search, view, fStage, fAssignee, overdue }} onApply={(p) => { setSearch(p.search || ''); setView(p.view || 'board'); setFStage(p.fStage || ''); setFAssignee(p.fAssignee || ''); setOverdue(!!p.overdue); }} />
```

- [ ] **Step 3: Work Queue.** Import `SavedViews`. In the `PageHead` actions (next to the scope toggle + Refresh), add:
```jsx
<SavedViews scope="work-queue" current={{ scope }} onApply={(p) => setScope(p.scope || 'mine')} />
```
(Here `scope` is the queue's own mine/all state var; the component prop `scope="work-queue"` is the saved-view key — distinct.)

- [ ] **Step 4: Build + browser.** `npm run build` clean. Deals board: set a stage filter → Save view "X" → reload → pick "X" from the dropdown → filters reapply. Work Queue: Save/apply a scope view. Delete a view. Screenshot each.

- [ ] **Step 5: Commit** — `feat(saved-views): SavedViews dropdown on Deals board + Work Queue`

---

### Task 5: End-to-end verification + wrap-up

- [ ] **Step 1: Harnesses.** `cd backend && npm test` → businessDays + 27/0; `npm run test:full` → 28/0.
- [ ] **Step 2: Full flow (browser):** calendar shows the 4 event types and links out; saved views persist across a reload on both screens; a second user (if available) sees none of the first's views (or verify the `user_id` scope via API).
- [ ] **Step 3: Rebuild dist + work-log.** `admin-portal npm run build`; append an AGENT_WORK_LOG COMPLETED entry (calendar aggregation + page; saved_views table + endpoint + dropdown on 2 screens; sub-project B of Phase-3 completion — **Phase 3 now complete**); `git add admin-portal/dist AGENT_WORK_LOG.md`.
- [ ] **Step 4: Commit** — `chore(sales-calendar): work-log + rebuild dist; Phase-3 sub-project B done`

---

## Self-Review

**Spec coverage:** §3 aggregation → Task 1; §5 table/endpoint → Task 2; §4 calendar page → Task 3; §5 SavedViews UI → Task 4; §6 testing → Tasks 1/2/4/5. Deferred (event creation, week/day, iCal, cross-user, extra sources) absent — correct.

**Placeholder scan:** the controller, migration, model, both endpoints, and the calendar + SavedViews components are real code; the one open decision (ProjectStage↔Project include alias) is flagged with a two-query fallback and resolved in Task 1 Step 4. No "TBD"/"similar to".

**Type consistency:** calendar event shape `{ date, type, label, property_id, property_code, ref_id }` produced in Task 1, consumed by the page in Task 3 (`TYPE` map keys = the four `type` values). `<SavedViews scope current onApply>` signature identical across the component (Task 1… Task 4 def) and both call sites (Task 4). `/api/saved-views` (list/create/delete) and `/api/sales/calendar` match controller/routes/mounts/UI. Deals `params` = `{search,view,fStage,fAssignee,overdue}` saved (Task 4 Step 2) and applied by the same keys. Migration table `saved_views` matches the model + controller.

**Prefix + scope pitfalls:** `/api/sales/calendar` mounted before `/api/sales` (Task 1 Step 3); the Work Queue `scope` var vs the SavedViews `scope` prop collision is called out (Task 4 Step 3).
