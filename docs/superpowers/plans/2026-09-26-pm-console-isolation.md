# Property Management Console Isolation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make each Property Management console show only its own category's data — lists, dashboards, money, agreements and website hand-offs — and add a permanent test that stops the next console re-introducing the leak.

**Architecture:** One set of PM tables serves four consoles; a console is a scope (`category` + `listing_type`), not a copy. Today two controllers carry a residential-or-commercial ternary, five endpoints carry no filter at all, seven screens have no console awareness, the agreement builders silently fall back to residential, and every website lead is stamped residential. This plan routes every category comparison through one four-category validator and makes the audit probe a permanent test.

**Tech Stack:** Node + Express + Sequelize + MySQL (backend on :50001), React 18 + Vite (admin-portal), plain-Node assert scripts for unit tests, `scripts/e2e/httpHarness.js` for end-to-end.

**Spec:** `docs/superpowers/specs/2026-09-26-pm-console-isolation-design.md`

## Global Constraints

- **Schema only via migrations**, numbered `00NN-*.js`, idempotent (`describeTable` guards). Never edit an applied migration. Next free number: **0155**.
- **The local DB is the production DB.** Every migration is additive. It holds 53 residential rent properties, 38 tenancies, 337 residential + 17 business contacts, 10 rental enquiries. **No backfill of `contacts`** — decided in brainstorming.
- **The residential console is live.** After every task, re-measure its baseline and confirm it is unchanged: **53 rent properties, 38 tenancies, 103 open actions, BDT 107,400 overdue rent, 192 setup blockers**.
- **An unknown or absent category must stay unfiltered**, exactly as today. Callers outside the four consoles pass nothing and must not change behaviour.
- **Never stage** `backend/config/cors.config.js` or `AGENT_WORK_LOG.md`, and stage `backend/server.js` hunk-by-hunk (another contributor has uncommitted work in both files).
- Backend scripts run from `backend/`. Commit trailer on every commit:
  `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`

## Review Focus

The five failure modes most likely to bite a user, each pinned to the task that owns the code:

1. **The live residential console changing.** It serves 38 tenancies and 53 properties; the whole point is that its numbers do not move. (Task 1 step 6, re-measured in every task, asserted in Task 9)
2. **An empty table giving a false PASS.** Six control endpoints (`tenant-requests`, `arrears-actions`, `utility-bills`, `marketing-activities`, `expense-approvals`, `property-risks`) returned 0 rows for every category simply because the tables are empty — that is unproven, not scoped. (Task 9)
3. **A website enquiry with no property vanishing.** 2 of 10 today are invisible in every console; after the fix they must appear in residential, not nowhere. (Task 7)
4. **A non-console caller losing its results.** Anything that passes no category — schedulers, reports, other modules — must still see everything. (Task 1)
5. **An agreement for a category with no builder emitting a residential document.** Silent wrong paperwork is worse than an error. (Task 8)

---

### Task 1: One validator, four categories

**Files:**
- Modify: `backend/utils/pmCategory.js:13`
- Modify: `backend/scripts/testPmCategory.js`

**Interfaces:**
- Produces: `PM_CATEGORIES = ['residential','commercial','business','rural']`; `pmCategory(value)` → that value or `null`; `pmCategoryClause(value, column)` unchanged.
- Consumed by: every later task.

- [ ] **Step 1: Update the test to the four consoles**

In `backend/scripts/testPmCategory.js`, replace the rural assertion. It currently reads:

```js
assert.strictEqual(pmCategory('rural'), null, 'rural is not a PM console');
```

with:

```js
assert.strictEqual(pmCategory('rural'), 'rural', 'rural is the fourth PM console');
assert.strictEqual(pmCategory('RURAL'), 'rural', 'case insensitive');
assert.strictEqual(pmCategoryClause('rural', 'p.category'), " AND p.category = 'rural'");

// Still not PM consoles — these must stay null so their queries stay unfiltered.
assert.strictEqual(pmCategory('short_term'), null);
assert.strictEqual(pmCategory('business_rent'), null, 'a service-line key is not a category');
```

- [ ] **Step 2: Run it and watch it fail**

Run: `cd backend && node scripts/testPmCategory.js`
Expected: `AssertionError … rural is the fourth PM console`

- [ ] **Step 3: Add rural to the validator**

In `backend/utils/pmCategory.js`, replace line 13:

```js
const PM_CATEGORIES = ['residential', 'commercial', 'business', 'rural'];
```

and extend the header comment's console list to name all four (`/property-management`, `/commercial/rent`, `/business-rent`, `/rural/rent`).

- [ ] **Step 4: Run the test**

Run: `cd backend && node scripts/testPmCategory.js`
Expected: `pmCategory OK`

- [ ] **Step 5: Confirm the whole unit chain still passes**

Run: `cd backend && npm test`
Expected: exit 0.

- [ ] **Step 6: Re-measure the residential baseline**

Restart the backend. With a valid token in `$TOKEN`:

```bash
cd backend
curl -s -H "Authorization: Bearer $TOKEN" -H "X-Branch-Id: 1" \
  "http://localhost:50001/api/property-management/action-center?category=residential" \
  | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const j=JSON.parse(s);console.log('open='+j.headline.open_action_count,'overdue='+j.headline.overdue_rent_amount,'blockers='+j.headline.setup_blocker_count)})"
curl -s -H "Authorization: Bearer $TOKEN" -H "X-Branch-Id: 1" \
  "http://localhost:50001/api/property-management/dashboard-metrics?category=residential" \
  | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>console.log('managed='+JSON.parse(s).occupancy.managed))"
```

Expected: `open=103 overdue=107400 blockers=192` and `managed=53`.

Then confirm rural is now filtered rather than unfiltered:

```bash
curl -s -H "Authorization: Bearer $TOKEN" -H "X-Branch-Id: 1" \
  "http://localhost:50001/api/property-management/dashboard-metrics?category=rural" \
  | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>console.log('rural managed='+JSON.parse(s).occupancy.managed))"
```

Expected: `rural managed=0` (it returned 53 before this task).

- [ ] **Step 7: Commit**

```bash
git add backend/utils/pmCategory.js backend/scripts/testPmCategory.js
git commit -m "fix(pm): rural is the fourth console, not an unknown category

pmCategory listed three categories, so every PM query from a rural console fell
through to no filter and returned residential data. The test asserted that
behaviour; it now asserts the opposite.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 2: The two remaining ternaries — owner money and reports

**Files:**
- Modify: `backend/controllers/disbursement.controller.js:298-299`
- Modify: `backend/controllers/rentalReports.controller.js:31-32`
- Create: `backend/scripts/e2e/consoleIsolation.js` (first section; Task 9 completes it)

**Interfaces:**
- Consumes: `pmCategoryClause` (Task 1).
- Produces: the isolation harness with a `moneyAndReports()` section later tasks extend.

**Background (measured):** `owner-balances` returns the same 30 rows for residential, business and rural. `rental-reports/overview` returns byte-identical payloads. Both because of:

```js
req.query.property_category === 'commercial' ? " AND p.category = 'commercial'"
  : req.query.property_category === 'residential' ? " AND p.category = 'residential'" : ''
