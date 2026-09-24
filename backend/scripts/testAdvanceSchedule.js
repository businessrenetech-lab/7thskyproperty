const assert = require('assert');
const { advanceState, DEPOSIT_TYPES, depositSummary } = require('../services/advanceSchedule');

// SOP Rental §9 — deposits are settled by type at exit, so they are tracked by type.
assert.deepStrictEqual(DEPOSIT_TYPES, ['security', 'utility', 'maintenance', 'operational_reserve']);

// Twelve months at 50,000, nothing paid.
let s = advanceState({ advance_months: 12, monthly_rent: 50000 }, []);
assert.strictEqual(s.agreed, 600000);
assert.strictEqual(s.received, 0);
assert.strictEqual(s.outstanding, 600000);
assert.strictEqual(s.monthsCovered, 0);

// Part paid.
s = advanceState({ advance_months: 12, monthly_rent: 50000 }, [{ amount: 250000 }, { amount: 50000 }]);
assert.strictEqual(s.received, 300000);
assert.strictEqual(s.outstanding, 300000);
assert.strictEqual(s.monthsCovered, 6);

// Overpaid: outstanding floors at zero, never negative.
s = advanceState({ advance_months: 12, monthly_rent: 50000 }, [{ amount: 700000 }]);
assert.strictEqual(s.outstanding, 0);
assert.strictEqual(s.monthsCovered, 12, 'months covered caps at the agreed term');

// An explicit agreed figure wins over months x rent.
s = advanceState({ advance_months: 12, monthly_rent: 50000, advance_rent: 500000 }, []);
assert.strictEqual(s.agreed, 500000);

// With no payment rows, the figure recorded on the tenancy is used — a dashboard
// that always reported zero received would be worse than no dashboard.
s = advanceState({ advance_months: 12, monthly_rent: 50000, advance_received: 300000 }, []);
assert.strictEqual(s.received, 300000);
assert.strictEqual(s.outstanding, 300000);
// Payment rows, when present, win over the stored figure.
s = advanceState({ advance_months: 12, monthly_rent: 50000, advance_received: 300000 }, [{ amount: 100000 }]);
assert.strictEqual(s.received, 100000);

// Missing figures must not produce NaN on a dashboard.
s = advanceState({}, []);
assert.strictEqual(s.agreed, 0);
assert.strictEqual(s.outstanding, 0);
assert.strictEqual(s.monthsCovered, 0);
s = advanceState({ advance_months: 12, monthly_rent: null }, [{ amount: 'abc' }]);
assert.strictEqual(s.received, 0, 'unparseable amounts count as zero, not NaN');

// DECIMAL columns arrive as strings from MySQL.
s = advanceState({ advance_months: 12, monthly_rent: '50000.00' }, []);
assert.strictEqual(s.agreed, 600000);

// Deposits summarise per type, and an unknown type is reported rather than dropped.
const d = depositSummary([
  { deposit_type: 'security', amount: 100000, received_amount: 100000 },
  { deposit_type: 'utility', amount: 20000, received_amount: 0 },
  { deposit_type: 'mystery', amount: 5000, received_amount: 5000 },
]);
assert.strictEqual(d.total.agreed, 125000);
assert.strictEqual(d.total.received, 105000);
assert.strictEqual(d.total.outstanding, 20000);
assert.strictEqual(d.byType.security.received, 100000);
assert.strictEqual(d.byType.mystery.agreed, 5000, 'unknown types still counted');
assert.deepStrictEqual(depositSummary([]).total, { agreed: 0, received: 0, outstanding: 0 });

console.log('advanceSchedule OK');
