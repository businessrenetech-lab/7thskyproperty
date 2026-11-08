// Organisation rules (HRM plan Task 2). Run: node scripts/testHrOrg.js — silent on success.
const assert = require('assert');
const { nextCode, reportingCycle, deactivationBlockers, blockerMessage, orgAlerts, buildOrgTree } = require('../services/hrOrg.service');
const hrCatalog = require('../config/hrCatalog');

assert.strictEqual(nextCode('DEP-', null), 'DEP-0001');
assert.strictEqual(nextCode('DEP-', 'DEP-0041'), 'DEP-0042');
assert.strictEqual(nextCode('DEP-', 'DEP-9999'), 'DEP-10000');            // grows, never wraps
const P = [{ id: 1, reports_to_position_id: null }, { id: 2, reports_to_position_id: 1 }, { id: 3, reports_to_position_id: 2 }];
assert.deepStrictEqual(reportingCycle(1, 3, P), [1, 3, 2, 1]);           // Review Focus 3
assert.strictEqual(reportingCycle(3, 1, P), null);
assert.deepStrictEqual(reportingCycle(2, 2, P), [2, 2]);                  // reporting to itself
const b = deactivationBlockers('department', 7, { employees: [{ department_id: 7, status: 'Active' }, { department_id: 7, status: 'Resigned' }], vacancies: [{ department_id: 7, status: 'Published' }], children: [] });
assert.deepStrictEqual(b, { activeEmployees: 1, openVacancies: 1, activeChildren: 0 });   // Review Focus 4
assert.deepStrictEqual(deactivationBlockers('division', 2, { children: [{ division_id: 2, is_active: true }, { division_id: 2, is_active: false }] }), { activeEmployees: 0, openVacancies: 0, activeChildren: 1 });
assert.deepStrictEqual(deactivationBlockers('salary_grade', 3, { children: [{ salary_grade_id: 3, is_active: true }] }).activeChildren, 1);
assert.strictEqual(blockerMessage('department', { activeEmployees: 3, openVacancies: 1, activeChildren: 0 }), 'This department still has 3 active employees and 1 open vacancy.');
assert.strictEqual(blockerMessage('team', { activeEmployees: 0, openVacancies: 0, activeChildren: 0 }), null);
const a = orgAlerts({ departments: [{ id: 1, manager_employee_id: null, is_active: true }], positions: [{ id: 5, reports_to_position_id: null, is_top: false, job_description: '' }] });
assert.deepStrictEqual(a, { departmentsWithoutManager: [1], positionsWithoutSupervisor: [5], positionsWithoutJobDescription: [5] });
assert.deepStrictEqual(orgAlerts({ departments: [{ id: 2, manager_employee_id: null, is_active: false }], positions: [{ id: 6, reports_to_position_id: null, is_top: true, job_description: 'x', is_active: true }] }),
  { departmentsWithoutManager: [], positionsWithoutSupervisor: [], positionsWithoutJobDescription: [] });   // inactive dept, top position
assert.strictEqual(hrCatalog.EMPLOYEE_TYPES.length, 11);
assert.strictEqual(hrCatalog.EMPLOYMENT_STATUSES.length, 12);
assert.strictEqual(hrCatalog.APPLICANT_STATUSES.length, 14);
assert.strictEqual(hrCatalog.DOCUMENT_TYPES.length, 21);
assert.deepStrictEqual(hrCatalog.PRIORITIES, ['Critical', 'High', 'Normal', 'Future']);

// buildOrgTree: two divisions; filtering one department keeps only its branch, headcount summed.
const rows = {
  companies: [{ id: 1, code: 'CO-0001', name: 'Seventh Sky Private Ltd' }],
  divisions: [{ id: 1, company_id: 1, code: 'DIV-0001', name: 'Property Care' }, { id: 2, company_id: 1, code: 'DIV-0002', name: 'Education' }],
  departments: [{ id: 10, division_id: 1, code: 'DEP-0001', name: 'Water Tank' }, { id: 11, division_id: 1, code: 'DEP-0002', name: 'Interior' }, { id: 12, division_id: 2, code: 'DEP-0003', name: 'Visas' }],
  teams: [{ id: 20, department_id: 10, code: 'TEAM-0001', name: 'Operations' }],
  positions: [{ id: 30, department_id: 10, team_id: 20, code: 'POS-0001', title: 'Coordinator', headcount: 3 }, { id: 31, department_id: 10, team_id: null, code: 'POS-0002', title: 'Manager', headcount: 1 }, { id: 32, department_id: 11, code: 'POS-0003', title: 'Designer', headcount: 2 }],
  employees: [{ id: 1, position_id: 30, status: 'Active' }, { id: 2, position_id: 30, status: 'Probation' }, { id: 3, position_id: 31, status: 'Active' }, { id: 4, position_id: 32, status: 'Active' }, { id: 5, position_id: 30, status: 'Resigned' }],
};
const all = buildOrgTree(rows, {});
assert.strictEqual(all.type, 'company');
assert.strictEqual(all.children.length, 2);
assert.strictEqual(all.headcount, 4);
assert.strictEqual(all.vacancies, 2);                                   // 3+1+2 seats, 4 filled
const one = buildOrgTree(rows, { departmentId: 10 });
assert.strictEqual(one.children.length, 1);                            // only Property Care
assert.strictEqual(one.children[0].children.length, 1);                // only Water Tank
assert.strictEqual(one.children[0].children[0].headcount, 3);
assert.strictEqual(one.headcount, 3);
const team = one.children[0].children[0].children.find((n) => n.type === 'team');
assert.strictEqual(team.children[0].title || team.children[0].name, 'Coordinator');
