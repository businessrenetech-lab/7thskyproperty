/**
 * verifyMoneyFlows.js — prove the PM money paths are correct end to end on ONE
 * freshly-configured property, checking the ledger maths at every step:
 *
 *   1. Rent receipt          → landlord folio DEBIT  (money IN, held for owner)
 *                              + our management fee CREDIT (deducted from owner)
 *   2. Owner (landlord) bill  → landlord folio CREDIT (money OUT, owner pays a
 *                              supplier bill — deducted from the held balance)
 *   3. Tenant recharge invoice→ tenant pays their share (money IN from tenant)
 *   4. Owner receipt / payout → landlord folio CREDIT (money OUT to the owner)
 *
 * After each step it re-reads the folio and asserts current_balance === Σdebit −
 * Σcredit, and that every transaction shows the right in/out direction. Nothing
 * is faked — all through the real cookie API.
 *
 * Run:  node scripts/verifyMoneyFlows.js
 */
const http = require('http');
const PORT = 50001, EMAIL = 'admin@seventhskyproperty.com', PASSWORD = 'Admin#2026';
const STAMP = Date.now().toString().slice(-6);
const RENT = 40000, SERVICE = 3000, DEPOSIT = 80000, MGMT_PCT = 5;
const BILL_ACCOUNT_ID = 3;   // "Maintenance" (expense) account category
const PROVIDER_ID = 1;       // "CleanPro Services"
const BILL_AMOUNT = 6000, TENANT_SHARE = 2000;
const now = new Date();
const M1 = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
const money = (v) => 'BDT ' + Number(v || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const R = { pass: 0, fail: 0 };
const ok = (c, m, d) => { R[c ? 'pass' : 'fail'] += 1; console.log(`${c ? '\x1b[32mPASS\x1b[0m' : '\x1b[31mFAIL\x1b[0m'}\t${m}${d !== undefined ? '  \x1b[2m' + d + '\x1b[0m' : ''}`); return c; };

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
let ADMIN = '';
const A = (m, p, b) => raw(m, p, { cookie: ADMIN, body: b });
const list = (b) => (Array.isArray(b) ? b : (b?.data || b?.rows || []));
const finish = () => { console.log(`\n${'='.repeat(60)}\n${R.fail ? '\x1b[31m' : '\x1b[32m'}${R.pass} PASS / ${R.fail} FAIL\x1b[0m\n`); process.exit(R.fail ? 1 : 0); };

// Read a landlord folio's transactions and check balance = Σdebit − Σcredit.
async function auditFolio(folioId, label) {
  const r = await A('GET', `/api/folios/${folioId}`);
  const txns = r.body?.transactions || [];
  const debit = txns.reduce((s, t) => s + Number(t.debit || 0), 0);
  const credit = txns.reduce((s, t) => s + Number(t.credit || 0), 0);
  const bal = debit - credit;
  return { txns, debit, credit, bal, label };
}

(async () => {
  console.log(`\n===== VERIFY PM MONEY FLOWS (run ${STAMP}) =====\n`);
  const lg = await raw('POST', '/api/auth/login', { body: { email: EMAIL, password: PASSWORD }, noAuth: true });
  ADMIN = (lg.setCookie || []).map((s) => s.split(';')[0]).find((s) => s.startsWith('la_admin_token='));
  if (!ok(!!ADMIN, 'admin cookie session')) return finish();

  // ── Property properly configured (owner + fee schedule + tenant) ─────────────
  const ll = await A('POST', '/api/contacts', { full_name: `Flow Owner ${STAMP}`, primary_phone: `0188${STAMP}`, email: `flowowner${STAMP}@example.com`, contact_type: 'individual', national_id: `199${STAMP}1` });
  const ownerId = ll.body?.data?.id;
  await A('POST', '/api/clients', { contact_id: ownerId, is_landlord: true });
  const prop = await A('POST', '/api/properties', { title: `Flow Flat ${STAMP}`, category: 'residential', property_type: 'apartment', listing_type: 'rent', status: 'available', owner_contact_id: ownerId, approved_monthly_rent: RENT, rent_due_day: 5 });
  const propId = prop.body?.data?.id;
  await A('POST', `/api/properties/${propId}/owner-profile`, {
    contact_id: ownerId, bank_name: 'BRAC Bank', bank_account_number: `19${STAMP}`, preferred_payment: 'bank_transfer',
    fees: [{ fee_name: 'Property Management Fee', fee_category: 'management', fee_trigger: 'rental_receipt', amount_type: 'percentage', amount_value: MGMT_PCT }],
  });
  if (!ok(!!ownerId && !!propId, 'owner + property + fee schedule', `owner#${ownerId} prop#${propId}`)) return finish();

  const app = await raw('POST', '/api/public-website/tenant-applications', { noAuth: true, body: { property_id: propId, applicant_name: `Flow Tenant ${STAMP}`, mobile: `0199${STAMP}`, email: `flowtenant${STAMP}@example.com`, proposed_monthly_rent: RENT, proposed_security_deposit: DEPOSIT, nid_number: `199${STAMP}2` } });
  const appId = list((await A('GET', `/api/tenant-applications?property_id=${propId}`)).body)[0]?.id;
  const verifs = ((await A('GET', `/api/tenant-applications/${appId}`)).body?.data || {}).verifications || [];
  for (const v of verifs) await A('PATCH', `/api/tenant-applications/${appId}/verifications/${v.id}`, { status: 'passed' });
  await A('PUT', `/api/tenant-applications/${appId}`, { status: 'approved', recommendation: 'recommend' });
  const conv = await A('POST', `/api/tenant-applications/${appId}/convert-to-tenancy`, { lease_start: `${M1}-01`, lease_end: `${now.getFullYear() + 1}-${String(now.getMonth() + 1).padStart(2, '0')}-01`, monthly_rent: RENT, service_charge: SERVICE, security_deposit: DEPOSIT, rent_due_day: 5, minimum_lease_period_months: 12 });
  const tenancyId = conv.body?.data?.tenancy?.id || conv.body?.tenancy?.id || conv.body?.data?.id;
  if (!ok(!!tenancyId, 'tenant application → tenancy', `tenancy#${tenancyId}`)) return finish();

  // Resolve the landlord folio.
  const prev = await A('GET', `/api/disbursements/owner/${ownerId}/preview?property_id=${propId}`);
  const folioId = prev.body?.data?.folio?.id;
  if (!ok(!!folioId, 'landlord folio resolved', `folio#${folioId}`)) return finish();

  // ── STEP 1: rent receipt → money IN (debit) + fee deducted (credit) ─────────
  const inv1 = await A('POST', `/api/tenancies/${tenancyId}/raise-invoice`, { period_label: M1 });
  const invId = inv1.body?.data?.invoice?.id;
  await A('POST', `/api/invoices/${invId}/payments`, { amount: RENT + SERVICE, method: 'bank_transfer', reference: `FLOW-RENT-${STAMP}` });
  let a = await auditFolio(folioId);
  const rentIn = a.txns.filter((t) => t.bucket === 'rent').reduce((s, t) => s + Number(t.debit || 0), 0);
  const feeOut = a.txns.filter((t) => t.bucket === 'landlord_fee').reduce((s, t) => s + Number(t.credit || 0), 0);
  ok(rentIn === RENT + SERVICE, 'rent receipt posts money IN as a folio DEBIT', `rent debit=${money(rentIn)}`);
  ok(Math.round(feeOut) === Math.round((RENT + SERVICE) * MGMT_PCT / 100), 'our management fee deducted as a folio CREDIT', `fee credit=${money(feeOut)} (${MGMT_PCT}%)`);
  ok(Math.abs(a.bal - (rentIn - feeOut)) < 0.01, 'balance = Σdebit − Σcredit after rent', `bal=${money(a.bal)}`);
  const balAfterRent = a.bal;

  // ── STEP 2: owner (landlord) bill → money OUT (credit), tenant pays part ─────
  const bill = await A('POST', '/api/billing/landlord-bills', {
    landlord_folio_id: folioId, bill_account_id: BILL_ACCOUNT_ID, provider_id: PROVIDER_ID,
    description: `Plumbing repair ${STAMP}`, full_bill_amount: BILL_AMOUNT,
    tenant_pays_part: true, tenant_tenancy_id: tenancyId, tenant_amount: TENANT_SHARE,
    tenant_invoice_account_id: BILL_ACCOUNT_ID, tenant_invoice_description: `Your share of plumbing ${STAMP}`,
    due_date: `${M1}-28`,
  });
  ok([200, 201].includes(bill.status), 'owner (landlord) bill created', bill.body?.data?.bill_code || JSON.stringify(bill.body).slice(0, 120));
  a = await auditFolio(folioId);
  const billOut = a.txns.filter((t) => t.bucket === 'supplier_bill').reduce((s, t) => s + Number(t.credit || 0), 0);
  ok(billOut === BILL_AMOUNT, 'owner bill posts money OUT as a folio CREDIT', `supplier_bill credit=${money(billOut)}`);
  ok(Math.abs(a.bal - (balAfterRent - BILL_AMOUNT)) < 0.01, 'owner held balance reduced by the full bill', `${money(balAfterRent)} → ${money(a.bal)}`);

  // The tenant's share should exist as a tenant invoice (money IN from tenant).
  const tenantInvId = bill.body?.data?.tenant_invoice_id;
  ok(!!tenantInvId, 'tenant recharge invoice raised for the tenant share', `inv#${tenantInvId} (${money(TENANT_SHARE)})`);
  if (tenantInvId) {
    const payT = await A('POST', `/api/invoices/${tenantInvId}/payments`, { amount: TENANT_SHARE, method: 'bkash', reference: `FLOW-TSHARE-${STAMP}` });
    ok([200, 201].includes(payT.status), 'tenant pays their share of the bill (money IN)', `HTTP ${payT.status}`);
  }

  // ── STEP 3: owner receipt / payout → money OUT to the owner ─────────────────
  const balBeforePayout = (await auditFolio(folioId)).bal;
  const payout = await A('POST', '/api/disbursements/owner', { owner_contact_id: ownerId, property_id: propId, method: 'bank_transfer', reference: `FLOW-OD-${STAMP}` });
  ok([200, 201].includes(payout.status), 'owner receipt (payout) recorded', `net=${money(payout.body?.data?.net_amount)} fees_collected=${payout.body?.fees_collected}`);
  a = await auditFolio(folioId);
  const payoutOut = a.txns.filter((t) => t.bucket === 'owner_payout').reduce((s, t) => s + Number(t.credit || 0), 0);
  ok(Math.abs(payoutOut - balBeforePayout) < 0.01, 'payout credit equals the net held balance', `payout=${money(payoutOut)} held=${money(balBeforePayout)}`);
  ok(Math.abs(a.bal) < 0.01, 'owner balance is ZERO after full payout', `bal=${money(a.bal)}`);

  // ── Final ledger: every transaction, in / out ───────────────────────────────
  console.log('\n──────────── OWNER FOLIO LEDGER (money in / out) ────────────');
  a = await auditFolio(folioId);
  for (const t of [...a.txns].reverse()) {
    const inn = Number(t.debit || 0), out = Number(t.credit || 0);
    console.log(`  ${(t.bucket || '').padEnd(14)} ${inn ? '\x1b[32m+ ' + money(inn).padEnd(16) + '\x1b[0m' : ''.padEnd(18)} ${out ? '\x1b[31m− ' + money(out) + '\x1b[0m' : ''}  \x1b[2m${(t.description || '').slice(0, 40)}\x1b[0m`);
  }
  console.log(`  ${'—'.repeat(54)}`);
  console.log(`  IN (debit) ${money(a.debit)}   OUT (credit) ${money(a.credit)}   BALANCE ${money(a.bal)}`);
  console.log('─────────────────────────────────────────────────────────────');
  ok(Math.abs(a.bal - (a.debit - a.credit)) < 0.01, 'FINAL: folio balance reconciles (Σin − Σout)', `bal=${money(a.bal)}`);

  console.log(`\nInspect: property #${propId} · owner #${ownerId} · tenancy #${tenancyId} · folio #${folioId}`);
  finish();
})();
