# Buyer Service Dashboard & 8-Stage Workflow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A dedicated residential buyer-service dashboard + a buyer "deal file" carrying the 8-stage Purchase SOP workflow, reusing the existing progressive-SOP engine, RPPS agreement, invoices/collection, mandate and KYC.

**Architecture:** Buy `PropertyDeal` becomes the anchor. A new `residential_purchase` workflow-template + SOP-engine vertical drive a `Project` per deal (deal-keyed, mirroring the property-keyed seller SOP). New screens: Buyer Service dashboard + buyer deal file.

**Tech Stack:** Node/Express/Sequelize (MySQL, sequelize-cli migrations), React 18 + Vite. Reuses progressiveSop.service, workflowProject.service, PropertyDeal, BuyerMandate, RPPS agreements, PropertyInvoice.

**Spec:** `docs/superpowers/specs/2026-09-12-buyer-service-dashboard-workflow-design.md`

## Global Constraints
- MySQL via sequelize-cli migrations only — no `sync()`; additive, guarded by `describeTable`, with a working `down`.
- Coerce JSON columns with `arr()`/`obj()` on read.
- The buyer flow NEVER creates a trust `SaleSettlement`; stage 7 is a coordination tracker, money is only the agency fee via `PropertyInvoice`.
- Deal-SOP endpoints are sub-routes of the already-mounted `/api/sales` — no new server.js/manifest mount.
- Keep `npm test` (7+5+12+27) and `test:full` (28) green; append AGENT_WORK_LOG; rebuild dist before finishing.
- Minimalist UploadButton for any file field.

---

## PHASE A — Dashboard + deal file shell + 8-stage workflow

### Task A1: Purchase SOP workflow template (migration 0116)

**Files:** Create `backend/migrations/0116-purchase-sop-template.js`

**Interfaces:** Produces a `workflow_templates` row `vertical_key='residential_purchase'` with the 8 stages (gate + checklist each), mirroring `0107-sales-sop-template.js`.

- [ ] **Step 1: Write the migration** — 8 stages verbatim from the spec (Enquiry & Consultation; Requirement Assessment & Planning; Property Search & Shortlisting; Inspection Coordination; Documentation Review & Risk; Negotiation & Offer Coordination; Agreement & Settlement Coordination; Closure & Post-Purchase Follow-Up), each with its checklist. `up` deletes any existing `residential_purchase` template then inserts; `down` deletes it. Copy the `slug`/stages shape from 0107.
- [ ] **Step 2: Run it** — `cd backend && npx sequelize-cli db:migrate`. Expected: 0116 applied.
- [ ] **Step 3: Verify** — `node -e "require('./models/...').? "` — actually query: `node -e "const s=require('./config/db.config'); s.query('SELECT name FROM workflow_templates WHERE vertical_key=\\'residential_purchase\\'').then(r=>{console.log(r[0]);process.exit(0)})"`. Expected: one "Residential Purchase SOP" row.
- [ ] **Step 4: Commit** — `feat(buyer-service): Residential Purchase SOP workflow template (migration 0116)`.

### Task A2: `residential_purchase` vertical in the SOP engine

**Files:** Modify `backend/services/progressiveSop.service.js`

**Interfaces:** Produces `REGISTRY.residential_purchase = { stagePhase, eventUnlocks, hints, activeAtStart, ownerPhase:null, fallbackPhase, phaseSla }`. Consumes the stage keys from A1.

- [ ] **Step 1: Add PURCHASE stage→phase map + hints** — phases: `enquiry` → `planning` → `search` → `offer` → `settlement` → `closure`. Map each of the 8 stage keys (slugs) to a phase. Add `PURCHASE_HINTS` per phase and a `PURCHASE_PHASE_SLA` (business-day targets; may reuse a simple map). `activeAtStart: ['enquiry']`.
- [ ] **Step 2: Register the vertical** — add `residential_purchase` to `REGISTRY` using those maps; `fallbackPhase:'enquiry'`.
- [ ] **Step 3: Load-check** — `node -e "const e=require('./services/progressiveSop.service'); console.log(e.phaseOf('enquiry_consultation','residential_purchase'), e.hintFor('settlement','residential_purchase'))"`. Expected: a phase string + a hint (no crash).
- [ ] **Step 4: Commit** — `feat(buyer-service): residential_purchase progressive-SOP vertical`.

### Task A3: Buyer-deal SOP controller + routes

