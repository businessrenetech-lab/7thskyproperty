const assert = require('assert');
const { resolveAgreementCategory } = require('../services/agreementCategory');

const BUILDERS = { residential: () => 'res', commercial: () => 'com' };

// A supported category resolves.
assert.strictEqual(resolveAgreementCategory('residential', BUILDERS).category, 'residential');
assert.strictEqual(resolveAgreementCategory('commercial', BUILDERS).category, 'commercial');
assert.strictEqual(resolveAgreementCategory(undefined, BUILDERS).category, 'residential', 'default stays residential');
assert.strictEqual(resolveAgreementCategory('', BUILDERS).category, 'residential');
assert.strictEqual(resolveAgreementCategory('COMMERCIAL', BUILDERS).category, 'commercial', 'case insensitive');

// An unsupported console must NOT silently receive a residential document.
// Rural now has builders (see rprmRuralAgreementPack); business still does not.
for (const c of ['business']) {
  assert.throws(() => resolveAgreementCategory(c, BUILDERS), (e) => {
    assert.strictEqual(e.status, 400, 'carries an HTTP status');
    assert.ok(e.message.includes(c), `names the category: ${e.message}`);
    assert.ok(/builder|template|not available/i.test(e.message), `says what is missing: ${e.message}`);
    return true;
  }, `${c} must fail loudly`);
}

// Once a builder is registered, it resolves — this is how the Rural plan adds rural.
const WITH_RURAL = { ...BUILDERS, rural: () => 'rur' };
assert.strictEqual(resolveAgreementCategory('rural', WITH_RURAL).category, 'rural');

// Junk is not silently mapped onto a real builder.
assert.throws(() => resolveAgreementCategory('nonsense', BUILDERS));

console.log('agreementCategory OK');
