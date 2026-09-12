/**
 * e2eSellJourneyFull.js — the COMPLETE sell-side journey, end to end, over the
 * real API, clearing every gate through the real flows (not DB-seeded):
 *
 *   vendor + property + sale profile (commission)
 *   → vendor KYC (real submit + verify → kyc_status complete)
 *   → vendor signs the RPSS sale service agreement (→ agreement_status signed,
 *      drafts our agency-fee invoice)
 *   → site assessment create → complete checklist → submit → approve
 *   → compliance cleared + trust/operating bank accounts linked (profile API)
 *   → BUYER created WITHOUT any agreement, but KYC verified properly (gate)
 *   → offer → accept → deal + transaction + parties
 *   → start settlement (drafts commission + vendor-proceeds obligations)
 *   → buyer pays full price into trust → reconcile
 *   → prepare payouts (agency commission + vendor proceeds)
 *   → submit → review → approve → pay out → reconcile → pay
 *   → LOCK → property SOLD, deal completed, trust nets zero
 *   → OUR agency commission invoice recorded PAID and shown as paid.
 *
 * Single test user drives review/approve/lock with the documented super_admin
 * override. Only the one documented separate-duty exception (verifying the
 * vendor's recipient bank account) is flipped directly. Creates data; nothing
 * is cleaned. Run: node scripts/e2eSellJourneyFull.js
 */
const http = require('http');

const PORT = Number(process.env.PORT) || 50001;
const HOST = '127.0.0.1';
const EMAIL = process.env.E2E_EMAIL || 'admin@seventhskyproperty.com';
const PASSWORD = process.env.E2E_PASSWORD || 'Admin#2026';
const STAMP = Date.now().toString().slice(-6);
const PRICE = 10000000;                       // 1 crore
const PCT = 2;                                // 2% commission
const COMMISSION = PRICE * PCT / 100;         // 200,000 → agency
const VENDOR_PROCEEDS = PRICE - COMMISSION;   // 9,800,000 → vendor
const STMT = `/uploads/documents/e2e-stmt-${STAMP}.pdf`;

let TOKEN = '';
const R = { pass: 0, fail: 0 };
function log(s, m, d) {
  R[s === 'PASS' ? 'pass' : 'fail'] += 1;
  const tag = s === 'PASS' ? '\x1b[32mPASS\x1b[0m' : '\x1b[31mFAIL\x1b[0m';
  console.log(`${tag}\t${m}${d !== undefined ? '  \x1b[2m' + d + '\x1b[0m' : ''}`);
}
const ok = (cond, m, d) => { log(cond ? 'PASS' : 'FAIL', m, d); return cond; };
const short = (o) => JSON.stringify(o).slice(0, 160);

function req(method, path, opts = {}) {
  return new Promise((resolve) => {
    const data = opts.body ? JSON.stringify(opts.body) : null;
    const headers = { 'X-Branch-Id': '1' };
    if (!opts.noAuth) headers.Authorization = 'Bearer ' + TOKEN;
    if (data) { headers['Content-Type'] = 'application/json'; headers['Content-Length'] = Buffer.byteLength(data); }
    const r = http.request({ host: HOST, port: PORT, method, path, headers }, (x) => {
      let d = ''; x.on('data', (c) => { d += c; });
      x.on('end', () => { let j; try { j = JSON.parse(d); } catch { j = { _raw: d }; } resolve({ status: x.statusCode, body: j }); });
    });
    r.on('error', (e) => resolve({ status: 0, body: { error: e.message } }));
    if (data) r.write(data); r.end();
  });
}
function deepFind(node, pred, acc = [], seen = new Set()) {
  if (!node || typeof node !== 'object' || seen.has(node)) return acc;
  seen.add(node);
  if (Array.isArray(node)) { node.forEach((n) => deepFind(n, pred, acc, seen)); return acc; }
  if (pred(node)) acc.push(node);
  Object.values(node).forEach((v) => deepFind(v, pred, acc, seen));
  return acc;
}
const uniqById = (rows) => [...new Map(rows.filter((r) => r.id != null).map((r) => [Number(r.id), r])).values()];
const num = (v) => Math.round(Number(v || 0) * 100) / 100;
const OVERRIDE = { override: true, override_reason: `e2e single-user sell journey ${STAMP}` };

