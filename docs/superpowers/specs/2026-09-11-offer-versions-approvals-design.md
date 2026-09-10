# Offer Versions + Written Approvals — design spec

**Date:** 2026-09-11 · **Branch:** `air-conditioning/phase-0-duplicate` (not merged)
**Plan:** `PROPERTY_SALES_SAAS_PHASED_PLAN.md` §5 (versioned offers/counters, written approvals), Phase 3.
**Status:** design approved in brainstorming; awaiting spec review before the implementation plan.

**Phase 3 sub-project 3.** Preserve the offer/counter negotiation as an immutable
version history, and require a written approval of the accepted version before an
offer can be accepted. Introduction tracking (clause 22) is a **separate
follow-up sub-project** (the unwired `NonCircumventionRecord` will be adapted
there).

Checked against live source 2026-09-11. Today `SaleOffer` is edited in place
(`patchOffer` overwrites amount/terms) with no history, and `acceptOffer` flips
status to `accepted` with no distinct written-approval record.

---

## 1. Goal

Every submit/counter on an offer is captured as an immutable snapshot so the
negotiation history is auditable, and accepting an offer requires a recorded
written approval (buyer/seller-side, decision, note) of the exact version being
accepted — acceptance without one is refused.

## 2. Scope

**In:**
- Two models + migration `0106`: `SaleOfferVersion`, `SaleOfferApproval`.
- `createOffer` / `patchOffer` / `updateOfferStatus` append a version on each
  submit/counter (snapshot of amount/deposit/terms + parties + side + version_no).
- `acceptOffer` requires a written approval of the current version (passed in the
  accept call, recorded as `SaleOfferApproval`); refuse without it, super-admin
  override with a written reason (consistent with the settlement SoD pattern).
- Property-file Offers section: a per-offer version timeline (amount/terms
  history) + the approval shown on the accepted offer.

**Out (deferred / non-goals):**
- Introduction / clause-22 tracking (its own sub-project).
- A separate approve step decoupled from accept (folded into accept here).
- Counter-compose-from-either-side rich panel beyond the existing edit/counter.
- Any money/settlement change; the accepted `SaleOffer` thread still drives
  accept→transaction exactly as today.

## 3. Data model (migration 0106)

**`sale_offer_versions`** — one immutable snapshot per submit/counter.
| col | type | notes |
|---|---|---|
| id | INT PK | |
| branch_id | INT not null | |
| offer_id | INT not null | FK → sale_offers (the negotiation thread) |
| version_no | INT not null | 1,2,3… per offer |
| side | ENUM(`buyer`,`seller`) | who put this version forward (buyer submit vs seller counter) |
| amount | DECIMAL(15,2) | |
| deposit_amount | DECIMAL(15,2) | |
| finance_status | STRING | |
| conditions | JSON | snapshot of the offer conditions array |
| expiry_date, proposed_completion_date | DATEONLY | |
| notes | TEXT | |
| parties_snapshot | JSON | `[{contact_id, client_id, ownership_percent, is_primary}]` at this version |
| created_by | INT | |
| created_at | DATE | (no updated_at — immutable) |

**`sale_offer_approvals`** — the written approval captured at acceptance.
| col | type | notes |
|---|---|---|
| id | INT PK | |
| branch_id | INT not null | |
| offer_id | INT not null | |
| offer_version_id | INT not null | the exact version approved |
| approver_side | ENUM(`buyer`,`seller`) | whose approval this records |
| decision | ENUM(`approved`,`rejected`) default `approved` | |
| note | TEXT | the written basis |
| override_reason | TEXT | set only when a super-admin overrides a missing approval |
| approved_by | INT | actor user |
| approved_at | DATE | |

Associations: `SaleOffer.hasMany(SaleOfferVersion, as:'versions')`,
`SaleOffer.hasMany(SaleOfferApproval, as:'approvals')`,
`SaleOfferApproval.belongsTo(SaleOfferVersion, as:'version')`. Migration follows
the 0103/0105 guarded idiom with `down` dropping both tables. No change to
existing tables.

## 4. Backend — versioning + accept gate

- **Version-append helper** `appendOfferVersion(offer, side, actorId, transaction)`
  in `sales.controller.js`: reads the offer's current figures + its
  `SaleOfferParty` rows, computes `version_no = max+1`, inserts a
  `SaleOfferVersion` snapshot. Called from:
  - `createOffer` when status starts `submitted` → version 1, `side:'buyer'`.
  - `updateOfferStatus` `submitted→countered` → `side:'seller'`;
    `countered→submitted` (buyer re-submit) → `side:'buyer'`.
  - `patchOffer` when it changes money/terms on a `submitted`/`countered` offer →
    a version on the current side (buyer if last was seller-countered, else the
    editing side; default `buyer`). Keep it simple: patch appends a version
    tagged with the side implied by current status (`countered`→seller edit is
    unusual; default to `buyer` unless `req.body.side` says otherwise).
  The offer thread's own `amount`/`deposit`/terms continue to update as today
  (compatibility), so the *current* figures live on `SaleOffer` and the *history*
  on versions.
