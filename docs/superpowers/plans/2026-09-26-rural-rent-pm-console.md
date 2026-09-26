# Rural Rent — Fourth Property Management Console Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship Rural Rent as the fourth Property Management console at `/rural/rent`, with the rural land record, the two 11-stage SOP pipelines, the rural-specific modules and the five dashboards.

**Architecture:** A console is a scope, not a copy. Residential, Commercial Rent and Business Rent are the same PM screens under `PmScopeProvider`; Rural Rent is the fourth, scoped to `category:'rural'` + `listing_type:'rent'`. The category-scoping groundwork landed with the isolation plan, so this plan is additive: a console shell, a land record, corrected workflow templates, four SOP modules, and dashboards.

**Tech Stack:** Node + Express + Sequelize + MySQL (backend on :50001), React 18 + Vite (admin-portal), plain-Node assert scripts for unit tests, `scripts/e2e/httpHarness.js` for end-to-end.

**Spec:** `docs/superpowers/specs/2026-09-26-rural-rent-pm-console-design.md` — **read §14 (Corrections) first.** It supersedes §3, §6 and §10 of that document.

## Global Constraints

- **Schema only via migrations**, numbered, idempotent (`describeTable` guards). Never edit an applied migration. Next free number: **0156**.
- **The local DB is the production DB.** Rural has **0 properties, 0 projects, 0 enquiries** — but **13 `rural_rent` register definitions** (ids 149-161) and **8 entries** against `ownership_verification` already exist, seeded 2026-06-26 from the client's CRM workbook. Do not duplicate them.
- **The other three consoles are live.** After every task, re-run `node scripts/e2e/consoleIsolation.js` (currently **140 PASS / 0 FAIL**) and confirm the residential baseline: **53 managed properties, 38 tenancies, 103 open actions, BDT 107,400 overdue, 192 setup blockers**.
- **Rural Rent scope is `category:'rural'` AND `listing_type:'rent'`.** Rural Sale is live and will create `rural` + `sale` rows; category alone would pull them into the rent console. There are no rural properties yet, so the test must assert this against a fixture it creates.
- **One home per record.** Two decisions, made once here so nothing is recorded twice:
  - **Tenant screening** lives on `TenantApplication` (as Business Rent's does), because it gates the application verdict and the Negotiation stage warning. Register 153 stays available for ad-hoc logging but is **not** the store.
  - **Protected introductions** live in `non_circumvention_records` (the endpoint, the window helper and the dashboard already exist). Registers 154 and 161 are **not** the store.
- **Never stage** `backend/config/cors.config.js` or `AGENT_WORK_LOG.md`; stage `backend/server.js` hunk-by-hunk.
- Backend scripts run from `backend/`. Commit trailer:
  `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`

## Review Focus

1. **A rural SALE property appearing in Rural Rent.** None exist yet, so only a fixture can prove it — an empty list is not proof. (Task 1)
2. **The other three consoles moving.** They are live; their numbers must not change. (every task; asserted in Task 10)
3. **Recording the same thing twice.** Thirteen registers already cover ownership verification, screening, protection and sourcing. A new table beside one of them is the failure mode. (Tasks 5, 6, 7)
4. **A rural agreement silently becoming residential.** `rprm`/`rptm` now return 400 for rural; the console's two agreement links are dead until builders are registered, and a builder that renders residential content is worse than the 400. (Task 8)
5. **The land record being unsearchable.** District/upazila/mouza are how a rural property is found; stored where a query cannot reach them, the register is decoration. (Task 2)

---

### Task 1: The console

**Files:**
- Modify: `admin-portal/src/config/pmScope.jsx`
- Modify: `admin-portal/src/config/consoles.js`
- Create: `admin-portal/src/screens/RuralRentConsole.jsx`
- Modify: `admin-portal/src/App.jsx`
- Modify: `admin-portal/src/ui/Layout.jsx`
- Modify: `backend/scripts/e2e/consoleIsolation.js`

**Interfaces:**
- Produces: `RURAL_RENT_SCOPE = { category:'rural', listingType:'rent', basePath:'/rural/rent', label:'Rural · Rent' }`; `RURAL_RENT_NAV`; `ruralRentConsole`; the `/rural/rent/*` route block.
- Consumed by: every later task.

- [ ] **Step 1: Write the failing fixture check**

In `backend/scripts/e2e/consoleIsolation.js`, extend `seedFixtures()` so the rural fixture also creates a **sale** property, and add to `assertFixtureIsolation()`:

```js
  // Rural Rent is category AND listing_type. A rural SALE property must never
  // appear in the rent console — no rural rows exist yet, so only a fixture proves it.
  const saleProp = await req('POST', '/api/properties', {
    body: { title: `ISO rural-sale ${STAMP}`, category: 'rural', listing_type: 'sale', status: 'available', price: 1000, branch_id: 1 },
  });
  if (saleProp.body?.data?.id) made.properties.push(saleProp.body.data.id);
  const rentOnly = await req('GET', '/api/properties?category=rural&listing_type=rent&limit=200');
  const leaked = (rowsOf(rentOnly.body) || []).filter((p) => p.listing_type === 'sale');
  ok(leaked.length === 0, 'a rural sale property does not appear in Rural Rent',
    leaked.map((p) => p.property_code).join(',') || 'clean');
```

- [ ] **Step 2: Run it**

Run: `cd backend && node scripts/e2e/consoleIsolation.js`
Expected: PASS already — the backend scoping landed with the isolation plan. This check exists to keep it true, and it must be green **before** the console ships.

- [ ] **Step 3: Add the scope**

In `admin-portal/src/config/pmScope.jsx`, after `BUSINESS_RENT_SCOPE`:

```js
export const RURAL_RENT_SCOPE = {
  category: 'rural',
  listingType: 'rent',
  basePath: '/rural/rent',
  label: 'Rural · Rent',
};
```

- [ ] **Step 4: Add the nav and the console config**

In `admin-portal/src/config/consoles.js`, mirroring `BUSINESS_RENT_NAV` (which is `PROPERTY_MGMT_NAV` rebased):

```js
/* ── Rural · Rent ──────────────────────────────────────────────────────────
 * Leasing rural property — agricultural land, farm houses, fisheries, ponds,
 * dairy and poultry farms, orchards, rural houses, commercial and mixed-use
 * rural property. The fourth console on the PM screens; its nav is the PM nav
 * rebased, with the rural agreement builders and the rural-only groups.
 */
export const RURAL_RENT_NAV = [
  ...rebasePmNav(
    PROPERTY_MGMT_NAV.map((g) => (g.key === 'agreements'
      ? {
        ...g,
        items: g.items
          .filter((it) => it.to && (it.to.endsWith('/agreements') || it.to.endsWith('/tenancy-agreements') || it.to.includes('/price-schedule')))
          .map((it) => {
            if (it.to.endsWith('/tenancy-agreements')) return { ...it, label: 'Tenancy Mgmt Agreements' };
            if (it.to.endsWith('/agreements')) return { ...it, label: 'Rental Mgmt Agreements' };
            return it;
          }),
      }
      : {
        ...g,
        items: (g.items || []).map((it) => (it.to && it.to.includes('/workflows')
          ? { ...it, to: '/property-management/workflows?vertical_key=rural_rent,rural_tenancy' }
          : it)),
      })),
    '/property-management',
    '/rural/rent',
  ),
  { key: 'rural-land', label: 'Land & Ownership', items: [
    { to: '/rural/rent/land-records', label: 'Land Records', icon: Map },
    { to: '/rural/rent/ownership', label: 'Ownership Verification', icon: FileCheck },
  ] },
  { key: 'rural-sourcing', label: 'Tenant Sourcing', items: [
    { to: '/rural/rent/sourcing', label: 'Briefs & Shortlists', icon: Search },
  ] },
  { key: 'rural-sop', label: 'SOP Dashboards', items: [
    { to: '/rural/rent/dashboards', label: 'Rural Rent Dashboards', icon: BarChart3 },
  ] },
  { key: 'rural-switch', label: 'Switch', items: [
    { to: '/rural/sell', label: '→ Rural Sale', icon: Trees },
  ] },
];

export const ruralRentConsole = {
  slug: 'rural/rent',
  storageKey: 'rural.rent.nav.collapsed',
  brand: {
    name: 'Seventh Sky',
    sub: 'Rural · Rent',
    icon: Trees,
    // Green, distinct from PM violet, commercial sky and business pink.
    accent: '#16a34a',
    accentStrong: '#15803d',
    accentInk: '#166534',
    accentTint: 'rgba(22,163,74,.12)',
    accentTint2: '#dcfce7',
  },
  navGroups: RURAL_RENT_NAV,
  api: {},
  contentClass: 'pm-scope',
  exitTo: '/dashboard',
};
```

Import any icons not already imported at the top of the file (`Map`, `FileCheck`, `Search`, `Trees`, `BarChart3` — check which are missing before adding).

- [ ] **Step 5: The console shell**

Create `admin-portal/src/screens/RuralRentConsole.jsx`:

```jsx
import React from 'react';
import ServiceConsole from '../ui/ServiceConsole';
import { ruralRentConsole, RURAL_RENT_NAV } from '../config/consoles';
import { PmScopeProvider, RURAL_RENT_SCOPE } from '../config/pmScope';

/*
 * RuralRentConsole — leasing rural property.
 *
 * The fourth console on the Property Management screens. The PmScopeProvider
 * tells every screen it renders to operate on rural RENT property — category and
 * listing_type, because Rural Sale shares the category — and to keep its links
 * inside /rural/rent/*.
 */
export const RRT_NAV = RURAL_RENT_NAV.flatMap((g) => g.items);

export default function RuralRentConsole() {
  return (
    <PmScopeProvider value={RURAL_RENT_SCOPE}>
      <ServiceConsole config={ruralRentConsole} />
    </PmScopeProvider>
  );
}
```

- [ ] **Step 6: The routes**

In `admin-portal/src/App.jsx`, add a `/rural/rent` block modelled on the `/business-rent` one — the same PM screens rebased, plus `contacts/clients` (the rent consoles gained that route in `50e41dd`) and the rural-only screens added by later tasks:

```jsx
            {/* ── Rural · RENT — the fourth Property Management console. Same PM
                screens, scoped to category 'rural' + listing_type 'rent'. ── */}
            <Route element={<RequireAuth><AdminGate><RuralRentConsole /></AdminGate></RequireAuth>}>
              <Route path="/rural/rent" element={<PropertyMgmtDashboard />} />
              <Route path="/rural/rent/rentals" element={<RentalProperties />} />
              <Route path="/rural/rent/rentals/new" element={<PropertyWizard />} />
              <Route path="/rural/rent/rentals/new/:id" element={<PropertyWizard />} />
              <Route path="/rural/rent/contacts" element={<SalesContacts scope="rental" />} />
              <Route path="/rural/rent/contacts/clients" element={<Clients />} />
              <Route path="/rural/rent/applications" element={<TenantApplications />} />
              <Route path="/rural/rent/enquiries" element={<RentalEnquiries />} />
              <Route path="/rural/rent/assessments" element={<RentalAssessments />} />
              <Route path="/rural/rent/statements" element={<OwnerStatements />} />
              <Route path="/rural/rent/renewals" element={<Renewals />} />
              <Route path="/rural/rent/vacancies" element={<Vacancies />} />
              <Route path="/rural/rent/settlements" element={<DepositSettlements />} />
              <Route path="/rural/rent/reports" element={<RentalReports />} />
              <Route path="/rural/rent/disbursements" element={<Disbursements />} />
              <Route path="/rural/rent/utilities" element={<UtilityBills />} />
              <Route path="/rural/rent/tenant-requests" element={<TenantRequests />} />
              <Route path="/rural/rent/arrears" element={<ArrearsActions />} />
              <Route path="/rural/rent/marketing" element={<MarketingActivities />} />
              <Route path="/rural/rent/expense-approvals" element={<ExpenseApprovals />} />
              <Route path="/rural/rent/risks" element={<PropertyRisks />} />
              <Route path="/rural/rent/work-orders" element={<WorkOrders />} />
              <Route path="/rural/rent/inspections" element={<Inspections />} />
              <Route path="/rural/rent/compliance" element={<Compliance />} />
              <Route path="/rural/rent/workflows" element={<Projects />} />
              <Route path="/rural/rent/invoices" element={<Invoices />} />
              <Route path="/rural/rent/receipts" element={<RentalReceipts />} />
              <Route path="/rural/rent/collect-rent" element={<BulkRentCollection />} />
              <Route path="/rural/rent/disburse-owners" element={<BulkOwnerDisbursement />} />
              <Route path="/rural/rent/inbox" element={<Communication />} />
              <Route path="/rural/rent/folios" element={<Folios />} />
              <Route path="/rural/rent/landlord-bills" element={<LandlordBills />} />
              <Route path="/rural/rent/agency-income" element={<AgencyIncome />} />
            </Route>
```

The `land-records` and `ownership` routes come from **Task 11**, `sourcing` from **Task 7**, `dashboards` from **Task 9** and the two agreement routes from **Task 8** — until each lands, its nav item would 404, so add each nav group in the task that adds its route rather than here. Trim Step 4's nav to the rebased PM groups plus Switch if you are landing Task 1 alone.

- [ ] **Step 7: The sidebar**

In `admin-portal/src/ui/Layout.jsx`, replace the five-item `rural` group with exactly Sale and Rent, matching Commercial:

```jsx
  { key: 'rural', label: 'Rural Properties', icon: Trees, children: [
    { to: '/rural/sell', label: 'Sale' },
    { to: '/rural/rent', label: 'Rent' },
  ] },
```

Buy and Buyer Enquiries stay reachable from the Rural Sale dashboard's own quick links (`/${category}/buy`, `/${category}/enquiry`) — verified, so nothing is orphaned. Add the label for the new path to the title map further down the file (`'/rural/rent': 'Rural · Rent'`).

- [ ] **Step 8: Verify**

```bash
cd admin-portal && npm run build
cd ../backend && node scripts/e2e/consoleIsolation.js
```

Expected: `✓ built`; isolation still 0 FAIL with the new rural-sale check passing.

Open `/admin/rural/rent`: the PM nav renders in green, Properties is empty (not showing rural sale rows), and `/admin/property-management`, `/admin/commercial/rent`, `/admin/business-rent` are unchanged.

- [ ] **Step 9: Commit**

```bash
git add admin-portal/src/config/pmScope.jsx admin-portal/src/config/consoles.js admin-portal/src/screens/RuralRentConsole.jsx admin-portal/src/App.jsx admin-portal/src/ui/Layout.jsx backend/scripts/e2e/consoleIsolation.js
git commit -m "feat(rural-rent): the fourth Property Management console

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 2: The rural land record

**Files:**
- Create: `backend/migrations/0156-property-rural-land-record.js`
- Create: `backend/scripts/testRuralLandRecord.js`
- Create: `admin-portal/src/screens/rural/RuralLandPanel.jsx`
- Create: `admin-portal/src/config/ruralPropertyTypes.js`
- Modify: `backend/models/Property.js`
- Modify: `backend/controllers/property.controller.js` (the `FIELDS`/`pick` whitelist and the list filters)
- Modify: `admin-portal/src/screens/PropertyWizard.jsx`
- Modify: `backend/package.json`

**Interfaces:**
- Produces: `properties.upazila|union_name|village|mouza|khatiyan|dag|land_area_decimal|current_use`; `RURAL_PROPERTY_TYPES`; `GET /api/properties?...&district=&upazila=&mouza=` filters.
- Consumed by: Tasks 4, 7 and 9.

**Review Focus item 5 lives here:** these must be queryable, not just displayed.

- [ ] **Step 1: Write the failing test**

Create `backend/scripts/testRuralLandRecord.js`:

```js
const assert = require('assert');
const Property = require('../models/Property');
const { RURAL_LAND_FIELDS } = require('../utils/ruralLandRecord');

// A rural property is identified by its land record, not a street address.
assert.deepStrictEqual(RURAL_LAND_FIELDS, [
  'district', 'upazila', 'union_name', 'village', 'mouza', 'khatiyan', 'dag',
  'land_area_decimal', 'current_use',
]);

// Sequelize must know every one of them, or the wizard writes them and they vanish.
for (const f of RURAL_LAND_FIELDS) {
  assert.ok(Property.rawAttributes[f], `Property model is missing ${f}`);
}

console.log('ruralLandRecord OK');
```

- [ ] **Step 2: Run it and watch it fail**

Run: `cd backend && node scripts/testRuralLandRecord.js`
Expected: `Cannot find module '../utils/ruralLandRecord'`

- [ ] **Step 3: The field list, the migration and the model**

Create `backend/utils/ruralLandRecord.js`:

```js
/**
 * The rural land record (CRM workbook, Owner Sheet 2).
 *
 * A rural property is identified by its land record — district, upazila, union,
 * village, mouza, khatiyan, dag — not by a street address. `district` already
 * existed; the rest are new. These live on `properties` rather than a side table
 * so the console can filter and search on them, and so Rural Sale inherits them.
 */
const RURAL_LAND_FIELDS = [
  'district', 'upazila', 'union_name', 'village', 'mouza', 'khatiyan', 'dag',
  'land_area_decimal', 'current_use',
];

module.exports = { RURAL_LAND_FIELDS };
```

Create `backend/migrations/0156-property-rural-land-record.js`:

```js
'use strict';

// Rural land record. Additive and nullable: residential, commercial and business
// properties are untouched and read as "not recorded". `union_name` avoids the
// SQL reserved word UNION.
const COLUMNS = {
  upazila: 'STRING',
  union_name: 'STRING',
  village: 'STRING',
  mouza: 'STRING',
  khatiyan: 'STRING',
  dag: 'STRING',
  land_area_decimal: 'DECIMAL',
  current_use: 'STRING',
};

module.exports = {
  async up(queryInterface, Sequelize) {
    const t = await queryInterface.describeTable('properties');
    for (const [name, type] of Object.entries(COLUMNS)) {
      if (!t[name]) {
        await queryInterface.addColumn('properties', name, {
          type: type === 'DECIMAL' ? Sequelize.DECIMAL(12, 3) : Sequelize.STRING,
          allowNull: true,
        });
      }
    }
    // The console searches on these, so index the two that narrow the most.
    const idx = await queryInterface.showIndex('properties');
    const names = idx.map((i) => i.name);
    if (!names.includes('properties_upazila')) {
      await queryInterface.addIndex('properties', ['upazila'], { name: 'properties_upazila' });
    }
    if (!names.includes('properties_mouza')) {
      await queryInterface.addIndex('properties', ['mouza'], { name: 'properties_mouza' });
    }
  },
  async down(queryInterface) {
    const t = await queryInterface.describeTable('properties');
    for (const name of Object.keys(COLUMNS)) {
      if (t[name]) await queryInterface.removeColumn('properties', name);
    }
  },
};
```

In `backend/models/Property.js`, beside `land_size`:

```js
  // Rural land record (0156) — see utils/ruralLandRecord.js.
  upazila: DataTypes.STRING,
  union_name: DataTypes.STRING,
  village: DataTypes.STRING,
  mouza: DataTypes.STRING,
  khatiyan: DataTypes.STRING,
  dag: DataTypes.STRING,
  land_area_decimal: DataTypes.DECIMAL(12, 3),
  current_use: DataTypes.STRING,
```

- [ ] **Step 4: Run the test**

```bash
cd backend && npm run db:migrate && node scripts/testRuralLandRecord.js
```
Expected: migration applied, `ruralLandRecord OK`.

- [ ] **Step 5: Accept and filter them**

In `backend/controllers/property.controller.js`: add the eight names to the `pick(...)` whitelist (the `FIELDS` array near the top — `district` is already there), and add the filters beside the existing `listing_type` one:

```js
  // The rural console finds property by its land record.
  for (const f of ['district', 'upazila', 'union_name', 'village', 'mouza', 'khatiyan', 'dag']) {
    if (req.query[f]) where[f] = req.query[f];
  }
```

- [ ] **Step 6: The property-type taxonomy**

Create `admin-portal/src/config/ruralPropertyTypes.js`:

```js
/**
 * The ten rural property types (SOP §2). `property_type` is a free string shared
 * with the other categories and already holds junk ('', 'sa'), so this constrains
 * the rural wizard's select and drives the Property dashboard's grouping without
 * touching the column.
 */
export const RURAL_PROPERTY_TYPES = [
  'Agricultural Land', 'Farming Land', 'Farm House', 'Rural Residential House',
  'Fishery', 'Pond', 'Dairy Farm', 'Poultry Farm', 'Orchard',
  'Commercial Rural', 'Mixed Use Rural',
];
```

Note: the SOP lists ten categories but names eleven values (agricultural land and farming land are listed separately); keep both and say so here rather than silently merging them.

- [ ] **Step 7: The panel**

Create `admin-portal/src/screens/rural/RuralLandPanel.jsx` — a `pm-scope` panel of the eight fields plus the type select, rendered only when `scope.category === 'rural'`:

```jsx
import React from 'react';
import { Field, Input, Select } from '../../ui/kit';
import { RURAL_PROPERTY_TYPES } from '../../config/ruralPropertyTypes';

/** The rural land record (CRM workbook, Owner Sheet 2). Rural properties only. */
export default function RuralLandPanel({ form, setForm }) {
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  return (
    <section style={{ marginTop: 16 }}>
      <h4 style={{ margin: 0 }}>Land record</h4>
      <p className="cell-sub" style={{ marginTop: 4 }}>
        A rural property is identified by its land record, not a street address.
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginTop: 10 }}>
        <Field label="District"><Input value={form.district || ''} onChange={set('district')} /></Field>
        <Field label="Upazila"><Input value={form.upazila || ''} onChange={set('upazila')} /></Field>
        <Field label="Union"><Input value={form.union_name || ''} onChange={set('union_name')} /></Field>
        <Field label="Village"><Input value={form.village || ''} onChange={set('village')} /></Field>
        <Field label="Mouza"><Input value={form.mouza || ''} onChange={set('mouza')} /></Field>
        <Field label="Khatiyan"><Input value={form.khatiyan || ''} onChange={set('khatiyan')} /></Field>
        <Field label="Dag"><Input value={form.dag || ''} onChange={set('dag')} /></Field>
        <Field label="Land area (decimal)"><Input type="number" step="0.001" value={form.land_area_decimal || ''} onChange={set('land_area_decimal')} /></Field>
        <Field label="Property type">
          <Select value={form.property_type || ''} onChange={set('property_type')}>
            <option value="">— select —</option>
            {RURAL_PROPERTY_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </Select>
        </Field>
      </div>
      <Field label="Current use"><Input value={form.current_use || ''} onChange={set('current_use')} placeholder="Paddy, fishery, orchard, vacant…" /></Field>
    </section>
  );
}
```

Render it in `PropertyWizard.jsx` where the Business profile step is rendered, gated on the rural category. Read that file's step structure first and follow it.

- [ ] **Step 8: Verify a round trip**

Restart the backend. Create a rural rent property through the API with a full land record, read it back, and confirm every field persisted (this is the check that catches a missing model attribute):

```bash
cd backend
curl -s -X POST -H "Authorization: Bearer $TOKEN" -H "X-Branch-Id: 1" -H 'Content-Type: application/json' \
  -d '{"title":"RURAL land record probe","category":"rural","listing_type":"rent","status":"available","price":25000,"branch_id":1,"district":"Cumilla","upazila":"Barura","union_name":"Payalgachha","village":"Ramnagar","mouza":"Ramnagar","khatiyan":"KH-114","dag":"DAG-2201","land_area_decimal":33.5,"current_use":"Paddy","property_type":"Agricultural Land"}' \
  http://localhost:50001/api/properties | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const d=JSON.parse(s).data||{};['district','upazila','union_name','village','mouza','khatiyan','dag','land_area_decimal','current_use'].forEach(k=>console.log(' ',k,'=',d[k]));console.log('id',d.id)})"
