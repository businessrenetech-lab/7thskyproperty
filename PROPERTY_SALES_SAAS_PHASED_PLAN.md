# Seventh Sky: Property Purchase & Sales SaaS Improvement Plan

**Status:** Draft for owner review; no implementation authorised or performed.
**Date:** 10 September 2026.
**Basis:** `Downloads/readit.txt`, review of `Downloads/claude.md`, six original Office documents, current application source, and official SaaS product sources.

## 1. Recommendation

Build on the existing Residential console and make it the daily workspace for buyer and seller services. The first priority is to connect the two existing sales-money workflows and simplify their interfaces while preserving financial controls. Then complete the documented engagement lifecycle and connect contracts, contacts, communications, services, and marketing.

The product promise should be: **one property history, one connected deal file, accurate money, and an obvious next action.**

Use a Bangladesh brokerage-service model as the working basis, consistent with the supplied agreements and the owner decisions recorded in Claude's plan. Seventh Sky earns fees and commissions; property purchase prices and client-held funds are not company revenue. Statutory obligations still require local confirmation; an internal SOP cannot establish that client-money regulation does not apply.

### Evidence labels

- **Verified in source:** observed in the original documents or code. Code existence does not establish successful runtime behaviour.
- **Recommended:** proposed product or engineering change.
- **To confirm:** a business/legal choice or runtime behaviour that remains unresolved.

This was a document and static-code planning review. No browser walkthrough, authenticated endpoint testing, database reconciliation, payment-provider transaction, migration, build, or production validation was performed. The roadmap includes those verification gates. There is no claim that the current UI or proposed product is bug-free.

## 2. Review of Claude's plan

Keep its central workspace, separate money statuses, SOP-based processes, improved navigation, shared signing engine, and phased delivery direction. Correct the following before implementation:

| Claude plan claim | Finding from current source | Change to this plan |
|---|---|---|
| A Kanban already exists in `DealsBoard.jsx` | Lines 34–56 render a table; lines 59–94 open a detail drawer. No board or drag/drop is implemented in that file. | Build a real board, retaining the list view. |
| There is no guided sales settlement workspace or sales bulk screen | `SalesPropertyFile.jsx` has extensive settlement facilities; `DealSettlementWorkspace.jsx` and `SalesBulkSettlement.jsx` also exist. | Consolidate and repair existing paths rather than add a third. |
| Sales settlement is only a flat deal field | `/sales/*` has transactions, statement lines, payments, reversals, bank matching, disbursements, approval history, and beneficiary accounting. | Preserve the stronger controls and connect the lighter `/deals/*` flow to them. |
| No central contact directory | `/contacts`, `Contacts.jsx`, `ContactDetail.jsx`, and contact CRUD/documents/communications APIs exist. | Improve the relationship view, deduplication, and residential navigation. |
| No property workspace or next action | `SalesPropertyFile.jsx` already has sections, blocker explanations and next-action handling. | Improve its discoverability, page structure, and transaction coverage. |
| All documents read in full, but agreement clauses still pending | The plan's own sections 1 and 12 conflict. Original clauses are now extracted and reviewed. | Use clause-level rules below. |
| Introduction protection period is unknown | Both V0.2 agreements, clause 22, specify twelve months after introduction, alongside protection during the engagement. | Track introductions and signed-term versions; confirm legal interpretation of the combined period. |
| Linked purchase/resale should produce company acquisition/resale P&L | The documented business acts as a coordinator, not inventory owner. | Separate client investment performance from Seventh Sky brokerage profitability. |
| Role permissions and audit belong in the last phase | Money changes and private documents need them from the first release. | Establish these in Phase 0 and test in every phase. |

The current source may be newer than Claude's original inspection. Treat these as corrections to the baseline, not an assumption about when each feature was created.

## 3. What the six business documents require

### Source register

All six files were found under `C:\Users\ADMIN\Downloads\Sale\Sale`.

| Source | Relevant requirements |
|---|---|
| `SOP – Residential Property - Purchase - V0.1.docx` | Eight stages, buyer approvals, finance readiness, search, inspections, document/risk coordination, offers, settlement/registration, closure. |
| `SOP – Residential Property - Sale - V0.1.docx` | Ten stages, Phase-1 quotation/agreement, seller indemnity, minimum estimated value, Phase-2 approval, preparation, marketing, offers, settlement and commission collection/disbursement. |
| `Seventh_Sky_Residential_Property_Purchase_Workflow_Detailed_V0.1.xlsx` | 26 worksheets, including configuration/dashboard sheets and operational registers. Schema, status lists and KPI requirements reviewed; sample-person rows are not reproduced in this plan. |
| `Residential_Sale_Checklist_Enterprise_Workflow - V0.1.xlsx` | Two worksheets: 14-stage operational checklist and ten-stage CRM action mapping, with responsibility and client updates. |
| `Residential Property Purchase Service Agreement - V0.2.docx` | 25 clauses, four schedules, RPPS-001–013 catalogue, service fees and optional success fee. |
| `Residential Property Sale Service Agreement - V0.2.docx` | 25 clauses, four schedules, RPSS-001–013 catalogue, service fees and sales commission. |

**Document governance gap:** the purchase workbook filename says V0.1, its dashboard says V2.0, and its basis refers to the V0.1 agreement while supplied agreements are V0.2. SOP effective/approval dates are blank. Phase 0 must establish the approved source versions and a precedence record. Do not automatically treat every spreadsheet sample as contractual policy.

### Clause-to-feature mapping

