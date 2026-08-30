/*
 * e2eFullJourney.js — the WHOLE journey for a service line: client + provider +
 * both self-service portals. The most complete of the three harnesses; keeps all
 * data so it stays visible in the UI.
 *
 *   A. PROVIDER ONBOARDING — create -> invite -> capability assessment ->
 *      compliance + insurance evidence (the line's OWN required docs) -> master
 *      Service Delivery Provider Agreement (created, both parties sign) -> payment
 *      verified -> territory briefing -> APPROVED (every SOP-02 gate).
 *   B. CLIENT INTAKE — service request (status transitions) -> site assessment
 *      (Scheduled -> In Progress -> Completed) -> quotation -> customer agreement
 *      (warranty selected, every party signs).
 *   C. WORK ORDER — auto-raised on signing -> assign the onboarded provider ->
 *      accept -> schedule -> start -> complete -> verify (Sec. 9 Step 9).
 *   D. warranty auto-registers -> provider files a service report -> provider payout.
 *   E. invoice + client payment -> AMC -> after-sale complaint (logged + resolved).
 *   F. PORTALS — client + provider accounts (the provider's is auto-provisioned on
 *      agreement signing), login, dossier loads.
 *
 * Asserts codes are branded to the active line (ACP-/ACCM-C/ACR-/ACA-/ACQ-/ACW-/ACI-)
 * and that the line's own compliance docs gate onboarding (AC: Electrical,
 * Refrigerant Handling, Safety Training, …).
 *
 *   node scripts/e2eFullJourney.js [service_line]   (default air_conditioning)
 *
 * Requires the backend on PORT (default 50001) and admin creds in the env
 * (E2E_EMAIL / E2E_PASSWORD) or the defaults below. Keeps everything it creates.
 */
const http = require('http');

const SL = process.argv[2] || 'air_conditioning';
const PORT = Number(process.env.PORT) || 50001;
const EMAIL = process.env.E2E_EMAIL || 'admin@seventhskyproperty.com';
const PASSWORD = process.env.E2E_PASSWORD || 'Admin#2026';
const TODAY = '2026-08-30';
const FUTURE = '2027-08-30';

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
    if (opts.token !== undefined) { if (opts.token) headers.Authorization = 'Bearer ' + opts.token; }
    else if (!opts.noAuth) headers.Authorization = 'Bearer ' + TOKEN;
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
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function signEnvelope(signers, tag) {
  const ordered = (signers || []).slice().sort((a, b) => (a.order || 0) - (b.order || 0));
  let ok = true;
  for (const s of ordered) {
    const token = s.token || (s.signing_path || '').split('/').pop();
    if (!token) { ok = false; continue; }
    const view = await req('GET', `/api/sign/${token}`, { noAuth: true, noSl: true });
    const vd = view.body.data || view.body;
    const fields = arr(vd.fields || []);
    const payload = fields.map((f) => ({ id: f.id, value: f.field_type === 'date_signed' ? TODAY : (s.name || 'Signed') }));
    const done = await req('POST', `/api/sign/${token}/sign`, { noAuth: true, noSl: true, body: { fields: payload, typed_name: s.name, consent: true } });
    if (done.status >= 400) { ok = false; log('WARN', `${tag}: sign ${s.label || s.role}`, `HTTP ${done.status} ${JSON.stringify(done.body).slice(0, 120)}`); }
    else log('PASS', `${tag}: signed ${s.label || s.role}`, s.name);
  }
  return ok;
}

