/**
 * End-to-end checks for the LANDLORD and TENANT portals, across every rent
 * category. Needs the API on :50001.  Run: node scripts/e2e/portals.js
 *
 * These portals are PERSON-scoped, not category-scoped: a landlord sees the
 * properties they own, whatever category those are. That is the right model — one
 * login for an owner who holds a flat, a commercial floor and a rural plot — but
 * it has to be PROVEN, because a portal that quietly filters to residential would
 * look identical until a commercial landlord signed in.
 *
 * So this creates one landlord who owns four properties (residential, commercial,
 * business and rural), gives them a real portal login, signs in AS them, and
 * checks they see all four. Then it drives an approval end to end: an application
 * awaiting owner approval, decided from the portal, and the admin side confirming
 * the decision landed.
 *
 * Every fixture is stamped and removed at the end — this DB is the production DB.
 */
const { login, req, ok, finish, STAMP } = require('./httpHarness');

const made = { properties: [], contacts: [], clients: [], applications: [], tenancies: [], users: [] };

const PASSWORD = `E2EPortal#${STAMP}a`;
let ownerContactId = null;
let ownerClientId = null;
let landlordToken = null;
let tenantToken = null;
let tenantContactId = null;
const props = {};

/** Run a request as a specific portal user rather than the admin. */
const asUser = (token) => ({ headers: { Authorization: `Bearer ${token}` } });

async function setup() {
  console.log('\n-- One landlord, four categories --');

  // The landlord, as a contact + client with a portal login.
  const oc = await req('POST', '/api/contacts', {
    body: { full_name: `E2E Portal Landlord ${STAMP}`, primary_phone: `0181${String(STAMP).slice(-6)}`, email: `e2e.landlord.${STAMP}@example.com`, contact_type: 'owner', branch_id: 1 },
  });
  ok(oc.status === 201, 'landlord contact created', `HTTP ${oc.status} ${oc.body?.error || ''}`);
  ownerContactId = oc.body?.data?.id;
  if (ownerContactId) made.contacts.push(ownerContactId);

  const cl = await req('POST', '/api/clients', {
    body: { contact_id: ownerContactId, client_type: 'owner', branch_id: 1 },
  });
  ok(cl.status === 201, 'landlord client record created', `HTTP ${cl.status} ${cl.body?.error || ''}`);
  ownerClientId = cl.body?.data?.id;
  if (ownerClientId) made.clients.push(ownerClientId);

  const access = await req('POST', `/api/clients/${ownerClientId}/portal-access`, {
    body: { email: `e2e.landlord.${STAMP}@example.com`, password: PASSWORD, role: 'owner' },
  });
  ok([200, 201].includes(access.status), 'landlord portal access enabled', `HTTP ${access.status} ${access.body?.error || ''}`);
  if (access.body?.data?.user_id || access.body?.user?.id) {
    made.users.push(access.body?.data?.user_id || access.body?.user?.id);
  }

  // Four properties, one per category, all owned by this landlord.
  const spec = [
    ['residential', 'rent', { title: `E2E Portal Flat ${STAMP}`, price: 45000, bedrooms: 3, bathrooms: 2 }],
    ['commercial', 'rent', { title: `E2E Portal Office ${STAMP}`, price: 220000, building_size: 3100, floor_number: 5 }],
    ['business', 'rent', { title: `E2E Portal Shop ${STAMP}`, price: 95000, building_size: 800 }],
    ['rural', 'rent', { title: `E2E Portal Plot ${STAMP}`, price: 30000, upazila: 'Barura', union_name: 'Payalgachha', village: 'Ramnagar', mouza: `PortalMouza${STAMP}`, khatiyan: `PKH-${STAMP}`, dag: `PDAG-${STAMP}`, land_area_decimal: 40.5, current_use: 'Paddy', property_type: 'Agricultural Land' }],
  ];
  for (const [category, listing_type, extra] of spec) {
    const r = await req('POST', '/api/properties', {
      body: { category, listing_type, status: 'available', branch_id: 1, owner_contact_id: ownerContactId, district: 'Dhaka', ...extra },
    });
    ok(r.status === 201, `${category} rent property created and owned by the landlord`, `HTTP ${r.status}`);
    props[category] = r.body?.data?.id;
    if (props[category]) made.properties.push(props[category]);
  }
}

