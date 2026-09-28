# Business Registration — Service Line Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Business Registration the 16th service line on the shared core, so it inherits quotations, providers, work orders, invoices, portals, registers and reports, and then build the registration-specific pieces the SOP requires (parties, activities, documents, dashboards).

**Architecture:** A service line is config, not a copy (`SERVICE_MODULE_DUPLICATION.md`). Add a `business_registration` manifest to `backend/config/serviceLines.js` and a matching profile to `admin-portal/src/screens/watertank/common.jsx`; every shared table is scoped by `service_line`, every shared screen reads its wording from the manifest. Registration-specific behaviour (shareholders/directors, registration activities) becomes a flag-gated line module, exactly like the verification line's `verification_register`.

**Tech Stack:** Node + Express + Sequelize + MySQL (backend, port 50001), React 18 + Vite (admin-portal), plain-Node assert scripts for unit tests, an HTTP harness for e2e.

**Spec:** `docs/superpowers/specs/2026-09-23-business-registration-service-line-design.md`

## Global Constraints

- **Schema only via migrations**, numbered `00NN-*.js`, idempotent (`describeTable` guards). Never edit an applied migration. Next free number at time of writing: **0147**.
- **The local DB is the production DB.** Migrations must be additive. Test fixtures must be cleaned up, and nothing may be left published.
- **Never stage** `backend/server.js`, `backend/config/cors.config.js` or `AGENT_WORK_LOG.md` wholesale — another contributor has uncommitted work in the first two. For `server.js`, stage only your own hunk (recipe in Task 6). The log is appended, never committed.
- **Shared-core blast radius:** 15 live service lines read the same code. Every change must be additive and config-driven. If something cannot be, stop and raise it.
- **Service line key:** `business_registration`. **Route base:** `/business-registration` (unchanged, so existing URLs keep working). **Catalogue vertical:** `registration_registration_business`. **Customer agreement related_type:** `business_registration_agreement` (already in use — do not rename).
- Backend scripts run from `backend/`. Apply `branchScope(req)` to every query and `serviceScope(req)` to every shared-table query.
- Commit trailer on every commit:
  `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`

---

# Phase 1 — Register the line

### Task 1: Backend service manifest

**Files:**
- Modify: `backend/config/serviceLines.js`
- Test: `backend/scripts/testBusinessRegistrationLine.js`

**Interfaces:**
- Produces: service line key `business_registration` resolvable through `getServiceLine('business_registration')`, with `catalogue_vertical`, `code_prefix`, `required_docs`, `related_type`, `ui`, and the flags `doc_manager: true`, `registration_register: true`.
- Consumed by: every later task (scoping, prefixes, vocabulary, flags).

- [ ] **Step 1: Write the failing test**

Create `backend/scripts/testBusinessRegistrationLine.js`:

```js
const assert = require('assert');
const { getServiceLine, SERVICE_LINE_KEYS } = require('../config/serviceLines');

assert.ok(SERVICE_LINE_KEYS.includes('business_registration'), 'line is registered');

const sl = getServiceLine('business_registration');
assert.strictEqual(sl.label, 'Business Registration');
assert.strictEqual(sl.route_base, 'business-registration');
// The catalogue already exists under this vertical (BRC-001..020) — do not invent a new one.
assert.strictEqual(sl.catalogue_vertical, 'registration_registration_business');
// The customer agreement is already signed under this related_type; renaming it would orphan envelopes.
assert.strictEqual(sl.related_type.customer, 'business_registration_agreement');
assert.strictEqual(sl.no_provider, false, 'registration uses third-party providers');
assert.ok(sl.doc_manager, 'Phase 4 collects client documents');
assert.ok(sl.registration_register, 'line module: parties + activities');
assert.strictEqual(sl.code_prefix.quotation, 'BRQ-');
assert.strictEqual(sl.code_prefix.project, 'BR-P');
assert.ok(sl.required_docs.compliance.includes('Trade Licence'));
assert.ok(sl.service_categories.includes('RJSC Consultant'));

// Service picker comes from workbook Sheet 4.
const groups = Object.keys(sl.ui.service_catalogue);
assert.deepStrictEqual(groups, ['Trade Licence Documentation Support', 'Business Registration Coordination']);
assert.ok(sl.ui.service_catalogue['Business Registration Coordination'].includes('RJSC Registration'));

// Registration has no site visit — shared screens read this to hide scheduling language.
assert.strictEqual(sl.no_site_visit, true);

console.log('businessRegistrationLine OK');
```

- [ ] **Step 2: Run it and watch it fail**

Run: `cd backend && node scripts/testBusinessRegistrationLine.js`
Expected: `AssertionError: line is registered`

- [ ] **Step 3: Add the manifest**

