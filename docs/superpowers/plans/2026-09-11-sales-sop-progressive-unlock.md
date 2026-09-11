# Sales SOP Progressive Lifecycle Unlock Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make sale SOP stages open progressively — later phases seed `blocked` and unlock automatically when the real sale lifecycle event fires — by generalizing the existing rental unlock engine to be vertical-parameterised (rental behavior unchanged).

**Architecture:** `progressiveSop.service` becomes a vertical-keyed registry (leasing preserved). Sale SOP seeds engagement-active / rest-`blocked` via `createProjectFromTemplate`. Four server hooks (offer submitted, offer accepted, assessment approved, settlement locked) call `unlockForEvent(propertyId, event, { vertical:'properties_sale', transaction })`. `hydrate` passes the project vertical so blocked sale stages get sale hints; the Workflow UI greys blocked stages.

**Tech Stack:** Node/Express/Sequelize (`:50001`), React 18 + Vite. No schema change (reuses `ProjectStage.status='blocked'`). Verification = live curls + `npm run build` + browser + harnesses.

**Spec:** `docs/superpowers/specs/2026-09-11-sales-sop-progressive-unlock-design.md`

## Global Constraints

- **Rental engine byte-identical.** The registry keeps leasing's maps; every public function keeps a `vertical = 'leasing'` default so all existing rental callers work unchanged. No rental caller file is edited.
- **No schema/migration, no money change.** Reuse `ProjectStage.status='blocked'`.
- **Non-registry verticals unchanged.** `initialStatusFor` returns `null` for verticals with no registry entry → `createProjectFromTemplate` keeps its current first=in_progress/rest=pending seeding (WT/AC/generic/`properties` buyer).
- **Every hook is non-fatal** — wrapped in try/catch; an unlock failure never breaks the offer/assessment/settlement action.
- Branch `air-conditioning/phase-0-duplicate`. Commit after each task. Footer:
  `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>` / `Claude-Session: https://claude.ai/code/session_01MQ7Vf7Ld6y4cWu46k7f8nt`
- Backend `npm test` (27/0) + `npm run test:full` (28/0) stay green.

## Sale stage_key → phase (slugs from migration 0107)

`enquiry_consultation, inspection_assessment, documents_risk, agreement_phase_2_approval` → **engagement** (active at start) · `preparation, marketing_listing, buyer_enquiries_inspections` → **marketing** · `offers_negotiation` → **offer** · `agreement_settlement` → **settlement** · `closure_post_sale` → **closure**.

Event → phases: `sale_assessment_approved`→marketing · `sale_offer_received`→offer · `sale_offer_accepted`→settlement · `sale_settlement_locked`→closure.

## File Structure

- `backend/services/progressiveSop.service.js` — **modify**: registry generalization.
- `backend/services/workflowProject.service.js` — **modify**: per-vertical initial status.
- `backend/controllers/project.controller.js` — **modify**: `hydrate` passes vertical.
- `backend/controllers/sales.controller.js` — **modify**: 3 hooks.
- `backend/controllers/salesAssessment.controller.js` — **modify**: 1 hook.
- `admin-portal/src/screens/sales/SalesPropertyFile.jsx` — **modify**: grey blocked stages.

**Schema:** none.

---

### Task 1: Generalize progressiveSop.service to a vertical registry

**Files:** Modify `backend/services/progressiveSop.service.js`.

**Interfaces:**
- Produces: `phaseOf(stageKey, vertical = 'leasing')`, `hintFor(phase, vertical = 'leasing')`, `initialStatusFor(stageKey, { vertical = 'leasing', ownerLinked = false })` → `'pending' | 'blocked' | null`, `unlockForEvent(propertyId, event, { vertical = 'leasing', transaction })`. Back-compat exports retained: `STAGE_PHASE`, `PHASE_UNLOCK_HINT`, `EVENT_UNLOCKS` (leasing), `phaseOf`.

