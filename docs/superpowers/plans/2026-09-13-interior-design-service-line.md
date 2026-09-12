# Interior Design Solutions — Service Line Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Interior Design Solutions as a new parent group of service lines on the shared service-operations engine, with no service provider, delivering the shared framework plus the Residential vertical end-to-end.

**Architecture:** Interior Design copies no core code. Each vertical is a config entry in `serviceLines.js` consumed by the shared `/api/wt-*` engine (scoped by the `X-Service-Line` header → `serviceScope(req)`), a CSA "pack" in `wtCustomerAgreement.service.js`, a catalogue seed, and a frontend console (api.js line map + consoles.js nav + App.jsx routes). Two new config flags — `no_provider` and `no_amc` — gate off provider onboarding/agreements/compliance/payouts and AMC. Milestone invoicing from CSA Schedule C is already automatic via `wtAgreementCompletion.onCompleted` + `wtInvoice.service` once `related_type` is wired.

**Tech Stack:** Node/Express + Sequelize/MySQL (backend, port 50001, `node server.js`, sequelize-cli migrations — never `sync()`), React 18 + Vite (admin-portal, built to `dist/`). Cookie-session admin auth (`la_admin_token`).

**Spec:** `docs/superpowers/specs/2026-09-13-interior-design-service-line-design.md`

## Global Constraints

- Backend runs on port **50001**; restart via a fresh `node server.js` (background PowerShell), never `sync()` — schema changes go through **sequelize-cli migrations** in `backend/migrations/`.
- Shared tables are scoped by `service_line`; **every** shared-table query already spreads `serviceScope(req)` — new code must not bypass it.
- Service-line **code prefixes** (this increment, Residential): client `RIDS-C`, project `RIDS-P`, request `RIDR-`, assessment `RIDA-`, quotation `RIDQ-`, work_order `RIDW-`, invoice `RIDI-`. **No provider prefix.**
- CSA `related_type` convention: `<service_line>_customer_agreement` (e.g. `residential_interior_design_customer_agreement`). This is what triggers auto-invoicing — spell it exactly.
- Commits end with: `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.
- Test data is KEPT — never delete existing rows.
- Admin E2E auth is by **cookie** (`la_admin_token`), not Bearer. Loopback/internal calls must forward the cookie.
- CSA legal wording is transcribed **faithfully** from the source `.docx`; do not re-draft clauses.

---

### Task 1: Config flags + Residential service-line entry

**Files:**
- Modify: `backend/config/serviceLines.js` (add `no_provider`/`no_amc` support by convention + the `residential_interior_design` entry)
- Modify: `backend/utils/controllerHelpers.js` (add a `serviceFlags(req)` accessor)
- Test: `backend/scripts/e2eInteriorDesign.js` (created in Task 8; this task adds a focused unit check below)

**Interfaces:**
- Consumes: existing `getServiceLine(key)`, `resolveServiceLine(req)` in `controllerHelpers`/config.
- Produces:
  - `SERVICE_LINES.residential_interior_design` — full config object with `parent.key = 'interior_design'`, `api_base: 'wt'`, `route_base: 'residential-interior-design'`, `env_tag: 'RIDS'`, `catalogue_vertical: 'residential_interior_design_csa'`, `no_provider: true`, `no_amc: true`, `variations: true`, `completion_signoff: true`, `related_type.customer` set, no `related_type.provider`, no `code_prefix.provider`.
  - `serviceFlags(req) → { no_provider: boolean, no_amc: boolean, variations: boolean, completion_signoff: boolean }`

- [ ] **Step 1: Write the failing test**

Create `backend/test/interiorConfig.test.js`:
```js
const assert = require('assert');
const { getServiceLine } = require('../config/serviceLines');
const sl = getServiceLine('residential_interior_design');
assert.ok(sl, 'residential_interior_design line exists');
assert.equal(sl.parent.key, 'interior_design');
assert.equal(sl.no_provider, true);
assert.equal(sl.no_amc, true);
assert.equal(sl.related_type.customer, 'residential_interior_design_customer_agreement');
assert.ok(!sl.related_type.provider, 'no provider related_type');
assert.ok(!sl.code_prefix.provider, 'no provider code prefix');
assert.equal(sl.catalogue_vertical, 'residential_interior_design_csa');
console.log('PASS interiorConfig');
```

- [ ] **Step 2: Run it to verify it fails**

Run: `cd backend && node test/interiorConfig.test.js`
Expected: throws (line not defined yet).

- [ ] **Step 3: Add the config entry**

In `backend/config/serviceLines.js`, add a new entry to `SERVICE_LINES` modelled on the doc-verification entries (which already use `api_base: 'wt'` + `parent`). Use `accent: '#9333ea'` (distinct). Populate `ui` from the Residential SOP + CSA Schedule A: `full_label: 'Residential Interior Design'`, `project_types` (Interior Design & Planning, Renovation & Fit-Out, Furniture & Styling, Project Coordination, Mixed Scope), `categories`, `property_types` (Apartment, House, Duplex, Villa, Studio, Other), `service_catalogue` grouped by the four Schedule A groups, `equipment` relabelled (`section_label: 'Space Details'`, `type_label: 'Property Type'`, `count_label: 'Number of Rooms/Zones'`, `capacity_label: 'Approx. Area'`, `source_label: 'Design Style'`), `report_types` (Site Visit, Design Concept, Progress, Handover, Completion Sign-Off), `warranty_types`/`warranty_months` from Schedule D, `complaint_types`, `incident_types`. Set the flags `no_provider/no_amc/variations/completion_signoff: true`.

- [ ] **Step 4: Add `serviceFlags` accessor**

In `backend/utils/controllerHelpers.js`, after `serviceUi`:
```js
function serviceFlags(req) {
  const sl = getServiceLine(resolveServiceLine(req)) || {};
  return {
    no_provider: !!sl.no_provider, no_amc: !!sl.no_amc,
    variations: !!sl.variations, completion_signoff: !!sl.completion_signoff,
  };
}
```
Add `serviceFlags` to `module.exports`.

- [ ] **Step 5: Run test to verify it passes**

Run: `cd backend && node test/interiorConfig.test.js`
Expected: `PASS interiorConfig`.

- [ ] **Step 6: Commit**

```bash
git add backend/config/serviceLines.js backend/utils/controllerHelpers.js backend/test/interiorConfig.test.js
git commit -m "feat(interior): residential service-line config + no_provider/no_amc flags

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 2: Reference/capabilities exposes the flags to the frontend

