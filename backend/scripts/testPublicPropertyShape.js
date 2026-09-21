const assert = require('assert');
const { isPubliclyVisible, pickPublic, PUBLIC_DETAIL_FIELDS } = require('../services/publicPropertyShape');

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

console.log('publicPropertyShape OK');
