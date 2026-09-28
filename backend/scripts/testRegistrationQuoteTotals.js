const assert = require('assert');
const { quoteTotals } = require('../services/registrationQuoteTotals');

const lines = [
  { description: 'RJSC filing fee', amount: 12000, fee_kind: 'government' },
  { description: 'Name clearance fee', amount: 1150, fee_kind: 'government' },
  { description: 'Company formation coordination', amount: 25000, fee_kind: 'professional' },
  { description: 'Trade licence coordination', amount: 8000 },            // defaults to professional
];

const t = quoteTotals(lines);
assert.strictEqual(t.government, 13150, 'government fees add up');
assert.strictEqual(t.professional, 33000, 'professional fees add up, default included');
assert.strictEqual(t.subtotal, 46150, 'subtotal is the client-facing total');

assert.strictEqual(quoteTotals([{ amount: 100, qty: 3 }]).professional, 300, 'qty multiplies');

// The shared quotation builder stores each line's money as `price`, not `amount`.
// Reading only `amount` would report every real quote as zero.
assert.strictEqual(quoteTotals([{ price: 5000, fee_kind: 'government' }]).government, 5000, 'price is read like amount');
assert.strictEqual(quoteTotals([{ price: 2000, qty: 2 }]).professional, 4000, 'price honours qty');
assert.strictEqual(
  quoteTotals([{ code: 'BRC-001', price: 25000 }, { kind: 'fee', price: 12000, fee_kind: 'government' }]).subtotal,
  37000, 'a realistic builder payload totals correctly',
);
assert.strictEqual(quoteTotals([{ amount: 'abc' }]).subtotal, 0, 'junk amounts are zero, not NaN');
assert.strictEqual(quoteTotals(null).subtotal, 0, 'missing lines are safe');
assert.strictEqual(quoteTotals('[{"amount":50,"fee_kind":"government"}]').government, 50, 'JSON string lines parse');

// An explicit qty of 0 means nothing is billed for that line.
assert.strictEqual(quoteTotals([{ price: 5000, qty: 0 }]).professional, 0, 'qty 0 bills nothing');

// A negotiated discount is a reduction in OUR fee: it comes off the professional
// side only, never off the government fees we merely pass through. Without this the
// Revenue panel can never reconcile with the Invoiced tile beside it.
const discounted = quoteTotals(
  [{ price: 33000, fee_kind: 'professional' }, { price: 12000, fee_kind: 'government' }],
  { discount: 3000 },
);
assert.strictEqual(discounted.professional, 30000, 'discount comes off the professional fee');
assert.strictEqual(discounted.government, 12000, 'discount never touches government fees');
assert.strictEqual(discounted.subtotal, 42000);

// A discount larger than the fee cannot make revenue negative.
assert.strictEqual(quoteTotals([{ price: 1000 }], { discount: 5000 }).professional, 0, 'discount clamps at zero');

console.log('registrationQuoteTotals OK');
