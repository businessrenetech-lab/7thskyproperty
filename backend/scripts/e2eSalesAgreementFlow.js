/**
 * e2eSalesAgreementFlow.js — end-to-end DEBUG harness for the sale + buyer-service
 * agreement/KYC/signing narrative (not the money path — that's the other e2e).
 *
 * Walks, over the REAL API on :50001, and reports PASS/FAIL + a GAP list:
 *   SALE side:
 *     property → sale profile → 2 vendors → party-role-profiles → KYC
 *       (vendor A by admin, vendor B via public link) → verify all →
 *       site assessment (create/submit/approve) → sale agreement with ALL vendors →
 *       sign (every vendor + Seventh Sky + witness) → signatures visible in signed doc →
 *       edit draft + resend → complete → fee invoices drafted.
 *   BUYER side:
 *     2 buyers → party-role-profiles → KYC (admin + link) → verify →
 *       purchase agreement with ALL buyers → sign all → signatures visible →
 *       complete → fee invoices drafted (this is "sale complete" for buyer service).
 *
 * Creates data tagged with a run stamp. Cleanup script prints IDs at the end.
 */
const http = require('http');

const PORT = Number(process.env.PORT) || 50001;
const HOST = '127.0.0.1';
const EMAIL = process.env.E2E_EMAIL || 'admin@seventhskyproperty.com';
const PASSWORD = process.env.E2E_PASSWORD || 'Admin#2026';
const STAMP = Date.now().toString().slice(-6);
const PRICE = 20000000;
const PCT = 2.5;

let TOKEN = '';
const R = { pass: 0, fail: 0 };
const GAPS = [];
function log(s, m, d) {
  R[s === 'PASS' ? 'pass' : 'fail'] += 1;
  const tag = s === 'PASS' ? '\x1b[32mPASS\x1b[0m' : '\x1b[31mFAIL\x1b[0m';
  console.log(`${tag}\t${m}${d !== undefined ? '  \x1b[2m' + d + '\x1b[0m' : ''}`);
}
const ok = (cond, m, d) => { log(cond ? 'PASS' : 'FAIL', m, d); return cond; };
const gap = (title, detail) => { GAPS.push({ title, detail }); console.log(`\x1b[33mGAP \x1b[0m\t${title}  \x1b[2m${detail || ''}\x1b[0m`); };

function req(method, path, opts = {}) {
  return new Promise((resolve) => {
    const data = opts.body ? JSON.stringify(opts.body) : null;
    const headers = { 'X-Branch-Id': '1' };
    if (!opts.noAuth) headers.Authorization = 'Bearer ' + (opts.token || TOKEN);
    if (data) { headers['Content-Type'] = 'application/json'; headers['Content-Length'] = Buffer.byteLength(data); }
    const r = http.request({ host: HOST, port: PORT, method, path, headers }, (x) => {
      let d = ''; x.on('data', (c) => { d += c; });
      x.on('end', () => { let j; try { j = JSON.parse(d); } catch { j = { _raw: d }; } resolve({ status: x.statusCode, body: j }); });
    });
    r.on('error', (e) => resolve({ status: 0, body: { error: e.message } }));
    if (data) r.write(data); r.end();
  });
}
const short = (o) => JSON.stringify(o).slice(0, 200);

// Create a contact + client(role) + party-role-profile. role: 'vendor' | 'buyer'
async function makeParty(role, name, email) {
  const isVendor = role === 'vendor';
  const c = await req('POST', '/api/contacts', { body: {
    full_name: name, contact_type: 'individual', primary_phone: `01${Math.floor(Math.random()*1e9)}`.slice(0, 11),
    email, national_id: `199${Math.floor(Math.random()*1e10)}`.slice(0, 13), address_line1: 'H1 R2', area: 'Gulshan', city: 'Dhaka', nationality: 'Bangladeshi',
  } });
  const contact = c.body?.data;
  if (!contact) return { error: 'contact', resp: c };
  const cl = await req('POST', '/api/clients', { body: { contact_id: contact.id, is_buyer: !isVendor, is_seller: isVendor } });
  const client = cl.body?.data;
  const pr = await req('POST', '/api/party-role-profiles', { body: { contact_id: contact.id, role_type: role } });
  const profile = pr.body?.data;
  return { contact, client, profile, prResp: pr, clResp: cl };
}