**Files:**
- Modify: `backend/controllers/waterTankOps.controller.js` (the `capabilities` and/or reference handler that returns `ui`) — add `flags`
- Test: `backend/test/interiorConfig.test.js` (extend) or a small supertest-free HTTP check in the E2E harness

**Interfaces:**
- Consumes: `serviceFlags(req)` from Task 1.
- Produces: `GET /api/wt-ops/capabilities` (and the reference endpoint the console reads) returns `{ ..., flags: { no_provider, no_amc, variations, completion_signoff } }`.

- [ ] **Step 1: Locate the handler**

Run: `grep -n "exports.capabilities\|serviceUi\|exports.assessmentReference" backend/controllers/waterTankOps.controller.js`
Read the `capabilities` handler.

- [ ] **Step 2: Add flags to the response**

In the `capabilities` handler, import `serviceFlags` and include `flags: serviceFlags(req)` in the JSON.

- [ ] **Step 3: Verify via HTTP**

Restart backend, then:
Run: `curl -s -H "Cookie: $ADMIN" -H "X-Service-Line: residential_interior_design" http://127.0.0.1:50001/api/wt-ops/capabilities | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>console.log(JSON.parse(d).flags))"`
Expected: `{ no_provider: true, no_amc: true, variations: true, completion_signoff: true }`

- [ ] **Step 4: Commit**

