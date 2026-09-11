# RPPS + RPSS Sales Service-Agreement Builders — design spec

**Date:** 2026-09-11 · **Branch:** `air-conditioning/phase-0-duplicate` (not merged)
**Plan:** `PROPERTY_SALES_SAAS_PHASED_PLAN.md` §Phase 4 (Contracts).
**Status:** design approved in brainstorming; awaiting spec review before the implementation plan.

**Phase 4, sub-project A of 4** (B = Contracts hub, C = signing→billing wiring,
D = Contacts relationships). Build the two residential **sales** service-agreement
builders — **RPPS** (Purchase, signed Seventh Sky ↔ Buyer) and **RPSS** (Sale,
signed Seventh Sky ↔ Seller/Owner) — mirroring the proven RPRM/RPTM/STS/WT
agreement recipe: seed each Schedule C catalogue, render a full clause+schedule
HTML agreement, create a signing envelope, and drive it from a wizard screen.

Sources (approved V0.2, supplied by the user):
`C:\Users\ADMIN\Downloads\Sale-…\Residential Property Purchase Service Agreement - V0.2.docx`
(SSPC-RPPS-01 v0.2) and `…Residential Property Sale Service Agreement - V0.2.docx`
(SSPC-RPSS-01 v0.2). Extracted plain text is cached in the session scratchpad
`…/rpps/*.txt`. Both are 25 clauses + Schedules A–D + a 13-row Schedule C price
schedule + Project Cost Summary + Payment Schedule.

Verified against current source 2026-09-11: `rprmAgreement.service.js` /
`rprm.controller.js` / `rprm.routes.js`, `SigningEnvelope`/`EnvelopeSigner`/
`SignatureField` models, and explicit `mount('/api/rprm', …)` in `server.js` all
exist. Catalogues seed into the shared `ServiceItem` (table `care_services`) under
a `ServiceCategory`, scoped by a unique `vertical` — no schema change.

---

## 1. Goal

Staff open a "Purchase Agreements" or "Sale Agreements" screen, run a wizard
(parties → services → property → pricing → checklist → review & send), and create
a signed-ready agreement: a `SigningEnvelope` whose `document_html` is the fully
rendered RPPS/RPSS (25 clauses, Schedules A–D, the selected Schedule C priced
lines with Standard vs Agreed prices, a cost summary and a payment schedule),
with the correct signer (buyer for RPPS, seller for RPSS) who signs via the
existing public `/admin/sign/:token` page.

## 2. Scope

**In:**
- **Catalogue seed** (`scripts/seedSalesAgreementCatalogs.js`): RPPS-001..013 under
  `ServiceCategory` `SVC-CAT-RPPS` (`vertical: 'sale_purchase'`) and RPSS-001..013
  under `SVC-CAT-RPSS` (`vertical: 'sale_sale'`), into `ServiceItem`/`care_services`.
  Standard price → `base_price`; price type (`fixed`/`from`/`included`/`percent`)
  in `tags.price_type`; unit in `tags.unit`. Exact rows in §5.
- **Two agreement services** (`services/rppsAgreement.service.js`,
  `services/rpssAgreement.service.js`): `getCatalog()`, `computePricing(...)`
  (one-time fees, discount/VAT, auto payment schedule, percent-fee handling),
  `buildRppsAgreement(...)` / `buildRpssAgreement(...)` → `{ title, doc_no, html,
  terms }`. HTML = visible TOC + 25 clauses (verbatim from the V0.2 docx) +
  Schedules A–D + Schedule C dual-price table (only selected lines) + cost summary
  + payment schedule. Shared rendering helpers may live in a small
  `salesAgreementRender.js` to avoid duplication between the two.
- **Controller + routes** (`controllers/salesAgreement.controller.js`,
  `routes/salesAgreement.routes.js`), one `makeHandlers('purchase'|'sale')`
  family mounted at `/api/sales-agreements` (a KIND map sets doc no, vertical,
  builder, `related_type`, signer role). Endpoints: `GET /:kind/catalog`,
  `GET /:kind/meta`, `POST /:kind/preview`, `GET /:kind/agreements`,
  `POST /:kind/agreements`. Mounted in **server.js** (explicit) AND
  `routes/manifest.js`.
