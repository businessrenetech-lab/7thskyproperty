/**
 * End-to-end checks for the Business Buy & Sale parity plan. Needs the API on
 * :50001 (restart it after backend changes). Creates data tagged with a run stamp.
 * Run: node scripts/e2e/businessParity.js [phase]   (no arg = all phases)
 */
const { login, req, ok, finish, STAMP } = require('./httpHarness');

const ONLY = process.argv[2] ? Number(process.argv[2]) : null;
const want = (n) => ONLY === null || ONLY === n;

async function phase1() {
  console.log('\n— Phase 1: public website —');
  const list = await req('GET', '/api/public-website/properties?limit=5', { noAuth: true });
  ok(list.status === 200, 'public list mounted', `HTTP ${list.status}`);

  const all = await req('GET', '/api/properties?limit=500');
  const rows = all.body?.data || [];
  const hidden = rows.find((p) => !p.is_published && p.listing_type !== 'short_term'
    && !['sold', 'settled', 'rented', 'occupied', 'under_application', 'under_offer', 'reserved'].includes(p.status)
    && !['sold', 'let', 'under_offer', 'under_application'].includes(p.listing_status));
  const shown = rows.find((p) => p.is_published);
  if (hidden) {
    const r = await req('GET', `/api/public-website/properties/${hidden.id}`, { noAuth: true });
    ok(r.status === 404, 'unpublished property is not public', `id ${hidden.id} → HTTP ${r.status}`);
  } else ok(true, 'no unpublished property to probe (skipped)');
  if (shown) {
    const r = await req('GET', `/api/public-website/properties/${shown.id}`, { noAuth: true });
    const d = r.body?.data || {};
    ok(r.status === 200, 'published property detail is public', `id ${shown.id}`);
    for (const k of ['owner_contact_id', 'access_contacts', 'remarks', 'latitude', 'management_fee_pct', 'branch_id']) {
      ok(!(k in d), `detail does not expose ${k}`);
    }
  } else ok(true, 'no published property to probe (skipped)');
}

async function phase2() {
  console.log('\n— Phase 2: category scoping —');
  // A business property + a commercial property to tell apart.
  const biz = await req('POST', '/api/properties', { body: { title: `E2E Biz ${STAMP}`, category: 'business', property_type: 'Business', listing_type: 'sale' } });
  const com = await req('POST', '/api/properties', { body: { title: `E2E Com ${STAMP}`, category: 'commercial', property_type: 'Office', listing_type: 'sale' } });
  const bizId = biz.body?.data?.id; const comId = com.body?.data?.id;
  ok(!!bizId && !!comId, 'fixture properties created', `${bizId} / ${comId}`);

  const endpoints = [
    ['inbox', '/api/sales/inbox', (b) => b.data],
    ['introductions', '/api/sales/introductions', (b) => b.data],
    ['invoices', '/api/invoices?invoice_type=agreement_fee&scope=sales&limit=500', (b) => b.data],
    ['bulk settlements', '/api/deals/settlement/sales-bulk-data', (b) => b.data],
    ['work queue', '/api/sales/work-queue', (b) => b.data?.items],
    ['buyer mandates', '/api/buyer-mandates', (b) => b.data],
  ];
  for (const [name, path, rowsOf] of endpoints) {
    const sep = path.includes('?') ? '&' : '?';
    const plain = await req('GET', path);
    const scoped = await req('GET', `${path}${sep}category=business`);
    const bogus = await req('GET', `${path}${sep}category=nonsense`);
    ok(plain.status === 200 && scoped.status === 200, `${name}: plain + business both 200`, `${plain.status}/${scoped.status}`);
    const all = rowsOf(plain.body) || []; const onlyBiz = rowsOf(scoped.body) || []; const ignored = rowsOf(bogus.body) || [];
    ok(onlyBiz.length <= all.length, `${name}: business ⊆ all`, `${onlyBiz.length} ≤ ${all.length}`);
    ok(ignored.length === all.length, `${name}: unknown category ignored (same as no param)`, `${ignored.length} = ${all.length}`);
    const leaked = onlyBiz.filter((r) => r.property_id && Number(r.property_id) === Number(comId));
    ok(leaked.length === 0, `${name}: no commercial fixture rows in business view`);
  }
  const acct = await req('GET', '/api/sales/accounting-overview?category=business');
  ok(acct.status === 200, 'accounting overview accepts category', `HTTP ${acct.status}`);

  // Mandates need a buyer; create one as the Business console would.
  const buyer = await req('POST', '/api/contacts?category=business', { body: { full_name: `E2E Buyer ${STAMP}`, contact_type: 'individual', primary_phone: `0171${STAMP}` } });
  const buyerId = buyer.body?.data?.id;
  ok(buyer.body?.data?.category === 'business', 'contact created from the business console is category business', buyer.body?.data?.category);
  const bizContacts = await req('GET', '/api/contacts?limit=500&category=business');
  ok((bizContacts.body?.data || []).some((c) => Number(c.id) === Number(buyerId)), 'contacts filter accepts category=business');
  const m = await req('POST', '/api/buyer-mandates?category=business', { body: { buyer_contact_id: buyerId, notes: `E2E mandate ${STAMP}` } });
  ok(m.status === 201 && m.body?.data?.category === 'business', 'mandate created in business console is category business', m.body?.error || m.body?.data?.category);
  const scopedM = await req('GET', '/api/buyer-mandates?category=business');
  ok((scopedM.body?.data || []).every((x) => x.category === 'business'), 'business mandate list holds only business mandates');
}