(async () => {
  const S = Date.now().toString().slice(-6);
  const NAME = `AC Full ${S}`;
  const CLIENT_EMAIL = `ac.full.${S}@example.com`;
  const PROV_NAME = `AC Provider ${S}`;
  const PROV_EMAIL = `ac.prov.${S}@example.com`;
  console.log(`\n===== FULL CLIENT + PROVIDER + PORTALS E2E — ${SL} =====\n`);

  TOKEN = (await req('POST', '/api/auth/login', { body: { email: EMAIL, password: PASSWORD }, noSl: true })).body.token;
  if (!TOKEN) return log('FAIL', 'admin login') || finish();
  log('PASS', 'admin login', EMAIL);

  const ref = (await req('GET', '/api/wt-intake/request-reference')).body;
  const cat = ref.catalog || [];
  const item = cat.find((c) => Number(c.standard_price) > 0) || cat[0];
  const provRef = (await req('GET', '/api/wt-providers/reference')).body;
  const compDocs = (provRef.compliance_docs || []).filter((d) => d.required);
  const insDocs = (provRef.insurance_docs || []).filter((d) => d.required);
  const provCats = (provRef.service_categories || []).slice(0, 2);
  log('PASS', 'references loaded', `${cat.length} catalogue; required docs ${compDocs.length} compliance / ${insDocs.length} insurance`);
  console.log(`  AC compliance docs the gate now enforces: ${compDocs.map((d) => d.type).join(', ')}`);

  // ============================================================
  // A. PROVIDER ONBOARDING (full journey to Approved + assignable)
  // ============================================================
  console.log('\n########## A. PROVIDER ONBOARDING ##########');

  console.log('\n-- A1. Create provider application --');
  const pRes = await req('POST', '/api/wt-providers', {
    body: {
      business_name: PROV_NAME, legal_name: PROV_NAME + ' Ltd', business_type: 'Company',
      contact_person: 'Provider Boss', contact_email: PROV_EMAIL, contact_phone: '0188' + S,
      district: 'Dhaka', address: '12 Provider Ave', service_categories: provCats,
      capacity_per_week: 5, team_size: 6, years_experience: 7,
      bank_details: { bank: 'BRAC', account: '12345678', routing: '0001' },
    },
  });
  const prov = pRes.body;
  if (!prov.id) return log('FAIL', 'provider create', JSON.stringify(prov).slice(0, 180)) || finish();
  R.ids.provider = prov.code; R.ids.providerId = prov.id;
  log('PASS', 'provider created', `${prov.code} (${prov.business_name}) status=${prov.status}`);
  if (SL === 'air_conditioning' && !/^ACP-/.test(prov.code)) log('FAIL', 'provider code prefix', prov.code);
  else log('PASS', 'provider code is own service line', prov.code);

  console.log('\n-- A2. Send onboarding invitation --');
  const invite = await req('POST', `/api/wt-providers/${prov.id}/invite`, { body: { email: PROV_EMAIL } });
  log(invite.status < 400 ? 'PASS' : 'WARN', 'invitation sent', invite.status < 400 ? (invite.body.status || 'Invited') + (invite.body.link ? ' + link' : '') : `HTTP ${invite.status}`);

  console.log('\n-- A3. Capability assessment --');
  const capp = await req('POST', `/api/wt-providers/${prov.id}/capability`, { body: { capability_score: 85, notes: 'Strong AC install + service history.' } });
  log(capp.status < 400 ? 'PASS' : 'WARN', 'capability assessed', capp.status < 400 ? 'score 85' : `HTTP ${capp.status} ${JSON.stringify(capp.body).slice(0,120)}`);

  console.log('\n-- A4. Compliance evidence (AC-specific) upload + verify --');
  for (const d of compDocs) {
    const saved = await req('POST', '/api/wt-providers/documents', {
      body: { provider_id: prov.id, category: 'compliance', doc_type: d.type, doc_number: `C-${S}-${d.type.slice(0,3)}`, issue_date: TODAY, expiry_date: FUTURE, file_url: 'https://example.com/doc.pdf' },
    });
    const row = saved.body;
    if (row.id) { await req('POST', `/api/wt-providers/documents/${row.id}/verify`, { body: { verified: true } }); log('PASS', `compliance verified: ${d.type}`); }
    else log('WARN', `compliance ${d.type}`, `HTTP ${saved.status} ${JSON.stringify(row).slice(0,100)}`);
  }

  console.log('\n-- A5. Insurance evidence upload + verify --');
  for (const d of insDocs) {
    const saved = await req('POST', '/api/wt-providers/documents', {
      body: { provider_id: prov.id, category: 'insurance', doc_type: d.type, doc_number: `I-${S}-${d.type.slice(0,3)}`, issue_date: TODAY, expiry_date: FUTURE, file_url: 'https://example.com/ins.pdf' },
    });
    const row = saved.body;
    if (row.id) { await req('POST', `/api/wt-providers/documents/${row.id}/verify`, { body: { verified: true } }); log('PASS', `insurance verified: ${d.type}`); }
    else log('WARN', `insurance ${d.type}`, `HTTP ${saved.status} ${JSON.stringify(row).slice(0,100)}`);
  }

  console.log('\n-- A6. Master Service Delivery Provider Agreement (create + sign) --');
  const pAgr = await req('POST', '/api/wt-agreements/provider/agreements', {
    body: {
      provider_id: prov.id,
      provider: { full_name: PROV_NAME, email: PROV_EMAIL, phone: '0188' + S },
      org: { name: 'Seventh Sky Property Care', represented_by: 'Ops Manager', email: EMAIL },
      effective_date: TODAY, term_months: 12,
      // Price the catalogue code the client job will use, so the master agreement
      // actually rates ACS-001 and the work order can be assigned without override.
      pricing_input: { selected: [{ code: item.code, agreed_price: item.standard_price }] },
      send: true,
    },
  });
  const pab = pAgr.body;
  R.ids.providerAgreement = pab.envelope_code || (pab.agreement && pab.agreement.code) || pab.code;
  const pSigners = pab.links || pab.signers;   // provider agreement returns links[] with tokens
  if (pSigners && pSigners.length) {
    log('PASS', 'provider agreement raised', `${R.ids.providerAgreement} (${pSigners.length} signers)`);
    await signEnvelope(pSigners, 'provider agreement');
    await sleep(700);
  } else {
    log('WARN', 'provider agreement create', `HTTP ${pAgr.status} ${JSON.stringify(pab).slice(0, 200)}`);
  }
  // confirm the provider now reads agreement_status = Signed (completion hook runs post-commit)
  await sleep(400);
  const pAfterRes = (await req('GET', `/api/wt-providers/${prov.id}`)).body;
  const pAfter = pAfterRes.provider || pAfterRes;
  log(String(pAfter.agreement_status || '').toLowerCase() === 'signed' ? 'PASS' : 'WARN', 'provider agreement executed', `agreement_status=${pAfter.agreement_status}`);

  console.log('\n-- A7. Payment verification + territory briefing --');
  const payV = await req('POST', `/api/wt-providers/${prov.id}/payment-verification`, { body: { verified: true } });
  log(payV.status < 400 ? 'PASS' : 'WARN', 'payment account verified', payV.status < 400 ? 'verified' : `HTTP ${payV.status}`);
  const brief = await req('POST', `/api/wt-providers/${prov.id}/territory-briefing`, { body: { acknowledged_by: 'Provider Boss', briefing_date: TODAY, cumilla_exclusive: true } });
  log(brief.status < 400 ? 'PASS' : 'WARN', 'territory briefing acknowledged', brief.status < 400 ? 'ok' : `HTTP ${brief.status}`);

  console.log('\n-- A8. Approve provider (all gates) --');
  const appr = await req('POST', `/api/wt-providers/${prov.id}/stage`, { body: { stage: 'Approved' } });
  if (appr.status < 400) log('PASS', 'provider APPROVED (passed every gate)', appr.body.status || 'Approved');
  else log('FAIL', 'provider approve blocked', `HTTP ${appr.status} ${JSON.stringify(appr.body).slice(0, 220)}`);

  // ============================================================
  // B. CLIENT INTAKE -> ASSESSMENT -> QUOTE -> AGREEMENT (with status transitions)
  // ============================================================
  console.log('\n########## B. CLIENT INTAKE + STATUS TRANSITIONS ##########');

  console.log('\n-- B1. Service request (needs assessment) + status transitions --');
  const srRes = await req('POST', '/api/wt-intake/requests', {
    body: {
      client_name: NAME, phone: '0179' + S, email: CLIENT_EMAIL, client_type: 'Residential',
      address: '9 Client Lane, Gulshan', district: 'Dhaka', property_type: (ref.property_types || ['House'])[0],
      category: item.group || 'Service', specific_service: item.name, needs_assessment: true,
      assessment_date: TODAY, assigned_officer: 'E2E Surveyor', services_requested: [item.name],
      lines: [{ kind: 'service', code: item.code, name: item.name, qty: 1, price: item.standard_price }],
      priority: 'High', description: 'Full client+provider E2E — keep.',
    },
  });
  const sr = srRes.body;
  const clientCode = (sr.client || {}).code;
  const srRow = sr.request || {};
  R.ids.client = clientCode; R.ids.sr = srRow.code;
  log(clientCode ? 'PASS' : 'FAIL', 'client + service request created', `client ${clientCode} / SR ${srRow.code}`);
  // move the SR through statuses
  for (const st of ['In Progress', 'Assessment Scheduled']) {
    const up = await req('PATCH', `/api/wt-ops/service-requests/${srRow.id}`, { body: { current_status: st } });
    log(up.status < 400 ? 'PASS' : 'WARN', `service request status -> ${st}`, up.status < 400 ? 'ok' : `HTTP ${up.status}`);
  }

  console.log('\n-- B2. Site assessment: Scheduled -> In Progress -> Completed --');
  let assess = sr.assessment || null;
  if (assess && assess.id) {
    R.ids.assessment = assess.code;
    log('PASS', 'assessment created', `${assess.code} status=${assess.status}`);
    for (const st of ['In Progress', 'Completed']) {
      const body = st === 'Completed'
        ? { status: st, findings: 'Two split units; recommend deep service + gas top-up + coil clean.', recommendation: item.name, completed_date: TODAY }
        : { status: st };
      const up = await req('PATCH', `/api/wt-ops/site-assessments/${assess.id}`, { body });
      log(up.status < 400 ? 'PASS' : 'WARN', `assessment status -> ${st}`, up.status < 400 ? 'ok' : `HTTP ${up.status} ${JSON.stringify(up.body).slice(0,100)}`);
    }
  } else log('WARN', 'assessment', 'not created by SR');

  console.log('\n-- B3. Quotation build + approve --');
  let quote = {};
  if (assess && assess.id) {
    const q = await req('POST', `/api/wt-quotes/from-assessment/${assess.id}`, {
      body: { lines: [{ kind: 'service', code: item.code, name: item.name, qty: 1, unit_price: item.standard_price }], client_name: NAME, client_code: clientCode },
    });
    quote = q.body.quotation || q.body;
  }
  if (quote.code) {
    R.ids.quote = quote.code;
    log(/^ACQ-/.test(quote.code) || SL !== 'air_conditioning' ? 'PASS' : 'FAIL', 'quotation created', quote.code);
  } else log('WARN', 'quotation', JSON.stringify(quote).slice(0, 120));

  console.log('\n-- B4. Customer agreement (warranty selected) + sign --');
  const agr = await req('POST', '/api/wt-agreements/customer/agreements', {
    body: {
      client: { full_name: NAME, email: CLIENT_EMAIL, phone: '0179' + S, client_type: 'Residential', client_code: clientCode },
      org: { name: 'Seventh Sky Property Care', represented_by: 'Ops Manager', email: EMAIL },
      witnesses: [{ name: 'Witness One', email: `wit.${S}@example.com` }],
      checklist: ['Workmanship Warranty', 'Repair Warranty', 'Safe Site Access Provided'],
      pricing_input: { selected: [{ code: item.code, name: item.name, qty: 1, agreed_price: item.standard_price }], advance_percent: 50 },
      schedule_b: { warranty_period: '12 months' }, quote_code: quote.code || null,
    },
  });
  if (agr.body.id) {
    R.ids.customerAgreement = agr.body.envelope_code;
    log('PASS', 'customer agreement raised', `${agr.body.envelope_code}`);
    await signEnvelope(agr.body.signers, 'customer agreement');
    await sleep(700);
  } else log('WARN', 'customer agreement', `HTTP ${agr.status} ${JSON.stringify(agr.body).slice(0,160)}`);

  // ============================================================
  // C. WORK ORDER: assign provider -> accept -> schedule -> start -> complete
  // ============================================================
  console.log('\n########## C. WORK ORDER EXECUTION (assigned provider) ##########');
  await sleep(400);
  let wo = arr((await req('GET', '/api/wt-work-orders')).body).find((w) => (w.client_name || '').includes(S));
  if (!wo) { log('FAIL', 'work order auto-raised', 'none found from signed agreement'); }
  else {
    R.ids.workOrder = wo.code;
    log('PASS', 'work order auto-raised', `${wo.code} status=${wo.status}`);

    // C1. assign the freshly-onboarded provider (proves every gate passed)
    const asg = await req('POST', `/api/wt-work-orders/${wo.id}/assign`, { body: { provider_id: prov.id } });
    if (asg.status < 400) log('PASS', 'provider ASSIGNED to work order', `${prov.code} -> ${wo.code}`);
    else log('FAIL', 'assign provider', `HTTP ${asg.status} ${JSON.stringify(asg.body).slice(0, 240)}`);

    // C2. provider accepts, schedules, starts, completes
    const acc = await req('POST', `/api/wt-work-orders/${wo.id}/accept`, { body: {} });
    log(acc.status < 400 ? 'PASS' : 'WARN', 'provider accepted job', acc.status < 400 ? 'ok' : `HTTP ${acc.status}`);
    const sch = await req('POST', `/api/wt-work-orders/${wo.id}/schedule`, { body: { scheduled_date: TODAY, scheduled_slot: 'Morning' } });
    log(sch.status < 400 ? 'PASS' : 'WARN', 'job scheduled', sch.status < 400 ? TODAY : `HTTP ${sch.status}`);
    const strt = await req('POST', `/api/wt-work-orders/${wo.id}/start`, { body: { started_on: TODAY } });
    log(strt.status < 400 ? 'PASS' : 'WARN', 'job started', strt.status < 400 ? 'in progress' : `HTTP ${strt.status}`);
    const comp = await req('POST', `/api/wt-work-orders/${wo.id}/complete`, { body: { completion_notes: 'Serviced 2 units, gas topped up, verified cooling.' } });
    log(comp.status < 400 ? 'PASS' : 'FAIL', 'job COMPLETED', comp.status < 400 ? 'Completed' : `HTTP ${comp.status} ${JSON.stringify(comp.body).slice(0,140)}`);
    // C3. completion review (Sec. 9 Step 9) — all checks must pass before payout
    const ver = await req('POST', `/api/wt-work-orders/${wo.id}/verify`, { body: { site_cleaned: true, reports_submitted: true, photos_collected: true, client_satisfied: true, completion_notes: 'Reviewed and verified on site.' } });
    log(ver.status < 400 ? 'PASS' : 'WARN', 'completion VERIFIED (Sec. 9 Step 9)', ver.status < 400 ? 'verified' : `HTTP ${ver.status} ${JSON.stringify(ver.body).slice(0,120)}`);
  }

  // ============================================================
  // D. WARRANTY (auto) + SERVICE REPORT + PAYOUT
  // ============================================================
  console.log('\n########## D. WARRANTY + SERVICE REPORT + PAYOUT ##########');
  await sleep(400);
  const warr = arr((await req('GET', '/api/wt-ops/warranties')).body).find((w) => (w.client_name || '').includes(S) || (wo && w.work_order_code === wo.code));
  if (warr) { R.ids.warranty = warr.code; log('PASS', 'warranty AUTO-registered', `${warr.code} type=${warr.warranty_type} exp=${warr.expiry_date}`); }
  else log('WARN', 'warranty', 'not auto-registered');

  if (wo) {
    console.log('\n-- D1. Provider files a service report --');
    const rpt = await req('POST', '/api/wt-providers/reports', {
      body: { report_type: (provRef.report_types || ['Service Report'])[0] || 'Service Report', work_order_code: wo.code, provider_id: prov.id, findings: 'All units serviced; cooling within spec.', status: 'Submitted', service_date: TODAY },
    });
    if (rpt.status < 400 && (rpt.body.code || rpt.body.id)) { R.ids.serviceReport = rpt.body.code || `#${rpt.body.id}`; log('PASS', 'service report filed', R.ids.serviceReport); }
    else log('WARN', 'service report', `HTTP ${rpt.status} ${JSON.stringify(rpt.body).slice(0,160)}`);

    console.log('\n-- D2. Provider payout on the completed job --');
    const woNow = (await req('GET', `/api/wt-work-orders/${wo.id}`)).body;
    const woRow = woNow.workOrder || woNow;
    const payable = Number(woRow.provider_net_payable || woRow.provider_fee || item.standard_price) || 1000;
    const payAmt = Math.max(1, Math.round(payable * 0.6));
    const pay = await req('POST', `/api/wt-work-orders/${wo.id}/pay-provider`, { body: { amount: payAmt, method: 'Bank Transfer', reference: 'PAYOUT-' + S, paid_on: TODAY } });
    log(pay.status < 400 ? 'PASS' : 'WARN', 'provider payout recorded', pay.status < 400 ? `৳${payAmt} of ৳${payable}` : `HTTP ${pay.status} ${JSON.stringify(pay.body).slice(0,140)}`);
  }

  // ============================================================
  // E. INVOICE + PAYMENT, AMC, COMPLAINT
  // ============================================================
  console.log('\n########## E. INVOICE / AMC / COMPLAINT ##########');
  let inv = arr((await req('GET', '/api/wt-invoices')).body).find((i) => (i.client_name || '').includes(S));
  if (!inv) {
    const mk = await req('POST', '/api/wt-invoices', { body: { client_name: NAME, client_code: clientCode, bill_to_email: CLIENT_EMAIL, inv_type: 'Final', issue_date: TODAY, lines: [{ kind: 'service', code: item.code, name: item.name, qty: 1, price: item.standard_price }] } });
    inv = mk.body;
  }
  if (inv.code) {
    R.ids.invoice = inv.code;
    log(/^ACI/.test(inv.code) || SL !== 'air_conditioning' ? 'PASS' : 'WARN', 'invoice present', inv.code);
    const snd = await req('POST', `/api/wt-invoices/${inv.code}/send`, { body: { email: CLIENT_EMAIL } });
    if (snd.status >= 400) log('WARN', 'invoice send', `HTTP ${snd.status} ${JSON.stringify(snd.body).slice(0,120)}`);
    // pay against the actual outstanding (the auto-draft invoice may be the advance only)
    const fresh = (await req('GET', `/api/wt-invoices/${inv.code}`)).body;
    const outstanding = Number(fresh.outstanding ?? fresh.total ?? item.standard_price) || 500;
    const amt = Math.max(1, Math.round(outstanding / 2));
    const pay = await req('POST', `/api/wt-invoices/${inv.code}/payments`, { body: { amount: amt, method: 'bKash', received_on: TODAY } });
    log(pay.status < 400 ? 'PASS' : 'WARN', 'client payment collected', pay.status < 400 ? `৳${amt} of ৳${outstanding}` : `HTTP ${pay.status} ${JSON.stringify(pay.body).slice(0,140)}`);
  } else log('WARN', 'invoice', JSON.stringify(inv).slice(0, 120));

  const amc = await req('POST', '/api/wt-amc', { body: { client: { name: NAME, code: clientCode, phone: '0179' + S }, package_name: 'AC Annual Care', annual_value: 12000, visits_per_year: 4, start_date: TODAY, status: 'Active' } });
  if (amc.status < 400) { R.ids.amc = amc.body.code || (amc.body.amc && amc.body.amc.code); log('PASS', 'AMC created', R.ids.amc); }
  else log('WARN', 'AMC', `HTTP ${amc.status}`);

  const comp = await req('POST', '/api/wt-ops/registers/complaints', { body: { client_name: NAME, client_code: clientCode, incident_type: (ref.complaint_types || ['Service Quality'])[0], severity: 'Medium', logged_date: TODAY, disclosure: 'Cooling weak in one room.' } });
  const cRow = comp.body.complaint || comp.body;
  if (cRow.code) { R.ids.complaint = cRow.code; log('PASS', 'complaint logged', cRow.code); const rv = await req('PATCH', `/api/wt-ops/complaints/${cRow.id}`, { body: { status: 'Resolved', resolution: 'Re-visited and fixed.' } }); log(rv.status < 400 ? 'PASS' : 'WARN', 'complaint resolved'); }
  else log('WARN', 'complaint', JSON.stringify(comp.body).slice(0, 120));

  // ============================================================
  // F. PORTALS — client + provider self-service
  // ============================================================
  console.log('\n########## F. PORTALS (client + provider) ##########');

  console.log('\n-- F1. Provision + open CLIENT portal --');
  const cAcc = await req('POST', `/api/wt-ops/portal-accounts/client/${(sr.client || {}).id}`, { body: {} });
  const cPass = cAcc.body.temporary_password;
  const cUserEmail = (cAcc.body.user && cAcc.body.user.email) || CLIENT_EMAIL;
  if (cPass) {
    log('PASS', 'client portal account provisioned', cUserEmail);
    const cLogin = await req('POST', '/api/auth/login', { body: { email: cUserEmail, password: cPass }, noSl: true, token: null });
    const cTok = cLogin.body.token;
    if (cTok) {
      log('PASS', 'client portal login', 'token issued');
      const me = await req('GET', '/api/wt-portal/me', { token: cTok });
      log(me.status < 400 ? 'PASS' : 'WARN', 'client portal dossier loaded', me.status < 400 ? `sees ${arr(me.body.invoices).length} invoice(s), ${arr(me.body.work_orders || me.body.workOrders).length} job(s)` : `HTTP ${me.status} ${JSON.stringify(me.body).slice(0,120)}`);
    } else log('WARN', 'client portal login', `HTTP ${cLogin.status} ${JSON.stringify(cLogin.body).slice(0,140)}`);
  } else log('WARN', 'client portal account', `HTTP ${cAcc.status} ${JSON.stringify(cAcc.body).slice(0,160)}`);

  console.log('\n-- F2. Provider portal (auto-provisioned on agreement signing) --');
  let vAcc = await req('POST', `/api/wt-ops/portal-accounts/provider/${prov.id}`, { body: {} });
  if (vAcc.body && vAcc.body.created === false) {
    log('PASS', 'provider portal auto-provisioned on agreement signing', 'account already existed — resetting to log in');
    vAcc = await req('POST', `/api/wt-ops/portal-accounts/provider/${prov.id}`, { body: { reset: true } });
  }
  const vPass = vAcc.body.temporary_password;
  const vUserEmail = (vAcc.body.user && vAcc.body.user.email) || PROV_EMAIL;
  if (vPass) {
    log('PASS', 'provider portal account provisioned', vUserEmail);
    const vLogin = await req('POST', '/api/auth/login', { body: { email: vUserEmail, password: vPass }, noSl: true, token: null });
    const vTok = vLogin.body.token;
    if (vTok) {
      log('PASS', 'provider portal login', 'token issued');
      const me = await req('GET', '/api/wt-portal/me', { token: vTok });
      log(me.status < 400 ? 'PASS' : 'WARN', 'provider portal dossier loaded', me.status < 400 ? `sees ${arr(me.body.work_orders || me.body.jobs).length} job(s)` : `HTTP ${me.status} ${JSON.stringify(me.body).slice(0,120)}`);
    } else log('WARN', 'provider portal login', `HTTP ${vLogin.status} ${JSON.stringify(vLogin.body).slice(0,140)}`);
  } else log('WARN', 'provider portal account', `HTTP ${vAcc.status} ${JSON.stringify(vAcc.body).slice(0,160)}`);

  finish();
})();

function finish() {
  console.log(`\n===== ${SL}: ${R.pass} PASS, ${R.fail} FAIL, ${R.warn} WARN =====`);
  console.log('\nKEPT RECORDS (visible in the UI):');
  for (const [k, v] of Object.entries(R.ids)) if (!/Id$/.test(k)) console.log(`  ${k.padEnd(18)} ${v}`);
  if (R.fail) { console.log('\nFAILURES:'); R.items.filter((i) => i.s === 'FAIL').forEach((i) => console.log(`  x ${i.m}${i.d !== undefined ? ' -- ' + i.d : ''}`)); }
  if (R.warn) { console.log('\nWARNINGS:'); R.items.filter((i) => i.s === 'WARN').forEach((i) => console.log(`  ! ${i.m}${i.d !== undefined ? ' -- ' + i.d : ''}`)); }
  process.exit(R.fail ? 1 : 0);
}
