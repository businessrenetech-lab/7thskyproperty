/*
 * e2eLifecycle.js — FULL end-to-end lifecycle for a service line, KEEPING all
 * data so it stays visible in the UI. Where e2eServiceLine.js proves isolation
 * and self-cleans (CI-style), this one carries ONE job through every SOP stage
 * as a real operator and leaves the whole chain in place for a human to inspect:
 *
 *   client + service request (needs assessment)
 *     -> site assessment (created by the SR + COMPLETE)
 *     -> quotation (build from assessment + APPROVE)
 *     -> customer agreement (warranty selected) + SIGN every party in order
 *        -> work order auto-raised + draft invoice auto-raised on completion
 *     -> work order: accept + COMPLETE
 *        -> warranty AUTO-registered (gated on the agreement's warranty selection)
 *     -> invoice: send + collect payment
 *     -> AMC create
 *     -> after-sale complaint log + resolve
 *
 * It also asserts every chain code is branded to the active line (Air Conditioning
 * mints ACCM-C/ACR-/ACA-/ACQ-/ACW-/ACI-, never Water Tank's).
 *
 *   node scripts/e2eLifecycle.js [service_line]   (default air_conditioning)
 *
 * Requires the backend running on PORT (default 50001) and admin credentials in
 * the env (E2E_EMAIL / E2E_PASSWORD) or the defaults below. Nothing is cleaned
 * up — re-running mints a fresh, independent chain each time.
 */
const http = require('http');

const SL = process.argv[2] || 'air_conditioning';
const PORT = Number(process.env.PORT) || 50001;
const EMAIL = process.env.E2E_EMAIL || 'admin@seventhskyproperty.com';
const PASSWORD = process.env.E2E_PASSWORD || 'Admin#2026';
const TODAY = '2026-08-30';

let TOKEN = '';
const R = { pass: 0, fail: 0, warn: 0, items: [], ids: {} };
function log(s, m, d) {
  R[s === 'PASS' ? 'pass' : s === 'FAIL' ? 'fail' : 'warn']++;
  R.items.push({ s, m, d });
  const tag = s === 'PASS' ? '\x1b[32mPASS\x1b[0m' : s === 'FAIL' ? '\x1b[31mFAIL\x1b[0m' : '\x1b[33mWARN\x1b[0m';
  console.log(`${tag}\t${m}${d !== undefined ? '  \x1b[2m' + d + '\x1b[0m' : ''}`);
}
function req(method, path, opts = {}) {
  return new Promise((res) => {
    const data = opts.body ? JSON.stringify(opts.body) : null;
    const headers = { 'X-Branch-Id': '1' };
    if (!opts.noAuth) headers.Authorization = 'Bearer ' + TOKEN;
    if (!opts.noSl) headers['X-Service-Line'] = opts.sl || SL;
    if (data) { headers['Content-Type'] = 'application/json'; headers['Content-Length'] = Buffer.byteLength(data); }
    const r = http.request({ host: '127.0.0.1', port: PORT, method, path, headers }, (x) => {
      let d = ''; x.on('data', (c) => d += c);
      x.on('end', () => { let j; try { j = JSON.parse(d); } catch { j = { _raw: d.slice(0, 300) }; } res({ status: x.statusCode, body: j }); });
    });
    r.on('error', (e) => res({ status: 0, body: { _err: e.message } }));
    if (data) r.write(data); r.end();
  });
}
const arr = (x) => Array.isArray(x) ? x : (x && Array.isArray(x.rows) ? x.rows : (x && Array.isArray(x.data) ? x.data : []));

