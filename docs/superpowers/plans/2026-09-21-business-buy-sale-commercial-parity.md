# Business Buy & Sale — Commercial Parity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Business Sale and Business Buy identical to Commercial Sale and Commercial Buy by running them as `category='business'` on the shared sales engine, add the SOP-required business modules, and publish business listings to the website as confidential teasers behind an e-signed NDA.

**Architecture:** Commercial is the Residential sales engine rendered with `category="commercial"` and rebased onto `/commercial/*`. Business becomes a third rendering, rebased onto `/business/*`, and its shared screens lock to `category=business` via a URL-derived hook. Business-only data (profile, assessment, due diligence, preparation, suitability, NDA) lives in small new tables and one new admin section file, and appears only when a property's category is `business`.

**Tech Stack:** Node 20 + Express + Sequelize + MySQL (`backend/`), React 18 + Vite (`admin-portal/`, `website-mock/`), sequelize-cli migrations, plain Node `assert` test scripts, Hostinger git auto-deploy.

**Spec:** `docs/superpowers/specs/2026-09-21-business-buy-sale-commercial-parity-design.md`

## Global Constraints

- Run every backend script from `backend/` (`.env` is resolved relative to the working directory). API listens on `:50001`.
- **Local and production share one database.** A migration takes effect in production the moment it runs. Every migration must be additive and idempotent (`showAllTables` / `describeTable` guards).
- Never call `sequelize.sync()`. Every new column needs a model attribute.
- JSON columns come back as strings in this database: parse with `typeof x === 'string' ? JSON.parse(x) : x` inside try/catch.
- Controllers: `asyncHandler`, `branchScope(req)` on every query, `resolveBranchId(req)` on every create, `pick(req.body, FIELDS)` — never spread `req.body`.
- Private files (KYC, NDA, due diligence) go under `/uploads/documents` (use `UploadButton folder="documents"`).
- Frontend calls go through the shared `api` instance; use `ui/kit.jsx` components.
- Valid sales categories: `residential | commercial | rural | business`. A request without `category` must behave exactly as before this plan (Residential and Commercial unchanged).
- Only screens under `/business/*` lock to `business`. `/business-rent/*` and `/business-registration/*` are out of scope and must keep working.
- Another contributor has uncommitted edits in `backend/server.js`, `backend/config/cors.config.js` and `AGENT_WORK_LOG.md`. Never stage those files wholesale. For `server.js`, stage only your own hunk (see Task 15). `AGENT_WORK_LOG.md` is appended to but never committed.
- Every commit message ends with `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`.
- Before each phase append a `STARTED` entry, and after it a `COMPLETED` entry, to `AGENT_WORK_LOG.md` (files changed, verification run and result).

## File Structure

**Backend — new**
- `backend/scripts/testManifestParity.js` — server-free check that every `server.js` mount is in the production manifest.
- `backend/scripts/testPublicPropertyShape.js` — unit test for the public property allowlist.
- `backend/scripts/testSaleAgreementTypes.js` — unit test + source scan for the shared agreement-type lists.
- `backend/scripts/testSalesCategory.js` — unit test for category validation.
- `backend/scripts/testBusinessTeaser.js` — unit test for the teaser/turnover-band logic.
- `backend/scripts/testBusinessNda.js` — unit test for NDA token state.
- `backend/scripts/e2e/httpHarness.js` — shared login/request/assert helpers for the e2e scripts.
- `backend/scripts/e2e/businessParity.js` — end-to-end checks, grown phase by phase.
- `backend/services/publicPropertyShape.js` — public-detail allowlist + visibility rule.
- `backend/utils/saleAgreementTypes.js` — the one list of sales-engine agreement types.
- `backend/utils/salesCategory.js` — category validation + property-id lookup.
- `backend/services/businessTeaser.service.js` — pure teaser redaction + turnover band.
- `backend/models/PropertyBusinessProfile.js`, `backend/controllers/propertyBusinessProfile.controller.js`
- `backend/models/BusinessNda.js`, `backend/services/ndaDocument.service.js`, `backend/services/businessNda.service.js`, `backend/controllers/businessNda.controller.js`, `backend/routes/businessNda.routes.js`
- Migrations `0141`–`0145` (see tasks).

**Backend — modified**
- `routes/manifest.js`, `controllers/publicWebsite.controller.js`, `routes/publicWebsite.routes.js`, `controllers/salesInbox.controller.js`, `controllers/salesIntroduction.controller.js`, `controllers/invoicing.controller.js`, `controllers/dealSettlement.controller.js`, `controllers/buyerMandate.controller.js`, `controllers/contact.controller.js`, `controllers/sales.controller.js`, `controllers/businessAssessment.controller.js`, `controllers/businessDocument.controller.js`, `routes/businessDocument.routes.js`, `routes/property.routes.js`, `services/agencyFees.service.js`, `services/partyRoleActivation.service.js`, `services/salesAgreementCompletion.service.js`, `services/wtAgreementCompletion.service.js`, `models/BuyerMandate.js`, `models/BusinessAssessment.js`, `models/BusinessDocument.js`, `package.json`.

**Admin portal — new**
- `admin-portal/src/screens/sales/categoryLock.mjs` — pure path → locked category.
- `admin-portal/scripts/testCategoryLock.mjs`
- `admin-portal/src/screens/sales/business/BusinessPropertySections.jsx` — Business Assessment, Due Diligence, Preparation and NDA sections for the property file.
- `admin-portal/src/screens/sales/business/BuyerSuitabilityCard.jsx`
- `admin-portal/src/screens/sales/business/BusinessProfileStep.jsx` — the wizard step.

**Admin portal — modified**
- `config/consoles.js`, `App.jsx`, `ui/Layout.jsx`, `screens/BusinessSaleConsole.jsx`, `screens/sales/paths.js`, `screens/PropertyWizard.jsx`, `screens/sales/SalesPropertyFile.jsx`, `screens/sales/SalesReports.jsx`, `screens/sales/SalesInbox.jsx`, `screens/sales/SalesWorkQueue.jsx`, `screens/sales/AccountingOverview.jsx`, `screens/sales/SalesInvoices.jsx`, `screens/SalesBulkSettlement.jsx`, `screens/sales/SalesIntroductions.jsx`, `screens/sales/BuyerMandates.jsx`, `screens/sales/BuyerMandateDetail.jsx`, `screens/sales/SalesContacts.jsx`, `screens/business/BusinessListings.jsx`, `screens/business/BusinessListingDetail.jsx`.
- **Deleted:** `screens/BusinessBuyConsole.jsx`, `screens/business/BusinessSaleDashboard.jsx`, `screens/business/BusinessBuyDashboard.jsx`, `screens/business/BusinessBuyReports.jsx`, `screens/business/BusinessMandates.jsx`, `screens/business/BusinessMandateDetail.jsx`, `screens/business/BusinessInvoices.jsx`.

**Website — new / modified**
- New: `website-mock/src/components/BusinessSpecs.jsx`, `website-mock/src/components/BusinessNdaRequest.jsx`, `website-mock/src/pages/BusinessDetailsPage.jsx`.
- Modified: `website-mock/src/services/api.js`, `website-mock/src/App.jsx`, `website-mock/src/pages/PropertiesPage.jsx`, `website-mock/src/pages/PropertyDetailPage.jsx`, `website-mock/src/components/FeaturedProperties.jsx`, `website-mock/src/components/PropertyDetailModal.jsx`.

---

# Phase 1 — Website fixes (ship first)

### Task 1: Production manifest parity

**Files:**
- Create: `backend/scripts/testManifestParity.js`
- Modify: `backend/routes/manifest.js`, `backend/package.json`

**Interfaces:**
- Produces: `/api/marketing` and `/api/public-website` served by the production monolith. The `npm test` chain runs the parity check.

- [ ] **Step 1: Write the failing test**

`backend/scripts/testManifestParity.js`:

```js
/**
 * Every route the dev server mounts (server.js) must also be in the production
 * manifest (routes/manifest.js). production-server.js mounts ONLY the manifest,
 * so a route missing there works locally and 404s in production.
 * Server-free: parses source, never touches the DB.
 */
const fs = require('fs');
const path = require('path');
const assert = require('assert');

const serverSrc = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8');
const manifest = require('../routes/manifest');
const inManifest = new Set(manifest.map(([p]) => p));

const devMounts = [...serverSrc.matchAll(/mount\('([^']+)',\s*'\.\/routes\/([^']+)'\)/g)].map((m) => [m[1], m[2]]);
const missing = devMounts.filter(([p]) => !inManifest.has(p));
assert.deepStrictEqual(
  missing, [],
  `Mounted in server.js but missing from routes/manifest.js:\n${missing.map((m) => `  ${m[0]} -> ${m[1]}`).join('\n')}`,
);

for (const [, mod] of manifest) require.resolve(path.join(__dirname, '..', 'routes', mod));

console.log(`manifest parity OK — ${devMounts.length} dev mounts, ${manifest.length} manifest entries`);
```

- [ ] **Step 2: Run it to verify it fails**

Run (from `backend/`): `node scripts/testManifestParity.js`
Expected: `AssertionError` listing `/api/marketing -> marketingCampaign.routes` and `/api/public-website -> publicWebsite.routes`.

- [ ] **Step 3: Add the missing mounts**

In `backend/routes/manifest.js`, directly after `['/api/communications', './communications.routes'],` add:

```js
  ['/api/marketing', './marketingCampaign.routes'],
```

and directly after `['/api/public', './publicSales.routes'],` add:

```js
  // Public website API (properties, enquiries, offers, site content). Was only in
  // server.js, so production 404'd and the live site fell back to mock data.
  ['/api/public-website', './publicWebsite.routes'],
```

(Express matches `/api/public` only when the next character is `/`, so `/api/public-website` does not collide.)

- [ ] **Step 4: Add it to the test chain**

In `backend/package.json`, change the `test` script so it starts with the parity check:

```json
"test": "node scripts/testManifestParity.js && node scripts/testBusinessDays.js && node scripts/testSalesAgreementCompletion.js && node scripts/testLeadAutomation.js && node scripts/testSalesSettlementCalculations.js && node scripts/e2eDealSalesSettlement.js",
```

- [ ] **Step 5: Run it to verify it passes**

Run: `node scripts/testManifestParity.js`
Expected: `manifest parity OK — … dev mounts, … manifest entries`

- [ ] **Step 6: Commit**

```bash
git add backend/scripts/testManifestParity.js backend/routes/manifest.js backend/package.json
git commit -m "fix(deploy): mount /api/public-website and /api/marketing in the production manifest

Both were mounted only in server.js, so the live site 404'd: the website fell back
to mock data and its enquiry/offer/contact forms failed. Adds a server-free parity
test (npm test) so a dev-only mount can't ship again.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 2: Public property detail — allowlist and published-only

Must land before (or together with) Task 1 is deployed: without it, fixing the 404 publishes every property column (owner, key holders' phones, internal remarks, coordinates) for any property id, published or not.

**Files:**
- Create: `backend/services/publicPropertyShape.js`, `backend/scripts/testPublicPropertyShape.js`, `backend/scripts/e2e/httpHarness.js`, `backend/scripts/e2e/businessParity.js`
- Modify: `backend/controllers/publicWebsite.controller.js` (`getPropertyDetails`)

**Interfaces:**
- Produces: `PUBLIC_DETAIL_FIELDS: string[]`, `isPubliclyVisible(plain): boolean`, `pickPublic(plain): object` from `services/publicPropertyShape.js`.
- Produces: `httpHarness` exports `{ login(), req(method, path, opts), ok(cond, msg, detail), finish(), STAMP }`.

- [ ] **Step 1: Write the failing unit test**

`backend/scripts/testPublicPropertyShape.js`:

```js
const assert = require('assert');
const { isPubliclyVisible, pickPublic, PUBLIC_DETAIL_FIELDS } = require('../services/publicPropertyShape');

// Visibility mirrors the public list endpoint's rule.
assert.strictEqual(isPubliclyVisible({ is_published: true }), true);
assert.strictEqual(isPubliclyVisible({ is_published: 1 }), true);
assert.strictEqual(isPubliclyVisible({ is_published: false, listing_type: 'short_term' }), true);
assert.strictEqual(isPubliclyVisible({ is_published: false, status: 'sold' }), true);
assert.strictEqual(isPubliclyVisible({ is_published: false, listing_status: 'let' }), true);
assert.strictEqual(isPubliclyVisible({ is_published: false, status: 'available', listing_status: 'draft' }), false);
assert.strictEqual(isPubliclyVisible(null), false);

// Allowlist drops private columns and keeps public ones.
const out = pickPublic({
  id: 7, title: 'T', price: 10, area: 'Gulshan', description: 'd',
  owner_contact_id: 3, access_contacts: [{ name: 'Key holder', phone: '017' }], remarks: 'internal',
  latitude: 23.7, management_fee_pct: 8, market_rent_min: 1, pm_status: 'x', branch_id: 1, created_by: 2,
});
for (const k of ['owner_contact_id', 'access_contacts', 'remarks', 'latitude', 'management_fee_pct', 'market_rent_min', 'pm_status', 'branch_id', 'created_by']) {
  assert.ok(!(k in out), `private field leaked: ${k}`);
}
assert.deepStrictEqual({ id: out.id, title: out.title, price: out.price, area: out.area }, { id: 7, title: 'T', price: 10, area: 'Gulshan' });
assert.ok(!PUBLIC_DETAIL_FIELDS.includes('owner_contact_id'));

console.log('publicPropertyShape OK');
```

- [ ] **Step 2: Run it to verify it fails**

Run: `node scripts/testPublicPropertyShape.js`
Expected: `Error: Cannot find module '../services/publicPropertyShape'`

- [ ] **Step 3: Implement the module**

`backend/services/publicPropertyShape.js`:

```js
// What the unauthenticated website may see of a property. An ALLOWLIST, not a
// denylist: any column added to properties later stays private by default.
const PUBLIC_DETAIL_FIELDS = [
  'id', 'property_code', 'title', 'slug', 'category', 'property_type', 'listing_type',
  'status', 'listing_status', 'occupancy_status', 'price', 'price_unit', 'currency', 'is_negotiable',
  'address', 'area', 'city', 'district', 'postal_code', 'country',
  'bedrooms', 'bathrooms', 'balconies', 'parking', 'drawing_rooms', 'dining_rooms',
  'land_size', 'building_size', 'floor_number', 'total_floors', 'total_units', 'building_height',
  'year_built', 'furnishing', 'property_condition', 'features', 'nearby_places', 'utilities',
  'description', 'featured_image_url', 'floor_plan_url', 'video_tour_url', 'drone_video_url',
  'virtual_tour_url', 'unit_floor_plans', 'is_featured', 'approved_monthly_rent',
  'lease_min_period_months', 'seo_title', 'seo_description', 'created_at',
];

// Same rule as getPublishedProperties' visibility filter.
const PUBLIC_STATUSES = ['sold', 'settled', 'rented', 'occupied', 'under_application', 'under_offer', 'reserved'];
const PUBLIC_LISTING_STATUSES = ['sold', 'let', 'under_offer', 'under_application'];

function isPubliclyVisible(p) {
  if (!p) return false;
  return p.is_published === true || p.is_published === 1
    || p.listing_type === 'short_term'
    || PUBLIC_STATUSES.includes(p.status)
    || PUBLIC_LISTING_STATUSES.includes(p.listing_status);
}

function pickPublic(plain) {
  const out = {};
  for (const k of PUBLIC_DETAIL_FIELDS) if (plain && plain[k] !== undefined) out[k] = plain[k];
  return out;
}

module.exports = { PUBLIC_DETAIL_FIELDS, isPubliclyVisible, pickPublic };
```

- [ ] **Step 4: Run it to verify it passes**

Run: `node scripts/testPublicPropertyShape.js`
Expected: `publicPropertyShape OK`

- [ ] **Step 5: Wire it into `getPropertyDetails`**

In `backend/controllers/publicWebsite.controller.js` add near the other requires:

```js
const { isPubliclyVisible, pickPublic } = require('../services/publicPropertyShape');
```

Inside `exports.getPropertyDetails`, directly after the line `const plain = property.get({ plain: true });` add:

```js
  // Unpublished listings are not public, whatever id is asked for.
  if (!isPubliclyVisible(plain)) {
    return res.status(404).json({ error: 'Property not found or is currently not listed.' });
  }
```

and in the `res.json({ data: { ... } })` at the end of the same function replace `      ...plain,` with:

```js
      ...pickPublic(plain),
```

Add `'backend/scripts/testPublicPropertyShape.js'` to the `test` script in `backend/package.json` right after `testManifestParity.js`.

- [ ] **Step 6: Create the shared e2e harness**

`backend/scripts/e2e/httpHarness.js`:

```js
// Shared helpers for the e2e scripts: admin login, JSON requests, PASS/FAIL log.
const http = require('http');

const PORT = Number(process.env.PORT) || 50001;
const EMAIL = process.env.E2E_EMAIL || 'admin@seventhskyproperty.com';
const PASSWORD = process.env.E2E_PASSWORD || 'Admin#2026';
const STAMP = Date.now().toString().slice(-6);
const R = { pass: 0, fail: 0 };
let TOKEN = '';