- **Create flow**: `POST /:kind/agreements` renders the HTML, creates a
  `SigningEnvelope` (`document_html`, `related_type` `sale_purchase_agreement` /
  `sale_sale_agreement`, linked `property_id`/`deal_id`/`contact_id` when given),
  an `EnvelopeSigner` (role `buyer` for RPPS, `seller` for RPSS, with
  `access_token`), and `SignatureField`s — reusing the eSign flow.
- **Frontend**: `screens/sales/PurchaseAgreements.jsx` + `SaleAgreements.jsx`
  (list + 6-step wizard, adapted from `RprmAgreements.jsx`/`TmAgreements.jsx`),
  nav items under **Selling** (Sale) and **Buying** (Purchase) in
  `config/consoles.js`, routes in `App.jsx`. Buyer party fields for RPPS; seller
  party fields for RPSS.

**Out (deferred / non-goals):**
- Contracts hub / review queue / reminders / expiry / variations UI → sub-project B.
- Signing-completion → activation/billing wiring → sub-project C (this sub-project
  creates the envelope; completion behavior is unchanged from the existing flow).
- Contacts dedup/relationships → sub-project D.
- Commercial/Rural/Business variants (only Residential here).
- Editing catalogue prices UI (prices editable in the existing catalog admin; the
  wizard picks Standard and lets staff enter an Agreed price per line).

## 3. Architecture (mirror the recipe)

Identical to the WT customer/provider pair (one controller, two kinds):
`KIND = { purchase: { doc_no:'SSPC-RPPS-01', version:'0.2', vertical:'sale_purchase',
build: buildRppsAgreement, related_type:'sale_purchase_agreement', signer:'buyer',
party:'Buyer' }, sale: { doc_no:'SSPC-RPSS-01', version:'0.2',
vertical:'sale_sale', build: buildRpssAgreement, related_type:'sale_sale_agreement',
signer:'seller', party:'Seller' } }`. The envelope's `document_html` is rendered
and stored at create time (renderer changes affect only NEW agreements; old ones
are voided via the existing `POST /api/signing/envelopes/:id/void`).

## 4. Signer + party model

- **RPPS**: company = Seventh Sky; counter-party = **Buyer** (contact). Wizard
  captures buyer name/contact, optional linked `property_id`/`deal_id`.
- **RPSS**: counter-party = **Seller/Owner** (contact). Same linkage.
- Both use the existing `EnvelopeSigner` (`access_token`, role) + `SignatureField`
  and the public `/admin/sign/:token` page — no signing-page change.

## 5. Catalogues (exact, from V0.2 Schedule C)

Price type encoding in `tags.price_type`: `fixed` (a number), `from` (a floor),
`included` (bundled, 0), `percent` (percentage/as-agreed).

**RPPS (`vertical: sale_purchase`, category SVC-CAT-RPPS):**
| Code | Service | Unit | Standard (BDT) | type |
|---|---|---|---|---|
| RPPS-001 | Initial Property Consultation | Session | 2,000 | fixed |
| RPPS-002 | Property Requirement Assessment | Project | 3,000 | fixed |
| RPPS-003 | Property Search & Shortlisting | Project | 8,000 | from |
| RPPS-004 | Market Research & Property Comparison | Project | 5,000 | from |
| RPPS-005 | Property Inspection Coordination | Inspection | 2,000 | from |
| RPPS-006 | Seller Communication & Negotiation | Transaction | 5,000 | from |
| RPPS-007 | Offer Preparation & Submission | Transaction | 3,000 | from |
| RPPS-008 | Documentation Coordination | Transaction | 5,000 | from |
| RPPS-009 | Settlement Coordination | Transaction | 8,000 | from |
| RPPS-010 | Loan Assistance Coordination | Project | 5,000 | from |
| RPPS-011 | Property Valuation / Survey Coordination | Project | 3,000 | from |
| RPPS-012 | Relocation & Utility Coordination | Project | 3,000 | from |
| RPPS-013 | Professional Success Fee (Optional) | Purchase | 0 | percent (% of Purchase Price or As Agreed) |

