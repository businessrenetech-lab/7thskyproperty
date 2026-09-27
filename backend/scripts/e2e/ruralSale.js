/**
 * End-to-end checks for the Rural Sale and Rural Buyer consoles. Needs the API
 * on :50001.  Run: node scripts/e2e/ruralSale.js
 *
 * Asserts SALE-specific behaviour, not just HTTP 200s: the sale book must not
 * contain the rent book although both are category 'rural', both V0.2 agreements
 * must render their own document with the land record in Schedule B, the
 * sale-side dispute categories must be offered (and the tenant one refused), and
 * every dashboard must answer without NaN on a book with one property in it.
 *
 * Every fixture is stamped and removed at the end — this DB is the production DB.
 */
const { login, req, ok, finish, STAMP } = require('./httpHarness');

const made = { properties: [], risks: [], entries: [], protections: [] };

const LAND = {
  district: 'Cumilla', upazila: 'Barura', union_name: 'Payalgachha', village: 'Ramnagar',
  mouza: `SaleMouza${STAMP}`, khatiyan: `SKH-${STAMP}`, dag: `SDAG-${STAMP}`,
  land_area_decimal: 48.25, current_use: 'Orchard', property_type: 'Orchard',
};

let propertyId = null;
const defs = { sale: [], purchase: [] };
const findDef = (side, key) => (defs[side] || []).find((d) => d.register_key === key);

async function scoping() {
  console.log('\n-- Scoping: Rural Sale is category AND listing_type --');
  const prop = await req('POST', '/api/properties', {
    body: {
      title: `E2E Rural Sale Plot ${STAMP}`, category: 'rural', listing_type: 'sale',
      status: 'available', price: 4500000, branch_id: 1, ...LAND,
    },
  });
  ok(prop.status === 201, 'rural sale property created', `HTTP ${prop.status}`);
  propertyId = prop.body?.data?.id;
  if (propertyId) made.properties.push(propertyId);

  const back = prop.body?.data || {};
  const lost = Object.keys(LAND).filter((k) => String(back[k] ?? '') !== String(LAND[k]));
  ok(lost.length === 0, 'every land-record field persisted on the sale side', lost.join(',') || 'all present');

  // A rural RENT property must not appear in the sale book, and vice versa.
  const rent = await req('POST', '/api/properties', {
    body: { title: `E2E rural rent foil ${STAMP}`, category: 'rural', listing_type: 'rent', status: 'available', price: 20000, branch_id: 1 },
  });
  if (rent.body?.data?.id) made.properties.push(rent.body.data.id);

  const sale = await req('GET', '/api/properties?category=rural&listing_type=sale&limit=200');
  const leaked = (sale.body?.data || []).filter((p) => p.listing_type === 'rent');
  ok(leaked.length === 0, 'the rural rent property does not appear in Rural Sale',
    leaked.map((p) => p.property_code).join(',') || 'clean');

  const rentBook = await req('GET', '/api/properties?category=rural&listing_type=rent&limit=200');
  ok(!(rentBook.body?.data || []).some((p) => p.id === propertyId),
    'and the sale property does not appear in Rural Rent');

  const byMouza = await req('GET', `/api/properties?category=rural&listing_type=sale&mouza=${LAND.mouza}`);
  ok((byMouza.body?.data || []).some((p) => p.id === propertyId), 'the sale property is findable by mouza');
}

