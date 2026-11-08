// Change requests and approval chains (HRM plan Task 3). Run: node scripts/testHrApproval.js — silent on success.
const assert = require('assert');
const { KINDS, chainFor, canAct, advance, pendingConflict, diffToHistory } = require('../services/hrApproval.service');

assert.deepStrictEqual(chainFor('emp.salary'), ['hr_manager', 'ceo']);
assert.deepStrictEqual(chainFor('rec.vacancy'), ['department_manager', 'hr_manager', 'finance_manager', 'ceo']);
assert.deepStrictEqual(chainFor('org.department.create'), ['hr_manager', 'ceo']);
assert.deepStrictEqual(chainFor('emp.bank'), ['finance_manager']);
assert.deepStrictEqual(chainFor('emp.self_service'), ['hr_manager']);
assert.throws(() => chainFor('nope'));
assert.ok(KINDS.includes('rec.hire') && KINDS.length === 24);
const r = { kind: 'emp.transfer', requested_by: 10, chain: chainFor('emp.transfer').map((role) => ({ role })), step: 0, status: 'pending' };
assert.strictEqual(canAct(r, { id: 10, hrRole: 'hr_manager' }), false);       // own request
assert.strictEqual(canAct(r, { id: 11, hrRole: 'hr_manager' }), true);
assert.strictEqual(canAct(r, { id: 12, hrRole: 'finance_manager' }), false);
assert.strictEqual(canAct(r, { id: 13, hrRole: 'ceo' }), true);               // CEO can act at any step
assert.strictEqual(canAct(r, { id: 10, hrRole: 'ceo' }), false);              // not even the CEO on their own request
assert.strictEqual(canAct({ ...r, status: 'approved' }, { id: 11, hrRole: 'hr_manager' }), false);
const done = advance(r, { id: 11, hrRole: 'hr_manager' }, 'approve', 'ok', new Date('2026-11-01T10:00:00Z'));
assert.strictEqual(done.status, 'approved'); assert.strictEqual(r.status, 'pending');   // no mutation
assert.strictEqual(done.chain[0].decided_by, 11); assert.strictEqual(done.chain[0].comment, 'ok');
assert.strictEqual(done.chain[0].at, '2026-11-01T10:00:00.000Z');
const rej = advance({ ...r, kind: 'emp.salary', chain: [{ role: 'hr_manager' }, { role: 'ceo' }] }, { id: 11, hrRole: 'hr_manager' }, 'reject', 'no', new Date());
assert.strictEqual(rej.status, 'rejected');
const two = advance({ ...r, kind: 'emp.salary', chain: [{ role: 'hr_manager' }, { role: 'ceo' }] }, { id: 11, hrRole: 'hr_manager' }, 'approve', '', new Date());
assert.strictEqual(two.status, 'pending'); assert.strictEqual(two.step, 1);
assert.throws(() => advance(r, { id: 10, hrRole: 'hr_manager' }, 'approve', '', new Date()));   // not allowed to act
assert.ok(pendingConflict('emp.promotion', 'employee', 5, [{ kind: 'emp.salary', entity_type: 'employee', entity_id: 5, status: 'pending' }]));  // Review Focus 2
assert.strictEqual(pendingConflict('emp.supervisor', 'employee', 5, [{ kind: 'emp.salary', entity_type: 'employee', entity_id: 5, status: 'pending' }]), null);
assert.strictEqual(pendingConflict('emp.salary', 'employee', 5, [{ kind: 'emp.salary', entity_type: 'employee', entity_id: 6, status: 'pending' }]), null);
assert.strictEqual(pendingConflict('emp.salary', 'employee', 5, [{ kind: 'emp.salary', entity_type: 'employee', entity_id: 5, status: 'approved' }]), null);
assert.deepStrictEqual(diffToHistory({ a: 1, b: 2 }, { a: 1, b: 3 }, { entity_type: 'employee', entity_id: 5 }).map((h) => h.field), ['b']);
const h = diffToHistory({ name: 'A' }, { name: 'B', code: 'X' }, { entity_type: 'department', entity_id: 2, actor_id: 9 });
assert.deepStrictEqual(h.map((x) => [x.field, x.old_value, x.new_value]), [['name', 'A', 'B'], ['code', null, 'X']]);
assert.strictEqual(h[0].actor_id, 9);

// Phase 4: a month's payroll is approved by the CEO (HR prepares it, Accounts pays it afterwards).
assert.ok(KINDS.includes('pay.run'));
assert.deepStrictEqual(chainFor('pay.run'), ['ceo']);
console.log('testHrApproval: phase 4 passed');
