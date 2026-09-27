# Rural Sale — the seller and buyer consoles

**Date:** 2026-09-27
**Status:** scoped, ready to execute
**Parent:** `docs/superpowers/specs/2026-09-26-rural-rent-completion-design.md` §1 (plan B of three)
**Sources:** `Downloads/Rural-.../Rural/Sale/` — SOP Rural Property Sale V0.1 (SSPC-RLPSS-SOP-01),
SOP Rural Property Purchase V0.1, RURAL PROPERTY SALES - WORKFLOW - CHECKLIST V0.1 (seller Sheets
1-21, buyer Sheets 1-22), Seventh_Sky_Rural_Property_CRM_Detailed V0.1, and the two V0.2 agreements.

---

## 1. What the SOPs describe

Two systems, not one. The checklist calls them **System 1 — Seller** and **System 2 — Buyer**, each
with its own workbook, its own eight-phase workflow and its own agreement:

| | Seller (System 1) | Buyer (System 2) |
|---|---|---|
| SOP | SSPC-RLPSS-SOP-01, 6 phases / 13 steps | Rural Property Purchase V0.1, 6 phases / 14 steps |
| Workbook | 21 sheets | 22 sheets |
| Workflow | 8 phases, 10 CRM steps | 8 phases, 7 CRM steps |
| Agreement | Rural Property **Sale** Service Agreement V0.2 | Rural Property **Purchase** Service Agreement V0.2 |
| Signs with | Seller / Owner | Buyer |

Property scope is the same eleven rural types the Rent console already knows, plus the buyer SOP's
"Investment Rural Properties" and "Homestead Land".

## 2. What already exists (measured, 2026-09-27)

- **`rural` is already a sales category.** `utils/salesCategory.js` SALES_CATEGORIES already contains
  it, from the isolation plan. The sales engine will scope to rural without further backend work.
- **`/rural/sell` already exists** as a bare route rendering `PropertySellDashboard category="rural"`
  — with **no console around it**. It inherits whatever sidebar the user came from. This is the gap.
- **Workflow template #14 `rural_sale` is corrupted**, in exactly the way `rural_rent` was before
  the Rent build. Its 18 "stages" are three different lists concatenated:
  1-9 the seller workflow steps (Lead Generation … Settlement), 10-14 the five rows of the
  **Ownership Checklist** (Title Deed, Khatiyan, Dag, Mutation, Tax Receipt) promoted from documents
  to stages, and 15-18 four rows of the **buyer** workflow (Lead, Search, Inspection, Due Diligence).
  **0 projects use it**, so it can be corrected outright.
- **Only 3 of the workbook's registers are defined**: #162 `seller_master_register`,
  #163 `property_register`, #164 `offer_register` — all on `rural_sale`, all with 0 entries.
- **No `rural_purchase` vertical exists** at all: no workflow template, no registers.
- **The agreement engine takes a new category as a registry entry**, not a new renderer:
  `controllers/salesAgreement.controller.js` REGISTRY already holds residential, commercial,
  business, business_rent and business_registration, each `{svc, build, related_type, signer, party,
  code, sched, header}`. Both rural V0.2 documents have the same 25-clause + Schedule A/B/C/D shape
  as every other one, confirmed by reading them.
- **Reusable as-is from the Rent build**: the rural land record columns on `properties` (0156), the
  eleven rural property types, `RuralLandPanel`, the dispute lifecycle on `property_risks` (0159),
  and `NonCircumventionRecord` for protected introductions.

## 3. Decisions

| # | Decision | Rationale |
|---|---|---|
| 1 | Rural Sale is a **console pair** — seller at `/rural/sell`, buyer at `/rural/buyer-service` — built the way Business Sale was: Commercial's two navs rebased, rendered for `category="rural"` | Business Sale proved the pattern. The sales screens are already category-scoped, so a copy would only duplicate bugs. |
| 2 | Template #14 is **split into two**: `rural_sale` (seller, 10 stages) and a new `rural_purchase` (buyer, 7 stages) | Same correction the Rent build made. Documents are documents, not stages; a seller pipeline is not a buyer pipeline. 0 projects, so no migration of live data. |
| 3 | The workbook sheets that the system **already models as tables** do not become registers | Inspections, enquiries, invoices, payments, transactions, risks and protected introductions all exist. Duplicating them as registers would split the truth in two. §5 lists which is which. |
| 4 | Both agreements are **REGISTRY entries + generated clause packs**, not new renderers | Confirmed by reading both V0.2 files: 25 clauses, Schedules A-D, identical structure to CPSS/CPPS. |
| 5 | Sale-side dispute categories **extend** the lifecycle rather than forking it | The sale workbook's Risk Register adds Government Acquisition, Encroachment, Financing and Registration Delay to the eight the Rent side already has. One stage machine, a wider category list. |
| 6 | The non-circumvention window for rural SALE is **24 months**, matching rural rent | `protectionWindow.js` already keys months by category, and 'rural' is one category. The sale SOP's "Protected Buyer Register" gives no different figure, so the rural figure applies. Recorded here so it is a decision, not an accident. |

