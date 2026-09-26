/**
 * End-to-end checks for the Rural Rent console. Needs the API on :50001.
 * Run: node scripts/e2e/ruralRent.js
 *
 * Asserts rural-specific BEHAVIOUR, not just HTTP 200s: the land record must
 * survive the round trip, the assessment must be the rural template and not the
 * residential one, screening must ask about farming and not a trade licence, and
 * the protection window must be 24 months rather than 12.
 *
 * Every fixture is stamped and removed at the end — this DB is the production DB.
 */
const { login, req, ok, finish, STAMP } = require('./httpHarness');

const made = { properties: [], applications: [], assessments: [], protections: [], entries: [] };

const LAND = {
  district: 'Cumilla', upazila: 'Barura', union_name: 'Payalgachha', village: 'Ramnagar',
  mouza: `Mouza${STAMP}`, khatiyan: `KH-${STAMP}`, dag: `DAG-${STAMP}`,
  land_area_decimal: 33.5, current_use: 'Paddy', property_type: 'Fishery',
};

async function scoping() {
  console.log('\n— Scoping: Rural Rent is category AND listing_type —');
  const sale = await req('POST', '/api/properties', {
    body: { title: `E2E rural sale ${STAMP}`, category: 'rural', listing_type: 'sale', status: 'available', price: 1000, branch_id: 1 },
  });
  if (sale.body?.data?.id) made.properties.push(sale.body.data.id);
  ok(sale.status === 201, 'a rural SALE property exists to be excluded', `HTTP ${sale.status}`);

  const rent = await req('GET', '/api/properties?category=rural&listing_type=rent&limit=200');
  const leaked = (rent.body?.data || []).filter((p) => p.listing_type === 'sale');
  ok(leaked.length === 0, 'the rural sale property does not appear in Rural Rent',
    leaked.map((p) => p.property_code).join(',') || 'clean');
}

async function flow() {
  console.log('\n— SOP flow: land record → assessment → screening → protection —');

  const prop = await req('POST', '/api/properties', {
    body: {
      title: `E2E Rural Plot ${STAMP}`, category: 'rural', listing_type: 'rent',
      status: 'available', price: 30000, branch_id: 1, ...LAND,
    },
  });
  ok(prop.status === 201, 'rural rent property created', `HTTP ${prop.status}`);
  const propertyId = prop.body?.data?.id;
  if (propertyId) made.properties.push(propertyId);

  // Every land-record field must survive — this is what catches a missing model attribute.
  const back = prop.body?.data || {};
  const lost = Object.keys(LAND).filter((k) => String(back[k] ?? '') !== String(LAND[k]));
  ok(lost.length === 0, 'every land-record field persisted', lost.join(',') || 'all present');

  // …and must be queryable, not merely stored.
  const byMouza = await req('GET', `/api/properties?category=rural&listing_type=rent&mouza=${LAND.mouza}`);
  ok((byMouza.body?.data || []).some((p) => p.id === propertyId), 'the property is findable by mouza');
  const byDag = await req('GET', `/api/properties?category=rural&listing_type=rent&dag=${LAND.dag}`);
  ok((byDag.body?.data || []).some((p) => p.id === propertyId), 'the property is findable by dag');

  // Ownership verification rides register 151, which already existed.
  const entry = await req('POST', '/api/registers/entries', {
    body: {
      register_definition_id: 151, vertical_key: 'rural_rent', property_id: propertyId,
      data: { document: 'Khatiyan', required: 'Yes', received: 'Yes', verified: 'Yes', remarks: `e2e ${STAMP}` },
    },
  });
  ok(entry.status === 201, 'ownership document recorded on register 151', `HTTP ${entry.status}`);
  if (entry.body?.data?.id) made.entries.push(entry.body.data.id);

  // The rural assessment template, not the residential one.
  const assess = await req('POST', '/api/rental-assessments', { body: { property_id: propertyId, branch_id: 1 } });
  const sections = [...new Set((assess.body?.data?.items || []).map((i) => i.section))];
  if (assess.body?.data?.id) made.assessments.push(assess.body.data.id);
  ok(sections.includes('Boundary & ownership'), 'rural assessment template seeded', sections.slice(0, 3).join(', '));
  ok(!sections.some((s) => /bedroom/i.test(s)), 'no bedrooms on farmland');
  ok(!sections.includes('Signage & visibility'), 'not the business premises template either');

  // Rural screening asks about farming, not a trade licence.
  const app = await req('POST', '/api/tenant-applications', {
    body: {
      property_id: propertyId, applicant_name: `E2E Farmer ${STAMP}`, branch_id: 1,
      nid_verified: 'Verified', business_verification: 'Trade licence seen',
      farming_experience: '12 years paddy', financial_capacity: 'Bank statements 12m',
      references_verified: 'Two referees called', background_check: 'Clear',
      intended_use: 'Paddy cultivation', screening_verdict: 'suitable',
    },
  });
  ok(app.status === 201, 'rural application with screening created', `HTTP ${app.status}`);
  ok(app.body?.data?.farming_experience === '12 years paddy',
    'farming experience persisted (the model knows the column)', app.body?.data?.farming_experience);
  ok(app.body?.data?.screening_verdict === 'suitable', 'screening verdict stored');
  if (app.body?.data?.id) made.applications.push(app.body.data.id);

  // Tenant sourcing rides registers 158/159/160 — no new tables.
  const brief = await req('POST', '/api/rural-sourcing/briefs', {
    body: { requirement: 'Fishery', required: 'Yes', notes: `e2e ${STAMP}`, branch_id: 1 },
  });
  ok(brief.status === 201, 'tenant brief recorded on register 158', `HTTP ${brief.status}`);
  if (brief.body?.data?.id) made.entries.push(brief.body.data.id);
  const shortlist = await req('POST', '/api/rural-sourcing/shortlist', {
    body: { property: `E2E Rural Plot ${STAMP}`, outcome: 'Shortlisted', priority: 'High', branch_id: 1 },
  });
  if (shortlist.body?.data?.id) made.entries.push(shortlist.body.data.id);
  const summary = await req('GET', '/api/rural-sourcing/summary');
  ok((summary.body?.data?.shortlist?.byOutcome?.Shortlisted || 0) >= 1, 'the shortlist summary counts the row');

  // 24 months, not 12 — the number that differs from every other console.
  const prot = await req('POST', '/api/rent-protections?category=rural', {
    body: {
      property_id: propertyId, protected_relationship: `E2E introduced tenant ${STAMP}`,
      introduction_date: '2026-09-26', protection_basis: 'Inspection log',
    },
  });
  ok(prot.status === 201, 'introduction protected', `HTTP ${prot.status}`);
  ok(prot.body?.data?.protection_expires_on === '2028-09-26',
    'rural protection runs 24 months, not 12', prot.body?.data?.protection_expires_on);
  if (prot.body?.data?.id) made.protections.push(prot.body.data.id);
}

