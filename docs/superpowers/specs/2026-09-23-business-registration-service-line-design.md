# Business Registration — fold into the shared service-line core

**Date:** 2026-09-23
**Status:** approved in brainstorming, awaiting spec review
**Sources:** `Downloads/Business-.../Business/Registration/` — BUSINESS REGISTRATION WORKFLOW AND
CHECKLIST V0.1, SOP Client V0.1 (9 phases / 27 steps), SOP Third Party V0.1, Customer Service
Agreement V0.2, Provider Master Agreement V0.2, Project Work Order V0.1.

---

## 1. Why

Business Registration was built as its own module (Phases 0–5, Sept 2026). The backend is
reasonable — projects with a 9-stage pipeline, enquiries, assessment, parties, documents, work
orders, activities, invoices, a reports endpoint. The console on top of it is thin: 7 sidebar
items against Business Sale's 18, six screens totalling ~1,000 lines. Against the SOP it is
missing the whole of Phase 3 (quotation), the provider workbook, most of the 25 client
registers, and five of the six dashboards.

`SERVICE_MODULE_DUPLICATION.md` already sets the rule for this situation:

> Core workflow logic is written ONCE and shared. A service line is CONFIG, not a copy.

Fifteen service lines ride that shared core (`backend/config/serviceLines.js` + the shared
console shell and ~50 screens): quotations, work orders, provider onboarding, invoices,
payments, disbursements, client and provider portals, registers, communication log, complaints,
compliance, calendar, work queue and reports. `business_registration` is not registered there —
it is exactly the "temporary debt" that document warns about, and the thin console is the
symptom.

The registration tables hold 1–2 rows each (test data) against 88 `wt_projects` and 54
`wt_quotations`, so there is nothing real to migrate.

**Decision (approved): make Business Registration the 16th service line.** Registration-specific
behaviour stays bespoke as a line-specific module, the way the verification line has its own
verification register.

## 2. Decisions taken in brainstorming

| # | Decision | Chosen |
|---|---|---|
| 1 | Scope slice | Operating core first; pure log registers (complaints, feedback, variations, KPI detail) follow in a second plan |
| 2 | Quotation | Water-Tank-style catalogue builder: line items, PDF, send, accept/decline, feeds agreement + deposit |
| 3 | Providers | Reuse the shared `ServiceProvider` registry scoped to the registration line |
| 4 | Client surface | Website enquiry + tokenised document/progress link (no login) |
| 5 | Finance | Registration keeps its own invoices; do its finance properly now, company-wide accounting later |
| 6 | Approach | A — 16th service line (config, not a copy) |

## 3. The service manifest

New entry `business_registration` in `backend/config/serviceLines.js`, modelled on
`property_documentation_verification` (the closest fit: document-centric, `doc_manager`, a
line-specific register module) but with providers **enabled**, since the Third-Party SOP has
real providers.