## 4. The two corrected pipelines

**`rural_sale` — seller, 10 stages** (workbook Sheet 1, grouped under the SOP's 8 phases):

| # | Stage | Phase | Escalates when |
|---|---|---|---|
| 1 | Seller Enquiry | Lead Generation | not contacted in 24h |
| 2 | Ownership Check | Qualification | seller authority unconfirmed |
| 3 | Seller Registration | Onboarding | NID or contact missing |
| 4 | Document Verification | Verification | any of deed/khatiyan/dag/mutation/tax unverified |
| 5 | Seller Agreement | Commercial Approval | unsigned after 7 days |
| 6 | Marketing Preparation | Property Preparation | media not collected |
| 7 | Property Marketing | Marketing | no listing live |
| 8 | Buyer Inspections | Buyer Management | no inspection in 30 days |
| 9 | Offer Management | Negotiation | offer unanswered 48h |
| 10 | Transfer & Registration | Completion | registration stalled |

**`rural_purchase` — buyer, 7 stages** (workbook Sheet 7):
Buyer Enquiry · Buyer Registration · Property Search · Site Visit · Offer & Negotiation ·
Legal Review (Due Diligence) · Registration & Handover.

Stage 4 of the seller pipeline is where the five ownership documents belong — as the
`ownership_verification` register, which is how the Rent console already models them.

## 5. Registers: what becomes one, and what does not

**New definitions on `rural_sale`** (7): `ownership_verification`, `marketing_register`,
`negotiation_register`, `legal_coordination_register`, `complaint_register`, `communication_log`,
`seller_feedback_register`, `closure_register`.

**New definitions on `rural_purchase`** (8): `buyer_master_register`, `requirement_register`,
`budget_register`, `search_criteria_register`, `property_search_register`, `shortlist_register`,
`due_diligence_register`, `financing_register`, `buyer_feedback_register`.

**Deliberately NOT registers** — already modelled, and named here so the next reader does not
"find the gap" and add them twice:

| Workbook sheet | Where it already lives |
|---|---|
| Seller/Buyer Agreement Register | `signing_envelopes` + the agreement REGISTRY |
| Inspection Register | `inspections` |
| Buyer Enquiry Register | the sales enquiries screen |
| Protected Buyer / Protected Property Register | `non_circumvention_records` (24 months, decision 6) |
| Transaction Register | `property_deals` |
| Invoice / Payment / Commission Register | the invoicing and settlement engine |
| Risk Register | `property_risks` + the dispute lifecycle (0159) |
| KPI Dashboard | the five dashboards in §7 |

## 6. Agreements

| | Sale | Purchase |
|---|---|---|
| Doc no | SSPC-RLPSS-01 | SSPC-RLPPS-01 |
| related_type | `rural_sale_agreement` | `rural_purchase_agreement` |
| Signs with | Seller | Buyer |
| Catalogue vertical | `sale_sale_rural` | `sale_purchase_rural` |
| Clause pack | `services/rlpssClauses.js` | `services/rlppsClauses.js` |

Both go into `utils/saleAgreementTypes.js` — the ONE list that signature handling, fee invoicing,
agency fees and invoice scoping all read. A category added to the REGISTRY but missed there is the
exact bug `testSaleAgreementTypes.js` exists to catch, and `catOf()` in the controller must learn
'rural' or it will silently serve the residential agreement.

## 7. Dashboards

The checklist's "RECOMMENDED DASHBOARDS", five of them: **Seller** (active listings, rural types,
inspections, offers, conversion rate, commission revenue), **Buyer** (active buyers, searches,
shortlisted, transactions, success fees), **Rural Land** (by type), **Risk** (ownership, succession,
boundary, financing — over the dispute lifecycle) and **Executive** (listings, buyers,
transactions, commission revenue, average sale price). Reuses `ruralRentDashboardMath` where the
maths is the same (`propertyTypeCounts`, `occupancyRate` does not apply) and adds sale-side figures.

## 8. Verification

- **Unit:** the two stage lists (count, order, no document promoted to a stage, no buyer stage in
  the seller pipeline); the register seed idempotent and not touching the 3 that exist; the
  agreement type list complete; sale-side dispute categories a superset of the rent ones.
- **E2E:** a new `scripts/e2e/ruralSale.js` — create a rural SALE property, run it through the
  seller pipeline, record ownership documents and a marketing entry, raise an offer and a
  negotiation round, protect a buyer and assert 24 months, render both agreements and assert the
  rural wording, hit all five dashboards, and delete every fixture.
- **Isolation:** `consoleIsolation` stays green; rural sale rows must not appear in Rural **Rent**
  (the Rent e2e already asserts this) and rural agreements must not appear in commercial or
  business lists.
- **Baseline:** residential 53 managed / 103 open actions unchanged after every task.

## 9. Out of scope

Plan C: rural owner/tenant/seller/buyer **portal** surfaces and the public website surface for
rural listings. Also unchanged: the 19 fixture register entries and 118 fixture properties in the
production DB, which await the user's decision.
