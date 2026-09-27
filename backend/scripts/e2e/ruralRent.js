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

const made = { properties: [], applications: [], assessments: [], protections: [], entries: [], risks: [] };

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

async function disputes() {
  console.log('\n— Disputes: a risk with a lifecycle —');
  const propertyId = made.properties[made.properties.length - 1];

  const junk = await req('POST', '/api/property-risks/disputes?scope=rent', {
    body: { property_id: propertyId, risk_category: 'Not A Category', description: 'x', branch_id: 1 },
  });
  ok(junk.status === 400, 'an unknown dispute category is refused', `HTTP ${junk.status}`);

  const d = await req('POST', '/api/property-risks/disputes', {
    body: {
      property_id: propertyId, risk_category: 'Boundary Dispute',
      description: `Neighbour claims 4 decimal ${STAMP}`, likelihood: 'Medium', impact: 'High', branch_id: 1,
    },
  });
  ok(d.status === 201, 'dispute raised', `HTTP ${d.status}`);
  const id = d.body?.data?.id;
  if (id) made.risks.push(id);
  ok(d.body?.data?.dispute_stage === 'raised', 'it opens at raised', d.body?.data?.dispute_stage);
  ok((d.body?.data?.stage_history || []).length === 1, 'the opening history entry exists');

  // The stage machine is enforced by the API, not merely by the screen.
  const jump = await req('PATCH', `/api/property-risks/${id}/dispute-stage`, { body: { dispute_stage: 'resolved' } });
  ok(jump.status === 400, 'raised cannot jump straight to resolved', jump.body?.error);

  await req('PATCH', `/api/property-risks/${id}/dispute-stage`, { body: { dispute_stage: 'under_review', note: 'Land office records pulled' } });
  const noName = await req('PATCH', `/api/property-risks/${id}/dispute-stage`, { body: { dispute_stage: 'escalated' } });
  ok(noName.status === 400, 'escalating without a recipient is refused', noName.body?.error);
  const esc = await req('PATCH', `/api/property-risks/${id}/dispute-stage`, {
    body: { dispute_stage: 'escalated', escalated_to: 'AC Land, Barura' },
  });
  ok(esc.status === 200 && !!esc.body?.data?.escalated_at, 'escalated, with a timestamp', esc.body?.data?.escalated_at);

  const noRes = await req('PATCH', `/api/property-risks/${id}/dispute-stage`, { body: { dispute_stage: 'resolved' } });
  ok(noRes.status === 400, 'resolving without a resolution is refused', noRes.body?.error);
  const res3 = await req('PATCH', `/api/property-risks/${id}/dispute-stage`, {
    body: { dispute_stage: 'resolved', resolution: 'Boundary re-surveyed' },
  });
  ok(res3.status === 200 && !!res3.body?.data?.resolved_on, 'resolved, with a date', res3.body?.data?.resolved_on);
  const closed = await req('PATCH', `/api/property-risks/${id}/dispute-stage`, { body: { dispute_stage: 'closed' } });
  ok(closed.body?.data?.status === 'closed', 'closing the dispute closes the risk', closed.body?.data?.status);
  const after = await req('PATCH', `/api/property-risks/${id}/dispute-stage`, { body: { dispute_stage: 'raised' } });
  ok(after.status === 400, 'nothing leaves closed', after.body?.error);

  const list = await req('GET', '/api/property-risks/disputes?scope=rent');
  ok((list.body?.data || []).every((x) => x.is_dispute), 'the dispute list contains only disputes');
  ok((list.body?.meta?.categories || []).length === 8, 'the eight lease-side categories are offered',
    String((list.body?.meta?.categories || []).length));
  // A sale-side risk must not be offered to a Rural RENT user.
  ok(!(list.body?.meta?.categories || []).includes('Registration Delay'),
    'no sale-side category leaks into the rent console');
  const saleScoped = await req('GET', '/api/property-risks/disputes?scope=sale');
  ok((saleScoped.body?.meta?.categories || []).includes('Government Acquisition Risk'),
    'the sale scope offers its own four');
  ok(!(saleScoped.body?.meta?.categories || []).includes('Tenant Default'),
    'a sale has no tenant to default');
  const tenantDefaultOnSale = await req('POST', '/api/property-risks/disputes?scope=sale', {
    body: { property_id: propertyId, risk_category: 'Tenant Default', description: `wrong side ${STAMP}`, branch_id: 1 },
  });
  ok(tenantDefaultOnSale.status === 400, 'raising a tenant default on the sale scope is refused',
    tenantDefaultOnSale.body?.error);
  if (tenantDefaultOnSale.body?.data?.id) made.risks.push(tenantDefaultOnSale.body.data.id);
  const mine = (list.body?.data || []).find((x) => x.id === id);
  ok(Array.isArray(mine?.stage_history) && mine.stage_history.length === 5,
    'the whole trail survived the JSON round trip', String(mine?.stage_history?.length));

  // An ordinary risk is untouched by any of this.
  const plain = await req('POST', '/api/property-risks', {
    body: { property_id: propertyId, risk_category: 'Flood', description: `plain risk ${STAMP}`, branch_id: 1 },
  });
  if (plain.body?.data?.id) made.risks.push(plain.body.data.id);
  ok(!plain.body?.data?.is_dispute, 'an ordinary risk is not a dispute');
  const list2 = await req('GET', '/api/property-risks/disputes');
  ok(!(list2.body?.data || []).some((x) => x.id === plain.body?.data?.id), 'it stays out of the dispute list');
  const move = await req('PATCH', `/api/property-risks/${plain.body?.data?.id}/dispute-stage`, { body: { dispute_stage: 'under_review' } });
  ok(move.status === 400, 'and cannot be transitioned', move.body?.error);
}