```

Then confirm the filters work, and delete the probe:

```bash
curl -s -H "Authorization: Bearer $TOKEN" -H "X-Branch-Id: 1" \
  "http://localhost:50001/api/properties?category=rural&listing_type=rent&mouza=Ramnagar" \
  | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>console.log('mouza filter returns',(JSON.parse(s).data||[]).length))"
curl -s -X DELETE -H "Authorization: Bearer $TOKEN" -H "X-Branch-Id: 1" "http://localhost:50001/api/properties/<ID>"
```

Expected: every field echoed back non-null, the mouza filter returns 1, and the probe removed.

- [ ] **Step 9: Add to the chain and commit**

Add `node scripts/testRuralLandRecord.js && ` to the `test` script.

```bash
git add backend/migrations/0156-property-rural-land-record.js backend/utils/ruralLandRecord.js backend/scripts/testRuralLandRecord.js backend/models/Property.js backend/controllers/property.controller.js backend/package.json admin-portal/src/config/ruralPropertyTypes.js admin-portal/src/screens/rural/RuralLandPanel.jsx admin-portal/src/screens/PropertyWizard.jsx
git commit -m "feat(rural-rent): the rural land record on properties

khatiyan, mouza, dag, upazila, union and village appeared nowhere in the codebase.
They live on properties so the console can filter on them and Rural Sale inherits
them, with indexes on the two that narrow a search most.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 3: The two 11-stage pipelines

