const assert = require('assert');
const { BUSINESS_RENT_STAGES } = require('./seedBusinessRentWorkflow');

const keys = BUSINESS_RENT_STAGES.map((s) => s.key);
assert.deepStrictEqual(keys, [
  'lead_intake', 'consultation', 'assessment', 'documentation', 'marketing',
  'tenant_screening', 'inspection', 'negotiation', 'agreement', 'settlement',
  'handover', 'management', 'closure',
], 'the 13 workbook stages, in order');

// The seven department names must NOT be stages — they are the sheet's Department column.
for (const dept of ['client_relations', 'operations', 'compliance', 'business_leasing',
  'accounts', 'property_management', 'crm_compliance']) {
  assert.ok(!keys.includes(dept), `${dept} is a department, not a stage`);
}

BUSINESS_RENT_STAGES.forEach((s, i) => {
  assert.strictEqual(s.order, i + 1, `${s.key} order`);
  assert.ok(s.name && s.department && s.escalation_trigger, `${s.key} carries name, department and escalation trigger`);
  assert.ok(Array.isArray(s.checklist) && s.checklist.length > 0, `${s.key} has a checklist`);
  s.checklist.forEach((c) => assert.ok(c.label && c.responsible && c.evidence_required,
    `${s.key} checklist item is complete: ${JSON.stringify(c)}`));
});

// The work the department rows described must survive the merge, not be dropped.
const labels = BUSINESS_RENT_STAGES.flatMap((s) => s.checklist.map((c) => c.label.toLowerCase()));
for (const kept of ['document verification', 'negotiation coordination', 'record retention']) {
  assert.ok(labels.some((l) => l.includes(kept)), `folded-in department work kept: ${kept}`);
}

console.log('businessRentStages OK');
