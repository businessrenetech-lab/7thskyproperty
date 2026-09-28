/**
 * The public website, end to end. Needs the API on :50001.
 * Run from backend/:  node scripts/e2e/publicWebsite.js
 *
 * website-mock is the public site. It reads everything through
 * /api/public-website/* and /api/public/short-stay/*, so this asserts that
 * surface the way the site uses it: the four categories (residential,
 * commercial, business, rural) across sale, rent and short stay; the detail
 * page; every search and filter the site can send; the eight enquiry forms; and
 * the publish path that decides whether a listing appears at all.
 *
 * The one thing it will not do is accept an empty answer as a pass. The site
 * falls back to MOCK_PROPERTIES whenever the backend returns nothing, so an
 * empty list is not a neutral result — it is the point at which the public sees
 * invented properties. Combinations that are legitimately empty are declared in
 * KNOWN_EMPTY, so an empty page is always a decision somebody made, never a
 * silent failure.
 *
 * Writes: one publish-flow probe (create, publish, edit, unpublish, delete)
 * which verifies each step and removes itself. This DB is the production DB.
 */
const { login, req, ok, finish, STAMP } = require('./httpHarness');

const CATEGORIES = ['residential', 'commercial', 'business', 'rural'];
const TYPES = ['sale', 'rent', 'short_term'];

/*
 * Combinations with no inventory today. Listed so the audit states them out
 * loud rather than passing over them: each is a page the public can reach that
 * currently renders the curated mock portfolio instead of real listings.
 */
const KNOWN_EMPTY = new Set([
  'business:sale',
  'commercial:short_term',
  'rural:short_term',
  'business:short_term',
]);

const pub = (path) => req('GET', `/api/public-website${path}`, { noAuth: true });
const rowsOf = (b) => b?.data || b?.rows || (Array.isArray(b) ? b : []);
const made = { properties: [] };

async function listingMatrix() {
  console.log('\n-- Every category x listing type the site can ask for --');

  for (const cat of CATEGORIES) {
    for (const type of TYPES) {
      const r = await pub(`/properties?limit=100&category=${cat}&listing_type=${type}`);
      if (r.status !== 200) {
        ok(false, `${cat}/${type}: the public list answers`, `HTTP ${r.status}`);
        continue;
      }
      const rows = rowsOf(r.body);
      const key = `${cat}:${type}`;

      if (rows.length === 0) {
        // Not a pass. An empty answer is what triggers the mock fallback.
        ok(KNOWN_EMPTY.has(key), `${cat}/${type}: has real inventory`,
          KNOWN_EMPTY.has(key)
            ? 'empty — KNOWN, the site shows curated mock listings here'
            : 'EMPTY and undeclared — the public sees invented properties');
        continue;
      }

      ok(true, `${cat}/${type}: has real inventory`, `${rows.length} listing(s)`);

      // The filter must actually filter, or one console's stock appears on another's page.
      const wrongCat = rows.filter((p) => p.category && p.category !== cat);
      ok(wrongCat.length === 0, `${cat}/${type}: every listing is ${cat}`,
        wrongCat.length ? [...new Set(wrongCat.map((p) => p.category))].join(',') : 'clean');

      const wrongType = rows.filter((p) => p.listing_type && p.listing_type !== type);
      ok(wrongType.length === 0, `${cat}/${type}: every listing is ${type}`,
        wrongType.length ? [...new Set(wrongType.map((p) => p.listing_type))].join(',') : 'clean');

      // The card cannot render without these.
      const noTitle = rows.filter((p) => !p.title);
      ok(noTitle.length === 0, `${cat}/${type}: every listing has a title`,
        noTitle.length ? `${noTitle.length} untitled` : `${rows.length} checked`);
    }
  }
}

async function detailPages() {
  console.log('\n-- The detail page, per category --');

  for (const cat of CATEGORIES) {
    const list = await pub(`/properties?limit=5&category=${cat}`);
    const rows = rowsOf(list.body);
    if (!rows.length) { ok(true, `${cat}: no listing to open`, 'empty category'); continue; }

    const one = rows[0];
    // The site opens a property by id or slug; both must work or a shared link dies.
    const byId = await pub(`/properties/${one.id}`);
    ok(byId.status === 200, `${cat}: detail opens by id`, `HTTP ${byId.status} (#${one.id})`);

    const d = byId.body?.data || byId.body || {};
    ok(String(d.category || cat) === cat, `${cat}: the detail is the right category`, d.category);
    ok(!!(d.title || d.code), `${cat}: the detail carries a title`, d.title || d.code);

    if (one.slug) {
      const bySlug = await pub(`/properties/${encodeURIComponent(one.slug)}`);
      ok(bySlug.status === 200, `${cat}: detail opens by slug`, `HTTP ${bySlug.status} (${one.slug})`);
    }

    // A private field must never ride along on a public payload.
    const leaked = ['owner_nid', 'owner_phone', 'owner_email', 'purchase_price', 'internal_notes',
      'landlord_id', 'owner_bank_account'].filter((k) => d[k] !== undefined && d[k] !== null);
    ok(leaked.length === 0, `${cat}: no private owner field on the public detail`,
      leaked.join(',') || 'clean');
  }

  const missing = await pub('/properties/999999999');
  ok([404, 400].includes(missing.status), 'an unknown property is refused, not guessed',
    `HTTP ${missing.status}`);
}

