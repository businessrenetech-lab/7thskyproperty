const assert = require('assert');
const { protectionMonthsFor, protectionExpiry, PROTECTION_MONTHS_BY_CATEGORY } = require('../services/protectionWindow');

// SOP Rural Rental §13 / Tenancy §11: 24 months. Business Rent is 12.
// NOTE: the signed rural agreements state twelve (12) months in clause 22; the
// internal protection register deliberately tracks the SOP's 24.
assert.strictEqual(protectionMonthsFor('rural'), 24);
assert.strictEqual(protectionMonthsFor('business'), 12);
assert.strictEqual(protectionMonthsFor('residential'), 12);
assert.strictEqual(protectionMonthsFor('commercial'), 12);
assert.strictEqual(protectionMonthsFor(undefined), 12, 'the default must not change');
assert.strictEqual(protectionMonthsFor('nonsense'), 12);

// Applied, a rural introduction is protected for two years.
assert.strictEqual(protectionExpiry('2026-09-26', protectionMonthsFor('rural')), '2028-09-26');
assert.strictEqual(protectionExpiry('2026-09-26', protectionMonthsFor('business')), '2027-09-26');
// Month-end clamping still holds across two years.
assert.strictEqual(protectionExpiry('2026-08-31', 24), '2028-08-31');
assert.strictEqual(protectionExpiry('2024-02-29', 24), '2026-02-28');
assert.strictEqual(PROTECTION_MONTHS_BY_CATEGORY.rural, 24);

console.log('protectionMonths OK');
