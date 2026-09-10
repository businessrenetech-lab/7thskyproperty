# Deals Kanban Pipeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn DealsBoard into a Board + List pipeline over PropertyDeal, with a server-enforced stage-transition endpoint that allows only early-pipeline moves and blocks money/legal ones.

**Architecture:** A guarded `POST /deals/:id/transition` validates each `(from,to)` pair, updates `PropertyDeal.status`, and writes a `DealEvent`. The rebuilt DealsBoard adds a Board view (6 status columns, native HTML5 drag/drop, optimistic + revert-on-block) and a keyboard Move-to-stage menu, both calling that one endpoint, alongside the kept List (table) view and a shared filter bar. No money mutation, no schema change.

**Tech Stack:** Node/Express/Sequelize (`:50001`), React 18 + Vite (`admin-portal`), `ui/kit.jsx`, `services/api`, `react-router-dom`. Verification = `npm run build` + live endpoint curls + browser walkthrough + the unchanged backend harnesses.

**Spec:** `docs/superpowers/specs/2026-09-11-deals-kanban-pipeline-design.md`

## Global Constraints

- **The server owns legality.** Drag and keyboard both call `POST /deals/:id/transition`; the client is optimistic and reverts on any 4xx. No board action may set `agreed`/`settlement`/`completed` (those come from accept-offer / lock-settlement) or move a deal out of them.
- **Allowed pairs only:** `lead→negotiation`, `negotiation→lead`, `lead→cancelled`, `negotiation→cancelled`. `→cancelled` requires a non-empty `reason`. Everything else → 409 with a pointer message.
- **Audit every move:** write a `DealEvent` (`event_type:'STAGE_CHANGED'`, `detail` = `"<from> → <to>"` + reason, `actor_user_id`, `branch_id`, `deal_id`).
- **No money / no schema change.** Backend `npm test` (27/0) + `npm run test:full` (28/0) stay green. Reuses `DealEvent`; adds a `belongsTo(User, as:'assignee')` association only (no column).
- **Keep the List path.** DealsBoard is mounted for residential/commercial/rural via `{category, dealType, title, desc}` — preserve those and the DataTable so nothing regresses.
- **Native DnD only** — no new dependency (CSP-safe).
- Branch `air-conditioning/phase-0-duplicate`. Commit after each task. Footer: `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.

## File Structure

- `backend/models/PropertyDeal.js` — **modify**: add `PropertyDeal.belongsTo(User, { as: 'assignee', foreignKey: 'assigned_to' })`.
- `backend/controllers/deal.controller.js` — **modify**: `transition` handler; `assignee` include + `User` import on `list`; allow a larger page limit for the board.
- `backend/routes/deal.routes.js` — **modify**: `POST /:id/transition`.
- `admin-portal/src/screens/DealsBoard.jsx` — **modify**: Board+List toggle, filter bar, cards, native DnD, Move-to-stage menu. (Board pieces may move into `screens/deals/` if the file grows past ~350 lines.)

**Schema / migrations:** none.

---

### Task 1: Backend — guarded transition endpoint + assignee on list

**Files:** Modify `backend/models/PropertyDeal.js`, `backend/controllers/deal.controller.js`, `backend/routes/deal.routes.js`.

**Interfaces:**
- Produces: `POST /api/deals/:id/transition { to_status, reason? }` → `{ data: <updated deal> }` or 4xx `{ error }`. `GET /api/deals` rows gain `assignee: { id, name } | null`.

- [ ] **Step 1: Add the assignee association.** In `backend/models/PropertyDeal.js`, add near the other `belongsTo` lines (add `const User = require('./User');` at top if not present):
```js
PropertyDeal.belongsTo(User, { as: 'assignee', foreignKey: 'assigned_to' });
```

- [ ] **Step 2: Import User + include assignee on `list`.** In `deal.controller.js` add `const User = require('../models/User');` and a shared include, then add it to `list`'s include array and bump its page cap:
```js
const assigneeInc = { model: User, as: 'assignee', attributes: ['id', 'name'] };
// in list(): getPagination(req, 25, 1000) so the board can pull ?limit=500
```
Change `list`'s `const { limit, offset, page } = getPagination(req);` to `getPagination(req, 25, 1000)` and add `assigneeInc` to the `include: [...]`.

- [ ] **Step 3: Write the `transition` handler.** Append to `deal.controller.js` (`DealEvent` + `recordEvent`-style write; import `DealEvent`):
```js
const DealEvent = require('../models/DealEvent');
const ALLOWED_TRANSITIONS = {
  lead: ['negotiation', 'cancelled'],
  negotiation: ['lead', 'cancelled'],
};
const BLOCK_MSG = {
  agreed: 'Accept an offer in the property file to move this deal to Agreed.',
  settlement: 'Open the Settlement Desk — settlement status is set there.',
  completed: 'Open the Settlement Desk — completion happens when the settlement is locked.',
};
exports.transition = asyncHandler(async (req, res) => {
  const to = String(req.body.to_status || '');
  const reason = String(req.body.reason || '').trim();
  const deal = await PropertyDeal.findOne({ where: { id: req.params.id, ...branchScope(req) } });
  if (!deal) return res.status(404).json({ error: 'Deal not found.' });
  const from = deal.status;
  const allowed = ALLOWED_TRANSITIONS[from] || [];
  if (!allowed.includes(to)) {
    const msg = BLOCK_MSG[to]
      || (['agreed', 'settlement', 'completed'].includes(from) ? 'This deal is past negotiation; changes happen in the offer/settlement flow.' : `Cannot move a ${from} deal to ${to}.`);
    return res.status(409).json({ error: msg });
  }
  if (to === 'cancelled' && !reason) return res.status(400).json({ error: 'A reason is required to cancel a deal.' });
  await deal.update({ status: to });
  await DealEvent.create({ branch_id: deal.branch_id, deal_id: deal.id, event_type: 'STAGE_CHANGED', detail: `${from} → ${to}${reason ? ` — ${reason}` : ''}`, actor_user_id: req.user.id });
  res.json({ data: deal });
});
```

- [ ] **Step 4: Route it.** In `deal.routes.js` (after `put('/:id')`): `router.post('/:id/transition', ctrl.transition);`

- [ ] **Step 5: Restart + verify.** Restart `:50001`. With an admin token + `X-Branch-Id:1`, pick a `lead` deal id from `GET /api/deals?deal_type=buy`:
  - `POST /deals/:id/transition {to_status:'negotiation'}` → 200, deal.status `negotiation`; a `deal_events` row exists.
  - `POST /deals/:id/transition {to_status:'agreed'}` → 409 with the "Accept an offer…" message.
  - `POST /deals/:id/transition {to_status:'cancelled'}` (no reason) → 400; with `{to_status:'cancelled', reason:'test'}` → 200.
  - `GET /api/deals` row has `assignee` (null or `{id,name}`).
  Paste the statuses/messages into the report.

- [ ] **Step 6: Commit** — `feat(deals): guarded stage-transition endpoint + assignee on list`

---

### Task 2: Frontend — filter bar + Board/List toggle (no DnD yet)

**Files:** Modify `admin-portal/src/screens/DealsBoard.jsx`.

**Interfaces:** Consumes `GET /deals?deal_type&category&limit=500` (now with `assignee`); reuses `propertyFilePath` / the existing detail Drawer.

- [ ] **Step 1: Load a full page + add view/filter state.** Change the fetch `limit` to 500. Add state: `const [view, setView] = useState('board')`, `const [fStage, setFStage] = useState('')`, `const [fAssignee, setFAssignee] = useState('')`, `const [overdue, setOverdue] = useState(false)` (keep `search`).

- [ ] **Step 2: Shared filter + derived rows.** Above the return, compute:
```js
const STAGES = ['lead', 'negotiation', 'agreed', 'settlement', 'completed', 'cancelled'];
const today = new Date().toISOString().slice(0, 10);
const isOverdue = (r) => r.settlement_date && r.settlement_date < today && !['completed', 'cancelled'].includes(r.status);
const assignees = [...new Map(rows.filter((r) => r.assignee).map((r) => [r.assignee.id, r.assignee])).values()];
const filtered = rows.filter((r) =>
  (!search || JSON.stringify(r).toLowerCase().includes(search.toLowerCase()))
  && (!fStage || r.status === fStage)
  && (!fAssignee || Number(r.assignee?.id) === Number(fAssignee))
  && (!overdue || isOverdue(r)));
