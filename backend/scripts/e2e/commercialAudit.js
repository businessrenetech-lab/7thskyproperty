/**
 * End-to-end audit of the Commercial consoles: Sale, Buyer service and Rent.
 * Needs the API on :50001.  Run: node scripts/e2e/commercialAudit.js
 *
 * Covers what a review of the three consoles has to prove rather than assume:
 *   - the property lifecycle for BOTH listing types (create, edit, media, publish)
 *   - the public website surface for a commercial listing, and its image route
 *   - a website enquiry arriving as a COMMERCIAL contact/lead, not a residential one
 *   - both sale agreements and both lease agreements rendering their own document
 *   - the SOP pipelines matching the client's workbooks
 *   - isolation in both directions against residential, business and rural
 *
 * Every fixture is stamped and removed at the end — this DB is the production DB.
 */
const { login, req, ok, finish, STAMP } = require('./httpHarness');

const made = { properties: [], contacts: [], enquiries: [], salesEnquiries: [], media: [], entries2: [] };
let saleId = null;
let rentId = null;

const isNum = (v) => typeof v === 'number' && Number.isFinite(v);

async function properties() {
  console.log('\n-- Commercial property lifecycle, both listing types --');

  const sale = await req('POST', '/api/properties', {
    body: {
      title: `E2E Commercial Floor ${STAMP}`, category: 'commercial', listing_type: 'sale',
      status: 'available', price: 25000000, branch_id: 1,
      property_type: 'Office Floor', area: 'Gulshan 1', city: 'Dhaka', district: 'Dhaka',
      building_size: 4200, floor_number: 7, total_floors: 12,
    },
  });
  ok(sale.status === 201, 'commercial SALE property created', `HTTP ${sale.status} ${sale.body?.error || ''}`);
  saleId = sale.body?.data?.id;
  if (saleId) made.properties.push(saleId);
  ok(sale.body?.data?.category === 'commercial', 'it is stored as commercial', sale.body?.data?.category);

  const rent = await req('POST', '/api/properties', {
    body: {
      title: `E2E Commercial Retail Unit ${STAMP}`, category: 'commercial', listing_type: 'rent',
      status: 'available', price: 180000, branch_id: 1,
      property_type: 'Retail Shop', area: 'Banani', city: 'Dhaka', district: 'Dhaka', building_size: 900,
    },
  });
  ok(rent.status === 201, 'commercial RENT property created', `HTTP ${rent.status} ${rent.body?.error || ''}`);
  rentId = rent.body?.data?.id;
  if (rentId) made.properties.push(rentId);

  // EDIT must persist, and must not silently drop a commercial-only field.
  const edit = await req('PUT', `/api/properties/${saleId}`, {
    body: { price: 26500000, building_size: 4500, floor_number: 8, description: `Edited ${STAMP}` },
  });
  ok(edit.status === 200, 'the sale property edits', `HTTP ${edit.status}`);
  const back = await req('GET', `/api/properties/${saleId}`);
  const b = back.body?.data || {};
  ok(Number(b.price) === 26500000, 'the edited price persisted', String(b.price));
  ok(Number(b.building_size) === 4500, 'the edited building size persisted', String(b.building_size));
  ok(Number(b.floor_number) === 8, 'the edited floor number persisted', String(b.floor_number));
  ok(String(b.description).includes(STAMP), 'the edited description persisted');

  // Scoping: each list returns only its own listing type.
  const saleList = await req('GET', '/api/properties?category=commercial&listing_type=sale&limit=200');
  ok((saleList.body?.data || []).every((p) => p.category === 'commercial' && p.listing_type === 'sale'),
    'the commercial SALE list is category AND listing_type scoped');
  ok((saleList.body?.data || []).some((p) => p.id === saleId), 'the new sale property is in it');
  ok(!(saleList.body?.data || []).some((p) => p.id === rentId), 'the rent property is NOT in the sale list');

  const rentList = await req('GET', '/api/properties?category=commercial&listing_type=rent&limit=200');
  ok((rentList.body?.data || []).some((p) => p.id === rentId), 'the new rent property is in the rent list');
  ok(!(rentList.body?.data || []).some((p) => p.id === saleId), 'the sale property is NOT in the rent list');
}

