# Business Rent — Property Management Console Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Business Rent the third Property Management console — the same PM screens scoped to business premises — and add the four SOP modules, the 13-stage lease workflow and the six dashboards.

**Architecture:** Commercial Rent is not a separate stack: it is the PM screens under `PmScopeProvider` with a category and a base path. Business Rent becomes the third such console at `/business-rent`. The PM backend must first learn the `business` category (today an unknown category returns *everything*), and every business scope must carry `listing_type` too, because 17 business-category properties already exist and all of them are for **sale**.

**Tech Stack:** Node + Express + Sequelize + MySQL (backend on :50001), React 18 + Vite (admin-portal), plain-Node assert scripts for unit tests, `scripts/e2e/httpHarness.js` for end-to-end.

**Spec:** `docs/superpowers/specs/2026-09-24-business-rent-pm-console-design.md`

## Global Constraints

- **Schema only via migrations**, numbered `00NN-*.js`, idempotent (`describeTable` guards). Never edit an applied migration. Next free number: **0149**.
- **The local DB is the production DB.** Migrations must be additive. It currently holds 38 residential tenancies, 53 residential rent properties and 17 business sale properties — none of which may change behaviour.
- **Never stage** `backend/server.js`, `backend/config/cors.config.js` or `AGENT_WORK_LOG.md` wholesale (another contributor has uncommitted work in the first two). For `server.js`, stage only your own hunk. The log is appended, never committed.
- **Live-stack rule:** the PM stack serves the residential console today. Every change is additive; an unknown or absent `category` must behave exactly as it does now.
- **Business Rent scope is always** `category: 'business'` **AND** `listing_type: 'rent'`. Category alone is a bug.
- **Keep** the BRM (`business_rental_agreement`) and BTM agreement builders and the `business_rent` price schedule, with their existing routes.
- Backend scripts run from `backend/`. Commit trailer on every commit:
  `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`

## Review Focus

The input classes most likely to bite a user, each pinned to a test in the task that owns the code:

1. **A business SALE property appearing in Business Rent** — 17 exist today; scoping on category alone shows all of them. (Task 2)
2. **An absent or unknown category silently widening a query** — today `category=nonsense` returns every property and every tenancy, residential included. (Task 1)
3. **The residential and commercial consoles changing behaviour** — they are live; their results must be identical before and after the scoping change. (Task 1)
4. **A lease that departs from the SOP structure being blocked** — the SOP says "generally … unless otherwise approved by management", so a 6-month term or 3-month advance must save, with the departure and approver recorded. (Task 8)
5. **Handover blocked by a commission that was never charged** — a lease with no commission invoice must hand over freely; only an *unpaid* commission blocks, and an override records who allowed it. (Task 11)

---

# Phase 1 — Category scoping (the blocker)

### Task 1: PM queries accept the business category

**Files:**
- Create: `backend/utils/pmCategory.js`
- Create: `backend/scripts/testPmCategory.js`
- Modify: `backend/controllers/propertyManagement.controller.js:38-39` and `:349-350`
- Modify: `backend/package.json`

**Interfaces:**
- Produces: `pmCategory(value)` → `'residential' | 'commercial' | 'business' | null` (null for absent/unknown), and `pmCategoryClause(value, col)` → `"" | " AND <col> = '<cat>'"`.
- Consumed by: every later task that scopes a PM query.

- [ ] **Step 1: Write the failing test**

Create `backend/scripts/testPmCategory.js`:

```js
const assert = require('assert');
const { pmCategory, pmCategoryClause } = require('../utils/pmCategory');

// The three consoles.
assert.strictEqual(pmCategory('residential'), 'residential');
assert.strictEqual(pmCategory('commercial'), 'commercial');
assert.strictEqual(pmCategory('business'), 'business');
assert.strictEqual(pmCategory('BUSINESS'), 'business', 'case insensitive');

// Unknown and absent must be null so the query is left UNFILTERED exactly as before.
// Returning a clause here would change what the live residential console shows.
assert.strictEqual(pmCategory('rural'), null, 'rural is not a PM console');
assert.strictEqual(pmCategory('nonsense'), null);
assert.strictEqual(pmCategory(''), null);
assert.strictEqual(pmCategory(undefined), null);
assert.strictEqual(pmCategory(null), null);

// The clause is built, never interpolated from raw input — no SQL can ride in.
assert.strictEqual(pmCategoryClause('business', 'p.category'), " AND p.category = 'business'");
assert.strictEqual(pmCategoryClause('residential', 'category'), " AND category = 'residential'");
assert.strictEqual(pmCategoryClause("'; DROP TABLE properties; --", 'p.category'), '', 'injection yields no clause');
assert.strictEqual(pmCategoryClause(undefined, 'p.category'), '', 'absent yields no clause');

console.log('pmCategory OK');
```

- [ ] **Step 2: Run it and watch it fail**

Run: `cd backend && node scripts/testPmCategory.js`
Expected: `Cannot find module '../utils/pmCategory'`

- [ ] **Step 3: Write the validator**

Create `backend/utils/pmCategory.js`:

```js
/**
 * Property-Management category scoping.
 *
 * The PM screens run under three consoles — residential (/property-management),
 * commercial (/commercial/rent) and business (/business-rent) — off one set of
 * tables. Before this existed the controllers compared against 'commercial' and
 * 'residential' inline and an unknown value fell through to NO filter, so a
 * console asking for anything else saw every property and every tenancy.
 *
 * null means "not a console category": the caller leaves the query unfiltered,
 * which is exactly the behaviour every existing caller already had.
 */
const PM_CATEGORIES = ['residential', 'commercial', 'business'];

function pmCategory(value) {
  const v = String(value == null ? '' : value).toLowerCase().trim();
  return PM_CATEGORIES.includes(v) ? v : null;
}

/** SQL fragment for a validated category, or '' — never interpolates raw input. */
function pmCategoryClause(value, column = 'category') {
  const cat = pmCategory(value);
  return cat ? ` AND ${column} = '${cat}'` : '';
}

module.exports = { PM_CATEGORIES, pmCategory, pmCategoryClause };
```

- [ ] **Step 4: Run the test**

Run: `cd backend && node scripts/testPmCategory.js`
Expected: `pmCategory OK`

- [ ] **Step 5: Use it in the PM controller**

In `backend/controllers/propertyManagement.controller.js`, add the import beside the other utils:

```js
const { pmCategoryClause } = require('../utils/pmCategory');
```

Replace lines 38-39:

```js
  const catClause = pmCategoryClause(req.query.category, 'p.category');
```

Replace lines 349-350:

```js
  const catCol = pmCategoryClause(req.query.category, 'category');
```

Read both call sites first: the replaced expressions produced `"AND p.category = 'commercial'"` (no leading space at :38) and `" AND category = 'commercial'"` (leading space at :349). `pmCategoryClause` always returns a leading space, so check the surrounding SQL string still has exactly one space before `AND` and no `ANDAND`.

- [ ] **Step 6: Prove the live consoles did not move**

Restart the backend, then compare before/after for the two live consoles. With a valid token in `$TOKEN`:

```bash
cd backend
for c in residential commercial nonsense ""; do
  printf '%-12s ' "${c:-<none>}"
  curl -s -H "Authorization: Bearer $TOKEN" -H "X-Branch-Id: 1" \
    "http://localhost:50001/api/property-management/overview?category=$c" \
    | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const j=JSON.parse(s);console.log(JSON.stringify(j).length,'bytes')})"
done
```

Expected: `residential` and `commercial` unchanged from before the edit; `nonsense` and `<none>` identical to each other (both unfiltered, as before).

- [ ] **Step 7: Add to the test chain and commit**

In `backend/package.json`, add `node scripts/testPmCategory.js && ` immediately before `node scripts/testBusinessRegistrationLine.js`.

```bash
git add backend/utils/pmCategory.js backend/scripts/testPmCategory.js backend/controllers/propertyManagement.controller.js backend/package.json
git commit -m "feat(pm): validated category scoping, with business as a third console

An unknown category previously fell through to no filter at all, so any console
other than residential/commercial saw every property and tenancy.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 2: Business scope carries listing_type

**Files:**
- Modify: `backend/controllers/property.controller.js:116`
- Modify: `admin-portal/src/screens/RentalProperties.jsx:122`
- Modify: `backend/scripts/e2e/businessRent.js` (created in this task)

**Interfaces:**
- Consumes: `pmCategory` (Task 1).
- Produces: `GET /api/properties?category=business&listing_type=rent` returns only business **rent** properties; the e2e file with a `scoping()` section later tasks extend.

- [ ] **Step 1: Write the failing e2e**

Create `backend/scripts/e2e/businessRent.js`:

```js
/**
 * End-to-end checks for the Business Rent console. Needs the API on :50001.
 * Run: node scripts/e2e/businessRent.js
 */
const { login, req, ok, finish, STAMP } = require('./httpHarness');

async function scoping() {
  console.log('\n— Scoping: business rent never shows business sale —');
  // 17 business-category properties exist today and every one is listing_type 'sale'
  // (the Business Buy/Sale parity work). Scoping on category alone shows them all.
  const all = await req('GET', '/api/properties?category=business&limit=200');
  const sale = (all.body?.data || []).filter((p) => p.listing_type === 'sale');
  ok(sale.length > 0, 'business sale listings exist to be excluded', `${sale.length} found`);

  const rentOnly = await req('GET', '/api/properties?category=business&listing_type=rent&limit=200');
  const rows = rentOnly.body?.data || [];
  ok(rentOnly.status === 200, 'business rent query answers', `HTTP ${rentOnly.status}`);
  ok(rows.every((p) => p.listing_type === 'rent'), 'no sale listing leaks into the rent scope',
    rows.filter((p) => p.listing_type !== 'rent').map((p) => p.property_code).join(',') || 'clean');
  ok(rows.every((p) => p.category === 'business'), 'no other category leaks in');

  // The residential console must be untouched by any of this.
  const res = await req('GET', '/api/properties?category=residential&listing_type=rent&limit=200');
  ok((res.body?.data || []).every((p) => p.category === 'residential'), 'residential scope still clean');
  ok((res.body?.data || []).length > 0, 'residential rent properties still returned', `${(res.body?.data || []).length}`);
}

(async () => {
  console.log(`\n===== BUSINESS RENT E2E (run ${STAMP}) =====`);
  if (!(await login())) return finish();
  await scoping();
  finish();
})().catch((e) => { ok(false, 'harness crashed', e.message); finish(); });
```

- [ ] **Step 2: Run it and watch it fail**

Run: `cd backend && node scripts/e2e/businessRent.js`
Expected: FAIL on `no sale listing leaks into the rent scope` — `/api/properties` ignores `listing_type` today, so the 17 sale rows come back.

- [ ] **Step 3: Accept listing_type on the properties list**

In `backend/controllers/property.controller.js`, beside line 116 (`if (req.query.category) where.category = req.query.category;`):

```js
  // Business Rent and Business Sale share the 'business' category and are told
  // apart only by listing_type, so the console must be able to ask for one.
  if (req.query.listing_type) where.listing_type = req.query.listing_type;
```

Check first whether a `listing_type` filter already exists a few lines away; if it does, use it and do not add a second.

- [ ] **Step 4: Send it from the console**

In `admin-portal/src/screens/RentalProperties.jsx`, replace line 122:

```js
      const catQ = `&category=${scope.category}&listing_type=${scope.listingType || 'rent'}`;
```

- [ ] **Step 5: Run the e2e and build**

Restart the backend. Run: `cd backend && node scripts/e2e/businessRent.js`
Expected: all PASS.

Run: `cd admin-portal && npm run build`
Expected: `✓ built`

- [ ] **Step 6: Commit**

```bash
git add backend/controllers/property.controller.js backend/scripts/e2e/businessRent.js admin-portal/src/screens/RentalProperties.jsx
git commit -m "fix(business-rent): scope business properties by listing type, not category alone

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

# Phase 2 — The console

### Task 3: Business Rent console, nav and routes

**Files:**
- Modify: `admin-portal/src/config/consoles.js` (replace `BUSINESS_RENT_NAV`, keep `businessRentConsole`)
- Modify: `admin-portal/src/App.jsx` (replace the 8-route block at ~1527-1534)
- Modify: `admin-portal/src/screens/BusinessRentConsole.jsx`

**Interfaces:**
- Consumes: Task 1 and 2's scoping.
- Produces: `/business-rent/*` rendering the PM screens under `PmScopeProvider {category:'business', listingType:'rent', basePath:'/business-rent', label:'Business Rent'}`; the BRM/BTM agreement routes and price schedule preserved.

- [ ] **Step 1: Read how Commercial Rent is wired**

```bash
cd admin-portal
grep -n "CommercialRentConsole" -A 12 src/screens/CommercialRentConsole.jsx
grep -n 'path="/commercial/rent' src/App.jsx | head -40
```

Copy that structure exactly; only the category, base path, label and accent differ.

- [ ] **Step 2: Replace the nav**

In `admin-portal/src/config/consoles.js`, replace the whole `BUSINESS_RENT_NAV` array with the PM nav rebased, keeping the business agreement builders:

```js
// Business Rent runs the SAME Property Management screens as the residential and
// commercial rent consoles (see pmScope.jsx), so its nav is the PM nav rebased.
// The agreements group keeps the BUSINESS builders — BRM (rental management) and
// BTM (tenancy management) — which are the documents of record for this line.
export const BUSINESS_RENT_NAV = rebasePmNav(
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
    : g)),
  '/property-management',
  '/business-rent',
);
```

`rebasePmNav` and `PROPERTY_MGMT_NAV` are already defined above in this file.

- [ ] **Step 3: Add the scope and point the console shell at the PM screens**

In `admin-portal/src/config/pmScope.jsx`, after `COMMERCIAL_RENT_SCOPE`:

```js
export const BUSINESS_RENT_SCOPE = {
  category: 'business',
  listingType: 'rent',
  basePath: '/business-rent',
  label: 'Business Rent',
};
```

Replace the body of `admin-portal/src/screens/BusinessRentConsole.jsx` with:

```jsx
import React from 'react';
import ServiceConsole from '../ui/ServiceConsole';
import { businessRentConsole, BUSINESS_RENT_NAV } from '../config/consoles';
import { PmScopeProvider, BUSINESS_RENT_SCOPE } from '../config/pmScope';

/*
 * BusinessRentConsole — leasing business premises (office, retail, restaurant,
 * warehouse, factory).
 *
 * Like Commercial Rent, it reuses the Property Management operational screens
 * verbatim; the PmScopeProvider tells every screen it renders to operate on
 * business rent properties and to keep its links inside /business-rent/*.
 * Business-specific screens (the BRM and BTM agreement builders, the price
 * schedule, the six SOP dashboards) are wired in App.jsx.
 */
export const BRT_NAV = BUSINESS_RENT_NAV.flatMap((g) => g.items);

export default function BusinessRentConsole() {
  return (
    <PmScopeProvider value={BUSINESS_RENT_SCOPE}>
      <ServiceConsole config={businessRentConsole} />
    </PmScopeProvider>
  );
}
```