```
Render a filter bar (in the existing card): the SearchInput, a Stage `<select>` (All + STAGES), an Assignee `<select>` (All + `assignees`), an Overdue checkbox, and a Board|List toggle (two Buttons).

- [ ] **Step 3: List view unchanged.** When `view==='list'`, render the existing `<DataTable columns={columns} rows={filtered} …>` (swap `rows.filter(...)` for `filtered`). Keep the Drawer + `open()`.

- [ ] **Step 4: Board view (static first).** When `view==='board'`, render 6 columns from STAGES; each column filters `filtered` by status, shows a header with count, and renders a `DealCard` per deal. `DealCard` (small component in-file): property code/title, party name (buyer or seller by dealType), `money(sale_price)` and `money(r.expected_fee)` as separate labelled values, assignee name, settlement date (red via `isOverdue`), status chips (contract/settlement/payment via `StatusBadge`), and a click → `open(r)` (the existing drawer). Columns sit in a horizontally-scrolling flex row (`overflow-x:auto`), each a fixed ~280px width.

- [ ] **Step 5: Verify.** `cd admin-portal && npm run build` → `✓ built`. Browser `/residential/buy`: Board shows deals in status columns with the card facts; List toggle shows the table; stage/assignee/overdue/search filters narrow both; a card opens the drawer. Paste the build tail.

- [ ] **Step 6: Commit** — `feat(deals): Board/List toggle + filter bar + deal cards`

---

### Task 3: Frontend — native drag/drop + Move-to-stage menu (the transitions)

**Files:** Modify `admin-portal/src/screens/DealsBoard.jsx`.

**Interfaces:** Consumes `POST /deals/:id/transition`.

- [ ] **Step 1: Client-side legal-target map (mirrors the server).**
```js
const ALLOWED = { lead: ['negotiation', 'cancelled'], negotiation: ['lead', 'cancelled'] };
const legalTargets = (status) => ALLOWED[status] || [];
```

- [ ] **Step 2: The transition call (shared by drag + menu).**
```js
const move = async (deal, to) => {
  if (deal.status === to) return;
  let reason;
  if (to === 'cancelled') { reason = window.prompt('Reason for cancelling this deal:'); if (!reason || !reason.trim()) return; }
  const prev = rows;
  setRows((rs) => rs.map((r) => (r.id === deal.id ? { ...r, status: to } : r))); // optimistic
  try {
    await api.post(`/deals/${deal.id}/transition`, { to_status: to, reason: reason?.trim() });
    toast.success(`Moved to ${to}`);
  } catch (e) {
    setRows(prev); // revert
    toast.error(e.response?.data?.error || 'Move not allowed');
  }
};
```

- [ ] **Step 3: Native DnD on cards + columns.** Give each `DealCard` `draggable={legalTargets(r.status).length > 0}`, `onDragStart={(e) => e.dataTransfer.setData('text/plain', String(r.id))}`. Each column (drop zone) gets `onDragOver={(e) => e.preventDefault()}` and `onDrop={(e) => { const id = Number(e.dataTransfer.getData('text/plain')); const deal = rows.find((r) => r.id === id); if (deal) move(deal, colStatus); }}`. Cards in agreed/settlement/completed are not draggable (they show the menu's blocked reason instead). Add a light `.drag-over` highlight via `onDragEnter/Leave` state per column (optional but keep it simple).

- [ ] **Step 4: Move-to-stage menu (keyboard path).** On each card add a small "⋯" button opening a menu: for a card whose status has `legalTargets`, list those targets as buttons calling `move(r, target)`; for agreed/settlement/completed, show the disabled reason text ("Settlement status is set in the Settlement Desk"). This is the accessible, non-drag path and uses the same `move()`.

- [ ] **Step 5: Verify (browser).** `npm run build` clean. On `/residential/buy`: drag a Lead card to Negotiation → it stays, and a refresh keeps it (persisted); drag a card onto Agreed → it snaps back with a toast ("Accept an offer…"); the ⋯ menu on a lead offers Negotiation + Cancelled (Cancelled prompts a reason), and on an agreed/settlement card shows the blocked reason. List view + filters still work. `cd backend && npm test && npm run test:full` → green. Paste the results.

- [ ] **Step 6: Commit** — `feat(deals): native drag/drop + Move-to-stage, server-guarded transitions`

---

### Task 4: Responsive + end-to-end verification

**Files:** Modify `admin-portal/src/screens/DealsBoard.jsx` (responsive only).

- [ ] **Step 1: Phone width.** Ensure the board's column row is `overflow-x:auto` and the page body never scrolls sideways; at ≤640px, stack the filter bar and let columns scroll horizontally (or collapse to a stage `<select>` + single-column list — reuse the desk's pattern). Side gutter ≥16px.

- [ ] **Step 2: Full verification.** `admin-portal npm run build` clean. Browser at desktop + ~400px: board usable, no horizontal page scroll. Backend `npm test` 27/0 + `npm run test:full` 28/0 unchanged. Confirm a moved deal writes a `deal_events` row (query or via the property file activity). Confirm commercial/rural `/…/buy` still render (shared component).

- [ ] **Step 3: Commit** (docs/log + dist rebuild) — `chore(deals): responsive board, work-log + rebuild dist`

---

## Self-Review

**Spec coverage:** §3 transition rules → Task 1 (ALLOWED_TRANSITIONS + BLOCK_MSG, reason-for-cancel, DealEvent). §4 backend (transition, assignee include, larger limit) → Task 1. §5 board/list/filters/cards → Tasks 2–3; native DnD + revert-on-block + keyboard menu → Task 3; responsive → Task 4. §6 testing → each task's verify + Task 4. No calendar/saved-views/mandates (out of scope) — absent, correct.

**Placeholder scan:** handler, filters, `move()`, DnD handlers all given as real code; verification steps are concrete curls/drags with expected outcomes. No "TBD"/"handle errors"/"similar to". The one association add (Task 1 Step 1) and the `getPagination` cap bump (Task 1 Step 2) are explicit because both are required for the board to load its data and were confirmed against source (`getPagination` caps at 100; no assignee assoc exists yet).

**Type consistency:** the client `ALLOWED` map (Task 3) mirrors the server `ALLOWED_TRANSITIONS` (Task 1) exactly (lead→[negotiation,cancelled], negotiation→[lead,cancelled]). `move(deal, to)` and `legalTargets(status)` are used identically by drag (Task 3 Step 3) and menu (Task 3 Step 4). Endpoint path `/deals/:id/transition` and body `{to_status, reason}` match between controller, route, and client. Rows expose `assignee:{id,name}`, consumed in the filter bar + card (Tasks 2–3).

**Open item carried to execution:** the client `ALLOWED` map duplicates the server rules for optimistic UI; the server remains authoritative (revert-on-block covers any drift). If the allowed set later changes, update both — noted in Task 3 Step 1's comment.
