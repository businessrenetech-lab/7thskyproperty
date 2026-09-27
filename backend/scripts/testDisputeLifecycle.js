const assert = require('assert');
const {
  RURAL_DISPUTE_CATEGORIES, RURAL_SALE_DISPUTE_CATEGORIES, SALE_ONLY_DISPUTE_CATEGORIES,
  ALL_DISPUTE_CATEGORIES, categoriesFor,
  DISPUTE_STAGES, nextStages, canTransition, needsAttention,
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

// ── The sale side adds categories without forking the stage machine ───────

// Every rent category except Tenant Default still applies to a sale — there is
// no tenant in a sale.
for (const c of RURAL_DISPUTE_CATEGORIES) {
  if (c === 'Tenant Default') {
    assert.ok(!RURAL_SALE_DISPUTE_CATEGORIES.includes(c), 'a sale has no tenant to default');
  } else {
    assert.ok(RURAL_SALE_DISPUTE_CATEGORIES.includes(c), `the sale side keeps: ${c}`);
  }
}

// The four the sale workbooks add (seller Sheet 16, buyer Sheet 18).
assert.deepStrictEqual(SALE_ONLY_DISPUTE_CATEGORIES, [
  'Government Acquisition Risk', 'Encroachment', 'Financing Risk', 'Registration Delay',
]);
for (const c of SALE_ONLY_DISPUTE_CATEGORIES) {
  assert.ok(RURAL_SALE_DISPUTE_CATEGORIES.includes(c), `the sale side adds: ${c}`);
  assert.ok(!RURAL_DISPUTE_CATEGORIES.includes(c), `${c} is not a lease-side risk`);
}

// The union covers both, with nothing duplicated and nothing lost.
assert.strictEqual(new Set(ALL_DISPUTE_CATEGORIES).size, ALL_DISPUTE_CATEGORIES.length);
for (const c of [...RURAL_DISPUTE_CATEGORIES, ...RURAL_SALE_DISPUTE_CATEGORIES]) {
  assert.ok(ALL_DISPUTE_CATEGORIES.includes(c), `the union covers: ${c}`);
}
assert.strictEqual(ALL_DISPUTE_CATEGORIES.length, 12);

// A console gets its own list; an unknown scope gets everything rather than
// nothing, so a caller that does not know its scope is never blocked.
assert.deepStrictEqual(categoriesFor('rent'), RURAL_DISPUTE_CATEGORIES);
assert.deepStrictEqual(categoriesFor('rural_rent'), RURAL_DISPUTE_CATEGORIES);
assert.deepStrictEqual(categoriesFor('rural_tenancy'), RURAL_DISPUTE_CATEGORIES);
assert.deepStrictEqual(categoriesFor('sale'), RURAL_SALE_DISPUTE_CATEGORIES);
assert.deepStrictEqual(categoriesFor('rural_sale'), RURAL_SALE_DISPUTE_CATEGORIES);
assert.deepStrictEqual(categoriesFor('rural_purchase'), RURAL_SALE_DISPUTE_CATEGORIES);
assert.deepStrictEqual(categoriesFor('nonsense'), ALL_DISPUTE_CATEGORIES);
assert.deepStrictEqual(categoriesFor(undefined), ALL_DISPUTE_CATEGORIES);

// The stage machine is UNCHANGED by any of this — one lifecycle, two category
// lists. Re-asserted after the addition so a future edit cannot fork it.
assert.deepStrictEqual(DISPUTE_STAGES, ['raised', 'under_review', 'escalated', 'resolved', 'closed']);
assert.strictEqual(canTransition('raised', 'resolved').ok, false);
assert.deepStrictEqual(nextStages('closed'), []);

console.log('disputeLifecycle OK');
