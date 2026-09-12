/**
 * e2eFullPmCookie.js — the FULL property-management journey, driven through the
 * COOKIE session (la_admin_token) exactly as the admin UI authenticates — so
 * internal-loopback paths (bulk collect, bulk payouts) are exercised the real
 * way. Covers: landlord + RPRM signed, tenant application → tenancy + RPTM
 * signed, rent invoice → pay → bulk collect (cookie) → owner statement (with the
 * management fee), landlord & tenant PORTAL dashboards (provisioned accounts),
 * renewal + end. Nothing stubbed.
 */
const http = require('http');
const PORT = 50001; const EMAIL = 'admin@seventhskyproperty.com'; const PASSWORD = 'Admin#2026';
const STAMP = Date.now().toString().slice(-6);
const R = { pass: 0, fail: 0 };
const log = (s, m, d) => { R[s === 'PASS' ? 'pass' : 'fail'] += 1; console.log(`${s === 'PASS' ? '\x1b[32mPASS\x1b[0m' : '\x1b[31mFAIL\x1b[0m'}\t${m}${d !== undefined ? '  \x1b[2m' + d + '\x1b[0m' : ''}`); };
const ok = (c, m, d) => { log(c ? 'PASS' : 'FAIL', m, d); return c; };
const short = (o) => JSON.stringify(o).slice(0, 200);

// http with response headers so we can capture Set-Cookie.
function raw(method, path, { body, cookie, bearer, noAuth } = {}) {
  return new Promise((resolve) => {
    const data = body ? JSON.stringify(body) : null;
    const headers = { 'X-Branch-Id': '1' };
    if (cookie) headers.Cookie = cookie;
    if (bearer && !noAuth) headers.Authorization = 'Bearer ' + bearer;
    if (data) { headers['Content-Type'] = 'application/json'; headers['Content-Length'] = Buffer.byteLength(data); }
    const r = http.request({ host: '127.0.0.1', port: PORT, method, path, headers }, (x) => {
      let d = ''; x.on('data', (c) => { d += c; });
      x.on('end', () => { let j; try { j = JSON.parse(d); } catch { j = { _raw: d }; } resolve({ status: x.statusCode, body: j, setCookie: x.headers['set-cookie'] }); });
    });
    r.on('error', (e) => resolve({ status: 0, body: { error: e.message } }));
    if (data) r.write(data); r.end();
  });
}
// Log in and return the la_admin_token cookie string (NO bearer used afterwards).
async function loginCookie(email, password) {
  const r = await raw('POST', '/api/auth/login', { body: { email, password }, noAuth: true });
  const sc = r.setCookie || [];
  const c = sc.map((s) => s.split(';')[0]).find((s) => s.startsWith('la_admin_token='));
  return { cookie: c || null, token: r.body?.token || null, status: r.status };
}

let ADMIN = ''; // admin cookie
const A = (method, path, body) => raw(method, path, { cookie: ADMIN, body }); // admin call via COOKIE only
const list = (b) => (Array.isArray(b) ? b : (b?.data || b?.rows || []));
const finish = () => { console.log(`\n${'='.repeat(60)}\n${R.fail ? '\x1b[31m' : '\x1b[32m'}${R.pass} PASS / ${R.fail} FAIL\x1b[0m\n`); process.exit(R.fail ? 1 : 0); };
const RENT = 35000, SERVICE = 2500, DEPOSIT = 70000;
const now = new Date();
const M1 = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
const M2 = now.getMonth() === 11 ? `${now.getFullYear() + 1}-01` : `${now.getFullYear()}-${String(now.getMonth() + 2).padStart(2, '0')}`;

