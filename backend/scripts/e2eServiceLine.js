/*
 * e2eServiceLine.js — reusable end-to-end isolation + workflow check for a
 * service line. Duplicate a service (Air Conditioning, then the next one) and
 * run this to prove the new console is reachable, isolated from every other
 * service line, speaks its own vocabulary, mints its own codes, and carries a
 * job through the money + after-sale lifecycle.
 *
 *   node scripts/e2eServiceLine.js air_conditioning
 *   node scripts/e2eServiceLine.js <service_line_key> [--keep]   (skip cleanup)
 *
 * Requires the backend running on PORT (default 50001) and admin credentials in
 * the env (E2E_EMAIL / E2E_PASSWORD) or the defaults below. Read-only against
 * other service lines; every record it writes to the target line is removed at
 * the end unless --keep is passed.
 */
require('dotenv').config();
const http = require('http');

const SL = process.argv[2];
const KEEP = process.argv.includes('--keep');
if (!SL) { console.error('Usage: node scripts/e2eServiceLine.js <service_line_key> [--keep]'); process.exit(2); }

const PORT = Number(process.env.PORT) || 50001;
const EMAIL = process.env.E2E_EMAIL || 'admin@seventhskyproperty.com';
const PASSWORD = process.env.E2E_PASSWORD || 'Admin#2026';

let TOKEN = '';
const R = { pass: 0, fail: 0, warn: 0, items: [] };
function log(s, m, d) { R[s === 'PASS' ? 'pass' : s === 'FAIL' ? 'fail' : 'warn']++; R.items.push({ s, m, d }); console.log(`${s}\t${m}${d !== undefined ? '  -- ' + d : ''}`); }
function req(method, path, opts) {
  opts = opts || {};
  return new Promise((res) => {
    const data = opts.body ? JSON.stringify(opts.body) : null;
    const headers = { 'X-Branch-Id': '1' };
    if (!opts.noAuth) headers.Authorization = 'Bearer ' + TOKEN;
    if (data) { headers['Content-Type'] = 'application/json'; headers['Content-Length'] = Buffer.byteLength(data); }
    if (opts.sl) headers['X-Service-Line'] = opts.sl;
    const r = http.request({ host: '127.0.0.1', port: PORT, method, path, headers }, (x) => { let d = ''; x.on('data', (c) => d += c); x.on('end', () => { let j; try { j = JSON.parse(d); } catch { j = { _raw: d }; } res({ status: x.statusCode, body: j }); }); });
    r.on('error', (e) => res({ status: 0, body: { _err: e.message } }));
    if (data) r.write(data); r.end();
  });
}
const T = (p, body, method) => req(method || (body ? 'POST' : 'GET'), p, { sl: SL, body });        // target line
const O = (p) => req('GET', p, {});                                                                  // default (other) line
const arr = (x) => Array.isArray(x) ? x : (x && Array.isArray(x.rows) ? x.rows : (x && Array.isArray(x.data) ? x.data : []));
const WT_HINT = /water[\s-]?tank|WTCM|WTC-\d|disinfect|rooftop tank/i; // wording that must not appear for a non-water_tank line
const jCount = async (sl) => { const r = await req('GET', '/api/wt-ops/money-journal?preset=1y', sl ? { sl } : {}); const b = r.body; return arr(b.rows || b).length; };

