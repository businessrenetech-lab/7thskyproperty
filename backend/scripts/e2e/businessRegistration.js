/**
 * End-to-end checks for the Business Registration service line. Needs the API on
 * :50001 (restart after backend changes). Run: node scripts/e2e/businessRegistration.js
 */
const { login, req, ok, finish, STAMP } = require('./httpHarness');

const LINE = { headers: { 'X-Service-Line': 'business_registration' } };

async function lineModule() {
  console.log('\n— Line module: parties + activities —');
  // The shared WT endpoints answer with the row itself, and the project takes a
  // nested client object (see services/wtProject.service.js createProject).
  const c = await req('POST', '/api/wt-clients', {
    ...LINE,
    body: { name: `Reg Client ${STAMP}`, mobile: `0171${STAMP}`, email: `client${STAMP}@example.com` },
  });
  const clientId = c.body?.id;
  ok(!!clientId, 'registration client created', `HTTP ${c.status} ${c.body?.error || ''}`);
  ok(String(c.body?.code || '').startsWith('BR-C'), 'client uses the registration code prefix', c.body?.code);

  const p = await req('POST', '/api/wt-projects', {
    ...LINE,
    body: {
      client: { id: clientId, name: `Reg Client ${STAMP}` },
      project: { project_type: 'Private Limited Company', name: `Reg Project ${STAMP}` },
    },
  });
  const projectId = p.body?.project?.id;
  ok(!!projectId, 'registration project created on the shared spine', `HTTP ${p.status} ${p.body?.error || ''}`);
  ok(String(p.body?.project?.code || '').startsWith('BR-P'), 'project uses the registration code prefix', p.body?.project?.code);

  const s = await req('POST', `/api/br-line/projects/${projectId}/parties`, {
    ...LINE,
    body: { party_role: 'shareholder', name: `Shareholder ${STAMP}`, nid: '1234567890', share_percentage: 60, mobile: '01711000111' },
  });
  ok(s.status === 201, 'shareholder added', `HTTP ${s.status} ${s.body?.error || ''}`);

  const d = await req('POST', `/api/br-line/projects/${projectId}/parties`, {
    ...LINE,
    body: { party_role: 'director', name: `Director ${STAMP}`, designation: 'Managing Director' },
  });
  ok(d.status === 201, 'director added');

  const list = await req('GET', `/api/br-line/projects/${projectId}/parties`, LINE);
  const roles = (list.body?.data || []).map((r) => r.party_role).sort();
  ok(JSON.stringify(roles) === JSON.stringify(['director', 'shareholder']), 'both parties listed', roles.join(','));

  const bad = await req('POST', `/api/br-line/projects/${projectId}/parties`, { ...LINE, body: { party_role: 'auditor', name: 'X' } });
  ok(bad.status === 400, 'unknown party role refused', `HTTP ${bad.status}`);

  const a = await req('POST', `/api/br-line/projects/${projectId}/activities`, {
    ...LINE,
    body: { activity_type: 'name_clearance', title: 'Name clearance — first choice', authority: 'RJSC' },
  });
  const activityId = a.body?.data?.id;
  ok(a.status === 201, 'activity created', `HTTP ${a.status} ${a.body?.error || ''}`);

  const rej = await req('PUT', `/api/br-line/activities/${activityId}`, {
    ...LINE,
    body: { status: 'rejected', outcome: 'rejected', rejection_reason: 'Name too similar to an existing company' },
  });
  ok(rej.status === 200 && rej.body?.data?.status === 'rejected', 'rejection recorded');
  ok(!!rej.body?.data?.completed_at, 'rejection stamps completed_at');

  const all = await req('GET', '/api/br-line/activities', LINE);
  ok((all.body?.data || []).some((x) => Number(x.id) === Number(activityId)), 'activity appears in the console list');

  // Another line must not reach this module.
  const wrong = await req('GET', `/api/br-line/projects/${projectId}/parties`, { headers: { 'X-Service-Line': 'water_tank' } });
  ok(wrong.status === 403, 'line module refuses other service lines', `HTTP ${wrong.status}`);

  return { projectId, clientId };
}

async function documents(projectId, clientId) {
  console.log('\n— Documents: checklist, request, client link —');
  const ref = await req('GET', `/api/wt-client-docs/reference?project_id=${projectId}`, LINE);
  const keys = (ref.body?.client_docs || []).map((d) => d.key);
  ok(ref.status === 200 && keys.includes('nid'), 'registration checklist served', `${keys.length} items`);
  // lineModule() added one shareholder and one director, so the party rows expand.
  ok(keys.some((k) => k.startsWith('shareholder_docs_')), 'shareholder document row expanded per party');
  ok(keys.some((k) => k.startsWith('director_docs_')), 'director document row expanded per party');

  // Without a project there is nothing to expand against — the generic rows stand.
  const plain = await req('GET', '/api/wt-client-docs/reference', LINE);
  ok((plain.body?.client_docs || []).some((d) => d.key === 'shareholder_docs'), 'generic checklist unchanged without a project');

  const made = await req('POST', '/api/wt-client-docs/requests', {
    ...LINE,
    body: { client_id: clientId, requested_docs: ['nid', 'utility_bill'], message: `e2e ${STAMP}` },
  });
  ok([200, 201].includes(made.status), 'document request created', `HTTP ${made.status} ${made.body?.error || ''}`);
  const token = String(made.body?.link || '').split('/document-request/')[1];
  ok(!!token, 'tokenised client link issued');
  ok(made.body?.request?.token_hash === undefined, 'response never returns the token hash');

  if (token) {
    const pub = await req('GET', `/api/public/doc-request/${token}`, { noAuth: true });
    ok(pub.status === 200, 'client opens the link without logging in', `HTTP ${pub.status}`);
    ok(!JSON.stringify(pub.body || {}).includes('token_hash'), 'public payload never leaks the token hash');
  }
  const bad = await req('GET', '/api/public/doc-request/not-a-real-token', { noAuth: true });
  ok([403, 404].includes(bad.status), 'invalid document token refused', `HTTP ${bad.status}`);
}