**Files:**
- Create: `backend/scripts/seedRuralRentWorkflow.js`
- Create: `backend/scripts/testRuralStages.js`
- Modify: `backend/package.json`

**Interfaces:**
- Produces: `RURAL_OWNER_STAGES` and `RURAL_TENANT_STAGES` (11 each), written to `workflow_templates` under `rural_rent` and a new `rural_tenancy`.
- Consumed by: Task 9's pipeline dashboard.

**Background (re-measured):** `workflow_templates` id **13** (`rural_rent`) holds **12** stages that mash the owner pipeline (`lead`, `verification`, `marketing`, `leasing`, `lease`) together with the tenant pipeline (`search`, `inspection`, `negotiation`) and promote four **Due-Diligence checklist items** (`lease_review`, `landlord_verification`, `property_inspection`, `business_suitability`) into stages — tenant workbook Sheet 16 shows those four are checklist rows. **0 projects** use it. `rural_sale` (id 14, 18 stages) is not touched by this plan.

- [ ] **Step 1: Write the failing test**

Create `backend/scripts/testRuralStages.js`:

```js
const assert = require('assert');
const { RURAL_OWNER_STAGES, RURAL_TENANT_STAGES } = require('./seedRuralRentWorkflow');

// SOP Rural Property Rental Management §4 — the owner pipeline.
assert.deepStrictEqual(RURAL_OWNER_STAGES.map((s) => s.key), [
  'owner_enquiry', 'property_assessment', 'ownership_verification', 'owner_agreement',
  'marketing_preparation', 'property_marketing', 'tenant_screening', 'lease_negotiation',
  'lease_execution', 'property_management', 'closure',
]);

// SOP Rural Property Tenancy Management §4 — the tenant pipeline. A DIFFERENT
// pipeline, which is why the old 12-stage template was wrong.
assert.deepStrictEqual(RURAL_TENANT_STAGES.map((s) => s.key), [
  'tenant_enquiry', 'consultation', 'requirement_assessment', 'tenant_agreement',
  'property_search', 'property_shortlisting', 'inspection', 'negotiation',
  'lease_coordination', 'move_in_support', 'closure',
]);

// The four Due-Diligence CHECKLIST items must not be stages in either pipeline.
const allKeys = [...RURAL_OWNER_STAGES, ...RURAL_TENANT_STAGES].map((s) => s.key);
for (const k of ['lease_review', 'landlord_verification', 'property_inspection', 'business_suitability']) {
  assert.ok(!allKeys.includes(k), `${k} is a due-diligence checklist row, not a stage`);
}

for (const [name, stages] of [['owner', RURAL_OWNER_STAGES], ['tenant', RURAL_TENANT_STAGES]]) {
  stages.forEach((s, i) => {
    assert.strictEqual(s.order, i + 1, `${name}/${s.key} order`);
    assert.ok(s.name && s.department && s.escalation_trigger, `${name}/${s.key} carries name, department, escalation trigger`);
    assert.ok(Array.isArray(s.checklist) && s.checklist.length > 0, `${name}/${s.key} has a checklist`);
    s.checklist.forEach((c) => assert.ok(c.label && c.responsible && c.evidence_required,
      `${name}/${s.key} checklist item is complete: ${JSON.stringify(c)}`));
  });
}

// The tenant pipeline's due diligence survives as checklist rows on Lease Coordination.
const dd = RURAL_TENANT_STAGES.find((s) => s.key === 'lease_coordination')
  .checklist.map((c) => c.label.toLowerCase()).join(' | ');
for (const item of ['lease review', 'landlord verification', 'environmental', 'legal']) {
  assert.ok(dd.includes(item), `due diligence kept: ${item}`);
}

console.log('ruralStages OK');
```