```bash
git add backend/controllers/waterTankOps.controller.js
git commit -m "feat(interior): expose service-line flags via capabilities

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 3: Backend gating — refuse provider & AMC actions on no_provider/no_amc lines

**Files:**
- Modify: `backend/controllers/waterTankProviders.controller.js` (guard writes/reads when `serviceFlags(req).no_provider`)
- Modify: the AMC controller (`grep -rl "wt-amc\|WtAmc" backend/controllers`) — guard when `no_amc`
- Modify: `backend/services/maintenanceWorkflow.service.js` is NOT used here (that is PM); WT work-order completion lives in `backend/controllers/waterTankWorkOrder.controller.js` — make provider assignment optional when `no_provider`
- Test: `backend/test/interiorGating.test.js`

**Interfaces:**
- Consumes: `serviceFlags(req)`.
- Produces: provider endpoints return `409 { error: 'Providers are not used on this service line.' }` for a `no_provider` line; AMC endpoints return `409 { error: 'AMC is not offered on this service line.' }` for a `no_amc` line; WT work-order completion on a `no_provider` line does not require `provider_id`.

- [ ] **Step 1: Write the failing HTTP test (in E2E harness stub)**

Add to `backend/scripts/e2eInteriorDesign.js` (create now, expand in Task 8) an assertion:
```js
// provider list must be refused for the interior line
const prov = await A('GET', '/api/wt-providers', null, { 'X-Service-Line': 'residential_interior_design' });
ok(prov.status === 409, 'provider endpoints refused on interior line', `HTTP ${prov.status}`);
```
(Use the WT cookie harness helper shape; `A(method,path,body,headers)`.)

- [ ] **Step 2: Run it to verify it fails**

Run: `cd backend && node scripts/e2eInteriorDesign.js`
Expected: FAIL (provider list returns 200, not 409).

- [ ] **Step 3: Add the guard**

At the top of the provider controller's list/detail/create/update/onboarding handlers (or as a small middleware in `routes/waterTankProviders.routes.js`):
```js
const { serviceFlags } = require('../utils/controllerHelpers');
function blockIfNoProvider(req, res, next) {
  if (serviceFlags(req).no_provider) return res.status(409).json({ error: 'Providers are not used on this service line.' });
  next();
}
```
Apply `router.use(blockIfNoProvider)` in `waterTankProviders.routes.js` after `authMiddleware`. Do the same with a `blockIfNoAmc` in the AMC routes file.

- [ ] **Step 4: Make provider assignment optional on completion**

In `waterTankWorkOrder.controller.js`, find where completion/assignment requires `provider_id`. Guard: `if (!serviceFlags(req).no_provider && !provider_id) return res.status(400)...`. When `no_provider`, allow completion without a provider (the Completion Sign-Off in Task 5 is the gate).

- [ ] **Step 5: Run test to verify it passes**

Run: `cd backend && node scripts/e2eInteriorDesign.js`
Expected: the provider-refused assertion PASSES.

- [ ] **Step 6: Commit**

```bash
git add backend/controllers/waterTankProviders.controller.js backend/routes/waterTankProviders.routes.js backend/controllers/waterTankWorkOrder.controller.js backend/scripts/e2eInteriorDesign.js
git commit -m "feat(interior): gate provider + AMC endpoints off for no_provider/no_amc lines

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```
(Also stage the AMC routes file if modified.)

---

### Task 4: Residential CSA pack (faithful transcription)

**Files:**
- Modify: `backend/services/wtCustomerAgreement.service.js` (add `RIDS_PACK`, register in `PACKS`)
- Source: `C:/Users/ADMIN/Downloads/Interior Design-.../Residential Interior Design/Residential Interior Design - Customer Service Agreement - V0.2.docx`
- Test: `backend/test/interiorPack.test.js`

**Interfaces:**
- Consumes: the shared pack shape used by `WT_PACK`/`AC_PACK` (`{ vertical, doc_no, title, clauses, schedule_a_groups, code_to_schedule_a, schedule_b_rows, schedule_d_groups }` — match the exact keys `packFor`/the renderer read; confirm by reading `WT_PACK`).
- Produces: `PACKS.residential_interior_design_csa = RIDS_PACK`.

- [ ] **Step 1: Read the source + the WT_PACK shape**

Extract the CSA text: `unzip -p "<path>/Residential Interior Design - Customer Service Agreement - V0.2.docx" word/document.xml | sed -e 's/<[^>]*>/ /g' | tr -s ' '`
Read `WT_PACK` and `AC_PACK` (lines ~602–715 of `wtCustomerAgreement.service.js`) to copy the exact object shape and the clause tuple format `['TITLE', '<p>…</p>']`.

- [ ] **Step 2: Write the failing test**

Create `backend/test/interiorPack.test.js`:
```js
const assert = require('assert');
const svc = require('../services/wtCustomerAgreement.service');
// build a minimal agreement for the residential vertical
const html = svc.buildAgreementHtml
  ? svc.buildAgreementHtml({ vertical: 'residential_interior_design_csa', services: [], pricing: { items: [] }, client: { full_name: 'Test Client' }, org: {}, witnesses: [] })
  : null;