| Source clause/schedule | Required system behaviour |
|---|---|
| Both agreements, clauses 2–4; Schedules A/B | Selected-service scope, exclusive dates, buyer requirements or seller/property particulars; retain approved quotation/work-order terms and their precedence. |
| Clauses 7–9; Schedule C | Standard versus agreed pricing, item quantities, fixed/from/included/percentage price types, discounts, applicable VAT, approved third-party costs, deposit/progress/final schedules. |
| Clause 9 | Service final payment is due on service completion or settlement, whichever occurs first unless varied. Success fee/commission depends on successful completion and settlement. Do not use one trigger for every fee. |
| Clauses 11–12 | Revised target dates, delay reasons, approved variations and fee changes. Preserve the original and revised schedule and notify affected people. |
| Clauses 13, 16–20; SOP risk section | Professional advice/referrals, disclaimers, buyer/seller acknowledgements, issues and escalation evidence. Document review is not a guarantee of title. |
| Clause 14 | Service completion can occur without a successful property purchase/sale. Support scoped service completion and closed-no-purchase outcomes. |
| Clause 15 | Complaint ownership, acknowledgement, investigation, resolution evidence and follow-up. |
| Clause 21 | Suspension, 30-day written termination notice, immediate termination reasons, completed services and incurred approved costs. Do not default every cancellation to a full refund. |
| Clause 22 | Protected introduction history with property, introduced party, client, evidence, introduction date, expiry calculation, consent to direct contact and breach review. |
| Clauses 23–25 | Written/electronically accepted amendments; immutable executed versions; Bangladesh governing law; authorised signers and witness slots. Service-agreement signing is separate from deed registration. |
| Schedule D | Evidence-linked buyer/property/due-diligence/marketing/transaction checklists. Use applicability rules, not compulsory irrelevant tasks. |

Both catalogues contain **13 priced service entries**. Purchase starts with consultation BDT 2,000 and requirement assessment BDT 3,000; RPPS-013 is an optional percentage/as-agreed success fee. Sale starts with consultation BDT 2,000, assessment BDT 3,000 and appraisal BDT 5,000; RPSS-009 negotiation is included and RPSS-013 is percentage commission. Import the complete schedules during Contracts implementation; preserve “From” as a price type, not a promised final charge.

### Convert spreadsheet registers into connected views

The purchase workbook's Buyer Master, Requirements, Consultation, Agreement, Sourcing, Shortlist, Inspection Schedule/Checklist, Document Verification, Professional Advice, Risk, Protected Introduction, Negotiation, Offer Approval, Transaction, Settlement, Fees, Communications, Stage Gates, Project, Post Purchase, and Closure registers should not become separate data-entry islands.

Recommended grouping:

1. **Engagement:** buyer/seller, requirements, consultation, Phase 1/2, service agreement.
2. **Property and opportunities:** sourcing, shortlist, comparison, inspections.
3. **Due diligence:** documents, risks, external advice, acknowledgements.
4. **Transaction:** offers, approvals, contract, registration and handover milestones.
5. **Money:** obligations, receipts, fees, commissions, refunds and payouts.
6. **Shared activity:** tasks, communications, introductions, services and closure.

Each register remains exportable, but staff enter information once in its natural workflow. Sales checklist Market Analysis maps into assessment/appraisal; Marketing Preparation and Listing Activation are subtasks of marketing; Transfer Coordination is a milestone in settlement. The 8/10/14-stage taxonomies are different levels of detail, not three pipelines to maintain manually.

## 4. Current application findings and impact

### The two money paths

```text
Sell Dashboard -> SalesPropertyFile -> /sales/*
  SaleProfile -> offers -> SaleTransaction (links PropertyDeal)
    -> SaleSettlement -> lines + SalePayment + SaleDisbursement
      -> bank matching + journals + beneficiary balances + approval/audit trail

Buy table -> Deals drawer -> /deals/*
  PropertyDeal -> fee/commission expectations
    -> invoice/payment via internal HTTP request
    -> receipts identified by text reference matching
    -> DealDisbursement status records
    -> separate single/bulk "settled" flag
```

| Priority | Verified observation | Business impact / recommendation |
|---|---|---|
| Essential | `dealSettlement.service.js:12–20` sums payments with `LIKE '%DEAL:code%'`. | Fragile links and potential code-prefix collisions. Use explicit deal, obligation and payment allocation IDs. |
| Essential | `dealSettlement.controller.js:44–77` creates invoices before an internal HTTP payment call; forwards Authorization but not the cookie. | Partial-failure/orphan-invoice and cookie-auth compatibility risks. Replace self-HTTP with shared transactional service calls; test actual authentication. |
| Essential | `dealSettlement.controller.js:101–114` marks a disbursement paid and logs it; it does not post a bank/journal payment in this handler. | Paid status is not evidence of money movement. Connect to canonical payment execution/evidence and posting. |
| Essential | Same handler checks held funds then updates without a surrounding locked transaction. | Concurrent requests may overspend the same balance. Lock source funds and allocation records; test concurrent payouts. |
| Essential | `dealSettlement.controller.js:117–150` permits single/bulk settlement based on receipt status, without the stronger `/sales` completion checks. | Two meanings of settled; finance and operations can disagree. Replace with authoritative readiness checks for the relevant transaction type. |
| Essential | `dealSettlement.service.js:38–51` treats received fees minus payouts as held money and suggests disbursing the remainder. | Brokerage income can be mistaken for client money that must all be paid away. Separate revenue, liabilities, and actual payables. |
| Essential | `SalesPropertyFile.jsx:1032–1044` quick reconcile sends no bank statement line; `sales.controller.js:1295` requires one. | Verified request/validation mismatch. Replace with actual candidate bank matching; never clear a reconciliation flag without evidence. |
| Core | `SalesPropertyFile.jsx:166–203` includes detailed approval progression and many sections; settlement has additional subviews. | Existing power is difficult to navigate. Group the same operations into a guided workspace and show technical ledger details on demand. |
| Core | `DealsBoard.jsx:22,54–56` fetches 50 records and filters locally. | Search can miss older deals; no real Kanban/calendar. Add server-side search/pagination and common saved views. |
| Core | `config/consoles.js:378–415` exposes Sell Dashboard, New Listing, Deals, Buyer Enquiries, Compliance, Workflows, Bulk Settlements. | Contracts, contacts and routine finance tools lack contextual residential access. Add role-aware groups. |
| Core | `communications.controller.js:24–31,39–45` is rental/property/contact-oriented with capped in-memory grouping. | Sales conversations and multiple buyers on one property need explicit thread participants and deal context. |
| Essential for messaging | `communications.controller.js:198–208,224–250` logs SMS; email failure can still result in a saved row, and draft send failures are swallowed. | Logging is not delivery. Persist attempted/sent/delivered/failed status and expose retry. |
| Essential for SaaS | `communications.controller.js:127–134` loads property/contact context by primary key without branch scope. | Authorisation must protect related context, not only message rows; test cross-branch access before reuse. |
| Core | Contact API already supplies documents, client link, communications, invoices and payments (`contact.controller.js:65–110`). | Extend current contact workspace with complete deal/property relationships rather than rebuild it. |
| Core | `marketingActivity.controller.js:6–15` provides activity, budget and manually stored enquiry/inspection counters. | Useful register, not proof of an integrated campaign system. Connect attribution to real enquiries and transactions. |
| Release foundation | `backend/package.json:14` has a failing placeholder test command. | A successful build cannot prove money correctness. Establish a runnable regression suite and isolated end-to-end fixtures. |