- [ ] **Step 2: Run it and watch it fail**

Run: `cd backend && node scripts/testRuralStages.js`
Expected: `Cannot find module './seedRuralRentWorkflow'`

- [ ] **Step 3: Write the seed**

Create `backend/scripts/seedRuralRentWorkflow.js`, following `seedBusinessRentWorkflow.js` exactly (same `item()` helper, same guard that refuses to rewrite a template any project already uses, same `module.exports` + `require.main` shape). Two templates:

- `rural_rent` → `RURAL_OWNER_STAGES`, name "Rural Property Rental Management (Owner)"
- `rural_tenancy` → `RURAL_TENANT_STAGES`, name "Rural Property Tenancy Management (Tenant)" — **inserted** if absent, since no row exists yet

Departments come from the SOP §3 roles (Property Consultant, Property Coordinator, Operations Manager). Escalation triggers from the SOP: ownership disputes, boundary disputes, succession issues, encumbrances, access issues, regulatory concerns, unverifiable identity, tenant default, environmental risk, circumvention risk.

Stage content, from SOP §5-§14 (owner) and §5-§12 (tenant):

| owner stage | checklist (label · responsible · evidence) |
|---|---|
| `owner_enquiry` | Register owner and property · Property Consultant · Owner NID/passport · **and** Record the introduction for non-circumvention · Property Coordinator · CRM log |
| `property_assessment` | Assess presentation, security, access, utilities, infrastructure · Property Consultant · Assessment report |
| `ownership_verification` | Verify deed, khatiyan, dag, mutation, tax receipts, succession · Property Coordinator · Ownership Verification register · **and** Record ownership/boundary risk · Operations Manager · Risk register entry |
| `owner_agreement` | Execute the Rural Property Rental Service Agreement (Owner) before marketing · Property Coordinator · Signed agreement · **and** Confirm the fee structure · Operations Manager · Fee record |
| `marketing_preparation` | Coordinate photography, videography, drone footage, brochures, signboards · Property Coordinator · Media upload |
| `property_marketing` | Launch website, Facebook, WhatsApp, database and NRB channels · Property Coordinator · Advertising records · **and** Record tenant enquiries and their source · Property Consultant · Enquiry register |
| `tenant_screening` | Screen identity, references, business profile, financial capacity, intended use · Property Consultant · Tenant screening record · **and** Prepare the owner recommendation · Property Consultant · Recommendation |
| `lease_negotiation` | Coordinate rent, deposit, duration and special conditions · Property Consultant · Negotiation log |
| `lease_execution` | Coordinate lease preparation, signing, deposit collection, occupancy · Property Coordinator · Executed lease |
| `property_management` | Rent collection, maintenance, inspections, renewals, vacate inspections · Property Coordinator · Maintenance and inspection logs |
| `closure` | Final reconciliation, owner feedback, CRM closure, archiving · Property Coordinator · Archive record |

| tenant stage | checklist |
|---|---|
| `tenant_enquiry` | Capture identity, contact, occupation and business type · Property Consultant · Tenant NID/passport |
| `consultation` | Discuss requirements, budget, location, intended use, duration · Property Consultant · Consultation notes · **and** Explain fees and the non-circumvention obligations · Property Consultant · Tenant acknowledgement |
| `requirement_assessment` | Record property type, budget, duration, land area and business requirements · Property Coordinator · Requirement register |
| `tenant_agreement` | Execute the Rural Property Rental Service Agreement (Tenant) before sourcing · Property Coordinator · Signed agreement |
| `property_search` | Search the internal database, active listings, off-market, network and referrals · Property Consultant · Property search register · **and** Record every introduced property as protected · Property Coordinator · Protected property record |
| `property_shortlisting` | Present a shortlist with details, photos, location, value, advantages and risks · Property Consultant · Shortlist register |
| `inspection` | Arrange inspection, landlord availability and site access · Property Coordinator · Inspection log |
| `negotiation` | Prepare the offer and manage counteroffers and conditions · Property Consultant · Negotiation log |
| `lease_coordination` | Lease review · Property Coordinator · Lease copy · **and** Landlord verification · Property Coordinator · Ownership evidence · **and** Environmental review · Operations Manager · Environmental note · **and** Legal review · Operations Manager · Legal note · **and** Coordinate signing and deposit · Property Coordinator · Executed lease |
| `move_in_support` | Coordinate handover, utilities and the initial inspection · Property Coordinator · Handover checklist |
| `closure` | Tenant feedback, final invoice, CRM closure, archiving · Property Coordinator · Archive record |

Each stage also carries `required_docs` naming the evidence above.

- [ ] **Step 4: Run the test, seed, and verify no other template moved**

```bash
cd backend && node scripts/testRuralStages.js && node scripts/seedRuralRentWorkflow.js
node -e "const s=require('./config/db.config');(async()=>{const [r]=await s.query('SELECT vertical_key, JSON_LENGTH(stages) n FROM workflow_templates ORDER BY id');r.forEach(x=>console.log(x.vertical_key,x.n));process.exit(0)})()" | grep -v Executing
```

Expected: `ruralStages OK`; `rural_rent 11` and a new `rural_tenancy 11`; every other count unchanged (leasing 18, properties 51, business_rent 13, commercial_rent 14, rural_sale 18, …).

