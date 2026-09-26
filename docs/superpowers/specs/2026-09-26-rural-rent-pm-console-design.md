# Rural Rent — fourth Property Management console, with Tenant Sourcing

**Date:** 2026-09-26
**Status:** decisions approved in brainstorming, awaiting spec review
**Sources:** `Downloads/Rural-20260926T033733Z-1-001/Rural/Rent/` — SOP Rural Property Rental
Management Service V0.1 (owner/landlord side, 15 sections, 14 steps), SOP Rural Property Tenancy
Management Service V0.1 (tenant side, 13 sections, 13 steps), `RURAL PROPERTY - RENT - WORKFLOW -
CHECKLIST - V0.1.docx` (two CRM systems: owner 25 sheets / 9 phases, tenant 25 sheets / 7 phases,
5 dashboards), `Seventh_Sky_Rural_Rental_CRM_Detailed - V0.1.xlsx` (17 sheets), and the two V0.2
service agreements.

---

## 1. Why

Rural exists today as a **sale-only** surface: a `Rural Properties` sidebar group pointing at the
shared sales screens (`/rural/sell`, `/rural/buy`, `/rural/enquiry`). There is no rent side at all.

The pattern for adding one is settled and proven three times: the Property Management screens
rendered under `PmScopeProvider` with a category and a base path. Residential is
`{category:'residential', basePath:'/property-management'}`, Commercial Rent is
`{category:'commercial', basePath:'/commercial/rent'}`, Business Rent is
`{category:'business', basePath:'/business-rent'}`. **Rural Rent becomes the fourth.**

But rural is not simply a fourth category. Two things make it different, and both are real work:

1. **A rural property is a land record, not a street address.** It is identified by District,
   Upazila, Union, Village, **Mouza, Khatiyan, Dag** and land area. The strings `khatiyan`, `mouza`
   and `upazila` appear **nowhere** in this codebase.
2. **The tenant side is a sourcing service.** The Tenancy Management SOP is a search-and-match
   pipeline — requirement, budget, search criteria, property search, shortlist, due diligence —
   which the PM stack has no analogue for. Business Rent's tenant side rode the landlord pipeline;
   rural's does not.

## 2. Decisions taken in brainstorming

| # | Decision | Chosen |
|---|---|---|
| 1 | Console shape | **One** console at `/rural/rent`: the PM screens for the landlord side **plus a new Tenant Sourcing module** for the tenant side |
| 2 | Land record | **Additive nullable columns on `properties`**, shown in a rural-only panel — Rural Sale gets them for free and one property stays one row |
| 3 | Scope slice | **Operating core first**; complaint/feedback/communication/retention registers and dispute management follow in a second plan |
| 4 | Sidebar | `Rural` with exactly two sub-items: **Sale** and **Rent** — matching Commercial |

## 3. The blocking prerequisite: rural is not a PM category

`backend/utils/pmCategory.js`:

```js
const PM_CATEGORIES = ['residential', 'commercial', 'business'];
```

and `backend/scripts/testPmCategory.js` asserts it explicitly:

```js
assert.strictEqual(pmCategory('rural'), null, 'rural is not a PM console');
```

That assertion was written on 2026-09-24 and is now wrong. Until it changes, a Rural Rent console
pointed at the PM endpoints returns **no filter at all** — every residential tenancy, every
residential rent property, every residential arrears row. This is the identical bug class fixed for
business two days ago, and it ships first, with an isolation test in both directions.

**The scoping rule, from day one:** Rural Rent is `category:'rural'` **AND**
`listing_type:'rent'`. There are **zero** rural properties today, so nothing leaks yet — but the
sale side is live and will create `category:'rural', listing_type:'sale'` rows, and the moment it
does, a category-only scope puts the rural sale book in the rent console. Business Rent learned
this the expensive way (17 sale listings). The test asserts it before the first rural sale row
exists.

## 4. The console

`PmScopeProvider` value:

```js
{ category: 'rural', listingType: 'rent', basePath: '/rural/rent', label: 'Rural · Rent' }
```

Nav = `PROPERTY_MGMT_NAV` (33 items) rebased onto `/rural/rent/*` via the existing `rebasePmNav`
helper, with the agreements group pointed at the two **rural** builders, plus two rural-only groups:
**Land & Ownership** and **Tenant Sourcing**.

Sidebar (`ui/Layout.jsx`): the `Rural Properties` group becomes