The `/sales` path already has valuable controls: transaction locking, minor-unit money calculations, reversal handling, allocation validation, journal links, independent review/approval, explicit exceptional override reasons, and immutable completion. See `salesSettlement.service.js:31–101,130–153,220–245` and `sales.controller.js:1671–1744`. Preserve these instead of copying PM rental accounting wholesale.

Permissions also need alignment: `/deals` routes exclude the accounts role while `/sales` has explicit accounts actions. A role-aware menu must agree with API permissions, including finance read-only contact access where needed.

## 5. Target business model and end-to-end workflows

### Three records with different purposes

- **Property:** durable identity, location, ownership history, documents, services, listings and past transactions.
- **Engagement/deal:** the buyer or seller's service mandate, requirements, agreed fees, tasks and lifecycle. A buyer mandate may exist before any property is selected and may shortlist several properties.
- **Transaction:** a particular accepted buyer–seller offer on a property, with frozen parties/terms, funds and settlement evidence. Failed transactions remain in history while the engagement can continue.

Evolve existing `PropertyDeal` and `SaleTransaction` relationships. Link buyer/seller mandates to a shared transaction when appropriate, with separate fees and permissions. Never count the property value twice when both sides are represented. Check conflicts of interest and required disclosure locally.

### Purchase service: eight SOP stages

| Stage | Primary owner | Completion evidence / next action |
|---|---|---|
| 1. Enquiry and consultation | Buyer relationship manager | Existing contact reused; budget/location/finance/timeframe recorded; Phase-1 quotation/agreement issued; consultation recorded. |
| 2. Requirement assessment and planning | Consultant; manager approves | Confirmed criteria, feasible search strategy, risk notes, buyer proceed approval; signed engagement before active Phase 2. |
| 3. Search and shortlist | Consultant / sourcing coordinator | Candidate properties, source, availability, criteria fit, comparison, buyer feedback; record introductions automatically from actual sharing/meeting evidence. |
| 4. Inspections | Inspection officer / consultant | Appointment, attendance, photos/observations and buyer feedback; rescheduling and no-show follow-up. |
| 5. Documents and risk | Documentation officer | Applicable document checklist, concerns, advice referrals, acknowledgement and decision evidence; escalate high-risk issues. |
| 6. Negotiation and offer | Consultant; buyer decides | Versioned offers/counters, terms, expiry, finance conditions, written approval before submission. |
| 7. Agreement and settlement | Documentation + accounts + manager | Executed transaction documents, payment evidence, registration tracking, settlement readiness and handover readiness. |
| 8. Closure and post-purchase | Support + accounts | Final reports, financial closure or clearly tracked debt, feedback, document archive and approved service referrals. |

### Sale service: ten SOP stages

| Stage | Primary owner | Completion evidence / next action |
|---|---|---|
| 1. Enquiry and consultation | Property manager / consultant | Seller/property/source captured; consultation; Phase-1 quotation/agreement; inspection scheduled. |
| 2. Inspection and assessment | Inspection officer | Condition report, photos, preparation recommendations; comparative market analysis as applicable. |
| 3. Documents and risk | Documentation officer | Deed, mutation, taxes, utilities, succession/approvals as applicable; seller indemnity; minimum estimated value discussion; risk decision. |
| 4. Agreement and Phase-2 approval | Manager; seller signs | Selected scope, commission, exclusivity, dates, approved phase and payment schedule; staff assigned. |
| 5. Preparation | Property care coordinator | Approved quote, supplier assignment, work evidence and completion; explicit not-required decision for properties ready to list. |
| 6. Marketing and listing | Marketing officer | Approved copy/media/pricing, publish locations and campaign references; operational listing activation. |
| 7. Buyer enquiries and inspections | Sales consultant | Routed enquiries, screening, viewing calendar, feedback and seller updates. |
| 8. Offers and negotiation | Consultant; seller decides | Offer comparison, written approval, price-limit exception if applicable, versioned counters. |
| 9. Agreement and settlement | Documentation + accounts + manager | Contract/registration/payment/possession milestones; fee collection and actual payout evidence. |
| 10. Closure and post-sale | Support + accounts | Handover pack, closing statement, feedback, archive, follow-up and resolved/assigned exceptions. |

