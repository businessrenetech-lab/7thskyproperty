const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { SALE_SIDE, PURCHASE_SIDE, ALL_SALES_AGREEMENTS } = require('../utils/saleAgreementTypes');

assert.ok(SALE_SIDE.includes('business_sale_agreement'));
assert.ok(PURCHASE_SIDE.includes('business_purchase_agreement'));
for (const t of ['sale_sale_agreement', 'commercial_sale_agreement']) assert.ok(SALE_SIDE.includes(t));
for (const t of ['sale_purchase_agreement', 'commercial_purchase_agreement']) assert.ok(PURCHASE_SIDE.includes(t));
assert.strictEqual(ALL_SALES_AGREEMENTS.length, SALE_SIDE.length + PURCHASE_SIDE.length);

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