**Files:** Create `backend/controllers/buyerDealSop.controller.js`; Modify `backend/routes/sales.routes.js`

**Interfaces:** Produces `GET /api/sales/deals/:dealId/sop` (find `Project` by `property_deal_id` + `vertical_key='residential_purchase'`) and `POST /api/sales/deals/:dealId/sop` (find-or-create via `createProjectFromTemplate`). Mirrors `salesSop.controller` but keyed to the buy `PropertyDeal`, not the property.

- [ ] **Step 1: Write the controller** — `loadSop(dealId, req)` loads the Project (+ ordered stages); `getSop` returns it (or `{ data: null }`); `ensureSop` verifies the deal is `deal_type='buy'` in branch, then `createProjectFromTemplate({ vertical_key:'residential_purchase', property_deal_id, property_id: deal.property_id||null, branch_id, ... })` inside a transaction, returns the loaded SOP. Reuse the exact create/load shape from `salesSop.controller` (adjust the key to `property_deal_id`). If `Project` has no `property_deal_id` column, key on `property_id` + a `deal_id` note — VERIFY the Project model columns in Step 0.
- [ ] **Step 0 (first): confirm Project keys** — `node -e "console.log(Object.keys(require('./models/Project').rawAttributes))"`. If `property_deal_id` is absent, add it in A1's migration (additive column on `projects`) — update A1 accordingly before writing this controller.
- [ ] **Step 2: Add routes** — in `sales.routes.js`: `router.get('/deals/:dealId/sop', roleMiddleware(READ), buyerSopCtrl.getSop)` and `router.post('/deals/:dealId/sop', roleMiddleware(PREPARE), buyerSopCtrl.ensureSop)`. Place before any conflicting `/:param`.
- [ ] **Step 3: Load-check** — `node -e "require('./controllers/buyerDealSop.controller');require('./routes/sales.routes');console.log('ok')"`.
- [ ] **Step 4: Live smoke** — restart server; create/ensure SOP for an existing buy deal via authenticated POST; GET returns 8 stages. (Do in the Task A6 verification.)
- [ ] **Step 5: Commit** — `feat(buyer-service): deal-keyed purchase SOP controller + routes`.

### Task A4: Buyer deal file payload (getBuyerDeal)

**Files:** Modify `backend/controllers/sales.controller.js` (or `buyerMandate.controller.js` — whichever owns buy-deal reads) — add `getBuyerDeal`.

**Interfaces:** Produces `GET /api/sales/deals/:dealId` returning `{ deal, buyer, property, mandate, candidates, agreements, invoices, sop_summary }` — aggregating the buy PropertyDeal + its buyer client/contact + linked property + the BuyerMandate (via buyer_client_id) + candidates + RPPS purchase agreements (SigningEnvelope related_type sale_purchase_agreement, related_id=property) + agreement-fee PropertyInvoices for the buyer contact.

- [ ] **Step 1: Write `getBuyerDeal`** — load the deal (branch-scoped, deal_type buy), buyer client+contact, property, the buyer's mandate (`BuyerMandate` by buyer_client_id/contact) + candidates, purchase agreements + invoices (reuse the `sale_agreements` shape). Return them.
- [ ] **Step 2: Route** — `router.get('/deals/:dealId', roleMiddleware(READ), ctrl.getBuyerDeal)` (before `/deals/:dealId/sop`? No — distinct paths, order-safe).
- [ ] **Step 3: Load-check + live smoke** (in A6).
- [ ] **Step 4: Commit** — `feat(buyer-service): buyer deal file payload endpoint`.

### Task A5: Buyer Service dashboard (frontend)

**Files:** Create `admin-portal/src/screens/sales/BuyerServiceDashboard.jsx`; Modify `admin-portal/src/App.jsx`, `admin-portal/src/config/consoles.js`

**Interfaces:** Consumes existing `/sales/dashboard` counters + `/sales/mandates` + `/deals?deal_type=buy`.

- [ ] **Step 1: Build the dashboard** — KPI tiles (active mandates, buy deals by stage, upcoming viewings, fees outstanding) + worklists (mandates needing candidates, deals in each SOP phase, unpaid buyer invoices) linking into the buyer deal file. Reuse `PageHead`/`StatCard`/kit like `AccountingOverview`/`PropertySellDashboard`.
- [ ] **Step 2: Route + nav** — `/residential/buyer-service` in App.jsx; nav item under the residential Buying group in consoles.js (reuse an imported icon).
- [ ] **Step 3: Build** — `cd admin-portal && npm run build` clean.
- [ ] **Step 4: Commit** — `feat(buyer-service): Buyer Service dashboard + nav + route`.