In `backend/config/serviceLines.js`, add this entry after `space_planning_renovation` (keep the file's existing key order style):

```js
  business_registration: {
    key: 'business_registration',
    label: 'Business Registration',
    short: 'BRG',
    accent: '#0d9488',                 // teal — the console's existing colour
    api_base: 'wt',
    route_base: 'business-registration',
    env_tag: 'BRG',
    catalogue_vertical: 'registration_registration_business',
    no_provider: false,                // Third-Party SOP: trade licence / RJSC consultants
    no_amc: true,                      // one-off registrations, no annual maintenance
    no_site_visit: true,               // document-and-authority work, nothing is inspected on site
    delivery_model: 'third_party_provider',
    completion_signoff: true,
    doc_manager: true,                 // SOP Phase 4 — document collection
    registration_register: true,       // line module: shareholders/directors + registration activities
    code_prefix: {
      client: 'BR-C', project: 'BR-P', request: 'BRR-', assessment: 'BRA-',
      quotation: 'BRQ-', work_order: 'BRW-', invoice: 'BRI-', provider: 'BR-SP-',
    },
    required_docs: {
      compliance: ['Trade Licence', 'Company Registration', 'TIN', 'BIN', 'Professional Registration'],
      insurance: ['Professional Indemnity Insurance', 'Public Liability Insurance'],
    },
    service_categories: [
      'Trade Licence Consultant', 'RJSC Consultant', 'Corporate Secretary',
      'Business Registration Agent', 'Legal Documentation Consultant', 'Tax Registration Consultant',
    ],
    related_type: {
      customer: 'business_registration_agreement',            // EXISTING — SSPC-BR-CSA-01
      provider: 'business_registration_provider_agreement',   // new, added in Task 11
    },
    agreement_template: {
      customer: 'Business Registration Customer Service Agreement',
      provider: 'Master Service Delivery Provider Agreement',
    },
    ui: {
      full_label: 'Business Registration Services',
      project_types: ['Sole Proprietorship', 'Partnership', 'Private Limited Company',
        'Public Limited Company', 'Trade Licence Only', 'Renewal', 'Amendment', 'Mixed Scope'],
      categories: ['Trade Licence', 'Company Formation', 'RJSC', 'Tax Registration', 'Corporate Documentation'],
      service_catalogue: {
        'Trade Licence Documentation Support': ['New Trade Licence', 'Trade Licence Renewal',
          'Trade Licence Amendment', 'Municipality Documentation', 'City Corporation Documentation',
          'Local Authority Documentation', 'Business Address Documentation'],
        'Business Registration Coordination': ['Sole Proprietorship Registration',
          'Partnership Registration', 'Private Limited Company Registration',
          'Public Limited Company Registration', 'RJSC Registration', 'Business Name Registration',
          'Memorandum & Articles Coordination', 'Shareholder Documentation Coordination',
          'Director Documentation Coordination', 'Company Secretarial Coordination'],
      },
      equipment: {                     // the core's site/equipment block, re-labelled
        section_label: 'Business Details',
        type_label: 'Business Type',
        type_options: ['Sole Proprietorship', 'Partnership', 'Private Limited', 'Public Limited', 'Other'],
        count_label: 'Number of Shareholders',
        capacity_label: 'Authorised Capital',
        capacity_placeholder: 'e.g. BDT 10,00,000',
      },
    },
  },
```

- [ ] **Step 4: Run the test again**

Run: `cd backend && node scripts/testBusinessRegistrationLine.js`
Expected: `businessRegistrationLine OK`

- [ ] **Step 5: Add it to the test chain and commit**

In `backend/package.json`, add `node scripts/testBusinessRegistrationLine.js && ` immediately before `node scripts/testBusinessTeaser.js` in the `test` script.

```bash
git add backend/config/serviceLines.js backend/scripts/testBusinessRegistrationLine.js backend/package.json
git commit -m "feat(business-registration): register the 16th service line manifest

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 2: Frontend profile and request scoping

**Files:**
- Modify: `admin-portal/src/screens/watertank/common.jsx` (the `SERVICE_UI` map and `LINE_TO_BASE`)
- Modify: `admin-portal/src/services/api.js` (the `SERVICE_LINE_BY_PATH` list, ~line 45-65)
- Test: `admin-portal/src/screens/watertank/serviceProfile.test.mjs`

**Interfaces:**
- Consumes: Task 1's manifest keys (same vocabulary, frontend copy).
- Produces: `SERVICE_UI['/business-registration']` readable via `svcProfile()`/`profileForLine('business_registration')`; every admin request made from a `/business-registration/*` page carries `X-Service-Line: business_registration`.

- [ ] **Step 1: Write the failing test**

Create `admin-portal/src/screens/watertank/serviceProfile.test.mjs`:

```js
// Run: node src/screens/watertank/serviceProfile.test.mjs   (from admin-portal/)
import assert from 'node:assert';
import fs from 'node:fs';

const common = fs.readFileSync(new URL('./common.jsx', import.meta.url), 'utf8');
const api = fs.readFileSync(new URL('../../services/api.js', import.meta.url), 'utf8');

assert.ok(common.includes("'/business-registration': {"), 'SERVICE_UI has the registration profile');
assert.ok(common.includes("business_registration: '/business-registration'"), 'LINE_TO_BASE maps the line');
assert.ok(common.includes("doc_code: 'BRG'"), 'document numbers are SSPC-BRG-…');
assert.ok(/'\/business-registration',\s*'business_registration'/.test(api), 'api.js tags the header for registration pages');

// The path list is matched with includes(), so a longer path must not be shadowed by a shorter one.
const idxReg = api.indexOf("'/business-registration'");
const idxRent = api.indexOf("'/business-rent'");
assert.ok(idxReg > -1, 'registration present');
assert.ok(idxRent === -1 || idxReg < idxRent || !'/business-registration'.includes('/business-rent'),
  'registration must not be shadowed by another business path');

console.log('serviceProfile OK');
```

- [ ] **Step 2: Run it and watch it fail**

Run: `cd admin-portal && node src/screens/watertank/serviceProfile.test.mjs`
Expected: `AssertionError: SERVICE_UI has the registration profile`

- [ ] **Step 3: Add the frontend profile**

In `admin-portal/src/screens/watertank/common.jsx`, add to the `SERVICE_UI` map (follow the shape of the `'/property-documentation-verification'` entry):

```js
  '/business-registration': {
    label: 'Business Registration',
    full_label: 'Business Registration Services',
    short: 'Registration',
    doc_code: 'BRG',                 // SSPC-BRG-… document numbers
    doc_manager: true,               // Phase 4 — NID, passport, utility bill, party documents
    registration_register: true,     // line module: parties + activities
    no_site_visit: true,
    wo_consumables_label: 'Government Fees & Filings',
    accent: '#0d9488', accent_ink: '#115e59', accent_soft: '#ccfbf1',
    equipment: {
      section_label: 'Business Details',
      type_label: 'Business Type',
      type_options: ['Sole Proprietorship', 'Partnership', 'Private Limited', 'Public Limited', 'Other'],
      count_label: 'Number of Shareholders',
      capacity_label: 'Authorised Capital',
      capacity_placeholder: 'e.g. BDT 10,00,000',
      fields: [
        { key: 'proposed_name', ph: 'Proposed business name' },
        { key: 'nature', ph: 'Nature of business' },
        { key: 'directors', ph: 'Number of directors' },
      ],
    },
    report_types: ['Consultation', 'Name Clearance', 'Trade Licence', 'RJSC', 'Tax Registration', 'Completion'],
    report_placeholder: 'e.g. Name clearance obtained from RJSC; trade licence application lodged with DNCC.',
    registers: {
      incident_types: ['Name Rejection', 'Missing Documentation', 'Director Verification Delay',
        'Government Delay', 'Shareholder Dispute', 'Other'],
      warranty_hint: 'e.g. Re-filing after rejection, correction of registration details.',
      location_placeholder: 'RJSC, City Corporation, NBR…',
      incident_blurb: 'Name rejection, missing documents, verification or government delay',
      warranty_scope: 'completed registration and documentation work',
      incident_log: 'name rejections, missing documents and government delays',
      direct_cost_examples: 'Government fees, RJSC filing fees, stamps, notary and courier',
    },
  },
```

Also add to `LINE_TO_BASE` in the same file:

```js
  business_registration: '/business-registration',
```

- [ ] **Step 4: Tag the request header**

In `admin-portal/src/services/api.js`, add to `SERVICE_LINE_BY_PATH` (order matters — `includes()` matching, so keep it with the other business paths and before any shorter prefix that could shadow it):

```js
        ['/business-registration', 'business_registration'],
```

- [ ] **Step 5: Run the test and build**

Run: `cd admin-portal && node src/screens/watertank/serviceProfile.test.mjs`
Expected: `serviceProfile OK`

Run: `cd admin-portal && npm run build`
Expected: `✓ built`

- [ ] **Step 6: Commit**

```bash
git add admin-portal/src/screens/watertank/common.jsx admin-portal/src/services/api.js admin-portal/src/screens/watertank/serviceProfile.test.mjs
git commit -m "feat(business-registration): frontend service profile + request scoping

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 3: Console nav and routes

**Files:**
- Modify: `admin-portal/src/config/consoles.js` (replace `BUSINESS_REG_NAV`, keep `businessRegistrationConsole`)
- Modify: `admin-portal/src/App.jsx` (replace the 8-route registration block at ~1557-1564)
- Modify: `admin-portal/src/screens/BusinessRegistrationConsole.jsx`

**Interfaces:**
- Consumes: Task 2's profile (accent, labels) and Task 1's flags.
- Produces: the registration console rendering the shared screens at `/business-registration/*`; nav groups keyed `br-*`.

- [ ] **Step 1: Replace the nav with a rebased one**

In `admin-portal/src/config/consoles.js`, replace the whole `BUSINESS_REG_NAV` array (currently 4 groups / 7 items) with:

```js
// Registration rides the shared service-line core, so its nav is the Water Tank nav
// rebased — minus AMC and site assessments (nothing is inspected on site), plus the
// registration-specific Documents, Parties and Activities screens.
export const BUSINESS_REG_NAV = rebaseNav(WATER_TANK_NAV, '/water-tank', '/business-registration')
  .map((g) => {
    if (g.key.endsWith('intake')) {
      return { ...g, items: g.items
        .filter((it) => !/\/site-assessments$/.test(it.to))
        .map((it) => (/\/service-requests$/.test(it.to) ? { ...it, label: 'Enquiries' } : it)) };
    }
    if (g.key.endsWith('delivery')) {
      return { ...g, items: [
        ...g.items.filter((it) => !/\/amc$/.test(it.to)),
        { to: '/business-registration/activities', label: 'Registration Activities', icon: ClipboardList },
        { to: '/business-registration/doc-manager', label: 'Client Documents', icon: FolderArchive },
      ] };
    }
    return g;
  });
```

Note: `rebaseNav` prefixes group keys with `ac-`; that is cosmetic and shared by every rebased line, so leave it.

- [ ] **Step 2: Point the console shell at the shared console**

Replace the body of `admin-portal/src/screens/BusinessRegistrationConsole.jsx` with:

```jsx
import React from 'react';
import ServiceConsole from '../ui/ServiceConsole';
import { businessRegistrationConsole } from '../config/consoles';

/*
 * BusinessRegistrationConsole — the Business Registration operations console.
 *
 * Same shell and same screens as Water Tank; only the config differs (teal accent,
 * /business-registration/* nav). Screens scope their data with the X-Service-Line
 * header (services/api.js) and the backend's serviceScope(req).
 * See SERVICE_MODULE_DUPLICATION.md for the shared-core contract.
 */
export default function BusinessRegistrationConsole() {
  return <ServiceConsole config={businessRegistrationConsole} />;
}
```

- [ ] **Step 3: Replace the route block**

In `admin-portal/src/App.jsx`, replace the eight `"/business-registration…"` routes (~1557-1564) with the shared-screen block below. Keep using the same imported component names the `/air-conditioning` block uses (they are already imported at the top of the file).

```jsx
              {/* Business Registration — shared service-line screens (see SERVICE_MODULE_DUPLICATION.md) */}
              <Route path="/business-registration" element={<WaterTankDashboard />} />
              <Route path="/business-registration/work-queue" element={<WTWorkQueue />} />
              <Route path="/business-registration/calendar" element={<WTCalendar />} />
              <Route path="/business-registration/contacts" element={<SalesContacts scope="business-registration" />} />
              <Route path="/business-registration/clients" element={<WTClients />} />
              <Route path="/business-registration/clients/new" element={<WTClientCreate />} />
              <Route path="/business-registration/clients/:code" element={<WTClientDetail />} />
              <Route path="/business-registration/service-requests" element={<WTServiceRequests />} />
              <Route path="/business-registration/service-requests/new" element={<WTServiceRequestNew />} />
              <Route path="/business-registration/quotations" element={<WTQuotations />} />
              <Route path="/business-registration/quotations/new" element={<WTQuotationDirect />} />
              <Route path="/business-registration/quotations/:code" element={<WTQuotationDetail />} />
              <Route path="/business-registration/quotations/:code/edit" element={<WTQuotationBuilder />} />
              <Route path="/business-registration/quotations/:code/agreement" element={<WTQuotationAgreement />} />
              <Route path="/business-registration/projects" element={<WTProjects />} />
              <Route path="/business-registration/projects/new" element={<WTProjectForm />} />
              <Route path="/business-registration/projects/:code" element={<WTProjectDetail />} />
              <Route path="/business-registration/projects/:code/edit" element={<WTProjectForm />} />
              <Route path="/business-registration/work-orders" element={<WTWorkOrders />} />
              <Route path="/business-registration/work-orders/:code" element={<WTWorkOrderDetail />} />
              <Route path="/business-registration/work-orders/:code/edit" element={<WTWorkOrderForm />} />
              <Route path="/business-registration/work-orders/:code/document" element={<WTWorkOrderDocument />} />
              <Route path="/business-registration/providers" element={<WaterTankProviders />} />
              <Route path="/business-registration/providers/new" element={<WaterTankProviderOnboarding />} />
              <Route path="/business-registration/providers/:id" element={<WaterTankProviderDetail />} />
              <Route path="/business-registration/providers/:code/edit" element={<WaterTankProviderOnboarding />} />
              <Route path="/business-registration/compliance" element={<WTCompliance />} />
              <Route path="/business-registration/agreements" element={<WTAgreementsHub />} />
              <Route path="/business-registration/agreements/customer" element={<WtCustomerAgreements />} />
              <Route path="/business-registration/agreements/provider" element={<WtProviderAgreements />} />
              <Route path="/business-registration/invoices" element={<WTInvoices />} />
              <Route path="/business-registration/invoices/:code" element={<WTInvoiceEditor />} />
              <Route path="/business-registration/payments" element={<WTPayments />} />
              <Route path="/business-registration/registers" element={<WTRegisters />} />
              <Route path="/business-registration/registers/:kind" element={<WTRegisters />} />
              <Route path="/business-registration/complaints" element={<WTComplaints />} />
              <Route path="/business-registration/communication" element={<WTCommLog />} />
              <Route path="/business-registration/catalogue" element={<WaterTankCatalogue />} />
              <Route path="/business-registration/doc-manager" element={<WTDocManager />} />
              <Route path="/business-registration/reports" element={<WTReports />} />
              <Route path="/business-registration/reports/:kind" element={<WTReports />} />
              <Route path="/business-registration/portal-accounts" element={<WTPortalAccounts />} />
              <Route path="/business-registration/settings" element={<WaterTankSettings />} />
              {/* Price schedule keeps its existing screen (the BRC catalogue is a sales catalogue vertical) */}
              <Route path="/business-registration/price-schedule" element={<SalesPriceSchedule scope="business_registration" title="Business Registration · Price Schedules" />} />
```

If `WTDocManager` is not already imported in `App.jsx`, add the import next to the other `watertank` screen imports:

```jsx
import WTDocManager from './screens/watertank/DocManager';
```

- [ ] **Step 4: Build and smoke-test in the browser**

Run: `cd admin-portal && npm run build`
Expected: `✓ built` with no unresolved imports.

With the backend running on :50001 and the built admin served at `http://localhost:50001/admin/`, open `/admin/business-registration`. Expected: the teal console shell, the rebased sidebar (Dashboard, Work Queue, Calendar, Contacts, Clients, Enquiries, Quotations, Projects, Work Orders, Agreements, Registration Activities, Client Documents, Providers, Compliance, Invoices, Payments, Reports, Registers, Complaints, Communication Log, Price Schedule), no console errors, and no Water Tank wording (no "Tank", no AMC).

Record any screen still showing tank/site-visit wording in the work log rather than forking the screen — Task 16 collects them.

- [ ] **Step 5: Commit**

```bash
git add admin-portal/src/config/consoles.js admin-portal/src/App.jsx admin-portal/src/screens/BusinessRegistrationConsole.jsx
git commit -m "feat(business-registration): console rides the shared service-line screens

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 3a: The nine SOP phases as project stages

**Files:**
- Modify: `backend/services/wtProject.service.js` (add `BRG_STAGES`, `BRG_CLOSURE`, and register both by line)
- Create: `backend/scripts/testRegistrationStages.js`
- Modify: `backend/package.json`

**Interfaces:**
- Consumes: nothing from earlier tasks (pure config inside the shared stage machine).
- Produces: `stagesFor('business_registration')` → the nine client-SOP phases, and `closureFor('business_registration')` → the Phase 9 closure checklist. Consumed by the shared project screens (stage bar, Lifecycle tab, progress %) and by Task 14's Registration dashboard.

The shared stage machine already keys stages by line (`STAGES_BY_LINE` / `CLOSURE_BY_LINE`, with `STAGES` as the Water Tank default), so registration is another entry — no new machinery.

- [ ] **Step 1: Write the failing test**

Create `backend/scripts/testRegistrationStages.js`:

```js
const assert = require('assert');
const svc = require('../services/wtProject.service');

// stagesFor/closureFor are internal helpers; the service exposes them for tests.
// If they are not exported yet, add them to module.exports in Step 3.
const stages = svc.stagesFor('business_registration');
const closure = svc.closureFor('business_registration');

assert.strictEqual(stages.length, 9, 'nine client-SOP phases');
assert.deepStrictEqual(
  stages.map((s) => s.key),
  ['lead_management', 'consultation', 'commercial_approval', 'document_collection',
   'provider_assignment', 'service_delivery', 'quality_assurance', 'client_reporting', 'project_completion'],
  'stage keys follow the SOP order',
);

// Gates: commercial approval needs the agreement, delivery needs a provider.
assert.strictEqual(stages.find((s) => s.key === 'commercial_approval').gate, 'quotation');
assert.strictEqual(stages.find((s) => s.key === 'provider_assignment').gate, 'agreement');
assert.strictEqual(stages.find((s) => s.key === 'service_delivery').gate, 'provider');

// Progress runs 0-100 and never goes backwards.
const pcts = stages.map((s) => s.pct);
assert.ok(pcts.every((p, i) => i === 0 || p > pcts[i - 1]), 'progress increases monotonically');
assert.strictEqual(pcts[pcts.length - 1], 100, 'the last stage is 100%');

// Closure reflects SOP Phase 9, not tank cleaning.
const closureKeys = closure.map((c) => c.key);
for (const k of ['deliverables_issued', 'final_invoice', 'final_payment', 'client_feedback', 'records_archived']) {
  assert.ok(closureKeys.includes(k), `closure has ${k}`);
}
assert.ok(!closureKeys.includes('water_test'), 'no water testing on a registration project');

// Other lines are untouched.
assert.strictEqual(svc.stagesFor('water_tank').length, 11, 'Water Tank keeps its eleven stages');
assert.ok(svc.closureFor('water_tank').map((c) => c.key).includes('water_test'), 'Water Tank keeps its closure');

console.log('registrationStages OK');
```

- [ ] **Step 2: Run it and watch it fail**

Run: `cd backend && node scripts/testRegistrationStages.js`
Expected: `TypeError: svc.stagesFor is not a function` (or an assertion failure on the stage count).

- [ ] **Step 3: Add the stages, the closure and the exports**

In `backend/services/wtProject.service.js`, after the `RIDS_CLOSURE` block, add:

```js
/* Business Registration — the nine phases of SOP Business Registration Client V0.1.
 * Document-and-authority work: no site assessment, no AMC. The gates are the SOP's
 * own: nothing is delivered before the agreement and deposit, and nothing closes
 * before the final invoice is paid. */
const BRG_STAGES = [
  { key: 'lead_management', label: 'Lead Management', sop: 'Phase 1 Steps 1–3', phase: 'Phase 1 — Lead Management', pct: 8 },
  { key: 'consultation', label: 'Consultation & Structure Advice', sop: 'Phase 2 Steps 4–6', phase: 'Phase 2 — Consultation', pct: 18 },
  { key: 'commercial_approval', label: 'Quotation, Agreement & Deposit', sop: 'Phase 3 Steps 7–9', phase: 'Phase 3 — Commercial Approval', pct: 30, gate: 'quotation' },
  { key: 'document_collection', label: 'Document Collection & Verification', sop: 'Phase 4 Steps 10–12', phase: 'Phase 4 — Document Collection', pct: 42, gate: 'agreement' },
  { key: 'provider_assignment', label: 'Provider Assignment', sop: 'Phase 5 Steps 13–15', phase: 'Phase 5 — Provider Assignment', pct: 54, gate: 'agreement' },
  { key: 'service_delivery', label: 'Registration & Government Liaison', sop: 'Phase 6 Steps 16–18', phase: 'Phase 6 — Service Delivery', pct: 70, gate: 'provider' },
  { key: 'quality_assurance', label: 'Quality Assurance', sop: 'Phase 7 Steps 19–21', phase: 'Phase 7 — Quality Assurance', pct: 82 },
  { key: 'client_reporting', label: 'Client Reporting & Handover', sop: 'Phase 8 Steps 22–23', phase: 'Phase 8 — Client Reporting', pct: 92 },
  { key: 'project_completion', label: 'Final Invoice, Payment & Closure', sop: 'Phase 9 Steps 24–27', phase: 'Phase 9 — Project Completion', pct: 100 },
];

/* Business Registration closure — SOP Phase 9 Steps 24–27. */
const BRG_CLOSURE = [
  { key: 'registration_completed', label: 'Registration completed and certificates obtained', sop: 'Phase 8 Step 23' },
  { key: 'deliverables_issued', label: 'Final documents delivered to the client', sop: 'Phase 8 Step 23' },
  { key: 'final_invoice', label: 'Final invoice issued', sop: 'Phase 9 Step 24' },
  { key: 'final_payment', label: 'Final payment received', sop: 'Phase 9 Step 25' },
  { key: 'client_feedback', label: 'Client feedback collected', sop: 'Phase 9 Step 26' },
  { key: 'records_archived', label: 'Project records archived', sop: 'Phase 9 Step 27' },
];
```

Then register them on the two by-line maps (add the key to each existing object literal):

```js
const STAGES_BY_LINE = { /* …existing entries… */, business_registration: BRG_STAGES };
const CLOSURE_BY_LINE = { /* …existing entries… */, business_registration: BRG_CLOSURE };
```

Finally, export the two helpers so they can be tested. Find the file's `module.exports` and add `stagesFor` and `closureFor` to it, keeping everything already exported:

```js
module.exports = { /* …existing exports… */, stagesFor, closureFor };
```

- [ ] **Step 4: Run the test**

Run: `cd backend && node scripts/testRegistrationStages.js`
Expected: `registrationStages OK`

- [ ] **Step 5: Confirm the other lines did not move**

```bash
cd backend && node -e "
const s = require('./services/wtProject.service');
for (const l of ['water_tank','air_conditioning','residential_interior_design','business_registration'])
  console.log(l.padEnd(30), s.stagesFor(l).length, 'stages |', s.closureFor(l).length, 'closure items');
"
```

Expected: Water Tank and Air Conditioning 11 stages, residential interior 10, business registration 9 — and no errors.

- [ ] **Step 6: Add to the chain and commit**

Add `node scripts/testRegistrationStages.js && ` to the `test` script in `backend/package.json`, after `testBusinessRegistrationLine.js`.

```bash
git add backend/services/wtProject.service.js backend/scripts/testRegistrationStages.js backend/package.json
git commit -m "feat(business-registration): the nine SOP phases as project stages and closure

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

# Phase 2 — The registration line module (parties + activities)

### Task 4: Key the registration children to the shared project

**Files:**
- Create: `backend/migrations/0147-registration-children-shared-project.js`
- Modify: `backend/models/BusinessRegistrationParty.js`, `backend/models/BusinessRegistrationActivity.js`, `backend/models/BusinessRegistrationAssessment.js`

**Interfaces:**
- Produces: `wt_project_id` (INTEGER, nullable, indexed) on `business_registration_parties`, `business_registration_activities` and `business_registration_assessments`, plus the model attribute `wt_project_id`. The legacy `project_id` column stays untouched for the two test rows.

- [ ] **Step 1: Write the migration**

Create `backend/migrations/0147-registration-children-shared-project.js`:

```js
'use strict';

/**
 * Migration 0147: registration parties, activities and assessments hang off the
 * SHARED service-line project (wt_projects) now that Business Registration runs on
 * the shared core. The legacy project_id (business_registration_projects) is left in
 * place — it still carries the handful of pre-migration rows.
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    const tables = [
      'business_registration_parties',
      'business_registration_activities',
      'business_registration_assessments',
    ];
    for (const table of tables) {
      const t = await queryInterface.describeTable(table);
      if (!t.wt_project_id) {
        await queryInterface.addColumn(table, 'wt_project_id', { type: Sequelize.INTEGER, allowNull: true });
        await queryInterface.addIndex(table, ['wt_project_id'], { name: `${table}_wt_project_id` });
      }
      if (t.project_id && t.project_id.allowNull === false) {
        await queryInterface.changeColumn(table, 'project_id', { type: Sequelize.INTEGER, allowNull: true });
      }
    }
  },
  down: async (queryInterface) => {
    for (const table of ['business_registration_parties', 'business_registration_activities', 'business_registration_assessments']) {
      await queryInterface.removeIndex(table, `${table}_wt_project_id`).catch(() => {});
      await queryInterface.removeColumn(table, 'wt_project_id').catch(() => {});
    }
  },
};
```

- [ ] **Step 2: Add the model attribute**

In each of `backend/models/BusinessRegistrationParty.js`, `BusinessRegistrationActivity.js` and `BusinessRegistrationAssessment.js`, add immediately after the `project_id` line:

```js
  wt_project_id: DataTypes.INTEGER, // shared service-line project (wt_projects) — 0147
```

If `project_id` is declared `allowNull: false`, change it to `allowNull: true` to match the migration.

- [ ] **Step 3: Run the migration**

Run: `cd backend && npm run db:migrate`
Expected: `0147-registration-children-shared-project: migrated`

Run it a second time. Expected: `No migrations were executed` (and re-running `up` by hand would be a no-op thanks to the guards).

- [ ] **Step 4: Commit**

```bash
git add backend/migrations/0147-registration-children-shared-project.js backend/models/BusinessRegistrationParty.js backend/models/BusinessRegistrationActivity.js backend/models/BusinessRegistrationAssessment.js
git commit -m "feat(business-registration): key parties, activities and assessment to the shared project

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 5: Parties and activities API (flag-gated line module)

**Files:**
- Create: `backend/controllers/businessRegistrationLine.controller.js`
- Create: `backend/routes/businessRegistrationLine.routes.js`
- Modify: `backend/routes/manifest.js`, `backend/server.js` (own hunk only)
- Test: `backend/scripts/e2e/businessRegistration.js` (created here, extended later)

**Interfaces:**
- Produces:
  - `GET /api/br-line/projects/:projectId/parties` → `{ data: [...] }`
  - `POST /api/br-line/projects/:projectId/parties` `{ party_role: 'shareholder'|'director', name, nid?, designation?, share_percentage?, mobile?, email?, address?, nationality?, notes? }` → 201
  - `PUT /api/br-line/parties/:id`, `DELETE /api/br-line/parties/:id`
  - `GET|POST /api/br-line/projects/:projectId/activities`, `PUT /api/br-line/activities/:id`
  - Activity types: `name_clearance`, `trade_licence`, `rjsc`, `tin`, `bin`, `vat`, `authority_liaison`
  - Every route returns 403 `{ error: 'Not available for this service line.' }` when the active line's manifest lacks `registration_register`.

- [ ] **Step 1: Write the failing e2e**

Create `backend/scripts/e2e/businessRegistration.js`:

```js
/**
 * End-to-end checks for the Business Registration service line. Needs the API on
 * :50001 (restart after backend changes). Run: node scripts/e2e/businessRegistration.js
 */
const { login, req, ok, finish, STAMP } = require('./httpHarness');

const LINE = { headers: { 'X-Service-Line': 'business_registration' } };

async function lineModule() {
  console.log('\n— Line module: parties + activities —');
  // A shared-core project for the registration line.
  const p = await req('POST', '/api/wt-projects', {
    ...LINE,
    body: { name: `Reg Project ${STAMP}`, client_name: `Client ${STAMP}`, project_type: 'Private Limited Company' },
  });
  const projectId = p.body?.data?.id;
  ok(!!projectId, 'registration project created on the shared spine', `HTTP ${p.status}`);

  const s = await req('POST', `/api/br-line/projects/${projectId}/parties`, {
    ...LINE,
    body: { party_role: 'shareholder', name: `Shareholder ${STAMP}`, nid: '1234567890', share_percentage: 60, mobile: '01711000111' },
  });
  ok(s.status === 201, 'shareholder added', `HTTP ${s.status} ${s.body?.error || ''}`);

  const d = await req('POST', `/api/br-line/projects/${projectId}/parties`, {
    ...LINE,
    body: { party_role: 'director', name: `Director ${STAMP}`, designation: 'Managing Director' },
  });
  ok(d.status === 201, 'director added');

  const list = await req('GET', `/api/br-line/projects/${projectId}/parties`, LINE);
  const roles = (list.body?.data || []).map((r) => r.party_role).sort();
  ok(JSON.stringify(roles) === JSON.stringify(['director', 'shareholder']), 'both parties listed', roles.join(','));

  const a = await req('POST', `/api/br-line/projects/${projectId}/activities`, {
    ...LINE,
    body: { activity_type: 'name_clearance', title: 'Name clearance — first choice', authority: 'RJSC' },
  });
  const activityId = a.body?.data?.id;
  ok(a.status === 201, 'activity created', `HTTP ${a.status}`);

  const rej = await req('PUT', `/api/br-line/activities/${activityId}`, {
    ...LINE,
    body: { status: 'rejected', outcome: 'rejected', rejection_reason: 'Name too similar to an existing company' },
  });
  ok(rej.status === 200 && rej.body?.data?.status === 'rejected', 'rejection recorded');

  // Another line must not reach this module.
  const wrong = await req('GET', `/api/br-line/projects/${projectId}/parties`, { headers: { 'X-Service-Line': 'water_tank' } });
  ok(wrong.status === 403, 'line module refuses other service lines', `HTTP ${wrong.status}`);

  return projectId;
}

(async () => {
  console.log(`\n===== BUSINESS REGISTRATION E2E (run ${STAMP}) =====`);
  if (!(await login())) return finish();
  await lineModule();
  finish();
})().catch((e) => { ok(false, 'harness crashed', e.message); finish(); });
```

Check `backend/scripts/e2e/httpHarness.js` supports a `headers` option on `req`. If it does not, add it: merge `opts.headers` into the request headers after the auth header, so a per-call `X-Service-Line` wins.

- [ ] **Step 2: Run it and watch it fail**

Run: `cd backend && node scripts/e2e/businessRegistration.js`
Expected: FAIL — `shareholder added  HTTP 404`

- [ ] **Step 3: Write the controller**

Create `backend/controllers/businessRegistrationLine.controller.js`:

```js
const BusinessRegistrationParty = require('../models/BusinessRegistrationParty');
const BusinessRegistrationActivity = require('../models/BusinessRegistrationActivity');
const { getServiceLine } = require('../config/serviceLines');
const { asyncHandler, branchScope, resolveBranchId, resolveServiceLine, pick } = require('../utils/controllerHelpers');

// Business Registration line module (manifest `registration_register: true`):
// shareholders/directors and the registration activities (name clearance, trade
// licence, RJSC, TIN/BIN/VAT, authority liaison). SOP Phases 2 and 6.
const PARTY_FIELDS = ['party_role', 'name', 'nid', 'designation', 'share_percentage', 'mobile', 'email', 'address', 'nationality', 'notes'];
const ACTIVITY_FIELDS = ['activity_type', 'title', 'authority', 'reference_no', 'status', 'outcome', 'rejection_reason', 'work_order_id', 'notes'];
const PARTY_ROLES = ['shareholder', 'director'];
const ACTIVITY_TYPES = ['name_clearance', 'trade_licence', 'rjsc', 'tin', 'bin', 'vat', 'authority_liaison'];

// Guard: this module exists only for lines whose manifest switches it on.
function guard(req, res) {
  if (!getServiceLine(resolveServiceLine(req)).registration_register) {
    res.status(403).json({ error: 'Not available for this service line.' });
    return false;
  }
  return true;
}

const scope = (req) => ({ ...branchScope(req) });

exports.listParties = asyncHandler(async (req, res) => {
  if (!guard(req, res)) return;
  const rows = await BusinessRegistrationParty.findAll({
    where: { wt_project_id: req.params.projectId, ...scope(req) },
    order: [['party_role', 'ASC'], ['created_at', 'ASC']],
  });
  res.json({ data: rows });
});

exports.createParty = asyncHandler(async (req, res) => {
  if (!guard(req, res)) return;
  const data = pick(req.body, PARTY_FIELDS);
  if (!PARTY_ROLES.includes(data.party_role)) return res.status(400).json({ error: 'party_role must be shareholder or director.' });
  if (!data.name) return res.status(400).json({ error: 'name is required.' });
  const row = await BusinessRegistrationParty.create({
    ...data,
    wt_project_id: Number(req.params.projectId),
    branch_id: resolveBranchId(req, req.body.branch_id),
    created_by: req.user?.id || null,
  });
  res.status(201).json({ data: row, message: 'Party added.' });
});

exports.updateParty = asyncHandler(async (req, res) => {
  if (!guard(req, res)) return;
  const row = await BusinessRegistrationParty.findOne({ where: { id: req.params.id, ...scope(req) } });
  if (!row) return res.status(404).json({ error: 'Party not found.' });
  await row.update(pick(req.body, PARTY_FIELDS));
  res.json({ data: row, message: 'Party updated.' });
});

exports.removeParty = asyncHandler(async (req, res) => {
  if (!guard(req, res)) return;
  const row = await BusinessRegistrationParty.findOne({ where: { id: req.params.id, ...scope(req) } });
  if (!row) return res.status(404).json({ error: 'Party not found.' });
  await row.destroy();
  res.json({ message: 'Party removed.' });
});

exports.listActivities = asyncHandler(async (req, res) => {
  if (!guard(req, res)) return;
  const rows = await BusinessRegistrationActivity.findAll({
    where: { wt_project_id: req.params.projectId, ...scope(req) },
    order: [['created_at', 'ASC']],
  });
  res.json({ data: rows });
});

exports.createActivity = asyncHandler(async (req, res) => {
  if (!guard(req, res)) return;
  const data = pick(req.body, ACTIVITY_FIELDS);
  if (!ACTIVITY_TYPES.includes(data.activity_type)) {
    return res.status(400).json({ error: `activity_type must be one of: ${ACTIVITY_TYPES.join(', ')}.` });
  }
  const row = await BusinessRegistrationActivity.create({
    ...data,
    status: data.status || 'pending',
    wt_project_id: Number(req.params.projectId),
    branch_id: resolveBranchId(req, req.body.branch_id),
    created_by: req.user?.id || null,
  });
  res.status(201).json({ data: row, message: 'Activity created.' });
});

// Status changes stamp their own timestamps, so the Government Liaison and Risk
// dashboards can measure turnaround and count rejections.
exports.updateActivity = asyncHandler(async (req, res) => {
  if (!guard(req, res)) return;
  const row = await BusinessRegistrationActivity.findOne({ where: { id: req.params.id, ...scope(req) } });
  if (!row) return res.status(404).json({ error: 'Activity not found.' });
  const data = pick(req.body, ACTIVITY_FIELDS);
  if (data.status === 'submitted' && !row.submitted_at) data.submitted_at = new Date();
  if (['completed', 'rejected'].includes(data.status) && !row.completed_at) data.completed_at = new Date();
  await row.update(data);
  res.json({ data: row, message: 'Activity updated.' });
});
```

- [ ] **Step 4: Add `rejection_reason` to the activity model and schema**

The controller writes `rejection_reason`, which does not exist yet. Extend migration 0147 **only if it has not been applied**; otherwise create `backend/migrations/0148-registration-activity-rejection-reason.js`:

```js
'use strict';

/** Migration 0148: activities record why the authority rejected a submission
 *  (name rejection is a named SOP risk and feeds the Risk dashboard). */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    const t = await queryInterface.describeTable('business_registration_activities');
    if (!t.rejection_reason) {
      await queryInterface.addColumn('business_registration_activities', 'rejection_reason', { type: Sequelize.TEXT, allowNull: true });
    }
  },
  down: async (queryInterface) => {
    await queryInterface.removeColumn('business_registration_activities', 'rejection_reason').catch(() => {});
  },
};
```

Add to `backend/models/BusinessRegistrationActivity.js`:

```js
  rejection_reason: DataTypes.TEXT, // why the authority rejected it (0148)
