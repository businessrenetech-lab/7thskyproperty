# Lead Routing, Attribution & Follow-up Sequences Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Auto-route new sales leads to officers by rule (round-robin fallback), capture first-touch UTM attribution, and auto-send business-day-cadenced follow-up sequences — one slice over `SalesEnquiry`.

**Architecture:** Additive migration (2 tables + enquiry columns); a routing service called at the three intake points; a daily sequence scheduler mirroring `arrearsReminder`; attribution as one more block on the existing reports endpoint; a thin CRUD controller; one admin screen + inbox chips.

**Tech Stack:** Node/Express/Sequelize (MySQL, sequelize-cli migrations), React 18 + Vite. Reuses `MessageTemplate`, `communication.service`, `businessDays`, the scheduler pattern, and `/api/sales/reports`.

**Spec:** `docs/superpowers/specs/2026-09-12-lead-routing-attribution-sequences-design.md`

## Global Constraints

- MySQL via sequelize-cli migrations only — **no `sync()`**; migration additive, guarded by `describeTable`, with a working `down`.
- Coerce JSON columns (`steps`, `assign_pool`) with `arr()` on read.
- Routing never overrides an explicitly supplied `assigned_officer_id`.
- Attribution UTM fields are write-once (first-touch): set on create only.
- Scheduler idempotent per step via a `Communication` subject marker `[SEQ:<seqId>:<idx>]`.
- All endpoints are sub-routes of the already-mounted `/api/sales` — no `server.js`/`manifest.js` mount change (scheduler registration in `server.js` is separate).
- Keep `npm test` (→ 7+5+27+new) and `test:full` (28) green.
- Append `AGENT_WORK_LOG.md` COMPLETED entry; rebuild `admin-portal` dist before finishing.

---

### Task 1: Migration 0115 + models

**Files:**
- Create: `backend/migrations/0115-lead-routing-attribution-sequences.js`
- Create: `backend/models/LeadRoutingRule.js`, `backend/models/LeadSequence.js`
- Modify: `backend/models/SalesEnquiry.js` (new fields + associations)

**Interfaces:**
- Produces: tables `lead_routing_rules`, `lead_sequences`; `SalesEnquiry` fields `utm_source/medium/campaign, routing_rule_id, sequence_id, sequence_status, sequence_enrolled_at`.

- [ ] **Step 1: Write the migration** (guarded `describeTable` for the enquiry columns; `createTable` for the two tables; full `down`). Columns exactly per spec. `lead_routing_rules` index `(branch_id, active, priority)`; `lead_sequences` index `(branch_id, active)`.
- [ ] **Step 2: Run it** — `cd backend && npx sequelize-cli db:migrate`. Expected: 0115 applied, no error.
- [ ] **Step 3: Write the two models + add SalesEnquiry fields.** `sequence_status` ENUM(`active`,`paused`,`completed`,`stopped`) allowNull. JSON columns `steps`, `assign_pool`.
- [ ] **Step 4: Load-check** — `node -e "require('./models/LeadRoutingRule');require('./models/LeadSequence');require('./models/SalesEnquiry');console.log('ok')"` in `backend`. Expected: `ok`.
- [ ] **Step 5: Commit** — `feat(lead-automation): migration 0115 + rule/sequence models + enquiry fields`.

---

### Task 2: Routing service + intake wiring + routing unit test

**Files:**
- Create: `backend/services/leadRouting.service.js`
- Modify: `backend/controllers/salesEnquiry.controller.js`, `backend/controllers/publicSales.controller.js`, `backend/controllers/publicWebsite.controller.js`
- Create: `backend/scripts/testLeadAutomation.js` (routing cases first)

**Interfaces:**
- Produces: `routeEnquiry(enquiry, { transaction } = {})` → mutates+saves `assigned_officer_id` + `routing_rule_id`, returns the enquiry; `enrollEnquiry` is Task 4 (import lazily to avoid cycle, or keep enrollment call in the controller after routing).
- Consumes: `LeadRoutingRule`, `SalesEnquiry`, `User`, `businessDays` not needed here.

- [ ] **Step 1: Write `leadRouting.service.js`.** `pickRoundRobin(branchId, {transaction})` — grouped query `SELECT assigned_officer_id, MAX(created_at) FROM sales_enquiries WHERE branch_id=? GROUP BY assigned_officer_id`, join against active `sales_executive` users (fallback `branch_admin`); return the user id never-assigned-first then oldest-assignment; null if pool empty. `matchRule(enquiry, rules)` — first active rule (priority asc) where each non-null `match_category/area/source` equals the enquiry's value. `routeEnquiry` — if `enquiry.assigned_officer_id` already set, return as-is (no override); else match rule → target (`assign_to` or LRA over `assign_pool`) or round-robin; set fields; save.
- [ ] **Step 2: Wire the three intake points** — after building the enquiry (or right after create), call `routeEnquiry` only when no officer was supplied. Public controllers always route. Keep inside the existing transaction where one exists.
- [ ] **Step 3: Write routing tests** in `testLeadAutomation.js`: rule match assigns rule target; no rule → round-robin picks a valid officer; explicit officer is preserved (not overridden). Use a throwaway branch's data or mock rows; clean up created rows.
- [ ] **Step 4: Run** — `node scripts/testLeadAutomation.js`. Expected: routing assertions PASS.
- [ ] **Step 5: Commit** — `feat(lead-automation): rule + round-robin routing service wired into intake`.

