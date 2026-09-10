/*
 * Phase 0 PM end-to-end write-journey audit harness (throwaway).
 * Drives the real backend as manager + tenant + landlord and logs every step.
 * Never throws on a failed step — records it and continues, so one run surfaces
 * as many defects as possible. Creates clearly-labelled AUDIT test data on dev.
 */
const BASE = 'http://127.0.0.1:50001';
const S = String(Date.now()).slice(-6);
const findings = [];
const note = (sev, step, detail) => { findings.push({ sev, step, detail }); console.log(`  [${sev}] ${step}: ${detail}`); };
const ok = (step, detail = '') => console.log(`  ok  ${step}  ${detail}`);
const j = async (r) => { try { return await r.json(); } catch { return {}; } };
const login = (e, p) => fetch(BASE + '/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: e, password: p }) }).then((r) => r.json());

let A, T, L;
const H = (t) => ({ Authorization: 'Bearer ' + (t || A), 'X-Branch-Id': '1', 'Content-Type': 'application/json' });
const req = async (m, p, body, tok) => {
  const r = await fetch(BASE + p, { method: m, headers: H(tok), ...(body ? { body: JSON.stringify(body) } : {}) });
  const data = await j(r);
  return { status: r.status, ok: r.ok, data };
};
const GET = (p, tok) => req('GET', p, null, tok);
const POST = (p, b, tok) => req('POST', p, b, tok);
const PUT = (p, b, tok) => req('PUT', p, b, tok);
// Most PM endpoints wrap the record in { data: {...} }; unwrap one level for a single record.
const rec = (res) => (res && res.data && res.data.data && !Array.isArray(res.data.data)) ? res.data.data : (res.data || {});
const arr = (res) => { const d = res.data; if (Array.isArray(d)) return d; if (d && Array.isArray(d.data)) return d.data; if (d && Array.isArray(d.rows)) return d.rows; return []; };

(async () => {
  A = (await login('admin@seventhskyproperty.com', 'Admin#2026')).token;
  T = (await login('tenant1@example.com', 'Tenant#2026')).token;
  L = (await login('buyer1@example.com', 'Owner#2026')).token;
  if (!A) { note('BLOCKER', 'login', 'admin login failed'); return dump(); }

  // Pick an owned rental property to run the journey on.
  const plist = arr(await GET('/api/properties'));
  const owned = plist.filter((p) => p.owner_contact_id);
  const prop = owned.find((p) => String(p.occupancy_status || '').toLowerCase().includes('vacant')) || owned[0];
  if (!prop) { note('BLOCKER', 'property', 'no owned property found to run journey'); return dump(); }
  console.log(`\nJourney on property ${prop.property_code || prop.id} (owner_contact ${prop.owner_contact_id}, occ=${prop.occupancy_status})\n`);

  console.log('── STEP 1: rental enquiry → application ──');
  const enq = await POST('/api/rental-enquiries', { enquirer_name: 'Audit Enquirer ' + S, phone: '01711' + S, email: `enq.${S}@example.com`, property_id: prop.id, source: 'Website', message: 'Interested (audit)' });
  const enqRec = rec(enq);
  if (enq.ok) ok('enquiry created', enqRec.code || enqRec.id); else note('BUG', 'enquiry create', `${enq.status} ${JSON.stringify(enq.data).slice(0, 140)}`);
  let appId;
  if (enq.ok && enqRec.id) {
    const conv = await POST(`/api/rental-enquiries/${enqRec.id}/convert-to-application`, {});
    if (conv.ok) { appId = rec(conv).id; ok('enquiry→application', appId); }
    else note('BUG', 'enquiry convert', `${conv.status} ${JSON.stringify(conv.data).slice(0, 140)}`);
  }

  console.log('── STEP 2: tenant application ──');
  if (!appId) {
    const app = await POST('/api/tenant-applications', {
      property_id: prop.id, applicant_name: 'Audit Tenant ' + S, email: `tenant.${S}@example.com`, mobile: '01722' + S,
      proposed_monthly_rent: 20000, proposed_service_charge: 2000, proposed_security_deposit: 40000, proposed_advance_rent: 20000,
      proposed_lease_term_months: 12, proposed_lease_start: new Date().toISOString().slice(0, 10), application_date: new Date().toISOString().slice(0, 10),
    });
    if (app.ok) { appId = rec(app).id; ok('application created', rec(app).application_code || appId); } else note('BUG', 'application create', `${app.status} ${JSON.stringify(app.data).slice(0, 160)}`);
  } else {
    // ensure the converted application has the fields convert-to-tenancy needs
    await PUT(`/api/tenant-applications/${appId}`, { applicant_name: 'Audit Tenant ' + S, email: `tenant.${S}@example.com`, mobile: '01722' + S, proposed_monthly_rent: 20000, proposed_service_charge: 2000, proposed_security_deposit: 40000, proposed_advance_rent: 20000, proposed_lease_term_months: 12, proposed_lease_start: new Date().toISOString().slice(0, 10) });
  }
  if (!appId) { note('BLOCKER', 'application', 'could not create an application; aborting journey'); return dump(); }

  console.log('── STEP 3: owner approval ──');
  const oa = await POST(`/api/tenant-applications/${appId}/send-owner-approval`, {});
  if (oa.ok) ok('owner-approval sent', oa.data.link || oa.data.token || 'sent'); else note('BUG', 'send-owner-approval', `${oa.status} ${JSON.stringify(oa.data).slice(0, 140)}`);
  // approve the application (status settable via update per FIELDS)
  const appr = await PUT(`/api/tenant-applications/${appId}`, { status: 'approved', owner_decision: 'approved' });
  if (appr.ok && String(rec(appr).status).toLowerCase() === 'approved') ok('application approved'); else note('BUG', 'application approve', `${appr.status} status=${rec(appr).status}`);

  console.log('── STEP 4: convert to tenancy ──');
  const ct = await POST(`/api/tenant-applications/${appId}/convert-to-tenancy`, { monthly_rent: 20000, service_charge: 2000, security_deposit: 40000, advance_rent: 20000, minimum_lease_period_months: 12, lease_start: new Date().toISOString().slice(0, 10) });
  const ctRec = rec(ct);
  const tenancyId = ctRec.id || (ctRec.tenancy && ctRec.tenancy.id);
  if (ct.ok && tenancyId) ok('tenancy created', ctRec.tenancy_code || tenancyId); else note('BUG', 'convert-to-tenancy', `${ct.status} ${JSON.stringify(ct.data).slice(0, 200)}`);
  if (!tenancyId) { note('BLOCKER', 'tenancy', 'no tenancy created; aborting money path'); return dump(); }

  console.log('── STEP 5: send + sign tenancy agreement ──');
  const sa = await POST(`/api/tenancies/${tenancyId}/send-agreement`, { signer_mode: 'sspc' });
  const saRec = rec(sa);
  if (sa.ok) ok('agreement sent', saRec.envelope_code || '');
  else note('BUG', 'send-agreement', `${sa.status} ${JSON.stringify(sa.data).slice(0, 200)}`);
  const signers = saRec.signers || saRec.links || sa.data.signers || sa.data.links || [];
  let signed = 0;
  for (const s of signers) {
    const tok = s.token || (s.signing_path || '').split('/').pop();
    if (!tok) continue;
    const vd = await GET(`/api/sign/${tok}`);
    const fields = (vd.data && vd.data.data && vd.data.data.fields) || (vd.data && vd.data.fields) || [];
    const payload = fields.map((f) => ({ id: f.id, value: f.field_type === 'date_signed' ? new Date().toISOString().slice(0, 10) : (s.name || 'Signed') }));
    const sr = await fetch(BASE + `/api/sign/${tok}/sign`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Branch-Id': '1' }, body: JSON.stringify({ fields: payload, typed_name: s.name || 'Signed', consent: true }) });
    if (sr.status < 300) signed++; else note('BUG', 'sign', `signer ${s.role} → ${sr.status}`);
  }
  if (signers.length) ok('agreement signed', `${signed}/${signers.length}`); else note('WARN', 'agreement signers', 'no signers returned to sign');
  await new Promise((r) => setTimeout(r, 800));

  console.log('── STEP 6: rent invoice ──');
  const ri = await POST(`/api/tenancies/${tenancyId}/raise-invoice`, {});
  const riRec = rec(ri);
  const invId = riRec.id || (riRec.invoice && riRec.invoice.id);
  if (ri.ok && invId) ok('rent invoice raised', riRec.code || (riRec.invoice && riRec.invoice.code) || invId); else note('BUG', 'raise-invoice', `${ri.status} ${JSON.stringify(ri.data).slice(0, 180)}`);

  console.log('── STEP 7: tenant-portal view + payment ──');
  const tHome = await GET('/api/tenant/tenancy', T);
  if (tHome.ok) ok('tenant sees tenancy', ''); else note('BUG', 'tenant portal tenancy', `${tHome.status}`);
  const tInv = await GET('/api/tenant/invoices', T);
  if (tInv.ok) ok('tenant sees invoices', arr(tInv).length); else note('BUG', 'tenant invoices', `${tInv.status}`);
  const pp = await POST('/api/tenant/payment-proof', { amount: 20000, method: 'bank', reference: 'AUDIT-' + S, note: 'audit proof' }, T);
  if (pp.ok) ok('tenant submitted payment proof'); else note('BUG', 'tenant payment-proof', `${pp.status} ${JSON.stringify(pp.data).slice(0, 140)}`);
  // staff records the payment against the invoice → drives owner fee + folio
  if (invId) {
    const nb = arr(await GET('/api/disbursements/income')).length;
    const pay = await POST(`/api/invoices/${invId}/payments`, { amount: 22000, method: 'bank', reference: 'AUDIT-' + S });
    if (pay.ok) ok('staff recorded rent payment'); else note('BUG', 'record payment', `${pay.status} ${JSON.stringify(pay.data).slice(0, 140)}`);
    const na = arr(await GET('/api/disbursements/income')).length;
    if (na > nb) ok('management fee booked as income', `income ${nb}→${na}`); else note('BUG', 'owner fee cascade', `no new income entry after rent payment (${nb}→${na}) — property may lack owner-fee config`);
  }

  console.log('── STEP 8: owner statement + disbursement ──');
  const rowB = arr(await GET('/api/disbursements/owner-balances')).find((o) => Number(o.owner_contact_id) === Number(prop.owner_contact_id));
  console.log('  owner held balance now:', rowB ? rowB.current_balance : 'owner not in balances list');
  const prev = await GET(`/api/disbursements/owner/${prop.owner_contact_id}/preview`);
  if (prev.ok) ok('owner payout preview', JSON.stringify(prev.data).slice(0, 120)); else note('BUG', 'owner payout preview', `${prev.status} ${JSON.stringify(prev.data).slice(0, 140)}`);
  const st = await GET('/api/owner-statements');
  if (st.ok) ok('owner statements list', arr(st).length); else note('BUG', 'owner statements', `${st.status}`);

  console.log('── STEP 9: landlord portal sees it ──');
  const lp = await GET('/api/landlord/portfolio', L);
  if (lp.ok) ok('landlord portfolio', arr(lp).length || Object.keys(lp.data || {}).length); else note('BUG', 'landlord portfolio', `${lp.status}`);
  const ls = await GET('/api/landlord/statements', L);
  if (ls.ok) ok('landlord statements', ''); else note('BUG', 'landlord statements', `${ls.status}`);

  console.log('── STEP 10: maintenance work order (tenant raise) ──');
  const wo = await POST('/api/tenant/work-orders', { title: 'Audit leak ' + S, description: 'Dripping tap (audit)', severity: 'normal' }, T);
  if (wo.ok) ok('tenant raised work order', rec(wo).code || rec(wo).id || ''); else note('BUG', 'tenant work-order', `${wo.status} ${JSON.stringify(wo.data).slice(0, 140)}`);

  console.log('── STEP 11: renewal + vacancy ──');
  const rn = await POST(`/api/tenancies/${tenancyId}/renewal/quick`, { monthly_rent: 21000, lease_end: null });
  if (rn.ok) ok('quick renewal', ''); else note('WARN', 'renewal quick', `${rn.status} ${JSON.stringify(rn.data).slice(0, 120)}`);
  const vac = await POST('/api/tenant/vacancy-notice', { intended_vacate_date: new Date(Date.now() + 40 * 864e5).toISOString().slice(0, 10), reason: 'audit' }, T);
  if (vac.ok) ok('tenant vacancy notice', ''); else note('WARN', 'vacancy notice', `${vac.status} ${JSON.stringify(vac.data).slice(0, 120)}`);

  dump();
})().catch((e) => { console.error('HARNESS ERROR', e.message); dump(); });

function dump() {
  console.log('\n===== PHASE 0 DEFECTS =====');
  const bySev = { BLOCKER: [], BUG: [], WARN: [] };
  findings.forEach((f) => (bySev[f.sev] || (bySev[f.sev] = [])).push(f));
  for (const sev of ['BLOCKER', 'BUG', 'WARN']) {
    console.log(`${sev}: ${bySev[sev].length}`);
    bySev[sev].forEach((f) => console.log(`  - ${f.step}: ${f.detail}`));
  }
  console.log(`\nTOTAL findings: ${findings.length}`);
  setTimeout(() => process.exit(0), 200);
}