```

Run: `cd backend && npm run db:migrate`
Expected: `0148-registration-activity-rejection-reason: migrated`

- [ ] **Step 5: Add the routes**

Create `backend/routes/businessRegistrationLine.routes.js`:

```js
const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/businessRegistrationLine.controller');
const { authMiddleware, roleMiddleware } = require('../middleware/auth.middleware');

const ROLES = ['super_admin', 'branch_admin', 'property_manager', 'sales_executive', 'accounts'];
router.use(authMiddleware, roleMiddleware(ROLES));

router.get('/projects/:projectId/parties', ctrl.listParties);
router.post('/projects/:projectId/parties', ctrl.createParty);
router.put('/parties/:id', ctrl.updateParty);
router.delete('/parties/:id', ctrl.removeParty);

router.get('/projects/:projectId/activities', ctrl.listActivities);
router.post('/projects/:projectId/activities', ctrl.createActivity);
router.put('/activities/:id', ctrl.updateActivity);

module.exports = router;
```

In `backend/routes/manifest.js`, add after the existing business-registration entries:

```js
  ['/api/br-line', './businessRegistrationLine.routes'],
```

In `backend/server.js`, add after `mount('/api/business-registration-reports', …);`:

```js
mount('/api/br-line', './routes/businessRegistrationLine.routes');
```

- [ ] **Step 6: Stage only your own server.js hunk**

`server.js` carries another contributor's uncommitted work, so stage just your line:

```bash
D="C:/Users/ADMIN/AppData/Local/Temp/claude/reg"
mkdir -p "$D"
git diff -- backend/server.js > "$D/sj.diff"
python - "$D/sj.diff" "$D/sj-mine.patch" <<'PY'
import sys
src, out = sys.argv[1], sys.argv[2]
lines = open(src, encoding='utf-8').read().split('\n')
hdr, i = [], 0
while i < len(lines) and not lines[i].startswith('@@'): hdr.append(lines[i]); i += 1
hunks, cur = [], None
for l in lines[i:]:
    if l.startswith('@@'):
        if cur is not None: hunks.append(cur)
        cur = [l]
    elif cur is not None: cur.append(l)