---

### Task 3: Attribution capture + reports block + Reports card

**Files:**
- Modify: `backend/controllers/salesEnquiry.controller.js` (create whitelist), `backend/controllers/publicSales.controller.js`, `backend/controllers/publicWebsite.controller.js` (read utm from payload/query)
- Modify: `backend/controllers/salesReports.controller.js` (`lead_attribution` block)
- Modify: `admin-portal/src/screens/sales/SalesReports.jsx` (attribution card)

**Interfaces:**
- Consumes: `SalesEnquiry.utm_*`.
- Produces: reports payload gains `lead_attribution: { rows: [{ source, campaign, created, converted, rate }], ... }`.

- [ ] **Step 1: Capture UTM on create** — add `utm_source/medium/campaign` to the enquiry create whitelist; public controllers pull them from `req.body`/`req.query` (`utm_source` etc.). Write-once: only create sets them.
- [ ] **Step 2: Add `lead_attribution` to `report`** — group `enquiries` created-in-range by `utm_source||'(none)'` + `utm_campaign||'(none)'`; count created + converted (`stage==='converted'`); `rate = round(converted/created*100)`. Sort by created desc.
- [ ] **Step 3: Add the card** to `SalesReports.jsx` — a `Table` (Source, Campaign, Leads, Converted, Rate%).
- [ ] **Step 4: Verify** — `cd admin-portal && npm run build` (clean); browser `/residential/reports` shows the card without console errors (covered in Task 8 QA). Backend: `node -e` smoke of the report handler not required — covered by live QA.
- [ ] **Step 5: Commit** — `feat(lead-automation): first-touch UTM capture + attribution report card`.

---

### Task 4: Sequence scheduler + enrollment + sequence endpoints + tests

**Files:**
- Create: `backend/services/leadSequence.scheduler.js`
- Modify: `backend/server.js` (register `startLeadSequenceScheduler` beside the others, guarded)
- Modify: `backend/scripts/testLeadAutomation.js` (sequence cases)

**Interfaces:**
- Produces: `enrollEnquiry(enquiry, sequenceId, {transaction})`, `runLeadSequences({enquiry_id})`, `startLeadSequenceScheduler()`.
- Consumes: `LeadSequence`, `MessageTemplate`, `communication.service` dispatch, `businessDays.addBusinessDays`, `Communication`.

