const assert = require('assert');
const { pipelineByStage, occupancy, arrearsAgeing } = require('../services/businessRentDashboardMath');
const { BUSINESS_RENT_STAGES } = require('./seedBusinessRentWorkflow');

// Every one of the 13 stages appears, including the empty ones — a pipeline
// with a hole in it is misread as "nothing is stuck there".
const p = pipelineByStage([
  { current_stage_key: 'marketing', updated_at: '2026-09-01' },
  { current_stage_key: 'marketing', updated_at: '2026-09-20' },
  { current_stage_key: 'handover', updated_at: '2026-09-22' },
  { current_stage_key: 'not_a_stage', updated_at: '2026-09-22' },
], '2026-09-24');
assert.strictEqual(p.length, BUSINESS_RENT_STAGES.length, 'all 13 stages, in order');
assert.deepStrictEqual(p.map((s) => s.key), BUSINESS_RENT_STAGES.map((s) => s.key));
assert.strictEqual(p.find((s) => s.key === 'marketing').count, 2);
assert.strictEqual(p.find((s) => s.key === 'closure').count, 0);
assert.strictEqual(p.find((s) => s.key === 'marketing').oldestDays, 23, 'days in stage from the oldest');
// An unknown stage key is not silently dropped into another stage's count.
assert.strictEqual(p.reduce((n, s) => n + s.count, 0), 3);

// SOP: Negotiation warns while tenant screening is unresolved — and only Negotiation.
const warned = pipelineByStage([{ current_stage_key: 'negotiation', updated_at: '2026-09-20' }],
  '2026-09-24', { screeningOutstanding: 2 });
const neg = warned.find((s) => s.key === 'negotiation');
assert.ok(/2 .*screening/i.test(neg.warning || ''), `negotiation warns: ${neg.warning}`);
assert.strictEqual(warned.filter((s) => s.warning).length, 1, 'no other stage is warned');
// Nothing outstanding, no warning — a clean pipeline must not cry wolf.
assert.strictEqual(pipelineByStage([{ current_stage_key: 'negotiation' }], '2026-09-24', { screeningOutstanding: 0 })
  .find((s) => s.key === 'negotiation').warning, null);
// No leases in negotiation, nothing to warn about.
assert.strictEqual(pipelineByStage([], '2026-09-24', { screeningOutstanding: 3 })
  .find((s) => s.key === 'negotiation').warning, null);

// Occupancy over properties and their tenancies.
const o = occupancy(
  [{ id: 1 }, { id: 2 }, { id: 3 }],
  [{ property_id: 1, status: 'active', lease_end: '2026-11-01' }, { property_id: 2, status: 'ended' }],
  '2026-09-24',
);
assert.strictEqual(o.leased, 1);
assert.strictEqual(o.vacant, 2);
assert.strictEqual(o.expiringSoon, 1, 'inside 90 days');
// An expired lease is not "expiring soon".
assert.strictEqual(occupancy([{ id: 1 }], [{ property_id: 1, status: 'active', lease_end: '2026-01-01' }], '2026-09-24').expiringSoon, 0);
// No properties: zeroes, not NaN or a negative vacancy.
assert.deepStrictEqual(occupancy([], [], '2026-09-24'), { total: 0, leased: 0, vacant: 0, expiringSoon: 0 });

// Arrears ageing buckets, inclusive at the boundaries.
const a = arrearsAgeing([
  { amount: 1000, due_date: '2026-09-20' }, // 4 days
  { amount: 2000, due_date: '2026-08-24' }, // 31 days
  { amount: 3000, due_date: '2026-06-24' }, // 92 days
  { amount: 500, due_date: '2026-09-25' }, // not yet due
  { amount: 750, due_date: null }, // no due date
], '2026-09-24');
assert.strictEqual(a['0-30'], 1000);
assert.strictEqual(a['31-60'], 2000);
assert.strictEqual(a['90+'], 3000);
assert.strictEqual(a.notDue, 1250);
assert.strictEqual(arrearsAgeing([]).notDue, 0);

console.log('businessRentDashboardMath OK');