Keep the existing `businessRentConsole` config object in `consoles.js` (its brand, accent and `storageKey` stay); only its `navGroups` now points at the rebased `BUSINESS_RENT_NAV`, and `contentClass` must be `'pm-scope'` — check both and fix them if they differ.

- [ ] **Step 4: Replace the route block**

In `admin-portal/src/App.jsx`, replace the eight routes inside the `<BusinessRentConsole />` element with the `/commercial/rent` set rebased to `/business-rent`. The full block:

```jsx
            {/* ── Business RENT — the business premises leasing console. Runs the
                SAME Property Management screens as the residential and commercial
                rent consoles; BusinessRentConsole wraps them in a PmScopeProvider
                scoped to category 'business' + listing_type 'rent'. The BRM/BTM
                agreement builders and the rent price schedule are its own. ── */}
            <Route element={<RequireAuth><AdminGate><BusinessRentConsole /></AdminGate></RequireAuth>}>
              <Route path="/business-rent" element={<PropertyMgmtDashboard />} />
              <Route path="/business-rent/rentals" element={<RentalProperties />} />
              <Route path="/business-rent/rentals/new" element={<PropertyWizard />} />
              <Route path="/business-rent/rentals/new/:id" element={<PropertyWizard />} />
              <Route path="/business-rent/contacts" element={<SalesContacts scope="rental" />} />
              <Route path="/business-rent/applications" element={<TenantApplications />} />
              <Route path="/business-rent/enquiries" element={<RentalEnquiries />} />
              <Route path="/business-rent/assessments" element={<RentalAssessments />} />
              <Route path="/business-rent/statements" element={<OwnerStatements />} />
              <Route path="/business-rent/renewals" element={<Renewals />} />
              <Route path="/business-rent/vacancies" element={<Vacancies />} />
              <Route path="/business-rent/settlements" element={<DepositSettlements />} />
              <Route path="/business-rent/reports" element={<RentalReports />} />
              <Route path="/business-rent/disbursements" element={<Disbursements />} />
              <Route path="/business-rent/utilities" element={<UtilityBills />} />
              <Route path="/business-rent/tenant-requests" element={<TenantRequests />} />
              <Route path="/business-rent/arrears" element={<ArrearsActions />} />
              <Route path="/business-rent/marketing" element={<MarketingActivities />} />
              <Route path="/business-rent/expense-approvals" element={<ExpenseApprovals />} />
              <Route path="/business-rent/risks" element={<PropertyRisks />} />
              <Route path="/business-rent/work-orders" element={<WorkOrders />} />
              <Route path="/business-rent/inspections" element={<Inspections />} />
              <Route path="/business-rent/compliance" element={<Compliance />} />
              <Route path="/business-rent/workflows" element={<Projects />} />
              <Route path="/business-rent/invoices" element={<Invoices />} />
              <Route path="/business-rent/receipts" element={<RentalReceipts />} />
              <Route path="/business-rent/collect-rent" element={<BulkRentCollection />} />
              <Route path="/business-rent/disburse-owners" element={<BulkOwnerDisbursement />} />
              <Route path="/business-rent/inbox" element={<Communication />} />
              <Route path="/business-rent/folios" element={<Folios />} />
              <Route path="/business-rent/landlord-bills" element={<LandlordBills />} />
              <Route path="/business-rent/agency-income" element={<AgencyIncome />} />
              {/* Business-specific — the documents of record for this line. */}
              <Route path="/business-rent/agreements" element={<BrmAgreements category="business_rent" />} />
              <Route path="/business-rent/tenancy-agreements" element={<BtmAgreements category="business_rent" />} />
              <Route path="/business-rent/price-schedule" element={<SalesPriceSchedule scope="business_rent" title="Business Rent · Price Schedules" />} />
            </Route>
```

Then add the retirement redirects to the existing **"Retired Business screens → their new homes"** block further down the file, which already uses `Navigate`:

```jsx
            <Route path="/business-rent/listings" element={<Navigate to="/business-rent/rentals" replace />} />
            <Route path="/business-rent/listings/:id" element={<Navigate to="/business-rent/rentals" replace />} />
            <Route path="/business-rent/rental-agreements" element={<Navigate to="/business-rent/agreements" replace />} />
```

Notes on the collisions, all checked against the current file:
- `/business-rent/tenancy-agreements` is the **same path** in both the old block and the rebased PM nav — declare it once, pointing at `BtmAgreements`, as above.
- `/business-rent/enquiries` also exists in both; the PM `RentalEnquiries` route wins and no redirect is needed (the path is unchanged).
- `/business-rent/reports` moves from `BusinessReports` to the PM `RentalReports`; the path is unchanged, so no redirect.
- `BusinessRentDashboard`, `BusinessListings`, `BusinessListingDetail`, `BusinessEnquiries` and `BusinessReports` may now be unreferenced from `/business-rent`. Leave the files alone — other consoles import some of them. Remove only the imports that `npm run build` reports as unused, and check with `grep -rn "BusinessListings\|BusinessRentDashboard" src` before deleting anything.

- [ ] **Step 5: Build and click**

Run: `cd admin-portal && npm run build` → `✓ built`

Open `/admin/business-rent`: the PM nav renders, Properties lists only business rent properties (none yet — the list is empty, not full of the 17 sale listings), and the Rental Mgmt / Tenancy Mgmt agreement links still open their builders.

Open `/admin/property-management` and `/admin/commercial/rent`: both unchanged.

- [ ] **Step 6: Commit**

```bash
git add admin-portal/src/config/consoles.js admin-portal/src/App.jsx admin-portal/src/screens/BusinessRentConsole.jsx
git commit -m "feat(business-rent): console runs the Property Management screens

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 4: Screens stop assuming residential-or-commercial

**Files:**
- Modify: `admin-portal/src/screens/RentalProperties.jsx:66,89`
- Test: `admin-portal/src/screens/pmScopeBinary.test.mjs`

**Interfaces:**
- Consumes: the scope from Task 3.
- Produces: no PM screen decides a property's category with a two-way `isCommercial` flag.

- [ ] **Step 1: Find every binary assumption**

```bash
cd admin-portal
grep -rn "category === 'commercial'\|isCommercial" src/screens | grep -v node_modules
```

Each hit is a screen that silently treats "not commercial" as residential — which would write a **residential** property from the Business Rent console.

- [ ] **Step 2: Write the failing test**

Create `admin-portal/src/screens/pmScopeBinary.test.mjs`:

```js
// Run: node src/screens/pmScopeBinary.test.mjs   (from admin-portal/)
import assert from 'node:assert';
import fs from 'node:fs';

const src = fs.readFileSync(new URL('./RentalProperties.jsx', import.meta.url), 'utf8');

// A screen serving three consoles cannot decide the category with a boolean:
// from Business Rent, "not commercial" wrote a residential property.
assert.ok(!/isCommercial \? 'commercial' : 'residential'/.test(src),
  'new property category comes from the scope, not a commercial/residential boolean');
assert.ok(/category: scope\.category/.test(src),
  'the new-property form takes its category from the console scope');

console.log('pmScopeBinary OK');
```

- [ ] **Step 3: Run it and watch it fail**

Run: `cd admin-portal && node src/screens/pmScopeBinary.test.mjs`
Expected: `AssertionError: new property category comes from the scope…`

- [ ] **Step 4: Make the category scope-driven**

In `RentalProperties.jsx` line 89, replace `category: isCommercial ? 'commercial' : 'residential'` with:

```js
    title: '', category: scope.category, listing_type: scope.listingType || 'rent', status: 'available', price: '',
```

Leave `isCommercial` in place where it only drives **wording** (labels, placeholders); it is wrong only where it decides data. Read each remaining use and fix the ones that write data.

- [ ] **Step 5: Run the test and build**

Run: `cd admin-portal && node src/screens/pmScopeBinary.test.mjs` → `pmScopeBinary OK`
Run: `npm run build` → `✓ built`

Create a property from the Business Rent console and confirm through the API that it is `category: 'business'`, `listing_type: 'rent'`:

```bash
curl -s -H "Authorization: Bearer $TOKEN" -H "X-Branch-Id: 1" \
  "http://localhost:50001/api/properties?category=business&listing_type=rent&limit=5" \
  | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>console.log(JSON.parse(s).data.map(p=>[p.property_code,p.category,p.listing_type])))"
```

- [ ] **Step 6: Commit**

```bash
git add admin-portal/src/screens/RentalProperties.jsx admin-portal/src/screens/pmScopeBinary.test.mjs
git commit -m "fix(pm): property category comes from the console scope, not a two-way flag

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

# Phase 3 — The workflow

### Task 5: Correct the business_rent template to 13 stages

**Files:**
- Create: `backend/migrations/0149-project-stage-department.js`
- Create: `backend/scripts/seedBusinessRentWorkflow.js`
- Create: `backend/scripts/testBusinessRentStages.js`
- Modify: `backend/models/ProjectStage.js`
- Modify: `backend/services/workflowProject.service.js:55-67`
- Modify: `backend/package.json`

**Interfaces:**
- Produces: `BUSINESS_RENT_STAGES` (exported from the seed script) — an array of `{ key, name, order, department, escalation_trigger, checklist: [{label, required, responsible, evidence_required, detailed_task, output}], required_docs: [] }`; `project_stages.department` and `.escalation_trigger` columns.
- Consumed by: Task 12's pipeline dashboard, which counts projects by `stage_key`.

**Background (measured, not assumed):** `workflow_templates` row id **8**, `vertical_key = 'business_rent'`, name "Business Rent & Lease", holds **20** stages. Stages 1-13 are the lease pipeline; stages 14-20 (`client_relations`, `operations`, `compliance`, `business_leasing`, `accounts`, `property_management`, `crm_compliance`) are the enterprise sheet's *Department* column, and each one's single checklist item merely restates work already in stages 1-13 ("Lead Intake & Consultation", "Business Assessment", "Document Verification"…). **0 projects** have `vertical_key = 'business_rent'`, so correcting the template changes no live data.

- [ ] **Step 1: Write the failing test**

Create `backend/scripts/testBusinessRentStages.js`:

```js
const assert = require('assert');
const { BUSINESS_RENT_STAGES } = require('./seedBusinessRentWorkflow');

const keys = BUSINESS_RENT_STAGES.map((s) => s.key);
assert.deepStrictEqual(keys, [
  'lead_intake', 'consultation', 'assessment', 'documentation', 'marketing',
  'tenant_screening', 'inspection', 'negotiation', 'agreement', 'settlement',
  'handover', 'management', 'closure',
], 'the 13 workbook stages, in order');

// The seven department names must NOT be stages — they are the sheet's Department column.
for (const dept of ['client_relations', 'operations', 'compliance', 'business_leasing',
  'accounts', 'property_management', 'crm_compliance']) {
  assert.ok(!keys.includes(dept), `${dept} is a department, not a stage`);
}

BUSINESS_RENT_STAGES.forEach((s, i) => {
  assert.strictEqual(s.order, i + 1, `${s.key} order`);
  assert.ok(s.name && s.department && s.escalation_trigger, `${s.key} carries name, department and escalation trigger`);
  assert.ok(Array.isArray(s.checklist) && s.checklist.length > 0, `${s.key} has a checklist`);
  s.checklist.forEach((c) => assert.ok(c.label && c.responsible && c.evidence_required,
    `${s.key} checklist item is complete: ${JSON.stringify(c)}`));
});

// The work the department rows described must survive the merge, not be dropped.
const labels = BUSINESS_RENT_STAGES.flatMap((s) => s.checklist.map((c) => c.label.toLowerCase()));
for (const kept of ['document verification', 'negotiation coordination', 'record retention']) {
  assert.ok(labels.some((l) => l.includes(kept)), `folded-in department work kept: ${kept}`);
}

console.log('businessRentStages OK');
```

- [ ] **Step 2: Run it and watch it fail**

Run: `cd backend && node scripts/testBusinessRentStages.js`
Expected: `Cannot find module './seedBusinessRentWorkflow'`

- [ ] **Step 3: Write the seed script**

Create `backend/scripts/seedBusinessRentWorkflow.js`:

```js
/**
 * Corrects the business_rent workflow template to the workbook's 13 lease stages.
 *
 * The template shipped with 20 stages: the 13 below plus the seven DEPARTMENT
 * names from the enterprise sheet's Department column (Client Relations,
 * Operations, Compliance, Business Leasing, Accounts, Property Management,
 * CRM & Compliance), whose checklist items restated work the 13 already carry.
 * The department is now an attribute of the stage, and each stage carries the
 * sheet's escalation trigger.
 *
 * Idempotent — re-running rewrites the same template. Run from backend/:
 *   node scripts/seedBusinessRentWorkflow.js
 */
const sequelize = require('../config/db.config');

const item = (label, responsible, evidence_required, detailed_task = '', output = '') =>
  ({ label, required: true, responsible, evidence_required, detailed_task, output });

const BUSINESS_RENT_STAGES = [
  {
    key: 'lead_intake', name: 'Lead Intake', order: 1, department: 'Client Relations',
    escalation_trigger: 'Suspicious owner information',
    checklist: [
      item('Receive owner enquiry and create CRM profile', 'Client Relations', 'Owner ID'),
      item('Record introduction for non-circumvention protection', 'Client Relations', 'CRM log'),
    ],
    required_docs: ['Owner NID / passport', 'Company document (if corporate owner)'],
  },
  {
    key: 'consultation', name: 'Consultation', order: 2, department: 'Client Relations',
    escalation_trigger: 'Unrealistic owner expectations or undisclosed encumbrance',
    checklist: [item('Conduct initial business lease consultation', 'Business Leasing Team', 'Consultation Form')],
    required_docs: ['Signed consultation form'],
  },
  {
    key: 'assessment', name: 'Assessment', order: 3, department: 'Operations',
    escalation_trigger: 'Unsafe or unlawful operations',
    checklist: [
      item('Assess business readiness for leasing', 'Operations Team', 'Business Assessment'),
      item('Complete commercial premises assessment', 'Operations Team', 'Assessment Report'),
    ],
    required_docs: ['Commercial premises assessment report'],
  },
  {
    key: 'documentation', name: 'Documentation', order: 4, department: 'Compliance',
    escalation_trigger: 'Fraudulent documents',
    checklist: [
      item('Collect trade licence and company documents', 'Compliance Team', 'Trade Licence, TIN, Lease'),
      item('Document verification against the required-document register', 'Compliance Team', 'Document Register'),
      item('Prepare the rental management service agreement', 'Documentation Team', 'Signed Agreements'),
    ],
    required_docs: ['Trade licence', 'TIN certificate', 'Ownership document', 'Signed BRM agreement'],
  },
  {
    key: 'marketing', name: 'Marketing', order: 5, department: 'Operations',
    escalation_trigger: 'Misleading information in listing material',
    checklist: [
      item('Prepare listing and marketing materials', 'Marketing Team', 'Photos, Videos'),
      item('Launch commercial marketing campaign', 'Marketing Team', 'Advertising Records'),
      item('Marketing activation recorded', 'Marketing Team', 'Marketing Evidence'),
    ],
    required_docs: ['Listing photos', 'Advertising record'],
  },
  {
    key: 'tenant_screening', name: 'Tenant Screening', order: 6, department: 'Business Leasing',
    escalation_trigger: 'High-risk tenant or unverifiable trade licence',
    checklist: [
      item('Screen potential tenant/operator', 'Business Leasing Team', 'Tenant Application'),
      item('Tenant sourcing and screening report completed', 'Business Leasing Team', 'Tenant Screening Report'),
    ],
    required_docs: ['Tenant trade licence', 'Corporate profile', 'Financial capability evidence'],
  },
  {
    key: 'inspection', name: 'Inspection', order: 7, department: 'Operations',
    escalation_trigger: 'Operational hazards observed on site',
    checklist: [
      item('Coordinate inspections and meetings', 'Operations Team', 'Inspection Records'),
      item('Inspection coordination log maintained', 'Operations Team', 'Inspection Logs'),
    ],
    required_docs: ['Inspection log'],
  },
  {
    key: 'negotiation', name: 'Negotiation', order: 8, department: 'Business Leasing',
    escalation_trigger: 'Circumvention risk — parties dealing directly',
    checklist: [
      item('Coordinate lease negotiation', 'Business Leasing Team', 'Offer Summary'),
      item('Negotiation coordination log maintained', 'Business Leasing Team', 'Negotiation Log'),
    ],
    required_docs: ['Offer summary'],
  },
  {
    key: 'agreement', name: 'Agreement', order: 9, department: 'Compliance',
    escalation_trigger: 'Material disputes over lease terms',
    checklist: [item('Prepare lease agreement', 'Documentation Team', 'Draft Lease Agreement')],
    required_docs: ['Executed lease agreement'],
  },
  {
    key: 'settlement', name: 'Settlement', order: 10, department: 'Accounts',
    escalation_trigger: 'Payment default',
    checklist: [
      item('Coordinate advance payment collection', 'Accounts Team', 'Payment Receipt'),
      item('Financial settlement recorded against the folio', 'Accounts Team', 'Payment Records'),
    ],
    required_docs: ['Advance rent receipt', 'Deposit receipts'],
  },
  {
    key: 'handover', name: 'Handover', order: 11, department: 'Operations',
    escalation_trigger: 'Access disputes at handover',
    checklist: [
      item('Coordinate operational handover', 'Operations Team', 'Handover Checklist'),
      item('Business handover checklist completed and signed', 'Operations Team', 'Handover Checklist'),
    ],
    required_docs: ['Signed handover checklist'],
  },
  {
    key: 'management', name: 'Management', order: 12, department: 'Property Management',
    escalation_trigger: 'Repeated disputes or unresolved maintenance',
    checklist: [
      item('Ongoing lease management support', 'Property Management Team', 'Maintenance Reports'),
      item('Lease management support logged', 'Property Management Team', 'Maintenance Logs'),
    ],
    required_docs: ['Maintenance log'],
  },
  {
    key: 'closure', name: 'Closure', order: 13, department: 'CRM & Compliance',
    escalation_trigger: 'Legal claims after closure',
    checklist: [
      item('Archive records and close workflow', 'CRM Team', 'Archived File'),
      item('Record retention and closure register updated', 'CRM Team', 'Archive Register'),
    ],
    required_docs: ['Archive register entry'],
  },
];

async function run() {
  const [rows] = await sequelize.query(
    "SELECT id FROM workflow_templates WHERE vertical_key = 'business_rent' ORDER BY id ASC LIMIT 1",
  );
  if (!rows.length) throw new Error('No business_rent workflow template to correct.');

  // Refuse to rewrite a template that live projects are already running on.
  const [used] = await sequelize.query(
    "SELECT COUNT(*) AS c FROM projects WHERE vertical_key = 'business_rent'",
  );
  if (Number(used[0].c) > 0) {
    throw new Error(`${used[0].c} project(s) already run this template — correct them before reseeding.`);
  }

  await sequelize.query(
    'UPDATE workflow_templates SET stages = :s, name = :n WHERE id = :id',
    { replacements: { s: JSON.stringify(BUSINESS_RENT_STAGES), n: 'Business Rent & Lease', id: rows[0].id } },
  );
  console.log(`business_rent template #${rows[0].id} corrected to ${BUSINESS_RENT_STAGES.length} stages.`);
}

module.exports = { BUSINESS_RENT_STAGES };

if (require.main === module) {
  run().then(() => process.exit(0)).catch((e) => { console.error(e.message); process.exit(1); });
}
```

- [ ] **Step 4: Run the test**

Run: `cd backend && node scripts/testBusinessRentStages.js`
Expected: `businessRentStages OK`

- [ ] **Step 5: Carry department and escalation onto the project's stages**

Create `backend/migrations/0149-project-stage-department.js`:

```js
'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const t = await queryInterface.describeTable('project_stages');
    if (!t.department) {
      await queryInterface.addColumn('project_stages', 'department', { type: Sequelize.STRING(80), allowNull: true });
    }
    if (!t.escalation_trigger) {
      await queryInterface.addColumn('project_stages', 'escalation_trigger', { type: Sequelize.STRING(255), allowNull: true });
    }
  },
  async down(queryInterface) {
    const t = await queryInterface.describeTable('project_stages');
    if (t.department) await queryInterface.removeColumn('project_stages', 'department');
    if (t.escalation_trigger) await queryInterface.removeColumn('project_stages', 'escalation_trigger');
  },
};
```

In `backend/models/ProjectStage.js`, after `required_documents`:

```js
  department: DataTypes.STRING(80),
  escalation_trigger: DataTypes.STRING(255),
```

In `backend/services/workflowProject.service.js`, inside the `ProjectStage.create({…})` call, after `required_documents: s.required_docs || [],`:

```js
        department: s.department || null,
        escalation_trigger: s.escalation_trigger || null,
```

- [ ] **Step 6: Migrate, seed and verify against the DB**

```bash
cd backend
npm run db:migrate
node scripts/seedBusinessRentWorkflow.js
```

Expected: `business_rent template #8 corrected to 13 stages.`

Confirm nothing else moved:

```bash
node -e "const s=require('./config/db.config');(async()=>{const [r]=await s.query(\"SELECT vertical_key, JSON_LENGTH(stages) n FROM workflow_templates ORDER BY id\");r.forEach(x=>console.log(x.vertical_key,x.n));process.exit(0)})()" | grep -v Executing
```

Expected: `business_rent 13`; every other template's count unchanged (leasing 18, commercial_rent 14, business_sale 16, …).

- [ ] **Step 7: Add to the chain and commit**

Add `node scripts/testBusinessRentStages.js && ` to the `test` script in `backend/package.json`.

```bash
git add backend/migrations/0149-project-stage-department.js backend/scripts/seedBusinessRentWorkflow.js backend/scripts/testBusinessRentStages.js backend/models/ProjectStage.js backend/services/workflowProject.service.js backend/package.json
git commit -m "fix(business-rent): 13 lease stages, with department and escalation as stage attributes

The template carried the enterprise sheet's seven Department names as if they
were stages. No project used it, so the template is corrected in place.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

# Phase 4 — SOP modules

### Task 6: Business tenant screening

**Files:**
- Create: `backend/migrations/0150-tenant-application-business-screening.js`
- Create: `backend/services/businessScreening.js`
- Create: `backend/scripts/testBusinessScreening.js`
- Create: `admin-portal/src/screens/rental/BusinessScreeningPanel.jsx`
- Modify: `backend/models/TenantApplication.js`
- Modify: `backend/controllers/tenantApplication.controller.js:61-76` (list) and its `pick(...)` whitelists
- Modify: `admin-portal/src/screens/TenantApplications.jsx`
- Modify: `backend/package.json`

**Interfaces:**
- Produces: `screeningVerdict(app)` → `{ verdict, missing: string[], ready: boolean }`; `BUSINESS_SCREENING_FIELDS` (the field list the UI renders); `GET /api/tenant-applications?category=business` filtered through the property.
- Consumed by: Task 12's screening dashboard.

- [ ] **Step 1: Write the failing test**

Create `backend/scripts/testBusinessScreening.js`:

```js
const assert = require('assert');
const { screeningVerdict, BUSINESS_SCREENING_FIELDS } = require('../services/businessScreening');

// SOP Rental §11 / Tenancy §6 — the eight things a business tenant is screened on.
assert.deepStrictEqual(BUSINESS_SCREENING_FIELDS.map((f) => f.key), [
  'business_type', 'intended_activity', 'trade_licence_no', 'corporate_profile',
  'financial_capability', 'operational_suitability', 'previous_leasing_history', 'screening_notes',
]);

// Nothing filled in: pending, and every required field is named as missing.
let r = screeningVerdict({});
assert.strictEqual(r.verdict, 'pending');
assert.strictEqual(r.ready, false);
assert.ok(r.missing.includes('business_type'), 'names what is missing');

// Everything filled but no verdict recorded yet: ready to decide, still pending.
const full = {
  business_type: 'Retail', intended_activity: 'Clothing store', trade_licence_no: 'TL-9911',
  corporate_profile: 'Ltd, 3 branches', financial_capability: 'Bank statements 12m',
  operational_suitability: 'Suits ground-floor retail', previous_leasing_history: '2 prior leases, clean',
};
r = screeningVerdict(full);
assert.strictEqual(r.ready, true, 'all facts gathered');
assert.deepStrictEqual(r.missing, []);
assert.strictEqual(r.verdict, 'pending', 'gathering facts is not deciding');

// A recorded verdict is reported as recorded.
assert.strictEqual(screeningVerdict({ ...full, screening_verdict: 'suitable' }).verdict, 'suitable');
assert.strictEqual(screeningVerdict({ ...full, screening_verdict: 'conditional' }).verdict, 'conditional');
assert.strictEqual(screeningVerdict({ ...full, screening_verdict: 'declined' }).verdict, 'declined');

// A declined verdict stands even with facts missing — declining early is allowed.
r = screeningVerdict({ business_type: 'Retail', screening_verdict: 'declined' });
assert.strictEqual(r.verdict, 'declined');
assert.strictEqual(r.ready, false, 'still reports the gaps');

console.log('businessScreening OK');
```

- [ ] **Step 2: Run it and watch it fail**

Run: `cd backend && node scripts/testBusinessScreening.js`
Expected: `Cannot find module '../services/businessScreening'`

- [ ] **Step 3: Write the service**

Create `backend/services/businessScreening.js`:

```js
/**
 * Business tenant screening — SOP Business Rental Management §11 and
 * Business Tenancy Management §6. A business tenant is screened on what it
 * trades, whether it may lawfully do so, and whether it can pay.
 */
const BUSINESS_SCREENING_FIELDS = [
  { key: 'business_type', label: 'Business type', required: true },
  { key: 'intended_activity', label: 'Intended commercial activity', required: true },
  { key: 'trade_licence_no', label: 'Trade licence number', required: true },
  { key: 'corporate_profile', label: 'Corporate profile', required: true },
  { key: 'financial_capability', label: 'Financial capability', required: true },
  { key: 'operational_suitability', label: 'Operational suitability', required: true },
  { key: 'previous_leasing_history', label: 'Previous leasing history', required: true },
  { key: 'screening_notes', label: 'Screening notes', required: false },
];

const VERDICTS = ['pending', 'suitable', 'conditional', 'declined'];

function screeningVerdict(app = {}) {
  const missing = BUSINESS_SCREENING_FIELDS
    .filter((f) => f.required)
    .filter((f) => {
      const v = app[f.key];
      return v === undefined || v === null || String(v).trim() === '';
    })
    .map((f) => f.key);
  const recorded = VERDICTS.includes(app.screening_verdict) ? app.screening_verdict : 'pending';
  return { verdict: recorded, missing, ready: missing.length === 0 };
}

module.exports = { BUSINESS_SCREENING_FIELDS, VERDICTS, screeningVerdict };
```

- [ ] **Step 4: Run the test**

Run: `cd backend && node scripts/testBusinessScreening.js`
Expected: `businessScreening OK`

- [ ] **Step 5: Store the fields**

Create `backend/migrations/0150-tenant-application-business-screening.js`:

```js
'use strict';

const COLUMNS = {
  business_name: { type: 'STRING' },
  business_type: { type: 'STRING' },
  intended_activity: { type: 'TEXT' },
  trade_licence_no: { type: 'STRING' },
  trade_licence_expiry: { type: 'DATEONLY' },
  corporate_profile: { type: 'TEXT' },
  financial_capability: { type: 'TEXT' },
  operational_suitability: { type: 'TEXT' },
  previous_leasing_history: { type: 'TEXT' },
  screening_notes: { type: 'TEXT' },
};

module.exports = {
  async up(queryInterface, Sequelize) {
    const t = await queryInterface.describeTable('tenant_applications');
    for (const [name, def] of Object.entries(COLUMNS)) {
      if (!t[name]) {
        await queryInterface.addColumn('tenant_applications', name, { type: Sequelize[def.type], allowNull: true });
      }
    }
    if (!t.screening_verdict) {
      await queryInterface.addColumn('tenant_applications', 'screening_verdict', {
        type: Sequelize.ENUM('pending', 'suitable', 'conditional', 'declined'),
        allowNull: false, defaultValue: 'pending',
      });
    }
  },
  async down(queryInterface) {
    const t = await queryInterface.describeTable('tenant_applications');
    for (const name of [...Object.keys(COLUMNS), 'screening_verdict']) {
      if (t[name]) await queryInterface.removeColumn('tenant_applications', name);
    }
  },
};
```

In `backend/models/TenantApplication.js`, add to the `TenantApplication` definition (Sequelize silently drops columns it does not know — this step is not optional):

```js
  // Business tenant screening — SOP Rental §11 / Tenancy §6.
  business_name: DataTypes.STRING,
  business_type: DataTypes.STRING,
  intended_activity: DataTypes.TEXT,
  trade_licence_no: DataTypes.STRING,
  trade_licence_expiry: DataTypes.DATEONLY,
  corporate_profile: DataTypes.TEXT,
  financial_capability: DataTypes.TEXT,
  operational_suitability: DataTypes.TEXT,
  previous_leasing_history: DataTypes.TEXT,
  screening_notes: DataTypes.TEXT,
  screening_verdict: { type: DataTypes.ENUM('pending', 'suitable', 'conditional', 'declined'), defaultValue: 'pending' },