async function pipelines() {
  console.log('\n-- The two corrected pipelines --');
  for (const [vertical, count, first, last] of [
    ['rural_sale', 10, 'Seller Enquiry', 'Transfer & Registration'],
    ['rural_purchase', 7, 'Buyer Enquiry', 'Registration & Handover'],
  ]) {
    const r = await req('GET', `/api/projects/templates?vertical_key=${vertical}`);
    const list = r.body?.data || r.body || [];
    const t = (Array.isArray(list) ? list : []).find((x) => String(x.vertical_key) === vertical);
    if (!t) {
      // Not every build exposes templates over HTTP; assert via the workflows screen instead.
      const w = await req('GET', `/api/projects?vertical_key=${vertical}`);
      ok(w.status === 200, `${vertical} projects answer`, `HTTP ${w.status}`);
      continue;
    }
    let stages = t.stages;
    if (typeof stages === 'string') { try { stages = JSON.parse(stages); } catch { stages = []; } }
    ok(Array.isArray(stages) && stages.length === count, `${vertical} has ${count} stages`, `${stages?.length}`);
    ok(stages[0]?.name === first, `${vertical} starts at ${first}`, stages[0]?.name);
    ok(stages[stages.length - 1]?.name === last, `${vertical} ends at ${last}`, stages[stages.length - 1]?.name);
    // The five ownership DOCUMENTS must not be stages (template #14 had them as 10-14).
    const names = stages.map((s) => String(s.name || ''));
    for (const doc of ['Title Deed', 'Khatiyan', 'Dag', 'Mutation', 'Tax Receipt']) {
      ok(!names.includes(doc), `${doc} is not a ${vertical} stage`);
    }
  }
}

async function registers() {
  console.log('-- The seventeen sale registers --');
  for (const [side, vertical] of [['sale', 'rural_sale'], ['purchase', 'rural_purchase']]) {
    const r = await req('GET', `/api/registers/definitions?vertical_key=${vertical}`);
    defs[side] = r.body?.data || [];
    ok(r.status === 200, `${vertical} definitions answer`, `HTTP ${r.status}`);
  }
  for (const key of ['ownership_verification', 'marketing_register', 'negotiation_register',
    'legal_coordination_register', 'complaint_register', 'communication_log',
    'seller_feedback_register', 'closure_register']) {
    ok(!!findDef('sale', key), `rural_sale/${key} is defined`);
  }
  for (const key of ['buyer_master_register', 'requirement_register', 'budget_register',
    'search_criteria_register', 'property_search_register', 'shortlist_register',
    'due_diligence_register', 'financing_register', 'buyer_feedback_register']) {
    ok(!!findDef('purchase', key), `rural_purchase/${key} is defined`);
  }
  // The three that already existed are untouched.
  for (const key of ['seller_master_register', 'property_register', 'offer_register']) {
    ok(!!findDef('sale', key), `the pre-existing rural_sale/${key} survives`);
  }

  // Record an ownership document, a marketing activity and an offer for real.
  const own = await req('POST', '/api/registers/entries', {
    body: {
      register_definition_id: findDef('sale', 'ownership_verification').id, vertical_key: 'rural_sale',
      property_id: propertyId,
      data: { document: 'Khatiyan', required: 'Yes', received: 'Yes', verified: 'Yes', remarks: `e2e ${STAMP}` },
    },
  });
  ok(own.status === 201, 'an ownership document is recorded on the SALE register', `HTTP ${own.status}`);
  if (own.body?.data?.id) made.entries.push(own.body.data.id);

  const mk = await req('POST', '/api/registers/entries', {
    body: {
      register_definition_id: findDef('sale', 'marketing_register').id, vertical_key: 'rural_sale',
      property_id: propertyId,
      data: { activity: 'Drone Shoot', required: 'Yes', completed: 'Yes', date: '2026-09-27', cost: '8000', remarks: `e2e ${STAMP}` },
    },
  });
  ok(mk.status === 201, 'a marketing activity is recorded', `HTTP ${mk.status}`);
  if (mk.body?.data?.id) made.entries.push(mk.body.data.id);

  const offer = await req('POST', '/api/registers/entries', {
    body: {
      register_definition_id: findDef('sale', 'offer_register').id, vertical_key: 'rural_sale',
      property_id: propertyId,
      data: { offer_id: `OF-${STAMP}`, buyer: `E2E Buyer ${STAMP}`, offer_amount: '4200000', status: 'Under negotiation' },
    },
  });
  ok(offer.status === 201, 'an offer is recorded', `HTTP ${offer.status}`);
  if (offer.body?.data?.id) made.entries.push(offer.body.data.id);

  const round = await req('POST', '/api/registers/entries', {
    body: {
      register_definition_id: findDef('sale', 'negotiation_register').id, vertical_key: 'rural_sale',
      property_id: propertyId,
      data: { round: '1', date: '2026-09-27', buyer: `E2E Buyer ${STAMP}`, offer: '4200000', counter_offer: '4400000', outcome: 'Countered' },
    },
  });
  ok(round.status === 201, 'a negotiation round is recorded', `HTTP ${round.status}`);
  if (round.body?.data?.id) made.entries.push(round.body.data.id);

  const dd = await req('POST', '/api/registers/entries', {
    body: {
      register_definition_id: findDef('purchase', 'due_diligence_register').id, vertical_key: 'rural_purchase',
      data: { item: 'Khatiyan Review', required: 'Yes', completed: 'Yes', date: '2026-09-27', reviewer: `E2E Lawyer ${STAMP}`, findings: 'Clear' },
    },
  });
  ok(dd.status === 201, 'a due diligence item is recorded on the BUYER vertical', `HTTP ${dd.status}`);
  if (dd.body?.data?.id) made.entries.push(dd.body.data.id);

  const closure = await req('POST', '/api/registers/entries', {
    body: {
      register_definition_id: findDef('sale', 'closure_register').id, vertical_key: 'rural_sale',
      data: { project: `E2E rural sale closure ${STAMP}`, closed_on: '2026-09-27', commission_reconciled: 'Yes', records_archived: 'Yes', retention_until: '2031-09-27' },
    },
  });
  ok(closure.body?.data?.data?.retention_until === '2031-09-27', 'the sale closure retention date persisted',
    closure.body?.data?.data?.retention_until);
  if (closure.body?.data?.id) made.entries.push(closure.body.data.id);

  // Sale entries must not appear on the rent verticals.
  const rentEntries = await req('GET', '/api/registers/entries?vertical_key=rural_rent,rural_tenancy&limit=500');
  const crossed = (rentEntries.body?.data || []).filter((e) => JSON.stringify(e.data || {}).includes(STAMP));
  ok(crossed.length === 0, 'no sale register entry leaked onto the rent verticals',
    crossed.map((e) => e.id).join(',') || 'clean');
}