### Task A6: Buyer deal file with the 8-stage Workflow strip (frontend)

**Files:** Create `admin-portal/src/screens/sales/BuyerDealFile.jsx`; Modify `admin-portal/src/App.jsx`, `admin-portal/src/screens/DealsBoard.jsx`

**Interfaces:** Consumes `GET /sales/deals/:id`, `GET/POST /sales/deals/:id/sop`.

- [ ] **Step 1: Build the deal file** — tabbed screen: Overview (deal/buyer/property), **Workflow** (the 8-stage strip from the SOP — reuse the property-file Workflow section pattern: stages, checklists, gate hints, ensure-SOP button), Requirements & Candidates (mandate + candidates), Agreement & Fees (purchase agreements + invoices links), Documents/KYC (reuse inline KYC), Settlement coordination (placeholder panel — Phase C), Closure (placeholder — Phase D).
- [ ] **Step 2: Route + open from board** — `/residential/buy/:dealId` in App.jsx; the DealsBoard buy deal drawer gets an "Open buyer file" button → the deal file.
- [ ] **Step 3: Build** — clean.
- [ ] **Step 4: Live verify (Playwright/HTTP)** — ensure-SOP on a real buy deal → 8 stages render in the Workflow tab; dashboard loads; 0 console errors. Clean up any seeded SOP if on throwaway data (or leave on a real deal — the SOP is legitimate state).
- [ ] **Step 5: Commit** — `feat(buyer-service): buyer deal file + 8-stage workflow strip + board entry`.

### Task A7: Phase A wrap
- [ ] **Step 1: Harnesses** — `npm test` (7+5+12+27) + `test:full` (28) green.
- [ ] **Step 2: Non-regression** — `git diff --stat` additive; seller SOP (`properties_sale`), settlement engine untouched.
- [ ] **Step 3: Work-log** — append COMPLETED entry (Phase A).
- [ ] **Step 4: Rebuild dist** — `npm run build`; commit `chore(buyer-service): work-log + dist; Phase A done`.

---

## PHASE B — Stage 2 (planning) + Stage 4 (inspection)
- Migration 0117: BuyerMandate += `finance_status` ENUM, `investment_use`, `risk_notes`, `search_strategy`, `approved_to_proceed` BOOL, `approved_at`, `approved_by`; MandateCandidate += `viewing_date` DATE, `inspection_notes` TEXT, `inspection_photos` JSON.
- buyerMandate.controller: whitelist the new fields; an `approve-to-proceed` action.
- Requirements & Candidates tab: finance/strategy/risk inputs + "Approve to proceed" gate; per-candidate viewing date + inspection notes + photo UploadButton.
- Verify, work-log, dist.

## PHASE C — Stage 5 (doc review & risk) + Stage 7 (settlement coordination)
- Migration 0118: `buyer_settlement_coordination` (deal_id, agreement_date, registration_status ENUM, external_settlement_date, payment_tracking_notes, handover_confirmed BOOL) + a `risk_ack` flag + a small buyer doc-review store (or reuse PropertyDocument scoped to the deal) + `risk_flags` JSON.
- Controller + endpoints (deal-scoped, NON-trust). Settlement-coordination tab; doc-review/risk panel; fee-collection surfaced from the Invoices tab on the deal file.
- Verify, work-log, dist.

## PHASE D — Stage 8 (closure) + polish
- Closure step: financial-closure check (all buyer invoices paid) + feedback + archive; dashboard worklists finalised.
- Verify, work-log, dist; finishing-a-development-branch gate.

## Self-Review
- **Spec coverage:** dashboard (A5), deal file + workflow (A1–A3, A6), payload (A4); stages 2/4 (B), 5/7 (C), 8 (D) — all mapped.
- **Placeholders:** Phase A steps name exact files/endpoints; the Project-key uncertainty is resolved in A3 Step 0 before coding.
- **Type consistency:** `getSop`/`ensureSop`/`getBuyerDeal`, `residential_purchase` vertical, `createProjectFromTemplate` key (`property_deal_id`) used consistently.
- **Risk:** if `projects` has no `property_deal_id`, A1 adds it (additive) — checked first in A3 Step 0.
