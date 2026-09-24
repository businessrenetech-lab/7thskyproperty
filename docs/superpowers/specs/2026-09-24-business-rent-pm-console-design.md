# Business Rent — third Property Management console

**Date:** 2026-09-24
**Status:** approved in brainstorming, awaiting spec review
**Sources:** `Downloads/Business-.../Business/Rent/` — SOP Business Rental Management V0.1 (landlord
side), SOP Business Tenancy Management V0.1 (tenant side),
`Business_Rent_Lease_Checklist_Workflow_Enterprise_V0.1.xlsx`, Business Rental Management Service
Agreement V0.2, Business Tenancy Management Service Agreement V0.2.

---

## 1. Why

Business Rent today is a 7-item console over three bespoke controllers (`businessLease`,
`businessMaintenance`, `businessRentCollection`). Against the SOPs it is missing the whole leasing
pipeline: screening, inspections, negotiation, settlement, handover, rent collection, arrears, owner
payouts, deposits and reporting.

Commercial Rent already solves this problem, and not by duplication: it is the **Property Management
screens** rendered under `PmScopeProvider` with `{category: 'commercial', basePath: '/commercial/rent'}`
— 35 routes, zero forked screens. `admin-portal/src/config/pmScope.jsx` says so in its own header
comment. Business Rent becomes the third such console.

**Decision (approved): Business Rent runs the PM stack scoped to `category: 'business'` at
`/business-rent`,** with the SOP-specific additions built on top.

## 2. Decisions taken in brainstorming

| # | Decision | Chosen |
|---|---|---|
| 1 | What it rents | Business **premises** (office, retail, restaurant, warehouse, factory) — the same service as Commercial Rent, sold under the Business menu |
| 2 | Console shape | **One** console carrying both service sides (Rental Management for landlords, Tenancy Management for tenants), as Commercial Rent does |
| 3 | Approach | **A** — third PM console: config, not a copy |
| 4 | Scope slice | Operating core first; dispute, fraud-escalation, retention and termination registers follow in a second plan |

## 3. The blocking prerequisite: category scoping

`backend/controllers/propertyManagement.controller.js:38-39` (and the same shape at :349, plus
`tenancy.controller.js` and `property.controller.js`):

```js
const catClause = req.query.category === 'commercial' ? "AND p.category = 'commercial'"
  : req.query.category === 'residential' ? "AND p.category = 'residential'" : '';
```

An unrecognised category produces **no filter at all**. A Business Rent console pointed at these
endpoints today would list residential tenancies, residential rent and residential arrears.

