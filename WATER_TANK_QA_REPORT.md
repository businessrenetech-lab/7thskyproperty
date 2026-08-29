# Water Tank Service — End-to-End QA Report

**Prepared by:** QA (Claude Code, Opus 4.8) · **Date:** 2026-08-19
**Environment:** local dev — backend `:50001`, admin `:3005`, DB live, branch_id 1
**Method:** live API exercised with a super-admin token (51 read endpoints), real data traced through the pipeline, calculations recomputed independently, frontend IA + entry screens reviewed in source.

---

## 1. Executive summary

The Water Tank module is **functionally solid at the API layer** — every endpoint responds, and the core money math (quotation VAT/total, invoice balances) is correct. **What makes it feel confusing is workflow architecture, not broken code:** there are **four different ways to start the same job**, two parallel intake concepts (Enquiry vs Service Request) of which one is orphaned, and **22 nav destinations across 8 groups**. A few data-hygiene and reporting-consistency issues compound the feeling that "numbers don't line up."

| Dimension | Score | Note |
|---|---|---|
| API / endpoint health | **9/10** | 51/51 read endpoints return 200; 0 server errors |
| Calculation correctness | **8/10** | Quote + invoice math correct; one dashboard-vs-list reconciliation gap; drafts shown as "outstanding" |
| Workflow coherence | **5/10** | 4 entry points into one pipeline; Enquiry vs Service Request duplication; Projects vs Work Orders overlap |
| Data completeness / hygiene | **6/10** | 71/76 invoices stuck in Draft; 6/6 providers have no agreement |
| **Overall** | **≈ 7/10** | Ship-worthy engine; needs a workflow-consolidation pass to feel "smooth" |

---

## 2. The intended pipeline (confirmed from `/wt-ops/pipeline`)

```
Service Request → Site Assessment → Quotation → Work Order → Invoice → (Disbursement / Reports)
                                        │
                        (Customer Agreement raised from the Project)
```
Provider track (parallel): **Provider onboarding → Provider Agreement → assignable on Work Orders → paid via Disbursement.**

This chain is correct and the data carries through it (e.g., the customer-agreement builder pre-fills from the project dossier — verified separately). The problem is everything that sits *beside* this clean line.

---

## 3. Findings by severity

### 🔴 Critical — none
No data-loss, no auth bypass, no crashing endpoint found.

### 🟠 High

**H1. Four entry points start the same pipeline → the "multiple entry" confusion.**
A delivery job can be created from **Service Request**, **Site Assessment** (direct), **Quotation** (direct, via `QuotationDirect`, no assessment), or **Project** (direct). Source evidence — `/new` routes referenced in the WT screens:
`service-requests/new` (×7), `site-assessments/new` (×2), `quotations/new` (×1), `projects/new` (×1).
*Impact:* no single "start here"; records can skip stages (a direct quotation with no assessment, a project with no work order), so operators can't trust that a record's history is complete.
*Fix:* make **Service Request the one canonical front door**; keep the others as clearly-labelled "shortcut" actions *inside* the flow (e.g. "Skip to quotation"), not as peer top-level "New" buttons.

**H2. Two intake concepts, one orphaned — Enquiry vs Service Request.**
Backend exposes `/wt-intake/enquiries` (full CRUD) **and** `/wt-intake/requests`, but the WT sidebar only shows **Service Requests** — there is **no "Enquiries" nav item**, and `enquiries` currently holds **0 records**. So the enquiry concept exists in the data model and API but is invisible and unused.
*Fix:* decide one of two — either (a) surface Enquiries as the true top-of-funnel ("lead → qualify → service request"), or (b) remove the enquiry endpoints and fold everything into Service Request. Right now it's half-built, which is exactly what reads as "confusing."

**H3. Provider onboarding never reaches an agreement.**
`/wt-providers/directory` summary: **6 providers — 2 approved, 4 onboarding, `with_agreement: 0`, `without_agreement: 6`, `agreements_in_draft: 1`.** The provider-agreement machinery (`/wt-agreements/provider/*`) works, but **not one provider has an executed agreement**, and `not_assignable: 2`. End-to-end onboarding is therefore incomplete — providers can be approved yet have no contract binding them before they're assigned work.
*Fix:* gate "approved / assignable" on a sent-or-signed provider agreement, and surface the missing-agreement count as an action on the Providers screen.

### 🟡 Medium

**M1. Dashboard invoiced total ≠ sum of the invoice list.**
`/wt-ops/dashboard` → `finance.invoiced_total = 174,755`. Independent Σ of `amount` over `/wt-invoices` (76 rows) = **138,155**. **Gap ≈ 36,600.** The two surfaces count different sets (likely different draft/AMC/VAT inclusion rules or branch scope). Whichever is "right," they must agree or a user will always distrust one.
*Fix:* one shared query/definition of "invoiced total"; unit-assert dashboard total == Σ(list) for a fixed dataset.