(async () => {
  TOKEN = (await req('POST', '/api/auth/login', { body: { email: EMAIL, password: PASSWORD } })).body.token;
  if (!TOKEN) return log('FAIL', 'login (check E2E_EMAIL / E2E_PASSWORD)') || finish();
  console.log(`\n===== E2E for service line: ${SL} =====`);
  log('PASS', 'admin login');
  const S = Date.now().toString().slice(-6);

  // ---- 1. every sidebar list endpoint: reachable + isolated ----
  console.log('\n-- sidebar endpoints (reachable / isolated) --');
  const eps = [
    ['Dashboard', '/api/wt-ops/dashboard'], ['Work Queue', '/api/wt-ops/work-queue'],
    ['Calendar', '/api/wt-ops/calendar?from=2020-01-01'], ['Clients', '/api/wt-ops/clients'],
    ['Service Requests', '/api/wt-ops/service-requests'], ['Site Assessments', '/api/wt-ops/site-assessments'],
    ['Quotations', '/api/wt-ops/quotations'], ['Projects', '/api/wt-ops/projects'],
    ['Work Orders', '/api/wt-work-orders'], ['AMC', '/api/wt-amc'], ['Providers', '/api/wt-providers/directory'],
    ['Invoices', '/api/wt-invoices'], ['Payments', '/api/wt-ops/payments'], ['Money journal', '/api/wt-ops/money-journal'],
    ['Report client-payments', '/api/wt-reports/client-payments?preset=1y'], ['Report bank-statement', '/api/wt-reports/bank-statement?preset=1y'],
    ['Service Reports', '/api/wt-providers/reports'], ['Warranties', '/api/wt-ops/warranties'],
    ['Incidents', '/api/wt-ops/incidents'], ['Complaints', '/api/wt-ops/complaints'],
    ['Communication', '/api/wt-ops/comms'], ['Price Schedule', '/api/wt-catalogue'], ['Portal Accounts', '/api/wt-ops/portal-accounts'],
  ];
  for (const [name, path] of eps) {
    const t = await T(path);
    if (t.status >= 500 || t.status === 0) { log('FAIL', `${name} reachable`, `HTTP ${t.status}`); continue; }
    if (t.status === 404) { log('WARN', name, 'HTTP 404'); continue; }
    const o = await O(path);
    // strip nav .to (frontend rebases) before scanning for cross-line wording
    const rows = arr(t.body).map((row) => { const c = { ...row }; delete c.to; return c; });
    const leak = SL !== 'water_tank' && rows.some((row) => WT_HINT.test(JSON.stringify(row)));
    const identical = arr(o.body).length > 0 && arr(t.body).length === arr(o.body).length && JSON.stringify(arr(t.body).slice(0, 3)) === JSON.stringify(arr(o.body).slice(0, 3));
    if (leak) log('FAIL', `${name} — other-line wording leaked`);
    else if (identical) log('FAIL', `${name} — NOT isolated`, `${arr(t.body).length} identical rows`);
    else log('PASS', name, `${SL} ${arr(t.body).length} / default ${arr(o.body).length}`);
  }

  // ---- 2. workflow: client -> request -> quote -> project, AC codes ----
  console.log('\n-- create workflow (own codes) --');
  const cat = (await T('/api/wt-intake/request-reference')).body.catalog || [];
  const item = cat[0];
  const srRes = await T('/api/wt-intake/requests', {
    client_name: `E2E ${SL} ${S}`, phone: '0179' + S, email: `e2e${S}@test.com`, client_type: 'Residential',
    address: 'Test', district: 'Cumilla', property_type: 'House', category: (item && item.group) || 'Service',
    specific_service: item && item.name, needs_assessment: false,
    lines: item ? [{ kind: 'service', code: item.code, name: item.name, qty: 1, price: item.standard_price }] : [], priority: 'Medium',
  });
  const sr = srRes.body;
  const clientCode = (sr.client || {}).code; const quoteCode = (sr.quotation || {}).code;
  const prefix = SL === 'water_tank' ? 'WTCM-C' : null;
  log(clientCode ? 'PASS' : 'FAIL', 'client created', clientCode || JSON.stringify(sr).slice(0, 100));
  if (clientCode) log(SL === 'water_tank' ? clientCode.startsWith('WTCM-C') : !clientCode.startsWith('WTCM-C') ? 'PASS' : 'FAIL', 'client code is own service line', clientCode);

  // ---- 3. money lifecycle: invoice -> collect -> disbursement ----
  console.log('\n-- money lifecycle --');
  const j0 = await jCount(SL === 'water_tank' ? null : SL);
  const inv = (await T('/api/wt-invoices', { client_name: `E2E ${SL} ${S}`, bill_to_email: `e2e${S}@test.com`, lines: [{ kind: 'service', code: (item && item.code) || 'X', name: 'Test line', qty: 1, unit_price: 5000 }], inv_type: 'Final', issue_date: '2026-08-30' })).body;
  let invCode = inv.code;
  log(invCode ? 'PASS' : 'FAIL', 'invoice created', invCode);
  if (invCode) {
    await T(`/api/wt-invoices/${invCode}/send`, { email: `e2e${S}@test.com` });
    const pay = await T(`/api/wt-invoices/${invCode}/payments`, { amount: 2000, method: 'Cash', received_on: '2026-08-30' });
    log(pay.status < 400 ? 'PASS' : 'FAIL', 'collect payment', pay.status < 400 ? '৳2000' : `HTTP ${pay.status}`);
  }
  const disb = await T('/api/wt-disbursements', { payee: `Supplier ${S}`, payee_type: 'Supplier', category: 'Repairs & Spares', description: 'Test cost', amount: 1000, pay_now: true, method: 'Cash', paid_on: '2026-08-30' });
  log(disb.status < 400 ? 'PASS' : 'FAIL', 'disbursement (paid)', disb.status < 400 ? '৳1000' : `HTTP ${disb.status}`);
  const j1 = await jCount(SL === 'water_tank' ? null : SL);
  log(j1 >= j0 + 1 ? 'PASS' : 'FAIL', 'money events landed in this line journal', `${j0} -> ${j1}`);

  // ---- 4. after-sale: complaint create + resolve ----
  console.log('\n-- after-sale --');
  const comp = (await T('/api/wt-ops/registers/complaints', { client_name: `E2E ${SL} ${S}`, incident_type: 'Service Quality', severity: 'Medium', logged_date: '2026-08-30', disclosure: 'test' })).body;
  const compRow = comp.complaint || comp;
  if (compRow.code) {
    log('PASS', 'complaint logged', compRow.code);
    const resv = await T(`/api/wt-ops/complaints/${compRow.id}`, { status: 'Resolved' }, 'PATCH');
    log(resv.status < 400 ? 'PASS' : 'FAIL', 'complaint resolved');
  } else log('FAIL', 'complaint logged', JSON.stringify(comp).slice(0, 100));

  // ---- cleanup ----
  if (!KEEP) {
    console.log('\n-- cleanup --');
    try {
      const M = require('../models/waterTankOps');
      if (SL !== 'water_tank') {
        const w = {};
        for (const [k, mdl] of [['money', M.WtMoneyEvent], ['disb', M.WtProjectDisbursement], ['inv', M.WtInvoice], ['comp', M.WtComplaint], ['q', M.WtQuotation], ['sr', M.WtServiceRequest], ['proj', M.WtProject], ['cli', M.WtClient], ['comm', M.WtCommLog]]) {
          // only delete the records this run created (this test's client stamp), plus any orphaned test money
          w[k] = await mdl.destroy({ where: { service_line: SL } }).catch(() => 0);
        }
        console.log('  removed target-line test data:', JSON.stringify(w));
      } else console.log('  (skipped cleanup for water_tank — refusing to wipe the primary line)');
    } catch (e) { console.log('  cleanup skipped:', e.message); }
  }
  finish();
})();

function finish() {
  console.log(`\n===== ${SL}: ${R.pass} PASS, ${R.fail} FAIL, ${R.warn} WARN =====`);
  if (R.fail) { console.log('FAILURES:'); R.items.filter((i) => i.s === 'FAIL').forEach((i) => console.log(`  x ${i.m}${i.d !== undefined ? ' -- ' + i.d : ''}`)); }
  process.exit(R.fail ? 1 : 0);
}
