// HR access control (HRM plan Task 4). Run: node scripts/testHrAccess.js — silent on success.
const assert = require('assert');
const { HR_ROLES, ACTIONS, DEFAULT_MATRIX, can, hrRoleOf, maskEmployee, mergeSettings, validateSettings, maskPayload } = require('../services/hrAccess.service');

const emp = { id: 5, supervisor_employee_id: 9, basic_salary: 50000, bank_account_no: '123', national_id: '199…', full_name: 'Ayesha Rahman' };
assert.ok(!('basic_salary' in maskEmployee(emp, { hrRole: 'department_manager', employeeId: 9, teamIds: [5] })));
assert.ok(!('basic_salary' in maskEmployee(emp, { hrRole: 'it_admin' })));
assert.strictEqual(maskEmployee(emp, { hrRole: 'finance_manager' }).bank_account_no, '123');
assert.ok(!('national_id' in maskEmployee(emp, { hrRole: 'finance_manager' })));
assert.strictEqual(maskEmployee(emp, { hrRole: 'employee', employeeId: 5 }).full_name, 'Ayesha Rahman');
assert.deepStrictEqual(maskEmployee(emp, { hrRole: 'employee', employeeId: 6 }), null);       // someone else's record
assert.deepStrictEqual(maskEmployee(emp, { hrRole: 'department_manager', employeeId: 9, teamIds: [7] }), null);   // not their team
assert.strictEqual(maskEmployee(emp, { hrRole: 'hr_manager' }).national_id, '199…');
assert.strictEqual(can('employee', 'org.view_basic'), true);
assert.strictEqual(can('department_manager', 'org.edit'), false);
assert.strictEqual(can('finance_manager', 'org.view_cost'), true);
assert.strictEqual(can('it_admin', 'emp.view_any'), true);
assert.strictEqual(can('it_admin', 'emp.view_payroll'), false);
assert.strictEqual(can('nobody', 'org.view_basic'), false);
assert.strictEqual(hrRoleOf({ role: 'super_admin' }), 'ceo');
assert.strictEqual(hrRoleOf({ role: 'hr_manager' }), 'hr_manager');
assert.strictEqual(hrRoleOf({ role: 'staff' }, { managesDepartment: true }), 'department_manager');
assert.strictEqual(hrRoleOf({ role: 'staff' }, { leadsTeam: true }), 'team_leader');
assert.strictEqual(hrRoleOf({ role: 'staff' }), 'employee');
assert.strictEqual(hrRoleOf({ role: 'employee' }, { headsDivision: true }), 'department_manager');   // division heads see their division
assert.strictEqual(hrRoleOf({ role: 'employee' }, { supervises: true }), 'team_leader');            // anyone with direct reports
assert.strictEqual(hrRoleOf({ role: 'tenant' }), null);                  // clients have no HR access
assert.ok(HR_ROLES.length === 8 && ACTIONS.includes('access.manage'));

// Stored settings override the client's defaults, and the server follows them.
const stored = mergeSettings({ matrix: { department_manager: [...DEFAULT_MATRIX.department_manager, 'emp.view_payroll'] } });
assert.strictEqual(maskEmployee(emp, { hrRole: 'department_manager', employeeId: 9, teamIds: [5] }, stored).basic_salary, 50000);
assert.strictEqual(can('employee', 'org.view_basic', stored), true);     // untouched roles keep their defaults
// Nobody can lock HR out: the CEO always keeps approvals, org editing and access management.
assert.strictEqual(validateSettings({ matrix: { ceo: ['org.view_basic'] } }).ok, false);
assert.strictEqual(validateSettings({ matrix: { hr_manager: ['made.up'] } }).ok, false);
assert.strictEqual(validateSettings({ matrix: { ghost: [] } }).ok, false);
assert.strictEqual(validateSettings({ matrix: { employee: ['org.view_basic', 'emp.view_own'] } }).ok, true);

// Change requests show values only to people allowed to see them (M2 §10): an HR Officer reading the approvals
// inbox sees that a salary changed, not the amount; whoever must decide the step always sees everything.
const req = { basic_salary: 30000, bank_account_no: '1501', national_id: '1990', present_address: 'House 9' };
const officer = maskPayload(req, { hrRole: 'hr_officer' });
assert.deepStrictEqual(officer.payload, { national_id: '1990', present_address: 'House 9' });
assert.deepStrictEqual(officer.hidden.sort(), ['bank_account_no', 'basic_salary']);
assert.deepStrictEqual(maskPayload(req, { hrRole: 'department_manager' }).payload, { present_address: 'House 9' });
assert.deepStrictEqual(maskPayload(req, { hrRole: 'hr_officer', deciding: true }).payload, req, 'the approver of this step sees what they approve');
assert.deepStrictEqual(maskPayload(req, { hrRole: 'hr_manager' }).hidden, []);
assert.deepStrictEqual(maskPayload(null, { hrRole: 'employee' }), { payload: null, hidden: [] });

// Phase 4: payroll, reviews and exits. HR prepares pay, Finance pays it, HR runs reviews and exits.
assert.strictEqual(can('hr_officer', 'pay.manage'), true);
assert.strictEqual(can('hr_manager', 'pay.manage'), true);
assert.strictEqual(can('hr_officer', 'pay.pay'), false, 'HR prepares the month; Accounts pays it');
assert.strictEqual(can('finance_manager', 'pay.pay'), true);
assert.strictEqual(can('finance_manager', 'pay.view'), true);
assert.strictEqual(can('finance_manager', 'pay.manage'), false);
assert.strictEqual(can('employee', 'pay.view'), false);
assert.strictEqual(can('hr_officer', 'perf.manage'), true);
assert.strictEqual(can('department_manager', 'perf.manage'), false, 'supervisors review their own team through the team check, not this action');
assert.strictEqual(can('hr_officer', 'off.manage'), true);
assert.strictEqual(can('finance_manager', 'off.manage'), false);
// Settings the CEO saved before Phase 4 never decided the new actions: they take their defaults.
{
  const old = mergeSettings({ matrix: { hr_officer: ['org.view_basic'], finance_manager: ['org.view_basic'] } }).matrix;
  assert.ok(old.hr_officer.includes('pay.manage') && old.hr_officer.includes('off.manage'));
  assert.ok(!old.hr_officer.includes('emp.edit'), 'an old decision stands');
  assert.ok(old.finance_manager.includes('pay.pay'));
  const decided = mergeSettings({ matrix: { hr_officer: ['org.view_basic'], _known: ACTIONS } }).matrix;
  assert.deepStrictEqual(decided.hr_officer, ['org.view_basic'], 'once saved with the new actions, the CEO decides them');
  assert.ok(!('_known' in decided));
  assert.strictEqual(validateSettings({ matrix: { hr_officer: ['pay.manage'], _known: ACTIONS } }).ok, true);
}
console.log('testHrAccess: phase 4 passed');
