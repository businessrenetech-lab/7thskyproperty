const assert = require('assert');
const { screeningVerdict, BUSINESS_SCREENING_FIELDS } = require('../services/businessScreening');

// SOP Rental §11 / Tenancy §6 — the eight things a business tenant is screened on.
assert.deepStrictEqual(BUSINESS_SCREENING_FIELDS.map((f) => f.key), [
  'business_type', 'intended_activity', 'trade_licence_no', 'corporate_profile',
  'financial_capability', 'operational_suitability', 'previous_leasing_history', 'screening_notes',
]);

// Nothing filled in: pending, and every required field is named as missing.
let r = screeningVerdict({});
assert.strictEqual(r.verdict, 'pending');
assert.strictEqual(r.ready, false);
assert.ok(r.missing.includes('business_type'), 'names what is missing');

// Everything filled but no verdict recorded yet: ready to decide, still pending.
const full = {
  business_type: 'Retail', intended_activity: 'Clothing store', trade_licence_no: 'TL-9911',
  corporate_profile: 'Ltd, 3 branches', financial_capability: 'Bank statements 12m',
  operational_suitability: 'Suits ground-floor retail', previous_leasing_history: '2 prior leases, clean',
};
r = screeningVerdict(full);
assert.strictEqual(r.ready, true, 'all facts gathered');
assert.deepStrictEqual(r.missing, []);
assert.strictEqual(r.verdict, 'pending', 'gathering facts is not deciding');

// A recorded verdict is reported as recorded.
assert.strictEqual(screeningVerdict({ ...full, screening_verdict: 'suitable' }).verdict, 'suitable');
assert.strictEqual(screeningVerdict({ ...full, screening_verdict: 'conditional' }).verdict, 'conditional');
assert.strictEqual(screeningVerdict({ ...full, screening_verdict: 'declined' }).verdict, 'declined');

// An unrecognised verdict is not trusted through to the dashboard.
assert.strictEqual(screeningVerdict({ ...full, screening_verdict: 'probably fine' }).verdict, 'pending');

// A declined verdict stands even with facts missing — declining early is allowed.
r = screeningVerdict({ business_type: 'Retail', screening_verdict: 'declined' });
assert.strictEqual(r.verdict, 'declined');
assert.strictEqual(r.ready, false, 'still reports the gaps');

// Whitespace is not an answer.
assert.strictEqual(screeningVerdict({ ...full, trade_licence_no: '   ' }).ready, false);

console.log('businessScreening OK');
