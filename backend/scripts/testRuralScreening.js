const assert = require('assert');
const { screeningFields, screeningVerdict, SCREENING_FIELDS_BY_CATEGORY } = require('../services/businessScreening');

// SOP §10 Step 11 + CRM Owner Sheet 8 — what a rural tenant is screened on.
assert.deepStrictEqual(screeningFields('rural').map((f) => f.key), [
  'nid_verified', 'business_verification', 'farming_experience', 'financial_capacity',
  'references_verified', 'background_check', 'intended_use', 'screening_notes',
]);

// Business keeps its own eight fields, unchanged.
assert.deepStrictEqual(screeningFields('business').map((f) => f.key), [
  'business_type', 'intended_activity', 'trade_licence_no', 'corporate_profile',
  'financial_capability', 'operational_suitability', 'previous_leasing_history', 'screening_notes',
]);
assert.ok(!screeningFields('rural').some((f) => f.key === 'trade_licence_no'),
  'a farmer is not screened on a trade licence');

// An unknown category has no screening — the residential flow is untouched.
assert.deepStrictEqual(screeningFields('residential'), []);
assert.deepStrictEqual(screeningFields(undefined), []);

// Verdict: rural asks its own questions.
const full = {
  nid_verified: 'Yes', business_verification: 'Trade licence seen', farming_experience: '12 years paddy',
  financial_capacity: 'Bank statements 12m', references_verified: 'Two referees called',
  background_check: 'Clear', intended_use: 'Paddy cultivation',
};
let r = screeningVerdict(full, 'rural');
assert.strictEqual(r.ready, true, 'all rural facts gathered');
assert.deepStrictEqual(r.missing, []);
assert.strictEqual(r.verdict, 'pending', 'gathering facts is not deciding');
assert.strictEqual(screeningVerdict({ ...full, screening_verdict: 'suitable' }, 'rural').verdict, 'suitable');

r = screeningVerdict({}, 'rural');
assert.strictEqual(r.ready, false);
assert.ok(r.missing.includes('farming_experience'));

// Whitespace is not an answer.
assert.strictEqual(screeningVerdict({ ...full, farming_experience: '   ' }, 'rural').ready, false);

// The old single-argument call still behaves as business — nothing regresses.
const biz = {
  business_type: 'Retail', intended_activity: 'Shop', trade_licence_no: 'TL-1',
  corporate_profile: 'Ltd', financial_capability: 'ok', operational_suitability: 'ok',
  previous_leasing_history: 'clean',
};
assert.strictEqual(screeningVerdict(biz).ready, true, 'default stays business');
assert.ok(Object.keys(SCREENING_FIELDS_BY_CATEGORY).includes('rural'));

console.log('ruralScreening OK');
