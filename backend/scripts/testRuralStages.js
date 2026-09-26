const assert = require('assert');
const { RURAL_OWNER_STAGES, RURAL_TENANT_STAGES } = require('./seedRuralRentWorkflow');

// SOP Rural Property Rental Management §4 — the owner pipeline.
assert.deepStrictEqual(RURAL_OWNER_STAGES.map((s) => s.key), [
  'owner_enquiry', 'property_assessment', 'ownership_verification', 'owner_agreement',
  'marketing_preparation', 'property_marketing', 'tenant_screening', 'lease_negotiation',
  'lease_execution', 'property_management', 'closure',
]);

// SOP Rural Property Tenancy Management §4 — the tenant pipeline. A DIFFERENT
// pipeline, which is why the old 12-stage template that mixed the two was wrong.
assert.deepStrictEqual(RURAL_TENANT_STAGES.map((s) => s.key), [
  'tenant_enquiry', 'consultation', 'requirement_assessment', 'tenant_agreement',
  'property_search', 'property_shortlisting', 'inspection', 'negotiation',
  'lease_coordination', 'move_in_support', 'closure',
]);

// The four Due-Diligence CHECKLIST items must not be stages in either pipeline.
const allKeys = [...RURAL_OWNER_STAGES, ...RURAL_TENANT_STAGES].map((s) => s.key);
for (const k of ['lease_review', 'landlord_verification', 'property_inspection', 'business_suitability']) {
  assert.ok(!allKeys.includes(k), `${k} is a due-diligence checklist row, not a stage`);
}

for (const [name, stages] of [['owner', RURAL_OWNER_STAGES], ['tenant', RURAL_TENANT_STAGES]]) {
  stages.forEach((s, i) => {
    assert.strictEqual(s.order, i + 1, `${name}/${s.key} order`);
    assert.ok(s.name && s.department && s.escalation_trigger,
      `${name}/${s.key} carries name, department and escalation trigger`);
    assert.ok(Array.isArray(s.checklist) && s.checklist.length > 0, `${name}/${s.key} has a checklist`);
    s.checklist.forEach((c) => assert.ok(c.label && c.responsible && c.evidence_required,
      `${name}/${s.key} checklist item is complete: ${JSON.stringify(c)}`));
  });
}

// The tenant pipeline's due diligence survives as checklist rows on Lease Coordination.
const dd = RURAL_TENANT_STAGES.find((s) => s.key === 'lease_coordination')
  .checklist.map((c) => c.label.toLowerCase()).join(' | ');
for (const item of ['lease review', 'landlord verification', 'environmental', 'legal']) {
  assert.ok(dd.includes(item), `due diligence kept: ${item}`);
}

// Non-circumvention is recorded at first contact on both sides (SOP §13 / §11).
const ownerIntro = RURAL_OWNER_STAGES.find((s) => s.key === 'owner_enquiry')
  .checklist.map((c) => c.label.toLowerCase()).join(' | ');
assert.ok(/non-circumvention|protect/.test(ownerIntro), 'the owner pipeline records the introduction');
const tenantIntro = RURAL_TENANT_STAGES.find((s) => s.key === 'property_search')
  .checklist.map((c) => c.label.toLowerCase()).join(' | ');
assert.ok(/protect/.test(tenantIntro), 'the tenant pipeline protects every introduced property');

console.log('ruralStages OK');