**M2. Draft invoices are shown as "outstanding" — misleading.**
71 of 76 invoices are **Draft**. The invoice list carries an `outstanding` value on drafts, so a naive sum = **137,355**, while the dashboard (correctly excluding drafts) shows **outstanding = 100**. A draft isn't money owed — showing it as outstanding inflates perceived receivables.
*Fix:* zero/blank the `outstanding` column for Draft status, or label it "Draft — not yet billed."

**M3. Invoice pile-up in Draft (71/76).**
Strongly suggests the Work Order → Invoice step auto-creates draft invoices that are never sent/finalised. Either the "Raise/Send invoice" action is being skipped, or drafts are generated too eagerly.
*Fix:* clarify one explicit "Raise invoice" action at work-order completion; don't auto-spawn drafts that clutter the register and the numbers.

**M4. Projects vs Work Orders read as two things for one job.**
Both are top-level Delivery destinations (23 projects, 43 work orders). Users have to hold two mental models for one delivery.
*Fix:* present Work Orders **inside** the Project (a project *has* work orders), or rename to make containment obvious.

### 🔵 Low

**L1. `GET /wt-quotes` returns the SPA `index.html`.**
There is no list route on `/wt-quotes`, so a bare GET falls through to the front-end catch-all and returns HTML with a 200. Harmless today (the Quotations screen reads `/wt-ops/quotations`), but any future code calling `/wt-quotes` will silently parse HTML as JSON.
*Fix:* add a real list route or return a JSON 404.

**L2. 22 destinations / 8 nav groups.** Heavy for one service line. Candidates to merge: Finance (Invoices + Payments & Disbursements + Reports) and Assurance (Service Reports + Warranty & Issues + Complaints) could each collapse a level.

---

## 4. Calculation audit (independently recomputed)

| Check | Result |
|---|---|
| Quotation Q-1055 — lines 8,000 → VAT 5% = 400 → total 8,400 | ✅ correct |
| Invoices with `outstanding > amount` or negative | ✅ none (0/76) |
| Invoices `status=Paid` but `outstanding > 0` | ✅ none (0/76) |
| Dashboard `invoiced_total` vs Σ invoice `amount` | ⚠️ 174,755 vs 138,155 (see M1) |
| Dashboard `outstanding` vs Σ invoice `outstanding` | ⚠️ 100 vs 137,355 — drafts (see M2) |

**Verdict:** the pricing engine itself is trustworthy; the problems are *aggregation/reporting definitions*, not per-record arithmetic.

---

## 5. Endpoint health

**51 / 51** read endpoints across all 14 Water Tank routers returned **HTTP 200** (dashboards, references, overviews, lists, agreement catalogs/meta). No 500s, no auth failures. (One latent issue: `GET /wt-quotes` — L1.)

---

## 6. Recommended "smooth path" (target workflow)

One front door, one spine, shortcuts allowed but never the default:

```
① Intake            New/Existing client → ONE "New Service Request"
                    (an enquiry is just an unqualified request — same screen, a status)
      ↓ (auto-carries client + site + need)
② Assess            Site Assessment — pre-filled from the request; skippable with a reason
      ↓ (auto-carries tanks, scope, measured services)
③ Quote             Quotation — pre-filled from assessment; full price-schedule picker
      ↓ (approved quote →)
④ Contract          Customer Agreement (pre-filled from project) + Work Order issued together
      ↓ (provider must have a signed provider agreement to be assigned)
⑤ Deliver           Work Order → Service Report / completion
      ↓
⑥ Bill & Pay        Raise Invoice (explicit) → collect → Disburse to provider
      ↓
⑦ Assure            Warranty/AMC, complaints, reports
```

**Top 5 changes that remove most of the confusion:**
1. **One canonical "New Service Request"** entry; demote the other three "New" buttons to in-flow shortcuts (H1).
2. **Resolve Enquiry vs Service Request** — pick one intake object (H2).
3. **Gate provider "assignable" on a provider agreement** (H3).
4. **Fix the two invoice-number issues** — reconcile `invoiced_total`, and stop showing drafts as outstanding (M1, M2).
5. **Nest Work Orders under Projects** and trim the two heaviest nav groups (M4, L2).

---

## 7. Suggested fix order

1. **M2 + M1** (invoice number trust) — small, high credibility payoff.
2. **H1** (single entry point) — the biggest "feels smoother" win.
3. **H3** (provider agreement gate) — closes the onboarding loop.
4. **H2** (enquiry vs request decision) — needs a product call from you.
5. **M3, M4, L1, L2** — hygiene and polish.

> Nothing here is data-destructive. Items M1/M2/L1 are safe code fixes I can do now; H1/H2/M4 are workflow/UX changes worth a quick sign-off on direction before I touch screens.