```js
business_registration: {
  key: 'business_registration',
  label: 'Business Registration',
  short: 'BRG',
  accent: '#0d9488',                    // teal — the console's existing colour
  api_base: 'wt',
  route_base: 'business-registration',  // keeps every existing URL working
  env_tag: 'BRG',
  catalogue_vertical: 'registration_registration_business',  // existing BRC-001..020 items
  no_provider: false,
  delivery_model: 'third_party_provider',
  completion_signoff: true,
  doc_manager: true,                    // SOP Phase 4 — document collection
  registration_register: true,          // line-specific module (parties + activities)
  code_prefix: {
    client: 'BR-C', project: 'BR-P', request: 'BRR-', assessment: 'BRA-',
    quotation: 'BRQ-', work_order: 'BRW-', invoice: 'BRI-', provider: 'BR-SP-',
  },
  required_docs: {
    compliance: ['Trade Licence', 'Company Registration', 'TIN', 'BIN', 'Professional Registration'],
    insurance: ['Professional Indemnity Insurance', 'Public Liability Insurance'],
  },
  service_categories: [                 // Third-Party SOP, approved providers
    'Trade Licence Consultant', 'RJSC Consultant', 'Corporate Secretary',
    'Business Registration Agent', 'Legal Documentation Consultant', 'Tax Registration Consultant',
  ],
  related_type: {
    // The customer agreement already exists and is signed under this value — reuse it as-is
    // so envelopes and completion hooks keep working (salesAgreement.controller registry).
    customer: 'business_registration_agreement',            // SSPC-BR-CSA-01
    provider: 'business_registration_provider_agreement',   // new — Provider Master Agreement
  },
  ui: {
    project_types: ['Sole Proprietorship', 'Partnership', 'Private Limited Company',
      'Public Limited Company', 'Trade Licence Only', 'Renewal', 'Amendment', 'Mixed Scope'],
    service_catalogue: {                // workbook Sheet 4 — Service Selection
      'Trade Licence Documentation Support': ['New Trade Licence', 'Trade Licence Renewal',
        'Trade Licence Amendment', 'Municipality Documentation', 'City Corporation Documentation',
        'Local Authority Documentation', 'Business Address Documentation'],
      'Business Registration Coordination': ['Sole Proprietorship Registration',
        'Partnership Registration', 'Private Limited Company Registration',
        'Public Limited Company Registration', 'RJSC Registration', 'Business Name Registration',
        'Memorandum & Articles Coordination', 'Shareholder Documentation Coordination',
        'Director Documentation Coordination', 'Company Secretarial Coordination'],
    },
    equipment: {                        // the core's site/equipment block, re-labelled
      section_label: 'Business Details',
      type_label: 'Business Type',
      type_options: ['Sole Proprietorship', 'Partnership', 'Private Limited', 'Public Limited', 'Other'],
    },
  },
},
```

Everything per-service lives here: labels, prefixes, catalogue vertical, required documents,
agreement templates, provider categories, service picker. No core screen is forked for
Registration.

## 4. Console

From 7 nav items to the working set the other lines run:

**Home** — Dashboard · Work Queue · Calendar
**Pipeline** — Enquiries · Clients · Registration Projects
**Commercial** — Quotations · Agreements · Price Schedules
**Delivery** — Documents · Providers · Work Orders · Registration Activities
**Money** — Invoices · Payments & Provider Payouts
**Assurance** — Registers (risk, progress, variation) · Communication Log · Compliance · Reports

## 5. Project workspace and the SOP pipeline

The project file runs the job, with the 9 client-SOP phases as stage gates:

1 Lead Management · 2 Consultation · 3 Commercial Approval · 4 Document Collection ·
5 Provider Assignment · 6 Service Delivery · 7 Quality Assurance · 8 Client Reporting ·
9 Project Completion.

Tabs: Overview · Workflow · Consultation · Business Information · Parties · Documents ·
Quotation · Agreement · Work Orders · Activities · Finance · Communications · Risks · Closure.

Gates carry the SOP checklist: Phase 3 cannot close without a signed agreement and a received
deposit; Phase 4 cannot close while a required document is unverified; Phase 9 cannot close
without final invoice, final payment and the closure record.

### Where the workbook's 25 client registers live

| Workbook register | Home |
|---|---|
| 1 Client Master, 2 Enquiry | Clients / Enquiries (shared core) |
| 3 Business Information, 4 Service Selection | Project tabs |
| 5 Shareholder, 6 Director | Parties — registration-specific |
| 7 Document | Document manager (Phase 4) |
| 8 Name Clearance, 9 Trade Licence, 10 RJSC, 11 TIN/BIN/VAT, 12 Authority Liaison | Activities — registration-specific, one type each |
| 13 Agreement, 14 Quotation, 15 Invoice, 16 Payment | Shared commercial screens |
| 17 Task, 18 Communication, 19 Progress | Work queue, comm log, project timeline (shared) |
| 20 Variation, 21 Risk, 22 Complaint, 23 Feedback, 24 Closure, 25 KPI | Registers, complaints, closure tab, reports (shared; largely free) |

The provider workbook's 20 registers map the same way onto the shared provider registry:
approved providers, MSPA, insurance, qualification, service categories, work orders,
deliverables, invoices, payments, non-circumvention, complaints, defects, performance, KPI.

## 6. Commercial approval (Phase 3, Steps 7–9)

Quotation → Agreement → Deposit.

- **Quotation** — services picked from the registration catalogue. Each line separates the
  **government fee** (RJSC, licence — pass-through) from the **Seventh Sky professional fee**.
  Validity date, PDF, emailed to the client, accept or decline recorded.
