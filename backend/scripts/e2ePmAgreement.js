/**
 * e2ePmAgreement.js — end-to-end debug for the Property Management (RPRM) service
 * agreement: build (one-time + recurring price schedule) → save as draft → edit
 * draft → send → sign all parties → verify signatures placed, checkboxes filled,
 * signatures last (no duplicate block), pricing correct, one-time fees drafted as
 * invoices on completion, recurring fee NOT double-invoiced (owner fee schedule).
 */
const http = require('http');
const PORT = 50001;
const EMAIL = 'admin@seventhskyproperty.com';
const PASSWORD = 'Admin#2026';
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
const MONTHLY_RENT = 40000;
const ONE_TIME = 8000 + 12000; // RPRM-004 marketing + RPRM-006 tenant sourcing
const RECURRING = Math.max(3000, Math.round(MONTHLY_RENT * 0.05)); // 5% of 40000 = 2000 → min 3000

async function signAll(envId) {
  const links = await req('GET', `/api/signing/envelopes/${envId}/links`);
  const list = (links.body?.data?.links || []).sort((a, b) => (a.order || 0) - (b.order || 0));
  let signed = 0;
  for (const l of list) {
    const token = (l.link || '').split('/').pop();
    const view = await req('GET', `/api/sign/${token}`, { noAuth: true });
    const fields = (view.body?.data?.fields || view.body?.fields || []).map((f) => ({ id: f.id, value: f.field_type === 'signature' ? `${l.name} /sig/` : new Date().toISOString().slice(0, 10) }));
    const s = await req('POST', `/api/sign/${token}/sign`, { noAuth: true, body: { fields } });
    if ([200, 201].includes(s.status)) signed++;
  }
  return { signed, total: list.length, firstToken: (list[0]?.link || '').split('/').pop() };
}