```
Rural  →  Sale   (/rural/sell — today's working sale dashboard, unchanged)
          Rent   (/rural/rent — this console)
```

Buy and Buyer Enquiries are already reachable from the Sale dashboard's own quick links
(`/${category}/buy`, `/${category}/enquiry`), so consolidating orphans nothing. Compliance and
Workflows arrive inside the Rent console's PM nav, scoped to rural; the Sale dashboard keeps a link
to its own.

## 5. The two workflows

The SOPs describe **two separate 11-stage pipelines**, not one.

**Owner / Rental Management** (SOP §4, 9 phases):
Owner Enquiry · Property Assessment · Ownership Verification · Owner Agreement · Marketing
Preparation · Property Marketing · Tenant Screening · Lease Negotiation · Lease Execution ·
Property Management · Closure

**Tenant / Tenancy Management** (SOP §4, 7 phases):
Tenant Enquiry · Consultation · Requirement Assessment · Tenant Agreement · Property Search ·
Property Shortlisting · Inspection · Negotiation · Lease Coordination · Move-In Support · Closure

**Correction required.** `workflow_templates` id **13** (`vertical_key: 'rural_rent'`) holds **12**
stages that mash the two pipelines together — owner stages (`lead`, `verification`, `marketing`,
`leasing`, `lease`) beside tenant stages (`search`, `inspection`, `negotiation`) — and promote four
**Due-Diligence checklist items** (`lease_review`, `landlord_verification`, `property_inspection`,
`business_suitability`) into stages. Sheet 16 of the tenant workbook shows these four are checklist
rows. **Zero projects** use the template, so `rural_rent` is corrected to the 11 owner stages and a
new `rural_tenancy` template carries the 11 tenant stages. Each stage keeps its checklist,
responsible role, required documents and evidence, per the workbook's Workflow Detailed sheets.

## 6. Rural-specific modules

Six additions. All scoped to `category:'rural'`, so no other console changes.

- **Land record** (Owner Sheet 2) — `upazila`, `union`, `village`, `mouza`, `khatiyan`, `dag`,
  `land_area_decimal`, `current_use` as nullable columns on `properties`, surfaced in a rural-only
  panel on the property wizard and rental-property screens. Rural Sale inherits them.
- **Ownership verification register** (Owner Sheet 3, SOP §6) — nine documents per property: deed,
  khatiyan, dag, mutation, tax receipt, succession records, utility bills, court clearance, POA
  verification; each with required / received / verified / verification method / remarks / file.
  A dispute or encumbrance found here raises a **Risk Register** entry rather than a note.
  Marketing is gated on ownership being verified (SOP §7 Step 5: signed owner agreement **before
  marketing commences**).
- **Rural readiness & suitability assessment** (Owner Sheet 5, Tenant Sheet 10, SOP §8/§7) — a third
  `RentalAssessment` template beside the residential room template and the business premises one:
  access roads, **boundary verification**, utilities, **water sources**, land condition, existing
  structures, farming suitability, fishery suitability, commercial suitability, security, marketing
  readiness. Boundary verification and ownership authority are the blocking gates.
- **Rural tenant screening** (Owner Sheet 8, SOP §10 Step 11) — NID verification, business
  verification, **farming experience**, financial capacity, references, background check, intended
  use, and a verdict. The business screening service is generalised to hold a field set per
  category rather than copied; business keeps its eight fields unchanged.
- **Tenant Sourcing module** (Tenant Sheets 2-4, 6-8, 10-11, 16; SOP §5-§8) — the new pipeline:
  a **tenant brief** (requirement types from the nine rural categories, budget min/max, deposit
  budget, lease duration, district/upazila/village/type/land-area criteria), a **search &
  shortlist** register (property, source — internal database / active listings / off-market /
  rural network / landlord referral — inspection date, outcome, priority, advantages, risks), and a
  **due diligence** checklist (lease review, landlord verification, business suitability,
  environmental review, legal review).
- **Non-circumvention, 24 months** (SOP §13 owner, §11 tenant) — rural protection is **24 months
  from introduction**, not business rent's 12. Both registers the SOPs name — Protected **Tenant**
  (owner side) and Protected **Property** (tenant side) — are two views of the same
  `non_circumvention_records` rows, which already carry owner, tenant and property. The window
  months become per-category config; `protectionExpiry(date, months)` already takes them.

## 7. Money