```

- [ ] **Step 6: Accept them, and scope the list by category**

In `backend/controllers/tenantApplication.controller.js`, add the screening keys to the `pick(...)` whitelist used by `create` and `update` (find every `pick(req.body, [` in the file and extend the application-level ones):

```js
  'business_name', 'business_type', 'intended_activity', 'trade_licence_no', 'trade_licence_expiry',
  'corporate_profile', 'financial_capability', 'operational_suitability', 'previous_leasing_history',
  'screening_notes', 'screening_verdict',
```

In `exports.list`, after the `property_id` filter (line 68), add the console scoping — without it the Business Rent console shows residential applications:

```js
  // Console scoping: an application belongs to the console its property belongs to.
  const { pmCategory } = require('../utils/pmCategory');
  const cat = pmCategory(req.query.category);
```

and put the import at the top of the file with the other requires rather than inline, then attach it to the property include used by the list query:

```js
  const propWhere = {};
  if (cat) propWhere.category = cat;
  if (req.query.listing_type) propWhere.listing_type = req.query.listing_type;
  const propFilter = Object.keys(propWhere).length ? { where: propWhere, required: true } : {};
```

and spread `...propFilter` into the existing `Property` include in the list's `findAndCountAll`. Read the include as written before editing; keep its `as` and `attributes` exactly.

- [ ] **Step 7: Add the UI**

Create `admin-portal/src/screens/rental/BusinessScreeningPanel.jsx`:

```jsx
import React from 'react';
import { Field, Input, Select, Textarea, Badge } from '../../ui/kit';

/** Business tenant screening — SOP Rental §11 / Tenancy §6. Shown for business properties only. */
const TONE = { suitable: 'green', conditional: 'amber', declined: 'red', pending: 'grey' };

export default function BusinessScreeningPanel({ form, setForm }) {
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const missing = ['business_type', 'intended_activity', 'trade_licence_no', 'corporate_profile',
    'financial_capability', 'operational_suitability', 'previous_leasing_history']
    .filter((k) => !String(form[k] || '').trim());

  return (
    <section style={{ marginTop: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <h4 style={{ margin: 0 }}>Business tenant screening</h4>
        <Badge tone={TONE[form.screening_verdict] || 'grey'}>{form.screening_verdict || 'pending'}</Badge>
      </div>
      {missing.length > 0 && (
        <p className="cell-sub" style={{ marginTop: 4 }}>
          {missing.length} screening field{missing.length === 1 ? '' : 's'} still outstanding.
        </p>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 10 }}>
        <Field label="Business name"><Input value={form.business_name || ''} onChange={set('business_name')} /></Field>
        <Field label="Business type"><Input value={form.business_type || ''} onChange={set('business_type')} placeholder="Retail, restaurant, warehouse…" /></Field>
        <Field label="Trade licence no."><Input value={form.trade_licence_no || ''} onChange={set('trade_licence_no')} /></Field>
        <Field label="Trade licence expiry"><Input type="date" value={form.trade_licence_expiry || ''} onChange={set('trade_licence_expiry')} /></Field>
        <Field label="Screening verdict">
          <Select value={form.screening_verdict || 'pending'} onChange={set('screening_verdict')}>
            <option value="pending">Pending</option>
            <option value="suitable">Suitable</option>
            <option value="conditional">Conditional</option>
            <option value="declined">Declined</option>
          </Select>
        </Field>
      </div>
      <Field label="Intended commercial activity"><Textarea rows={2} value={form.intended_activity || ''} onChange={set('intended_activity')} /></Field>
      <Field label="Corporate profile"><Textarea rows={2} value={form.corporate_profile || ''} onChange={set('corporate_profile')} /></Field>
      <Field label="Financial capability"><Textarea rows={2} value={form.financial_capability || ''} onChange={set('financial_capability')} /></Field>
      <Field label="Operational suitability"><Textarea rows={2} value={form.operational_suitability || ''} onChange={set('operational_suitability')} /></Field>
      <Field label="Previous leasing history"><Textarea rows={2} value={form.previous_leasing_history || ''} onChange={set('previous_leasing_history')} /></Field>
      <Field label="Screening notes"><Textarea rows={2} value={form.screening_notes || ''} onChange={set('screening_notes')} /></Field>
    </section>
  );
}
```

In `admin-portal/src/screens/TenantApplications.jsx`, import `usePmScope` and the panel, render it inside the application drawer only for the business console, and send the scope on the list request:

```jsx
import { usePmScope } from '../config/pmScope';
import BusinessScreeningPanel from './rental/BusinessScreeningPanel';
// …inside the component:
const scope = usePmScope();
// …in the list fetch, append: `&category=${scope.category}&listing_type=${scope.listingType || 'rent'}`
// …in the drawer body, after the existing fields:
{scope.category === 'business' && <BusinessScreeningPanel form={form} setForm={setForm} />}
```

Read the file first: match the existing fetch string's separators and the drawer's form state variable names exactly.

- [ ] **Step 8: Migrate, test, build and verify**

```bash
cd backend && npm run db:migrate && node scripts/testBusinessScreening.js
cd ../admin-portal && npm run build
```

Expected: migration applied, `businessScreening OK`, `✓ built`.

Then, with the backend restarted, confirm the scoping works and the residential console is unaffected:

```bash
curl -s -H "Authorization: Bearer $TOKEN" -H "X-Branch-Id: 1" \
  "http://localhost:50001/api/tenant-applications?category=residential&limit=5" | head -c 200; echo
curl -s -H "Authorization: Bearer $TOKEN" -H "X-Branch-Id: 1" \
  "http://localhost:50001/api/tenant-applications?category=business&limit=5" | head -c 200; echo
```

Expected: the residential query returns the existing applications; the business query returns none yet (not the residential ones).

- [ ] **Step 9: Add to the chain and commit**

Add `node scripts/testBusinessScreening.js && ` to the `test` script.

```bash
git add backend/migrations/0150-tenant-application-business-screening.js backend/services/businessScreening.js backend/scripts/testBusinessScreening.js backend/models/TenantApplication.js backend/controllers/tenantApplication.controller.js backend/package.json admin-portal/src/screens/rental/BusinessScreeningPanel.jsx admin-portal/src/screens/TenantApplications.jsx
git commit -m "feat(business-rent): business tenant screening on the tenant application

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 7: Commercial premises assessment

**Files:**
- Create: `backend/scripts/testPremisesAssessment.js`
- Modify: `backend/services/rentalWorkflow.service.js` (add the template beside `ROOM_ASSESSMENT_ITEMS`)
- Modify: `backend/controllers/rentalAssessment.controller.js:53-80`
- Modify: `backend/package.json`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: `PREMISES_ASSESSMENT_ITEMS` (exported from `rentalWorkflow.service`) — `[{ section, assessment_item, is_blocking }]`, seeded instead of the room template when the property is business or commercial.

**Background:** `rental_assessments` already has an items table with `section` + `assessment_item`, and `create` seeds `ROOM_ASSESSMENT_ITEMS` (bedrooms, bathrooms, balcony) when the caller sends no items. Those rooms are meaningless for a warehouse, so this is a second template, not a schema change.

- [ ] **Step 1: Write the failing test**

Create `backend/scripts/testPremisesAssessment.js`:

```js
const assert = require('assert');
const { PREMISES_ASSESSMENT_ITEMS, ROOM_ASSESSMENT_ITEMS, computeReadiness } = require('../services/rentalWorkflow.service');

const sections = [...new Set(PREMISES_ASSESSMENT_ITEMS.map((i) => i.section))];
// SOP Rental §8 — the ten things a business premises is assessed on.
assert.deepStrictEqual(sections, [
  'Location suitability', 'Business suitability', 'Operational condition', 'Maintenance condition',
  'Accessibility', 'Signage & visibility', 'Security', 'Parking', 'Utility readiness', 'Leasing readiness',
]);

// A warehouse has no bedrooms: the residential template must not bleed in.
const labels = PREMISES_ASSESSMENT_ITEMS.map((i) => `${i.section} ${i.assessment_item}`.toLowerCase());
assert.ok(!labels.some((l) => l.includes('bedroom')), 'no bedrooms');
assert.ok(!labels.some((l) => l.includes('bathroom 2')), 'no second bathroom');
// …and the residential template is untouched.
assert.ok(ROOM_ASSESSMENT_ITEMS.some((i) => i.section === 'Bedroom 1'), 'room template unchanged');

// Utility readiness and leasing readiness gate marketing.
const blocking = PREMISES_ASSESSMENT_ITEMS.filter((i) => i.is_blocking).map((i) => i.section);
assert.ok(blocking.includes('Utility readiness'), 'utilities block marketing');
assert.ok(blocking.includes('Leasing readiness'), 'leasing readiness blocks marketing');

// An assessment with an unresolved blocking item is not ready for marketing.
const items = PREMISES_ASSESSMENT_ITEMS.map((i) => ({ ...i, status: i.is_blocking ? 'pending' : 'done' }));
assert.notStrictEqual(computeReadiness(items).status, 'ready_for_marketing');

console.log('premisesAssessment OK');
```

- [ ] **Step 2: Run it and watch it fail**

Run: `cd backend && node scripts/testPremisesAssessment.js`
Expected: `TypeError: Cannot read properties of undefined (reading 'map')` — `PREMISES_ASSESSMENT_ITEMS` is not exported.

- [ ] **Step 3: Add the template**

In `backend/services/rentalWorkflow.service.js`, after the `ROOM_ASSESSMENT_ITEMS` block:

```js
// ── Commercial/business premises assessment (SOP Business Rental Mgmt §8) ──
// Business premises are assessed on trade suitability, not on bedrooms.
const premisesItems = (section, items, is_blocking = false) =>
  items.map((assessment_item) => ({ section, assessment_item, is_blocking }));
const PREMISES_ASSESSMENT_ITEMS = [
  ...premisesItems('Location suitability', ['Catchment & footfall', 'Neighbouring trade mix', 'Transport access']),
  ...premisesItems('Business suitability', ['Zoning permits the intended activity', 'Floor plate suits the trade', 'Fit-out constraints identified']),
  ...premisesItems('Operational condition', ['Floors, walls & ceiling', 'Lighting & ventilation', 'Loading / service access']),
  ...premisesItems('Maintenance condition', ['Outstanding repairs listed', 'Plant & equipment condition', 'Cleaning & presentation']),
  ...premisesItems('Accessibility', ['Entrance & circulation', 'Lift / stair access', 'Disability access']),
  ...premisesItems('Signage & visibility', ['Signage rights confirmed', 'Frontage visibility', 'Display area']),
  ...premisesItems('Security', ['Locks & shutters', 'Alarm / CCTV', 'After-hours access control']),
  ...premisesItems('Parking', ['Customer parking', 'Staff parking', 'Loading bay']),
  ...premisesItems('Utility readiness', ['Electricity load adequate for the trade', 'Water & drainage connected', 'Gas / generator provision'], true),
  ...premisesItems('Leasing readiness', ['Ownership & authority to lease confirmed', 'Trade licence obtainable at this address'], true),
];
```

and add `PREMISES_ASSESSMENT_ITEMS,` to the `module.exports` block beside `ROOM_ASSESSMENT_ITEMS`.

- [ ] **Step 4: Seed it for business premises**

In `backend/controllers/rentalAssessment.controller.js`, extend the import on line 7 with `PREMISES_ASSESSMENT_ITEMS`, then replace line 67:

```js
    // A business or commercial premises is assessed on trade suitability, not bedrooms.
    const property = data.property_id ? await Property.findByPk(data.property_id, { transaction: tx }) : null;
    const template = ['business', 'commercial'].includes(String(property?.category || ''))
      ? PREMISES_ASSESSMENT_ITEMS : ROOM_ASSESSMENT_ITEMS;
    const seed = Array.isArray(req.body.items) && req.body.items.length ? req.body.items : template;
```

`Property` is already imported in this controller; confirm before adding it again.

- [ ] **Step 5: Run the test and verify against the API**

Run: `cd backend && node scripts/testPremisesAssessment.js`
Expected: `premisesAssessment OK`

Restart the backend and create one assessment against a business rent property and one against a residential property; confirm the first comes back with `Location suitability` sections and the second still with `Bedroom 1`.

- [ ] **Step 6: Add to the chain and commit**

Add `node scripts/testPremisesAssessment.js && ` to the `test` script.

```bash
git add backend/services/rentalWorkflow.service.js backend/controllers/rentalAssessment.controller.js backend/scripts/testPremisesAssessment.js backend/package.json
git commit -m "feat(business-rent): commercial premises assessment template

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 8: Lease structure defaults and recorded departures

**Files:**
- Create: `backend/migrations/0151-tenancy-business-lease-structure.js`
- Create: `backend/services/businessLeaseStructure.js`
- Create: `backend/scripts/testBusinessLeaseStructure.js`
- Modify: `backend/models/Tenancy.js`
- Modify: `backend/controllers/tenancy.controller.js`
- Modify: `backend/package.json`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: `BUSINESS_LEASE_DEFAULTS` and `checkLeaseStructure(lease)` → `{ ok: boolean, warnings: [{ field, message }] }`; `tenancies.structure_warnings` (JSON), `.structure_override_by`, `.structure_override_reason`.

**Review Focus item 4 lives here:** the SOP says these terms apply "generally … unless otherwise approved by management", so a departure **warns and saves**; it never blocks.

- [ ] **Step 1: Write the failing test**

Create `backend/scripts/testBusinessLeaseStructure.js`:

```js
const assert = require('assert');
const { checkLeaseStructure, BUSINESS_LEASE_DEFAULTS } = require('../services/businessLeaseStructure');

// SOP Rental §9 / Tenancy §9.
assert.strictEqual(BUSINESS_LEASE_DEFAULTS.lease_term_months, 36);
assert.strictEqual(BUSINESS_LEASE_DEFAULTS.advance_months, 12);
assert.deepStrictEqual(BUSINESS_LEASE_DEFAULTS.extension_options, ['3+2', '3+3']);
assert.deepStrictEqual(BUSINESS_LEASE_DEFAULTS.renewal_increment_pct, { min: 10, max: 20 });

// The standard lease passes clean.
const standard = { lease_term_months: 36, advance_months: 12, extension_option: '3+2', renewal_increment_pct: 15 };
assert.deepStrictEqual(checkLeaseStructure(standard), { ok: true, warnings: [] });

// A departure WARNS. It must never be reported as invalid — the SOP allows it with approval.
const short = checkLeaseStructure({ ...standard, lease_term_months: 6 });
assert.strictEqual(short.ok, false);
assert.strictEqual(short.warnings.length, 1);
assert.strictEqual(short.warnings[0].field, 'lease_term_months');
assert.ok(/36/.test(short.warnings[0].message), 'the message states the standard');

const lowAdvance = checkLeaseStructure({ ...standard, advance_months: 3 });
assert.strictEqual(lowAdvance.warnings[0].field, 'advance_months');

const badIncrement = checkLeaseStructure({ ...standard, renewal_increment_pct: 35 });
assert.strictEqual(badIncrement.warnings[0].field, 'renewal_increment_pct');
assert.strictEqual(checkLeaseStructure({ ...standard, renewal_increment_pct: 10 }).ok, true, '10% is in bounds');
assert.strictEqual(checkLeaseStructure({ ...standard, renewal_increment_pct: 20 }).ok, true, '20% is in bounds');

const badExtension = checkLeaseStructure({ ...standard, extension_option: '5+5' });
assert.strictEqual(badExtension.warnings[0].field, 'extension_option');

// Fields that were never filled in are not departures — a draft lease is not a violation.
assert.deepStrictEqual(checkLeaseStructure({}), { ok: true, warnings: [] });
assert.deepStrictEqual(checkLeaseStructure({ lease_term_months: null, advance_months: '' }), { ok: true, warnings: [] });

// Several departures at once are all reported, not just the first.
const many = checkLeaseStructure({ lease_term_months: 12, advance_months: 2, renewal_increment_pct: 40 });
assert.strictEqual(many.warnings.length, 3);

console.log('businessLeaseStructure OK');
```

- [ ] **Step 2: Run it and watch it fail**

Run: `cd backend && node scripts/testBusinessLeaseStructure.js`
Expected: `Cannot find module '../services/businessLeaseStructure'`

- [ ] **Step 3: Write the service**

Create `backend/services/businessLeaseStructure.js`:

```js
/**
 * Business lease structure — SOP Business Rental Management §9 and Business
 * Tenancy Management §9.
 *
 * These are DEFAULTS, not rules. The SOP says the structure applies "generally
 * … unless otherwise approved by management", so a departure produces a warning
 * the console shows and records against the tenancy. It never blocks a save:
 * refusing a six-month lease the manager approved would be a bug, not a control.
 */
const BUSINESS_LEASE_DEFAULTS = {
  lease_term_months: 36,
  extension_options: ['3+2', '3+3'],
  renewal_increment_pct: { min: 10, max: 20 },
  advance_months: 12,
};

const filled = (v) => v !== undefined && v !== null && String(v).trim() !== '';

function checkLeaseStructure(lease = {}) {
  const warnings = [];
  const d = BUSINESS_LEASE_DEFAULTS;

  if (filled(lease.lease_term_months) && Number(lease.lease_term_months) !== d.lease_term_months) {
    warnings.push({ field: 'lease_term_months', message: `Standard business lease term is ${d.lease_term_months} months; this lease is ${Number(lease.lease_term_months)}. Record management approval.` });
  }
  if (filled(lease.advance_months) && Number(lease.advance_months) !== d.advance_months) {
    warnings.push({ field: 'advance_months', message: `Standard advance rent is ${d.advance_months} months; this lease is ${Number(lease.advance_months)}. Record management approval.` });
  }
  if (filled(lease.renewal_increment_pct)) {
    const pct = Number(lease.renewal_increment_pct);
    if (pct < d.renewal_increment_pct.min || pct > d.renewal_increment_pct.max) {
      warnings.push({ field: 'renewal_increment_pct', message: `Renewal increment is normally ${d.renewal_increment_pct.min}–${d.renewal_increment_pct.max}%; this lease is ${pct}%. Record management approval.` });
    }
  }
  if (filled(lease.extension_option) && !d.extension_options.includes(String(lease.extension_option))) {
    warnings.push({ field: 'extension_option', message: `Standard extension options are ${d.extension_options.join(' or ')}; this lease is ${lease.extension_option}. Record management approval.` });
  }

  return { ok: warnings.length === 0, warnings };
}

module.exports = { BUSINESS_LEASE_DEFAULTS, checkLeaseStructure };
```

- [ ] **Step 4: Run the test**

Run: `cd backend && node scripts/testBusinessLeaseStructure.js`
Expected: `businessLeaseStructure OK`

- [ ] **Step 5: Store the structure and the departure**

Create `backend/migrations/0151-tenancy-business-lease-structure.js`:

```js
'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const t = await queryInterface.describeTable('tenancies');
    const add = async (name, type) => { if (!t[name]) await queryInterface.addColumn('tenancies', name, { type, allowNull: true }); };
    await add('lease_term_months', Sequelize.INTEGER);
    await add('extension_option', Sequelize.STRING(20));
    await add('renewal_increment_pct', Sequelize.DECIMAL(5, 2));
    await add('advance_months', Sequelize.INTEGER);
    await add('advance_received', Sequelize.DECIMAL(15, 2));
    await add('structure_warnings', Sequelize.JSON);
    await add('structure_override_by', Sequelize.INTEGER);
    await add('structure_override_reason', Sequelize.TEXT);
  },
  async down(queryInterface) {
    const t = await queryInterface.describeTable('tenancies');
    for (const c of ['lease_term_months', 'extension_option', 'renewal_increment_pct', 'advance_months',
      'advance_received', 'structure_warnings', 'structure_override_by', 'structure_override_reason']) {
      if (t[c]) await queryInterface.removeColumn('tenancies', c);
    }
  },
};
```

In `backend/models/Tenancy.js`, beside `advance_rent`:

```js
  lease_term_months: DataTypes.INTEGER,
  extension_option: DataTypes.STRING(20),
  renewal_increment_pct: DataTypes.DECIMAL(5, 2),
  advance_months: DataTypes.INTEGER,
  advance_received: DataTypes.DECIMAL(15, 2),
  structure_warnings: { type: DataTypes.JSON, defaultValue: [] },
  structure_override_by: DataTypes.INTEGER,
  structure_override_reason: DataTypes.TEXT,
```

- [ ] **Step 6: Record the warnings on save**

In `backend/controllers/tenancy.controller.js`, import the service and, in both `create` and `update`, after the `pick(...)` (adding the seven new keys to the whitelist) and before the write:

```js
  // Business leases carry the SOP structure; a departure is recorded, never blocked.
  if (String(req.query.category || req.body.category || '') === 'business' || data.lease_term_months !== undefined) {
    const { warnings } = checkLeaseStructure(data);
    data.structure_warnings = warnings;
    if (warnings.length && req.body.structure_override_reason) {
      data.structure_override_by = req.user?.id || null;
      data.structure_override_reason = req.body.structure_override_reason;
    }
  }
```

Read `create` and `update` first and place this beside the existing `data` assembly in each.

- [ ] **Step 7: Verify the save is not blocked**

Restart the backend. Create a business tenancy with `lease_term_months: 6` and confirm HTTP 201 with `structure_warnings` populated — a warning, not a rejection:

```bash
curl -s -X POST -H "Authorization: Bearer $TOKEN" -H "X-Branch-Id: 1" -H 'Content-Type: application/json' \
  -d '{"property_id":<BUSINESS_RENT_PROPERTY_ID>,"lease_term_months":6,"advance_months":12,"start_date":"2026-10-01"}' \
  "http://localhost:50001/api/tenancies?category=business" | head -c 400; echo
```

Expected: `201` and one `lease_term_months` warning in the body.

- [ ] **Step 8: Add to the chain and commit**

Add `node scripts/testBusinessLeaseStructure.js && ` to the `test` script.

```bash
git add backend/migrations/0151-tenancy-business-lease-structure.js backend/services/businessLeaseStructure.js backend/scripts/testBusinessLeaseStructure.js backend/models/Tenancy.js backend/controllers/tenancy.controller.js backend/package.json
git commit -m "feat(business-rent): SOP lease structure as recorded defaults, not hard blocks

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 9: Non-circumvention protection for business rent

**Files:**
- Create: `backend/migrations/0152-non-circumvention-rent-protection.js`
- Create: `backend/services/protectionWindow.js`
- Create: `backend/scripts/testProtectionWindow.js`
- Modify: `backend/models/NonCircumventionRecord.js`
- Modify: `backend/controllers/nonCircumvention.controller.js` (locate it with the grep in Step 5)
- Modify: `backend/package.json`

**Interfaces:**
- Consumes: `pmCategory` (Task 1).
- Produces: `protectionExpiry(introductionDate, months = 12)` → `'YYYY-MM-DD'`; `protectionState(record, today)` → `{ state: 'active'|'expiring'|'expired', daysLeft }`; `non_circumvention_records.category` and `.protection_expires_on`.

**Background:** `NonCircumventionRecord` already exists with a `context` column (`'sale'` / `'rental'`) and is used by the sales engine. Business Rent reuses it with `context: 'rental'` plus the new `category`, so the existing rental records keep working untouched.

- [ ] **Step 1: Write the failing test**

Create `backend/scripts/testProtectionWindow.js`:

```js
const assert = require('assert');
const { protectionExpiry, protectionState } = require('../services/protectionWindow');

// SOP Rental §13 / Tenancy §12 — the engagement plus twelve months.
assert.strictEqual(protectionExpiry('2026-01-15'), '2027-01-15');
assert.strictEqual(protectionExpiry('2026-01-15', 24), '2028-01-15');
// Month-end arithmetic must not roll into the next month.
assert.strictEqual(protectionExpiry('2026-02-29'), '2027-02-28', 'leap day clamps to 28 Feb');
assert.strictEqual(protectionExpiry('2026-08-31', 6), '2027-02-28');
assert.strictEqual(protectionExpiry(null), null, 'no introduction date, no window');
assert.strictEqual(protectionExpiry('not a date'), null);

// State, measured against a fixed today so the test does not rot.
const rec = { protection_expires_on: '2027-01-15' };
assert.strictEqual(protectionState(rec, '2026-06-01').state, 'active');
assert.strictEqual(protectionState(rec, '2026-12-20').state, 'expiring', 'inside 60 days');
assert.strictEqual(protectionState(rec, '2027-01-15').state, 'expiring', 'the last day is still protected');
assert.strictEqual(protectionState(rec, '2027-01-16').state, 'expired');
assert.strictEqual(protectionState(rec, '2026-06-01').daysLeft, 228);
// A record with no window is not silently "active" forever.
assert.strictEqual(protectionState({}, '2026-06-01').state, 'expired');

console.log('protectionWindow OK');
```

- [ ] **Step 2: Run it and watch it fail**

Run: `cd backend && node scripts/testProtectionWindow.js`
Expected: `Cannot find module '../services/protectionWindow'`

- [ ] **Step 3: Write the service**

Create `backend/services/protectionWindow.js`:

```js
/**
 * Non-circumvention protection window — SOP Business Rental Management §13 and
 * Business Tenancy Management §12: an introduced tenant, company, investor,
 * operator or occupancy lead is protected for the engagement plus 12 months.
 */
const EXPIRING_DAYS = 60;

const iso = (d) => `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;

function protectionExpiry(introductionDate, months = 12) {
  if (!introductionDate) return null;
  const d = new Date(`${String(introductionDate).slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return null;
  const day = d.getUTCDate();
  // Set the day to 1 before shifting the month so 31 Aug + 6 months is 28 Feb,
  // not 3 March — a protection window must never overshoot.
  const out = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + months, 1));
  const lastDay = new Date(Date.UTC(out.getUTCFullYear(), out.getUTCMonth() + 1, 0)).getUTCDate();
  out.setUTCDate(Math.min(day, lastDay));
  return iso(out);
}

function protectionState(record = {}, today = iso(new Date())) {
  const end = record.protection_expires_on ? String(record.protection_expires_on).slice(0, 10) : null;
  if (!end) return { state: 'expired', daysLeft: 0 };
  const ms = new Date(`${end}T00:00:00Z`) - new Date(`${String(today).slice(0, 10)}T00:00:00Z`);
  const daysLeft = Math.round(ms / 86400000);
  if (daysLeft < 0) return { state: 'expired', daysLeft: 0 };
  return { state: daysLeft <= EXPIRING_DAYS ? 'expiring' : 'active', daysLeft };
}

module.exports = { EXPIRING_DAYS, protectionExpiry, protectionState };
```

- [ ] **Step 4: Run the test**

Run: `cd backend && node scripts/testProtectionWindow.js`
Expected: `protectionWindow OK`

- [ ] **Step 5: Store the window and the console**

Create `backend/migrations/0152-non-circumvention-rent-protection.js`:

```js
'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const t = await queryInterface.describeTable('non_circumvention_records');
    if (!t.category) {
      await queryInterface.addColumn('non_circumvention_records', 'category', { type: Sequelize.STRING(20), allowNull: true });
    }
    if (!t.protection_expires_on) {
      await queryInterface.addColumn('non_circumvention_records', 'protection_expires_on', { type: Sequelize.DATEONLY, allowNull: true });
    }
    if (!t.evidence_trail) {
      await queryInterface.addColumn('non_circumvention_records', 'evidence_trail', { type: Sequelize.JSON, allowNull: true });
    }
  },
  async down(queryInterface) {
    const t = await queryInterface.describeTable('non_circumvention_records');
    for (const c of ['category', 'protection_expires_on', 'evidence_trail']) {
      if (t[c]) await queryInterface.removeColumn('non_circumvention_records', c);
    }
  },
};
```

In `backend/models/NonCircumventionRecord.js`, after `introduced_by`:

```js
  // Business Rent reuses these records with context 'rental'; category tells the
  // three PM consoles apart, and the window is the engagement plus 12 months.
  category: DataTypes.STRING(20),
  protection_expires_on: DataTypes.DATEONLY,
  evidence_trail: { type: DataTypes.JSON, defaultValue: [] },
```

- [ ] **Step 6: Set the window on create and scope the list**

Find the controller and its create/list:

```bash
cd backend && grep -rln "NonCircumventionRecord" controllers | head
```

In that controller: add `category`, `protection_expires_on` and `evidence_trail` to the `pick(...)` whitelist; on create, default the window when the caller did not supply one:

```js
  const { protectionExpiry } = require('../services/protectionWindow');
  // …in create, after the pick:
  if (!data.protection_expires_on) data.protection_expires_on = protectionExpiry(data.introduction_date);
  if (!data.category) data.category = pmCategory(req.query.category) || null;
```

(put both requires at the top of the file), and in the list, `if (pmCategory(req.query.category)) where.category = pmCategory(req.query.category);` — existing rows have `category = NULL`, so a query without a category still returns everything exactly as before.

- [ ] **Step 7: Verify the existing records are untouched**

```bash
cd backend && node -e "const s=require('./config/db.config');(async()=>{const [r]=await s.query('SELECT context, category, COUNT(*) c FROM non_circumvention_records GROUP BY context, category');console.log(r);process.exit(0)})()" | grep -v Executing
```

Expected: the pre-existing rows still grouped by their context, all with `category: null`.

- [ ] **Step 8: Add to the chain and commit**

Add `node scripts/testProtectionWindow.js && ` to the `test` script.

```bash
git add backend/migrations/0152-non-circumvention-rent-protection.js backend/services/protectionWindow.js backend/scripts/testProtectionWindow.js backend/models/NonCircumventionRecord.js backend/controllers/nonCircumvention.controller.js backend/package.json
git commit -m "feat(business-rent): 12-month non-circumvention window on introductions

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

# Phase 5 — Money

### Task 10: Advance rent schedule and deposits by type

**Files:**
- Create: `backend/migrations/0153-tenancy-deposits.js`
- Create: `backend/models/TenancyDeposit.js`
- Create: `backend/services/advanceSchedule.js`
- Create: `backend/scripts/testAdvanceSchedule.js`
- Modify: `backend/controllers/tenancy.controller.js`
- Modify: `backend/routes/tenancy.routes.js`
- Modify: `backend/package.json`

**Interfaces:**
- Consumes: `BUSINESS_LEASE_DEFAULTS` (Task 8).
- Produces: `advanceState(tenancy, payments)` → `{ agreed, received, outstanding, monthsCovered }`; `DEPOSIT_TYPES`; `GET/POST /api/tenancies/:id/deposits`.

- [ ] **Step 1: Write the failing test**

Create `backend/scripts/testAdvanceSchedule.js`:

```js
const assert = require('assert');
const { advanceState, DEPOSIT_TYPES, depositSummary } = require('../services/advanceSchedule');

// SOP Rental §9 — deposits are settled by type at exit, so they are tracked by type.
assert.deepStrictEqual(DEPOSIT_TYPES, ['security', 'utility', 'maintenance', 'operational_reserve']);

// Twelve months at 50,000, nothing paid.
let s = advanceState({ advance_months: 12, rent_amount: 50000 }, []);
assert.strictEqual(s.agreed, 600000);
assert.strictEqual(s.received, 0);
assert.strictEqual(s.outstanding, 600000);
assert.strictEqual(s.monthsCovered, 0);

// Part paid.
s = advanceState({ advance_months: 12, rent_amount: 50000 }, [{ amount: 250000 }, { amount: 50000 }]);
assert.strictEqual(s.received, 300000);
assert.strictEqual(s.outstanding, 300000);
assert.strictEqual(s.monthsCovered, 6);

// Overpaid: outstanding floors at zero, never negative.
s = advanceState({ advance_months: 12, rent_amount: 50000 }, [{ amount: 700000 }]);
assert.strictEqual(s.outstanding, 0);
assert.strictEqual(s.monthsCovered, 12, 'months covered caps at the agreed term');

// An explicit agreed figure wins over months x rent.
s = advanceState({ advance_months: 12, rent_amount: 50000, advance_rent: 500000 }, []);
assert.strictEqual(s.agreed, 500000);

// With no payment rows, the figure recorded on the tenancy is used — a dashboard
// that always reported zero received would be worse than no dashboard.
s = advanceState({ advance_months: 12, rent_amount: 50000, advance_received: 300000 }, []);
assert.strictEqual(s.received, 300000);
assert.strictEqual(s.outstanding, 300000);
// Payment rows, when present, win over the stored figure.
s = advanceState({ advance_months: 12, rent_amount: 50000, advance_received: 300000 }, [{ amount: 100000 }]);
assert.strictEqual(s.received, 100000);

// Missing figures must not produce NaN on a dashboard.
s = advanceState({}, []);
assert.strictEqual(s.agreed, 0);
assert.strictEqual(s.outstanding, 0);
assert.strictEqual(s.monthsCovered, 0);
s = advanceState({ advance_months: 12, rent_amount: null }, [{ amount: 'abc' }]);
assert.strictEqual(s.received, 0, 'unparseable amounts count as zero, not NaN');

// Deposits summarise per type, and an unknown type is reported rather than dropped.
const d = depositSummary([
  { deposit_type: 'security', amount: 100000, received_amount: 100000 },
  { deposit_type: 'utility', amount: 20000, received_amount: 0 },
  { deposit_type: 'mystery', amount: 5000, received_amount: 5000 },
]);
assert.strictEqual(d.total.agreed, 125000);
assert.strictEqual(d.total.received, 105000);
assert.strictEqual(d.total.outstanding, 20000);
assert.strictEqual(d.byType.security.received, 100000);
assert.strictEqual(d.byType.mystery.agreed, 5000, 'unknown types still counted');

console.log('advanceSchedule OK');
```

- [ ] **Step 2: Run it and watch it fail**

Run: `cd backend && node scripts/testAdvanceSchedule.js`
Expected: `Cannot find module '../services/advanceSchedule'`

- [ ] **Step 3: Write the service**

Create `backend/services/advanceSchedule.js`:

```js
/**
 * Advance rent and deposits for business leases — SOP Business Rental
 * Management §9. Advance is normally twelve months, and each deposit type is
 * settled separately at exit, so both are tracked as agreed / received /
 * outstanding rather than as one number on the tenancy.
 */
const DEPOSIT_TYPES = ['security', 'utility', 'maintenance', 'operational_reserve'];

const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

function advanceState(tenancy = {}, payments = []) {
  const months = num(tenancy.advance_months);
  const agreed = num(tenancy.advance_rent) || months * num(tenancy.rent_amount);
  // Payment rows are the truth when there are any; otherwise the figure recorded
  // on the tenancy, so a lease entered without receipts still reports honestly.
  const received = (payments || []).length
    ? payments.reduce((t, p) => t + num(p.amount), 0)
    : num(tenancy.advance_received);
  const outstanding = Math.max(0, agreed - received);
  const perMonth = num(tenancy.rent_amount);
  const monthsCovered = perMonth > 0 ? Math.min(months || Infinity, Math.floor(received / perMonth)) : 0;
  return { agreed, received, outstanding, monthsCovered: Number.isFinite(monthsCovered) ? monthsCovered : 0 };
}

function depositSummary(deposits = []) {
  const byType = {};
  let agreed = 0; let received = 0;
  for (const d of deposits) {
    const key = String(d.deposit_type || 'unspecified');
    const a = num(d.amount);
    const r = num(d.received_amount);
    byType[key] = byType[key] || { agreed: 0, received: 0, outstanding: 0 };
    byType[key].agreed += a;
    byType[key].received += r;
    byType[key].outstanding = Math.max(0, byType[key].agreed - byType[key].received);
    agreed += a; received += r;
  }
  return { byType, total: { agreed, received, outstanding: Math.max(0, agreed - received) } };
}

module.exports = { DEPOSIT_TYPES, advanceState, depositSummary };
```

- [ ] **Step 4: Run the test**

Run: `cd backend && node scripts/testAdvanceSchedule.js`
Expected: `advanceSchedule OK`

- [ ] **Step 5: Store the deposits**

Create `backend/migrations/0153-tenancy-deposits.js`:

```js
'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const tables = await queryInterface.showAllTables();
    const has = tables.map((t) => (typeof t === 'string' ? t : t.tableName)).includes('tenancy_deposits');
    if (!has) {
      await queryInterface.createTable('tenancy_deposits', {
        id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
        branch_id: { type: Sequelize.INTEGER, allowNull: false },
        tenancy_id: { type: Sequelize.INTEGER, allowNull: false },
        deposit_type: { type: Sequelize.STRING(40), allowNull: false },
        amount: { type: Sequelize.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
        received_amount: { type: Sequelize.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
        received_on: { type: Sequelize.DATEONLY, allowNull: true },
        settled_amount: { type: Sequelize.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
        settled_on: { type: Sequelize.DATEONLY, allowNull: true },
        notes: { type: Sequelize.TEXT, allowNull: true },
        created_by: { type: Sequelize.INTEGER, allowNull: true },
        created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      });
      await queryInterface.addIndex('tenancy_deposits', ['tenancy_id']);
    }
  },
  async down(queryInterface) {
    await queryInterface.dropTable('tenancy_deposits');
  },
};
```

Create `backend/models/TenancyDeposit.js`:

```js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/db.config');

/** Deposits held per tenancy, by type — SOP Business Rental Management §9. */
const TenancyDeposit = sequelize.define('TenancyDeposit', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  branch_id: { type: DataTypes.INTEGER, allowNull: false },
  tenancy_id: { type: DataTypes.INTEGER, allowNull: false },
  deposit_type: { type: DataTypes.STRING(40), allowNull: false },
  amount: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  received_amount: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  received_on: DataTypes.DATEONLY,
  settled_amount: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  settled_on: DataTypes.DATEONLY,
  notes: DataTypes.TEXT,
  created_by: DataTypes.INTEGER,
}, { tableName: 'tenancy_deposits', underscored: true });

module.exports = TenancyDeposit;
```

- [ ] **Step 6: Expose them**

In `backend/controllers/tenancy.controller.js`:

```js
const TenancyDeposit = require('../models/TenancyDeposit');
const { DEPOSIT_TYPES, advanceState, depositSummary } = require('../services/advanceSchedule');

// ─── Deposits held against a tenancy (by type) ──────────────────────────────
exports.listDeposits = asyncHandler(async (req, res) => {
  const t = await Tenancy.findOne({ where: { id: req.params.id, ...branchScope(req) } });
  if (!t) return res.status(404).json({ error: 'Tenancy not found.' });
  const rows = await TenancyDeposit.findAll({ where: { tenancy_id: t.id }, order: [['id', 'ASC']] });
  const plain = rows.map((r) => r.toJSON());
  res.json({ data: plain, summary: depositSummary(plain), types: DEPOSIT_TYPES, advance: advanceState(t.toJSON(), []) });
});

exports.addDeposit = asyncHandler(async (req, res) => {
  const t = await Tenancy.findOne({ where: { id: req.params.id, ...branchScope(req) } });
  if (!t) return res.status(404).json({ error: 'Tenancy not found.' });
  const data = pick(req.body, ['deposit_type', 'amount', 'received_amount', 'received_on', 'settled_amount', 'settled_on', 'notes']);
  if (!data.deposit_type) return res.status(400).json({ error: 'deposit_type is required.' });
  const row = await TenancyDeposit.create({
    ...data, tenancy_id: t.id, branch_id: resolveBranchId(req, t.branch_id), created_by: req.user?.id || null,
  });
  res.status(201).json({ data: row, message: 'Deposit recorded.' });
});
```

In `backend/routes/tenancy.routes.js`, beside the existing `:id` routes (copy the `roleMiddleware` list from the neighbouring tenancy write route):

```js
router.get('/:id/deposits', auth, ctrl.listDeposits);
router.post('/:id/deposits', auth, ctrl.addDeposit);
```

- [ ] **Step 7: Migrate and verify**

```bash
cd backend && npm run db:migrate && node scripts/testAdvanceSchedule.js
```

Restart the backend, POST a security deposit against a business tenancy and GET the list back; confirm the summary totals.

- [ ] **Step 8: Add to the chain and commit**

Add `node scripts/testAdvanceSchedule.js && ` to the `test` script.

```bash
git add backend/migrations/0153-tenancy-deposits.js backend/models/TenancyDeposit.js backend/services/advanceSchedule.js backend/scripts/testAdvanceSchedule.js backend/controllers/tenancy.controller.js backend/routes/tenancy.routes.js backend/package.json
git commit -m "feat(business-rent): advance rent schedule and deposits by type

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 11: Commission-gated handover

**Files:**
- Create: `backend/migrations/0154-tenancy-commission-handover.js`
- Create: `backend/services/handoverGate.js`
- Create: `backend/scripts/testHandoverGate.js`
- Modify: `backend/models/Tenancy.js`
- Modify: `backend/controllers/tenancy.controller.js`
- Modify: `backend/routes/tenancy.routes.js`
- Modify: `backend/package.json`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: `canHandover(tenancy, { override })` → `{ allowed, reason }`; `POST /api/tenancies/:id/handover`.

**Review Focus item 5 lives here:** a lease with **no** commission must hand over freely; only an unpaid commission blocks; an override is recorded with who and why.

- [ ] **Step 1: Write the failing test**

Create `backend/scripts/testHandoverGate.js`:

```js
const assert = require('assert');
const { canHandover } = require('../services/handoverGate');

// SOP Rental §15 — occupancy follows payment.
assert.deepStrictEqual(canHandover({ commission_amount: 50000, commission_paid_amount: 50000 }),
  { allowed: true, reason: null });

// Unpaid commission blocks, and says how much is outstanding.
let r = canHandover({ commission_amount: 50000, commission_paid_amount: 0 });
assert.strictEqual(r.allowed, false);
assert.ok(/50,?000/.test(r.reason), `reason names the outstanding amount: ${r.reason}`);

// Part paid still blocks.
assert.strictEqual(canHandover({ commission_amount: 50000, commission_paid_amount: 20000 }).allowed, false);

// A lease with NO commission is not blocked — nothing was ever charged.
assert.deepStrictEqual(canHandover({}), { allowed: true, reason: null });
assert.deepStrictEqual(canHandover({ commission_amount: 0 }), { allowed: true, reason: null });
assert.deepStrictEqual(canHandover({ commission_amount: null, commission_paid_amount: null }), { allowed: true, reason: null });

// Overpayment is not a block.
assert.strictEqual(canHandover({ commission_amount: 50000, commission_paid_amount: 60000 }).allowed, true);

// A manager override allows it, and the caller is told it was an override.
r = canHandover({ commission_amount: 50000, commission_paid_amount: 0 }, { override: true });
assert.strictEqual(r.allowed, true);
assert.ok(/override/i.test(r.reason), 'an override is never silent');

console.log('handoverGate OK');
```

- [ ] **Step 2: Run it and watch it fail**

Run: `cd backend && node scripts/testHandoverGate.js`
Expected: `Cannot find module '../services/handoverGate'`

- [ ] **Step 3: Write the service**

Create `backend/services/handoverGate.js`:

```js
/**
 * Handover gate — SOP Business Rental Management §15: occupancy follows
 * payment, so a handover cannot complete while the commission invoice is
 * unpaid. A manager may override; the override is recorded, never silent.
 *
 * A lease that was never charged a commission is not gated — blocking a
 * handover over money nobody asked for would be a bug, not a control.
 */
const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};
const money = (n) => n.toLocaleString('en-US');

function canHandover(tenancy = {}, { override = false } = {}) {
  const charged = num(tenancy.commission_amount);
  if (charged <= 0) return { allowed: true, reason: null };
  const outstanding = charged - num(tenancy.commission_paid_amount);
  if (outstanding <= 0) return { allowed: true, reason: null };
  if (override) {
    return { allowed: true, reason: `Manager override: BDT ${money(outstanding)} commission still outstanding.` };
  }
  return { allowed: false, reason: `Commission of BDT ${money(outstanding)} is outstanding. Collect it or record a manager override.` };
}

module.exports = { canHandover };
```

- [ ] **Step 4: Run the test**

Run: `cd backend && node scripts/testHandoverGate.js`
Expected: `handoverGate OK`

- [ ] **Step 5: Store the commission and the handover**

Create `backend/migrations/0154-tenancy-commission-handover.js`:

```js
'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const t = await queryInterface.describeTable('tenancies');
    const add = async (name, type) => { if (!t[name]) await queryInterface.addColumn('tenancies', name, { type, allowNull: true }); };
    await add('commission_amount', Sequelize.DECIMAL(15, 2));
    await add('commission_paid_amount', Sequelize.DECIMAL(15, 2));
    await add('commission_invoice_id', Sequelize.INTEGER);
    await add('handover_completed_at', Sequelize.DATE);
    await add('handover_override_by', Sequelize.INTEGER);
    await add('handover_override_reason', Sequelize.TEXT);
  },
  async down(queryInterface) {
    const t = await queryInterface.describeTable('tenancies');
    for (const c of ['commission_amount', 'commission_paid_amount', 'commission_invoice_id',
      'handover_completed_at', 'handover_override_by', 'handover_override_reason']) {
      if (t[c]) await queryInterface.removeColumn('tenancies', c);
    }
  },
};
```

In `backend/models/Tenancy.js`, beside the Task 8 additions:

```js
  commission_amount: DataTypes.DECIMAL(15, 2),
  commission_paid_amount: DataTypes.DECIMAL(15, 2),
  commission_invoice_id: DataTypes.INTEGER,
  handover_completed_at: DataTypes.DATE,
  handover_override_by: DataTypes.INTEGER,
  handover_override_reason: DataTypes.TEXT,
```

- [ ] **Step 6: Gate the endpoint**

In `backend/controllers/tenancy.controller.js`:

```js
const { canHandover } = require('../services/handoverGate');

// ─── Complete the operational handover (SOP Rental §15) ─────────────────────
exports.handover = asyncHandler(async (req, res) => {
  const t = await Tenancy.findOne({ where: { id: req.params.id, ...branchScope(req) } });
  if (!t) return res.status(404).json({ error: 'Tenancy not found.' });
  if (t.handover_completed_at) return res.status(400).json({ error: 'Handover is already complete.' });

  const override = Boolean(req.body.override);
  const { allowed, reason } = canHandover(t.toJSON(), { override });
  if (!allowed) return res.status(400).json({ error: reason });
  if (override && !req.body.override_reason) {
    return res.status(400).json({ error: 'An override must state why.' });
  }

  await t.update({
    handover_completed_at: new Date(),
    handover_override_by: override ? (req.user?.id || null) : null,
    handover_override_reason: override ? req.body.override_reason : null,
  });
  res.json({ data: t, message: reason || 'Handover recorded.' });
});
```

Add the commission keys to the tenancy `pick(...)` whitelist, and in `backend/routes/tenancy.routes.js`:

```js
router.post('/:id/handover', auth, ctrl.handover);
```

- [ ] **Step 7: Migrate and verify all three paths against the API**

```bash
cd backend && npm run db:migrate && node scripts/testHandoverGate.js
```

Restart the backend, then on a business tenancy:

```bash
# 1. no commission → allowed
curl -s -X POST -H "Authorization: Bearer $TOKEN" -H "X-Branch-Id: 1" -H 'Content-Type: application/json' -d '{}' \
  "http://localhost:50001/api/tenancies/<NO_COMMISSION_ID>/handover"; echo
# 2. unpaid commission → 400 naming the amount
curl -s -X POST -H "Authorization: Bearer $TOKEN" -H "X-Branch-Id: 1" -H 'Content-Type: application/json' -d '{}' \
  "http://localhost:50001/api/tenancies/<UNPAID_ID>/handover"; echo
# 3. override → allowed, recorded
curl -s -X POST -H "Authorization: Bearer $TOKEN" -H "X-Branch-Id: 1" -H 'Content-Type: application/json' \
  -d '{"override":true,"override_reason":"Owner agreed to net the commission from the first disbursement"}' \
  "http://localhost:50001/api/tenancies/<UNPAID_ID>/handover"; echo
```

Expected: allowed, 400, allowed-with-override recorded.

- [ ] **Step 8: Add to the chain and commit**

Add `node scripts/testHandoverGate.js && ` to the `test` script.

```bash
git add backend/migrations/0154-tenancy-commission-handover.js backend/services/handoverGate.js backend/scripts/testHandoverGate.js backend/models/Tenancy.js backend/controllers/tenancy.controller.js backend/routes/tenancy.routes.js backend/package.json
git commit -m "feat(business-rent): handover gated on commission, with recorded override

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

# Phase 6 — Dashboards, retirement and verification

### Task 12: The six Business Rent dashboards

**Files:**
- Create: `backend/controllers/businessRentDashboards.controller.js`
- Create: `backend/routes/businessRentDashboards.routes.js`
- Create: `backend/services/businessRentDashboardMath.js`
- Create: `backend/scripts/testBusinessRentDashboardMath.js`
- Create: `admin-portal/src/screens/rental/BusinessRentDashboards.jsx`
- Modify: `backend/server.js` (one `mount` line — stage this hunk only)
- Modify: `backend/routes/manifest.js`
- Modify: `admin-portal/src/App.jsx`, `admin-portal/src/config/consoles.js`
- Modify: `backend/package.json`

**Interfaces:**
- Consumes: `BUSINESS_RENT_STAGES` (5), `screeningVerdict` (6), `protectionState` (9), `advanceState`/`depositSummary` (10), and the commission columns from (11).
- Produces: `GET /api/business-rent/dashboards/:key` for `pipeline | occupancy | screening | financial | protection | operations`.

- [ ] **Step 1: Write the failing test**

Create `backend/scripts/testBusinessRentDashboardMath.js`:

```js
const assert = require('assert');
const { pipelineByStage, occupancy, arrearsAgeing } = require('../services/businessRentDashboardMath');
const { BUSINESS_RENT_STAGES } = require('./seedBusinessRentWorkflow');

// Every one of the 13 stages appears, including the empty ones — a pipeline
// with a hole in it is misread as "nothing is stuck there".
const p = pipelineByStage([
  { current_stage_key: 'marketing', updated_at: '2026-09-01' },
  { current_stage_key: 'marketing', updated_at: '2026-09-20' },
  { current_stage_key: 'handover', updated_at: '2026-09-22' },
  { current_stage_key: 'not_a_stage', updated_at: '2026-09-22' },
], '2026-09-24');
assert.strictEqual(p.length, BUSINESS_RENT_STAGES.length, 'all 13 stages, in order');
assert.deepStrictEqual(p.map((s) => s.key), BUSINESS_RENT_STAGES.map((s) => s.key));
assert.strictEqual(p.find((s) => s.key === 'marketing').count, 2);
assert.strictEqual(p.find((s) => s.key === 'closure').count, 0);
assert.strictEqual(p.find((s) => s.key === 'marketing').oldestDays, 23, 'days in stage from the oldest');
// An unknown stage key is not silently dropped into another stage's count.
assert.strictEqual(p.reduce((n, s) => n + s.count, 0), 3);

// SOP: Negotiation warns while tenant screening is unresolved — and only Negotiation.
const warned = pipelineByStage([{ current_stage_key: 'negotiation', updated_at: '2026-09-20' }],
  '2026-09-24', { screeningOutstanding: 2 });
const neg = warned.find((s) => s.key === 'negotiation');
assert.ok(/2 .*screening/i.test(neg.warning || ''), `negotiation warns: ${neg.warning}`);
assert.ok(warned.filter((s) => s.warning).length === 1, 'no other stage is warned');
// Nothing outstanding, no warning — a clean pipeline must not cry wolf.
assert.strictEqual(pipelineByStage([{ current_stage_key: 'negotiation' }], '2026-09-24', { screeningOutstanding: 0 })
  .find((s) => s.key === 'negotiation').warning, null);
// Warnings attach to the stage even when it is empty, but only when work is there.
assert.strictEqual(pipelineByStage([], '2026-09-24', { screeningOutstanding: 3 })
  .find((s) => s.key === 'negotiation').warning, null, 'no leases in negotiation, nothing to warn about');

// Occupancy over properties and their tenancies.
const o = occupancy(
  [{ id: 1 }, { id: 2 }, { id: 3 }],
  [{ property_id: 1, status: 'active', lease_end: '2026-11-01' }, { property_id: 2, status: 'ended' }],
  '2026-09-24',
);
assert.strictEqual(o.leased, 1);
assert.strictEqual(o.vacant, 2);
assert.strictEqual(o.expiringSoon, 1, 'inside 90 days');

// Arrears ageing buckets, inclusive at the boundaries.
const a = arrearsAgeing([
  { amount: 1000, due_date: '2026-09-20' }, // 4 days
  { amount: 2000, due_date: '2026-08-24' }, // 31 days
  { amount: 3000, due_date: '2026-06-24' }, // 92 days
  { amount: 500, due_date: '2026-09-25' },  // not yet due
], '2026-09-24');
assert.strictEqual(a['0-30'], 1000);
assert.strictEqual(a['31-60'], 2000);
assert.strictEqual(a['90+'], 3000);
assert.strictEqual(a.notDue, 500);

console.log('businessRentDashboardMath OK');
```

- [ ] **Step 2: Run it and watch it fail**

Run: `cd backend && node scripts/testBusinessRentDashboardMath.js`
Expected: `Cannot find module '../services/businessRentDashboardMath'`

- [ ] **Step 3: Write the math**

Create `backend/services/businessRentDashboardMath.js`:

```js
/** Pure math behind the Business Rent dashboards — no DB, so it is testable. */
const { BUSINESS_RENT_STAGES } = require('../scripts/seedBusinessRentWorkflow');

const days = (from, to) => Math.max(0, Math.round(
  (new Date(`${String(to).slice(0, 10)}T00:00:00Z`) - new Date(`${String(from).slice(0, 10)}T00:00:00Z`)) / 86400000,
));
const num = (v) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };

/** One row per SOP stage, in order, including the empty ones. */
function pipelineByStage(projects = [], today = new Date().toISOString().slice(0, 10), opts = {}) {
  const outstanding = num(opts.screeningOutstanding);
  return BUSINESS_RENT_STAGES.map((s) => {
    const rows = projects.filter((p) => p.current_stage_key === s.key);
    const oldestDays = rows.reduce((max, p) => Math.max(max, p.updated_at ? days(p.updated_at, today) : 0), 0);
    // SOP Rental §11: negotiating before screening resolves is the risk the SOP
    // names, so the stage carries the warning rather than blocking the work.
    const warning = (s.key === 'negotiation' && rows.length > 0 && outstanding > 0)
      ? `${outstanding} tenant screening(s) unresolved — resolve before committing to terms.`
      : null;
    return { key: s.key, name: s.name, department: s.department, count: rows.length, oldestDays, warning };
  });
}

function occupancy(properties = [], tenancies = [], today = new Date().toISOString().slice(0, 10)) {
  const active = tenancies.filter((t) => t.status === 'active');
  const leasedIds = new Set(active.map((t) => t.property_id));
  const expiringSoon = active.filter((t) => t.lease_end && days(today, t.lease_end) <= 90 && new Date(t.lease_end) >= new Date(today)).length;
  return { total: properties.length, leased: leasedIds.size, vacant: properties.length - leasedIds.size, expiringSoon };
}

function arrearsAgeing(items = [], today = new Date().toISOString().slice(0, 10)) {
  const out = { notDue: 0, '0-30': 0, '31-60': 0, '61-90': 0, '90+': 0 };
  for (const i of items) {
    const amount = num(i.amount);
    if (!i.due_date || new Date(`${String(i.due_date).slice(0, 10)}T00:00:00Z`) > new Date(`${String(today).slice(0, 10)}T00:00:00Z`)) { out.notDue += amount; continue; }
    const age = days(i.due_date, today);
    if (age <= 30) out['0-30'] += amount;
    else if (age <= 60) out['31-60'] += amount;
    else if (age <= 90) out['61-90'] += amount;
    else out['90+'] += amount;
  }
  return out;
}

module.exports = { pipelineByStage, occupancy, arrearsAgeing };
```

- [ ] **Step 4: Run the test**

Run: `cd backend && node scripts/testBusinessRentDashboardMath.js`
Expected: `businessRentDashboardMath OK`

- [ ] **Step 5: Write the controller**

Create `backend/controllers/businessRentDashboards.controller.js`:

```js
const { Op } = require('sequelize');
const Property = require('../models/Property');
const Tenancy = require('../models/Tenancy');
const Project = require('../models/Project');
const TenantApplication = require('../models/TenantApplication').TenantApplication;
const NonCircumventionRecord = require('../models/NonCircumventionRecord');
const TenancyDeposit = require('../models/TenancyDeposit');
const PropertyInvoice = require('../models/PropertyInvoice');
const ProjectStage = require('../models/ProjectStage');
const { asyncHandler, branchScope } = require('../utils/controllerHelpers');
const { pipelineByStage, occupancy, arrearsAgeing } = require('../services/businessRentDashboardMath');
const { screeningVerdict } = require('../services/businessScreening');
const { advanceState, depositSummary } = require('../services/advanceSchedule');
const { protectionState } = require('../services/protectionWindow');

/** Business Rent is category 'business' AND listing_type 'rent' — never one alone. */
const businessRentProperties = async (req) => Property.findAll({
  where: { ...branchScope(req), category: 'business', listing_type: 'rent' },
});

const plain = (rows) => rows.map((r) => (r.toJSON ? r.toJSON() : r));

exports.dashboard = asyncHandler(async (req, res) => {
  const key = String(req.params.key || '');
  const props = plain(await businessRentProperties(req));
  const propIds = props.map((p) => p.id);
  const tenancies = propIds.length
    ? plain(await Tenancy.findAll({ where: { ...branchScope(req), property_id: { [Op.in]: propIds } } }))
    : [];

  if (key === 'pipeline') {
    const projects = plain(await Project.findAll({ where: { ...branchScope(req), vertical_key: 'business_rent' } }));
    // The Negotiation stage warns while screening is unresolved (SOP Rental §11).
    const apps = propIds.length
      ? plain(await TenantApplication.findAll({ where: { ...branchScope(req), property_id: { [Op.in]: propIds } } }))
      : [];
    const screeningOutstanding = apps.filter((a) => !screeningVerdict(a).ready).length;
    const today = new Date().toISOString().slice(0, 10);
    return res.json({ data: { stages: pipelineByStage(projects, today, { screeningOutstanding }), total: projects.length } });
  }

  if (key === 'occupancy') {
    return res.json({ data: occupancy(props, tenancies) });
  }

  if (key === 'screening') {
    const apps = propIds.length
      ? plain(await TenantApplication.findAll({ where: { ...branchScope(req), property_id: { [Op.in]: propIds } } }))
      : [];
    const byVerdict = { pending: 0, suitable: 0, conditional: 0, declined: 0 };
    let outstanding = 0;
    for (const a of apps) {
      const s = screeningVerdict(a);
      byVerdict[s.verdict] = (byVerdict[s.verdict] || 0) + 1;
      if (!s.ready) outstanding += 1;
    }
    return res.json({ data: { total: apps.length, byVerdict, screeningOutstanding: outstanding } });
  }

  if (key === 'financial') {
    const deposits = tenancies.length
      ? plain(await TenancyDeposit.findAll({ where: { tenancy_id: { [Op.in]: tenancies.map((t) => t.id) } } }))
      : [];
    const advance = tenancies.reduce((acc, t) => {
      const a = advanceState(t, []);
      return { agreed: acc.agreed + a.agreed, received: acc.received + a.received, outstanding: acc.outstanding + a.outstanding };
    }, { agreed: 0, received: 0, outstanding: 0 });
    const commission = tenancies.reduce((acc, t) => ({
      charged: acc.charged + Number(t.commission_amount || 0),
      paid: acc.paid + Number(t.commission_paid_amount || 0),
    }), { charged: 0, paid: 0 });
    commission.outstanding = Math.max(0, commission.charged - commission.paid);
    // Arrears from the tenant invoices raised against these tenancies.
    // PropertyInvoice is the PM invoice (Invoice.js is the academy's); it carries
    // tenancy_id, balance and due_date.
    const invoices = tenancies.length
      ? plain(await PropertyInvoice.findAll({
        where: {
          ...branchScope(req),
          tenancy_id: { [Op.in]: tenancies.map((t) => t.id) },
          status: { [Op.notIn]: ['paid', 'cancelled', 'refunded', 'draft'] },
        },
      }))
      : [];
    const arrears = arrearsAgeing(invoices.map((i) => ({ amount: i.balance, due_date: i.due_date })));
    return res.json({ data: { advance, commission, deposits: depositSummary(deposits), arrears } });
  }

  if (key === 'protection') {
    const recs = plain(await NonCircumventionRecord.findAll({ where: { ...branchScope(req), category: 'business' } }));
    const counts = { active: 0, expiring: 0, expired: 0 };
    for (const r of recs) counts[protectionState(r).state] += 1;
    return res.json({ data: { total: recs.length, ...counts, breached: recs.filter((r) => r.status === 'breached').length } });
  }

  if (key === 'operations') {
    // An escalation is a blocked stage, reported with the SOP trigger that
    // applies to it — the triggers are data on the stage, not decorative text.
    const projects = plain(await Project.findAll({ where: { ...branchScope(req), vertical_key: 'business_rent' } }));
    const stages = projects.length
      ? plain(await ProjectStage.findAll({
        where: { project_id: { [Op.in]: projects.map((p) => p.id) }, status: 'blocked' },
      }))
      : [];
    const escalations = stages.map((s) => ({
      project_id: s.project_id, stage: s.stage_name, department: s.department, trigger: s.escalation_trigger,
    }));
    return res.json({ data: { properties: props.length, tenancies: tenancies.length, escalations, escalationCount: escalations.length } });
  }

  return res.status(404).json({ error: `Unknown dashboard '${key}'.` });
});
```

Create `backend/routes/businessRentDashboards.routes.js`:

```js
const router = require('express').Router();
const ctrl = require('../controllers/businessRentDashboards.controller');
const { authMiddleware } = require('../middleware/auth.middleware');

router.get('/dashboards/:key', authMiddleware, ctrl.dashboard);

module.exports = router;
```

Copy the exact auth import shape from `backend/routes/businessRegistrationLine.routes.js` — it is the most recent example.

- [ ] **Step 6: Mount it (server.js and the manifest)**

In `backend/server.js`, beside the other `mount(` calls:

```js
mount('/api/business-rent', './routes/businessRentDashboards.routes');
```

In `backend/routes/manifest.js`, add the same route file so the production monolith serves it (read how `businessRegistrationLine.routes` is listed and match it).

**Staging note:** `backend/server.js` carries another contributor's uncommitted work. Stage only your hunk:

```bash
cd "<repo root>"
git diff backend/server.js > /tmp/server.patch
# keep only the hunk containing business-rent, then:
git apply --cached /tmp/server.patch
```

- [ ] **Step 7: Write the screen**

Create `admin-portal/src/screens/rental/BusinessRentDashboards.jsx`:

```jsx
import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { PageHead, Spinner, Badge } from '../../ui/kit';

const TABS = [
  ['pipeline', 'Leasing pipeline'], ['occupancy', 'Occupancy'], ['screening', 'Tenant screening & risk'],
  ['financial', 'Financial'], ['protection', 'Protection'], ['operations', 'Operations'],
];

const money = (n) => `BDT ${Number(n || 0).toLocaleString('en-US')}`;

export default function BusinessRentDashboards() {
  const toast = useToast();
  const [tab, setTab] = useState('pipeline');
  const [data, setData] = useState(null);

  useEffect(() => {
    setData(null);
    api.get(`/business-rent/dashboards/${tab}`)
      .then(({ data: d }) => setData(d.data))
      .catch(() => { setData({}); toast.error('Could not load this dashboard'); });
  }, [tab, toast]);

  return (
    <div className="pm-scope">
      <PageHead title="Business Rent · Dashboards" desc="Pipeline, occupancy, screening, money, protection and operations." />
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '12px 0' }}>
        {TABS.map(([k, label]) => (
          <button key={k} type="button" className={`pm-tab${tab === k ? ' is-active' : ''}`} onClick={() => setTab(k)}>{label}</button>
        ))}
      </div>
      {data === null ? <Spinner /> : (
        <section className="pm-card" style={{ padding: 18 }}>
          {tab === 'pipeline' && (
            <table className="pm-table">
              <thead><tr><th>Stage</th><th>Department</th><th>Leases</th><th>Days in stage</th></tr></thead>
              <tbody>
                {(data.stages || []).map((s) => (
                  <tr key={s.key}>
                    <td>
                      {s.name}
                      {s.warning && <div style={{ color: '#b45309', fontSize: 12 }}>{s.warning}</div>}
                    </td>
                    <td className="cell-sub">{s.department}</td>
                    <td>{s.count}</td>
                    <td>{s.count ? `${s.oldestDays}d` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {tab === 'occupancy' && (
            <p>{data.leased} leased · {data.vacant} vacant of {data.total} premises · {data.expiringSoon} expiring within 90 days</p>
          )}
          {tab === 'screening' && (
            <p>
              {data.total} application(s):{' '}
              {Object.entries(data.byVerdict || {}).map(([k, v]) => <Badge key={k} tone={k === 'declined' ? 'red' : k === 'suitable' ? 'green' : 'grey'}>{k} {v}</Badge>)}
              {' '}· {data.screeningOutstanding} with screening outstanding
            </p>
          )}
          {tab === 'financial' && (
            <ul>
              <li>Advance: {money(data.advance?.received)} received of {money(data.advance?.agreed)} agreed ({money(data.advance?.outstanding)} outstanding)</li>
              <li>Commission: {money(data.commission?.paid)} of {money(data.commission?.charged)} ({money(data.commission?.outstanding)} outstanding)</li>
              <li>Deposits held: {money(data.deposits?.total?.received)} of {money(data.deposits?.total?.agreed)}</li>
            </ul>
          )}
          {tab === 'protection' && (
            <p>{data.active} active · {data.expiring} nearing expiry · {data.expired} expired · {data.breached} suspected breach</p>
          )}
          {tab === 'operations' && (
            <>
              <p>{data.properties} premises · {data.tenancies} tenancies · {data.escalationCount} escalation(s) raised</p>
              {(data.escalations || []).length > 0 && (
                <table className="pm-table">
                  <thead><tr><th>Stage</th><th>Department</th><th>Escalation trigger</th></tr></thead>
                  <tbody>
                    {data.escalations.map((e, i) => (
                      <tr key={`${e.project_id}-${i}`}><td>{e.stage}</td><td className="cell-sub">{e.department}</td><td>{e.trigger || '—'}</td></tr>
                    ))}
                  </tbody>
                </table>
              )}
            </>
          )}
        </section>
      )}
    </div>
  );
}
```

Use whatever tab/card class names the neighbouring PM screens use — read one first and match it rather than inventing `pm-tab`.

Register it: `<Route path="/business-rent/dashboards" element={<BusinessRentDashboards />} />` in `App.jsx`, and a nav item at the top of `BUSINESS_RENT_NAV`.

- [ ] **Step 8: Verify all six**

Restart the backend and build the frontend, then:

```bash
for k in pipeline occupancy screening financial protection operations; do
  printf '%-12s ' "$k"
  curl -s -H "Authorization: Bearer $TOKEN" -H "X-Branch-Id: 1" \
    "http://localhost:50001/api/business-rent/dashboards/$k" | head -c 160; echo
done
curl -s -H "Authorization: Bearer $TOKEN" -H "X-Branch-Id: 1" \
  "http://localhost:50001/api/business-rent/dashboards/nonsense"; echo
```

Expected: six `data` payloads with no `NaN` and no `null` totals, then a 404 for the unknown key. Check the server boot log says `mounted: /api/business-rent`.

- [ ] **Step 9: Add to the chain and commit**

Add `node scripts/testBusinessRentDashboardMath.js && ` to the `test` script.

```bash
git add backend/controllers/businessRentDashboards.controller.js backend/routes/businessRentDashboards.routes.js backend/services/businessRentDashboardMath.js backend/scripts/testBusinessRentDashboardMath.js backend/routes/manifest.js backend/package.json admin-portal/src/screens/rental/BusinessRentDashboards.jsx admin-portal/src/App.jsx admin-portal/src/config/consoles.js
# plus the single server.js hunk, staged as in Step 6
git commit -m "feat(business-rent): the six SOP dashboards

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 13: Full-flow e2e, isolation proof and handover

**Files:**
- Modify: `backend/scripts/e2e/businessRent.js` (extend the file from Task 2)
- Modify: `AGENT_WORK_LOG.md` (appended, never committed)

**Interfaces:**
- Consumes: every endpoint built above.
- Produces: a single `node scripts/e2e/businessRent.js` run covering the SOP flow end to end, plus the both-directions isolation proof.

- [ ] **Step 1: Extend the e2e with the SOP flow**

Append to `backend/scripts/e2e/businessRent.js`, before the runner at the bottom:

```js
async function flow() {
  console.log('\n— SOP flow: enquiry → screening → lease → handover —');
  const prop = await req('POST', '/api/properties', {
    title: `E2E Business Premises ${STAMP}`, category: 'business', listing_type: 'rent',
    status: 'available', price: 50000, branch_id: 1,
  });
  ok(prop.status === 201, 'business rent property created', `HTTP ${prop.status}`);
  const propertyId = prop.body?.data?.id;

  const app = await req('POST', '/api/tenant-applications', {
    property_id: propertyId, applicant_name: `E2E Operator ${STAMP}`, business_name: 'E2E Retail Ltd',
    business_type: 'Retail', intended_activity: 'Clothing store', trade_licence_no: `TL-${STAMP}`,
    corporate_profile: 'Ltd, 3 branches', financial_capability: '12m bank statements',
    operational_suitability: 'Ground floor retail', previous_leasing_history: 'Two prior leases, clean',
    screening_verdict: 'suitable', branch_id: 1,
  });
  ok(app.status === 201, 'application with screening created', `HTTP ${app.status}`);
  ok(app.body?.data?.screening_verdict === 'suitable', 'screening verdict stored (model knows the column)');

  const assess = await req('POST', '/api/rental-assessments', { property_id: propertyId, branch_id: 1 });
  const sections = [...new Set((assess.body?.data?.items || []).map((i) => i.section))];
  ok(sections.includes('Location suitability'), 'premises template seeded, not the room template', sections.slice(0, 3).join(', '));
  ok(!sections.some((s) => /bedroom/i.test(s)), 'no bedrooms on a business premises');

  const ten = await req('POST', '/api/tenancies?category=business', {
    property_id: propertyId, start_date: '2026-10-01', rent_amount: 50000,
    lease_term_months: 6, advance_months: 12, branch_id: 1,
  });
  ok(ten.status === 201, 'a lease departing from the SOP structure still saves', `HTTP ${ten.status}`);
  const warnings = ten.body?.data?.structure_warnings || [];
  ok(warnings.some((w) => w.field === 'lease_term_months'), 'the departure is recorded as a warning');
  const tenancyId = ten.body?.data?.id;

  const dep = await req('POST', `/api/tenancies/${tenancyId}/deposits`, { deposit_type: 'security', amount: 100000, received_amount: 100000 });
  ok(dep.status === 201, 'security deposit recorded', `HTTP ${dep.status}`);

  const free = await req('POST', `/api/tenancies/${tenancyId}/handover`, {});
  ok(free.status === 200, 'handover is NOT blocked when no commission was charged', `HTTP ${free.status}`);
}

async function isolation() {
  console.log('\n— Isolation: the other consoles are unmoved —');
  for (const [cat, base] of [['residential', '/api/properties'], ['commercial', '/api/properties']]) {
    const r = await req('GET', `${base}?category=${cat}&listing_type=rent&limit=200`);
    const rows = r.body?.data || [];
    ok(rows.every((p) => p.category === cat), `${cat} scope returns only ${cat}`);
    ok(!rows.some((p) => p.category === 'business'), `no business row leaks into ${cat}`);
  }
  const pm = await req('GET', '/api/property-management/overview?category=residential');
  ok(pm.status === 200, 'the residential PM overview still answers', `HTTP ${pm.status}`);
  const unknown = await req('GET', '/api/property-management/overview?category=nonsense');
  ok(unknown.status === 200, 'an unknown category still behaves as before (unfiltered, not an error)', `HTTP ${unknown.status}`);
}
```

and change the runner to `await scoping(); await flow(); await isolation();`.

- [ ] **Step 2: Run it**

Run: `cd backend && node scripts/e2e/businessRent.js`
Expected: every line PASS. Fix what fails before continuing; report any FAIL you cannot fix rather than moving on.

- [ ] **Step 3: Run the whole unit chain and both builds**

```bash
cd backend && npm test
cd ../admin-portal && npm run build
cd ../website-mock && npm run build
```

Expected: `npm test` exits 0 (it now runs the six new scripts plus everything that was already there); both builds `✓ built`.

- [ ] **Step 4: Prove the other consoles by eye**

Open each and confirm it renders as before: `/admin/property-management`, `/admin/commercial/rent`, `/admin/business`, `/admin/business-registration`, `/admin/water-tank`. Then `/admin/business-rent`: the PM nav, an empty-but-correct Properties list, the six dashboards, and the Rental Mgmt / Tenancy Mgmt agreement builders.

- [ ] **Step 5: Clean up the e2e fixtures**

The local DB is the production DB. Delete the rows this run created (they are all stamped `E2E … ${STAMP}`) or, if any are load-bearing for a later check, say so explicitly in the work log rather than leaving them unexplained:

```bash
cd backend && node -e "const s=require('./config/db.config');(async()=>{const [r]=await s.query(\"SELECT id,title FROM properties WHERE title LIKE 'E2E Business Premises%'\");console.log(r);process.exit(0)})()" | grep -v Executing
```

- [ ] **Step 6: Append the COMPLETED entry to the work log**

Append to `AGENT_WORK_LOG.md` (append-only; never edit another contributor's entry, never commit this file): files changed, the migrations applied (0149-0154), the exact verification commands and their results, the fixtures left behind if any, and what is still out of scope (dispute management, fraud/high-risk procedures, retention registers, termination procedure, tenant fit-out tracking, the public website surface).

- [ ] **Step 7: Final commit**

```bash
git add backend/scripts/e2e/businessRent.js
git commit -m "test(business-rent): SOP flow end to end, with both-directions isolation

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Notes for the executor

- **Deployment is blocked.** Hostinger lost access to the repository, so nothing here reaches production until the user re-grants it. Do not merge to `production` or push there as part of this plan.
- **The local DB is the production DB.** Every migration above is additive and guarded; none rewrites or drops an existing row. The one destructive-looking step — correcting the `business_rent` workflow template — refuses to run if any project uses it.
- **If a step's anchor does not match the file**, read the file and adapt rather than forcing the edit. Line numbers here were measured on 2026-09-24 and may drift.
