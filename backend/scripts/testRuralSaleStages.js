const assert = require('assert');
const { RURAL_SELLER_STAGES, RURAL_BUYER_STAGES } = require('./seedRuralSaleWorkflow');

// SOP Rural Property Sale §4 / workbook Sheet 1 — the seller pipeline.
assert.deepStrictEqual(RURAL_SELLER_STAGES.map((s) => s.key), [
  'seller_enquiry', 'ownership_check', 'seller_registration', 'document_verification',
  'seller_agreement', 'marketing_preparation', 'property_marketing', 'buyer_inspections',
  'offer_management', 'transfer_registration',
]);

// SOP Rural Property Purchase §4 / workbook Sheet 7 — the buyer pipeline. A
// DIFFERENT pipeline, which is why the old 18-stage template that mixed the two
// together with the ownership documents was wrong.
assert.deepStrictEqual(RURAL_BUYER_STAGES.map((s) => s.key), [
  'buyer_enquiry', 'buyer_registration', 'property_search', 'site_visit',
  'offer_negotiation', 'legal_review', 'registration_handover',
]);

const allKeys = [...RURAL_SELLER_STAGES, ...RURAL_BUYER_STAGES].map((s) => s.key);

// The five Ownership Checklist DOCUMENTS (workbook Sheet 4) must not be stages.
// Template #14 had them as stages 10-14; they belong on ownership_verification.
for (const k of ['title_deed', 'khatiyan', 'dag', 'mutation', 'tax_receipt']) {
  assert.ok(!allKeys.includes(k), `${k} is an ownership document, not a stage`);
}
for (const s of [...RURAL_SELLER_STAGES, ...RURAL_BUYER_STAGES]) {
  assert.ok(!/^(title deed|khatiyan|dag|mutation|tax receipt)$/i.test(s.name),
    `${s.key} is named after a document`);
}

// No buyer stage may appear in the seller pipeline, or the other way round —
// template #14 had four buyer rows sitting at the end of the seller list.
const sellerKeys = new Set(RURAL_SELLER_STAGES.map((s) => s.key));
for (const s of RURAL_BUYER_STAGES) {
  assert.ok(!sellerKeys.has(s.key), `${s.key} belongs to the buyer pipeline only`);
}
assert.strictEqual(new Set(allKeys).size, allKeys.length, 'no key is reused across the two pipelines');

for (const [name, stages] of [['seller', RURAL_SELLER_STAGES], ['buyer', RURAL_BUYER_STAGES]]) {
  stages.forEach((s, i) => {
    assert.strictEqual(s.order, i + 1, `${name}/${s.key} order`);
    assert.ok(s.name && s.department && s.escalation_trigger,
      `${name}/${s.key} carries name, department and escalation trigger`);
    assert.ok(Array.isArray(s.checklist) && s.checklist.length > 0, `${name}/${s.key} has a checklist`);
    assert.ok(Array.isArray(s.required_docs) && s.required_docs.length > 0, `${name}/${s.key} names its documents`);
    s.checklist.forEach((c) => assert.ok(c.label && c.responsible && c.evidence_required,
      `${name}/${s.key} checklist item is complete: ${JSON.stringify(c)}`));
  });
}

// The five documents survive as a checklist instruction on Document Verification,
// pointing at the register rather than being stages of their own.
const dv = RURAL_SELLER_STAGES.find((s) => s.key === 'document_verification')
  .checklist.map((c) => c.label.toLowerCase()).join(' | ');
for (const doc of ['deed', 'khatiyan', 'dag', 'mutation', 'tax receipt']) {
  assert.ok(dv.includes(doc), `document verification still covers: ${doc}`);
}
assert.ok(/register/.test(dv), 'document verification points at the ownership register');

// Non-circumvention is recorded at first contact on both sides (sale SOP §11,
// purchase SOP — the Protected Buyer and Protected Property registers).
const sellerIntro = RURAL_SELLER_STAGES.find((s) => s.key === 'seller_enquiry')
  .checklist.map((c) => c.label.toLowerCase()).join(' | ');
assert.ok(/non-circumvention|protect/.test(sellerIntro), 'the seller pipeline records the introduction');
const buyerIntro = RURAL_BUYER_STAGES.find((s) => s.key === 'property_search')
  .checklist.map((c) => c.label.toLowerCase()).join(' | ');
assert.ok(/protect/.test(buyerIntro), 'the buyer pipeline protects every introduced property');

// Commission is verified BEFORE closure (sale SOP §11), not after.
const transfer = RURAL_SELLER_STAGES.find((s) => s.key === 'transfer_registration')
  .checklist.map((c) => c.label.toLowerCase()).join(' | ');
assert.ok(/commission/.test(transfer) && /protected/.test(transfer),
  'commission entitlement and protected-buyer provisions are checked at settlement');

console.log('ruralSaleStages OK');