- [ ] **Step 1: Add the sale maps + registry** (keep the existing leasing constants exactly; rename none). After the existing `STAGE_PHASE` / `EVENT_UNLOCKS` / `PHASE_UNLOCK_HINT` (leasing) definitions, add:
```js
// --- sale (properties_sale) ---
const SALE_STAGE_PHASE = {
  enquiry_consultation: 'engagement', inspection_assessment: 'engagement',
  documents_risk: 'engagement', agreement_phase_2_approval: 'engagement',
  preparation: 'marketing', marketing_listing: 'marketing', buyer_enquiries_inspections: 'marketing',
  offers_negotiation: 'offer',
  agreement_settlement: 'settlement',
  closure_post_sale: 'closure',
};
const SALE_EVENT_UNLOCKS = {
  sale_assessment_approved: ['marketing'],
  sale_offer_received: ['offer'],
  sale_offer_accepted: ['settlement'],
  sale_settlement_locked: ['closure'],
};
const SALE_HINTS = {
  engagement: 'active from the start',
  marketing: 'unlocks when the assessment is approved',
  offer: 'unlocks when an offer is received',
  settlement: 'unlocks when an offer is accepted',
  closure: 'unlocks when the settlement completes',
};

const REGISTRY = {
  leasing: { stagePhase: STAGE_PHASE, eventUnlocks: EVENT_UNLOCKS, hints: PHASE_UNLOCK_HINT, activeAtStart: ['property'], ownerPhase: 'owner', fallbackPhase: 'ongoing' },
  properties_sale: { stagePhase: SALE_STAGE_PHASE, eventUnlocks: SALE_EVENT_UNLOCKS, hints: SALE_HINTS, activeAtStart: ['engagement'], ownerPhase: null, fallbackPhase: 'engagement' },
};
```

