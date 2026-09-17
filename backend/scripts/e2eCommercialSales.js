/**
 * e2eCommercialSales.js — verifies the Commercial Sales agreement layer:
 * commercial CSAs render commercial content (CPSS/CPPS), draft under the
 * commercial related_types, and stay ISOLATED from residential (a commercial
 * agreement never appears in the residential list, and vice-versa).
 */
const http = require('http');
const PORT = 50001, EMAIL = 'admin@seventhskyproperty.com', PASSWORD = 'Admin#2026';
const STAMP = Date.now().toString().slice(-6);
const R = { pass: 0, fail: 0 };
const ok = (c, m, d) => { R[c ? 'pass' : 'fail'] += 1; console.log(`${c ? '\x1b[32mPASS\x1b[0m' : '\x1b[31mFAIL\x1b[0m'}\t${m}${d !== undefined ? '  \x1b[2m' + d + '\x1b[0m' : ''}`); return c; };
function raw(method, path, { body, cookie } = {}) {
  return new Promise((resolve) => {
    const data = body ? JSON.stringify(body) : null;
    const headers = {};
    if (cookie) headers.Cookie = cookie;
    if (data) { headers['Content-Type'] = 'application/json'; headers['Content-Length'] = Buffer.byteLength(data); }
    const r = http.request({ host: '127.0.0.1', port: PORT, method, path, headers }, (x) => {
      let d = ''; x.on('data', (c) => { d += c; });
      x.on('end', () => { let j; try { j = JSON.parse(d); } catch { j = { _raw: d }; } resolve({ status: x.statusCode, body: j, setCookie: x.headers['set-cookie'] }); });
    });
    r.on('error', (e) => resolve({ status: 0, body: { error: e.message } }));
    if (data) r.write(data); r.end();
  });
}
const list = (b) => (Array.isArray(b) ? b : (b?.data || b?.rows || []));
const finish = () => { console.log(`\n${'='.repeat(56)}\n${R.fail ? '\x1b[31m' : '\x1b[32m'}${R.pass} PASS / ${R.fail} FAIL\x1b[0m\n`); process.exit(R.fail ? 1 : 0); };

(async () => {
  console.log(`\n===== COMMERCIAL SALES E2E (run ${STAMP}) =====\n`);
  const login = await raw('POST', '/api/auth/login', { body: { email: EMAIL, password: PASSWORD } });
  const ADMIN = (login.setCookie || []).map((s) => s.split(';')[0]).find((s) => s.startsWith('la_admin_token=')) || null;
  if (!ok(!!ADMIN, 'admin cookie session')) return finish();
  const A = (method, path, body) => raw(method, path, { cookie: ADMIN, body });

  // ── Meta: commercial vs residential ────────────────────────────────────────
  const cSaleMeta = await A('GET', '/api/sales-agreements/sale/meta?category=commercial');
  ok(cSaleMeta.body?.code === 'CPSS' && /Commercial Property Services/.test(cSaleMeta.body?.org?.name || ''), 'commercial SALE meta → code CPSS + Commercial org', `code=${cSaleMeta.body?.code}`);
  ok((cSaleMeta.body?.schedule_a || []).some((g) => /Property Assessment & Sales Strategy/.test(g[0])), 'commercial SALE Schedule A is commercial taxonomy');
  const cBuyMeta = await A('GET', '/api/sales-agreements/purchase/meta?category=commercial');
  ok(cBuyMeta.body?.code === 'CPPS', 'commercial PURCHASE meta → code CPPS', `code=${cBuyMeta.body?.code}`);
  const rSaleMeta = await A('GET', '/api/sales-agreements/sale/meta?category=residential');
  ok(rSaleMeta.body?.code === 'RPSS', 'residential SALE meta still → code RPSS (unchanged)', `code=${rSaleMeta.body?.code}`);

  // ── Catalog: commercial CPSS-* codes ────────────────────────────────────────
  const cat = list((await A('GET', '/api/sales-agreements/sale/catalog?category=commercial')).body);
  ok(cat.length > 0 && cat.every((i) => /^CPSS-/.test(i.code)), 'commercial SALE catalog = CPSS-* items only', `${cat.length} items`);

  // ── Preview: commercial content ─────────────────────────────────────────────
  const prev = await A('POST', '/api/sales-agreements/sale/preview?category=commercial', {
    effective_date: '2026-09-17',
    client: { full_name: `Acme Holdings Ltd ${STAMP}`, email: `acme${STAMP}@example.com`, phone: '01700000000' },
    org: { represented_by: 'SS Rep', position: 'Director' },
    services: ['Initial Consultation', 'Market Analysis'],
    schedule_b: { ownership_status: 'Freehold', existing_business_use: 'Office' },
    pricing_input: { selected: [{ code: 'CPSS-002', agreed_price: 12000 }], commission: { mode: 'percent', base_price: 20000000, percent: 2 }, vat_percent: 0 },
  });
  ok(prev.body?.doc_no === 'SSPC-CPSS-01' && /Commercial Property Services/.test(prev.body?.html || ''), 'commercial SALE preview → SSPC-CPSS-01 + commercial header', `doc=${prev.body?.doc_no}`);
  ok(!/Residential Property Services/.test(prev.body?.html || ''), 'commercial preview shows NO residential branding');

  // ── Create a commercial SALE draft ──────────────────────────────────────────
  const created = await A('POST', '/api/sales-agreements/sale/agreements?category=commercial', {
    save_as_draft: true,
    effective_date: '2026-09-17',
    client: { full_name: `Acme Holdings Ltd ${STAMP}`, email: `acme${STAMP}@example.com`, phone: '01700000000' },
    org: { represented_by: 'SS Rep', position: 'Director' },
    services: ['Initial Consultation'],
    schedule_b: {},
    pricing_input: { selected: [{ code: 'CPSS-001', agreed_price: 5000 }], vat_percent: 0 },
  });
  const envId = created.body?.id;
  ok([200, 201].includes(created.status) && /^ENV-CPSS-/.test(created.body?.envelope_code || ''), 'commercial SALE draft created (ENV-CPSS-)', `${created.body?.envelope_code}`);

  // ── Isolation: it shows on the commercial list, NOT the residential list ────
  const cList = list((await A('GET', '/api/sales-agreements/sale/agreements?category=commercial')).body);
  const rList = list((await A('GET', '/api/sales-agreements/sale/agreements?category=residential')).body);
  ok(cList.some((e) => e.id === envId), 'commercial agreement appears in the COMMERCIAL list');
  ok(!rList.some((e) => e.id === envId), 'commercial agreement is ABSENT from the RESIDENTIAL list (isolation)');

  // ── Contracts hub buckets are category-scoped ───────────────────────────────
  const cContracts = await A('GET', '/api/sales-agreements/contracts?category=commercial');
  const rContracts = await A('GET', '/api/sales-agreements/contracts?category=residential');
  const inBuckets = (o) => Object.values(o.body?.buckets || {}).flat().some((x) => x.id === envId);
  ok(inBuckets(cContracts), 'commercial contracts hub includes the draft');
  ok(!inBuckets(rContracts), 'residential contracts hub excludes the commercial draft (isolation)');

  finish();
})().catch((e) => { ok(false, 'harness crashed', e.stack || e.message); finish(); });