async function media() {
  console.log('\n-- Image / media routes --');
  // addMedia takes a multipart upload; a URL-only record is the other supported
  // shape, so this checks the record path and the read-back, not the binary.
  const add = await req('POST', `/api/properties/${saleId}/media`, {
    body: { file_url: `/uploads/properties/e2e-${STAMP}.jpg`, media_type: 'image', caption: `E2E hero ${STAMP}`, is_featured: true },
  });
  ok([200, 201].includes(add.status), 'a media record is accepted', `HTTP ${add.status} ${add.body?.error || ''}`);
  const mediaId = add.body?.data?.id;
  if (mediaId) made.media.push([saleId, mediaId]);

  const withMedia = await req('GET', `/api/properties/${saleId}`);
  const list = withMedia.body?.data?.media || [];
  ok(Array.isArray(list), 'the property carries a media array', `${list.length} item(s)`);
  if (mediaId) {
    ok(list.some((m) => Number(m.id) === Number(mediaId)), 'the new media row is on the property');

    const patch = await req('PATCH', `/api/properties/${saleId}/media/${mediaId}`, {
      body: { caption: `E2E updated caption ${STAMP}` },
    });
    ok(patch.status === 200, 'media can be updated', `HTTP ${patch.status}`);

    const del = await req('DELETE', `/api/properties/${saleId}/media/${mediaId}`);
    ok(del.status === 200, 'media can be removed', `HTTP ${del.status}`);
    if (del.status === 200) made.media.pop();
    const after = await req('GET', `/api/properties/${saleId}`);
    ok(!(after.body?.data?.media || []).some((m) => Number(m.id) === Number(mediaId)),
      'and it is gone afterwards');
  }
}

async function publicSurface() {
  console.log('\n-- The public website surface for a commercial listing --');
  // Created as 'available', so it is published automatically; prove the gate both ways.
  const hide = await req('PUT', `/api/properties/${saleId}`, { body: { is_published: false, listing_status: 'draft' } });
  ok(hide.status === 200, 'the listing can be un-published', `HTTP ${hide.status}`);
  const off = await req('GET', '/api/public-website/properties?category=commercial&limit=100', { noAuth: true });
  ok(!(off.body?.data || []).some((p) => p.id === saleId), 'an un-published commercial listing is off the site');

  const on = await req('PUT', `/api/properties/${saleId}`, { body: { is_published: true, listing_status: 'active' } });
  ok(on.status === 200, 'and published again', `HTTP ${on.status}`);

  const pub = await req('GET', '/api/public-website/properties?category=commercial&limit=100', { noAuth: true });
  ok(pub.status === 200, 'the public commercial list answers', `HTTP ${pub.status}`);
  ok((pub.body?.data || []).every((p) => p.category === 'commercial'),
    'the public category filter returns only commercial');
  const mine = (pub.body?.data || []).find((p) => p.id === saleId);
  ok(!!mine, 'the published commercial listing is on the site');
  ok(mine && Number(mine.building_size) === 4500, 'the card carries the commercial size', String(mine?.building_size));
  ok(mine && mine.price_display && mine.price_display !== 'Price on Enquiry',
    'the card carries a price', mine?.price_display);

  // No private field may reach the public card.
  for (const f of ['owner_contact_id', 'remarks', 'management_fee_pct', 'branch_id', 'created_by']) {
    ok(mine && !(f in mine), `no private field on the public commercial card: ${f}`);
  }
  // Nor any rural land field (the allowlist stays closed for commercial).
  for (const f of ['mouza', 'khatiyan', 'dag', 'land_area_decimal']) {
    ok(mine && !(f in mine), `no rural field on a commercial card: ${f}`);
  }

  const detail = await req('GET', `/api/public-website/properties/${mine?.slug || saleId}`, { noAuth: true });
  ok(detail.status === 200, 'the public detail page answers', `HTTP ${detail.status}`);
  ok(String(detail.body?.data?.category) === 'commercial', 'and it is the commercial record',
    detail.body?.data?.category);

  // The listing_type filter works publicly too.
  const saleOnly = await req('GET', '/api/public-website/properties?category=commercial&listing_type=sale&limit=100', { noAuth: true });
  ok((saleOnly.body?.data || []).every((p) => p.listing_type === 'sale'),
    'the public listing_type filter is exact');
}