async function signEnvelope(envId) {
  const links = await A('GET', `/api/signing/envelopes/${envId}/links`);
  const l = (links.body?.data?.links || []).sort((a, b) => (a.order || 0) - (b.order || 0));
  let signed = 0;
  for (const s of l) {
    const token = (s.link || '').split('/').pop();
    const view = await raw('GET', `/api/sign/${token}`, { noAuth: true });
    const fields = (view.body?.data?.fields || view.body?.fields || []).map((f) => ({ id: f.id, value: f.field_type === 'signature' ? `${s.name} /sig/` : new Date().toISOString().slice(0, 10) }));
    const r = await raw('POST', `/api/sign/${token}/sign`, { noAuth: true, body: { fields } });
    if ([200, 201].includes(r.status)) signed++;
  }
  return { signed, total: l.length };
}

(async () => {
  console.log(`\n===== FULL PM JOURNEY via COOKIE SESSION (run ${STAMP}) =====\n`);
  const lg = await loginCookie(EMAIL, PASSWORD);
  ADMIN = lg.cookie;
  if (!ok(!!ADMIN, 'admin login sets la_admin_token cookie (no bearer used hereafter)', `status=${lg.status}`)) return finish();
  const who = await A('GET', '/api/auth/me');
  ok(who.status === 200, 'cookie session authenticates /auth/me', `HTTP ${who.status}`);

  // ── Landlord + property + RPRM signed ───────────────────────────────────────
  const ll = await A('POST', '/api/contacts', { full_name: `E2E-CK Landlord ${STAMP}`, primary_phone: `0133${STAMP}`, email: `ckll${STAMP}@example.com`, contact_type: 'individual', national_id: `199${STAMP}1` });
  const llId = ll.body?.data?.id;
  const llClient = await A('POST', '/api/clients', { contact_id: llId, is_landlord: true });
  const llClientId = llClient.body?.data?.id;
  const prop = await A('POST', '/api/properties', { title: `E2E-CK Rental ${STAMP}`, category: 'residential', property_type: 'apartment', listing_type: 'rent', status: 'available', is_published: true, owner_contact_id: llId, approved_monthly_rent: RENT, rent_due_day: 5 });
  const propId = prop.body?.data?.id;
  if (!ok(!!llId && !!llClientId && !!propId, 'landlord contact + client + rental property', `ll${llId}/cl${llClientId}/p${propId}`)) return finish();

  const rprm = await A('POST', '/api/rprm/agreements', {
    property_id: propId, client_contact_id: llId,
    client: { full_name: ll.body.data.full_name, email: ll.body.data.email, property_address: 'Dhaka' },
    org: { represented_by: 'SS Rep', position: 'PM Director', email: 'rep@ss.com' },
    witnesses: [{ name: 'Witness', email: `w${STAMP}@example.com` }],
    services: ['Rental Consultation', 'Tenant Sourcing'],
    pricing_input: { monthly_rent: RENT, selected: [{ code: 'RPRM-001' }, { code: 'RPRM-006' }, { code: 'RPRM-018' }] },
    schedule_b: { expected_rent: RENT },
  });
  const rprmEnv = rprm.body?.id;
  if (ok(!!rprmEnv, 'landlord RPRM agreement sent', `env#${rprmEnv}`)) {
    const sr = await signEnvelope(rprmEnv);
    ok(sr.signed === sr.total && sr.total >= 3, 'RPRM signed by landlord + Seventh Sky + witness', `${sr.signed}/${sr.total}`);
    const env = await A('GET', `/api/signing/envelopes/${rprmEnv}`);
    ok((env.body?.data?.status || env.body?.status) === 'completed', 'RPRM completed', `status=${env.body?.data?.status || env.body?.status}`);
    const inc = await A('GET', `/api/invoices/agency-income?property_id=${propId}`);
    ok((inc.body?.recurring || []).some((f) => f.property_id === propId && f.fee_category === 'management'), 'management fee schedule established from RPRM');
  }

  // ── Tenant application → tenancy ─────────────────────────────────────────────
  const app = await raw('POST', '/api/public-website/tenant-applications', { noAuth: true, body: { property_id: propId, applicant_name: `E2E-CK Tenant ${STAMP}`, mobile: `0122${STAMP}`, email: `cktn${STAMP}@example.com`, proposed_monthly_rent: RENT, proposed_security_deposit: DEPOSIT, nid_number: `199${STAMP}2` } });
  ok([200, 201].includes(app.status), 'website tenant application submitted', `HTTP ${app.status}`);
  const apps = list((await A('GET', `/api/tenant-applications?property_id=${propId}`)).body);
  const appId = apps[0]?.id;
  if (!ok(!!appId, 'application in admin', `#${appId}`)) return finish();
  const verifs = ((await A('GET', `/api/tenant-applications/${appId}`)).body?.data || {}).verifications || [];
  for (const v of verifs) await A('PATCH', `/api/tenant-applications/${appId}/verifications/${v.id}`, { status: 'passed' });
  await A('PUT', `/api/tenant-applications/${appId}`, { status: 'approved', recommendation: 'recommend' });
  const conv = await A('POST', `/api/tenant-applications/${appId}/convert-to-tenancy`, { lease_start: `${M1}-01`, lease_end: `${now.getFullYear() + 1}-${String(now.getMonth() + 1).padStart(2, '0')}-01`, monthly_rent: RENT, service_charge: SERVICE, security_deposit: DEPOSIT, rent_due_day: 5, minimum_lease_period_months: 12 });
  const tenancyId = conv.body?.data?.tenancy?.id || conv.body?.tenancy?.id || conv.body?.data?.id;
  const tenantContactId = conv.body?.data?.tenancy?.tenant_contact_id || (await A('GET', `/api/tenancies/${tenancyId}`)).body?.data?.tenant_contact_id;
  if (!ok(!!tenancyId, 'application → tenancy (deposit + folios)', `tn#${tenancyId}`)) return finish();

  // ── Tenant RPTM agreement signed ────────────────────────────────────────────
  const rptm = await A('POST', '/api/rptm/agreements', {
    property_id: propId, client_contact_id: tenantContactId,
    client: { full_name: `E2E-CK Tenant ${STAMP}`, email: `cktn${STAMP}@example.com`, property_address: 'Dhaka' },
    org: { represented_by: 'SS Rep', position: 'PM Director', email: 'rep@ss.com' },
    witnesses: [{ name: 'Witness', email: `w2${STAMP}@example.com` }],
    services: [], pricing_input: { monthly_rent: RENT, selected: [] }, schedule_b: { monthly_rent: RENT },
  });
  const rptmEnv = rptm.body?.id;
  if (ok(!!rptmEnv, 'tenant RPTM agreement sent', `env#${rptmEnv} ${!rptmEnv ? short(rptm.body) : ''}`)) {
    const sr = await signEnvelope(rptmEnv);
    ok(sr.signed === sr.total, 'RPTM signed by all parties', `${sr.signed}/${sr.total}`);
  }

  // ── Rent invoice → pay → bulk collect (COOKIE path) → owner statement ───────
  const inv1 = await A('POST', `/api/tenancies/${tenancyId}/raise-invoice`, { period_label: M1 });
  const invId = inv1.body?.data?.invoice?.id;
  ok(inv1.status === 201 && !!invId, 'month-1 rent invoice raised', inv1.body?.data?.invoice?.invoice_code);
  const pay = await A('POST', `/api/invoices/${invId}/payments`, { amount: RENT + SERVICE, method: 'bank_transfer', reference: `CK-${STAMP}` });
  ok([200, 201].includes(pay.status), 'rent invoice paid', `HTTP ${pay.status}`);
  const bulk = await A('POST', '/api/tenancies/collect-rent', { month: M2, entries: [{ tenancy_id: tenancyId, amount: RENT + SERVICE, method: 'cash', reference: `CK-BULK-${STAMP}` }] });
  const bs = bulk.body?.summary || {};
  ok(bulk.status === 200 && bs.paid >= 1 && bs.failed === 0, 'BULK rent collection via COOKIE session (the fixed path)', `paid=${bs.paid} failed=${bs.failed} collected=${bs.total_collected}`);
  const stmt = await A('POST', '/api/owner-statements', { owner_contact_id: llId, property_id: propId, period_label: M1, regenerate: true });
  const mgmtFee = Number((stmt.body?.data || stmt.body)?.management_fee || 0);
  ok([200, 201].includes(stmt.status), 'owner statement generated', `HTTP ${stmt.status}`);
  ok(mgmtFee > 0, 'management fee (our income) appears on the owner statement', `mgmt_fee=${mgmtFee} (5% of ${RENT + SERVICE})`);

  // ── Provision + check LANDLORD portal dashboard ─────────────────────────────
  const llPortal = await A('POST', `/api/clients/${llClientId}/portal-access`, { email: `ckllportal${STAMP}@example.com`, password: 'Portal#2026', role: 'owner' });
  ok(llPortal.status === 201, 'landlord portal account provisioned', `HTTP ${llPortal.status}`);
  const llLogin = await loginCookie(`ckllportal${STAMP}@example.com`, 'Portal#2026');
  ok(!!llLogin.cookie, 'landlord portal login', `status=${llLogin.status}`);
  const llPort = (m, p) => raw(m, p, { cookie: llLogin.cookie });
  ok((await llPort('GET', '/api/landlord/portfolio')).status === 200, 'landlord dashboard: portfolio loads');
  ok((await llPort('GET', '/api/landlord/statements')).status === 200, 'landlord dashboard: statements load');
  ok((await llPort('GET', '/api/landlord/approvals')).status === 200, 'landlord dashboard: approvals load');

  // ── Provision + check TENANT portal dashboard ───────────────────────────────
  const tenClient = await A('POST', '/api/clients', { contact_id: tenantContactId, is_tenant: true });
  const tenClientId = tenClient.body?.data?.id || (list((await A('GET', `/api/clients?role=tenant&limit=100`)).body).find((c) => c.contact_id === tenantContactId)?.id);
  const tenPortal = await A('POST', `/api/clients/${tenClientId}/portal-access`, { email: `cktnportal${STAMP}@example.com`, password: 'Portal#2026', role: 'tenant' });
  ok([201, 409].includes(tenPortal.status), 'tenant portal account provisioned', `HTTP ${tenPortal.status} ${tenPortal.status >= 400 && tenPortal.status !== 409 ? short(tenPortal.body) : ''}`);
  const tenLogin = await loginCookie(`cktnportal${STAMP}@example.com`, 'Portal#2026');
  if (ok(!!tenLogin.cookie, 'tenant portal login', `status=${tenLogin.status}`)) {
    const tp = (m, p) => raw(m, p, { cookie: tenLogin.cookie });
    ok((await tp('GET', '/api/tenant/tenancy')).status === 200, 'tenant dashboard: my tenancy loads');
    ok((await tp('GET', '/api/tenant/invoices')).status === 200, 'tenant dashboard: my invoices load');
  }

  // ── Renewal + end (activate first, admin) ───────────────────────────────────
  await A('PUT', `/api/tenancies/${tenancyId}`, { status: 'active', lease_status: 'active' });
  ok([200, 201].includes((await A('POST', `/api/tenancies/${tenancyId}/renewal/quick`, { new_rent: RENT + 3000, months: 12, lease_start: `${now.getFullYear() + 1}-${String(now.getMonth() + 1).padStart(2, '0')}-02` })).status), 'quick renewal processed');
  ok([200, 201].includes((await A('POST', `/api/tenancies/${tenancyId}/end`, { end_date: `${M2}-28`, reason: 'E2E end' })).status), 'tenancy ended');

  console.log(`\nFIXTURE IDS: landlord=${llId} tenant=${tenantContactId} property=${propId} tenancy=${tenancyId} rprmEnv=${rprmEnv} rptmEnv=${rptmEnv} stamp=${STAMP}`);
  finish();
})().catch((e) => { log('FAIL', 'harness crashed', e.stack || e.message); finish(); });