async function searchAndFilters() {
  console.log('\n-- Search and every filter the site sends --');

  // Free-text search must actually narrow, and match something real.
  const all = await pub('/properties?limit=100');
  const pool = rowsOf(all.body);
  ok(pool.length > 0, 'the unfiltered list answers with inventory', `${pool.length}`);

  const sample = pool.find((p) => (p.title || '').trim().length > 6);
  if (sample) {
    const term = sample.title.trim().split(/\s+/)[0];
    const s = await pub(`/properties?limit=100&search=${encodeURIComponent(term)}`);
    const hits = rowsOf(s.body);
    ok(s.status === 200, 'search answers', `HTTP ${s.status} "${term}"`);
    ok(hits.length > 0, 'search finds the listing it was taken from', `${hits.length} hit(s) for "${term}"`);
    ok(hits.length <= pool.length, 'search narrows rather than widening', `${hits.length} <= ${pool.length}`);
  }

  const nonsense = await pub(`/properties?search=zzzqqq${STAMP}`);
  ok(nonsense.status === 200, 'a search with no matches still answers 200', `HTTP ${nonsense.status}`);
  ok(rowsOf(nonsense.body).length === 0, 'a search with no matches returns nothing, not everything',
    `${rowsOf(nonsense.body).length}`);

  // Price bounds.
  const priced = pool.filter((p) => Number(p.price) > 0).sort((a, b) => a.price - b.price);
  if (priced.length > 2) {
    const mid = Number(priced[Math.floor(priced.length / 2)].price);
    const under = await pub(`/properties?limit=100&max_price=${mid}`);
    const over = await pub(`/properties?limit=100&min_price=${mid}`);
    const overMax = rowsOf(under.body).filter((p) => Number(p.price) > mid);
    const underMin = rowsOf(over.body).filter((p) => Number(p.price) > 0 && Number(p.price) < mid);
    ok(overMax.length === 0, 'max_price excludes anything dearer',
      overMax.length ? `${overMax.length} over ${mid}` : `<= ${mid}`);
    ok(underMin.length === 0, 'min_price excludes anything cheaper',
      underMin.length ? `${underMin.length} under ${mid}` : `>= ${mid}`);
  }

  // Room counts.
  for (const field of ['bedrooms', 'bathrooms']) {
    const r = await pub(`/properties?limit=100&${field}=2`);
    ok(r.status === 200, `${field} filter answers`, `HTTP ${r.status}`);
    const wrong = rowsOf(r.body).filter((p) => p[field] != null && Number(p[field]) < 2);
    ok(wrong.length === 0, `${field}=2 returns nothing with fewer`,
      wrong.length ? `${wrong.length} with fewer` : `${rowsOf(r.body).length} checked`);
  }

  /*
   * Rural is searched by land administration, not by street: a buyer asks for an
   * upazila and a mouza. Both are indexed columns and must filter server side.
   */
  const rural = rowsOf((await pub('/properties?limit=100&category=rural')).body);
  const withUpazila = rural.find((p) => p.upazila);
  if (withUpazila) {
    const r = await pub(`/properties?limit=100&upazila=${encodeURIComponent(withUpazila.upazila)}`);
    const hits = rowsOf(r.body);
    ok(hits.length > 0, 'rural upazila search finds land', `${hits.length} in ${withUpazila.upazila}`);
    const wrong = hits.filter((p) => p.upazila !== withUpazila.upazila);
    ok(wrong.length === 0, 'rural upazila search returns only that upazila',
      wrong.length ? `${wrong.length} foreign` : 'clean');
  } else {
    ok(true, 'no rural listing carries an upazila to search on', `${rural.length} rural listing(s)`);
  }

  // Paging must not repeat a listing on both pages.
  const p1 = rowsOf((await pub('/properties?limit=5&page=1')).body).map((p) => p.id);
  const p2 = rowsOf((await pub('/properties?limit=5&page=2')).body).map((p) => p.id);
  const overlap = p1.filter((id) => p2.includes(id));
  ok(overlap.length === 0, 'page 2 does not repeat page 1', overlap.join(',') || `${p1.length}+${p2.length}`);
}