- [ ] **Step 5: Add to the chain and commit**

Add `node scripts/testRuralStages.js && ` to the `test` script.

```bash
git add backend/scripts/seedRuralRentWorkflow.js backend/scripts/testRuralStages.js backend/package.json
git commit -m "fix(rural-rent): two 11-stage pipelines, owner and tenant

The rural_rent template held 12 stages that mixed the owner and tenant pipelines
and promoted four due-diligence checklist rows into stages. The SOPs describe two
separate 11-stage pipelines, so rural_rent is corrected to the owner pipeline and
rural_tenancy is added for the tenant one. No project used the template.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 4: Rural readiness and suitability assessment

**Files:**
- Create: `backend/scripts/testRuralAssessment.js`
- Modify: `backend/services/rentalWorkflow.service.js`
- Modify: `backend/controllers/rentalAssessment.controller.js`
- Modify: `backend/package.json`

**Interfaces:**
- Produces: `RURAL_ASSESSMENT_ITEMS`, seeded when the property is rural.
- Consumes: the category on the property (Task 2).

**Background:** `rentalAssessment.controller.create` already chooses between `ROOM_ASSESSMENT_ITEMS` and `PREMISES_ASSESSMENT_ITEMS` on `prop.category`. Rural is a third template. Marketing is gated by `computeReadiness` on `is_blocking` items, which is why boundary and authority belong there.

- [ ] **Step 1: Write the failing test**

Create `backend/scripts/testRuralAssessment.js`:

```js
const assert = require('assert');
const {
  RURAL_ASSESSMENT_ITEMS, ROOM_ASSESSMENT_ITEMS, PREMISES_ASSESSMENT_ITEMS, computeReadiness,
} = require('../services/rentalWorkflow.service');

const sections = [...new Set(RURAL_ASSESSMENT_ITEMS.map((i) => i.section))];
// CRM workbook Owner Sheet 5 + Tenant Sheet 10, SOP §8 (owner) / §7 (tenant).
assert.deepStrictEqual(sections, [
  'Access & roads', 'Boundary & ownership', 'Utilities & water', 'Land condition',
  'Existing structures', 'Farming suitability', 'Fishery suitability',
  'Commercial suitability', 'Security', 'Marketing readiness',
]);

// The other two templates are untouched, and rural borrows from neither.
assert.ok(ROOM_ASSESSMENT_ITEMS.some((i) => i.section === 'Bedroom 1'));
assert.ok(PREMISES_ASSESSMENT_ITEMS.some((i) => i.section === 'Signage & visibility'));
const labels = RURAL_ASSESSMENT_ITEMS.map((i) => `${i.section} ${i.assessment_item}`.toLowerCase());
assert.ok(!labels.some((l) => l.includes('bedroom')), 'no bedrooms on farmland');
assert.ok(!labels.some((l) => l.includes('footfall')), 'footfall is a retail measure, not a rural one');

// What the SOP actually asks about rural land.
for (const needle of ['access road', 'water source', 'boundary', 'farming', 'fishery']) {
  assert.ok(labels.some((l) => l.includes(needle)), `rural template asks about ${needle}`);
}

// Boundary/ownership and utilities gate marketing.
const blocking = RURAL_ASSESSMENT_ITEMS.filter((i) => i.is_blocking).map((i) => i.section);
assert.ok(blocking.includes('Boundary & ownership'), 'a disputed boundary blocks marketing');
assert.ok(blocking.includes('Utilities & water'), 'water access blocks marketing');

const pending = RURAL_ASSESSMENT_ITEMS.map((i) => ({ ...i, status: i.is_blocking ? 'pending' : 'done' }));
assert.notStrictEqual(computeReadiness(pending).status, 'ready_for_marketing');
const done = RURAL_ASSESSMENT_ITEMS.map((i) => ({ ...i, status: 'done' }));
assert.strictEqual(computeReadiness(done).status, 'ready_for_marketing');

console.log('ruralAssessment OK');
```

- [ ] **Step 2: Run it and watch it fail**

Expected: `TypeError: Cannot read properties of undefined (reading 'map')`.

- [ ] **Step 3: Add the template**

In `backend/services/rentalWorkflow.service.js`, beside `PREMISES_ASSESSMENT_ITEMS`, add `RURAL_ASSESSMENT_ITEMS` using the same `premisesItems(section, items, is_blocking)` helper:

- **Access & roads** — Approach road condition, Vehicle access to the plot, Distance from the main road
- **Boundary & ownership** *(blocking)* — Boundary demarcated and undisputed, Ownership and authority to let confirmed
- **Utilities & water** *(blocking)* — Water source (tube well, canal, pond), Electricity connection, Irrigation provision
- **Land condition** — Soil and drainage, Flood exposure, Current crop or use
- **Existing structures** — Farm house / shed condition, Storage, Fencing
- **Farming suitability** — Suitable for the intended crop, Season and yield history
- **Fishery suitability** — Pond depth and water retention, Inlet and outlet
- **Commercial suitability** — Permitted commercial use, Access for goods movement
- **Security** — Site security and caretaker, Neighbouring risk
- **Marketing readiness** — Photography and drone footage ready, Signboard placed

Export it beside the others.

- [ ] **Step 4: Seed it for rural properties**

In `backend/controllers/rentalAssessment.controller.js`, extend the import and the template choice:

```js
    // A rural property is assessed on land, water and access — not bedrooms, and
    // not shop frontage.
    const template = String(prop?.category || '') === 'rural'
      ? RURAL_ASSESSMENT_ITEMS
      : (['business', 'commercial'].includes(String(prop?.category || ''))
        ? PREMISES_ASSESSMENT_ITEMS : ROOM_ASSESSMENT_ITEMS);
```

- [ ] **Step 5: Verify against the API**

Restart the backend, create a rural rent property and an assessment on it, and confirm the sections; then create one on a residential property and confirm it still gets `Bedroom 1`. Delete both fixtures — a stray assessment shows up in a live console.

- [ ] **Step 6: Add to the chain and commit**

```bash
git add backend/services/rentalWorkflow.service.js backend/controllers/rentalAssessment.controller.js backend/scripts/testRuralAssessment.js backend/package.json
git commit -m "feat(rural-rent): rural readiness and suitability assessment template

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 5: Rural tenant screening

**Files:**
- Create: `backend/migrations/0157-tenant-application-rural-screening.js`
- Create: `backend/scripts/testRuralScreening.js`
- Create: `admin-portal/src/screens/rural/RuralScreeningPanel.jsx`
- Modify: `backend/services/businessScreening.js` → generalised (keep the filename and its exports)
- Modify: `backend/models/TenantApplication.js`, `backend/controllers/tenantApplication.controller.js`
- Modify: `admin-portal/src/screens/TenantApplications.jsx`
- Modify: `backend/package.json`

**Interfaces:**
- Produces: `SCREENING_FIELDS_BY_CATEGORY`, `screeningFields(category)`, and `screeningVerdict(app, category)` — the existing two-argument-free signature keeps working for business.
- Consumed by: Task 9's screening dashboard.

**Decision (Global Constraints):** screening lives on `TenantApplication`. Register 153 is not the store.

- [ ] **Step 1: Write the failing test**

Create `backend/scripts/testRuralScreening.js`:

```js
const assert = require('assert');
const { screeningFields, screeningVerdict, SCREENING_FIELDS_BY_CATEGORY } = require('../services/businessScreening');

// SOP §10 Step 11 + CRM Owner Sheet 8 — what a rural tenant is screened on.
assert.deepStrictEqual(screeningFields('rural').map((f) => f.key), [
  'nid_verified', 'business_verification', 'farming_experience', 'financial_capacity',
  'references_verified', 'background_check', 'intended_use', 'screening_notes',
]);

// Business keeps its own eight fields, unchanged.
assert.deepStrictEqual(screeningFields('business').map((f) => f.key), [
  'business_type', 'intended_activity', 'trade_licence_no', 'corporate_profile',
  'financial_capability', 'operational_suitability', 'previous_leasing_history', 'screening_notes',
]);
assert.ok(!screeningFields('rural').some((f) => f.key === 'trade_licence_no'),
  'a farmer is not screened on a trade licence');

// An unknown category has no screening — the residential flow is untouched.
assert.deepStrictEqual(screeningFields('residential'), []);
assert.deepStrictEqual(screeningFields(undefined), []);

// Verdict: rural asks its own questions.
const full = {
  nid_verified: 'Yes', business_verification: 'Trade licence seen', farming_experience: '12 years paddy',
  financial_capacity: 'Bank statements 12m', references_verified: 'Two referees called',
  background_check: 'Clear', intended_use: 'Paddy cultivation',
};
let r = screeningVerdict(full, 'rural');
assert.strictEqual(r.ready, true);
assert.deepStrictEqual(r.missing, []);
assert.strictEqual(r.verdict, 'pending', 'gathering facts is not deciding');
assert.strictEqual(screeningVerdict({ ...full, screening_verdict: 'suitable' }, 'rural').verdict, 'suitable');

r = screeningVerdict({}, 'rural');
assert.strictEqual(r.ready, false);
assert.ok(r.missing.includes('farming_experience'));

// The old single-argument call still behaves as business — nothing regresses.
const biz = { business_type: 'Retail', intended_activity: 'Shop', trade_licence_no: 'TL-1',
  corporate_profile: 'Ltd', financial_capability: 'ok', operational_suitability: 'ok',
  previous_leasing_history: 'clean' };
assert.strictEqual(screeningVerdict(biz).ready, true, 'default stays business');
assert.ok(Object.keys(SCREENING_FIELDS_BY_CATEGORY).includes('rural'));

console.log('ruralScreening OK');
```