assert.ok(html, 'renderer callable');
assert.ok(/RESIDENTIAL INTERIOR DESIGN/i.test(html), 'title present');
assert.ok(/SCHEDULE A/i.test(html) && /SCHEDULE C/i.test(html), 'schedules present');
assert.ok(/SSPC-RIDS-CSA-01/.test(html), 'doc number present');
console.log('PASS interiorPack');
```
(If the public render function has a different name, read the service's `module.exports` and use the real one; adjust the test accordingly in Step 1.)

- [ ] **Step 3: Run it to verify it fails**

Run: `cd backend && node test/interiorPack.test.js`
Expected: FAIL (vertical falls back to WT pack → title mismatch).

- [ ] **Step 4: Author RIDS_PACK**

Add `const RIDS_PACK = { vertical: 'residential_interior_design_csa', doc_no: 'SSPC-RIDS-CSA-01', title: 'RESIDENTIAL INTERIOR DESIGN SOLUTIONS CUSTOMER SERVICE AGREEMENT', clauses: [ …24 clauses transcribed faithfully… ], schedule_a_groups: { 'Interior Design & Planning': [...], 'Renovation & Fit-Out': [...], 'Furniture & Styling': [...], 'Project Coordination': [...] }, code_to_schedule_a: { /* catalogue code → group */ }, schedule_b_rows: (b) => [ /* Property Address, Property Type, Rooms/Zones, Area, Scope, Timeline, Agreed Price, Warranty */ ], schedule_d_groups: [ /* warranty checklist from Schedule D */ ] };` Register: add `residential_interior_design_csa: RIDS_PACK` to the `PACKS` map. Transcribe clause bodies verbatim from the source.

- [ ] **Step 5: Run test to verify it passes**

Run: `cd backend && node test/interiorPack.test.js`
Expected: `PASS interiorPack`.

- [ ] **Step 6: Visual fidelity check**

Restart backend; render a sample agreement document via the existing document endpoint and eyeball it against the `.docx` (clause order/titles, Schedules A–D). Fix wording drift.

- [ ] **Step 7: Commit**

```bash
git add backend/services/wtCustomerAgreement.service.js backend/test/interiorPack.test.js
git commit -m "feat(interior): faithful Residential CSA pack (SSPC-RIDS-CSA-01)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 5: Completion Sign-Off (reuse WtServiceReport) + Variation (small table)

**Files:**
- Create: `backend/migrations/0121-interior-variations.js`
- Create: `backend/models/InteriorVariation.js`
- Modify: the WT service-report `report_types` reference to include `'Completion Sign-Off'` (config `ui.report_types` already set in Task 1 — verify the report create path accepts it)
- Create: `backend/controllers/interiorVariation.controller.js`
- Create: `backend/routes/interiorVariation.routes.js`; mount `/api/interior-variations` in `server.js` + `routes/manifest.js`
- Test: `backend/test/interiorVariation.test.js`

**Interfaces:**
- Consumes: `serviceScope(req)`, `resolveBranchId(req)`, `generateCode`.
- Produces:
  - Model `InteriorVariation` (table `interior_variations`): `id, branch_id, service_line, variation_code, project_id, work_order_code, client_name, description, amount_delta DECIMAL(15,2), status ENUM('draft','sent','approved','rejected') default 'draft', reason, created_by, timestamps`.
  - `POST /api/interior-variations` → create; `GET /api/interior-variations?project_id=` → list; `POST /api/interior-variations/:code/decision {decision}` → approve/reject.
  - Completion Sign-Off = a `WtServiceReport` with `report_type: 'Completion Sign-Off'` (no new table).

- [ ] **Step 1: Write the migration**

Create `backend/migrations/0121-interior-variations.js` (queryInterface.createTable `interior_variations` with the columns above; `variation_code` unique). Follow the format of an existing migration (read `backend/migrations/0120-pm-income-collected.js`).

- [ ] **Step 2: Run the migration**

Run: `cd backend && npx sequelize-cli db:migrate`
Expected: `0121-interior-variations` applied. Verify: `describe interior_variations`.

- [ ] **Step 3: Write the failing test**

Create `backend/test/interiorVariation.test.js` that loads the model and asserts create/find by `service_line` works (in-process, using the model directly against the DB), and that `report_type: 'Completion Sign-Off'` is an accepted report type for the interior line (assert it is in `getServiceLine('residential_interior_design').ui.report_types`).

- [ ] **Step 4: Run it to verify it fails**

Run: `cd backend && node test/interiorVariation.test.js`
Expected: FAIL (model file not created yet).

- [ ] **Step 5: Create model, controller, routes; mount**

Write `InteriorVariation.js` (Sequelize define, `tableName: 'interior_variations'`, `underscored: true`). Write the controller (create/list/decision, all spreading `serviceScope(req)` + `branchScope(req)`, code via `generateCode(InteriorVariation, 'variation_code', codePrefix(req,'work_order')+'V-')`). Write routes with the WT role guards (`canTransact` for create/decision, `canRead` for list). Mount `/api/interior-variations` in `server.js` and `routes/manifest.js`.