- **Accept gate** in `acceptOffer`: before creating the transaction, require an
  approval for the current (latest) version. The accept request carries
  `{ approval: { approver_side, decision:'approved', note } }`. If absent:
  refuse `409 'A written approval of this offer version is required to accept it.'`
  unless `req.user.role==='super_admin' && override && override_reason` (records
  a `SaleOfferApproval` with `override_reason`). On accept, insert the
  `SaleOfferApproval` linked to the latest `SaleOfferVersion`, then proceed with
  the existing accept→transaction/deal/parties flow unchanged. A `decision` of
  `rejected` is not a valid accept (400).
- **Reads:** extend the property-file offers payload (`getPropertyFile` already
  includes offers) to include each offer's `versions` (ordered) and `approvals`.
  Add `GET /sales/offers/:id/versions` for a focused fetch if the property-file
  include is too heavy (optional; prefer the include).

No new money logic; the accepted-offer amount still comes from the `SaleOffer`
row.

## 5. Frontend — property-file Offers section

`SalesPropertyFile.jsx` offers section (state-based tab, unchanged mechanism):
- Each offer row/card gains a **version timeline** (collapsible): version_no,
  side badge (Buyer/Seller), amount, deposit, key terms, date — newest first,
  read-only.
- The existing counter/edit and status actions stay; countering appends a
  version (backend), so the timeline grows.
- **Accept** now opens a small approval capture (approver side + a required note)
  and sends it in the accept call; a super-admin sees an override option
  (checkbox + reason) when they choose to accept without a formal approval.
- The accepted offer shows its **approval** (who/side/decision/note/when).
- Reuse `ui/kit`; no new route. Keep edits within the offers section.

## 6. Testing & verification

- **No money regression:** backend `npm test` (27/0) + `npm run test:full`
  (28/0) stay green — accept→transaction is unchanged apart from the gate; the
  full-lock harness accepts an offer, so it must be updated to pass an approval
  (or the harness's accept path adds one) — **the harness update is part of this
  work** so it stays green.
- **Migration:** `db:migrate` applies 0106; both tables exist; `down` drops them.
- **Endpoint checks (live):** create+submit an offer → version 1 exists;
  counter it (`submitted→countered`) → version 2 `side:'seller'`; accept without
  an approval → 409; accept with `{approval:{approver_side:'seller',note:'…'}}`
  → 201, transaction created, a `SaleOfferApproval` linked to the latest version;
  super-admin override path records `override_reason`.
- **Browser:** on a property, submit an offer, counter it, see the 2-version
  timeline; accept with an approval note; the accepted offer shows the approval.
- **Acceptance:** every submit/counter yields an immutable version; no offer can
  be accepted without a recorded approval (or an audited override); the existing
  accept→transaction→settlement flow still works.

## 7. File plan

**Backend (new):**
- `backend/migrations/0106-offer-versions-approvals.js`
- `backend/models/SaleOfferVersion.js`, `backend/models/SaleOfferApproval.js`
  (or add to `SalesModels.js` alongside the other sale models — follow the file's
  existing pattern; SalesModels defines them inline, so add there).

**Backend (modify):**
- `backend/controllers/sales.controller.js` — `appendOfferVersion` helper; call
  it in create/patch/updateStatus; accept gate + approval record in `acceptOffer`;
  include versions/approvals in the offers read.
- `backend/routes/sales.routes.js` — optional `GET /offers/:id/versions`.
- `backend/scripts/e2eDealSalesSettlementFull.js` — pass an approval when it
  accepts the offer (keep the harness green).

**Frontend (modify):**
- `admin-portal/src/screens/sales/SalesPropertyFile.jsx` — version timeline +
  accept-with-approval in the offers section.

**Schema:** migration 0106 (two new tables; no change to existing tables).

## 8. Risks & non-goals

- **Accept flow is money/legal-adjacent.** The only behavior change is the
  approval gate; the accept→transaction/deal/parties logic is untouched. The
  full-lock harness is updated in the same change so regression is caught.
- **`SalesModels.js` is where sale models live** — add the two models there (or
  as siblings) consistent with the file, and wire associations without disturbing
  existing exports.
- **Property file is large** — confine changes to the offers section; no
  restructure.
- **Non-goal:** introductions/clause-22, a decoupled approve step, rich
  counter-compose, money changes.
