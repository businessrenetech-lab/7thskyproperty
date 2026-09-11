# Sales Reports & Analytics (+ per-property expenses) — design spec

**Date:** 2026-09-12 · **Branch:** `air-conditioning/phase-0-duplicate` (not merged)
**Plan:** `PROPERTY_SALES_SAAS_PHASED_PLAN.md` §Phase 6 (reports; expected/actual fees; pipeline age; conversion; SLA; forecast; overdue receivables; workload; brokerage margin).
**Status:** design approved in brainstorming; awaiting spec review before the implementation plan.

**Phase 6, sub-project A of 3** (B = lead routing/attribution/sequences;
C = buyer/seller portal). A read-only **Sales Reports** page over existing
records — pipeline age + conversion, settlement forecast + overdue receivables,
expected-vs-actual fees, response-SLA + workload — plus lightweight **per-property
expense tracking** (marketing / advertising / other) that feeds a brokerage-margin
view, all **PDF-downloadable**.

Verified against current source 2026-09-12. Sales has `dashboard` /
`accountingOverview` / `workQueue` (counters + worklists) but **no analytical
reports**. `PropertyDeal` has `status` (lead→…→completed), `settlement_date`,
`created_at`; `SalesEnquiry` has `stage`, `created_at`, `assigned_officer_id`,
`viewing_date`; `SaleProfile` has `commission_percent`/`commission_fixed`/
`marketing_budget`; `PropertyInvoice` carries fee invoices (+ Phase-4C
`agreement_envelope_id`); settlements carry commission/advertising line types.
The general `Expense` model has **no `property_id`** (company ledger) → per-property
sales expenses need a light store. `html2pdf.js` is already used client-side
(`AdminReportsHub.jsx`, `Payroll.jsx`) — the proven PDF path.

---

## 1. Goal

Staff open a "Reports" page (residential console), pick a date range, and see
pipeline health, conversion, upcoming settlements + overdue receivables, fees
expected vs actually invoiced/collected, response-SLA + per-assignee workload,
and per-property expenses rolled into a margin view — and download any of it as
a PDF. Staff can record marketing/advertising/other expenses against a property
from its file.

## 2. Scope

**In:**
- **Per-property expenses store:** `sale_property_expenses` table (`id, branch_id,
  property_id, category ENUM('marketing','advertising','staging','photography',
  'other'), amount, spent_on DATE, description, created_by, timestamps`) +
  CRUD at `/api/sales/properties/:propertyId/expenses` (list/create/delete,
  branch-scoped) + a small **Expenses** area on the property-file **Services**
  section (reuse that section) to add/list them.
- **Reports endpoint** `GET /api/sales/reports?from&to[&category]` → one
  read-aggregation returning the blocks:
  - `pipeline`: deals grouped by status with count + avg age (days since
    created) + avg days-in-current-stage (from the latest DealEvent/updated_at);
    `conversion`: counts of deals created in range that reached agreed/completed,
    and rates.
  - `settlement_forecast`: active transactions/deals with a `settlement_date` in
    range grouped by month (count + expected value); `overdue_receivables`: sale
    settlements where buyer receipts < purchase price and past due (expected,
    received, shortfall) — from the existing settlement calc.
  - `fees`: per completed/active sale — expected fee (commission_percent×price or
    commission_fixed, + marketing) vs invoiced (PropertyInvoice totals) vs
    collected (amount_paid); branch totals expected/invoiced/collected/variance.
  - `sla`: enquiries in range — first-response time (first outbound comm −
    created) vs a target (e.g. 1 business day, reusing businessDays), % within SLA;
    `workload`: per assignee — open deals, open enquiries, overdue SOP stages.
  - `expenses` / `margin`: per-property expense totals by category, and a margin
    line (fees collected − expenses) per property + branch total.
  Branch-scoped, read-only; bounded to the date range.
- **Reports page** `SalesReports.jsx` (residential console, nav under Home near
  Sell Dashboard): a date-range picker + category filter, each block rendered as
  a titled card (tables + simple stat tiles / lightweight bars), and a **Download
  PDF** button per section (and/or whole page) using the existing `html2pdf.js`
  pattern.

**Out (deferred / non-goals):**
- Lead routing / campaign attribution / follow-up sequences → sub-project B.
- Buyer/seller portal → sub-project C.
- Charting libraries (use CSS bars / the existing dataviz-free tiles; no new dep).
- Scheduled/emailed reports, saved report presets, cross-branch roll-ups.
- Editing the general company `Expense` ledger (untouched); this is a separate
  per-property sales-expense store.
