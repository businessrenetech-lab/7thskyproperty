/**
 * HR employee rules (plan Tasks 10 and 12; M1 §10, M2 §2–5, §9, §11). Pure functions, no database.
 * Run from backend/: node scripts/testHrEmployee.js
 */
const assert = require('assert');
const {
  nextEmployeeCode, missingLinks, nextStatuses, changeKinds, groupChanges, missingDocuments, expiring, onRoster, teamIds, upline, dueReminders, canLinkLogin,
} = require('../services/hrEmployee.service');

// Codes (M2 §4)
assert.strictEqual(nextEmployeeCode(null), 'SSPC-EMP-0001');
assert.strictEqual(nextEmployeeCode('SSPC-EMP-0041'), 'SSPC-EMP-0042');
assert.strictEqual(nextEmployeeCode('SSPC-EMP-9999'), 'SSPC-EMP-10000');

// Required links (M1 §10)
assert.deepStrictEqual(missingLinks({ company_id: 1, division_id: 1, department_id: 2, position_id: null, supervisor_employee_id: null }), ['position', 'supervisor']);
assert.deepStrictEqual(missingLinks({ company_id: 1, division_id: 1, department_id: 2, position_id: 3, supervisor_employee_id: 4 }), []);
assert.deepStrictEqual(missingLinks({ company_id: 1, division_id: 1, department_id: 2, position_id: 3 }, { topPosition: true }), [], 'the top position (the CEO) has no supervisor');

// Status moves (M2 §3.3, §5)
assert.deepStrictEqual(nextStatuses('Probation').filter((s) => ['Confirmed', 'Resigned', 'Terminated', 'Suspended'].includes(s)).length, 4);
assert.ok(!nextStatuses('Terminated').includes('Probation'));
assert.deepStrictEqual(nextStatuses('Inactive'), ['Active']);
assert.deepStrictEqual(nextStatuses('Nonsense'), []);

// Which approval each change needs (M2 §9)
assert.deepStrictEqual(changeKinds({ basic_salary: 1, department_id: 2 }, { basic_salary: 2, department_id: 3 }).sort(), ['emp.salary', 'emp.transfer']);
assert.deepStrictEqual(changeKinds({ present_address: 'a' }, { present_address: 'b' }), []);
assert.deepStrictEqual(changeKinds({ status: 'Active' }, { status: 'Terminated' }), ['emp.termination']);
assert.deepStrictEqual(changeKinds({ status: 'Active' }, { status: 'Suspended' }), ['emp.status']);
assert.deepStrictEqual(changeKinds({ bank_account_no: '1' }, { bank_account_no: '2' }), ['emp.bank']);
assert.deepStrictEqual(changeKinds({ national_id: '1' }, { national_id: '2' }), ['emp.sensitive']);
assert.deepStrictEqual(changeKinds({ allowances: [] }, { allowances: [{ name: 'Phone', amount: 500 }] }), ['emp.allowance']);
assert.deepStrictEqual(changeKinds({ supervisor_employee_id: 1 }, { supervisor_employee_id: 2 }), ['emp.supervisor']);
assert.deepStrictEqual(changeKinds({ position_id: 1 }, { position_id: 2 }, { promotion: true }), ['emp.promotion']);
assert.deepStrictEqual(changeKinds({ position_id: 1 }, { position_id: 2 }, { seniorPositionIds: [2] }), ['emp.senior_appointment']);
assert.deepStrictEqual(changeKinds({ basic_salary: '30000.00' }, { basic_salary: 30000 }), [], 'same amount is no change');

// One request per decision: a transfer carries its new position and supervisor; a promotion carries its pay
const t = groupChanges({ department_id: 1, position_id: 1, supervisor_employee_id: 1, city: 'Dhaka' }, { department_id: 2, position_id: 2, supervisor_employee_id: 3, city: 'Cumilla' });
assert.deepStrictEqual(Object.keys(t.governed), ['emp.transfer']);
assert.deepStrictEqual(t.governed['emp.transfer'], { department_id: 2, position_id: 2, supervisor_employee_id: 3 });
assert.deepStrictEqual(t.direct, { city: 'Cumilla' });
const p = groupChanges({ position_id: 1, basic_salary: 100 }, { position_id: 2, basic_salary: 200 }, { promotion: true });
assert.deepStrictEqual(p.governed, { 'emp.promotion': { position_id: 2, basic_salary: 200 } });

// Documents the employee type requires (M2 §2, §11 "alert HR for missing documents")
const required = { 'Full-time employee': ['National ID', 'Photo', 'CV'] };
assert.deepStrictEqual(missingDocuments({ employee_type: 'Full-time employee' }, [{ doc_type: 'Photo' }, { doc_type: 'CV', verification_status: 'rejected' }], required), ['National ID', 'CV']);
assert.deepStrictEqual(missingDocuments({ employee_type: 'Intern' }, [], required), []);

// Expiry windows (M2 §11)
const e = expiring([{ doc_type: 'Passport', expiry_date: '2026-11-20' }], [{ id: 1, contract_end_date: '2027-03-01', probation_end_date: '2026-11-15' }], new Date('2026-11-01'));
assert.strictEqual(e.documents.length, 1); assert.strictEqual(e.contracts.length, 0); assert.strictEqual(e.probations.length, 1);
const gone = expiring([{ doc_type: 'Passport', expiry_date: '2026-10-01' }], [], new Date('2026-11-01'));
assert.strictEqual(gone.documents.length, 1, 'an already expired document still needs action');
assert.strictEqual(gone.documents[0].expired, true);

