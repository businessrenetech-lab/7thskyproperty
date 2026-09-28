const assert = require('assert');
const svc = require('../services/wtProject.service');

// stagesFor/closureFor are internal helpers; the service exposes them for tests.
const stages = svc.stagesFor('business_registration');
const closure = svc.closureFor('business_registration');

assert.strictEqual(stages.length, 9, 'nine client-SOP phases');
assert.deepStrictEqual(
  stages.map((s) => s.key),
  ['lead_management', 'consultation', 'commercial_approval', 'document_collection',
   'provider_assignment', 'service_delivery', 'quality_assurance', 'client_reporting', 'project_completion'],
  'stage keys follow the SOP order',
);

// Gates: commercial approval needs the quotation, delivery needs a provider.
assert.strictEqual(stages.find((s) => s.key === 'commercial_approval').gate, 'quotation');
assert.strictEqual(stages.find((s) => s.key === 'provider_assignment').gate, 'agreement');
assert.strictEqual(stages.find((s) => s.key === 'service_delivery').gate, 'provider');

// Progress runs 0-100 and never goes backwards.
const pcts = stages.map((s) => s.pct);
assert.ok(pcts.every((p, i) => i === 0 || p > pcts[i - 1]), 'progress increases monotonically');
assert.strictEqual(pcts[pcts.length - 1], 100, 'the last stage is 100%');

// Closure reflects SOP Phase 9, not tank cleaning.
const closureKeys = closure.map((c) => c.key);
for (const k of ['deliverables_issued', 'final_invoice', 'final_payment', 'client_feedback', 'records_archived']) {
  assert.ok(closureKeys.includes(k), `closure has ${k}`);
}
assert.ok(!closureKeys.includes('water_test'), 'no water testing on a registration project');

// Other lines are untouched.
assert.strictEqual(svc.stagesFor('water_tank').length, 11, 'Water Tank keeps its eleven stages');
assert.ok(svc.closureFor('water_tank').map((c) => c.key).includes('water_test'), 'Water Tank keeps its closure');

console.log('registrationStages OK');
