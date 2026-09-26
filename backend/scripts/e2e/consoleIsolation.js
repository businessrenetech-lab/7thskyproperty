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

  // Global Invoicing is broken for every console, not just leaking.
  const gi = await req('GET', '/api/tenancies/global-invoices?property_category=residential');
  ok(gi.status === 200, 'tenancies/global-invoices answers at all', `HTTP ${gi.status}`);
  await assertScoped('tenancies/global-invoices', (c) => `/api/tenancies/global-invoices?property_category=${c}`);
}

module.exports = { assertScoped, sig, count, rowsOf };

if (require.main === module) {
  (async () => {
    console.log('\n===== CONSOLE ISOLATION =====');
    if (!(await login())) return finish();
    await moneyAndReports();
    await leads();
    await bulkAndInbox();
    finish();
  })().catch((e) => { ok(false, 'harness crashed', e.message); finish(); });
}