- [ ] **Step 6: Run test to verify it passes**

Run: `cd backend && node test/interiorVariation.test.js`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add backend/migrations/0121-interior-variations.js backend/models/InteriorVariation.js backend/controllers/interiorVariation.controller.js backend/routes/interiorVariation.routes.js backend/server.js backend/routes/manifest.js backend/test/interiorVariation.test.js
git commit -m "feat(interior): variations table/endpoints + completion sign-off via service report

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 6: Catalogue seed for Residential Schedule A/C service items

**Files:**
- Create: `backend/scripts/seedInteriorResidentialCatalogue.js`
- Test: run the seed + assert via the catalogue endpoint

**Interfaces:**
- Consumes: the existing catalogue model/seed pattern (`grep -rn "ServiceItem\|catalogue" backend/services/wtCatalogue.service.js`).
- Produces: ServiceItem rows with `vertical: 'residential_interior_design_csa'` covering the Schedule C professional-services / renovation / furniture line items with `standard_price`.

- [ ] **Step 1: Read the catalogue model + an existing seed**

Run: `grep -rn "vertical\|standard_price\|ServiceItem\|bulkCreate" backend/services/wtCatalogue.service.js | head` and read one existing seed if present (`ls backend/scripts | grep -i seed`).

- [ ] **Step 2: Write the seed**

Create `seedInteriorResidentialCatalogue.js` inserting the Residential Schedule A/C items (idempotent: skip codes that already exist), `vertical: 'residential_interior_design_csa'`, codes `RIDS-001…`.

- [ ] **Step 3: Run the seed**

Run: `cd backend && node scripts/seedInteriorResidentialCatalogue.js`
Expected: prints inserted count.

- [ ] **Step 4: Verify via API**

Run: `curl -s -H "Cookie: $ADMIN" -H "X-Service-Line: residential_interior_design" "http://127.0.0.1:50001/api/wt-invoices/reference" | node -e "..."` (or the catalogue endpoint) → asserts the residential items are returned.

- [ ] **Step 5: Commit**

