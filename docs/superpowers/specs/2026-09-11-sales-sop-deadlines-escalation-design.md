# Sales SOP — Deadlines + Escalation — design spec

**Date:** 2026-09-11 · **Branch:** `air-conditioning/phase-0-duplicate` (not merged)
**Plan:** `PROPERTY_SALES_SAAS_PHASED_PLAN.md` §5 (SOP deadlines/escalation), Phase 3.
**Status:** design approved in brainstorming; awaiting spec review before the implementation plan.

**Phase 3 sub-project 4, layer 3 of 3 (final SOP layer).** Give each SOP stage a
business-day deadline and surface overdue/escalation live wherever staff work —
the property-file Workflow section, the sales Work Queue, and the property-file
next-action bar. Builds on layer 1 (SOP project + Workflow section) and layer 2
(progressive unlock). No new schedulers, no schema change.

Checked against live source 2026-09-11. `ProjectStage.due_date` (DATEONLY)
exists and is accepted by `updateStage` but is never auto-set. No business-day
helper exists (only scattered calendar-day `addDays`); no holiday calendar. The
sales `workQueue` builds an `items[]` list and filters by role; the property
file already shows a next-action bar with a blockers count.

---

## 1. Goal

When a SOP stage becomes active (`in_progress`), it gets a `due_date` = its
start plus a per-phase SLA in **business days** (weekdays only). Everywhere the
stage is shown, staff see its due date and a live status tier — **on_track /
due_soon / overdue / escalated** — computed from the due date versus today. The
Work Queue lists overdue stages as actionable items, and the property-file
next-action bar shows an overdue count.

## 2. Scope

**In:**
- A small business-day helper: `addBusinessDays(date, n)` and
  `businessDaysBetween(from, to)` (Mon–Fri; no holiday calendar).
- Per-phase SLA config (business days) in `progressiveSop.service`, per vertical.
- Auto-set `ProjectStage.due_date` when a stage enters `in_progress` — at seed
  (the first engagement stage), on unlock (`unlockForEvent` promotes the first
  pending stage), and on advance (`updateStage` promotes the next stage). Never
  overwrite an existing `due_date` (staff edits win).
- A pure `stageDeadline(stage)` deriver → `{ due_date, days_overdue, tier }`
  where tier ∈ on_track/due_soon/overdue/escalated.
- Surface: SOP `hydrate` adds the deriver's fields per stage (both
  `project.controller` and `salesSop.controller`); the Workflow section shows
  due date + a colored tier badge; `workQueue` adds an overdue-SOP-stage group;
  the property-file next-action bar shows an overdue-stage count.

**Out (deferred / non-goals):**
- Schedulers / push notifications (compute-on-read only; nothing is wired to
  notify for sales SOP).
- Holiday calendar (weekdays only; a holiday table can come later).
- Deals-board per-card overdue badge (board is keyed to PropertyDeal, needs an
  extra SOP lookup — out of scope this layer).
- Rental/leasing deadlines (this layer configures `properties_sale` only; the
  helper is generic but leasing SLAs are not defined here).
- Any money/settlement change.

## 3. Business-day helper

New `backend/utils/businessDays.js` (pure, no deps):
- `addBusinessDays(date, n)` → a new `Date` advanced by `n` weekdays (skips
  Sat/Sun). `n=0` returns the same day. Only positive `n` is used here.
- `businessDaysBetween(from, to)` → integer count of weekdays strictly after
  `from` up to and including `to` (negative if `to` is before `from`). Used to
  compute `days_overdue` (how many business days past due today is).
- Dates normalised to date-only (midnight) to avoid time-of-day drift.

## 4. SLA config (progressiveSop.service)

Per vertical, per phase, business-day SLA measured from when the stage starts:
```js
const SALE_PHASE_SLA = {   // business days
  engagement: 3,   // first engagement stage: quick first-response/consultation
  marketing: 7,
  offer: 3,
  settlement: 14,
  closure: 7,
};
```
Registry entry gains `phaseSla` (leasing: none for now → no deadlines set for
rental, preserving current behavior). New export
`slaBusinessDaysFor(stageKey, vertical)` → number|null (null = no SLA → no
due_date auto-set). This keeps deadlines opt-in per vertical and leaves rental
untouched.

## 5. Setting due_date (when a stage becomes in_progress)

A stage's `due_date` is stamped the moment it first becomes `in_progress`,
only if it has no `due_date` yet and its phase has an SLA:
`due_date = addBusinessDays(today, slaBusinessDaysFor(stage_key, vertical))`.

Three call sites (all already set a stage to `in_progress`):
- **Seed** — `workflowProject.createProjectFromTemplate`: when a stage is created
  with `status:'in_progress'` (the first non-blocked stage), also set its
  `due_date` from the SLA.
- **Unlock** — `progressiveSop.unlockForEvent`: where it promotes the first
  pending stage to `in_progress`, set its `due_date`.
- **Advance** — `project.controller.updateStage`: where it promotes `next` from
  `pending`→`in_progress`, set `next.due_date` (only if empty and SLA exists).

A tiny shared helper `applyStageDueDate(stage, vertical)` (in
`progressiveSop.service` or `workflowProject.service`) does the "if empty and
SLA exists, set it" logic so all three sites are identical. Staff-set due dates
via `updateStage {due_date}` are respected (never overwritten).

## 6. Deriving status (compute-on-read)