Inherited from PM, scoped to rural: tenant invoices, rent collection (single and bulk), receipts,
folios, arrears and reminders, owner statements, owner payouts, landlord bills, deposit settlements,
expense approvals. The advance-rent schedule, deposits-by-type and the commission-gated handover
built for Business Rent are category-agnostic and apply unchanged.

Added by the SOPs (Owner Sheet 4, SOP §7 Step 6) — the **fee structure**, recorded per property on
the owner engagement: **leasing fee**, **management fee**, **marketing budget**, **early termination
fee**, and the **exclusive appointment period** with its expiry. These live on
`property_owner_profiles`, which already holds the per-property owner record and agreement status.

## 8. Dashboards

The five the workbook names:

1. **Owner** — active listings, vacant, occupied, leasing revenue, arrears
2. **Tenant** — active briefs, inspections, active leases, upcoming renewals
3. **Property** — by rural type: farm houses, fisheries, ponds, agricultural land, orchards
4. **Financial** — leasing fees, management fees, outstanding invoices, revenue by property type
5. **Executive** — total owners, total tenants, active rentals, occupancy rate, revenue, gross profit

## 9. Property types

Ten types (SOP §2): agricultural land, farming land, farm house, rural residential house, fishery,
pond, dairy farm, poultry farm, orchard, commercial rural, mixed use rural. Today `property_type` is
a free string holding junk (`''`, `'sa'`), so rural gets a shared constant driving the wizard select
and the Property dashboard's grouping — without constraining the column for other categories.

## 10. Migration and data

Additive migrations only; no applied migration edited. Next free number: **0155**.

- `properties.category` **already allows `'rural'`** — no enum change.
- **Zero rural properties and zero rural projects** exist, so there is nothing to migrate and no
  back-fill. This is the cleanest slate of the four consoles.
- `salesCategory` already accepts rural; the sale side is untouched.

## 11. Verification

- **Unit:** the four-category validator; the corrected 11-stage owner and 11-stage tenant templates;
  the 24-month protection window; the rural assessment template's blocking gates; the rural
  screening verdict; tenant-brief matching and shortlist math; the fee structure.
- **Isolation (first and most important):** rural queries return no residential, commercial or
  business rows; a rural **sale** property never appears in the rent console; and residential,
  Commercial Rent and Business Rent return exactly what they returned before.
- **End-to-end** (`backend/scripts/e2e/ruralRent.js`): owner enquiry → land record → ownership
  verification → owner agreement + fees → readiness assessment → marketing → tenant brief →
  search/shortlist → inspection → screening → negotiation → lease → deposits → handover → rent
  collection → closure.
- **Frontend:** both builds clean; click the flow; confirm the other three PM consoles are unchanged.

## 12. Out of scope (second plan)

Complaint register, owner/tenant feedback registers, communication log beyond the existing PM inbox,
closure and record-retention registers, dispute management, the Rural **Sale** SOP (a separate
document set), rural owner/tenant portals, and the public website surface for rural rental listings.

## 13. Risks

- **Live-stack blast radius.** The PM stack serves 38 residential tenancies and 53 rent properties.
  The category-scoping change is the one edit that could affect them; it ships first, additively,
  with both-direction isolation tests, exactly as the business change did.
- **Category vs listing_type.** Rural rent is `rural` + `rent`; rural sale is `rural` + `sale`. Every
  rural scope must carry both. Zero rural rows exist today, so the test must assert the rule against
  a fixture it creates rather than against existing data.
- **The tenant sourcing module is genuinely new.** It has no PM precedent to copy; the nearest
  analogue is `BuyerMandate` on the sales side, which is a different shape. This is the largest
  single piece of the plan and the most likely to need a second pass.
- **`property_type` is unconstrained** and already holds junk. Rural introduces a taxonomy without
  cleaning the existing column, so the Property dashboard groups rural rows only.
- **Agreement wording** (both V0.2 documents) is the client's to review with legal; no rural
  `agreement_templates` row exists yet.
- **Deployment is blocked** — Hostinger has lost access to the repository, so this work queues
  behind that fix.

---

## 14. Corrections — 2026-09-26, after the console-isolation work

This spec was written before `docs/superpowers/plans/2026-09-26-pm-console-isolation.md`
was executed. Six of its statements are now out of date, and one was wrong when written.
Everything below is re-measured, not assumed.

### 14.1 The blocking prerequisite (§3) is DONE