```

- [ ] **Step 1: Write the failing e2e**

Create `backend/scripts/e2e/consoleIsolation.js`:

```js
/**
 * Console isolation — every PM endpoint must return only its own category's rows.
 * Needs the API on :50001. Run: node scripts/e2e/consoleIsolation.js
 *
 * The test is comparison-based: an endpoint that returns an identical, non-empty
 * payload for two different consoles is ignoring the scope.
 */
const { login, req, ok, finish } = require('./httpHarness');

const rowsOf = (b) => {
  for (const k of ['data', 'rows', 'items']) if (Array.isArray(b?.[k])) return b[k];
  return Array.isArray(b) ? b : null;
};
/** A stable fingerprint of a payload: row count + ids, or its JSON size. */
const sig = (b) => {
  const r = rowsOf(b);
  if (r) return `n=${r.length}|${r.map((x) => x.id ?? x.code ?? '').slice(0, 12).join(',')}`;
  return `json:${JSON.stringify(b).length}`;
};
const count = (s) => Number((s.match(/^n=(\d+)/) || [, -1])[1]);

/** Asserts residential and the other consoles do not see the same non-empty payload. */
async function assertScoped(label, mk, cats = ['business', 'rural']) {
  const res = await req('GET', mk('residential'));
  if (res.status !== 200) return ok(false, `${label} answers`, `HTTP ${res.status}`);
  const base = sig(res.body);
  if (count(base) === 0) return ok(true, `${label} — residential empty, nothing to leak`, base);
  for (const c of cats) {
    const other = await req('GET', mk(c));
    ok(sig(other.body) !== base, `${label} does not leak into ${c}`,
      `${c}: ${sig(other.body).slice(0, 40)} vs residential: ${base.slice(0, 40)}`);
  }
  return true;
}

async function moneyAndReports() {
  console.log('\n— Owner money and reports —');
  await assertScoped('disbursements/owner-balances', (c) => `/api/disbursements/owner-balances?property_category=${c}`);
  await assertScoped('rental-reports/overview', (c) => `/api/rental-reports/overview?property_category=${c}`);
}

module.exports = { assertScoped, sig, count };

if (require.main === module) {
  (async () => {
    console.log('\n===== CONSOLE ISOLATION =====');
    if (!(await login())) return finish();
    await moneyAndReports();
    finish();
  })().catch((e) => { ok(false, 'harness crashed', e.message); finish(); });
}
```

- [ ] **Step 2: Run it and watch it fail**

Run: `cd backend && node scripts/e2e/consoleIsolation.js`
Expected: FAIL on both — `does not leak into business` and `does not leak into rural`.

- [ ] **Step 3: Fix the disbursement clause**

In `backend/controllers/disbursement.controller.js`, add the import beside the other utils:

```js
const { pmCategoryClause } = require('../utils/pmCategory');
```

and replace lines 298-299 with:

```js
  // All four rent consoles scope owner money to their own category. An unknown
  // value leaves the query unfiltered, exactly as before.
  const catClause = pmCategoryClause(req.query.property_category, 'p.category');
```

Read the call sites first: the old expression produced a leading space, and `pmCategoryClause` does too, so the surrounding SQL needs no change — but check for a double space or `ANDAND` before moving on.

- [ ] **Step 4: Fix the reports clause**

In `backend/controllers/rentalReports.controller.js`, add the same import and replace lines 31-32:

```js
const catClauseP = (req) => pmCategoryClause(req.query.property_category, 'p.category');
```

`joinP` at lines 110, 134 and 204 keys off `req.query.property_category` being truthy, which stays correct — but a **junk** category now yields a join with no clause, which is harmless. Leave it.

- [ ] **Step 5: Run the e2e and re-measure residential**

Restart the backend. Run: `cd backend && node scripts/e2e/consoleIsolation.js`
Expected: all PASS.

```bash
curl -s -H "Authorization: Bearer $TOKEN" -H "X-Branch-Id: 1" \
  "http://localhost:50001/api/disbursements/owner-balances?property_category=residential" \
  | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>console.log('residential owner balances:',(JSON.parse(s).data||[]).length))"
```

Expected: `30` — unchanged.

- [ ] **Step 6: Commit**

```bash
git add backend/controllers/disbursement.controller.js backend/controllers/rentalReports.controller.js backend/scripts/e2e/consoleIsolation.js
git commit -m "fix(pm): scope owner balances and rental reports to the console

Both carried the residential-or-commercial ternary fixed in propertyManagement on
the 24th, so Business Rent and Commercial Rent were showing residential owner
balances (30 rows) and residential report totals.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 3: Leads

**Files:**
- Modify: `backend/controllers/contact.controller.js:177,206`
- Modify: `backend/scripts/e2e/consoleIsolation.js`

**Interfaces:**
- Consumes: `pmCategory` (Task 1).
- Produces: `GET /api/contacts?category=<any of four>` filtered; a `leads()` section in the harness.

**Background:** line 177 hard-codes `['commercial', 'residential', 'business']`, so `category=rural` leaves the directory unfiltered — the rural console would show all 337 residential contacts.

- [ ] **Step 1: Add the failing check**

In `backend/scripts/e2e/consoleIsolation.js`, add before the runner:

```js
async function leads() {
  console.log('\n— Leads and contacts —');
  await assertScoped('contacts (rental leads)', (c) => `/api/contacts?looking_for=rent&limit=200&category=${c}`);
  await assertScoped('contacts (directory)', (c) => `/api/contacts?limit=200&category=${c}`);
}
```

and call `await leads();` in the runner.

- [ ] **Step 2: Run it and watch it fail**

Run: `cd backend && node scripts/e2e/consoleIsolation.js`
Expected: FAIL — `contacts (rental leads) does not leak into rural`.

- [ ] **Step 3: Route it through the validator**

In `backend/controllers/contact.controller.js`, add the import at the top with the other requires:

```js
const { pmCategory } = require('../utils/pmCategory');
```

Replace lines 174-179:

```js
  // Property-category isolation across the four consoles. Exact match on the hard
  // `category` column (backfilled in migration 0128, set on create), so each
  // console shows only its own directory in both directions.
  const cat = pmCategory(req.query.category);
  if (cat) where.category = cat;
```

Leave line 206 (`data.category = data.category || req.query.category || 'residential'`) alone for now — Task 7 replaces the residential default for website-created contacts, and changing it here would alter admin-created contacts too.

- [ ] **Step 4: Run the e2e**

Restart the backend. Run: `cd backend && node scripts/e2e/consoleIsolation.js`
Expected: all PASS.

- [ ] **Step 5: Confirm the live directories are unchanged**