**Deadlines:** reuse workbook targets: first response within one business day; Phase-1 consultation within three business days; shortlist within 7–14 days where feasible. Other deadlines come from signed terms, scheduled events or configurable business SLAs. Use Bangladesh working days/holiday configuration. Record extensions and their effect on dependent tasks.

### Kanban without recreating the spreadsheet burden

Provide Buyer Service, Seller Service and Transactions board presets. Default to six broad columns: **New → Engaged → Active Work → Offer/Negotiation → Closing → Closed**. Show the exact SOP stage within each card and allow an expanded SOP view.

Cards show property/buyer, service type, price and expected agency fee as separate values, assignee, next action, due date, blockers and last contact. Provide list and calendar views using the same filters: staff, source, stage, location, budget, overdue, risk, closing date and branch.

Drag/drop calls a server transition command. If blocked, keep the card in its original stage and show a concise checklist with Resolve links. Keyboard users get a Move to stage action. Commercial drag/drop never marks money paid or legal transfer complete.

### Exceptions

| Event | Recommended behaviour |
|---|---|
| No suitable property / offer rejected | Keep buyer mandate and preferences; close only that candidate or offer. |
| Cancellation before money | Reasoned cancellation, release listing reservation, retain introductions and correspondence. |
| Cancellation after receipts | Withdrawal statement, approved incurred costs, refund due, payment evidence and reconciliation; relisting has an explicit readiness decision. |
| Partial payment / overpayment | Allocate to obligations; show remaining due or unapplied credit; no silent write-off. |
| Delayed settlement / finance failure | Hold reason, revised deadline, dependent-task changes, documented client notice. |
| Failed payout | Keep obligation outstanding; preserve attempt/reference; retry only after status check to prevent duplicate transfers. |
| Reopened deal | Add a new workflow episode or revision; retain original closure and signed documents. Financial correction uses reversals/adjustments, not edited history. |
| Services completed without sale | Close scoped services and invoice earned fees under the agreement; do not invent success commission. |

## 6. Make settlement and disbursement simple

### Two visible money modes

1. **Coordination-only:** buyer pays seller/lawyer/bank directly. Record external payment evidence and transaction progress; do not post those amounts as Seventh Sky cash or revenue. Seventh Sky invoices/collects its own fees separately.
2. **Client-money handling:** where authorised and locally confirmed, record funds actually received into the designated account, beneficiary liabilities, approved allocations, payouts and reconciliation.

Support a hybrid transaction where only the deposit is held by Seventh Sky. Do not require the whole property price to pass through its bank before recording legal completion. Existing client-money records retain their balances and controls during any migration.

### Five steps in one full-page workspace

```text
1 Prepare                 2 Review & approve
  Agreed terms              Same statement, role-specific action
  Expected vs actual        Exceptions and evidence visible
  Payees and due dates      Approval tied to statement version
          |
3 Record money -> 4 Match bank evidence -> 5 Complete & issue statements
  Incoming/outgoing         Suggested exact matches           Readiness check
  One payment record        Exceptions stay outstanding       Archive and follow-up
```

The steps are views of one case, not a forced sequence for every receipt. Staff may record deposits before closing preparation. Review/approval remains independent as policy requires. Advanced journal/beneficiary details live in an expandable audit panel.

**Receive money:** select the due obligation; default payer, amount, account and reference; enter evidence once. On save, the shared service creates or links the payment, allocation, receipt and journal atomically where applicable. Partial receipts are supported. Payment-provider verification determines provider payments, not a staff-entered success flag.

**Pay money:** choose an approved payable line; beneficiary and verified destination are prefilled. Choose Record external transfer or Submit via enabled provider, with clear labels. The latter creates a pending attempt, not instant success. Verified evidence/status updates the payment and its payout allocation once. Bank matching remains explicit or based on an unambiguous audited rule.

**Reconcile:** import statement lines or use supported bank feeds; suggest matches by bank account, signed amount, reference/date and party. Exact candidates can be bulk-confirmed with a preview; ambiguous rows remain exceptions. Never manufacture bank lines merely to clear a blocker.

**Complete:** contract execution, registration/possession evidence, fee position, client-money liabilities and payout/reconciliation readiness are checked separately. The same server rules govern single and bulk actions. Bulk results report each success, failure or skipped record and retry only failures.

### Status separation

| Dimension | Example statuses |
|---|---|
| Service contract | Draft / internal review / sent / partially signed / signed / superseded / terminated |
| Property transaction | Offer accepted / conditional / ready for transfer / registered / handed over / cancelled |
| Settlement case | Draft / submitted / reviewed / approved / in execution / reconciled / closed / returned |
| Receivable | Not due / due / partially paid / paid / overpaid / disputed / written off with approval |
| Payment attempt | Pending / processing / cleared / failed / reversed |
| Disbursement | Draft / approved / pending execution / partly paid / paid / failed / cancelled |

Show four headline badges (contract, settlement, money due, payouts), with legal registration/handover milestones underneath. Model these independently and derive summaries from evidence. Do not overload “Settled” to mean all of them.

### Financial controls to retain or add

- Use explicit IDs for deal/transaction/obligation/payment/allocation/invoice links.
- Store BDT with decimal/minor-unit arithmetic and a defined rounding policy.
- Use request idempotency keys, unique provider/reference constraints and transactional locks. Identical retry returns the original result; a conflicting payload is rejected.
- Reserve pending payouts against available funds so concurrent approvals cannot spend the same money.
- Approval signs a statement version and beneficiary details; material changes require a new approval.
- Retain original paid entries; use reasoned reversals and credit adjustments.
- Keep company revenue and client liabilities separate. Apply signed commission terms once; preserve the calculation basis and tax treatment.
- Enforce permissions on API actions and related records. Audit bank-detail changes and independent approval exceptions.
- Preserve existing segregation-of-duties controls initially. Any threshold-based reduction in approval tiers is an explicit policy decision, not a UI shortcut.

