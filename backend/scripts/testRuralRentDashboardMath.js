const assert = require('assert');
const {
  propertyTypeCounts, occupancyRate, revenueByType, leaseKpis,
} = require('../services/ruralRentDashboardMath');
const { RURAL_PROPERTY_TYPES } = require('../utils/ruralPropertyTypes');

// ── Property dashboard: every rural type, including the empty ones ─────────
const counts = propertyTypeCounts([
  { property_type: 'Fishery' }, { property_type: 'Fishery' },
  { property_type: 'Orchard' },
  { property_type: 'Something Else' },
  { property_type: null },
]);
assert.strictEqual(counts.length, RURAL_PROPERTY_TYPES.length + 1, 'every type, plus one Other bucket');
assert.deepStrictEqual(counts.slice(0, -1).map((c) => c.type), RURAL_PROPERTY_TYPES, 'SOP order preserved');
assert.strictEqual(counts.find((c) => c.type === 'Fishery').count, 2);
assert.strictEqual(counts.find((c) => c.type === 'Orchard').count, 1);
// A type with none still shows a zero — a hole reads as "we have none", not "unknown".
assert.strictEqual(counts.find((c) => c.type === 'Dairy Farm').count, 0);
// Unknown and missing types are bucketed, never dropped or miscounted.
assert.strictEqual(counts.find((c) => c.type === 'Other').count, 2);
assert.strictEqual(counts.reduce((n, c) => n + c.count, 0), 5, 'nothing lost');
assert.strictEqual(propertyTypeCounts([]).reduce((n, c) => n + c.count, 0), 0);

// ── Occupancy rate: a percentage, never NaN ────────────────────────────────
assert.strictEqual(occupancyRate(4, 3), 75);
assert.strictEqual(occupancyRate(3, 1), 33.3);
assert.strictEqual(occupancyRate(0, 0), 0, 'no properties is 0%, not NaN');
assert.strictEqual(occupancyRate(0, 5), 0, 'nonsense input still yields a number');
assert.strictEqual(occupancyRate(2, 5), 100, 'capped at 100');

// ── Revenue by property type ───────────────────────────────────────────────
const rev = revenueByType(
  [{ id: 1, property_type: 'Fishery' }, { id: 2, property_type: 'Orchard' }, { id: 3, property_type: null }],
  [{ property_id: 1, amount: 5000 }, { property_id: 1, amount: '2500.50' },
    { property_id: 2, amount: 1000 }, { property_id: 3, amount: 400 },
    { property_id: 99, amount: 9999 }],
);
assert.strictEqual(rev.Fishery, 7500.5);
assert.strictEqual(rev.Orchard, 1000);
assert.strictEqual(rev.Other, 400, 'a property with no type still contributes');
assert.ok(!('undefined' in rev), 'revenue for an unknown property is not keyed undefined');
assert.deepStrictEqual(revenueByType([], []), {});
// Unparseable money must not produce NaN on a dashboard.
assert.strictEqual(revenueByType([{ id: 1, property_type: 'Pond' }], [{ property_id: 1, amount: 'abc' }]).Pond, 0);

// ── Lease KPIs ────────────────────────────────────────────────────────────
const k = leaseKpis(
  [{ id: 1 }, { id: 2 }, { id: 3 }],
  [{ property_id: 1, status: 'active', lease_end: '2026-11-01' },
    { property_id: 2, status: 'ended' }],
  '2026-09-26',
);
assert.strictEqual(k.total, 3);
assert.strictEqual(k.occupied, 1);
assert.strictEqual(k.vacant, 2);
assert.strictEqual(k.activeLeases, 1);
assert.strictEqual(k.renewalsDue, 1, 'inside 90 days');
assert.strictEqual(k.occupancyRate, 33.3);
assert.deepStrictEqual(leaseKpis([], [], '2026-09-26'),
  { total: 0, occupied: 0, vacant: 0, activeLeases: 0, renewalsDue: 0, occupancyRate: 0 });

console.log('ruralRentDashboardMath OK');