async function landlordPortal() {
  console.log('\n-- The landlord signs in and sees all four --');
  const auth = await req('POST', '/api/auth/login', {
    noAuth: true, body: { email: `e2e.landlord.${STAMP}@example.com`, password: PASSWORD },
  });
  landlordToken = auth.body?.token || '';
  ok(!!landlordToken, 'the landlord can sign in to the portal', auth.body?.error || `HTTP ${auth.status}`);
  if (!landlordToken) return;

  const me = await req('GET', '/api/landlord/me', asUser(landlordToken));
  ok(me.status === 200, '/api/landlord/me answers for them', `HTTP ${me.status} ${me.body?.error || ''}`);
  ok(Number(me.body?.data?.metrics?.total_properties) >= 4,
    'the summary counts all four properties', String(me.body?.data?.metrics?.total_properties));

  const pf = await req('GET', '/api/landlord/portfolio', asUser(landlordToken));
  ok(pf.status === 200, 'the portfolio answers', `HTTP ${pf.status}`);
  const rows = pf.body?.data || [];
  for (const cat of ['residential', 'commercial', 'business', 'rural']) {
    ok(rows.some((r) => Number(r.id) === Number(props[cat])),
      `the ${cat} property is in the landlord's portfolio`);
  }

  // The portfolio must SAY which category each row is, or a mixed-holding
  // landlord cannot tell a commercial floor from a flat.
  const cats = [...new Set(rows.map((r) => r.category).filter(Boolean))];
  ok(cats.length >= 4, 'each row carries its category', cats.join(','));

  // And the rural row must carry the land record — area and district cannot tell
  // one parcel from another.
  const rural = rows.find((r) => Number(r.id) === Number(props.rural));
  for (const f of ['mouza', 'khatiyan', 'dag', 'land_area_decimal']) {
    ok(rural && rural[f] != null, `the rural row carries ${f}`, String(rural?.[f]));
  }
  // A residential row carries them as null rather than being broken by them.
  const res = rows.find((r) => Number(r.id) === Number(props.residential));
  ok(res && res.mouza == null, 'a residential row is unaffected, carrying null');
  ok(res && res.category === 'residential', 'and knows its own category', res?.category);

  // Property detail is ownership-gated.
  const detail = await req('GET', `/api/landlord/properties/${props.commercial}`, asUser(landlordToken));
  ok(detail.status === 200, 'the commercial property detail opens for its owner', `HTTP ${detail.status}`);

  const others = await req('GET', '/api/properties?limit=5');
  const notMine = (others.body?.data || []).find((p) => !Object.values(props).includes(p.id));
  if (notMine) {
    const denied = await req('GET', `/api/landlord/properties/${notMine.id}`, asUser(landlordToken));
    ok(denied.status === 404, 'a property they do not own is refused', `HTTP ${denied.status}`);
  }

  // A landlord must not reach the admin API.
  const admin = await req('GET', '/api/properties?limit=1', asUser(landlordToken));
  ok([401, 403].includes(admin.status), 'the landlord cannot reach the admin property API', `HTTP ${admin.status}`);
  const tenantSide = await req('GET', '/api/tenant/me', asUser(landlordToken));
  ok([401, 403].includes(tenantSide.status), 'nor the tenant portal', `HTTP ${tenantSide.status}`);
}

