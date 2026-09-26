/**
 * Console isolation — every PM endpoint must return only its own category's rows.
 * Needs the API on :50001. Run: node scripts/e2e/consoleIsolation.js
 *
 * Two kinds of check:
 *   · comparison — an endpoint returning an identical, NON-EMPTY payload for two
 *     consoles is ignoring the scope.
 *   · fixture — an endpoint whose table is empty returns 0 rows for every console,
 *     which proves nothing. Those get one property + one risk per category so the
 *     scoping is actually exercised.
 *
 * This is the guard that stops the next console re-introducing the leak.
 */
const { login, req, ok, finish, STAMP } = require('./httpHarness');

const CATS = ['residential', 'commercial', 'business', 'rural'];
const made = { properties: [], risks: [] };

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
  await assertScoped('disbursements/owner (list)', (c) => `/api/disbursements/owner?property_category=${c}`);
  await assertScoped('disbursements/income (list)', (c) => `/api/disbursements/income?property_category=${c}`);
}

async function leads() {
  console.log('\n— Leads and contacts —');
  await assertScoped('contacts (rental leads)', (c) => `/api/contacts?looking_for=rent&limit=200&category=${c}`);
  await assertScoped('contacts (directory)', (c) => `/api/contacts?limit=200&category=${c}`);
}

async function bulkAndInbox() {
  console.log('\n— Bulk operations and the inbox —');
  await assertScoped('tenancies/collect-rent-data', (c) => `/api/tenancies/collect-rent-data?property_category=${c}`);
  await assertScoped('tenancies/overdue-reminders', (c) => `/api/tenancies/overdue-reminders?property_category=${c}`);
  await assertScoped('disbursements/bulk-owner-data', (c) => `/api/disbursements/bulk-owner-data?property_category=${c}`);
  await assertScoped('communications/inbox', (c) => `/api/communications/inbox?property_category=${c}`);

  // Global Invoicing was broken for every console, not just leaking (req.body is
  // undefined on a GET).
  const gi = await req('GET', '/api/tenancies/global-invoices?property_category=residential');
  ok(gi.status === 200, 'tenancies/global-invoices answers at all', `HTTP ${gi.status}`);
  await assertScoped('tenancies/global-invoices', (c) => `/api/tenancies/global-invoices?property_category=${c}`);
}

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

/** The live console's numbers must not move. Runs BEFORE the fixtures exist. */
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
  ok(Number(un.body?.occupancy?.managed) >= 53, 'an unscoped caller still sees everything', `${un.body?.occupancy?.managed}`);
}

/** One property + one risk per category, so "empty for everyone" cannot pass as "scoped". */
async function seedFixtures() {
  console.log('\n— Fixtures (one property + one risk per category) —');
  for (const cat of CATS) {
    const p = await req('POST', '/api/properties', {
      body: { title: `ISO ${cat} ${STAMP}`, category: cat, listing_type: 'rent', status: 'available', price: 1000, branch_id: 1 },
    });
    ok(p.status === 201, `fixture property created for ${cat}`, `HTTP ${p.status}`);
    const id = p.body?.data?.id;
    if (!id) continue;
    made.properties.push(id);
    const r = await req('POST', '/api/property-risks', {
      body: {
        property_id: id, risk_category: 'isolation-test',
        risk_rating: 'low', status: 'open', branch_id: 1,
      },
    });
    if (r.body?.data?.id) made.risks.push(r.body.data.id);
    else ok(false, `fixture risk created for ${cat}`, `HTTP ${r.status} ${JSON.stringify(r.body).slice(0, 90)}`);
  }
}

/** Each console must see exactly its own fixture and nobody else's. */
async function assertFixtureIsolation() {
  console.log('\n— Fixture-proven scoping (the endpoints whose tables are empty) —');
  const byCat = {};
  CATS.forEach((c, i) => { byCat[c] = made.properties[i]; });

  for (const cat of CATS) {
    const r = await req('GET', `/api/property-risks?limit=200&property_category=${cat}`);
    const rows = (rowsOf(r.body) || []).filter((x) => String(x.risk_category || '') === 'isolation-test');
    const mine = rows.filter((x) => Number(x.property_id) === Number(byCat[cat]));
    const foreign = rows.filter((x) => Number(x.property_id) !== Number(byCat[cat]));
    ok(r.status === 200 && foreign.length === 0, `property-risks shows ${cat} nothing from another console`,
      `${foreign.length} foreign rows`);
    ok(mine.length === 1, `property-risks shows ${cat} its own fixture`, `${mine.length} of 1`);
  }

  // The property list itself, proven the same way.
  for (const cat of CATS) {
    const r = await req('GET', `/api/properties?category=${cat}&listing_type=rent&limit=200`);
    const rows = rowsOf(r.body) || [];
    ok(rows.every((p) => p.category === cat), `properties returns only ${cat}`,
      rows.filter((p) => p.category !== cat).map((p) => p.property_code).join(',') || 'clean');
    ok(rows.some((p) => Number(p.id) === Number(byCat[cat])), `properties includes the ${cat} fixture`);
  }
}

async function cleanup() {
  console.log('\n— Fixture cleanup (this DB is the production DB) —');
  for (const id of made.risks) await req('DELETE', `/api/property-risks/${id}`);
  for (const id of made.properties) await req('DELETE', `/api/properties/${id}`);
  let left = 0;
  for (const cat of CATS) {
    const r = await req('GET', `/api/properties?category=${cat}&listing_type=rent&limit=200`);
    left += (rowsOf(r.body) || []).filter((p) => String(p.title || '').includes(`ISO ${cat} ${STAMP}`)).length;
  }
  ok(left === 0, 'no fixture properties left behind', `${left} remaining`);
  const risks = await req('GET', '/api/property-risks?limit=200');
  const leftRisks = (rowsOf(risks.body) || []).filter((x) => String(x.risk_category || '') === 'isolation-test').length;
  ok(leftRisks === 0, 'no fixture risks left behind', `${leftRisks} remaining`);
}

module.exports = { assertScoped, sig, count, rowsOf };

if (require.main === module) {
  (async () => {
    console.log(`\n===== CONSOLE ISOLATION (run ${STAMP}) =====`);
    if (!(await login())) return finish();
    await residentialBaseline();
    await moneyAndReports();
    await leads();
    await bulkAndInbox();
    await everythingElse();
    await seedFixtures();
    await assertFixtureIsolation();
    await cleanup();
    finish();
  })().catch((e) => { ok(false, 'harness crashed', e.message); finish(); });
}
