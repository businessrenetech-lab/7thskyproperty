const assert = require('assert');
const {
  RURAL_ASSESSMENT_ITEMS, ROOM_ASSESSMENT_ITEMS, PREMISES_ASSESSMENT_ITEMS, computeReadiness,
} = require('../services/rentalWorkflow.service');

const sections = [...new Set(RURAL_ASSESSMENT_ITEMS.map((i) => i.section))];
// CRM workbook Owner Sheet 5 + Tenant Sheet 10, SOP §8 (owner) / §7 (tenant).
assert.deepStrictEqual(sections, [
  'Access & roads', 'Boundary & ownership', 'Utilities & water', 'Land condition',
  'Existing structures', 'Farming suitability', 'Fishery suitability',
  'Commercial suitability', 'Security', 'Marketing readiness',
]);

// The other two templates are untouched, and rural borrows from neither.
assert.ok(ROOM_ASSESSMENT_ITEMS.some((i) => i.section === 'Bedroom 1'), 'room template unchanged');
assert.ok(PREMISES_ASSESSMENT_ITEMS.some((i) => i.section === 'Signage & visibility'), 'premises template unchanged');
const labels = RURAL_ASSESSMENT_ITEMS.map((i) => `${i.section} ${i.assessment_item}`.toLowerCase());
assert.ok(!labels.some((l) => l.includes('bedroom')), 'no bedrooms on farmland');
assert.ok(!labels.some((l) => l.includes('footfall')), 'footfall is a retail measure, not a rural one');

// What the SOP actually asks about rural land.
for (const needle of ['approach road', 'water source', 'boundary', 'farming', 'fishery']) {
  assert.ok(labels.some((l) => l.includes(needle)), `rural template asks about ${needle}`);
}

// Boundary/ownership and utilities gate marketing.
const blocking = RURAL_ASSESSMENT_ITEMS.filter((i) => i.is_blocking).map((i) => i.section);
assert.ok(blocking.includes('Boundary & ownership'), 'a disputed boundary blocks marketing');
assert.ok(blocking.includes('Utilities & water'), 'water access blocks marketing');

const pending = RURAL_ASSESSMENT_ITEMS.map((i) => ({ ...i, status: i.is_blocking ? 'pending' : 'done' }));
assert.notStrictEqual(computeReadiness(pending).status, 'ready_for_marketing');
const done = RURAL_ASSESSMENT_ITEMS.map((i) => ({ ...i, status: 'done' }));
assert.strictEqual(computeReadiness(done).status, 'ready_for_marketing');

console.log('ruralAssessment OK');