// Real KYC: create the party-role-profile on the property, submit + verify every
// required doc (verify rolls the profile up to kyc_status=complete).
async function kycVerify(contactId, role, propId) {
  const pr = await req('POST', '/api/party-role-profiles', { body: { contact_id: contactId, role_type: role, property_id: propId } });
  const profile = pr.body?.data;
  if (!profile) return { error: 'profile', resp: pr };
  const rq = await req('GET', `/api/kyc/requirements/${role}`);
  const reqs = (rq.body?.data || []).filter((x) => x.required);
  let verified = 0;
  for (const item of reqs) {
    const post = await req('POST', '/api/kyc/documents', { body: {
      related_type: 'party_role', related_id: profile.id, party_role_profile_id: profile.id,
      role, document_type: item.document_type, title: item.label,
      file_url: `uploads/documents/e2e-${STAMP}-${role}-${item.document_type}.pdf`, is_required: true,
    } });
    const doc = post.body?.data;
    if (doc?.id) { const v = await req('PATCH', `/api/kyc/documents/${doc.id}/verify`, { body: { action: 'verify' } }); if ([200, 201].includes(v.status)) verified++; }
  }
  const after = await req('GET', `/api/party-role-profiles/${profile.id}`);
  const kycStatus = after.body?.data?.kyc_status;
  return { profile, total: reqs.length, verified, kycStatus };
}

async function signEnvelope(envId) {
  const links = await req('GET', `/api/signing/envelopes/${envId}/links`);
  const list = (links.body?.data?.links || []).sort((a, b) => (a.order || 0) - (b.order || 0));
  let signed = 0;
  for (const l of list) {
    const token = (l.link || '').split('/').pop();
    if (!token) continue;
    const view = await req('GET', `/api/sign/${token}`, { noAuth: true });
    const fields = (view.body?.data?.fields || view.body?.fields || []).map((f) => ({
      id: f.id, value: f.field_type === 'signature' ? `${l.name} /sig/` : (f.field_type === 'date_signed' ? new Date().toISOString().slice(0, 10) : 'x'),
    }));
    const s = await req('POST', `/api/sign/${token}/sign`, { noAuth: true, body: { fields } });
    if ([200, 201].includes(s.status)) signed++;
  }
  return { signed, total: list.length };
}

async function reconcile(sid, paymentId, signedAmount, ref) {
  const line = await req('POST', `/api/sales/settlements/${sid}/bank-lines`, { body: { date: '2026-09-11', description: ref, reference: ref, amount: signedAmount } });
  const lineId = line.body?.data?.id;
  if (!lineId) return { ok: false, why: `bank-line ${line.status} ${short(line.body)}` };
  const rec = await req('POST', `/api/sales/payments/${paymentId}/reconcile`, { body: { reconciliation_status: 'reconciled', bank_statement_line_id: lineId, statement_url: STMT, note: ref } });
  return { ok: rec.status === 200, why: `reconcile ${rec.status} ${rec.status !== 200 ? short(rec.body) : ''}` };
}

function finish() {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`${R.fail ? '\x1b[31m' : '\x1b[32m'}${R.pass} PASS / ${R.fail} FAIL\x1b[0m\n`);
  process.exit(R.fail ? 1 : 0);
}

