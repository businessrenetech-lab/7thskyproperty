const assert = require('assert');
const { COMMERCIAL_SALE_STAGES, COMMERCIAL_RENT_STAGES } = require('./seedCommercialWorkflows');

// ── Commercial SALE: Sheet 2's order, 15 stages ─────────────────────────────
assert.deepStrictEqual(COMMERCIAL_SALE_STAGES.map((s) => s.key), [
  'lead_capture', 'initial_consultation', 'property_assessment', 'ownership_verification',
  'market_analysis', 'property_preparation', 'marketing_activation', 'buyer_enquiry_management',
  'inspection_coordination', 'negotiation_support', 'due_diligence_coordination',
  'agreement_coordination', 'settlement_coordination', 'commission_tracking', 'final_reporting',
]);

/*
 * The union bug, asserted so it cannot come back. Template #11 held 18 stages
 * because both sheets of the workbook were seeded; three of the five extras were
 * existing stages under a second name. Neither name from any of these pairs may
 * appear twice, and the Sheet 2 alias must not appear at all.
 */
const saleNames = COMMERCIAL_SALE_STAGES.map((s) => s.name);
for (const [kept, alias] of [
  ['Initial Consultation', 'Consultation'],
  ['Negotiation Support', 'Negotiation Tracking'],
  ['Due Diligence Coordination', 'Due Diligence'],
]) {
  assert.ok(saleNames.includes(kept), `the sale pipeline keeps "${kept}"`);
  assert.ok(!saleNames.includes(alias), `"${alias}" is the same stage as "${kept}", not a second one`);
}
// The two genuinely new Sheet 2 stages survive.
for (const n of ['Lead Capture', 'Commission Tracking']) {
  assert.ok(saleNames.includes(n), `Sheet 2 contributes "${n}"`);
}
// Commission is tracked BEFORE final reporting, which is what makes closure safe.
assert.ok(
  saleNames.indexOf('Commission Tracking') < saleNames.indexOf('Final Reporting'),
  'commission is verified before the file is closed',
);
// Lead capture precedes the consultation.
assert.strictEqual(saleNames[0], 'Lead Capture');

// ── Commercial RENT: the 14 stages are UNCHANGED ────────────────────────────
// This pipeline was already correct; the seed only enriches it. If these names or
// this order ever move, that is a regression, not an improvement.
assert.deepStrictEqual(COMMERCIAL_RENT_STAGES.map((s) => s.name), [
  'Lead Intake', 'Consultation', 'Assessment', 'Documentation', 'Preparation',
  'Marketing', 'Lead Management', 'Inspection', 'Negotiation', 'Agreement',
  'Financial', 'Handover', 'Management', 'Closure',
]);
assert.strictEqual(COMMERCIAL_RENT_STAGES.length, 14);

// ── Both pipelines are complete, the way rural and business are ──────────────
for (const [label, stages] of [['sale', COMMERCIAL_SALE_STAGES], ['rent', COMMERCIAL_RENT_STAGES]]) {
  stages.forEach((s, i) => {
    assert.strictEqual(s.order, i + 1, `${label}/${s.key} order`);
    assert.ok(s.name, `${label}/${s.key} has a name`);
    // These two were entirely absent before: 0 of 32 commercial stages had them,
    // while every rural and business stage does.
    assert.ok(s.department, `${label}/${s.key} names the department that owns it`);
    assert.ok(s.escalation_trigger, `${label}/${s.key} says what escalates it`);
    assert.ok(Array.isArray(s.checklist) && s.checklist.length > 0, `${label}/${s.key} has a checklist`);
    assert.ok(Array.isArray(s.required_docs) && s.required_docs.length > 0, `${label}/${s.key} names its documents`);
    s.checklist.forEach((c) => {
      assert.ok(c.label && c.responsible && c.evidence_required,
        `${label}/${s.key} checklist item is complete: ${JSON.stringify(c)}`);
    });
  });
  // No key is reused inside a pipeline.
  const keys = stages.map((s) => s.key);
  assert.strictEqual(new Set(keys).size, keys.length, `${label} has no duplicate key`);
}

// The sale side must not borrow a rent stage, or vice versa.
const saleKeys = new Set(COMMERCIAL_SALE_STAGES.map((s) => s.key));
const rentOnly = ['lead_intake', 'handover', 'management', 'closure'];
for (const k of rentOnly) {
  assert.ok(!saleKeys.has(k), `${k} belongs to the lease pipeline only`);
}
const rentKeys = new Set(COMMERCIAL_RENT_STAGES.map((s) => s.key));
for (const k of ['commission_tracking', 'settlement_coordination', 'final_reporting']) {
  assert.ok(!rentKeys.has(k), `${k} belongs to the sale pipeline only`);
}

console.log('commercialStages OK');
