# QA Report — Sales Property Full Journey

**Test property:** #12 "QA Test Villa Gulshan" (SSPC-PR-000010, Residential, Sale, ৳35,000,000)
**Tester:** automated QA (browser + API), logged in as super admin
**Date:** 2026-07-24

## Journey coverage

| # | Stage | Result |
|---|-------|--------|
| 1 | Create sale property | ✅ Created, code assigned, saved to DB |
| 2 | Property type / details edit | ✅ Edits persist (House type verified round-trip to DB) |
| 3 | Publish / listing status | ✅ "Available / Live on Website (For Sale)" toggles via lifecycle dropdown |
| 4 | Sell-dashboard tab classification | ✅ Fixed (see BUG-1); Listed / Under Offer / Settled tabs classify correctly |
| 5 | Log an enquiry (from property file) | ✅ Creates enquiry + dedup buyer Contact & Client (Nasrin Ahmed → client #7) |
| 6 | Enquiry shows on property Enquiries tab | ✅ Fixed (see BUG-2) |
| 7 | Enquiry feeds sell dashboard / enquiry table | ✅ SSPC-BEQ-000003 created; name links to buyer client |
| 8 | Record offer | ✅ ৳34,000,000 recorded against buyer |
| 9 | Accept offer | ✅ Accepted → active transaction #5, purchase price updates to accepted amount |
| 10 | Property → Under Offer | ✅ `lifecycle_state=under_contract`, classifies to **Under Offer** tab |
| 11 | Create sales profile + fee terms | ✅ 2% commission, trust/operating banks + ledgers saved |
| 12 | Create completion settlement | ✅ Settlement statement created (purchase ৳34M prefilled from offer) |
| 13 | Settlement approval lifecycle | ✅ draft→submit→review→approve enforced with separation of duties |
| 14 | **Lock → Sold → Settled tab** | ⚠️ Correctly **gated** by accounting-integrity blockers (see below) |

## Bugs found & fixed

**BUG-1 — Sell-dashboard lifecycle tabs showed 0 for every state** (commit `c6ad033`)
Tab filters compared against literal `"listed"/"active"` strings, but the backend
emits raw lifecycle states (`available`, `reserved`, `sold`, or the settlement
status). Replaced with a `classifyRow()` mapper that buckets any real state into
listed / under_offer / settled / withdrawn / draft, and honours `active_transaction`.

**BUG-2 — Property "Enquiries" tab always showed "No enquiries yet"** (commit `63866f6`)
`loadEnquiries()` read `unwrap(response)?.data`, but `unwrap()` already collapses
`response.data.data` to the enquiries array, so `.data` on the array was `undefined`.
The list rendered empty even when the API returned enquiries. Now reads the
unwrapped body directly (array-aware).

## Settlement lock — working as designed (not a bug)

The final **Lock & complete → property Sold → Settled tab** transition is correctly
hard-gated. On property #12 (fresh) and #3 (approved) the engine enforces:

- **Separation of duties** — the lock actor must differ from preparer/reviewer;
  a super admin may override *only* with a written reason (recorded on the trail).
- **6 accounting-integrity blockers** that have **no override** — `posting_required`,
  `unreconciled_payments`, `pending_disbursements`, `unallocated_outgoing_payments`,
  `invalid_disbursement_allocations`, `trust_accounts_nonzero`.
- **Reconciliation requires a bank statement** — "Quick Reconcile All" refuses to
  mark a line reconciled until the matching statement is uploaded.

Verified in code (`settlementAction('lock')`): on lock it sets
`SaleTransaction.status='completed'`, `PropertyDeal.status='completed'`,
`Property.status='sold'`, and closes remaining open offers. `classifyRow()` maps
`sold/completed/settled/locked` → **Settled** tab. So the Settled-tab wiring is
verified; producing a *live* settled row requires a genuine accounting close
(receipt posted → bank statement reconciled → vendor payout allocated & paid →
trust netted to zero → approve → lock).

## Known gaps (not in scope of this fix pass)

- **Public website sales listing** — there is no working public listing API for sale
  properties (`/api/public/sales-*` only exposes enquiry submission). The admin
  "Live on Website" flag is set correctly, but the public site cannot render
  listings until a public sales-listing endpoint exists. The legacy `/api/public/*`
  is dead (depends on a removed Course model).
- Property #3's settlement is tangled prior-debugging test data (reversed payment
  pairs, mismatched outgoing totals, unlinked disbursements) — not a clean lock candidate.

## Recommended next step

Drive one clean legitimate accounting close on #12 to produce a live "Settled" row:
record the ৳34M buyer receipt → post → upload & reconcile the trust bank statement →
allocate + pay the vendor payout → net trust to zero → approve → lock (super-admin
override). Then screenshot the Settled tab.