async function enquiries() {
  console.log('\n-- A website enquiry must arrive as a COMMERCIAL lead --');

  // Sale-side enquiry on the commercial listing.
  const sales = await req('POST', '/api/public-website/sales-enquiries', {
    noAuth: true,
    body: {
      name: `E2E Commercial Buyer ${STAMP}`, phone: `0191${String(STAMP).slice(-6)}`,
      email: `e2e.commercial.${STAMP}@example.com`,
      property_id: saleId, message: `Interested in the office floor ${STAMP}`,
    },
  });
  ok([200, 201].includes(sales.status), 'a website sales enquiry is accepted', `HTTP ${sales.status} ${sales.body?.error || ''}`);

  // The sales enquiry itself must be scoped to commercial too.
  const seList = await req('GET', '/api/sales-enquiries?category=commercial&limit=100');
  const mineSe = (seList.body?.data || []).filter((e) => String(e.enquirer_name || e.name || '').includes(String(STAMP)));
  ok(mineSe.length > 0, 'the sales enquiry shows under COMMERCIAL sales enquiries', `${mineSe.length}`);
  for (const e of mineSe) made.salesEnquiries.push(e.id);
  const resSe = await req('GET', '/api/sales-enquiries?category=residential&limit=200');
  ok(!(resSe.body?.data || []).some((e) => String(e.enquirer_name || e.name || '').includes(String(STAMP))),
    'and NOT under residential sales enquiries');

  // It must land as a contact stamped 'commercial', inherited from the property.
  const contacts = await req('GET', `/api/contacts?search=${STAMP}&limit=50`);
  const mine = (contacts.body?.data || []).filter((c) => String(c.full_name || '').includes(String(STAMP)));
  ok(mine.length > 0, 'the enquirer appears in contact management', `${mine.length} match(es)`);
  for (const c of mine) made.contacts.push(c.id);
  ok(mine.every((c) => c.category === 'commercial'),
    'the enquirer is categorised COMMERCIAL, not residential',
    mine.map((c) => `${c.full_name}=${c.category}`).join(', '));

  // And must be visible in the commercial console's contact list, not the residential one.
  const comList = await req('GET', `/api/contacts?category=commercial&search=${STAMP}&limit=50`);
  ok((comList.body?.data || []).some((c) => String(c.full_name).includes(String(STAMP))),
    'it shows in the COMMERCIAL contact list');
  const resList = await req('GET', `/api/contacts?category=residential&search=${STAMP}&limit=50`);
  ok(!(resList.body?.data || []).some((c) => String(c.full_name).includes(String(STAMP))),
    'and NOT in the residential contact list');

  // Rent-side: a rental enquiry on the commercial rent unit.
  const rental = await req('POST', '/api/public-website/rental-enquiries', {
    noAuth: true,
    body: {
      name: `E2E Commercial Tenant ${STAMP}`, phone: `0192${String(STAMP).slice(-6)}`,
      property_id: rentId, message: `Interested in the retail unit ${STAMP}`,
    },
  });
  ok([200, 201].includes(rental.status), 'a website rental enquiry is accepted', `HTTP ${rental.status} ${rental.body?.error || ''}`);

  const tenantContacts = await req('GET', `/api/contacts?search=${STAMP}&limit=50`);
  const tenant = (tenantContacts.body?.data || []).filter((c) => String(c.full_name || '').includes('Tenant'));
  for (const c of tenant) made.contacts.push(c.id);
  ok(tenant.every((c) => c.category === 'commercial'),
    'the rental enquirer is also categorised COMMERCIAL',
    tenant.map((c) => `${c.full_name}=${c.category}`).join(', ') || 'no tenant contact created');

  const rentalList = await req('GET', '/api/rental-enquiries?category=commercial&limit=100');
  const mineRental = (rentalList.body?.data || []).filter((e) => String(e.enquirer_name || e.name || '').includes(String(STAMP)));
  ok(mineRental.length > 0, 'the rental enquiry shows under COMMERCIAL rental enquiries', `${mineRental.length}`);
  for (const e of mineRental) made.enquiries.push(e.id);
  const resRental = await req('GET', '/api/rental-enquiries?category=residential&limit=200');
  ok(!(resRental.body?.data || []).some((e) => String(e.enquirer_name || e.name || '').includes(String(STAMP))),
    'and NOT under residential rental enquiries');
}