async function serviceRegisters() {
  console.log('\n— The five service registers —');
  const defs = await req('GET', '/api/registers/definitions');
  const all = defs.body?.data || [];
  const find = (key, vertical) => all.find((d) => d.register_key === key && d.vertical_key === vertical);

  const expected = [
    ['complaint_register', 'rural_rent'],
    ['communication_log', 'rural_rent'],
    ['owner_feedback_register', 'rural_rent'],
    ['closure_register', 'rural_rent'],
    ['tenant_feedback_register', 'rural_tenancy'],
  ];
  for (const [key, vertical] of expected) {
    ok(!!find(key, vertical), `${vertical}/${key} is defined`);
  }

  // Retention is a COLUMN on closure, not a register of its own.
  const closure = find('closure_register', 'rural_rent');
  const cols = (closure?.columns || []).map((c) => c.key);
  ok(cols.includes('retention_until'), 'closure carries the retention date', cols.join(','));
  ok(!all.some((d) => /retention/.test(d.register_key)), 'retention is not a register of its own');

  const complaint = await req('POST', '/api/registers/entries', {
    body: {
      register_definition_id: find('complaint_register', 'rural_rent').id, vertical_key: 'rural_rent',
      property_id: made.properties[made.properties.length - 1],
      data: { date: '2026-09-27', party: 'Tenant', complaint: `Water pump down ${STAMP}`, severity: 'High', action_taken: 'Provider dispatched' },
    },
  });
  ok(complaint.status === 201, 'a complaint is recorded', `HTTP ${complaint.status}`);
  if (complaint.body?.data?.id) made.entries.push(complaint.body.data.id);

  const closureEntry = await req('POST', '/api/registers/entries', {
    body: {
      register_definition_id: closure.id, vertical_key: 'rural_rent',
      data: { project: `E2E rural closure ${STAMP}`, closed_on: '2026-09-27', final_reconciliation: 'Nil balance', records_archived: 'Yes', retention_until: '2031-09-27' },
    },
  });
  ok(closureEntry.status === 201, 'a closure is recorded with its retention date', `HTTP ${closureEntry.status}`);
  ok(closureEntry.body?.data?.data?.retention_until === '2031-09-27', 'the retention date persisted',
    closureEntry.body?.data?.data?.retention_until);
  if (closureEntry.body?.data?.id) made.entries.push(closureEntry.body.data.id);

  const tf = find('tenant_feedback_register', 'rural_tenancy');
  const tfEntries = await req('GET', `/api/registers/entries?register_definition_id=${tf.id}&vertical_key=rural_tenancy`);
  ok(tfEntries.status === 200, 'tenant feedback answers on rural_tenancy', `HTTP ${tfEntries.status}`);

  // Other service lines own their OWN complaint_register and communication_log
  // on their own verticals — that is the design, not a leak. What must hold is
  // that the rural definitions are keyed to rural verticals, and that a rural
  // query returns no other vertical's entries.
  const duplicated = all.filter((d) => ['complaint_register', 'communication_log'].includes(d.register_key));
  ok(duplicated.length > 5, 'each service line keeps its own complaint and communication registers',
    `${duplicated.length} across ${new Set(duplicated.map((d) => d.vertical_key)).size} verticals`);
  for (const [key, vertical] of expected) {
    const mine = all.filter((d) => d.register_key === key && d.vertical_key === vertical);
    ok(mine.length === 1, `${vertical}/${key} is defined exactly once`, String(mine.length));
  }

  const ruralEntries = await req('GET', '/api/registers/entries?category=rural&limit=500');
  const foreign = (ruralEntries.body?.data || []).filter((e) => !/^rural_/.test(String(e.vertical_key || '')));
  ok(foreign.length === 0, 'a rural entry query returns only rural verticals',
    [...new Set(foreign.map((e) => e.vertical_key))].join(',') || 'clean');
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
  for (const id of made.risks) await req('DELETE', `/api/property-risks/${id}`);
  for (const id of made.applications) await req('DELETE', `/api/tenant-applications/${id}`);
  for (const id of made.properties) await req('DELETE', `/api/properties/${id}`);

  const left = await req('GET', '/api/properties?category=rural&limit=200');
  const stragglers = (left.body?.data || []).filter((p) => String(p.title || '').includes(STAMP));
  ok(stragglers.length === 0, 'no fixture properties left behind',
    stragglers.map((p) => p.property_code).join(',') || 'clean');
  const leftDisputes = await req('GET', '/api/property-risks/disputes');
  ok(!(leftDisputes.body?.data || []).some((d) => String(d.description || '').includes(STAMP)),
    'no fixture disputes left behind');
  // Register entries used to be left behind. They are removed now — the
  // protection record has no delete endpoint, so it stays closed instead.
  for (const id of made.entries) await req('DELETE', `/api/registers/entries/${id}`);
  const ruralEntries = await req('GET', '/api/registers/entries?category=rural&limit=500');
  const strays = (ruralEntries.body?.data || [])
    .filter((e) => JSON.stringify(e.data || {}).includes(STAMP));
  ok(strays.length === 0, 'no fixture register entries left behind',
    strays.map((e) => e.id).join(',') || 'clean');
  console.log(`  NOTE: the protection record is closed, not deleted — ${made.protections.length} id(s); there is no delete endpoint for it.`);
}

(async () => {
  console.log(`\n===== RURAL RENT E2E (run ${STAMP}) =====`);
  if (!(await login())) return finish();
  await scoping();
  await flow();
  await agreements();
  await dashboards();
  await disputes();
  await serviceRegisters();
  await isolation();
  await cleanup();
  finish();
})().catch((e) => { ok(false, 'harness crashed', e.message); finish(); });
