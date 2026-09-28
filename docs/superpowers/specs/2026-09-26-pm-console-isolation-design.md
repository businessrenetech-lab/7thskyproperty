# Property Management console isolation — audit and design

**Date:** 2026-09-26
**Status:** decisions approved in brainstorming, awaiting spec review
**Trigger:** the four PM consoles show each other's data. Reported by the user as "currently on
business rental or commercial … showing residential property management sections leads … everything
mixed up", and confirmed by measurement.
**Blocks:** `docs/superpowers/specs/2026-09-26-rural-rent-pm-console-design.md` — Rural Rent would
inherit every leak below, so this lands first.

---

## 1. The rule

One set of PM tables serves four consoles. A console is a **scope**, not a copy:

| Console | Scope |
|---|---|
| Property Management (residential) | `category: 'residential'`, `listing_type: 'rent'` |
| Commercial · Rent | `category: 'commercial'`, `listing_type: 'rent'` |
| Business Rent | `category: 'business'`, `listing_type: 'rent'` |
| Rural · Rent | `category: 'rural'`, `listing_type: 'rent'` |

**Every list, dashboard, financial figure, agreement and website hand-off must carry that scope.**
An unrecognised category must leave a query **unfiltered** (today's behaviour for callers that pass
nothing) — but no console may ever *be* the unrecognised case.

## 2. What was measured

Probed all 36 PM list endpoints with `residential`, `business` and `rural`, against live data
(53 residential rent properties, 38 tenancies, 0 rural rows). Identical non-empty payloads across
categories means the endpoint ignores the scope.

### 2.1 Money and reports leak into Business and Commercial — live, today

| Endpoint | Screen | res / business / rural | Cause |
|---|---|---|---|
| `GET /disbursements/owner-balances` | Disbursements | 30 / **30** / **30** | two-way ternary |
| `GET /disbursements/owner` | Disbursements | 25 / **25** / **25** | no filter |
| `GET /disbursements/income` | Disbursements | 25 / **25** / **25** | no filter |
| `GET /disbursements/bulk-owner-data` | Pay Owners (Bulk) | 6 / **6** / **6** | no filter |
| `GET /rental-reports/overview` | Reports | identical | two-way ternary |
| `GET /tenancies/collect-rent-data` | Collect Rent (Bulk) | 26 / **26** / **26** | no filter |
| `GET /tenancies/overdue-reminders` | Rent Reminders | 9 / **9** / **9** | no filter |
| `GET /communications/inbox` | Inbox | 70 / **70** / **70** | no filter |
| `GET /properties?limit=100` | Compliance | all | screen sends no category |

`backend/controllers/disbursement.controller.js:298` and
`backend/controllers/rentalReports.controller.js:31` carry the identical two-way ternary that was
fixed in `propertyManagement.controller.js` on 2026-09-24:

```js
req.query.property_category === 'commercial' ? " AND p.category = 'commercial'"
  : req.query.property_category === 'residential' ? " AND p.category = 'residential'" : ''
```

Business and rural both fall through to `''`.

### 2.2 Rural-specific leaks (would hit on day one)

`GET /tenant-applications`, `GET /contacts` (leads), `GET /property-management/dashboard-metrics`
and `GET /property-management/action-center` all return residential data for `category=rural`,
because two hard-coded lists exclude rural:

- `backend/utils/pmCategory.js:13` — `['residential', 'commercial', 'business']`
- `backend/controllers/contact.controller.js:177` — `['commercial', 'residential', 'business']`

`backend/scripts/testPmCategory.js` asserts `pmCategory('rural') === null` with the comment
*"rural is not a PM console"*. That assertion was correct when written and is now the bug.

### 2.3 Agreements silently produce the wrong document

`rprm.controller.js:24` and `rptm.controller.js:51` resolve the category as a
residential-or-commercial binary; **anything else falls back to residential**, with residential
codes (`ENV-RPRM-`, `RPRM-018`). `salesAgreement.controller.js:61` accepts business but not rural.
A Rural or Business console's agreement builder therefore emits a residential agreement. This is a
wrong-document bug, not a data leak.

### 2.4 Website routing

- **All 55 website-sourced contacts carry `category: 'residential'`.** `submitRentalEnquiry` creates
  the contact through `ensureContact` without a category, and contact creation defaults to
  residential. An enquiry on a commercial, business or rural property therefore becomes a
  **residential lead**, and Rural would never receive its own enquiries.