function ok(cond, msg, detail) {
  R[cond ? 'pass' : 'fail'] += 1;
  const tag = cond ? '\x1b[32mPASS\x1b[0m' : '\x1b[31mFAIL\x1b[0m';
  console.log(`${tag}\t${msg}${detail !== undefined ? `  \x1b[2m${detail}\x1b[0m` : ''}`);
  return cond;
}

function req(method, path, opts = {}) {
  return new Promise((resolve) => {
    const data = opts.body ? JSON.stringify(opts.body) : null;
    const headers = { 'X-Branch-Id': '1' };
    if (!opts.noAuth && TOKEN) headers.Authorization = `Bearer ${TOKEN}`;
    if (data) { headers['Content-Type'] = 'application/json'; headers['Content-Length'] = Buffer.byteLength(data); }
    const r = http.request({ host: '127.0.0.1', port: PORT, method, path, headers }, (x) => {
      let d = ''; x.on('data', (c) => { d += c; });
      x.on('end', () => { let j; try { j = JSON.parse(d); } catch { j = { _raw: d.slice(0, 300) }; } resolve({ status: x.statusCode, body: j }); });
    });
    r.on('error', (e) => resolve({ status: 0, body: { _err: e.message } }));
    if (data) r.write(data);
    r.end();
  });
}

async function login() {
  const r = await req('POST', '/api/auth/login', { noAuth: true, body: { email: EMAIL, password: PASSWORD } });
  TOKEN = r.body?.token || '';
  return ok(!!TOKEN, 'admin login', EMAIL);
}

function finish() {
  console.log(`\n${R.fail ? '\x1b[31m' : '\x1b[32m'}${R.pass} PASS / ${R.fail} FAIL\x1b[0m`);
  process.exit(R.fail ? 1 : 0);
}

module.exports = { login, req, ok, finish, STAMP };
```

`backend/scripts/e2e/businessParity.js` (grows in later tasks; each phase adds a `phaseN` function and a call at the bottom):

```js
/**
 * End-to-end checks for the Business Buy & Sale parity plan. Needs the API on
 * :50001 (restart it after backend changes). Creates data tagged with a run stamp.
 * Run: node scripts/e2e/businessParity.js [phase]   (no arg = all phases)
 */
const { login, req, ok, finish, STAMP } = require('./httpHarness');

const ONLY = process.argv[2] ? Number(process.argv[2]) : null;
const want = (n) => ONLY === null || ONLY === n;

async function phase1() {
  console.log('\n— Phase 1: public website —');
  const list = await req('GET', '/api/public-website/properties?limit=5', { noAuth: true });
  ok(list.status === 200, 'public list mounted', `HTTP ${list.status}`);

  const all = await req('GET', '/api/properties?limit=500');
  const rows = all.body?.data || [];
  const hidden = rows.find((p) => !p.is_published && p.listing_type !== 'short_term'
    && !['sold', 'settled', 'rented', 'occupied', 'under_application', 'under_offer', 'reserved'].includes(p.status)
    && !['sold', 'let', 'under_offer', 'under_application'].includes(p.listing_status));
  const shown = rows.find((p) => p.is_published);
  if (hidden) {
    const r = await req('GET', `/api/public-website/properties/${hidden.id}`, { noAuth: true });
    ok(r.status === 404, 'unpublished property is not public', `id ${hidden.id} → HTTP ${r.status}`);
  } else ok(true, 'no unpublished property to probe (skipped)');
  if (shown) {
    const r = await req('GET', `/api/public-website/properties/${shown.id}`, { noAuth: true });
    const d = r.body?.data || {};
    ok(r.status === 200, 'published property detail is public', `id ${shown.id}`);
    for (const k of ['owner_contact_id', 'access_contacts', 'remarks', 'latitude', 'management_fee_pct', 'branch_id']) {
      ok(!(k in d), `detail does not expose ${k}`);
    }
  }
}

(async () => {
  console.log(`\n===== BUSINESS PARITY E2E (run ${STAMP}) =====`);
  if (!(await login())) return finish();
  if (want(1)) await phase1();
  finish();
})().catch((e) => { ok(false, 'harness crashed', e.message); finish(); });
```

- [ ] **Step 7: Verify against the real server**

Restart the backend (`node server.js` from `backend/`, after stopping the running one), then run: `node scripts/e2e/businessParity.js 1`
Expected: all PASS, including `unpublished property is not public` and every `detail does not expose …`.

- [ ] **Step 8: Commit**

```bash
git add backend/services/publicPropertyShape.js backend/scripts/testPublicPropertyShape.js backend/scripts/e2e/httpHarness.js backend/scripts/e2e/businessParity.js backend/controllers/publicWebsite.controller.js backend/package.json
git commit -m "fix(website): public property detail is published-only and allowlisted

getPropertyDetails returned every column of any property by id, published or not
(owner, key-holder phones, internal remarks, coordinates). Now it 404s for
unlisted properties and returns only an allowlist of public fields.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

- [ ] **Step 9: Deploy Phase 1 early (ask the user first)**

Phase 1 fixes the live website today. Ask the user whether to deploy it now, before the remaining phases. If yes, follow Task 19 Steps 6–9 (stash the other contributor's files, merge into `production`, push, confirm the Hostinger build completes, restore).

---

# Phase 2 — Business Sale & Buyer consoles on the shared engine

### Task 3: One list of sales agreement types (adds business)

Business agreements (`business_sale_agreement`, `business_purchase_agreement`) are missing from eight hard-coded lists, so signing them drafts no fee invoices, activates no party roles, feeds no settlement agency fees and is filtered out of Buyer Invoices.

**Files:**
- Create: `backend/utils/saleAgreementTypes.js`, `backend/scripts/testSaleAgreementTypes.js`
- Modify: `backend/controllers/buyerMandate.controller.js:146`, `backend/controllers/invoicing.controller.js:428-433`, `backend/controllers/sales.controller.js:535`, `backend/services/agencyFees.service.js:34`, `backend/services/partyRoleActivation.service.js:379`, `backend/services/salesAgreementCompletion.service.js:13,77`, `backend/services/wtAgreementCompletion.service.js:28`, `backend/package.json`

**Interfaces:**
- Produces: `SALE_SIDE`, `PURCHASE_SIDE`, `ALL_SALES_AGREEMENTS` (string arrays) from `utils/saleAgreementTypes.js`.

- [ ] **Step 1: Write the failing test**

`backend/scripts/testSaleAgreementTypes.js`:

```js
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { SALE_SIDE, PURCHASE_SIDE, ALL_SALES_AGREEMENTS } = require('../utils/saleAgreementTypes');

assert.ok(SALE_SIDE.includes('business_sale_agreement'));
assert.ok(PURCHASE_SIDE.includes('business_purchase_agreement'));
for (const t of ['sale_sale_agreement', 'commercial_sale_agreement']) assert.ok(SALE_SIDE.includes(t));
for (const t of ['sale_purchase_agreement', 'commercial_purchase_agreement']) assert.ok(PURCHASE_SIDE.includes(t));
assert.strictEqual(ALL_SALES_AGREEMENTS.length, SALE_SIDE.length + PURCHASE_SIDE.length);

// No consumer may keep its own copy of the list (that is how business got missed).
const consumers = [
  'controllers/buyerMandate.controller.js', 'controllers/invoicing.controller.js', 'controllers/sales.controller.js',
  'services/agencyFees.service.js', 'services/partyRoleActivation.service.js',
  'services/salesAgreementCompletion.service.js', 'services/wtAgreementCompletion.service.js',
];
for (const rel of consumers) {
  const src = fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');
  assert.ok(!/'commercial_(sale|purchase)_agreement'/.test(src), `${rel} still hard-codes a commercial agreement type`);
}
console.log('saleAgreementTypes OK');
```

- [ ] **Step 2: Run it to verify it fails**

Run: `node scripts/testSaleAgreementTypes.js`
Expected: `Cannot find module '../utils/saleAgreementTypes'`

- [ ] **Step 3: Create the constant**

`backend/utils/saleAgreementTypes.js`:

```js
// Every sales-engine agreement type, by side. The ONE list: signature handling,
// fee invoicing, agency fees and invoice scoping all read it, so a new category
// can't be forgotten in one of them.
const SALE_SIDE = ['sale_sale_agreement', 'commercial_sale_agreement', 'business_sale_agreement'];
const PURCHASE_SIDE = ['sale_purchase_agreement', 'commercial_purchase_agreement', 'business_purchase_agreement'];
const ALL_SALES_AGREEMENTS = [...PURCHASE_SIDE, ...SALE_SIDE];

module.exports = { SALE_SIDE, PURCHASE_SIDE, ALL_SALES_AGREEMENTS };
```

- [ ] **Step 4: Replace each hard-coded list**

Add `const { SALE_SIDE, PURCHASE_SIDE, ALL_SALES_AGREEMENTS } = require('../utils/saleAgreementTypes');` (import only the names each file uses) at the top of each file, then:

- `controllers/buyerMandate.controller.js` line 146: `related_type: ['sale_purchase_agreement', 'commercial_purchase_agreement']` → `related_type: PURCHASE_SIDE`
- `controllers/invoicing.controller.js` lines 428–433, replace the object with:

```js
const SCOPE_RELATED = {
  pm: ['property_management_agreement', 'tenancy_management_agreement'],
  sales: ALL_SALES_AGREEMENTS,
  purchase: PURCHASE_SIDE,
  sale: SALE_SIDE,
};
```

- `controllers/sales.controller.js` line 535: `related_type: { [Op.in]: [...four types...] }` → `related_type: { [Op.in]: ALL_SALES_AGREEMENTS }`
- `services/agencyFees.service.js` line 34: `related_type: ['sale_sale_agreement', 'commercial_sale_agreement']` → `related_type: SALE_SIDE`
- `services/partyRoleActivation.service.js` line 379: `if ([...four types...].includes(envelope.related_type))` → `if (ALL_SALES_AGREEMENTS.includes(envelope.related_type))`
- `services/salesAgreementCompletion.service.js` line 13: `const SALE_RELATED = [...]` → `const SALE_RELATED = ALL_SALES_AGREEMENTS;`; line 77: `['sale_sale_agreement', 'commercial_sale_agreement'].includes(envelope.related_type)` → `SALE_SIDE.includes(envelope.related_type)`
- `services/wtAgreementCompletion.service.js` line 28: `if ([...four types...].includes(t)) return 'client';` → `if (ALL_SALES_AGREEMENTS.includes(t)) return 'client';`

(Services live in `services/`, so their require path is `'../utils/saleAgreementTypes'` as well.)

- [ ] **Step 5: Run the tests**

Run: `node scripts/testSaleAgreementTypes.js && node scripts/testSalesAgreementCompletion.js`
Expected: `saleAgreementTypes OK`, then the existing completion test passes unchanged.

Add `node scripts/testSaleAgreementTypes.js` to the `test` script in `backend/package.json` after `testPublicPropertyShape.js`.

- [ ] **Step 6: Commit**

```bash
git add backend/utils/saleAgreementTypes.js backend/scripts/testSaleAgreementTypes.js backend/controllers/buyerMandate.controller.js backend/controllers/invoicing.controller.js backend/controllers/sales.controller.js backend/services/agencyFees.service.js backend/services/partyRoleActivation.service.js backend/services/salesAgreementCompletion.service.js backend/services/wtAgreementCompletion.service.js backend/package.json
git commit -m "refactor(sales): one list of sales agreement types, now including business

Eight places hard-coded the residential/commercial agreement types, so signed
business sale/purchase agreements drafted no fee invoices and were filtered out
of Buyer Invoices. They all read utils/saleAgreementTypes now.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 4: Backend category scoping (+ buyer mandate category)

**Files:**
- Create: `backend/utils/salesCategory.js`, `backend/scripts/testSalesCategory.js`, `backend/migrations/0141-buyer-mandate-category-suitability.js`
- Modify: `backend/models/BuyerMandate.js`, `backend/controllers/buyerMandate.controller.js`, `backend/controllers/salesInbox.controller.js`, `backend/controllers/salesIntroduction.controller.js`, `backend/controllers/invoicing.controller.js`, `backend/controllers/dealSettlement.controller.js`, `backend/controllers/contact.controller.js`, `backend/scripts/e2e/businessParity.js`, `backend/package.json`

**Interfaces:**
- Produces: `salesCategory(value): 'residential'|'commercial'|'rural'|'business'|null`, `propertyIdsInCategory(category, scope): Promise<number[]>` from `utils/salesCategory.js`.
- Produces: `buyer_mandates.category` (STRING 20, nullable) and `buyer_mandates.suitability` (JSON, nullable); `MANDATE_FIELDS` accepts both.
- Produces: `?category=` on `GET /api/sales/inbox`, `/api/sales/introductions`, `/api/invoices`, `/api/deals/settlement/sales-bulk-data`, `/api/buyer-mandates`; `/api/contacts` accepts `category=business`. (`/api/sales/accounting-overview` and `/api/sales/work-queue` already honour it via `scanSettlements`.)

- [ ] **Step 1: Write the failing unit test**

`backend/scripts/testSalesCategory.js`:

```js
const assert = require('assert');
const { salesCategory, SALES_CATEGORIES } = require('../utils/salesCategory');

assert.deepStrictEqual(SALES_CATEGORIES, ['residential', 'commercial', 'rural', 'business']);
assert.strictEqual(salesCategory('business'), 'business');
assert.strictEqual(salesCategory('BUSINESS'), 'business');
assert.strictEqual(salesCategory('commercial'), 'commercial');
assert.strictEqual(salesCategory('business_rent'), null);
assert.strictEqual(salesCategory(''), null);
assert.strictEqual(salesCategory(undefined), null);
assert.strictEqual(salesCategory("x' OR 1=1"), null);
console.log('salesCategory OK');
```

- [ ] **Step 2: Run it to verify it fails**

Run: `node scripts/testSalesCategory.js`
Expected: `Cannot find module '../utils/salesCategory'`

- [ ] **Step 3: Implement the helper**

`backend/utils/salesCategory.js`:

```js
// Sales-engine category scoping. Unknown values are ignored (null), never an
// error, and a request without a category behaves exactly as before.
const SALES_CATEGORIES = ['residential', 'commercial', 'rural', 'business'];

function salesCategory(value) {
  const v = String(value == null ? '' : value).toLowerCase();
  return SALES_CATEGORIES.includes(v) ? v : null;
}

// Property ids in a category (branch-scoped) — for tables that only link a property.
async function propertyIdsInCategory(category, scope = {}) {
  const Property = require('../models/Property');
  const rows = await Property.findAll({ where: { ...scope, category }, attributes: ['id'], raw: true });
  return rows.map((r) => Number(r.id));
}

module.exports = { SALES_CATEGORIES, salesCategory, propertyIdsInCategory };
```

- [ ] **Step 4: Run it to verify it passes**

Run: `node scripts/testSalesCategory.js`
Expected: `salesCategory OK`. Add `node scripts/testSalesCategory.js` to the `test` script after `testSaleAgreementTypes.js`.

- [ ] **Step 5: Migration for buyer mandate category + suitability**

`backend/migrations/0141-buyer-mandate-category-suitability.js`:

```js
'use strict';

/**
 * Migration 0141: buyer mandates get a sales category (so the Business buyer
 * console can show only business mandates) and a suitability assessment
 * (Business Purchase SOP Step 2). Existing rows keep category NULL, which the
 * residential/commercial consoles never filter on — behaviour unchanged.
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    const t = await queryInterface.describeTable('buyer_mandates');
    if (!t.category) await queryInterface.addColumn('buyer_mandates', 'category', { type: Sequelize.STRING(20), allowNull: true });
    if (!t.suitability) await queryInterface.addColumn('buyer_mandates', 'suitability', { type: Sequelize.JSON, allowNull: true });
    const idx = await queryInterface.showIndex('buyer_mandates');
    if (!idx.some((i) => i.name === 'buyer_mandates_category')) await queryInterface.addIndex('buyer_mandates', ['category'], { name: 'buyer_mandates_category' });
  },
  down: async (queryInterface) => {
    await queryInterface.removeIndex('buyer_mandates', 'buyer_mandates_category').catch(() => {});
    await queryInterface.removeColumn('buyer_mandates', 'suitability').catch(() => {});
    await queryInterface.removeColumn('buyer_mandates', 'category').catch(() => {});
  },
};
```

In `backend/models/BuyerMandate.js` add two attributes next to `notes`:

```js
  category: DataTypes.STRING(20),      // sales category (business mandates only, 0141)
  suitability: DataTypes.JSON,         // Business Purchase SOP Step 2 (0141)
```

Run (from `backend/`): `npm run db:migrate` — expected `0141-buyer-mandate-category-suitability: migrated`.

- [ ] **Step 6: Scope the buyer mandate list and accept the new fields**

In `backend/controllers/buyerMandate.controller.js`:
- Add `'category', 'suitability'` to the end of the `MANDATE_FIELDS` array (line 12).
- Add `const { salesCategory } = require('../utils/salesCategory');` at the top.
- In `exports.list`, after `if (req.query.assigned_to) where.assigned_to = req.query.assigned_to;` add:

```js
  const category = salesCategory(req.query.category);
  if (category) where.category = category;
```

- In `exports.create`, after `const data = pick(req.body, MANDATE_FIELDS);` add:

```js
  data.category = salesCategory(data.category) || salesCategory(req.query.category) || null;
```

- [ ] **Step 7: Scope the inbox**

In `backend/controllers/salesInbox.controller.js` add `const { salesCategory, propertyIdsInCategory } = require('../utils/salesCategory');` at the top. In `exports.inbox`, replace the line

```js
  const enqWhere = { ...scope }; if (property_id) enqWhere.property_id = Number(property_id);
```

with

```js
  const enqWhere = { ...scope }; if (property_id) enqWhere.property_id = Number(property_id);
  const category = salesCategory(req.query.category);
  const catIds = category ? new Set(await propertyIdsInCategory(category, scope)) : null;
  if (catIds && !property_id) enqWhere.property_id = { [Op.in]: catIds.size ? [...catIds] : [0] };
```

and directly after `let out = items;` add:

```js
  if (catIds) out = out.filter((i) => i.property_id && catIds.has(Number(i.property_id)));
```

- [ ] **Step 8: Scope introductions, invoices and bulk settlements**

`backend/controllers/salesIntroduction.controller.js` — add at the top:

```js
const { Op } = require('sequelize');
const { salesCategory, propertyIdsInCategory } = require('../utils/salesCategory');
```

and in `exports.list` after `if (req.query.status) where.status = req.query.status;` add:

```js
  const category = salesCategory(req.query.category);
  if (category && !where.property_id) {
    const ids = await propertyIdsInCategory(category, branchScope(req));
    where.property_id = { [Op.in]: ids.length ? ids : [0] };
  }
```

`backend/controllers/invoicing.controller.js` — add `const { salesCategory, propertyIdsInCategory } = require('../utils/salesCategory');` at the top, and in `exports.list` after `if (req.query.property_id) where.property_id = req.query.property_id;` add:

```js
  const category = salesCategory(req.query.category);
  if (category && !where.property_id) {
    const ids = await propertyIdsInCategory(category, branchScope(req));
    where.property_id = { [Op.in]: ids.length ? ids : [0] };
  }
```

`backend/controllers/dealSettlement.controller.js` — add at the top (keep an existing `Op` import if one is already there):

```js
const { Op } = require('sequelize');
const { salesCategory, propertyIdsInCategory } = require('../utils/salesCategory');
```

and in `exports.salesBulkData` after `if (req.query.deal_type) where.deal_type = req.query.deal_type;` add:

```js
  const category = salesCategory(req.query.category);
  if (category) {
    const ids = await propertyIdsInCategory(category, branchScope(req));
    where.property_id = { [Op.in]: ids.length ? ids : [0] };
  }
```

- [ ] **Step 9: Let contacts filter to business**

In `backend/controllers/contact.controller.js` line 177 replace

```js
  if (req.query.category === 'commercial' || req.query.category === 'residential') {
```

with

```js
  if (['commercial', 'residential', 'business'].includes(req.query.category)) {
```

- [ ] **Step 10: E2E — scoping works and nothing else changes**

Append to `backend/scripts/e2e/businessParity.js` (above the final IIFE) and add `if (want(2)) await phase2();` inside it after the phase 1 call:

```js
async function phase2() {
  console.log('\n— Phase 2: category scoping —');
  // A business property + a commercial property to tell apart.
  const biz = await req('POST', '/api/properties', { body: { title: `E2E Biz ${STAMP}`, category: 'business', property_type: 'Business', listing_type: 'sale' } });
  const com = await req('POST', '/api/properties', { body: { title: `E2E Com ${STAMP}`, category: 'commercial', property_type: 'Office', listing_type: 'sale' } });
  const bizId = biz.body?.data?.id; const comId = com.body?.data?.id;
  ok(!!bizId && !!comId, 'fixture properties created', `${bizId} / ${comId}`);

  const endpoints = [
    ['inbox', '/api/sales/inbox', (b) => b.data],
    ['introductions', '/api/sales/introductions', (b) => b.data],
    ['invoices', '/api/invoices?invoice_type=agreement_fee&scope=sales', (b) => b.data],
    ['bulk settlements', '/api/deals/settlement/sales-bulk-data', (b) => b.data],
    ['work queue', '/api/sales/work-queue', (b) => b.data?.items],
    ['buyer mandates', '/api/buyer-mandates', (b) => b.data],
  ];
  for (const [name, path, rowsOf] of endpoints) {
    const sep = path.includes('?') ? '&' : '?';
    const plain = await req('GET', path);
    const scoped = await req('GET', `${path}${sep}category=business`);
    const bogus = await req('GET', `${path}${sep}category=nonsense`);
    ok(plain.status === 200 && scoped.status === 200, `${name}: plain + business both 200`, `${plain.status}/${scoped.status}`);
    const all = rowsOf(plain.body) || []; const onlyBiz = rowsOf(scoped.body) || []; const ignored = rowsOf(bogus.body) || [];
    ok(onlyBiz.length <= all.length, `${name}: business ⊆ all`, `${onlyBiz.length} ≤ ${all.length}`);
    ok(ignored.length === all.length, `${name}: unknown category ignored (same as no param)`, `${ignored.length} = ${all.length}`);
    const leaked = onlyBiz.filter((r) => r.property_id && Number(r.property_id) === Number(comId));
    ok(leaked.length === 0, `${name}: no commercial fixture rows in business view`);
  }
  const acct = await req('GET', '/api/sales/accounting-overview?category=business');
  ok(acct.status === 200, 'accounting overview accepts category', `HTTP ${acct.status}`);
  const m = await req('POST', '/api/buyer-mandates?category=business', { body: { notes: `E2E mandate ${STAMP}` } });
  ok(m.body?.data?.category === 'business', 'mandate created in business console is category business', m.body?.data?.category);
}
```

Restart the backend, then run: `node scripts/e2e/businessParity.js 2`
Expected: all PASS. (If the mandate create response shape differs, read `m.body` and assert on the returned mandate's `category`; do not weaken the check.)

- [ ] **Step 11: Commit**

```bash
git add backend/utils/salesCategory.js backend/scripts/testSalesCategory.js backend/migrations/0141-buyer-mandate-category-suitability.js backend/models/BuyerMandate.js backend/controllers/buyerMandate.controller.js backend/controllers/salesInbox.controller.js backend/controllers/salesIntroduction.controller.js backend/controllers/invoicing.controller.js backend/controllers/dealSettlement.controller.js backend/controllers/contact.controller.js backend/scripts/e2e/businessParity.js backend/package.json
git commit -m "feat(sales): optional ?category= scoping on inbox, introductions, invoices, bulk settlements, mandates

Lets the Business consoles show only business records. Without the param every
endpoint behaves exactly as before. Buyer mandates gain category + suitability
(migration 0141).

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 5: Frontend category lock for shared screens

**Files:**
- Create: `admin-portal/src/screens/sales/categoryLock.mjs`, `admin-portal/scripts/testCategoryLock.mjs`
- Modify: `admin-portal/src/screens/sales/paths.js`, `SalesReports.jsx`, `SalesInbox.jsx`, `SalesWorkQueue.jsx`, `AccountingOverview.jsx`, `SalesInvoices.jsx`, `admin-portal/src/screens/SalesBulkSettlement.jsx`, `SalesIntroductions.jsx`, `BuyerMandates.jsx`, `SalesContacts.jsx`

**Interfaces:**
- Consumes: the `?category=` params from Task 4.
- Produces: `lockedCategoryForPath(pathname): 'business'|null` (categoryLock.mjs) and `useSalesCategory(): 'business'|null` (paths.js).

- [ ] **Step 1: Write the failing test**

`admin-portal/scripts/testCategoryLock.mjs`:

```js
import assert from 'node:assert';
import { lockedCategoryForPath } from '../src/screens/sales/categoryLock.mjs';

assert.strictEqual(lockedCategoryForPath('/business/sell'), 'business');
assert.strictEqual(lockedCategoryForPath('/business/reports'), 'business');
assert.strictEqual(lockedCategoryForPath('/business'), 'business');
assert.strictEqual(lockedCategoryForPath('/business-rent/listings'), null);
assert.strictEqual(lockedCategoryForPath('/business-registration'), null);
assert.strictEqual(lockedCategoryForPath('/commercial/reports'), null);
assert.strictEqual(lockedCategoryForPath('/residential/sell'), null);
assert.strictEqual(lockedCategoryForPath(''), null);
assert.strictEqual(lockedCategoryForPath(undefined), null);
console.log('categoryLock OK');
```

- [ ] **Step 2: Run it to verify it fails**

Run (from `admin-portal/`): `node scripts/testCategoryLock.mjs`
Expected: `ERR_MODULE_NOT_FOUND … categoryLock.mjs`

- [ ] **Step 3: Implement**

`admin-portal/src/screens/sales/categoryLock.mjs`:

```js
// Which sales category a console locks its shared screens to, from the URL.
// Only Business locks: Commercial/Residential keep showing every category, as
// before. /business-rent and /business-registration are other products.
export function lockedCategoryForPath(pathname) {
  return /^\/business(\/|$)/.test(String(pathname || '')) ? 'business' : null;
}
```

In `admin-portal/src/screens/sales/paths.js` add at the top:

```js
import { useLocation } from 'react-router-dom';
import { lockedCategoryForPath } from './categoryLock.mjs';
```

and at the bottom:

```js
/** The category the current console locks shared sales screens to ('business' or null). */
export function useSalesCategory() {
  const { pathname } = useLocation();
  return lockedCategoryForPath(pathname);
}
```

- [ ] **Step 4: Run it to verify it passes**

Run: `node scripts/testCategoryLock.mjs`
Expected: `categoryLock OK`

- [ ] **Step 5: Lock each shared screen**

Each file imports the hook (`import { useSalesCategory } from './paths';`, or `'./sales/paths'` from `screens/SalesBulkSettlement.jsx`) and declares `const locked = useSalesCategory();` at the top of the component.

`SalesReports.jsx`:
- `const [category, setCategory] = useState('');` → `const [category, setCategory] = useState(locked || '');` (declare `locked` above it).
- Replace the category `<select …> … </select>` (lines ~1468–1489, the one with `id={categorySelectId}`) and its `<label>` with:

```jsx
              {locked ? (
                <span style={{ fontSize: 12, fontWeight: 600 }}>Business only</span>
              ) : (
                <>
                  <label htmlFor={categorySelectId} className="sr-only">Filter Category</label>
                  {/* existing <select id={categorySelectId} …>…</select> unchanged */}
                </>
              )}
```

(keep the existing `<select>` element verbatim where the comment is).

`SalesInbox.jsx` — in `load`, replace

```js
      const p = new URLSearchParams(); if (q) p.set('q', q); if (status) p.set('status', status); if (mine) p.set('mine', '1');
```

with

```js
      const p = new URLSearchParams(); if (q) p.set('q', q); if (status) p.set('status', status); if (mine) p.set('mine', '1');
      if (locked) p.set('category', locked);
```

and add `locked` to that `useCallback`'s dependency array.

`SalesWorkQueue.jsx` — line 140 replace

```js
      const { data } = await api.get(`/sales/work-queue${scope === 'all' ? '?scope=all' : ''}`);
```

with

```js
      const { data } = await api.get('/sales/work-queue', { params: { ...(scope === 'all' ? { scope: 'all' } : {}), ...(locked ? { category: locked } : {}) } });
```

(add `locked` to the dependency array) and line 102 `api.get('/sales/dashboard?category=residential')` → ``api.get(`/sales/dashboard?category=${locked || 'residential'}`)``.

`AccountingOverview.jsx` line 25: `api.get('/sales/accounting-overview')` → `api.get('/sales/accounting-overview', { params: locked ? { category: locked } : {} })`.

`SalesInvoices.jsx` — after `const q = new URLSearchParams({ invoice_type: 'agreement_fee', scope: kind || 'sales' });` add `if (locked) q.set('category', locked);` and add `locked` to the `useCallback` deps.

`screens/SalesBulkSettlement.jsx` line 35: `api.get('/deals/settlement/sales-bulk-data')` → `api.get('/deals/settlement/sales-bulk-data', { params: locked ? { category: locked } : {} })`.

`SalesIntroductions.jsx` — after `if (expiry) q.set('expiry', expiry);` add `if (locked) q.set('category', locked);` (deps too). Also change the component signature so the property-file link stays in the console: `export default function SalesIntroductions({ category: categoryProp = 'residential' }) {` then `const category = locked || categoryProp;` directly after `locked`.

`BuyerMandates.jsx` — line 30 `api.get('/buyer-mandates')` → `api.get('/buyer-mandates', { params: locked ? { category: locked } : {} })`; line 39 `api.post('/buyer-mandates', f)` → `api.post('/buyer-mandates', locked ? { ...f, category: locked } : f)`.

`SalesContacts.jsx` — line 320 `` api.get(`/contacts?limit=500&scope=${encodeURIComponent(contactScopeParam)}`) `` → `` api.get(`/contacts?limit=500&scope=${encodeURIComponent(contactScopeParam)}${locked ? `&category=${locked}` : ''}`) ``; and in the `api.post('/contacts', { … })` at line 1207 add `...(locked ? { category: locked } : {}),` as the first key of the body.

- [ ] **Step 6: Build**

Run (from `admin-portal/`): `npm run build`
Expected: `✓ built` with no unresolved imports.

- [ ] **Step 7: Commit**

```bash
git add admin-portal/src/screens/sales/categoryLock.mjs admin-portal/scripts/testCategoryLock.mjs admin-portal/src/screens/sales/paths.js admin-portal/src/screens/sales/SalesReports.jsx admin-portal/src/screens/sales/SalesInbox.jsx admin-portal/src/screens/sales/SalesWorkQueue.jsx admin-portal/src/screens/sales/AccountingOverview.jsx admin-portal/src/screens/sales/SalesInvoices.jsx admin-portal/src/screens/SalesBulkSettlement.jsx admin-portal/src/screens/sales/SalesIntroductions.jsx admin-portal/src/screens/sales/BuyerMandates.jsx admin-portal/src/screens/sales/SalesContacts.jsx
git commit -m "feat(sales): shared screens lock to category=business inside /business/*

Reports, inbox, work queue, accounting, invoices, bulk settlements, introductions,
mandates and contacts send category=business when opened in a Business console.
Other consoles are unchanged.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 6: Business Sale & Buyer consoles, routes, sidebar, retirement

**Files:**
- Modify: `admin-portal/src/config/consoles.js`, `admin-portal/src/screens/BusinessSaleConsole.jsx`, `admin-portal/src/App.jsx`, `admin-portal/src/ui/Layout.jsx`, `admin-portal/src/screens/PropertyWizard.jsx`, `admin-portal/src/screens/sales/SalesPropertyFile.jsx:2348`, `admin-portal/src/screens/business/BusinessListings.jsx:45,79`, `admin-portal/src/screens/business/BusinessListingDetail.jsx`
- Delete: `admin-portal/src/screens/BusinessBuyConsole.jsx`, `admin-portal/src/screens/business/BusinessSaleDashboard.jsx`, `BusinessBuyDashboard.jsx`, `BusinessBuyReports.jsx`, `BusinessMandates.jsx`, `BusinessMandateDetail.jsx`, `BusinessInvoices.jsx`

**Interfaces:**
- Consumes: `useSalesCategory` (Task 5), existing `salesBase('business') === '/business'` in `paths.js`.
- Produces: consoles `businessSaleConsole` (slug `business`) and `businessBuyerConsole`; wrappers `BusinessSaleConsole` (default export) and `BusinessBuyerConsole` (named export).

- [ ] **Step 1: Replace the business navs and consoles**

In `admin-portal/src/config/consoles.js`, delete `BUSINESS_SALE_NAV`, `BUSINESS_BUY_NAV`, `businessBuyConsole` and the old `businessSaleConsole` (keep `BUSINESS_RENT_NAV`, `businessBrand`, `businessRentConsole`). Add:

```js
/* ── Business Sale / Buyer — Commercial's two consoles, item for item, rendered
 * with category="business" and rebased onto /business/* (salesBase('business')).
 * Shared screens lock to business records via useSalesCategory(). ── */
export const BUSINESS_SALE_NAV = [
  { key: 'biz-home', label: 'Home', items: [
    { to: '/business/sell', label: 'Sale Dashboard', icon: LayoutGrid, end: true },
    { to: '/business/work-queue', label: 'My Work Queue', icon: Inbox },
    { to: '/business/inbox', label: 'Sales Inbox', icon: Inbox },
    { to: '/business/calendar', label: 'Calendar', icon: CalendarDays },
    { to: '/business/reports', label: 'Reports', icon: BarChart3 },
    { to: '/business/contacts', label: 'Contacts', icon: Users },
    { to: '/business/marketing', label: 'Marketing', icon: Megaphone },
  ] },
  { key: 'biz-selling', label: 'Selling', items: [
    { to: '/business/properties', label: 'Properties', icon: Building2 },
    { to: '/business/agreements/sale', label: 'Sale Agreements', icon: FileSignature },
    { to: '/business/price-schedule', label: 'Price Schedule', icon: Tags },
  ] },
  { key: 'biz-assurance', label: 'Assurance', items: [
    { to: '/business/compliance?category=business', label: 'Compliance', icon: ShieldCheck },
    { to: '/business/contracts', label: 'Contracts', icon: FileText },
    { to: '/business/introductions', label: 'Introductions', icon: ShieldCheck },
    { to: '/business/workflows?vertical_key=business_sale', label: 'Checklists / Workflows', icon: Folder },
  ] },
  { key: 'biz-money', label: 'Money', items: [
    { to: '/business/accounting', label: 'Accounting', icon: Landmark },
    { to: '/business/settlements', label: 'Settlements (Bulk)', icon: HandCoins },
  ] },
  { key: 'biz-switch', label: 'Switch', items: [
    { to: '/business/buyer-service', label: '→ Buyer Service', icon: Briefcase },
  ] },
];

export const BUSINESS_BUYER_NAV = [
  { key: 'biz-buyer-home', label: 'Home', items: [
    { to: '/business/buyer-service', label: 'Buyer Dashboard', icon: LayoutGrid, end: true },
    { to: '/business/buyer/work-queue', label: 'My Work Queue', icon: Inbox },
    { to: '/business/buyer/calendar', label: 'Calendar', icon: CalendarDays },
    { to: '/business/enquiry', label: 'Buyer Enquiries', icon: MessageSquareQuote },
  ] },
  { key: 'biz-buying', label: 'Buying', items: [
    { to: '/business/buy', label: 'Buy Deals', icon: Briefcase },
    { to: '/business/mandates', label: 'Buyer Mandates', icon: ClipboardList },
    { to: '/business/agreements/purchase', label: 'Purchase Agreements', icon: FileSignature },
  ] },
  { key: 'biz-directory', label: 'Directory & Money', items: [
    { to: '/business/buyer/contacts', label: 'Contacts', icon: Users },
    { to: '/business/buyer-invoices', label: 'Buyer Invoices', icon: Landmark },
  ] },
  { key: 'biz-buyer-switch', label: 'Switch', items: [
    { to: '/business/sell', label: '→ Sale Dashboard', icon: LayoutGrid },
  ] },
];

export const businessSaleConsole = {
  slug: 'business',
  storageKey: 'biz.sale.nav.collapsed',
  brand: businessBrand('Business Sale', '#7c3aed', '#6d28d9', '#5b21b6', 'rgba(124,58,237,.12)', '#ede9fe'),
  navGroups: BUSINESS_SALE_NAV,
  api: {},
  contentClass: 'pm-scope',
  exitTo: '/dashboard',
};

export const businessBuyerConsole = {
  ...businessSaleConsole,
  storageKey: 'biz.buyer.nav.collapsed',
  brand: businessBrand('Business Buyer Service', '#4f46e5', '#4338ca', '#3730a3', 'rgba(79,70,229,.12)', '#e0e7ff'),
  navGroups: BUSINESS_BUYER_NAV,
};
```

In `BUSINESS_RENT_NAV`'s Switch group change the two targets to `'/business/sell'` (label `→ Sell a Business`) and `'/business/buyer-service'` (label `→ Buy a Business`). In the `CONSOLES` map delete the `'business-buy': businessBuyConsole,` line. Confirm every icon used above is already imported at the top of `consoles.js` (all are used by `COMMERCIAL_NAV`/`COMMERCIAL_BUYER_NAV`).

- [ ] **Step 2: Console wrappers**

Replace the body of `admin-portal/src/screens/BusinessSaleConsole.jsx` with:

```jsx
import React from 'react';
import ServiceConsole from '../ui/ServiceConsole';
import { businessSaleConsole, businessBuyerConsole } from '../config/consoles';

/* Business Sale / Buyer — Commercial's two consoles rendered for category="business". */
export default function BusinessSaleConsole() {
  return <ServiceConsole config={businessSaleConsole} />;
}

export function BusinessBuyerConsole() {
  return <ServiceConsole config={businessBuyerConsole} />;
}
```

Delete `admin-portal/src/screens/BusinessBuyConsole.jsx`.

- [ ] **Step 3: Routes**

In `admin-portal/src/App.jsx`:
- Imports: `import BusinessSaleConsole, { BusinessBuyerConsole } from './screens/BusinessSaleConsole';` (replacing the separate `BusinessSaleConsole` and `BusinessBuyConsole` imports). Delete the imports of `BusinessSaleDashboard`, `BusinessBuyDashboard`, `BusinessBuyReports`, `BusinessMandates`, `BusinessMandateDetail`, `BusinessInvoices`. Keep `BusinessListings`, `BusinessListingDetail`, `BusinessEnquiries`, `BusinessReports`, `BusinessRentDashboard`, `BusinessRentConsole`, `BrmAgreements`, `BtmAgreements`.
- Replace the "Business SALE console" block, the "Business BUY console" block and the "Back-compat" redirect block with:

```jsx
            {/* ── Business SALE — Commercial's sale console, category="business",
                rebased onto /business/*. ── */}
            <Route element={<RequireAuth><AdminGate><BusinessSaleConsole /></AdminGate></RequireAuth>}>
              <Route path="/business" element={<Navigate to="/business/sell" replace />} />
              <Route path="/business/sell" element={<PropertySellDashboard category="business" title="Business · Sale" desc="Business sale service — listings, sellers, agreements, commission and settlement." />} />
              <Route path="/business/properties" element={<SalesProperties category="business" title="Business · Businesses for Sale" desc="Businesses engaged for sale — lifecycle stages, seller representation and business files." />} />
              <Route path="/business/property/:id" element={<SalesPropertyFile />} />
              <Route path="/business/property/:id/settlement" element={<SettlementDesk />} />
              <Route path="/business/properties/new" element={<PropertyWizard />} />
              <Route path="/business/properties/new/:id" element={<PropertyWizard />} />
              <Route path="/business/compliance" element={<Compliance />} />
              <Route path="/business/workflows" element={<Projects />} />
              <Route path="/business/settlements" element={<SalesBulkSettlement />} />
              <Route path="/business/accounting" element={<AccountingOverview />} />
              <Route path="/business/work-queue" element={<SalesWorkQueue />} />
              <Route path="/business/introductions" element={<SalesIntroductions category="business" />} />
              <Route path="/business/calendar" element={<SalesCalendar category="business" />} />
              <Route path="/business/agreements/sale" element={<SaleAgreements category="business" />} />
              <Route path="/business/price-schedule" element={<SalesPriceSchedule scope="business" title="Business · Price Schedules" />} />
              <Route path="/business/contracts" element={<SalesContracts />} />
              <Route path="/business/inbox" element={<SalesInbox />} />
              <Route path="/business/reports" element={<SalesReports />} />
              <Route path="/business/contacts" element={<SalesContacts scope="sales" />} />
              <Route path="/business/marketing" element={<SalesMarketingHub />} />
              <Route path="/business/contacts/clients" element={<Clients />} />
              <Route path="/business/clients" element={<Navigate to="/business/contacts/clients" replace />} />
            </Route>

            {/* ── Business BUYER service — Commercial's buyer console, category="business". ── */}
            <Route element={<RequireAuth><AdminGate><BusinessBuyerConsole /></AdminGate></RequireAuth>}>
              <Route path="/business/buyer-service" element={<BuyerServiceDashboard />} />
              <Route path="/business/buyer/work-queue" element={<SalesWorkQueue dealScope="buy" />} />
              <Route path="/business/buyer/calendar" element={<SalesCalendar category="business" scope="buy" />} />
              <Route path="/business/buyer/contacts" element={<SalesContacts scope="buy" />} />
              <Route path="/business/buyer/marketing" element={<SalesMarketingHub scope="buy" />} />
              <Route path="/business/buyer/clients" element={<Clients />} />
              <Route path="/business/buyer-invoices" element={<BuyerInvoices />} />
              <Route path="/business/buy" element={<DealsBoard category="business" dealType="buy" title="Business · Buy" desc="Business buyer service — deals, buyers, agreements, commission and expenses." />} />
              <Route path="/business/buy/:dealId" element={<BuyerDealFile />} />
              <Route path="/business/mandates" element={<BuyerMandates category="business" />} />
              <Route path="/business/mandates/:id" element={<BuyerMandateDetail category="business" />} />
              <Route path="/business/enquiry" element={<SalesEnquiries category="business" title="Business · Buyer Enquiries" desc="Every buyer who enquired on a business for sale." />} />
              <Route path="/business/agreements/purchase" element={<PurchaseAgreements category="business" />} />
            </Route>

            {/* Retired Business screens → their new homes. */}
            <Route path="/business/sale" element={<Navigate to="/business/sell" replace />} />
            <Route path="/business/listings" element={<Navigate to="/business/properties" replace />} />
            <Route path="/business/listings/:id" element={<Navigate to="/business/properties" replace />} />
            <Route path="/business/enquiries" element={<Navigate to="/business/enquiry" replace />} />
            <Route path="/business/invoices" element={<Navigate to="/business/buyer-invoices" replace />} />
            <Route path="/business/sale/agreements" element={<Navigate to="/business/agreements/sale" replace />} />
            <Route path="/business/purchase/agreements" element={<Navigate to="/business/agreements/purchase" replace />} />
            <Route path="/business-buy" element={<Navigate to="/business/buyer-service" replace />} />
            <Route path="/business-buy/mandates" element={<Navigate to="/business/mandates" replace />} />
            <Route path="/business-buy/enquiries" element={<Navigate to="/business/enquiry" replace />} />
            <Route path="/business-buy/agreements" element={<Navigate to="/business/agreements/purchase" replace />} />
            <Route path="/business-buy/invoices" element={<Navigate to="/business/buyer-invoices" replace />} />
            <Route path="/business-buy/reports" element={<Navigate to="/business/reports" replace />} />
            <Route path="/business-buy/*" element={<Navigate to="/business/buyer-service" replace />} />
            <Route path="/business/rent" element={<Navigate to="/business-rent" replace />} />
            <Route path="/business/rent/listings" element={<Navigate to="/business-rent/listings" replace />} />
            <Route path="/business/rent/tenant-enquiries" element={<Navigate to="/business-rent/enquiries" replace />} />
            <Route path="/business/rent/rental-agreements" element={<Navigate to="/business-rent/rental-agreements" replace />} />
            <Route path="/business/rent/tenancy-agreements" element={<Navigate to="/business-rent/tenancy-agreements" replace />} />
            <Route path="/business/rent/price-schedule" element={<Navigate to="/business-rent/price-schedule" replace />} />
            <Route path="/business/rent/reports" element={<Navigate to="/business-rent/reports" replace />} />
```

Leave the Business RENT console block and the Business Registration block untouched.

- [ ] **Step 4: Keep the Rent console's listing links inside Rent**

`screens/business/BusinessListings.jsx` lines 45 and 79 navigate to `` `/business/listings/${id}` ``, which now redirects to the Sale console. Only the Rent console uses this screen now, so change line 45 to `` navigate(`/business-rent/listings/${data.data.id}`); `` and line 79's handler to `` onRowClick={(r) => navigate(`/business-rent/listings/${r.id}`)} ``. Then run `grep -n "/business/listings" admin-portal/src/screens/business/BusinessListingDetail.jsx` and change every hit to `/business-rent/listings`.

- [ ] **Step 5: Delete the retired screens**

```bash
git rm admin-portal/src/screens/BusinessBuyConsole.jsx admin-portal/src/screens/business/BusinessSaleDashboard.jsx admin-portal/src/screens/business/BusinessBuyDashboard.jsx admin-portal/src/screens/business/BusinessBuyReports.jsx admin-portal/src/screens/business/BusinessMandates.jsx admin-portal/src/screens/business/BusinessMandateDetail.jsx admin-portal/src/screens/business/BusinessInvoices.jsx
```

Then `grep -rn "BusinessSaleDashboard\|BusinessBuyDashboard\|BusinessBuyReports\|BusinessMandates\|BusinessMandateDetail\|BusinessInvoices\|BusinessBuyConsole" admin-portal/src` must return nothing.

- [ ] **Step 6: Main sidebar**

In `admin-portal/src/ui/Layout.jsx` replace the `business` entry's children with:

```js
    { to: '/business/buyer-service', label: 'Buy' },
    { to: '/business/sell', label: 'Sale' },
    { to: '/business-rent', label: 'Rent' },
```

- [ ] **Step 7: Wizard — business category + stay in the console**

In `admin-portal/src/screens/PropertyWizard.jsx`:
- Add `import { propertyWizardPath } from './sales/paths';` at the top.
- In the Basics step, the category options `["residential", "commercial", "rural"]` (sale mode) become `["residential", "commercial", "rural", "business"]`.
- In `saveStep`, replace

```js
            ? `/sales/properties/new/${created.id}?listing_type=sale&category=${encodeURIComponent(f.category)}`
```

with

```js
            ? propertyWizardPath(f.category, created.id, `listing_type=sale&category=${encodeURIComponent(f.category)}`)
```

In `admin-portal/src/screens/sales/SalesPropertyFile.jsx` line 2348 replace

```js
                `/sales/properties/new/${property.id}?listing_type=sale&category=${encodeURIComponent(property.category)}`,
```

with

```js
                propertyWizardPath(property.category, property.id, `listing_type=sale&category=${encodeURIComponent(property.category)}`),
```

(add `propertyWizardPath` to that file's existing `./paths` import).

- [ ] **Step 8: Build and click through**

Run `npm run build` in `admin-portal/` — expected `✓ built`. Start the admin dev server (`npm run dev`) with the backend running, log in, and open every item in both new sidebars. Each must render without a console error. Check that `/business/reports` shows "Business only" instead of the category dropdown, that `/commercial/reports` still shows the dropdown, that `/business-rent/listings` rows open `/business-rent/listings/:id`, and that the old URLs in Step 3 redirect.

- [ ] **Step 9: Commit**

```bash
git add admin-portal/src/config/consoles.js admin-portal/src/screens/BusinessSaleConsole.jsx admin-portal/src/App.jsx admin-portal/src/ui/Layout.jsx admin-portal/src/screens/PropertyWizard.jsx admin-portal/src/screens/sales/SalesPropertyFile.jsx admin-portal/src/screens/business/BusinessListings.jsx admin-portal/src/screens/business/BusinessListingDetail.jsx
git commit -m "feat(business): Business Sale & Buyer consoles identical to Commercial

Business Sale/Buy now run on the shared sales engine as category='business',
rebased onto /business/*, with Commercial's sidebars item for item. Retires the
separate Business Sale/Buy screens (old URLs redirect); Rent keeps its console.
The wizard offers 'business' and no longer jumps out of the console after
creating a draft (also fixes this for Commercial).

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

# Phase 3 — Business profile and the website teaser

### Task 7: Business profile table, API and teaser logic

**Files:**
- Create: `backend/migrations/0142-property-business-profiles.js`, `backend/models/PropertyBusinessProfile.js`, `backend/services/businessTeaser.service.js`, `backend/scripts/testBusinessTeaser.js`, `backend/controllers/propertyBusinessProfile.controller.js`
- Modify: `backend/routes/property.routes.js`, `backend/package.json`, `backend/scripts/e2e/businessParity.js`

**Interfaces:**
- Produces: `GET /api/properties/:id/business-profile → { data: profile|null }`; `PUT /api/properties/:id/business-profile` (partial upsert) `→ { data: profile }`; 400 if the property isn't `category='business'`.
- Produces: `BUSINESS_TYPES: Record<string,string>`, `turnoverBand(amount): string`, `yearsEstablished(year, now?): number|null`, `applyBusinessTeaser(publicObj, profile): object` (adds `business: { business_type, business_type_label, industry, staff_count, years_established, turnover_band, confidential: true }`), `fullBusinessDetails(publicObj, profile): object`.

- [ ] **Step 1: Write the failing test**

`backend/scripts/testBusinessTeaser.js`:

```js
const assert = require('assert');
const { turnoverBand, yearsEstablished, applyBusinessTeaser, fullBusinessDetails } = require('../services/businessTeaser.service');

assert.strictEqual(turnoverBand(null), 'On request');
assert.strictEqual(turnoverBand(0), 'On request');
assert.strictEqual(turnoverBand(4_999_999), 'Under ৳50 L');
assert.strictEqual(turnoverBand(5_000_000), '৳50 L–1 Cr');
assert.strictEqual(turnoverBand(10_000_000), '৳1–2 Cr');
assert.strictEqual(turnoverBand(19_999_999), '৳1–2 Cr');
assert.strictEqual(turnoverBand(20_000_000), '৳2–5 Cr');
assert.strictEqual(turnoverBand(50_000_000), '৳5–10 Cr');
assert.strictEqual(turnoverBand(100_000_000), '৳10 Cr+');
assert.strictEqual(turnoverBand('1.5e7'), '৳1–2 Cr');

const now = new Date('2026-09-21');
assert.strictEqual(yearsEstablished(2016, now), 10);
assert.strictEqual(yearsEstablished(3000, now), null);
assert.strictEqual(yearsEstablished(null, now), null);

const pub = {
  id: 9, property_code: 'SSP-9', slug: 'rahim-traders-banani', title: 'Rahim Traders Ltd', category: 'business',
  area: 'Banani', city: 'Dhaka', address: 'House 12, Road 5', latitude: 23.79, description: 'Owner Rahim…',
  seo_title: 'Rahim Traders', price: 25000000, media: [{ file_url: '/uploads/properties/a.jpg' }],
};
const profile = {
  business_type: 'trading', industry: 'Electronics import', staff_count: 14, year_established: 2016,
  annual_turnover: 30000000, annual_profit: 6000000, lease_details: 'Lease to 2030', teaser_headline: '', teaser_summary: 'Established importer.',
};
const t = applyBusinessTeaser(pub, profile);
assert.strictEqual(t.title, 'Trading business in Banani');
assert.strictEqual(t.slug, 'ssp-9');
assert.strictEqual(t.description, 'Established importer.');
for (const k of ['address', 'latitude', 'seo_title']) assert.ok(!(k in t), `teaser leaked ${k}`);
assert.ok(!JSON.stringify(t).includes('Rahim'), 'teaser leaked the business name');
assert.ok(!JSON.stringify(t).includes('30000000') && !JSON.stringify(t).includes('6000000'), 'teaser leaked exact financials');
assert.deepStrictEqual(t.business.turnover_band, '৳2–5 Cr');
assert.strictEqual(t.business.staff_count, 14);
assert.strictEqual(t.price, 25000000);
assert.strictEqual(t.media.length, 1);
assert.strictEqual(applyBusinessTeaser(pub, { ...profile, teaser_headline: 'Profitable importer' }).title, 'Profitable importer');
assert.strictEqual(applyBusinessTeaser(pub, null).title, 'Business in Banani');

const full = fullBusinessDetails(pub, profile);
assert.strictEqual(full.title, 'Rahim Traders Ltd');
assert.strictEqual(full.business.annual_turnover, 30000000);
assert.strictEqual(full.business.lease_details, 'Lease to 2030');
assert.strictEqual(full.business.confidential, false);
console.log('businessTeaser OK');
```

- [ ] **Step 2: Run it to verify it fails**

Run: `node scripts/testBusinessTeaser.js`
Expected: `Cannot find module '../services/businessTeaser.service'`

- [ ] **Step 3: Implement the teaser service**

`backend/services/businessTeaser.service.js`:

```js
// Confidential business listings on the public website. Every business listing
// is a TEASER (Business Sale SOP Step 13): no business name, street address,
// coordinates or exact financials. Full details only via a released NDA token.
const BUSINESS_TYPES = {
  retail: 'Retail', restaurant: 'Restaurant / Café', hospitality: 'Hospitality', manufacturing: 'Manufacturing',
  service: 'Service', trading: 'Trading', industrial: 'Industrial', franchise: 'Franchise', online: 'Online', other: 'Other',
};
const LAKH = 100000;
const CRORE = 10000000;

function turnoverBand(amount) {
  const n = Number(amount);
  if (amount == null || amount === '' || !Number.isFinite(n) || n <= 0) return 'On request';
  if (n < 50 * LAKH) return 'Under ৳50 L';
  if (n < CRORE) return '৳50 L–1 Cr';
  if (n < 2 * CRORE) return '৳1–2 Cr';
  if (n < 5 * CRORE) return '৳2–5 Cr';
  if (n < 10 * CRORE) return '৳5–10 Cr';
  return '৳10 Cr+';
}

function yearsEstablished(year, now = new Date()) {
  const y = Number(year);
  return Number.isInteger(y) && y > 1800 && y <= now.getFullYear() ? now.getFullYear() - y : null;
}

// Fields that could identify the business — never in a teaser.
const TEASER_HIDDEN = ['address', 'postal_code', 'latitude', 'longitude', 'map_url', 'description', 'remarks',
  'nearby_places', 'floor_plan_url', 'unit_floor_plans', 'seo_title', 'seo_description', 'owner_contact_id', 'access_contacts'];

const PROFILE_PUBLIC_FULL = ['business_type', 'industry', 'ownership_structure', 'company_registration_no', 'trade_licence_no',
  'tin_bin', 'year_established', 'staff_count', 'lease_status', 'lease_details', 'reason_for_sale', 'annual_turnover',
  'annual_profit', 'monthly_revenue', 'included_assets', 'stock_info', 'employee_info', 'ip_details'];

function typeLabel(profile) {
  return BUSINESS_TYPES[profile && profile.business_type] || null;
}

function applyBusinessTeaser(pub, profile) {
  const p = profile || {};
  const label = typeLabel(p);
  const out = { ...pub };
  for (const k of TEASER_HIDDEN) delete out[k];
  const where = pub.area || pub.city || 'Bangladesh';
  out.title = (p.teaser_headline && String(p.teaser_headline).trim()) || `${label ? `${label} business` : 'Business'} in ${where}`;
  out.slug = pub.property_code ? String(pub.property_code).toLowerCase() : null; // the real slug may carry the name
  out.description = p.teaser_summary || null;
  out.bedrooms = null; out.bathrooms = null; out.balconies = null;
  out.business = {
    business_type: p.business_type || null,
    business_type_label: label || 'Business',
    industry: p.industry || null,
    staff_count: p.staff_count ?? null,
    years_established: yearsEstablished(p.year_established),
    turnover_band: turnoverBand(p.annual_turnover),
    confidential: true,
  };
  return out;
}

// For a buyer holding a released NDA token only.
function fullBusinessDetails(pub, profile) {
  const p = profile || {};
  const business = { business_type_label: typeLabel(p) || 'Business', confidential: false };
  for (const k of PROFILE_PUBLIC_FULL) business[k] = p[k] ?? null;
  return { ...pub, business };
}

module.exports = { BUSINESS_TYPES, turnoverBand, yearsEstablished, applyBusinessTeaser, fullBusinessDetails };
```

- [ ] **Step 4: Run it to verify it passes**

Run: `node scripts/testBusinessTeaser.js`
Expected: `businessTeaser OK`. Add `node scripts/testBusinessTeaser.js` to the `test` script.

- [ ] **Step 5: Migration + model**

`backend/migrations/0142-property-business-profiles.js`:

```js
'use strict';

/**
 * Migration 0142: property_business_profiles — one row per business property
 * (properties.category = 'business'). Business Sale SOP Steps 1, 6, 8, 9: the
 * business profile, website teaser copy and the preparation checklist.
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    const S = Sequelize;
    const tables = (await queryInterface.showAllTables()).map((t) => (typeof t === 'string' ? t : t.tableName).toLowerCase());
    if (tables.includes('property_business_profiles')) return;
    await queryInterface.createTable('property_business_profiles', {
      id: { type: S.INTEGER, autoIncrement: true, primaryKey: true },
      branch_id: { type: S.INTEGER, allowNull: false },
      property_id: { type: S.INTEGER, allowNull: false, unique: true },
      business_type: S.STRING(30),
      industry: S.STRING(120),
      ownership_structure: S.STRING(60),
      company_registration_no: S.STRING(80),
      trade_licence_no: S.STRING(80),
      tin_bin: S.STRING(80),
      year_established: S.INTEGER,
      staff_count: S.INTEGER,
      lease_status: S.STRING(20),
      lease_details: S.TEXT,
      reason_for_sale: S.TEXT,
      annual_turnover: S.DECIMAL(16, 2),
      annual_profit: S.DECIMAL(16, 2),
      monthly_revenue: S.DECIMAL(16, 2),
      included_assets: S.TEXT,
      stock_info: S.TEXT,
      employee_info: S.TEXT,
      ip_details: S.TEXT,
      teaser_headline: S.STRING(160),
      teaser_summary: S.TEXT,
      preparation: S.JSON,
      created_by: S.INTEGER,
      created_at: { type: S.DATE, allowNull: false, defaultValue: S.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: S.DATE, allowNull: false, defaultValue: S.literal('CURRENT_TIMESTAMP') },
    });
    await queryInterface.addIndex('property_business_profiles', ['branch_id']);
  },
  down: async (queryInterface) => {
    await queryInterface.dropTable('property_business_profiles').catch(() => {});
  },
};
```

`backend/models/PropertyBusinessProfile.js`:

```js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/db.config');

/** One row per business property — profile, teaser copy, preparation checklist (0142). */
const PropertyBusinessProfile = sequelize.define('PropertyBusinessProfile', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  branch_id: { type: DataTypes.INTEGER, allowNull: false },
  property_id: { type: DataTypes.INTEGER, allowNull: false, unique: true },
  business_type: DataTypes.STRING(30),
  industry: DataTypes.STRING(120),
  ownership_structure: DataTypes.STRING(60),
  company_registration_no: DataTypes.STRING(80),
  trade_licence_no: DataTypes.STRING(80),
  tin_bin: DataTypes.STRING(80),
  year_established: DataTypes.INTEGER,
  staff_count: DataTypes.INTEGER,
  lease_status: DataTypes.STRING(20),
  lease_details: DataTypes.TEXT,
  reason_for_sale: DataTypes.TEXT,
  annual_turnover: DataTypes.DECIMAL(16, 2),
  annual_profit: DataTypes.DECIMAL(16, 2),
  monthly_revenue: DataTypes.DECIMAL(16, 2),
  included_assets: DataTypes.TEXT,
  stock_info: DataTypes.TEXT,
  employee_info: DataTypes.TEXT,
  ip_details: DataTypes.TEXT,
  teaser_headline: DataTypes.STRING(160),
  teaser_summary: DataTypes.TEXT,
  preparation: DataTypes.JSON,
  created_by: DataTypes.INTEGER,
}, { tableName: 'property_business_profiles', underscored: true });

module.exports = PropertyBusinessProfile;
```

Run: `npm run db:migrate` — expected `0142-property-business-profiles: migrated`.

- [ ] **Step 6: Controller + routes**

`backend/controllers/propertyBusinessProfile.controller.js`:

```js
const Property = require('../models/Property');
const PropertyBusinessProfile = require('../models/PropertyBusinessProfile');
const { asyncHandler, branchScope, resolveBranchId, pick } = require('../utils/controllerHelpers');

const FIELDS = ['business_type', 'industry', 'ownership_structure', 'company_registration_no', 'trade_licence_no', 'tin_bin',
  'year_established', 'staff_count', 'lease_status', 'lease_details', 'reason_for_sale', 'annual_turnover', 'annual_profit',
  'monthly_revenue', 'included_assets', 'stock_info', 'employee_info', 'ip_details', 'teaser_headline', 'teaser_summary', 'preparation'];
const NUMERIC = ['year_established', 'staff_count', 'annual_turnover', 'annual_profit', 'monthly_revenue'];

const parseJson = (v) => { if (typeof v !== 'string') return v; try { return JSON.parse(v); } catch { return null; } };
const shape = (row) => { if (!row) return null; const p = row.get ? row.get({ plain: true }) : row; return { ...p, preparation: parseJson(p.preparation) || [] }; };

async function businessProperty(req) {
  return Property.findOne({ where: { id: req.params.id, ...branchScope(req) }, attributes: ['id', 'branch_id', 'category'] });
}

// GET /api/properties/:id/business-profile
exports.get = asyncHandler(async (req, res) => {
  const prop = await businessProperty(req);
  if (!prop) return res.status(404).json({ error: 'Property not found.' });
  const row = await PropertyBusinessProfile.findOne({ where: { property_id: prop.id } });
  res.json({ data: shape(row) });
});

// PUT /api/properties/:id/business-profile — partial upsert (only the fields sent change)
exports.upsert = asyncHandler(async (req, res) => {
  const prop = await businessProperty(req);
  if (!prop) return res.status(404).json({ error: 'Property not found.' });
  if (prop.category !== 'business') return res.status(400).json({ error: 'Business profiles apply to business properties only.' });
  const data = pick(req.body, FIELDS);
  for (const k of NUMERIC) if (k in data) data[k] = data[k] === '' || data[k] == null ? null : Number(data[k]);
  if ('preparation' in data && !Array.isArray(parseJson(data.preparation))) return res.status(400).json({ error: 'preparation must be a list.' });
  let row = await PropertyBusinessProfile.findOne({ where: { property_id: prop.id } });
  if (row) await row.update(data);
  else row = await PropertyBusinessProfile.create({ ...data, property_id: prop.id, branch_id: resolveBranchId(req, prop.branch_id), created_by: req.user?.id || null });
  res.json({ data: shape(row), message: 'Business profile saved.' });
});
```

In `backend/routes/property.routes.js` add after `router.delete('/:id', ctrl.remove);`:

```js
// Business properties (category='business') — profile, teaser copy, preparation.
const businessProfile = require('../controllers/propertyBusinessProfile.controller');
router.get('/:id/business-profile', businessProfile.get);
router.put('/:id/business-profile', businessProfile.upsert);
```

- [ ] **Step 7: E2E**

Append to `backend/scripts/e2e/businessParity.js` and call `if (want(3)) await phase3();`:

```js
async function phase3() {
  console.log('\n— Phase 3: business profile + teaser —');
  const p = await req('POST', '/api/properties', { body: { title: `Secret Traders ${STAMP}`, category: 'business', property_type: 'Business', listing_type: 'sale' } });
  const id = p.body?.data?.id; ok(!!id, 'business property created', id);
  const put = await req('PUT', `/api/properties/${id}/business-profile`, { body: { business_type: 'trading', industry: 'Import', staff_count: 9, year_established: 2015, annual_turnover: 15000000, annual_profit: 3000000, teaser_headline: `Importer ${STAMP}` } });
  ok(put.status === 200 && put.body?.data?.business_type === 'trading', 'profile upsert', `HTTP ${put.status}`);
  const partial = await req('PUT', `/api/properties/${id}/business-profile`, { body: { staff_count: 11 } });
  ok(partial.body?.data?.industry === 'Import' && partial.body?.data?.staff_count === 11, 'partial update keeps other fields');
  const com = await req('POST', '/api/properties', { body: { title: `Com ${STAMP}`, category: 'commercial', property_type: 'Office', listing_type: 'sale' } });
  const bad = await req('PUT', `/api/properties/${com.body?.data?.id}/business-profile`, { body: { industry: 'x' } });
  ok(bad.status === 400, 'profile refused on a non-business property', `HTTP ${bad.status}`);
  return id;
}
```

Restart the backend and run `node scripts/e2e/businessParity.js 3` — expected all PASS.

- [ ] **Step 8: Commit**

```bash
git add backend/migrations/0142-property-business-profiles.js backend/models/PropertyBusinessProfile.js backend/services/businessTeaser.service.js backend/scripts/testBusinessTeaser.js backend/controllers/propertyBusinessProfile.controller.js backend/routes/property.routes.js backend/scripts/e2e/businessParity.js backend/package.json
git commit -m "feat(business): business profile per property + confidential teaser logic

property_business_profiles (0142) holds the SOP business profile, website teaser
copy and preparation checklist. businessTeaser.service redacts a public listing
to a teaser (no name, address, coordinates or exact financials; turnover band).

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 8: Public website API serves business teasers

**Files:**
- Modify: `backend/controllers/publicWebsite.controller.js`, `backend/scripts/e2e/businessParity.js`

**Interfaces:**
- Consumes: `applyBusinessTeaser`, `PropertyBusinessProfile` (Task 7), `pickPublic` (Task 2).
- Produces: `/public-website/properties` and `/public-website/properties/:idOrSlug` return teasers (with a `business` object) for `category='business'`; search never matches a business's title or address.

- [ ] **Step 1: List endpoint — teaser + search exclusion**

In `backend/controllers/publicWebsite.controller.js` add:

```js
const PropertyBusinessProfile = require('../models/PropertyBusinessProfile');
const { applyBusinessTeaser } = require('../services/businessTeaser.service');

// Teaser every business row of a public list (one query for all their profiles).
async function teaseBusinessRows(rows) {
  const ids = rows.filter((r) => r.category === 'business').map((r) => Number(r.id));
  if (!ids.length) return rows;
  const profiles = await PropertyBusinessProfile.findAll({ where: { property_id: ids }, raw: true });
  const byId = new Map(profiles.map((p) => [Number(p.property_id), p]));
  return rows.map((r) => (r.category === 'business' ? applyBusinessTeaser(r, byId.get(Number(r.id))) : r));
}
```

In `getPublishedProperties`, in the "Search keyword" block replace the `andConditions.push({ [Op.or]: [ …six clauses… ] });` with:

```js
    andConditions.push({
      [Op.or]: [
        // A confidential business is never findable by its real name or address.
        { [Op.and]: [{ category: { [Op.ne]: 'business' } }, { [Op.or]: [{ title: { [Op.like]: q } }, { address: { [Op.like]: q } }] }] },
        { property_code: { [Op.like]: q } },
        { area: { [Op.like]: q } },
        { city: { [Op.like]: q } },
        { district: { [Op.like]: q } },
      ],
    });
```

and replace

```js
  res.json({
    data: sanitized,
```

with

```js
  res.json({
    data: await teaseBusinessRows(sanitized),
```

- [ ] **Step 2: Detail endpoint — teaser**

In `getPropertyDetails`, change the final `res.json({ data: { ...pickPublic(plain), … } });` so the object is built into a variable first:

```js
  let payload = {
    ...pickPublic(plain),
    // …every existing key of the data object, unchanged…
  };
  if (plain.category === 'business') {
    const profile = await PropertyBusinessProfile.findOne({ where: { property_id: plain.id }, raw: true });
    payload = applyBusinessTeaser(payload, profile);
  }
  res.json({ data: payload });
```

(Move the existing key/value lines verbatim into `payload`.) A lookup by the business's original `slug` still resolves, but the response carries the redacted slug (`property_code` lowercased).

- [ ] **Step 3: E2E**

Append to `phase3()` in `businessParity.js`, before `return id;`:

```js
  await req('PUT', `/api/properties/${id}`, { body: { is_published: true, price: 25000000, area: 'Banani', city: 'Dhaka', address: 'House 1, Road 2' } });
  const list = await req('GET', '/api/public-website/properties?category=business&listing_type=sale&limit=100', { noAuth: true });
  const row = (list.body?.data || []).find((r) => Number(r.id) === Number(id));
  ok(!!row, 'published business appears in the website Business Buy search');
  if (row) {
    ok(row.title === `Importer ${STAMP}`, 'teaser headline is the public title', row.title);
    ok(!JSON.stringify(row).includes('Secret Traders'), 'list never shows the business name');
    ok(!('address' in row), 'list hides the street address');
    ok(row.business?.turnover_band === '৳1–2 Cr', 'turnover band shown', row.business?.turnover_band);
  }
  const det = await req('GET', `/api/public-website/properties/${id}`, { noAuth: true });
  const d = det.body?.data || {};
  ok(det.status === 200 && !JSON.stringify(d).includes('Secret Traders'), 'detail is a teaser (no name)');
  ok(!('address' in d) && !('latitude' in d), 'detail hides address + coordinates');
  ok(!JSON.stringify(d).includes('15000000') && !JSON.stringify(d).includes('3000000'), 'detail hides exact financials');
  const search = await req('GET', `/api/public-website/properties?search=${encodeURIComponent('Secret Traders')}`, { noAuth: true });
  ok(!(search.body?.data || []).some((r) => Number(r.id) === Number(id)), 'searching the real name does not find the listing');
```

Restart the backend; run `node scripts/e2e/businessParity.js 3` — expected all PASS.

- [ ] **Step 4: Commit**

```bash
git add backend/controllers/publicWebsite.controller.js backend/scripts/e2e/businessParity.js
git commit -m "feat(website-api): business listings are public teasers

Public list/detail redact business rows to a teaser with a business summary
(type, industry, staff, years, turnover band). Public search no longer matches a
business's title or address.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 9: Wizard "Business profile" step

**Files:**
- Create: `admin-portal/src/screens/sales/business/BusinessProfileStep.jsx`
- Modify: `admin-portal/src/screens/PropertyWizard.jsx`

**Interfaces:**
- Consumes: `GET/PUT /api/properties/:id/business-profile` (Task 7).
- Produces: `BusinessProfileStep({ value, onChange })` and exported constants `BUSINESS_TYPE_OPTIONS`, `EMPTY_BUSINESS_PROFILE`.

- [ ] **Step 1: The step component**

`admin-portal/src/screens/sales/business/BusinessProfileStep.jsx`:

```jsx
import React from 'react';
import { Field, Input, Select, Textarea } from '../../../ui/kit';

export const BUSINESS_TYPE_OPTIONS = [
  ['retail', 'Retail'], ['restaurant', 'Restaurant / Café'], ['hospitality', 'Hospitality'], ['manufacturing', 'Manufacturing'],
  ['service', 'Service'], ['trading', 'Trading'], ['industrial', 'Industrial'], ['franchise', 'Franchise'], ['online', 'Online'], ['other', 'Other'],
];

export const EMPTY_BUSINESS_PROFILE = {
  business_type: '', industry: '', ownership_structure: '', company_registration_no: '', trade_licence_no: '', tin_bin: '',
  year_established: '', staff_count: '', lease_status: '', lease_details: '', reason_for_sale: '',
  annual_turnover: '', annual_profit: '', monthly_revenue: '', included_assets: '', stock_info: '', employee_info: '', ip_details: '',
  teaser_headline: '', teaser_summary: '',
};

/** Business Sale SOP Step 1 — the business profile, plus the website teaser copy. */
export default function BusinessProfileStep({ value, onChange }) {
  const v = value || EMPTY_BUSINESS_PROFILE;
  const set = (k) => (e) => onChange({ ...v, [k]: e.target.value });
  return (
    <div className="pm-card" style={{ padding: 22 }}>
      <h3 style={{ marginTop: 0 }}>Business profile</h3>
      <p className="cell-sub" style={{ marginTop: -6 }}>
        The property title above is the real business name and stays internal. The website shows only the teaser below.
      </p>
      <div className="form-grid">
        <Field label="Business type *">
          <Select value={v.business_type} onChange={set('business_type')}>
            <option value="">— Select —</option>
            {BUSINESS_TYPE_OPTIONS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </Select>
        </Field>
        <Field label="Industry"><Input value={v.industry} onChange={set('industry')} placeholder="e.g. Electronics import" /></Field>
        <Field label="Ownership structure">
          <Select value={v.ownership_structure} onChange={set('ownership_structure')}>
            <option value="">—</option>
            <option value="sole_proprietor">Sole proprietor</option>
            <option value="partnership">Partnership</option>
            <option value="private_limited">Private limited</option>
            <option value="public_limited">Public limited</option>
            <option value="other">Other</option>
          </Select>
        </Field>
        <Field label="Year established"><Input type="number" value={v.year_established} onChange={set('year_established')} /></Field>
        <Field label="Staff count"><Input type="number" value={v.staff_count} onChange={set('staff_count')} /></Field>
        <Field label="Company registration no."><Input value={v.company_registration_no} onChange={set('company_registration_no')} /></Field>
        <Field label="Trade licence no."><Input value={v.trade_licence_no} onChange={set('trade_licence_no')} /></Field>
        <Field label="TIN / BIN"><Input value={v.tin_bin} onChange={set('tin_bin')} /></Field>
        <Field label="Annual turnover (৳)"><Input type="number" value={v.annual_turnover} onChange={set('annual_turnover')} /></Field>
        <Field label="Annual profit (৳)"><Input type="number" value={v.annual_profit} onChange={set('annual_profit')} /></Field>
        <Field label="Monthly revenue (৳)"><Input type="number" value={v.monthly_revenue} onChange={set('monthly_revenue')} /></Field>
        <Field label="Premises">
          <Select value={v.lease_status} onChange={set('lease_status')}>
            <option value="">—</option>
            <option value="owned">Owned</option>
            <option value="leased">Leased</option>
            <option value="na">Not applicable (online)</option>
          </Select>
        </Field>
      </div>
      <Field label="Lease details"><Textarea rows={2} value={v.lease_details} onChange={set('lease_details')} /></Field>
      <Field label="Reason for sale"><Textarea rows={2} value={v.reason_for_sale} onChange={set('reason_for_sale')} /></Field>
      <Field label="Included assets"><Textarea rows={2} value={v.included_assets} onChange={set('included_assets')} /></Field>
      <Field label="Stock"><Textarea rows={2} value={v.stock_info} onChange={set('stock_info')} /></Field>
      <Field label="Employees"><Textarea rows={2} value={v.employee_info} onChange={set('employee_info')} /></Field>
      <Field label="Intellectual property"><Textarea rows={2} value={v.ip_details} onChange={set('ip_details')} /></Field>
      <h4 style={{ margin: '18px 0 6px' }}>Website teaser (public)</h4>
      <Field label="Teaser headline"><Input value={v.teaser_headline} onChange={set('teaser_headline')} placeholder="e.g. Profitable electronics importer, Banani" /></Field>
      <Field label="Teaser summary"><Textarea rows={3} value={v.teaser_summary} onChange={set('teaser_summary')} placeholder="No name, address or exact figures — buyers get those after signing the NDA." /></Field>
    </div>
  );
}
```

- [ ] **Step 2: Insert the step and hide residential fields**

In `admin-portal/src/screens/PropertyWizard.jsx`:
- Imports: add `Briefcase` to the `lucide-react` import, and `import BusinessProfileStep, { EMPTY_BUSINESS_PROFILE } from './sales/business/BusinessProfileStep';`.
- Below `const STEPS = [...]` add:

```js
// Business properties get a Business profile step right after Basics.
const stepsFor = (category) => (category === 'business'
  ? [STEPS[0], { key: 'business', label: 'Business profile', icon: Briefcase }, ...STEPS.slice(1)]
  : STEPS);
```

- In the component, after `const [f, setF] = useState({...});` add:

```js
  const [bp, setBp] = useState(EMPTY_BUSINESS_PROFILE);
  const isBusiness = f.category === 'business';
  const steps = stepsFor(f.category);
```

- Replace every other `STEPS` reference inside the component (lines 290, 331, 360, 399 ×2, 417) with `steps`.
- In the resume `useEffect` (the one that loads the draft by `resumeId`), after the draft is applied add:

```js
        try {
          const { data: bpRes } = await api.get(`/properties/${resumeId}/business-profile`);
          if (bpRes.data) setBp({ ...EMPTY_BUSINESS_PROFILE, ...Object.fromEntries(Object.entries(bpRes.data).map(([k, val]) => [k, val ?? ''])) });
        } catch { /* not a business property */ }
```

- In `saveStep`, replace `await api.put(\`/properties/${propertyId}\`, payloadFor(key));` with:

```js
        if (key === 'business') {
          if (!bp.business_type) { toast.error('Choose the business type.'); setBusy(false); return false; }
          await api.put(`/properties/${propertyId}/business-profile`, bp);
        } else {
          await api.put(`/properties/${propertyId}`, payloadFor(key));
        }
```

- In the Basics step, when the category button for `business` is clicked also set the property type: replace `onClick={() => set("category", c)}` with `onClick={() => { set("category", c); if (c === "business") set("property_type", "Business"); }}`, and wrap the whole "Property type" `<Field>` (and the `property_type === "Other"` field after it) in `{!isBusiness && ( … )}`.
- Add the render branch next to the others: `{current === "business" && <BusinessProfileStep value={bp} onChange={setBp} />}`.
- In the Details step wrap the five fields Bedrooms, Bathrooms, Balconies, Drawing rooms and Dining rooms in `{!isBusiness && (<> … </>)}`.

- [ ] **Step 3: Build and try it**

Run `npm run build` in `admin-portal/` — expected `✓ built`. In the dev app go to `/business/properties` → New: the category is preselected as Business, the step list shows "Business profile" second, the bedroom fields are gone, the profile saves (re-open the draft and the fields are filled), and the Photos & videos step uploads images and a YouTube URL. Create a Commercial listing too and confirm its steps are unchanged.

- [ ] **Step 4: Commit**

```bash
git add admin-portal/src/screens/sales/business/BusinessProfileStep.jsx admin-portal/src/screens/PropertyWizard.jsx
git commit -m "feat(business): Business profile step in the property wizard

Business listings get the SOP business profile and website teaser copy as a
wizard step; residential-only fields are hidden for business.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 10: Website shows business fields

**Files:**
- Create: `website-mock/src/components/BusinessSpecs.jsx`
- Modify: `website-mock/src/services/api.js`, `website-mock/src/pages/PropertiesPage.jsx:629-634,772-778`, `website-mock/src/components/FeaturedProperties.jsx:~139-165`, `website-mock/src/pages/PropertyDetailPage.jsx:439-466`, `website-mock/src/components/PropertyDetailModal.jsx:~295-312`

**Interfaces:**
- Consumes: the `business` object on teaser rows (Task 8).
- Produces: mapped website items carry `business` (or `null`); `<BusinessSpecs business compact? />`.

- [ ] **Step 1: Carry `business` through the mapper**

In `website-mock/src/services/api.js`, in the list mapper's returned object (`getProperties`) add:

```js
            business: p.business || null,
```

and change the three residential defaults so business rows don't claim bedrooms:

```js
            beds: p.business ? 0 : (p.bedrooms || 3),
            baths: p.business ? 0 : (p.bathrooms || 2),
            bedrooms: p.business ? 0 : (p.bedrooms || 3),
            bathrooms: p.business ? 0 : (p.bathrooms || 2),
            purpose: p.business ? 'Business For Sale' : (p.listing_type === 'sale' ? 'For Sale' : isShort ? 'Short Term Stay' : 'For Rent'),
```

Apply the same `business: p.business || null` and bedroom/bathroom changes in `getPropertyById`'s mapped object.

- [ ] **Step 2: The component**

`website-mock/src/components/BusinessSpecs.jsx`:

```jsx
import React from 'react';
import { Briefcase, Factory, TrendingUp, Users, CalendarClock } from 'lucide-react';

/** Business summary shown instead of beds/baths/sqft for confidential business listings. */
export default function BusinessSpecs({ business, compact = false }) {
  if (!business) return null;
  const items = [
    [Briefcase, business.business_type_label],
    [Factory, business.industry],
    [TrendingUp, business.turnover_band ? `Turnover ${business.turnover_band}` : null],
    [Users, business.staff_count != null ? `${business.staff_count} staff` : null],
    [CalendarClock, business.years_established != null ? `${business.years_established} yrs` : null],
  ].filter(([, text]) => text);
  if (compact) {
    return (
      <div className="flex items-center justify-between gap-2 text-[11px] text-slate-400 font-semibold border-t border-slate-100 pt-2">
        {items.slice(0, 3).map(([, text]) => <span key={text} className="truncate">{text}</span>)}
      </div>
    );
  }
  return (
    <div className="flex flex-wrap items-center gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100 text-xs font-bold text-[#012a4e]">
      {items.map(([Icon, text]) => (
        <div key={text} className="flex items-center gap-1.5"><Icon className="w-4 h-4 text-slate-400" /><span>{text}</span></div>
      ))}
      <div className="text-slate-400 font-normal ml-auto">Confidential listing — full details after NDA</div>
    </div>
  );
}
```

- [ ] **Step 3: Use it at the four render sites**

Import `BusinessSpecs` in each file (`../components/BusinessSpecs` from pages, `./BusinessSpecs` from components).

`PropertiesPage.jsx`, both micro-spec strips (the `<div className="flex items-center justify-between text-[11px] …">` blocks at ~629 and ~772): wrap each as

```jsx
                      {prop.business ? <BusinessSpecs business={prop.business} compact /> : (
                        /* existing micro-specs <div> unchanged */
                      )}
```

`FeaturedProperties.jsx`: wrap the beds/baths/sqft spec row (the block containing `prop.bedrooms > 0` at ~141 through the `prop.sizeSqft` span at ~162) the same way with `compact`.

`PropertyDetailPage.jsx`: wrap the "Micro Specs Pill Bar" `<div>` (~439–466) as `{property.business ? <BusinessSpecs business={property.business} /> : ( /* existing pill bar */ )}`.

`PropertyDetailModal.jsx`: wrap the stat tiles block that shows `property.bedrooms` and `property.sizeSqft` (~295–312) as `{property.business ? <BusinessSpecs business={property.business} /> : ( /* existing tiles */ )}`.

- [ ] **Step 4: Build and look**

Run (from `website-mock/`): `npm run build` — expected `✓ built`. With the backend running, open the website dev server, choose **Business Buy** in the hero search and confirm the Task 8 fixture listing shows the teaser headline, business chips and no bedroom counts, on the card and on its detail page. Residential listings must look unchanged.

- [ ] **Step 5: Commit**

```bash
git add website-mock/src/components/BusinessSpecs.jsx website-mock/src/services/api.js website-mock/src/pages/PropertiesPage.jsx website-mock/src/pages/PropertyDetailPage.jsx website-mock/src/components/FeaturedProperties.jsx website-mock/src/components/PropertyDetailModal.jsx
git commit -m "feat(website): business listings show business details, not bedrooms

Business teasers show type, industry, turnover band, staff and years established
on cards and the detail page, and are labelled confidential.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

# Phase 4 — SOP business modules

### Task 11: Assessment & due-diligence APIs keyed to properties

**Files:**
- Create: `backend/migrations/0143-business-assessment-document-property.js`
- Modify: `backend/models/BusinessAssessment.js`, `backend/models/BusinessDocument.js`, `backend/controllers/businessAssessment.controller.js`, `backend/controllers/businessDocument.controller.js`, `backend/routes/businessDocument.routes.js`, `backend/scripts/e2e/businessParity.js`

**Interfaces:**
- Produces: `property_id` on both tables (listing id nullable). `GET /api/business-assessments?property_id=`, `POST` accepts `property_id`; `GET /api/business-documents?property_id=`, `POST /api/business-documents/seed-checklist { property_id }`, `POST /api/business-documents/:id/escalate { note }` → `{ data: { document, assessment } }`.

- [ ] **Step 1: Migration + models**

`backend/migrations/0143-business-assessment-document-property.js`:

```js
'use strict';

/**
 * Migration 0143: business assessments + due-diligence documents can belong to a
 * business PROPERTY (the shared sales engine) as well as a legacy business
 * listing (still used by Business Rent). Adds property_id, makes the listing id
 * nullable. Existing rows are untouched.
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    for (const table of ['business_assessments', 'business_documents']) {
      const t = await queryInterface.describeTable(table);
      if (!t.property_id) {
        await queryInterface.addColumn(table, 'property_id', { type: Sequelize.INTEGER, allowNull: true });
        await queryInterface.addIndex(table, ['property_id'], { name: `${table}_property_id` });
      }
      if (t.business_listing_id && t.business_listing_id.allowNull === false) {
        await queryInterface.changeColumn(table, 'business_listing_id', { type: Sequelize.INTEGER, allowNull: true });
      }
    }
  },
  down: async (queryInterface) => {
    for (const table of ['business_assessments', 'business_documents']) {
      await queryInterface.removeIndex(table, `${table}_property_id`).catch(() => {});
      await queryInterface.removeColumn(table, 'property_id').catch(() => {});
    }
  },
};
```

In both `models/BusinessAssessment.js` and `models/BusinessDocument.js` change `business_listing_id: { type: DataTypes.INTEGER, allowNull: false },` to:

```js
  business_listing_id: { type: DataTypes.INTEGER, allowNull: true },
  property_id: DataTypes.INTEGER, // business property on the shared sales engine (0143)
```

Run `npm run db:migrate` — expected `0143-business-assessment-document-property: migrated`.

- [ ] **Step 2: Assessments accept a property**

In `backend/controllers/businessAssessment.controller.js`:
- Add `'property_id'` to `FIELDS`.
- In `exports.list` after the `business_listing_id` filter add `if (req.query.property_id) where.property_id = req.query.property_id;`.
- In `exports.create` replace the `business_listing_id is required` guard with:

```js
  if (!data.business_listing_id && !data.property_id) return res.status(400).json({ error: 'property_id or business_listing_id is required.' });
```

- [ ] **Step 3: Documents accept a property + escalation**

In `backend/controllers/businessDocument.controller.js`:
- Add `'property_id'` to `FIELDS`.
- `exports.list`: add `if (req.query.property_id) where.property_id = req.query.property_id;`.
- `exports.create`: replace the guard with the same `property_id or business_listing_id` guard as above.
- Replace `exports.seedChecklist` with a version keyed by either id:

```js
// POST /api/business-documents/seed-checklist — { property_id } or { business_listing_id }
exports.seedChecklist = asyncHandler(async (req, res) => {
  const key = req.body.property_id ? { property_id: Number(req.body.property_id) }
    : req.body.business_listing_id ? { business_listing_id: Number(req.body.business_listing_id) } : null;
  if (!key) return res.status(400).json({ error: 'property_id or business_listing_id is required.' });
  const branch_id = resolveBranchId(req, req.body.branch_id);
  const existing = await BusinessDocument.findAll({ where: { ...key, ...branchScope(req) }, attributes: ['doc_type'] });
  const have = new Set(existing.map((r) => r.doc_type));
  const toAdd = DEFAULT_DOCS.filter(([type]) => !have.has(type));
  if (toAdd.length) {
    await BusinessDocument.bulkCreate(toAdd.map(([doc_type, name]) => ({
      branch_id, ...key, doc_type, name, status: 'required', is_confidential: true, created_by: req.user?.id || null,
    })));
  }
  const rows = await BusinessDocument.findAll({ where: { ...key, ...branchScope(req) }, order: [['created_at', 'ASC']] });
  res.json({ data: rows, message: `Checklist ready (${toAdd.length} added).` });
});
```

- Add the escalation handler (Sale SOP Step 20):

```js
const BusinessAssessment = require('../models/BusinessAssessment');
const Notification = require('../models/Notification');
const User = require('../models/User');
const { Op } = require('sequelize');

const parseList = (v) => { if (Array.isArray(v)) return v; if (typeof v === 'string') { try { const p = JSON.parse(v); return Array.isArray(p) ? p : []; } catch { return []; } } return []; };

// POST /api/business-documents/:id/escalate — flag a compliance risk (SOP Step 20):
// document → rejected, risk added to the property's latest assessment, managers notified.
exports.escalate = asyncHandler(async (req, res) => {
  const doc = await BusinessDocument.findOne({ where: { id: req.params.id, ...branchScope(req) } });
  if (!doc) return res.status(404).json({ error: 'Document not found.' });
  const note = String(req.body.note || '').trim();
  if (!note) return res.status(400).json({ error: 'Describe the compliance concern.' });
  await doc.update({ status: 'rejected', notes: [doc.notes, `ESCALATED: ${note}`].filter(Boolean).join('\n'), verified_by: req.user?.id || null, verified_at: new Date() });

  const owner = doc.property_id ? { property_id: doc.property_id } : { business_listing_id: doc.business_listing_id };
  let assessment = await BusinessAssessment.findOne({ where: { ...owner, ...branchScope(req) }, order: [['created_at', 'DESC']] });
  const risk = { category: 'compliance', description: `${doc.name}: ${note}`, severity: 'high', source_document_id: doc.id, raised_at: new Date().toISOString() };
  if (assessment) await assessment.update({ risks: [...parseList(assessment.risks), risk] });
  else assessment = await BusinessAssessment.create({ ...owner, branch_id: doc.branch_id, assessment_type: 'risk', risks: [risk], status: 'draft', created_by: req.user?.id || null });

  const managers = await User.findAll({ where: { role: { [Op.in]: ['super_admin', 'branch_admin'] } }, attributes: ['id', 'branch_id'], raw: true });
  await Promise.all(managers.filter((m) => !m.branch_id || m.branch_id === doc.branch_id).map((m) => Notification.create({
    user_id: m.id, branch_id: doc.branch_id, title: 'Compliance risk escalated', type: 'alert',
    message: `${doc.name} flagged on ${doc.property_id ? `property #${doc.property_id}` : `listing #${doc.business_listing_id}`}: ${note}`,
  })));
  res.json({ data: { document: doc, assessment }, message: 'Escalated to management.' });
});
```

In `backend/routes/businessDocument.routes.js` add after the verify route: `router.post('/:id/escalate', ctrl.escalate);`

- [ ] **Step 4: E2E**

Append `phase4` below, and replace the IIFE at the bottom of `businessParity.js` with this final form (Phase 5's function is added in Task 15):

```js
(async () => {
  console.log(`\n===== BUSINESS PARITY E2E (run ${STAMP}) =====`);
  if (!(await login())) return finish();
  if (want(1)) await phase1();
  if (want(2)) await phase2();
  const bizId = want(3) ? await phase3() : null;
  if (want(4)) await phase4(bizId);
  if (want(5) && typeof phase5 === 'function') await phase5(bizId);
  finish();
})().catch((e) => { ok(false, 'harness crashed', e.message); finish(); });
```

`phase4` creates its own business property when run alone (`bizId` is `null`):

```js
async function phase4(propertyId) {
  console.log('\n— Phase 4: assessment + due diligence —');
  if (!propertyId) { const p = await req('POST', '/api/properties', { body: { title: `DD Biz ${STAMP}`, category: 'business', property_type: 'Business', listing_type: 'sale' } }); propertyId = p.body?.data?.id; }
  const a = await req('POST', '/api/business-assessments', { body: { property_id: propertyId, assessment_type: 'preliminary', operational_condition: 4, market_attractiveness: 3, risks: [] } });
  ok(a.status === 201, 'assessment created for a property', `HTTP ${a.status}`);
  const seeded = await req('POST', '/api/business-documents/seed-checklist', { body: { property_id: propertyId } });
  const docs = seeded.body?.data || [];
  ok(docs.length >= 8, 'due-diligence checklist seeded', `${docs.length} items`);
  const again = await req('POST', '/api/business-documents/seed-checklist', { body: { property_id: propertyId } });
  ok((again.body?.data || []).length === docs.length, 'seeding is idempotent');
  const esc = await req('POST', `/api/business-documents/${docs[0].id}/escalate`, { body: { note: 'Licence expired' } });
  const risks = esc.body?.data?.assessment?.risks;
  const list = typeof risks === 'string' ? JSON.parse(risks) : risks;
  ok(esc.status === 200 && esc.body?.data?.document?.status === 'rejected', 'escalation flags the document');
  ok(Array.isArray(list) && list.some((r) => r.description.includes('Licence expired')), 'escalation adds a risk to the assessment');
  const listed = await req('GET', `/api/business-assessments?property_id=${propertyId}`);
  ok((listed.body?.data || []).length >= 1, 'assessments list by property');
}
```

Restart the backend; run `node scripts/e2e/businessParity.js 4` — expected all PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/migrations/0143-business-assessment-document-property.js backend/models/BusinessAssessment.js backend/models/BusinessDocument.js backend/controllers/businessAssessment.controller.js backend/controllers/businessDocument.controller.js backend/routes/businessDocument.routes.js backend/scripts/e2e/businessParity.js
git commit -m "feat(business): assessments + due diligence for business properties, with escalation

Business assessments and the due-diligence register key to a property (0143) as
well as a legacy listing. Escalate flags a document, records the risk on the
latest assessment and notifies managers (SOP Step 20).

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 12: Business sections in the property file

**Files:**
- Create: `admin-portal/src/screens/sales/business/BusinessPropertySections.jsx`
- Modify: `admin-portal/src/screens/sales/SalesPropertyFile.jsx`

**Interfaces:**
- Consumes: Task 7 profile API (preparation), Task 11 assessment/document APIs.
- Produces: `BUSINESS_SECTIONS` array and components `BusinessAssessmentSection({ propertyId })`, `DueDiligenceSection({ propertyId })`, `PreparationSection({ propertyId })` (Task 16 adds `NdaSection`).

- [ ] **Step 1: The sections file**

`admin-portal/src/screens/sales/business/BusinessPropertySections.jsx`:

```jsx
import React, { useCallback, useEffect, useState } from 'react';
import { ShieldCheck, FileSearch, Sparkles, Plus, AlertTriangle, CheckCircle2 } from 'lucide-react';
import api from '../../../services/api';
import { useToast } from '../../../context/ToastContext';
import { Button, Badge, Field, Input, Select, Textarea, Drawer, Spinner } from '../../../ui/kit';
import UploadButton from '../../../ui/UploadButton';
import { fileSrc } from '../../../ui/FileUpload';

/** Property-file sections that exist only for category='business' (Business SOPs). */
export const BUSINESS_SECTIONS = [
  { key: 'biz_assessment', label: 'Business Assessment', icon: ShieldCheck },
  { key: 'due_diligence', label: 'Due Diligence', icon: FileSearch },
  { key: 'preparation', label: 'Preparation', icon: Sparkles },
];

const asList = (v) => { if (Array.isArray(v)) return v; if (typeof v === 'string') { try { const p = JSON.parse(v); return Array.isArray(p) ? p : []; } catch { return []; } } return []; };

// ── Business Assessment & Risk (Sale SOP Steps 2, 3, 6) ─────────────────────
const SCORES = [
  ['operational_condition', 'Operational condition'], ['market_attractiveness', 'Market attractiveness'],
  ['business_readiness', 'Business readiness'], ['commercial_viability', 'Commercial viability'],
  ['growth_potential', 'Growth potential'], ['transaction_feasibility', 'Transaction feasibility'], ['presentation_score', 'Presentation'],
];
const RISK_TYPES = ['ownership conflict', 'legal dispute', 'taxation', 'regulatory', 'lease', 'employee dispute', 'licensing gap', 'operational'];
const EMPTY_ASSESS = { assessment_type: 'preliminary', assessment_date: new Date().toISOString().slice(0, 10), summary: '', recommendation: 'proceed', next_steps: '', risks: [] };

export function BusinessAssessmentSection({ propertyId }) {
  const toast = useToast();
  const [rows, setRows] = useState(null);
  const [form, setForm] = useState(null);
  const load = useCallback(async () => {
    try { const { data } = await api.get('/business-assessments', { params: { property_id: propertyId } }); setRows(data.data || []); }
    catch { setRows([]); toast.error('Could not load assessments'); }
  }, [propertyId, toast]);
  useEffect(() => { load(); }, [load]);
  const save = async () => {
    try { await api.post('/business-assessments', { ...form, property_id: propertyId }); toast.success('Assessment saved'); setForm(null); load(); }
    catch (e) { toast.error(e.response?.data?.error || 'Save failed'); }
  };
  if (rows === null) return <Spinner />;
  return (
    <section className="pm-card" style={{ padding: 18 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0 }}>Business assessment &amp; risk</h3>
        <Button icon={Plus} onClick={() => setForm({ ...EMPTY_ASSESS })}>New assessment</Button>
      </div>
      {rows.length === 0 && <p className="cell-sub">No assessments yet — run the preliminary assessment (SOP Step 2).</p>}
      {rows.map((a) => (
        <div key={a.id} className="pm-card" style={{ padding: 12, marginTop: 10 }}>
          <b style={{ textTransform: 'capitalize' }}>{a.assessment_type}</b> · {a.assessment_date || '—'} · <Badge tone={a.recommendation === 'decline' ? 'red' : 'green'}>{a.recommendation || '—'}</Badge>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 6, fontSize: 12 }}>
            {SCORES.filter(([k]) => a[k] != null).map(([k, l]) => <span key={k}>{l}: <b>{a[k]}/5</b></span>)}
          </div>
          {asList(a.risks).map((r, i) => <div key={i} style={{ fontSize: 12, color: '#b91c1c', marginTop: 4 }}><AlertTriangle size={12} /> {r.category}: {r.description}</div>)}
          {a.summary && <p style={{ fontSize: 13, marginBottom: 0 }}>{a.summary}</p>}
        </div>
      ))}
      {form && (
        <Drawer open title="New business assessment" width={560} onClose={() => setForm(null)}
          footer={<div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}><Button variant="ghost" onClick={() => setForm(null)}>Cancel</Button><Button onClick={save}>Save</Button></div>}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Type"><Select value={form.assessment_type} onChange={(e) => setForm({ ...form, assessment_type: e.target.value })}><option value="preliminary">Preliminary (Step 2)</option><option value="risk">Risk identification (Step 3)</option><option value="presentation">Presentation (Step 6)</option></Select></Field>
            <Field label="Date"><Input type="date" value={form.assessment_date} onChange={(e) => setForm({ ...form, assessment_date: e.target.value })} /></Field>
            {SCORES.map(([k, l]) => (
              <Field key={k} label={`${l} (1–5)`}><Input type="number" min="1" max="5" value={form[k] ?? ''} onChange={(e) => setForm({ ...form, [k]: e.target.value === '' ? null : Number(e.target.value) })} /></Field>
            ))}
            <Field label="Recommendation"><Select value={form.recommendation} onChange={(e) => setForm({ ...form, recommendation: e.target.value })}><option value="proceed">Proceed</option><option value="proceed_with_conditions">Proceed with conditions</option><option value="decline">Decline</option></Select></Field>
          </div>
          <div style={{ marginTop: 12, fontWeight: 700, fontSize: 13 }}>Risks identified</div>
          {form.risks.map((r, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '160px 1fr 28px', gap: 6, marginTop: 6 }}>
              <Select value={r.category} onChange={(e) => setForm({ ...form, risks: form.risks.map((x, j) => (j === i ? { ...x, category: e.target.value } : x)) })}>{RISK_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}</Select>
              <Input value={r.description} onChange={(e) => setForm({ ...form, risks: form.risks.map((x, j) => (j === i ? { ...x, description: e.target.value } : x)) })} />
              <button type="button" onClick={() => setForm({ ...form, risks: form.risks.filter((_, j) => j !== i) })} style={{ border: 'none', background: 'none', color: '#b91c1c', cursor: 'pointer' }}>×</button>
            </div>
          ))}
          <Button size="sm" variant="ghost" icon={Plus} style={{ marginTop: 6 }} onClick={() => setForm({ ...form, risks: [...form.risks, { category: RISK_TYPES[0], description: '' }] })}>Add risk</Button>
          <Field label="Summary"><Textarea rows={3} value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })} /></Field>
          <Field label="Next steps"><Textarea rows={2} value={form.next_steps} onChange={(e) => setForm({ ...form, next_steps: e.target.value })} /></Field>
        </Drawer>
      )}
    </section>
  );
}

// ── Due Diligence register (Sale Steps 7, 19–21; Purchase Steps 15–17) ─────
const DOC_TONE = { required: 'grey', received: 'blue', verified: 'green', rejected: 'red' };

export function DueDiligenceSection({ propertyId }) {
  const toast = useToast();
  const [rows, setRows] = useState(null);
  const [escalate, setEscalate] = useState(null); // { doc, note }
  const load = useCallback(async () => {
    try { const { data } = await api.get('/business-documents', { params: { property_id: propertyId } }); setRows(data.data || []); }
    catch { setRows([]); toast.error('Could not load the due-diligence register'); }
  }, [propertyId, toast]);
  useEffect(() => { load(); }, [load]);
  const seed = async () => { try { await api.post('/business-documents/seed-checklist', { property_id: propertyId }); load(); } catch { toast.error('Could not create the checklist'); } };
  const setFile = async (doc, file_url) => { try { await api.put(`/business-documents/${doc.id}`, { file_url, status: file_url ? 'received' : 'required' }); load(); } catch { toast.error('Upload not saved'); } };
  const verify = async (doc) => { try { await api.patch(`/business-documents/${doc.id}/verify`, { status: 'verified' }); load(); } catch { toast.error('Could not verify'); } };
  const sendEscalation = async () => {
    try { await api.post(`/business-documents/${escalate.doc.id}/escalate`, { note: escalate.note }); toast.success('Escalated to management'); setEscalate(null); load(); }
    catch (e) { toast.error(e.response?.data?.error || 'Escalation failed'); }
  };
  if (rows === null) return <Spinner />;
  return (
    <section className="pm-card" style={{ padding: 18 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0 }}>Due diligence</h3>
        <Button variant="ghost" onClick={seed}>{rows.length ? 'Add missing items' : 'Create SOP checklist'}</Button>
      </div>
      <table className="tbl" style={{ marginTop: 10 }}>
        <thead><tr><th>Document</th><th>Status</th><th>File</th><th /></tr></thead>
        <tbody>
          {rows.length === 0 && <tr><td colSpan={4} className="cell-sub">No checklist yet.</td></tr>}
          {rows.map((d) => (
            <tr key={d.id}>
              <td>{d.name}{d.notes && <div className="cell-sub" style={{ whiteSpace: 'pre-wrap' }}>{d.notes}</div>}</td>
              <td><Badge tone={DOC_TONE[d.status] || 'grey'}>{d.status === 'rejected' ? 'flagged' : d.status}</Badge></td>
              <td>{d.file_url ? <a href={fileSrc(d.file_url)} target="_blank" rel="noreferrer">View</a> : <UploadButton value={d.file_url || ''} onChange={(url) => setFile(d, url)} folder="documents" />}</td>
              <td style={{ whiteSpace: 'nowrap' }}>
                {d.status === 'received' && <Button size="sm" variant="ghost" icon={CheckCircle2} onClick={() => verify(d)}>Verify</Button>}
                {d.status !== 'rejected' && <Button size="sm" variant="ghost" icon={AlertTriangle} onClick={() => setEscalate({ doc: d, note: '' })}>Escalate</Button>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {escalate && (
        <Drawer open title={`Escalate — ${escalate.doc.name}`} width={440} onClose={() => setEscalate(null)}
          footer={<div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}><Button variant="ghost" onClick={() => setEscalate(null)}>Cancel</Button><Button onClick={sendEscalation}>Escalate</Button></div>}>
          <p className="cell-sub">SOP Step 20 — suspicious records, hidden liabilities, ownership inconsistency or legal disputes go to management immediately.</p>
          <Field label="What is the concern?"><Textarea rows={4} value={escalate.note} onChange={(e) => setEscalate({ ...escalate, note: e.target.value })} /></Field>
        </Drawer>
      )}
    </section>
  );
}

// ── Preparation checklist (Sale Steps 6, 8) ────────────────────────────────
const PREP_ITEMS = ['Cleaning', 'Maintenance', 'Photography', 'Videography', 'Business profile preparation', 'Signage improvement', 'Presentation improvement'];

export function PreparationSection({ propertyId }) {
  const toast = useToast();
  const [items, setItems] = useState(null);
  useEffect(() => {
    api.get(`/properties/${propertyId}/business-profile`).then(({ data }) => {
      const saved = asList(data.data?.preparation);
      setItems(PREP_ITEMS.map((label) => saved.find((s) => s.label === label) || { label, status: 'not_started', owner: '', due_date: '' }));
    }).catch(() => setItems([]));
  }, [propertyId]);
  const update = (i, patch) => setItems((cur) => cur.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const save = async () => {
    try { await api.put(`/properties/${propertyId}/business-profile`, { preparation: items }); toast.success('Preparation saved'); }
    catch (e) { toast.error(e.response?.data?.error || 'Save failed'); }
  };
  if (items === null) return <Spinner />;
  return (
    <section className="pm-card" style={{ padding: 18 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0 }}>Preparation</h3>
        <Button onClick={save}>Save</Button>
      </div>
      <table className="tbl" style={{ marginTop: 10 }}>
        <thead><tr><th>Item</th><th>Status</th><th>Owner</th><th>Due</th></tr></thead>
        <tbody>
          {items.map((it, i) => (
            <tr key={it.label}>
              <td>{it.label}</td>
              <td><Select value={it.status} onChange={(e) => update(i, { status: e.target.value })}><option value="not_started">Not started</option><option value="in_progress">In progress</option><option value="done">Done</option><option value="not_required">Not required</option></Select></td>
              <td><Input value={it.owner} onChange={(e) => update(i, { owner: e.target.value })} /></td>
              <td><Input type="date" value={it.due_date} onChange={(e) => update(i, { due_date: e.target.value })} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
```

- [ ] **Step 2: Wire into the property file**

In `admin-portal/src/screens/sales/SalesPropertyFile.jsx`:
- Import: `import { BUSINESS_SECTIONS, BusinessAssessmentSection, DueDiligenceSection, PreparationSection } from './business/BusinessPropertySections';`
- Inside the component, once `property` is available, add: `const sections = property?.category === 'business' ? [...SECTIONS.slice(0, 3), ...BUSINESS_SECTIONS, ...SECTIONS.slice(3)] : SECTIONS;`
- In the section bar replace `{SECTIONS.map(({ key, label, icon: Icon }) => (` with `{sections.map(({ key, label, icon: Icon }) => (`.
- After the `{section === "assessment" && ( … )}` block add:

```jsx
      {section === "biz_assessment" && <BusinessAssessmentSection propertyId={propertyId} />}
      {section === "due_diligence" && <DueDiligenceSection propertyId={propertyId} />}
      {section === "preparation" && <PreparationSection propertyId={propertyId} />}
```

- [ ] **Step 3: Build and try it**

`npm run build` in `admin-portal/` — expected `✓ built`. Open a business property file: the three new tabs appear after Assessment; save an assessment with two risks; create the checklist, upload a file (status becomes received), verify it, escalate another (it shows as flagged and a notification appears for an admin); save preparation and reload. Open a Commercial property file and confirm the tabs are unchanged.

- [ ] **Step 4: Commit**

```bash
git add admin-portal/src/screens/sales/business/BusinessPropertySections.jsx admin-portal/src/screens/sales/SalesPropertyFile.jsx
git commit -m "feat(business): assessment, due diligence and preparation tabs on business property files

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 13: Buyer suitability + shortlist investment summary

**Files:**
- Create: `admin-portal/src/screens/sales/business/BuyerSuitabilityCard.jsx`
- Modify: `backend/controllers/buyerMandate.controller.js` (getOne), `admin-portal/src/screens/sales/BuyerMandateDetail.jsx`, `backend/scripts/e2e/businessParity.js`

**Interfaces:**
- Consumes: `buyer_mandates.category/suitability` (Task 4), `property_business_profiles` (Task 7).
- Produces: `GET /api/buyer-mandates/:id` candidates of business properties carry `investment_summary: { asking_price, annual_turnover, annual_profit, price_to_profit }`.

- [ ] **Step 1: Investment summary on candidates**

In `backend/controllers/buyerMandate.controller.js`:
- Line 14: add `'category'` to `PROP_ATTRS` → `const PROP_ATTRS = ['id', 'property_code', 'title', 'area', 'price', 'owner_contact_id', 'category'];`
- Add at the top: `const PropertyBusinessProfile = require('../models/PropertyBusinessProfile');`
- Replace `exports.getOne` with:

```js
exports.getOne = asyncHandler(async (req, res) => {
  const m = await BuyerMandate.findOne({ where: { id: req.params.id, ...branchScope(req) }, include: mandateIncludes(true) });
  if (!m) return res.status(404).json({ error: 'Mandate not found.' });
  const json = { ...m.toJSON(), buyer_name: buyerName(m) };
  // Business shortlist candidates carry an investment summary (Purchase SOP Step 8).
  const bizIds = (json.candidates || []).filter((c) => c.property?.category === 'business').map((c) => c.property.id);
  if (bizIds.length) {
    const profiles = await PropertyBusinessProfile.findAll({ where: { property_id: bizIds }, raw: true });
    const byId = new Map(profiles.map((p) => [Number(p.property_id), p]));
    json.candidates = json.candidates.map((c) => {
      const p = c.property && byId.get(Number(c.property.id));
      if (!p) return c;
      const price = Number(c.property.price) || null;
      const profit = Number(p.annual_profit) || null;
      return { ...c, investment_summary: { asking_price: price, annual_turnover: Number(p.annual_turnover) || null, annual_profit: profit, price_to_profit: price && profit ? Math.round((price / profit) * 10) / 10 : null } };
    });
  }
  res.json({ data: json });
});
```

- [ ] **Step 2: The suitability card**

`admin-portal/src/screens/sales/business/BuyerSuitabilityCard.jsx`:

```jsx
import React, { useEffect, useState } from 'react';
import api from '../../../services/api';
import { useToast } from '../../../context/ToastContext';
import { Button, Field, Select, Textarea } from '../../../ui/kit';

const LEVELS = [['strong', 'Strong'], ['adequate', 'Adequate'], ['weak', 'Weak'], ['unknown', 'Not assessed']];
const CRITERIA = [['readiness', 'Buyer readiness'], ['investment_capability', 'Investment capability'], ['financing_feasibility', 'Financing feasibility'], ['operational_capability', 'Operational capability']];
const parse = (v) => { if (v && typeof v === 'object') return v; try { return JSON.parse(v || '{}') || {}; } catch { return {}; } };

/** Business Purchase SOP Step 2 — acquisition suitability of the buyer. */
export default function BuyerSuitabilityCard({ mandate, onSaved }) {
  const toast = useToast();
  const [s, setS] = useState({});
  useEffect(() => { setS({ verdict: 'pending', notes: '', ...parse(mandate.suitability) }); }, [mandate]);
  const save = async () => {
    try { await api.put(`/buyer-mandates/${mandate.id}`, { suitability: { ...s, assessed_at: new Date().toISOString() } }); toast.success('Suitability saved'); onSaved?.(); }
    catch (e) { toast.error(e.response?.data?.error || 'Save failed'); }
  };
  return (
    <div className="card" style={{ padding: 16, marginTop: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0 }}>Acquisition suitability</h3>
        <Button size="sm" onClick={save}>Save</Button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginTop: 10 }}>
        {CRITERIA.map(([k, l]) => (
          <Field key={k} label={l}><Select value={s[k] || 'unknown'} onChange={(e) => setS({ ...s, [k]: e.target.value })}>{LEVELS.map(([v, t]) => <option key={v} value={v}>{t}</option>)}</Select></Field>
        ))}
        <Field label="Verdict"><Select value={s.verdict} onChange={(e) => setS({ ...s, verdict: e.target.value })}><option value="pending">Pending</option><option value="suitable">Suitable</option><option value="conditional">Suitable with conditions</option><option value="not_suitable">Not suitable</option></Select></Field>
      </div>
      <Field label="Notes"><Textarea rows={2} value={s.notes} onChange={(e) => setS({ ...s, notes: e.target.value })} /></Field>
    </div>
  );
}
```

- [ ] **Step 3: Show it on the mandate + the summary in the shortlist**

In `admin-portal/src/screens/sales/BuyerMandateDetail.jsx`:
- Import `BuyerSuitabilityCard from './business/BuyerSuitabilityCard'`.
- Directly above the Shortlist heading (`<h3 style={{ margin: 0 }}>Shortlist (…)</h3>`'s card), render `{m.category === 'business' && <BuyerSuitabilityCard mandate={m} onSaved={load} />}`.
- In the shortlist row, next to the candidate's property title cell, add:

```jsx
                  {c.investment_summary && (
                    <div className="cell-sub">
                      Price ৳{Number(c.investment_summary.asking_price || 0).toLocaleString()} · Turnover ৳{Number(c.investment_summary.annual_turnover || 0).toLocaleString()} · Profit ৳{Number(c.investment_summary.annual_profit || 0).toLocaleString()}
                      {c.investment_summary.price_to_profit ? ` · ${c.investment_summary.price_to_profit}× profit` : ''}
                    </div>
                  )}
```

- [ ] **Step 4: E2E**

Append to `phase4` in `businessParity.js`:

```js
  const mandate = await req('POST', '/api/buyer-mandates?category=business', { body: { notes: `Suit ${STAMP}` } });
  const mid = mandate.body?.data?.id;
  const put = await req('PUT', `/api/buyer-mandates/${mid}`, { body: { suitability: { readiness: 'strong', verdict: 'suitable' } } });
  ok(put.status === 200, 'suitability saved on the mandate', `HTTP ${put.status}`);
  await req('POST', `/api/buyer-mandates/${mid}/candidates`, { body: { property_id: propertyId, fit_note: 'e2e' } });
  const got = await req('GET', `/api/buyer-mandates/${mid}`);
  const cand = (got.body?.data?.candidates || []).find((c) => Number(c.property_id || c.property?.id) === Number(propertyId));
  ok(!!cand?.investment_summary, 'business shortlist candidate has an investment summary');
```

Restart the backend; run `node scripts/e2e/businessParity.js 4` — expected all PASS. `npm run build` in `admin-portal/` — expected `✓ built`; check the card and summary on `/business/mandates/:id`.

- [ ] **Step 5: Commit**

```bash
git add admin-portal/src/screens/sales/business/BuyerSuitabilityCard.jsx admin-portal/src/screens/sales/BuyerMandateDetail.jsx backend/controllers/buyerMandate.controller.js backend/scripts/e2e/businessParity.js
git commit -m "feat(business): buyer acquisition suitability + shortlist investment summary

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

# Phase 5 — Confidentiality / NDA gate

### Task 14: NDA table, document and service

**Files:**
- Create: `backend/migrations/0144-business-ndas.js`, `backend/models/BusinessNda.js`, `backend/services/ndaDocument.service.js`, `backend/services/businessNda.service.js`, `backend/scripts/testBusinessNda.js`
- Modify: `backend/services/salesAgreementRender.js` (export `signSlot`), `backend/package.json`

**Interfaces:**
- Produces: `BusinessNda` model; `renderNdaHtml({ buyer, property, org, effectiveDate }): string`; from `businessNda.service`: `tokenState(nda, now?): 'valid'|'expired'|'invalid'`, `requestNda({ propertyIdOrSlug, form, branchIdFallback }): Promise<{ nda, created }>`, `approveAndSend(nda, req): Promise<nda>`, `onSigned(envelope, { transaction }): Promise<void>`, `release(nda, req): Promise<{ nda, link }>`, `decline(nda, reason, req): Promise<nda>`, `fullDetailsByToken(token): Promise<object|null>`.

- [ ] **Step 1: Write the failing test**

`backend/scripts/testBusinessNda.js`:

```js
const assert = require('assert');
const { tokenState } = require('../services/businessNda.service');

const now = new Date('2026-09-21T10:00:00Z');
const future = new Date('2026-10-01T00:00:00Z');
const past = new Date('2026-09-01T00:00:00Z');
assert.strictEqual(tokenState({ status: 'released', release_token: 'x', token_expires_at: future }, now), 'valid');
assert.strictEqual(tokenState({ status: 'released', release_token: 'x', token_expires_at: past }, now), 'expired');
assert.strictEqual(tokenState({ status: 'signed', release_token: 'x', token_expires_at: future }, now), 'invalid');
assert.strictEqual(tokenState({ status: 'released', release_token: null, token_expires_at: future }, now), 'invalid');
assert.strictEqual(tokenState(null, now), 'invalid');
console.log('businessNda OK');
```

- [ ] **Step 2: Run it to verify it fails**

Run: `node scripts/testBusinessNda.js`
Expected: `Cannot find module '../services/businessNda.service'`

- [ ] **Step 3: Migration + model**

`backend/migrations/0144-business-ndas.js`:

```js
'use strict';

/**
 * Migration 0144: business_ndas — a buyer's confidentiality agreement for one
 * business listing (Sale SOP Step 13 / Purchase SOP Step 11).
 * requested → sent (approved) → signed → released, or declined.
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    const S = Sequelize;
    const tables = (await queryInterface.showAllTables()).map((t) => (typeof t === 'string' ? t : t.tableName).toLowerCase());
    if (tables.includes('business_ndas')) return;
    await queryInterface.createTable('business_ndas', {
      id: { type: S.INTEGER, autoIncrement: true, primaryKey: true },
      branch_id: { type: S.INTEGER, allowNull: false },
      property_id: { type: S.INTEGER, allowNull: false },
      contact_id: { type: S.INTEGER, allowNull: false },
      enquiry_id: S.INTEGER,
      envelope_id: S.INTEGER,
      status: { type: S.STRING(20), allowNull: false, defaultValue: 'requested' },
      buyer_company: S.STRING(160),
      approved_by: S.INTEGER, approved_at: S.DATE,
      signed_at: S.DATE,
      released_by: S.INTEGER, released_at: S.DATE,
      release_token: { type: S.STRING(64), unique: true },
      token_expires_at: S.DATE,
      decline_reason: S.TEXT,
      last_error: S.TEXT,
      created_at: { type: S.DATE, allowNull: false, defaultValue: S.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: S.DATE, allowNull: false, defaultValue: S.literal('CURRENT_TIMESTAMP') },
    });
    await queryInterface.addIndex('business_ndas', ['property_id']);
    await queryInterface.addIndex('business_ndas', ['contact_id']);
    await queryInterface.addIndex('business_ndas', ['status']);
  },
  down: async (queryInterface) => { await queryInterface.dropTable('business_ndas').catch(() => {}); },
};
```

`backend/models/BusinessNda.js`:

```js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/db.config');

/** A buyer's NDA for one confidential business listing (0144). */
const BusinessNda = sequelize.define('BusinessNda', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  branch_id: { type: DataTypes.INTEGER, allowNull: false },
  property_id: { type: DataTypes.INTEGER, allowNull: false },
  contact_id: { type: DataTypes.INTEGER, allowNull: false },
  enquiry_id: DataTypes.INTEGER,
  envelope_id: DataTypes.INTEGER,
  status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'requested' },
  buyer_company: DataTypes.STRING(160),
  approved_by: DataTypes.INTEGER,
  approved_at: DataTypes.DATE,
  signed_at: DataTypes.DATE,
  released_by: DataTypes.INTEGER,
  released_at: DataTypes.DATE,
  release_token: { type: DataTypes.STRING(64), unique: true },
  token_expires_at: DataTypes.DATE,
  decline_reason: DataTypes.TEXT,
  last_error: DataTypes.TEXT,
}, { tableName: 'business_ndas', underscored: true });

module.exports = BusinessNda;
```

Run `npm run db:migrate` — expected `0144-business-ndas: migrated`.

- [ ] **Step 4: The NDA document**

In `backend/services/salesAgreementRender.js` change the last line to also export `signSlot`:

```js
module.exports = { getCatalog, computePricing, buildAgreement, money, esc, signSlot };
```

`backend/services/ndaDocument.service.js`:

```js
// Business Confidentiality Agreement (NDA) — drafted from the Business Sale SOP
// §12 (non-circumvention) and §14 (confidentiality) and Business Purchase SOP
// §11/§13. LEGAL REVIEW REQUIRED before live use. Sign anchors match
// buildSignerDefs labels ('Client', 'Seventh Sky').
const { esc, signSlot } = require('./salesAgreementRender');

const CLAUSES = [
  ['Purpose', 'Seventh Sky Property Care ("Seventh Sky") will disclose confidential information about the business identified below (the "Business") so the Recipient can evaluate a possible acquisition. This Agreement governs that information.'],
  ['Confidential Information', 'Confidential Information includes the identity of the Business and its owners, its location, financial records, customer, supplier and employee information, operational strategies, lease and licence details, and any information marked or reasonably understood to be confidential.'],
  ['Use and non-disclosure', 'The Recipient will use the Confidential Information only to evaluate the acquisition, will not disclose it to anyone except professional advisers who are bound by equivalent confidentiality, and will not copy it except as reasonably necessary for that evaluation.'],
  ['No direct approach (non-circumvention)', 'For 24 months from signing, the Recipient will not contact the owners, employees, landlord, customers or suppliers of the Business about its sale or acquisition except through Seventh Sky, and will not complete any acquisition of the Business, directly or indirectly, without Seventh Sky. If the Recipient does so, the professional fee Seventh Sky would have earned remains payable.'],
  ['Return of information', 'On request, or if the Recipient decides not to proceed, the Recipient will return or destroy the Confidential Information and confirm this in writing.'],
  ['No warranty', 'Seventh Sky and the owners make no representation about the accuracy or completeness of the Confidential Information. The Recipient remains responsible for its own independent legal, accounting, financial, taxation and operational review.'],
  ['Evidence', 'The Recipient agrees that CRM records, e-mails, WhatsApp messages, inspection logs and digital approvals kept by Seventh Sky may be relied on as evidence of introductions and communications.'],
  ['Term and law', 'The confidentiality obligations survive for 3 years after signing. This Agreement is governed by the laws of the People\'s Republic of Bangladesh.'],
];

function renderNdaHtml({ buyer = {}, property = {}, org = {}, effectiveDate }) {
  const ref = property.property_code || `#${property.id}`;
  return `
<div class="sales-doc" style="font-family:'Plus Jakarta Sans',Arial,sans-serif;color:#1e293b;max-width:760px;margin:0 auto;padding:32px 40px;line-height:1.6;font-size:13.5px;">
  <div style="font-size:11px;font-weight:700;color:#00AEEF;letter-spacing:1px;text-transform:uppercase;">Seventh Sky Property Care · Business Services</div>
  <h1 style="font-size:24px;color:#012a4e;margin:6px 0 4px;">Business Confidentiality Agreement</h1>
  <div style="font-size:12px;color:#64748b;margin-bottom:18px;">Listing ${esc(ref)} · Effective ${esc(effectiveDate)}</div>
  <p><b>Between</b> ${esc(org.name || 'Seventh Sky Private Limited (Seventh Sky Property Care)')} and <b>${esc(buyer.full_name)}</b>${buyer.company ? ` of ${esc(buyer.company)}` : ''} (the "Recipient"), email ${esc(buyer.email)}.</p>
  <p><b>Business:</b> the business marketed by Seventh Sky under listing reference ${esc(ref)}.</p>
  ${CLAUSES.map(([t, b], i) => `<h2 style="font-size:14px;color:#012a4e;margin:16px 0 4px;">${i + 1}. ${esc(t)}</h2><p style="margin:0;">${esc(b)}</p>`).join('')}
  <div id="signatures-section" style="display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-top:28px;">
    <div style="border:1px solid #cbd5e1;border-radius:12px;padding:14px;"><div style="font-weight:800;color:#012a4e;">Recipient</div><div>${esc(buyer.full_name)}</div>${signSlot('Client')}</div>
    <div style="border:1px solid #cbd5e1;border-radius:12px;padding:14px;"><div style="font-weight:800;color:#012a4e;">Seventh Sky</div><div>${esc(org.represented_by || 'Authorised signatory')}</div>${signSlot('Seventh Sky')}</div>
  </div>
</div>`;
}

module.exports = { renderNdaHtml, NDA_CLAUSES: CLAUSES };
```

- [ ] **Step 5: The NDA service**

`backend/services/businessNda.service.js`:

```js
// Business NDA lifecycle: website request → staff approve & send (eSign) →
// signed (introduction recorded) → staff release (tokenised full-details link).
const crypto = require('crypto');
const { Op } = require('sequelize');
const sequelize = require('../config/db.config');
const BusinessNda = require('../models/BusinessNda');
const Property = require('../models/Property');
const PropertyMedia = require('../models/PropertyMedia');
const Contact = require('../models/Contact');
const SalesEnquiry = require('../models/SalesEnquiry');
const { generateCode } = require('../utils/codeGenerator');
const SigningEnvelope = require('../models/SigningEnvelope');
const NonCircumventionRecord = require('../models/NonCircumventionRecord');
const PropertyBusinessProfile = require('../models/PropertyBusinessProfile');
const { renderNdaHtml } = require('./ndaDocument.service');
const { buildSignerDefs, persistSigners, dispatchEnvelope, emailFirstSigner } = require('./agreementSigners.service');
const { pickPublic } = require('./publicPropertyShape');
const { fullBusinessDetails } = require('./businessTeaser.service');

const TOKEN_DAYS = 30;
const OPEN = ['requested', 'approved', 'sent', 'signed', 'released'];

function tokenState(nda, now = new Date()) {
  if (!nda || nda.status !== 'released' || !nda.release_token) return 'invalid';
  return new Date(nda.token_expires_at) > now ? 'valid' : 'expired';
}

async function findBusinessProperty(idOrSlug) {
  const or = [{ property_code: String(idOrSlug) }, { slug: String(idOrSlug) }];
  if (/^\d+$/.test(String(idOrSlug))) or.push({ id: Number(idOrSlug) });
  return Property.findOne({ where: { [Op.or]: or, category: 'business', is_published: true } });
}

// Public: a buyer asks for full details. Idempotent per (buyer email, property).
async function requestNda({ propertyIdOrSlug, form }) {
  const property = await findBusinessProperty(propertyIdOrSlug);
  if (!property) { const e = new Error('Listing not found.'); e.status = 404; throw e; }
  const email = String(form.email || '').trim().toLowerCase();
  const name = String(form.full_name || '').trim();
  if (!name || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { const e = new Error('Name and a valid email are required.'); e.status = 400; throw e; }

  return sequelize.transaction(async (t) => {
    let contact = await Contact.findOne({ where: { email, branch_id: property.branch_id }, transaction: t });
    if (!contact) {
      contact = await Contact.create({
        branch_id: property.branch_id, full_name: name, email, primary_phone: form.phone || null,
        company_name: form.company || null, contact_type: 'individual', category: 'business', looking_for: 'buy', lead_status: 'new',
      }, { transaction: t });
    }
    const existing = await BusinessNda.findOne({ where: { property_id: property.id, contact_id: contact.id, status: { [Op.in]: OPEN } }, transaction: t });
    if (existing) return { nda: existing, created: false };
    const enquiry = await SalesEnquiry.create({
      enquiry_code: await generateCode(SalesEnquiry, 'enquiry_code', 'SSPC-BEQ-'),
      branch_id: property.branch_id, property_id: property.id, contact_id: contact.id, enquirer_name: name,
      email, phone: form.phone || null, source: 'website', stage: 'new', next_action: 'Verify buyer & send NDA',
    }, { transaction: t });
    const nda = await BusinessNda.create({
      branch_id: property.branch_id, property_id: property.id, contact_id: contact.id, enquiry_id: enquiry.id,
      buyer_company: form.company || null, status: 'requested',
    }, { transaction: t });
    return { nda, created: true };
  });
}

// Staff: identity checked → create the eSign envelope and send it.
async function approveAndSend(nda, req) {
  if (!['requested', 'approved'].includes(nda.status)) { const e = new Error(`Cannot send an NDA that is ${nda.status}.`); e.status = 409; throw e; }
  const [property, contact] = await Promise.all([Property.findByPk(nda.property_id), Contact.findByPk(nda.contact_id)]);
  const org = { name: 'Seventh Sky Private Limited (Seventh Sky Property Care)', represented_by: req.user?.name || req.user?.full_name || 'Authorised signatory', email: req.user?.email || null };
  const buyer = { full_name: contact.full_name, email: contact.email, phone: contact.primary_phone, company: nda.buyer_company, contact_id: contact.id };
  await nda.update({ status: 'approved', approved_by: req.user?.id || null, approved_at: new Date(), last_error: null });
  try {
    const out = await sequelize.transaction(async (t) => {
      const env = await SigningEnvelope.create({
        branch_id: nda.branch_id, envelope_code: `ENV-NDA-${Date.now().toString().slice(-6)}`,
        title: `Business Confidentiality Agreement — ${contact.full_name} — ${property.property_code || property.id}`,
        document_html: renderNdaHtml({ buyer, property, org, effectiveDate: new Date().toISOString().slice(0, 10) }),
        related_type: 'business_nda', related_id: nda.id, status: 'draft',
        expires_at: new Date(Date.now() + 30 * 864e5), signing_order_enforced: true, kyc_role: 'buyer',
        terms: { doc_no: 'SSPC-BNDA-01', nda_id: nda.id, property_id: property.id }, created_by: req.user?.id || null,
      }, { transaction: t });
      await persistSigners(env, buildSignerDefs({ clients: [buyer], org, witnesses: [], user: req.user || {} }), t);
      const links = await dispatchEnvelope(env, t);
      return { env, links };
    });
    await emailFirstSigner(out.env, out.links, req);
    await nda.update({ status: 'sent', envelope_id: out.env.id });
  } catch (e) {
    await nda.update({ last_error: e.message });
    throw e;
  }
  return nda;
}

// Called from handleEnvelopeCompleted for related_type 'business_nda'.
async function onSigned(envelope, { transaction } = {}) {
  const nda = await BusinessNda.findByPk(envelope.related_id, { transaction });
  if (!nda || nda.status === 'signed' || nda.status === 'released') return;
  await nda.update({ status: 'signed', signed_at: new Date() }, { transaction });
  const property = await Property.findByPk(nda.property_id, { transaction });
  await NonCircumventionRecord.create({
    branch_id: nda.branch_id, context: 'sale', property_id: nda.property_id,
    owner_contact_id: property?.owner_contact_id || null, tenant_contact_id: nda.contact_id,
    protected_relationship: 'Buyer introduced to confidential business (NDA signed)',
    introduction_date: new Date().toISOString().slice(0, 10), protection_basis: 'Business Confidentiality Agreement (NDA)',
    status: 'active', introduced_by: nda.approved_by || null, created_by: nda.approved_by || null,
  }, { transaction });
}

// Staff: release full details → tokenised link emailed to the buyer.
async function release(nda, req) {
  if (nda.status !== 'signed' && nda.status !== 'released') { const e = new Error('Only a signed NDA can be released.'); e.status = 409; throw e; }
  const token = crypto.randomBytes(32).toString('hex');
  await nda.update({ status: 'released', released_by: req.user?.id || null, released_at: new Date(), release_token: token, token_expires_at: new Date(Date.now() + TOKEN_DAYS * 864e5) });
  const base = (process.env.PUBLIC_SITE_URL || `${req.protocol}://${req.get('host')}`).replace(/\/$/, '');
  const link = `${base}/business-details/${token}`;
  const contact = await Contact.findByPk(nda.contact_id);
  try {
    const { sendEmail } = require('./communication.service');
    await sendEmail(contact.email, 'Business details — Seventh Sky Property Care',
      `<p>Dear ${contact.full_name},</p><p>Thank you for signing the confidentiality agreement. The full details of the business are available at the link below for ${TOKEN_DAYS} days:</p><p><a href="${link}">${link}</a></p><p>Please keep them confidential, as agreed.</p><p>Seventh Sky Property Care</p>`);
  } catch (e) { console.warn('[business-nda] release email failed:', e.message); }
  return { nda, link };
}

async function decline(nda, reason, req) {
  if (['released', 'declined'].includes(nda.status)) { const e = new Error(`Cannot decline an NDA that is ${nda.status}.`); e.status = 409; throw e; }
  await nda.update({ status: 'declined', decline_reason: String(reason || '').trim() || null, approved_by: req.user?.id || nda.approved_by });
  return nda;
}

// Public: full details for a released, unexpired token — otherwise null.
async function fullDetailsByToken(token) {
  if (!/^[a-f0-9]{64}$/.test(String(token || ''))) return null;
  const nda = await BusinessNda.findOne({ where: { release_token: token } });
  if (tokenState(nda) !== 'valid') return null;
  const property = await Property.findByPk(nda.property_id, { include: [{ model: PropertyMedia, as: 'media', attributes: ['id', 'file_url', 'media_type', 'caption', 'sort_order'] }] });
  if (!property) return null;
  const plain = property.get({ plain: true });
  const profile = await PropertyBusinessProfile.findOne({ where: { property_id: nda.property_id }, raw: true });
  return fullBusinessDetails({ ...pickPublic(plain), media: plain.media || [] }, profile);
}

module.exports = { tokenState, requestNda, approveAndSend, onSigned, release, decline, fullDetailsByToken };
```

(Field names verified against the models: `SalesEnquiry` has `enquiry_code, property_id, contact_id, enquirer_name, phone, email, source, stage, next_action`; `PropertyMedia.js` registers `Property.hasMany(PropertyMedia, { as: 'media' })`.)

- [ ] **Step 6: Run the unit test**

Run: `node scripts/testBusinessNda.js`
Expected: `businessNda OK`. Add it to the `test` script.

- [ ] **Step 7: Commit**

```bash
git add backend/migrations/0144-business-ndas.js backend/models/BusinessNda.js backend/services/ndaDocument.service.js backend/services/businessNda.service.js backend/services/salesAgreementRender.js backend/scripts/testBusinessNda.js backend/package.json
git commit -m "feat(business): NDA lifecycle — request, e-sign, introduction, tokenised release

business_ndas (0144) + a Business Confidentiality Agreement document (wording to
be reviewed by legal) + the service that sends it through eSign, records the
introduction on signing and releases a 30-day full-details token.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 15: NDA routes and the signing hook

**Files:**
- Create: `backend/controllers/businessNda.controller.js`, `backend/routes/businessNda.routes.js`
- Modify: `backend/routes/publicWebsite.routes.js`, `backend/controllers/publicWebsite.controller.js`, `backend/services/partyRoleActivation.service.js`, `backend/routes/manifest.js`, `backend/server.js` (own hunk only), `backend/scripts/e2e/businessParity.js`

**Interfaces:**
- Produces (public): `POST /api/public-website/business-nda-requests { property, full_name, email, phone?, company? } → 201 { data: { status } }` (200 if already open); `GET /api/public-website/business-details/:token → 200 { data } | 404`.
- Produces (admin): `GET /api/business-ndas?property_id=`, `POST /api/business-ndas/:id/approve`, `POST /api/business-ndas/:id/release → { data: { nda, link } }`, `POST /api/business-ndas/:id/decline { reason }`.

- [ ] **Step 1: Admin controller + routes**

`backend/controllers/businessNda.controller.js`:

```js
const BusinessNda = require('../models/BusinessNda');
const Contact = require('../models/Contact');
const svc = require('../services/businessNda.service');
const { asyncHandler, branchScope } = require('../utils/controllerHelpers');

const load = (req) => BusinessNda.findOne({ where: { id: req.params.id, ...branchScope(req) } });
const fail = (res, e) => res.status(e.status || 500).json({ error: e.message });
const shape = (n, contacts) => { const j = n.toJSON(); delete j.release_token; const c = contacts.get(j.contact_id); return { ...j, buyer_name: c?.full_name || null, buyer_email: c?.email || null, buyer_phone: c?.primary_phone || null }; };

exports.list = asyncHandler(async (req, res) => {
  const where = { ...branchScope(req) };
  if (req.query.property_id) where.property_id = req.query.property_id;
  if (req.query.contact_id) where.contact_id = req.query.contact_id;
  const rows = await BusinessNda.findAll({ where, order: [['created_at', 'DESC']] });
  const ids = [...new Set(rows.map((r) => r.contact_id))];
  const contacts = new Map((ids.length ? await Contact.findAll({ where: { id: ids }, attributes: ['id', 'full_name', 'email', 'primary_phone'], raw: true }) : []).map((c) => [c.id, c]));
  res.json({ data: rows.map((r) => shape(r, contacts)) });
});

exports.approve = asyncHandler(async (req, res) => {
  const nda = await load(req); if (!nda) return res.status(404).json({ error: 'NDA not found.' });
  try { await svc.approveAndSend(nda, req); res.json({ data: nda, message: 'NDA sent for e-signature.' }); } catch (e) { fail(res, e); }
});

exports.release = asyncHandler(async (req, res) => {
  const nda = await load(req); if (!nda) return res.status(404).json({ error: 'NDA not found.' });
  try { const { link } = await svc.release(nda, req); res.json({ data: { nda: { id: nda.id, status: nda.status, released_at: nda.released_at, token_expires_at: nda.token_expires_at }, link }, message: 'Full details released and emailed.' }); } catch (e) { fail(res, e); }
});

exports.decline = asyncHandler(async (req, res) => {
  const nda = await load(req); if (!nda) return res.status(404).json({ error: 'NDA not found.' });
  try { await svc.decline(nda, req.body.reason, req); res.json({ data: nda, message: 'Request declined.' }); } catch (e) { fail(res, e); }
});
```

`backend/routes/businessNda.routes.js`:

```js
const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/businessNda.controller');
const { authMiddleware, roleMiddleware } = require('../middleware/auth.middleware');

const ROLES = ['super_admin', 'branch_admin', 'property_manager', 'sales_executive'];
router.use(authMiddleware, roleMiddleware(ROLES));

router.get('/', ctrl.list);
router.post('/:id/approve', ctrl.approve);
router.post('/:id/release', ctrl.release);
router.post('/:id/decline', ctrl.decline);

module.exports = router;
```

- [ ] **Step 2: Public endpoints**

In `backend/controllers/publicWebsite.controller.js`:

```js
const businessNda = require('../services/businessNda.service');

// POST /api/public-website/business-nda-requests
exports.requestBusinessNda = asyncHandler(async (req, res) => {
  try {
    const { nda, created } = await businessNda.requestNda({ propertyIdOrSlug: req.body.property, form: req.body || {} });
    res.status(created ? 201 : 200).json({ data: { status: nda.status }, message: 'Thank you — our team will verify your details and send the confidentiality agreement.' });
  } catch (e) { res.status(e.status || 500).json({ error: e.message }); }
});

// GET /api/public-website/business-details/:token
exports.getBusinessDetailsByToken = asyncHandler(async (req, res) => {
  const data = await businessNda.fullDetailsByToken(req.params.token);
  if (!data) return res.status(404).json({ error: 'This link is invalid or has expired. Please contact Seventh Sky.' });
  res.json({ data });
});
```

In `backend/routes/publicWebsite.routes.js`, under the unauthenticated section:

```js
router.post('/business-nda-requests', enquiryLimiter, ctrl.requestBusinessNda);
router.get('/business-details/:token', listingLimiter, ctrl.getBusinessDetailsByToken);
```

- [ ] **Step 3: Signing hook**

In `backend/services/partyRoleActivation.service.js`, inside `handleEnvelopeCompleted`'s transaction, after the sales-agreement billing block add:

```js
    // Business NDA signed → mark signed + record the buyer introduction (non-circumvention evidence).
    if (envelope.related_type === 'business_nda') {
      try { await require('./businessNda.service').onSigned(envelope, { transaction: tx }); }
      catch (e) { console.warn('[business-nda] on sign:', e.message); }
    }
```

- [ ] **Step 4: Mount the admin route (manifest + own server.js hunk)**

In `backend/routes/manifest.js`, after the business-registration entries add `['/api/business-ndas', './businessNda.routes'],`. In `backend/server.js`, after `mount('/api/business-registration-reports', …);` add `mount('/api/business-ndas', './routes/businessNda.routes');`.

`server.js` also holds another contributor's uncommitted `process.on` handlers, so stage only your hunk:

```bash
D="C:/Users/ADMIN/AppData/Local/Temp/claude/reg"
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
keep = [h for h in hunks if any('business-ndas' in x for x in h)]
patch = '\n'.join(hdr + [x for h in keep for x in h])
open(out, 'w', encoding='utf-8', newline='\n').write(patch if patch.endswith('\n') else patch + '\n')
print('kept', len(keep), 'of', len(hunks))
PY
git apply --cached "$D/sj-mine.patch"
git diff --cached -- backend/server.js   # must show ONLY the business-ndas mount line
```

Run `node scripts/testManifestParity.js` — expected OK.

- [ ] **Step 5: E2E (up to "sent")**

Append `phase5` to `businessParity.js` (the final IIFE from Task 11 already calls it):

```js
async function phase5(propertyId) {
  console.log('\n— Phase 5: NDA gate —');
  const email = `buyer${STAMP}@example.com`;
  const r1 = await req('POST', '/api/public-website/business-nda-requests', { noAuth: true, body: { property: propertyId, full_name: `Buyer ${STAMP}`, email, phone: '01700000000', company: 'Acq Ltd' } });
  ok(r1.status === 201, 'website NDA request accepted', `HTTP ${r1.status}`);
  const r2 = await req('POST', '/api/public-website/business-nda-requests', { noAuth: true, body: { property: propertyId, full_name: `Buyer ${STAMP}`, email } });
  ok(r2.status === 200, 'repeat request returns the open one (no duplicate)', `HTTP ${r2.status}`);
  const bad = await req('POST', '/api/public-website/business-nda-requests', { noAuth: true, body: { property: propertyId, full_name: 'x', email: 'nope' } });
  ok(bad.status === 400, 'invalid email refused', `HTTP ${bad.status}`);
  const list = await req('GET', `/api/business-ndas?property_id=${propertyId}`);
  const nda = (list.body?.data || []).find((n) => n.buyer_email === email);
  ok(!!nda && nda.status === 'requested', 'NDA listed for staff', nda?.status);
  ok(nda && !('release_token' in nda), 'admin list never exposes the token');
  const enq = await req('GET', '/api/sales/inbox?category=business');
  ok((enq.body?.data || []).some((i) => Number(i.property_id) === Number(propertyId)), 'request lands in the Business inbox');
  const sent = await req('POST', `/api/business-ndas/${nda.id}/approve`);
  ok(sent.status === 200 && sent.body?.data?.status === 'sent', 'approve sends the NDA for e-signature', sent.body?.error || sent.body?.data?.status);
  const early = await req('POST', `/api/business-ndas/${nda.id}/release`);
  ok(early.status === 409, 'cannot release before signing', `HTTP ${early.status}`);
  const junk = await req('GET', '/api/public-website/business-details/abc', { noAuth: true });
  ok(junk.status === 404, 'invalid token → 404');
  return nda.id;
}
```

Restart the backend; run `node scripts/e2e/businessParity.js 5` — expected all PASS. (Signing and release are verified end-to-end through the real signing page in Task 19.)

- [ ] **Step 6: Commit**

```bash
git add backend/controllers/businessNda.controller.js backend/routes/businessNda.routes.js backend/routes/publicWebsite.routes.js backend/controllers/publicWebsite.controller.js backend/services/partyRoleActivation.service.js backend/routes/manifest.js backend/scripts/e2e/businessParity.js
# backend/server.js is already staged (own hunk only, Step 4)
git commit -m "feat(business): NDA endpoints — website request, staff approve/release/decline, signing hook

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 16: NDA panel in the property file

**Files:**
- Modify: `admin-portal/src/screens/sales/business/BusinessPropertySections.jsx`, `admin-portal/src/screens/sales/SalesPropertyFile.jsx`

**Interfaces:**
- Consumes: `/api/business-ndas` (Task 15).
- Produces: `NdaSection({ propertyId })`; `BUSINESS_SECTIONS` gains `{ key: 'nda', label: 'NDA / Confidentiality', icon: Lock }`.

- [ ] **Step 1: The section**

In `BusinessPropertySections.jsx` add `Lock` to the lucide import, append `{ key: 'nda', label: 'NDA / Confidentiality', icon: Lock }` to `BUSINESS_SECTIONS`, and add:

```jsx
// ── Confidentiality / NDA (Sale Step 13, Purchase Step 11) ──────────────────
const NDA_TONE = { requested: 'amber', approved: 'blue', sent: 'blue', signed: 'green', released: 'green', declined: 'red' };

export function NdaSection({ propertyId }) {
  const toast = useToast();
  const [rows, setRows] = useState(null);
  const [decline, setDecline] = useState(null); // { nda, reason }
  const load = useCallback(async () => {
    try { const { data } = await api.get('/business-ndas', { params: { property_id: propertyId } }); setRows(data.data || []); }
    catch { setRows([]); toast.error('Could not load NDAs'); }
  }, [propertyId, toast]);
  useEffect(() => { load(); }, [load]);
  const act = async (nda, action) => {
    try { const { data } = await api.post(`/business-ndas/${nda.id}/${action}`); toast.success(data.message || 'Done'); load(); }
    catch (e) { toast.error(e.response?.data?.error || 'Action failed'); load(); }
  };
  const sendDecline = async () => {
    try { await api.post(`/business-ndas/${decline.nda.id}/decline`, { reason: decline.reason }); setDecline(null); load(); }
    catch (e) { toast.error(e.response?.data?.error || 'Decline failed'); }
  };
  if (rows === null) return <Spinner />;
  return (
    <section className="pm-card" style={{ padding: 18 }}>
      <h3 style={{ margin: 0 }}>Confidentiality / NDA</h3>
      <p className="cell-sub">Website visitors see only the teaser. Verify each buyer's identity before sending the NDA; release full details only once it is signed.</p>
      <table className="tbl" style={{ marginTop: 10 }}>
        <thead><tr><th>Buyer</th><th>Status</th><th>Requested</th><th /></tr></thead>
        <tbody>
          {rows.length === 0 && <tr><td colSpan={4} className="cell-sub">No requests yet.</td></tr>}
          {rows.map((n) => (
            <tr key={n.id}>
              <td>{n.buyer_name}<div className="cell-sub">{[n.buyer_email, n.buyer_phone, n.buyer_company].filter(Boolean).join(' · ')}</div>{n.last_error && <div style={{ color: '#b91c1c', fontSize: 12 }}>Send failed: {n.last_error}</div>}</td>
              <td><Badge tone={NDA_TONE[n.status] || 'grey'}>{n.status}</Badge>{n.decline_reason && <div className="cell-sub">{n.decline_reason}</div>}</td>
              <td className="cell-sub">{new Date(n.created_at).toLocaleDateString()}</td>
              <td style={{ whiteSpace: 'nowrap' }}>
                {['requested', 'approved'].includes(n.status) && <Button size="sm" onClick={() => act(n, 'approve')}>Approve &amp; send NDA</Button>}
                {n.status === 'signed' && <Button size="sm" onClick={() => act(n, 'release')}>Release full details</Button>}
                {!['released', 'declined'].includes(n.status) && <Button size="sm" variant="ghost" onClick={() => setDecline({ nda: n, reason: '' })}>Decline</Button>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {decline && (
        <Drawer open title={`Decline — ${decline.nda.buyer_name}`} width={420} onClose={() => setDecline(null)}
          footer={<div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}><Button variant="ghost" onClick={() => setDecline(null)}>Cancel</Button><Button onClick={sendDecline}>Decline</Button></div>}>
          <Field label="Reason"><Textarea rows={3} value={decline.reason} onChange={(e) => setDecline({ ...decline, reason: e.target.value })} /></Field>
        </Drawer>
      )}
    </section>
  );
}
```

- [ ] **Step 2: Wire it**

In `SalesPropertyFile.jsx` add `NdaSection` to the import from `./business/BusinessPropertySections` and render `{section === "nda" && <NdaSection propertyId={propertyId} />}` after the preparation line.

- [ ] **Step 3: Build and try it**

`npm run build` in `admin-portal/` — expected `✓ built`. On the Phase 5 fixture's property file the NDA tab lists the request with status `sent`, and Decline works on a second request.

- [ ] **Step 4: Commit**

```bash
git add admin-portal/src/screens/sales/business/BusinessPropertySections.jsx admin-portal/src/screens/sales/SalesPropertyFile.jsx
git commit -m "feat(business): NDA / confidentiality panel on business property files

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 17: Website NDA request form and full-details page

**Files:**
- Create: `website-mock/src/components/BusinessNdaRequest.jsx`, `website-mock/src/pages/BusinessDetailsPage.jsx`
- Modify: `website-mock/src/services/api.js`, `website-mock/src/pages/PropertyDetailPage.jsx`, `website-mock/src/App.jsx`

**Interfaces:**
- Consumes: Task 15 public endpoints.
- Produces: `websiteApi.requestBusinessNda(propertyId, form)`, `websiteApi.getBusinessDetails(token)`; route `/business-details/:token`.

- [ ] **Step 1: API functions**

In `website-mock/src/services/api.js`, add to the `websiteApi` object:

```js
  async requestBusinessNda(propertyId, form) {
    return request('/public-website/business-nda-requests', { method: 'POST', body: JSON.stringify({ property: propertyId, ...form }) });
  },

  async getBusinessDetails(token) {
    return request(`/public-website/business-details/${encodeURIComponent(token)}`);
  },
```

- [ ] **Step 2: Request form**

`website-mock/src/components/BusinessNdaRequest.jsx`:

```jsx
import React, { useState } from 'react';
import { Lock } from 'lucide-react';
import { websiteApi } from '../services/api';

/** "Request full details" — starts the NDA flow for a confidential business listing. */
export default function BusinessNdaRequest({ propertyId }) {
  const [f, setF] = useState({ full_name: '', email: '', phone: '', company: '' });
  const [state, setState] = useState({ busy: false, done: '', error: '' });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const submit = async (e) => {
    e.preventDefault();
    setState({ busy: true, done: '', error: '' });
    try {
      const r = await websiteApi.requestBusinessNda(propertyId, f);
      setState({ busy: false, done: r.message || 'Request received.', error: '' });
    } catch (err) {
      setState({ busy: false, done: '', error: err.message || 'Could not send your request.' });
    }
  };
  if (state.done) return <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-100 text-sm text-emerald-800">{state.done}</div>;
  return (
    <form onSubmit={submit} className="p-5 rounded-2xl bg-white border border-slate-200 space-y-3">
      <div className="flex items-center gap-2 font-bold text-[#012a4e]"><Lock className="w-4 h-4" /> Request full details</div>
      <p className="text-xs text-slate-500">This is a confidential listing. We verify each buyer, then send a confidentiality agreement to sign electronically. Full details follow once it is signed.</p>
      <input required className="w-full border rounded-xl px-3 py-2 text-sm" placeholder="Full name" value={f.full_name} onChange={set('full_name')} />
      <input required type="email" className="w-full border rounded-xl px-3 py-2 text-sm" placeholder="Email" value={f.email} onChange={set('email')} />
      <input className="w-full border rounded-xl px-3 py-2 text-sm" placeholder="Phone" value={f.phone} onChange={set('phone')} />
      <input className="w-full border rounded-xl px-3 py-2 text-sm" placeholder="Company (optional)" value={f.company} onChange={set('company')} />
      {state.error && <div className="text-xs text-red-600">{state.error}</div>}
      <button disabled={state.busy} className="w-full rounded-xl bg-[#012a4e] text-white text-sm font-bold py-2.5 disabled:opacity-60">{state.busy ? 'Sending…' : 'Request details'}</button>
    </form>
  );
}
```

In `PropertyDetailPage.jsx` import it and render `{property.business && <BusinessNdaRequest propertyId={property.id} />}` directly below the `BusinessSpecs` block added in Task 10.

- [ ] **Step 3: Full-details page**

`website-mock/src/pages/BusinessDetailsPage.jsx`:

```jsx
import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { websiteApi } from '../services/api';

const money = (n) => (n == null || n === '' ? '—' : `৳${Number(n).toLocaleString()}`);
const ROWS = [
  ['Business type', 'business_type_label'], ['Industry', 'industry'], ['Ownership', 'ownership_structure'],
  ['Year established', 'year_established'], ['Staff', 'staff_count'], ['Annual turnover', 'annual_turnover', money],
  ['Annual profit', 'annual_profit', money], ['Monthly revenue', 'monthly_revenue', money], ['Premises', 'lease_status'],
  ['Lease details', 'lease_details'], ['Reason for sale', 'reason_for_sale'], ['Included assets', 'included_assets'],
  ['Stock', 'stock_info'], ['Employees', 'employee_info'], ['Intellectual property', 'ip_details'],
  ['Trade licence', 'trade_licence_no'], ['Company registration', 'company_registration_no'], ['TIN / BIN', 'tin_bin'],
];

/** Full business details for a buyer holding a released NDA token (tokenised, time-limited). */
export default function BusinessDetailsPage() {
  const { token } = useParams();
  const [state, setState] = useState({ loading: true, data: null, error: '' });
  useEffect(() => {
    websiteApi.getBusinessDetails(token)
      .then((r) => setState({ loading: false, data: r.data, error: '' }))
      .catch((e) => setState({ loading: false, data: null, error: e.message || 'This link is invalid or has expired.' }));
  }, [token]);
  if (state.loading) return <div className="max-w-3xl mx-auto p-10 text-center text-slate-500">Loading…</div>;
  if (!state.data) return (
    <div className="max-w-xl mx-auto p-10 text-center">
      <h1 className="text-xl font-bold text-[#012a4e]">Link unavailable</h1>
      <p className="text-slate-500 mt-2">{state.error}</p>
      <Link to="/contact" className="inline-block mt-4 text-[#00AEEF] font-bold">Contact Seventh Sky</Link>
    </div>
  );
  const d = state.data; const b = d.business || {};
  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <div className="text-xs font-bold text-[#00AEEF] uppercase tracking-wider">Confidential — shared under your signed NDA</div>
      <h1 className="text-3xl font-extrabold text-[#012a4e] mt-1">{d.title}</h1>
      <p className="text-slate-500 mt-1">{[d.address, d.area, d.city].filter(Boolean).join(', ')} · Asking {money(d.price)}</p>
      {(d.media || []).length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-6">
          {d.media.map((m) => <img key={m.id || m.file_url} src={m.file_url} alt="" className="w-full h-40 object-cover rounded-xl" />)}
        </div>
      )}
      {d.description && <p className="mt-6 text-slate-700 whitespace-pre-line">{d.description}</p>}
      <table className="w-full mt-6 text-sm border border-slate-200 rounded-xl overflow-hidden">
        <tbody>
          {ROWS.filter(([, k]) => b[k] != null && b[k] !== '').map(([label, k, fmt]) => (
            <tr key={k} className="border-b border-slate-100"><td className="p-3 bg-slate-50 font-semibold w-1/3">{label}</td><td className="p-3">{fmt ? fmt(b[k]) : String(b[k])}</td></tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

In `website-mock/src/App.jsx` add `import BusinessDetailsPage from './pages/BusinessDetailsPage';` and, directly after the `/properties/:id` route, add:

```jsx
            <Route path="/business-details/:token" element={<BusinessDetailsPage />} />
```

- [ ] **Step 4: Build and try it**

`npm run build` in `website-mock/` — expected `✓ built`. On a business listing's detail page submit the form (a new NDA appears in the admin NDA tab); `/business-details/abc` shows "Link unavailable".

- [ ] **Step 5: Commit**

```bash
git add website-mock/src/components/BusinessNdaRequest.jsx website-mock/src/pages/BusinessDetailsPage.jsx website-mock/src/services/api.js website-mock/src/pages/PropertyDetailPage.jsx website-mock/src/App.jsx
git commit -m "feat(website): request-full-details form and NDA-gated business details page

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

# Phase 6 — Workflows, end-to-end verification, deploy

### Task 18: Business workflow templates

**Files:**
- Create: `backend/migrations/0145-business-workflow-templates.js`

**Interfaces:**
- Produces: `workflow_templates` rows for `vertical_key` `business_sale` and `business_purchase` (+ their `register_definitions`), so `/business/workflows?vertical_key=business_sale` can start projects.

- [ ] **Step 1: Migration**

`backend/migrations/0145-business-workflow-templates.js` (row shapes match `backend/seeders/0002-workflows.js`):

```js
'use strict';

/**
 * Migration 0145: workflow templates for Business Sale (14 workbook stages,
 * Business_Sale_Workflow_and_Checklists V0.1 sheet 2) and Business Purchase
 * (Business Purchase SOP V0.1 phases). Inserts only when the vertical has no
 * template yet — never overwrites edits.
 */
// Same register columns as seeders/0002-workflows.js.
const GENERIC_COLUMNS = [
  { key: 'reference', label: 'Reference', type: 'text' },
  { key: 'date', label: 'Date', type: 'date' },
  { key: 'status', label: 'Status', type: 'text' },
  { key: 'assigned_to', label: 'Assigned To', type: 'text' },
  { key: 'notes', label: 'Notes', type: 'textarea' },
];

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');

const DATA = {
  business_sale: {
    template: 'Business Sale SOP',
    stages: [
      ['Lead Intake', ['Business sale enquiry received and CRM profile created', 'Identity verification']],
      ['Consultation', ['Seller / business owner details collected', 'Business operational details collected', 'Reason for sale discussed', 'Expected business value assessed']],
      ['Assessment', ['Preliminary business assessment completed', 'Preliminary risks identified', 'Operational risk review']],
      ['Documentation', ['Trade licence & company registration collected', 'Tax & financial records collected', 'Lease agreements & liabilities reviewed', 'Compliance review']],
      ['Preparation', ['Business presentation improvement coordinated', 'Photography & marketing materials coordinated', 'Safety & operational review']],
      ['Marketing', ['Business listing prepared', 'Business advertisements published', 'Advertising compliance checked']],
      ['Lead Management', ['Buyer enquiries tracked', 'Buyer leads qualified', 'Fraud screening']],
      ['Inspection', ['Preliminary buyer screening done', 'Confidentiality (NDA) in place before disclosure', 'Buyer meetings & inspections coordinated', 'Inspection reports recorded']],
      ['Negotiation', ['Offers & counteroffers recorded', 'Negotiation coordinated', 'Commission protection monitored']],
      ['Due Diligence', ['Due diligence coordinated', 'Legal & financial review', 'Compliance risks escalated']],
      ['Agreement', ['Sale agreement prepared', 'Signed agreement received', 'Legal review']],
      ['Settlement', ['Ownership transfer supported', 'Settlement documents collected', 'Financial verification']],
      ['Financial', ['Commission & operational fees collected', 'Payment receipts recorded']],
      ['Closure', ['Final report issued', 'Transaction records archived', 'CRM workflow closed']],
    ],
    registers: ['Seller Profile', 'Business Profile', 'Business Documents', 'Assessment Report', 'Preparation Checklist', 'Buyer Lead Register', 'Buyer Screening Notes', 'Inspection Schedule', 'Offer Register', 'Due Diligence Tracker', 'Settlement Record', 'Commission Record', 'Non-Circumvention Register'],
  },
  business_purchase: {
    template: 'Business Purchase SOP',
    stages: [
      ['Buyer Engagement', ['Buyer details & investment goals collected', 'Acquisition suitability assessed', 'Acquisition plan discussed', 'Purchase service agreement signed', 'CRM set up']],
      ['Business Search & Sourcing', ['Business search activated', 'Preliminary business screening', 'Shortlist with investment summaries prepared']],
      ['Inspection', ['Inspections & seller meetings coordinated', 'Inspection records kept', 'Confidentiality (NDA) in place before disclosure']],
      ['Negotiation', ['Acquisition offers coordinated', 'Seller communication coordinated', 'Non-circumvention monitored']],
      ['Due Diligence & Verification', ['Financial, operational, lease, supplier, licence, employee & tax review', 'Professionals coordinated', 'Compliance risks escalated']],
      ['Agreement & Settlement', ['Acquisition agreement coordinated', 'Deposits, fees, commission & expenses tracked', 'Settlement & handover coordinated']],
      ['Post-Settlement', ['Acquisition & settlement summary issued', 'CRM closed', 'Records archived']],
    ],
    registers: ['Buyer Profile', 'Acquisition Requirement Profile', 'Business Search Records', 'Business Shortlist', 'Inspection Records', 'Offer Register', 'Due Diligence Records', 'Settlement Records', 'Non-Circumvention Register'],
  },
};

module.exports = {
  up: async (queryInterface) => {
    const now = new Date();
    const seq = queryInterface.sequelize;
    for (const [vertical_key, cfg] of Object.entries(DATA)) {
      const [have] = await seq.query('SELECT COUNT(*) AS n FROM workflow_templates WHERE vertical_key = :v', { replacements: { v: vertical_key } });
      if (Number(have[0].n) > 0) continue;
      const stages = cfg.stages.map(([name, checklist], i) => ({
        key: slug(name), name, order: i + 1, gate: true,
        checklist: checklist.map((label) => ({ label, required: true })), required_docs: [],
      }));
      await queryInterface.bulkInsert('workflow_templates', [{ vertical_key, name: cfg.template, stages: JSON.stringify(stages), is_active: true, created_at: now, updated_at: now }]);
      await queryInterface.bulkInsert('register_definitions', cfg.registers.map((name, i) => ({
        vertical_key, register_key: slug(name), name, columns: JSON.stringify(GENERIC_COLUMNS), sort_order: i, is_active: true, created_at: now, updated_at: now,
      })));
    }
  },
  down: async (queryInterface) => {
    for (const v of Object.keys(DATA)) {
      await queryInterface.bulkDelete('workflow_templates', { vertical_key: v });
      await queryInterface.bulkDelete('register_definitions', { vertical_key: v });
    }
  },
};
```

Run `npm run db:migrate` — expected `0145-business-workflow-templates: migrated`; running it again changes nothing.

- [ ] **Step 2: Verify in the app**

Open `/business/workflows?vertical_key=business_sale`: the Business Sale SOP template is available and a project created from it shows 14 stages with their checklists. Same for `business_purchase`.

- [ ] **Step 3: Commit**

```bash
git add backend/migrations/0145-business-workflow-templates.js
git commit -m "feat(business): Business Sale (14 stages) and Business Purchase workflow templates

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 19: End-to-end run with live demo listings, then deploy

**Files:**
- Modify: `AGENT_WORK_LOG.md` (append only, not committed)

- [ ] **Step 1: Full automated pass**

With the backend restarted: `npm test` (from `backend/`) — expected every unit test OK and the existing e2e harness passing — then `node scripts/e2e/businessParity.js` — expected all PASS. Build both frontends: `npm run build` in `admin-portal/` and `website-mock/`.

- [ ] **Step 2: Post the demo listings through the admin panel (browser)**

In the admin app, go to **Business → Sale → Businesses for Sale → New** and create three realistic listings with the wizard. Complete every step, including the Business profile, **3–4 photos** from `website-mock/public/assets` in Photos & videos, a YouTube video URL, a teaser headline and summary, an asking price, and **Publish**:

| Title (internal name) | Type | Industry | Area | Asking | Turnover / Profit | Staff | Est. |
|---|---|---|---|---|---|---|---|
| Aroma Café & Bakery | Restaurant / Café | Café & bakery | Dhanmondi, Dhaka | ৳85,00,000 | ৳1.2 Cr / ৳28 L | 16 | 2017 |
| Meghna Electronics Trading | Trading | Electronics import & wholesale | Motijheel, Dhaka | ৳3,50,00,000 | ৳8.5 Cr / ৳1.1 Cr | 24 | 2012 |
| CloudNest IT Solutions | Service | IT services & software | Banani, Dhaka | ৳1,80,00,000 | ৳2.4 Cr / ৳60 L | 32 | 2019 |

On each, run the Business Assessment, create the Due Diligence checklist, and save a Preparation update. In **Buyer Service → Buyer Mandates** create one mandate for a demo buyer, set suitability, and shortlist two of the listings (the investment summary appears).

- [ ] **Step 3: Walk the NDA flow for real**

On the public website (dev server), open the Aroma Café teaser: no business name, street address or exact figures; business chips shown. Submit **Request full details** with a mailbox you can read. In admin, on that property's **NDA / Confidentiality** tab: **Approve & send NDA** → open the signing link from the email (or from the envelope in Contracts) and sign as the buyer, then countersign as Seventh Sky → the NDA shows **signed** and **Introductions** lists the new introduction → **Release full details** → open the emailed `/business-details/<token>` link and confirm the full name, address and figures show.

- [ ] **Step 4: Money path and isolation**

Create a Business Sale Agreement for one listing and sign it; confirm fee invoices are drafted, show under Business Buyer/Sale invoices and **not** under Commercial. Open Business **Reports, Sales Inbox, Accounting, Settlements** and confirm only business records appear; open the same Commercial screens and confirm their figures match what they showed before this plan.

- [ ] **Step 5: Log**

Append a `COMPLETED` entry to `AGENT_WORK_LOG.md` with every commit hash, the test/e2e output summary and the demo listing codes.

- [ ] **Step 6: Deploy — stash the other contributor's files**

```bash
git stash push -m "parity deploy: other contributor's files + log" -- backend/server.js backend/config/cors.config.js AGENT_WORK_LOG.md
git status --short   # must be clean
```

- [ ] **Step 7: Merge and push**

```bash
git checkout production && git fetch origin production
git merge --no-ff air-conditioning/phase-0-duplicate -m "merge: Business Buy & Sale — Commercial parity"
git status --short                       # no conflicts
grep -c "website-mock" production-server.js   # still serving website-mock
node backend/scripts/testManifestParity.js
git push origin production
```

- [ ] **Step 8: Confirm the Hostinger build**

Poll the latest build for domain `slategray-alligator-168876.hostingersite.com` (username `u943292694`) with `hosting_listNodeJSBuildsV1` / `hosting_getNode_jsBuildDetailsV1` until `state: completed`; if `failed`, read `hosting_getNodeJSBuildLogsV1` and stop to report. Then check the live site: `GET https://slategray-alligator-168876.hostingersite.com/api/public-website/properties?category=business&listing_type=sale` returns the three teasers, the Business Buy search on the homepage shows them, and `/admin` → Business → Buy / Sale open the new consoles.

- [ ] **Step 9: Restore**

```bash
git checkout air-conditioning/phase-0-duplicate
git stash pop
git status --short   # the other contributor's server.js/cors + the log are back
```