### Example: what staff should see

Illustrative figures, excluding taxes: sale price BDT 10,000,000; agency commission BDT 200,000; approved marketing cost BDT 30,000. If the seller pays both from proceeds and all price funds are held, seller net is BDT 9,770,000. The screen explains each deduction and who receives it.

If buyer and seller exchange the BDT 10,000,000 directly, Seventh Sky's bank view shows only the fees it actually receives. It does not show BDT 10,000,000 as collected. Client property gain, if later requested, is a separate report. Company margin depends on recognised fee income and company-borne costs, not property appreciation.

## 7. Navigation and key screen concepts

Keep the existing console shell and emerald residential accent. Add destinations progressively when functional; old bookmarks redirect preserving record context.

```text
WORK
  Overview                 Today's actions, closings, exceptions
  Properties               Property register and lifetime workspace
  Purchases                Buyer engagements and sourcing
  Sales                    Seller engagements and listings
  Pipeline                 Board / List / Calendar
  Tasks                    My work / Team calendar / Approvals

RELATIONSHIPS
  Contacts                 Buyers, sellers, owners, agents, advisers, suppliers
  Communications           Inbox / Assigned to me / Drafts / Templates
  Marketing                Leads / Campaigns / Segments / Performance

DELIVERY & MONEY
  Contracts                Agreements / Templates / Awaiting signatures / Expiring
  Accounting               Overview / Receivables / Payables / Settlement desk
                           Receipts / Expenses / Refunds / Commissions
                           Bank reconciliation / Statements / Ledger
  Services                 Linked jobs / Book service / Supplier progress

CONTROL
  Reports                  Operations / Cash forecast / Profit / Team workload
  Settings                 Team & roles / Workflow policy / Catalogues / Integrations
                           Branding / Business calendar / Audit access
```

Avoid deep nesting: Accounting subareas are a landing page with tabs, not fifteen sidebar children. Staff see permitted destinations; accounts staff can reach required financial context without editing sales terms. Managers see approvals; inspectors see assigned inspection tasks. Buyer/seller portals expose only authorised records.

### Property and deal workspaces

```text
Residential > Properties > Property code > Deal code
Property / client / assignee      [Contract] [Closing] [Money due] [Payouts]
Next action: Review seller's counter-offer                    [Review offer]

Overview | Journey | People | Contracts & Docs | Money | Services | Activity

Overview: current purchase/sale engagements, key facts, deadlines, risk summary
Money: expected / invoiced / collected / payable / paid / client funds / margin
Activity: offers, approvals, messages and events with source links
```

Each transaction has a stable URL. Property history includes past purchases/sales and linked PM/short-stay/service work without overwriting historical owners. Routine edits use a side panel; complex onboarding, agreements and closing use full pages with saved steps.

### Contracts

- Reuse signing envelopes, KYC, prefill, completion hooks, document storage and shared service pricing patterns.
- Implement the RPPS/RPSS V0.2 templates from approved sources: selected services, standard/agreed prices, quotation references, fee triggers, schedules and signatures.
- Distinguish service agreements, buyer–seller transaction agreements, variations, indemnities and third-party documents.
- One contract can link to engagement, transaction, property and multiple people; signed snapshots remain immutable.
- Draft → internal review → send → partial signature → completion → operational activation; include reminders, expiry/termination, supersession and evidence exports.
- Signed terms prefill obligations. A reminder or duplicate completion callback never creates a second invoice or activates twice.

### Contacts, communications and marketing

- Extend the existing directory with multi-role relationships, linked deals/properties/contracts, preferences, consent records and duplicate suggestions. Never merge people just because names match.
- Add sales enquiry/engagement/transaction conversation keys and explicit participants. Internal notes, approval discussions and client-visible messages have different visibility.
- Persist email/SMS provider message IDs and status history; add inbound message handling, attachment permissions, assignments, unread state, templates and reminders.
- A failed email remains failed and retryable; an SMS log is labelled a log until a real gateway is configured. Support Bangla SMS encoding/segment costs in provider testing.
- Marketing starts with lead capture, source and campaign IDs, assignment and response SLA. Then segments and follow-up sequences, with unsubscribe/suppression and automatic stop on reply/opt-out/conversion.
- Generate conversion reports from enquiries → engagements → offers → completed transactions. Show attribution policy and avoid treating manually entered counters as measured conversions.

### Services and after-sales

Reuse Water Tank/AC shared screens and service-line scoping. From a property or deal, request cleaning, repairs, AC, assessment, documentation, relocation or other supported service. Carry property/contact/deal references into request → assessment or direct quote → approval → agreement → provider/work order → schedule → evidence → invoice/payment.

Return milestones and approved cost commitments to the sales workspace. Determine who pays each job and whether it is a client cost or company cost; do not invoice it twice in sales and services. Preserve provider eligibility, service scope, work verification, warranty and complaint controls. Post-close referrals need client acceptance, not automatic chargeable bookings.

## 8. Modern UI/UX specification

- Reuse `ConsoleShell` configuration, `ui/kit.jsx`, pickers and the existing `.pm-scope` design tokens. Reuse service components through their supported scope; do not mix raw `.wt-*` styles into residential pages.
- Maintain existing typography; use a 4/8px spacing rhythm, 14–16px operational text, tabular money figures and a clear primary action. Limit overview to four important summary cards; expose detail on demand.
- Global search for property code, contact, deal and document; breadcrumbs and URL-backed tabs/filters preserve location after refresh/back.
- Server-side tables with search, sorting, pagination, saved views and role-safe bulk actions. Show totals for the full filter separately from page totals.
- Draft saving with last-saved indicator, inline validation and recoverable server errors. Preserve form values after timeout or failed submission; explicitly resolve stale edits.
- Loading skeletons for initial fetch, in-place progress for actions, Retry for failures, and honest empty states. Do not render a zero financial balance when its request failed.
- Desktop: collapsible sidebar and wide workspace. Tablet: fewer visible columns with details on demand. Mobile: compact cards, stage selector instead of an unusable wide board, sticky next action and full-screen forms.
- Keyboard stage moves, visible focus, labelled fields, accessible dialogs, at least 44px primary touch targets, WCAG AA contrast, non-colour status text and reduced-motion support.
- Subtle 120–180ms transitions only where they clarify state. No nested modal stacks, decorative charts, or hover-only actions.
- Money actions show authoritative server results; optimistic card movement must revert on a rejected transition. Unsaved private KYC data must not be casually persisted to browser storage.

