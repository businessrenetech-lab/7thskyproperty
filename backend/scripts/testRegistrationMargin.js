const assert = require('assert');
const { projectMargin } = require('../services/registrationMargin');

const quoteLines = [
  { amount: 12000, fee_kind: 'government' },
  { amount: 25000, fee_kind: 'professional' },
  { amount: 8000, fee_kind: 'professional' },
];

const m = projectMargin({ quoteLines, providerCost: 18000 });
assert.strictEqual(m.government, 12000, 'government fees reported separately');
assert.strictEqual(m.professional, 33000, 'professional fee is the revenue');
assert.strictEqual(m.provider_cost, 18000);
assert.strictEqual(m.gross_margin, 15000, 'margin = professional − provider cost, government excluded');
assert.strictEqual(m.margin_pct, 45.5, 'margin % of the professional fee, one decimal');

// Once invoices exist they win over the quote.
const inv = projectMargin({ quoteLines, providerCost: 18000, invoicedProfessional: 30000 });
assert.strictEqual(inv.professional, 30000, 'invoiced professional fee overrides the quote');
assert.strictEqual(inv.gross_margin, 12000);

// Degenerate cases must not divide by zero or return NaN.
const zero = projectMargin({ quoteLines: [], providerCost: 0 });
assert.strictEqual(zero.gross_margin, 0);
assert.strictEqual(zero.margin_pct, 0, 'no revenue means 0%, not NaN');

const loss = projectMargin({ quoteLines: [{ amount: 10000 }], providerCost: 15000 });
assert.strictEqual(loss.gross_margin, -5000, 'losses are reported, not clamped');

// No arguments at all must not throw — dashboards call this per project.
assert.strictEqual(projectMargin().gross_margin, 0, 'missing input is safe');

// Government fees never inflate revenue, however large.
const passThrough = projectMargin({ quoteLines: [{ price: 500000, fee_kind: 'government' }], providerCost: 0 });
assert.strictEqual(passThrough.professional, 0, 'a government-only quote earns nothing');
assert.strictEqual(passThrough.government, 500000);
assert.strictEqual(passThrough.margin_pct, 0);

console.log('registrationMargin OK');
