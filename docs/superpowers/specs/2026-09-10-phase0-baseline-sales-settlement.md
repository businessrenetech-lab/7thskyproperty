# Phase 0 Baseline — Sales Settlement (deals ↔ sales reconciliation)

**Date:** 2026-09-10 · **Status:** Phase 0 deliverable (baseline + reconciliation). No implementation.
**Adopts:** `PROPERTY_SALES_SAAS_PHASED_PLAN.md` (owner-approved baseline) and its §14 reconciliation.
**Supersedes:** the Phase-1 direction in `docs/superpowers/specs/2026-09-10-property-sales-saas-improvement-plan.md`.
**Owner decisions on record (2026-09-10):** (1) **repoint** the `/deals` settlement work onto the
existing `/sales` engine — keep the deal status model + guided workspace UI shell, drop the
`LIKE`-matching money path; (2) do **Phase 0** before further build.

Evidence tags: **[V]** verified in source today · **[R]** recommendation · **[?]** owner/legal decision.

---

## 1. Repository baseline (verified today)

- **[V] Branch:** `air-conditioning/phase-0-duplicate`. The `/deals` settlement feature is committed
  `fbea9d7..88acab8` (migrations 0103/0104; `dealSettlement.service.js` + `.controller.js`;
  `DealSettlementWorkspace.jsx`; `SalesBulkSettlement.jsx`). It passes `backend/scripts/e2eDealSettlement.js`
  (26 PASS / 0 FAIL) but its final whole-branch review did not run (session rate limit). Treat as **interim**.
- **[V] Migrations:** latest applied is `0104-deal-timestamps-snake.js`. Additive, guarded. Next number 0105.
- **[V] Regression:** `backend/package.json` `test` = `echo "Error: no test specified" && exit 1`
  (placeholder — ChatGPT finding confirmed). The de-facto regression suite is the Node harness scripts
  `backend/scripts/e2e*.js` (`e2eDealSettlement.js`, `e2ePmJourney.js`). **[R]** wire these behind a real
  `npm test` and add isolated fixtures (do not overwrite seeded rows).

## 2. The two money paths (verified)

### 2a. `/sales/*` — the strong, existing engine  **[V]**

- Controller `backend/controllers/sales.controller.js`; service `backend/services/salesSettlement.service.js`
  (`recordEvent` audit, `settlementSnapshot`, `complianceBlockers`, `validateDisbursementPayment`,
  `buildStatement`, `postPaymentJournal`); models `SalesModels.js` + `SalesTrustModels.js` (client-money/trust);
  UI `admin-portal/src/screens/sales/SalesPropertyFile.jsx` (7,656 lines).
- Route surface (`/api/sales`): offers → `offers/:id/accept`; `transactions/:id/parties|settlement|withdrawal|cancel`;
  `settlements/:id/lines|rebalance|funding-requests|statement|bank-lines|agency-fees`;
  `payments/:id/post|clear|reject|reverse|reconcile`; party bank-accounts + verify.
- Controls present: settlement snapshot + versioning, compliance/readiness blockers, disbursement↔payment
  validation, journal posting, payment reversal, explicit bank-line reconcile, agency-fee separation,
  audit events. This is a settlement **desk**, not a flag.
- **[V] Bridge already exists:** `SaleTransaction.property_deal_id` FK → `PropertyDeal`
  (`models/SalesModels.js:55,137`). The `/deals` world and the `/sales` world are already joinable.

### 2b. `/deals/*` — the interim path built this session  **[V]**

- `PropertyDeal` + `deal_disbursements` + `deal_events`; `dealSettlement.service.computeDealMoney`
  matches received money by `payments.reference LIKE '%DEAL:<deal_code>%'` (no explicit `deal_id` on
  invoices/payments); `receive` creates an invoice then calls `/api/invoices/:id/payments` over internal
  HTTP; disbursement `pay` flips a status + logs an event **without** posting a bank/journal entry;
  held-funds check is not inside a locking transaction; single/bulk "settled" is a receipt-status flag.
- **Reusable parts (keep):** the four-status model (contract/settlement/payment/disbursement), the append-only
  `deal_events` audit trail idea, and the guided full-page `DealSettlementWorkspace.jsx` UI shell.
- **Duplicative parts (retire on repoint):** the `LIKE`-reference money matching, the self-HTTP payment,
  the status-only disbursement "pay", and the parallel bulk-settle. These overlap `/sales` — weaker.

## 3. Reconciliation & repoint map (Phase-1 target)  **[R]**

