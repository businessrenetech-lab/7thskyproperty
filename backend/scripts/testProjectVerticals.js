const assert = require('assert');
const { verticalsForCategory, VERTICALS_BY_CATEGORY } = require('../utils/projectVerticals');

// Each console owns its own verticals.
assert.ok(verticalsForCategory('residential').includes('leasing'));
assert.ok(verticalsForCategory('residential').includes('properties_sale'));
assert.ok(verticalsForCategory('commercial').includes('commercial_rent'));
assert.ok(verticalsForCategory('business').includes('business_sale'));
assert.ok(verticalsForCategory('rural').includes('rural_rent'));

// No vertical belongs to two consoles — that would leak projects both ways.
const seen = new Map();
for (const [cat, list] of Object.entries(VERTICALS_BY_CATEGORY)) {
  for (const v of list) {
    assert.ok(!seen.has(v), `${v} is claimed by both ${seen.get(v)} and ${cat}`);
    seen.set(v, cat);
  }
}

// Service lines are their own consoles, not part of a property category.
for (const cat of Object.keys(VERTICALS_BY_CATEGORY)) {
  for (const line of ['water_tank', 'ac', 'solar', 'business_registration', 'property_care']) {
    assert.ok(!VERTICALS_BY_CATEGORY[cat].includes(line), `${line} must not be a ${cat} vertical`);
  }
}

// Not a console → null, so the caller leaves the query unfiltered as before.
assert.strictEqual(verticalsForCategory('water_tank'), null);
assert.strictEqual(verticalsForCategory('nonsense'), null);
assert.strictEqual(verticalsForCategory(undefined), null);
assert.strictEqual(verticalsForCategory(''), null);

console.log('projectVerticals OK');
