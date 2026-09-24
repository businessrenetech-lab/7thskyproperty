/**
 * End-to-end checks for the Business Rent console. Needs the API on :50001.
 * Run: node scripts/e2e/businessRent.js
 */
const { login, req, ok, finish, STAMP } = require('./httpHarness');

async function scoping() {
  console.log('\n— Scoping: business rent never shows business sale —');
  // 17 business-category properties exist today and every one is listing_type
  // 'sale' (the Business Buy/Sale parity work). Scoping on category alone shows
  // them all in the Business RENT console.
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
  const resRows = res.body?.data || [];
  ok(resRows.every((p) => p.category === 'residential'), 'residential scope still clean');
  ok(resRows.length > 0, 'residential rent properties still returned', `${resRows.length}`);
}

(async () => {
  console.log(`\n===== BUSINESS RENT E2E (run ${STAMP}) =====`);
  if (!(await login())) return finish();
  await scoping();
  finish();
})().catch((e) => { ok(false, 'harness crashed', e.message); finish(); });