async function approvals() {
  console.log('\n-- An approval, driven from the portal, on a COMMERCIAL property --');
  if (!landlordToken) { ok(false, 'no landlord session to test approvals with'); return; }

  // An application on the commercial unit, put into the state the portal gates on.
  const app = await req('POST', '/api/tenant-applications', {
    body: {
      property_id: props.commercial, applicant_name: `E2E Portal Applicant ${STAMP}`,
      branch_id: 1, status: 'awaiting_owner_approval',
    },
  });
  ok(app.status === 201, 'an application awaits owner approval', `HTTP ${app.status} ${app.body?.error || ''}`);
  const appId = app.body?.data?.id;
  if (appId) made.applications.push(appId);
  ok(app.body?.data?.status === 'awaiting_owner_approval', 'it is in the awaiting state',
    app.body?.data?.status);

  const list = await req('GET', '/api/landlord/approvals', asUser(landlordToken));
  ok(list.status === 200, 'the approvals queue answers', `HTTP ${list.status}`);
  ok((list.body?.data?.applications || []).some((a) => Number(a.id) === Number(appId)),
    'the COMMERCIAL application appears in the landlord queue — the queue is not residential-only');
  ok(Number(list.body?.data?.total) >= 1, 'the queue total counts it', String(list.body?.data?.total));

  const decide = await req('POST', `/api/landlord/approvals/application/${appId}/decide`, {
    ...asUser(landlordToken),
    body: { decision: 'approved', note: `E2E approved ${STAMP}` },
  });
  ok(decide.status === 200, 'the landlord can approve it from the portal', `HTTP ${decide.status} ${decide.body?.error || ''}`);

  // The decision must land on the admin side, not just return 200.
  const back = await req('GET', `/api/tenant-applications/${appId}`);
  ok(back.body?.data?.status !== 'awaiting_owner_approval',
    'the application left the awaiting state', back.body?.data?.status);

  const after = await req('GET', '/api/landlord/approvals', asUser(landlordToken));
  ok(!(after.body?.data?.applications || []).some((a) => Number(a.id) === Number(appId)),
    'and it has left the queue');

  // A decision on something they do not own must be refused.
  const bogus = await req('POST', '/api/landlord/approvals/application/999999/decide', {
    ...asUser(landlordToken), body: { decision: 'approved' },
  });
  ok([403, 404].includes(bogus.status), 'a decision on an unknown application is refused', `HTTP ${bogus.status}`);
}