```bash
cd backend
for c in residential business rural; do
  printf '%-12s ' "$c"
  curl -s -H "Authorization: Bearer $TOKEN" -H "X-Branch-Id: 1" \
    "http://localhost:50001/api/contacts?limit=500&category=$c" \
    | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>console.log((JSON.parse(s).data||[]).length))"
done
```

Expected: `residential 337`, `business 17`, `rural 0`.

- [ ] **Step 6: Commit**

```bash
git add backend/controllers/contact.controller.js backend/scripts/e2e/consoleIsolation.js
git commit -m "fix(pm): scope the contact directory through the shared validator

The hard-coded three-category list meant a rural console saw all 337 residential
contacts as its own leads.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 4: The unscoped bulk and inbox endpoints

**Files:**
- Modify: `backend/controllers/tenancy.controller.js` (`collectRentData:420`, `overdueReminders:571`, `globalInvoices`)
- Modify: `backend/controllers/disbursement.controller.js` (`bulkOwnerData`)
- Modify: `backend/controllers/communications.controller.js` (`inbox`)
- Modify: `backend/scripts/e2e/consoleIsolation.js`

**Interfaces:**
- Consumes: `pmCategory` (Task 1).
- Produces: all five accept `property_category` and apply it; a `bulkAndInbox()` harness section.

**Background (measured):** these five return identical payloads for all three categories — 26 rent rows, 9 overdue reminders, 6 bulk-owner rows, 70 inbox messages — so Collect Rent (Bulk), Rent Reminders, Pay Owners (Bulk) and the Inbox operate across every console at once. `GET /api/tenancies/global-invoices` additionally returns **HTTP 500**.

- [ ] **Step 1: Add the failing checks**

In `backend/scripts/e2e/consoleIsolation.js`, add:

```js
async function bulkAndInbox() {
  console.log('\n— Bulk operations and the inbox —');
  await assertScoped('tenancies/collect-rent-data', (c) => `/api/tenancies/collect-rent-data?property_category=${c}`);
  await assertScoped('tenancies/overdue-reminders', (c) => `/api/tenancies/overdue-reminders?property_category=${c}`);
  await assertScoped('disbursements/bulk-owner-data', (c) => `/api/disbursements/bulk-owner-data?property_category=${c}`);
  await assertScoped('communications/inbox', (c) => `/api/communications/inbox?property_category=${c}`);

  // Global Invoicing is broken for every console, not just leaking.
  const gi = await req('GET', '/api/tenancies/global-invoices?property_category=residential');
  ok(gi.status === 200, 'tenancies/global-invoices answers at all', `HTTP ${gi.status}`);
  await assertScoped('tenancies/global-invoices', (c) => `/api/tenancies/global-invoices?property_category=${c}`);
}
```

and call `await bulkAndInbox();` in the runner.

- [ ] **Step 2: Run it and watch it fail**

Run: `cd backend && node scripts/e2e/consoleIsolation.js`
Expected: four `does not leak` FAILs plus `global-invoices answers at all  HTTP 500`.

- [ ] **Step 3: Scope the two tenancy list builders**

Both `collectRentData` (line 420) and `globalInvoices` build from `Tenancy.findAll({ where, include: [propInc, …] })`. Add the import to `backend/controllers/tenancy.controller.js` if Task 8 of the Business Rent work did not already add it:

```js
const { pmCategory } = require('../utils/pmCategory');
```

Then in **each** of those two handlers, immediately before the `findAll`, replace the plain `propInc` in the include with a scoped one:

```js
  // Bulk rent collection and global invoicing run per console, not across all of them.
  const cat = pmCategory(req.query.property_category);
  const propScoped = cat ? { ...propInc, where: { category: cat }, required: true } : propInc;
```

and use `propScoped` in that handler's `include`. Read each handler first — `propInc` is a module-level constant shared by many handlers, so it must not be mutated.

- [ ] **Step 4: Scope the overdue reminders**

`overdueReminders` (line 571) starts from the `overdueByTenancy()` service, then loads the tenancies
with their properties into `byId` (line 585). Filter there — no extra query is needed, because
`propInc` (line 27) already selects `category`:

```js
  // Scope to the console: a reminder belongs to the console its property belongs to.
  const cat = pmCategory(req.query.property_category);
  if (cat) {
    overdue = overdue.filter((r) => String(byId.get(r.tenancy_id)?.Property?.category || '') === cat);
  }
```

Place it immediately **after** `const byId = new Map(...)` on line 585. The association has no `as`,
so the JSON key is `Property` — the same access this file already uses at lines 454 and 605.

- [ ] **Step 5: Scope bulk owner data**

`bulkOwnerData` (`backend/controllers/disbursement.controller.js:349`) is raw SQL already joined to
`properties p`, so it takes the same clause as its sibling. Add above the query:

```js
  const catClause = pmCategoryClause(req.query.property_category, 'p.category');
```

and extend its WHERE line:

```sql
      WHERE f.folio_type = 'landlord' AND f.current_balance > 0${bw}${catClause}
```

The join is a `LEFT JOIN`, so a folio whose property row is missing drops out once a category is
given — correct here, because a payout with no property cannot belong to a console.

- [ ] **Step 6: Scope the inbox**

In `backend/controllers/communications.controller.js`, `inbox` — communications carry `property_id`, so scope through it:

```js
  const cat = pmCategory(req.query.property_category);
  if (cat) {
    const { propertyIdsInCategory } = require('../utils/salesCategory');
    const ids = await propertyIdsInCategory(cat);
    where.property_id = { [Op.in]: ids.length ? ids : [0] };
  }
```

`propertyIdsInCategory` already exists in `utils/salesCategory.js`. Put the require at the top of the file. Note the deliberate `[0]`: a console with no properties must show an **empty** inbox, not every message.

**Read first:** messages with `property_id: null` (general enquiries, system notices) will drop out of a scoped inbox. If the inbox is the only place those are visible, keep them with `[Op.or]: [{ property_id: { [Op.in]: ids } }, { property_id: null }]` and say so in the commit message.

- [ ] **Step 7: Fix the global-invoices 500**

Do not guess. Reproduce it and read the actual error:

```bash
cd backend
curl -s -H "Authorization: Bearer $TOKEN" -H "X-Branch-Id: 1" \
  "http://localhost:50001/api/tenancies/global-invoices?period_label=2026-09" | head -c 400; echo
tail -40 /tmp/sspc-server.log | grep -iE "error|stack" | head -20
```

Fix the root cause the stack trace names. If it is not a one-line fix, use **superpowers:systematic-debugging** rather than patching symptoms, and report honestly if it needs its own task.

- [ ] **Step 8: Run the e2e and re-measure residential**

Restart the backend. Run: `cd backend && node scripts/e2e/consoleIsolation.js`
Expected: all PASS, including `global-invoices answers at all HTTP 200`.

```bash
for e in "tenancies/collect-rent-data" "tenancies/overdue-reminders" "disbursements/bulk-owner-data" "communications/inbox"; do
  printf '%-34s ' "$e"
  curl -s -H "Authorization: Bearer $TOKEN" -H "X-Branch-Id: 1" \
    "http://localhost:50001/api/$e?property_category=residential" \
    | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const j=JSON.parse(s);console.log((j.data||j.rows||[]).length)})"
