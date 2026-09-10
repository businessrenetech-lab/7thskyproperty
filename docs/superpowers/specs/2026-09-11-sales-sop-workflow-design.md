# Sales SOP Workflow — create + link + surface — design spec

**Date:** 2026-09-11 · **Branch:** `air-conditioning/phase-0-duplicate` (not merged)
**Plan:** `PROPERTY_SALES_SAAS_PHASED_PLAN.md` §5 (8/10 SOP stages), Phase 3.
**Status:** design approved in brainstorming; awaiting spec review before the implementation plan.

**Phase 3 sub-project 4, layer 1 of 3.** Give a sale property its SOP stage-gate
workflow by reusing the existing Project engine: find-or-create a SOP `Project`
linked to the property, seeded from a workflow template, and surface its
stages + checklists (with evidence) on the property file. Progressive
lifecycle-event unlock (layer 2) and business-day deadlines + escalation
(layer 3) are separate follow-up sub-projects.

Checked against live source 2026-09-11. A generic engine already exists:
`Project` + `ProjectStage` (status/assignee/due_date/checklist JSON/
required_documents JSON), `workflow_templates` (per-vertical ordered stages),
`project.controller` `create` (seeds stages from a template) and `updateStage`
(advance + tick checklist + advance current stage). The `properties` vertical is
the 10-stage **buyer purchase** SOP; there is **no seller-sale** template yet,
and nothing in the sales flow creates/links a SOP project.

---

## 1. Goal

When staff open a sale property's file, they see its SOP workflow — the sale's
ordered stages, each with its checklist and required documents — and can work it
(advance a stage, tick items, attach evidence) using the existing project engine.
The workflow is created once per property and linked to it, from a seeded
seller-sale template.

## 2. Scope

**In:**
- A seller-sale workflow template (`vertical_key = 'properties_sale'`, the plan's
  10-stage sale SOP), inserted idempotently via migration `0107` (and mirrored in
  the seeder for parity).
- A thin sales-SOP endpoint that **find-or-creates** the SOP Project for a
  property (linked by `property_id`, vertical `properties_sale`) and returns its
  stages+checklists.
- A "Workflow / SOP" section on the property file showing the stages, statuses,
  checklists, required docs, and per-stage actions — reusing the existing
  `PATCH /projects/:id/stages/:stageId` (advance / tick / evidence).

**Out (deferred / non-goals):**
- Progressive unlock from sale lifecycle events (offer accepted, settlement
  locked…) → layer 2. Here, stages seed with the engine's default (first
  in_progress, rest pending) — no `blocked` gating yet.
- Business-day deadlines, overdue detection, escalation → layer 3.
- Buyer-purchase SOP surfacing (buy deals / mandates reuse `properties`) — later.
- Any money/settlement change; no change to the project engine itself.

## 3. Data / template (migration 0107)

Insert one `workflow_templates` row (idempotent — delete-then-insert for the
vertical, matching the seeder), `vertical_key = 'properties_sale'`, name
"Residential Sale SOP", `stages` = the 10 sale stages (plan §5), each
`{ key: slug(name), name, order, gate: true, checklist: [{label, required}], required_docs: [] }`:

1. Enquiry & Consultation — seller/property/source captured; consultation; Phase-1 quotation/agreement; inspection scheduled.
2. Inspection & Assessment — condition report, photos, preparation recommendations; CMA as applicable.
3. Documents & Risk — deed, mutation, taxes, utilities, succession/approvals; seller indemnity; minimum estimated value; risk decision.
4. Agreement & Phase-2 Approval — selected scope, commission, exclusivity, dates, approved phase & payment schedule; staff assigned.
5. Preparation — approved quote, supplier assignment, work evidence/completion; or explicit not-required.
6. Marketing & Listing — approved copy/media/pricing, publish locations, campaign refs; listing activation.
7. Buyer Enquiries & Inspections — routed enquiries, screening, viewing calendar, feedback, seller updates.
8. Offers & Negotiation — offer comparison, written approval, price-limit exception, versioned counters.
9. Agreement & Settlement — contract/registration/payment/possession milestones; fee collection + payout evidence.
10. Closure & Post-Sale — handover pack, closing statement, feedback, archive, follow-up, resolved exceptions.

`down` deletes the `properties_sale` template row. No table changes.

## 4. Backend — find-or-create + read