async function shortStay() {
  console.log('\n-- Short term stay --');

  const list = await pub('/properties?limit=100&listing_type=short_term');
  const rows = rowsOf(list.body);
  ok(list.status === 200, 'short-stay listings answer', `HTTP ${list.status}`);
  ok(rows.length > 0, 'short stay has real inventory', `${rows.length} listing(s)`);

  // A short-stay card prices per night; without a nightly figure it reads as a sale price.
  const priced = rows.filter((p) => Number(p.price) > 0 || p.short_stay_profile);
  ok(priced.length === rows.length || rows.length === 0,
    'every short-stay listing carries a nightly rate or profile',
    `${priced.length}/${rows.length}`);

  /*
   * A short stay has its OWN website switch: ShortStayPropertyProfile
   * .is_website_listed, which staff set from the short-stay console. The public
   * list must honour it. It used to admit every `listing_type: 'short_term'`
   * row unconditionally, so a draft or a sold property that staff had explicitly
   * kept off the website was advertised anyway.
   */
  const Profile = require('../../models/ShortStayPropertyProfile');
  const profiles = await Profile.findAll({ attributes: ['property_id', 'is_website_listed'], raw: true });
  const notListed = profiles.filter((p) => !p.is_website_listed).map((p) => p.property_id);
  const liveIds = new Set(rows.map((p) => p.id));
  const shown = notListed.filter((id) => liveIds.has(id));
  ok(shown.length === 0, 'a short stay kept off the website is not shown',
    shown.length ? `#${shown.join(', #')} marked is_website_listed=0 but public` : `${notListed.length} withheld`);

  const listed = profiles.filter((p) => p.is_website_listed).map((p) => p.property_id);
  const missing = listed.filter((id) => !liveIds.has(id));
  ok(missing.length === 0, 'every short stay marked for the website is shown',
    missing.length ? `#${missing.join(', #')} listed but absent` : `${listed.length} shown`);

  const enq = await req('POST', '/api/public/short-stay/enquiries', {
    noAuth: true,
    body: {
      name: `E2E Short Stay ${STAMP}`,
      email: `e2e.shortstay.${STAMP}@example.com`,
      phone: '01700000000',
      message: 'E2E availability enquiry',
      property_id: rows[0]?.id || null,
    },
  });
  ok([200, 201, 400, 422].includes(enq.status), 'the short-stay enquiry endpoint is live',
    `HTTP ${enq.status} ${enq.body?.error || ''}`);
}

async function enquiryForms() {
  console.log('\n-- The eight public forms the site posts --');

  const target = rowsOf((await pub('/properties?limit=1')).body)[0];
  const who = {
    name: `E2E Web ${STAMP}`,
    full_name: `E2E Web ${STAMP}`,
    email: `e2e.web.${STAMP}@example.com`,
    phone: '01700000000',
    message: 'E2E audit enquiry — please ignore.',
  };

  const forms = [
    ['/sales-enquiries', { ...who, property_id: target?.id }],
    ['/rental-enquiries', { ...who, property_id: target?.id }],
    ['/tenant-applications', { ...who, property_id: target?.id }],
    ['/service-requests', { ...who, service: 'Water Tank Cleaning' }],
    ['/appraisals', { ...who, address: 'E2E address' }],
    ['/contact', { ...who, subject: 'E2E' }],
    ['/offers', { ...who, property_id: target?.id, amount: 1000 }],
    ['/business-nda-requests', { ...who, property: target?.id }],
  ];

  for (const [path, body] of forms) {
    const r = await req('POST', `/api/public-website${path}`, { noAuth: true, body });
    /*
     * A live endpoint either accepts the enquiry or rejects it on its own terms
     * (400/422 for a missing field, 429 when rate limited). A 404 with an HTML
     * body means no route is mounted — the form would fail silently in front of
     * a real customer.
     */
    const mounted = r.status !== 404 || (r.body && !r.body._raw);
    ok(mounted, `POST ${path} is mounted`, `HTTP ${r.status} ${r.body?.error || ''}`);
  }
}

async function siteContent() {
  console.log('\n-- Site content the header and footer render --');
  const r = await pub('/site');
  ok(r.status === 200, 'GET /site answers', `HTTP ${r.status}`);
  const d = r.body?.data || r.body || {};
  ok(Object.keys(d).length > 0, '/site returns content', `${Object.keys(d).length} key(s)`);
}