done
```

Expected: `26`, `9`, `6`, `70` — the residential figures, unchanged.

- [ ] **Step 9: Commit**

```bash
git add backend/controllers/tenancy.controller.js backend/controllers/disbursement.controller.js backend/controllers/communications.controller.js backend/scripts/e2e/consoleIsolation.js
git commit -m "fix(pm): scope bulk rent collection, reminders, owner payouts and the inbox

All four ran across every console at once: Collect Rent (Bulk) offered 26
residential tenancies from the Business Rent console, Pay Owners (Bulk) offered 6
residential owners, and the Inbox showed all 70 messages everywhere. Also fixes
the HTTP 500 on global-invoices.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 5: The disbursement list screens

**Files:**
- Modify: `backend/controllers/disbursement.controller.js` (the `owner` and `income` list handlers)
- Modify: `admin-portal/src/screens/Disbursements.jsx`
- Modify: `backend/scripts/e2e/consoleIsolation.js`

**Interfaces:**
- Consumes: `pmCategoryClause` (Task 1, wired in Task 2).
- Produces: `GET /api/disbursements/owner` and `/income` scoped; the screen sends the category on all three of its calls.

**Background (measured):** `owner-balances` is fixed by Task 2, but the two **list** tabs beneath it return the same 25 rows for every category, and the screen only sends `property_category` on the balances call.

- [ ] **Step 1: Add the failing checks**

In the harness's `moneyAndReports()`:

```js
  await assertScoped('disbursements/owner (list)', (c) => `/api/disbursements/owner?property_category=${c}`);
  await assertScoped('disbursements/income (list)', (c) => `/api/disbursements/income?property_category=${c}`);
```

- [ ] **Step 2: Run it and watch it fail**

Run: `cd backend && node scripts/e2e/consoleIsolation.js`
Expected: FAIL on both.

- [ ] **Step 3: Scope both handlers**

Both are Sequelize `findAndCountAll` calls with a `Property` include (`as: 'property'`), so both are
scoped by constraining that include. In `listOwnerDisbursements`
(`backend/controllers/disbursement.controller.js:279`) and `listIncome` (`:317`), add before the
query:

```js
  // Scope to the console through the property the row belongs to.
  const cat = pmCategory(req.query.property_category);
  const propWhere = cat ? { where: { category: cat }, required: true } : {};
```

and spread it into that call's Property include:

```js
    { model: Property, as: 'property', attributes: ['id', 'title', 'property_code'], ...propWhere },
```

Add `const { pmCategory } = require('../utils/pmCategory');` at the top if Task 2 did not already.

**Do not use `category` for this.** `listIncome` line 321 already reads
`if (req.query.category) where.category = req.query.category;` — that is `PmIncomeEntry`'s own
`category` column (the income *type*), not the property category. Sending the console's category as
`category` here would silently filter income types instead of consoles. `property_category` is the
only correct parameter, which is why the screen sends that name.

Also check the **category rollup** query a few lines below in `listIncome` (a second
`PmIncomeEntry.findAll` scoped only by `branchScope`): it feeds the screen's totals, so it needs the
same property scoping, or the rollup will report every console's income under this one.

- [ ] **Step 4: Send the category from the screen**

In `admin-portal/src/screens/Disbursements.jsx`, the two list calls are currently
`api.get('/disbursements/owner')` and `api.get('/disbursements/income')`. Append the scope to both:

```js
`/disbursements/owner?property_category=${scope.category}`
`/disbursements/income?property_category=${scope.category}`
```

`scope` already exists in this file (it uses `usePmScope` for the balances call).

- [ ] **Step 5: Run the e2e and build**

Run: `cd backend && node scripts/e2e/consoleIsolation.js` → all PASS
Run: `cd admin-portal && npm run build` → `✓ built`

Confirm residential still shows 25 rows on each tab.

- [ ] **Step 6: Commit**

```bash
git add backend/controllers/disbursement.controller.js admin-portal/src/screens/Disbursements.jsx backend/scripts/e2e/consoleIsolation.js
git commit -m "fix(pm): scope the owner payout and income lists

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 6: Seven screens learn which console they are in

**Files:**
- Modify: `admin-portal/src/screens/BulkRentCollection.jsx`
- Modify: `admin-portal/src/screens/BulkOwnerDisbursement.jsx`
- Modify: `admin-portal/src/screens/Compliance.jsx`
- Modify: `admin-portal/src/screens/Communication.jsx`
- Modify: `admin-portal/src/screens/GlobalInvoicing.jsx`
- Modify: `admin-portal/src/screens/RentReminders.jsx`
- Modify: `admin-portal/src/screens/Projects.jsx`
- Create: `admin-portal/src/screens/pmScopeCoverage.test.mjs`

**Interfaces:**
- Consumes: the scoped endpoints from Tasks 2-5.
- Produces: every PM screen calls `usePmScope()` and sends its category.

**Background (measured):** none of these seven imports `usePmScope`, so they cannot scope even now that the backends do. `Compliance` additionally loads `/properties?limit=100` with no category, which is the property picker every register entry is filed against.

- [ ] **Step 1: Write the failing test**

Create `admin-portal/src/screens/pmScopeCoverage.test.mjs`:

```js
// Run: node src/screens/pmScopeCoverage.test.mjs   (from admin-portal/)
// Guards the invariant: a screen rendered inside a PM console must know its scope.
import assert from 'node:assert';
import fs from 'node:fs';

const SCREENS = ['BulkRentCollection', 'BulkOwnerDisbursement', 'Compliance',
  'Communication', 'GlobalInvoicing', 'RentReminders', 'Projects'];

for (const name of SCREENS) {
  const src = fs.readFileSync(new URL(`./${name}.jsx`, import.meta.url), 'utf8');
  assert.ok(src.includes('usePmScope'), `${name} must read the console scope`);
  assert.ok(/property_category=\$\{scope\.category\}|category=\$\{scope\.category\}|vertical_key/.test(src),
    `${name} must send its category (or a vertical_key) to the API`);
}

