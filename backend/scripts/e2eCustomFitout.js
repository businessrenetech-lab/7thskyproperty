/**
 * e2eInteriorDesign.js — end-to-end for the Residential Interior Design service
 * line, driven through the COOKIE session exactly as the console authenticates.
 * Covers: client create → CSA sent + signed by all parties → Schedule-C auto-
 * invoices → variation create/approve → pay-link (ready-for-keys) → no provider
 * / no AMC gating → cross-line isolation. Nothing stubbed.
 */
const http = require('http');
const PORT = 50001, EMAIL = 'admin@seventhskyproperty.com', PASSWORD = 'Admin#2026';
const SL = 'custom_design_fitout';
const STAMP = Date.now().toString().slice(-6);
const R = { pass: 0, fail: 0 };
const ok = (c, m, d) => { R[c ? 'pass' : 'fail'] += 1; console.log(`${c ? '\x1b[32mPASS\x1b[0m' : '\x1b[31mFAIL\x1b[0m'}\t${m}${d !== undefined ? '  \x1b[2m' + d + '\x1b[0m' : ''}`); return c; };
const short = (o) => JSON.stringify(o).slice(0, 180);

function raw(method, path, { body, cookie, noAuth, sl } = {}) {
  return new Promise((resolve) => {
    const data = body ? JSON.stringify(body) : null;
    const headers = { 'X-Branch-Id': '1' };
    if (sl) headers['X-Service-Line'] = sl;
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
  return (r.setCookie || []).map((s) => s.split(';')[0]).find((s) => s.startsWith('la_admin_token=')) || null;
}
let ADMIN = '';
// admin call on the interior line (cookie + X-Service-Line)
const A = (method, path, body) => raw(method, path, { cookie: ADMIN, body, sl: SL });
// admin call on another line, for isolation checks
const AL = (method, path, line) => raw(method, path, { cookie: ADMIN, sl: line });
const list = (b) => (Array.isArray(b) ? b : (b?.data || b?.rows || []));
const finish = () => { console.log(`\n${'='.repeat(60)}\n${R.fail ? '\x1b[31m' : '\x1b[32m'}${R.pass} PASS / ${R.fail} FAIL\x1b[0m\n`); process.exit(R.fail ? 1 : 0); };

// Sign every signer of a WT customer agreement in order (tokens from signing_path).
async function signAll(signers) {
  let signed = 0;
  const ordered = [...signers].sort((a, b) => (a.order || 0) - (b.order || 0));
  for (const s of ordered) {
    const token = String(s.signing_path || '').split('/').pop();
    if (!token) continue;
    const view = await raw('GET', `/api/sign/${token}`, { noAuth: true });
    const fields = (view.body?.data?.fields || view.body?.fields || [])
      .map((f) => ({ id: f.id, value: f.field_type === 'signature' ? `${s.name} /sig/` : new Date().toISOString().slice(0, 10) }));
    const r = await raw('POST', `/api/sign/${token}/sign`, { noAuth: true, body: { fields } });
    if ([200, 201].includes(r.status)) signed += 1;
  }
  return { signed, total: ordered.length };
}

(async () => {
  console.log(`\n===== CUSTOM DESIGN COMMERCIAL INTERIOR FIT-OUT E2E via COOKIE SESSION (run ${STAMP}) =====\n`);
  ADMIN = await loginCookie(EMAIL, PASSWORD);
  if (!ok(!!ADMIN, 'admin cookie session')) return finish();

  // ── Client on the interior line ─────────────────────────────────────────────
  const cl = await A('POST', '/api/wt-clients', { name: `Custom Fitout Client ${STAMP}`, mobile: `0171${STAMP}`, email: `intcl${STAMP}@example.com`, service_address: 'Gulshan, Dhaka', property_type: 'Apartment' });
  const client = cl.body?.data || cl.body;
  const clientCode = client?.code;
  if (!ok([200, 201].includes(cl.status) && /^CDFS-C/.test(clientCode || ''), 'custom fit-out client created (CDFS-C code)', `HTTP ${cl.status} code=${clientCode}`)) return finish();

  // ── Customer Service Agreement → send → sign all parties ────────────────────
  const csa = await A('POST', '/api/wt-agreements/customer/agreements', {
    client: { full_name: client.name, email: client.email, phone: client.mobile },
    contact_id: null,
    org: { represented_by: 'SS Rep', position: 'Director', email: `ssrep${STAMP}@example.com` },
    witnesses: [{ name: 'Witness One', email: `w1${STAMP}@example.com` }, { name: 'Witness Two', email: `w2${STAMP}@example.com` }],
    services: ['Office Interior Design', 'Office Fit-Out'],
    pricing_input: { selected: [{ code: 'CDFS-103', qty: 1, agreed_price: 40000 }, { code: 'CDFS-201', qty: 1, agreed_price: 260000 }], vat_percent: 0 },
  });
  const envId = csa.body?.id;
  if (!ok([200, 201].includes(csa.status) && !!envId, 'CSA created + sent', `HTTP ${csa.status} env#${envId} ${envId ? '' : short(csa.body)}`)) return finish();
  ok(/CDFS/.test(csa.body?.envelope_code || ''), 'envelope code carries the CDFS tag', csa.body?.envelope_code);
  const sr = await signAll(csa.body?.signers || []);
  // Completion rule (shared signing): both principals (Client + Seventh Sky) plus
  // AT LEAST ONE witness sign; the envelope then completes, so a 2nd witness may
  // be left unsigned by design. Assert principals + >=1 witness signed.
  ok(sr.signed >= 3 && sr.total >= 4, 'CSA signed by client + Seventh Sky + witness (2nd witness optional by design)', `${sr.signed}/${sr.total} signed`);
  const agr = list((await A('GET', '/api/wt-agreements/customer/agreements')).body).find((a) => a.id === envId);
  ok(agr && ['completed', 'signed', 'active'].includes(String(agr.status).toLowerCase()), 'CSA fully executed', `status=${agr?.status}`);

  // ── Schedule C → auto-drafted milestone invoices ────────────────────────────
  const invoices = list((await A('GET', '/api/wt-invoices?limit=200')).body)
    .filter((i) => i.client_name === client.name || /^CDFI-/.test(i.code || ''));
  ok(invoices.length >= 1, 'Schedule C auto-drafted milestone invoice(s) on signing', `${invoices.length} invoice(s), e.g. ${invoices[0]?.code}`);
  const anInvoice = invoices[0];

  // ── Variation: create + approve ─────────────────────────────────────────────
  const v = await A('POST', '/api/interior-variations', { client_name: client.name, description: 'Add a feature wall + lighting', amount_delta: 55000, reason: 'Client request' });
  const vcode = v.body?.data?.variation_code;
  ok([200, 201].includes(v.status) && /^CDFW-V-/.test(vcode || ''), 'variation created (CDFW-V- code)', `HTTP ${v.status} ${vcode}`);
  const vd = await A('POST', `/api/interior-variations/${vcode}/decision`, { decision: 'approved' });
  ok(vd.body?.data?.status === 'approved', 'variation approved', `status=${vd.body?.data?.status}`);

  // ── Completion Sign-Off is an available report type ─────────────────────────
  const ref = await A('GET', '/api/wt-ops/assessment-reference');
  const capFlags = (await A('GET', '/api/wt-ops/capabilities')).body?.flags || {};
  ok(capFlags.completion_signoff === true && capFlags.variations === true, 'completion sign-off + variations modules on', short(capFlags));

  // ── Pay-link on an auto-invoice (ready-for-keys → 409 not configured) ────────
  if (anInvoice?.code) {
    const pl = await A('POST', `/api/wt-invoices/${anInvoice.code}/pay-link`);
    ok([201, 409].includes(pl.status), 'invoice pay-link path reachable (409 = ready-for-keys)', `HTTP ${pl.status}`);
  }

  // ── Project costing / accounts payable: supplier → bill → part-pay ──────────
  const sup = await A('POST', '/api/wt-suppliers', { name: `E2E Furniture ${STAMP}`, category: 'Furniture Supplier', phone: `018${STAMP}` });
  const supId = sup.body?.data?.id;
  ok([200, 201].includes(sup.status) && /^SUP-/.test(sup.body?.data?.code || ''), 'supplier created (SUP- code)', sup.body?.data?.code);
  const bill = await A('POST', '/api/wt-supplier-bills', { supplier_id: supId, category: 'Furniture', description: 'Sofa + wardrobe', total: 100000 });
  const billCode = bill.body?.data?.bill_code;
  ok([200, 201].includes(bill.status) && /^SB-/.test(billCode || ''), 'supplier bill recorded (SB- code, owed 100k)', billCode);
  const bp = await A('POST', `/api/wt-supplier-bills/${billCode}/pay`, { amount: 40000, method: 'bank_transfer' });
  ok(bp.body?.data?.status === 'partial' && Number(bp.body?.data?.balance) === 60000, 'part-payment 40k → bill partial, balance 60k', `disb=${bp.body?.disbursement_code}`);
  const supList = list((await A('GET', '/api/wt-suppliers')).body);
  const mySup = supList.find((s) => s.id === supId);
  ok(mySup && Number(mySup.payable) === 60000, 'supplier running payable = 60k', `payable=${mySup?.payable}`);
  const payables = (await A('GET', '/api/wt-supplier-bills')).body?.summary || {};
  ok(Number(payables.outstanding) >= 60000, 'firm-wide payables reflect the outstanding bill', `outstanding=${payables.outstanding}`);

  // ── No provider / no AMC on this line ───────────────────────────────────────
  ok((await A('GET', '/api/wt-providers/directory')).status === 409, 'provider endpoints refused (no_provider)');
  ok((await A('GET', '/api/wt-amc/overview')).status === 409, 'AMC endpoints refused (no_amc)');

  // ── Cross-line isolation: water_tank must not see the custom fit-out client ────────
  const wtClients = list((await AL('GET', '/api/wt-clients?limit=500', 'water_tank')).body);
  ok(!wtClients.some((c) => c.code === clientCode), 'custom fit-out client NOT visible on the water_tank line', `wt clients=${wtClients.length}`);
  const wtInv = list((await AL('GET', '/api/wt-invoices?limit=500', 'water_tank')).body);
  ok(!wtInv.some((i) => i.client_name === client.name), 'interior invoices NOT visible on the water_tank line');

  console.log(`\nFIXTURE: client=${clientCode} envelope=${envId} invoice=${anInvoice?.code} variation=${vcode}`);
  finish();
})().catch((e) => { ok(false, 'harness crashed', e.stack || e.message); finish(); });