## 9. Phase-by-phase delivery roadmap

Each phase ends with a working demo, regression results, migration/report reconciliation where relevant, and owner review. The next phase begins after that gate. These are delivery units, not unverified calendar promises; estimate dates after Phase 0 identifies data volume and team capacity.

### Phase 0 — Baseline, source approval and safe architecture

**Outcome:** agree what is real, what is broken and which system owns each record.

- Capture current branch/commit, migrations, route reachability, real screen journeys and sample financial totals using dedicated fixtures.
- Approve document versions; map 8/10 SOP stages and 14 checklist steps; confirm brokerage money modes, fee/tax treatment and approval policy.
- Trace `/deals` and `/sales` records and all payment/journal/folio links; reconcile any overlap before choosing migration mappings.
- Define explicit contracts for financial commands, evidence, tenant/branch permissions and audit events.
- Establish regression commands and draft three screen wireframes: Pipeline, Deal Overview, Settlement Desk.

**Gate:** approved source-to-feature matrix; measured click/time baseline; reconciled sample ledger inventory; regression harness runnable; no unexplained data migration assumptions.

### Phase 1 — Essential money fixes and consistent statuses

**Depends on:** Phase 0.

- Correct identified receipt linkage, self-HTTP payment, payout evidence/concurrency, reconciliation payload and weak bulk-settle paths.
- Connect brokerage invoices/fees and client-money settlements through explicit links and a single authoritative command path per operation.
- Add coordination-only/external-payment evidence support without deleting existing client-money controls.
- Make company revenue, client liabilities and payables distinct; derive readiness and next action consistently.
- Align accounts permissions and financial audit history. Preserve originals; migrate by reviewed source mapping.

**Gate:** repeat/double-click and simultaneous-payment tests pass; every marked-paid payout has evidence and appropriate posting; single/bulk completion apply the same rules; old/new totals reconcile to the smallest currency unit.

### Phase 2 — Settlement Desk and property/deal workspace

**Depends on:** Phase 1.

- Restructure the existing sales file into stable workspace routes and focused tabs.
- Deliver the five-view settlement desk with prefills, obligations, clear/pending funds, beneficiary selection, bank-match suggestions and closing statements.
- Capture receipt/payment information once; populate dependent records automatically without bypassing approvals.
- Add Accounting landing page and role-based pending work queues; improve failure/draft handling and mobile layout.

**Gate:** at least 40% fewer navigation/actions than the Phase-0 baseline for routine receipt and payout tasks; no repeated entry of known payee/property/amount data; three representative staff can complete prepared cases without spreadsheet assistance.

### Phase 3 — Complete buyer/seller lifecycle and real pipeline

**Depends on:** Phase 0 data design and Phase 2 workspace.

- Implement buyer mandates before property selection, seller engagements, shortlist/compare, viewings and feedback.
- Add versioned offers, counters, written approvals, introductions, professional advice, risks and evidence-linked SOP gates.
- Deliver Kanban/list/calendar, saved views, task ownership, business-day deadlines, overdue work and escalation.
- Support failed offers, delayed settlements, cancellations and new workflow episodes without losing history.

**Gate:** buyer and seller golden paths plus no-purchase/cancelled paths pass end-to-end; every required gate has an owner/evidence link; keyboard and drag/drop transitions enforce identical server rules.

### Phase 4 — Residential Contracts and shared contact relationships

**Depends on:** Phase 3 engagement identity. Existing signing remains in use in earlier phases.

- Build the RPPS/RPSS builders and catalogue with approved V0.2 schedules and pricing.
- Deliver Contracts home, review queue, signing reminders, expiry, variations, indemnity and signed archives.
- Connect signing completion to Phase-2 activation, agreed terms and billing obligations exactly once.
- Expand Contacts with engagement/property relationships, verified duplicate handling, authorisation and preferences.

**Gate:** quotation, agreement, invoice and settlement fee amounts agree; completed documents never change on catalogue edits; duplicate signing callbacks create no duplicate obligations; correct buyer/seller and company signers are verified.

### Phase 5 — Communications and service coordination

**Depends on:** Phases 3–4 identity and permissions.

- Extend the current inbox to sales, explicit participants, internal/client visibility, assignments, templates and delivery status.
- Integrate tested email/SMS providers, inbound replies, retries and suppression preferences.
- Link service requests, approvals, provider progress, work evidence and financial commitments to property/deal workspaces.
- Add post-sale/purchase follow-up, complaints, feedback and optional service referrals.

**Gate:** real test email/SMS round trips show accurate delivery/failure; private notes never appear in client messages/portals; a sales-originated service completes through invoice/payment with no duplicate costs.

### Phase 6 — Marketing, reporting and premium client experience

**Depends on:** Phase 5 communications and Phase 3 attribution links.

- Lead routing, source/campaign attribution, segments, approved campaigns and follow-up sequences.
- Buyer/seller portal: progress, requests, secure documents, approvals, statements and service history.
- Reports: response SLA, pipeline age, conversion, settlement forecast, overdue receivables, expected/actual fees, workload and brokerage margin.
- Linked purchase/resale history with optional separate client-investment analytics and permissions.