console.log('pmScopeCoverage OK');
```

- [ ] **Step 2: Run it and watch it fail**

Run: `cd admin-portal && node src/screens/pmScopeCoverage.test.mjs`
Expected: `AssertionError … BulkRentCollection must read the console scope`

- [ ] **Step 3: Wire the five money/inbox screens**

For `BulkRentCollection`, `BulkOwnerDisbursement`, `Communication`, `GlobalInvoicing` and `RentReminders`: add the import and hook, then append the scope to each `api.get`:

```jsx
import { usePmScope } from '../config/pmScope';
// …inside the component, beside the other hooks:
const scope = usePmScope();
```

| Screen | Call | Becomes |
|---|---|---|
| BulkRentCollection | `/tenancies/collect-rent-data` | `/tenancies/collect-rent-data?property_category=${scope.category}` |
| BulkOwnerDisbursement | `/disbursements/bulk-owner-data` | `…?property_category=${scope.category}` |
| Communication | `/communications/inbox` | `…?property_category=${scope.category}` |
| GlobalInvoicing | `/tenancies/global-invoices?period_label=${period}` | `…&property_category=${scope.category}` |
| RentReminders | `/tenancies/overdue-reminders` | `…?property_category=${scope.category}` |

Read each call first — several already carry query strings, so use `&` not `?` where one exists. Add `scope.category` to the `useCallback`/`useEffect` dependency array wherever the fetch is memoised, or the screen will keep the first console's data after a navigation.

- [ ] **Step 4: Wire Compliance**

`Compliance` loads the property picker and the register entries. Add the hook, then:

```jsx
      const { data } = await api.get(`/properties?limit=100&category=${scope.category}&listing_type=${scope.listingType || 'rent'}`);
```

Read the register calls too: `/registers/entries?register_definition_id=…&property_id=…` is already scoped by the chosen property, so once the picker is scoped the entries follow. `/registers/definitions` is a global catalogue and stays unscoped — note that in the commit message so a later reader does not "fix" it.

- [ ] **Step 5: Wire Projects**

`Projects` is driven by `?vertical_key=` from the nav, not by a category. Add the hook and use it only as a **fallback** when the URL carries no `vertical_key`, so existing nav links keep working:

```jsx
const scope = usePmScope();
const VERTICAL_BY_CATEGORY = {
  residential: 'leasing,short_stay', commercial: 'commercial_rent',
  business: 'business_rent', rural: 'rural_rent,rural_tenancy',
};
// …when building the query:
if (!p.get('vertical_key') && VERTICAL_BY_CATEGORY[scope.category]) {
  p.set('vertical_key', VERTICAL_BY_CATEGORY[scope.category]);
}
```

`rural_tenancy` does not exist yet — it is created by the Rural plan. Listing it here is harmless (the backend `Op.in` simply matches nothing) and saves a second edit later.

- [ ] **Step 6: Run the test and build**

Run: `cd admin-portal && node src/screens/pmScopeCoverage.test.mjs` → `pmScopeCoverage OK`
Run: `npm run build` → `✓ built`

Then click each of the seven screens in the residential console and confirm the counts are unchanged (26 rent rows, 6 bulk owners, 70 inbox, 9 reminders), and in Business Rent that they are now empty rather than showing residential work.

- [ ] **Step 7: Commit**

```bash
git add admin-portal/src/screens/BulkRentCollection.jsx admin-portal/src/screens/BulkOwnerDisbursement.jsx admin-portal/src/screens/Compliance.jsx admin-portal/src/screens/Communication.jsx admin-portal/src/screens/GlobalInvoicing.jsx admin-portal/src/screens/RentReminders.jsx admin-portal/src/screens/Projects.jsx admin-portal/src/screens/pmScopeCoverage.test.mjs
git commit -m "fix(pm): the seven unscoped screens now send their console's category

None of them read usePmScope, so they could not scope even once the endpoints
could. /registers/definitions stays unscoped deliberately — it is a global
catalogue, not per-console data.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 7: Website enquiries reach the right console

**Files:**
- Create: `backend/migrations/0155-rental-enquiry-category.js`
- Modify: `backend/models/RentalEnquiry.js`
- Modify: `backend/controllers/publicWebsite.controller.js` (`ensureContact`, `submitRentalEnquiry`, `submitTenantApplication`, `submitSalesEnquiry`, `submitPropertyOffer`)
- Modify: `backend/controllers/rentalEnquiry.controller.js:40`
- Create: `backend/scripts/testWebsiteRouting.js`
- Modify: `backend/package.json`

**Interfaces:**
- Consumes: `pmCategory` (Task 1).
- Produces: `categoryForWebsiteRecord(property)` → the property's category or `'residential'`; `rental_enquiries.category`.

**Background (measured):** all **55** website-sourced contacts carry `category: 'residential'`, whatever property was enquired on, because `ensureContact` sets no category and creation defaults to residential. `rental_enquiries` has no category column, and the console query inner-joins the property (`required: true`), so the **2 of 10** enquiries with no property are invisible everywhere.

**Review Focus item 3 lives here:** a property-less enquiry must land in residential, not vanish.

- [ ] **Step 1: Write the failing test**

Create `backend/scripts/testWebsiteRouting.js`:

```js
const assert = require('assert');
const { categoryForWebsiteRecord } = require('../controllers/publicWebsite.controller');

// A website enquiry belongs to the console that owns the property enquired on.
assert.strictEqual(categoryForWebsiteRecord({ category: 'rural' }), 'rural');
assert.strictEqual(categoryForWebsiteRecord({ category: 'commercial' }), 'commercial');
assert.strictEqual(categoryForWebsiteRecord({ category: 'business' }), 'business');
assert.strictEqual(categoryForWebsiteRecord({ category: 'residential' }), 'residential');

// A general enquiry with no property still needs a home — residential, by decision,
// so it is worked rather than invisible.
assert.strictEqual(categoryForWebsiteRecord(null), 'residential');
assert.strictEqual(categoryForWebsiteRecord(undefined), 'residential');
assert.strictEqual(categoryForWebsiteRecord({}), 'residential');

// A property with a category outside the four consoles is not trusted through.
assert.strictEqual(categoryForWebsiteRecord({ category: 'short_term' }), 'residential');
assert.strictEqual(categoryForWebsiteRecord({ category: 'nonsense' }), 'residential');

console.log('websiteRouting OK');
```

- [ ] **Step 2: Run it and watch it fail**

Run: `cd backend && node scripts/testWebsiteRouting.js`
Expected: `TypeError: categoryForWebsiteRecord is not a function`

- [ ] **Step 3: Add the resolver and stamp it everywhere**

In `backend/controllers/publicWebsite.controller.js`, add near the top:

```js
const { pmCategory } = require('../utils/pmCategory');

/**
 * Which console a website submission belongs to. It follows the property that was
 * enquired on; a general enquiry with no property stays residential so it lands
 * on a desk instead of disappearing.
 */
const categoryForWebsiteRecord = (property) => pmCategory(property?.category) || 'residential';
exports.categoryForWebsiteRecord = categoryForWebsiteRecord;
```

Then, in `submitRentalEnquiry` (line ~446), pass it into both writes:

```js
  const recordCategory = categoryForWebsiteRecord(property);
```

- on the `ensureContact({ … })` call, add `category: recordCategory,`
- on the `RentalEnquiry.create({ … })` call, add `category: recordCategory,`

