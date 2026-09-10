# Settlement Desk — design spec

**Date:** 2026-09-11 · **Branch:** `air-conditioning/phase-0-duplicate` (not merged)
**Plan:** `PROPERTY_SALES_SAAS_PHASED_PLAN.md` §6 (settlement simplification), §9 Phase 2.
**Status:** design approved in brainstorming; awaiting spec review before writing the implementation plan.

This is **sub-project 1 of Phase 2** (owner decision, 2026-09-11): the five-view
Settlement Desk + capture-once (plan deliverables 2 & 3). The workspace-routes
restructure of the whole `SalesPropertyFile` monolith, the Accounting landing
page and role-based work queues (deliverables 1 & 4) are a **separate later
sub-project** with their own spec.

Everything below was checked against the live source and the running app on
2026-09-11; the Phase-1 harnesses (`npm test`, `npm run test:full`) prove the
money endpoints this desk drives.

---

## 1. Goal

Replace the two existing settlement UIs — the property-centric money/bank/records
section inside the 7,703-line `SalesPropertyFile.jsx`, and the deal-centric
`DealSettlementWorkspace.jsx` embedded in the DealsBoard drawer — with **one
canonical Settlement Desk**: a full-page workspace organised around *what a
person does* (Prepare · Review & approve · Record money · Match bank · Complete),
not around the database tables. It must make the next action obvious, capture
known money data once, and cut the clicks for the two routine tasks by ≥40%.

## 2. Scope

**In (this sub-project):**
- A new `SettlementDesk` page at a stable route, built from five focused view
  components + a shared data hook + a shared audit panel (Approach A).
- Both settlement types: **completion** (happy path) and **withdrawal/refund**.
- Capture-once prefill for the Receive and Pay forms; one-click payout.
- Canonical wiring: DealsBoard drawer and the bulk screen point at the desk;
  `DealSettlementWorkspace.jsx` retires.
- Mobile-optimised layout (stage selector, sticky next action, full-screen forms).
- Before/after action counts as the acceptance evidence for the 40% gate.

**Out (deferred to Phase-2 sub-project 2 or later):**
- Restructuring the rest of `SalesPropertyFile` (parties, assessment, enquiries,
  offers, onboarding, documents, activity) into routed tabs. Those sections are
  **untouched**; only the settlement section changes (to a summary + desk entry).
- The Accounting landing page and role-based pending-work queues.
- Any change to the `/sales` money endpoints or database schema.
- Fixing the unrelated `GET /api/deals/:id` eager-load bug (flagged separately).

## 3. Architecture

**Route.** `…/property/:id/settlement`, registered under **both** bases the
property file uses today — `/residential/property/:id/settlement` (console) and
`/sales/property/:id/settlement` (global, for commercial/rural parity). Added to
`screens/sales/paths.js` as `settlementDeskPath(category, id)`, mirroring the
existing `propertyFilePath` helper so navigation lives in one place.
`SalesPropertyFile`'s settlement section becomes a compact summary card (badges +
next action) with an **"Open Settlement Desk"** link; the desk is a full page, so
refresh / back / deep-link hold position.

**One data hook.** `useSettlementDesk(propertyId)` is the page's single source of
truth. It composes **existing** `/sales` reads and refetches after every mutation:
- `GET /sales/properties/:id` — settlement, lines, payments, disbursements,
  transaction parties, trust snapshot, compliance/withdrawal blockers, nextAction.
- `GET /sales/settlements/:sid/statement` — running balance, totals, per-entry
  reconciliation state.
- `GET /sales/settlements/:sid/agency-fees` — the agency quote (Pay-form prefill).
- `GET /sales/settlements/:sid/bank-lines` — candidate trust-bank lines (matching).
It exposes `{ picture, refetch, busy, error }`. Bank-match **suggestions** are
ranked client-side from `bank-lines` (by bank account, signed amount,
reference/date, party) — no backend suggestion endpoint.

**Design principle — zero new money endpoints.** The desk is a pure client over
the endpoints the Phase-1 harnesses already prove. All money rules stay
server-side and cannot be bypassed from the client. `capture-once` is a frontend
prefill concern, not a schema change. The full-lock harness (`npm run test:full`)
re-verifies the whole flow after the UI change.

## 4. The desk shell & five views

**Shell** (`SettlementDesk.jsx`):
- **Header** — property + parties; the four headline badges **Contract ·
  Settlement · Money due · Payouts** (derived from evidence, per plan §6); and
  **one prominent current-stage action** from the property file's existing
  `nextAction` logic (`submit` / `review` / `approve` / `clear:<blocker>` /
  `lock` / `complete`).
