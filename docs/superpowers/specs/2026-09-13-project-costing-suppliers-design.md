# Project Costing & Suppliers — Design

**Date:** 2026-09-13
**Status:** Approved scope (full A/P + budget-vs-actual P&L)
**Applies to:** the shared service-operations engine (Interior Design first; per-line so Water Tank etc. are unaffected)

## Goal
Interior-firm-friendly project accounting: track **all costs per project**, manage
**suppliers** and **payments to suppliers**, compute **net project cost**, and from
the client contract value derive **gross profit / margin** and our fee income.

## Reuse (already exists)
- `wt_project_disbursements` — money-OUT rows (project_code, category, payee,
  payee_type default 'Supplier', amount, status, method, reference) + request→
  approve→pay flow + vouchers.
- `computeFinancials` — contract value, invoiced, collected, receivable, committed
  cost, disbursed, gross margin, margin %, net position.

## What we add

### 1. Supplier register — `wt_suppliers` (migration + model + controller + routes + UI)
Fields: id, branch_id, service_line, code (SUP-…), name, category, contact_person,
phone, email, address, bank_details (JSON: bank/branch/account/bkash), opening_balance,
notes, is_active, created_by, timestamps. Running balance = Σ bills − Σ payments.
Endpoints under `/api/wt-suppliers`: list (q search), detail (+ statement), create,
update, deactivate. Scoped by service_line.

### 2. Supplier bills / payables — `wt_supplier_bills` (migration + model + controller + routes)
What we OWE a supplier. Fields: id, branch_id, service_line, bill_code (SB-…),
supplier_id, supplier_name, project_code, category, description, bill_date, due_date,
total, amount_paid, balance, status (unpaid|partial|paid|void), bill_url, notes,
created_by, timestamps. Actions:
- create (per project + category)
- pay (partial allowed) → creates a `wt_project_disbursements` row (payee_type
  'Supplier', links bill_code) via the existing pay flow, updates amount_paid/
  balance/status and the supplier's running balance.
- void (admin).

### 3. Interior cost categories (config, per line)
`ui.cost_categories`: Materials, Furniture, Joinery/Carpentry, Painting, Electrical,
Plumbing, Flooring, False Ceiling, Labour, Subcontractor, Transport, Permits/Govt,
Design/Consultant, Misc. WT keeps its own (Provider Payout, Materials, Transport,
Lab Testing, Government Fee, Equipment Hire, Reimbursement, Other).

### 4. Project Cost Sheet / P&L (enhance computeFinancials + ProjectDetail "Costing" tab)
- **Income**: contract value / invoiced / collected + approved variations.
- **Costs by category**: from supplier bills + disbursements, committed (billed) vs
  actual (paid).
- **Budget vs actual**: optional per-category estimate stored on the project
  (`cost_budget` JSON); show over/under.
- **Net project cost → gross profit → margin %**; our design/PM fee income shown
  separately.
- New `costing` block returned by the project detail; a "Costing" tab renders it.

### 5. Budget/estimate capture
Project detail lets ops set a per-category budget (internal cost estimate). Stored on
`wt_projects.cost_budget` (JSON). Drives budget-vs-actual.

### 6. Firm-wide accounting view (new screen under the console)
`/…/costing`: supplier **payables outstanding** (by supplier + project), **expenses
by project**, and **project profitability** (contract − cost = profit, margin %),
sortable. Read endpoints aggregate the above.

## Migrations
- `0123-wt-suppliers`
- `0124-wt-supplier-bills`
- `0125-wt-project-cost-budget` (add `cost_budget` JSON to wt_projects)

## Non-goals
- No general ledger / double-entry accounting. This is project-level costing + A/P.
- No tax filing. VAT already handled on invoices.

## Verification
Extend `e2eInteriorDesign.js`: create supplier → bill on a project → part-pay →
assert supplier balance + project costing (category totals, gross profit, margin,
budget-vs-actual) → firm-wide payables/profitability. Interior + PM harness stay green.

## Build increments (checkpointed)
1. Suppliers (register + UI).
2. Supplier bills + payments (payables, pay→disbursement).
3. Project Cost Sheet / P&L + budget capture + Costing tab.
4. Firm-wide Costing dashboard.
5. E2E + regression.