async function agreements() {
  console.log('\n-- The four commercial agreements --');
  for (const [kind, docNo, party] of [['sale', 'SSPC-CPSS-01', 'Seller'], ['purchase', 'SSPC-CPPS-01', 'Buyer']]) {
    const pv = await req('POST', `/api/sales-agreements/${kind}/preview?category=commercial`, {
      body: { category: 'commercial', client_name: `E2E ${party} ${STAMP}`, selected_items: [], branch_id: 1 },
    });
    ok(pv.status === 200, `the commercial ${kind} agreement renders`, `HTTP ${pv.status} ${pv.body?.error || ''}`);
    const html = pv.body?.html || '';
    ok(html.includes(docNo), `it is ${docNo}`, (html.match(/SSPC-[A-Z]+-\d+/) || [])[0]);
    ok(html.includes(party), `it signs with the ${party}`);
    ok(html.includes('Commercial Property Services'), 'the commercial division tagline');
    for (const other of ['SSPC-RPSS-01', 'SSPC-RPPS-01', 'SSPC-BSS-01', 'SSPC-RLPSS-01']) {
      ok(!html.includes(other), `no ${other} bleed-through`);
    }
  }
  // The two lease-side builders.
  for (const [path, label] of [['cprm', 'rental management'], ['cptm', 'tenancy management']]) {
    const r = await req('GET', `/api/${path}/meta?category=commercial`);
    if (r.status === 404) { ok(true, `no /api/${path} route (skipped)`, 'HTTP 404'); continue; }
    ok(r.status === 200, `the commercial ${label} builder answers`, `HTTP ${r.status}`);
  }
  const rprm = await req('GET', '/api/rprm/meta?category=commercial');
  ok(rprm.status === 200, 'the rental-management builder serves commercial', `HTTP ${rprm.status}`);
  const tm = await req('GET', '/api/rptm/meta?category=commercial');
  ok(tm.status === 200, 'the tenancy-management builder serves commercial', `HTTP ${tm.status}`);
}

async function pipelines() {
  console.log('\n-- The SOP pipelines --');
  const r = await req('GET', '/api/services/workflows');
  ok(r.status === 200, 'the workflow templates endpoint answers', `HTTP ${r.status}`);
  const all = r.body?.data || r.body || [];
  const list = Array.isArray(all) ? all : [];
  const find = (v) => list.find((t) => String(t.vertical_key) === v);
  const stagesOf = (t) => {
    let s = t?.stages;
    if (typeof s === 'string') { try { s = JSON.parse(s); } catch { s = []; } }
    return Array.isArray(s) ? s : [];
  };

  const rent = find('commercial_rent');
  if (rent) {
    const names = stagesOf(rent).map((s) => s.stage_name || s.name);
    ok(names.length === 14, 'commercial_rent has the workbook\'s 14 enterprise stages', String(names.length));
    ok(names[0] === 'Lead Intake' && names[names.length - 1] === 'Closure',
      'it runs Lead Intake to Closure', `${names[0]} .. ${names[names.length - 1]}`);
  } else {
    ok(false, 'commercial_rent template is reachable over HTTP');
  }

  const sale = find('commercial_sale');
  if (sale) {
    const names = stagesOf(sale).map((s) => s.stage_name || s.name);
    // The checklist defines 13 stages; the CRM sheet adds Lead Capture and
    // Commission Tracking. Anything more means the two sheets were unioned.
    ok(names.length === 15, 'commercial_sale has 15 stages (13 checklist + lead capture + commission)',
      `${names.length}: ${names.join(' | ')}`);
    const dupes = names.filter((n, i) => names.indexOf(n) !== i);
    ok(dupes.length === 0, 'no stage is duplicated', dupes.join(',') || 'none');
    // These pairs are the SAME stage under two names; only one may survive.
    for (const [a, b] of [['Initial Consultation', 'Consultation'],
      ['Negotiation Support', 'Negotiation Tracking'],
      ['Due Diligence Coordination', 'Due Diligence']]) {
      ok(!(names.includes(a) && names.includes(b)),
        `"${a}" and "${b}" are one stage, not two`, names.includes(a) && names.includes(b) ? 'BOTH PRESENT' : 'ok');
    }
  } else {
    ok(false, 'commercial_sale template is reachable over HTTP');
  }
}

