/**
 * e2eDealSalesSettlement.js — end-to-end money-path harness for the merged
 * PROPERTY_SALES_SAAS plan, Phase 1 (deal workspace ↔ /sales engine).
 *
 * It builds an isolated sale on fresh fixtures and drives the REAL /sales money
 * path over HTTP, asserting the wiring the plan's Phase 1 depends on:
 *   1. createSettlement auto-drafts the fee lines (commission + vendor proceeds
 *      summing to the price) — the settlement's obligation schedule.
 *   2. The deal's money reads back through GET /deals/:id/sales-picture.
 *   3. GET /deals/settlement/sales-bulk-data lists the settlement honestly
 *      (draft → not ready to lock).
 *   4. A buyer receipt records through the /sales payment endpoint.
 *   5. createDisbursement's FULL validated API path (verified recipient bank →
 *      obligation guard): a payout over its obligation is refused, an exact one
 *      is prepared. (The *coverage* guard added in fa59eeb only trips once money
 *      has already been paid out — that state needs the full trust flow and is
 *      covered by the live-data verification recorded on that commit, not here.)
 *   6. lock is refused on a draft settlement (lifecycle guard).
 *   7. The retired /deals money endpoints all 404 (items 12 + 14).
 *
 * The reversal-pair netting question is covered by the server-free unit suite
 * scripts/testSalesSettlementCalculations.js, which `npm test` runs first.
 *
 * Needs the API on :50001 (npm start). Creates data; nothing is cleaned — every
 * fixture is tagged with a run stamp so it is identifiable.
 *
 * Full lock-to-'sold' completion is deliberately out of scope: it requires a
 * KYC/agreement/trust/bank fixture that clears ~15 compliance blockers, tracked
 * as its own step.
 */
const http = require('http');

const PORT = Number(process.env.PORT) || 50001;
const EMAIL = process.env.E2E_EMAIL || 'admin@seventhskyproperty.com';
const PASSWORD = process.env.E2E_PASSWORD || 'Admin#2026';
const STAMP = Date.now().toString().slice(-6);
const PRICE = 1000000;      // BDT
const PCT = 5;              // commission %
const COMMISSION = PRICE * PCT / 100;   // 50,000
const VENDOR_PROCEEDS = PRICE - COMMISSION; // 950,000

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

// Collect every nested node matching a predicate — the sales property file nests
// transaction parties and settlement lines, and its exact shape is not asserted.
function deepFind(node, pred, acc = [], seen = new Set()) {
  if (!node || typeof node !== 'object' || seen.has(node)) return acc;
  seen.add(node);
  if (Array.isArray(node)) { node.forEach((n) => deepFind(n, pred, acc, seen)); return acc; }
  if (pred(node)) acc.push(node);
  Object.values(node).forEach((v) => deepFind(v, pred, acc, seen));
  return acc;
}
const num = (v) => Math.round(Number(v || 0) * 100) / 100;
// The property file nests the same rows in several sub-structures; dedupe by id.
const uniqById = (rows) => [...new Map(rows.filter((r) => r.id != null).map((r) => [Number(r.id), r])).values()];

function finish() {
  console.log(`\n${R.fail ? '\x1b[31m' : '\x1b[32m'}${R.pass} PASS / ${R.fail} FAIL\x1b[0m`);
  process.exit(R.fail ? 1 : 0);
}

