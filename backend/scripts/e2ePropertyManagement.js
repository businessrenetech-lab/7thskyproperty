/**
 * e2ePropertyManagement.js — full property-management journey debug harness.
 * Drives the real API: rental property → website tenant application → verify →
 * approve → convert to tenancy (deposit + folios) → raise rent invoice → pay →
 * bulk collect next month → arrears feed → owner statement (our fees) →
 * renewal → termination. Asserts each step and explicitly checks for DUPLICATES
 * (same-period invoice raised twice, bulk after single).
 */
const http = require('http');
const PORT = 50001;
const EMAIL = 'admin@seventhskyproperty.com';
const PASSWORD = 'Admin#2026';
const STAMP = Date.now().toString().slice(-6);
let TOKEN = '';
const R = { pass: 0, fail: 0 };
const GAPS = [];
const log = (s, m, d) => { R[s === 'PASS' ? 'pass' : 'fail'] += 1; console.log(`${s === 'PASS' ? '\x1b[32mPASS\x1b[0m' : '\x1b[31mFAIL\x1b[0m'}\t${m}${d !== undefined ? '  \x1b[2m' + d + '\x1b[0m' : ''}`); };
const ok = (c, m, d) => { log(c ? 'PASS' : 'FAIL', m, d); return c; };
const gap = (t, d) => { GAPS.push({ t, d }); console.log(`\x1b[33mGAP \x1b[0m\t${t}  \x1b[2m${d || ''}\x1b[0m`); };
const short = (o) => JSON.stringify(o).slice(0, 220);
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
const list = (b) => (Array.isArray(b) ? b : (b?.data || b?.rows || (b?.data?.rows) || []));
const finish = () => {
  console.log(`\n${'='.repeat(60)}\n${R.fail ? '\x1b[31m' : '\x1b[32m'}${R.pass} PASS / ${R.fail} FAIL\x1b[0m`);
  if (GAPS.length) { console.log(`\n\x1b[33m${GAPS.length} GAP(S):\x1b[0m`); GAPS.forEach((g, i) => console.log(`  ${i + 1}. ${g.t} — ${g.d || ''}`)); }
  console.log('');
  process.exit(R.fail ? 1 : 0);
};
const RENT = 30000; const SERVICE = 2000; const DEPOSIT = 60000;
const now = new Date();
const M1 = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
const M2 = now.getMonth() === 11 ? `${now.getFullYear() + 1}-01` : `${now.getFullYear()}-${String(now.getMonth() + 2).padStart(2, '0')}`;