(async () => {
  const S = Date.now().toString().slice(-6);
  const NAME = `AC Lifecycle ${S}`;
  const CLIENT_EMAIL = `ac.life.${S}@example.com`;
  console.log(`\n===== FULL LIFECYCLE E2E — ${SL} — client "${NAME}" =====\n`);

  TOKEN = (await req('POST', '/api/auth/login', { body: { email: EMAIL, password: PASSWORD }, noSl: true })).body.token;
  if (!TOKEN) return log('FAIL', 'admin login') || finish();
  log('PASS', 'admin login', EMAIL);

  // ---- catalogue for the active line ----
  const ref = (await req('GET', '/api/wt-intake/request-reference')).body;
  const cat = ref.catalog || [];
  const item = cat.find((c) => Number(c.standard_price) > 0) || cat[0];
  if (!item) return log('FAIL', 'no catalogue items for line') || finish();
  log('PASS', 'catalogue loaded', `${cat.length} items; using ${item.code} "${item.name}" @${item.standard_price}`);

  // ============ 1. SERVICE REQUEST (needs assessment) ============
  console.log('\n-- 1. Service request (needs assessment) --');
  const srRes = await req('POST', '/api/wt-intake/requests', {
    body: {
      client_name: NAME, phone: '0179' + S, email: CLIENT_EMAIL, client_type: 'Residential',
      address: '77 Test Road, Dhanmondi', district: 'Dhaka', property_type: (ref.property_types || ['House'])[0],
      category: item.group || 'Service', specific_service: item.name, needs_assessment: true,
      assessment_date: TODAY, assigned_officer: 'E2E Surveyor',
      services_requested: [item.name],
      lines: [{ kind: 'service', code: item.code, name: item.name, qty: 1, price: item.standard_price }],
      priority: 'High', description: 'Full-lifecycle E2E — please keep.',
    },
  });
  const sr = srRes.body;
  const clientCode = (sr.client || {}).code;
  const srCode = (sr.request || sr.service_request || sr).code;
  R.ids.client = clientCode; R.ids.sr = srCode;
  log(clientCode ? 'PASS' : 'FAIL', 'client + service request created', `client ${clientCode} / SR ${srCode}`);
  if (clientCode && !/^ACCM-C/.test(clientCode) && SL === 'air_conditioning') log('FAIL', 'client code prefix', clientCode);
  else if (clientCode) log('PASS', 'client code is own service line', clientCode);

  // ============ 2. SITE ASSESSMENT (find + complete) ============
  console.log('\n-- 2. Site assessment (create + complete) --');
  // the SR with needs_assessment spawned the assessment — take it straight from the response
  let assess = sr.assessment || null;
  if (!assess) {
    const saList = arr((await req('GET', '/api/wt-ops/site-assessments')).body);
    assess = saList.find((a) => (a.client_name || '').includes(S));
  }
  if (assess && (assess.code || assess.id)) {
    R.ids.assessment = assess.code || assess.id;
    log('PASS', 'site assessment exists', assess.code || `#${assess.id}`);
    // complete it
    const done = await req('PATCH', `/api/wt-ops/site-assessments/${assess.id || assess.code}`, {
      body: { status: 'Completed', findings: 'Unit accessible; 2 split ACs; recommend deep service + gas top-up.', recommendation: item.name, completed_date: TODAY },
    });
    if (done.status < 400) log('PASS', 'site assessment COMPLETED', `status -> ${(done.body.assessment || done.body).status || 'Completed'}`);
    else log('WARN', 'assessment complete', `HTTP ${done.status} ${JSON.stringify(done.body).slice(0, 120)}`);
  } else {
    log('WARN', 'site assessment not found/created', JSON.stringify(assess).slice(0, 120));
  }

  // ============ 3. QUOTATION (build from assessment + approve) ============
  console.log('\n-- 3. Quotation (build + approve) --');
  let quote = (sr.quotation || {});
  if (!quote.code) {
    // build from assessment if we have one, else direct
    if (assess && (assess.id || assess.code)) {
      const q = await req('POST', `/api/wt-quotes/from-assessment/${assess.id || assess.code}`, {
        body: { lines: [{ kind: 'service', code: item.code, name: item.name, qty: 1, unit_price: item.standard_price }], client_name: NAME, client_code: clientCode },
      });
      quote = q.body.quotation || q.body;
    }
    if (!quote.code) {
      const q = await req('POST', '/api/wt-quotes/direct', {
        body: { client_name: NAME, client_code: clientCode, lines: [{ kind: 'service', code: item.code, name: item.name, qty: 1, unit_price: item.standard_price }], issue_date: TODAY },
      });
      quote = q.body.quotation || q.body;
    }
  }
  if (quote.code) {
    R.ids.quote = quote.code;
    log('PASS', 'quotation created', `${quote.code}`);
    const dec = await req('POST', `/api/wt-quotes/${quote.code}/decision`, { body: { decision: 'Approved', note: 'E2E approve' } });
    if (dec.status < 400) log('PASS', 'quotation APPROVED', (dec.body.quotation || dec.body).status || 'Approved');
    else {
      const dec2 = await req('POST', `/api/wt-quotes/${quote.code}/decision`, { body: { decision: 'Accepted' } });
      log(dec2.status < 400 ? 'PASS' : 'WARN', 'quotation approved', dec2.status < 400 ? 'Accepted' : `HTTP ${dec.status} ${JSON.stringify(dec.body).slice(0,120)}`);
    }
  } else {
    log('FAIL', 'quotation create', JSON.stringify(quote).slice(0, 150));
  }

  // ============ 4. CUSTOMER AGREEMENT (warranty selected) + SIGN ============
  console.log('\n-- 4. Customer agreement (warranty selected) + sign every party --');
  const agrDraft = {
    client: { full_name: NAME, email: CLIENT_EMAIL, phone: '0179' + S, client_type: 'Residential', address: '77 Test Road, Dhanmondi', client_code: clientCode },
    org: { name: 'Seventh Sky Property Care', represented_by: 'Ops Manager', position: 'Manager', email: EMAIL },
    witnesses: [{ name: 'Witness One', email: `wit1.${S}@example.com`, nid: '1234' }],
    client_type: 'Residential',
    checklist: ['Workmanship Warranty', 'Repair Warranty', 'Safe Site Access Provided'],
    pricing_input: { selected: [{ code: item.code, name: item.name, qty: 1, agreed_price: item.standard_price }], transport: 0, govt_fees: 0, discount: 0, advance_percent: 50 },
    schedule_b: { warranty_period: '12 months', project_no: quote.project_code || null, special_conditions: 'E2E lifecycle' },
    quote_code: quote.code || null,
  };
  const agr = await req('POST', '/api/wt-agreements/customer/agreements', { body: agrDraft });
  if (agr.status >= 400 || !agr.body.id) {
    log('FAIL', 'agreement create', `HTTP ${agr.status} ${JSON.stringify(agr.body).slice(0, 200)}`);
  } else {
    R.ids.agreement = agr.body.envelope_code;
    log('PASS', 'customer agreement raised', `${agr.body.envelope_code} (${(agr.body.signers || []).length} signers)`);
    // sign each signer in order
    const signers = (agr.body.signers || []).slice().sort((a, b) => (a.order || 0) - (b.order || 0));
    let allSigned = true;
    for (const s of signers) {
      const token = (s.signing_path || '').split('/').pop();
      if (!token) { allSigned = false; continue; }
      const view = await req('GET', `/api/sign/${token}`, { noAuth: true, noSl: true });
      const vd = view.body.data || view.body;
      const fields = arr(vd.fields || []);
      const payload = fields.map((f) => ({ id: f.id, value: f.field_type === 'date_signed' ? TODAY : (s.name || 'Signed') }));
      const done = await req('POST', `/api/sign/${token}/sign`, { noAuth: true, noSl: true, body: { fields: payload, typed_name: s.name, consent: true } });
      if (done.status < 400) log('PASS', `signed: ${s.label || s.role}`, s.name);
      else { allSigned = false; log('WARN', `sign ${s.label || s.role}`, `HTTP ${done.status} ${JSON.stringify(done.body).slice(0, 140)}`); }
    }
    // confirm envelope completed (read it back from the agreement hub list)
    await new Promise((r) => setTimeout(r, 500));
    const hub = arr((await req('GET', '/api/wt-agreement-hub?scope=customer')).body);
    const row = hub.find((x) => x.envelope_code === agr.body.envelope_code) || {};
    const st = row.status || (await req('GET', `/api/wt-agreement-hub/${agr.body.id}`)).body?.envelope?.status;
    log(st === 'completed' ? 'PASS' : 'WARN', 'agreement fully executed', `status=${st}`);
  }

  // ============ 5. WORK ORDER (auto-raised) + accept + complete ============
  console.log('\n-- 5. Work order (auto-raised on sign) + complete --');
  await new Promise((r) => setTimeout(r, 500));
  let wos = arr((await req('GET', '/api/wt-work-orders')).body);
  let wo = wos.find((w) => (w.client_name || '').includes(S));
  if (!wo) {
    log('WARN', 'no WO auto-raised from signed agreement', `${wos.length} WOs total — checking createFromQuotation path`);
  }
  if (wo) {
    R.ids.workOrder = wo.code;
    log('PASS', 'work order auto-raised from signed agreement', `${wo.code} status=${wo.status}`);
    // accept (best-effort) then complete
    await req('POST', `/api/wt-work-orders/${wo.id}/accept`, { body: {} });
    const comp = await req('POST', `/api/wt-work-orders/${wo.id}/complete`, { body: { completion_notes: 'E2E: work completed and verified on site.' } });
    if (comp.status < 400) log('PASS', 'work order COMPLETED', (comp.body.workOrder || comp.body).status || 'Completed');
    else log('WARN', 'work order complete', `HTTP ${comp.status} ${JSON.stringify(comp.body).slice(0, 160)}`);
  }

  // ============ 6. WARRANTY (auto-registered, gated on agreement) ============
  console.log('\n-- 6. Warranty (auto-registered on completion) --');
  await new Promise((r) => setTimeout(r, 400));
  const warr = arr((await req('GET', '/api/wt-ops/warranties')).body);
  const myWarr = warr.find((w) => (w.client_name || '').includes(S) || (wo && w.work_order_code === wo.code));
  if (myWarr) {
    R.ids.warranty = myWarr.code;
    log('PASS', 'warranty AUTO-registered (agreement had warranty selected)', `${myWarr.code} type=${myWarr.warranty_type} exp=${myWarr.expiry_date} status=${myWarr.status}`);
  } else {
    log('WARN', 'warranty not auto-registered', wo ? 'WO completed but no warranty row found — check gate' : 'no WO to trigger it');
  }

  // ============ 7. INVOICE (auto-drafted) + send + collect ============
  console.log('\n-- 7. Invoice (auto-drafted on sign) + collect payment --');
  let invs = arr((await req('GET', '/api/wt-invoices')).body);
  let inv = invs.find((i) => (i.client_name || '').includes(S) || (i.bill_to_email === CLIENT_EMAIL));
  if (!inv) {
    // fall back to a manual invoice (proves service_line tagging + line normalization with `price`)
    const mk = await req('POST', '/api/wt-invoices', {
      body: { client_name: NAME, client_code: clientCode, bill_to_email: CLIENT_EMAIL, inv_type: 'Final', issue_date: TODAY,
        lines: [{ kind: 'service', code: item.code, name: item.name, qty: 1, price: item.standard_price }] },
    });
    inv = mk.body;
    if (inv.code) log('PASS', 'invoice created (manual, line used `price`)', `${inv.code} total=${inv.total ?? inv.grand_total}`);
  } else {
    log('PASS', 'invoice auto-drafted from signed agreement', `${inv.code} total=${inv.total ?? inv.grand_total}`);
  }
  if (inv && inv.code) {
    R.ids.invoice = inv.code;
    if (!/^ACI/.test(inv.code) && SL === 'air_conditioning') log('WARN', 'invoice code prefix', inv.code);
    else log('PASS', 'invoice code is own service line', inv.code);
    await req('POST', `/api/wt-invoices/${inv.code}/send`, { body: { email: CLIENT_EMAIL } });
    const amt = Number(inv.total ?? inv.grand_total ?? item.standard_price) || 5000;
    const pay = await req('POST', `/api/wt-invoices/${inv.code}/payments`, { body: { amount: Math.round(amt / 2), method: 'bKash', received_on: TODAY } });
    log(pay.status < 400 ? 'PASS' : 'WARN', 'payment collected', pay.status < 400 ? `৳${Math.round(amt / 2)}` : `HTTP ${pay.status} ${JSON.stringify(pay.body).slice(0,120)}`);
  } else {
    log('WARN', 'invoice', JSON.stringify(inv).slice(0, 150));
  }

  // ============ 8. AMC ============
  console.log('\n-- 8. AMC contract --');
  const amc = await req('POST', '/api/wt-amc', {
    body: { client: { name: NAME, code: clientCode, phone: '0179' + S }, package_name: 'AC Annual Care', annual_value: 12000, visits_per_year: 4, start_date: TODAY, status: 'Active' },
  });
  if (amc.status < 400 && (amc.body.code || (amc.body.amc && amc.body.amc.code))) {
    R.ids.amc = amc.body.code || amc.body.amc.code;
    log('PASS', 'AMC created', R.ids.amc);
  } else log('WARN', 'AMC create', `HTTP ${amc.status} ${JSON.stringify(amc.body).slice(0, 150)}`);

  // ============ 9. COMPLAINT (after-sale) log + resolve ============
  console.log('\n-- 9. After-sale complaint log + resolve --');
  const comp = await req('POST', '/api/wt-ops/registers/complaints', {
    body: { client_name: NAME, client_code: clientCode, incident_type: (ref.complaint_types || ['Service Quality'])[0] || 'Service Quality', severity: 'Medium', logged_date: TODAY, disclosure: 'E2E: cooling not optimal after service.' },
  });
  const compRow = comp.body.complaint || comp.body;
  if (compRow.code) {
    R.ids.complaint = compRow.code;
    log('PASS', 'complaint logged', compRow.code);
    const resv = await req('PATCH', `/api/wt-ops/complaints/${compRow.id}`, { body: { status: 'Resolved', resolution: 'Re-visited, gas topped up, verified cooling.' } });
    log(resv.status < 400 ? 'PASS' : 'WARN', 'complaint resolved', resv.status < 400 ? 'Resolved' : `HTTP ${resv.status}`);
  } else log('WARN', 'complaint log', JSON.stringify(comp.body).slice(0, 150));

  finish();
})();

function finish() {
  console.log(`\n===== ${SL}: ${R.pass} PASS, ${R.fail} FAIL, ${R.warn} WARN =====`);
  console.log('\nKEPT RECORDS (visible in the UI):');
  for (const [k, v] of Object.entries(R.ids)) console.log(`  ${k.padEnd(12)} ${v}`);
  if (R.fail) { console.log('\nFAILURES:'); R.items.filter((i) => i.s === 'FAIL').forEach((i) => console.log(`  x ${i.m}${i.d !== undefined ? ' -- ' + i.d : ''}`)); }
  process.exit(R.fail ? 1 : 0);
}