- [ ] **Step 1: Write the scheduler.** `enrollEnquiry` sets `sequence_id/status=active/enrolled_at` (no-op if active). `runLeadSequences` — for each active enrollment, for each due step (`addBusinessDays(enrolled_at, day_offset) <= today`), skip if marker comm exists (`entity_type='sales_enquiry', entity_id, subject LIKE '%[SEQ:<seq>:<idx>]%'`), else render template + send via the same dispatch path used by the sales inbox (reuse the helper — extract `dispatchAndRecord` from `salesInbox.controller` into a small shared util if not already reusable; otherwise call `communication.service` + record a Communication with the marker in the subject). Stop→completed when stage past `viewing_scheduled` or all steps sent. `startLeadSequenceScheduler` = `setInterval(run, 24h)` + immediate first run guarded.
- [ ] **Step 2: Register in `server.js`** inside the same try/catch block as `startArrearsReminderScheduler`.
- [ ] **Step 3: Sequence tests** in `testLeadAutomation.js`: due step sends once + re-run is no-op (marker); stage-advance stops sequence; `do_not_email` contact suppressed (delivery_status `suppressed`, still marked so it won't retry). Clean up.
- [ ] **Step 4: Run** — `node scripts/testLeadAutomation.js`. Expected: all PASS. Then add the script to the `npm test` chain in `backend/package.json`.
- [ ] **Step 5: Commit** — `feat(lead-automation): follow-up sequence scheduler + enrollment + idempotent sends`.

---

### Task 5: Automation controller + routes (CRUD + enrollment actions)

**Files:**
- Create: `backend/controllers/leadAutomation.controller.js`
- Modify: `backend/routes/sales.routes.js`

**Interfaces:**
- Produces endpoints: `GET/POST /lead-rules`, `PUT/DELETE /lead-rules/:id`; `GET/POST /lead-sequences`, `PUT/DELETE /lead-sequences/:id`; `POST /enquiries/:id/sequence/{enroll,pause,resume,stop}`.
- Consumes: `LeadRoutingRule`, `LeadSequence`, `SalesEnquiry`, `enrollEnquiry`.

- [ ] **Step 1: Write the controller** — thin CRUD with `branchScope`/`resolveBranchId`/`pick`; validate `steps` is an array of `{day_offset, channel, template_id}`; pause/resume flip `sequence_status`; stop sets `stopped`; enroll calls `enrollEnquiry`.
- [ ] **Step 2: Add routes** — rule/sequence CRUD under `ADMIN`, enrollment actions under `PREPARE`. Place the specific `/enquiries/:id/sequence/*` and `/lead-*` routes before any conflicting `/:param` catch-alls (there are none for these prefixes).
- [ ] **Step 3: Load-check + smoke** — restart server; `node -e` or curl `GET /api/sales/lead-rules` returns `{data:[]}` (empty) with a valid token. (Covered in Task 8 live QA.)
- [ ] **Step 4: Commit** — `feat(lead-automation): rules/sequences CRUD + enrollment endpoints`.

---

### Task 6: Lead Automation admin screen + nav + route

**Files:**
- Create: `admin-portal/src/screens/sales/LeadAutomation.jsx`
- Modify: `admin-portal/src/App.jsx`, `admin-portal/src/config/consoles.js`

**Interfaces:**
- Consumes: the Task 5 endpoints + `GET /api/message-templates`.

- [ ] **Step 1: Build the screen** — two panels (Routing rules table + add/edit; Sequences table + step editor rows: day_offset / channel / template picker). Reuse `PageHead`, `Button`, `kit` table styles as in `SalesReports.jsx`.
- [ ] **Step 2: Add the route** `/residential/lead-automation` in `App.jsx` and a nav item (Home/residential group) in `consoles.js` (reuse an imported lucide icon, e.g. `Workflow` or `GitBranch`).
- [ ] **Step 3: Build** — `cd admin-portal && npm run build`. Expected: clean.
- [ ] **Step 4: Commit** — `feat(lead-automation): Lead Automation admin screen + nav + route`.

---

### Task 7: Enquiry/inbox attribution badges + sequence chip/controls

**Files:**
- Modify: `admin-portal/src/screens/sales/SalesInbox.jsx` (and/or `SalesPropertyFile.jsx` enquiry view) — show utm badges + sequence chip + pause/resume/stop.

- [ ] **Step 1: Surface attribution + sequence state** where the enquiry is shown in the inbox thread header: `utm_source`/`utm_campaign` badges, a `sequence_status` chip, and pause/resume/stop buttons calling the Task 5 endpoints (then reload).
- [ ] **Step 2: Build** — clean.
- [ ] **Step 3: Commit** — `feat(lead-automation): inbox attribution badges + sequence controls`.

---

### Task 8: Verify, work-log, rebuild, finish

- [ ] **Step 1: Harnesses** — `cd backend && npm test` (7+5+27 + new suite) and `npm run test:full` (28) both green.
- [ ] **Step 2: Live QA** (browser + authenticated fetch, cleaned up): seed one active rule + one 2-step sequence; POST a website enquiry with `utm_source/campaign` → assigned officer + rule id + enrolled; call `runLeadSequences({enquiry_id})` → step-0 recorded with marker + delivery_status, re-run → 0 new; advance stage → sequence completed; Reports attribution card shows the source/campaign; inbox pause/stop works. **Delete all seeded rows** (enquiry, rule, sequence, comms).
- [ ] **Step 3: Non-regression** — `git diff --stat <spec-commit>^..HEAD` shows only additive files (+ small edits to the 3 intake controllers, reports controller, reports screen, inbox, App/consoles/routes/server); `communication.service`, rental inbox, settlement/signing engines untouched.
- [ ] **Step 4: Work-log** — append COMPLETED entry to `AGENT_WORK_LOG.md`.
- [ ] **Step 5: Rebuild dist** — `cd admin-portal && npm run build`; `git add admin-portal/dist AGENT_WORK_LOG.md && commit` — `chore(lead-automation): work-log + rebuild dist; Phase 6 sub-project B done`.
- [ ] **Step 6: Finish** — REQUIRED SUB-SKILL superpowers:finishing-a-development-branch; present the 3-option gate.

## Self-Review

- **Spec coverage:** routing (T2), attribution capture + report (T3), sequences (T4), endpoints (T5), admin UI (T6), inbox UI (T7), data model (T1), verify/finish (T8) — all spec sections mapped.
- **Placeholders:** none — each task names exact files, endpoints, and the marker/idempotency mechanism.
- **Type consistency:** `routeEnquiry`, `enrollEnquiry`, `runLeadSequences`, `startLeadSequenceScheduler`, `lead_attribution` block, `sequence_status` enum values used consistently across tasks.
- **Risk noted:** the sequence send path should reuse the inbox's `dispatchAndRecord`; if it isn't exported, extract it to a shared util in T4 Step 1 rather than duplicating dispatch logic (keeps the single send seam).