if cur is not None: hunks.append(cur)
keep = [h for h in hunks if any('br-line' in x for x in h)]
patch = '\n'.join(hdr + [x for h in keep for x in h])
open(out, 'w', encoding='utf-8', newline='\n').write(patch if patch.endswith('\n') else patch + '\n')
print('kept', len(keep), 'of', len(hunks))
PY
git apply --cached "$D/sj-mine.patch"
git diff --cached -- backend/server.js   # must show ONLY the br-line mount
```

- [ ] **Step 7: Restart the backend and run the e2e**

Restart: stop the process listening on :50001, then `cd backend && node server.js` (background), and wait until `GET /api/public-website/properties?limit=1` answers.

Run: `cd backend && node scripts/e2e/businessRegistration.js`
Expected: all PASS, including `line module refuses other service lines  HTTP 403`.

Run: `cd backend && node scripts/testManifestParity.js`
Expected: `manifest parity OK`

- [ ] **Step 8: Commit**

```bash
git add backend/controllers/businessRegistrationLine.controller.js backend/routes/businessRegistrationLine.routes.js backend/routes/manifest.js backend/models/BusinessRegistrationActivity.js backend/migrations/0148-registration-activity-rejection-reason.js backend/scripts/e2e/businessRegistration.js
# server.js is already staged (own hunk only, Step 6)
git commit -m "feat(business-registration): parties + registration activities as a line module

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 6: Parties and Activities screens

**Files:**
- Create: `admin-portal/src/screens/watertank/registration/PartiesPanel.jsx`
- Create: `admin-portal/src/screens/watertank/registration/ActivitiesPanel.jsx`
- Create: `admin-portal/src/screens/watertank/registration/Activities.jsx` (console-level list)
- Modify: `admin-portal/src/screens/watertank/ProjectDetail.jsx` (add two tabs, gated by `svcRegistrationRegister()`)
- Modify: `admin-portal/src/screens/watertank/common.jsx` (export the flag helper)
- Modify: `admin-portal/src/App.jsx` (route for the console-level Activities screen)

**Interfaces:**
- Consumes: Task 5's `/api/br-line/*` endpoints; `svcRegistrationRegister()` from `common.jsx`.
- Produces: `<PartiesPanel projectId />`, `<ActivitiesPanel projectId />`, default-exported `Activities` screen at `/business-registration/activities`.

- [ ] **Step 1: Export the flag helper**

In `admin-portal/src/screens/watertank/common.jsx`, beside `svcVerificationRegister`:

```js
/** Whether the active console has the Registration register (parties + activities). */
export const svcRegistrationRegister = () => !!svcProfile().registration_register;
```

- [ ] **Step 2: Write the Parties panel**

Create `admin-portal/src/screens/watertank/registration/PartiesPanel.jsx`:

```jsx
import React, { useCallback, useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import api from '../../../services/api';
import { useToast } from '../../../context/ToastContext';
import { Button, Field, Input, Select, Drawer, Spinner, Badge } from '../../../ui/kit';

/** Shareholder & Director registers (workbook Sheets 5 and 6; SOP Phase 2). */
const EMPTY = { party_role: 'shareholder', name: '', nid: '', designation: '', share_percentage: '', mobile: '', email: '', address: '', nationality: 'Bangladeshi', notes: '' };

export default function PartiesPanel({ projectId }) {
  const toast = useToast();
  const [rows, setRows] = useState(null);
  const [form, setForm] = useState(null);

  const load = useCallback(async () => {
    try { const { data } = await api.get(`/br-line/projects/${projectId}/parties`); setRows(data.data || []); }
    catch { setRows([]); toast.error('Could not load shareholders and directors'); }
  }, [projectId, toast]);
  useEffect(() => { load(); }, [load]);

  const save = async () => {
    try {
      await api.post(`/br-line/projects/${projectId}/parties`, form);
      toast.success('Party added'); setForm(null); load();
    } catch (e) { toast.error(e.response?.data?.error || 'Save failed'); }
  };
  const remove = async (row) => {
    try { await api.delete(`/br-line/parties/${row.id}`); load(); }
    catch (e) { toast.error(e.response?.data?.error || 'Could not remove'); }
  };

  if (rows === null) return <Spinner />;
  const shareTotal = rows.filter((r) => r.party_role === 'shareholder')
    .reduce((n, r) => n + (Number(r.share_percentage) || 0), 0);

  return (
    <section className="pm-card" style={{ padding: 18 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0 }}>Shareholders &amp; directors</h3>
        <Button icon={Plus} onClick={() => setForm({ ...EMPTY })}>Add party</Button>
      </div>
      {shareTotal > 0 && (
        <p className="cell-sub" style={{ marginTop: 6 }}>
          Shareholding recorded: <b>{shareTotal}%</b>{shareTotal !== 100 ? ' — does not total 100%' : ''}
        </p>
      )}
      <table className="tbl" style={{ marginTop: 10 }}>
        <thead><tr><th>Name</th><th>Role</th><th>NID</th><th>Share</th><th>Contact</th><th /></tr></thead>
        <tbody>
          {rows.length === 0 && <tr><td colSpan={6} className="cell-sub">No shareholders or directors recorded yet.</td></tr>}
          {rows.map((r) => (
            <tr key={r.id}>
              <td>{r.name}{r.designation && <div className="cell-sub">{r.designation}</div>}</td>
              <td><Badge tone={r.party_role === 'director' ? 'blue' : 'green'}>{r.party_role}</Badge></td>
              <td className="cell-sub">{r.nid || '—'}</td>
              <td>{r.share_percentage != null && r.share_percentage !== '' ? `${r.share_percentage}%` : '—'}</td>
              <td className="cell-sub">{[r.mobile, r.email].filter(Boolean).join(' · ') || '—'}</td>
              <td><Button size="sm" variant="ghost" icon={Trash2} onClick={() => remove(r)}>Remove</Button></td>
            </tr>
          ))}
        </tbody>
      </table>

      {form && (
        <Drawer open title="Add shareholder or director" width={520} onClose={() => setForm(null)}
          footer={<div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <Button variant="ghost" onClick={() => setForm(null)}>Cancel</Button>
            <Button onClick={save}>Save</Button>
          </div>}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Role">
              <Select value={form.party_role} onChange={(e) => setForm({ ...form, party_role: e.target.value })}>
                <option value="shareholder">Shareholder</option>
                <option value="director">Director</option>
              </Select>
            </Field>
            <Field label="Full name *"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
            <Field label="NID / Passport"><Input value={form.nid} onChange={(e) => setForm({ ...form, nid: e.target.value })} /></Field>
            <Field label="Designation"><Input value={form.designation} onChange={(e) => setForm({ ...form, designation: e.target.value })} placeholder="e.g. Managing Director" /></Field>
            <Field label="Share %"><Input type="number" min="0" max="100" value={form.share_percentage} onChange={(e) => setForm({ ...form, share_percentage: e.target.value })} /></Field>
            <Field label="Nationality"><Input value={form.nationality} onChange={(e) => setForm({ ...form, nationality: e.target.value })} /></Field>
            <Field label="Mobile"><Input value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} /></Field>
            <Field label="Email"><Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
          </div>
          <Field label="Address"><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></Field>
        </Drawer>
      )}
    </section>
  );
}
```

- [ ] **Step 3: Write the Activities panel**

Create `admin-portal/src/screens/watertank/registration/ActivitiesPanel.jsx`:

```jsx
import React, { useCallback, useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import api from '../../../services/api';
import { useToast } from '../../../context/ToastContext';
import { Button, Field, Input, Select, Textarea, Drawer, Spinner, Badge } from '../../../ui/kit';

/** Registration activities — workbook Sheets 8-12, SOP Phase 6. */
export const ACTIVITY_TYPES = [
  ['name_clearance', 'Name Clearance'], ['trade_licence', 'Trade Licence'], ['rjsc', 'RJSC Registration'],
  ['tin', 'TIN'], ['bin', 'BIN'], ['vat', 'VAT'], ['authority_liaison', 'Authority Liaison'],
];
const STATUS_TONE = { pending: 'grey', submitted: 'blue', completed: 'green', rejected: 'red' };
const EMPTY = { activity_type: 'name_clearance', title: '', authority: '', reference_no: '', status: 'pending', notes: '' };

export default function ActivitiesPanel({ projectId }) {
  const toast = useToast();
  const [rows, setRows] = useState(null);
  const [form, setForm] = useState(null);
  const [edit, setEdit] = useState(null);

  const load = useCallback(async () => {
    try { const { data } = await api.get(`/br-line/projects/${projectId}/activities`); setRows(data.data || []); }
    catch { setRows([]); toast.error('Could not load registration activities'); }
  }, [projectId, toast]);
  useEffect(() => { load(); }, [load]);

  const create = async () => {
    try { await api.post(`/br-line/projects/${projectId}/activities`, form); toast.success('Activity created'); setForm(null); load(); }
    catch (e) { toast.error(e.response?.data?.error || 'Save failed'); }
  };
  const update = async () => {
    try { await api.put(`/br-line/activities/${edit.id}`, edit); toast.success('Activity updated'); setEdit(null); load(); }
    catch (e) { toast.error(e.response?.data?.error || 'Save failed'); }
  };

  if (rows === null) return <Spinner />;
  const label = (k) => (ACTIVITY_TYPES.find(([v]) => v === k) || [k, k])[1];

  return (
    <section className="pm-card" style={{ padding: 18 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0 }}>Registration activities</h3>
        <Button icon={Plus} onClick={() => setForm({ ...EMPTY })}>New activity</Button>
      </div>
      <table className="tbl" style={{ marginTop: 10 }}>
        <thead><tr><th>Activity</th><th>Authority</th><th>Reference</th><th>Status</th><th>Submitted</th><th /></tr></thead>
        <tbody>
          {rows.length === 0 && <tr><td colSpan={6} className="cell-sub">Nothing lodged yet.</td></tr>}
          {rows.map((r) => (
            <tr key={r.id}>
              <td>{label(r.activity_type)}<div className="cell-sub">{r.title}</div></td>
              <td className="cell-sub">{r.authority || '—'}</td>
              <td className="cell-sub">{r.reference_no || '—'}</td>
              <td>
                <Badge tone={STATUS_TONE[r.status] || 'grey'}>{r.status}</Badge>
                {r.rejection_reason && <div style={{ color: '#b91c1c', fontSize: 12 }}>{r.rejection_reason}</div>}
              </td>
              <td className="cell-sub">{r.submitted_at ? new Date(r.submitted_at).toLocaleDateString() : '—'}</td>
              <td><Button size="sm" variant="ghost" onClick={() => setEdit({ ...r })}>Update</Button></td>
            </tr>
          ))}
        </tbody>
      </table>

      {form && (
        <Drawer open title="New registration activity" width={480} onClose={() => setForm(null)}
          footer={<div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <Button variant="ghost" onClick={() => setForm(null)}>Cancel</Button><Button onClick={create}>Create</Button>
          </div>}>
          <Field label="Activity">
            <Select value={form.activity_type} onChange={(e) => setForm({ ...form, activity_type: e.target.value })}>
              {ACTIVITY_TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </Select>
          </Field>
          <Field label="Title"><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Name clearance — first choice" /></Field>
          <Field label="Authority"><Input value={form.authority} onChange={(e) => setForm({ ...form, authority: e.target.value })} placeholder="RJSC, City Corporation, NBR…" /></Field>
          <Field label="Reference no."><Input value={form.reference_no} onChange={(e) => setForm({ ...form, reference_no: e.target.value })} /></Field>
          <Field label="Notes"><Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></Field>
        </Drawer>
      )}

      {edit && (
        <Drawer open title={`Update — ${label(edit.activity_type)}`} width={480} onClose={() => setEdit(null)}
          footer={<div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <Button variant="ghost" onClick={() => setEdit(null)}>Cancel</Button><Button onClick={update}>Save</Button>
          </div>}>
          <Field label="Status">
            <Select value={edit.status} onChange={(e) => setEdit({ ...edit, status: e.target.value })}>
              <option value="pending">Pending</option>
              <option value="submitted">Submitted</option>
              <option value="completed">Completed</option>
              <option value="rejected">Rejected</option>
            </Select>
          </Field>
          <Field label="Reference no."><Input value={edit.reference_no || ''} onChange={(e) => setEdit({ ...edit, reference_no: e.target.value })} /></Field>
          <Field label="Outcome"><Input value={edit.outcome || ''} onChange={(e) => setEdit({ ...edit, outcome: e.target.value })} /></Field>
          {edit.status === 'rejected' && (
            <Field label="Rejection reason">
              <Textarea rows={2} value={edit.rejection_reason || ''} onChange={(e) => setEdit({ ...edit, rejection_reason: e.target.value })} />
            </Field>
          )}
        </Drawer>
      )}
    </section>
  );
}
```

- [ ] **Step 4: Add the two project tabs**

In `admin-portal/src/screens/watertank/ProjectDetail.jsx`:

1. Import at the top:

```jsx
import { svcRegistrationRegister } from './common';
import PartiesPanel from './registration/PartiesPanel';
import ActivitiesPanel from './registration/ActivitiesPanel';
```

2. Where the tab list is built, append the registration tabs only for this line:

```jsx
  const regTabs = svcRegistrationRegister()
    ? [['parties', 'Parties'], ['activities', 'Activities']]
    : [];
```

Add `...regTabs` to the tab array, and render beside the other tab bodies:

```jsx
      {tab === 'parties' && <PartiesPanel projectId={project.id} />}
      {tab === 'activities' && <ActivitiesPanel projectId={project.id} />}
```

Match the file's existing tab variable names — read the surrounding code and follow it rather than renaming anything.

- [ ] **Step 5: Console-level Activities screen**

Create `admin-portal/src/screens/watertank/registration/Activities.jsx`:

```jsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../../services/api';
import { useToast } from '../../../context/ToastContext';
import { PageHead, Spinner, Badge, DataTable } from '../../../ui/kit';
import { ACTIVITY_TYPES } from './ActivitiesPanel';

/** Every registration activity across projects — workbook Sheets 8-12 in one view. */
export default function Activities() {
  const toast = useToast();
  const nav = useNavigate();
  const [rows, setRows] = useState(null);

  useEffect(() => {
    api.get('/br-line/activities')
      .then(({ data }) => setRows(data.data || []))
      .catch(() => { setRows([]); toast.error('Could not load activities'); });
  }, [toast]);

  if (rows === null) return <Spinner />;
  const label = (k) => (ACTIVITY_TYPES.find(([v]) => v === k) || [k, k])[1];

  return (
    <div className="pm-scope">
      <PageHead title="Registration Activities" desc="Name clearance, trade licence, RJSC, TIN/BIN/VAT and authority liaison across every project." />
      <DataTable
        columns={[
          { key: 'activity_type', header: 'Activity', render: (r) => label(r.activity_type) },
          { key: 'project_code', header: 'Project', render: (r) => r.project_code || r.wt_project_id },
          { key: 'authority', header: 'Authority' },
          { key: 'reference_no', header: 'Reference' },
          { key: 'status', header: 'Status', render: (r) => <Badge tone={r.status === 'rejected' ? 'red' : r.status === 'completed' ? 'green' : 'blue'}>{r.status}</Badge> },
        ]}
        rows={rows}
        onRowClick={(r) => r.project_code && nav(`/business-registration/projects/${r.project_code}?tab=activities`)}
        empty="No registration activities yet."
      />
    </div>
  );
}
```

Add the backing endpoint to `backend/controllers/businessRegistrationLine.controller.js`:

```js
// GET /api/br-line/activities — every activity for this line, newest first (console list).
exports.allActivities = asyncHandler(async (req, res) => {
  if (!guard(req, res)) return;
  const rows = await BusinessRegistrationActivity.findAll({ where: scope(req), order: [['created_at', 'DESC']], limit: 500 });
  res.json({ data: rows });
});
```

and the route, **above** `/projects/:projectId/activities` so it is not shadowed:

```js
router.get('/activities', ctrl.allActivities);
```

Add the screen route in `admin-portal/src/App.jsx` beside the other registration routes:

```jsx
              <Route path="/business-registration/activities" element={<BRActivities />} />
```

with the import:

```jsx
import BRActivities from './screens/watertank/registration/Activities';
```

- [ ] **Step 6: Build, restart, verify in the browser**

Run: `cd admin-portal && npm run build` → `✓ built`
Restart the backend, then open a registration project and check: the Parties and Activities tabs appear; adding a shareholder and a director works; creating a name-clearance activity and marking it rejected shows the reason in red; `/business-registration/activities` lists it. Open a **Water Tank** project and confirm neither tab appears.

- [ ] **Step 7: Commit**

```bash
git add admin-portal/src/screens/watertank/registration admin-portal/src/screens/watertank/ProjectDetail.jsx admin-portal/src/screens/watertank/common.jsx admin-portal/src/App.jsx backend/controllers/businessRegistrationLine.controller.js backend/routes/businessRegistrationLine.routes.js
git commit -m "feat(business-registration): parties and activities screens on the shared project

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

# Phase 3 — Client documents (SOP Phase 4)

### Task 7: Required-document checklist

**Files:**
- Modify: `backend/config/serviceLines.js` (add `ui.client_docs` to the registration manifest)
- Modify: `backend/scripts/testBusinessRegistrationLine.js`
- Modify: `backend/controllers/waterTankClientDocs.controller.js` (`exports.reference`)

**Interfaces:**
- Consumes: the Doc Manager module, which reads `serviceUi(req).client_docs` and is gated by the manifest's `doc_manager` flag (both already exist).
- Produces: `GET /api/wt-client-docs/reference?project_id=` returning the registration checklist grouped as Identity / Address / Business / Parties, with per-party rows expanded.

- [ ] **Step 1: Extend the manifest test**

Append to `backend/scripts/testBusinessRegistrationLine.js`, before the final `console.log`:

```js
// SOP Phase 4 — document collection checklist.
const docs = sl.ui.client_docs;
assert.ok(Array.isArray(docs) && docs.length >= 8, 'client_docs checklist present');
const keys = docs.map((d) => d.key);
for (const k of ['nid', 'passport_photo', 'utility_bill', 'trade_licence_existing', 'shareholder_docs', 'director_docs']) {
  assert.ok(keys.includes(k), `checklist has ${k}`);
}
assert.ok(docs.find((d) => d.key === 'nid').required, 'NID is required');
// Per-party documents expand as shareholders/directors are added.
assert.strictEqual(docs.find((d) => d.key === 'shareholder_docs').per_party, 'shareholder');
assert.strictEqual(docs.find((d) => d.key === 'director_docs').per_party, 'director');
```

- [ ] **Step 2: Run it and watch it fail**

Run: `cd backend && node scripts/testBusinessRegistrationLine.js`
Expected: `AssertionError: client_docs checklist present`

- [ ] **Step 3: Add the checklist to the manifest**

Inside the `business_registration` manifest's `ui` block (Task 1), add:

```js
      // SOP Phase 4 — Document Collection (workbook Sheet 7).
      client_docs: [
        { key: 'nid', label: 'NID (owner / applicant)', group: 'Identity', category: 'identity', required: true },
        { key: 'passport', label: 'Passport (if foreign national)', group: 'Identity', category: 'identity', required: false },
        { key: 'passport_photo', label: 'Passport-size photographs', group: 'Identity', category: 'identity', required: true },
        { key: 'utility_bill', label: 'Utility bill (business address)', group: 'Address', category: 'address', required: true },
        { key: 'rental_agreement', label: 'Rental agreement (leased premises)', group: 'Address', category: 'address', required: false },
        { key: 'ownership_docs', label: 'Property ownership documents (owned premises)', group: 'Address', category: 'address', required: false },
        { key: 'trade_licence_existing', label: 'Existing trade licence (renewal / amendment)', group: 'Business', category: 'business', required: false },
        { key: 'name_clearance_letter', label: 'Name clearance letter (if already obtained)', group: 'Business', category: 'business', required: false },
        { key: 'shareholder_docs', label: 'Shareholder documents', group: 'Parties', category: 'parties', required: true, per_party: 'shareholder' },
        { key: 'director_docs', label: 'Director documents', group: 'Parties', category: 'parties', required: true, per_party: 'director' },
      ],
```

- [ ] **Step 4: Expand per-party rows in the reference endpoint**

In `backend/controllers/waterTankClientDocs.controller.js`, replace the body of `exports.reference` with the version below. Every other line is unaffected: specs without `per_party` pass straight through, and without `?project_id=` nothing expands.

```js
/** GET /reference — the required-document checklist for this line.
 *  `?project_id=` expands per-party specs (registration: one row per shareholder/director). */
exports.reference = asyncHandler(async (req, res) => {
  if (!ensureDocManager(req, res)) return;
  const specs = [];
  for (const s of clientDocSpecs(req)) {
    if (!s.per_party || !req.query.project_id) { specs.push(s); continue; }
    const BusinessRegistrationParty = require('../models/BusinessRegistrationParty');
    const parties = await BusinessRegistrationParty.findAll({
      where: { wt_project_id: req.query.project_id, party_role: s.per_party, ...branchScope(req) },
      order: [['created_at', 'ASC']],
    });
    if (!parties.length) { specs.push(s); continue; }
    parties.forEach((p) => specs.push({ ...s, key: `${s.key}_${p.id}`, label: `${s.label} — ${p.name}`, party_id: p.id }));
  }
  const groups = [];
  specs.forEach((s) => {
    let g = groups.find((x) => x.group === s.group);
    if (!g) { g = { group: s.group, items: [] }; groups.push(g); }
    g.items.push(s);
  });
  res.json({ doc_manager: true, client_docs: specs, groups });
});
```

- [ ] **Step 5: Run the test and prove other lines are unchanged**

Run: `cd backend && node scripts/testBusinessRegistrationLine.js`
Expected: `businessRegistrationLine OK`

Restart the backend, then (with a valid admin token in `$TOKEN`):

```bash
curl -s -H "X-Service-Line: water_tank" -H "Authorization: Bearer $TOKEN" \
  "http://localhost:50001/api/wt-client-docs/reference" | head -c 200
```

Expected: the Water Tank checklist exactly as before, with no `party_id` anywhere.

- [ ] **Step 6: Commit**

```bash
git add backend/config/serviceLines.js backend/controllers/waterTankClientDocs.controller.js backend/scripts/testBusinessRegistrationLine.js
git commit -m "feat(business-registration): SOP document checklist, expanding per shareholder and director

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 8: Client document link end-to-end

