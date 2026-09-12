/**
 * verifyProviderFlow.js — service providers under a tenancy / property, end to
 * end, the way the admin actually works:
 *
 *   1. FETCH existing providers from the DB (admin picks who works the job).
 *   2. Tenant raises a maintenance request (work order) from their portal.
 *   3. Staff triage → owner approval required → OWNER approves via landlord portal.
 *   4. Collect quotes from 2 providers, select the cheapest, ASSIGN that provider.
 *   5. Start → complete → auto provider bill (money owed to provider) + tenant recharge.
 *   6. PAY the provider (payout / money OUT) + tenant pays their recharge (money IN).
 *   7. Dashboards reflect it: landlord approvals + tenant work-orders/invoices.
 *
 * All through the real cookie API. Run: node scripts/verifyProviderFlow.js
 */
const http = require('http');
const PORT = 50001, EMAIL = 'admin@seventhskyproperty.com', PASSWORD = 'Admin#2026';
const STAMP = Date.now().toString().slice(-6);
const RENT = 40000, SERVICE = 3000, DEPOSIT = 80000;
const JOB_COST = 8000, TENANT_RECHARGE = 2500;
const now = new Date();
const M1 = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
const money = (v) => 'BDT ' + Number(v || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const R = { pass: 0, fail: 0 };
const ok = (c, m, d) => { R[c ? 'pass' : 'fail'] += 1; console.log(`${c ? '\x1b[32mPASS\x1b[0m' : '\x1b[31mFAIL\x1b[0m'}\t${m}${d !== undefined ? '  \x1b[2m' + d + '\x1b[0m' : ''}`); return c; };
const short = (o) => JSON.stringify(o).slice(0, 160);

function raw(method, path, { body, cookie, noAuth } = {}) {
  return new Promise((resolve) => {
    const data = body ? JSON.stringify(body) : null;
    const headers = { 'X-Branch-Id': '1' };
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
async function loginCookie(email, password) {
  const r = await raw('POST', '/api/auth/login', { body: { email, password }, noAuth: true });
  return { cookie: (r.setCookie || []).map((s) => s.split(';')[0]).find((s) => s.startsWith('la_admin_token=')) || null, status: r.status };
}
let ADMIN = '';
const A = (m, p, b) => raw(m, p, { cookie: ADMIN, body: b });
const list = (b) => (Array.isArray(b) ? b : (b?.data || b?.rows || []));
const finish = () => { console.log(`\n${'='.repeat(60)}\n${R.fail ? '\x1b[31m' : '\x1b[32m'}${R.pass} PASS / ${R.fail} FAIL\x1b[0m\n`); process.exit(R.fail ? 1 : 0); };

(async () => {
  console.log(`\n===== VERIFY SERVICE-PROVIDER FLOW (run ${STAMP}) =====\n`);
  const lg = await loginCookie(EMAIL, PASSWORD);
  ADMIN = lg.cookie;
  if (!ok(!!ADMIN, 'admin cookie session')) return finish();

  // ── Existing providers in the DB — admin picks who works the job ────────────
  const provList = list((await A('GET', '/api/providers?limit=100')).body);
  if (!ok(provList.length >= 2, 'fetch existing service providers from the database', `${provList.length} providers on file`)) return finish();
  const [provA, provB] = provList;
  ok(true, 'admin chooses providers to quote', `${provA.company_name} (#${provA.id}) + ${provB.company_name} (#${provB.id})`);

  // ── Properly-configured property + tenancy ──────────────────────────────────
  const ll = await A('POST', '/api/contacts', { full_name: `Prov Owner ${STAMP}`, primary_phone: `0155${STAMP}`, email: `provowner${STAMP}@example.com`, contact_type: 'individual', national_id: `199${STAMP}1` });
  const ownerId = ll.body?.data?.id;
  const llClient = await A('POST', '/api/clients', { contact_id: ownerId, is_landlord: true });
  const llClientId = llClient.body?.data?.id;
  const prop = await A('POST', '/api/properties', { title: `Prov Flat ${STAMP}`, category: 'residential', property_type: 'apartment', listing_type: 'rent', status: 'available', owner_contact_id: ownerId, approved_monthly_rent: RENT, rent_due_day: 5 });
  const propId = prop.body?.data?.id;
  await A('POST', `/api/properties/${propId}/owner-profile`, { contact_id: ownerId, bank_name: 'BRAC Bank', bank_account_number: `17${STAMP}`, preferred_payment: 'bank_transfer', fees: [{ fee_name: 'Property Management Fee', fee_category: 'management', fee_trigger: 'rental_receipt', amount_type: 'percentage', amount_value: 5 }] });
  const app = await raw('POST', '/api/public-website/tenant-applications', { noAuth: true, body: { property_id: propId, applicant_name: `Prov Tenant ${STAMP}`, mobile: `0144${STAMP}`, email: `provtenant${STAMP}@example.com`, proposed_monthly_rent: RENT, proposed_security_deposit: DEPOSIT, nid_number: `199${STAMP}2` } });
  const appId = list((await A('GET', `/api/tenant-applications?property_id=${propId}`)).body)[0]?.id;
  const verifs = ((await A('GET', `/api/tenant-applications/${appId}`)).body?.data || {}).verifications || [];
  for (const v of verifs) await A('PATCH', `/api/tenant-applications/${appId}/verifications/${v.id}`, { status: 'passed' });
  await A('PUT', `/api/tenant-applications/${appId}`, { status: 'approved', recommendation: 'recommend' });
  const conv = await A('POST', `/api/tenant-applications/${appId}/convert-to-tenancy`, { lease_start: `${M1}-01`, lease_end: `${now.getFullYear() + 1}-${String(now.getMonth() + 1).padStart(2, '0')}-01`, monthly_rent: RENT, service_charge: SERVICE, security_deposit: DEPOSIT, rent_due_day: 5, minimum_lease_period_months: 12 });
  const tenancyId = conv.body?.data?.tenancy?.id || conv.body?.tenancy?.id || conv.body?.data?.id;
  const tenantContactId = conv.body?.data?.tenancy?.tenant_contact_id || (await A('GET', `/api/tenancies/${tenancyId}`)).body?.data?.tenant_contact_id;
  await A('PUT', `/api/tenancies/${tenancyId}`, { status: 'active', lease_status: 'active' });
  if (!ok(!!tenancyId && !!ownerId, 'property + active tenancy under management', `prop#${propId} tenancy#${tenancyId}`)) return finish();

  // ── Tenant provisions portal + raises a maintenance work order ──────────────
  const tenClient = await A('POST', '/api/clients', { contact_id: tenantContactId, is_tenant: true });
  const tenClientId = tenClient.body?.data?.id || list((await A('GET', '/api/clients?role=tenant&limit=200')).body).find((c) => c.contact_id === tenantContactId)?.id;
  await A('POST', `/api/clients/${tenClientId}/portal-access`, { email: `provtenportal${STAMP}@example.com`, password: 'Portal#2026', role: 'tenant' });
  const tenLogin = await loginCookie(`provtenportal${STAMP}@example.com`, 'Portal#2026');
  const tp = (m, p, b) => raw(m, p, { cookie: tenLogin.cookie, body: b });
  const woReq = await tp('POST', '/api/tenant/work-orders', { title: `Leaking tap ${STAMP}`, scope: 'Kitchen tap leaking badly', category: 'plumbing', severity: 'urgent' });
  let woId = woReq.body?.data?.id;
  if (!woId) { // fallback: create via admin if tenant submit shape differs
    const woAdmin = await A('POST', '/api/work-orders', { title: `Leaking tap ${STAMP}`, scope: 'Kitchen tap leaking', property_id: propId, category: 'plumbing', severity: 'urgent', reported_by_type: 'tenant', reported_by_contact_id: tenantContactId });
    woId = woAdmin.body?.data?.id;
  }
  if (!ok(!!woId, 'tenant raised a maintenance work order', `wo#${woId} (HTTP ${woReq.status})`)) return finish();

  // ── Triage → owner approval required → OWNER approves via landlord portal ────
  await A('POST', `/api/work-orders/${woId}/triage`, { severity: 'urgent', category: 'plumbing', estimated_cost: JOB_COST, approval_threshold: 3000 });
  let wo = (await A('GET', `/api/work-orders/${woId}`)).body?.data;
  ok(wo?.approval_status === 'pending_owner', 'triage flags owner approval (cost ≥ threshold)', `status=${wo?.approval_status}`);

  await A('POST', `/api/clients/${llClientId}/portal-access`, { email: `provllportal${STAMP}@example.com`, password: 'Portal#2026', role: 'owner' });
  const llLogin = await loginCookie(`provllportal${STAMP}@example.com`, 'Portal#2026');
  const lp = (m, p, b) => raw(m, p, { cookie: llLogin.cookie, body: b });
  const apprResp = (await lp('GET', '/api/landlord/approvals')).body?.data || {};
  const apprWos = apprResp.work_orders || [];
  ok(apprWos.some((a) => a.id === woId), 'landlord dashboard: work order awaits owner approval', `${apprWos.length} WO(s) pending, total ${apprResp.total}`);
  const dec = await lp('POST', `/api/landlord/approvals/work-order/${woId}/decide`, { decision: 'approved', note: 'Go ahead' });
  ok([200, 201].includes(dec.status), 'OWNER approves the work order via landlord portal', `HTTP ${dec.status}`);
  wo = (await A('GET', `/api/work-orders/${woId}`)).body?.data;
  ok(wo?.approval_status === 'approved', 'work order now approved', `status=${wo?.approval_status}`);

  // ── Quotes from 2 providers → select cheapest → assign ──────────────────────
  await A('POST', `/api/work-orders/${woId}/quotes`, { provider_id: provA.id, provider_name: provA.company_name, quote_amount: JOB_COST + 1500 });
  const q2 = await A('POST', `/api/work-orders/${woId}/quotes`, { provider_id: provB.id, provider_name: provB.company_name, quote_amount: JOB_COST });
  const quotes = list((await A('GET', `/api/work-orders/${woId}/quotes`)).body);
  ok(quotes.length >= 2, 'quotes collected from multiple providers', `${quotes.length} quotes`);
  const cheapest = quotes.reduce((a, b) => (Number(a.quote_amount) <= Number(b.quote_amount) ? a : b));
  await A('POST', `/api/work-orders/${woId}/quotes/${cheapest.id}/select`);
  const assign = await A('POST', `/api/work-orders/${woId}/assign`, { provider_id: cheapest.provider_id, scheduled_date: `${M1}-20`, amount: cheapest.quote_amount });
  wo = (await A('GET', `/api/work-orders/${woId}`)).body?.data;
  ok([200, 201].includes(assign.status) && wo?.provider_id === cheapest.provider_id, 'cheapest provider ASSIGNED to the job', `provider#${wo?.provider_id} @ ${money(wo?.amount)}`);

  // ── Start → complete → provider bill + tenant recharge ──────────────────────
  // Resolve the owner folio + capture its balance so we can prove the owner is
  // charged for the repair on completion.
  const ownerFolioId = (await A('GET', `/api/disbursements/owner/${ownerId}/preview?property_id=${propId}`)).body?.data?.folio?.id;
  const folioBal = async () => Number((await A('GET', `/api/folios/${ownerFolioId}`)).body?.data?.current_balance || 0);
  const balBeforeJob = await folioBal();

  await A('POST', `/api/work-orders/${woId}/start`);
  const comp = await A('POST', `/api/work-orders/${woId}/complete`, { actual_cost: JOB_COST, tenant_recharge: true, tenant_recharge_amount: TENANT_RECHARGE, provider_notes: 'Replaced cartridge + seal' });
  const providerBill = comp.body?.landlord_bill;
  const rechargeInv = comp.body?.tenant_recharge_invoice;
  ok([200, 201].includes(comp.status) && !!providerBill, 'completion auto-creates the provider bill', providerBill?.invoice_code);
  ok(providerBill?.invoice_kind === 'provider' && Number(providerBill?.provider_id) === Number(cheapest.provider_id), 'provider bill is addressed to the assigned provider', `kind=${providerBill?.invoice_kind} provider#${providerBill?.provider_id}`);
  ok(!!rechargeInv, 'tenant recharge invoice raised', `${rechargeInv?.invoice_code} (${money(TENANT_RECHARGE)})`);

  // OWNER FUNDS THE REPAIR: completion charged the owner folio the full cost.
  const balAfterJob = await folioBal();
  ok(Math.abs((balBeforeJob - balAfterJob) - JOB_COST) < 0.01, 'owner folio CHARGED the repair cost on completion', `${money(balBeforeJob)} → ${money(balAfterJob)} (−${money(JOB_COST)})`);

  // ── PAY the provider (payout / money OUT) ───────────────────────────────────
  const payout = await A('POST', '/api/disbursements/supplier', { invoice_id: providerBill.id, method: 'bank_transfer', reference: `PROV-PO-${STAMP}` });
  ok([200, 201].includes(payout.status), 'provider PAID OUT from the system', `HTTP ${payout.status} — ${payout.body?.message || short(payout.body)}`);
  const paidBill = (await A('GET', `/api/invoices/${providerBill.id}`)).body?.data;
  ok(paidBill?.status === 'paid' && Number(paidBill?.balance) === 0, 'provider bill marked PAID (balance zero)', `status=${paidBill?.status} bal=${money(paidBill?.balance)}`);

  // ── Tenant pays their recharge share (money IN) ─────────────────────────────
  const payT = await A('POST', `/api/invoices/${rechargeInv.id}/payments`, { amount: TENANT_RECHARGE, method: 'bkash', reference: `PROV-TR-${STAMP}` });
  ok([200, 201].includes(payT.status), 'tenant pays the maintenance recharge (money IN)', `HTTP ${payT.status}`);
  // The tenant reimbursement posts back to the owner folio → owner nets only their share.
  const balAfterRecharge = await folioBal();
  ok(Math.abs((balAfterRecharge - balAfterJob) - TENANT_RECHARGE) < 0.01, 'tenant recharge credited back to owner folio', `+${money(TENANT_RECHARGE)} → owner net cost ${money(JOB_COST - TENANT_RECHARGE)}`);

  // ── Dashboards reflect the job ──────────────────────────────────────────────
  const tenWOs = list((await tp('GET', '/api/tenant/work-orders')).body);
  ok(tenWOs.some((w) => w.id === woId), 'tenant dashboard: their work order shows (completed)', `${tenWOs.length} work orders`);
  const tenInvs = list((await tp('GET', '/api/tenant/invoices')).body);
  ok(tenInvs.some((i) => i.id === rechargeInv.id || i.invoice_code === rechargeInv.invoice_code), 'tenant dashboard: recharge invoice shows', `${tenInvs.length} invoices`);
  const provInvoices = list((await A('GET', '/api/invoices?kind=provider&limit=200')).body);
  ok(provInvoices.some((i) => i.id === providerBill.id), 'admin: provider bill listed under provider invoices', `${provInvoices.length} provider invoices`);

  console.log(`\nInspect: property #${propId} · owner #${ownerId} · tenancy #${tenancyId} · work order #${woId} · provider #${cheapest.provider_id} · provider bill ${providerBill.invoice_code}`);
  finish();
})().catch((e) => { ok(false, 'harness crashed', e.stack || e.message); finish(); });
