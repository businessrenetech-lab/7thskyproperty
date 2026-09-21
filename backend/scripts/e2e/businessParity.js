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

(async () => {
  console.log(`\n===== BUSINESS PARITY E2E (run ${STAMP}) =====`);
  if (!(await login())) return finish();
  if (want(1)) await phase1();
  if (want(2)) await phase2();
  finish();
})().catch((e) => { ok(false, 'harness crashed', e.message); finish(); });