// Submit + verify all required KYC docs for a profile "as admin".
async function kycByAdmin(profile) {
  const rq = await req('GET', `/api/kyc/requirements/${profile.role_type}`);
  const reqs = (rq.body?.data || []).filter((x) => x.required);
  let submitted = 0, verified = 0;
  for (const item of reqs) {
    const post = await req('POST', '/api/kyc/documents', { body: {
      related_type: 'party_role', related_id: profile.id, party_role_profile_id: profile.id,
      role: profile.role_type, document_type: item.document_type, title: item.label,
      file_url: `uploads/documents/e2e-${STAMP}-${item.document_type}.pdf`, is_required: true,
    } });
    const doc = post.body?.data;
    if (doc?.id) { submitted++; const v = await req('PATCH', `/api/kyc/documents/${doc.id}/verify`, { body: { action: 'verify' } }); if ([200, 201].includes(v.status)) verified++; }
    else if (submitted === 0) console.log('   kyc post resp:', short(post.body));
  }
  return { total: reqs.length, submitted, verified };
}

// KYC via public registration link. Returns submitted doc count.
async function kycByLink(profile) {
  const link = await req('POST', `/api/party-role-profiles/${profile.id}/registration-link`, { body: {} });
  const linkUrl = link.body?.data?.link || link.body?.link || '';
  const token = link.body?.token || link.body?.data?.token || linkUrl.split('/').pop();
  if (!token) return { error: 'no token', resp: link };
  const view = await req('GET', `/api/public-party/register/${token}`, { noAuth: true });
  const reqs = view.body?.data?.document_requirements || [];
  const documents = reqs.filter((r) => r.required).map((r) => ({
    document_type: r.document_type, doc_type: r.document_type, title: r.label,
    file_url: `uploads/documents/e2e-link-${STAMP}-${r.document_type}.pdf`, is_required: true,
  }));
  const submit = await req('POST', `/api/public-party/register/${token}`, { noAuth: true, body: {
    national_id: `199${STAMP}0001`, documents,
  } });
  return { token, submitStatus: submit.status, reqCount: documents.length, submitBody: submit.body };
}

// Verify every submitted KYC doc for a profile (staff action).
async function verifyAllKyc(profile) {
  const docs = await req('GET', `/api/kyc/documents?related_type=party_role&related_id=${profile.id}&role=${profile.role_type}`);
  let verified = 0; const list = docs.body?.data || [];
  for (const d of list) {
    if (d.status === 'verified') { verified++; continue; }
    const v = await req('PATCH', `/api/kyc/documents/${d.id}/verify`, { body: { action: 'verify' } });
    if ([200, 201].includes(v.status)) verified++;
  }
  return { count: list.length, verified };
}

// Drive a full multi-signer signature run. Returns { completed, signedHtml }.
async function signEnvelope(envId) {
  // Admin links endpoint gives us tokens per signer (order + link).
  // But envelopeLinks hides nothing? It returns active_link only. We need each token.
  // Use the DB-free path: the public sign view is by token; get tokens from /links (all links have token in URL).
  const links = await req('GET', `/api/signing/envelopes/${envId}/links`);
  const list = links.body?.data?.links || [];
  const results = [];
  // sign in order
  for (const l of list.sort((a, b) => (a.order || 0) - (b.order || 0))) {
    const token = (l.link || '').split('/').pop();
    if (!token) { results.push({ name: l.name, status: 'no-token' }); continue; }
    const view = await req('GET', `/api/sign/${token}`, { noAuth: true });
    const fields = (view.body?.data?.fields || view.body?.fields || []).map((f) => ({
      id: f.id, value: f.field_type === 'signature' ? `${l.name} /sig/` : (f.field_type === 'date_signed' ? new Date().toISOString().slice(0, 10) : 'x'),
    }));
    const s = await req('POST', `/api/sign/${token}/sign`, { noAuth: true, body: { fields } });
    results.push({ name: l.name, role: l.role, order: l.order, status: s.status, body: s.body });
  }
  return results;
}

function finish() {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`${R.fail ? '\x1b[31m' : '\x1b[32m'}${R.pass} PASS / ${R.fail} FAIL\x1b[0m`);
  if (GAPS.length) {
    console.log(`\n\x1b[33m${GAPS.length} GAP(S) TO ADDRESS:\x1b[0m`);
    GAPS.forEach((g, i) => console.log(`  ${i + 1}. ${g.title} — ${g.detail || ''}`));
  }
  console.log('');
  process.exit(R.fail ? 1 : 0);
}

