const assert = require('assert');
const {
  RURAL_DISPUTE_CATEGORIES, DISPUTE_STAGES, nextStages, canTransition, needsAttention,
} = require('../services/disputeLifecycle');

// Workbook Sheet 18 + SOP §6 Step 4.
assert.ok(RURAL_DISPUTE_CATEGORIES.includes('Ownership Dispute'));
assert.ok(RURAL_DISPUTE_CATEGORIES.includes('Boundary Dispute'));
assert.ok(RURAL_DISPUTE_CATEGORIES.includes('Succession Issue'));
assert.ok(RURAL_DISPUTE_CATEGORIES.includes('Access Dispute'));
assert.strictEqual(new Set(RURAL_DISPUTE_CATEGORIES).size, RURAL_DISPUTE_CATEGORIES.length);

assert.deepStrictEqual(DISPUTE_STAGES, ['raised', 'under_review', 'escalated', 'resolved', 'closed']);

// The happy path.
assert.strictEqual(canTransition('raised', 'under_review').ok, true);
assert.strictEqual(canTransition('under_review', 'escalated').ok, true);
assert.strictEqual(canTransition('escalated', 'resolved').ok, true);
assert.strictEqual(canTransition('resolved', 'closed').ok, true);

// Some disputes arrive already serious.
assert.strictEqual(canTransition('raised', 'escalated').ok, true);
// A resolution that does not hold reopens.
assert.strictEqual(canTransition('resolved', 'under_review').ok, true);
// Anything may be closed.
for (const s of ['raised', 'under_review', 'escalated', 'resolved']) {
  assert.strictEqual(canTransition(s, 'closed').ok, true, `${s} may be closed`);
}

// Backwards and nonsense moves are refused, with a reason a user can act on.
let r = canTransition('escalated', 'raised');
assert.strictEqual(r.ok, false);
assert.ok(/cannot move/.test(r.reason), r.reason);
assert.ok(/resolved, closed/.test(r.reason), `the reason lists what IS allowed: ${r.reason}`);

// Nothing leaves closed — reopening is a new dispute.
assert.strictEqual(canTransition('closed', 'under_review').ok, false);
assert.deepStrictEqual(nextStages('closed'), []);

// Same-stage, unknown stage and missing input all fail cleanly rather than throwing.
assert.strictEqual(canTransition('raised', 'raised').ok, false);
assert.ok(/already/.test(canTransition('raised', 'raised').reason));
assert.strictEqual(canTransition('raised', 'nonsense').ok, false);
assert.strictEqual(canTransition(undefined, 'raised').ok, false);
assert.strictEqual(canTransition(null, null).ok, false);
assert.deepStrictEqual(nextStages('nonsense'), []);
assert.deepStrictEqual(nextStages(undefined), []);

// Only an escalated dispute demands attention.
assert.strictEqual(needsAttention({ dispute_stage: 'escalated' }), true);
assert.strictEqual(needsAttention({ dispute_stage: 'under_review' }), false);
assert.strictEqual(needsAttention({}), false);

console.log('disputeLifecycle OK');