- [ ] **Step 2: Run it and watch it fail**

Expected: `screeningFields is not a function`.

- [ ] **Step 3: Generalise the screening service**

In `backend/services/businessScreening.js`, keep `BUSINESS_SCREENING_FIELDS` and `VERDICTS` exactly as they are, then add:

```js
const RURAL_SCREENING_FIELDS = [
  { key: 'nid_verified', label: 'NID verification', required: true },
  { key: 'business_verification', label: 'Business verification', required: true },
  { key: 'farming_experience', label: 'Farming experience', required: true },
  { key: 'financial_capacity', label: 'Financial capacity', required: true },
  { key: 'references_verified', label: 'References', required: true },
  { key: 'background_check', label: 'Background check', required: true },
  { key: 'intended_use', label: 'Intended use', required: true },
  { key: 'screening_notes', label: 'Screening notes', required: false },
];

const SCREENING_FIELDS_BY_CATEGORY = {
  business: BUSINESS_SCREENING_FIELDS,
  rural: RURAL_SCREENING_FIELDS,
};

/** The field set for a category, or [] where screening does not apply. */
function screeningFields(category) {
  return SCREENING_FIELDS_BY_CATEGORY[String(category || '')] || [];
}
```

and change `screeningVerdict(app = {}, category = 'business')` to take the field set from `screeningFields(category) || BUSINESS_SCREENING_FIELDS` — defaulting to business so every existing caller is unaffected. Export the new names alongside the old ones.

- [ ] **Step 4: Run the test**

Expected: `ruralScreening OK`. Then run `node scripts/testBusinessScreening.js` — it must still pass untouched.

- [ ] **Step 5: Store the fields**

Create `backend/migrations/0157-tenant-application-rural-screening.js` adding nullable `nid_verified`, `business_verification`, `farming_experience`, `financial_capacity`, `references_verified`, `background_check`, `intended_use` (all STRING/TEXT; `screening_notes` and `screening_verdict` already exist from 0150). Add the same names to `models/TenantApplication.js` and to the controller's `FIELDS` whitelist.

- [ ] **Step 6: The panel**

Create `admin-portal/src/screens/rural/RuralScreeningPanel.jsx` mirroring `BusinessScreeningPanel.jsx` with the rural fields, and render it in `TenantApplications.jsx` for `scope.category === 'rural'` beside the business one.

- [ ] **Step 7: Verify the round trip**

Migrate, restart, create a rural application with every screening field, read it back and confirm each persisted and `screening_verdict` holds. Delete the fixture.

- [ ] **Step 8: Add to the chain and commit**

```bash
git add backend/migrations/0157-tenant-application-rural-screening.js backend/services/businessScreening.js backend/scripts/testRuralScreening.js backend/models/TenantApplication.js backend/controllers/tenantApplication.controller.js admin-portal/src/screens/rural/RuralScreeningPanel.jsx admin-portal/src/screens/TenantApplications.jsx backend/package.json
git commit -m "feat(rural-rent): rural tenant screening, as a field set per category

A farmer is screened on farming experience and financial capacity, not a trade
licence and a corporate profile. The screening service now holds a field set per
category; business keeps its eight fields and its existing single-argument calls.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 6: Twenty-four month protection

**Files:**
- Create: `backend/scripts/testProtectionMonths.js`
- Modify: `backend/services/protectionWindow.js`
- Modify: `backend/controllers/rentProtection.controller.js:40,62`
- Modify: `backend/package.json`

**Interfaces:**
- Produces: `PROTECTION_MONTHS_BY_CATEGORY` and `protectionMonthsFor(category)`.
- Consumes: `protectionExpiry(date, months)`, which already takes the months.

**Decision (Global Constraints):** protected introductions live in `non_circumvention_records`. Registers 154 and 161 are not the store.

- [ ] **Step 1: Write the failing test**

```js
const assert = require('assert');
const { protectionMonthsFor, protectionExpiry, PROTECTION_MONTHS_BY_CATEGORY } = require('../services/protectionWindow');

// SOP Rural §13 (owner) and §11 (tenant): 24 months. Business Rent is 12.
assert.strictEqual(protectionMonthsFor('rural'), 24);
assert.strictEqual(protectionMonthsFor('business'), 12);
assert.strictEqual(protectionMonthsFor('residential'), 12);
assert.strictEqual(protectionMonthsFor(undefined), 12, 'the default must not change');
assert.strictEqual(protectionMonthsFor('nonsense'), 12);

// Applied, a rural introduction is protected for two years.
assert.strictEqual(protectionExpiry('2026-09-26', protectionMonthsFor('rural')), '2028-09-26');
assert.strictEqual(protectionExpiry('2026-09-26', protectionMonthsFor('business')), '2027-09-26');
// Month-end clamping still holds over two years.
assert.strictEqual(protectionExpiry('2026-08-31', 24), '2028-08-31');
assert.strictEqual(protectionExpiry('2024-02-29', 24), '2026-02-28');
assert.ok(PROTECTION_MONTHS_BY_CATEGORY.rural === 24);

console.log('protectionMonths OK');
```

- [ ] **Step 2: Run it and watch it fail**, then add to `protectionWindow.js`:

```js
/**
 * How long an introduction stays protected, per console. Rural is 24 months
 * (SOP Rural Rental §13 / Tenancy §11); everything else is 12. Unknown values
 * fall back to 12 so no existing caller changes.
 */
const PROTECTION_MONTHS_BY_CATEGORY = { rural: 24 };
const DEFAULT_PROTECTION_MONTHS = 12;
const protectionMonthsFor = (category) =>
  PROTECTION_MONTHS_BY_CATEGORY[String(category || '')] || DEFAULT_PROTECTION_MONTHS;
```

Export all three.

- [ ] **Step 3: Use it on create and update**

In `backend/controllers/rentProtection.controller.js`, line 40 becomes:

```js
  // The window depends on the console: rural is 24 months, everything else 12.
  const months = protectionMonthsFor(pmCategory(req.query.category) || property?.category);
  if (!data.protection_expires_on) data.protection_expires_on = protectionExpiry(data.introduction_date, months);
```

Note the ordering: `property` is resolved a few lines below today, so move the `Property.findByPk` above this block. Line 62 (update) takes `protectionMonthsFor(row.category)`.

- [ ] **Step 4: Verify against the API**

Create a protected introduction on a rural property and confirm `protection_expires_on` is **two years** out, then one on a business property and confirm one year. Delete both.

- [ ] **Step 5: Add to the chain and commit**

```bash
git add backend/services/protectionWindow.js backend/controllers/rentProtection.controller.js backend/scripts/testProtectionMonths.js backend/package.json
git commit -m "feat(rural-rent): 24-month protection window for rural introductions

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 7: Tenant Sourcing, over the registers that already exist

**Files:**
- Create: `backend/controllers/ruralSourcing.controller.js`
- Create: `backend/routes/ruralSourcing.routes.js`
- Create: `backend/scripts/testRuralSourcing.js`
- Create: `admin-portal/src/screens/rural/RuralSourcing.jsx`
- Modify: `backend/server.js` (one `mount`, staged as its own hunk), `backend/routes/manifest.js`
- Modify: `admin-portal/src/App.jsx`, `admin-portal/src/config/consoles.js`
- Modify: `backend/package.json`

**Interfaces:**
- Produces: `GET/POST /api/rural-sourcing/briefs`, `GET/POST /api/rural-sourcing/briefs/:id/shortlist`, `GET /api/rural-sourcing/summary`.
- Consumes: register definitions **158** (`requirement_register`), **159** (`property_search_register`), **160** (`shortlist_register`) and the `register_entries` table.