- **Quiet stepper** — `Prepare › Review › Record › Match › Complete`, showing
  each view's state and acting as a **free view selector, not a forced sequence**
  (as established by the Phase-1 stepper, commit `118c3de`). Deep-linkable via a
  `?view=` query param so a Resolve link can jump straight to a view.
- **Active view body**, then an expandable **`<AuditPanel>`** (trust ledger,
  beneficiary ledgers, journal refs, approval trail) — raw detail one disclosure
  away, never in the primary flow.

**Views** (each its own file under `screens/sales/settlement-desk/`):

1. **`PrepareView`** — obligation schedule (purchase_price, commission,
   advertising, vendor_proceeds, refunds), expected-vs-actual, payees & due
   dates. Edit a fee with mandatory reason (`PATCH /settlement-lines/:id/fee`),
   rebalance (`POST /settlements/:sid/rebalance`). Enabled only while
   `draft`/`returned`.
2. **`ReviewApproveView`** — the same statement read-only, with the role-gated
   lifecycle action tied to the settlement version (`submit`/`review`/`approve`/
   `return`), separation-of-duties messaging + super-admin written-reason
   override, and the approval trail. Independent of Prepare, as policy requires.
3. **`RecordMoneyView`** — the capture-once Receive and Pay forms (§5). One
   payment record per action.
4. **`MatchBankView`** — cleared payments awaiting reconciliation, each with
   client-ranked suggested bank lines; confirm a match
   (`POST /payments/:id/reconcile`) or import a line
   (`POST /settlements/:sid/bank-lines`). Exceptions stay outstanding; a line is
   never fabricated to clear a blocker.
5. **`CompleteView`** — the readiness check listing blockers, each with a
   **Resolve link that jumps to the owning view** (`?view=`); Lock
   (`POST /settlements/:sid/lock`); and the closing statement + vendor invoice
   (`POST /settlements/:sid/vendor-invoice`).

Shared: `useSettlementDesk`, `<AuditPanel>`, and a `settlementMoney` helper module
(minor-unit maths, badge derivation, prefill builders) so no view re-implements
money logic.

## 5. Capture-once

Two forms in `RecordMoneyView`, both prefilled so nothing known is retyped:

- **Receive** — payer defaults to the primary buyer party, amount to the
  remaining due (`purchase_price − cleared receipts`), with
  account/reference/`payment_kind:'buyer_receipt'` defaulted. Staff enter evidence
  once; save → `POST /settlements/:sid/payments`, which server-side creates the
  payment, posts the journal and records the trust receipt atomically.
- **Pay** — pick an approved payable line → beneficiary + verified destination
  prefill (the vendor party's verified bank account, or the agency operating
  account from the profile/quote). **One-click "Pay out"** chains
  create-disbursement → record-outgoing payment → clear behind one confirmation
  (the `DealSettlementWorkspace` pattern), resuming wherever a prior attempt
  stopped; then Match bank → Mark paid. Manual vs provider transfer clearly
  labelled.

This satisfies the gate's "no repeated entry of known payee/property/amount":
every value is read from the settlement lines, parties and agency quote the desk
already holds.

## 6. Withdrawal / refund

The desk detects `settlement_type === 'withdrawal'` and reshapes the same five
views: **Prepare** shows the withdrawal schedule (owner/company deductions, refund
due to the buyer), **Complete** runs `withdrawalBlockers` instead of
`complianceBlockers`, and Lock unwinds the transaction (offer withdrawn, property
back to `available`, deal cancelled) — all already server-side. Entry: an
"Unwind / refund" action opens a withdrawal settlement
(`POST /sales/transactions/:id/withdrawal`) when a deal must be reversed after
receipts. Same view components, relabelled; money-out here is the buyer refund.

## 7. Canonical wiring & retirement

- **DealsBoard drawer** — replace the embedded `DealSettlementWorkspace` with a
  compact summary (four badges + next action) and an **"Open Settlement Desk"**
  button navigating to `settlementDeskPath(category, propertyId)`.
- **`SalesBulkSettlement.jsx`** — keep its Phase-1 `/sales` readiness+lock path;
  add a per-row link into the desk's **Complete** view so a not-ready row is
  resolved in place.
- **`SalesPropertyFile` settlement section** — collapse to a summary card +
  desk link; remove the money/bank/records sub-tab rendering from the monolith
  (net reduction to the 7,703-line file).
- **`DealSettlementWorkspace.jsx` retires** — after its reusable bits (one-click
  payout chain, statement table, bank-match list) are ported into the desk views,
  delete the file.

## 8. Mobile