**Gate:** lead-to-completion attribution and financial reports tie back to records; sequences stop on replies/opt-out/conversion; client permissions tested across co-buyers, sellers and unrelated transactions.

### Phase 7 — Multi-customer SaaS readiness and differentiators

**Depends on:** core operational phases; tenant isolation is mandatory before onboarding unrelated companies.

- Prove organisation isolation separately from branch scoping: database queries, files, exports, jobs, search, integrations, cached responses and support access.
- Organisation onboarding, subscription billing/entitlements, usage metering, per-tenant branding/templates, integration credentials, quotas and data export.
- Backup/restore drills, monitoring, worker retry visibility, audit retention, operational runbooks and staged releases.
- Optional human-reviewed document extraction, explainable buyer/property matching, deadline-change suggestions and deal-health scoring.

**Gate:** cross-organisation access tests pass; restore drill succeeds; subscription/entitlement boundaries work; operational monitoring catches failed payments/messages. AI cannot approve title, change signed terms or release funds.

## 10. Engineering boundaries and migration plan

Stay on the current React/Vite and Express/Sequelize stack. This plan does not require microservices or a new accounting/signing platform.

| Concern | Reuse / extend |
|---|---|
| Console/navigation | `config/consoles.js`, `ResidentialConsole.jsx`, existing shell and route helpers. |
| Property workspace | Refactor `SalesPropertyFile.jsx` into focused sections with a shared API response contract; preserve existing routes and history. |
| Engagement/transaction | `PropertyDeal`, `SalesModels`, offers and `SaleTransaction.property_deal_id`; add multi-property candidate and engagement link records where absent. |
| Financial truth | Existing sale payment/journal/beneficiary services for client money; existing invoice/payment services for agency fees; explicit linking and reporting across them. PM folios remain owned by PM. |
| Contracts | Existing templates, envelopes, signers, KYC, prefill and completion dispatch; add residential versioned templates and domain links. |
| Workflow | Reuse checklist/event infrastructure where fit; introduce versioned requirements, deadlines, evidence and transition policies without an all-purpose workflow engine rewrite. |
| Communications | Extend existing store with sales context, participants, provider attempts/status, visibility and queued delivery. |
| Services | Existing service-line-scoped request/quote/WO/invoice chain; property/deal origin references and cost ownership. |

Proposed API capabilities, with paths finalised during Phase 0: workspace read model; transition preview/execute; obligation-based receipt/payout commands; candidate bank-match and confirm; version-aware review/approval; due-diligence and offer evidence; communication delivery/retry. Reuse current routes behind compatibility adapters where possible.

For commands that create several records: validate scope → lock relevant state → validate version/balance → write records/journal/event in one DB transaction → commit → enqueue notifications. External payment execution uses a durable attempt and provider idempotency key; a timeout stays pending until checked. Notifications must not send before a transaction commits.

Migration sequence:

1. Inventory existing rows and reconcile sums by branch/property/deal/account.
2. Add guarded migrations and corresponding model attributes; never edit applied migrations.
3. Produce a read-only mapping preview. Resolve ambiguous text-linked payments manually rather than guess from a name or similar amount.
4. Backfill explicit IDs and provenance; verify repeat runs cause no duplicate records.
5. Run shadow reports against old and new read models without dual financial posting.
6. Enable the new UI/commands for a pilot group, preserving historical reads and deep links.
7. Retire duplicate write routes only after reconciliation and sign-off. Rollback disables new entry points; it does not erase posted money or completed signatures.

## 11. Verification and measurable success

```text
Unit: money, rounding, schedules, fee triggers, status and gate rules
  -> Integration: DB transactions, locks, links, branch permissions, callbacks
    -> End-to-end: buyer/seller/service/closing journeys and recovery
      -> Reconciliation: UI = obligations/payment ledger = accounting exports
        -> Staff acceptance + staged deployment + monitored operation
```

Mandatory scenarios: partial/overpayment, repeat receipt, concurrent payout, failed transfer, duplicate/out-of-order provider callback, stale approval, changed bank account, reversed receipt, cancelled deal/refund, zero-fee scoped service, direct buyer-to-seller payment, multi-party ownership, linked buy/sell, re-opened episode, failed email, opt-out, expired login, slow network, mobile and keyboard operation.

| Area | Proposed target / evidence |
|---|---|
| Daily work | ≥40% reduction in receipt/payout navigation/actions versus measured baseline; ≤2 minutes for a routine prepared receipt excluding bank processing. |
| Data entry | No repeated entry of known property/contact/payee/fee data across contract, invoice and settlement. |
| Financial integrity | Zero unexplained reconciliation differences; zero duplicate money events under retry/concurrency tests; explicit outstanding exceptions. |
| Completion | Purchase, sale, closed-no-purchase, cancellation/refund and linked service flows completed in-app using isolated fixtures. |
| Document compliance | Every required sign-off/approval linked to evidence and applicable document/workflow version. |
| Communications | Honest delivery status; no silent loss of drafts; no external delivery of internal notes. |
| Performance | Provisional p95 workspace load <2 seconds and routine internal mutation <1 second on agreed representative data/environment, excluding external providers; measure before promising. |
| Accessibility | Keyboard-complete main journeys, WCAG AA contrast, reduced-motion and mobile task verification. |
| SaaS launch | No cross-organisation/branch data exposure in automated negative tests; demonstrated backup restore and export. |

Backend tests must use isolated fixtures, not overwrite seeded/customer records. Frontend builds and route checks are required after implementation, followed by real authenticated endpoint and browser verification. Each release records exact commands/results and unresolved issues; a passing build alone is not acceptance.

## 12. Market patterns that fit

Official product pages accessed on 10 September 2026. These substantiate feature patterns, not independent quality rankings or jurisdictional suitability.