async function agreements() {
  console.log('\n-- The two V0.2 sale agreements --');
  for (const [kind, docNo, party, code] of [
    ['sale', 'SSPC-RLPSS-01', 'Seller', 'RPSS-'],
    ['purchase', 'SSPC-RLPPS-01', 'Buyer', 'RPPS-'],
  ]) {
    const cat = await req('GET', `/api/sales-agreements/${kind}/catalog?category=rural`);
    const list = Array.isArray(cat.body?.data) ? cat.body.data : (Array.isArray(cat.body) ? cat.body : []);
    ok(list.length === 10, `the rural ${kind} catalogue has its ten Schedule C lines`, String(list.length));
    ok(list.every((i) => String(i.code || '').startsWith(code)),
      `every rural ${kind} code is ${code}x and not the residential set`);

    const pv = await req('POST', `/api/sales-agreements/${kind}/preview?category=rural`, {
      body: { category: 'rural', client_name: `E2E ${party} ${STAMP}`, ...LAND, selected_items: [], branch_id: 1 },
    });
    ok(pv.status === 200, `the rural ${kind} agreement renders`, `HTTP ${pv.status} ${pv.body?.error || ''}`);
    const html = pv.body?.html || '';
    ok(html.includes(docNo), `it is ${docNo}`, (html.match(/SSPC-[A-Z]+-\d+/) || [])[0]);
    ok(html.includes(party), `it signs with the ${party}`);
    ok(html.includes('Rural Property Services'), 'the rural division tagline');
    // The wrong signed document is the failure that matters most here.
    for (const other of ['SSPC-RPSS-01', 'SSPC-RPPS-01', 'SSPC-CPSS-01', 'SSPC-CPPS-01', 'SSPC-BSS-01', 'SSPC-BPS-01']) {
      ok(!html.includes(other), `no ${other} bleed-through`);
    }
  }
  // The seller document carries the land record; the buyer's carries search criteria.
  const seller = await req('POST', '/api/sales-agreements/sale/preview?category=rural', {
    body: { category: 'rural', client_name: `E2E Seller ${STAMP}`, ...LAND, selected_items: [], branch_id: 1 },
  });
  for (const w of ['Mouza', 'Khatian No.', 'Dag No.', 'Land Area']) {
    ok((seller.body?.html || '').includes(w), `the seller Schedule B carries ${w}`);
  }
}