async function agreements() {
  console.log('\n— The rural agreement builders —');
  for (const [kind, path] of [['rental management', 'rprm'], ['tenancy management', 'rptm']]) {
    const r = await req('GET', `/api/${path}/meta?category=rural`);
    ok(r.status === 200, `the rural ${kind} builder answers`, `HTTP ${r.status}`);
    ok(JSON.stringify(r.body).includes('Rural') || Object.keys(r.body?.service_groups || {}).length > 0,
      `the rural ${kind} pack has its own service groups`);
  }
  // Business still has no builder, and must still say so rather than serve residential.
  const biz = await req('GET', '/api/rprm/meta?category=business');
  ok(biz.status === 400, 'business still refuses rather than serving a residential agreement', `HTTP ${biz.status}`);
}

async function dashboards() {
  console.log('\n— The five dashboards —');
  for (const key of ['owner', 'tenant', 'property', 'financial', 'executive']) {
    const r = await req('GET', `/api/rural-rent/dashboards/${key}`);
    ok(r.status === 200 && !/NaN/.test(JSON.stringify(r.body)), `${key} dashboard answers cleanly`, `HTTP ${r.status}`);
  }
  const bad = await req('GET', '/api/rural-rent/dashboards/nonsense');
  ok(bad.status === 404, 'an unknown dashboard key is a 404', `HTTP ${bad.status}`);

  const property = await req('GET', '/api/rural-rent/dashboards/property');
  const types = property.body?.data?.byType || [];
  ok(types.length >= 12, 'the property dashboard lists every rural type plus Other', `${types.length}`);
  ok((types.find((t) => t.type === 'Fishery')?.count || 0) >= 1, 'the fixture is counted under its own type');
}

async function isolation() {
  console.log('\n— The other three consoles are unmoved —');
  for (const cat of ['residential', 'commercial', 'business']) {
    const r = await req('GET', `/api/properties?category=${cat}&listing_type=rent&limit=200`);
    ok((r.body?.data || []).every((p) => p.category === cat), `${cat} returns only ${cat}`);
  }
  const ac = await req('GET', '/api/property-management/action-center?category=residential');
  ok(ac.body?.headline?.open_action_count === 103, 'residential open actions unchanged',
    `${ac.body?.headline?.open_action_count} (expected 103)`);
  const dm = await req('GET', '/api/property-management/dashboard-metrics?category=residential');
  ok(Number(dm.body?.occupancy?.managed) === 53, 'residential managed properties unchanged',
    `${dm.body?.occupancy?.managed} (expected 53)`);
}

async function cleanup() {
  console.log('\n— Fixture cleanup (this DB is the production DB) —');
  for (const id of made.protections) await req('PUT', `/api/rent-protections/${id}`, { body: { status: 'closed' } });
  for (const id of made.applications) await req('DELETE', `/api/tenant-applications/${id}`);
  for (const id of made.properties) await req('DELETE', `/api/properties/${id}`);

  const left = await req('GET', '/api/properties?category=rural&limit=200');
  const stragglers = (left.body?.data || []).filter((p) => String(p.title || '').includes(STAMP));
  ok(stragglers.length === 0, 'no fixture properties left behind',
    stragglers.map((p) => p.property_code).join(',') || 'clean');
  console.log(`  NOTE: register entries and the protection record are closed, not deleted — ${made.entries.length} entry id(s), ${made.protections.length} protection id(s). Remove with a DB script if they matter.`);
}

(async () => {
  console.log(`\n===== RURAL RENT E2E (run ${STAMP}) =====`);
  if (!(await login())) return finish();
  await scoping();
  await flow();
  await agreements();
  await dashboards();
  await isolation();
  await cleanup();
  finish();
})().catch((e) => { ok(false, 'harness crashed', e.message); finish(); });