async function publishFlow() {
  console.log('\n-- A new listing: create, publish, edit, unpublish --');

  const title = `E2E Website Probe ${STAMP}`;
  const create = await req('POST', '/api/properties', {
    body: {
      title,
      category: 'residential',
      listing_type: 'sale',
      price: 1234567,
      status: 'available',
      address: 'E2E probe address',
      city: 'Dhaka',
      bedrooms: 3,
      bathrooms: 2,
    },
  });
  if (![200, 201].includes(create.status)) {
    ok(false, 'a property can be created', `HTTP ${create.status} ${create.body?.error || ''}`);
    return;
  }
  const prop = create.body?.data || create.body?.property || create.body;
  const id = prop?.id;
  ok(!!id, 'the new property exists', `#${id}`);
  if (!id) return;
  made.properties.push(id);

  const onSite = async () => rowsOf((await pub(`/properties?limit=100&search=${encodeURIComponent(title)}`)).body)
    .some((p) => String(p.id) === String(id));

  // Whether it is public yet depends on the publish flag, so record what it does.
  const visibleAtCreate = await onSite();
  ok(true, `a new "available" listing is ${visibleAtCreate ? 'live immediately' : 'held until published'}`,
    visibleAtCreate ? 'auto-published' : 'needs an explicit publish');

  if (!visibleAtCreate) {
    const pubRes = await req('PATCH', `/api/public-website/admin/properties/${id}/publish`, {
      body: { is_published: true },
    });
    ok(pubRes.status === 200, 'publishing it succeeds', `HTTP ${pubRes.status}`);
    ok(await onSite(), 'it appears on the website once published');
  }

  // An edit must reach the public page — this is the "edits properly go to the site" case.
  const newPrice = 7654321;
  const edit = await req('PUT', `/api/properties/${id}`, { body: { price: newPrice } });
  ok([200, 204].includes(edit.status), 'editing the listing succeeds', `HTTP ${edit.status}`);
  const after = rowsOf((await pub(`/properties?limit=100&search=${encodeURIComponent(title)}`)).body)
    .find((p) => String(p.id) === String(id));
  ok(after && Number(after.price) === newPrice, 'the edited price shows on the website',
    after ? `${after.price} (expected ${newPrice})` : 'listing not found after edit');

  // And unpublishing must remove it, or a withdrawn property stays advertised.
  const un = await req('PATCH', `/api/public-website/admin/properties/${id}/publish`, {
    body: { is_published: false },
  });
  ok([200, 204].includes(un.status), 'unpublishing succeeds', `HTTP ${un.status}`);
  ok(!(await onSite()), 'an unpublished listing is gone from the website');
}

async function cleanup() {
  console.log('\n-- Cleanup (this DB is the production DB) --');
  for (const id of made.properties) {
    const d = await req('DELETE', `/api/properties/${id}`);
    ok([200, 204].includes(d.status), `probe property #${id} deleted`, `HTTP ${d.status}`);
  }
  const left = rowsOf((await pub(`/properties?limit=100&search=E2E%20Website%20Probe%20${STAMP}`)).body);
  ok(left.length === 0, 'no probe listing left on the website', left.map((p) => p.id).join(',') || 'clean');

  /*
   * The eight form posts are real submissions: they create enquiries, leads and
   * a contact, which then sit in the staff inbox looking like customers. There
   * is no public DELETE for any of them, so they are removed directly, matched
   * on the reserved e2e address that only this script ever writes.
   */
  const sequelize = require('../../config/db.config');
  const PATTERN = "'e2e.%@example.com'";
  const tables = [
    ['sales_enquiries', 'email'],
    ['rental_enquiries', 'email'],
    ['care_enquiries', 'email'],
    ['leads', 'email'],
    ['contacts', 'email'],
    // The short-stay enquiry names its columns differently.
    ['short_stay_enquiries', 'guest_email'],
  ];
  let removed = 0;
  const failed = [];
  for (const [table, col] of tables) {
    try {
      const [res] = await sequelize.query(`DELETE FROM ${table} WHERE ${col} LIKE ${PATTERN}`);
      removed += res?.affectedRows || 0;
    } catch (e) { failed.push(`${table}: ${e.message.split('\n')[0].slice(0, 50)}`); }
  }
  ok(failed.length === 0, 'the submitted enquiries are removed again',
    failed.join('; ') || `${removed} row(s)`);

  // Prove it, rather than trusting the delete.
  const stillThere = [];
  for (const [table, col] of tables) {
    try {
      const [r] = await sequelize.query(`SELECT COUNT(*) AS n FROM ${table} WHERE ${col} LIKE ${PATTERN}`);
      if (Number(r[0]?.n) > 0) stillThere.push(`${table}=${r[0].n}`);
    } catch { /* counted above */ }
  }
  ok(stillThere.length === 0, 'no e2e enquiry left in the staff inbox',
    stillThere.join(', ') || 'clean');
}

(async () => {
  console.log(`\n===== PUBLIC WEBSITE E2E (run ${STAMP}) =====`);
  if (!(await login())) return finish();
  await listingMatrix();
  await detailPages();
  await searchAndFilters();
  await shortStay();
  await enquiryForms();
  await siteContent();
  await publishFlow();
  await cleanup();
  finish();
})().catch((e) => { ok(false, 'harness crashed', e.stack); finish(); });
