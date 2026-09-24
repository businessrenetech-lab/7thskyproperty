/**
 * End-to-end checks for the Business Rent console. Needs the API on :50001.
 * Run: node scripts/e2e/businessRent.js
 *
 * Every row it creates is stamped E2E …<STAMP> so the fixtures can be found and
 * removed afterwards — this DB is the production DB.
 */
const { login, req, ok, finish, STAMP } = require('./httpHarness');

const created = { properties: [], tenancies: [], applications: [], assessments: [] };

async function scoping() {
  console.log('\n— Scoping: business rent never shows business sale —');
  // 17 business-category properties exist today and every one is listing_type
  // 'sale' (the Business Buy/Sale parity work). Scoping on category alone shows
  // them all in the Business RENT console.
  const all = await req('GET', '/api/properties?category=business&limit=200');
  const sale = (all.body?.data || []).filter((p) => p.listing_type === 'sale');
  ok(sale.length > 0, 'business sale listings exist to be excluded', `${sale.length} found`);

  const rentOnly = await req('GET', '/api/properties?category=business&listing_type=rent&limit=200');
  const rows = rentOnly.body?.data || [];
  ok(rentOnly.status === 200, 'business rent query answers', `HTTP ${rentOnly.status}`);
  ok(rows.every((p) => p.listing_type === 'rent'), 'no sale listing leaks into the rent scope',
    rows.filter((p) => p.listing_type !== 'rent').map((p) => p.property_code).join(',') || 'clean');
  ok(rows.every((p) => p.category === 'business'), 'no other category leaks in');

  // The residential console must be untouched by any of this.
  const res = await req('GET', '/api/properties?category=residential&listing_type=rent&limit=200');
  const resRows = res.body?.data || [];
  ok(resRows.every((p) => p.category === 'residential'), 'residential scope still clean');
  ok(resRows.length > 0, 'residential rent properties still returned', `${resRows.length}`);
}

async function flow() {
  console.log('\n— SOP flow: enquiry → screening → lease → handover —');
  const prop = await req('POST', '/api/properties', {
    body: {
      title: `E2E Business Premises ${STAMP}`,
      category: 'business',
      listing_type: 'rent',
      status: 'available',
      price: 50000,
      branch_id: 1,
    },
  });
  ok(prop.status === 201, 'business rent property created', `HTTP ${prop.status}`);
  const propertyId = prop.body?.data?.id;
  if (propertyId) created.properties.push(propertyId);

  const app = await req('POST', '/api/tenant-applications', {
    body: {
      property_id: propertyId,
      applicant_name: `E2E Operator ${STAMP}`,
      business_name: 'E2E Retail Ltd',
      business_type: 'Retail',
      intended_activity: 'Clothing store',
      trade_licence_no: `TL-${STAMP}`,
      corporate_profile: 'Ltd, 3 branches',
      financial_capability: '12m bank statements',
      operational_suitability: 'Ground floor retail',
      previous_leasing_history: 'Two prior leases, clean',
      screening_verdict: 'suitable',
      branch_id: 1,
    },
  });
  ok(app.status === 201, 'application with screening created', `HTTP ${app.status}`);
  ok(app.body?.data?.screening_verdict === 'suitable',
    'screening verdict stored (the model knows the new columns)', app.body?.data?.screening_verdict);
  ok(app.body?.data?.trade_licence_no === `TL-${STAMP}`, 'trade licence stored, not silently dropped');
  if (app.body?.data?.id) created.applications.push(app.body.data.id);

  const assess = await req('POST', '/api/rental-assessments', { body: { property_id: propertyId, branch_id: 1 } });
  const sections = [...new Set((assess.body?.data?.items || []).map((i) => i.section))];
  ok(sections.includes('Location suitability'), 'premises template seeded, not the room template', sections.slice(0, 3).join(', '));
  ok(!sections.some((s) => /bedroom/i.test(s)), 'no bedrooms on a business premises');
  if (assess.body?.data?.id) created.assessments.push(assess.body.data.id);

  const ten = await req('POST', '/api/tenancies', {
    body: {
      property_id: propertyId,
      lease_start: '2026-10-01',
      monthly_rent: 50000,
      lease_term_months: 6,
      advance_months: 12,
      branch_id: 1,
    },
  });
  ok(ten.status === 201, 'a lease departing from the SOP structure still saves', `HTTP ${ten.status}`);
  const warnings = ten.body?.data?.structure_warnings || [];
  ok(warnings.some((w) => w.field === 'lease_term_months'), 'the departure is recorded as a warning',
    warnings.map((w) => w.field).join(',') || 'none');
  const tenancyId = ten.body?.data?.id;
  if (tenancyId) created.tenancies.push(tenancyId);

  const dep = await req('POST', `/api/tenancies/${tenancyId}/deposits`, {
    body: { deposit_type: 'security', amount: 100000, received_amount: 100000, received_on: '2026-09-24' },
  });
  ok(dep.status === 201, 'security deposit recorded', `HTTP ${dep.status}`);
  const deps = await req('GET', `/api/tenancies/${tenancyId}/deposits`);
  ok(deps.body?.summary?.total?.received === 100000, 'deposit summary totals by type',
    JSON.stringify(deps.body?.summary?.total));
  ok(deps.body?.advance?.agreed === 600000, '12 months advance computed from the lease', deps.body?.advance?.agreed);

  const prot = await req('POST', '/api/rent-protections?category=business', {
    body: {
      property_id: propertyId,
      protected_relationship: `E2E introduced operator ${STAMP}`,
      introduction_date: '2026-09-24',
      protection_basis: 'Inspection log + WhatsApp thread',
    },
  });
  ok(prot.status === 201, 'introduction protected', `HTTP ${prot.status}`);
  ok(prot.body?.data?.protection_expires_on === '2027-09-24', 'protected for the engagement plus 12 months',
    prot.body?.data?.protection_expires_on);

  const free = await req('POST', `/api/tenancies/${tenancyId}/handover`, { body: {} });
  ok(free.status === 200, 'handover is NOT blocked when no commission was charged', `HTTP ${free.status}`);
}

