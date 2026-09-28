const assert = require('assert');
const { checkLeaseStructure, BUSINESS_LEASE_DEFAULTS } = require('../services/businessLeaseStructure');

// SOP Rental §9 / Tenancy §9.
assert.strictEqual(BUSINESS_LEASE_DEFAULTS.lease_term_months, 36);
assert.strictEqual(BUSINESS_LEASE_DEFAULTS.advance_months, 12);
assert.deepStrictEqual(BUSINESS_LEASE_DEFAULTS.extension_options, ['3+2', '3+3']);
assert.deepStrictEqual(BUSINESS_LEASE_DEFAULTS.renewal_increment_pct, { min: 10, max: 20 });

// The standard lease passes clean.
const standard = { lease_term_months: 36, advance_months: 12, extension_option: '3+2', renewal_increment_pct: 15 };
assert.deepStrictEqual(checkLeaseStructure(standard), { ok: true, warnings: [] });

// A departure WARNS. It must never be reported as invalid — the SOP allows it
// "unless otherwise approved by management", so the console records it instead.
const short = checkLeaseStructure({ ...standard, lease_term_months: 6 });
assert.strictEqual(short.ok, false);
assert.strictEqual(short.warnings.length, 1);
assert.strictEqual(short.warnings[0].field, 'lease_term_months');
assert.ok(/36/.test(short.warnings[0].message), 'the message states the standard');

const lowAdvance = checkLeaseStructure({ ...standard, advance_months: 3 });
assert.strictEqual(lowAdvance.warnings[0].field, 'advance_months');

const badIncrement = checkLeaseStructure({ ...standard, renewal_increment_pct: 35 });
assert.strictEqual(badIncrement.warnings[0].field, 'renewal_increment_pct');
assert.strictEqual(checkLeaseStructure({ ...standard, renewal_increment_pct: 10 }).ok, true, '10% is in bounds');
assert.strictEqual(checkLeaseStructure({ ...standard, renewal_increment_pct: 20 }).ok, true, '20% is in bounds');

const badExtension = checkLeaseStructure({ ...standard, extension_option: '5+5' });
assert.strictEqual(badExtension.warnings[0].field, 'extension_option');

// Fields that were never filled in are not departures — a draft lease is not a violation.
assert.deepStrictEqual(checkLeaseStructure({}), { ok: true, warnings: [] });
assert.deepStrictEqual(checkLeaseStructure({ lease_term_months: null, advance_months: '' }), { ok: true, warnings: [] });

// Several departures at once are all reported, not just the first.
const many = checkLeaseStructure({ lease_term_months: 12, advance_months: 2, renewal_increment_pct: 40 });
assert.strictEqual(many.warnings.length, 3);

// Strings from a form body are numbers too.
assert.deepStrictEqual(checkLeaseStructure({ lease_term_months: '36', advance_months: '12' }), { ok: true, warnings: [] });

console.log('businessLeaseStructure OK');
