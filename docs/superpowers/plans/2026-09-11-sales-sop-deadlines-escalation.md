# Sales SOP Deadlines + Escalation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give each active SOP stage a business-day deadline and surface live overdue/escalation (on_track/due_soon/overdue/escalated) in the Workflow section, sales Work Queue, and property-file next-action bar — compute-on-read, no scheduler, no schema change.

**Architecture:** A pure weekdays-only business-day helper; a per-phase SLA config in `progressiveSop.service` (properties_sale only; rental gets none → unchanged); `due_date` stamped when a stage enters `in_progress` (seed/unlock/advance, never overwriting staff edits); a pure `stageDeadline` deriver used by both hydrates and the Work Queue; small UI additions.

**Tech Stack:** Node/Express/Sequelize (`:50001`), React 18 + Vite. No migration (reuses `ProjectStage.due_date`). Verification = a helper unit script + live curls + `npm run build` + browser + harnesses.

**Spec:** `docs/superpowers/specs/2026-09-11-sales-sop-deadlines-escalation-design.md`

## Global Constraints

- **Rental byte-identical.** Leasing has no `phaseSla` → `slaBusinessDaysFor` returns null → no `due_date` set, no tier shown. No rental caller edited.
- **Compute-on-read only.** No scheduler, no notifications, no persisted overdue flag. Tier derives live from `due_date` vs today.
- **Weekdays only.** No holiday calendar. Business day = Mon–Fri.
- **Staff edits win.** `due_date` is set only when empty (auto-stamp), never overwritten; `updateStage {due_date}` continues to set it directly.
- **No schema/migration, no money change.**
- Branch `air-conditioning/phase-0-duplicate`. Commit after each task. Footer:
  `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>` / `Claude-Session: https://claude.ai/code/session_01MQ7Vf7Ld6y4cWu46k7f8nt`
- Backend `npm test` (27/0, + the new helper test) + `npm run test:full` (28/0) green.

## Sale phase SLAs (business days): engagement 3 · marketing 7 · offer 3 · settlement 14 · closure 7

## File Structure

- `backend/utils/businessDays.js` — **create**: `addBusinessDays`, `businessDaysBetween`.
- `backend/scripts/testBusinessDays.js` — **create**: helper unit checks.
- `backend/services/progressiveSop.service.js` — **modify**: SLA config, `slaBusinessDaysFor`, `applyStageDueDate`, `stageDeadline`; stamp due_date on unlock.
- `backend/services/workflowProject.service.js` — **modify**: stamp due_date on seed.
- `backend/controllers/project.controller.js` — **modify**: stamp on advance; hydrate deadline fields.
- `backend/controllers/salesSop.controller.js` — **modify**: hydrate deadline fields.
- `backend/controllers/sales.controller.js` — **modify**: workQueue overdue-SOP group.
- `admin-portal/src/screens/sales/SalesPropertyFile.jsx` — **modify**: tier badge + overdue chip.
- `admin-portal/src/screens/sales/SalesWorkQueue.jsx` — **modify**: render `sop_overdue`.

**Schema:** none.

---

### Task 1: Business-day helper + unit checks

**Files:** Create `backend/utils/businessDays.js`, `backend/scripts/testBusinessDays.js`.

**Interfaces:**
- Produces: `addBusinessDays(date, n) → Date`, `businessDaysBetween(from, to) → number` (weekdays strictly after `from` up to and including `to`; negative if `to` < `from`).

