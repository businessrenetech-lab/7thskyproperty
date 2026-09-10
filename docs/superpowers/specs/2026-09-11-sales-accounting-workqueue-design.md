# Sales Accounting Overview + Work Queue — design spec

**Date:** 2026-09-11 · **Branch:** `air-conditioning/phase-0-duplicate` (not merged)
**Plan:** `PROPERTY_SALES_SAAS_PHASED_PLAN.md` §7 (nav), §9 Phase 2 (deliverable 4).
**Status:** design approved in brainstorming; awaiting spec review before the implementation plan.

This is **Phase 2 sub-project 2** (owner decision, 2026-09-11): the new-capability
half of Phase 2 — a portfolio **Accounting overview** and a role-based **Work
Queue** for residential sales. The URL-routed restructure of the rest of
`SalesPropertyFile` (plan deliverable 1) is deferred to its own later
sub-project; sub-project 1 already delivered the Settlement Desk (deliverables 2 & 3).

Checked against the live source on 2026-09-11. The Settlement Desk
(`…/property/:id/settlement`) and `settlementDeskPath(category, id)` from
sub-project 1 are the drill-in target for every row here.

---

## 1. Goal

Give residential sales two portfolio-level screens that answer "where's the
money across all deals?" and "what do I need to do today?", each drilling into
the per-deal Settlement Desk rather than duplicating it. Both are **read-only
aggregates** — no money actions live here; those stay in the desk.

## 2. Scope

**In:**
- Two read-only aggregate endpoints: `GET /sales/accounting-overview` and
  `GET /sales/work-queue`, reusing the existing `/sales/dashboard` scan pattern.
- `AccountingOverview.jsx` at `/residential/accounting` — headline figures +
  four finance worklists, each row drilling into the desk.
- `SalesWorkQueue.jsx` at `/residential/work-queue` — role-filtered pending
  items grouped by lifecycle kind, each with a Go link into the desk.
- Nav entries in the residential console (Work Queue in Home, Accounting in Money).

**Out (deferred / non-goals):**
- The URL-routed restructure of `SalesPropertyFile`'s eight non-settlement
  sections (deliverable 1) — separate later sub-project.
- Any money mutation, schema change, or new settlement UI (the desk owns those).
- A task/assignment model — the queue is *derived* from existing
  status/next-action/blocker data, not stored task records.
- Inspections/KYC as first-class queue items — v1 surfaces the settlement
  lifecycle + offer-review; inspections/KYC can be summary tiles linking out.

## 3. Backend — two read-only endpoints

Both are `roleMiddleware(READ)`, branch-scoped exactly like `dashboard`, and
reuse its scan: load the branch's sale properties → their in-flight
`SaleSettlement`s including `lines`/`payments`/`disbursements` → per-settlement
`calculateSettlement(lines, payments, disbursements)`. No `complianceBlockers`
call (too heavy for a list); readiness for the "to lock" list is approximated
from the calculations (residual 0, no pending disbursements, receipts ≥ price)
and confirmed authoritatively by the desk's own lock. New money logic: none.

### 3a. `GET /sales/accounting-overview`

```
{
  headline: {
    trust_cash_held,           // Σ funds_held (receipts − disbursed), in-flight settlements
    buyer_receivable,          // Σ max(0, purchase_price − receipts)
    agency_fees_outstanding,   // Σ (agency lines[commission,advertising] − paid agency disbursements)
    payables_outstanding,      // Σ (vendor_proceeds + third-party/deduction lines − paid disbursements)
    completed_sales_value,     // Σ purchase_price of locked settlements
    completed_sales_count
  },
  worklists: {
    awaiting_receipt: [ { deal_id, property_id, property_code, title, expected, received } ],
    payouts_to_pay:   [ { deal_id, property_id, property_code, title, amount } ],
    to_approve:       [ { deal_id, property_id, property_code, title, status } ],
    to_lock:          [ { deal_id, property_id, property_code, title } ]
  }
}
```
- `awaiting_receipt`: in-flight settlement with `receipts < purchase_price`.
- `payouts_to_pay`: `status === 'approved'` with any disbursement not in
  (`paid`,`cancelled`), amount = Σ those.
- `to_approve`: settlement status in (`submitted`,`reviewed`).
- `to_lock`: `status === 'approved'` and calc-ready (residual 0, no pending
  disbursements). Rows carry `deal_id`/`property_id` even where a value is 0.
- `property_id` on every row → `settlementDeskPath` drill-in.

### 3b. `GET /sales/work-queue`

```
{ items: [ { deal_id, property_id, property_code, title, kind, label, role, amount? } ] }
```
- `kind` → owning role and desk view:
  | kind | when (settlement) | role | desk view |
  |---|---|---|---|
  | `prepare` | draft/returned, no lines drafted | prepare | prepare |
  | `submit` | draft/returned, lines ready | prepare | review |
  | `review` | submitted | accounts | review |
  | `approve` | reviewed | admin | review |
  | `record_receipt` | approved, receipts < price | accounts | record |
  | `match_bank` | approved, a cleared payment unreconciled | accounts | match |
  | `pay_out` | approved, a prepared/pending disbursement | accounts | record |
  | `lock` | approved, calc-ready | admin | complete |
  | `offer_review` | property has a submitted/countered offer | prepare | (offers) |
