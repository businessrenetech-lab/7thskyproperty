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
  } else ok(true, 'no published property to probe (skipped)');
}

(async () => {
  console.log(`\n===== BUSINESS PARITY E2E (run ${STAMP}) =====`);
  if (!(await login())) return finish();
  if (want(1)) await phase1();
  finish();
})().catch((e) => { ok(false, 'harness crashed', e.message); finish(); });
