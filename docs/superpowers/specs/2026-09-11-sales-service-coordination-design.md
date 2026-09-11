# Sales Service Coordination — design spec

**Date:** 2026-09-12 · **Branch:** `air-conditioning/phase-0-duplicate` (not merged)
**Plan:** `PROPERTY_SALES_SAAS_PHASED_PLAN.md` §Phase 5 (link service requests, approvals, provider progress, work evidence and financial commitments to property/deal workspaces).
**Status:** design approved in brainstorming; awaiting spec review before the implementation plan.

**Phase 5, sub-project C of 3 — the last (A sales inbox ✅, B templates/delivery ✅).**
Surface the service work a sale property needs (preparation, repairs, marketing
production) on the property file: its **work orders** (provider, status,
scheduled/completed, before/after evidence, amount), a **financial-commitments**
summary (the property's fee invoices + work-order amounts), and a **raise-a-work-
order** action from the deal — reusing the existing WorkOrder engine.

Verified against current source 2026-09-12. `WorkOrder` (table via
`workOrder.controller`) is property-keyed: `property_id, provider_id, service_id,
title, scope, status ENUM(draft/issued/accepted/in_progress/completed/cancelled),
scheduled_date, completed_date, amount, before_photos[] / after_photos[] (JSON
evidence), provider_notes`. `GET /api/work-orders?property_id&status` and
`POST /api/work-orders` (FIELDS whitelist incl. property_id) already exist,
mounted `/api/work-orders`, roles super_admin/branch_admin/property_manager/
accounts. The sales property file has SECTIONS overview…activity but **no
service section**. PropertyInvoice is property-keyed (fee commitments, incl. the
`agreement_envelope_id` fee invoices from Phase-4 C). SOP `Project` is already
shown in the Workflow section.

---

## 1. Goal

On a sale property, a **Services** section shows every work order for that
property with its provider, live status, dates, evidence (before/after photo
counts) and amount; a commitments summary (open vs paid fee invoices + committed
work-order value); and a "Raise service work order" action that creates a
WorkOrder against the property (prefilled) without leaving the deal.

## 2. Scope

**In:**
- **Aggregation endpoint** `GET /api/sales/properties/:id/services` →
  `{ work_orders:[{ id, work_order_code, title, provider_id, provider_name?,
  status, scheduled_date, completed_date, amount, before_count, after_count }],
  commitments:{ invoices:[{ invoice_code, title, status, total, agreement_envelope_id }],
  totals:{ invoiced, paid, outstanding, work_order_committed } } }`. Branch-scoped,
  read-only; resolves provider names via an id-map.
- **Create passthrough:** the "Raise service work order" action posts to the
  EXISTING `POST /api/work-orders` with `property_id` (+ title/scope/provider/
  scheduled_date/amount) prefilled — no new create logic. (Its role set governs;
  the aggregation read is sales-role-scoped.)
- **Frontend Services section** on `SalesPropertyFile.jsx` (new SECTIONS entry):
  a work-orders table (code, title, provider, status badge, scheduled/completed,
  evidence counts, amount), a commitments summary strip (invoiced / paid /
  outstanding / committed), and an "Add work order" drawer (title, scope,
  provider `Combo`, scheduled date, amount) → the work-order create endpoint,
  then refetch.

**Out (deferred / non-goals):**
- Provider-side progress capture / provider portal (providers update status in
  the existing Services/WT consoles; this only *surfaces* their progress).
- Editing/approving/assigning work orders here (those stay in the Services
  console; this offers read + raise). A row can link out to the work order.
- WT/Care-specific work orders (WtWorkOrder is client/project-keyed, not
  property_id) — only the general property WorkOrder is aggregated.
- Any change to the WorkOrder engine, settlement, or invoicing.

## 3. Backend — aggregation

`sales.controller.propertyServices` (or a small `salesServices.controller`),
route `GET /api/sales/properties/:id/services` (READ/PREPARE sales roles,
branch-scoped, mounted before `/api/sales`). Load the property (404 if missing),
then in parallel:
- `WorkOrder.findAll({ where: { property_id, ...branch }, order: [['created_at','DESC']] })`
  → map to the display shape; `before_count`/`after_count` = `(before_photos||[]).length`.
- Resolve `provider_id`s via one `ServiceProvider.findAll` id-map for names.
- `PropertyInvoice.findAll({ where: { property_id, ...branch } })` → invoices +
  totals (`invoiced` = Σ total, `paid` = Σ amount_paid, `outstanding` = invoiced−paid).
- `work_order_committed` = Σ work-order `amount` for non-cancelled orders.
Return the `{ work_orders, commitments }` payload. Read-only.

## 4. Frontend

`SalesPropertyFile.jsx`: add a **"Services"** SECTIONS entry (icon Wrench/Hammer,
after Workflow). On open, `GET /sales/properties/:id/services`.
- **Commitments strip:** four stat tiles — Invoiced, Paid, Outstanding, Work
  committed (BDT).
- **Work orders table:** code, title, provider name, `StatusBadge status`,
  scheduled/completed dates, evidence (📎 before/after counts), amount. Empty
  state when none.
- **Add work order:** a Drawer (title*, scope, provider `Combo endpoint="/providers"`,
  scheduled_date, amount) → `POST /work-orders { property_id: id, ...form }` →
  toast + refetch. Gated by `canPrepare`.
Reuse `ui/kit` + `ui/pickers`; confined to the new section.

## 5. Testing & verification

- **Endpoint (live):** on a sale property with a WorkOrder + fee invoices,
  `GET /api/sales/properties/:id/services` returns the work orders (with provider
  name, status, evidence counts, amount) and commitments totals (invoiced/paid/
  outstanding/committed); a property with none → empty arrays + zero totals.
- **Create (live):** `POST /api/work-orders { property_id, title, amount }` (the
  same call the UI makes) creates a WorkOrder that then appears in the services
  aggregation for that property.
- **Browser:** the Services section shows the commitments strip + work-orders
  table; "Add work order" creates one and it appears; evidence counts render.
- **Non-regression:** the WorkOrder engine, Services console, settlement and
  invoicing are unchanged; backend `npm test` (7+5+27) + `npm run test:full`
  (28/0) unaffected (additive read + reuse of the existing create); build clean.
- **Acceptance:** a sale property's service work, provider progress, evidence and
  financial commitments are visible on the deal, and staff can raise a work order
  from there.

## 6. File plan

**Backend (modify):** add `exports.propertyServices` to `sales.controller.js` and
`router.get('/properties/:propertyId/services', roleMiddleware(READ), ctrl.propertyServices)`
to `sales.routes.js` — **beside the existing `/properties/:propertyId/sop`**
(same router/shape, already proven; no new mount, no prefix-capture issue).
**Frontend (modify):** `admin-portal/src/screens/sales/SalesPropertyFile.jsx`
(Services section + add-work-order drawer).
**Schema:** none.

## 7. Risks & non-goals

- **Route resolution (settled):** the route is added to `sales.routes` beside the
  existing, working `/properties/:propertyId/sop` — same router, same shape — so
  there is no prefix-capture issue and no new top-level mount.
- **Reuse, not reinvent:** WorkOrder create/list are used as-is; this is an
  aggregation + a prefilled create passthrough. No engine change.
- **Role mismatch:** the work-order create endpoint's roles
  (super_admin/branch_admin/property_manager/accounts) exclude sales_executive;
  the Add action simply surfaces the endpoint's own error for a sales_executive
  (acceptable — read/aggregation is sales-scoped; raising is a manager action).
  Noted, not worked around.
- **WT/Care work orders excluded** (different keying); only the general property
  WorkOrder is in scope.
- **Non-goals:** provider portal, work-order approval/assignment here, engine/
  settlement/invoicing changes.