- Client-investment analytics (a later slice).

## 3. Backend

- **Migration 0114:** `sale_property_expenses` (+ index branch_id, property_id).
- **Model** `SalePropertyExpense`.
- **Expenses CRUD** on `salesServices.controller` (or a small
  `salesExpense.controller`), routes `/api/sales/properties/:propertyId/expenses`
  (GET/POST) + `/api/sales/expenses/:id` (DELETE), beside the SOP/services routes
  in `sales.routes`. The services aggregation (`propertyServices`) gains an
  `expenses` block + rolls expense totals into `commitments`.
- **Reports controller** `salesReports.controller.report`, route
  `GET /api/sales/reports` in `sales.routes` (READ roles, branch-scoped). Pure
  aggregation with id-maps; reuses `calculateSettlement` for receivables/fees,
  `businessDays` for SLA, and existing models. No writes.

## 4. Frontend

- **SalesReports.jsx** at `/residential/reports` (nav "Reports" under Home): a
  from/to date range (default: last 90 days) + category filter; fetch
  `/sales/reports`; render blocks as cards — Pipeline (stage rows: count, avg
  age, avg days-in-stage), Conversion (rates), Settlement forecast (by-month
  table + total), Overdue receivables (table), Fees expected-vs-actual (table +
  variance), SLA (% within + avg first-response) + Workload (per-assignee table),
  Expenses & margin (per-property + totals). **Download PDF** via a lazy
  `import('html2pdf.js')` on a ref'd container (same as `AdminReportsHub.jsx`).
- **Property-file Services section:** an "Expenses" sub-panel — list
  (category, amount, date, note) + an "Add expense" inline form (category select,
  amount, date, note) → `POST …/expenses`, remove → DELETE; expense total shown
  in the commitments strip ("Expenses" tile) and margin.

## 5. Testing & verification

- **Migration 0114:** table + index; `down` drops it.
- **Expenses (live):** `POST /api/sales/properties/:id/expenses {category:'marketing',
  amount:8000,spent_on}` → row; `GET` lists it; the services endpoint's `expenses`
  total + commitments reflect it; `DELETE` removes it.
- **Reports (live):** `GET /api/sales/reports?from&to` returns all blocks with
  sane shapes — pipeline stage counts match the deals; conversion counts;
  settlement_forecast groups a deal with a settlement_date in range; fees block
  shows expected vs invoiced vs collected for a property with a fee invoice
  (from Phase-4C); sla computes a first-response for an enquiry with an outbound
  comm; workload lists assignees; expenses/margin reflect a seeded expense. An
  empty range → zeroed blocks, no error.
- **Browser:** the Reports page renders every block for a range; Download PDF
  produces a file (client-side); the property-file Expenses sub-panel adds/lists/
  removes an expense and the commitments strip updates.
- **Non-regression:** dashboard/accountingOverview/workQueue and the company
  Expense ledger are unchanged; backend `npm test` (7+5+27) + `npm run test:full`
  (28/0) unaffected; build clean.
- **Acceptance:** all selected reports tie back to records, per-property expenses
  are captured and roll into margin, and reports download as PDF.

## 6. File plan

**Backend (new):** `migrations/0114-sale-property-expenses.js`,
`models/SalePropertyExpense.js`, `controllers/salesReports.controller.js`
(+ expense handlers, or a small `salesExpense.controller.js`).
**Backend (modify):** `routes/sales.routes.js` (reports + expenses routes beside
SOP/services), `controllers/salesServices.controller.js` (expenses block +
commitments roll-in).
**Frontend (new):** `admin-portal/src/screens/sales/SalesReports.jsx`.
**Frontend (modify):** `screens/sales/SalesPropertyFile.jsx` (Expenses sub-panel
in Services), `config/consoles.js` (Reports nav), `App.jsx` (route).
**Schema:** migration 0114 (1 table).

## 7. Risks & non-goals

- **Read-heavy aggregation:** several grouped queries per report call, bounded by
  the date range + branch; acceptable for an on-demand page (Phase 7 can cache).
- **Fee "expected" is an estimate** from profile commission × price (or fixed +
  marketing) — clearly labelled expected vs invoiced vs collected; not a
  re-derivation of the settlement's authoritative figures.
- **Per-property expenses are a new light store**, separate from the company
  `Expense` ledger (which has no property_id) — no change to that ledger.
- **PDF is client-side** (`html2pdf.js`, already in the bundle) — no server PDF,
  no new dependency.
- **Non-goals:** attribution, sequences, portal, charts library, scheduled
  reports, investment analytics.
