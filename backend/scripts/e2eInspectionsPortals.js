/**
 * e2eInspectionsPortals.js — second-pass PM debug: rental assessments +
 * inspections (create → items → complete → generate work orders), and the
 * landlord/tenant portal endpoints' role-gating (admin without the portal role
 * must be refused, proving the guard works).
 */
const http = require('http');
const PORT = 50001; const EMAIL = 'admin@seventhskyproperty.com'; const PASSWORD = 'Admin#2026';
const STAMP = Date.now().toString().slice(-6);
let TOKEN = '';
const R = { pass: 0, fail: 0 };
const log = (s, m, d) => { R[s === 'PASS' ? 'pass' : 'fail'] += 1; console.log(`${s === 'PASS' ? '\x1b[32mPASS\x1b[0m' : '\x1b[31mFAIL\x1b[0m'}\t${m}${d !== undefined ? '  \x1b[2m' + d + '\x1b[0m' : ''}`); };
const ok = (c, m, d) => { log(c ? 'PASS' : 'FAIL', m, d); return c; };
const short = (o) => JSON.stringify(o).slice(0, 200);
function req(method, path, opts = {}) {
  return new Promise((resolve) => {
    const data = opts.body ? JSON.stringify(opts.body) : null;
    const headers = { 'X-Branch-Id': '1' };
    if (!opts.noAuth) headers.Authorization = 'Bearer ' + TOKEN;
    if (data) { headers['Content-Type'] = 'application/json'; headers['Content-Length'] = Buffer.byteLength(data); }
    const r = http.request({ host: '127.0.0.1', port: PORT, method, path, headers }, (x) => {
      let d = ''; x.on('data', (c) => { d += c; });
      x.on('end', () => { let j; try { j = JSON.parse(d); } catch { j = { _raw: d }; } resolve({ status: x.statusCode, body: j }); });
    });
    r.on('error', (e) => resolve({ status: 0, body: { error: e.message } }));
    if (data) r.write(data); r.end();
  });
}
const finish = () => { console.log(`\n${'='.repeat(56)}\n${R.fail ? '\x1b[31m' : '\x1b[32m'}${R.pass} PASS / ${R.fail} FAIL\x1b[0m\n`); process.exit(R.fail ? 1 : 0); };

(async () => {
  console.log(`\n===== INSPECTIONS + RENTAL ASSESSMENTS + PORTAL GATES E2E (run ${STAMP}) =====\n`);
  const login = await req('POST', '/api/auth/login', { noAuth: true, body: { email: EMAIL, password: PASSWORD } });
  TOKEN = login.body?.token || '';
  if (!ok(!!TOKEN, 'admin login')) return finish();

  const ll = await req('POST', '/api/contacts', { body: { full_name: `E2E-Insp LL ${STAMP}`, primary_phone: `0144${STAMP}`, contact_type: 'individual' } });
  const llId = ll.body?.data?.id;
  const prop = await req('POST', '/api/properties', { body: { title: `E2E-Insp Rental ${STAMP}`, category: 'residential', property_type: 'apartment', listing_type: 'rent', status: 'available', owner_contact_id: llId } });
  const propId = prop.body?.data?.id;
  if (!ok(!!propId, 'rental property created', `p${propId}`)) return finish();

  // ── Rental assessment ───────────────────────────────────────────────────────
  const ra = await req('POST', '/api/rental-assessments', { body: { property_id: propId, owner_contact_id: llId, assessment_type: 'rental', status: 'draft' } });
  const raId = ra.body?.data?.id;
  if (ok(!!raId, 'rental assessment created', `#${raId} HTTP ${ra.status}`)) {
    const it = await req('POST', `/api/rental-assessments/${raId}/items`, { body: { section: 'Kitchen', assessment_item: 'Cabinets', condition_rating: 'good' } });
    ok([200, 201].includes(it.status), 'rental assessment item added', `HTTP ${it.status} ${it.status >= 400 ? short(it.body) : ''}`);
    const wo = await req('POST', `/api/rental-assessments/${raId}/generate-work-orders`, { body: {} });
    ok([200, 201].includes(wo.status), 'generate work orders from assessment', `HTTP ${wo.status} ${wo.status >= 400 ? short(wo.body) : ''}`);
    const comp = await req('POST', `/api/rental-assessments/${raId}/complete`, { body: { override: true } });
    ok([200, 201].includes(comp.status), 'rental assessment completed (manager override)', `HTTP ${comp.status} ${comp.status >= 400 ? short(comp.body) : ''}`);
  } else { console.log('  ', short(ra.body)); }

  // ── Inspection ──────────────────────────────────────────────────────────────
  const insp = await req('POST', '/api/inspections', { body: { property_id: propId, owner_contact_id: llId, inspection_type: 'routine', status: 'scheduled', scheduled_date: new Date().toISOString().slice(0, 10) } });
  const inspId = insp.body?.data?.id;
  if (ok(!!inspId, 'inspection created', `#${inspId} HTTP ${insp.status}`)) {
    const it = await req('POST', `/api/inspections/${inspId}/items`, { body: { area: 'Living room', item: 'Walls', condition: 'good', finding: 'No damage' } });
    ok([200, 201].includes(it.status), 'inspection item added', `HTTP ${it.status}`);
    const upd = await req('PUT', `/api/inspections/${inspId}`, { body: { status: 'completed', completed_date: new Date().toISOString().slice(0, 10), summary: 'All good' } });
    ok([200, 201].includes(upd.status), 'inspection completed', `HTTP ${upd.status}`);
    const one = await req('GET', `/api/inspections/${inspId}`);
    ok(one.status === 200 && (one.body?.data || one.body)?.status === 'completed', 'inspection reads back completed', `status=${(one.body?.data || one.body)?.status}`);
  } else { console.log('  ', short(insp.body)); }

  // ── Portal role-gating (admin lacks landlord/tenant role → must be refused) ──
  const llPortal = await req('GET', '/api/landlord/portfolio');
  ok(llPortal.status === 403 || llPortal.status === 401, 'landlord portal refuses a non-landlord (role gate works)', `HTTP ${llPortal.status}`);
  const tenPortal = await req('GET', '/api/tenant/invoices');
  ok(tenPortal.status === 403 || tenPortal.status === 401, 'tenant portal refuses a non-tenant (role gate works)', `HTTP ${tenPortal.status}`);

  console.log(`\nFIXTURE IDS: landlord=${llId} property=${propId} assessment=${raId} inspection=${inspId} stamp=${STAMP}`);
  finish();
})().catch((e) => { log('FAIL', 'harness crashed', e.stack || e.message); finish(); });
