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

(async () => {
  console.log(`\n===== BUSINESS REGISTRATION E2E (run ${STAMP}) =====`);
  if (!(await login())) return finish();
  await lineModule();
  finish();
})().catch((e) => { ok(false, 'harness crashed', e.message); finish(); });
