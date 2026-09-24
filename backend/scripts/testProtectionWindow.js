const assert = require('assert');
const { protectionExpiry, protectionState } = require('../services/protectionWindow');

// SOP Rental §13 / Tenancy §12 — the engagement plus twelve months.
assert.strictEqual(protectionExpiry('2026-01-15'), '2027-01-15');
assert.strictEqual(protectionExpiry('2026-01-15', 24), '2028-01-15');
// Month-end arithmetic must not roll into the next month.
assert.strictEqual(protectionExpiry('2024-02-29'), '2025-02-28', 'leap day clamps to 28 Feb');
assert.strictEqual(protectionExpiry('2026-08-31', 6), '2027-02-28');
assert.strictEqual(protectionExpiry('2026-01-31', 1), '2026-02-28');
assert.strictEqual(protectionExpiry(null), null, 'no introduction date, no window');
assert.strictEqual(protectionExpiry('not a date'), null);

// State, measured against a fixed today so the test does not rot.
const rec = { protection_expires_on: '2027-01-15' };
assert.strictEqual(protectionState(rec, '2026-06-01').state, 'active');
assert.strictEqual(protectionState(rec, '2026-12-20').state, 'expiring', 'inside 60 days');
assert.strictEqual(protectionState(rec, '2027-01-15').state, 'expiring', 'the last day is still protected');
assert.strictEqual(protectionState(rec, '2027-01-16').state, 'expired');
assert.strictEqual(protectionState(rec, '2026-06-01').daysLeft, 228);
// A record with no window is not silently "active" forever.
assert.strictEqual(protectionState({}, '2026-06-01').state, 'expired');
// A DATEONLY column can come back as a Date or a full timestamp string.
assert.strictEqual(protectionState({ protection_expires_on: '2027-01-15T00:00:00.000Z' }, '2026-06-01').state, 'active');

console.log('protectionWindow OK');