**Review Focus item 3 lives here.** These three registers already exist with the workbook's columns. This task adds a **view and an API over them** — it does **not** create tables. If a step tempts you to `createTable`, stop: that is the duplication this task exists to avoid.

- [ ] **Step 1: Read the three definitions before writing anything**

```bash
cd backend && node -e "
const s=require('./config/db.config');
(async()=>{const [r]=await s.query('SELECT id, register_key, name, columns FROM register_definitions WHERE id IN (158,159,160)');
r.forEach(x=>{console.log('\n'+x.id, x.register_key, '|', x.name); console.log(JSON.stringify(typeof x.columns==='string'?JSON.parse(x.columns):x.columns));});
process.exit(0)})()" | grep -v Executing
```

Write the column keys down; the API's field names must match them exactly, because the entries are stored as `data` JSON against those keys.

- [ ] **Step 2: Write the failing test**

Create `backend/scripts/testRuralSourcing.js` around the pure mapping the controller uses — no DB:

```js
const assert = require('assert');
const { briefFromEntry, shortlistSummary, REGISTERS } = require('../controllers/ruralSourcing.controller');

// The three registers this rides on, by id — they were seeded 2026-06-26.
assert.deepStrictEqual(REGISTERS, { requirement: 158, search: 159, shortlist: 160 });

// An entry's `data` JSON becomes a brief without losing the register's own keys.
const entry = { id: 7, register_definition_id: 158, client_id: 3, status: 'Yes',
  data: { requirement: 'Fishery', notes: '2 acres, Cumilla' } };
const brief = briefFromEntry(entry);
assert.strictEqual(brief.id, 7);
assert.strictEqual(brief.client_id, 3);
assert.strictEqual(brief.requirement, 'Fishery');
assert.strictEqual(brief.notes, '2 acres, Cumilla');

// A string `data` column round-trips (this DB returns JSON columns as strings).
assert.strictEqual(briefFromEntry({ id: 8, data: '{"requirement":"Pond"}' }).requirement, 'Pond');
// Unparseable data must not crash a list.
assert.deepStrictEqual(briefFromEntry({ id: 9, data: 'not json' }).id, 9);

// Shortlist counts by outcome, with an honest zero.
const s = shortlistSummary([
  { data: { outcome: 'Shortlisted' } }, { data: { outcome: 'Shortlisted' } },
  { data: { outcome: 'Rejected' } }, { data: {} },
]);
assert.strictEqual(s.total, 4);
assert.strictEqual(s.byOutcome.Shortlisted, 2);
assert.strictEqual(s.byOutcome.Rejected, 1);
assert.strictEqual(s.byOutcome.unrecorded, 1);
assert.deepStrictEqual(shortlistSummary([]), { total: 0, byOutcome: {} });

console.log('ruralSourcing OK');
```

- [ ] **Step 3: Write the controller over the registers**

`REGISTERS = { requirement: 158, search: 159, shortlist: 160 }`, `briefFromEntry` (defensive JSON parse per the DON'T in AGENTS.md), `shortlistSummary`, and handlers that read and write `register_entries` with `vertical_key: 'rural_tenancy'` and the right `register_definition_id`. Every list scopes by `branchScope(req)`.

- [ ] **Step 4: Route, mount, screen**

Routes `/api/rural-sourcing/*` with the same `authMiddleware` + `roleMiddleware` shape as `rentProtection.routes.js`. Mount in `server.js` **and** `routes/manifest.js`. Screen `RuralSourcing.jsx` in `pm-scope`: briefs on the left, the selected brief's search and shortlist rows on the right, with add forms driven by the register's own columns. Route it at `/rural/rent/sourcing` and add the nav group from Task 1 Step 4.

- [ ] **Step 5: Verify end to end**

Restart, create a brief, add two shortlist rows, read the summary, confirm they come back; check `/api/registers/entries?category=rural` also shows them (one store, two doors); delete the fixtures.

- [ ] **Step 6: Add to the chain and commit** (stage the `server.js` hunk alone)

```bash
git commit -m "feat(rural-rent): tenant sourcing over the existing registers

The requirement, property-search and shortlist registers were already seeded from
the client's CRM workbook in June. This adds the pipeline view and an API over
them rather than three new tables.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 8: The rural agreement builders

**Files:**
- Modify: `backend/controllers/rprm.controller.js`, `backend/controllers/rptm.controller.js`
- Modify: whichever service provides `packFor` / `buildResidentialPMAgreement` (read the imports at the top of `rprm.controller.js`)
- Modify: `admin-portal/src/App.jsx`, `admin-portal/src/config/consoles.js`
- Modify: `backend/scripts/testAgreementCategory.js`

**Interfaces:**
- Produces: `rural` registered in `PM_BUILDERS` and `TM_BUILDERS`, with `ENV-RRPM-` / `ENV-RRTM-` code prefixes.
- Consumes: `resolveAgreementCategory` (isolation plan Task 8).

**Background:** since `f6d8093`, `GET /api/rprm/meta?category=rural` returns **400 — "No agreement builder is available for the 'rural' category."** That is correct behaviour, and it means the console's two agreement nav items are dead until this task lands. Do not paper over it by pointing the links at the residential builder.

**Sources:** `Downloads/Rural-.../Rural/Rent/Rural Property Rental Management Service Agreement - V0.2.docx` (702 lines extracted) and `... Tenancy Management Service Agreement - V0.2.docx` (541 lines).

- [ ] **Step 1: Size the work before committing to it**

Read both V0.2 documents and compare against how the residential and commercial packs are built:

```bash
cd backend && grep -n "packFor\|buildResidentialPMAgreement" -m 5 controllers/rprm.controller.js
wc -l services/*.js | sort -rn | head -5
```

**Decision point.** If the rural agreements are the same shape as the commercial pack — a service-group list, a checklist-group list and a schedule of fees — extend the pack and continue here. If they need a bespoke renderer on the scale of the residential builder, **stop and split this into its own plan**, leave the 400 in place, and remove the two agreement nav items from `RURAL_RENT_NAV` so the console ships without dead links. Say which path you took in the commit message.

- [ ] **Step 2: Extend the test first**

In `backend/scripts/testAgreementCategory.js`, the loop currently asserts business **and rural** both fail. Change it to assert **business** still fails and rural now resolves:

```js
for (const c of ['business']) { /* …unchanged 400 assertions… */ }
const WITH_RURAL = { ...BUILDERS, rural: () => 'rur' };
assert.strictEqual(resolveAgreementCategory('rural', WITH_RURAL).category, 'rural');
```

- [ ] **Step 3: Register the builders**, add the two routes (`/rural/rent/agreements`, `/rural/rent/tenancy-agreements`) and the price schedule (`scope="rural_rent"`), and re-enable the nav items.

- [ ] **Step 4: Verify all four categories**

```bash
for c in residential commercial business rural; do
  printf '%-12s ' "$c"
  curl -s -o /dev/null -w "HTTP %{http_code}\n" -H "Authorization: Bearer $TOKEN" -H "X-Branch-Id: 1" \
    "http://localhost:50001/api/rprm/meta?category=$c"
