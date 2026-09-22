const assert = require('assert');
const { salesCategory, SALES_CATEGORIES } = require('../utils/salesCategory');

assert.deepStrictEqual(SALES_CATEGORIES, ['residential', 'commercial', 'rural', 'business']);
assert.strictEqual(salesCategory('business'), 'business');
assert.strictEqual(salesCategory('BUSINESS'), 'business');
assert.strictEqual(salesCategory('commercial'), 'commercial');
assert.strictEqual(salesCategory('business_rent'), null);
assert.strictEqual(salesCategory(''), null);
assert.strictEqual(salesCategory(undefined), null);
assert.strictEqual(salesCategory("x' OR 1=1"), null);
console.log('salesCategory OK');