(async () => {
  console.log(`\n===== DEAL ↔ /SALES SETTLEMENT E2E (run ${STAMP}) =====\n`);

  // --- login ---
  const login = await req('POST', '/api/auth/login', { noAuth: true, body: { email: EMAIL, password: PASSWORD } });
  TOKEN = login.body?.token || '';
  if (!ok(!!TOKEN, 'admin login', EMAIL)) return finish();

  // --- fixtures: contacts + a sale property owned by the vendor ---
  const vendor = await req('POST', '/api/contacts', { body: { full_name: `E2E Vendor ${STAMP}`, primary_phone: `0170000${STAMP}`, contact_type: 'individual' } });
  const buyer = await req('POST', '/api/contacts', { body: { full_name: `E2E Buyer ${STAMP}`, primary_phone: `0180000${STAMP}`, contact_type: 'individual' } });
  const vendorId = vendor.body?.data?.id;
  const buyerId = buyer.body?.data?.id;
  if (!ok(!!vendorId && !!buyerId, 'contacts created', `vendor ${vendorId} / buyer ${buyerId}`)) return finish();

  const prop = await req('POST', '/api/properties', { body: { title: `E2E Sale Flat ${STAMP}`, category: 'residential', property_type: 'apartment', listing_type: 'sale', status: 'available', price: PRICE, owner_contact_id: vendorId } });
  const propId = prop.body?.data?.id;
  if (!ok(!!propId, 'sale property created', `#${propId} status=${prop.body?.data?.status}`)) return finish();

  // --- agency agreement figures (commission %) live on the sale profile ---
  const profile = await req('PUT', `/api/sales/properties/${propId}/profile`, { body: { agency_type: 'exclusive', commission_percent: PCT } });
  if (!ok(profile.status === 200 || profile.status === 201, 'sale profile w/ commission', `${PCT}% → HTTP ${profile.status}`)) return finish();

  // --- offer → accept (mints the deal + transaction + parties) ---
  const offer = await req('POST', `/api/sales/properties/${propId}/offers`, { body: { amount: PRICE, deposit_amount: 0, status: 'submitted', buyers: [{ contact_id: buyerId, ownership_percent: 100, is_primary: true }] } });
  const offerId = offer.body?.data?.id;
  if (!ok(!!offerId, 'offer submitted', `${offer.body?.data?.offer_code} @ ${PRICE}`)) return finish();

  const accept = await req('POST', `/api/sales/offers/${offerId}/accept`, { body: {} });
  const dealId = accept.body?.deal?.id;
  const txId = accept.body?.transaction?.id;
  if (!ok(!!dealId && !!txId, 'offer accepted → deal + transaction', `deal ${accept.body?.deal?.deal_code} / tx ${txId}`)) return finish();

  // --- 1. createSettlement drafts the obligation schedule ---
  const settle = await req('POST', `/api/sales/transactions/${txId}/settlement`, { body: {} });
  const sid = settle.body?.data?.id;
  ok([200, 201].includes(settle.status) && !!sid && settle.body?.created === true, 'settlement created + drafted', `#${sid} created=${settle.body?.created}`);
  if (!sid) return finish();

  // Read the drafted lines from the property file (it nests settlement.lines).
  const file = await req('GET', `/api/sales/properties/${propId}`);
  const fileData = file.body?.data || file.body;
  const lines = uniqById(deepFind(fileData, (n) => typeof n.line_type === 'string' && n.amount !== undefined));
  const priceLine = lines.filter((l) => l.line_type === 'purchase_price');
  const commissionLine = lines.find((l) => l.line_type === 'commission');
  const vendorLine = lines.find((l) => l.line_type === 'vendor_proceeds');
  const payableSum = lines.filter((l) => l.direction === 'debit' && l.line_type !== 'purchase_price').reduce((s, l) => s + num(l.amount), 0);
  ok(priceLine.length === 1 && num(priceLine[0].amount) === PRICE, 'one purchase_price line = price', `${num(priceLine[0]?.amount)}`);
  ok(!!commissionLine && num(commissionLine.amount) === COMMISSION, 'commission auto-drafted', `${num(commissionLine?.amount)} (expected ${COMMISSION})`);
  ok(!!vendorLine && num(vendorLine.amount) === VENDOR_PROCEEDS, 'vendor proceeds = price − commission', `${num(vendorLine?.amount)} (expected ${VENDOR_PROCEEDS})`);
  ok(num(payableSum) === PRICE, 'payable obligations sum to price', `${num(payableSum)}`);

  // Statement totals corroborate the schedule.
  const stmt = await req('GET', `/api/sales/settlements/${sid}/statement`);
  ok(num(stmt.body?.data?.totals?.unpaid_obligations) === PRICE, 'statement: unpaid obligations = price', `${num(stmt.body?.data?.totals?.unpaid_obligations)}`);

  // --- 2. deal sales-picture reflects the /sales settlement ---
  const pic = await req('GET', `/api/deals/${dealId}/sales-picture`);
  const pd = pic.body?.data;
  ok(pd?.linked === true && Number(pd?.settlement?.id) === Number(sid), 'sales-picture links deal → settlement', `linked=${pd?.linked} sid=${pd?.settlement?.id}`);
  ok(num(pd?.money?.drafted_fees?.commission_amount) === COMMISSION && num(pd?.money?.drafted_fees?.sale_value) === PRICE, 'sales-picture drafted fees', `commission ${num(pd?.money?.drafted_fees?.commission_amount)} / sale_value ${num(pd?.money?.drafted_fees?.sale_value)}`);

  // --- 3. bulk readiness lists it honestly (draft → not ready) ---
  const bulk = await req('GET', '/api/deals/settlement/sales-bulk-data');
  const bulkRow = (bulk.body?.data || []).find((r) => Number(r.deal_id) === Number(dealId));
  ok(!!bulkRow && bulkRow.status === 'draft' && bulkRow.ready === false, 'bulk readiness: draft, not ready to lock', bulkRow ? `status=${bulkRow.status} ready=${bulkRow.ready}` : 'row missing');

  // --- 4. buyer receipt records through the /sales payment endpoint ---
  const parties = uniqById(deepFind(fileData, (n) => (n.party_type === 'buyer' || n.party_type === 'vendor') && Number.isInteger(Number(n.id)) && n.transaction_id));
  const buyerParty = parties.find((p) => p.party_type === 'buyer');
  const vendorParty = parties.find((p) => p.party_type === 'vendor');
  const receipt = await req('POST', `/api/sales/settlements/${sid}/payments`, { body: { direction: 'incoming', payment_kind: 'buyer_receipt', transaction_party_id: buyerParty?.id, amount: 200000, reference: `E2E-REC-${STAMP}`, status: 'pending', method: 'bank_transfer' } });
  ok(receipt.status === 201, 'buyer receipt recorded (pending)', `HTTP ${receipt.status} ${receipt.status !== 201 ? JSON.stringify(receipt.body).slice(0, 120) : ''}`);

  // --- 5. createDisbursement full API path + obligation guard ---
  // A verified recipient bank account is a precondition; verification is a
  // separate-duty action the single test user cannot self-approve over HTTP, so
  // the row is flipped to verified directly as fixture setup.
  let bankOk = false; let bankId = null;
  if (vendorParty?.id) {
    const bank = await req('POST', `/api/sales/transaction-parties/${vendorParty.id}/bank-accounts`, { body: { bank_name: 'E2E Bank', account_name: `E2E Vendor ${STAMP}`, account_number: `ACC${STAMP}0001` } });
    bankId = bank.body?.data?.id;
    if (bankId) {
      try {
        const { PartyBankAccount } = require('../models/PartyBankAccount');
        await PartyBankAccount.update({ status: 'verified', verified_at: new Date(), verified_by: 1 }, { where: { id: bankId } });
        bankOk = true;
      } catch (e) { log('FAIL', 'verify vendor bank (fixture)', e.message); }
    }
  }
  ok(bankOk, 'verified vendor recipient bank (fixture)', `account #${bankId}`);

  if (bankOk && vendorLine) {
    const over = await req('POST', `/api/sales/settlements/${sid}/disbursements`, { body: { payee_type: 'vendor', transaction_party_id: vendorParty.id, settlement_line_id: vendorLine.id, party_bank_account_id: bankId, payout_method: 'manual_bank', amount: VENDOR_PROCEEDS + 1 } });
    ok(over.status === 409 && /exceeds/i.test(over.body?.error || ''), 'payout over its obligation is refused', `HTTP ${over.status} ${String(over.body?.error || '').slice(0, 80)}`);

    const good = await req('POST', `/api/sales/settlements/${sid}/disbursements`, { body: { payee_type: 'vendor', transaction_party_id: vendorParty.id, settlement_line_id: vendorLine.id, party_bank_account_id: bankId, payout_method: 'manual_bank', amount: VENDOR_PROCEEDS } });
    ok(good.status === 201 && good.body?.data?.status === 'prepared', 'exact-obligation payout is prepared', `HTTP ${good.status} status=${good.body?.data?.status}`);
  } else {
    log('FAIL', 'disbursement guard path', 'skipped — no verified bank / vendor line');
  }

  // --- 6. lock is refused on a draft settlement ---
  const lock = await req('POST', `/api/sales/settlements/${sid}/lock`, { body: {} });
  ok(lock.status === 409, 'lock refused on a draft settlement', `HTTP ${lock.status} ${String(lock.body?.error || '').slice(0, 80)}`);

  // --- 7. retired /deals money endpoints all 404 (items 12 + 14) ---
  const retired = [
    ['GET', `/api/deals/${dealId}/settlement`],
    ['GET', '/api/deals/settlement/bulk-data'],
    ['POST', '/api/deals/settlement/bulk'],
    ['POST', `/api/deals/${dealId}/settlement/receive`],
    ['POST', `/api/deals/${dealId}/settlement/approve`],
    ['POST', `/api/deals/${dealId}/disbursements`],
    ['POST', `/api/deals/${dealId}/settle`],
  ];
  for (const [m, p] of retired) {
    const r = await req(m, p, { body: {} });
    ok(r.status === 404, `retired ${m} ${p.replace(`/${dealId}`, '/:id')} → 404`, `HTTP ${r.status}`);
  }

  finish();
})().catch((e) => { log('FAIL', 'harness crashed', e.message); finish(); });