async function tenantPortal() {
  console.log('\n-- The tenant portal, on the COMMERCIAL tenancy --');

  const tc = await req('POST', '/api/contacts', {
    body: { full_name: `E2E Portal Tenant ${STAMP}`, primary_phone: `0182${String(STAMP).slice(-6)}`, email: `e2e.tenant.${STAMP}@example.com`, contact_type: 'tenant', branch_id: 1 },
  });
  tenantContactId = tc.body?.data?.id;
  if (tenantContactId) made.contacts.push(tenantContactId);
  ok(tc.status === 201, 'tenant contact created', `HTTP ${tc.status}`);

  const ten = await req('POST', '/api/tenancies', {
    body: {
      property_id: props.commercial, tenant_contact_id: tenantContactId,
      owner_contact_id: ownerContactId, monthly_rent: 220000, status: 'active',
      lease_start: '2026-09-01', lease_end: '2027-08-31', branch_id: 1,
    },
  });
  ok(ten.status === 201, 'a commercial tenancy exists', `HTTP ${ten.status} ${ten.body?.error || ''}`);
  if (ten.body?.data?.id) made.tenancies.push(ten.body.data.id);

  const tcl = await req('POST', '/api/clients', {
    body: { contact_id: tenantContactId, client_type: 'tenant', branch_id: 1 },
  });
  const tClientId = tcl.body?.data?.id;
  if (tClientId) made.clients.push(tClientId);
  const acc = await req('POST', `/api/clients/${tClientId}/portal-access`, {
    body: { email: `e2e.tenant.${STAMP}@example.com`, password: PASSWORD, role: 'tenant' },
  });
  ok([200, 201].includes(acc.status), 'tenant portal access enabled', `HTTP ${acc.status} ${acc.body?.error || ''}`);

  const auth = await req('POST', '/api/auth/login', {
    noAuth: true, body: { email: `e2e.tenant.${STAMP}@example.com`, password: PASSWORD },
  });
  tenantToken = auth.body?.token || '';
  ok(!!tenantToken, 'the tenant can sign in', auth.body?.error || `HTTP ${auth.status}`);
  if (!tenantToken) return;

  const me = await req('GET', '/api/tenant/me', asUser(tenantToken));
  ok(me.status === 200, '/api/tenant/me answers', `HTTP ${me.status} ${me.body?.error || ''}`);
  ok(Number(me.body?.data?.property?.id) === Number(props.commercial),
    'it shows their COMMERCIAL property, not a residential default', String(me.body?.data?.property?.id));
  ok(me.body?.data?.property?.category === 'commercial',
    'and says the property is commercial', me.body?.data?.property?.category);

  const tenancy = await req('GET', '/api/tenant/tenancy', asUser(tenantToken));
  ok(tenancy.status === 200, 'the tenancy view answers', `HTTP ${tenancy.status}`);
  ok(Number(tenancy.body?.data?.property?.building_size) === 3100,
    'it carries the commercial size rather than bedroom counts', String(tenancy.body?.data?.property?.building_size));

  // The tenant can actually DO the things the portal offers.
  const wo = await req('POST', '/api/tenant/work-orders', {
    ...asUser(tenantToken),
    body: { title: `E2E portal repair ${STAMP}`, description: 'Air conditioning in the server room', severity: 'high' },
  });
  ok([200, 201].includes(wo.status), 'the tenant can raise a maintenance request', `HTTP ${wo.status} ${wo.body?.error || ''}`);

  const myWos = await req('GET', '/api/tenant/work-orders', asUser(tenantToken));
  ok(myWos.status === 200 && (myWos.body?.data || []).some((w) => String(w.title || '').includes(STAMP)),
    'and see it in their own list');

  const msg = await req('POST', '/api/tenant/messages', {
    ...asUser(tenantToken), body: { subject: `E2E portal ${STAMP}`, body: `E2E portal message ${STAMP}` },
  });
  ok([200, 201].includes(msg.status), 'the tenant can message the manager', `HTTP ${msg.status}`);

  const inv = await req('GET', '/api/tenant/invoices', asUser(tenantToken));
  ok(inv.status === 200, 'the tenant invoice list answers', `HTTP ${inv.status}`);

  // Isolation: a tenant must not reach the landlord portal or the admin API.
  const asLandlord = await req('GET', '/api/landlord/portfolio', asUser(tenantToken));
  ok([401, 403].includes(asLandlord.status), 'the tenant cannot reach the landlord portal', `HTTP ${asLandlord.status}`);
  const asAdmin = await req('GET', '/api/properties?limit=1', asUser(tenantToken));
  ok([401, 403].includes(asAdmin.status), 'nor the admin property API', `HTTP ${asAdmin.status}`);
}

async function unlinked() {
  console.log('\n-- An unlinked or wrong-role user gets a clean refusal --');
  const noAuth = await req('GET', '/api/landlord/portfolio', { noAuth: true });
  ok(noAuth.status === 401, 'the landlord portal needs authentication', `HTTP ${noAuth.status}`);
  const adminOnLandlord = await req('GET', '/api/landlord/portfolio');
  ok(adminOnLandlord.status === 403, 'a staff user is not a landlord', `HTTP ${adminOnLandlord.status}`);
  ok(/landlord/i.test(String(adminOnLandlord.body?.error || '')),
    'and the refusal says why', adminOnLandlord.body?.error);
}

/**
 * Cleanup that CHECKS ITS OWN DELETES.
 *
 * The first version fired DELETEs and moved on. /api/tenancies/:id has no DELETE
 * route, so it answered 404 with an HTML error page, the tenancy stayed active,
 * and four fixture properties survived — which moved the residential baseline
 * (53 managed -> 54, 103 open actions -> 104) and broke four other suites that
 * assert it. A cleanup that does not verify is not a cleanup.
 */
