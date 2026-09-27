# Plan — Rural Sale console pair

**Spec:** `docs/superpowers/specs/2026-09-27-rural-sale-console-design.md`
**Date:** 2026-09-27
**Branch:** current working branch; nothing pushed to `production`.

Each task ends green (its own test, plus `npm test` and the residential baseline) and is committed
separately. The local DB is the production DB: schema only through additive, guarded migrations,
and every fixture removed in the run that made it.

---

### Task 1 — Correct the two pipelines
Split workflow template #14 into `rural_sale` (seller, 10 stages) and a new `rural_purchase`
(buyer, 7 stages), per spec §4. `scripts/seedRuralSaleWorkflow.js`, refusing to run if any project
uses either vertical. Unit test asserts the counts, the order, that no ownership DOCUMENT is a
stage, and that no buyer stage appears in the seller pipeline.

### Task 2 — The registers
`scripts/seedRuralSaleRegisters.js` — 8 definitions on `rural_sale`, 9 on `rural_purchase`
(spec §5). Idempotent on `(vertical_key, register_key)`; must not touch #162-#164. Unit test asserts
the keys, the verticals, and that nothing in the "deliberately not a register" list was added.

### Task 3 — Sale-side dispute categories
Extend `services/disputeLifecycle.js` with `RURAL_SALE_DISPUTE_CATEGORIES` (the rent eight plus
Government Acquisition, Encroachment, Financing Risk, Registration Delay) and make the dispute
endpoints accept the union. Unit test asserts the sale list is a superset and the stage machine is
unchanged.

### Task 4 — The two agreement clause packs
Extract both V0.2 docx to `docs/superpowers/*.txt`, add two jobs to
`scripts/genSalesAgreementClauses.js`, generate `rlpssClauses.js` / `rlppsClauses.js`, add
`sale_rural` / `purchase_rural` to `salesAgreementSchedules.js`, and write the two thin services.

### Task 5 — Wire the agreements into the engine
Add the `rural` entry to the salesAgreement REGISTRY, teach `catOf()` 'rural', and add both
related_types to `utils/saleAgreementTypes.js`. Seed the two catalogue verticals. Verify by
rendering both against the live API and asserting rural wording (Mouza, Khatiyan, Dag) with no
commercial or residential bleed-through, and that a category with no builder still refuses.

### Task 6 — The seller console
`ruralSaleConsole` + `RURAL_SALE_NAV` (Commercial's seller nav rebased onto `/rural/sell`),
`RuralSaleConsole.jsx`, and the `/rural/sell/*` route block in App.jsx for `category="rural"`.
The existing bare `/rural/sell` route moves inside it. Sidebar's Rural → Sale points here already.

### Task 7 — The buyer console
`ruralBuyerConsole` + `RURAL_BUYER_NAV` rebased onto `/rural/buyer-service`, plus its route block.
A Switch item each way between the two consoles, as Commercial and Business have.

### Task 8 — Rural-specific screens
The land record panel and ownership verification reused from the Rent build but scoped to
`rural_sale`; a Marketing register screen over the 9 checklist activities; an Offers & Negotiation
screen over `offer_register` + `negotiation_register`; a Due Diligence screen over the buyer's
7-item register. All built from each definition's own columns, resolved by register_key.

### Task 9 — The five dashboards
`controllers/ruralSaleDashboards.controller.js` + `services/ruralSaleDashboardMath.js`: seller,
buyer, land, risk, executive (spec §7). Reuse `propertyTypeCounts`; no NaN on an empty book.
Screen: `rural/RuralSaleDashboards.jsx`.

### Task 10 — E2E and the work log
`scripts/e2e/ruralSale.js` per spec §8, every fixture removed in-run. Re-run `ruralRent`,
`consoleIsolation`, `npm test` and both builds. Append the COMPLETED entry.

---

## Risks

- **The corrupted template** is the one place live data could be harmed. 0 projects use it today;
  the seed script re-checks that at run time and refuses otherwise.
- **`catOf()` defaulting to residential** means a rural agreement request would silently render the
  residential document if Task 5 is half-done. The e2e asserts the rural wording, not just HTTP 200.
- **Category vs listing_type**: rural sale and rural rent share `category='rural'`. Every sale query
  must also pin `listing_type='sale'`, exactly as the Rent console pins `'rent'`.
