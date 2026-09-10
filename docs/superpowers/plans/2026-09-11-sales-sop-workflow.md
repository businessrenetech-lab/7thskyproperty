# Sales SOP Workflow (create + link + surface) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give a sale property its SOP workflow by find-or-creating a SOP Project from a seeded seller-sale template, linked to the property, and surfacing its stages + checklists + evidence on the property file — reusing the existing project engine for all stage work.

**Architecture:** Migration 0107 inserts a `properties_sale` workflow template (10 sale stages). A shared `createProjectFromTemplate` helper (extracted from `project.controller.create`, behavior identical) is used by a new find-or-create sales-SOP endpoint. The property file gets a Workflow section that reads the SOP and drives stages via the existing `PATCH /projects/:id/stages/:stageId`. No engine or money change.

**Tech Stack:** Node/Express/Sequelize (`:50001`, sequelize-cli migrations), React 18 + Vite. Verification = migrate + live curls + `npm run build` + browser + backend harnesses (unchanged).

**Spec:** `docs/superpowers/specs/2026-09-11-sales-sop-workflow-design.md`

## Global Constraints

- **Reuse, don't reinvent.** The Project/ProjectStage engine and `updateStage` are untouched. Extract `createProjectFromTemplate` from `project.controller.create` and have `create` call it (identical behavior). Stage advancement/checklist/evidence use the existing `PATCH /api/projects/:id/stages/:stageId`.
- **Additive only.** Migration 0107 inserts one template row (idempotent, with `down`); no table change. Backend `npm test` (27/0) + `npm run test:full` (28/0) stay green.
- **One SOP project per property.** Find-or-create keys on `property_id` + `vertical_key='properties_sale'`, guarded inside a transaction against double-submit.
- **Branch-scoped + role-gated** like the other sales routes (`READ`/`PREPARE` from `sales.routes`).
- **Evidence uploads use `ui/UploadButton`** (standing preference), writing the returned URL into the checklist item's `evidence_url`.
- Branch `air-conditioning/phase-0-duplicate`. Commit after each task. Footer: `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.

## File Structure

- `backend/migrations/0107-sales-sop-template.js` — **create**: insert `properties_sale` template.
- `backend/services/workflowProject.service.js` — **create**: `createProjectFromTemplate(...)` (extracted).
- `backend/controllers/project.controller.js` — **modify**: `create` calls the helper.
- `backend/controllers/salesSop.controller.js` — **create**: `getSop`, `ensureSop` (find-or-create).
- `backend/routes/sales.routes.js` — **modify**: two SOP routes.
- `backend/seeders/0002-workflows.js` — **modify**: add `properties_sale` for parity (data only).
- `admin-portal/src/screens/sales/SalesPropertyFile.jsx` — **modify**: Workflow section.

**Schema:** migration 0107 (one template row).

---

### Task 1: Migration — seller-sale SOP template

**Files:** Create `backend/migrations/0107-sales-sop-template.js`; modify `backend/seeders/0002-workflows.js`.

- [ ] **Step 1: Migration.** Insert the `properties_sale` template idempotently (mirror the seeder's stage shape: `{key:slug(name), name, order, gate:true, checklist:[{label,required}], required_docs:[]}`):
```js
'use strict';
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
const SALE_STAGES = [
  ['Enquiry & Consultation', ['Seller/property/source captured', 'Consultation recorded', 'Phase-1 quotation/agreement issued', 'Inspection scheduled']],
  ['Inspection & Assessment', ['Condition report + photos', 'Preparation recommendations', 'Comparative market analysis (if applicable)']],
  ['Documents & Risk', ['Deed / mutation / taxes / utilities verified', 'Succession/approvals as applicable', 'Seller indemnity', 'Minimum estimated value discussed', 'Risk decision recorded']],
  ['Agreement & Phase-2 Approval', ['Scope, commission, exclusivity, dates', 'Phase-2 approved + payment schedule', 'Staff assigned']],
  ['Preparation', ['Approved quote + supplier assignment', 'Work evidence + completion', 'Or explicit not-required decision']],
  ['Marketing & Listing', ['Approved copy/media/pricing', 'Publish locations + campaign refs', 'Listing activation']],
  ['Buyer Enquiries & Inspections', ['Routed enquiries + screening', 'Viewing calendar', 'Feedback + seller updates']],
  ['Offers & Negotiation', ['Offer comparison', 'Written approval', 'Price-limit exception (if applicable)', 'Versioned counters']],
  ['Agreement & Settlement', ['Contract/registration/payment/possession milestones', 'Fee collection', 'Payout evidence']],
  ['Closure & Post-Sale', ['Handover pack', 'Closing statement', 'Feedback + archive', 'Follow-up + resolved exceptions']],
];
module.exports = {
  up: async (q, S) => {
    const now = new Date();
    const stages = SALE_STAGES.map(([name, items], i) => ({ key: slug(name), name, order: i + 1, gate: true, checklist: items.map((label) => ({ label, required: true })), required_docs: [] }));
    await q.sequelize.query('DELETE FROM workflow_templates WHERE vertical_key = :v', { replacements: { v: 'properties_sale' } });
    await q.bulkInsert('workflow_templates', [{ vertical_key: 'properties_sale', name: 'Residential Sale SOP', stages: JSON.stringify(stages), is_active: true, created_at: now, updated_at: now }]);
  },
  down: async (q) => { await q.sequelize.query("DELETE FROM workflow_templates WHERE vertical_key = 'properties_sale'"); },
};
```

- [ ] **Step 2: Seeder parity.** In `backend/seeders/0002-workflows.js` `DATA`, add a `properties_sale` entry with `{ template: 'Residential Sale SOP', stages: [{name, checklist:[...]}, …10], registers: [] }` mirroring the 10 stages above (so a fresh `db:seed` reproduces it). Data only; the migration is the source of truth for existing DBs.

- [ ] **Step 3: Migrate + verify.** `cd backend && npx sequelize-cli db:migrate` → 0107 up. Node check:
```
node -e "const s=require('./config/db.config');s.query(\"SELECT vertical_key,name,JSON_LENGTH(stages) n FROM workflow_templates WHERE vertical_key='properties_sale'\",{type:s.QueryTypes.SELECT}).then(r=>{console.log(r);process.exit(0)})"
```
Expect one row, `n = 10`.

- [ ] **Step 4: Commit** — `feat(sales-sop): seller-sale SOP workflow template (migration 0107)`

---

### Task 2: Shared createProjectFromTemplate helper

**Files:** Create `backend/services/workflowProject.service.js`; modify `backend/controllers/project.controller.js`.

**Interfaces:** `createProjectFromTemplate({ branch_id, vertical_key, property_id, client_id, contact_id, title, actorId, status }, transaction) → Project` (creates the project + its stages from the template).

- [ ] **Step 1: Extract the helper** verbatim from `project.controller.create`'s transaction body:
```js
const sequelize = require('../config/db.config');
const Project = require('../models/Project');
const ProjectStage = require('../models/ProjectStage');
const { generateCode } = require('../utils/codeGenerator');