This is fixed first, before any console screen ships, exactly as `salesCategory()` fixed the sales
endpoints: one validator shared by the PM controllers, `business` added to the accepted set, unknown
values ignored (falling back to today's behaviour), and an isolation test in **both** directions —
a business query returns no residential or commercial rows, and the residential and commercial
consoles return exactly what they returned before.

This is the riskiest part of the work. The PM stack is live for 38 residential tenancies and 53 rent
properties; Registration's module was inert by comparison. Every change here is additive and covered.

## 4. The console

`PmScopeProvider` value:

```js
{ category: 'business', listingType: 'rent', basePath: '/business-rent', label: 'Business Rent' }
```

Nav = `PROPERTY_MGMT_NAV` rebased onto `/business-rent/*` (the `rebasePmNav` helper Commercial Rent
already uses), keeping the agreements group pointed at the **existing** business builders:

- **Rental Mgmt Agreements** → the BRM builder (`related_type: 'business_rental_agreement'`)
- **Tenancy Mgmt Agreements** → the BTM builder
- **Price Schedule** → `scope="business_rent"`

Those two builders and the price schedule are the documents of record and keep their current routes.
(Registration lost its agreement builder to a nav rewrite; that must not repeat here.)

Everything else arrives as configuration: Properties, Contacts & Rental Leads, Rental Enquiries,
Tenant Applications, Rental Assessments, Vacancy Notices, Renewals, Maintenance/Work Orders,
Inspections, Compliances, Workflows, Tenant Requests, Utilities & Bills, Agency Income, Tenant
Invoices, Collect Rent (Bulk), Receipts, Folios, Arrears & Reminders, Owner Statements, Disbursements,
Pay Owners (Bulk), Landlord Bills, Deposit Settlements, Expense Approvals, Marketing, Risk Register,
Inbox.

## 5. The workflow

The workbook's **13 stages** are the lease pipeline:

Lead Intake · Consultation · Assessment · Documentation · Marketing · Tenant Screening · Inspection ·
Negotiation · Agreement · Settlement · Handover · Management · Closure

**Correction required.** The existing `business_rent` workflow template carries **20** stages: the 13
above plus the seven *department* names from the enterprise sheet (Client Relations, Operations,
Compliance, Business Leasing, Accounts, Property Management, CRM & Compliance). Those are the
Department column of sheet 2, not stages. Zero projects use the template, so it is corrected to the
13 stages; department, compliance check, required evidence and escalation trigger become attributes
of each stage, taken from the enterprise sheet.

Each stage carries its checklist, responsible team, required documents and its **escalation trigger**
(suspicious owner information, unsafe or unlawful operations, fraudulent documents, misleading
information, high-risk tenant, operational hazards, circumvention risk, material disputes, payment
default, access disputes, repeated disputes, legal claims). Triggers raise an entry on the Risk
dashboard rather than being decorative text.

## 6. SOP-specific modules

Four additions, all scoped to `category: 'business'`, so no other console changes.

- **Business tenant screening** (Rental §11, Tenancy §6) — on the existing Tenant Application:
  business type, intended commercial activity, trade licence, corporate profile, financial capability,
  operational suitability, previous leasing history, and a verdict (suitable / conditional / declined).
  The Negotiation stage warns while screening is unresolved.
- **Commercial premises assessment** (Rental §8) — extends the Rental Assessment for business
  properties: location suitability, business suitability, operational condition, maintenance
  condition, accessibility, signage visibility, security, parking, utility readiness, leasing
  readiness.
- **Lease structure** (Rental §9, Tenancy §9) — 3-year initial term; 3+2 / 3+3 extension; renewal
  increment 10–20%; **12 months advance rent** default; deposits by type (security, utility,
  maintenance, operational reserve). These are defaults with warnings, not hard blocks: the SOP says
  "generally … unless otherwise approved by management", so a departure is recorded with who approved
  it.
- **Non-circumvention** (Rental §13, Tenancy §12) — every introduced tenant, company, investor,
  operator or occupancy lead is a protected lead for the engagement plus **12 months**, with the
  evidence trail the SOP names (CRM logs, email, WhatsApp, inspection logs, digital approvals, call
  records). Reuses the existing `NonCircumventionRecord` under a rent context rather than a new table.

## 7. Money

Inherited from PM, scoped to business: tenant invoices, rent collection (single and bulk), receipts,
folios, arrears and reminders, owner statements, owner payouts (single and bulk), landlord bills,
deposit settlements, expense approvals.

Added by the SOP:

- **Advance rent as a schedule** — twelve months by default; the lease records agreed, received and
  outstanding advance.
- **Deposits by type**, each settled separately at exit.
- **Commission gated on occupancy** (Rental §15) — handover cannot complete while the commission
  invoice is unpaid. A manager may override; the override is recorded with who and why, never silent.

## 8. Dashboards

1. **Leasing pipeline** — listings by the 13 stages, days in stage, stalled leases
2. **Occupancy** — leased vs vacant, upcoming expiries, renewals due, vacancy days
3. **Tenant screening & risk** — applications by verdict, high-risk tenants, screening outstanding
4. **Financial** — advance collected vs agreed, commission earned vs outstanding, rent collected,
   arrears ageing
5. **Protection** — active protected introductions, those nearing 12-month expiry, suspected
   circumvention
6. **Operations** — open maintenance, inspections due, tenant requests, escalations raised

## 9. Migration and retirement

Additive migrations only; no applied migration edited.

- The bespoke Business Rent screens (dashboard, listings, listing detail, enquiries, reports) are
  retired; their routes redirect to the PM equivalents.
- `business_leases`, `business_rent_collections`, `business_maintenance`, `business_listings` and
  `business_enquiries` hold 1, 12, 1, 2 and 2 rows. The 2 listings are stale `listing_type: 'sale'`
  rows from the already-retired Business Sale module. Nothing is migrated; the tables are left in
  place, unread by the new console.
- The BRM and BTM agreement builders and the business rent price schedule are **kept**.

## 10. Verification

- **Unit:** the lease-structure rules (term, extension, increment bounds, advance default); the
  advance/commission gate; the screening verdict gate; the corrected 13-stage template.
- **Isolation (first and most important):** business queries return no residential or commercial
  rows; the residential and commercial consoles return byte-identical results to before the change.
- **End-to-end** (`backend/scripts/e2e/businessRent.js`): enquiry → application + screening →
  assessment → marketing → inspection → negotiation → agreement → advance + commission → handover →
  rent collection → arrears → owner payout → closure.
- **Frontend:** `npm run build` clean; click the flow; confirm the residential PM console and the
  Commercial Rent console are unchanged.

## 11. Out of scope (second plan)

Dispute management, fraud and high-risk matter procedures, record retention and confidentiality
registers, termination procedure, tenant-side fit-out/modification tracking, and the public website
surface for business rental listings.

## 12. Risks

- **Live-stack blast radius.** PM serves 38 tenancies and 53 rent properties today. The category
  scoping is the one change that could affect them; it ships first, additively, with both-direction
  isolation tests.
- **Category vs listing_type confusion.** A business rent property is `category: 'business'` +
  `listing_type: 'rent'`; a business *sale* listing is `category: 'business'` + `listing_type: 'sale'`.
  Every business scoping clause must carry both, or Business Rent will show the Business Sale
  listings created during the parity work. Measured at spec time: **17 properties are
  `category: 'business'`, every one of them `listing_type: 'sale'`** — so a category-only scope puts
  all 17 business-for-sale listings into the Business Rent console. The isolation test asserts this
  case explicitly.
- **Agreement wording** (both V0.2 documents) is the client's to review with legal.
- **Deployment is blocked** — Hostinger has lost access to the repository, so this work queues behind
  that fix.