- [ ] **Step 1: Write the helper.**
```js
// backend/utils/businessDays.js — weekdays only (Mon–Fri), no holiday calendar.
const midnight = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
const isWeekend = (d) => d.getDay() === 0 || d.getDay() === 6;

// Advance `date` by n business days (n>=0). n=0 returns the same (normalised) day.
function addBusinessDays(date, n) {
  let d = midnight(date); let left = Math.max(0, Math.floor(n));
  while (left > 0) { d.setDate(d.getDate() + 1); if (!isWeekend(d)) left--; }
  return d;
}

// Count weekdays strictly after `from`, up to and including `to`.
// Positive when `to` is after `from` (business days remaining), negative when before.
function businessDaysBetween(from, to) {
  const a = midnight(from); const b = midnight(to);
  if (a.getTime() === b.getTime()) return 0;
  const forward = b > a; const step = forward ? 1 : -1;
  let count = 0; const d = new Date(a);
  while (d.getTime() !== b.getTime()) { d.setDate(d.getDate() + step); if (!isWeekend(d)) count += step; }
  return count;
}
module.exports = { addBusinessDays, businessDaysBetween };
```

- [ ] **Step 2: Write the unit-check script.**
```js
// backend/scripts/testBusinessDays.js
const assert = require('assert');
const { addBusinessDays, businessDaysBetween } = require('../utils/businessDays');
const D = (s) => new Date(s + 'T00:00:00'); // 2026-09-11 is a Friday
let pass = 0; const ok = (c, m) => { assert.ok(c, m); pass++; };
ok(addBusinessDays(D('2026-09-11'), 1).getDate() === 14, 'Fri +1 = Mon 14');   // skip Sat/Sun
ok(addBusinessDays(D('2026-09-14'), 5).getDate() === 21, 'Mon +5 = next Mon'); // full week
ok(addBusinessDays(D('2026-09-11'), 0).getDate() === 11, '+0 = same day');
ok(businessDaysBetween(D('2026-09-14'), D('2026-09-18')) === 4, 'Mon→Fri = 4');
ok(businessDaysBetween(D('2026-09-11'), D('2026-09-14')) === 1, 'Fri→Mon = 1'); // weekend skipped
ok(businessDaysBetween(D('2026-09-14'), D('2026-09-14')) === 0, 'same day = 0');
ok(businessDaysBetween(D('2026-09-18'), D('2026-09-14')) === -2, 'Fri→Mon back = -2'); // Thu,Wed? no: Fri-1=Thu(-1),Thu-1=Wed... to Mon: Thu,Wed,Tue,Mon => but strictly after semantics reversed
console.log(`${pass} PASS / 0 FAIL (businessDays)`);
```
Note: verify the last assertion's expected value by running; adjust the expected number to what the defined semantics produce (the assertion documents the actual behavior — pick the number the implementation yields and lock it in, since backward counting is only used for `days_overdue = max(0, -d)` where sign is what matters).

- [ ] **Step 3: Run it.** `cd backend && node scripts/testBusinessDays.js` → `N PASS / 0 FAIL`. If the last (backward) assertion's number differs, set it to the produced value and re-run. Paste output.

- [ ] **Step 4: Wire into `npm test`.** Inspect `backend/package.json` `test` script; it chains `testSalesSettlementCalculations.js` + `e2eDealSalesSettlement.js`. Add `node scripts/testBusinessDays.js && ` to the front of the chain (same pattern). Run `npm test` → still ends 27 PASS / 0 FAIL for the e2e plus the new line prints its PASS.

- [ ] **Step 5: Commit** — `feat(sop): weekdays-only business-day helper + unit checks`

---

### Task 2: SLA config + due_date/tier derivers in progressiveSop.service

**Files:** Modify `backend/services/progressiveSop.service.js`.