// M2 §18: only people in the master, and still with us, appear in attendance and leave
assert.strictEqual(onRoster({ status: 'Probation' }), true);
assert.strictEqual(onRoster({ status: 'Suspended' }), true, 'a suspended employee is still on the books');
['Applicant', 'Inactive', 'Resigned', 'Terminated', 'Retired', 'Deceased'].forEach((s) => assert.strictEqual(onRoster({ status: s }), false, s));
assert.strictEqual(onRoster({ status: 'Active', archived_at: '2026-10-01' }), false);
assert.strictEqual(onRoster(null), false);

// M2 §13 manager view: reports (direct and indirect) plus the unit they run, never their own bosses
const staff = [
  { id: 1, supervisor_employee_id: null, department_id: 1 },   // CEO, seated in the department
  { id: 2, supervisor_employee_id: 1, department_id: 1 },      // department manager
  { id: 3, supervisor_employee_id: 2, department_id: 1 },
  { id: 4, supervisor_employee_id: 3, department_id: 2 },      // indirect report in another department
  { id: 5, supervisor_employee_id: 1, department_id: 1 },      // peer in the department
];
assert.deepStrictEqual(upline(staff, 3), [2, 1]);
assert.deepStrictEqual(teamIds(staff, 2, { departmentIds: [1] }).sort(), [3, 4, 5], 'the department, the downline, not the CEO above');
assert.deepStrictEqual(teamIds(staff, 3, {}), [4]);
assert.deepStrictEqual(upline([{ id: 1, supervisor_employee_id: 2 }, { id: 2, supervisor_employee_id: 1 }], 1), [2], 'a loop does not hang');

// Reminders (M2 §11, M1 §9): what to tell HR and the manager today, each once
const today = new Date('2026-11-02T09:00:00');   // a Monday
const people = [
  { id: 1, status: 'Probation', probation_end_date: '2026-11-16', employee_type: 'Intern' },        // 14 days ahead
  { id: 2, status: 'Probation', probation_end_date: '2026-12-20', employee_type: 'Intern' },        // too far
  { id: 3, status: 'Active', contract_end_date: '2026-11-25', employee_type: 'Full-time employee' },
  { id: 4, status: 'Resigned', contract_end_date: '2026-11-10', employee_type: 'Intern' },          // a leaver: nothing
];
const r = dueReminders({
  employees: people, now: today,
  documents: [{ id: 9, employee_id: 3, doc_type: 'Passport', expiry_date: '2026-10-30' }, { id: 10, employee_id: 3, doc_type: 'Photo', expiry_date: '2026-10-01', verification_status: 'rejected' }],
  requiredByType: { 'Full-time employee': ['Passport', 'CV'] },
  orgAlerts: { departmentsWithoutManager: [5], positionsWithoutSupervisor: [7], positionsWithoutJobDescription: [7] },
});
const key = (x) => `${x.kind}:${x.employeeId || ''}:${x.entityId || ''}`;
assert.deepStrictEqual(r.map(key).sort(), [
  'contract_expiry:3:', 'department_without_manager::5', 'document_expiry:3:9', 'missing_documents:3:', 'position_without_supervisor::7', 'probation_end:1:',
]);
const prob = r.find((x) => x.kind === 'probation_end');
assert.strictEqual(prob.dueOn, '2026-11-16');
assert.deepStrictEqual(prob.recipients, ['hr_manager', 'manager']);
assert.deepStrictEqual(r.find((x) => x.kind === 'department_without_manager').recipients, ['hr_manager']);
const sent = r.filter((x) => x.kind === 'probation_end').map((x) => ({ kind: x.kind, employee_id: x.employeeId, entity_id: x.entityId || null, due_on: x.dueOn }));
assert.ok(!dueReminders({ employees: people, now: today, sent }).some((x) => x.kind === 'probation_end'), 'a reminder already sent is not sent again');
// Standing problems (missing documents, org gaps) come back once a week, not every day
const nextDay = dueReminders({ employees: people, now: new Date('2026-11-03T09:00:00'), requiredByType: { 'Full-time employee': ['CV'] }, sent: r.map((x) => ({ kind: x.kind, employee_id: x.employeeId || null, entity_id: x.entityId || null, due_on: x.dueOn })) });
assert.ok(!nextDay.some((x) => x.kind === 'missing_documents'));
assert.strictEqual(r.find((x) => x.kind === 'missing_documents').dueOn, '2026-11-02');

// A customer's login is never turned into an employee's (tenants, owners, clients… keep their own accounts)
assert.strictEqual(canLinkLogin({ role: 'tenant' }), false);
assert.strictEqual(canLinkLogin({ role: 'wt_client' }), false);
assert.strictEqual(canLinkLogin({ role: 'manager' }), true);
assert.strictEqual(canLinkLogin({ role: 'employee' }), true);
assert.strictEqual(canLinkLogin(null), true, 'no existing user: a new login is made');

// Each yes/no pay flag maps to its own column (a shared attribute object once mapped all four to commission_eligible).
{
  const { HrEmployee } = require('../models/hrEmployee');
  for (const k of ['commission_eligible', 'bonus_eligible', 'overtime_eligible', 'provident_fund_eligible']) {
    assert.strictEqual(HrEmployee.rawAttributes[k].field, k, `${k} maps to its own column`);
  }
}

console.log('testHrEmployee: all passed');