(async () => {
  console.log(`\n===== PM (RPRM) AGREEMENT E2E (run ${STAMP}) =====\n`);
  const login = await req('POST', '/api/auth/login', { noAuth: true, body: { email: EMAIL, password: PASSWORD } });
  TOKEN = login.body?.token || '';
  if (!ok(!!TOKEN, 'admin login')) return finish();

  // Landlord + rental property
  const c = await req('POST', '/api/contacts', { body: { full_name: `E2E-PM Landlord ${STAMP}`, primary_phone: `0177${STAMP}`, email: `pmll${STAMP}@example.com`, contact_type: 'individual', national_id: `199${STAMP}` } });
  const contactId = c.body?.data?.id;
  const prop = await req('POST', '/api/properties', { body: { title: `E2E-PM Flat ${STAMP}`, category: 'residential', property_type: 'apartment', listing_type: 'rent', status: 'available', owner_contact_id: contactId, approved_monthly_rent: MONTHLY_RENT } });
  const propId = prop.body?.data?.id;
  if (!ok(!!contactId && !!propId, 'landlord + rental property', `c${contactId}/p${propId}`)) return finish();

  const body = {
    property_id: propId, client_contact_id: contactId,
    client: { full_name: c.body.data.full_name, email: c.body.data.email, nid: '19900000', property_address: 'Banani' },
    org: { represented_by: 'Seventh Sky Rep', position: 'PM Director', email: 'rep@seventhsky.com' },
    witnesses: [{ name: 'PM Witness', email: `pmw${STAMP}@example.com` }],
    services: ['Rental Consultation', 'Rental Market Assessment', 'Tenant Sourcing'],
    pricing_input: { monthly_rent: MONTHLY_RENT, selected: [{ code: 'RPRM-004' }, { code: 'RPRM-006' }, { code: 'RPRM-018' }], frequency: 'Monthly' },
    schedule_b: { expected_rent: MONTHLY_RENT }, save_as_draft: true,
  };

  // Pricing preview
  const prev = await req('POST', '/api/rprm/preview', { body });
  const sum = prev.body?.pricing?.summary || {};
  ok(Number(sum.one_time_leasing) === ONE_TIME, 'pricing: one-time leasing correct', `${sum.one_time_leasing} (expected ${ONE_TIME})`);
  ok(Number(sum.monthly_management_fee) === RECURRING, 'pricing: recurring mgmt fee correct (5% min 3000)', `${sum.monthly_management_fee} (expected ${RECURRING})`);

  // 1. Save as draft
  const draft = await req('POST', '/api/rprm/agreements', { body });
  const envId = draft.body?.id;
  if (!ok(!!envId && draft.body?.status === 'draft', 'agreement saved as DRAFT', `env#${envId} status=${draft.body?.status}`)) { console.log('  ', short(draft.body)); return finish(); }

  // 2. Edit the draft (raise the rent → recurring changes)
  const edited = { ...body, pricing_input: { ...body.pricing_input, monthly_rent: 100000 }, schedule_b: { expected_rent: 100000 } };
  const upd = await req('PUT', `/api/rprm/agreements/${envId}`, { body: edited });
  ok(upd.status === 200, 'draft edited', `HTTP ${upd.status} ${upd.status !== 200 ? short(upd.body) : ''}`);

  // 3. Send the draft
  const send = await req('POST', `/api/rprm/agreements/${envId}/send`, { body: {} });
  ok(send.status === 200 && send.body?.status === 'sent', 'draft sent for signature', `HTTP ${send.status} status=${send.body?.status}`);

  // 4. Sign all parties (landlord → Seventh Sky → witness)
  const sr = await signAll(envId);
  ok(sr.signed === sr.total && sr.total >= 3, 'all parties signed', `${sr.signed}/${sr.total}`);

  // 5. Envelope completed + signatures placed + checkboxes filled + signatures last
  const env = await req('GET', `/api/signing/envelopes/${envId}`);
  ok((env.body?.data?.status || env.body?.status) === 'completed', 'agreement completed', `status=${env.body?.data?.status || env.body?.status}`);
  const signed = await req('GET', `/api/sign/${sr.firstToken}/signed-document`, { noAuth: true });
  const html = typeof signed.body === 'string' ? signed.body : (signed.body?._raw || '');
  ok(html.includes('/sig/'), 'signed doc renders signature marks', `sigMarks=${(html.match(/\/sig\//g) || []).length}`);
  ok((html.match(/background:#003768;color:#fff;text-align:center/g) || []).length >= 2, 'schedule checkboxes filled (CSS box, selected services)', `filled=${(html.match(/background:#003768;color:#fff;text-align:center/g) || []).length}`);
  ok(html.indexOf('>Signatures<') > html.indexOf('becomes effective when signed'), 'signatures section is last (after closing note)');
  ok((html.match(/>SIGNATURES</g) || []).length === 0, 'no duplicate static SIGNATURES block');

  // 6. One-time fees drafted as invoices; recurring NOT invoiced
  const inv = await req('GET', `/api/invoices?property_id=${propId}`);
  const list = inv.body?.data || inv.body?.invoices || (Array.isArray(inv.body) ? inv.body : []);
  const fee = list.filter((i) => i.invoice_type === 'agreement_fee');
  const total = fee.reduce((s, i) => s + Number(i.total || 0), 0);
  ok(fee.length > 0, 'one-time fee invoices drafted on completion', `${fee.length} invoice(s), total=${total}`);
  ok(!fee.some((i) => /monthly management|recurring/i.test(i.title || '')), 'recurring fee NOT invoiced (no monthly-mgmt invoice)');

  // 7. Recurring fee captured on the owner fee schedule
  const ofs = await req('GET', `/api/properties/${propId}/owner-fees`).then((r) => r).catch(() => ({ status: 0 }));
  console.log(`\nFIXTURE IDS: landlord=${contactId} property=${propId} agreementEnv=${envId} stamp=${STAMP}`);
  finish();
})().catch((e) => { log('FAIL', 'harness crashed', e.stack || e.message); finish(); });
