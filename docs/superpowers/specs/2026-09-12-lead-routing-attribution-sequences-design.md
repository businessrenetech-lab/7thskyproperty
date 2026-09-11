# Lead Routing, Attribution & Follow-up Sequences — Design Spec

**Phase 6, sub-project B.** Branch: `air-conditioning/phase-0-duplicate`. Status: approved for planning.

## Goal

Give residential sales three connected capabilities over the existing
`SalesEnquiry` model, built as one slice:

1. **Routing** — new leads are auto-assigned to a sales officer by
   configurable rules, with a global round-robin fallback.
2. **Attribution** — first-touch UTM (source / medium / campaign) is
   captured once at creation and reported by source/campaign.
3. **Follow-up sequences** — a daily scheduler auto-sends staged,
   templated messages on a business-day cadence until the lead advances
   or staff stop it.

## Non-negotiable reuse

This sub-project adds two tables, a few additive enquiry columns, one
service, one scheduler and one admin screen. Everything else is reuse:

- **`MessageTemplate`** (Phase 5 B) — sequence steps reference templates;
  `renderTemplate` fills `{{placeholders}}` from enquiry context.
- **`communication.service`** `sendEmail` / `sendSMS` — the only send
  path; never modified, only called. Respects `do_not_email` /
  `do_not_sms` suppression already wired in Phase 5 B.
- **`utils/businessDays.js`** `addBusinessDays` / `businessDaysBetween` —
  cadence maths (weekdays only).
- **`services/arrearsReminder.scheduler.js`** — the pattern to mirror:
  daily `setInterval(run, 24h)`, idempotent per bucket via a
  `Communication` subject marker, `start<X>Scheduler()` registered in
  `server.js`. No per-step log table is needed.
- **`/api/sales/reports`** (sub-project A) — attribution is one more
  aggregation block on that endpoint + one more card on the Reports page.
- **`controllerHelpers`** — `asyncHandler`, `branchScope`, `pick`,
  `generateCode`, `resolveBranchId`.

## Data model — migration 0115 (additive, guarded, with `down`)

### `sales_enquiries` — new columns
| column | type | notes |
|---|---|---|
| `utm_source` | STRING | first-touch, write-once |
| `utm_medium` | STRING | first-touch, write-once |
| `utm_campaign` | STRING | first-touch, write-once |
| `routing_rule_id` | INTEGER null | which rule assigned it (audit; null = round-robin/manual) |
| `sequence_id` | INTEGER null | active enrollment's sequence |
| `sequence_status` | ENUM(`active`,`paused`,`completed`,`stopped`) null | null = never enrolled |
| `sequence_enrolled_at` | DATETIME null | anchor for business-day offsets |

`source` (the pre-existing free-string channel) is retained and left
untouched; `utm_source` is the marketing attribution source and is
distinct.

### New table `lead_routing_rules`
`id, branch_id, name, priority INT (lower = evaluated first),
match_category STRING null, match_area STRING null, match_source STRING
null` (each null = wildcard), `assign_to INT null` (single officer) **or**
`assign_pool JSON null` (array of user-ids for in-rule round-robin),
`default_sequence_id INT null, active BOOL default true, created_by,
timestamps`. Index `(branch_id, active, priority)`.

### New table `lead_sequences`
`id, branch_id, name, active BOOL default true, steps JSON, created_by,
timestamps`. `steps` = ordered array of
`{ day_offset: <business days from enrollment>, channel: 'email'|'sms',
template_id: <MessageTemplate id> }`. Index `(branch_id, active)`.

Models: `LeadRoutingRule.js`, `LeadSequence.js`, plus the new fields on
`SalesEnquiry.js`. `steps`/`assign_pool` coerced with an `arr()` guard on
read (MySQL returns JSON columns as strings on some rows — the recurring
crash class in this codebase).

## Routing — `services/leadRouting.service.js`

`routeEnquiry(enquiry, { transaction })`:
1. Load active rules for the branch ordered by `priority ASC, id ASC`.
2. First rule where every non-null `match_*` equals the enquiry's field
   wins (category/area matched against the enquiry's property + enquiry
   fields; source against `source`).
3. Target: `assign_to` if set; else least-recently-assigned member of
   `assign_pool`; else (no rule) **global round-robin** — over active
   users with role `sales_executive` in the branch (if none exist, fall
   back to `branch_admin`), picking the one whose most recent
   `sales_enquiries.assigned_officer_id` assignment is oldest (never
   assigned = highest priority). If the pool is empty, leave
   `assigned_officer_id` null (unrouted) rather than error.
4. Set `assigned_officer_id` + `routing_rule_id`. If the matched rule has
   `default_sequence_id`, enroll (see below).

Called from the three intake points **only when the caller did not pass an
`assigned_officer_id`** — a manual pick is never overridden:
- `controllers/salesEnquiry.controller.js` create
- `controllers/publicSales.controller.js`
- `controllers/publicWebsite.controller.js`

Round-robin "least-recently-assigned" is computed with one grouped query
over `sales_enquiries` (max created_at per officer); officers with zero
assignments sort first. No counter column, no lock — good enough for a
single-branch cadence and idempotent under retry.

## Attribution

- `utm_source/medium/campaign` captured at creation. Public intake reads
  them from the request body/query (the website forwards its UTM params);
  the staff enquiry form may set them. **Write-once**: the create path
  sets them; no update path writes them, so first-touch is preserved.