async function phase3() {
  console.log('\n— Phase 3: business profile + teaser —');
  const p = await req('POST', '/api/properties', { body: { title: `Secret Traders ${STAMP}`, category: 'business', property_type: 'Business', listing_type: 'sale' } });
  const id = p.body?.data?.id; ok(!!id, 'business property created', id);
  const put = await req('PUT', `/api/properties/${id}/business-profile`, { body: { business_type: 'trading', industry: 'Import', staff_count: 9, year_established: 2015, annual_turnover: 15000000, annual_profit: 3000000, teaser_headline: `Importer ${STAMP}` } });
  ok(put.status === 200 && put.body?.data?.business_type === 'trading', 'profile upsert', `HTTP ${put.status}`);
  const partial = await req('PUT', `/api/properties/${id}/business-profile`, { body: { staff_count: 11 } });
  ok(partial.body?.data?.industry === 'Import' && partial.body?.data?.staff_count === 11, 'partial update keeps other fields');
  const got = await req('GET', `/api/properties/${id}/business-profile`);
  ok(got.status === 200 && Array.isArray(got.body?.data?.preparation), 'profile reads back (preparation parsed to a list)');
  const com = await req('POST', '/api/properties', { body: { title: `Com ${STAMP}`, category: 'commercial', property_type: 'Office', listing_type: 'sale' } });
  const bad = await req('PUT', `/api/properties/${com.body?.data?.id}/business-profile`, { body: { industry: 'x' } });
  ok(bad.status === 400, 'profile refused on a non-business property', `HTTP ${bad.status}`);

  await req('PUT', `/api/properties/${id}`, { body: { is_published: true, price: 25000000, area: 'Banani', city: 'Dhaka', address: 'House 1, Road 2' } });
  const list = await req('GET', '/api/public-website/properties?category=business&listing_type=sale&limit=100', { noAuth: true });
  const row = (list.body?.data || []).find((r) => Number(r.id) === Number(id));
  ok(!!row, 'published business appears in the website Business Buy search');
  if (row) {
    ok(row.title === `Importer ${STAMP}`, 'teaser headline is the public title', row.title);
    ok(!JSON.stringify(row).includes('Secret Traders'), 'list never shows the business name');
    ok(!('address' in row), 'list hides the street address');
    ok(row.business?.turnover_band === '৳1–2 Cr', 'turnover band shown', row.business?.turnover_band);
  }
  const det = await req('GET', `/api/public-website/properties/${id}`, { noAuth: true });
  const d = det.body?.data || {};
  ok(det.status === 200 && !JSON.stringify(d).includes('Secret Traders'), 'detail is a teaser (no name)');
  ok(!('address' in d) && !('latitude' in d), 'detail hides address + coordinates');
  ok(!JSON.stringify(d).includes('15000000') && !JSON.stringify(d).includes('3000000'), 'detail hides exact financials');
  const search = await req('GET', `/api/public-website/properties?search=${encodeURIComponent('Secret Traders')}`, { noAuth: true });
  ok(!(search.body?.data || []).some((r) => Number(r.id) === Number(id)), 'searching the real name does not find the listing');
  const nonBiz = await req('GET', '/api/public-website/properties?listing_type=sale&limit=5', { noAuth: true });
  ok((nonBiz.body?.data || []).filter((r) => r.category !== 'business').every((r) => !r.business), 'non-business listings are unchanged (no business object)');
  return id;
}

