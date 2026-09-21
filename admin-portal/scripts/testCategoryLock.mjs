import assert from 'node:assert';
import { lockedCategoryForPath } from '../src/screens/sales/categoryLock.mjs';

assert.strictEqual(lockedCategoryForPath('/business/sell'), 'business');
assert.strictEqual(lockedCategoryForPath('/business/reports'), 'business');
assert.strictEqual(lockedCategoryForPath('/business'), 'business');
assert.strictEqual(lockedCategoryForPath('/business-rent/listings'), null);
assert.strictEqual(lockedCategoryForPath('/business-registration'), null);
assert.strictEqual(lockedCategoryForPath('/commercial/reports'), null);
assert.strictEqual(lockedCategoryForPath('/residential/sell'), null);
assert.strictEqual(lockedCategoryForPath(''), null);
assert.strictEqual(lockedCategoryForPath(undefined), null);
console.log('categoryLock OK');