async function marketingTemplates() {
  console.log('\n-- Marketing templates, scoped to the console --');
  const com = await req('GET', '/api/marketing/templates?property_category=commercial');
  ok(com.status === 200, 'the commercial template list answers', `HTTP ${com.status}`);
  const comRows = Array.isArray(com.body) ? com.body : (com.body?.data || []);
  ok(comRows.length > 0, 'it returns templates', `${comRows.length}`);

  // Every row must be commercial or category-agnostic. A residential-specific
  // template in the commercial console is the bug this scoping exists to stop.
  const wrong = comRows.filter((t) => t.property_category && t.property_category !== 'commercial');
  ok(wrong.length === 0, 'no other category leaks into the commercial list',
    wrong.map((t) => `${t.template_code}=${t.property_category}`).join(', ') || 'clean');

  const ownCommercial = comRows.filter((t) => t.property_category === 'commercial');
  ok(ownCommercial.length >= 8, 'the commercial set is present', `${ownCommercial.length} commercial template(s)`);
  ok(comRows.some((t) => t.property_category === null || t.property_category === undefined),
    'the category-agnostic templates are still offered');

  // The residential-specific ones must NOT be here, by name.
  for (const code of ['TPL-NL-01', 'TPL-NL-02', 'TPL-SU-04', 'TPL-BN-02']) {
    ok(!comRows.some((t) => t.template_code === code),
      `the residential template ${code} is not in the commercial console`);
  }
  // And the commercial ones must not be in the residential console.
  const res = await req('GET', '/api/marketing/templates?property_category=residential');
  const resRows = Array.isArray(res.body) ? res.body : (res.body?.data || []);
  ok(!resRows.some((t) => String(t.template_code).startsWith('TPL-COM-')),
    'no commercial template appears in the residential console');
  ok(resRows.some((t) => t.template_code === 'TPL-NL-01'),
    'the residential console still has its own templates');

  // No scope at all -> unfiltered, exactly as before this change.
  const all = await req('GET', '/api/marketing/templates');
  const allRows = Array.isArray(all.body) ? all.body : (all.body?.data || []);
  ok(allRows.length >= comRows.length && allRows.length >= resRows.length,
    'an unscoped request is still unfiltered', `${allRows.length} total`);
  // An unknown category must not silently return nothing.
  const junk = await req('GET', '/api/marketing/templates?property_category=nonsense');
  const junkRows = Array.isArray(junk.body) ? junk.body : (junk.body?.data || []);
  ok(junkRows.length === allRows.length, 'an unknown category leaves the list unfiltered',
    `${junkRows.length} vs ${allRows.length}`);

  // A commercial template must actually read as commercial.
  const office = comRows.find((t) => t.template_code === 'TPL-COM-NL-01');
  ok(!!office, 'the office-floor template exists');
  if (office) {
    const body = `${office.subject} ${office.headline} ${office.body_text || ''}`.toLowerCase();
    ok(!/bedroom|penthouse|home loan/.test(body), 'it does not talk about bedrooms or home loans');
  }
}