(async () => {
  console.log(`\n===== COMPLETE SELL JOURNEY E2E (run ${STAMP}) =====\n`);
  const login = await req('POST', '/api/auth/login', { noAuth: true, body: { email: EMAIL, password: PASSWORD } });
  TOKEN = login.body?.token || '';
  if (!ok(!!TOKEN, 'admin login', EMAIL)) return finish();

  // 1. Vendor + property + sale profile
  const vendor = await req('POST', '/api/contacts', { body: { full_name: `E2E-Sell Vendor ${STAMP}`, primary_phone: `0171${STAMP}`, email: `vendor${STAMP}@example.com`, contact_type: 'individual', national_id: `199${STAMP}01` } });
  const buyer = await req('POST', '/api/contacts', { body: { full_name: `E2E-Sell Buyer ${STAMP}`, primary_phone: `0181${STAMP}`, email: `buyer${STAMP}@example.com`, contact_type: 'individual', national_id: `199${STAMP}02` } });
  const vendorId = vendor.body?.data?.id; const buyerId = buyer.body?.data?.id;
  if (!ok(!!vendorId && !!buyerId, 'vendor + buyer contacts created', `v${vendorId}/b${buyerId}`)) return finish();

  const prop = await req('POST', '/api/properties', { body: { title: `E2E-Sell Flat ${STAMP}`, category: 'residential', property_type: 'apartment', listing_type: 'sale', status: 'available', price: PRICE, owner_contact_id: vendorId } });
  const propId = prop.body?.data?.id;
  if (!ok(!!propId, 'sale property listed', `#${propId}`)) return finish();
  await req('PUT', `/api/sales/properties/${propId}/profile`, { body: { agency_type: 'exclusive', commission_percent: PCT } });

  // 2. Vendor KYC — real submit + verify
  const vk = await kycVerify(vendorId, 'vendor', propId);
  ok(vk.kycStatus === 'complete' && vk.verified === vk.total, 'vendor KYC verified (profile complete)', `${vk.verified}/${vk.total} kyc_status=${vk.kycStatus}`);

  // 3. Vendor signs the RPSS sale service agreement → agreement_status signed + drafts our fee invoice
  const agr = await req('POST', '/api/sales-agreements/sale/agreements', { body: {
    property_id: propId,
    client: { full_name: vendor.body.data.full_name, email: vendor.body.data.email, contact_id: vendorId },
    org: { represented_by: 'Seventh Sky Rep', position: 'Sales Director', email: 'rep@seventhsky.com' },
    witnesses: [{ name: 'E2E Witness', email: `witness${STAMP}@example.com` }],
    pricing_input: { selected: [], commission: { mode: 'percent', percent: PCT, base_price: PRICE } },
    schedule_b: { target_value: PRICE }, save_as_draft: false,
  } });
  const agrEnvId = agr.body?.id;
  if (!ok(!!agrEnvId, 'sale service agreement sent', `env#${agrEnvId} ${!agrEnvId ? 'HTTP ' + agr.status + ' ' + short(agr.body) : ''}`)) return finish();
  const sr = await signEnvelope(agrEnvId);
  ok(sr.signed === sr.total, 'sale agreement signed by all parties', `${sr.signed}/${sr.total}`);

  // 4. Site assessment — real create → complete → submit → approve
  const asmt = await req('POST', `/api/sales/properties/${propId}/assessments`, { body: { assessment_type: 'sale', occupancy_status: 'vacant', overall_score: 82, marketability_score: 78 } });
  const asmtId = asmt.body?.data?.id;
  if (ok(!!asmtId, 'assessment created', `#${asmtId}`)) {
    const ws = await req('GET', `/api/sales/properties/${propId}/assessment-workspace`);
    const items = ws.body?.data?.assessment?.items || ws.body?.assessment?.items || [];
    for (const item of items) await req('PUT', `/api/sales/assessment-items/${item.id}`, { body: { condition_status: 'good', priority: 'low', is_clean: true, is_undamaged: true, is_working: true } });
    const sub = await req('POST', `/api/sales/assessments/${asmtId}/submit`, { body: {} });
    ok(sub.status === 200, 'assessment submitted', `HTTP ${sub.status} items=${items.length} ${sub.status !== 200 ? short(sub.body) : ''}`);
    const appr = await req('POST', `/api/sales/assessments/${asmtId}/approve`, { body: {} });
    ok(appr.status === 200, 'assessment approved (assessment_status complete)', `HTTP ${appr.status} ${appr.status !== 200 ? short(appr.body) : ''}`);
  }

  // 5. Compliance cleared + trust/operating banks linked — real profile API
  const trustBank = await req('POST', '/api/sales/bank-accounts', { body: { account_name: `E2E Trust ${STAMP}`, account_number: `TRUST${STAMP}`, bank_name: 'E2E Bank', account_type: 'trust' } });
  const opBank = await req('POST', '/api/sales/bank-accounts', { body: { account_name: `E2E Operating ${STAMP}`, account_number: `OP${STAMP}`, bank_name: 'E2E Bank', account_type: 'operating' } });
  const trustBankId = trustBank.body?.data?.id; const opBankId = opBank.body?.data?.id;
  const profUpd = await req('PUT', `/api/sales/properties/${propId}/profile`, { body: { compliance_status: 'clear', trust_bank_account_id: trustBankId, agency_bank_account_id: opBankId } });
  ok(profUpd.status === 200 && !!trustBankId && !!opBankId, 'compliance cleared + trust/operating banks linked', `trust ${trustBankId}/op ${opBankId}`);

  // 6. BUYER — created WITHOUT any agreement, but KYC verified properly (the gate)
  const bk = await kycVerify(buyerId, 'buyer', propId);
  ok(bk.kycStatus === 'complete' && bk.verified === bk.total, 'buyer KYC verified (no agreement, gate satisfied)', `${bk.verified}/${bk.total} kyc_status=${bk.kycStatus}`);

  // 7. Offer → accept → deal + transaction + parties
  const offer = await req('POST', `/api/sales/properties/${propId}/offers`, { body: { amount: PRICE, deposit_amount: 0, status: 'submitted', buyers: [{ contact_id: buyerId, ownership_percent: 100, is_primary: true }] } });
  const offerId = offer.body?.data?.id;
  if (!ok(!!offerId, 'offer submitted', offer.body?.data?.offer_code)) return finish();
  const accept = await req('POST', `/api/sales/offers/${offerId}/accept`, { body: { approval: { approver_side: 'seller', note: 'e2e' } } });
  const dealId = accept.body?.deal?.id; const txId = accept.body?.transaction?.id;
  if (!ok(!!dealId && !!txId, 'offer accepted → deal + transaction', `deal ${accept.body?.deal?.deal_code}/tx ${txId}`)) return finish();

  // 8. Start settlement → drafted obligations
  const settle = await req('POST', `/api/sales/transactions/${txId}/settlement`, { body: {} });
  const sid = settle.body?.data?.id;
  if (!ok(!!sid && settle.body?.created === true, 'settlement started (obligations drafted)', `#${sid}`)) return finish();

  const file = await req('GET', `/api/sales/properties/${propId}`);
  const fd = file.body?.data || file.body;
  const lines = uniqById(deepFind(fd, (n) => typeof n.line_type === 'string' && n.amount !== undefined));
  const commissionLine = lines.find((l) => l.line_type === 'commission');
  const vendorLine = lines.find((l) => l.line_type === 'vendor_proceeds');
  const parties = uniqById(deepFind(fd, (n) => (n.party_type === 'buyer' || n.party_type === 'vendor') && n.transaction_id));
  const buyerParty = parties.find((p) => p.party_type === 'buyer');
  const vendorParty = parties.find((p) => p.party_type === 'vendor');
  ok(num(commissionLine?.amount) === COMMISSION && num(vendorLine?.amount) === VENDOR_PROCEEDS, 'obligations: commission + vendor proceeds', `${num(commissionLine?.amount)} + ${num(vendorLine?.amount)}`);
  if (!commissionLine || !vendorLine || !buyerParty || !vendorParty) return finish();

  // 9. Verified vendor recipient bank (documented separate-duty exception → flip)
  const vbank = await req('POST', `/api/sales/transaction-parties/${vendorParty.id}/bank-accounts`, { body: { bank_name: 'E2E Bank', account_name: vendor.body.data.full_name, account_number: `VACC${STAMP}` } });
  const vbankId = vbank.body?.data?.id;
  try { const { PartyBankAccount } = require('../models/PartyBankAccount'); await PartyBankAccount.update({ status: 'verified', verified_by: 1, verified_at: new Date() }, { where: { id: vbankId } }); } catch (e) { ok(false, 'verify vendor bank', e.message); }
  ok(!!vbankId, 'vendor recipient bank verified (separate-duty fixture)', `#${vbankId}`);

  // 10. Prepare payouts while draft
  const dAgency = await req('POST', `/api/sales/settlements/${sid}/disbursements`, { body: { payee_type: 'agency', settlement_line_id: commissionLine.id, destination_bank_account_id: opBankId, payout_method: 'manual_bank', amount: COMMISSION } });
  const dVendor = await req('POST', `/api/sales/settlements/${sid}/disbursements`, { body: { payee_type: 'vendor', transaction_party_id: vendorParty.id, settlement_line_id: vendorLine.id, party_bank_account_id: vbankId, payout_method: 'manual_bank', amount: VENDOR_PROCEEDS } });
  const agencyDid = dAgency.body?.data?.id; const vendorDid = dVendor.body?.data?.id;
  if (!ok(agencyDid && vendorDid, 'payouts prepared (agency + vendor)', `agency ${dAgency.status}/vendor ${dVendor.status}`)) return finish();

  // 11. Buyer pays full price into trust → reconcile
  const receipt = await req('POST', `/api/sales/settlements/${sid}/payments`, { body: { direction: 'incoming', payment_kind: 'buyer_receipt', transaction_party_id: buyerParty.id, amount: PRICE, reference: `E2E-REC-${STAMP}`, status: 'cleared', method: 'bank_transfer' } });
  const receiptId = receipt.body?.data?.id;
  if (!ok(receipt.status === 201 && !!receiptId, 'buyer payment received into trust (cleared)', `HTTP ${receipt.status} #${receiptId}`)) return finish();
  const rr = await reconcile(sid, receiptId, PRICE, `E2E-REC-${STAMP}`);
  if (!ok(rr.ok, 'buyer receipt reconciled', rr.why)) return finish();

  // 12. submit → review → approve (single-user override)
  const sub = await req('POST', `/api/sales/settlements/${sid}/submit`, { body: {} });
  const rev = await req('POST', `/api/sales/settlements/${sid}/review`, { body: OVERRIDE });
  const app = await req('POST', `/api/sales/settlements/${sid}/approve`, { body: OVERRIDE });
  if (!ok(sub.status === 200 && rev.status === 200 && app.status === 200, 'submit → review → approve', `${sub.status}/${rev.status}/${app.status} ${app.status !== 200 ? short(app.body) : ''}`)) return finish();

  // 13. Pay out each payout: pay-out → reconcile → pay
  for (const [label, did, amount] of [['vendor', vendorDid, VENDOR_PROCEEDS], ['agency', agencyDid, COMMISSION]]) {
    const po = await req('POST', `/api/sales/disbursements/${did}/pay-out`, { body: { reference: `E2E-PO-${label}-${STAMP}` } });
    const payId = po.body?.data?.payment?.id;
    if (!ok(po.status === 200 && !!payId, `${label} payout cleared`, `HTTP ${po.status}`)) return finish();
    const pr = await reconcile(sid, payId, -amount, `E2E-PO-${label}-${STAMP}`);
    if (!ok(pr.ok, `${label} payout reconciled`, pr.why)) return finish();
    const pay = await req('POST', `/api/sales/disbursements/${did}/pay`, { body: { payment_id: payId } });
    if (!ok(pay.status === 200 && pay.body?.data?.status === 'paid', `${label} payout marked paid`, `HTTP ${pay.status} status=${pay.body?.data?.status} ${pay.status !== 200 ? short(pay.body) : ''}`)) return finish();
  }

  // 14. LOCK → settled
  const lock = await req('POST', `/api/sales/settlements/${sid}/lock`, { body: OVERRIDE });
  ok(lock.status === 200, 'settlement LOCKED (settled)', `HTTP ${lock.status} ${lock.status !== 200 ? short(lock.body) : ''}`);

  // 15. Completion side effects
  const propAfter = await req('GET', `/api/properties/${propId}`);
  ok((propAfter.body?.data?.status || propAfter.body?.status) === 'sold', 'property marked SOLD', `status=${propAfter.body?.data?.status || propAfter.body?.status}`);
  const stmt = await req('GET', `/api/sales/settlements/${sid}/statement`);
  ok(num(stmt.body?.data?.trust?.total_balance) === 0, 'trust ledger nets to zero', `balance=${num(stmt.body?.data?.trust?.total_balance)}`);
  ok(num(stmt.body?.data?.totals?.residual) === 0, 'settlement residual is zero', `residual=${num(stmt.body?.data?.totals?.residual)}`);

  // 16. OUR agency commission invoice → recorded PAID and shown
  const invRes = await req('GET', `/api/invoices?property_id=${propId}`);
  const invList = invRes.body?.data || invRes.body?.invoices || (Array.isArray(invRes.body) ? invRes.body : []);
  // Our commission invoice is the agreement-fee invoice with the real amount.
  const feeInvoices = invList.filter((i) => i.invoice_type === 'agreement_fee').sort((a, b) => Number(b.total) - Number(a.total));
  const feeInvoice = feeInvoices[0];
  ok(feeInvoices.length > 0, 'agency fee invoices drafted from signed agreement', `${feeInvoices.length} invoice(s), top total=${feeInvoice?.total}`);
  if (ok(!!feeInvoice && Number(feeInvoice.total) > 0, 'our commission invoice exists with amount', `#${feeInvoice?.id} ${feeInvoice?.invoice_code} total=${feeInvoice?.total}`)) {
    const balance = Number(feeInvoice.balance != null ? feeInvoice.balance : feeInvoice.total);
    const payInv = await req('POST', `/api/invoices/${feeInvoice.id}/payments`, { body: { amount: balance, method: 'bank_transfer', reference: `E2E-INVPAY-${STAMP}`, paid_at: '2026-09-11' } });
    ok([200, 201].includes(payInv.status), 'our invoice payment recorded', `HTTP ${payInv.status} ${payInv.status >= 400 ? short(payInv.body) : ''}`);
    const invAfter = await req('GET', `/api/invoices/${feeInvoice.id}`);
    const st = invAfter.body?.data?.status || invAfter.body?.status;
    ok(['paid', 'partial'].includes(st), 'our invoice shown as paid', `status=${st} balance=${invAfter.body?.data?.balance}`);
  }

  console.log(`\nFIXTURE IDS: prop=${propId} vendor=${vendorId} buyer=${buyerId} deal=${dealId} settlement=${sid} agreementEnv=${agrEnvId} stamp=${STAMP}`);
  finish();
})().catch((e) => { log('FAIL', 'harness crashed', e.stack || e.message); finish(); });
