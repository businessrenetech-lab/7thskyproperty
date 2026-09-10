# Phase 1 Implementation Plan — Connect the deal workspace to the `/sales` engine

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Make the guided deal workspace a view + driver over the existing `/sales` trust-settlement engine, retire the duplicate `/deals` money mechanics, and add the one real gap (agreed service-fee drafting on settlement).

**Architecture:** A thin read-only backend endpoint assembles a deal's money picture from its linked `SaleTransaction` (via `SaleTransaction.property_deal_id`) using the existing settlement/agencyFees services. The workspace and bulk screen call the existing `/sales` endpoints for every money action. No new money model; no parallel writer.

**Tech Stack:** Node/Express/Sequelize (`:50001`), React/Vite admin-portal. Verification = Node harness scripts (`backend/scripts/e2e*.js`) + `npm run build`. No jest.

**Spec:** `docs/superpowers/specs/2026-09-10-phase1-deals-sales-connect.md` · **Phase 0:** `docs/superpowers/specs/2026-09-10-phase0-baseline-sales-settlement.md`

## Global Constraints

- **Money only through `/sales`.** Every receipt/payout/fee edit/approval routes to the existing `/sales` endpoints below. The deal workspace never writes money directly; the `/deals` money endpoints are retired (Task 4).
- **Trust model:** buyer funds → trust account (`SaleTrustAccount.account_type` `agency` = ours, `vendor`/`third_party` = seller's); payouts out via disbursements + payments. Do not re-implement.
- **Keep the approval policy:** settlement lifecycle `submit → review → approve → return → lock` and role gates (`PREPARE`/`ACCOUNTS`/`ADMIN`) unchanged.
- **Verified existing endpoints (reuse verbatim):** `POST /api/sales/transactions/:id/settlement` (`createSettlement`); `POST /api/sales/settlements/:id/payments` (`createPayment`; incoming kinds `buyer_receipt`/`adjustment`, outgoing `buyer_refund`/`vendor_payout`/`third_party`/`agency_fee`/`adjustment`); `POST /api/sales/payments/:id/{post,clear,reject,reverse,reconcile}`; `PATCH /api/sales/settlement-lines/:id/fee` (`editFeeLine`, reason required); `POST /api/sales/settlements/:id/vendor-invoice` (`issueVendorInvoice`); `POST /api/sales/settlements/:id/disbursements` (`createDisbursement`) + `/disbursements/:id/{submit,pay,fail,sync,cancel}`; `POST /api/sales/settlements/:id/{submit,review,approve,return,lock}`; `GET /api/sales/settlements/:id/statement` + `/agency-fees`.
- **Verified services:** `services/agencyFees.service.js` (`quoteForSale`, `invoiceFigures`, `agencyLinesFor`, `AGENCY_LINE_TYPES=['commission','advertising']`); `services/salesSettlement.service.js` (`settlementSnapshot`, `complianceBlockers`, `buildStatement`, `postPaymentJournal`).
- **Backend restart** on `:50001` after backend changes before harness. **Isolated fixtures** — never overwrite seeded rows. `admin-portal` must `npm run build` clean after each frontend task.
- **Migrations:** next number 0105 (only if a new column is truly needed — prefer none).

## File Structure

- `backend/controllers/dealSettlement.controller.js` — **modify**: add `salesPicture` read-model handler; retire money handlers (Task 4).
- `backend/routes/deal.routes.js` — **modify**: add the read-model route; remove retired routes.
- `backend/services/dealSalesLink.service.js` — **create**: resolve a deal's `SaleTransaction` + assemble the money picture from `/sales` services.
- `backend/controllers/sales.controller.js` — **modify** (Task 3 only): draft agreed service-fee lines on settlement create.
- `admin-portal/src/screens/sales/DealSettlementWorkspace.jsx` — **modify**: consume the read-model, drive `/sales` actions.
- `admin-portal/src/screens/SalesBulkSettlement.jsx` — **modify** (Task 4): repoint to `/sales` settlement readiness.
- `backend/scripts/e2eDealSalesSettlement.js` — **create**: end-to-end through `/sales`. `backend/package.json` — **modify**: wire `npm test`.

---

### Task 1: Backend read-model — a deal's money picture from `/sales`

**Files:** Create `backend/services/dealSalesLink.service.js`; modify `backend/controllers/dealSettlement.controller.js`, `backend/routes/deal.routes.js`.

**Interfaces:**
- Produces: `GET /api/deals/:id/sales-picture` → `{ data: { linked, transaction, settlement, money, badges, next_action } }`. Service `resolveTransaction(deal)` and `assemblePicture(deal)`.

- [ ] **Step 1: Probe the SaleTransaction + settlement shape**

Run: `cd backend && node -e 'const M=require("./models/SalesModels");console.log(Object.keys(M));const T=M.SaleTransaction||M.SaleTransaction;require("./models/SalesModels");process.exit(0)'` and open `backend/models/SalesModels.js` to confirm the exported names for `SaleTransaction`, `SaleSettlement`, settlement-lines, and how a settlement links to a transaction (FK). Record the exact model export names — the next step uses them.

- [ ] **Step 2: Write the link service**

```js
// backend/services/dealSalesLink.service.js
const models = require('../models/SalesModels');
const agencyFees = require('./agencyFees.service');
const num = (v) => Number(v || 0);
const { SaleTransaction, SaleSettlement } = models; // confirm names in Step 1

// Latest SaleTransaction linked to this deal (bridge = property_deal_id).
async function resolveTransaction(deal) {
  return SaleTransaction.findOne({ where: { property_deal_id: deal.id }, order: [['id', 'DESC']] });
}

async function assemblePicture(deal) {
  const transaction = await resolveTransaction(deal);
  if (!transaction) return { linked: false, offer_required: true, transaction: null, settlement: null, money: null, badges: null, next_action: { key: 'offer', label: 'Accept an offer to open a transaction' } };
  const settlement = await SaleSettlement.findOne({ where: { sale_transaction_id: transaction.id }, order: [['id', 'DESC']] });
  if (!settlement) return { linked: true, transaction, settlement: null, money: null, badges: null, next_action: { key: 'settlement', label: 'Open the settlement' } };
  const lines = await agencyFees.agencyLinesFor(settlement.id).catch(() => []);
  const figures = agencyFees.invoiceFigures(lines);
  const money = { drafted_fees: figures, settlement_status: settlement.status };
  const badges = { contract: deal.contract_status, settlement: settlement.status, payment: settlement.payment_status || null, payout: settlement.disbursement_status || null };
  const next_action = settlement.status === 'locked' ? { key: 'done', label: 'Settlement locked' } : { key: 'settlement', label: `Settlement is ${settlement.status}` };
  return { linked: true, transaction, settlement, money, badges, next_action };
}
module.exports = { resolveTransaction, assemblePicture };
```

- [ ] **Step 3: Add the read-model handler + route**

In `dealSettlement.controller.js` append:
```js
const dealSalesLink = require('../services/dealSalesLink.service');
exports.salesPicture = asyncHandler(async (req, res) => {
  const deal = await PropertyDeal.findOne({ where: { id: req.params.id, ...branchScope(req) } });
  if (!deal) return res.status(404).json({ error: 'Deal not found.' });
  res.json({ data: await dealSalesLink.assemblePicture(deal) });
});
```
In `deal.routes.js` add (with the existing settlement routes): `router.get('/:id/sales-picture', settle.salesPicture);`

- [ ] **Step 4: Restart + verify**

Restart `:50001`. `GET /api/deals/<id>/sales-picture` (admin token, X-Branch-Id:1): for a deal with no transaction → 200 `{data:{linked:false, next_action.key:'offer'}}`; for a deal with a linked settlement → 200 with `settlement` + `money.drafted_fees`. (Pick ids from `GET /api/deals` and the `/sales` data.)

- [ ] **Step 5: Commit** — `feat(deals): read-only sales-picture read-model (deal → /sales settlement)`

---

### Task 2: Repoint the workspace onto the read-model + `/sales` actions

**Files:** Modify `admin-portal/src/screens/sales/DealSettlementWorkspace.jsx`.

**Interfaces:** Consumes `GET /api/deals/:id/sales-picture` and the verified `/sales` endpoints.

- [ ] **Step 1:** Load from `/deals/:id/sales-picture`. When `linked:false`, render an empty state ("Accept an offer to open the sales transaction") with a link to the property's sales file — and NO money actions. When `linked:true` but no settlement, show an "Open settlement" action calling `POST /api/sales/transactions/:id/settlement`.

- [ ] **Step 2:** With a settlement, render the four badges from `data.badges`, the drafted fee lines from `data.money.drafted_fees`, and drive actions via `/sales`:
  - Receive money → `POST /api/sales/settlements/:sid/payments` `{direction:'incoming', payment_kind:'buyer_receipt', amount, ...}`.
  - Edit a fee → `PATCH /api/sales/settlement-lines/:lineId/fee` `{amount, reason}`.
  - Issue vendor invoice → `POST /api/sales/settlements/:sid/vendor-invoice`.
  - Create payout → `POST /api/sales/settlements/:sid/disbursements`; pay → `POST /api/sales/disbursements/:did/pay`.
  - Lifecycle → `POST /api/sales/settlements/:sid/{submit,review,approve}` (buttons gated by role + current status).
  Remove every call to the old `/deals/:id/settlement/*`, `/deals/:id/disbursements*`, `/deals/:id/settle`.

- [ ] **Step 3:** Reuse `ui/kit` + `useToast`; reload the picture after each action. `cd admin-portal && npm run build` → `✓ built`. Paste the tail into the report.

- [ ] **Step 4: Commit** — `feat(deals): drive the deal workspace through the /sales engine`

---

### Task 3: Gap — draft agreed service-fee lines on settlement

**Files:** Modify `backend/controllers/sales.controller.js` (and `services/agencyFees.service.js` if a helper fits).

**Interfaces:** On `createSettlement`, alongside the auto commission line, draft the deal's agreed service items as fee lines.

- [ ] **Step 1 (discovery, defined output):** Determine the source of a deal's agreed service items before the Phase-4 Contracts builder exists. Inspect `PropertyDeal`, any `deal`/agreement line tables, and the RPPS/RPSS catalogue seed. **Decision to record in the report:** either (a) read agreed items from an existing per-deal line table, or (b) add a minimal `deal_service_lines` list (migration 0105) if none exists. Prefer (a).

- [ ] **Step 2:** In `createSettlement` (`sales.controller.js:669`), after the commission line is pushed, push one settlement line per agreed service item: `{ line_type: 'agency_fee', direction: 'debit', amount, description: <service name>, terms: 'From service agreement', provenance: 'agreement' }`. Keep them editable via the existing `editFeeLine` (which requires a reason) and provenance-protected like commission.

- [ ] **Step 3: Verify** — restart; create a settlement for a deal that has agreed services; `GET /api/sales/settlements/:id/statement` shows the commission line AND the service-fee lines. Editing one via `PATCH settlement-lines/:id/fee` requires a reason and updates the figure.

- [ ] **Step 4: Commit** — `feat(sales): draft agreed service-fee lines on settlement creation`

---

### Task 4: Retire the duplicate `/deals` money mechanics + repoint bulk

**Files:** Modify `backend/controllers/dealSettlement.controller.js`, `backend/routes/deal.routes.js`, `admin-portal/src/screens/SalesBulkSettlement.jsx`.

- [ ] **Step 1:** Remove the routes `/:id/settlement/{prepare,receive,approve}`, `/:id/disbursements`, `/:id/disbursements/:did/pay`, `/:id/settle`, `/settlement/bulk-data`, `/settlement/bulk` from `deal.routes.js`, and delete their handlers from `dealSettlement.controller.js`. **Keep** `GET /:id/sales-picture` (Task 1), `deal_events`, and the models (audit history). Removed endpoints must 404.

- [ ] **Step 2:** Repoint `SalesBulkSettlement.jsx` to list deals whose linked `/sales` settlement is *ready to lock* (from a new lightweight `GET /api/deals/sales-bulk-data` that reuses `dealSalesLink` + `complianceBlockers`), and settle each by calling `POST /api/sales/settlements/:sid/lock` (or the approved final action) — one authoritative readiness rule. (Owner kept bulk settlement; this preserves it on the real engine.)

- [ ] **Step 3:** Restart + `npm run build`. Verify removed `/deals` money endpoints 404 and the bulk screen lists/locks via `/sales`.

- [ ] **Step 4: Commit** — `refactor(deals): retire duplicate /deals money path; bulk settles via /sales`

---

### Task 5: End-to-end harness through `/sales` + wire `npm test`

**Files:** Create `backend/scripts/e2eDealSalesSettlement.js`; modify `backend/package.json`.

- [ ] **Step 1:** Write a harness (mirroring `e2eDealSettlement.js`) that, on isolated fixtures, runs: create/locate a sell deal + property → accept an offer → transaction (via `/sales`) → `createSettlement` (asserts commission + agreed service lines drafted) → buyer receipt payment into trust (`settlements/:id/payments`) → `submit`→`review`→`approve` → pay commission + service via disbursements → assert statement figures reconcile and the deal `sales-picture` reflects it. Assert removed `/deals` money endpoints now 404. Print `N PASS / M FAIL`, exit 1 on any fail.

- [ ] **Step 2:** In `backend/package.json` set `"test": "node scripts/e2eDealSalesSettlement.js"` (chain the PM harness too if both should run).

- [ ] **Step 3: Verify** — `cd backend && node scripts/e2eDealSalesSettlement.js` → all PASS; `cd admin-portal && npm run build` → `✓ built`.

- [ ] **Step 4: Commit** — `test(deals): end-to-end settlement through the /sales engine + npm test`

---

## Self-Review

**Spec coverage:** repoint workspace → Tasks 1,2,4; retire duplicate money mechanics → Task 4; gap 3b.1 service-fee drafting → Task 3; gap 3b.2 manual/vendor invoice → covered by existing `issueVendorInvoice` + editable lines (Task 2 wires it; no rebuild); gap 3b.3 payout-after-completion → existing lifecycle gating (Task 2 surfaces it); five money defects → satisfied by routing through `/sales` (Tasks 1,2,4); harness + npm test → Task 5.

**Placeholder scan:** the only investigation steps (Task 1 Step 1, Task 3 Step 1) have defined outputs, not vague TODOs. Model export names + the agreed-service source are confirmed at the start of their tasks because they cannot be assumed from outside the files.

**Type consistency:** `assemblePicture` returns `{linked, transaction, settlement, money, badges, next_action}`, consumed identically in Task 2. `/sales` endpoint paths/handlers are quoted from the verified route table.

**Open question carried to execution:** whether a deal must have an accepted offer before the workspace shows money actions — plan assumes yes (matches the `/sales` offer→transaction flow); the empty state in Task 2 Step 1 handles the no-transaction case.
