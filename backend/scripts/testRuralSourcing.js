const assert = require('assert');
const { briefFromEntry, shortlistSummary, REGISTERS } = require('../controllers/ruralSourcing.controller');

// The three registers this rides on, by id — seeded from the CRM workbook on
// 2026-06-26. New tables here would duplicate the client's own model.
assert.deepStrictEqual(REGISTERS, { requirement: 158, search: 159, shortlist: 160 });

// An entry's `data` JSON becomes a brief without losing the register's own keys.
const entry = {
  id: 7, register_definition_id: 158, client_id: 3, status: 'Yes',
  data: { requirement: 'Fishery', notes: '2 acres, Cumilla' },
};
const brief = briefFromEntry(entry);
assert.strictEqual(brief.id, 7);
assert.strictEqual(brief.client_id, 3);
assert.strictEqual(brief.requirement, 'Fishery');
assert.strictEqual(brief.notes, '2 acres, Cumilla');

// A string `data` column round-trips (this DB returns JSON columns as strings).
assert.strictEqual(briefFromEntry({ id: 8, data: '{"requirement":"Pond"}' }).requirement, 'Pond');
// Unparseable data must not crash a list.
assert.strictEqual(briefFromEntry({ id: 9, data: 'not json' }).id, 9);
assert.strictEqual(briefFromEntry(null).id, undefined);

// Shortlist counts by outcome, with an honest zero.
const s = shortlistSummary([
  { data: { outcome: 'Shortlisted' } }, { data: { outcome: 'Shortlisted' } },
  { data: { outcome: 'Rejected' } }, { data: {} },
]);
assert.strictEqual(s.total, 4);
assert.strictEqual(s.byOutcome.Shortlisted, 2);
assert.strictEqual(s.byOutcome.Rejected, 1);
assert.strictEqual(s.byOutcome.unrecorded, 1);
assert.deepStrictEqual(shortlistSummary([]), { total: 0, byOutcome: {} });

console.log('ruralSourcing OK');