async function dashboards() {
  console.log('\n— The six dashboards —');
  for (const key of ['pipeline', 'occupancy', 'screening', 'financial', 'protection', 'operations']) {
    const r = await req('GET', `/api/business-rent/dashboards/${key}`);
    const raw = JSON.stringify(r.body);
    ok(r.status === 200 && !/NaN|null,"agreed/.test(raw), `${key} dashboard answers cleanly`, `HTTP ${r.status}`);
  }
  const bad = await req('GET', '/api/business-rent/dashboards/nonsense');
  ok(bad.status === 404, 'an unknown dashboard key is a 404, not an empty page', `HTTP ${bad.status}`);

  const pipe = await req('GET', '/api/business-rent/dashboards/pipeline');
  ok((pipe.body?.data?.stages || []).length === 13, 'the pipeline shows all 13 SOP stages',
    `${(pipe.body?.data?.stages || []).length}`);
}

async function isolation() {
  console.log('\n— Isolation: the other consoles are unmoved —');
  for (const cat of ['residential', 'commercial']) {
    const r = await req('GET', `/api/properties?category=${cat}&listing_type=rent&limit=200`);
    const rows = r.body?.data || [];
    ok(rows.every((p) => p.category === cat), `${cat} scope returns only ${cat}`);
    ok(!rows.some((p) => p.category === 'business'), `no business row leaks into ${cat}`);
  }

  const pm = await req('GET', '/api/property-management/dashboard-metrics?category=residential');
  ok(pm.status === 200, 'the residential PM metrics still answer', `HTTP ${pm.status}`);
  const managed = pm.body?.occupancy?.managed ?? pm.body?.data?.occupancy?.managed;
  ok(Number(managed) > 0, 'residential still reports its managed properties', `managed=${managed}`);

  // An unknown category must behave exactly as it did before the scoping change:
  // unfiltered — identical to asking with no category at all — and never an error.
  const unknown = await req('GET', '/api/property-management/dashboard-metrics?category=nonsense');
  const none = await req('GET', '/api/property-management/dashboard-metrics');
  const unknownManaged = unknown.body?.occupancy?.managed ?? unknown.body?.data?.occupancy?.managed;
  const noneManaged = none.body?.occupancy?.managed ?? none.body?.data?.occupancy?.managed;
  ok(unknown.status === 200, 'an unknown category is not an error', `HTTP ${unknown.status}`);
  ok(Number(unknownManaged) === Number(noneManaged), 'an unknown category is unfiltered, exactly as no category is',
    `${unknownManaged} vs ${noneManaged}`);
  ok(Number(noneManaged) >= Number(managed), 'the unfiltered view is a superset of the residential one',
    `${noneManaged} >= ${managed}`);

  // Business applications must not appear in the residential console.
  const resApps = await req('GET', '/api/tenant-applications?category=residential&listing_type=rent&limit=200');
  const leaked = (resApps.body?.data || []).filter((a) => String(a.applicant_name || '').includes('E2E Operator'));
  ok(leaked.length === 0, 'the business application does not appear in the residential console', `${leaked.length} leaked`);
}

(async () => {
  console.log(`\n===== BUSINESS RENT E2E (run ${STAMP}) =====`);
  if (!(await login())) return finish();
  await scoping();
  await flow();
  await dashboards();
  await isolation();
  console.log(`\nFixtures created this run: ${JSON.stringify(created)}`);
  finish();
})().catch((e) => { ok(false, 'harness crashed', e.message); finish(); });
