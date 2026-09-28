const assert = require('assert');
const {
  isPubliclyVisible, pickPublic, PUBLIC_DETAIL_FIELDS,
  RURAL_PUBLIC_FIELDS, RURAL_WITHHELD_FIELDS,
} = require('../services/publicPropertyShape');

// Visibility mirrors the public list endpoint's rule.
assert.strictEqual(isPubliclyVisible({ is_published: true }), true);
assert.strictEqual(isPubliclyVisible({ is_published: 1 }), true);
assert.strictEqual(isPubliclyVisible({ is_published: false, listing_type: 'short_term' }), true);
assert.strictEqual(isPubliclyVisible({ is_published: false, status: 'sold' }), true);
assert.strictEqual(isPubliclyVisible({ is_published: false, listing_status: 'let' }), true);
assert.strictEqual(isPubliclyVisible({ is_published: false, status: 'available', listing_status: 'draft' }), false);
assert.strictEqual(isPubliclyVisible(null), false);

// Allowlist drops private columns and keeps public ones.
const out = pickPublic({
  id: 7, title: 'T', price: 10, area: 'Gulshan', description: 'd',
  owner_contact_id: 3, access_contacts: [{ name: 'Key holder', phone: '017' }], remarks: 'internal',
  latitude: 23.7, management_fee_pct: 8, market_rent_min: 1, pm_status: 'x', branch_id: 1, created_by: 2,
});
for (const k of ['owner_contact_id', 'access_contacts', 'remarks', 'latitude', 'management_fee_pct', 'market_rent_min', 'pm_status', 'branch_id', 'created_by']) {
  assert.ok(!(k in out), `private field leaked: ${k}`);
}
assert.deepStrictEqual({ id: out.id, title: out.title, price: out.price, area: out.area }, { id: 7, title: 'T', price: 10, area: 'Gulshan' });
assert.ok(!PUBLIC_DETAIL_FIELDS.includes('owner_contact_id'));

// ── Rural land record ──────────────────────────────────────────

const LAND = {
  upazila: 'Barura', union_name: 'Payalgachha', village: 'Ramnagar', mouza: 'Ramnagar Mouza',
  khatiyan: 'KH-9001', dag: 'DAG-4412', land_area_decimal: 33.5, current_use: 'Paddy',
};

const rural = pickPublic({ id: 1, category: 'rural', title: 'Plot', district: 'Cumilla', ...LAND });

// A rural listing carries what a buyer searches on.
for (const k of RURAL_PUBLIC_FIELDS) {
  assert.ok(k in rural, `a rural listing must publish ${k}`);
}
assert.strictEqual(rural.mouza, 'Ramnagar Mouza');
assert.strictEqual(rural.land_area_decimal, 33.5);

/*
 * khatiyan and dag are withheld ON PURPOSE. They are the parcel-level identifiers
 * in the public land records, so printing them beside a named listing lets anyone
 * look up the registered owner of a private individual's land. If the client
 * decides they should be public, move them into RURAL_PUBLIC_FIELDS — and this
 * assertion is the one that will tell you that you did.
 */
for (const k of RURAL_WITHHELD_FIELDS) {
  assert.ok(!(k in rural), `${k} must NOT be published on a rural listing`);
  assert.ok(!RURAL_PUBLIC_FIELDS.includes(k), `${k} must not be in the rural allowlist`);
  assert.ok(!PUBLIC_DETAIL_FIELDS.includes(k), `${k} must not be in the general allowlist either`);
}
assert.deepStrictEqual(RURAL_WITHHELD_FIELDS, ['khatiyan', 'dag']);

// The allowlist stays CLOSED for every other category — a residential payload is
// unchanged field-for-field by the rural addition.
for (const category of ['residential', 'commercial', 'business', undefined, null, '']) {
  const other = pickPublic({ id: 2, category, title: 'X', district: 'Dhaka', ...LAND });
  for (const k of [...RURAL_PUBLIC_FIELDS, ...RURAL_WITHHELD_FIELDS]) {
    assert.ok(!(k in other), `${k} leaked into a ${category || 'category-less'} payload`);
  }
}

// A rural row with no land record must not invent empty keys.
const bare = pickPublic({ id: 3, category: 'rural', title: 'Bare', district: 'Cumilla' });
for (const k of RURAL_PUBLIC_FIELDS) {
  assert.ok(!(k in bare), `${k} must be absent, not empty, when the row has no land record`);
}

console.log('publicPropertyShape OK');