async function phase4(propertyId) {
  console.log('\n— Phase 4: assessment + due diligence —');
  if (!propertyId) { const p = await req('POST', '/api/properties', { body: { title: `DD Biz ${STAMP}`, category: 'business', property_type: 'Business', listing_type: 'sale' } }); propertyId = p.body?.data?.id; }
  const a = await req('POST', '/api/business-assessments', { body: { property_id: propertyId, assessment_type: 'preliminary', operational_condition: 4, market_attractiveness: 3, risks: [] } });
  ok(a.status === 201, 'assessment created for a property', `HTTP ${a.status}`);
  const seeded = await req('POST', '/api/business-documents/seed-checklist', { body: { property_id: propertyId } });
  const docs = seeded.body?.data || [];
  ok(docs.length >= 8, 'due-diligence checklist seeded', `${docs.length} items`);
  const again = await req('POST', '/api/business-documents/seed-checklist', { body: { property_id: propertyId } });
  ok((again.body?.data || []).length === docs.length, 'seeding is idempotent');
  const esc = await req('POST', `/api/business-documents/${docs[0].id}/escalate`, { body: { note: 'Licence expired' } });
  const risks = esc.body?.data?.assessment?.risks;
  const list = typeof risks === 'string' ? JSON.parse(risks) : risks;
  ok(esc.status === 200 && esc.body?.data?.document?.status === 'rejected', 'escalation flags the document');
  ok(Array.isArray(list) && list.some((r) => r.description.includes('Licence expired')), 'escalation adds a risk to the assessment');
  const listed = await req('GET', `/api/business-assessments?property_id=${propertyId}`);
  ok((listed.body?.data || []).length >= 1, 'assessments list by property');

  // Buyer side: suitability + shortlist investment summary (Purchase SOP Steps 2, 8).
  const prof = await req('GET', `/api/properties/${propertyId}/business-profile`);
  if (!prof.body?.data?.annual_profit) await req('PUT', `/api/properties/${propertyId}/business-profile`, { body: { business_type: 'service', annual_turnover: 8000000, annual_profit: 2000000 } });
  await req('PUT', `/api/properties/${propertyId}`, { body: { price: 12000000 } });
  const buyer = await req('POST', '/api/contacts?category=business', { body: { full_name: `Suit Buyer ${STAMP}`, contact_type: 'individual', primary_phone: `0181${STAMP}` } });
  const mandate = await req('POST', '/api/buyer-mandates?category=business', { body: { buyer_contact_id: buyer.body?.data?.id, notes: `Suit ${STAMP}` } });
  const mid = mandate.body?.data?.id;
  const put = await req('PUT', `/api/buyer-mandates/${mid}`, { body: { suitability: { readiness: 'strong', verdict: 'suitable' } } });
  ok(put.status === 200, 'suitability saved on the mandate', `HTTP ${put.status}`);
  await req('POST', `/api/buyer-mandates/${mid}/candidates`, { body: { property_id: propertyId, fit_note: 'e2e' } });
  const got = await req('GET', `/api/buyer-mandates/${mid}`);
  const cand = (got.body?.data?.candidates || []).find((c) => Number(c.property_id || c.property?.id) === Number(propertyId));
  ok(!!cand?.investment_summary, 'business shortlist candidate has an investment summary', JSON.stringify(cand?.investment_summary));
  ok(cand?.investment_summary?.price_to_profit > 0, 'price-to-profit multiple computed');
}

(async () => {
  console.log(`\n===== BUSINESS PARITY E2E (run ${STAMP}) =====`);
  if (!(await login())) return finish();
  if (want(1)) await phase1();
  if (want(2)) await phase2();
  const bizId = want(3) ? await phase3() : null;
  if (want(4)) await phase4(bizId);
  if (want(5) && typeof phase5 === 'function') await phase5(bizId);
  // The DB is shared with production: never leave a test fixture on the live site.
  if (bizId) {
    const off = await req('PUT', `/api/properties/${bizId}`, { body: { is_published: false } });
    ok(off.status === 200, 'cleanup: test fixture unpublished', `id ${bizId}`);
  }
  finish();
})().catch((e) => { ok(false, 'harness crashed', e.message); finish(); });