async function commercial(clientName) {
  console.log('\n— Commercial: quotation → agreement —');
  // Routes per routes/waterTankQuotation.routes.js: POST /direct, POST /:id/decision,
  // GET /:id/agreement-draft.
  const q = await req('POST', '/api/wt-quotes/direct', {
    ...LINE,
    body: {
      client_name: clientName,
      validity: '2026-12-31',
      advance_basis: 'percent', advance_percent: 30,
      lines: [
        { code: 'GOV-RJSC', name: 'RJSC filing fee', kind: 'fee', qty: 1, price: 12000, fee_kind: 'government' },
        { code: 'BRC-003', name: 'Private limited company formation coordination', qty: 1, price: 25000, fee_kind: 'professional' },
      ],
    },
  });
  const quote = q.body?.quotation || q.body?.quote || q.body?.data || q.body;
  const code = quote?.code;
  ok([200, 201].includes(q.status), 'quotation created', `HTTP ${q.status} ${q.body?.error || ''}`);
  ok(!!code && code.startsWith('BRQ-'), 'quotation uses the registration code prefix', code);

  const got = await req('GET', `/api/wt-quotes/${code}/document`, LINE);
  ok(got.status === 200, 'quotation document renders', `HTTP ${got.status}`);

  const decided = await req('POST', `/api/wt-quotes/${code}/decision`, { ...LINE, body: { decision: 'Approved' } });  // QUOTE_DECISIONS: Pending, Sent, Approved, Rejected
  ok(decided.status === 200, 'client acceptance recorded', `HTTP ${decided.status} ${decided.body?.error || ''}`);

  const agr = await req('GET', `/api/wt-quotes/${code}/agreement-draft`, LINE);
  ok(agr.status === 200, 'agreement draft built from the accepted quotation', `HTTP ${agr.status} ${agr.body?.error || ''}`);

  // The fee split must survive the round trip — it is what the margin rule reads.
  const { quoteTotals } = require('../../services/registrationQuoteTotals');
  const stored = await req('GET', `/api/wt-quotes/${code}/agreement-position`, LINE).catch(() => null);
  const totals = quoteTotals(quote?.lines);
  ok(totals.government === 12000 && totals.professional === 25000,
    'government and professional fees split correctly', `gov ${totals.government} / prof ${totals.professional}`);
  void stored;
  return code;
}

async function providers() {
  console.log('\n— Providers —');
  // POST / takes business_name (see controllers/waterTankProviders.controller.js).
  const p = await req('POST', '/api/wt-providers', {
    ...LINE,
    body: {
      business_name: `RJSC Consultants ${STAMP}`, contact_person: 'Mr Karim',
      phone: `0191${STAMP}`, email: `provider${STAMP}@example.com`,
      service_categories: ['RJSC Consultant'],
    },
  });
  ok([200, 201].includes(p.status), 'registration provider created', `HTTP ${p.status} ${p.body?.error || ''}`);
  const code = p.body?.code;
  ok(String(code || '').startsWith('BR-SP-'), 'provider uses the registration code prefix', code);

  const mine = await req('GET', '/api/wt-providers/directory', LINE);
  const rowsOf = (b) => b?.data || b?.providers || b?.rows || (Array.isArray(b) ? b : []);
  ok(rowsOf(mine.body).some((r) => String(r.business_name || '').includes(String(STAMP))), 'provider listed on its own line');

  const other = await req('GET', '/api/wt-providers/directory', { headers: { 'X-Service-Line': 'water_tank' } });
  ok(!rowsOf(other.body).some((r) => String(r.business_name || '').includes(String(STAMP))), 'provider invisible to Water Tank');

  // The provider agreement and its required documents come from the manifest.
  const { getServiceLine } = require('../../config/serviceLines');
  const sl = getServiceLine('business_registration');
  ok(sl.agreement_template.provider === 'Master Service Delivery Provider Agreement', 'provider agreement named in the manifest');
  ok(sl.required_docs.compliance.includes('Trade Licence') && sl.required_docs.insurance.includes('Professional Indemnity Insurance'),
    'provider compliance + insurance documents come from the manifest');
  return p.body?.id;
}

(async () => {
  console.log(`\n===== BUSINESS REGISTRATION E2E (run ${STAMP}) =====`);
  if (!(await login())) return finish();
  const { projectId, clientId } = await lineModule();
  await documents(projectId, clientId);
  await commercial(`Reg Client ${STAMP}`);
  await providers();
  finish();
})().catch((e) => { ok(false, 'harness crashed', e.message); finish(); });
