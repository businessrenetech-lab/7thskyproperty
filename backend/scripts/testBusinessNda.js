const assert = require('assert');
const { tokenState } = require('../services/businessNda.service');

const now = new Date('2026-09-21T10:00:00Z');
const future = new Date('2026-10-01T00:00:00Z');
const past = new Date('2026-09-01T00:00:00Z');
assert.strictEqual(tokenState({ status: 'released', release_token: 'x', token_expires_at: future }, now), 'valid');
assert.strictEqual(tokenState({ status: 'released', release_token: 'x', token_expires_at: past }, now), 'expired');
assert.strictEqual(tokenState({ status: 'signed', release_token: 'x', token_expires_at: future }, now), 'invalid');
assert.strictEqual(tokenState({ status: 'released', release_token: null, token_expires_at: future }, now), 'invalid');
assert.strictEqual(tokenState(null, now), 'invalid');
console.log('businessNda OK');
