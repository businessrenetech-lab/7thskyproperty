/**
 * e2eBuyerServiceFull.js — the buyer-SERVICE journey (fee-for-coordination, no
 * trust settlement), end to end over the real API:
 *
 *   buyer client → buyer mandate → approve to proceed → candidate property →
 *   shortlist/inspect → convert to a buy deal → deal file aggregate →
 *   8-stage residential_purchase SOP → risk review → non-trust settlement
 *   coordination → closure (financial-closure gate).
 *
 * The purchase agreement + KYC + fee-invoice drafting are covered by
 * e2eSalesAgreementFlow.js; this harness proves the buyer deal-file workflow.
 * Creates data; nothing is cleaned. Run: node scripts/e2eBuyerServiceFull.js
 */
const http = require('http');
const PORT = Number(process.env.PORT) || 50001;
const EMAIL = process.env.E2E_EMAIL || 'admin@seventhskyproperty.com';
const PASSWORD = process.env.E2E_PASSWORD || 'Admin#2026';
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
  console.log(`\n===== BUYER SERVICE JOURNEY E2E (run ${STAMP}) =====\n`);
  const login = await req('POST', '/api/auth/login', { noAuth: true, body: { email: EMAIL, password: PASSWORD } });
  TOKEN = login.body?.token || '';
  if (!ok(!!TOKEN, 'admin login', EMAIL)) return finish();

  // Buyer client
  const c = await req('POST', '/api/contacts', { body: { full_name: `E2E-Buysvc Buyer ${STAMP}`, primary_phone: `0199${STAMP}`, email: `buysvc${STAMP}@example.com`, contact_type: 'individual' } });
  const contactId = c.body?.data?.id;
  const cl = await req('POST', '/api/clients', { body: { contact_id: contactId, is_buyer: true } });
  const clientId = cl.body?.data?.id;
  if (!ok(!!contactId && !!clientId, 'buyer client created', `contact ${contactId}/client ${clientId}`)) return finish();

  // 1. Mandate
  const mandate = await req('POST', '/api/buyer-mandates', { body: { buyer_client_id: clientId, buyer_contact_id: contactId, budget_min: 8000000, budget_max: 15000000, areas: 'Gulshan, Banani', property_type: 'apartment', beds_min: 3, timeframe: '3 months', notes: 'E2E buyer mandate' } });
  const mandateId = mandate.body?.data?.id;
  if (!ok(!!mandateId, 'buyer mandate created', `#${mandateId} ${mandate.status}`)) { console.log('  ', short(mandate.body)); return finish(); }

  // 2. Approve to proceed to search
  const appr = await req('POST', `/api/buyer-mandates/${mandateId}/approve-to-proceed`, { body: { approved: true } });
  ok([200, 201].includes(appr.status), 'mandate approved to proceed', `HTTP ${appr.status}`);

  // 3. Candidate property → add, inspect
  const prop = await req('POST', '/api/properties', { body: { title: `E2E-Buysvc Target ${STAMP}`, category: 'residential', property_type: 'apartment', listing_type: 'sale', status: 'available', price: 12000000 } });
  const propId = prop.body?.data?.id;
  const cand = await req('POST', `/api/buyer-mandates/${mandateId}/candidates`, { body: { property_id: propId, fit_note: 'Good fit — matches area & budget' } });
  const candId = cand.body?.data?.id;
  if (!ok(!!candId, 'candidate property added', `cand #${candId} prop #${propId}`)) { console.log('  ', short(cand.body)); return finish(); }
  const patch = await req('PATCH', `/api/buyer-mandates/candidates/${candId}`, { body: { status: 'shortlisted', viewing_date: '2026-09-15', inspection_notes: 'Viewed — buyer keen' } });
  ok([200, 201].includes(patch.status), 'candidate shortlisted + inspection logged', `HTTP ${patch.status}`);

  // 4. Convert candidate → buy deal
  const conv = await req('POST', `/api/buyer-mandates/${mandateId}/candidates/${candId}/convert`, { body: { property_id: propId } });
  const dealId = conv.body?.data?.id || conv.body?.data?.deal?.id || conv.body?.deal?.id;
  if (!ok(!!dealId, 'candidate converted → buy deal', `deal #${dealId} ${conv.status} ${!dealId ? short(conv.body) : ''}`)) return finish();

  // 5. Deal file aggregate
  const deal = await req('GET', `/api/sales/deals/${dealId}`);
  const dd = deal.body?.data || deal.body;
  ok(deal.status === 200 && dd, 'buyer deal file aggregate loads', `keys=${dd ? Object.keys(dd).slice(0, 8).join(',') : 'none'}`);

  // 6. 8-stage residential_purchase SOP
  await req('POST', `/api/sales/deals/${dealId}/sop`, { body: {} }); // ensure
  const sop = await req('GET', `/api/sales/deals/${dealId}/sop`);
  const sd = sop.body?.data || sop.body;
  const stages = sd?.stages || sd?.project?.stages || [];
  const phases = new Set(stages.map((s) => s.phase).filter(Boolean));
  ok(sop.status === 200 && stages.length > 0, 'residential_purchase SOP seeded', `stages=${stages.length} phases=${[...phases].join('/') || 'n/a'}`);

  // 7. Risk review
  const risk = await req('PUT', `/api/sales/deals/${dealId}/risk`, { body: { risk_flags: ['title_check_pending'], acknowledge: true } });
  ok([200, 201].includes(risk.status), 'risk review saved', `HTTP ${risk.status}`);

  // 8. Non-trust settlement coordination
  const coordSave = await req('PUT', `/api/sales/deals/${dealId}/coordination`, { body: { agreement_date: '2026-09-20', registration_status: 'in_progress', external_settlement_date: '2026-10-15', handover_confirmed: false, notes: 'Coordinating with buyer solicitor' } });
  ok([200, 201].includes(coordSave.status), 'settlement coordination saved (non-trust)', `HTTP ${coordSave.status}`);
  const coordGet = await req('GET', `/api/sales/deals/${dealId}/coordination`);
  ok(coordGet.status === 200 && coordGet.body?.data?.registration_status === 'in_progress', 'coordination reads back', `status=${coordGet.body?.data?.registration_status}`);

  // 9. Closure — no fee invoices outstanding → financial closure passes
  const close = await req('POST', `/api/sales/deals/${dealId}/close`, { body: { buyer_feedback: 'Happy with the service', close: true } });
  ok(close.status === 200 && close.body?.data?.status === 'completed', 'deal closed (financial closure gate honoured)', `status=${close.body?.data?.status} fin_closed=${close.body?.data?.financial_closure_confirmed} outstanding=${close.body?.outstanding}`);

  console.log(`\nFIXTURE IDS: buyer=${contactId} client=${clientId} mandate=${mandateId} candidate=${candId} deal=${dealId} target=${propId} stamp=${STAMP}`);
  finish();
})().catch((e) => { log('FAIL', 'harness crashed', e.stack || e.message); finish(); });
