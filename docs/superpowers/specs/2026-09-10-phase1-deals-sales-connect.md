# Phase 1 Spec — Connect `/deals` to the `/sales` trust-settlement engine

**Date:** 2026-09-10 · **Status:** SPEC FOR OWNER REVIEW — no implementation yet.
**Baseline:** `PROPERTY_SALES_SAAS_PHASED_PLAN.md` · **Phase 0:** `docs/superpowers/specs/2026-09-10-phase0-baseline-sales-settlement.md`.
**Owner decisions (2026-09-10):** trust-account client-money (ours or seller's); V0.2 approved; commission + other
fees, service fee from the vendor agreement, draft-on-settlement, editable invoices + manual invoice, fees
available for payout after settlement done; keep existing approval policy.

Tags: **[V]** verified in source · **[R]** recommendation · **[?]** open question.

---

## 1. Goal

Make the guided deal workspace a **view + driver over the existing `/sales` trust-settlement engine**, retire the
duplicate `/deals` money mechanics, and fill the three real gaps the owner named. One authoritative money path;
buyer funds held in trust; commission + service fees drafted on settlement, editable, paid out after completion.

## 2. What already exists (verified — reuse, do not rebuild)

- **[V] Trust accounting:** `SaleTrustAccount` (`account_type` = clearing/vendor/buyer/agency/third_party) +
  `SaleTrustEntry` ledger. Covers "trust account ours (`agency`) or seller's (`vendor`/`third_party`)."
- **[V] Settlement engine:** `salesSettlement.service.js` (snapshot, compliance blockers, disbursement↔payment
  validation, statement, journal posting) + `sales.controller.js` routes: `transactions/:id/settlement`,
  `settlements/:id/lines|rebalance|funding-requests|statement|bank-lines|agency-fees`,
  `payments/:id/post|clear|reject|reverse|reconcile`.
- **[V] Fee drafting:** `agencyFees.service.quoteForSale` auto-drafts the **commission** line from the vendor
  agency agreement when a settlement is created (`sales.controller.js:692–701`); `PATCH settlement-lines/:id/fee`
  edits a commission/marketing fee **with a reason shown on the vendor invoice**; provenance-protected so agency
  fees come from the agreement, edited only through the audited action.
- **[V] Accounting profile per property:** trust/agency/commission-revenue/client-money/liability account fields.
- **[V] The bridge:** `SaleTransaction.property_deal_id` FK → `PropertyDeal`.

## 3. What Phase 1 changes

### 3a. Repoint the deal workspace onto `/sales`  **[R]**

- `DealSettlementWorkspace.jsx` (keep the guided shell + four-status badges) stops calling the `/deals`
  settlement endpoints for money and instead:
  - resolves the deal's `SaleTransaction` via `property_deal_id` (create-or-link if absent, through the
    existing `/sales` transaction flow — no new money model);
  - reads the money picture from `settlements/:id/statement` + `agency-fees` (expected vs actual, fees, trust
    balances, payout readiness) — **not** `LIKE`-reference matching;
  - drives receipts/payouts through the `/sales` payment endpoints (`settlements/:id/payments`,
    `payments/:id/post|clear`, `funding-requests`), inside the engine's own transactions.
- Retire the duplicate `/deals` money mechanics: `dealSettlement.service.receivedFor` (LIKE match), the
  self-HTTP `receive`, the status-only disbursement `pay`, and the parallel bulk-settle. The four-status model +
  `deal_events` audit **may remain** as a thin projection, but money truth lives in `/sales`.
- **[?]** Migration of the interim `/deals` rows created during this session (test data only, per Phase 0) —
  confirm none is production money before dropping; expected to be fixture-only.

### 3b. Fill the three real gaps the owner named  **[R]**

1. **Service-fee drafting on settlement.** Extend the settlement draft so that, alongside the auto commission
   line, **services included in the vendor service agreement** (RPPS/RPSS catalogue items agreed for this deal)
   are drafted as fee lines (`agency_fee`/`admin_fee` line types, provenance = agreement). Editable through the
   same audited `settlement-lines/:id/fee` action.
2. **Manual invoice.** Allow staff to add a **manual fee line / manual invoice** on a settlement (a line whose
   provenance is "manual", requiring a reason), distinct from agreement-sourced lines, so ad-hoc charges are
   possible without weakening provenance protection on agreed fees.
3. **"Available for payout after settlement done."** Make the payout of commission + service fee **gated on
   settlement completion**: fees are drafted (and editable) from settlement initiation, but the agency-fee /
   vendor-payout payment actions are enabled only once the settlement reaches the completed/approved state that
   the existing `complianceBlockers` already computes. Surface this as the workspace's payout step.

### 3c. Fix the five essential money defects (from Phase 0 §2b / the plan)  **[R]**

Receipt linkage by explicit IDs (not text); no self-HTTP payment (use shared transactional path); "paid" carries
a journal/bank posting + evidence; held-funds check inside a locking transaction; single and bulk completion use
one authoritative readiness rule. Most are inherently satisfied by routing through `/sales`; the spec's job is to
ensure the deal workspace never writes money outside it.

## 4. Owner fee workflow → system mapping

| Owner statement | Mechanism |
|---|---|
| Buyer money into trust; payouts out; trust ours or seller's | `SaleTrustAccount` (agency/vendor/third_party) + buyer_receipt in / vendor_payout+agency_fee out |
| Settlement initiated → commission fee drafted | Existing auto commission line via `agencyFees.quoteForSale` on settlement create |
| Service fee from vendor agreement; agreement services drafted too | **New (3b.1):** draft agreement service items as fee lines |
| Invoices editable | Existing audited `PATCH settlement-lines/:id/fee` (reason on vendor invoice) + **new (3b.2)** manual line |
| Manual invoice creation | **New (3b.2)** |
| Settlement done → fees available for payout | **New (3b.3):** payout actions gated on completion/approval |
| Keep approval policy | Existing `/sales` review/thresholds unchanged |

## 5. Out of scope for Phase 1

Full RPPS/RPSS Contracts builder (Phase 4), real Kanban (Phase 3), communications (Phase 5), marketing/reporting
(Phase 6), tenant isolation (Phase 7). Phase 1 is money-path consolidation + the three fee gaps only.

## 6. Success criteria

- The deal workspace shows expected/collected/held-in-trust/payable/paid and the four evidence-derived badges,
  all read from `/sales` — no `LIKE`-reference matching anywhere in the deal money path.
- A sale runs end-to-end through one engine: buyer receipt into trust → commission + agreed service fees drafted
  (editable) → settlement completed → commission + service fee paid out — with journal postings + audit, verified
  by an isolated-fixture harness (extending `e2eDealSettlement.js`) at PASS/0-FAIL.
- Manual invoice line supported with provenance "manual" + reason; agreement-sourced fees stay provenance-protected.
- Old/new figures reconcile to the minor unit; existing `/sales` client-money controls unchanged; `npm test` wired
  to run the harness.

## 7. Open questions  **[?]**

1. When a deal has no `SaleTransaction` yet, should opening the workspace auto-create one, or require an accepted
   offer first? (Recommend: require an accepted offer, matching the `/sales` offer→transaction flow.)
2. Trust account selection per deal — default to Seventh Sky's `agency` account, with an explicit switch to a
   seller `vendor` account? Confirm who chooses and when.
3. Service-fee catalogue source for 3b.1 before the Phase-4 Contracts builder exists — read from the deal's agreed
   line items, or a lightweight per-deal service list until Contracts lands?

**Review gate:** please review this spec. On approval I'll turn §3 into a task-by-task implementation plan
(writing-plans) and run it. No implementation until then.