(async () => {
  console.log(`\n===== SALES + BUYER AGREEMENT/KYC/SIGN E2E (run ${STAMP}) =====\n`);
  const login = await req('POST', '/api/auth/login', { noAuth: true, body: { email: EMAIL, password: PASSWORD } });
  TOKEN = login.body?.token || '';
  if (!ok(!!TOKEN, 'admin login', EMAIL)) return finish();

  // ───────────────────────── SALE SIDE ─────────────────────────
  console.log('\n--- SALE SIDE (multi-vendor) ---');
  const v1 = await makeParty('vendor', `E2E Vendor A ${STAMP}`, `vendorA${STAMP}@example.com`);
  const v2 = await makeParty('vendor', `E2E Vendor B ${STAMP}`, `vendorB${STAMP}@example.com`);
  ok(!!v1.profile && !!v2.profile, '2 vendors: contact+client+profile', `pA=${v1.profile?.id} pB=${v2.profile?.id}`);
  if (!v1.profile) console.log('   v1:', short(v1.prResp?.body || v1.clResp?.body));

  const prop = await req('POST', '/api/properties', { body: { title: `E2E Sale Flat ${STAMP}`, category: 'residential', property_type: 'apartment', listing_type: 'sale', status: 'available', price: PRICE, owner_contact_id: v1.contact?.id } });
  const propId = prop.body?.data?.id;
  ok(!!propId, 'sale property created + listed', `#${propId} status=${prop.body?.data?.status}`);

  const profileRes = await req('PUT', `/api/sales/properties/${propId}/profile`, { body: { agency_type: 'exclusive', commission_percent: PCT } });
  ok([200, 201].includes(profileRes.status), 'sale profile w/ commission', `${PCT}%`);

  // KYC — vendor A by admin, vendor B via link
  const kA = await kycByAdmin(v1.profile);
  ok(kA.verified === kA.total && kA.total > 0, 'vendor A KYC by admin: submitted+verified', `${kA.verified}/${kA.total}`);
  const kB = await kycByLink(v2.profile);
  ok(kB.submitStatus && [200, 201].includes(kB.submitStatus), 'vendor B KYC via public link submitted', `HTTP ${kB.submitStatus} docs=${kB.reqCount}`);
  if (![200, 201].includes(kB.submitStatus)) console.log('   link submit:', short(kB.submitBody || kB.resp?.body));
  const kBv = await verifyAllKyc(v2.profile);
  ok(kBv.verified > 0 && kBv.verified === kBv.count, 'vendor B KYC verified by staff', `${kBv.verified}/${kBv.count}`);

  // Site assessment
  const asmt = await req('POST', `/api/sales/properties/${propId}/assessments`, { body: { assessment_type: 'sale', notes: 'E2E assessment', occupancy_status: 'vacant', overall_score: 80, marketability_score: 75 } });
  const asmtId = asmt.body?.data?.id;
  if (ok(!!asmtId, 'site assessment created', `#${asmtId} HTTP ${asmt.status}`)) {
    // Creating an assessment auto-seeds a checklist; every item must be completed
    // (not 'not_assessed') and any critical item / blocker resolved before submit.
    const ws = await req('GET', `/api/sales/properties/${propId}/assessment-workspace`);
    const items = ws.body?.data?.assessment?.items || ws.body?.assessment?.items || [];
    let done = 0;
    for (const item of items) {
      const u = await req('PUT', `/api/sales/assessment-items/${item.id}`, { body: { condition_status: 'good', priority: 'low', is_clean: true, is_undamaged: true, is_working: true } });
      if ([200, 201].includes(u.status)) done++;
    }
    ok(done === items.length && items.length > 0, 'assessment checklist completed', `${done}/${items.length} items`);
    const sub = await req('POST', `/api/sales/assessments/${asmtId}/submit`, { body: {} });
    ok([200, 201].includes(sub.status), 'assessment submitted', `HTTP ${sub.status}`);
    const appr = await req('POST', `/api/sales/assessments/${asmtId}/approve`, { body: {} });
    ok([200, 201].includes(appr.status), 'assessment approved', `HTTP ${appr.status} ${appr.status >= 400 ? short(appr.body) : ''}`);
  } else { console.log('   assessment resp:', short(asmt.body)); }

  // SALE agreement — attempt MULTIPLE sellers
  const sellers = [
    { full_name: v1.contact.full_name, email: v1.contact.email, contact_id: v1.contact.id },
    { full_name: v2.contact.full_name, email: v2.contact.email, contact_id: v2.contact.id },
  ];
  const agrBody = {
    property_id: propId,
    client: sellers[0], client_contact_id: sellers[0].contact_id,
    clients: sellers, // multi-party (new) — harmless if ignored
    sellers,
    org: { represented_by: 'Seventh Sky Rep', rep_position: 'Sales Director', email: 'rep@seventhsky.com' },
    witnesses: [{ name: 'E2E Witness', email: `witness${STAMP}@example.com` }],
    pricing_input: { selected: [], discount: 0, vat_percent: 0, commission: { mode: 'percent', percent: PCT, base_price: PRICE } },
    schedule_b: { target_value: PRICE, commission_percent: PCT },
    commission_percent: PCT,
    save_as_draft: false,
  };
  const agr = await req('POST', '/api/sales-agreements/sale/agreements', { body: agrBody });
  const envId = agr.body?.id;
  ok(!!envId, 'sale agreement created + sent', `env#${envId} code=${agr.body?.envelope_code} signers=${(agr.body?.links||[]).length}`);
  if (!envId) { console.log('   agr resp:', short(agr.body)); }

  // How many CLIENT (seller) signers exist? Multi-party check.
  if (envId) {
    const clientSigners = (agr.body?.links || []).filter((l) => l.role === 'client');
    if (clientSigners.length < sellers.length) gap('Multi-vendor signing not supported', `${clientSigners.length} client signer(s) for ${sellers.length} sellers — only the primary can sign`);
    else ok(true, 'all vendors are signers', `${clientSigners.length} client signers`);

    // Sign the full chain
    const signResults = await signEnvelope(envId);
    const signedCount = signResults.filter((r) => [200, 201].includes(r.status)).length;
    ok(signedCount === signResults.length, 'all signers signed in order', `${signedCount}/${signResults.length}`);
    signResults.filter((r) => ![200, 201].includes(r.status)).forEach((r) => console.log(`   signer ${r.name} (${r.role}) → HTTP ${r.status} ${short(r.body)}`));

    // Envelope should be completed
    const env = await req('GET', `/api/signing/envelopes/${envId}`);
    const status = env.body?.data?.status || env.body?.status;
    ok(status === 'completed', 'sale agreement completed', `status=${status}`);

    // Signed document should contain each signer's signature value
    const linksAfter = await req('GET', `/api/signing/envelopes/${envId}/links`);
    const firstToken = (linksAfter.body?.data?.links?.[0]?.link || '').split('/').pop();
    if (firstToken) {
      const signed = await req('GET', `/api/sign/${firstToken}/signed-document`, { noAuth: true });
      const html = typeof signed.body === 'string' ? signed.body : (signed.body?._raw || '');
      const names = sellers.map((s) => s.full_name);
      const present = names.filter((n) => html.includes(n) && html.includes('/sig/'));
      ok(html.includes('/sig/'), 'signed doc renders signature marks', `sigMark=${html.includes('/sig/')}`);
      names.forEach((n) => { if (!html.includes(n)) gap('Vendor signature missing on signed doc', n); });
    }

    // Fee invoices drafted on completion
    const inv = await req('GET', `/api/invoices?property_id=${propId}`);
    const invList = inv.body?.data || inv.body?.invoices || (Array.isArray(inv.body) ? inv.body : []);
    ok(Array.isArray(invList) && invList.length > 0, 'sale: fee invoices drafted on completion', `count=${Array.isArray(invList) ? invList.length : 'n/a'} (HTTP ${inv.status})`);
  }

  // Edit draft + resend (make a fresh draft agreement, edit it, send it)
  const draft = await req('POST', '/api/sales-agreements/sale/agreements', { body: { ...agrBody, save_as_draft: true } });
  const draftId = draft.body?.id;
  if (ok(!!draftId, 'draft agreement created', `#${draftId}`)) {
    const edit = await req('PUT', `/api/sales-agreements/sale/agreements/${draftId}`, { body: { ...agrBody, save_as_draft: true, schedule_b: { target_value: PRICE + 500000, commission_percent: PCT } } });
    ok([200].includes(edit.status), 'draft edited', `HTTP ${edit.status}`);
    const send = await req('POST', `/api/sales-agreements/sale/agreements/${draftId}/send`, { body: {} });
    ok([200].includes(send.status), 'edited draft resent', `HTTP ${send.status} ${send.status >= 400 ? short(send.body) : ''}`);
  }

  // ───────────────────────── BUYER SIDE ─────────────────────────
  console.log('\n--- BUYER SERVICE SIDE (multi-buyer) ---');
  const b1 = await makeParty('buyer', `E2E Buyer A ${STAMP}`, `buyerA${STAMP}@example.com`);
  const b2 = await makeParty('buyer', `E2E Buyer B ${STAMP}`, `buyerB${STAMP}@example.com`);
  ok(!!b1.profile && !!b2.profile, '2 buyers: contact+client+profile', `pA=${b1.profile?.id} pB=${b2.profile?.id}`);

  const kbA = await kycByAdmin(b1.profile);
  ok(kbA.verified === kbA.total && kbA.total > 0, 'buyer A KYC by admin verified', `${kbA.verified}/${kbA.total}`);
  const kbB = await kycByLink(b2.profile);
  ok([200, 201].includes(kbB.submitStatus), 'buyer B KYC via link submitted', `HTTP ${kbB.submitStatus}`);
  const kbBv = await verifyAllKyc(b2.profile);
  ok(kbBv.verified > 0, 'buyer B KYC verified', `${kbBv.verified}/${kbBv.count}`);

  const buyers = [
    { full_name: b1.contact.full_name, email: b1.contact.email, contact_id: b1.contact.id },
    { full_name: b2.contact.full_name, email: b2.contact.email, contact_id: b2.contact.id },
  ];
  const pAgrBody = {
    property_id: propId,
    client: buyers[0], client_contact_id: buyers[0].contact_id,
    clients: buyers, buyers,
    org: { represented_by: 'Seventh Sky Rep', rep_position: 'Sales Director', email: 'rep@seventhsky.com' },
    witnesses: [{ name: 'E2E Witness', email: `pwitness${STAMP}@example.com` }],
    pricing_input: { selected: [], discount: 0, vat_percent: 0, commission: { mode: 'percent', percent: PCT, base_price: PRICE } },
    schedule_b: { target_value: PRICE }, save_as_draft: false,
  };
  const pAgr = await req('POST', '/api/sales-agreements/purchase/agreements', { body: pAgrBody });
  const pEnvId = pAgr.body?.id;
  ok(!!pEnvId, 'purchase agreement created + sent', `env#${pEnvId} signers=${(pAgr.body?.links||[]).length}`);
  if (pEnvId) {
    const buyerSigners = (pAgr.body?.links || []).filter((l) => l.role === 'client');
    if (buyerSigners.length < buyers.length) gap('Multi-buyer signing not supported', `${buyerSigners.length} client signer(s) for ${buyers.length} buyers`);
    const sr = await signEnvelope(pEnvId);
    const sc = sr.filter((r) => [200, 201].includes(r.status)).length;
    ok(sc === sr.length, 'all buyers signed', `${sc}/${sr.length}`);
    const env = await req('GET', `/api/signing/envelopes/${pEnvId}`);
    ok((env.body?.data?.status || env.body?.status) === 'completed', 'purchase agreement completed (= sale complete for buyer service)', `status=${env.body?.data?.status || env.body?.status}`);
    const inv = await req('GET', `/api/invoices?property_id=${propId}`);
    const invList = inv.body?.data || inv.body?.invoices || (Array.isArray(inv.body) ? inv.body : []);
    ok(Array.isArray(invList) && invList.length > 0, 'buyer: fee invoices drafted after purchase agreement signed', `count=${Array.isArray(invList) ? invList.length : 'n/a'}`);
  }

  console.log(`\nFIXTURE IDS: prop=${propId} vendors=[${v1.contact?.id},${v2.contact?.id}] buyers=[${b1.contact?.id},${b2.contact?.id}] stamp=${STAMP}`);
  finish();
})().catch((e) => { console.error('HARNESS ERROR', e); process.exit(2); });