async function del(path, label) {
  const r = await req('DELETE', path);
  if ([200, 204].includes(r.status)) return true;
  ok(false, `cleanup: ${label}`, `DELETE ${path} -> HTTP ${r.status} ${String(r.body?.error || r.body?._raw || '').slice(0, 80)}`);
  return false;
}

async function cleanup() {
  console.log('\n-- Fixture cleanup (this DB is the production DB) --');
  // Tenancies cannot be deleted (no route, by design), so they are TERMINATED,
  // or the property they sit on cannot be removed either.
  for (const id of made.tenancies) {
    const r = await req('PUT', `/api/tenancies/${id}`, { body: { status: 'terminated' } });
    ok(r.status === 200, `cleanup: tenancy ${id} terminated`, `HTTP ${r.status}`);
  }
  for (const id of made.applications) await del(`/api/tenant-applications/${id}`, `application ${id}`);
  for (const id of made.properties) await del(`/api/properties/${id}`, `property ${id}`);
  /*
   * Clients cannot be deleted either (no DELETE route), and neither can users. The
   * honest cleanup is therefore to REVOKE the portal access, so the logins this
   * suite created can no longer reach anything, and to say so rather than claim
   * the rows are gone.
   */
  for (const id of made.clients) {
    const r = await req('PUT', `/api/clients/${id}`, { body: { portal_enabled: false, status: 'inactive' } });
    ok(r.status === 200, `cleanup: client ${id} portal access revoked`, `HTTP ${r.status}`);
  }
  for (const id of made.contacts) await del(`/api/contacts/${id}`, `contact ${id}`);

  const left = await req('GET', `/api/contacts?search=${STAMP}&limit=50`);
  const strays = (left.body?.data || []).filter((c) => String(c.full_name || '').includes(String(STAMP)));
  ok(strays.length === 0, 'no fixture contacts left behind', strays.map((c) => c.id).join(',') || 'clean');

  const p = await req('GET', '/api/properties?limit=300');
  const pStrays = (p.body?.data || []).filter((x) => String(x.title || '').includes(STAMP));
  ok(pStrays.length === 0, 'no fixture properties left behind', pStrays.map((x) => x.property_code).join(',') || 'clean');

  // The baseline four other suites assert. This suite creates a RESIDENTIAL
  // property, so it is the one most able to move it.
  const ac = await req('GET', '/api/property-management/action-center?category=residential');
  ok(ac.body?.headline?.open_action_count === 103, 'residential open actions back to baseline',
    `${ac.body?.headline?.open_action_count} (expected 103)`);
  const dm = await req('GET', '/api/property-management/dashboard-metrics?category=residential');
  ok(Number(dm.body?.occupancy?.managed) === 53, 'residential managed properties back to baseline',
    `${dm.body?.occupancy?.managed} (expected 53)`);

  console.log(`  NOTE: two rows cannot be removed through the API and are left behind on purpose:`);
  console.log(`    - the portal USER logins (${made.users.length} tracked) and their CLIENT rows: neither has a delete endpoint. Their portal_enabled is revoked and their contacts are deleted, so they resolve to no owner or tenant record and see nothing.`);
  console.log(`    - the tenant's message and maintenance-request COMMUNICATIONS: "Only drafts can be deleted", which is a deliberate audit guard. They are terminated-tenancy history on a deleted property.`);
}

(async () => {
  console.log(`\n===== LANDLORD / TENANT PORTAL E2E (run ${STAMP}) =====`);
  if (!(await login())) return finish();
  await setup();
  await landlordPortal();
  await approvals();
  await tenantPortal();
  await unlinked();
  await cleanup();
  finish();
})().catch((e) => { ok(false, 'harness crashed', e.stack); finish(); });