**Files:**
- Modify: `backend/scripts/e2e/businessRegistration.js`

**Interfaces:**
- Consumes: `POST /api/wt-client-docs/requests` and the public `/api/public/doc-request/:token` flow; Task 7's checklist.
- Produces: an e2e `documents(projectId, clientId)` proving checklist → request → public view → invalid token refused.

- [ ] **Step 1: Make the fixtures reusable**

In `lineModule()`, create the client before the project and return both ids:

```js
  const c = await req('POST', '/api/wt-clients', { ...LINE, body: { name: `Reg Client ${STAMP}`, phone: `0171${STAMP}`, email: `client${STAMP}@example.com` } });
  const clientId = c.body?.data?.id;
  ok(!!clientId, 'registration client created', `HTTP ${c.status}`);
```

pass `client_id: clientId` in the project body, and end the function with:

```js
  return { projectId, clientId };
```

- [ ] **Step 2: Add the documents section**

```js
async function documents(projectId, clientId) {
  console.log('\n— Documents: checklist, request, client link —');
  const ref = await req('GET', `/api/wt-client-docs/reference?project_id=${projectId}`, LINE);
  const keys = (ref.body?.client_docs || []).map((d) => d.key);
  ok(ref.status === 200 && keys.includes('nid'), 'registration checklist served', `${keys.length} items`);
  // Task 5 added one shareholder and one director, so the party rows expanded.
  ok(keys.some((k) => k.startsWith('shareholder_docs_')), 'shareholder document row expanded per party');
  ok(keys.some((k) => k.startsWith('director_docs_')), 'director document row expanded per party');

  const made = await req('POST', '/api/wt-client-docs/requests', {
    ...LINE,
    body: { client_id: clientId, requested_docs: ['nid', 'utility_bill'], message: `e2e ${STAMP}` },
  });
  ok([200, 201].includes(made.status), 'document request created', `HTTP ${made.status} ${made.body?.error || ''}`);
  const token = made.body?.data?.token || made.body?.token;
  ok(!!token, 'tokenised client link issued');

  if (token) {
    const pub = await req('GET', `/api/public/doc-request/${token}`, { noAuth: true });
    ok(pub.status === 200, 'client opens the link without logging in', `HTTP ${pub.status}`);
    ok(!JSON.stringify(pub.body || {}).includes('token_hash'), 'public payload never leaks the token hash');
  }
  const bad = await req('GET', '/api/public/doc-request/not-a-real-token', { noAuth: true });
  ok(bad.status === 404, 'invalid document token → 404', `HTTP ${bad.status}`);
}
```

Call it from the IIFE: `const { projectId, clientId } = await lineModule(); await documents(projectId, clientId);`

- [ ] **Step 3: Run it**

Restart the backend, then: `cd backend && node scripts/e2e/businessRegistration.js`
Expected: every check PASS.

If `createRequest` names its fields differently or returns the token under another key, read `backend/controllers/waterTankClientDocs.controller.js` and match the test to the controller — do not change the controller to suit the test.

- [ ] **Step 4: Commit**

```bash
git add backend/scripts/e2e/businessRegistration.js
git commit -m "test(business-registration): e2e for the client document link

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

# Phase 4 — Commercial approval (SOP Phase 3)

### Task 9: Government fee vs professional fee on quotations

**Files:**
- Create: `backend/services/registrationQuoteTotals.js`
- Create: `backend/scripts/testRegistrationQuoteTotals.js`
- Modify: `backend/package.json`, `admin-portal/src/screens/watertank/QuotationBuilder.jsx`

**Interfaces:**
- Produces: `quoteTotals(lines)` → `{ government, professional, subtotal }`. Quotation lines may carry `fee_kind: 'government' | 'professional'` inside the existing `lines` JSON — **no migration needed**; a missing `fee_kind` means professional, so every other line behaves exactly as before.
- Consumed by: Task 13's margin rule and Task 14's Revenue and Profitability dashboards.

- [ ] **Step 1: Write the failing test**

Create `backend/scripts/testRegistrationQuoteTotals.js`:

```js
const assert = require('assert');
const { quoteTotals } = require('../services/registrationQuoteTotals');

const lines = [
  { description: 'RJSC filing fee', amount: 12000, fee_kind: 'government' },
  { description: 'Name clearance fee', amount: 1150, fee_kind: 'government' },
  { description: 'Company formation coordination', amount: 25000, fee_kind: 'professional' },
  { description: 'Trade licence coordination', amount: 8000 },            // defaults to professional
];

const t = quoteTotals(lines);
assert.strictEqual(t.government, 13150, 'government fees add up');
assert.strictEqual(t.professional, 33000, 'professional fees add up, default included');
assert.strictEqual(t.subtotal, 46150, 'subtotal is the client-facing total');

assert.strictEqual(quoteTotals([{ amount: 100, qty: 3 }]).professional, 300, 'qty multiplies');
assert.strictEqual(quoteTotals([{ amount: 'abc' }]).subtotal, 0, 'junk amounts are zero, not NaN');
assert.strictEqual(quoteTotals(null).subtotal, 0, 'missing lines are safe');
assert.strictEqual(quoteTotals('[{"amount":50,"fee_kind":"government"}]').government, 50, 'JSON string lines parse');

console.log('registrationQuoteTotals OK');
```

- [ ] **Step 2: Run it and watch it fail**

Run: `cd backend && node scripts/testRegistrationQuoteTotals.js`
Expected: `Cannot find module '../services/registrationQuoteTotals'`

- [ ] **Step 3: Write the service**

Create `backend/services/registrationQuoteTotals.js`:

```js
/**
 * Quotation totals split by fee kind.
 *
 * Business Registration quotes mix two very different things: government fees
 * (RJSC, licence, stamps — collected from the client and paid straight to the
 * authority) and Seventh Sky's professional fee. Only the professional fee is
 * revenue, so margin and the Revenue/Profitability dashboards must never count
 * the pass-through. Lines without a fee_kind are professional, which keeps every
 * other service line's quotes behaving exactly as before.
 */
const asList = (v) => {
  if (Array.isArray(v)) return v;
  if (typeof v === 'string') { try { const p = JSON.parse(v); return Array.isArray(p) ? p : []; } catch { return []; } }
  return [];
};
const num = (v) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };

function quoteTotals(lines) {
  let government = 0;
  let professional = 0;
  for (const l of asList(lines)) {
    const value = num(l.amount) * (l.qty == null ? 1 : num(l.qty) || 1);
    if (l.fee_kind === 'government') government += value;
    else professional += value;
  }
  return { government, professional, subtotal: government + professional };
}

module.exports = { quoteTotals };
```

- [ ] **Step 4: Run the test and add it to the chain**

Run: `cd backend && node scripts/testRegistrationQuoteTotals.js`
Expected: `registrationQuoteTotals OK`

In `backend/package.json`, add `node scripts/testRegistrationQuoteTotals.js && ` to the `test` script, right after `testBusinessRegistrationLine.js`.

- [ ] **Step 5: Surface the split in the quotation builder**

In `admin-portal/src/screens/watertank/QuotationBuilder.jsx`, import the flag helper:

```jsx
import { svcRegistrationRegister } from './common';
```

In each line-item row, beside the amount field:

```jsx
              {svcRegistrationRegister() && (
                <select
                  className="select"
                  value={line.fee_kind || 'professional'}
                  onChange={(e) => updateLine(i, { ...line, fee_kind: e.target.value })}
                  title="Government fees are collected for the authority and are not Seventh Sky revenue"
                >
                  <option value="professional">Professional fee</option>
                  <option value="government">Government fee</option>
                </select>
              )}
```

Below the totals block:

```jsx
      {svcRegistrationRegister() && (
        <div className="cell-sub" style={{ marginTop: 6 }}>
          Government fees (pass-through): <b>{money(lines.filter((l) => l.fee_kind === 'government').reduce((n, l) => n + (Number(l.amount) || 0) * (Number(l.qty) || 1), 0))}</b>
          {' · '}Professional fees: <b>{money(lines.filter((l) => l.fee_kind !== 'government').reduce((n, l) => n + (Number(l.amount) || 0) * (Number(l.qty) || 1), 0))}</b>
        </div>
      )}
```

Use the file's own `updateLine`, `lines` and `money` helpers — read the surrounding code and match its names rather than introducing new ones.

- [ ] **Step 6: Build and commit**

Run: `cd admin-portal && npm run build` → `✓ built`

```bash
git add backend/services/registrationQuoteTotals.js backend/scripts/testRegistrationQuoteTotals.js backend/package.json admin-portal/src/screens/watertank/QuotationBuilder.jsx
git commit -m "feat(business-registration): split government and professional fees on quotations

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 10: Quotation → agreement → deposit

**Files:**
- Modify: `backend/scripts/e2e/businessRegistration.js`
- Modify: `backend/controllers/waterTankQuotation.controller.js` (only if a code prefix or related_type is hard-coded)

**Interfaces:**
- Consumes: Task 9's fee split; the existing quotation → agreement flow.
- Produces: an e2e `commercial(projectId, clientId)` proving quote → accept → agreement, with the fee split surviving the round trip and the registration code prefix in use.

- [ ] **Step 1: Read the real routes first**

```bash
cd backend && cat routes/waterTankQuotation.routes.js
```

Note the exact paths for create, fetch, decision and agreement-draft. The test below uses `/api/wt-quotes`, `/:code`, `/:code/decision` and `/:code/agreement-draft` — correct them to whatever the router actually declares.

- [ ] **Step 2: Add the e2e section**

```js
async function commercial(projectId, clientId) {
  console.log('\n— Commercial: quotation → agreement —');
  const q = await req('POST', '/api/wt-quotes', {
    ...LINE,
    body: {
      project_id: projectId, client_id: clientId, direct_quote: true, validity: '2026-12-31',
      lines: [
        { description: 'RJSC filing fee', amount: 12000, fee_kind: 'government' },
        { description: 'Private limited company formation coordination', amount: 25000, fee_kind: 'professional' },
      ],
    },
  });
  const code = q.body?.data?.code;
  ok([200, 201].includes(q.status), 'quotation created', `HTTP ${q.status} ${q.body?.error || ''}`);
  ok(!!code && code.startsWith('BRQ-'), 'quotation uses the registration code prefix', code);

  const got = await req('GET', `/api/wt-quotes/${code}`, LINE);
  const raw = got.body?.data?.lines;
  const parsed = typeof raw === 'string' ? JSON.parse(raw) : (raw || []);
  const gov = parsed.filter((l) => l.fee_kind === 'government');
  ok(gov.length === 1 && Number(gov[0].amount) === 12000, 'government fee survives the round trip');

  const decided = await req('POST', `/api/wt-quotes/${code}/decision`, { ...LINE, body: { decision: 'accepted' } });
  ok(decided.status === 200, 'client acceptance recorded', `HTTP ${decided.status} ${decided.body?.error || ''}`);

  const agr = await req('POST', `/api/wt-quotes/${code}/agreement-draft`, LINE);
  ok([200, 201].includes(agr.status), 'agreement drafted from the accepted quotation', `HTTP ${agr.status}`);
  const relType = agr.body?.data?.related_type || agr.body?.related_type;
  if (relType) ok(relType === 'business_registration_agreement', 'agreement carries the registration type', relType);
  return code;
}
```

- [ ] **Step 3: Run it**

Restart the backend, then: `cd backend && node scripts/e2e/businessRegistration.js`
Expected: all PASS.

If the quotation code comes back as `Q-…`, the controller is hard-coding the Water Tank prefix — change it to `codePrefix(req, 'quotation')` (imported from `utils/controllerHelpers`) rather than adding a registration special case.

- [ ] **Step 4: Commit**

```bash
git add backend/scripts/e2e/businessRegistration.js backend/controllers/waterTankQuotation.controller.js
git commit -m "test(business-registration): e2e for quotation, acceptance and agreement

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

# Phase 5 — Providers, work orders, finance

### Task 11: Providers on the shared registry

**Files:**
- Modify: `backend/scripts/e2e/businessRegistration.js`
- Modify: whichever service builds the provider agreement (find it: `grep -rl "Master Service Delivery Provider Agreement" backend/services`)

**Interfaces:**
- Consumes: `M.WtProvider` scoped by `service_line`; Task 1's `service_categories` and `required_docs`.
- Produces: an e2e `providers()` returning the new provider's id, proving the `BR-SP-` prefix and that Water Tank cannot see it.

- [ ] **Step 1: Add the e2e section**

```js
async function providers() {
  console.log('\n— Providers —');
  const p = await req('POST', '/api/wt-providers', {
    ...LINE,
    body: { company_name: `RJSC Consultants ${STAMP}`, contact_person: 'Mr Karim', phone: `0191${STAMP}`,
            email: `provider${STAMP}@example.com`, service_categories: ['RJSC Consultant'] },
  });
  ok([200, 201].includes(p.status), 'registration provider created', `HTTP ${p.status} ${p.body?.error || ''}`);
  const code = p.body?.data?.code || p.body?.data?.provider_code;
  ok(!code || code.startsWith('BR-SP-'), 'provider uses the registration code prefix', code);

  const mine = await req('GET', '/api/wt-providers', LINE);
  ok((mine.body?.data || []).some((r) => String(r.company_name || '').includes(String(STAMP))), 'provider listed on its own line');

  const other = await req('GET', '/api/wt-providers', { headers: { 'X-Service-Line': 'water_tank' } });
  ok(!(other.body?.data || []).some((r) => String(r.company_name || '').includes(String(STAMP))), 'provider invisible to Water Tank');
  return p.body?.data?.id;
}
```

- [ ] **Step 2: Run it**

Run: `cd backend && node scripts/e2e/businessRegistration.js`
Expected: all PASS. A prefix failure means the provider controller hard-codes `SP-`; fix it to `codePrefix(req, 'provider')`.

- [ ] **Step 3: Check the provider agreement reads config**

Open the provider-agreement builder and confirm the service name, provider categories and required documents come from `getServiceLine(...)`, not Water Tank literals. Replace any literal you find. Registration needs no bespoke provider-agreement code — only that the shared builder reads the manifest.

Prove the manifest side:

```bash
cd backend && node -e "
const { getServiceLine } = require('./config/serviceLines');
const sl = getServiceLine('business_registration');
console.log(sl.agreement_template.provider, '|', sl.service_categories.join(', '));
"
```

Expected: `Master Service Delivery Provider Agreement | Trade Licence Consultant, RJSC Consultant, …`

- [ ] **Step 4: Commit**

```bash
git add backend/scripts/e2e/businessRegistration.js backend/services backend/controllers
git commit -m "feat(business-registration): providers on the shared registry, agreement from the manifest

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 12: Work orders bound to a real provider

