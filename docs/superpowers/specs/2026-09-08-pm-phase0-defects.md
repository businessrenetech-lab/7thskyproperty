# PM Phase 0 — end-to-end audit defect list

**Date:** 2026-09-08
**Method:** API journey harness `backend/scripts/e2ePmJourney.js` (reusable) driving the
real backend as manager + tenant + landlord, plus read-probes across all three roles.
Backend :50001, gateway/UI :3005.

## Verified working (happy path, end to end)

Enquiry → convert to application → owner-approval sent → application approved → convert to
tenancy (SSPC-TN-*) → send agreement → **both signers sign (2/2)** → tenancy activates →
rent invoice raised → staff records payment → **management fee booked as PmIncomeEntry
income** → owner held balance rises (৳20,900 on the property folio) → owner statements list
→ landlord portal shows portfolio + statements → quick renewal. All admin PM reads and both
portals' reads return live data.

## Defects

### D1 — MONEY-CRITICAL: owner payout preview/pay can't find per-property landlord folios
`services/folio.service.findBestLandlordFolio(ownerContactId, propertyId)`: when
`propertyId` is null it only matches a **portfolio** folio (`property_id: null`). Every
landlord folio in this system is **per-property** (e.g. folio 31: owner_contact_id 1,
property_id 9, balance ৳20,900). So `GET /api/disbursements/owner/:ownerId/preview` (no
property) returns `{payable: 0, folio: null}` and `POST /api/disbursements/owner` (no
property) returns "No landlord folio found" — even though `ownerBalances` shows ৳20,900
held. Owner-level payout is effectively broken; only the property-scoped call works.
- Also: `findBestLandlordFolio` matches on `contact_id`, while `ownerBalances` matches on
  `owner_contact_id`. They coincide today but would desync if a folio ever set them
  differently.
- **Impact on Phase 2:** a bulk owner-disbursement run must aggregate **per landlord folio**
  (like `ownerBalances`), not call the owner-level preview/pay — otherwise every held
  balance reads as 0. Fix `findBestLandlordFolio` to fall back to the owner's per-property
  folio(s), and reconcile the `contact_id` vs `owner_contact_id` column choice.

### D2 — STRUCTURAL: no bulk rent collection run
No endpoint/screen to collect many tenancies' rent in one pass. → Phase 1.

### D3 — STRUCTURAL: no bulk owner disbursement run
`/api/disbursements` is one owner at a time (`owner/:id/preview` + `payOwner`). → Phase 2
(and it must be built on a per-folio aggregation because of D1).

### D4 — UX/DATA: tenant portal with a closed tenancy returns raw 400s
Seeded `tenant1@example.com` has a **closed** tenancy (from a past refund test), so
`/api/tenant/payment-proof`, `/api/tenant/work-orders`, `/api/tenant/vacancy-notice` all
return `400 {"error":"No active tenancy on file."}`. The guard is correct, but:
- there is no seeded **active-tenant** portal login, so tenant self-service (pay rent,
  raise WO, give notice) can't be exercised with the seed data — add one for testing;
- a logged-in tenant whose tenancy has ended should see a friendly "no active tenancy"
  empty state in the portal, not error toasts. (UX item for Phase 3.)

## Not defects (checked)

- First read-probe 404s on `/api/tenant/home|payments|maintenance` were wrong guessed
  paths; the real endpoints (`/me`, `/tenancy`, `/invoices`, `/receipts`, `/work-orders`,
  `/documents`, `/renewal-offer`, `/messages`) all work.
- `/api/renewals` and `/api/rental-receipts` are not standalone mounts by design (renewals
  live under `/api/tenancies/:id/renewal/*` and landlord approvals; receipts under
  `/api/tenant/receipts` + invoices).

## Recommended sequencing

- Fix **D1** first (small, money-critical) — either as an immediate correctness fix or as
  the foundation of Phase 2.
- Phase 1 (Bulk Rent Collection) and Phase 2 (Bulk Owner Disbursement) as planned; Phase 2
  builds on the D1 fix.
- Fold D4's portal empty-state + a seeded active tenant into Phase 3 (UX) and the test seed.