Pure `stageDeadline(stage, today = new Date())` (in `progressiveSop.service`,
exported), used by hydrate/queue:
```
if !due_date OR status in (done, skipped, blocked): tier = 'on_track', days_overdue = 0
else:
  d = businessDaysBetween(today, due_date)   // >0 = days remaining, <=0 = overdue/at-due
  days_overdue = max(0, -d)
  tier = d >= 2 ? 'on_track'
       : d >= 0 ? 'due_soon'                 // due today or in 1 business day
       : days_overdue >= sla ? 'escalated'    // past due by ≥ one full SLA again
       : 'overdue'
returns { due_date, days_overdue, tier }
```
Blocked/done/skipped stages never show a deadline tier (they aren't actively
being worked). `escalated` needs the stage's phase SLA (via
`slaBusinessDaysFor`).

## 7. Surfacing

- **SOP payload** — both `hydrate`s add `{ due_date, days_overdue, deadline_tier }`
  per stage (reusing `stageDeadline`). Blocked stages already carry
  `locked/unlock_hint` from layer 2; these are additive.
- **Workflow section** (`SalesPropertyFile.jsx`) — for an active
  (`pending`/`in_progress`) stage, show the due date and a colored tier badge:
  on_track (muted), due_soon (amber), overdue (red), escalated (red, bold "Escalated").
  Blocked/done stages unchanged.
- **Work Queue** (`workQueue`) — after the settlement/offer scan, load the
  `properties_sale` SOP projects for the in-scope properties, run `stageDeadline`
  on each active stage, and `push('prepare', 'sop_overdue', 'Overdue SOP stage
  "<name>" for <property>', row, { tier, days_overdue })` for overdue/escalated
  stages. Role `prepare` (sales/PM own SOP work). One query
  (`Project.findAll {property_id in …, vertical_key:'properties_sale'}` +
  stages).
- **Property-file next-action bar** — the property file already fetches the SOP
  in the Workflow section; extend so the file computes an overdue count from
  `sop.stages` (tier in overdue/escalated) and shows a small "N SOP overdue"
  chip on the next-action bar (only when > 0). No extra fetch beyond the existing
  SOP load; if the SOP isn't loaded yet, show nothing.

## 8. Testing & verification

- **Business-day helper (unit):** a small node assert script —
  `addBusinessDays(Fri, 1)` = Mon; `addBusinessDays(Mon, 5)` = next Mon;
  `businessDaysBetween(Mon, sameFri)` = 4; weekend endpoints handled. Add to the
  repo as `backend/scripts/testBusinessDays.js` and wire into `npm test`'s
  chain (like the settlement calc test) OR run standalone and paste output.
- **due_date set (live):** `POST …/sop` on a fresh sale property → the first
  engagement stage has a `due_date` = 3 business days out; later stages (blocked)
  have none. Approve assessment (layer-2 unlock) → the newly in_progress marketing
  stage gets a `due_date` = 7 business days out.
- **Tier derivation (unit/live):** back-date a stage's `due_date` and confirm
  `stageDeadline` returns overdue then escalated past a full SLA.
- **Surfacing:** Workflow section shows due date + tier badge; Work Queue lists an
  overdue SOP stage after back-dating; property-file bar shows the overdue count.
- **Non-regression:** rental projects get no `due_date` (leasing has no SLA) and
  behave exactly as before; `npm test` (27/0 + the new helper test) and
  `npm run test:full` (28/0) green; build clean.
- **Acceptance:** active SOP stages carry a business-day deadline + live tier;
  overdue/escalated stages appear in the Workflow badge, Work Queue, and property
  bar; rental unaffected; no schema/money change.

## 9. File plan

**Backend (new):**
- `backend/utils/businessDays.js` — `addBusinessDays`, `businessDaysBetween`.
- `backend/scripts/testBusinessDays.js` — helper unit checks.

**Backend (modify):**
- `backend/services/progressiveSop.service.js` — `SALE_PHASE_SLA`, registry
  `phaseSla`, `slaBusinessDaysFor`, `applyStageDueDate`, `stageDeadline`; set
  due_date in `unlockForEvent`'s promotion.
- `backend/services/workflowProject.service.js` — set due_date on the seeded
  first in_progress stage.
- `backend/controllers/project.controller.js` — set due_date on advance
  (`updateStage`); `hydrate` adds deadline fields.
- `backend/controllers/salesSop.controller.js` — `hydrate` adds deadline fields.
- `backend/controllers/sales.controller.js` — `workQueue` overdue-SOP group.

**Frontend (modify):**
- `admin-portal/src/screens/sales/SalesPropertyFile.jsx` — due date + tier badge
  in the Workflow section; overdue chip on the next-action bar.
- `admin-portal/src/screens/sales/SalesWorkQueue.jsx` — render the new
  `sop_overdue` kind (label + tier).

**Schema / migrations:** none (reuses `ProjectStage.due_date`).

## 10. Risks & non-goals

- **Rental safety.** Leasing has no `phaseSla` → `slaBusinessDaysFor` returns
  null → no due_date set, no tier shown → rental behaves exactly as today. The
  helper and derivers are generic but only sale is configured.
- **Timezone / date-only.** All math is date-only (midnight-normalised) to avoid
  off-by-one from time-of-day; `businessDaysBetween` is the single source.
- **Staff-set dates preserved.** `applyStageDueDate` only sets when empty; a
  manual `updateStage {due_date}` always wins.
- **Compute-on-read cost.** `stageDeadline` is pure arithmetic over already-loaded
  stages; the Work Queue adds one `Project`+stages query for in-scope sale
  properties.
- **Non-goals:** schedulers/notifications, holiday calendar, deals-board badge,
  rental SLAs, money changes.