`backend/controllers/salesSop.controller.js` (or add to `sales.controller.js`),
routes under `/api/sales`, `roleMiddleware(READ/PREPARE)` consistent with the
other sales routes, branch-scoped.

- `GET /sales/properties/:propertyId/sop` → the property's SOP project with
  stages (hydrated like `project.controller` does). If none exists yet, returns
  `{ data: null }` (the UI shows a "Start SOP workflow" action) — read does not
  auto-create.
- `POST /sales/properties/:propertyId/sop` → **find-or-create**: if a Project
  with `property_id` + `vertical_key='properties_sale'` exists, return it;
  else create it (reusing the exact template-seeding logic from
  `project.controller.create` — extract that into a shared
  `createProjectFromTemplate({ branch_id, vertical_key, property_id, title, actorId })`
  helper so both call sites share one implementation), titled
  `SOP · <property_code>`, linked `property_id`, and return it hydrated.
- Stage work reuses the existing `PATCH /api/projects/:id/stages/:stageId`
  (updateStage) — no new stage endpoint. The UI calls it directly with the
  project id from the SOP payload.

No new gate logic (that's layers 2–3); this only creates/links/reads.

## 5. Frontend — property-file Workflow / SOP section

`SalesPropertyFile.jsx`: the existing `SECTIONS` already has an `onboarding` and
sections list — add a **"Workflow"** section (or reuse a suitable existing tab)
that:
- On open, `GET /sales/properties/:id/sop`. If null, show an empty state with a
  **"Start SOP workflow"** button → `POST …/sop` then render.
- Render the stages in order: stage name, status badge, assignee, and a
  checklist (each item: label, required flag, a done checkbox, and — where
  `evidence_required` — an **upload button** (the minimalist `UploadButton`, per
  the standing preference) writing to the checklist item's `evidence_url`).
- Per-stage actions via `PATCH /projects/:projectId/stages/:stageId`: mark
  in_progress/done (advancing handled server-side), save checklist, set
  assignee/due_date, notes. Reuse `ui/kit`.
- Read-only display of `required_documents`.
- Responsive; confined to the new section (no monolith restructure).

## 6. Testing & verification

- **No money/engine regression:** backend `npm test` (27/0) + `npm run test:full`
  (28/0) stay green (additive). `admin-portal npm run build` clean.
- **Migration:** `db:migrate` applies 0107; `SELECT` shows the `properties_sale`
  template with 10 stages; `down` removes it.
- **Endpoint checks (live):** `GET …/sop` on a fresh property → `{data:null}`;
  `POST …/sop` → a Project with 10 `properties_sale` stages (first in_progress),
  linked `property_id`; a second `POST` returns the same project (find-or-create,
  no duplicate); `PATCH /projects/:id/stages/:stageId {status:'done'}` advances
  the next stage.
- **Browser:** on a sale property, open Workflow → Start → the 10 stages render;
  tick a checklist item + attach evidence; mark a stage done → next becomes
  in_progress; reload persists.
- **Acceptance:** exactly one SOP project per property; stages/checklists from the
  template; advancement + evidence work via the existing engine.

## 7. File plan

**Backend (new):**
- `backend/migrations/0107-sales-sop-template.js`
- `backend/controllers/salesSop.controller.js` (+ shared `createProjectFromTemplate` helper — extract from `project.controller.create`, place in a small `services/workflowProject.service.js` and use in both).
- route entries in `backend/routes/sales.routes.js`.

**Backend (modify):**
- `backend/controllers/project.controller.js` — use the shared helper in `create` (no behavior change).
- `backend/seeders/0002-workflows.js` — add the `properties_sale` vertical for parity (data only).

**Frontend (modify):**
- `admin-portal/src/screens/sales/SalesPropertyFile.jsx` — the Workflow/SOP section.

**Schema:** migration 0107 inserts a template row; no table change.

## 8. Risks & non-goals

- **Reuse, not reinvent.** The engine + `updateStage` are untouched; we add a
  seller template, a find-or-create wrapper, and a UI section. Extracting
  `createProjectFromTemplate` is a refactor with identical behavior (covered by
  reusing it in the existing `create`).
- **One project per property.** Find-or-create keys on `property_id` +
  `vertical_key`; a unique-ish guard (query before create in a transaction)
  prevents duplicates under double-click.
- **Property file is large** — confine to the new section.
- **Non-goal:** progressive unlock, deadlines/escalation, buyer-side SOP,
  money changes.