**Files:**
- Modify: `backend/scripts/e2e/businessRegistration.js`
- Modify: `admin-portal/src/screens/watertank/registration/ActivitiesPanel.jsx`

**Interfaces:**
- Consumes: Task 11's provider id; the shared work-order endpoints.
- Produces: an e2e `workOrder(projectId, providerId)` returning the work order id; activities can be linked to a work order through `work_order_id`.

- [ ] **Step 1: Add the e2e section**

```js
async function workOrder(projectId, providerId) {
  console.log('\n— Work order —');
  const w = await req('POST', '/api/wt-work-orders', {
    ...LINE,
    body: { project_id: projectId, provider_id: providerId, scope: 'Name clearance + RJSC registration', fee: 18000 },
  });
  ok([200, 201].includes(w.status), 'work order issued to a real provider record', `HTTP ${w.status} ${w.body?.error || ''}`);
  const code = w.body?.data?.code;
  ok(!code || code.startsWith('BRW-'), 'work order uses the registration prefix', code);
  ok(Number(w.body?.data?.provider_id) === Number(providerId), 'work order bound to the provider, not a typed-in name');
  return w.body?.data?.id;
}
```

- [ ] **Step 2: Let an activity reference its work order**

In `ActivitiesPanel.jsx`, load the project's work orders:

```jsx
  const [workOrders, setWorkOrders] = useState([]);
  useEffect(() => {
    api.get('/wt-work-orders', { params: { project_id: projectId } })
      .then(({ data }) => setWorkOrders(data.data || []))
      .catch(() => setWorkOrders([]));
  }, [projectId]);
```

and add to the create drawer, after the Reference field:

```jsx
          <Field label="Work order (optional)">
            <Select value={form.work_order_id || ''} onChange={(e) => setForm({ ...form, work_order_id: e.target.value || null })}>
              <option value="">— none —</option>
              {workOrders.map((w) => <option key={w.id} value={w.id}>{w.code} — {w.scope || 'work order'}</option>)}
            </Select>
          </Field>
```

- [ ] **Step 3: Run, build, commit**

Run: `cd backend && node scripts/e2e/businessRegistration.js` → all PASS
Run: `cd admin-portal && npm run build` → `✓ built`

```bash
git add backend/scripts/e2e/businessRegistration.js admin-portal/src/screens/watertank/registration/ActivitiesPanel.jsx
git commit -m "feat(business-registration): work orders bound to providers, activities linked to work orders

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 13: Project margin (professional fee minus provider cost)

**Files:**
- Create: `backend/services/registrationMargin.js`
- Create: `backend/scripts/testRegistrationMargin.js`
- Modify: `backend/package.json`

**Interfaces:**
- Consumes: `quoteTotals` (Task 9).
- Produces: `projectMargin({ quoteLines, providerCost, invoicedProfessional })` → `{ government, professional, provider_cost, gross_margin, margin_pct }`. Government fees are excluded from revenue and margin. Consumed by Task 14.

- [ ] **Step 1: Write the failing test**

Create `backend/scripts/testRegistrationMargin.js`:

```js
const assert = require('assert');
const { projectMargin } = require('../services/registrationMargin');

const quoteLines = [
  { amount: 12000, fee_kind: 'government' },
  { amount: 25000, fee_kind: 'professional' },
  { amount: 8000, fee_kind: 'professional' },
];

const m = projectMargin({ quoteLines, providerCost: 18000 });
assert.strictEqual(m.government, 12000, 'government fees reported separately');
assert.strictEqual(m.professional, 33000, 'professional fee is the revenue');
assert.strictEqual(m.provider_cost, 18000);
assert.strictEqual(m.gross_margin, 15000, 'margin = professional − provider cost, government excluded');
assert.strictEqual(m.margin_pct, 45.5, 'margin % of the professional fee, one decimal');

// Once invoices exist they win over the quote.
const inv = projectMargin({ quoteLines, providerCost: 18000, invoicedProfessional: 30000 });
assert.strictEqual(inv.professional, 30000, 'invoiced professional fee overrides the quote');
assert.strictEqual(inv.gross_margin, 12000);

// Degenerate cases must not divide by zero or return NaN.
const zero = projectMargin({ quoteLines: [], providerCost: 0 });
assert.strictEqual(zero.gross_margin, 0);
assert.strictEqual(zero.margin_pct, 0, 'no revenue means 0%, not NaN');

const loss = projectMargin({ quoteLines: [{ amount: 10000 }], providerCost: 15000 });
assert.strictEqual(loss.gross_margin, -5000, 'losses are reported, not clamped');

console.log('registrationMargin OK');
```

- [ ] **Step 2: Run it and watch it fail**

Run: `cd backend && node scripts/testRegistrationMargin.js`
Expected: `Cannot find module '../services/registrationMargin'`

- [ ] **Step 3: Write the service**

Create `backend/services/registrationMargin.js`:

```js
/**
 * Per-project profitability for Business Registration.
 *
 * Government fees (RJSC, trade licence, stamps) are collected from the client and
 * paid to the authority, so they are neither revenue nor margin — counting them
 * would flatter every project. Revenue is the professional fee: what has been
 * invoiced once invoices exist, otherwise what was quoted.
 */
const { quoteTotals } = require('./registrationQuoteTotals');

const num = (v) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };

function projectMargin({ quoteLines, providerCost = 0, invoicedProfessional = null } = {}) {
  const t = quoteTotals(quoteLines);
  const professional = invoicedProfessional == null ? t.professional : num(invoicedProfessional);
  const provider_cost = num(providerCost);
  const gross_margin = professional - provider_cost;
  const margin_pct = professional > 0 ? Math.round((gross_margin / professional) * 1000) / 10 : 0;
  return { government: t.government, professional, provider_cost, gross_margin, margin_pct };
}

module.exports = { projectMargin };
```

- [ ] **Step 4: Run the test, add to the chain, commit**

Run: `cd backend && node scripts/testRegistrationMargin.js`
Expected: `registrationMargin OK`

Add `node scripts/testRegistrationMargin.js && ` to the `test` script after `testRegistrationQuoteTotals.js`.

```bash
git add backend/services/registrationMargin.js backend/scripts/testRegistrationMargin.js backend/package.json
git commit -m "feat(business-registration): project margin excluding pass-through government fees

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

# Phase 6 — Dashboards, retirement, verification

### Task 14: The six SOP dashboards

**Files:**
- Create: `backend/controllers/businessRegistrationDashboards.controller.js`
- Create: `admin-portal/src/screens/watertank/registration/Dashboards.jsx`
- Modify: `backend/routes/businessRegistrationLine.routes.js`, `admin-portal/src/App.jsx`, `admin-portal/src/config/consoles.js`

**Interfaces:**
- Consumes: `projectMargin` (Task 13); `M.WtProject`, `M.WtQuotation`, `M.WtInvoice`, `M.WtProvider`; `BusinessRegistrationActivity`.
- Produces: `GET /api/br-line/dashboards` → `{ data: { registration, revenue, government_liaison, provider, risk, profitability } }`; screen at `/business-registration/dashboards`.

- [ ] **Step 1: Write the controller**

Create `backend/controllers/businessRegistrationDashboards.controller.js`:

```js
const M = require('../models/waterTankOps');
const BusinessRegistrationActivity = require('../models/BusinessRegistrationActivity');
const { getServiceLine } = require('../config/serviceLines');
const { asyncHandler, branchScope, serviceScope, resolveServiceLine } = require('../utils/controllerHelpers');
const { projectMargin } = require('../services/registrationMargin');

// The six dashboards named in the Business Registration workbook: Registration,
// Revenue, Government Liaison, Provider, Risk, Profitability.
const DELAY_DAYS = 14; // submitted longer ago than this and still open = delayed

exports.dashboards = asyncHandler(async (req, res) => {
  if (!getServiceLine(resolveServiceLine(req)).registration_register) {
    return res.status(403).json({ error: 'Not available for this service line.' });
  }
  const scope = { ...branchScope(req), ...serviceScope(req) };

  const [projects, quotes, invoices, providers, activities] = await Promise.all([
    M.WtProject.findAll({ where: scope }),
    M.WtQuotation.findAll({ where: scope }),
    M.WtInvoice.findAll({ where: scope }),
    M.WtProvider.findAll({ where: scope }),
    BusinessRegistrationActivity.findAll({ where: branchScope(req) }),
  ]);

  const stageOf = (p) => String(p.stage || '').toLowerCase();
  const registration = {
    new_applications: projects.filter((p) => !p.closed_at && ['lead', 'consultation', 'commercial'].includes(stageOf(p))).length,
    pending: projects.filter((p) => !p.closed_at).length,
    completed: projects.filter((p) => !!p.closed_at).length,
    rejected: activities.filter((a) => a.status === 'rejected').length,
    by_stage: [...new Set(projects.map(stageOf))].filter(Boolean)
      .map((s) => ({ stage: s, count: projects.filter((p) => stageOf(p) === s).length })),
  };

  // Revenue and margin count the professional fee only — government fees are pass-through.
  const perProject = projects.map((p) => {
    const q = quotes.find((x) => Number(x.project_id) === Number(p.id));
    return { project: p.code, name: p.name, ...projectMargin({ quoteLines: q ? q.lines : [], providerCost: p.provider_cost }) };
  });

  const revenue = {
    professional_total: perProject.reduce((n, r) => n + r.professional, 0),
    government_collected: perProject.reduce((n, r) => n + r.government, 0),
    invoiced: invoices.reduce((n, i) => n + Number(i.total || 0), 0),
    by_service: [...new Set(projects.map((p) => p.project_type))].filter(Boolean).map((t) => ({
      service: t,
      total: projects.reduce((n, p, i) => (p.project_type === t ? n + perProject[i].professional : n), 0),
    })),
  };

  const byType = (t) => activities.filter((a) => a.activity_type === t);
  const government_liaison = {
    municipality_cases: byType('trade_licence').length,
    rjsc_cases: byType('rjsc').length,
    tax_cases: byType('tin').length + byType('bin').length + byType('vat').length,
    open: activities.filter((a) => !['completed', 'rejected'].includes(a.status)).length,
  };

  const provider = {
    active: providers.filter((p) => String(p.status || '').toLowerCase() === 'active').length,
    total: providers.length,
    jobs_assigned: activities.filter((a) => a.work_order_id).length,
    jobs_completed: activities.filter((a) => a.work_order_id && a.status === 'completed').length,
    ratings: providers.filter((p) => p.satisfaction_score != null)
      .map((p) => ({ provider: p.company_name, score: Number(p.satisfaction_score) })),
  };

  const cutoff = new Date(Date.now() - DELAY_DAYS * 864e5);
  const risk = {
    delayed_applications: activities.filter((a) => a.submitted_at && !a.completed_at && new Date(a.submitted_at) < cutoff).length,
    name_clearance_rejections: byType('name_clearance').filter((a) => a.status === 'rejected').length,
    government_queries: activities.filter((a) => a.status === 'submitted').length,
    rejections: activities.filter((a) => a.status === 'rejected')
      .map((a) => ({ activity: a.activity_type, reason: a.rejection_reason, project: a.wt_project_id })),
  };

  const profitability = {
    per_project: perProject,
    provider_cost_total: perProject.reduce((n, r) => n + r.provider_cost, 0),
    gross_margin_total: perProject.reduce((n, r) => n + r.gross_margin, 0),
  };

  res.json({ data: { registration, revenue, government_liaison, provider, risk, profitability } });
});
```

Add to `backend/routes/businessRegistrationLine.routes.js`, above the `/activities` route:

```js
const dash = require('../controllers/businessRegistrationDashboards.controller');
router.get('/dashboards', dash.dashboards);
```

- [ ] **Step 2: Verify the endpoint**

Restart the backend, then:

```bash
curl -s -H "X-Service-Line: business_registration" -H "Authorization: Bearer $TOKEN" \
  http://localhost:50001/api/br-line/dashboards \
  | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>console.log(Object.keys(JSON.parse(s).data)))"
```

Expected: `[ 'registration', 'revenue', 'government_liaison', 'provider', 'risk', 'profitability' ]`
With `-H "X-Service-Line: water_tank"`: HTTP 403.

- [ ] **Step 3: Write the screen**

Create `admin-portal/src/screens/watertank/registration/Dashboards.jsx`:

```jsx
import React, { useEffect, useState } from 'react';
import api from '../../../services/api';
import { useToast } from '../../../context/ToastContext';
import { PageHead, StatCard, Spinner, Badge } from '../../../ui/kit';

const money = (n) => `BDT ${Number(n || 0).toLocaleString()}`;

function Panel({ title, children }) {
  return (
    <section className="pm-card" style={{ padding: 18, marginTop: 14 }}>
      <h3 style={{ margin: '0 0 10px', color: '#115e59' }}>{title}</h3>
      {children}
    </section>
  );
}

/** The six dashboards named in the Business Registration workbook. */
export default function Dashboards() {
  const toast = useToast();
  const [d, setD] = useState(null);

  useEffect(() => {
    api.get('/br-line/dashboards')
      .then(({ data }) => setD(data.data))
      .catch(() => toast.error('Could not load the registration dashboards'));
  }, [toast]);

  if (!d) return <Spinner />;
  const row = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 12 };

  return (
    <div className="pm-scope">
      <PageHead title="Registration Dashboards" desc="Registration, revenue, government liaison, providers, risk and profitability." />

      <Panel title="Registration">
        <div style={row}>
          <StatCard label="New applications" value={d.registration.new_applications} tone="blue" />
          <StatCard label="Pending" value={d.registration.pending} tone="amber" />
          <StatCard label="Completed" value={d.registration.completed} tone="green" />
          <StatCard label="Rejected submissions" value={d.registration.rejected} tone="red" />
        </div>
      </Panel>

      <Panel title="Revenue">
        <div style={row}>
          <StatCard label="Professional fees" value={money(d.revenue.professional_total)} tone="green" />
          <StatCard label="Government fees collected" value={money(d.revenue.government_collected)} tone="grey" />
          <StatCard label="Invoiced" value={money(d.revenue.invoiced)} tone="blue" />
        </div>
        <p className="cell-sub" style={{ marginTop: 8 }}>
          Government fees are collected for the authority and are not counted as revenue.
        </p>
      </Panel>

      <Panel title="Government liaison">
        <div style={row}>
          <StatCard label="Municipality / licence" value={d.government_liaison.municipality_cases} />
          <StatCard label="RJSC" value={d.government_liaison.rjsc_cases} />
          <StatCard label="Tax (TIN/BIN/VAT)" value={d.government_liaison.tax_cases} />
          <StatCard label="Open with authorities" value={d.government_liaison.open} tone="amber" />
        </div>
      </Panel>

      <Panel title="Providers">
        <div style={row}>
          <StatCard label="Active providers" value={d.provider.active} />
          <StatCard label="Jobs assigned" value={d.provider.jobs_assigned} />
          <StatCard label="Jobs completed" value={d.provider.jobs_completed} tone="green" />
        </div>
      </Panel>

      <Panel title="Risk">
        <div style={row}>
          <StatCard label="Delayed (over 14 days)" value={d.risk.delayed_applications} tone="red" />
          <StatCard label="Name clearance rejections" value={d.risk.name_clearance_rejections} tone="red" />
          <StatCard label="Awaiting authority" value={d.risk.government_queries} tone="amber" />
        </div>
        {d.risk.rejections.length > 0 && (
          <table className="tbl" style={{ marginTop: 10 }}>
            <thead><tr><th>Activity</th><th>Project</th><th>Reason</th></tr></thead>
            <tbody>
              {d.risk.rejections.map((r, i) => (
                <tr key={i}><td>{r.activity}</td><td className="cell-sub">{r.project}</td><td className="cell-sub">{r.reason || '—'}</td></tr>
              ))}
            </tbody>
          </table>
        )}
      </Panel>

      <Panel title="Profitability">
        <div style={row}>
          <StatCard label="Gross margin" value={money(d.profitability.gross_margin_total)} tone="green" />
          <StatCard label="Provider cost" value={money(d.profitability.provider_cost_total)} tone="grey" />
        </div>
        <table className="tbl" style={{ marginTop: 10 }}>
          <thead><tr><th>Project</th><th>Professional fee</th><th>Provider cost</th><th>Margin</th><th>%</th></tr></thead>
          <tbody>
            {d.profitability.per_project.length === 0 && <tr><td colSpan={5} className="cell-sub">No projects yet.</td></tr>}
            {d.profitability.per_project.map((p) => (
              <tr key={p.project}>
                <td>{p.project}<div className="cell-sub">{p.name}</div></td>
                <td>{money(p.professional)}</td>
                <td>{money(p.provider_cost)}</td>
                <td>{money(p.gross_margin)}</td>
                <td><Badge tone={p.margin_pct >= 30 ? 'green' : p.margin_pct >= 0 ? 'amber' : 'red'}>{p.margin_pct}%</Badge></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
    </div>
  );
}
```

- [ ] **Step 4: Route and nav**

In `admin-portal/src/App.jsx`:

```jsx
import BRDashboards from './screens/watertank/registration/Dashboards';
```
```jsx
              <Route path="/business-registration/dashboards" element={<BRDashboards />} />
```

In `admin-portal/src/config/consoles.js`, inside the registration nav `.map` from Task 3, add a finance branch:

```js
    if (g.key.endsWith('finance')) {
      return { ...g, items: [...g.items, { to: '/business-registration/dashboards', label: 'SOP Dashboards', icon: BarChart3 }] };
    }
```

- [ ] **Step 5: Build, look, commit**

Run: `cd admin-portal && npm run build` → `✓ built`
Open `/admin/business-registration/dashboards`: six panels render, no console errors, government fees shown apart from revenue.

```bash
git add backend/controllers/businessRegistrationDashboards.controller.js backend/routes/businessRegistrationLine.routes.js admin-portal/src/screens/watertank/registration/Dashboards.jsx admin-portal/src/App.jsx admin-portal/src/config/consoles.js
git commit -m "feat(business-registration): the six SOP dashboards

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 15: Retire the bespoke screens

**Files:**
- Delete: the six files in `admin-portal/src/screens/business-registration/`
- Modify: `admin-portal/src/App.jsx`

**Interfaces:**
- Produces: retired deep links redirect instead of 404ing. Old project links were numeric (`/business-registration/projects/12`); the shared screens use project codes.

- [ ] **Step 1: Confirm nothing else imports them**

```bash
cd admin-portal && grep -rn "screens/business-registration/" src | grep -v "src/App.jsx"
```
Expected: no output. If anything appears, update that file first.

- [ ] **Step 2: Delete them**

```bash
git rm admin-portal/src/screens/business-registration/BusinessRegistrationDashboard.jsx \
       admin-portal/src/screens/business-registration/BusinessRegistrationProjects.jsx \
       admin-portal/src/screens/business-registration/BusinessRegistrationProjectDetail.jsx \
       admin-portal/src/screens/business-registration/BusinessRegistrationEnquiries.jsx \
       admin-portal/src/screens/business-registration/BusinessRegistrationInvoices.jsx \
       admin-portal/src/screens/business-registration/BusinessRegistrationReports.jsx
```

Remove their six `import` lines from `admin-portal/src/App.jsx` (grouped at ~158-163).

- [ ] **Step 3: Keep old links working**

React Router v6 has no regex path segments, so use a small component. Add it beside the other helpers in `App.jsx`:

```jsx
/** Old numeric project links (/business-registration/projects/12) predate the shared
 *  service-line project codes — send those to the list instead of 404ing. */
function BrLegacyProject() {
  const { code } = useParams();
  return /^\d+$/.test(String(code))
    ? <Navigate to="/business-registration/projects" replace />
    : <WTProjectDetail />;
}
```

and use it for the project detail route:

```jsx
              <Route path="/business-registration/projects/:code" element={<BrLegacyProject />} />
```

`useParams` and `Navigate` are already imported in `App.jsx`; confirm before adding.

- [ ] **Step 4: Build and check**

Run: `cd admin-portal && npm run build` → `✓ built`, no unresolved imports.
Visit `/admin/business-registration/projects/1` → redirected to the projects list.
Visit a real project by its code → the shared project file opens with the Parties and Activities tabs.

- [ ] **Step 5: Commit**

```bash
git add -A admin-portal/src/screens/business-registration admin-portal/src/App.jsx
git commit -m "refactor(business-registration): retire the bespoke screens for the shared console

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 16: Full verification and handover

**Files:**
- Modify: `backend/scripts/e2e/businessRegistration.js`
- Modify: `AGENT_WORK_LOG.md` (append only — never staged)

**Interfaces:**
- Consumes: every earlier task.
- Produces: green `npm test`, green e2e, isolation proven both ways, fixtures cleaned, work-log entry written.

- [ ] **Step 1: Add isolation and cleanup**

```js
async function isolation(projectId) {
  console.log('\n— Isolation —');
  const wt = await req('GET', '/api/wt-projects', { headers: { 'X-Service-Line': 'water_tank' } });
  ok(!(wt.body?.data || []).some((p) => Number(p.id) === Number(projectId)), 'registration project invisible to Water Tank');

  const dash = await req('GET', '/api/br-line/dashboards', { headers: { 'X-Service-Line': 'air_conditioning' } });
  ok(dash.status === 403, 'dashboards refuse another line', `HTTP ${dash.status}`);

  const parties = await req('GET', `/api/br-line/projects/${projectId}/parties`, { headers: { 'X-Service-Line': 'water_tank' } });
  ok(parties.status === 403, 'line module refuses another line');
}

async function cleanup(ids) {
  console.log('\n— Cleanup —');
  // The DB is shared with production: remove what this run created.
  for (const [path, id] of ids) {
    if (!id) continue;
    const r = await req('DELETE', `${path}/${id}`, LINE);
    ok([200, 204, 404].includes(r.status), `cleaned ${path}/${id}`, `HTTP ${r.status}`);
  }
}
```

Wire the IIFE so every section runs in order and cleanup runs last:

```js
(async () => {
  console.log(`\n===== BUSINESS REGISTRATION E2E (run ${STAMP}) =====`);
  if (!(await login())) return finish();
  const { projectId, clientId } = await lineModule();
  await documents(projectId, clientId);
  await commercial(projectId, clientId);
  const providerId = await providers();
  const workOrderId = await workOrder(projectId, providerId);
  await isolation(projectId);
  await cleanup([
    ['/api/wt-work-orders', workOrderId],
    ['/api/wt-providers', providerId],
    ['/api/wt-projects', projectId],
    ['/api/wt-clients', clientId],
  ]);
  finish();
})().catch((e) => { ok(false, 'harness crashed', e.message); finish(); });
```

If an entity has no delete endpoint, leave the row and note it in the log — never delete rows with raw SQL.

- [ ] **Step 2: Run everything**

```bash
cd backend && npm test
cd backend && node scripts/e2e/businessRegistration.js
cd backend && node scripts/e2e/businessParity.js
cd admin-portal && npm run build
cd ../website-mock && npm run build
```

Expected: `npm test` exits 0; both e2e suites all PASS (the Buy/Sale suite must not regress); both builds `✓ built`.

- [ ] **Step 3: Click the flow once in the browser**

With the backend on :50001 serving the built admin at `/admin/`, walk it end to end:

enquiry → client → project → consultation → parties (one shareholder, one director) → documents (request link, upload, verify) → quotation with one government line and one professional line → accept → agreement → deposit invoice → provider → work order → activities (submit one, reject one with a reason) → final invoice → dashboards.

Then open **Water Tank** and **Air Conditioning**: no registration records, no Parties/Activities tabs, and their screens read exactly as before.

- [ ] **Step 4: Record wording debt**

List every shared screen still showing site-visit or equipment wording on the registration console. Do not fork screens — record them so they are fixed once, in config, for every line.

- [ ] **Step 5: Append the work-log entry (never staged)**

```bash
cat >> AGENT_WORK_LOG.md <<'EOF'

### 2026-09-23 | Claude (Opus 5) | COMPLETED | Business Registration — 16th service line
- Commits: <hash + subject for each task in this plan>
- Verified: npm test exit 0; businessRegistration e2e all PASS; businessParity e2e still all PASS; admin + website builds clean; full flow clicked through; Water Tank and Air Conditioning unchanged.
- Fixtures created and cleaned in the same run (shared production DB).
- Wording debt (fix in config, not forks): <list>
- Second plan (not built here): complaint/feedback/variation registers, KPI detail, provider performance ranking, company-wide accounting, logged-in client portal.
EOF
```

- [ ] **Step 6: Final commit**

```bash
git add backend/scripts/e2e/businessRegistration.js
git commit -m "test(business-registration): isolation checks and fixture cleanup

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

**Deployment note:** Hostinger has lost access to the repository, so nothing reaches production until that GitHub connection is restored. Do not attempt a deploy in this plan — hand it back to the user.

---

## Appendix: spec coverage

| Spec section | Tasks |
|---|---|
| 3 Service manifest | 1, 7 |
| 4 Console | 3, 14 |
| 5 Project workspace, SOP pipeline, registers | 3, 3a, 6 |
| 6 Commercial approval | 9, 10 |
| 7 Documents and client link | 7, 8 |
| 8 Providers, work orders, activities | 5, 6, 11, 12 |
| 9 Finance | 9, 13 |
| 10 Dashboards | 14 |
| 11 Migration and retirement | 4, 15 |
| 12 Verification | 5, 8, 10, 11, 12, 16 |
| 13 Out of scope | noted in Task 16's log entry |
| 14 Risks (vocabulary debt) | Task 3 Step 4, Task 16 Step 4 |