Do the same in `submitTenantApplication`, `submitSalesEnquiry` and `submitPropertyOffer` — each resolves a property already; add the stamp to whatever contact and record it creates. For the sales submissions use `salesCategory` semantics if that controller already resolves one, rather than overriding it.

Finally, make `ensureContact` honour the field: read it, and if it builds a `Contact.create({...})` without `category`, add `category: opts.category || 'residential'`.

- [ ] **Step 4: Run the unit test**

Run: `cd backend && node scripts/testWebsiteRouting.js`
Expected: `websiteRouting OK`

- [ ] **Step 5: Store the enquiry's category**

Create `backend/migrations/0155-rental-enquiry-category.js`:

```js
'use strict';

// A rental enquiry belongs to a console. Until now it was inferred by inner-joining
// the property, so the enquiries with no property were invisible in every console.
// Back-filled from the joined property only — never guessed.
module.exports = {
  async up(queryInterface, Sequelize) {
    const t = await queryInterface.describeTable('rental_enquiries');
    if (!t.category) {
      await queryInterface.addColumn('rental_enquiries', 'category', { type: Sequelize.STRING(20), allowNull: true });
      await queryInterface.sequelize.query(`
        UPDATE rental_enquiries re
           JOIN properties p ON p.id = re.property_id
           SET re.category = p.category
         WHERE re.category IS NULL`);
      // Enquiries with no property: residential, so they appear on a desk.
      await queryInterface.sequelize.query(
        "UPDATE rental_enquiries SET category = 'residential' WHERE category IS NULL");
    }
  },
  async down(queryInterface) {
    const t = await queryInterface.describeTable('rental_enquiries');
    if (t.category) await queryInterface.removeColumn('rental_enquiries', 'category');
  },
};
```

In `backend/models/RentalEnquiry.js`, add `category: DataTypes.STRING(20),` with a one-line comment naming migration 0155.

- [ ] **Step 6: Scope enquiries by the column, not the join**

In `backend/controllers/rentalEnquiry.controller.js`, replace lines 39-42:

```js
  // Scope by the enquiry's own category (0155). The old inner join on the property
  // hid every enquiry that had no property attached.
  const cat = pmCategory(req.query.category);
  if (cat) where.category = cat;
  const propI = propInc;
```

Add the `pmCategory` import at the top. Leave `propInc` in the includes so the property still loads for display — just without `required: true`.

- [ ] **Step 7: Migrate and verify both directions**

```bash
cd backend && npm run db:migrate
node -e "const s=require('./config/db.config');(async()=>{const [r]=await s.query('SELECT COALESCE(category,\"(NULL)\") c, COUNT(*) n, SUM(property_id IS NULL) unlinked FROM rental_enquiries GROUP BY category');console.table(r);process.exit(0)})()" | grep -v Executing
```

Expected: every one of the 10 enquiries has a category, and the 2 unlinked ones are `residential`.

Restart the backend, then submit a website enquiry against a **business** property and confirm the lead and the enquiry both land in business, not residential:

```bash
curl -s -X POST -H 'Content-Type: application/json' \
  -d '{"name":"E2E Website Lead","phone":"01700000000","property_id":<A_BUSINESS_PROPERTY_ID>}' \
  "http://localhost:50001/api/public/rental-enquiries" | head -c 200; echo
```

Then check it appears in the business console and **not** the residential one, and delete the fixture afterwards.

- [ ] **Step 8: Add to the chain and commit**

Add `node scripts/testWebsiteRouting.js && ` to the `test` script in `backend/package.json`.

```bash
git add backend/migrations/0155-rental-enquiry-category.js backend/models/RentalEnquiry.js backend/controllers/publicWebsite.controller.js backend/controllers/rentalEnquiry.controller.js backend/scripts/testWebsiteRouting.js backend/package.json
git commit -m "fix(website): enquiries and leads inherit the property's console

Every one of the 55 website-sourced contacts was stamped residential whatever
property was enquired on, so a commercial, business or rural enquiry became a
residential lead. Enquiries now carry their own category (0155) instead of being
inferred by an inner join, which had made the 2 property-less enquiries invisible
in every console. Existing leads are left as they are, by decision.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 8: Agreements fail loudly instead of emitting a residential document

**Files:**
- Create: `backend/services/agreementCategory.js`
- Create: `backend/scripts/testAgreementCategory.js`
- Modify: `backend/controllers/rprm.controller.js:24-33`
- Modify: `backend/controllers/rptm.controller.js:51-59`
- Modify: `backend/package.json`

**Interfaces:**
- Produces: `resolveAgreementCategory(value, builders)` → `{ category }` or throws a 400-shaped error naming the missing builder.
- Consumed by: the Rural plan, which registers the two rural builders.

**Review Focus item 5 lives here.**

**Background:** `rprm.controller.js:24` and `rptm.controller.js:51` are a residential-or-commercial binary — **any other category silently becomes residential**, with residential codes (`ENV-RPRM-`, `RPRM-018`). A Business Rent or Rural user pressing "generate agreement" gets the wrong paperwork and no warning.

- [ ] **Step 1: Write the failing test**

Create `backend/scripts/testAgreementCategory.js`:

```js
const assert = require('assert');
const { resolveAgreementCategory } = require('../services/agreementCategory');

const BUILDERS = { residential: () => 'res', commercial: () => 'com' };

// A supported category resolves.
assert.strictEqual(resolveAgreementCategory('residential', BUILDERS).category, 'residential');
assert.strictEqual(resolveAgreementCategory('commercial', BUILDERS).category, 'commercial');
assert.strictEqual(resolveAgreementCategory(undefined, BUILDERS).category, 'residential', 'default stays residential');

// An unsupported console must NOT silently receive a residential document.
for (const c of ['business', 'rural']) {
  assert.throws(() => resolveAgreementCategory(c, BUILDERS), (e) => {
    assert.strictEqual(e.status, 400, 'carries an HTTP status');
    assert.ok(e.message.includes(c), `names the category: ${e.message}`);
    assert.ok(/builder|template|not available/i.test(e.message), `says what is missing: ${e.message}`);
    return true;
  }, `${c} must fail loudly`);
}

// Once a builder is registered, it resolves — this is how the Rural plan adds rural.
const WITH_RURAL = { ...BUILDERS, rural: () => 'rur' };
assert.strictEqual(resolveAgreementCategory('rural', WITH_RURAL).category, 'rural');

// Junk is not silently mapped onto a real builder.
assert.throws(() => resolveAgreementCategory('nonsense', BUILDERS));

console.log('agreementCategory OK');
```

- [ ] **Step 2: Run it and watch it fail**

Run: `cd backend && node scripts/testAgreementCategory.js`
Expected: `Cannot find module '../services/agreementCategory'`

- [ ] **Step 3: Write the resolver**

Create `backend/services/agreementCategory.js`:

```js
/**
 * Which agreement variant to build.
 *
 * The PM and TM controllers used a residential-or-commercial binary, so a
 * business or rural console silently received a RESIDENTIAL agreement with
 * residential codes. Wrong paperwork issued without a warning is worse than a
 * refusal, so an unsupported category now fails with a 400 naming what is
 * missing. Registering a builder is how a console becomes supported.
 */