**Interfaces:**
- Consumes: `addBusinessDays`, `businessDaysBetween` (Task 1).
- Produces: `slaBusinessDaysFor(stageKey, vertical='leasing') → number|null`, `applyStageDueDate(stage, vertical, today?) → void` (mutates the Sequelize instance's `due_date` if empty & SLA exists — caller persists), `stageDeadline(stage, today?) → { due_date, days_overdue, deadline_tier }`.

- [ ] **Step 1: Add the SLA config + registry field.** After the sale maps, add:
```js
const { addBusinessDays, businessDaysBetween } = require('../utils/businessDays');
const SALE_PHASE_SLA = { engagement: 3, marketing: 7, offer: 3, settlement: 14, closure: 7 };
```
Add `phaseSla` to the registry entries: `leasing: { …, phaseSla: null }`, `properties_sale: { …, phaseSla: SALE_PHASE_SLA }`.

- [ ] **Step 2: `slaBusinessDaysFor`.**
```js
const slaBusinessDaysFor = (stageKey, vertical = 'leasing') => {
  const reg = REGISTRY[vertical];
  if (!reg || !reg.phaseSla) return null;
  return reg.phaseSla[phaseOf(stageKey, vertical)] ?? null;
};
```

- [ ] **Step 3: `applyStageDueDate`** — set due_date only when empty and an SLA exists (mutates in memory; the caller saves it, since all three call sites are already writing the stage):
```js
function applyStageDueDate(stage, vertical, today = new Date()) {
  if (stage.due_date) return;
  const sla = slaBusinessDaysFor(stage.stage_key, vertical);
  if (sla == null) return;
  const due = addBusinessDays(today, sla);
  stage.due_date = due.toISOString().slice(0, 10); // DATEONLY
}
```

- [ ] **Step 4: `stageDeadline`** — pure derivation:
```js
function stageDeadline(stage, today = new Date()) {
  const inactive = !stage.due_date || ['done', 'skipped', 'blocked'].includes(stage.status);
  if (inactive) return { due_date: stage.due_date || null, days_overdue: 0, deadline_tier: 'on_track' };
  const d = businessDaysBetween(today, new Date(stage.due_date + 'T00:00:00'));
  const days_overdue = Math.max(0, -d);
  const sla = slaBusinessDaysFor(stage.stage_key, 'properties_sale') || 0;
  const deadline_tier = d >= 2 ? 'on_track' : d >= 0 ? 'due_soon' : (sla && days_overdue >= sla ? 'escalated' : 'overdue');
  return { due_date: stage.due_date, days_overdue, deadline_tier };
}
```

- [ ] **Step 5: Stamp due_date on unlock.** In `unlockForEvent`, where it promotes `firstPending` to `in_progress`, call `applyStageDueDate(firstPending, vertical)` before `firstPending.update({...})`, and include `due_date` in that update:
```js
    if (firstPending) {
      applyStageDueDate(firstPending, vertical);
      await firstPending.update({ status: 'in_progress', due_date: firstPending.due_date }, { transaction: tx });
      await project.update({ current_stage_key: firstPending.stage_key }, { transaction: tx });
    }
```

- [ ] **Step 6: Export** the new functions: add `slaBusinessDaysFor, applyStageDueDate, stageDeadline` to `module.exports`.

- [ ] **Step 7: Load-check + unit.** `cd backend && node -e "const s=require('./services/progressiveSop.service'); console.log(s.slaBusinessDaysFor('marketing_listing','properties_sale'), s.slaBusinessDaysFor('offers_negotiation','properties_sale'), s.slaBusinessDaysFor('lease_finalisation','leasing')); const st={stage_key:'offers_negotiation',status:'in_progress',due_date:'2000-01-01'}; console.log(s.stageDeadline(st).deadline_tier, s.stageDeadline(st).days_overdue>0)"` → expect `7 3 null` then `escalated true` (far-past due).

- [ ] **Step 8: Commit** — `feat(sop): per-phase SLA config + due-date/tier derivers (sale only)`

---

### Task 3: Stamp due_date at seed + advance

**Files:** Modify `backend/services/workflowProject.service.js`, `backend/controllers/project.controller.js`.

**Interfaces:**
- Consumes: `applyStageDueDate` (Task 2).

- [ ] **Step 1: Seed (workflowProject.service).** Require `applyStageDueDate` at top. In the stage-creation loop, when `status === 'in_progress'`, stamp the due date before the create by computing it into a local and passing it as `due_date`:
```js
      // stamp a deadline on the first active stage (sale SLAs; null for others)
      let due_date = null;
      if (status === 'in_progress') { const tmp = { stage_key: s.key, due_date: null }; applyStageDueDate(tmp, meta.vertical_key); due_date = tmp.due_date; }
      await ProjectStage.create({
        project_id: p.id, stage_key: s.key, stage_name: s.name, sort_order: s.order ?? i + 1,
        status, due_date,
        checklist: (s.checklist || []).map((c) => ({ /* unchanged */ label: c.label, required: !!c.required, done: false, detailed_task: c.detailed_task || '', responsible: c.responsible || '', evidence_required: c.evidence_required || '', output: c.output || '', evidence_url: '', evidence_name: '', remarks: '' })),
        required_documents: s.required_docs || [],
      }, { transaction });
```

- [ ] **Step 2: Advance (project.controller.updateStage).** Where a completed stage promotes `next` from `pending`→`in_progress`, stamp its due date. The project's vertical is `p.vertical_key`:
```js
    if (next) {
      if (next.status === 'pending') {
        const { applyStageDueDate } = require('../services/progressiveSop.service');
        applyStageDueDate(next, p.vertical_key);
        await next.update({ status: 'in_progress', due_date: next.due_date });
      }
      await p.update({ current_stage_key: next.stage_key });
    }
```
(Preserve the existing `else` branch that completes the project.)

- [ ] **Step 3: Verify (live).** Restart `:50001`. `POST …/sop` on a fresh sale property → first engagement stage `due_date` = 3 business days out (compute expected from today), later stages null. Then in the SOP, `PATCH /api/projects/:id/stages/:firstStageId {status:'done'}` → the next engagement stage becomes `in_progress` with a `due_date` = 3 business days out. Paste the two due dates.

- [ ] **Step 4: Commit** — `feat(sales-sop): stamp stage due dates at seed and on advance`

---

### Task 4: Deadline fields in both hydrates

**Files:** Modify `backend/controllers/project.controller.js`, `backend/controllers/salesSop.controller.js`.

**Interfaces:**
- Consumes: `stageDeadline` (Task 2).

- [ ] **Step 1: project.controller.hydrate.** Import `stageDeadline` and spread its fields into each stage:
```js
const { phaseOf, hintFor, stageDeadline } = require('../services/progressiveSop.service');
// inside the stages.map, add to the returned object:
      ...stageDeadline(s),
```
(Place `...stageDeadline(s)` in the returned object; it adds `due_date`(passthrough), `days_overdue`, `deadline_tier`.)

- [ ] **Step 2: salesSop.controller.hydrate.** Same import + spread `...stageDeadline(s)` into its stage map.

- [ ] **Step 3: Verify.** Restart. `GET /api/sales/properties/:id/sop` on the Task-3 property → the active stage carries `deadline_tier` (`on_track`/`due_soon`) and `days_overdue:0`; a blocked stage carries `deadline_tier:'on_track'`, `days_overdue:0`. Back-date the active stage's due_date in the DB and re-GET → `overdue`/`escalated`. Paste the active stage's fields before/after.

- [ ] **Step 4: Commit** — `feat(sop): hydrate carries per-stage deadline + tier`

---

### Task 5: Work Queue overdue-SOP group

**Files:** Modify `backend/controllers/sales.controller.js`.

**Interfaces:**
- Consumes: `stageDeadline` (Task 2); the existing `workQueue` `push()` + `propertyById`.

- [ ] **Step 1: Add the SOP scan.** In `workQueue`, after the open-offers loop (before the `const visible = …` line), add:
```js
  if (propertyById.size) {
    const { stageDeadline } = require('../services/progressiveSop.service');
    const ProjectModel = require('../models/Project');
    const ProjectStageModel = require('../models/ProjectStage');
    const sopProjects = await ProjectModel.findAll({ where: { property_id: { [Op.in]: [...propertyById.keys()] }, vertical_key: 'properties_sale', ...branchScope(req) }, include: [{ model: ProjectStageModel, as: 'stages' }] });
    for (const proj of sopProjects) {
      const prop = propertyById.get(Number(proj.property_id)) || {};
      for (const stage of (proj.stages || [])) {
        const dl = stageDeadline(stage.toJSON ? stage.toJSON() : stage);
        if (dl.deadline_tier === 'overdue' || dl.deadline_tier === 'escalated') {
          push('prepare', 'sop_overdue', `Overdue SOP stage "${stage.stage_name}" for ${prop.title || prop.property_code || proj.property_id}`, { deal_id: null, property_id: proj.property_id, property_code: prop.property_code || null, title: prop.title || null }, { tier: dl.deadline_tier, days_overdue: dl.days_overdue });
        }
      }
    }
  }
```
(Confirm `Project` + `ProjectStage` aren't already imported at top; if they are, use those instead of re-requiring.)

- [ ] **Step 2: Verify (live).** With a back-dated overdue SOP stage on an in-scope sale property, `GET /api/sales/work-queue` (as an admin/prepare role) → an item with `kind:'sop_overdue'`, the label, `tier`, `days_overdue`. Paste it.

- [ ] **Step 3: Commit** — `feat(sales-sop): Work Queue lists overdue SOP stages`

---

### Task 6: Frontend — tier badge, overdue chip, Work Queue kind

**Files:** Modify `admin-portal/src/screens/sales/SalesPropertyFile.jsx`, `admin-portal/src/screens/sales/SalesWorkQueue.jsx`.

- [ ] **Step 1: Tier badge in the Workflow section.** In the stage Panel `sub`/header area, for a non-blocked, non-done stage with a `due_date`, show the due date and a tier badge. Add a small helper near the workflow render:
```jsx
const TIER = { on_track: null, due_soon: ["amber", "Due soon"], overdue: ["red", "Overdue"], escalated: ["red", "Escalated"] };
```
In the stage Panel, under the heading, render (only when `stage.due_date` and not blocked/done):
```jsx
{stage.due_date && !["blocked", "done"].includes(stage.status) && (
  <div className="cell-sub" style={{ display: "flex", gap: 8, alignItems: "center" }}>
    Due {stage.due_date}
    {TIER[stage.deadline_tier] && (
      <Badge tone={TIER[stage.deadline_tier][0]}>
        {TIER[stage.deadline_tier][1]}{stage.days_overdue ? ` · ${stage.days_overdue}d` : ""}
      </Badge>
    )}
  </div>
)}
```
Place this inside the Panel body, above the checklist (the Panel's `sub` currently shows the status; keep that). Confirm `Badge` supports `tone="red"`/`"amber"` (used elsewhere in the file); if the red tone differs, use the tone name the kit exposes for danger.

- [ ] **Step 2: Overdue chip on the next-action bar.** Compute an overdue count from the loaded SOP and show a chip next to the blockers pill. Near the other derived values (where `blockers`/`nextAction` are computed, ~line 1057), add:
```jsx
const sopOverdue = (sop?.stages || []).filter((s) => ["overdue", "escalated"].includes(s.deadline_tier)).length;
```
In the next-action bar (after the blockers button, ~line 2336), add:
```jsx
{sopOverdue > 0 && (
  <button type="button" className="pm-pill" style={{ borderColor: "var(--warn)", background: "var(--warn-bg)", color: "var(--warn)", fontWeight: 750 }} onClick={() => openSection("workflow")}>
    <AlertTriangle size={14} /> {sopOverdue} SOP overdue
  </button>
)}
```
(`sop` state exists from layer 1; if the workflow section hasn't been opened yet `sop` is `undefined` → count 0 → chip hidden. `AlertTriangle` is already imported.)

- [ ] **Step 3: Work Queue `sop_overdue` kind.** In `SalesWorkQueue.jsx`, add to `KIND`: `sop_overdue: ['Overdue SOP', null],` and to `ORDER` (e.g. after `offer_review`): `'sop_overdue'`. In `go`, route `sop_overdue` to the property-file Workflow section:
```js
    if (it.kind === 'sop_overdue') return navigate(`${settlementDeskPath('residential', it.property_id).replace('/settlement', '')}?section=workflow`);
```
(The existing table renders `it.label`; `it.amount` is null for these → the amount cell stays blank. Fine.)

- [ ] **Step 4: Build.** `cd admin-portal && npm run build` → `✓ built`. Paste tail.

- [ ] **Step 5: Browser.** On a sale property with an active stage: Workflow shows "Due <date>" and, after back-dating, an Overdue/Escalated badge + the "N SOP overdue" chip on the bar; the Work Queue shows the "Overdue SOP" group whose Go opens the Workflow section. Screenshot.

- [ ] **Step 6: Commit** — `feat(sales-sop): deadline badges, overdue chip, Work Queue SOP group`

---

### Task 7: End-to-end verification + wrap-up

- [ ] **Step 1: Harnesses.** `cd backend && npm test` → business-day PASS + 27/0; `npm run test:full` → 28/0.
- [ ] **Step 2: Rental non-regression.** Confirm a leasing project seeded/advanced gets **no** `due_date` (SLA null) and no tier badge — `node -e` check that `slaBusinessDaysFor('lease_finalisation','leasing')` is null and `stageDeadline` on a leasing stage with no due_date is `on_track`/0.
- [ ] **Step 3: Rebuild dist + work-log.** `admin-portal npm run build`; append an AGENT_WORK_LOG COMPLETED entry (helper, SLA config, due-date stamping, tier deriver, 3 surfaces; rental unchanged; SOP trilogy complete); `git add admin-portal/dist AGENT_WORK_LOG.md`.
- [ ] **Step 4: Commit** — `chore(sales-sop): work-log + rebuild dist; Phase 3 sub-project 4 layer 3 done`

---

## Self-Review

**Spec coverage:** §3 helper → Task 1; §4 SLA config + derivers → Task 2; §5 due_date stamping (seed/unlock/advance) → Tasks 2(unlock)+3(seed/advance); §6 tier derivation → Task 2; §7 surfacing (hydrate/Workflow/Queue/bar) → Tasks 4+5+6. Deferred (scheduler, holidays, board badge, rental SLAs) absent — correct.

**Placeholder scan:** real code throughout — the helper, both unit-check files, SLA config, all three derivers, the three due_date call-site edits with anchors, both hydrate spreads, the Work Queue scan, and the three UI edits. The one flagged value (backward `businessDaysBetween` assertion) is explicitly resolved by running in Task 1 Step 3 — its sign, not magnitude, is what `days_overdue` uses.

**Type consistency:** `applyStageDueDate(stage, vertical, today?)` mutates `stage.due_date` (string DATEONLY) — defined Task 2, used Tasks 2/3 with the caller persisting via `update({due_date})`. `stageDeadline(stage, today?) → {due_date, days_overdue, deadline_tier}` — defined Task 2, consumed by both hydrates (Task 4), the Work Queue (Task 5) and the UI reads `stage.deadline_tier`/`stage.days_overdue`/`stage.due_date` (Task 6). `slaBusinessDaysFor(stageKey, vertical) → number|null` consistent across Tasks 2/3/5. Sale SLA phases match `SALE_STAGE_PHASE` keys from layer 2.

**Rental safety (explicit):** `phaseSla:null` for leasing → `slaBusinessDaysFor` null → `applyStageDueDate` no-ops → no rental due_date, no tier. Asserted in Task 7 Step 2.