- [ ] **Step 2: Rewrite `phaseOf` + add `hintFor`** to be vertical-aware but leasing-default (so `project.controller`'s current `phaseOf(key)` call still returns leasing phases):
```js
const phaseOf = (stageKey, vertical = 'leasing') => {
  const reg = REGISTRY[vertical] || REGISTRY.leasing;
  return reg.stagePhase[stageKey] || reg.fallbackPhase;
};
const hintFor = (phase, vertical = 'leasing') => {
  const reg = REGISTRY[vertical] || REGISTRY.leasing;
  return reg.hints[phase] || 'unlocks later in the lifecycle';
};
```

- [ ] **Step 3: Generalize `initialStatusFor`** — return `null` for verticals with no registry entry (so `createProjectFromTemplate` keeps current behavior for them):
```js
function initialStatusFor(stageKey, { vertical = 'leasing', ownerLinked = false } = {}) {
  const reg = REGISTRY[vertical];
  if (!reg) return null; // no phase gating for this vertical
  const active = new Set(reg.activeAtStart);
  if (ownerLinked && reg.ownerPhase) active.add(reg.ownerPhase);
  return active.has(phaseOf(stageKey, vertical)) ? 'pending' : 'blocked';
}
```

- [ ] **Step 4: Generalize `unlockForEvent`** — same loop as today, but registry- and vertical-driven; default `vertical='leasing'` so every rental caller is unchanged:
```js
async function unlockForEvent(propertyId, event, opts = {}) {
  const vertical = opts.vertical || 'leasing';
  const tx = opts.transaction;
  const reg = REGISTRY[vertical];
  if (!reg) return { unlocked: 0 };
  const phases = reg.eventUnlocks[event];
  if (!phases || !phases.length) return { unlocked: 0 };

  const project = await Project.findOne({ where: { property_id: propertyId, vertical_key: vertical }, order: [['created_at', 'DESC']], transaction: tx });
  if (!project) return { unlocked: 0 };

  const stages = await ProjectStage.findAll({ where: { project_id: project.id }, order: [['sort_order', 'ASC']], transaction: tx });
  const inPhase = stages.filter((s) => phases.includes(phaseOf(s.stage_key, vertical)));
  let unlocked = 0;
  for (const s of inPhase) {
    if (s.status === 'blocked') { await s.update({ status: 'pending' }, { transaction: tx }); unlocked++; }
  }
  const hasActive = stages.some((s) => s.status === 'in_progress');
  if (!hasActive) {
    const firstPending = (await ProjectStage.findAll({ where: { project_id: project.id }, order: [['sort_order', 'ASC']], transaction: tx })).find((s) => s.status === 'pending');
    if (firstPending) {
      await firstPending.update({ status: 'in_progress' }, { transaction: tx });
      await project.update({ current_stage_key: firstPending.stage_key }, { transaction: tx });
    }
  }
  return { unlocked };
}
```

- [ ] **Step 5: Update the exports** to add `hintFor` and keep the old names:
```js
module.exports = { STAGE_PHASE, EVENT_UNLOCKS, PHASE_UNLOCK_HINT, phaseOf, hintFor, initialStatusFor, unlockForEvent, REGISTRY };
```

- [ ] **Step 6: Load-check + leasing parity.** `cd backend && node -e "const s=require('./services/progressiveSop.service'); console.log(s.phaseOf('lease_finalisation'), s.phaseOf('offers_negotiation','properties_sale'), s.initialStatusFor('marketing_listing',{vertical:'properties_sale'}), s.initialStatusFor('property_master_setup',{vertical:'leasing'}), s.initialStatusFor('x',{vertical:'water_tank'}))"` → expect `lease offer blocked pending null`.

- [ ] **Step 7: Commit** — `refactor(sop): vertical-keyed progressive-unlock registry (leasing unchanged)`

---

### Task 2: Seed sale SOP stages progressively

**Files:** Modify `backend/services/workflowProject.service.js`.

**Interfaces:**
- Consumes: `initialStatusFor(stageKey, { vertical })` from Task 1.

- [ ] **Step 1: Apply per-vertical initial status.** In `createProjectFromTemplate`, require the helper at the top (`const { initialStatusFor } = require('./progressiveSop.service');`) and change the stage-status logic. Replace the loop's `status: i === 0 ? 'in_progress' : 'pending'` with a computed status, and fix `current_stage_key` to the first non-blocked stage:
```js
    // Per-vertical progressive gating (null = no gating: keep first-active default).
    const gate = (key) => initialStatusFor(key, { vertical: meta.vertical_key });
    const gatedFirst = stages.findIndex((s) => gate(s.key) !== 'blocked'); // -1 if all null
    for (let i = 0; i < stages.length; i++) {
      const s = stages[i];
      const g = gate(s.key);
      const status = g === null
        ? (i === 0 ? 'in_progress' : 'pending')          // no registry: unchanged
        : (i === gatedFirst ? 'in_progress' : g);        // gated: first active in_progress, rest pending/blocked
      await ProjectStage.create({
        project_id: p.id, stage_key: s.key, stage_name: s.name, sort_order: s.order ?? i + 1,
        status,
        checklist: (s.checklist || []).map((c) => ({ label: c.label, required: !!c.required, done: false, detailed_task: c.detailed_task || '', responsible: c.responsible || '', evidence_required: c.evidence_required || '', output: c.output || '', evidence_url: '', evidence_name: '', remarks: '' })),
        required_documents: s.required_docs || [],
      }, { transaction });
    }
    // current_stage_key = first active stage (gated → first non-blocked; else first).
    const currentKey = gatedFirst >= 0 ? stages[gatedFirst]?.key : stages[0]?.key;
    if (currentKey) await p.update({ current_stage_key: currentKey }, { transaction });
```
(Remove the old `if (stages[0]) await p.update({ current_stage_key: stages[0].key }, ...)` line — replaced above.)

- [ ] **Step 2: Verify sale seed + non-regression (live).** Restart `:50001`. Pick a fresh sale property with no SOP; `POST /api/sales/properties/:id/sop` and check: the four engagement stages are `in_progress`(first)/`pending`, and `preparation`/`marketing_listing`/`buyer_enquiries_inspections`/`offers_negotiation`/`agreement_settlement`/`closure_post_sale` are `blocked`. Then `POST /api/projects {title:'x',vertical_key:'water_tank'}` → still first=in_progress/rest=pending (unchanged). Paste the sale stage statuses.

- [ ] **Step 3: Commit** — `feat(sales-sop): seed sale SOP stages engagement-active, later phases blocked`

---

### Task 3: hydrate passes the project vertical (sale hints)

**Files:** Modify `backend/controllers/project.controller.js`.

- [ ] **Step 1: Use `hintFor` + the project vertical.** Change the require to `const { phaseOf, hintFor } = require('../services/progressiveSop.service');` and update `hydrate` so `phaseOf`/hint use `o.vertical_key`:
```js
const hydrate = (project) => {
  if (!project) return project;
  const o = project.toJSON ? project.toJSON() : project;
  const vertical = o.vertical_key || 'leasing';
  if (o.stages) o.stages = o.stages.map((s) => {
    const phase = phaseOf(s.stage_key, vertical);
    return {
      ...s,
      checklist: arr(s.checklist),
      required_documents: arr(s.required_documents),
      phase,
      locked: s.status === 'blocked',
      unlock_hint: s.status === 'blocked' ? hintFor(phase, vertical) : null,
    };
  });
  return o;
};
```

- [ ] **Step 2: Verify.** Restart. `GET /api/sales/properties/:id/sop` on the Task-2 property → blocked stages carry `locked:true` and `unlock_hint` like "unlocks when the assessment is approved" (marketing) / "…an offer is received" (offer). Note: `salesSop.controller` has its own lean `hydrate` (no phase meta) — that's fine for the SOP payload, but to surface hints on the SOP endpoint, **also** update `salesSop.controller.hydrate** to add `locked`/`unlock_hint` (Step 3).

- [ ] **Step 3: Mirror in salesSop.controller.hydrate.** In `backend/controllers/salesSop.controller.js`, import `phaseOf, hintFor` and enrich its `hydrate` stage map the same way (vertical is always `properties_sale` there):
```js
const { phaseOf, hintFor } = require('../services/progressiveSop.service');
// in hydrate's stage map:
o.stages = o.stages.map((s) => {
  const phase = phaseOf(s.stage_key, 'properties_sale');
  return { ...s, checklist: arr(s.checklist), required_documents: arr(s.required_documents), phase, locked: s.status === 'blocked', unlock_hint: s.status === 'blocked' ? hintFor(phase, 'properties_sale') : null };
});
```

- [ ] **Step 4: Verify SOP payload.** `GET …/sop` → blocked stages now carry `locked` + `unlock_hint`. Paste one blocked stage's `{stage_name, status, locked, unlock_hint}`.

- [ ] **Step 5: Commit** — `feat(sop): hydrate carries per-vertical unlock hints for sale stages`

---

### Task 4: Wire the sale lifecycle event hooks

**Files:** Modify `backend/controllers/sales.controller.js` (3 hooks) and `backend/controllers/salesAssessment.controller.js` (1 hook).

**Interfaces:**
- Consumes: `unlockForEvent(propertyId, event, { vertical:'properties_sale', transaction })` from Task 1.

Use a local helper at each call site (inline require, non-fatal):
```js
const unlockSale = (propertyId, event, transaction) => {
  try { return require('../services/progressiveSop.service').unlockForEvent(propertyId, event, { vertical: 'properties_sale', transaction }); }
  catch { return null; }
};
```
(Define it once near the top of each controller, after the other requires.)

- [ ] **Step 1: Offer received — `createOffer`.** In `sales.controller.js` `createOffer`, inside the transaction, right after `if (initialStatus === 'submitted') await appendOfferVersion(...)` (line ~632), add:
```js
      if (initialStatus === 'submitted') await unlockSale(property.id, 'sale_offer_received', transaction);
```

- [ ] **Step 2: Offer received — `updateOfferStatus`.** In `updateOfferStatus`, inside the transaction, after the two `appendOfferVersion` lines (~682), add:
```js
      if (target === 'submitted') await unlockSale(offer.property_id, 'sale_offer_received', transaction);
```

- [ ] **Step 3: Offer accepted — `acceptOffer`.** In `acceptOffer`, inside the transaction, after the `SaleOfferApproval.create({...})` block (~760) and before `recordEvent`, add:
```js
    await unlockSale(property.id, 'sale_offer_accepted', transaction);
```

- [ ] **Step 4: Settlement locked — `settlementAction`.** In the non-withdrawal `lock` branch (the `else` after line ~1883), right after `await Property.update({ status: 'sold' }, ...)` (~1886), add:
```js
        await unlockSale(saleTransaction.property_id, 'sale_settlement_locked', transaction);
```

- [ ] **Step 5: Assessment approved — `approveAssessment`.** In `salesAssessment.controller.js`, add the `unlockSale` helper near the requires, then inside the transaction after `profile.update(...)` (~410), add:
```js
    await unlockSale(assessment.property_id, 'sale_assessment_approved', transaction);
```

- [ ] **Step 6: Load-check + restart.** `node -e "require('./controllers/sales.controller');require('./controllers/salesAssessment.controller');console.log('load OK')"`, restart `:50001`.

- [ ] **Step 7: Live unlock checks.** On a sale property with a fresh SOP (marketing/offer/settlement/closure all `blocked`):
  - `POST /api/sales/properties/:id/offers {…, status:'submitted'}` → `GET …/sop` shows `offers_negotiation` no longer `blocked`.
  - Approve that property's assessment → marketing stages unblock.
  - Accept an offer → `agreement_settlement` unblocks.
  - Lock a (non-withdrawal) settlement → `closure_post_sale` unblocks.
  - Repeat one event → no error (idempotent).
  Paste the before/after status of the affected stage for each. (If a live end-to-end settlement isn't reachable on test data, prove `sale_settlement_locked` via the harness in Task 6 instead and note it.)

- [ ] **Step 8: Commit** — `feat(sales-sop): unlock SOP phases on offer/assessment/settlement lifecycle events`

---

### Task 5: Grey blocked stages in the Workflow section

**Files:** Modify `admin-portal/src/screens/sales/SalesPropertyFile.jsx`.

- [ ] **Step 1: Render blocked stages locked.** In the `section === "workflow"` stages map, treat `stage.status === "blocked"`:
  - Panel `action` shows a muted lock label (no Start/Mark done buttons): `<span className="cell-sub">🔒 {stage.unlock_hint || "locked"}</span>`.
  - Checklist checkboxes + Evidence upload are hidden/disabled for blocked stages (they already disable on `stage.status === "done"`; extend the condition to also cover `"blocked"`, and skip the Evidence `UploadButton` when blocked).
  - Give the whole Panel a muted look: add `style={{ opacity: stage.status === "blocked" ? 0.55 : 1 }}` on the stage Panel.
  Concretely: where the action prop currently is `canPrepare && stage.status !== "done" ? (<buttons>) : (<StatusBadge/>)`, make it:
```jsx
                action={
                  stage.status === "blocked" ? (
                    <span className="cell-sub">🔒 {stage.unlock_hint || "locked"}</span>
                  ) : canPrepare && stage.status !== "done" ? (
                    <div style={{ display: "flex", gap: 6 }}>
                      {stage.status !== "in_progress" && (
                        <Button size="sm" variant="ghost" onClick={() => patchStage(stage, { status: "in_progress" })}>Start</Button>
                      )}
                      <Button size="sm" onClick={() => patchStage(stage, { status: "done" })}>Mark done</Button>
                    </div>
                  ) : (
                    <StatusBadge status={stage.status} />
                  )
                }
```
  And change the checklist item `disabled` + Evidence guards from `stage.status === "done"` to `["done","blocked"].includes(stage.status)`, and wrap the `UploadButton` in `canPrepare && !["done","blocked"].includes(stage.status) && (...)`.

- [ ] **Step 2: Build.** `cd admin-portal && npm run build` → `✓ built`. Paste tail.

- [ ] **Step 3: Browser.** Open a sale property → Workflow: engagement stages actionable; marketing/offer/settlement/closure greyed with "🔒 unlocks when …". Screenshot.

- [ ] **Step 4: Commit** — `feat(sales-sop): grey locked SOP stages with unlock hint`

---

### Task 6: End-to-end verification + wrap-up

- [ ] **Step 1: Harnesses.** `cd backend && npm test` → 27/0; `npm run test:full` → 28/0. (The full harness locks a settlement — confirm it still passes with the new `sale_settlement_locked` hook, proving that path.)
- [ ] **Step 2: Rental non-regression.** Manually confirm one rental unlock still works: create a tenancy for a leasing property with a SOP and verify its lease-phase stage unblocks (or, if not reachable on test data, confirm via `node -e` that `unlockForEvent(propId,'tenancy_created')` with default vertical still targets `vertical_key:'leasing'`). Note the method used.
- [ ] **Step 3: Rebuild dist + work-log.** `admin-portal npm run build`; append an AGENT_WORK_LOG COMPLETED entry (engine generalized, sale seed, hints, 4 hooks, UI; rental unchanged; deferred = layer 3 deadlines/escalation); `git add admin-portal/dist AGENT_WORK_LOG.md`.
- [ ] **Step 4: Commit** — `chore(sales-sop): work-log + rebuild dist; Phase 3 sub-project 4 layer 2 done`

---

## Self-Review

**Spec coverage:** §4 engine generalization → Task 1; seed → Task 2; §4 hydrate vertical → Task 3; §5 hooks → Task 4; §6 UI → Task 5; §7 testing → Tasks 2/4/6. Deferred (deadlines/escalation, listing/other events, buyer SOP) absent — correct.

**Placeholder scan:** every step has real code — registry, the three generalized functions, the seeding change, both `hydrate` edits, the four hook one-liners with exact anchor lines (632/682/760/1886/410), and the JSX action block. No "TBD"/"similar to".

**Type consistency:** `unlockForEvent(propertyId, event, {vertical, transaction})` — same signature in Task 1 (def), all existing rental callers (default vertical), and Task 4 (`unlockSale` wrapper). `initialStatusFor(key,{vertical})` returns `'pending'|'blocked'|null` — produced Task 1, consumed Task 2 (null-branch preserves default). `phaseOf(key, vertical)` / `hintFor(phase, vertical)` — defined Task 1, consumed Task 3 (both controllers). Sale stage keys match migration 0107 slugs exactly. SOP payload gains `locked`/`unlock_hint` (Task 3) consumed by the UI (Task 5).

**Rental safety (explicit):** no rental caller file is in the modify list; the default `vertical='leasing'` + preserved leasing maps keep behavior identical; Task 1 Step 6 asserts leasing parity and Task 6 Step 2 re-checks a rental unlock path.