| Source | Verified pattern | Seventh Sky application |
|---|---|---|
| [dotloop](https://www.dotloop.com/products/) | Transaction monitoring, document autofill, e-signing, custom task templates, review workflows and lead-source tagging. | Connected transaction file, reusable SOP templates and approval queues. |
| [Follow Up Boss](https://www.followupboss.com/how-it-works/engage-v2) | Action plans, Smart Lists, shared team inbox, email/text/call timeline and automated follow-up. | Assigned lead queues, overdue follow-up views and actual two-way communications. |
| [BoldTrail BackOffice](https://boldtrail.com/product-comparison-back-office/) | Transaction management, commission automation, reporting, accounting/QuickBooks integration and multi-office support. | Explicit commission rules and source-linked financial reporting across branches. |

Earlier benchmark work also identified Qualia-style closing portals, Lone Wolf transaction reuse and local land-record tracking as candidates. Those are recommendations, not a reason to add US title/escrow workflows wholesale. A Bangladesh-focused advantage is combining local document/risk coordination, clear client-money handling, bilingual communication and existing after-sales service operations.

## 13. Decisions required before implementation

1. Confirm which transaction modes occur: coordination-only, client-money holding, or both; who receives deposits and final purchase price today?
2. Approve the authoritative V0.2 templates and reconcile the workbook version discrepancy. Which document takes precedence for phase gates?
3. Confirm commission/success-fee variants, agent splits, fee triggers, VAT/AIT and client-versus-company cost treatment with accounts/local advisers.
4. Confirm approval staffing/thresholds. Keep current independent review until a documented replacement policy is approved.
5. Confirm how both-side representation and related-party visibility should work.
6. Confirm preferred email/SMS providers, message consent/retention rules and portal scope.
7. Is the next rollout only Seventh Sky branches, or unrelated paying organisations? The latter cannot go live before organisation isolation and SaaS launch gates.

**Recommended first authorisation:** Phase 0, followed by a separately reviewed Phase-1 implementation specification. The remaining phases stay visible in the roadmap so money fixes lead to a complete purchase/sales product rather than another disconnected feature patch.

---

## 14. Claude Code verdict & reconciliation (2026-09-10)

**Verdict: this plan is the stronger baseline and should be adopted over my earlier spec
(`docs/superpowers/specs/2026-09-10-property-sales-saas-improvement-plan.md`) where they
disagree.** I verified its central claims against the live source today.

### Confirmed against source (this plan is right)

- **A stronger sales-settlement system already exists.** Verified present:
  `backend/controllers/sales.controller.js`, `backend/services/salesSettlement.service.js`
  (audit events, settlement snapshots, compliance blockers, disbursement-payment
  validation, statement building, journal posting), `backend/models/SalesModels.js` +
  `SalesTrustModels.js` (client-money/trust), and `admin-portal/src/screens/sales/SalesPropertyFile.jsx`
  (7,656 lines). **My earlier spec's premise — "no guided sales settlement workspace" and
  "sales settlement is only a flat deal field" — was incorrect.**
- **Consequence for work already committed this session (commits `fbea9d7`..`88acab8`):**
  the `/deals/*` settlement path I built (migration 0103/0104 deal_disbursements/deal_events,
  `dealSettlement.service.js` + `dealSettlement.controller.js`, `DealSettlementWorkspace.jsx`,
  `SalesBulkSettlement.jsx`) is a **third, lighter, parallel money path** beside the stronger
  `/sales/*` engine. It passes a 26/0 end-to-end harness, so it is functional, but it
  **duplicates** existing capability — contrary to the "improve, don't duplicate" instruction.
  It should be treated as **interim**, not the destination.
- **Valid architectural criticisms of that new code** (all confirmed): money matched by
  `LIKE '%DEAL:<code>%'` text reference (no explicit `deal_id` on invoices/payments);
  self-HTTP internal payment call; "paid" status is set without posting a bank/journal entry;
  the held-funds check is not inside a locking transaction (concurrent-payout risk); "settled"
  carries two different meanings across `/deals` and `/sales`.
- Correct too: `DealsBoard.jsx` is a table + drawer, not a real Kanban; a contacts directory
  already exists; role-permissions/audit belong from Phase 0; clause 22 of both V0.2
  agreements = 12-month introduction protection; coordination-only vs client-money modes;
  "From" is a price type, not a promised charge.

### Caveats on this plan

- It is a **document + static-code review**; no runtime/authenticated/DB verification was done
  (it states this). Treat its line-number citations as approximate — source may have moved.
- The Phase 0–7 roadmap is large. Keep the **start-narrow** discipline: Phase 0 then a
  separately-reviewed Phase 1, exactly as its section 13 recommends.

### Reconciled direction

1. **Adopt this plan's model:** three records (property / engagement / transaction), four
   headline status badges derived from evidence, the existing `/sales` engine as the
   authoritative money path, coordination-only + client-money modes.
2. **Supersede my Phase 1.** My Phase 1 ("build the `/deals` settlement workspace") is
   replaced by this plan's Phase 1 ("connect the lighter `/deals` flow to the stronger
   `/sales` engine; fix receipt-linkage, self-HTTP, payout evidence/concurrency, bulk-settle").
3. **Decide the fate of the committed `/deals` settlement work** (see below) before any
   further build. No further implementation until that decision and a Phase 0 baseline.

### Open decision for the owner

What to do with the interim `/deals` settlement path built this session:
**(a)** keep it committed but frozen as interim, and make Phase 1 consolidate onto `/sales`;
**(b)** keep its DB/status model + workspace UI shell but repoint its money operations at the
`/sales` engine (drop the `LIKE`-matching path); or **(c)** revert it and start Phase 1 from
the `/sales` engine directly. Recommendation: **(b)** — the status model and the guided
full-page workspace are the reusable parts; the money mechanics should be the `/sales` engine.