async function createProjectFromTemplate(meta, transaction) {
  const p = await Project.create({
    branch_id: meta.branch_id, vertical_key: meta.vertical_key, property_id: meta.property_id || null,
    client_id: meta.client_id || null, contact_id: meta.contact_id || null, service_id: meta.service_id || null,
    title: meta.title, priority: meta.priority || 'medium', value: meta.value || null,
    start_date: meta.start_date || null, due_date: meta.due_date || null, notes: meta.notes || null,
    project_code: await generateCode(Project, 'project_code', 'SSPC-PJ-'),
    status: meta.status || 'lead', created_by: meta.actorId || null,
  }, { transaction });
  if (meta.vertical_key) {
    const [tpl] = await sequelize.query(
      'SELECT stages FROM workflow_templates WHERE vertical_key = :v AND is_active = 1 ORDER BY id ASC LIMIT 1',
      { replacements: { v: meta.vertical_key }, transaction },
    );
    let stages = [];
    try { stages = tpl[0] ? (typeof tpl[0].stages === 'string' ? JSON.parse(tpl[0].stages) : tpl[0].stages) : []; } catch { stages = []; }
    for (let i = 0; i < stages.length; i++) {
      const s = stages[i];
      await ProjectStage.create({
        project_id: p.id, stage_key: s.key, stage_name: s.name, sort_order: s.order ?? i + 1,
        status: i === 0 ? 'in_progress' : 'pending',
        checklist: (s.checklist || []).map((c) => ({ label: c.label, required: !!c.required, done: false, detailed_task: c.detailed_task || '', responsible: c.responsible || '', evidence_required: c.evidence_required || '', output: c.output || '', evidence_url: '', evidence_name: '', remarks: '' })),
        required_documents: s.required_docs || [],
      }, { transaction });
    }
    if (stages[0]) await p.update({ current_stage_key: stages[0].key }, { transaction });
  }
  return p;
}
module.exports = { createProjectFromTemplate };
```

- [ ] **Step 2: Use it in `project.controller.create`.** Replace the inline body inside its `sequelize.transaction` with a call to `createProjectFromTemplate({ ...meta, branch_id: resolveBranchId(req, req.body.branch_id), actorId: req.user?.id }, t)`. Keep the surrounding `create`/response (`hydrate`) exactly. This is a pure refactor — behavior identical.

- [ ] **Step 3: Verify no regression.** Restart `:50001`; `POST /api/projects {title:'x', vertical_key:'water_tank'}` still returns a project with its stages (spot-check the existing engine unbroken). `cd backend && npm test` → 27/0.

- [ ] **Step 4: Commit** — `refactor(projects): extract createProjectFromTemplate (shared, behavior-identical)`

---

### Task 3: Sales-SOP find-or-create endpoint

**Files:** Create `backend/controllers/salesSop.controller.js`; modify `backend/routes/sales.routes.js`.

**Interfaces:** `GET /api/sales/properties/:propertyId/sop` → `{ data: project|null }`; `POST` → `{ data: project }` (find-or-create). Project hydrated like `project.controller` (import its `hydrate` or re-hydrate here).

- [ ] **Step 1: Controller.**
```js
const sequelize = require('../config/db.config');
const Project = require('../models/Project');
const ProjectStage = require('../models/ProjectStage');
const Property = require('../models/Property');
const { createProjectFromTemplate } = require('../services/workflowProject.service');
const { asyncHandler, branchScope } = require('../utils/controllerHelpers');