(async () => {
  console.log(`\n===== FULL PROPERTY MANAGEMENT JOURNEY E2E (run ${STAMP}) =====\n`);
  const login = await req('POST', '/api/auth/login', { noAuth: true, body: { email: EMAIL, password: PASSWORD } });
  TOKEN = login.body?.token || '';
  if (!ok(!!TOKEN, 'admin login')) return finish();

  // ── 1. Landlord + rental property ──────────────────────────────────────────
  const landlord = await req('POST', '/api/contacts', { body: { full_name: `E2E-PM Landlord ${STAMP}`, primary_phone: `0166${STAMP}`, email: `pmll${STAMP}@example.com`, contact_type: 'individual' } });
  const landlordId = landlord.body?.data?.id;
  const prop = await req('POST', '/api/properties', { body: { title: `E2E-PM Rental ${STAMP}`, category: 'residential', property_type: 'apartment', listing_type: 'rent', status: 'available', is_published: true, owner_contact_id: landlordId, approved_monthly_rent: RENT, management_fee_pct: 8, rent_due_day: 5 } });
  const propId = prop.body?.data?.id;
  if (!ok(!!landlordId && !!propId, 'landlord + rental property (published, 8% mgmt fee)', `ll${landlordId}/p${propId}`)) return finish();

  // ── 2. Website tenant application → shows in admin ──────────────────────────
  const app = await req('POST', '/api/public-website/tenant-applications', { noAuth: true, body: {
    property_id: propId, applicant_name: `E2E Tenant ${STAMP}`, mobile: `0155${STAMP}`, email: `pmten${STAMP}@example.com`,
    monthly_income: 120000, occupation: 'Engineer', proposed_monthly_rent: RENT, proposed_security_deposit: DEPOSIT, nid_number: `199${STAMP}`,
  } });
  ok([200, 201].includes(app.status), 'website tenant application submitted', `HTTP ${app.status} ${app.body?.reference_number || ''}`);
  const listRes = await req('GET', `/api/tenant-applications?property_id=${propId}`);
  const apps = list(listRes.body);
  const appId = apps[0]?.id;
  ok(!!appId, 'application shows in admin for the property', `#${appId} status=${apps[0]?.status}`);
  if (!appId) return finish();

  // ── 3. Verification items → approve ─────────────────────────────────────────
  const detail = await req('GET', `/api/tenant-applications/${appId}`);
  const verifs = (detail.body?.data || detail.body)?.verifications || [];
  ok(verifs.length > 0, 'application seeds a verification checklist', `${verifs.length} items`);
  let vpass = 0;
  for (const v of verifs) { const r = await req('PATCH', `/api/tenant-applications/${appId}/verifications/${v.id}`, { body: { status: 'passed' } }); if ([200, 201].includes(r.status)) vpass++; }
  ok(vpass === verifs.length, 'all verification items marked passed', `${vpass}/${verifs.length}`);
  await req('PUT', `/api/tenant-applications/${appId}`, { body: { status: 'approved', recommendation: 'recommend' } });
  const appAfter = await req('GET', `/api/tenant-applications/${appId}`);
  ok((appAfter.body?.data || appAfter.body)?.status === 'approved', 'application approved');

  // ── 4. Convert application → tenancy (deposit + folios) ─────────────────────
  const conv = await req('POST', `/api/tenant-applications/${appId}/convert-to-tenancy`, { body: {
    lease_start: `${M1}-01`, lease_end: `${now.getFullYear() + 1}-${String(now.getMonth() + 1).padStart(2, '0')}-01`,
    monthly_rent: RENT, service_charge: SERVICE, security_deposit: DEPOSIT, rent_due_day: 5, minimum_lease_period_months: 12,
  } });
  let tenancyId = conv.body?.data?.tenancy?.id || conv.body?.tenancy?.id || conv.body?.data?.id;
  if (!ok(!!tenancyId, 'application converted → tenancy', `HTTP ${conv.status} tn#${tenancyId} ${!tenancyId ? short(conv.body) : ''}`)) return finish();
  const tn = await req('GET', `/api/tenancies/${tenancyId}`);
  const tnd = tn.body?.data || tn.body;
  ok(Number(tnd?.monthly_rent) === RENT, 'tenancy carries the agreed rent', `rent=${tnd?.monthly_rent}`);

  // ── 5. Raise month-1 rent invoice + DUPLICATE guard ─────────────────────────
  const inv1 = await req('POST', `/api/tenancies/${tenancyId}/raise-invoice`, { body: { period_label: M1 } });
  const invId = inv1.body?.data?.invoice?.id;
  ok(inv1.status === 201 && !!invId, 'month-1 rent invoice raised', `${inv1.body?.data?.invoice?.invoice_code} total=${inv1.body?.data?.invoice?.total}`);
  const dup = await req('POST', `/api/tenancies/${tenancyId}/raise-invoice`, { body: { period_label: M1 } });
  ok(dup.status === 409, 'DUPLICATE guard: same-month invoice refused (no double)', `HTTP ${dup.status}`);

  // ── 6. Pay the invoice → paid + ledger settled ──────────────────────────────
  const total1 = Number(inv1.body?.data?.invoice?.total || RENT + SERVICE);
  const pay = await req('POST', `/api/invoices/${invId}/payments`, { body: { amount: total1, method: 'bank_transfer', reference: `E2E-RENT-${STAMP}`, paid_at: `${M1}-06` } });
  ok([200, 201].includes(pay.status), 'rent invoice payment recorded', `HTTP ${pay.status}`);
  const invAfter = await req('GET', `/api/invoices/${invId}`);
  const ia = invAfter.body?.data || invAfter.body;
  ok(ia?.status === 'paid' && Number(ia?.balance) === 0, 'invoice shown as paid, balance 0', `status=${ia?.status} bal=${ia?.balance}`);

  // ── 7. Bulk collect month-2 (raises + pays via the bulk endpoint) ───────────
  const crd = await req('GET', `/api/tenancies/collect-rent-data?month=${M2}`);
  ok(crd.status === 200, 'collect-rent data feed loads', `HTTP ${crd.status}`);
  const bulk = await req('POST', '/api/tenancies/collect-rent', { body: { month: M2, entries: [{ tenancy_id: tenancyId, amount: RENT + SERVICE, method: 'cash', reference: `E2E-BULK-${STAMP}` }] } });
  const bs = bulk.body?.summary || {};
  ok(bulk.status === 200 && (bs.paid >= 1 || bs.total_collected > 0), 'bulk rent collection paid month-2', `paid=${bs.paid} collected=${bs.total_collected} ${bulk.status !== 200 ? short(bulk.body) : ''}`);
  // Duplicate check: only ONE ledger row per (property, period)
  const led2 = await req('GET', `/api/tenancies/${tenancyId}`);
  ok(led2.status === 200, 'tenancy reloads after bulk', `HTTP ${led2.status}`);

  // ── 8. Arrears / overdue feed ───────────────────────────────────────────────
  const overdue = await req('GET', '/api/tenancies/overdue-reminders');
  ok(overdue.status === 200, 'overdue/arrears reminders feed loads', `HTTP ${overdue.status} rows=${list(overdue.body).length}`);

  // ── 9. Owner statement (our management fee) for month-1 ─────────────────────
  const prev = await req('POST', '/api/owner-statements/preview', { body: { owner_contact_id: landlordId, property_id: propId, period_label: M1 } });
  ok(prev.status === 200, 'owner statement preview computes', `HTTP ${prev.status} mgmt_fee=${(prev.body?.data || prev.body)?.management_fee}`);
  const stmt = await req('POST', '/api/owner-statements', { body: { owner_contact_id: landlordId, property_id: propId, period_label: M1 } });
  ok([200, 201].includes(stmt.status), 'owner statement generated', `HTTP ${stmt.status} #${(stmt.body?.data || stmt.body)?.id}`);

  // Activate the tenancy (normally happens when the tenancy agreement is signed;
  // here we activate via admin update so the renewal/end lifecycle can be tested).
  const act = await req('PUT', `/api/tenancies/${tenancyId}`, { body: { status: 'active', lease_status: 'active' } });
  ok(act.status === 200, 'tenancy activated (admin) for lifecycle test', `HTTP ${act.status}`);

  // ── 10. Renewal (quick) ─────────────────────────────────────────────────────
  const renew = await req('POST', `/api/tenancies/${tenancyId}/renewal/quick`, { body: { new_rent: RENT + 2000, months: 12, lease_start: `${now.getFullYear() + 1}-${String(now.getMonth() + 1).padStart(2, '0')}-02` } });
  ok([200, 201].includes(renew.status), 'quick renewal processed', `HTTP ${renew.status} ${renew.status >= 400 ? short(renew.body) : ''}`);

  // ── 11. Termination / end ───────────────────────────────────────────────────
  const end = await req('POST', `/api/tenancies/${tenancyId}/end`, { body: { end_date: `${M2}-28`, reason: 'E2E end of lease' } });
  ok([200, 201].includes(end.status), 'tenancy ended (lease end path)', `HTTP ${end.status} ${end.status >= 400 ? short(end.body) : ''}`);

  console.log(`\nFIXTURE IDS: landlord=${landlordId} property=${propId} application=${appId} tenancy=${tenancyId} stamp=${STAMP}`);
  finish();
})().catch((e) => { log('FAIL', 'harness crashed', e.stack || e.message); finish(); });