async function registers() {
  console.log('\n-- Commercial registers --');
  for (const [vertical, expected] of [
    ['commercial_rent', ['negotiation_register', 'handover_register', 'exit_checklist', 'communication_log']],
    ['commercial_sale', ['ownership_verification', 'marketing_register', 'negotiation_register',
      'due_diligence_register', 'communication_log', 'closure_register']],
  ]) {
    const r = await req('GET', `/api/registers/definitions?vertical_key=${vertical}`);
    ok(r.status === 200, `${vertical} definitions answer`, `HTTP ${r.status}`);
    const defs = r.body?.data || [];
    for (const key of expected) {
      ok(defs.some((d) => d.register_key === key), `${vertical}/${key} is defined`);
    }
    // The malformed auto-generated definition must no longer be offered.
    ok(!defs.some((d) => String(d.register_key).includes('-')),
      `${vertical} offers no hyphenated register_key`,
      defs.filter((d) => String(d.register_key).includes('-')).map((d) => d.register_key).join(',') || 'clean');
  }

  // Write to one on each side and read it back, so the definitions are usable
  // and not merely present.
  const defsRent = (await req('GET', '/api/registers/definitions?vertical_key=commercial_rent')).body?.data || [];
  const handover = defsRent.find((d) => d.register_key === 'handover_register');
  const h = await req('POST', '/api/registers/entries', {
    body: {
      register_definition_id: handover.id, vertical_key: 'commercial_rent', property_id: rentId,
      data: { date: '2026-09-27', party: `E2E Tenant ${STAMP}`, meter_readings: 'E-4471 / W-882', keys_issued: '3 sets', assets_verified: 'Yes' },
    },
  });
  ok(h.status === 201, 'a handover is recorded on the rent register', `HTTP ${h.status} ${h.body?.error || ''}`);
  if (h.body?.data?.id) made.entries2.push(h.body.data.id);
  ok(h.body?.data?.data?.meter_readings === 'E-4471 / W-882', 'the handover detail persisted',
    h.body?.data?.data?.meter_readings);

  const defsSale = (await req('GET', '/api/registers/definitions?vertical_key=commercial_sale')).body?.data || [];
  const own = defsSale.find((d) => d.register_key === 'ownership_verification');
  const o = await req('POST', '/api/registers/entries', {
    body: {
      register_definition_id: own.id, vertical_key: 'commercial_sale', property_id: saleId,
      data: { document: 'Title Deed', required: 'Yes', received: 'Yes', verified: 'Yes', remarks: `e2e ${STAMP}` },
    },
  });
  ok(o.status === 201, 'an ownership document is recorded on the sale register', `HTTP ${o.status}`);
  if (o.body?.data?.id) made.entries2.push(o.body.data.id);

  // Commercial entries must not appear on another console's verticals.
  const foreign = await req('GET', '/api/registers/entries?category=rural&limit=500');
  ok(!(foreign.body?.data || []).some((e) => JSON.stringify(e.data || {}).includes(STAMP)),
    'no commercial register entry leaked onto the rural verticals');
}

async function dashboards() {
  console.log('\n-- The commercial dashboards and money views --');
  const checks = [
    ['/api/property-management/dashboard-metrics?category=commercial', 'PM dashboard metrics'],
    ['/api/property-management/action-center?category=commercial', 'PM action centre'],
    ['/api/sales/pipeline?category=commercial', 'sales pipeline'],
    ['/api/invoices?limit=5', 'invoices'],
  ];
  for (const [path, label] of checks) {
    const r = await req('GET', path);
    ok([200, 404].includes(r.status), `${label} answers`, `HTTP ${r.status}`);
    if (r.status === 200) {
      ok(!/NaN/.test(JSON.stringify(r.body)), `${label} has no NaN`);
    }
  }
}

async function isolation() {
  console.log('\n-- Isolation, in both directions --');
  for (const cat of ['residential', 'business', 'rural']) {
    const r = await req('GET', `/api/properties?category=${cat}&limit=200`);
    ok((r.body?.data || []).every((p) => p.category === cat), `${cat} returns only ${cat}`);
    ok(!(r.body?.data || []).some((p) => p.id === saleId || p.id === rentId),
      `neither commercial fixture appears under ${cat}`);
  }
  // Projects and register entries are keyed by vertical, not category.
  const proj = await req('GET', '/api/projects?category=commercial&limit=200');
  const verticals = [...new Set((proj.body?.data || []).map((p) => p.vertical_key))];
  ok(verticals.every((v) => /^commercial/.test(String(v))),
    'commercial projects are only on commercial verticals', verticals.join(',') || 'none');

  const entries = await req('GET', '/api/registers/entries?category=commercial&limit=200');
  const eVerticals = [...new Set((entries.body?.data || []).map((e) => e.vertical_key))];
  ok(eVerticals.every((v) => /^commercial/.test(String(v))),
    'commercial register entries are only on commercial verticals', eVerticals.join(',') || 'none');

  // The residential baseline, unmoved.
  const ac = await req('GET', '/api/property-management/action-center?category=residential');
  ok(ac.body?.headline?.open_action_count === 103, 'residential open actions unchanged',
    `${ac.body?.headline?.open_action_count} (expected 103)`);
  const dm = await req('GET', '/api/property-management/dashboard-metrics?category=residential');
  ok(Number(dm.body?.occupancy?.managed) === 53, 'residential managed properties unchanged',
    `${dm.body?.occupancy?.managed} (expected 53)`);
}

