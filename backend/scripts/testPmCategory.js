const assert = require('assert');
const { pmCategory, pmCategoryClause } = require('../utils/pmCategory');

// The three consoles.
assert.strictEqual(pmCategory('residential'), 'residential');
assert.strictEqual(pmCategory('commercial'), 'commercial');
assert.strictEqual(pmCategory('business'), 'business');
assert.strictEqual(pmCategory('BUSINESS'), 'business', 'case insensitive');

// Unknown and absent must be null so the query is left UNFILTERED exactly as before.
// Returning a clause here would change what the live residential console shows.
assert.strictEqual(pmCategory('rural'), 'rural', 'rural is the fourth PM console');
assert.strictEqual(pmCategory('RURAL'), 'rural', 'case insensitive');
assert.strictEqual(pmCategoryClause('rural', 'p.category'), " AND p.category = 'rural'");

// Still not PM consoles — these must stay null so their queries stay unfiltered.
assert.strictEqual(pmCategory('short_term'), null);
assert.strictEqual(pmCategory('business_rent'), null, 'a service-line key is not a category');
assert.strictEqual(pmCategory('nonsense'), null);
assert.strictEqual(pmCategory(''), null);
assert.strictEqual(pmCategory(undefined), null);
assert.strictEqual(pmCategory(null), null);

// The clause is built, never interpolated from raw input — no SQL can ride in.
assert.strictEqual(pmCategoryClause('business', 'p.category'), " AND p.category = 'business'");
assert.strictEqual(pmCategoryClause('residential', 'category'), " AND category = 'residential'");
assert.strictEqual(pmCategoryClause("'; DROP TABLE properties; --", 'p.category'), '', 'injection yields no clause');
assert.strictEqual(pmCategoryClause(undefined, 'p.category'), '', 'absent yields no clause');

console.log('pmCategory OK');
