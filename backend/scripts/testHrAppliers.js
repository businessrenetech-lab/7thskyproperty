/**
 * HR appliers (plan Task 6): one per change kind; organisation kinds write, later phases answer 501.
 * Run from backend/: node scripts/testHrAppliers.js. Needs no database: the org writes are swapped for stubs.
 */
const assert = require('assert');
const { KINDS, ORG_KINDS } = require('../services/hrApproval.service');
const { appliers, makeAppliers } = require('../services/hrAppliers');

(async () => {
  KINDS.forEach((k) => assert.strictEqual(typeof appliers[k], 'function', `no applier for ${k}`));

  const calls = [];
  const store = {
    createEntity: async (level, data) => { calls.push(['create', level, data]); return { id: 9, ...data }; },
    updateEntity: async (level, id, data) => { calls.push(['update', level, id, data]); return { id, ...data }; },
    activeChildren: async () => 0,
    reportingLoopMessage: async () => null,
  };
  const a = makeAppliers(store);
  const req = { user: { id: 1 } };

  await a['org.department.create']({ id: 5, kind: 'org.department.create', entity_type: 'department', payload: { name: 'Water', division_id: 1 } }, req);
  assert.deepStrictEqual(calls.pop(), ['create', 'departments', { name: 'Water', division_id: 1 }]);

  await a['org.reporting_line']({ id: 6, kind: 'org.reporting_line', entity_type: 'position', entity_id: 3, payload: { reports_to_position_id: 2 } }, req);
  assert.deepStrictEqual(calls.pop(), ['update', 'positions', 3, { reports_to_position_id: 2 }]);

  await a['org.salary_grade']({ id: 7, kind: 'org.salary_grade', entity_type: 'salary_grade', entity_id: 4, payload: { max_amount: 90000 } }, req);
  assert.deepStrictEqual(calls.pop(), ['update', 'salary-grades', 4, { max_amount: 90000 }]);

  // A deactivation approved after someone added a unit underneath is refused, not applied.
  const busy = makeAppliers({ ...store, activeChildren: async () => 2 });
  await assert.rejects(busy['org.restructure']({ id: 8, kind: 'org.restructure', entity_type: 'department', entity_id: 3, payload: { is_active: false } }, req),
    (e) => e.status === 409 && /2 active units under it/.test(e.message));

  // …and so is one approved after people were placed in it (M1 §10: no unit with active employees is closed).
  const staffed = makeAppliers({ ...store, activeEmployees: async () => 3 });
  await assert.rejects(staffed['org.restructure']({ id: 10, kind: 'org.restructure', entity_type: 'department', entity_id: 3, payload: { is_active: false } }, req),
    (e) => e.status === 409 && /3 active employees/.test(e.message));

  // A reporting line that became a loop while it waited is refused.
  const loopy = makeAppliers({ ...store, reportingLoopMessage: async () => 'That would make a reporting loop: A → B → A' });
  await assert.rejects(loopy['org.reporting_line']({ id: 9, kind: 'org.reporting_line', entity_type: 'position', entity_id: 3, payload: { reports_to_position_id: 2 } }, req),
    (e) => e.status === 400 && /reporting loop/.test(e.message));

  // Employee kinds (Task 11)
  const ecalls = [];
  const emp = { id: 4, status: 'Terminated', position_id: 2, company_id: 1, division_id: 1, department_id: 1, supervisor_employee_id: 3 };
  const estore = {
    ...store,
    createEmployee: async (data, r, opts) => { ecalls.push(['create', data, opts.login]); return { id: 11, employee_code: 'SSPC-EMP-0001' }; },
    updateEmployee: async (id, data) => { ecalls.push(['update', id, data]); return { id, ...data }; },
    getEmployee: async () => ({ ...emp }),
    isTopPosition: async () => false,
    moveReports: async (positionId, reportsTo) => { ecalls.push(['move', positionId, reportsTo]); return 2; },
  };
  const ea = makeAppliers(estore);
  await ea['emp.create']({ id: 20, kind: 'emp.create', entity_type: 'employee', payload: { full_name: 'Ayesha Rahman', login_email: 'a@x.test', login_role: 'employee' } }, req);
  assert.deepStrictEqual(ecalls.pop(), ['create', { full_name: 'Ayesha Rahman' }, { email: 'a@x.test', role: 'employee' }]);
  await ea['emp.salary']({ id: 21, kind: 'emp.salary', entity_type: 'employee', entity_id: 4, payload: { basic_salary: 36000 } }, req);
  assert.deepStrictEqual(ecalls.pop(), ['update', 4, { basic_salary: 36000 }]);
  await assert.rejects(ea['emp.status']({ id: 22, kind: 'emp.status', entity_type: 'employee', entity_id: 4, payload: { status: 'Probation' } }, req),
    (e) => e.status === 400 && /Terminated/.test(e.message), 'a status move the lifecycle forbids is refused at approval');
  await assert.rejects(ea['emp.transfer']({ id: 23, kind: 'emp.transfer', entity_type: 'employee', entity_id: 4, payload: { department_id: null } }, req),
    (e) => e.status === 400 && /department/.test(e.message), 'a transfer cannot leave a required link empty');

  // A reporting-line change moves the people in that position to the new supervisor (M1 §9)
  await ea['org.reporting_line']({ id: 24, kind: 'org.reporting_line', entity_type: 'position', entity_id: 3, payload: { reports_to_position_id: 2 } }, req);
  assert.deepStrictEqual(ecalls.pop(), ['move', 3, 2]);

  for (const k of KINDS.filter((x) => x.startsWith('rec.'))) await assert.rejects(a[k]({ id: 1, kind: k, entity_type: 'vacancy', entity_id: 1, payload: {} }, req), (e) => e.status === 501);

  console.log('testHrAppliers: all passed');
})().catch((e) => { console.error(e); process.exit(1); });
