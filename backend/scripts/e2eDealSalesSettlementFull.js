/**
 * e2eDealSalesSettlementFull.js — the completion-gate harness for the merged
 * PROPERTY_SALES_SAAS plan, Phase 1. It drives ONE sale all the way to a locked
 * settlement and a 'sold' property through the real /sales engine, clearing
 * every compliance blocker — the "single/bulk completion apply the same rules"
 * proof the fast harness (e2eDealSalesSettlement.js) deliberately stops short of.
 *
 * Split of responsibility:
 *   • Static prerequisites are seeded directly (fixtures): the sale profile's
 *     compliance/assessment/agreement flags + trust/agency bank accounts, and
 *     each party's KYC (role profile complete + a verified required document).
 *     These are gates, not money — seeding them is standard fixture setup.
 *   • Every money movement goes through the /sales HTTP API: receipt → reconcile
 *     → approve → pay out → reconcile → pay → lock. Nothing about the money path
 *     is faked.
 *
 * Separation of duties is enforced by user, not role; a single test user drives
 * review/approve/lock with the documented super_admin override + written reason.
 *
 * Ledger posting uses the branch's default chart accounts (codes 1100/1110/
 * 2100/4100/4110), so no per-property ledger accounts are configured.
 *
 * Needs the API on :50001 (npm start) and DB access (same config the server
 * uses). Creates data; nothing is cleaned. Prints N PASS / M FAIL, exit 1 on any
 * fail. Not wired into `npm test` (it seeds directly and is slower) — run with:
 *   node scripts/e2eDealSalesSettlementFull.js
 */
const http = require('http');
const sequelize = require('../config/db.config');
const { SaleProfile } = require('../models/SalesModels');
const PartyRoleProfile = require('../models/PartyRoleProfile');
const KycDocument = require('../models/KycDocument');
const PropertyDeal = require('../models/PropertyDeal');

const PORT = Number(process.env.PORT) || 50001;
const EMAIL = process.env.E2E_EMAIL || 'admin@seventhskyproperty.com';
const PASSWORD = process.env.E2E_PASSWORD || 'Admin#2026';
const STAMP = Date.now().toString().slice(-6);
const PRICE = 1000000;
const PCT = 5;
const COMMISSION = PRICE * PCT / 100;      // 50,000 → agency
const VENDOR_PROCEEDS = PRICE - COMMISSION; // 950,000 → vendor
const STMT = `/uploads/documents/e2e-stmt-${STAMP}.pdf`; // format-checked only

let TOKEN = '';
const R = { pass: 0, fail: 0 };
function log(s, m, d) {
  R[s === 'PASS' ? 'pass' : 'fail'] += 1;
  const tag = s === 'PASS' ? '\x1b[32mPASS\x1b[0m' : '\x1b[31mFAIL\x1b[0m';
  console.log(`${tag}\t${m}${d !== undefined ? '  \x1b[2m' + d + '\x1b[0m' : ''}`);
}
const ok = (cond, m, d) => { log(cond ? 'PASS' : 'FAIL', m, d); return cond; };

