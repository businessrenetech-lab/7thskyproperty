// Run: node src/screens/sales/categoryLock.test.mjs   (from admin-portal/)
import assert from 'node:assert';
import { consoleCategoryForPath, lockedCategoryForPath } from './categoryLock.mjs';

// Each console locks its shared screens to its own category.
assert.strictEqual(consoleCategoryForPath('/residential/sell'), 'residential');
assert.strictEqual(consoleCategoryForPath('/property-management/contacts'), 'residential');
assert.strictEqual(consoleCategoryForPath('/commercial/sell'), 'commercial');
assert.strictEqual(consoleCategoryForPath('/commercial/rent/contacts'), 'commercial');
assert.strictEqual(consoleCategoryForPath('/business/sell'), 'business');
assert.strictEqual(consoleCategoryForPath('/business-rent/contacts'), 'business');
assert.strictEqual(consoleCategoryForPath('/rural/sell'), 'rural');
assert.strictEqual(consoleCategoryForPath('/rural/rent/contacts'), 'rural');

// A service line is not a property category — it must not lock to 'business'.
assert.strictEqual(consoleCategoryForPath('/business-registration'), null);
assert.strictEqual(consoleCategoryForPath('/business-registration/projects'), null);

// Outside a console, nothing is locked and the screens stay unscoped, as before.
assert.strictEqual(consoleCategoryForPath('/sales/reports'), null);
assert.strictEqual(consoleCategoryForPath('/clients'), null);
assert.strictEqual(consoleCategoryForPath('/'), null);
assert.strictEqual(consoleCategoryForPath(''), null);
assert.strictEqual(consoleCategoryForPath(undefined), null);

// A path that merely starts with the same letters must not match.
assert.strictEqual(consoleCategoryForPath('/commercial-interior-design'), null);
assert.strictEqual(consoleCategoryForPath('/residential-interior-design'), null);

// The sales alias is the same resolver.
assert.strictEqual(lockedCategoryForPath('/commercial/sell'), 'commercial');
assert.strictEqual(lockedCategoryForPath('/business/sell'), 'business');

console.log('categoryLock OK');