- **Agreement** — the existing Customer Service Agreement (SSPC-BR-CSA-01) is raised from the
  accepted quotation, so its schedule matches what the client accepted.
- **Deposit** — on signature the deposit invoice is drafted automatically, the same hook the
  signed sale agreement uses to draft fee invoices.

A declined quotation can be revised and re-issued; the register keeps both.

## 7. Documents and the client link (Phase 4)

Required-document set from the SOP: NID, passport, passport photos, utility bill, rental
agreement or ownership documents, shareholder documents, director documents. Shareholder and
director documents expand per party, so adding a third shareholder adds their rows.

The client gets a tokenised link (no login): what is outstanding, upload, progress. Staff verify
each document with a who/when stamp; unverified required documents block the Phase 4 gate.

## 8. Providers, work orders, activities (Phases 5–6)

- **Providers** — the shared `ServiceProvider` registry scoped to the registration line, so
  onboarding, MSPA, insurance and qualification verification, non-circumvention and ratings are
  inherited rather than rebuilt.
- **Work orders** — the existing Project Work Order (SSPC-BR-PWO-01) issued to a real provider
  record instead of a typed-in name, visible in the provider portal.
- **Activities** — the registration engine: name clearance, trade licence, RJSC, TIN, BIN, VAT,
  authority liaison. Each carries authority, reference number, submitted and completed dates,
  outcome and rejection reason. Rejections and government delays feed the Risk dashboard.

## 9. Finance

Registration keeps its own invoice table (deposit, progress, final, provider) with payments.
Added:

- **Provider payouts** against work order milestones.
- **Per-project margin**: professional fees earned − provider cost. **Government fees are
  excluded from both revenue and margin** — they are pass-through. This one rule makes the
  Profitability dashboard honest and is unit-tested.

Company-wide accounting integration is explicitly out of scope here.

## 10. Dashboards (SOP §"Recommended Business Registration Dashboards")

1. **Registration** — new, pending, completed, rejected applications
2. **Revenue** — trade licence, company registration, corporate documentation
3. **Government Liaison** — municipality, RJSC, tax registration cases
4. **Provider** — active providers, jobs assigned, jobs completed, ratings
5. **Risk** — delayed applications, missing documents, name-clearance rejections, government queries
6. **Profitability** — revenue per project, provider cost, gross margin

## 11. Migration and retirement

Additive migrations only; no applied migration is edited.

- Shared-spine tables gain `service_line = 'business_registration'` rows; the bespoke
  project/enquiry/invoice tables are re-pointed, not dropped.
- Registration-specific tables (parties, activities, assessment) are kept and keyed to the
  shared project.
- The six bespoke screens are retired; their routes redirect to the new console screens so no
  bookmark 404s.
- The 1–2 test rows per table are recreated in the new shape; no data migration script is
  warranted.

## 12. Verification

- **Unit:** manifest shape (prefixes, catalogue vertical, required docs, related types); the
  margin rule including government-fee exclusion; quotation totals.
- **End-to-end** (`backend/scripts/e2e/businessRegistration.js`): website enquiry → project →
  consultation → quotation issued → accepted → agreement signed → deposit invoice → documents
  requested, uploaded, verified → work order to a real provider → activities with a rejection
  and a re-submission → final invoice and payment → closure. Fixtures unpublished/cleaned at the
  end, as the DB is shared with production.
- **Isolation:** registration records never appear in the other fifteen service lines, and their
  records never appear in Registration.
- **Frontend:** `npm run build` clean; click the flow through the console.

## 13. Out of scope (second plan)

Complaint, feedback and variation registers; KPI detail beyond the six dashboards; provider
performance ranking; company-wide accounting integration; a logged-in client portal.

## 14. Risks and open questions

- **Vocabulary.** The shared core carries site-visit and equipment language. The manifest
  re-labels it, but some screens may need a "no site visit" flag. To be found during
  implementation and flagged, not forked.
- **Shared-core blast radius.** Every core change affects fifteen live lines. Changes must be
  additive and config-driven; anything that cannot be will be raised before it is written.
- **Agreement wording.** The Customer Service Agreement and Provider Master Agreement are built
  from the supplied V0.2 documents; any legal review of that wording sits with the client.
- **Deployment is currently blocked** — Hostinger has lost access to the repository, so this
  work will queue behind that fix.