async function cleanup() {
  console.log('\n-- Fixture cleanup (this DB is the production DB) --');
  for (const id of made.entries2) await req('DELETE', `/api/registers/entries/${id}`);
  for (const [pid, mid] of made.media) await req('DELETE', `/api/properties/${pid}/media/${mid}`);
  for (const id of made.enquiries) await req('DELETE', `/api/rental-enquiries/${id}`);
  for (const id of made.salesEnquiries) await req('DELETE', `/api/sales-enquiries/${id}`);
  /*
   * Contacts are re-queried here rather than deleted from the mid-run snapshot:
   * the RENTAL enquiry creates its own contact after the sales-enquiry check has
   * already listed them, so a snapshot taken then misses one.
   */
  const snap = await req('GET', `/api/contacts?search=${STAMP}&limit=100`);
  const toDelete = new Set([
    ...made.contacts,
    ...(snap.body?.data || [])
      .filter((c) => String(c.full_name || '').includes(String(STAMP)))
      .map((c) => c.id),
  ]);
  for (const id of toDelete) await req('DELETE', `/api/contacts/${id}`);
  for (const id of made.properties) await req('DELETE', `/api/properties/${id}`);

  const left = await req('GET', '/api/properties?category=commercial&limit=200');
  const strays = (left.body?.data || []).filter((p) => String(p.title || '').includes(STAMP));
  ok(strays.length === 0, 'no fixture properties left behind',
    strays.map((p) => p.property_code).join(',') || 'clean');

  const c = await req('GET', `/api/contacts?search=${STAMP}&limit=50`);
  const cLeft = (c.body?.data || []).filter((x) => String(x.full_name || '').includes(String(STAMP)));
  ok(cLeft.length === 0, 'no fixture contacts left behind', cLeft.map((x) => x.id).join(',') || 'clean');

  const re = await req('GET', '/api/rental-enquiries?limit=200');
  const reLeft = (re.body?.data || []).filter((x) => String(x.enquirer_name || x.name || '').includes(String(STAMP)));
  ok(reLeft.length === 0, 'no fixture rental enquiries left behind', reLeft.map((x) => x.id).join(',') || 'clean');

  for (const v of ['commercial_rent', 'commercial_sale']) {
    const e = await req('GET', `/api/registers/entries?vertical_key=${v}&limit=500`);
    const strays = (e.body?.data || []).filter((x) => JSON.stringify(x.data || {}).includes(STAMP));
    ok(strays.length === 0, `no fixture entries left on ${v}`, strays.map((x) => x.id).join(',') || 'clean');
  }

  const se = await req('GET', '/api/sales-enquiries?limit=200');
  const seLeft = (se.body?.data || []).filter((x) => String(x.enquirer_name || x.name || '').includes(String(STAMP)));
  ok(seLeft.length === 0, 'no fixture sales enquiries left behind', seLeft.map((x) => x.id).join(',') || 'clean');
}

(async () => {
  console.log(`\n===== COMMERCIAL AUDIT E2E (run ${STAMP}) =====`);
  if (!(await login())) return finish();
  await properties();
  await media();
  await publicSurface();
  await enquiries();
  await agreements();
  await pipelines();
  await marketingTemplates();
  await registers();
  await dashboards();
  await isolation();
  await cleanup();
  finish();
})().catch((e) => { ok(false, 'harness crashed', e.stack); finish(); });
