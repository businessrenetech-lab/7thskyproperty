const assert = require('assert');
const {
  ratio, saleFunnel, daysOnMarket, commission, riskGroups, RISK_GROUPS,
} = require('../services/ruralSaleDashboardMath');
const { RURAL_SALE_DISPUTE_CATEGORIES } = require('../services/disputeLifecycle');

// ── ratio: 0, never NaN, never over-precise ─────────────────────────────────
assert.strictEqual(ratio(1, 4), 25);
assert.strictEqual(ratio(1, 3), 33.3);
assert.strictEqual(ratio(0, 0), 0, 'an empty book is 0%, not NaN');
assert.strictEqual(ratio(5, 0), 0);
assert.strictEqual(ratio(undefined, undefined), 0);
assert.strictEqual(ratio('2', '8'), 25, 'strings from the DB still divide');

// ── the funnel the sale SOP §14 measures ────────────────────────────────────
const f = saleFunnel({ listings: 20, inspections: 40, offers: 10, sales: 4 });
assert.strictEqual(f.inspectionToOffer, 25);
assert.strictEqual(f.offerToSale, 40);
assert.strictEqual(f.conversionRate, 20);
const empty = saleFunnel();
assert.deepStrictEqual(
  [empty.listings, empty.inspections, empty.offers, empty.sales, empty.inspectionToOffer, empty.offerToSale, empty.conversionRate],
  [0, 0, 0, 0, 0, 0, 0],
  'an empty funnel is all zeros',
);
assert.ok(!Object.values(saleFunnel()).some((v) => Number.isNaN(v)), 'no NaN anywhere in the funnel');

// ── days on market ─────────────────────────────────────────────────────────
const TODAY = new Date('2026-09-27T00:00:00Z');
const dom = daysOnMarket([
  { status: 'available', created_at: '2026-09-27' }, // listed today
  { status: 'available', created_at: '2026-08-28' }, // 30 days
  { status: 'available', created_at: '2026-06-29' }, // 90 days
  { status: 'sold', created_at: '2025-01-01' },      // excluded
], TODAY);
assert.strictEqual(dom.count, 3, 'sold property excluded from days on market');
assert.strictEqual(dom.longest, 90);
assert.strictEqual(dom.average, 40);
assert.deepStrictEqual(daysOnMarket([], TODAY), { count: 0, average: 0, longest: 0 });
// A property listed today is 0 days, not 1.
assert.strictEqual(daysOnMarket([{ status: 'available', created_at: '2026-09-27' }], TODAY).average, 0);
// A future created_at (clock skew) clamps to 0 rather than going negative.
assert.strictEqual(daysOnMarket([{ status: 'available', created_at: '2026-10-05' }], TODAY).average, 0);

// ── commission: earned and pipeline are never added together ────────────────
const c = commission([
  { status: 'completed', commission_amount: 100000, sale_price: 5000000 },
  { status: 'settled', commission_amount: 50000, sale_price: 3000000 },
  { status: 'negotiation', commission_amount: 0, expected_commission: 80000 },
  { status: 'cancelled', commission_amount: 999999, expected_commission: 999999 },
]);
assert.strictEqual(c.earned, 150000);
assert.strictEqual(c.pipeline, 80000, 'a cancelled deal is not pipeline');
assert.strictEqual(c.completedDeals, 2);
assert.strictEqual(c.openDeals, 1);
assert.strictEqual(c.saleValue, 8000000);
assert.strictEqual(c.averageSalePrice, 4000000);
const c0 = commission([]);
assert.strictEqual(c0.averageSalePrice, 0, 'no completed deals averages to 0, not NaN');
assert.ok(!Object.values(c0).some((v) => Number.isNaN(v)));
// A completed deal with no price must not drag the average to zero.
assert.strictEqual(commission([
  { status: 'completed', sale_price: 4000000, commission_amount: 1 },
  { status: 'completed', sale_price: 0, commission_amount: 1 },
]).averageSalePrice, 4000000);

// ── risk groups: every sale-side category is grouped, none falls to Other ───
const grouped = riskGroups(RURAL_SALE_DISPUTE_CATEGORIES.map((risk_category) => ({ risk_category })));
assert.strictEqual(grouped.Other, 0,
  `every sale dispute category must be grouped: ${JSON.stringify(grouped)}`);
assert.strictEqual(
  Object.values(grouped).reduce((t, n) => t + n, 0),
  RURAL_SALE_DISPUTE_CATEGORIES.length,
  'every category counted exactly once',
);
// The four headings the sale checklist names all exist.
for (const k of ['Ownership', 'Succession', 'Boundary', 'Financing']) {
  assert.ok(k in RISK_GROUPS, `the risk dashboard has a ${k} group`);
}
// An unknown category is kept, not dropped.
assert.strictEqual(riskGroups([{ risk_category: 'Something New' }]).Other, 1);
assert.strictEqual(riskGroups([{}]).Other, 1, 'a dispute with no category still counts');
assert.strictEqual(Object.values(riskGroups([])).reduce((t, n) => t + n, 0), 0);
// No group claims a category twice.
const seen = new Map();
for (const [g, list] of Object.entries(RISK_GROUPS)) {
  for (const cat of list) {
    assert.ok(!seen.has(cat), `${cat} is claimed by both ${seen.get(cat)} and ${g}`);
    seen.set(cat, g);
  }
}

console.log('ruralSaleDashboardMath OK');