- **Desktop** — header + quiet stepper + active view + audit panel, full width.
- **Phone width (~≤640px)** — stepper collapses to a compact **stage selector**;
  header reduces to badges + a **sticky next-action** bar; forms go **full-screen**;
  wide tables/statements scroll inside their own `overflow-x` container (body
  never scrolls sideways).
- Responsive throughout (relative units, flex/grid wrap-and-stack), working from
  desktop down to ~400px.

## 9. The 40% gate — methodology, baseline, targets

**Acceptance evidence = discrete action counts, before and after** (owner
decision, 2026-09-11). An *action* = one click **or** one field entry **or** one
navigation between screens/tabs/drawers. Counts are for a *prepared* case (parties,
profile, approved settlement already in place), starting from the property/deal
landing, for the two routine tasks.

**Baseline (current `SalesPropertyFile` settlement flow — to be confirmed exactly
during implementation by counting against the running app):**
- *Record a buyer receipt:* open property file → Settlement section → Money tab →
  open Record-payment drawer → set direction, kind, party, amount, reference,
  account (≈6 fields) → save → post/clear → open reconcile → pick bank line →
  confirm. **Estimated ~16–18 actions.**
- *Pay a payout:* Settlement → Money → verify/select recipient account → open
  prepare-disbursement drawer (payee, line, account, amount ≈4 fields) → save →
  allocate/record outgoing payment → clear → reconcile → mark paid.
  **Estimated ~18–20 actions.**

**Targets (desk):** each ≤ 60% of its confirmed baseline (i.e. ≥40% fewer). The
implementation plan's final task records the confirmed before/after counts for
both tasks in the plan report and this spec's acceptance section; the sub-project
is not "done" until both show ≥40% reduction. Wall-clock timing and the
three-staff acceptance test remain part of the overall Phase-2 gate, run later.

## 10. Testing & verification

- **Money path unchanged, re-proven:** `cd backend && npm test` (unit + fast
  e2e) and `npm run test:full` (full lock-to-'sold') must both stay green after
  the UI change — the desk drives the same endpoints.
- **Frontend build:** `cd admin-portal && npm run build` clean after each task.
- **Browser walkthrough** on a prepared property: run each of the five views;
  record a receipt and a payout through the desk; confirm the four badges and the
  next-action button track state; confirm a blocker's Resolve link jumps to the
  right view; complete (lock) a settlement and see property→sold; exercise a
  withdrawal settlement to refund.
- **Responsive check** at ~400px and ~640px (stage selector, sticky action,
  no horizontal body scroll).
- **Regression sweep:** DealsBoard drawer opens the desk; bulk screen row links
  in; the retired `DealSettlementWorkspace` import is gone and nothing references
  it; the trimmed `SalesPropertyFile` still renders every other section.
- **Action-count capture** for the two routine tasks, before (current) and after
  (desk), recorded as §9 evidence.

## 11. File plan

**New:**
- `admin-portal/src/screens/sales/settlement-desk/SettlementDesk.jsx` (shell + route entry)
- `.../settlement-desk/useSettlementDesk.js` (data hook)
- `.../settlement-desk/PrepareView.jsx`
- `.../settlement-desk/ReviewApproveView.jsx`
- `.../settlement-desk/RecordMoneyView.jsx`
- `.../settlement-desk/MatchBankView.jsx`
- `.../settlement-desk/CompleteView.jsx`
- `.../settlement-desk/AuditPanel.jsx`
- `.../settlement-desk/settlementMoney.js` (shared money/prefill/badge helpers)

**Modified:**
- `admin-portal/src/App.jsx` — register the desk route under both bases.
- `admin-portal/src/screens/sales/paths.js` — `settlementDeskPath`.
- `admin-portal/src/screens/sales/SalesPropertyFile.jsx` — settlement section →
  summary + desk link; remove money/bank/records sub-tab rendering.
- `admin-portal/src/screens/DealsBoard.jsx` — drawer → desk link.
- `admin-portal/src/screens/SalesBulkSettlement.jsx` — per-row desk link.

**Deleted:**
- `admin-portal/src/screens/sales/DealSettlementWorkspace.jsx` (after porting).

**Backend:** none.

## 12. Risks & non-goals

- **Money-critical reimplementation.** Mitigated by: rules are server-side; the
  two harnesses re-verify the full flow; behaviour parity is checked view by view
  against the current section before its old code is removed.
- **Monolith churn.** Removing the settlement sub-tab from `SalesPropertyFile`
  touches a 7,703-line file. The change is confined to the settlement section's
  render + its now-unused helpers; other sections are not restructured here.
- **Non-goal:** no new endpoints, no schema change, no restructuring of the other
  eight sections, no Accounting landing / work queues (sub-project 2).
