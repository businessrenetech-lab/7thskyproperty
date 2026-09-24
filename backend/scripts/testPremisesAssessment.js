const assert = require('assert');
const { PREMISES_ASSESSMENT_ITEMS, ROOM_ASSESSMENT_ITEMS, computeReadiness } = require('../services/rentalWorkflow.service');

const sections = [...new Set(PREMISES_ASSESSMENT_ITEMS.map((i) => i.section))];
// SOP Rental §8 — the ten things a business premises is assessed on.
assert.deepStrictEqual(sections, [
  'Location suitability', 'Business suitability', 'Operational condition', 'Maintenance condition',
  'Accessibility', 'Signage & visibility', 'Security', 'Parking', 'Utility readiness', 'Leasing readiness',
]);

// A warehouse has no bedrooms: the residential template must not bleed in.
const labels = PREMISES_ASSESSMENT_ITEMS.map((i) => `${i.section} ${i.assessment_item}`.toLowerCase());
assert.ok(!labels.some((l) => l.includes('bedroom')), 'no bedrooms');
assert.ok(!labels.some((l) => l.includes('bathroom 2')), 'no second bathroom');
// …and the residential template is untouched.
assert.ok(ROOM_ASSESSMENT_ITEMS.some((i) => i.section === 'Bedroom 1'), 'room template unchanged');

// Utility readiness and leasing readiness gate marketing.
const blocking = PREMISES_ASSESSMENT_ITEMS.filter((i) => i.is_blocking).map((i) => i.section);
assert.ok(blocking.includes('Utility readiness'), 'utilities block marketing');
assert.ok(blocking.includes('Leasing readiness'), 'leasing readiness blocks marketing');

// An assessment with an unresolved blocking item is not ready for marketing.
const items = PREMISES_ASSESSMENT_ITEMS.map((i) => ({ ...i, status: i.is_blocking ? 'pending' : 'done' }));
assert.notStrictEqual(computeReadiness(items).status, 'ready_for_marketing');

// …and one with everything done is.
const allDone = PREMISES_ASSESSMENT_ITEMS.map((i) => ({ ...i, status: 'done' }));
assert.strictEqual(computeReadiness(allDone).status, 'ready_for_marketing');

console.log('premisesAssessment OK');