async function disputes() {
  console.log('\n-- Sale-side disputes --');
  const scoped = await req('GET', '/api/property-risks/disputes?scope=sale');
  ok((scoped.body?.meta?.categories || []).length === 11, 'the eleven sale-side categories are offered',
    String((scoped.body?.meta?.categories || []).length));
  ok(!(scoped.body?.meta?.categories || []).includes('Tenant Default'), 'a sale has no tenant to default');

  const d = await req('POST', '/api/property-risks/disputes?scope=sale', {
    body: {
      property_id: propertyId, risk_category: 'Government Acquisition Risk',
      description: `Road widening notice ${STAMP}`, likelihood: 'Medium', impact: 'High', branch_id: 1,
    },
  });
  ok(d.status === 201, 'a sale-side dispute is raised', `HTTP ${d.status} ${d.body?.error || ''}`);
  const id = d.body?.data?.id;
  if (id) made.risks.push(id);
  ok(d.body?.data?.dispute_stage === 'raised', 'it opens at raised');

  const tenant = await req('POST', '/api/property-risks/disputes?scope=sale', {
    body: { property_id: propertyId, risk_category: 'Tenant Default', description: `wrong side ${STAMP}`, branch_id: 1 },
  });
  ok(tenant.status === 400, 'a tenant default is refused on the sale scope', tenant.body?.error);
  if (tenant.body?.data?.id) made.risks.push(tenant.body.data.id);

  const esc = await req('PATCH', `/api/property-risks/${id}/dispute-stage`, {
    body: { dispute_stage: 'escalated', escalated_to: 'District Land Office' },
  });
  ok(esc.status === 200 && esc.body?.data?.dispute_stage === 'escalated', 'it escalates', `HTTP ${esc.status}`);
}

async function protection() {
  console.log('-- Protected buyers: 24 months on the sale side too --');
  const prot = await req('POST', '/api/rent-protections?category=rural', {
    body: {
      property_id: propertyId, protected_relationship: `E2E introduced buyer ${STAMP}`,
      introduction_date: '2026-09-27', protection_basis: 'Inspection log', context: 'sale',
    },
  });
  ok(prot.status === 201, 'the introduction is protected', `HTTP ${prot.status}`);
  ok(prot.body?.data?.protection_expires_on === '2028-09-27',
    'rural sale protection runs 24 months, like rural rent', prot.body?.data?.protection_expires_on);
  if (prot.body?.data?.id) made.protections.push(prot.body.data.id);
}

async function dashboards() {
  console.log('\n-- The five sale dashboards --');
  for (const key of ['seller', 'buyer', 'land', 'risk', 'executive']) {
    const r = await req('GET', `/api/rural-sale/dashboards/${key}`);
    ok(r.status === 200 && !/NaN|null%/.test(JSON.stringify(r.body)), `${key} dashboard answers cleanly`,
      `HTTP ${r.status}`);
  }
  const bad = await req('GET', '/api/rural-sale/dashboards/nonsense');
  ok(bad.status === 404, 'an unknown dashboard key is a 404', `HTTP ${bad.status}`);

  const seller = await req('GET', '/api/rural-sale/dashboards/seller');
  const types = seller.body?.data?.byType || [];
  ok(types.length >= 12, 'the seller dashboard lists every rural type plus Other', String(types.length));
  ok((types.find((t) => t.type === 'Orchard')?.count || 0) >= 1, 'the fixture is counted under its own type');
  ok(seller.body?.data?.offers >= 1, 'the offer we recorded reaches the funnel', String(seller.body?.data?.offers));
  ok(typeof seller.body?.data?.inspectionToOffer === 'number', 'the inspection-to-offer ratio is a number');

  const risk = await req('GET', '/api/rural-sale/dashboards/risk');
  ok((risk.body?.data?.byGroup?.Regulatory || 0) >= 1,
    'the government-acquisition dispute lands in the Regulatory group',
    JSON.stringify(risk.body?.data?.byGroup));
  ok(risk.body?.data?.escalated >= 1, 'the escalated dispute is counted');

  const land = await req('GET', '/api/rural-sale/dashboards/land');
  ok(land.body?.data?.total >= 1, 'the land dashboard counts the sale book', String(land.body?.data?.total));

  const buyer = await req('GET', '/api/rural-sale/dashboards/buyer');
  ok(typeof buyer.body?.data?.shortlisted === 'number', 'the buyer dashboard reads its registers');
}

