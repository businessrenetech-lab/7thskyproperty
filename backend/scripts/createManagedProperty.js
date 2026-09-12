/**
 * createManagedProperty.js — set up ONE fully, correctly configured managed
 * property so the disbursement / owner-payout flow demonstrably works:
 *
 *   landlord contact + client
 *   → property (owner assigned)
 *   → owner profile WITH a fee schedule (5% Management on every rent receipt,
 *     100% Letting on first rent) + bank details for the payout
 *   → tenant application → approved → tenancy
 *   → two months of rent collected  (our fee auto-deducted at each receipt)
 *   → owner disbursement PREVIEW printed, proving the payout is NET of our fee.
 *
 * Everything goes through the real cookie-authenticated API — no shortcuts — so
 * the resulting property behaves exactly like one created in the admin UI.
 *
 * Run:  node scripts/createManagedProperty.js
 * The IDs it prints (property / owner) are what you open in the admin.
 */
const http = require('http');
const PORT = 50001;
const EMAIL = 'admin@seventhskyproperty.com';
const PASSWORD = 'Admin#2026';
const STAMP = Date.now().toString().slice(-6);

const RENT = 40000, SERVICE = 3000, DEPOSIT = 80000;
const MGMT_PCT = 5;                       // our management fee, % of each rent receipt
const now = new Date();
const M1 = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
const M2 = now.getMonth() === 11 ? `${now.getFullYear() + 1}-01`
  : `${now.getFullYear()}-${String(now.getMonth() + 2).padStart(2, '0')}`;
