# Sales Contracts Hub — design spec

**Date:** 2026-09-11 · **Branch:** `air-conditioning/phase-0-duplicate` (not merged)
**Plan:** `PROPERTY_SALES_SAAS_PHASED_PLAN.md` §Phase 4 (Contracts home / review queue / reminders / expiry / variations / archives).
**Status:** design approved in brainstorming; awaiting spec review before the implementation plan.

**Phase 4, sub-project B of 4** (A = RPPS/RPSS builders ✅; C = signing→billing wiring; D = Contacts relationships). A residential-sales **Contracts home** over the RPPS/RPSS signing envelopes: status buckets, reminders, void, read-time expiry, a signed archive, and a lightweight "create variation" action. Read/aggregation surface over the existing signing endpoints — minimal new backend.

Verified against current source 2026-09-11. `SigningEnvelope` has the full status
enum (draft/pending_approval/sent/viewed/partially_signed/completed/declined/
voided/expired), `expires_at`, `sent_at`, `completed_at`, `related_type`,
`voided_reason`, `terms`, `final_pdf_url`, `certificate_url`.
`POST /api/signing/envelopes/:id/remind` (no body; only sent/viewed/partially_signed)
and `POST /api/signing/envelopes/:id/void {reason}` exist and are reusable.
`listEnvelopes` does NOT filter by `related_type`. Sub-project A creates sales
agreements directly as `status:'sent'` (no draft stage). Agreement kinds:
`sale_purchase_agreement` (RPPS) / `sale_sale_agreement` (RPSS).

---

## 1. Goal

A "Contracts" page for residential sales showing every RPPS/RPSS agreement
grouped by where it is in its lifecycle, with the day-to-day actions staff need —
remind an outstanding signer, void, open the signing link, open the signed
document/certificate, and start a variation — without leaving the page. Expiry is
shown live from `expires_at`.

## 2. Scope

**In:**
- **Buckets endpoint** `GET /api/sales-agreements/contracts[?kind&search]` →
  `{ buckets: { awaiting_signature[], completed[], expiring_soon[], expired[],
  declined_voided[] }, counts }`, over the two sales `related_type`s, branch-scoped.
  Each item: `{ id, envelope_code, kind, party_name, party_email, status,
  sent_at, expires_at, completed_at, days_to_expiry, signer_status, voided_reason,
  final_pdf_url, certificate_url }`. Expiry computed at read time:
  `expiring_soon` = status in (sent,viewed,partially_signed) and 0 ≤ days_to_expiry ≤ 7;
  `expired` = those past `expires_at` (still not completed).
- **Actions (reuse existing):** Remind → `POST /api/signing/envelopes/:id/remind`;
  Void → `POST /api/signing/envelopes/:id/void {reason}`; Copy/open signing link
  → `GET /api/signing/envelopes/:id` for the outstanding signer's `access_token`
  (same pattern the agreement screens use); Open signed doc → `final_pdf_url` /
  `certificate_url` (or the signing view).
