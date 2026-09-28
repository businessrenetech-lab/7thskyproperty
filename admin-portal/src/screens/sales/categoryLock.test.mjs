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

// ── consoleBaseForPath: keep in-console links inside the console ──────────────
import { consoleBaseForPath, isSalesConsoleBase } from './categoryLock.mjs';

// Longest match wins: the rent consoles must not be mistaken for their sale siblings.
assert.strictEqual(consoleBaseForPath('/commercial/rent/contacts'), '/commercial/rent');
assert.strictEqual(consoleBaseForPath('/commercial/contacts'), '/commercial');
assert.strictEqual(consoleBaseForPath('/rural/rent/contacts'), '/rural/rent');
assert.strictEqual(consoleBaseForPath('/rural/sell'), '/rural');
assert.strictEqual(consoleBaseForPath('/business-rent/contacts'), '/business-rent');
assert.strictEqual(consoleBaseForPath('/business/contacts'), '/business');
assert.strictEqual(consoleBaseForPath('/property-management/contacts'), '/property-management');
assert.strictEqual(consoleBaseForPath('/residential/contacts'), '/residential');

// The base itself, with no trailing segment.
assert.strictEqual(consoleBaseForPath('/commercial'), '/commercial');
assert.strictEqual(consoleBaseForPath('/commercial/rent'), '/commercial/rent');

// A path that merely shares a prefix is not a console.
assert.strictEqual(consoleBaseForPath('/commercial-interior-design/clients'), null);
assert.strictEqual(consoleBaseForPath('/business-registration/clients'), null);
assert.strictEqual(consoleBaseForPath('/clients'), null);
assert.strictEqual(consoleBaseForPath('/'), null);

// Only the buy/sale consoles have a buyer section.
assert.strictEqual(isSalesConsoleBase('/commercial'), true);
assert.strictEqual(isSalesConsoleBase('/commercial/rent'), false);
assert.strictEqual(isSalesConsoleBase('/property-management'), false);
// /rural gained a buyer section with the Rural Sale build; /rural/rent has none.
assert.strictEqual(isSalesConsoleBase('/rural'), true);
assert.strictEqual(isSalesConsoleBase('/rural/rent'), false);
assert.strictEqual(isSalesConsoleBase('/business-rent'), false);

console.log('consoleBaseForPath OK');