```bash
git add backend/scripts/seedInteriorResidentialCatalogue.js
git commit -m "feat(interior): Residential Schedule A/C catalogue seed

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 7: Frontend — console, route map, routes, nav (provider/AMC hidden)

**Files:**
- Modify: `admin-portal/src/services/api.js` (`SERVICE_LINE_BY_PATH`: add `['residential-interior-design', 'residential_interior_design']`)
- Modify: `admin-portal/src/config/consoles.js` (add a `RESIDENTIAL_INTERIOR_NAV` + console entry; hide Providers/Compliance/AMC via the flags)
- Modify: `admin-portal/src/ui/Layout.jsx` (add the Interior Design parent + Residential child link)
- Modify: `admin-portal/src/App.jsx` (add the `/residential-interior-design/*` route block, mirroring the `/air-conditioning/*` block, pointing at the shared `WT*` components; plus routes for Variations + Completion Sign-Off screens if new, else reuse)

**Interfaces:**
- Consumes: `flags` from `GET /api/wt-ops/capabilities` (Task 2) to hide provider/AMC nav; the shared `WT*` screens.
- Produces: a working `/residential-interior-design` console.

- [ ] **Step 1: Map the path → service line**

In `api.js`, add `['residential-interior-design', 'residential_interior_design']` to `SERVICE_LINE_BY_PATH` (before any broader fragment).

- [ ] **Step 2: Add the console nav**

In `consoles.js`, copy the `AIR_CONDITIONING` console block to a `RESIDENTIAL_INTERIOR` block: `route_base: 'residential-interior-design'`, accent `#9333ea`, label 'Residential Interior Design'. Remove the Providers and Compliance & Audits nav items and the AMC item; add Variations and Completion Sign-Off items. Register the console in the exported map keyed by `route_base`.

- [ ] **Step 3: Add the parent + child to Layout**

In `Layout.jsx`, add an "Interior Design Solutions" parent grouping (expand-only) with a child `{ to: '/residential-interior-design', label: 'Residential Interior Design' }`, mirroring how the doc-verification parent lists its children.

- [ ] **Step 4: Add the App.jsx route block**

Copy the entire `/air-conditioning/*` `<Route>` block in `App.jsx`, replace the base with `/residential-interior-design`, and REMOVE the provider and AMC routes. Add routes for Variations (`/residential-interior-design/variations`) and Completion Sign-Off if new screens are introduced; otherwise reuse the shared work-order/report screens.

- [ ] **Step 5: Build the admin portal**

Run: `cd admin-portal && npm run build`
Expected: builds clean.

- [ ] **Step 6: Manual smoke (browser or curl the SPA route)**

Confirm `/admin/residential-interior-design` loads the dashboard, the sidebar shows no Providers/Compliance/AMC, and Clients/Quotations/Projects/Agreements/Invoices are present.

- [ ] **Step 7: Commit**

```bash
git add admin-portal/src/services/api.js admin-portal/src/config/consoles.js admin-portal/src/ui/Layout.jsx admin-portal/src/App.jsx admin-portal/dist
git commit -m "feat(interior): Residential Interior Design console (provider/AMC hidden)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 8: End-to-end verification harness

**Files:**
- Create/expand: `backend/scripts/e2eInteriorDesign.js`

**Interfaces:**
- Consumes: the cookie-session harness helpers (copy the header/`raw`/`A` helpers + `loginCookie` from `backend/scripts/e2eFullPmCookie.js`; `A` must accept a per-call `X-Service-Line` header).
- Produces: a pass/fail harness printing `N PASS / M FAIL`.

- [ ] **Step 1: Write the harness**

Assertions, all against `X-Service-Line: residential_interior_design`:
1. admin cookie session authenticates.
2. create an interior client (code starts `RIDS-C`).
3. send + sign the Residential CSA (Seventh Sky + Client + 2 witnesses) via the shared customer-agreement + signing endpoints; envelope reaches `completed`.
4. assert Schedule C **auto-drafted invoices** exist for this client on the interior line (status draft), and their codes start `RIDI-`.
5. raise a project + work order; assert completion does **not** require a provider.
6. create a **Variation** (`POST /api/interior-variations`) and approve it.
7. create a **Completion Sign-Off** service report (`report_type: 'Completion Sign-Off'`).
8. assert a WT **invoice pay-link** is obtainable (409 not-configured is a PASS — ready-for-keys).
9. **provider + AMC endpoints return 409** for this line.
10. **cross-line isolation:** the interior client/invoices do NOT appear under `X-Service-Line: water_tank`.

- [ ] **Step 2: Run the harness**

Run: `cd backend && node scripts/e2eInteriorDesign.js`
Expected: all PASS.

- [ ] **Step 3: Regression — PM + WT harnesses**

Run: `cd backend && node scripts/e2eFullPmCookie.js` (expect 31/0) and the main WT harness if present.
Expected: no regressions.

- [ ] **Step 4: Commit**

```bash
git add backend/scripts/e2eInteriorDesign.js
git commit -m "test(interior): end-to-end Residential Interior Design harness

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Self-Review

**Spec coverage:**
- Parent group + Residential vertical config → Task 1. ✓
- `no_provider`/`no_amc` gating (backend + surfaced to UI) → Tasks 1–3, 7. ✓
- Faithful Residential CSA (24 clauses + Schedules A–D, e-sign) → Task 4. ✓
- Auto-invoicing from Schedule C → free via `related_type` (Task 1 constraint) + asserted in Task 8. ✓
- Variations + Completion Sign-Off → Task 5. ✓
- Catalogue seed → Task 6. ✓
- Console/dashboard/invoices identical, provider/AMC hidden → Task 7. ✓
- Verification incl. cross-line isolation → Task 8. ✓
- Replication path (verticals 2–7) → out of scope for this plan (spec §7); each is a repeat of Tasks 1,4,6,7 with no engine work.

**Placeholder scan:** Task 2/4/6 include a "locate/read the real handler/shape" step because the exact export names must be confirmed against the file before writing the test — the step names the command and the expected shape, not a vague "figure it out." No `TODO`/`TBD` remain.

**Type consistency:** `serviceFlags` shape is identical across Tasks 1/2/3. `related_type.customer` string is fixed in Global Constraints and reused in Tasks 1/4/8. Invoice code prefix `RIDI-` and client `RIDS-C` consistent across Tasks 1/6/8. `InteriorVariation` fields defined in Task 5 and used in Task 8.

**Note for executor:** Tasks 4 and 6 depend on reading the exact `WT_PACK` shape and catalogue model first (their Step 1). Do not write the pack/seed before confirming the real keys — the shared renderer silently falls back to `WT_PACK` on an unknown vertical, so a shape mismatch fails quietly.