const money = (v) => 'BDT ' + Number(v || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

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
const A = (method, path, body) => raw(method, path, { cookie: ADMIN, body });
const list = (b) => (Array.isArray(b) ? b : (b?.data || b?.rows || []));
const die = (msg, extra) => { console.error(`\n\x1b[31m✗ ${msg}\x1b[0m`, extra !== undefined ? JSON.stringify(extra).slice(0, 300) : ''); process.exit(1); };
const step = (msg, d) => console.log(`\x1b[32m✓\x1b[0m ${msg}${d !== undefined ? '  \x1b[2m' + d + '\x1b[0m' : ''}`);

(async () => {
  console.log(`\n===== CREATE A PROPERLY-CONFIGURED MANAGED PROPERTY (run ${STAMP}) =====\n`);

  const lg = await raw('POST', '/api/auth/login', { body: { email: EMAIL, password: PASSWORD }, noAuth: true });
  ADMIN = (lg.setCookie || []).map((s) => s.split(';')[0]).find((s) => s.startsWith('la_admin_token='));
  if (!ADMIN) die('admin login failed', lg.body);
  step('admin cookie session');

  // 1) Landlord (owner) + client
  const ll = await A('POST', '/api/contacts', { full_name: `Demo Owner ${STAMP}`, primary_phone: `0177${STAMP}`, email: `owner${STAMP}@example.com`, contact_type: 'individual', national_id: `199${STAMP}1` });
  const ownerId = ll.body?.data?.id;
  const llClient = await A('POST', '/api/clients', { contact_id: ownerId, is_landlord: true });
  if (!ownerId) die('could not create owner contact', ll.body);
  step('owner (landlord) + client', `owner#${ownerId}`);

  // 2) Property with the owner assigned
  const prop = await A('POST', '/api/properties', {
    title: `Demo Managed Flat ${STAMP}`, category: 'residential', property_type: 'apartment',
    listing_type: 'rent', status: 'available', is_published: false,
    owner_contact_id: ownerId, approved_monthly_rent: RENT, rent_due_day: 5,
    address: 'House 12, Road 7, Gulshan-1, Dhaka',
  });
  const propId = prop.body?.data?.id;
  if (!propId) die('could not create property', prop.body);
  step('property created', `property#${propId} — "${prop.body.data.title}"`);

  // 3) Owner profile WITH a fee schedule + bank details (the missing piece that
  //    makes disbursement net out our fee). Management fee fires on every rent
  //    receipt; letting fee on the first rent only.
  const profile = await A('POST', `/api/properties/${propId}/owner-profile`, {
    contact_id: ownerId,
    bank_name: 'BRAC Bank', bank_branch: 'Gulshan', bank_account_name: `Demo Owner ${STAMP}`,
    bank_account_number: `15${STAMP}0099`, preferred_payment: 'bank_transfer',
    disbursement_frequency: 'monthly', management_commission: MGMT_PCT,
    fees: [
      { fee_name: 'Property Management Fee', fee_category: 'management', fee_trigger: 'rental_receipt', amount_type: 'percentage', amount_value: MGMT_PCT },
      { fee_name: 'Letting / Tenant Sourcing Fee', fee_category: 'letting', fee_trigger: 'first_rent', amount_type: 'percentage', amount_value: 50 },
    ],
  });
  const feeCount = (profile.body?.fees || []).length;
  if (profile.status !== 200 || feeCount < 1) die('owner profile / fee schedule not saved', profile.body);
  step('owner profile + fee schedule saved', `${feeCount} fees — Management ${MGMT_PCT}% (rental_receipt) + Letting 50% (first_rent), bank on file`);

  // 4) Tenant application → approve → tenancy
  const app = await raw('POST', '/api/public-website/tenant-applications', { noAuth: true, body: { property_id: propId, applicant_name: `Demo Tenant ${STAMP}`, mobile: `0166${STAMP}`, email: `tenant${STAMP}@example.com`, proposed_monthly_rent: RENT, proposed_security_deposit: DEPOSIT, nid_number: `199${STAMP}2` } });
  if (![200, 201].includes(app.status)) die('tenant application submit failed', app.body);
  const appId = list((await A('GET', `/api/tenant-applications?property_id=${propId}`)).body)[0]?.id;
  if (!appId) die('application not visible in admin');
  const verifs = ((await A('GET', `/api/tenant-applications/${appId}`)).body?.data || {}).verifications || [];
  for (const v of verifs) await A('PATCH', `/api/tenant-applications/${appId}/verifications/${v.id}`, { status: 'passed' });
  await A('PUT', `/api/tenant-applications/${appId}`, { status: 'approved', recommendation: 'recommend' });
  const conv = await A('POST', `/api/tenant-applications/${appId}/convert-to-tenancy`, { lease_start: `${M1}-01`, lease_end: `${now.getFullYear() + 1}-${String(now.getMonth() + 1).padStart(2, '0')}-01`, monthly_rent: RENT, service_charge: SERVICE, security_deposit: DEPOSIT, rent_due_day: 5, minimum_lease_period_months: 12 });
  const tenancyId = conv.body?.data?.tenancy?.id || conv.body?.tenancy?.id || conv.body?.data?.id;
  if (!tenancyId) die('convert-to-tenancy failed', conv.body);
  step('tenant application → tenancy', `tenancy#${tenancyId}`);

  // 5) Collect two months of rent — our fee is auto-deducted at each receipt.
  const inv1 = await A('POST', `/api/tenancies/${tenancyId}/raise-invoice`, { period_label: M1 });
  const invId = inv1.body?.data?.invoice?.id;
  if (!invId) die('could not raise month-1 rent invoice', inv1.body);
  await A('POST', `/api/invoices/${invId}/payments`, { amount: RENT + SERVICE, method: 'bank_transfer', reference: `DEMO-${STAMP}-1` });
  const bulk = await A('POST', '/api/tenancies/collect-rent', { month: M2, entries: [{ tenancy_id: tenancyId, amount: RENT + SERVICE, method: 'cash', reference: `DEMO-${STAMP}-2` }] });
  const collected = (bulk.body?.summary || {}).total_collected;
  step('rent collected for two months', `${M1} + ${M2}, total ${money((RENT + SERVICE) * 2)}`);

  // 6) Disbursement preview — proves the payout is NET of our fee.
  const prev = await A('GET', `/api/disbursements/owner/${ownerId}/preview?property_id=${propId}`);
  const d = prev.body?.data || {};
  const b = d.breakdown || {};
  const grossRent = Number(b.rent_collected || 0) + Number(b.service_collected || 0);
  console.log('\n──────────── OWNER PAYOUT PREVIEW ────────────');
  console.log(`  Rent + service collected : ${money(grossRent)}`);
  console.log(`  Our management fee (−)    : ${money(b.fees_deducted)}   \x1b[2m(${MGMT_PCT}% deducted at each receipt)\x1b[0m`);
  if (b.supplier_bills > 0) console.log(`  Supplier bills (−)        : ${money(b.supplier_bills)}`);
  if (b.already_paid > 0) console.log(`  Already paid out (−)      : ${money(b.already_paid)}`);
  console.log(`  ─────────────────────────────────────────────`);
  console.log(`  NET PAYABLE TO OWNER      : \x1b[1m${money(d.payable)}\x1b[0m`);
  console.log('──────────────────────────────────────────────');

  const feeOk = Number(b.fees_deducted) > 0 && Number(d.payable) > 0 && Number(d.payable) < grossRent;
  if (!feeOk) die('fee was NOT deducted — payable is not net', d);

  console.log(`\n\x1b[32m✓ Disbursement is correct: our ${MGMT_PCT}% fee is deducted, owner is paid the NET balance.\x1b[0m`);
  console.log('\nOpen it in the admin:');
  console.log(`  • Property        : /admin/property-management  → property #${propId}  ("${prop.body.data.title}")`);
  console.log(`  • Owner payouts   : /admin/property-management/disbursements  → owner "${ll.body.data.full_name}" shows ${money(d.payable)} payable`);
  console.log(`  • Bulk payouts    : /admin/property-management/disburse-owners`);
  console.log(`  • Agency income   : /admin/property-management/agency-income  (our fee appears as accrued, then collected after you pay the owner)\n`);
  console.log(`IDS → owner_contact_id=${ownerId}  property_id=${propId}  tenancy_id=${tenancyId}\n`);
  process.exit(0);
})();