- Server filters `items` to the caller's role by default; `?scope=all` returns
  everything (only honoured for admin/manager — `super_admin`,`branch_admin`,
  `property_manager`). Role→kind map mirrors the desk's client gates
  (accounts = super_admin/branch_admin/accounts; admin = super_admin/branch_admin;
  prepare = super_admin/branch_admin/property_manager/sales_executive).
- `label` is a human sentence ("Approve settlement for House 20 Kallanpur");
  `amount` present on money kinds.

## 4. Frontend — Accounting overview (`/residential/accounting`)

`admin-portal/src/screens/sales/AccountingOverview.jsx`. One fetch of
`/sales/accounting-overview`; no per-row calls. Read-only.
- **Headline row** — five `StatCard`s (Trust cash held · Buyer receivable ·
  Agency fees outstanding · Payables outstanding · Completed sales value+count),
  tabular figures.
- **Four worklist cards** (`awaiting_receipt`→`?view=record`,
  `payouts_to_pay`→`?view=record`, `to_approve`→`?view=review`,
  `to_lock`→`?view=complete`), each a `tbl` with an **Open desk** button per row
  using `settlementDeskPath('residential', property_id)`.
- Per-card empty states, Refresh, loading skeleton, honest error (never render a
  zero figure when the fetch failed). Responsive: cards wrap; tables scroll in
  their own `overflow-x` box; ≥16px side gutter.

## 5. Frontend — Work Queue (`/residential/work-queue`)

`admin-portal/src/screens/sales/SalesWorkQueue.jsx`. One fetch of
`/sales/work-queue` (+ `?scope=all` when toggled). 
- **Header** with a **My work / All** scope toggle — *All* shown only to
  admin/manager roles; default *My work*.
- **Items grouped by `kind`** in lifecycle order (Prepare/Submit · Review ·
  Approve · Record receipt · Match bank · Pay out · Lock · Offer review), a count
  badge per group, each row = title + `label` (+ `amount`) and a **Go** button →
  `settlementDeskPath('residential', property_id) + '?view=<owning view>'`
  (`offer_review` → the property file offers section).
- Overall empty state ("You're all caught up"), Refresh, skeleton. Responsive.

## 6. Nav wiring

`admin-portal/src/config/consoles.js` residential block:
- **Home** group → add `{ to: '/residential/work-queue', label: 'My Work Queue', icon: Inbox }` at top.
- **Money** group → add `{ to: '/residential/accounting', label: 'Accounting', icon: Landmark }` (beside Settlements (Bulk)).
`admin-portal/src/App.jsx`: register both routes under the residential console layout.

## 7. Testing & verification

- **No money change, re-proven:** backend `npm test` (27/0) and `npm run
  test:full` (28/0) must stay green — these endpoints are read-only.
- **Frontend build** clean after each task.
- **Endpoint checks (live, admin token, X-Branch-Id:1):**
  `GET /sales/accounting-overview` returns the headline + four worklists;
  `GET /sales/work-queue` returns role-filtered items, and `?scope=all` widens
  for an admin. Figures reconcile with `GET /sales/dashboard` metrics
  (`client_funds_held`, `settlements_review`, `payout_exceptions`).
- **Browser walkthrough:** both pages render with real data; a worklist/queue
  row drills into the correct desk view; empty and error states behave; phone
  width works.
- **Acceptance:** the overview's figures and worklists, and the queue's items,
  match the underlying settlement data for a known set of deals; role filtering
  verified for an accounts vs admin user (or via `scope`).

## 8. File plan

**Backend (modify):**
- `backend/controllers/sales.controller.js` — add `accountingOverview` and
  `workQueue` handlers (reusing the dashboard scan helpers).
- `backend/routes/sales.routes.js` — `GET /accounting-overview`, `GET /work-queue`
  (both `roleMiddleware(READ)`).

**Frontend (new):**
- `admin-portal/src/screens/sales/AccountingOverview.jsx`
- `admin-portal/src/screens/sales/SalesWorkQueue.jsx`

**Frontend (modify):**
- `admin-portal/src/App.jsx` — two routes.
- `admin-portal/src/config/consoles.js` — two nav entries.

**Schema / migrations:** none.

## 9. Risks & non-goals

- **Aggregate query cost.** Both endpoints scan the branch's in-flight
  settlements (as the dashboard already does). Acceptable at current data
  volume; if it grows, add pagination/caching later. No `complianceBlockers` in
  the list path (kept cheap); the desk confirms readiness authoritatively.
- **Derived, not authoritative.** The queue/worklists are hints derived from
  status + calculations; the desk's server gates remain the source of truth for
  every action.
- **Non-goal:** no money mutation, no schema change, no `SalesPropertyFile`
  restructure, no task/assignment model.