function req(method, path, opts = {}) {
  return new Promise((resolve) => {
    const data = opts.body ? JSON.stringify(opts.body) : null;
    const headers = { 'X-Branch-Id': '1' };
    if (!opts.noAuth) headers.Authorization = 'Bearer ' + TOKEN;
    if (data) { headers['Content-Type'] = 'application/json'; headers['Content-Length'] = Buffer.byteLength(data); }
    const r = http.request({ host: '127.0.0.1', port: PORT, method, path, headers }, (x) => {
      let d = ''; x.on('data', (c) => { d += c; });
      x.on('end', () => { let j; try { j = JSON.parse(d); } catch { j = { _raw: d.slice(0, 300) }; } resolve({ status: x.statusCode, body: j }); });
    });
    r.on('error', (e) => resolve({ status: 0, body: { _err: e.message } }));
    if (data) r.write(data);
    r.end();
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
const OVERRIDE = { override: true, override_reason: `e2e single-user run ${STAMP}` };

async function finish(code) {
  console.log(`\n${R.fail ? '\x1b[31m' : '\x1b[32m'}${R.pass} PASS / ${R.fail} FAIL\x1b[0m`);
  try { await sequelize.close(); } catch { /* ignore */ }
  process.exit(code != null ? code : (R.fail ? 1 : 0));
}

// Match a cleared payment to a signed trust-bank statement line, then mark it
// reconciled — the reconciliation step every cleared payment needs before lock.
async function reconcile(sid, paymentId, signedAmount, ref) {
  const line = await req('POST', `/api/sales/settlements/${sid}/bank-lines`, { body: { date: '2026-09-11', description: ref, reference: ref, amount: signedAmount } });
  const lineId = line.body?.data?.id;
  if (!lineId) return { ok: false, why: `bank-line ${line.status} ${JSON.stringify(line.body).slice(0, 100)}` };
  const rec = await req('POST', `/api/sales/payments/${paymentId}/reconcile`, { body: { reconciliation_status: 'reconciled', bank_statement_line_id: lineId, statement_url: STMT, note: ref } });
  return { ok: rec.status === 200, why: `reconcile ${rec.status} ${rec.status !== 200 ? JSON.stringify(rec.body).slice(0, 100) : ''}` };
}

(async () => {
  console.log(`\n===== DEAL ↔ /SALES FULL LOCK-TO-SOLD E2E (run ${STAMP}) =====\n`);

  const login = await req('POST', '/api/auth/login', { noAuth: true, body: { email: EMAIL, password: PASSWORD } });
  TOKEN = login.body?.token || '';
  if (!ok(!!TOKEN, 'admin login', EMAIL)) return finish();

  // --- fixtures ---
  const vendor = await req('POST', '/api/contacts', { body: { full_name: `E2E-F Vendor ${STAMP}`, primary_phone: `0171000${STAMP}`, contact_type: 'individual' } });
  const buyer = await req('POST', '/api/contacts', { body: { full_name: `E2E-F Buyer ${STAMP}`, primary_phone: `0181000${STAMP}`, contact_type: 'individual' } });
  const vendorId = vendor.body?.data?.id; const buyerId = buyer.body?.data?.id;
  if (!ok(!!vendorId && !!buyerId, 'contacts created', `vendor ${vendorId} / buyer ${buyerId}`)) return finish();

  const prop = await req('POST', '/api/properties', { body: { title: `E2E-F Sale Flat ${STAMP}`, category: 'residential', property_type: 'apartment', listing_type: 'sale', status: 'available', price: PRICE, owner_contact_id: vendorId } });
  const propId = prop.body?.data?.id;
  if (!ok(!!propId, 'sale property created', `#${propId}`)) return finish();

  await req('PUT', `/api/sales/properties/${propId}/profile`, { body: { agency_type: 'exclusive', commission_percent: PCT } });

  // Two physical bank accounts: a trust account (reconciliation) and an
  // operating account (agency payout destination).
  const trustBank = await req('POST', '/api/sales/bank-accounts', { body: { account_name: `E2E Trust ${STAMP}`, account_number: `TRUST${STAMP}`, bank_name: 'E2E Bank', account_type: 'trust' } });
  const opBank = await req('POST', '/api/sales/bank-accounts', { body: { account_name: `E2E Operating ${STAMP}`, account_number: `OP${STAMP}`, bank_name: 'E2E Bank', account_type: 'operating' } });
  const trustBankId = trustBank.body?.data?.id; const opBankId = opBank.body?.data?.id;
  if (!ok(!!trustBankId && !!opBankId, 'physical bank accounts created', `trust ${trustBankId} / operating ${opBankId}`)) return finish();

  const offer = await req('POST', `/api/sales/properties/${propId}/offers`, { body: { amount: PRICE, deposit_amount: 0, status: 'submitted', buyers: [{ contact_id: buyerId, ownership_percent: 100, is_primary: true }] } });
  const offerId = offer.body?.data?.id;
  if (!ok(!!offerId, 'offer submitted', offer.body?.data?.offer_code)) return finish();

  const accept = await req('POST', `/api/sales/offers/${offerId}/accept`, { body: {} });
  const dealId = accept.body?.deal?.id; const txId = accept.body?.transaction?.id;
  if (!ok(!!dealId && !!txId, 'offer accepted → deal + transaction', `deal ${accept.body?.deal?.deal_code} / tx ${txId}`)) return finish();

  // --- seed the static gates directly (compliance / assessment / agreement,
  //     trust + agency bank accounts, and party KYC) ---
  try {
    await SaleProfile.update(
      { compliance_status: 'clear', assessment_status: 'waived', agreement_status: 'signed', trust_bank_account_id: trustBankId, agency_bank_account_id: opBankId },
      { where: { property_id: propId, branch_id: 1 } },
    );
    const profiles = await PartyRoleProfile.findAll({ where: { property_id: propId, branch_id: 1 } });
    for (const p of profiles) {
      await p.update({ kyc_status: 'complete' });
      await KycDocument.findOrCreate({
        where: { party_role_profile_id: p.id, document_type: 'national_id' },
        defaults: { branch_id: 1, related_type: 'party_role_profile', related_id: p.id, party_role_profile_id: p.id, role: p.role_type, document_type: 'national_id', title: 'National ID (e2e)', status: 'verified', is_required: true, verified_by: 1, verified_at: new Date() },
      });
    }
    await KycDocument.update({ status: 'verified', verified_by: 1, verified_at: new Date() }, { where: { party_role_profile_id: profiles.map((p) => p.id), is_required: true } });
    ok(profiles.length >= 2, 'static gates seeded (compliance/agreement/KYC)', `${profiles.length} party role profiles`);
  } catch (e) { ok(false, 'static gates seeded', e.message); return finish(); }

  // --- settlement + draft the payouts (must be prepared while draft) ---
  const settle = await req('POST', `/api/sales/transactions/${txId}/settlement`, { body: {} });
  const sid = settle.body?.data?.id;
  if (!ok(!!sid && settle.body?.created === true, 'settlement created', `#${sid}`)) return finish();

  const file = await req('GET', `/api/sales/properties/${propId}`);
  const fd = file.body?.data || file.body;
  const lines = uniqById(deepFind(fd, (n) => typeof n.line_type === 'string' && n.amount !== undefined));
  const commissionLine = lines.find((l) => l.line_type === 'commission');
  const vendorLine = lines.find((l) => l.line_type === 'vendor_proceeds');
  const parties = uniqById(deepFind(fd, (n) => (n.party_type === 'buyer' || n.party_type === 'vendor') && n.transaction_id));
  const buyerParty = parties.find((p) => p.party_type === 'buyer');
  const vendorParty = parties.find((p) => p.party_type === 'vendor');
  if (!ok(!!commissionLine && !!vendorLine && !!buyerParty && !!vendorParty, 'drafted lines + parties resolved', `commission ${commissionLine?.id} / vendor ${vendorLine?.id}`)) return finish();

  // Verified vendor recipient bank (verification is a separate-duty action a
  // single user cannot self-approve over HTTP → flipped as fixture setup).
  const vbank = await req('POST', `/api/sales/transaction-parties/${vendorParty.id}/bank-accounts`, { body: { bank_name: 'E2E Bank', account_name: `E2E-F Vendor ${STAMP}`, account_number: `VACC${STAMP}` } });
  const vbankId = vbank.body?.data?.id;
  const { PartyBankAccount } = require('../models/PartyBankAccount');
  await PartyBankAccount.update({ status: 'verified', verified_by: 1, verified_at: new Date() }, { where: { id: vbankId } });
  if (!ok(!!vbankId, 'verified vendor recipient bank (fixture)', `#${vbankId}`)) return finish();

  const dAgency = await req('POST', `/api/sales/settlements/${sid}/disbursements`, { body: { payee_type: 'agency', settlement_line_id: commissionLine.id, destination_bank_account_id: opBankId, payout_method: 'manual_bank', amount: COMMISSION } });
  const dVendor = await req('POST', `/api/sales/settlements/${sid}/disbursements`, { body: { payee_type: 'vendor', transaction_party_id: vendorParty.id, settlement_line_id: vendorLine.id, party_bank_account_id: vbankId, payout_method: 'manual_bank', amount: VENDOR_PROCEEDS } });
  const agencyDid = dAgency.body?.data?.id; const vendorDid = dVendor.body?.data?.id;
  if (!ok(agencyDid && vendorDid, 'payouts prepared (agency + vendor)', `agency ${dAgency.status}/#${agencyDid}, vendor ${dVendor.status}/#${vendorDid}`)) return finish();

  // --- buyer pays the full price into trust, then reconcile it ---
  const receipt = await req('POST', `/api/sales/settlements/${sid}/payments`, { body: { direction: 'incoming', payment_kind: 'buyer_receipt', transaction_party_id: buyerParty.id, amount: PRICE, reference: `E2E-REC-${STAMP}`, status: 'cleared', method: 'bank_transfer' } });
  const receiptId = receipt.body?.data?.id;
  if (!ok(receipt.status === 201 && !!receiptId, 'buyer receipt cleared (full price)', `HTTP ${receipt.status} #${receiptId}`)) return finish();
  const rr = await reconcile(sid, receiptId, PRICE, `E2E-REC-${STAMP}`);
  if (!ok(rr.ok, 'buyer receipt reconciled', rr.why)) return finish();

  // --- approve (single user → documented super_admin override) ---
  const sub = await req('POST', `/api/sales/settlements/${sid}/submit`, { body: {} });
  const rev = await req('POST', `/api/sales/settlements/${sid}/review`, { body: OVERRIDE });
  const app = await req('POST', `/api/sales/settlements/${sid}/approve`, { body: OVERRIDE });
  if (!ok(sub.status === 200 && rev.status === 200 && app.status === 200, 'submit → review → approve', `${sub.status}/${rev.status}/${app.status} ${app.status !== 200 ? JSON.stringify(app.body).slice(0, 100) : ''}`)) return finish();

  // Right after approve the payouts are still unpaid, so the settlement is
  // approved but NOT yet lockable — the readiness feed must say so honestly.
  const bulkPre = await req('GET', '/api/deals/settlement/sales-bulk-data');
  const preRow = (bulkPre.body?.data || []).find((r) => Number(r.deal_id) === Number(dealId));
  ok(!!preRow && preRow.status === 'approved' && preRow.ready === false && (preRow.blockers || []).length > 0, 'bulk readiness: approved, payouts still pending (not ready)', preRow ? `status=${preRow.status} ready=${preRow.ready} blockers=${(preRow.blockers || []).length}` : 'row missing');

  // --- pay out each payout: pay-out (clear) → reconcile → pay (post + trust).
  //     Vendor first: the funds check reserves against cleared receipts. ---
  for (const [label, did, amount] of [['vendor', vendorDid, VENDOR_PROCEEDS], ['agency', agencyDid, COMMISSION]]) {
    const po = await req('POST', `/api/sales/disbursements/${did}/pay-out`, { body: { reference: `E2E-PO-${label}-${STAMP}` } });
    const payId = po.body?.data?.payment?.id;
    if (!ok(po.status === 200 && !!payId, `${label}: pay-out clears an outgoing payment`, `HTTP ${po.status} pay #${payId}`)) return finish();
    const pr = await reconcile(sid, payId, -amount, `E2E-PO-${label}-${STAMP}`);
    if (!ok(pr.ok, `${label}: payout reconciled`, pr.why)) return finish();
    const pay = await req('POST', `/api/sales/disbursements/${did}/pay`, { body: { payment_id: payId } });
    if (!ok(pay.status === 200 && pay.body?.data?.status === 'paid', `${label}: payout marked paid (posted + trust)`, `HTTP ${pay.status} status=${pay.body?.data?.status} ${pay.status !== 200 ? JSON.stringify(pay.body).slice(0, 100) : ''}`)) return finish();
  }

  // With every payout paid, the readiness feed must now say the settlement is
  // ready to lock — the state the bulk screen acts on.
  const bulkReady = await req('GET', '/api/deals/settlement/sales-bulk-data');
  const readyRow = (bulkReady.body?.data || []).find((r) => Number(r.deal_id) === Number(dealId));
  ok(!!readyRow && readyRow.status === 'approved' && readyRow.ready === true && (readyRow.blockers || []).length === 0, 'bulk readiness: approved & ready to lock', readyRow ? `status=${readyRow.status} ready=${readyRow.ready} blockers=${(readyRow.blockers || []).length}` : 'row missing');

  // --- lock → completion ---
  const lock = await req('POST', `/api/sales/settlements/${sid}/lock`, { body: OVERRIDE });
  ok(lock.status === 200, 'settlement LOCKED', `HTTP ${lock.status} ${lock.status !== 200 ? JSON.stringify(lock.body).slice(0, 140) : ''}`);

  // --- completion side effects ---
  const picture = await req('GET', `/api/deals/${dealId}/sales-picture`);
  ok(picture.body?.data?.settlement?.status === 'locked', 'sales-picture shows settlement locked', `status=${picture.body?.data?.settlement?.status}`);

  const propAfter = await req('GET', `/api/properties/${propId}`);
  const propStatus = propAfter.body?.data?.status || propAfter.body?.status;
  ok(propStatus === 'sold', 'property marked SOLD', `status=${propStatus}`);

  // The deal's own GET endpoint has an unrelated eager-load bug, so read the
  // deal status straight from the model to confirm lock completed it.
  const dealRow = await PropertyDeal.findByPk(dealId);
  ok(dealRow?.status === 'completed', 'deal marked completed', `status=${dealRow?.status}`);

  // Trust must net to zero at completion.
  const stmt = await req('GET', `/api/sales/settlements/${sid}/statement`);
  ok(num(stmt.body?.data?.trust?.total_balance) === 0, 'trust ledger nets to zero', `total_balance=${num(stmt.body?.data?.trust?.total_balance)}`);
  ok(num(stmt.body?.data?.totals?.residual) === 0, 'settlement residual is zero', `residual=${num(stmt.body?.data?.totals?.residual)}`);

  return finish();
})().catch((e) => { log('FAIL', 'harness crashed', e.stack || e.message); finish(1); });
