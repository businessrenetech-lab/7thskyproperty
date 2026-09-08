# Service Console UX Smoothing — Design Doc

**Status:** Design / not yet implemented. Captured from a brainstorming session so it can be executed later.
**Date:** 2026-09-03
**Scope:** Water Tank console is the reference build; every change is **config-driven on the shared core** and therefore applies to **all service lines** (Water Tank, Air Conditioning, Land & Property Assessment, Loan & Financial Support, Property Documentation & Verification, Property Will & Succession). See `SERVICE_MODULE_DUPLICATION.md`.
**Goal (user's words):** the workflow is "quite confusing, heavy" — make it "smoother, neater, cleaner UI." Do NOT rewrite the working system; smooth it.

---

## 1. Decisions locked in brainstorming

| Decision | Choice |
|---|---|
| Primary pain to fix | **Too many screens per job** — one engagement lives across ~8 registers |
| Solution shape | **Job cockpit, additive** — build one cockpit; the existing registers stay as-is (lower risk, nothing removed) |
| Cockpit anchor | **A — Project-anchored** — enhance the existing Project into the cockpit; pre-project leads show the same rail and promote into it at quote-approval |
| Also included now | (1) Before/After assessment split (2) Next-action chips + work queue (3) Slimmer sidebar (4) Finance hub |
| Cross-service | All of it is manifest/`serviceScope`-driven so it lands on every line at once |

**Hard rules for implementation:** additive only (no destructive schema changes; existing routes/screens keep working); reuse the existing ~50 screens via deep-links rather than re-embedding forms; everything scoped by `branch_id` + `service_line` like the rest of the `wt_*` core.

---

## 2. Research findings — where it's heavy today

Current lifecycle (each arrow = a separate top-level screen the operator navigates):
`Service Request → Site Assessment → Quotation → Customer Agreement (sign) → Work Order (auto-raised → assign provider → sign) → deliver → verify → Service Report → Invoice → Payment → Disbursement/Payout → Warranty/AMC`. Provider onboarding is a parallel track (invite → KYC docs → master agreement sign → approve).

Friction map:

1. **Lifecycle scattered across ~8 registers** (Service Requests, Site Assessments, Quotations, Agreements, Projects, Work Orders, Invoices, Payments). No single place that shows "where is this job + what's next." — *primary pain.*
2. **Overlapping containers** — Service Request vs Quotation vs Project vs Work Order; unclear which to open. (A Project contains Work Orders; a Request spawns assessment→quote→agreement→WO; repeat WOs stack under one Project.)
3. **Dense sidebar** — 22 destinations / 6 groups at equal weight; nothing says "start here."
4. **Assessment mixes before & after** — one 7-step `AssessmentForm` crams the pre-work survey and the completion evidence (`photos` vs `photos_after`, sign-off) into a single record; the WO "verify" step isn't linked as the "after."
5. **A few very heavy forms** — `ProjectForm` (978 lines), `QuotationAgreement` (847), `AmcForm` (669), `ServiceRequestNew` (568); repeated client/property entry.
6. **Money split four ways** — Invoices / Payments / Disbursements / Reports are separate destinations.
7. **"What next" buried** — the genuinely useful SOP phase-gates live only inside the client page, not on lists/dashboard.

Reference files (Water Tank; mirror per line via config):
- Nav: `admin-portal/src/config/consoles.js` (`WATER_TANK_NAV`, rebased per line).
- Dashboard: `admin-portal/src/screens/watertank/Dashboard.jsx` (already has a lifecycle **funnel** + KPIs + alerts — good foundation).
- Project cockpit target: `admin-portal/src/screens/watertank/ProjectDetail.jsx` (880 lines; already has Overview / Work Orders tabs).
- Client hub w/ phase-gates: `admin-portal/src/screens/watertank/clients/ClientDashboard.jsx` (the SOP gate logic to reuse).
- Assessment: `admin-portal/src/screens/watertank/AssessmentForm.jsx` (7 steps, `photos`/`photos_after`).
- Shared vocab/helpers: `admin-portal/src/screens/watertank/common.jsx` (`svcProfile`, `svcBase`, `useSvcNav`, etc.).
- Backend ops: `backend/controllers/waterTankOps.controller.js` (`/wt-ops/dashboard`, `/wt-ops/work-queue`, `/wt-ops/assessment-reference`), scoped by `serviceScope(req)`.

---

## 3. The design (5 workstreams)

### A. Job Cockpit (project-anchored) — the core

**What:** one page that works a whole job from a **stage rail** instead of hopping registers.

**Stage rail (manifest-configurable order):**
`Lead/Request → Site Assessment → Quotation → Agreement → Work Order(s) → Delivery & Verify → Invoicing → Complete`
- Each stage renders a **status pill** (Not started / In progress / Done / Blocked), a one-line **summary** (e.g. "Q-1067 · ৳45,000 · approved"), and a **primary next-action button**.
- Next-action buttons **deep-link into the existing screens** (assessment form, quote builder, agreement, WO detail, invoice editor) and return to the cockpit — reusing all working forms; nothing re-embedded.
- Below the rail: the current-stage detail + the job's **Work Orders**, **Invoices**, **Documents**, **Reports/Warranty** as compact panels (reuse existing components/tabs from ProjectDetail).

**Anchor & the two entry states:**
- **Pre-project (lead):** a Service Request with no project yet shows the same rail in a "lightweight" state (Request done; Assessment/Quote pending). This lives on the request or a thin cockpit view.
- **Project exists:** once a quotation is approved a Project is created (today's `ensureProject`), and the cockpit *is* the Project — the same rail, now backed by the project. Repeat work orders stack as multiple entries under the Work Order stage (already supported).
- Handoff point: quote-approval / project creation is the moment the lightweight cockpit "becomes" the project cockpit. Keep one visual, two data states.

**Backend:** ONE new **read-only aggregation endpoint**, e.g. `GET /wt-ops/job/:ref` (ref = project code, or request code for leads), scoped by `serviceScope(req)`. It assembles the job graph from existing tables (request, assessment, quote, agreement/envelope, work orders, invoices, reports, warranty) and returns `{ stages: [{key,label,status,summary,next_action:{label,route}}], panels: {...} }`. The **stage list + next-action rules come from the service manifest** so every line gets the right vocabulary/order. No new tables.

**Frontend:** enhance `ProjectDetail.jsx` into the cockpit (add the stage rail as the header; keep existing tabs as the panels), + a slim cockpit view for leads. New shared component `<StageRail>` driven by the endpoint. Entry points: dashboard funnel, the (new) Pipeline list, client page, and every register row ("Open job").

**Why it's smooth:** the operator opens one page per job, sees the whole lifecycle, and every action is one click from there. Registers become "browse all X" rather than the primary way to move work.

---

### B. Before / After assessment split

**What:** stop mixing the pre-work survey and the post-work verification in one form.

- **Before — Site Assessment (survey):** the existing assessment, trimmed to pre-work steps (visit, profile, safety, quality/condition, risks & scope, **before photos**, sign-off-to-quote). This is the input to the quotation. Stage = "Site Assessment" on the rail.
- **After — Completion Verification:** a distinct record captured at the WO "verify" step (`POST /verify` already exists with site_cleaned/reports_submitted/photos_collected/client_satisfied). Give it its own light form: **after photos**, checklist outcomes, before/after photo pairing, client sign-off, warranty trigger. Stage = "Delivery & Verify" on the rail.
- **Link them:** the completion verification references the assessment so the cockpit can show a true **Before → After** comparison (photos side by side, condition vs outcome).

**Backend:** additive columns/flags or a small `wt_completion_verifications` record keyed to the work order (mirrors the loan-tracker/verification-register module pattern from the Doc-Verification lines). Reuse the assessment reference (`assess_checks` etc.) from the manifest so "after" checks speak each line's vocabulary. No change to the existing assessment table beyond clarifying which fields are "before."

**Frontend:** `AssessmentForm.jsx` loses the after/verification concerns; a new compact `CompletionVerification` panel/modal appears at the verify step and in the cockpit's Delivery stage. A **Before/After photo compare** component is shared.

**Why:** matches how the work actually happens (survey first, verify last), and the cockpit gets a clean before/after story.

---

### C. Next-action chips + "Needs you" work queue

**What:** surface "what to do next" everywhere, powered by the same stage/next-action logic as the cockpit.

- **Row chips:** every register list row (clients, requests, assessments, quotes, WOs, invoices) shows a small **next-action chip** (e.g. "Send quote", "Assign provider", "Verify completion", "Raise invoice") that deep-links to the action. Same rule engine as the cockpit rail — one source of truth.
- **Work queue:** promote the existing `/wt-ops/work-queue` into a first-class **"Needs you"** screen (and a dashboard card): jobs grouped by required action, oldest first, one-click in. It already exists in the backend; this makes it prominent and action-oriented.
- Dashboard funnel stages already deep-link; add the next-action chip treatment there too.

**Backend:** extract the "given a job's records, what is the next action" logic into a shared helper (used by `/wt-ops/job/:ref`, `/wt-ops/work-queue`, and list endpoints). Manifest-driven per line.

**Why:** removes the "which job needs me and what do I do" guesswork that makes the console feel heavy.

---

### D. Slimmer, task-oriented sidebar

**What:** restructure `WATER_TANK_NAV` (and therefore every line's rebased nav) from 22 equal-weight items into a lead-with-the-pipeline shape. Proposed groups:

1. **Work** — Dashboard, **Pipeline (Jobs)** ← new cockpit list, **Needs you** (work queue), Calendar.
2. **Clients & Intake** — Clients, Service Requests, Site Assessments, Quotations. *(+ Doc Manager on Doc-Verification lines.)*
3. **Delivery** — Projects, Work Orders, Agreements, AMC. *(+ the line's bespoke module: Loan Applications / Verifications / Beneficiaries.)*
4. **Finance** — single **Finance** entry (see E).
5. **Assurance & Admin** *(collapsed by default)* — Service Reports, Warranty & Issues, Complaints, Communication, Providers, Compliance, Price Schedule, Portal Accounts, Settings.

- Keep the per-line injection pattern (Doc Manager, Loan Applications, Verifications, Beneficiaries) exactly as built — just place them in the right group.
- Advanced/admin group collapsed to reduce visual weight; nothing removed.

**Frontend only:** `admin-portal/src/config/consoles.js` (nav definition + the per-line rebase/inject helpers already there). No backend change.

**Why:** the sidebar stops being a wall; the pipeline is the obvious start.

---

### E. One Finance hub

**What:** merge **Invoices / Payments / Disbursements / Reports** into a single **Finance** screen with tabs (Invoices · Payments · Disbursements/Payouts · Reports), preserving each existing screen as a tab panel.

- Reuse the existing screens as panels (`Invoices.jsx`, `Payments.jsx`, disbursement modals, `ServiceReports`/`ReportView`) — a tab shell, not a rewrite.
- Keep deep-links working (the dashboard KPIs that link to `?tab=Overdue` etc. now target Finance tabs).

**Frontend:** one `Finance` shell screen + route; nav collapses four items into one. Backend unchanged.

**Why:** money lives in one place with a clear structure instead of four scattered destinations.

---

## 4. Cross-service mechanics (how it lands on every line)

- **Stage rail order + next-action labels + assessment vocabulary** come from the **service manifest** (`backend/config/serviceLines.js` → each line's `ui`), so Loan/Verification/Succession lines show *their* stages and words, not tank ones.
- The cockpit endpoint and next-action helper are in the **shared `wt-ops` layer**, scoped by `serviceScope(req)`; every line inherits them the moment they ship.
- Nav changes are in the shared `WATER_TANK_NAV` + the existing per-line rebase/inject helpers in `consoles.js`.
- Per-line bespoke modules (Doc Manager, Loan Applications, Verifications, Beneficiaries) slot into the new nav groups unchanged.

---

## 5. Suggested build sequence (each shippable on its own)

1. **Next-action helper + `/wt-ops/job/:ref` endpoint** (backend, read-only) — the shared brain.
2. **`<StageRail>` + Job Cockpit** on ProjectDetail + lightweight lead cockpit + Pipeline list.
3. **Next-action chips** on register rows + **Needs you** work-queue screen (reuse helper).
4. **Slimmer nav** (consoles.js) — low risk, instant "neater" win.
5. **Finance hub** (tab shell over existing screens).
6. **Before/After assessment split** + Completion Verification + before/after compare.

Rationale: 1–2 deliver the primary pain fix; 4 is a quick visible win; 6 is the most self-contained and can land any time.

---

## 6. Non-goals / YAGNI

- No collapsing Request/Quote/Project/WO into one entity (rejected: too risky; that was approach D in brainstorming).
- No re-embedding the big forms into the cockpit (deep-link instead — reuse working screens).
- No new "Job" table/entity (cockpit is a read-model over existing records).
- No destructive migrations; existing routes/screens keep functioning throughout.

---

## 7. Open decisions to confirm before build

1. **Lead cockpit home:** does the pre-project rail live on the Service Request detail, or on a new thin `/jobs/:requestCode` view? (Leaning: reuse Service Request detail to avoid a new screen.)
2. **Completion Verification storage:** extra columns on the work order vs a small `wt_completion_verifications` table. (Leaning: small table, mirrors the bespoke-module pattern; cleanest before/after link.)
3. **"Pipeline (Jobs)" list source:** projects + open leads unioned — confirm the default filters/sort (e.g. "needs action first").
4. **Nav grouping labels** above are a proposal — confirm names/order.
5. Whether the Finance hub should also absorb the AMC billing view or leave AMC under Delivery.

---

*When ready to execute: turn this into an implementation plan (writing-plans) and build in the sequence above. Every change verified per line with the existing `backend/scripts/e2eFullJourney.js <service_line>` harness + admin build.*
