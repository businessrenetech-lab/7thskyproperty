# Sales Reports & Analytics (+ per-property expenses) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A read-only Sales Reports page (pipeline age + conversion, settlement forecast + overdue receivables, expected-vs-actual fees, response-SLA + workload) plus per-property expense tracking rolled into a margin view, all PDF-downloadable.

**Architecture:** A new `sale_property_expenses` store + CRUD; a `salesReports.controller` doing one read-aggregation over existing models (reusing `calculateSettlement`, `businessDays`); a `SalesReports.jsx` page with client-side `html2pdf.js`; and an Expenses sub-panel on the property-file Services section. No writes beyond the expense CRUD; existing dashboards/ledger untouched.

**Tech Stack:** Node/Express/Sequelize (`:50001`), React 18 + Vite. Verification = migrate + live curls + `npm run build` + browser + harnesses.

**Spec:** `docs/superpowers/specs/2026-09-12-sales-reports-analytics-design.md`

## Global Constraints

- **Read-only reports;** the only writes are the per-property expense CRUD. Company `Expense` ledger + dashboard/accountingOverview/workQueue untouched.
- **Reuse:** `calculateSettlement` (receivables/fees), `businessDays` (SLA), existing models; no new dependency (PDF via the bundled `html2pdf.js`, lazy-imported like `AdminReportsHub.jsx`).
- **Routes beside SOP/services** in `sales.routes` (same `/api/sales` router — proven). Additive migration 0114 with `down`.
- **Branch-scoped**, date-range-bounded aggregation; empty range → zeroed blocks, never an error.
- Branch `air-conditioning/phase-0-duplicate`. Commit after each task. Footer:
  `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.
- Backend `npm test` (7+5+27) + `npm run test:full` (28/0) green; build clean.

## File Structure

- `backend/migrations/0114-sale-property-expenses.js` — **create**.
- `backend/models/SalePropertyExpense.js` — **create**.
- `backend/controllers/salesReports.controller.js` — **create**: `report` + expense CRUD (`listExpenses`/`addExpense`/`removeExpense`).
- `backend/routes/sales.routes.js` — **modify**: reports + expenses routes.
- `backend/controllers/salesServices.controller.js` — **modify**: expenses block + commitments roll-in.
- `admin-portal/src/screens/sales/SalesReports.jsx` — **create**.
- `admin-portal/src/screens/sales/SalesPropertyFile.jsx` — **modify**: Expenses sub-panel.
- `admin-portal/src/config/consoles.js` + `App.jsx` — **modify**: Reports nav + route.

**Schema:** migration 0114 (1 table).

---

### Task 1: Expenses store + CRUD + services roll-in

**Files:** Create `backend/migrations/0114-sale-property-expenses.js`, `backend/models/SalePropertyExpense.js`; add expense handlers to `backend/controllers/salesReports.controller.js`; modify `backend/routes/sales.routes.js`, `backend/controllers/salesServices.controller.js`.

- [ ] **Step 1: Migration.**
```js
'use strict';
module.exports = {
  up: async (q, S) => {
    if (await q.describeTable('sale_property_expenses').catch(() => null)) return;
    await q.createTable('sale_property_expenses', {
      id: { type: S.INTEGER, autoIncrement: true, primaryKey: true },
      branch_id: { type: S.INTEGER, allowNull: false },
      property_id: { type: S.INTEGER, allowNull: false },
      category: { type: S.ENUM('marketing', 'advertising', 'staging', 'photography', 'other'), defaultValue: 'other' },
      amount: { type: S.DECIMAL(15, 2), defaultValue: 0 },
      spent_on: { type: S.DATEONLY, allowNull: true },
      description: { type: S.STRING, allowNull: true },
      created_by: { type: S.INTEGER, allowNull: true },
      created_at: { type: S.DATE, defaultValue: S.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: S.DATE, defaultValue: S.literal('CURRENT_TIMESTAMP') },
    });
    await q.addIndex('sale_property_expenses', ['branch_id', 'property_id']);
  },
  down: async (q) => { await q.dropTable('sale_property_expenses').catch(() => {}); },
};
```

- [ ] **Step 2: Model** `SalePropertyExpense` (mirror MessageTemplate style; fields above; `tableName: 'sale_property_expenses', underscored: true`).

- [ ] **Step 3: Expense CRUD** (in `salesReports.controller.js`):
```js
const SalePropertyExpense = require('../models/SalePropertyExpense');
const Property = require('../models/Property');
const { asyncHandler, branchScope, resolveBranchId, pick } = require('../utils/controllerHelpers');
exports.listExpenses = asyncHandler(async (req, res) => {
  res.json({ data: await SalePropertyExpense.findAll({ where: { ...branchScope(req), property_id: req.params.propertyId }, order: [['spent_on', 'DESC'], ['id', 'DESC']] }) });
});
exports.addExpense = asyncHandler(async (req, res) => {
  const property = await Property.findOne({ where: { id: req.params.propertyId, ...branchScope(req) } });
  if (!property) return res.status(404).json({ error: 'Property not found.' });
  const b = pick(req.body, ['category', 'amount', 'spent_on', 'description']);
  if (!b.amount) return res.status(400).json({ error: 'amount is required.' });
  const row = await SalePropertyExpense.create({ ...b, branch_id: property.branch_id, property_id: property.id, created_by: req.user?.id || null });
  res.status(201).json({ data: row });
});
exports.removeExpense = asyncHandler(async (req, res) => {
  const n = await SalePropertyExpense.destroy({ where: { id: req.params.id, ...branchScope(req) } });
  if (!n) return res.status(404).json({ error: 'Expense not found.' }); res.json({ ok: true });
});
```

- [ ] **Step 4: Routes.** In `sales.routes.js` (beside services): `router.get('/properties/:propertyId/expenses', roleMiddleware(READ), reportsCtrl.listExpenses)`, `router.post('/properties/:propertyId/expenses', roleMiddleware(PREPARE), reportsCtrl.addExpense)`, `router.delete('/expenses/:id', roleMiddleware(PREPARE), reportsCtrl.removeExpense)` (require the controller as `reportsCtrl`).

- [ ] **Step 5: Services roll-in.** In `salesServices.controller.propertyServices`, also load `SalePropertyExpense` for the property; add `expenses:[...]` + `expense_total` to the payload and an `expenses` total in `commitments.totals`, plus `margin = totals.paid - expense_total` (labelled indicative). Keep it additive.

- [ ] **Step 6: Migrate + verify (live).** `db:migrate` → 0114. Restart. `POST /api/sales/properties/62/expenses {category:'marketing',amount:8000,spent_on:'2026-09-10'}` → row; `GET …/expenses` lists it; `GET /api/sales/properties/62/services` shows the expense total in commitments; `DELETE /api/sales/expenses/:id` removes it. Paste.

- [ ] **Step 7: Commit** — `feat(sales-reports): per-property expenses store + CRUD + services roll-in`

---

### Task 2: Reports aggregation endpoint

**Files:** Modify `backend/controllers/salesReports.controller.js` (add `report`), `backend/routes/sales.routes.js` (route).

**Interfaces:** `GET /api/sales/reports?from&to[&category]` → `{ range, pipeline, conversion, settlement_forecast, overdue_receivables, fees, sla, workload, expenses, margin }`.

- [ ] **Step 1: `report` handler.** Load in-range/relevant records (branch + optional category via property ids) and compute:
  - **pipeline:** `PropertyDeal.findAll` (branch) grouped by `status` → `{status, count, avg_age_days (now−created_at), avg_days_in_stage (now−updated_at)}`.
  - **conversion:** deals with `created_at` in [from,to] → `created`, `reached_agreed` (status in agreed/settlement/completed), `completed`; rates = reached/created, completed/created.
  - **settlement_forecast:** active `SaleTransaction`/deal with `settlement_date` in [from,to] grouped by `YYYY-MM` → `{month, count, expected_value (purchase price)}`.
  - **overdue_receivables:** load settlements (as `scanSettlements`/dashboard does) → for each non-locked with receipts < purchase_price and `settlement_date` < today → `{property_code, expected, received, shortfall}`.
  - **fees:** per SaleProfile+property → `expected` (`commission_fixed || price×commission_percent/100`) + `marketing_budget`; `invoiced`/`collected` from `PropertyInvoice` (Σ total / Σ amount_paid) for that property; branch totals + `variance = collected − expected`.
  - **sla:** `SalesEnquiry` created in [from,to] → first outbound `Communication` for its thread; `first_response_hours`; % within target (`businessDaysBetween(created, firstResponse) <= 1`); avg.
  - **workload:** distinct assignees (deal assignee + enquiry assigned_officer) → `{name, open_deals, open_enquiries}`.
  - **expenses/margin:** `SalePropertyExpense` in range grouped by property + category; `margin` per property = fees.collected − expenses.total.
  Use id-maps for property/user/contact names; all reads; return zeros for empty.

- [ ] **Step 2: Route.** `router.get('/reports', roleMiddleware(READ), reportsCtrl.report)` in `sales.routes.js`.

- [ ] **Step 3: Verify (live).** `GET /api/sales/reports?from=2026-06-01&to=2026-12-31` → each block populated with sane numbers (pipeline stage counts match a `GET /deals` spot-check; fees block shows a property's expected/invoiced/collected; settlement_forecast groups a dated deal; expenses reflect a seeded one). Empty range (`from=2000-01-01&to=2000-01-02`) → zeroed, no error. Paste the block keys + a couple of values.

- [ ] **Step 4: Commit** — `feat(sales-reports): /api/sales/reports aggregation endpoint`

---

### Task 3: Reports page + nav + route + PDF

**Files:** Create `admin-portal/src/screens/sales/SalesReports.jsx`; modify `admin-portal/src/config/consoles.js`, `admin-portal/src/App.jsx`.

- [ ] **Step 1: Page.** From/to date inputs (default last 90 days) + category filter; `GET /sales/reports?from&to&category`. Render each block as a `.pm-card`/kit card:
  - Pipeline: table (stage, count, avg age, avg days-in-stage) with a simple CSS bar for count.
  - Conversion: stat tiles (created, reached agreed, completed) + rates.
  - Settlement forecast: by-month table + total expected.
  - Overdue receivables: table (property, expected, received, shortfall).
  - Fees: table (property, expected, invoiced, collected, variance) + branch totals.
  - SLA + Workload: SLA tiles (% within, avg first-response) + workload table.
  - Expenses & margin: per-property table (expenses by category, collected, margin) + totals.
  A ref'd container + **Download PDF** button (lazy `import('html2pdf.js')`, same `.set(opt).from(container).save()` pattern as `AdminReportsHub.jsx`).

- [ ] **Step 2: Nav + route.** `config/consoles.js` Home group: `{ to: '/residential/reports', label: 'Reports', icon: BarChart3 }` (import `BarChart3`/`FileBarChart` from lucide-react if absent). `App.jsx`: import `SalesReports`; `<Route path="/residential/reports" element={<SalesReports />} />`.

- [ ] **Step 3: Build + browser.** `npm run build` clean. Open `/residential/reports` → all blocks render for the default range; change the range → refetch; Download PDF produces a file. Screenshot.

- [ ] **Step 4: Commit** — `feat(sales-reports): Reports page + nav + PDF download`

---

### Task 4: Property-file Expenses sub-panel

**Files:** Modify `admin-portal/src/screens/sales/SalesPropertyFile.jsx`.

- [ ] **Step 1: Expenses sub-panel** in the Services section (below work orders): list `services.expenses` (category, amount, date, note) with a remove button, and an inline "Add expense" row (category Select, amount Input, date Input, note Input) → `POST /sales/properties/:id/expenses` → refetch `loadServices`; remove → `DELETE /sales/expenses/:id`. Show the expenses total (already in the commitments strip from Task 1's roll-in) — add an "Expenses" tile + a "Margin (collected − expenses)" tile to the strip.

- [ ] **Step 2: Build + browser.** `npm run build` clean. Services section → add a marketing expense → it lists and the Expenses/Margin tiles update; remove it. Screenshot.

- [ ] **Step 3: Commit** — `feat(sales-reports): property-file Expenses sub-panel + margin`

---

### Task 5: End-to-end verification + wrap-up

- [ ] **Step 1: Harnesses.** `cd backend && npm test` → 7+5+27; `npm run test:full` → 28/0.
- [ ] **Step 2: Non-regression:** dashboard/accountingOverview/workQueue + company Expense ledger unchanged (grep/spot-check); reports are read-only.
- [ ] **Step 3: Rebuild dist + work-log.** `admin-portal npm run build`; append an AGENT_WORK_LOG COMPLETED entry (reports endpoint + page + PDF; per-property expenses + margin; Phase-6 sub-project A); clean up any seeded test expense; `git add admin-portal/dist AGENT_WORK_LOG.md`.
- [ ] **Step 4: Commit** — `chore(sales-reports): work-log + rebuild dist; Phase-6 sub-project A done`

---

## Self-Review

**Spec coverage:** §2 expenses store/CRUD → Task 1; reports blocks → Task 2; §4 Reports page + PDF → Task 3; Expenses sub-panel → Task 4; §5 testing → Tasks 1–5. Deferred (attribution, portal, charts) absent — correct.

**Placeholder scan:** migration, model, and expense CRUD are real code; the `report` handler is specified block-by-block with the exact source model + formula for each (a concrete aggregation spec, not "TBD"); the PDF path names the existing `html2pdf.js` pattern. Frontend tasks name endpoints, blocks, and the PDF mechanism.

**Type consistency:** reports payload block keys (`pipeline/conversion/settlement_forecast/overdue_receivables/fees/sla/workload/expenses/margin`) produced Task 2, consumed by the page Task 3. Expense shape (`category, amount, spent_on, description`) consistent across migration/model/CRUD (Task 1), services roll-in (Task 1 Step 5), and the property-file sub-panel (Task 4). Routes `/properties/:propertyId/expenses` + `/expenses/:id` + `/reports` consistent controller↔routes↔UI. Reuses verified `calculateSettlement`/`businessDays`.

**Reuse/non-regression:** the company `Expense` ledger and existing sales dashboards are untouched (new store + new read controller); DealEvent lacks stage-transition columns so days-in-stage uses `updated_at` (documented proxy, not a fabricated history).
