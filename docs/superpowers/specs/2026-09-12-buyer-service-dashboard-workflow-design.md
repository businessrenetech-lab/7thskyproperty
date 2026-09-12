# Buyer Service Dashboard & 8-Stage Workflow — Design Spec

**Phase 6 sub-project (buyer service).** Branch: `air-conditioning/phase-0-duplicate`. Status: approved for planning.

## Goal

Give the residential **buyer service** its own dashboard and an 8-stage workflow
("buyer deal file"), mapping the Purchase SOP V0.1 stages 1–8. Reuse everything
already built for buyers; add only the genuinely-missing pieces. The buyer service
is fee-for-coordination — **Seventh Sky never holds the purchase funds** (no trust
settlement); it coordinates the external settlement and collects its own service
fees.

## Approved decisions

1. **Anchor = the buyer deal file.** The buy `PropertyDeal` (`deal_type='buy'`) is
   upgraded into a tabbed "buyer deal file" carrying the 8-stage workflow. The
   `BuyerMandate` feeds the search/shortlist stages.
2. **Workflow = the existing progressive-SOP engine.** A new `residential_purchase`
   vertical (a `workflow_templates` row + a `Project` per deal), exactly like the
   seller `properties_sale` SOP.
3. **Spec first, phased build.**

## The 8 stages (Purchase SOP V0.1 → workflow template)

`workflow_templates` row `vertical_key = 'residential_purchase'`, name
"Residential Purchase SOP", stages (each a gate with a required checklist):

1. **Enquiry & Consultation** — buyer/profile/source captured · consultation
   recorded · fees explained · Phase-1 quotation + RPPS agreement issued.
2. **Requirement Assessment & Planning** — finance readiness assessed · investment
   suitability · property-preference checklist · risk notes · search strategy ·
   approval to proceed to active search.
3. **Property Search & Shortlisting** — candidates identified · shortlist shared ·
   buyer feedback recorded.
4. **Inspection Coordination** — viewings scheduled · inspection notes/photos ·
   buyer inspection feedback.
5. **Documentation Review & Risk** — seller docs collected · ownership/mutation/
   conveyancing coordination · risk flags · buyer acknowledgement (disclaimer).
6. **Negotiation & Offer Coordination** — offers coordinated · negotiation history ·
   buyer approvals · counter-offers.
7. **Agreement & Settlement Coordination** — agreement executed · registration
   status · external settlement milestones · payment tracking · **our fee
   collection** · handover readiness. (Coordination only — no trust money.)
8. **Closure & Post-Purchase Follow-Up** — final reports/archive · buyer feedback ·
   **financial closure = all fees collected** · workflow closed.

## Architecture — reuse vs new

### Reuse (no new code, just wired into the file)
- **Progressive SOP engine** (`progressiveSop.service` + `workflowProject.service`
  `createProjectFromTemplate`, `Project`/`ProjectStage`) — the workflow strip.
- **SalesEnquiry** (stage 1 profile) · **BuyerMandate + MandateCandidate** (stages
  2–4 requirements/shortlist/viewing) · **RPPS agreement** + **agreement-fee
  invoices** + **Invoices tab collection** (stages 1 & 7 fees) · **buyer KYC** ·
  **SaleOffer** (stage 6).

### New (the thin/missing pieces)
- **Migration + template**: `workflow_templates` `residential_purchase` row.
- **New progressive-SOP vertical** `residential_purchase` in the REGISTRY
  (stagePhase / eventUnlocks / hints / phaseSla), phases: enquiry → planning →
  search → offer → settlement → closure.
- **Buyer deal SOP controller** — `getSop`/`ensureSop` find-or-create a `Project`
  keyed to the **buy deal** (`property_deal_id` + `vertical_key`), mirroring
  `salesSop.controller` but deal-keyed instead of property-keyed.
- **BuyerMandate fields** (migration, additive): `finance_status`
  (`unknown`/`pre_approved`/`cash`/`pending`), `investment_use`, `risk_notes`,
  `search_strategy`, `approved_to_proceed` (bool) + `approved_at`/`approved_by`.
- **Buyer viewing/inspection notes** (stage 4): reuse `MandateCandidate` — add
  `viewing_date`, `inspection_notes`, `inspection_photos` (JSON) to the candidate.
- **Doc-review/risk** (stage 5): a small `buyer_doc_reviews` store (or reuse
  `PropertyDocument` scoped to the deal) + a `risk_ack` flag on the deal.
- **Settlement-coordination tracker** (stage 7, NON-trust): a light
  `buyer_settlement_coordination` record on the deal — `agreement_date`,
  `registration_status`, `external_settlement_date`, `payment_tracking_notes`,
  `handover_confirmed`. NOT the trust Settlement Desk. Fee collection stays in the
  Invoices tab (already built).
- **Buyer Service dashboard** (frontend) — KPIs (active mandates, deals per stage,
  fees outstanding, upcoming viewings) + worklists, mirroring `PropertySellDashboard`.
- **Buyer deal file** (frontend) — a tabbed screen (Overview · Workflow · Requirements
  & Candidates · Agreement & Fees · Documents/KYC · Settlement coordination · Closure).

## Phasing (each phase = working, testable slice)

- **Phase A — Dashboard + deal file shell + workflow.** Migration 0116
  (`residential_purchase` workflow_template), REGISTRY vertical, buyer-deal SOP
  controller (`GET/POST /api/sales/deals/:id/sop`), routes (server.js + manifest),
  Buyer Service dashboard, buyer deal file with the 8-stage Workflow strip wired to
  existing enquiry/mandate/agreement/invoice data.
- **Phase B — Stage 2 (planning) + stage 4 (inspection).** BuyerMandate finance/
  approval fields + candidate viewing/inspection fields; UI in the Requirements &
  Candidates tab; the "approve to proceed" gate.
- **Phase C — Stage 5 (doc review & risk) + stage 7 (settlement coordination).**
  Doc-review/risk store + acknowledgement; the non-trust settlement-coordination
  tracker; fee-collection surfaced from the Invoices tab on the deal file.
- **Phase D — Stage 8 (closure) + polish.** Closure step (financial-closure = all
  fees collected check), dashboard worklists finalised, work-log + dist rebuild.

## Global constraints
- MySQL via sequelize-cli migrations only — no `sync()`; additive, guarded, `down`.
- Coerce JSON columns with `arr()`/`obj()` on read.
- The buyer flow **never** creates a trust `SaleSettlement` — stage 7 is a
  coordination tracker; money is only the agency fee via `PropertyInvoice`.
- Update BOTH `server.js` and `manifest.js` for any new top-level mount (the deal
  SOP routes are sub-routes of the already-mounted `/api/sales`).
- Keep `npm test` (7+5+12+27) and `test:full` (28) green; append AGENT_WORK_LOG;
  rebuild dist before finishing each phase.
- Minimalist UploadButton for any file field.

## Deferred (out of scope)
- Trust accounting for buyers (they never hold funds).
- Commercial/rural buyer verticals (residential first; the engine generalises later).
- Automated buyer-property matching / scoring.