| `/deals` interim piece | Repoint onto `/sales` |
|---|---|
| `computeDealMoney` (LIKE-matching) | Read the money picture from the linked `SaleTransaction`/`SaleSettlement` via `property_deal_id`; expose expected-vs-actual from settlement lines + agency-fees, not text matching. |
| `receive` (invoice + self-HTTP payment) | Call the shared `/sales` settlement payment path (`settlements/:id/payments` → `payments/:id/post|clear`) inside one DB transaction; no self-HTTP. |
| disbursement `pay` (status flip) | Use `/sales` disbursement + `postPaymentJournal`; "paid" must carry a journal/bank posting + evidence. |
| held-funds check (no lock) | Reuse `/sales` locking/reservation so concurrent payouts cannot overspend. |
| single/bulk "settled" flag | Derive completion from `/sales` `complianceBlockers`/readiness; one rule for single and bulk. |
| `DealSettlementWorkspace.jsx` | **Keep** as the guided shell; back it with the `/sales` read-model + the four evidence-derived badges. |

**Principle:** one authoritative command path per money operation (the `/sales` engine). The deal workspace
becomes a *view + driver* over it, never a second writer. No property value counted twice when both sides
are represented.

## 4. Phase 0 gate — status

| Gate item (from the plan) | Status |
|---|---|
| Branch/commit/migrations/route inventory | **[V] done** (§1–2) |
| Trace `/deals` vs `/sales` records + links; reconcile overlap | **[V] done** (§2–3; bridge = `property_deal_id`) |
| Regression harness runnable | **[V] partial** — `e2e*.js` run; `npm test` is a placeholder → **[R]** wire it |
| Approve document versions (V0.1 vs V0.2, workbook V2.0 discrepancy) | **[?] owner** — pending |
| Confirm money modes (coordination-only / client-money / hybrid) | **[?] owner** — pending |
| Confirm fee/commission/VAT/AIT + client-vs-company cost treatment | **[?] owner** — pending |
| Confirm approval staffing/thresholds | **[?] owner** — pending |
| Three wireframes (Pipeline, Deal Overview, Settlement Desk) | **[R] not started** |

## 5. Decisions still required from the owner (blocks Phase 1 spec)

Carried from the plan's §13 — these four are the ones Phase 1 money work depends on:

1. **Money modes:** coordination-only, client-money holding, or both? Who receives deposit / final price today?
2. **Authoritative documents:** approve V0.2 templates; resolve the workbook V0.1/V2.0 discrepancy; which
   document governs phase gates?
3. **Fee/commission mechanics:** success-fee vs service-fee triggers, agent splits, VAT/AIT, client-vs-company cost.
4. **Approval policy:** keep the existing `/sales` independent review/thresholds until a replacement is approved?

**Next after this baseline:** on owner answers to §5, write a separately-reviewed **Phase 1 spec** = "connect
`/deals` → `/sales` per the §3 repoint map + fix the five essential money defects" (receipt linkage,
self-HTTP, payout evidence/posting, concurrency lock, unify settled). No implementation until that spec is approved.

## 6. Owner answers to §5 (2026-09-10) — gate CLEARED

1. **[✓] Money mode = client-money via trust account.** Buyer pays into a trust account; payouts flow out
   from it. The trust account may be **Seventh Sky's** (`SaleTrustAccount.account_type='agency'`) **or the
   seller's** (`'vendor'`/`'third_party'`). Maps directly to existing `SalesTrustModels`.
2. **[✓] Documents:** V0.2 templates **approved**.
3. **[✓] Fees:** **commission (base) + other fees** included; **service fee generated from the vendor
   agreement**. Workflow: **settlement initiated → commission fee drafted** as an **editable invoice**;
   **agreement-included services drafted too**; **settlement done → service fee + commission available for
   payout**. **Invoices editable**, and **manual invoice creation** supported.
   *(Verified: commission auto-draft on settlement + audited editable fee already exist in `/sales`
   — `agencyFees.service`, `sales.controller.js:692–701,1389–1413`. Genuine gaps: catalogue **service-fee**
   drafting on settlement, **manual invoice**, and an explicit "available for payout after settlement done" state.)*
4. **[✓] Approval policy:** **keep** the existing `/sales` independent review/thresholds.

Phase 0 gate is cleared. Proceed to the Phase 1 spec:
`docs/superpowers/specs/2026-09-10-phase1-deals-sales-connect.md` (to be written; review before implementation).
