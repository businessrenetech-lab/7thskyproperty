const assert = require('assert');
const { canHandover } = require('../services/handoverGate');

// SOP Rental §15 — occupancy follows payment.
assert.deepStrictEqual(canHandover({ commission_amount: 50000, commission_paid_amount: 50000 }),
  { allowed: true, reason: null });

// Unpaid commission blocks, and says how much is outstanding.
let r = canHandover({ commission_amount: 50000, commission_paid_amount: 0 });
assert.strictEqual(r.allowed, false);
assert.ok(/50,?000/.test(r.reason), `reason names the outstanding amount: ${r.reason}`);

// Part paid still blocks, and names only the remainder.
r = canHandover({ commission_amount: 50000, commission_paid_amount: 20000 });
assert.strictEqual(r.allowed, false);
assert.ok(/30,?000/.test(r.reason), `names the remainder: ${r.reason}`);

// A lease with NO commission is not blocked — nothing was ever charged.
assert.deepStrictEqual(canHandover({}), { allowed: true, reason: null });
assert.deepStrictEqual(canHandover({ commission_amount: 0 }), { allowed: true, reason: null });
assert.deepStrictEqual(canHandover({ commission_amount: null, commission_paid_amount: null }), { allowed: true, reason: null });
assert.deepStrictEqual(canHandover({ commission_amount: '0.00' }), { allowed: true, reason: null });

// Overpayment is not a block.
assert.strictEqual(canHandover({ commission_amount: 50000, commission_paid_amount: 60000 }).allowed, true);

// DECIMAL columns arrive as strings from MySQL.
assert.strictEqual(canHandover({ commission_amount: '50000.00', commission_paid_amount: '50000.00' }).allowed, true);

// A manager override allows it, and the caller is told it was an override.
r = canHandover({ commission_amount: 50000, commission_paid_amount: 0 }, { override: true });
assert.strictEqual(r.allowed, true);
assert.ok(/override/i.test(r.reason), 'an override is never silent');

// An override on a lease with nothing outstanding is not reported as an override.
assert.deepStrictEqual(canHandover({ commission_amount: 50000, commission_paid_amount: 50000 }, { override: true }),
  { allowed: true, reason: null });

console.log('handoverGate OK');