done
```

Expected: residential/commercial unchanged, **rural 200**, business still **400**. Then generate one rural agreement and read it — confirm it carries rural content and an `ENV-RRPM-` code, not residential text.

- [ ] **Step 5: Commit**

---

### Task 9: The five dashboards

**Files:**
- Create: `backend/services/ruralRentDashboardMath.js`, `backend/controllers/ruralRentDashboards.controller.js`, `backend/routes/ruralRentDashboards.routes.js`, `backend/scripts/testRuralRentDashboardMath.js`
- Create: `admin-portal/src/screens/rural/RuralRentDashboards.jsx`
- Modify: `backend/server.js` (one hunk), `backend/routes/manifest.js`, `admin-portal/src/App.jsx`, `backend/package.json`

**Interfaces:**
- Produces: `GET /api/rural-rent/dashboards/:key` for `owner | tenant | property | financial | executive`.
- Consumes: `RURAL_OWNER_STAGES`/`RURAL_TENANT_STAGES` (3), `screeningVerdict` (5), `protectionState` (6), `shortlistSummary` (7), `advanceState`/`depositSummary` (Business Rent), `RURAL_PROPERTY_TYPES` (2).

Follow `businessRentDashboards.controller.js` exactly: scope every query with `category: 'rural', listing_type: 'rent'`, keep the math in a pure module with its own test, return `404` for an unknown key, and never emit `NaN`.

The five, from the workbook's "DASHBOARDS TO BUILD INTO CRM":

1. **Owner** — active listings, vacant, occupied, leasing revenue, arrears
2. **Tenant** — active briefs, inspections, active leases, upcoming renewals
3. **Property** — counts by rural type (farm houses, fisheries, ponds, agricultural land, orchards), driven by `RURAL_PROPERTY_TYPES` so a type with none still shows a zero
4. **Financial** — leasing fees, management fees, outstanding invoices, revenue by property type
5. **Executive** — total owners, total tenants, active rentals, occupancy rate, revenue, gross profit

Unit-test the pure math the way `testBusinessRentDashboardMath.js` does: every type present including the empty ones, no NaN on missing figures, an occupancy rate of 0 (not `NaN`) when there are no properties, and boundary-inclusive arrears buckets.

- [ ] Verify all five plus a 404 for `nonsense`; build; commit.

---

### Task 10: Prove it and hand over

**Files:**
- Create: `backend/scripts/e2e/ruralRent.js`
- Modify: `backend/scripts/e2e/consoleIsolation.js`
- Modify: `AGENT_WORK_LOG.md` (appended, never committed)

**Review Focus items 1 and 2 live here.**

- [ ] **Step 1: The rural e2e**

Create `backend/scripts/e2e/ruralRent.js` on the `httpHarness`, walking the owner SOP end to end and asserting the rural-specific behaviour, not just HTTP 200s:

owner enquiry → rural property **with a full land record** (every field echoed back) → ownership verification entry on register 151 → owner agreement + fee structure → rural readiness assessment (asserting `Boundary & ownership` is present and `Bedroom 1` is not) → marketing → tenant brief on register 158 → shortlist on 160 → inspection → rural screening on the application (asserting `farming_experience` persisted and `trade_licence_no` is absent) → negotiation → tenancy with deposits → protected introduction (asserting the expiry is **24** months out, not 12) → handover → rent collection → closure. Then the five dashboards and a 404. Every fixture stamped and removed at the end, with a check that nothing was left behind.

- [ ] **Step 2: Extend the isolation suite**

Add rural to the endpoint lists that do not yet name it, and keep the Task 1 rural-sale fixture assertion. The suite must finish at **more** than 140 checks with 0 FAIL.

- [ ] **Step 3: The full battery**

```bash
cd backend && npm test
node scripts/e2e/consoleIsolation.js
node scripts/e2e/ruralRent.js
node scripts/e2e/businessRent.js
node scripts/e2e/businessParity.js
node scripts/e2e/businessRegistration.js
cd ../admin-portal && npm run build && node src/screens/pmScopeCoverage.test.mjs && node src/screens/sales/categoryLock.test.mjs
cd ../website-mock && npm run build
```

Expected: `npm test` exit 0; every suite 0 FAIL; businessRent 39/39, businessParity 74/74, businessRegistration 48/48; both builds clean.

- [ ] **Step 4: Click all four consoles**

`/admin/property-management`, `/admin/commercial/rent`, `/admin/business-rent` unchanged; `/admin/rural/rent` shows the PM nav in green, the land record on the wizard, the sourcing view, the five dashboards and the two rural agreement builders (or, if Task 8 was split, no agreement nav items rather than dead ones).

- [ ] **Step 5: Work log and final commit**

Append a `COMPLETED` entry: files changed, migrations applied (0156, 0157), the exact verification output, which path Task 8 took, any fixture that could not be removed, and what remains (spec §12 — dispute management, feedback/complaint/retention registers, the Rural **Sale** SOP, rural portals, the public website surface for rural rental listings).

---

### Task 11: Land & Ownership — the register view and the fee structure

**Files:**
- Create: `backend/migrations/0158-owner-profile-rural-fees.js`
- Create: `backend/scripts/testRuralFees.js`
- Create: `admin-portal/src/screens/rural/RuralLandRecords.jsx`
- Create: `admin-portal/src/screens/rural/RuralOwnershipVerification.jsx`
- Modify: `backend/models/PropertyOwnerProfile.js` (confirm the filename first), `backend/controllers/propertyControlCrud.js` or whichever controller owns the owner profile's `pick(...)`
- Modify: `admin-portal/src/App.jsx`, `admin-portal/src/config/consoles.js`
- Modify: `backend/package.json`

**Interfaces:**
- Produces: `property_owner_profiles.leasing_fee | marketing_budget | early_termination_fee | exclusive_until`; the `/rural/rent/land-records` and `/rural/rent/ownership` screens.
- Consumes: the land record (Task 2), register **151** `ownership_verification`, `verticalsForCategory` (already live).

**Background (measured):** `property_owner_profiles` already carries `management_commission`, `onboarding_fee`, `agreement_start_date` and `termination_notice_days`. The SOP's fee structure (§7 Step 6) needs four more: the **leasing fee**, the **marketing budget**, the **early termination fee** and the **exclusive appointment** expiry. Register **151** already holds the nine ownership documents with the workbook's own columns and **8 entries** — this task gives it a screen, it does not re-model it.

- [ ] **Step 1: Write the failing test**

Create `backend/scripts/testRuralFees.js`:

```js
const assert = require('assert');
const Profile = require('../models/PropertyOwnerProfile');
const { RURAL_FEE_FIELDS } = require('../utils/ruralFees');

// SOP Rural Rental Management §7 Step 6 — the fee structure recorded per property.
assert.deepStrictEqual(RURAL_FEE_FIELDS, ['leasing_fee', 'marketing_budget', 'early_termination_fee', 'exclusive_until']);

// Already present, and NOT duplicated by this task.
for (const existing of ['management_commission', 'onboarding_fee', 'termination_notice_days', 'agreement_start_date']) {
  assert.ok(Profile.rawAttributes[existing], `expected ${existing} to already exist`);
  assert.ok(!RURAL_FEE_FIELDS.includes(existing), `${existing} already exists — do not add it again`);
}
// Sequelize must know the new ones or the form writes them and they vanish.
for (const f of RURAL_FEE_FIELDS) assert.ok(Profile.rawAttributes[f], `model is missing ${f}`);

console.log('ruralFees OK');
```

- [ ] **Step 2: Run it and watch it fail**, then create `backend/utils/ruralFees.js` exporting that list, migration `0158` adding the four columns (`DECIMAL(15,2)` for the three amounts, `DATEONLY` for `exclusive_until`, all nullable and guarded), the model attributes, and the four names in the owner-profile `pick(...)` whitelist.

- [ ] **Step 3: The two screens**

`RuralLandRecords.jsx` — the rural rent properties as a land-record table (district, upazila, union, village, mouza, khatiyan, dag, area, current use, type), fetched with `/properties?category=rural&listing_type=rent` plus the Task 2 filters exposed as inputs, so the console can find a plot by mouza or dag.

`RuralOwnershipVerification.jsx` — a property picker (scoped, as Compliance now is) and the nine documents from register **151**, read and written through `/api/registers/entries?register_definition_id=151&property_id=…`. Show a "verified / received / outstanding" count per property and mark the two blocking items. It must read the register's `columns` to build its fields rather than hard-coding them, so a workbook change does not silently drop a column.

Route both, and add the `rural-land` nav group from Task 1 Step 4.

- [ ] **Step 4: Verify**

Migrate, restart, and confirm: the fee fields round-trip on an owner profile; the land-records table finds a plot by `mouza`; the ownership screen lists the nine documents for a property and a new entry appears through `/api/registers/entries?category=rural`. Remove any fixture.

- [ ] **Step 5: Add to the chain and commit**

```bash
git add backend/migrations/0158-owner-profile-rural-fees.js backend/utils/ruralFees.js backend/scripts/testRuralFees.js backend/models/PropertyOwnerProfile.js admin-portal/src/screens/rural/RuralLandRecords.jsx admin-portal/src/screens/rural/RuralOwnershipVerification.jsx admin-portal/src/App.jsx admin-portal/src/config/consoles.js backend/package.json
git commit -m "feat(rural-rent): land records, ownership verification and the fee structure

The ownership screen reads register 151, which was seeded from the client's
workbook in June and already holds entries, rather than re-modelling the nine
documents. The fee structure adds only the four fields property_owner_profiles
does not already have.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Notes for the executor

- **Re-measure the residential baseline after every task.** 53 properties, 38 tenancies, 103 open actions, BDT 107,400 overdue, 192 blockers. If one moves, stop.
- **Thirteen `rural_rent` registers already exist.** Read before you build; a new table beside one of them is the mistake this plan is shaped to avoid.
- **Deployment is blocked** — Hostinger has lost access to the repository. Do not merge or push to `production`.
- **If a step's anchor does not match the file**, read the file and adapt. Line numbers were measured on 2026-09-26.