- **Create variation (lightweight):** a `POST /api/sales-agreements/contracts/:id/variation`
  that voids the original envelope (reason: `Superseded by variation`) and returns
  a `prefill` payload (the original's `terms` + party) the UI uses to open the
  matching RPPS/RPSS wizard pre-filled; staff review and send the new agreement.
  No schema change; supersession tracked via the void reason + the new agreement's
  `terms.supersedes` (envelope_code of the original).
- **Frontend Contracts hub** `SalesContracts.jsx` at `/residential/contracts`
  (nav under **Assurance** or a Contracts group): bucketed sections with counts,
  a search box, per-row actions, and a "signed archive" section (completed).
  Kind filter (All / Purchase / Sale).

**Out (deferred / non-goals):**
- Draft / internal-approval pre-send stage (A stays create-as-sent) → future.
- Tracked `supersedes_id` column + variation-chain view → future (lightweight now).
- Signing-completion → activation/billing wiring → sub-project C.
- Reminder/expiry **schedulers** or emails beyond the existing remind endpoint
  (expiry is read-time only; no auto-expire job).
- Folding PM/TM/other agreement types into this hub (they keep their own screens).
- Contacts relationships → sub-project D.

## 3. Backend — buckets + variation

Add to the existing `salesAgreement.controller.js` (no new controller):
- `SALE_RELATED = ['sale_purchase_agreement', 'sale_sale_agreement']`;
  `kindOf(related_type)` → 'purchase'|'sale'.
- `exports.contracts` (`GET /:? ` — mounted as `/api/sales-agreements/contracts`):
  `SigningEnvelope.findAll({ where: { branch, related_type: {[Op.in]: SALE_RELATED}, ...(kind filter), ...(search on title/envelope_code) }, include: signers })`,
  map each to the item shape (party = first signer), compute `days_to_expiry` from
  `expires_at`, assign to a bucket by status + expiry, return `{ buckets, counts }`.
- `exports.createVariation` (`POST /api/sales-agreements/contracts/:id/variation`):
  load the envelope (branch + SALE_RELATED), void it via the same logic as
  `voidEnvelope` (status→voided, `voided_reason: 'Superseded by variation'`),
  and return `{ kind, prefill: { client, services, pricing_input, schedule_b,
  supersedes: envelope_code } }` reconstructed from the envelope's `terms`.
  (Only void if currently voidable; a completed agreement can't be varied — return 409.)

Routes (in `salesAgreement.routes.js`): `router.get('/contracts', ctrl.contracts);`
`router.post('/contracts/:id/variation', ctrl.createVariation);` — declared BEFORE
the `/:kind/...` routes so `contracts` is not captured as a `:kind`.

## 4. Frontend — Contracts hub

`admin-portal/src/screens/sales/SalesContracts.jsx`, route `/residential/contracts`,
nav item under **Assurance** (or a new small Contracts group) in `config/consoles.js`.
- On load, `GET /sales-agreements/contracts` (+ kind/search). Render bucket
  sections in order: **Awaiting signature** (with Remind + Void + Copy link),
  **Expiring soon** (amber, same actions), **Expired** (red, Void + Vary),
  **Completed / signed archive** (Open document/certificate + Vary), **Declined /
  voided** (show reason + Vary). Counts in each header.
- Row shows envelope_code, kind badge (Purchase/Sale), party name/email, status
  chip, and dates (sent / expires-in-Nd / completed).
- **Remind** → POST remind, toast the result. **Void** → confirm + reason prompt
  → POST void → refetch. **Copy link** → fetch envelope, copy the outstanding
  signer's `/admin/sign/:token`. **Vary** → POST variation → navigate to
  `/residential/agreements/:kind` with the returned `prefill` (via router state)
  so the wizard opens pre-filled. **Open document** → the completed doc
  (`final_pdf_url`/`certificate_url`, else the signing view URL).
- Search box (title/code) + kind filter; URL-backed via `useSearchParams`.
- Reuse `ui/kit` (`PageHead`, `Badge`, `Button`, `Spinner`) and the `.pm-*` styling.

The RPPS/RPSS wizard (`SalesAgreementScreen`) gains an optional `prefill` (from
router location state) that seeds its builder state when present — a small,
additive change.

## 5. Testing & verification

- **Buckets endpoint (live):** with the existing test envelopes (some sent, one
  completed via signing, one voided), `GET /api/sales-agreements/contracts` returns
  the correct buckets + counts; a sent envelope with `expires_at` within 7 days
  appears in `expiring_soon`; one past `expires_at` in `expired`; `?kind=purchase`
  narrows; `?search=` matches code/title.
- **Actions (live):** `POST …/contracts/:id/variation` on a sent agreement →
  the envelope becomes `voided` (reason "Superseded by variation") and the
  response carries a `prefill` with the original party + agreed lines; remind/void
  via the existing endpoints still work through the hub.
- **Browser:** the hub lists the buckets; Remind toasts; Void moves the row to
  declined/voided; Vary opens the correct wizard pre-filled; Completed rows open
  the document. Kind filter + search work.
- **Non-regression:** backend `npm test` (27/0 + businessDays) + `npm run test:full`
  (28/0) unaffected (additive read + one void-reuse); `admin-portal npm run build`
  clean; the signing controller + A's create flow are untouched.
- **Acceptance:** every RPPS/RPSS agreement is visible in its correct bucket with
  working remind/void/link/vary/open actions; expiry is accurate at read time.

## 6. File plan

**Backend (modify):** `controllers/salesAgreement.controller.js` (+`contracts`,
`createVariation`, `SALE_RELATED`/`kindOf`), `routes/salesAgreement.routes.js`
(2 routes before `/:kind`). Reuses `signing.controller` remind/void via their
existing routes.
**Frontend (new):** `screens/sales/SalesContracts.jsx`.
**Frontend (modify):** `screens/sales/SalesAgreementScreen.jsx` (accept `prefill`),
`config/consoles.js` (nav), `App.jsx` (route).
**Schema:** none.

## 7. Risks & non-goals

- **Route ordering:** `/contracts` must be registered before `/:kind/...` in
  `salesAgreement.routes.js` or Express treats "contracts" as a kind.
- **Read-time expiry only:** no scheduler flips `expires_at`→`expired` in the DB;
  the hub derives it. An envelope's stored status stays as-is (sent) while the hub
  shows it under Expired — acceptable for a monitoring surface; a later job can
  reconcile.
- **Lightweight variation:** voids the original + prefills a new one; there is no
  stored supersedes chain (only the void reason + `terms.supersedes`). A completed
  agreement returns 409 (can't be voided) — variation there would need the
  tracked-link approach (deferred).
- **Non-goals:** draft/review stage, schedulers, billing wiring, other agreement
  types, contacts.