`pmCategory('rural')` now returns `'rural'`; the assertion that called rural "not a PM
console" is inverted. **Task 1 of this plan is already delivered** and drops out of the
Rural plan entirely. Also delivered, and none of it was in place when §3 was written:

| Groundwork | Effect on Rural Rent |
|---|---|
| `contact.controller` scopes through `pmCategory` | rural **leads** isolate on day one |
| `/clients` scopes via the contact's category | rural **clients** isolate on day one |
| `/projects` + `/registers/entries` accept `category` | `verticalsForCategory('rural')` already returns `['rural_rent','rural_sale','rural_tenancy']` — the tenant template's key is pre-registered |
| `rental_enquiries.category` (0155) + website inheritance | a website enquiry on a rural property already creates a **rural** lead and a **rural** enquiry |
| `consoleCategoryForPath('/rural/rent')` → `rural`, `consoleBaseForPath` → `/rural/rent` | the console's shared screens resolve rural without further work |
| 27 in-console links rebased off hard-coded `/residential/` | Rural's links will stay inside Rural |
| `scripts/e2e/consoleIsolation.js` (140 checks) covers rural | the Rural plan **extends** that suite; it does not start a new one |

### 14.2 Agreements now refuse rural outright

§6 said no rural `agreement_templates` row exists. Since `f6d8093`, `GET /api/rprm/meta?category=rural`
returns **HTTP 400** — *"No agreement builder is available for the 'rural' category."* That is the
intended behaviour (better than silently issuing a residential agreement), but it means the
console's two agreement links are **dead until the Rural plan registers the builders**. This is
now a required task, not a nice-to-have.

### 14.3 §10 was wrong: rural register data already exists

§10 claimed "zero rural properties and zero rural projects … the cleanest slate of the four
consoles". The first two hold — 0 properties, 0 projects, 0 enquiries — but **13 `rural_rent`
register definitions were already seeded** (2026-06-26) straight from the CRM workbook, and
**8 entries** are already recorded against Ownership Verification:

| id | register_key | id | register_key |
|---|---|---|---|
| 149 | `owner_master_register` | 156 | `maintenance_register` |
| 150 | `property_master_register` | 157 | `tenant_master_register` |
| 151 | `ownership_verification` ← 8 entries | 158 | `requirement_register` |
| 152 | `marketing_register` | 159 | `property_search_register` |
| 153 | `tenant_screening` | 160 | `shortlist_register` |
| 154 | `protected_tenant_register` | 161 | `protected_property_register` |
| 155 | `lease_register` | | |

`ownership_verification` already carries the workbook's columns
(`document / required / received / verified / …`).

**This changes §6 materially.** Five of the six modules the spec proposed building from scratch
are already modelled:

- **Ownership verification** → register 151 exists, with entries. No new table.
- **Rural tenant screening** → register 153 exists.
- **Protected Tenant / Protected Property** → registers 154 and 161 exist, alongside the
  `non_circumvention_records` reuse §6 proposed. The plan must pick **one** home for this and say
  which, rather than recording introductions in two places.
- **Tenant Sourcing** → registers 158, 159 and 160 are the requirement / search / shortlist
  sheets. The spec called this "the largest single piece … no PM precedent"; the *record-keeping*
  half already exists.

**Revised approach, and the one judgement call in it:** the registers give the records but not the
pipeline — the Compliance screen that surfaces them is property-first, which does not fit a tenant
brief that has no property yet. So the plan uses the existing registers as the store wherever they
fit and adds a thin Tenant Sourcing **view** over registers 158/159/160, instead of new tables.
Only two modules still need real schema:

- the **land record** (must be columns on `properties`, because the console filters and searches on
  district/upazila/mouza and Rural Sale needs them too), and
- the **readiness assessment** (needs `RentalAssessment`'s blocking-gate machinery, which is what
  gates marketing).

If a register-backed sourcing view proves too thin in use, the bespoke tables remain the fallback —
but building them first would duplicate thirteen registers the client's own workbook already defines.

### 14.4 Migration numbering

§10 said "next free number 0155". 0155 is taken (`rental-enquiry-category`). The Rural plan starts
at **0156**.

### 14.5 Unchanged

§4 (the console and its `PmScopeProvider` value), §5 (the two 11-stage pipelines and the 12-stage
`rural_rent` template still needing correction — verified still 12 stages, 0 projects), §7 (money),
§8 (the five dashboards), §9 (the ten property types), §11 (verification), §12 (out of scope) and
§13 (risks) all stand as written.
