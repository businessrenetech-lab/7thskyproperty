const assert = require('assert');
const { quoteForProject, lineRevenue } = require('../services/registrationDashboardMath');

const prof = (n) => ({ price: n, fee_kind: 'professional' });
const gov = (n) => ({ price: n, fee_kind: 'government' });

// wt_quotations.project_id is a STRING holding the project CODE, not the numeric id.
// Joining on Number(project_id) === Number(project.id) never matches, which reported
// every project at zero professional fee and a negative margin.
const project = { id: 7, code: 'BR-P0001' };
const quotes = [
  { id: 1, code: 'BRQ-0001', project_id: 'BR-P0001', decision: 'Sent', lines: [prof(35000)] },
  { id: 2, code: 'BRQ-0002', project_id: 'BR-P0001', decision: 'Approved', lines: [prof(30000), gov(12000)] },
  { id: 3, code: 'BRQ-0003', project_id: 'BR-P0002', decision: 'Rejected', lines: [prof(99000)] },
  { id: 4, code: 'BRQ-0004', project_id: null, decision: 'Pending', lines: [prof(5000)] },   // direct quote, no project yet
];

const chosen = quoteForProject(quotes, project);
assert.ok(chosen, 'a quote is found for the project by CODE');
assert.strictEqual(chosen.code, 'BRQ-0002', 'the approved quote wins over the superseded one');

// A project whose only quote was rejected has no live quote.
assert.strictEqual(quoteForProject(quotes, { id: 8, code: 'BR-P0002' }), null, 'rejected quotes are not used');
assert.strictEqual(quoteForProject(quotes, { id: 9, code: 'BR-P0099' }), null, 'no quote means null');

// Revenue: one quote per project (the chosen one) plus unlinked direct quotes.
const rev = lineRevenue(quotes);
assert.strictEqual(rev.professional, 35000, 'superseded quote is not double-counted (30000 + 5000 direct)');
assert.strictEqual(rev.government, 12000, 'government fees reported separately');

// Falls back to the latest non-rejected quote when nothing is approved yet.
const pendingOnly = [
  { id: 5, code: 'BRQ-0005', project_id: 'BR-P0003', decision: 'Pending', lines: [prof(1000)] },
  { id: 6, code: 'BRQ-0006', project_id: 'BR-P0003', decision: 'Sent', lines: [prof(2000)] },
];
assert.strictEqual(quoteForProject(pendingOnly, { id: 10, code: 'BR-P0003' }).code, 'BRQ-0006', 'latest non-rejected wins');
assert.strictEqual(lineRevenue(pendingOnly).professional, 2000, 'only the latest counts per project');

assert.strictEqual(lineRevenue([]).professional, 0, 'no quotes is safe');

console.log('registrationDashboardMath OK');