- Add `utm_source/medium/campaign` to the enquiry create whitelist in
  `salesEnquiry.controller` and to the public payload mappers.
- **Reporting**: extend `salesReports.controller.report` with a
  `lead_attribution` block — group `SalesEnquiry` created-in-range by
  `utm_source` + `utm_campaign`, count created vs converted
  (`stage === 'converted'`), compute rate. Surface as a new
  "Lead attribution" card on `SalesReports.jsx`.

## Sequence scheduler — `services/leadSequence.scheduler.js`

Mirrors `arrearsReminder.scheduler.js`.

- `enrollEnquiry(enquiry, sequenceId, { transaction })` — sets
  `sequence_id`, `sequence_status='active'`, `sequence_enrolled_at=now`.
  No-op if already enrolled/active.
- `runLeadSequences({ enquiry_id = null } = {})` — the daily job:
  - Select enquiries with `sequence_status='active'` (optionally one).
  - For each, load its sequence's `steps`. For every step whose
    `addBusinessDays(sequence_enrolled_at, day_offset) <= today`:
    - Skip if a `Communication` with subject marker `[SEQ:<seqId>:<idx>]`
      already exists for `entity_type='sales_enquiry', entity_id=enq.id`
      (idempotency — no step-log table).
    - Render the step's template and send through `communication.service`
      via the same dispatch helper the sales inbox uses (suppression +
      delivery_status persisted). The marker is embedded in the recorded
      Communication subject.
  - **Auto-stop** to `completed` when the last step's marker exists;
    **stop** (leave state, don't send) when the enquiry's `stage` is past
    `viewing_scheduled` (i.e. `viewed`/`offer_made`/`converted`/`rejected`)
    → set `sequence_status='completed'`.
- `startLeadSequenceScheduler()` — `setInterval(run, 24h)`, registered in
  `server.js` beside the arrears/tenancy schedulers, inside the same
  guarded try/catch.

### Endpoints (in `sales.routes.js`, sub-routes of `/api/sales`)
- `GET  /api/sales/lead-rules` / `POST` / `PUT /:id` / `DELETE /:id` — rule CRUD (ADMIN).
- `GET  /api/sales/lead-sequences` / `POST` / `PUT /:id` / `DELETE /:id` — sequence CRUD (ADMIN).
- `POST /api/sales/enquiries/:id/sequence/pause` | `/resume` | `/stop` (PREPARE).
- `POST /api/sales/enquiries/:id/sequence/enroll` (PREPARE) — manual enroll.

Controller: `leadAutomation.controller.js` (rules + sequences CRUD +
enrollment actions). Routing + scheduler logic live in their services;
the controller is thin.

## UI

- **Lead Automation** admin screen (`admin-portal/src/screens/sales/LeadAutomation.jsx`),
  route `/residential/lead-automation`, nav under the residential Home
  group. Two panels:
  - *Routing rules* — table (priority, match, target, sequence, active)
    + add/edit drawer.
  - *Sequences* — table + a step editor (add/remove rows: day_offset,
    channel, template picker over `MessageTemplate`).
- **Enquiry / inbox** — show `utm_source` + `utm_campaign` badges and a
  sequence-status chip (`active`/`paused`/`completed`/`stopped`) with
  pause / resume / stop buttons calling the new endpoints.
- **Reports page** — the "Lead attribution" card.

Route registered in `App.jsx`; nav item in `config/consoles.js`. No new
top-level mount (all endpoints are sub-routes of the already-mounted
`/api/sales`), so `manifest.js` needs no change.

## Testing & verification

- **Unit** (wired into `npm test`, mirroring the Phase-5 idempotency
  test): `scripts/testLeadAutomation.js` — (a) `routeEnquiry` picks the
  rule target, falls back to round-robin, and never overrides an explicit
  officer; (b) `runLeadSequences` sends a due step once and is a no-op on
  re-run (marker idempotency); (c) advancing the stage stops the sequence;
  (d) a `do_not_email` contact is suppressed, not sent.
- **Harnesses stay green**: `npm test` (7+5+27 → +1 suite) and
  `test:full` (28/0) must both pass.
- **Live QA** (browser + authenticated API, cleaned up after): create a
  website enquiry with UTM params → routed + enrolled; run the scheduler
  once → step-0 message recorded with marker + delivery_status; re-run →
  0 new; attribution card shows the source/campaign; pause/stop from the
  inbox works. Delete all seeded test data.
- **Non-regression**: `git diff --stat` shows only additive files;
  `communication.service`, the rental inbox, and the settlement/signing
  engines untouched (empty diff).

## Global constraints

- MySQL via sequelize-cli migrations only — **no `sync()`**. Migration is
  additive, guarded by `describeTable`, with a working `down`.
- Coerce JSON columns (`steps`, `assign_pool`) with `arr()` on read.
- Routing never overrides an explicitly supplied officer.
- Attribution is write-once (first-touch).
- The scheduler is idempotent per step via the Communication marker.
- File-field UI (none expected here) would use `UploadButton`, never a
  URL/text field.
- Update BOTH `server.js` and `manifest.js` for any **new** top-level
  route mount (none here — sub-routes only).
- Append an `AGENT_WORK_LOG.md` COMPLETED entry; rebuild `admin-portal`
  dist before finishing.

## Deferred (out of scope)

Multi-touch attribution path/history, lead scoring, A/B sequence testing,
inbound-reply auto-pause, WhatsApp channel, cross-branch routing.