**RPSS (`vertical: sale_sale`, category SVC-CAT-RPSS):**
| Code | Service | Unit | Standard (BDT) | type |
|---|---|---|---|---|
| RPSS-001 | Initial Property Consultation | Session | 2,000 | fixed |
| RPSS-002 | Property Assessment | Property | 3,000 | fixed |
| RPSS-003 | Market Appraisal | Property | 5,000 | fixed |
| RPSS-004 | Property Photography | Property | 5,000 | from |
| RPSS-005 | Drone Photography & Videography | Property | 8,000 | from |
| RPSS-006 | Property Listing & Marketing | Property | 10,000 | from |
| RPSS-007 | Buyer Inspection Coordination | Inspection | 1,500 | from |
| RPSS-008 | Open House Coordination | Event | 3,000 | from |
| RPSS-009 | Negotiation & Offer Coordination | Transaction | 0 | included |
| RPSS-010 | Documentation Coordination | Transaction | 5,000 | from |
| RPSS-011 | Settlement Coordination | Transaction | 8,000 | from |
| RPSS-012 | Property Preparation / Styling Coordination | Project | 5,000 | from |
| RPSS-013 | Professional Sales Commission | Sale | 0 | percent (% of Final Sale Price) |

Clause bodies (25 each) are transcribed verbatim from the V0.2 docx during
implementation; "From" is a price type, never a promised final charge.

## 6. Pricing

`computePricing(selectedItems, { discount, vat, agreedPrices })`: sum the chosen
lines at their Agreed price (falling back to Standard), apply discount then VAT,
produce the Project Cost Summary buckets (Professional Service Fees / Coordination
/ Third-Party / Administrative / Discount / VAT / TOTAL) and an auto Payment
Schedule (Deposit + stage payments). `percent`/`included` lines contribute 0 to
the numeric total but render their stated basis (e.g. "___% of Final Sale Price").

## 7. Testing & verification

- **Seed:** run `seedSalesAgreementCatalogs.js` → 13 RPPS rows under `sale_purchase`
  and 13 RPSS rows under `sale_sale` in `care_services`; re-running is idempotent
  (scoped delete-then-insert per vertical, like the RPRM seeder).
- **Endpoints (live):** `GET /api/sales-agreements/purchase/catalog` → 13 rows;
  `POST /api/sales-agreements/purchase/preview` → HTML containing the 25 clause
  headings + selected Schedule C lines + cost summary; `POST …/purchase/agreements`
  → a `SigningEnvelope` (`related_type` `sale_purchase_agreement`) + a `buyer`
  signer with an `access_token`; same for `sale` → seller signer. `GET …/agreements`
  lists them.
- **Signing:** open `/admin/sign/:token` for a created envelope → the stored
  `document_html` renders with signature fields (existing page, unchanged).
- **Browser:** each wizard creates an agreement end-to-end; the review step shows
  the rendered doc; the list shows created agreements with status.
- **Non-regression:** backend `npm test` (27/0 + businessDays) + `npm run test:full`
  (28/0) unaffected (additive); `admin-portal npm run build` clean; the RPRM/TM
  builders are untouched.
- **Acceptance:** both agreements build faithfully from V0.2, seed correct
  catalogues, create correctly-signed envelopes, and are reachable from nav.

## 8. File plan

**Backend (new):** `scripts/seedSalesAgreementCatalogs.js`,
`services/rppsAgreement.service.js`, `services/rpssAgreement.service.js`,
`services/salesAgreementRender.js` (shared helpers),
`controllers/salesAgreement.controller.js`, `routes/salesAgreement.routes.js`.
**Backend (modify):** `server.js` + `routes/manifest.js` (mount
`/api/sales-agreements`).
**Frontend (new):** `screens/sales/PurchaseAgreements.jsx`,
`screens/sales/SaleAgreements.jsx`.
**Frontend (modify):** `config/consoles.js` (two nav items), `App.jsx` (two routes).
**Schema:** none (catalogues reuse `care_services`; envelopes reuse signing tables).

## 9. Risks & non-goals

- **Version governance:** implementing V0.2 (SSPC-RPPS-01 / SSPC-RPSS-01 v0.2) per
  the user; the doc footer states the version. The repo also holds V0.1 copies —
  V0.2 supersedes for this build.
- **Shared `care_services` table:** scope every sales query by `vertical`
  (`sale_purchase`/`sale_sale`) so rows never mix with Property Care / PM / WT.
- **Immutable signed snapshots:** `document_html` stored at create; catalogue edits
  never alter issued agreements (recipe invariant; also a Phase-4 gate).
- **Clause fidelity:** the 25 clauses are transcribed from the V0.2 docx, not
  paraphrased.
- **Non-goals:** Contracts hub, billing/activation wiring, contacts dedup,
  non-residential variants (all later).
