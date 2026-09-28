const assert = require('assert');
const { categoryForWebsiteRecord } = require('../controllers/publicWebsite.controller');

// A website enquiry belongs to the console that owns the property enquired on.
assert.strictEqual(categoryForWebsiteRecord({ category: 'rural' }), 'rural');
assert.strictEqual(categoryForWebsiteRecord({ category: 'commercial' }), 'commercial');
assert.strictEqual(categoryForWebsiteRecord({ category: 'business' }), 'business');
assert.strictEqual(categoryForWebsiteRecord({ category: 'residential' }), 'residential');

// A general enquiry with no property still needs a home — residential, by decision,
// so it is worked rather than invisible.
assert.strictEqual(categoryForWebsiteRecord(null), 'residential');
assert.strictEqual(categoryForWebsiteRecord(undefined), 'residential');
assert.strictEqual(categoryForWebsiteRecord({}), 'residential');

// A property with a category outside the four consoles is not trusted through.
assert.strictEqual(categoryForWebsiteRecord({ category: 'short_term' }), 'residential');
assert.strictEqual(categoryForWebsiteRecord({ category: 'nonsense' }), 'residential');

console.log('websiteRouting OK');