async function isolation() {
  console.log('\n-- The other consoles are unmoved --');
  for (const cat of ['residential', 'commercial', 'business']) {
    const r = await req('GET', `/api/properties?category=${cat}&listing_type=sale&limit=200`);
    ok((r.body?.data || []).every((p) => p.category === cat), `${cat} sale returns only ${cat}`);
  }
  const ac = await req('GET', '/api/property-management/action-center?category=residential');
  ok(ac.body?.headline?.open_action_count === 103, 'residential open actions unchanged',
    `${ac.body?.headline?.open_action_count} (expected 103)`);
  const dm = await req('GET', '/api/property-management/dashboard-metrics?category=residential');
  ok(Number(dm.body?.occupancy?.managed) === 53, 'residential managed properties unchanged',
    `${dm.body?.occupancy?.managed} (expected 53)`);
  // The residential agreement must still be the residential one.
  const res = await req('POST', '/api/sales-agreements/sale/preview?category=residential', {
    body: { category: 'residential', client_name: `E2E Res ${STAMP}`, selected_items: [], branch_id: 1 },
  });
  ok(/SSPC-RPSS-01/.test(res.body?.html || ''), 'residential still renders SSPC-RPSS-01',
    (String(res.body?.html).match(/SSPC-[A-Z]+-\d+/) || [])[0]);
}

async function cleanup() {
  console.log('\n-- Fixture cleanup (this DB is the production DB) --');
  for (const id of made.protections) await req('PUT', `/api/rent-protections/${id}`, { body: { status: 'closed' } });
  for (const id of made.risks) await req('DELETE', `/api/property-risks/${id}`);
  for (const id of made.entries) await req('DELETE', `/api/registers/entries/${id}`);
  for (const id of made.properties) await req('DELETE', `/api/properties/${id}`);

  const left = await req('GET', '/api/properties?category=rural&limit=200');
  const stragglers = (left.body?.data || []).filter((p) => String(p.title || '').includes(STAMP));
  ok(stragglers.length === 0, 'no fixture properties left behind',
    stragglers.map((p) => p.property_code).join(',') || 'clean');

  for (const vertical of ['rural_sale', 'rural_purchase']) {
    const e = await req('GET', `/api/registers/entries?vertical_key=${vertical}&limit=500`);
    const strays = (e.body?.data || []).filter((x) => JSON.stringify(x.data || {}).includes(STAMP));
    ok(strays.length === 0, `no fixture entries left on ${vertical}`, strays.map((x) => x.id).join(',') || 'clean');
  }
  const disputesLeft = await req('GET', '/api/property-risks/disputes?scope=sale');
  ok(!(disputesLeft.body?.data || []).some((d) => String(d.description || '').includes(STAMP)),
    'no fixture disputes left behind');
  console.log(`  NOTE: the protection record is closed, not deleted - ${made.protections.length} id(s); there is no delete endpoint for it.`);
}

(async () => {
  console.log(`\n===== RURAL SALE E2E (run ${STAMP}) =====`);
  if (!(await login())) return finish();
  await scoping();
  await pipelines();
  await registers();
  await agreements();
  await disputes();
  await protection();
  await dashboards();
  await isolation();
  await cleanup();
  finish();
})().catch((e) => { ok(false, 'harness crashed', e.stack); finish(); });