const arr = (v) => { if (Array.isArray(v)) return v; try { return JSON.parse(v || '[]'); } catch { return []; } };
const hydrate = (p) => {
  if (!p) return null;
  const o = p.toJSON ? p.toJSON() : p;
  if (o.stages) o.stages = o.stages.map((s) => ({ ...s, checklist: arr(s.checklist), required_documents: arr(s.required_documents) }));
  return o;
};
const VERTICAL = 'properties_sale';
const loadSop = (propertyId, req) => Project.findOne({
  where: { property_id: propertyId, vertical_key: VERTICAL, ...branchScope(req) },
  include: [{ model: ProjectStage, as: 'stages' }],
  order: [[{ model: ProjectStage, as: 'stages' }, 'sort_order', 'ASC']],
});

exports.getSop = asyncHandler(async (req, res) => {
  res.json({ data: hydrate(await loadSop(req.params.propertyId, req)) });
});

exports.ensureSop = asyncHandler(async (req, res) => {
  const property = await Property.findOne({ where: { id: req.params.propertyId, ...branchScope(req) } });
  if (!property) return res.status(404).json({ error: 'Property not found.' });
  const existing = await loadSop(req.params.propertyId, req);
  if (existing) return res.json({ data: hydrate(existing) });
  await sequelize.transaction(async (t) => {
    // Re-check inside the tx to avoid a double-submit duplicate.
    const again = await Project.findOne({ where: { property_id: property.id, vertical_key: VERTICAL, ...branchScope(req) }, transaction: t, lock: t.LOCK.UPDATE });
    if (again) return;
    await createProjectFromTemplate({ branch_id: property.branch_id, vertical_key: VERTICAL, property_id: property.id, title: `SOP · ${property.property_code || property.title || property.id}`, actorId: req.user?.id }, t);
  });
  res.status(201).json({ data: hydrate(await loadSop(req.params.propertyId, req)) });
});
```

- [ ] **Step 2: Routes.** In `sales.routes.js`: `router.get('/properties/:propertyId/sop', roleMiddleware(READ), ctrl_sop.getSop); router.post('/properties/:propertyId/sop', roleMiddleware(PREPARE), ctrl_sop.ensureSop);` (require the new controller as `ctrl_sop`; place near the other `/properties/:propertyId/*` sales routes).

- [ ] **Step 3: Restart + verify (live).** Pick a sale property id. `GET …/sop` → `{data:null}`. `POST …/sop` → 201, project with 10 `properties_sale` stages (first `in_progress`), `property_id` set. `POST …/sop` again → 200 same project id (no duplicate). `PATCH /api/projects/<id>/stages/<firstStageId> {status:'done'}` → next stage `in_progress`. Paste ids/stage count.

- [ ] **Step 4: Commit** — `feat(sales-sop): find-or-create SOP project per property (GET/POST /sales/properties/:id/sop)`

---

### Task 4: Property-file Workflow section

**Files:** Modify `admin-portal/src/screens/sales/SalesPropertyFile.jsx`.

- [ ] **Step 1: SECTIONS + state.** Add `{ key: 'workflow', label: 'Workflow', icon: ClipboardCheck }` to `SECTIONS` (after `onboarding`). Add state `const [sop, setSop] = useState(undefined)` (undefined = not loaded). On entering the workflow section (or on file load), `GET /sales/properties/:id/sop` → `setSop(data.data)` (null when none).

- [ ] **Step 2: Render.** In a `section === 'workflow'` block:
  - If `sop === null`: an empty state + **"Start SOP workflow"** → `POST /sales/properties/:id/sop` then set the returned project.
  - Else render `sop.stages` in order: each as a card — stage_name, `StatusBadge status={s.status}`, and a checklist list. Each checklist item: a `label`, a done checkbox, and when `s.checklist[i].evidence_required` (or always, optional) an `UploadButton` bound to that item's `evidence_url`. Stage footer: buttons "Mark in progress"/"Mark done" and (optional) assignee/notes.
  - All writes go to `PATCH /projects/${sop.id}/stages/${stage.id}` with `{ checklist, status, notes, assigned_to }`; refetch the SOP after each (`GET …/sop`).
  - `required_documents` shown read-only.

- [ ] **Step 3: Helpers.** Import `UploadButton` from `../../ui/UploadButton`. A small `patchStage(stage, patch)` calling the projects endpoint + refetch. Keep everything inside the new section; reuse `ui/kit` + `.pm-*`.

- [ ] **Step 4: Verify.** `cd admin-portal && npm run build` → `✓ built`. Browser: open a sale property → Workflow → Start → 10 stages render; tick a checklist item + upload evidence (chip shows); Mark done a stage → next becomes in progress; reload persists (`?section=workflow` holds via the URL-backing). Paste the build tail.

- [ ] **Step 5: Commit** — `feat(sales-sop): property-file Workflow section (stages, checklists, evidence)`

---

### Task 5: End-to-end verification + wrap-up

- [ ] **Step 1: Harnesses.** `cd backend && npm test` → 27/0; `npm run test:full` → 28/0.
- [ ] **Step 2: Full flow (browser):** Start SOP on a fresh sale property → work two stages (tick + evidence + mark done) → advancement + persistence hold; a second Start does not duplicate.
- [ ] **Step 3: Rebuild dist + work-log.** `admin-portal npm run build`; append an AGENT_WORK_LOG entry; `git add admin-portal/dist AGENT_WORK_LOG.md`.
- [ ] **Step 4: Commit** — `chore(sales-sop): work-log + rebuild dist; Phase 3 sub-project 4 layer 1 done`

---

## Self-Review

**Spec coverage:** §3 template/migration → Task 1; §4 find-or-create + read → Task 3 (+ shared helper Task 2); §5 Workflow section → Task 4; §6 testing → Tasks 3–5. Deferred (unlock, deadlines, buyer SOP) absent — correct. `updateStage` reused, not modified.

**Placeholder scan:** migration (with the 10 concrete stages), the extracted helper, the SOP controller, and the routes are real code; the UI task specifies exact endpoints, payloads, `UploadButton` usage and the section wiring; verification steps are concrete curls/clicks. No "TBD"/"handle errors"/"similar to".

**Type consistency:** `createProjectFromTemplate(meta, transaction)` — same signature in Task 2 (definition + `project.controller.create` call) and Task 3 (`ensureSop`). SOP payload shape `{ id, stages:[{id, stage_name, status, checklist:[{label,done,evidence_required,evidence_url,...}], required_documents}] }` produced by `hydrate` (Task 3) and consumed identically in Task 4. Endpoints `/sales/properties/:id/sop` (GET/POST) and `/projects/:id/stages/:stageId` (PATCH) match between controller, routes, and UI. Vertical `properties_sale` matches between migration, seeder, and `loadSop`.

**Open item carried to execution:** Task 2 Step 2 must preserve `project.controller.create`'s response exactly (it hydrates + returns `message`); confirm the refactor returns the same JSON by diffing a `POST /projects` response before/after (defined output: identical shape).
