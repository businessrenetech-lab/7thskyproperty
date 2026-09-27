const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { SALE_SIDE, PURCHASE_SIDE, ALL_SALES_AGREEMENTS } = require('../utils/saleAgreementTypes');

assert.ok(SALE_SIDE.includes('business_sale_agreement'));
assert.ok(PURCHASE_SIDE.includes('business_purchase_agreement'));
for (const t of ['sale_sale_agreement', 'commercial_sale_agreement']) assert.ok(SALE_SIDE.includes(t));
for (const t of ['sale_purchase_agreement', 'commercial_purchase_agreement']) assert.ok(PURCHASE_SIDE.includes(t));
assert.strictEqual(ALL_SALES_AGREEMENTS.length, SALE_SIDE.length + PURCHASE_SIDE.length);

// Rural (SSPC-RLPSS-01 / SSPC-RLPPS-01). A category added to the controller
// REGISTRY but missed here is the exact bug this file exists to catch.
assert.ok(SALE_SIDE.includes('rural_sale_agreement'));
assert.ok(PURCHASE_SIDE.includes('rural_purchase_agreement'));

// Every category in the controller's REGISTRY must have its related_types in
// these lists, and catOf must recognise it — otherwise a rural request
// silently renders the residential document. Asserted structurally so the next
// category cannot be half-wired.
const ctrlSrc = fs.readFileSync(path.join(__dirname, '..', 'controllers', 'salesAgreement.controller.js'), 'utf8');
const relatedTypes = [...ctrlSrc.matchAll(/related_type: '([a-z_]+)'/g)].map((m) => m[1]);
assert.ok(relatedTypes.length >= 10, `found ${relatedTypes.length} related_types in the registry`);
for (const rt of relatedTypes) {
  // The lease-side and registration agreements live in their own lists; only the
  // sale/purchase ones belong here.
  if (!/_(sale|purchase)_agreement$/.test(rt)) continue;
  assert.ok(ALL_SALES_AGREEMENTS.includes(rt), `${rt} is in the registry but missing from saleAgreementTypes`);
}
// catOf must be derived from the REGISTRY, not a hand-written list of categories.
assert.ok(/hasOwnProperty\.call\(REGISTRY, c\)/.test(ctrlSrc),
  'catOf must derive the category from REGISTRY, or a new category defaults to residential');
assert.ok(!/c === 'commercial' \|\| c === 'business'/.test(ctrlSrc),
  'catOf must not hand-write the category list again');

// No consumer may keep its own copy of the list (that is how business got missed).
const consumers = [
  'controllers/buyerMandate.controller.js', 'controllers/invoicing.controller.js', 'controllers/sales.controller.js',
  'services/agencyFees.service.js', 'services/partyRoleActivation.service.js',
  'services/salesAgreementCompletion.service.js', 'services/wtAgreementCompletion.service.js',
];
for (const rel of consumers) {
  const src = fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');
  assert.ok(!/'commercial_(sale|purchase)_agreement'/.test(src), `${rel} still hard-codes a commercial agreement type`);
}
console.log('saleAgreementTypes OK');
