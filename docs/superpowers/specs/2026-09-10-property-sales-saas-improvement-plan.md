# Seventh Sky — Property Purchase & Sales SaaS: Research-Backed Improvement Plan

**Date:** 2026-09-10 · **Status:** PLAN FOR REVIEW — no implementation yet
**Scope:** `admin/residential/*` (Sell + Buy/Deals) and every connected module
(agreements & signing, Property Management, accounting/folios, water-tank & AC
services, contacts, communications, marketing).
**Confirmed with owner:** Regime = **Bangladesh** (deed/mutation/succession, BDT;
trust accounting is advisory, not statutory). Model = **brokerage service** —
Seventh Sky earns a **service fee + commission** representing buyers/sellers; it
does not trade its own inventory.

> **Reading key.** Each point is tagged:
> **[V]** verified (read in the documents or the code) ·
> **[R]** recommendation (my proposal) ·
> **[?]** open question needing your confirmation.

---

## 1. How this plan was produced

- **[V] Documents read in full** from `C:\Users\ADMIN\Downloads\Sale\Sale\`:
  - `SOP – Residential Property - Purchase - V0.1.docx` (8 stages).
  - `SOP – Residential Property - Sale - V0.1.docx` (10 stages).
  - `Seventh_Sky_Residential_Property_Purchase_Workflow_Detailed_V0.1.xlsx` (26 sheets/registers).
  - `Residential_Sale_Checklist_Enterprise_Workflow - V0.1.xlsx` (14-stage checklist + CRM-actions sheet).
  - `Residential Property Purchase Service Agreement - V0.2.docx` and
    `Residential Property Sale Service Agreement - V0.2.docx` (titles + schedules noted; clause-level
    extraction pending — see Open Questions).
- **[V] System audited:** residential console + `PropertySellDashboard`, `DealsBoard` (Kanban),
  `SalesEnquiries`, sales assessment, `salesPayment` (SSLCommerz online payment), `PropertyDeal`
  model, the agreements/eSign engine, PM statements/disbursements/folios, the new PM Communication
  inbox, and the water-tank/AC service consoles.
- **[V] Research** (current SaaS patterns): real-estate pipeline norms (New → Contacted → Showing →
  Offer → Under Contract → Closed, drag-drop kanban, automated lead assignment, task reminders,
  unified email/SMS) and brokerage settlement norms (timestamped audit trail + folio id, three-way
  reconciliation, disbursement authorization, duplicate-entry prevention). Sources listed at the end.

---

## 2. Verified findings — the real business process (from your documents)

- **[V] It is a service/brokerage, two mirror workflows:**
  - **Purchase service (buyer's agent), 8 stages:** Enquiry & Consultation → Requirement Assessment
    & Planning → Property Search & Shortlisting → Inspection Coordination → Documentation Review &
    Risk → Negotiation & Offer → Agreement & Settlement Coordination → Closure & Post-Purchase.
  - **Sale service (seller's agent), 10 stages:** Enquiry & Consultation → Inspection & Assessment →
    Documentation Review & Risk (+ seller indemnity + agreed minimum estimated sale value) →
    Service Agreement Finalisation & Phase Approval → Property Preparation → Marketing & Listing →
    Buyer Enquiry & Inspection → Offer & Negotiation → Agreement & Settlement Coordination →
    Closure & Post-Sale.
- **[V] Two-phase engagement + money:** a **Phase-1 quotation + service agreement** at consultation,
  then a **Phase-2** deeper engagement; income = **service fee + commission** (sale side has a
  commission structure and an *agreed minimum estimated sale value*; purchase side a service fee).
- **[V] The 26 purchase registers** the Excel expects the CRM to hold (grouped):
  buyer master + requirement form; consultation & Phase-1; agreement & engagement; property sourcing;
  shortlist & compare; inspection schedule + checklist; **document verification**; **professional
  advice tracker**; **risk assessment register**; **Protected Introduction Register** (non-
  circumvention); negotiation tracker; **offer approval checklist**; transaction coordination;
  **settlement & registration**; **fees & commission register**; communication log; **stage-gate
  checklist**; project register; post-purchase services; closure checklist; KPI dashboard.
- **[V] Strong compliance spine in both SOPs:** a **document disclaimer & risk-management** stance
  (Seventh Sky is not a legal/land authority; must not guarantee title/return; escalate fraud/
  ownership concerns), seller **indemnity acknowledgement**, confidentiality, and a complaint
  procedure. The system must capture these acknowledgements as first-class records, not free text.
- **[V] Explicit CRM requirements per stage** — every stage names the records/evidence to capture
  (e.g. offers, approvals, risk flags, settlement milestones), which is exactly what a stage-gated
  deal workspace should enforce.

## 3. Verified findings — what the system already supports

- **[V] A sales spine exists:** `PropertyDeal` (`deal_type` buy|sell; buyer/seller/owner links;
  `agreement_id`; `sale_price`, `commission_amount/percent`, `expenses_total`; `status` = lead →
  negotiation → agreed → settlement → completed → cancelled; `settlement_date`, `assigned_to`).
- **[V] A Kanban already exists** (`DealsBoard.jsx`) at `/residential/buy`, plus a seller dashboard
  (`PropertySellDashboard`) at `/residential/sell`, `SalesEnquiries`, a sales assessment workspace,
  and **online payment** (`salesPayment` with SSLCommerz IPN/success/fail/cancel).
- **[V] Reusable engines are already built and proven this month:**
  - Agreements + eSign (pack-driven, multi-signer, completion hooks) across 8 service lines.
  - PM money engine — folios, owner statements, **guided owner payout + the new bulk runs**
    (collect-rent, pay-owners, reminders), income ledger, three-way tenant outstanding.
  - The **PM Communication inbox** (unified `communications` + enquiries, reply/draft) — a template
    the sales side can reuse.
  - Directory pickers with cascade (client → project/WO/quotation) and the detail-dashboard pattern.
- **[V] Shared property register + contacts** underpin every module (one `properties`, one
  `contacts`), so purchase and resale of the *same* property can already share a record.

## 4. Current problems & business impact

- **[V→R] The deal is far shallower than the documented process.** `PropertyDeal` is a flat 6-status
  row; the SOPs need 8–10 stage gates with per-stage evidence, approvals, risk flags, offers,
  professional-advice and non-circumvention registers. *Impact:* staff track the real process in the
  Excel workbooks in parallel — double entry, no enforcement, no audit trail.
- **[V→R] No single deal/property workspace.** Property overview, purchase & sale progress,
  financials, contracts, documents, contacts, tasks, services and activity live on different screens.
  *Impact:* many clicks, context-switching, and "where's the latest?" uncertainty — the core
  complaint.
- **[V→R] Money is the biggest friction.** Sales settlement/commission is a flat field on the deal;
  there is no guided settlement workspace and no *sales* disbursement run (the mature disbursement
  engine is PM/owner-side only). Receiving money, outgoing payments, settled status and disbursement
  status are not distinct, connected states. *Impact:* the stated "too many steps around settlements,
  receiving money, outgoing payments, settled properties and disbursements."
- **[V→R] Contracts are scattered.** The agreements engine is strong but reached per-console; there
  is no single Contracts home with templates, versions, review, signing status, reminders, expiry
  and signed-copy storage tied to the deal.
- **[V→R] No central Contacts directory.** Buyers, sellers, owners, agents, solicitors, suppliers,
  providers exist as `contacts`/`clients` but without one relationship-centric view linking their
  properties, deals, contracts, tasks and communication.
- **[V→R] Statuses aren't obvious and there's no "next action."** Nothing tells a user what the one
  next step is, or flags blockers/overdue deadlines at a glance.
- **[V→R] Missing registers = missing controls.** No non-circumvention (Protected Introduction),
  professional-advice, or structured risk register on the sales side; the seller indemnity and the
  document disclaimer acknowledgements aren't captured as records.

## 5. Proposed end-to-end workflows [R]

### 5.1 One deal object, stage-gated to the SOP
Evolve `PropertyDeal` into a **stage-gated Deal** that speaks the SOP:
- **Buy pipeline:** Enquiry → Consultation & Phase-1 → Requirement/Planning → Search & Shortlist →
  Inspection → Documentation & Risk → Negotiation & Offer → Agreement & Settlement → Closed.
- **Sell pipeline:** Enquiry → Consultation & Phase-1 → Inspection & Assessment → Documentation &
  Risk → Agreement Finalised → Preparation → Marketing & Listing → Buyer Enquiry & Inspection →
  Offer & Negotiation → Agreement & Settlement → Closed.
- Each stage carries **responsibility (role), deadline, required documents, and a completion
  condition** (the "stage gate"). Advancing a stage is blocked — with a clear reason — until its gate
  is met (e.g. "Can't move to Settlement: signed agreement + approved offer required"). This mirrors
  the Excel *Stage Gate Checklist* and the WT/AC "phase gate" pattern already in the code.

### 5.2 Linked purchase ↔ resale on one property [R]
Because property + contacts are shared, allow a property to carry **more than one deal** (a purchase
deal and a later sale deal), shown together on the property workspace with a combined P&L (acquisition
cost + holding/expenses vs resale + commission) — supporting the "linked purchase and resale" ask.

### 5.3 Edge cases as first-class states [R]
Model **cancellation, refund, delayed settlement, partial payment, reopened deal** as explicit
statuses/actions with their own records and approvals — not by editing money fields in place. Every
change is appended to the deal's activity/audit trail.

## 6. Main objective — make the money simple [R] (highest-priority)

A **guided Settlement & Disbursement workspace** on the deal, reusing the proven PM folio/payout
engine so money stays correct and auditable:
- **Four distinct, always-visible statuses:** Contract status · Settlement status · Payment status ·
  Disbursement status. No more inferring money state from one field.
- **One screen, expected → actual:** expected amounts (sale price, commission, fees) vs actual
  receipts; deductions/fees; payees; approvals; **remaining balance** — with the next action obvious.
- **Receive money** (client fee, deposit, commission) and **pay out** (refunds, supplier/vendor,
  agent splits, expenses) from the same place; each posts through the existing invoice/receipt/folio
  ledger — no parallel money path.
- **Prepare → Review → Approve → Record → Reconcile** as an in-place flow (no screen-hopping),
  matching the researched brokerage pattern.
- **Controls [R, confirm locally]:** duplicate-payment guard (idempotent per source+payee+period),
  allocation validation, append-only ledger with timestamped audit trail + who/when, and an approval
  threshold before disbursement. A **bulk sales-commission/settlement run** mirrors the PM bulk runs.
- **[? / local-confirmation]** Statutory **trust-account** handling is **not** required in Bangladesh
  as far as the SOPs show; if you ever operate in NSW it becomes mandatory (statutory trust account +
  monthly three-way reconciliation). Flagged, not assumed.

## 7. Recommended navigation & key screens [R]

- **Top-level menu (role-filtered, collapsible sidebar + breadcrumbs + global search):**
  Overview · Properties · Purchases · Sales · **Pipeline** · Contacts · **Contracts** · **Accounting**
  · Communications · Marketing · Services · Tasks · Reports · Settings.
- **Key screens:**
  1. **Pipeline** — kanban (drag-drop with gate reasons) + list + calendar; deal value, assignee,
     next action, deadline, overdue flag; saved views & filters.
  2. **Deal / Property workspace** — the central hub: overview, buy & sell progress, financial
     summary (expected vs actual, received/paid/outstanding, estimated vs realised profit), contracts,
     documents, contacts, tasks, services, activity timeline; blockers + next action; inline actions.
  3. **Contracts** — templates, autofill from the deal, versions, internal review, signing status,
     reminders, expiry, signed-copy store; every contract linked to property + deal + people.
  4. **Accounting** — receivables/payables, receipts, expenses, deposits, refunds, commissions,
     adjustments, reconciliation; the guided settlement workspace (§6).
  5. **Contacts** — directory with the person's linked properties/deals/contracts/tasks/comms.
  6. **Communications** — extend the PM inbox to sales (email/SMS/note, templates, reminders,
     internal-vs-client separation, delivery/consent status).

## 8. Feature disposition

| Retain [V] | Improve [R] | Connect [R] | Add [R] |
|---|---|---|---|
| Agreements + eSign engine | Deal → full stage-gated lifecycle | Deal ↔ contracts/payments/tasks/comms | Non-circumvention (Protected Introduction) register |
| DealsBoard kanban | Kanban: gates, next action, overdue, calendar/list + saved views | Property ↔ multiple deals (purchase+resale) | Professional-advice + risk registers; seller indemnity & disclaimer as records |
| PM folio/payout/statement engine | Extend disbursement to sales settlements | Contacts ↔ deals/properties/contracts | Central Contacts directory |
| SSLCommerz online payment | Guided settlement workspace (4 statuses) | Accounting ↔ existing folios/invoices | Dedicated Contracts + Accounting nav sections |
| PM Communication inbox | Reuse for sales comms | Comms ↔ deals & contacts | Tasks/deadlines with reminders; performance/cash-flow/forecast reports |
| Shared property + contacts | Sell/Buy dashboards → one workspace | Services (WT/AC/PM) ↔ property & deal | Stage-gate checklists per pipeline |

## 9. Phased roadmap [R]

- **Phase 1 — Essential fixes (money & clarity; the stated main objective).**
  Guided settlement & disbursement workspace with the four statuses + next action; sales settlement/
  commission posting through the folio engine + duplicate-payment guard + audit trail; a sales bulk
  settlement run. Deal workspace v1 (financial summary + statuses + next action). *Success = fewer
  clicks to settle, correct money, clear state.*
- **Phase 2 — Core improvements (lifecycle & workspace).**
  Stage-gated deal lifecycle (buy 8 / sell 10) with gates, responsibilities, deadlines, required
  docs; the full property/deal workspace; Contracts section (templates/versions/reminders/expiry);
  central Contacts directory; pipeline board+list+calendar with saved views; sales Communications.
- **Phase 3 — Future differentiators.**
  Marketing (lead capture/sources/segments/campaigns/follow-up sequences/conversion reporting);
  linked purchase↔resale P&L; performance/cash-flow/settlement-forecast/workload dashboards;
  role-based menus + permissions + audit history; services booking/quotation/scheduling polish.

## 10. Success criteria [R]

- **Usability:** settle a completed deal in ≤ a handful of clicks from its workspace; every screen
  shows one obvious next action; nontechnical staff complete a full deal without training notes.
- **Financial accuracy:** expected vs actual always reconciles; no duplicate/misallocated payments;
  every money change is append-only with who/when; deal money agrees with the folio ledger.
- **Reliability:** stage gates prevent skipping required approvals/documents; drafts and in-progress
  work survive a failure; clear, recoverable errors.
- **Completeness:** a deal can go enquiry → … → settlement → disbursement → closure entirely in-app,
  with the SOP's evidence captured at each gate; a verifiable end-to-end journey (like the PM harness)
  passes green.

## 11. Modern UI/UX direction [R]
Collapsible sidebar, breadcrumbs, global search; summary cards, status badges, progress indicators,
activity timelines; searchable/filterable tables with saved views, sorting and sensible bulk actions;
**side panels for quick edits** (no page loss); short guided forms with defaults/autofill/inline
validation/draft-save; contextual actions, helpful empty states, clear loading, actionable errors;
subtle transitions, responsive, keyboard + accessible contrast + reduced-motion. Avoid pop-up spam,
deep menus, crowded dashboards, long forms; always preserve work on failure. Reuse the existing
`wt-scope`/`pm-scope` design systems — do not introduce a new one.

## 12. Open questions & local-confirmation flags

- **[?]** The two **service agreements** (Purchase V0.2, Sale V0.2) — I have titles/schedules but
  should extract clause-level content before designing the Contracts templates. OK to read them next?
- **[?]** Commission model specifics: percentage vs tiered; who splits (agent/consultant); VAT/AIT
  treatment on fees & commission in BD.
- **[?]** The **Protected Introduction / non-circumvention** period and its enforcement rules.
- **[? local-confirmation]** BD tax/withholding on brokerage fees & commission, and any registration/
  deed-transfer money handling you actually touch (vs. purely coordinate) — this decides whether
  Accounting needs client-money holding at all.
- **[?]** Are the NSW/Australia files in Downloads a *second* operating entity we should also plan
  for later, or unrelated? (You chose BD-primary; noting for the record.)

## 13. Sources
- Breakcold — real-estate sales-pipeline template.
- REsimpli — best CRM pipeline stages for real estate.
- Goliath Data — CRM pipeline stages "New → Offer Signed"; pipeline-automation features.
- Retyn.ai — real-estate commission-management & disbursement software (audit trail, payouts).
- WiFiTalents / Elite Software — real-estate trust-accounting software (three-way reconciliation,
  timestamped folio audit trail) — relevant only if NSW operation is added.