- `rental_enquiries` has **no category column**. Consoles scope it with an inner join on the
  property (`required: true` in `rentalEnquiry.controller.js:40`), so the **2 of 10** enquiries with
  no property attached are invisible in *every* console.

### 2.5 Screens with no console awareness

No `usePmScope`, so they cannot scope even where the backend supports it:
`BulkRentCollection`, `BulkOwnerDisbursement`, `Compliance`, `Communication`, `Projects`,
`GlobalInvoicing`, `RentReminders`.

### 2.6 Also found

`GET /api/tenancies/global-invoices` returns **HTTP 500** — the Global Invoicing screen is broken
for every console.

### 2.7 Correctly scoped (measured, no change needed)

`tenancies`, `properties`, `rental-assessments`, `rental-enquiries`, `folios`, `inspections`,
`billing/tenant-invoices`, `billing/landlord-bills`, `billing/rental-receipts`,
`deposit-settlements`, `owner-statements`, `vacancy-notices`, `work-orders`,
`property-management/renewals`, `invoices/agency-income`, `move-in-checklist`,
`property-management/action-center` (business verified 0).

**Unproven, not proven-good:** `tenant-requests`, `arrears-actions`, `utility-bills`,
`marketing-activities`, `expense-approvals`, `property-risks` returned 0 rows for every category
because those tables are empty. They read `property_category` via `propertyControlCrud.js`; the
isolation suite must assert them against a fixture rather than assume.

## 3. Decisions taken in brainstorming

| # | Decision | Chosen |
|---|---|---|
| 1 | Sequencing | **Fix isolation first, as its own plan**, so Business and Commercial stop leaking immediately rather than when Rural ships |
| 2 | Website lead routing | **Inherit the property's category**; an enquiry with no property stays residential so it still has a home; add a `category` column to `rental_enquiries` so unlinked enquiries stop vanishing |
| 3 | The 55 existing residential-stamped website leads | **Leave them — fix forward only.** No backfill of the production `contacts` table |

## 4. Design

**One validator, four categories.** `pmCategory` becomes the single source of truth
(`['residential', 'commercial', 'business', 'rural']`) and every category comparison in the PM stack
goes through it — the two remaining ternaries, `contact.controller`, and the screens' query strings.
Unknown values still return `null` and still leave a query unfiltered, so callers that pass nothing
are unaffected.

**Agreements fail loudly.** `rprm`/`rptm`/`salesAgreement` stop falling back to residential. A
category with no builder returns an explicit error naming the missing builder; the rural builders
themselves belong to the Rural plan, not here.

**Website hand-off inherits.** `submitRentalEnquiry`, `submitTenantApplication`, `submitSalesEnquiry`
and `submitPropertyOffer` stamp the category from the resolved property onto both the contact and
the record. `rental_enquiries.category` is added and back-filled **from the joined property only**
(no guessing), and the console query moves to a left join plus that column so unlinked enquiries
appear in residential instead of nowhere.

**The probe becomes a permanent test.** `backend/scripts/e2e/consoleIsolation.js` walks every PM
endpoint × every category and fails on identical non-empty payloads, plus asserts fixtures for the
six empty-table endpoints. This is what stops the next console from re-introducing the same class of
bug.

## 5. Verification

- **Unit:** the four-category validator; the agreement category resolver's explicit failure.
- **Isolation (the point of the work):** every PM endpoint returns only its own console's rows, in
  all four categories, proven against a fixture per category; and residential returns exactly what
  it returned before (53 rent properties, 38 tenancies, 103 open actions, BDT 107,400 overdue,
  192 blockers).
- **Website:** an enquiry submitted against a commercial/business/rural property produces a lead and
  an enquiry in that category, and appears in that console only; a property-less enquiry appears in
  residential.
- **Frontend:** both builds clean; the seven newly-scoped screens show only their console's data.

## 6. Out of scope

The rural agreement builders (Rural plan), backfilling the 55 existing leads (declined above),
cleaning the junk in `property_type`, and the Rural console itself.

## 7. Risks

- **This edits the live residential stack**, which serves 38 tenancies and 53 rent properties. Every
  change is additive and every task ends by re-measuring the residential baseline.
- **`tenancies/global-invoices` is already broken (500).** Fixing it is in scope, but the cause is
  unknown until investigated, so that task may grow.
- **Six endpoints cannot be proven without fixtures**, and fixtures land in the production database.
  They must be created and removed inside the test run, as the Business Rent e2e does.
- **Deployment is blocked** — Hostinger has lost access to the repository.