function resolveAgreementCategory(value, builders = {}) {
  const c = String(value == null || value === '' ? 'residential' : value).toLowerCase().trim();
  if (builders[c]) return { category: c, build: builders[c] };
  const err = new Error(`No agreement builder is available for the '${c}' category. Supported: ${Object.keys(builders).join(', ')}.`);
  err.status = 400;
  throw err;
}

module.exports = { resolveAgreementCategory };
```

- [ ] **Step 4: Run the test**

Run: `cd backend && node scripts/testAgreementCategory.js`
Expected: `agreementCategory OK`

- [ ] **Step 5: Use it in both controllers**

In `backend/controllers/rprm.controller.js`, replace the category binary at lines 24-33 with a builder registry and the resolver:

```js
const { resolveAgreementCategory } = require('../services/agreementCategory');

const PM_BUILDERS = {
  residential: { build: svc.buildResidentialPMAgreement, codePrefix: 'ENV-RPRM-', mgmtCode: 'RPRM-018' },
  commercial: { build: svc.buildCommercialPMAgreement, codePrefix: 'ENV-CPRM-', mgmtCode: 'CPRM-018' },
};
// …in the handler, in place of the ternaries:
const { category } = resolveAgreementCategory(req.query.category || req.body?.category, PM_BUILDERS);
const { build, codePrefix, mgmtCode } = PM_BUILDERS[category];
```

Do the same in `backend/controllers/rptm.controller.js:51-59` with its own registry
(`ENV-RPTM-` / `ENV-CPTM-`, `buildResidentialTMAgreement` / `buildCommercialTMAgreement`).

Both controllers wrap handlers in `asyncHandler`, so the thrown `err.status = 400` reaches
`middleware/errorHandler.js` — confirm that handler honours `err.status`; if it does not, return the
error explicitly with `res.status(400).json({ error: e.message })` instead of throwing.

- [ ] **Step 6: Verify all four categories against the API**

Restart the backend:

```bash
cd backend
for c in residential commercial business rural; do
  printf '%-12s ' "$c"
  curl -s -o /dev/null -w "HTTP %{http_code}\n" -X POST \
    -H "Authorization: Bearer $TOKEN" -H "X-Branch-Id: 1" -H 'Content-Type: application/json' \
    -d '{}' "http://localhost:50001/api/rprm/envelopes?category=$c"
done
```

Expected: residential and commercial behave exactly as before (their existing status, whatever validation they apply to an empty body); **business and rural return 400** with a message naming the category — not a 201 holding a residential agreement. Read the body for one of them to confirm the message is the resolver's.

- [ ] **Step 7: Add to the chain and commit**

Add `node scripts/testAgreementCategory.js && ` to the `test` script.

```bash
git add backend/services/agreementCategory.js backend/scripts/testAgreementCategory.js backend/controllers/rprm.controller.js backend/controllers/rptm.controller.js backend/package.json
git commit -m "fix(agreements): refuse an unsupported category instead of emitting a residential document

rprm and rptm resolved the category as a residential-or-commercial binary, so a
business or rural console generating an agreement silently received the
RESIDENTIAL variant with residential codes. Adding a builder is now how a console
becomes supported; the rural builders arrive with the Rural plan.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 9: Prove it, including the endpoints that look fine because they are empty

**Files:**
- Modify: `backend/scripts/e2e/consoleIsolation.js` (fixtures + the remaining endpoints)
- Modify: `AGENT_WORK_LOG.md` (appended, never committed)

**Interfaces:**
- Consumes: every change above.
- Produces: one `node scripts/e2e/consoleIsolation.js` run covering all 36 PM endpoints in four categories, with fixtures for the empty tables.

**Review Focus items 1 and 2 live here.**

- [ ] **Step 1: Add a fixture per category**

Six endpoints returned 0 rows for **every** category only because their tables are empty — `tenant-requests`, `arrears-actions`, `utility-bills`, `marketing-activities`, `expense-approvals`, `property-risks`. A comparison test cannot prove those. Add fixtures to the harness:

```js
const STAMP = Date.now().toString().slice(-6);
const made = { properties: [], risks: [] };

/** One property per category, so "empty for everyone" cannot pass as "scoped". */
async function seedFixtures() {
  console.log('\n— Fixtures (one property + one risk per category) —');
  for (const cat of ['residential', 'commercial', 'business', 'rural']) {
    const p = await req('POST', '/api/properties', {
      body: { title: `ISO ${cat} ${STAMP}`, category: cat, listing_type: 'rent', status: 'available', price: 1000, branch_id: 1 },
    });
    ok(p.status === 201, `fixture property created for ${cat}`, `HTTP ${p.status}`);
    const id = p.body?.data?.id;
    if (id) made.properties.push(id);
    const r = await req('POST', '/api/property-risks', {
      body: { property_id: id, risk_category: 'isolation-test', risk_rating: 'low', status: 'open', branch_id: 1 },
    });
    if (r.body?.data?.id) made.risks.push(r.body.data.id);
  }
}

/** Each console must see exactly its own fixture and no other. */
async function assertFixtureIsolation(label, mk) {
  for (const cat of ['residential', 'commercial', 'business', 'rural']) {
    const r = await req('GET', mk(cat));
    const rows = rowsOf(r.body) || [];
    const mine = rows.filter((x) => String(x.risk_category || '') === 'isolation-test');
    const others = rows.filter((x) => x.property_id && !made.properties.includes(x.property_id));
    ok(r.status === 200 && others.length === 0,
      `${label} shows ${cat} nothing from another console`, `${others.length} foreign rows`);
    ok(mine.length <= 1, `${label} shows at most its own ${cat} fixture`, `${mine.length}`);
  }
}
```

Call `seedFixtures()` first in the runner, then `assertFixtureIsolation('property-risks', c => \`/api/property-risks?limit=200&property_category=${c}\`)`.

- [ ] **Step 2: Add every remaining endpoint**

Extend the harness with an `everythingElse()` section calling `assertScoped` for each endpoint the audit listed as scoped, so a regression anywhere is caught:

```js
async function everythingElse() {
  console.log('\n— Every remaining PM endpoint —');
  const E = [
    ['tenancies', (c) => `/api/tenancies?category=${c}&limit=200`],
    ['tenant-applications', (c) => `/api/tenant-applications?category=${c}&listing_type=rent&limit=200`],
    ['properties', (c) => `/api/properties?category=${c}&listing_type=rent&limit=200`],
    ['rental-assessments', (c) => `/api/rental-assessments?limit=200&category=${c}`],
    ['rental-enquiries', (c) => `/api/rental-enquiries?category=${c}`],
    ['folios', (c) => `/api/folios?type=landlord&limit=200&property_category=${c}`],
    ['inspections', (c) => `/api/inspections?limit=200&property_category=${c}`],
    ['billing/tenant-invoices', (c) => `/api/billing/tenant-invoices?limit=200&property_category=${c}`],
    ['billing/landlord-bills', (c) => `/api/billing/landlord-bills?limit=200&property_category=${c}`],
    ['billing/rental-receipts', (c) => `/api/billing/rental-receipts?limit=200&property_category=${c}`],
    ['deposit-settlements', (c) => `/api/deposit-settlements?property_category=${c}`],
    ['owner-statements', (c) => `/api/owner-statements?property_category=${c}`],
    ['vacancy-notices', (c) => `/api/vacancy-notices?property_category=${c}`],
    ['work-orders', (c) => `/api/work-orders?limit=200&property_category=${c}`],
    ['pm/renewals', (c) => `/api/property-management/renewals?property_category=${c}`],
    ['pm/dashboard-metrics', (c) => `/api/property-management/dashboard-metrics?category=${c}`],
    ['invoices/agency-income', (c) => `/api/invoices/agency-income?scope=pm&property_category=${c}`],
    ['move-in-checklist', (c) => `/api/move-in-checklist?limit=200&property_category=${c}`],
    ['tenant-requests', (c) => `/api/tenant-requests?limit=200&property_category=${c}`],
    ['arrears-actions', (c) => `/api/arrears-actions?limit=200&property_category=${c}`],
    ['utility-bills', (c) => `/api/utility-bills?limit=200&property_category=${c}`],
    ['marketing-activities', (c) => `/api/marketing-activities?limit=200&property_category=${c}`],
    ['expense-approvals', (c) => `/api/expense-approvals?limit=200&property_category=${c}`],
  ];
  for (const [label, mk] of E) await assertScoped(label, mk, ['commercial', 'business', 'rural']);
}
```

- [ ] **Step 3: Assert the residential baseline has not moved**

Add a final section — this is the guard that the whole plan did not break the live console:

```js
async function residentialBaseline() {
  console.log('\n— The live residential console is unchanged —');
  const ac = await req('GET', '/api/property-management/action-center?category=residential');
  ok(ac.body?.headline?.open_action_count === 103, 'residential open actions', `${ac.body?.headline?.open_action_count} (expected 103)`);
  ok(Number(ac.body?.headline?.overdue_rent_amount) === 107400, 'residential overdue rent', `${ac.body?.headline?.overdue_rent_amount} (expected 107400)`);
  ok(ac.body?.headline?.setup_blocker_count === 192, 'residential setup blockers', `${ac.body?.headline?.setup_blocker_count} (expected 192)`);
  const dm = await req('GET', '/api/property-management/dashboard-metrics?category=residential');
  ok(Number(dm.body?.occupancy?.managed) === 53, 'residential managed properties', `${dm.body?.occupancy?.managed} (expected 53)`);
  const t = await req('GET', '/api/tenancies?category=residential&limit=200');
  ok((t.body?.data || []).length === 38, 'residential tenancies', `${(t.body?.data || []).length} (expected 38)`);

  // A caller that passes no category must still see everything, as before.
  const un = await req('GET', '/api/property-management/dashboard-metrics');
  ok(Number(un.body?.occupancy?.managed) >= 53, 'an unscoped caller still sees everything',
    `${un.body?.occupancy?.managed}`);
}
```

The four fixture properties add one rent property per category, so `managed` for the *unscoped*
call will exceed 53 while fixtures exist — that is why this asserts `>=` for unscoped and `=== 53`
only for residential. Run `residentialBaseline()` **before** `seedFixtures()` if you prefer exact
equality on both.

- [ ] **Step 4: Remove the fixtures**

```js
async function cleanup() {
  console.log('\n— Fixture cleanup (this DB is the production DB) —');
  for (const id of made.risks) await req('DELETE', `/api/property-risks/${id}`);
  for (const id of made.properties) await req('DELETE', `/api/properties/${id}`);
  const left = await req('GET', `/api/properties?search=ISO%20&limit=50`);
  const stragglers = (left.body?.data || []).filter((p) => String(p.title || '').includes(`ISO `) && p.title.includes(STAMP));
  ok(stragglers.length === 0, 'no fixture properties left behind',
    stragglers.map((p) => p.property_code).join(',') || 'clean');
}
```

If `DELETE /api/properties/:id` does not exist, delete the rows with a short Node script against the
models instead, and say so in the work-log entry — never leave test properties in the production
book.

- [ ] **Step 5: Run everything**

```bash
cd backend && node scripts/e2e/consoleIsolation.js
npm test
node scripts/e2e/businessRent.js
node scripts/e2e/businessParity.js
node scripts/e2e/businessRegistration.js
cd ../admin-portal && npm run build && node src/screens/pmScopeCoverage.test.mjs
cd ../website-mock && npm run build
```

Expected: isolation suite 0 FAIL; `npm test` exit 0; businessRent 39/39, businessParity 74/74,
businessRegistration 48/48; both builds `✓ built`; `pmScopeCoverage OK`.

- [ ] **Step 6: Click all four consoles**

Open `/admin/property-management`, `/admin/commercial/rent`, `/admin/business-rent` and confirm:
residential looks exactly as before; the other two show **their own** data or an honest empty state on
Disbursements, Pay Owners, Collect Rent, Rent Reminders, Inbox, Reports, Compliance and Workflows —
not residential work.

- [ ] **Step 7: Append the COMPLETED entry to the work log**

Append to `AGENT_WORK_LOG.md` (append-only; never committed): the endpoints fixed with their
before/after figures, the migration applied (0155), the exact verification commands and results, the
decision to leave the 55 existing leads alone, whether any fixture could not be removed, and what
remains (rural agreement builders, the `property_type` junk, the Rural console itself).

- [ ] **Step 8: Final commit**

```bash
git add backend/scripts/e2e/consoleIsolation.js
git commit -m "test(pm): permanent console isolation suite across all four categories

Walks every PM endpoint in four categories and fails on identical non-empty
payloads. Seeds one property and one risk per category so the six endpoints whose
tables are empty are proven rather than assumed, asserts the live residential
baseline (53 properties, 38 tenancies, 103 actions, BDT 107,400, 192 blockers),
and removes its fixtures.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Notes for the executor

- **Re-measure residential after every task.** The numbers are in the Global Constraints; if one
  moves, stop and find out why before continuing.
- **Deployment is blocked.** Hostinger has lost access to the repository; do not merge or push to
  `production` as part of this plan.
- **The Rural console comes next**, from
  `docs/superpowers/specs/2026-09-26-rural-rent-pm-console-design.md`. Task 1 here is its
  prerequisite, and Task 8 leaves the rural agreement builders for it.
- **If a step's anchor does not match the file**, read the file and adapt rather than forcing the
  edit. Line numbers were measured on 2026-09-26 and may drift.
