/**
 * Employee writes and lookups (plan Task 11). The controller uses this for direct changes and reads;
 * hrAppliers.js uses it once an approval finishes. The rules live in hrEmployee.service.js.
 *
 * Creating an employee (M2 §4, §11; decision 30 Oct 2026 "every employee gets a login"): the permanent
 * SSPC-EMP code, a login (or a link to the existing user with that email) with a set-password email after
 * commit, the onboarding checklist with a probation reminder, and notices to the manager, Finance and IT.
 */
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { Op } = require('sequelize');
const sequelize = require('../config/db.config');
const User = require('../models/User');
const Notification = require('../models/Notification');
const Org = require('../models/hrOrganisation');
const { HrEmployee, HrOnboardingTask, EDITABLE } = require('../models/hrEmployee');
const { nextEmployeeCode, teamIds, upline, canLinkLogin } = require('./hrEmployee.service');
const { logHistory } = require('./hrRequests');
const { hrRoleOf } = require('./hrAccess.service');

const plain = (row) => (row ? row.get({ plain: true }) : null);
const only = (obj, keys) => Object.fromEntries(keys.filter((k) => obj[k] !== undefined).map((k) => [k, obj[k]]));
const inTx = (transaction, fn) => (transaction ? fn(transaction) : sequelize.transaction(fn));
const LEAVER = ['Resigned', 'Terminated', 'Retired', 'Deceased', 'Inactive'];
// Roles HR may give a new login; anything else becomes a plain employee.
const LOGIN_ROLES = ['employee', 'hr_officer', 'hr_manager', 'finance_manager', 'it_admin'];

const STAGE = { Applicant: 'Candidate', 'Offer Accepted': 'Offer Accepted', Onboarding: 'Onboarding', Probation: 'Probation', Active: 'Active Employee',
  Confirmed: 'Confirmed Employee', Suspended: 'Active Employee', Resigned: 'Resignation / Termination', Terminated: 'Resignation / Termination',
  Retired: 'Offboarding', Deceased: 'Offboarding', Inactive: 'Inactive Archive' };

/** Staff users whose HR role is one of `roles`. */
const usersInRoles = async (roles, transaction) => {
  const users = await User.findAll({ where: { status: 'active' }, attributes: ['id', 'role', 'branch_id'], raw: true, transaction });
  return users.filter((u) => roles.includes(hrRoleOf(u)));
};
const notify = (ids, branchId, title, message, transaction) => Promise.all([...new Set(ids.filter(Boolean))]
  .map((user_id) => Notification.create({ user_id, branch_id: branchId, title, message, type: 'info' }, { transaction })));

const ONBOARDING = [
  ['employee_id', 'auto', true], ['notify_manager', 'auto', true], ['notify_finance', 'auto', true], ['notify_it', 'auto', true],
  ['collect_documents', 'hr', false], ['policy_ack', 'employee', false], ['probation_reminder', 'auto', false],
];

/** The login for a new employee: the user who already has that email, or a new one with a random password. */
const loginFor = async (emp, login, transaction) => {
  const email = String(login.email || emp.work_email || emp.personal_email || '').trim().toLowerCase();
  if (!email) return { user: null, created: false };
  const existing = await User.findOne({ where: { email }, transaction });
  if (existing && !canLinkLogin(existing)) throw Object.assign(new Error('That email belongs to a customer account. Use a work email for the employee.'), { status: 409 });
  if (existing) return { user: existing, created: false };
  const user = await User.create({
    name: emp.full_name, email, branch_id: emp.branch_id || null,
    role: LOGIN_ROLES.includes(login.role) ? login.role : 'employee', status: 'active',
    password: await bcrypt.hash(crypto.randomBytes(24).toString('hex'), 10), must_change_password: true,
  }, { transaction });
  return { user, created: true };
};

const createEmployee = async (data, req, { change_request_id = null, transaction: outer, login = {} } = {}) => inTx(outer, async (transaction) => {
  const last = await HrEmployee.findOne({ where: { employee_code: { [Op.like]: 'SSPC-EMP-%' } }, order: [['id', 'DESC']], attributes: ['employee_code'], transaction, lock: transaction.LOCK.UPDATE });
  const dep = data.department_id ? await Org.HrDepartment.findByPk(data.department_id, { transaction }) : null;
  const fields = only(data, EDITABLE);
  const status = fields.status || 'Onboarding';
  const emp = await HrEmployee.create({
    ...fields, status, lifecycle_stage: STAGE[status], employee_code: nextEmployeeCode(last ? last.employee_code : null),
    branch_id: (dep && dep.location_branch_id) || (req.user && req.user.branch_id) || null,
    work_location_branch_id: fields.work_location_branch_id || (dep && dep.location_branch_id) || null,
    created_by: req.user ? req.user.id : null,
  }, { transaction });

  const { user, created } = await loginFor(plain(emp), login, transaction);
  if (user) {
    const taken = await HrEmployee.findOne({ where: { user_id: user.id, id: { [Op.ne]: emp.id } }, transaction });
    if (taken) throw Object.assign(new Error(`That email already belongs to ${taken.employee_code}`), { status: 409 });
    await emp.update({ user_id: user.id }, { transaction });
    if (created) transaction.afterCommit(() => require('./wtPortalAccount.service').requestReset(user.email).catch((e) => console.error('hr login email:', e.message)));
  }

  const probationDue = emp.probation_end_date ? new Date(new Date(emp.probation_end_date).getTime() - 14 * 86400000).toISOString().slice(0, 10) : null;
  await HrOnboardingTask.bulkCreate(ONBOARDING.map(([task, owner, done]) => ({
    employee_id: emp.id, task, owner, done_at: done ? new Date() : null, done_by: done ? (req.user && req.user.id) : null,
    due_on: task === 'probation_reminder' ? probationDue : null,
  })), { transaction });

  const after = plain(emp);
  await require('./hrRoster').syncStaffProfile(after, { transaction });
  // Only what was filled in: empty defaults (no allowances, flags off) are not news.
  const filledIn = Object.fromEntries(Object.entries(only(after, EDITABLE)).filter(([, v]) => v != null && v !== '' && v !== false && !(Array.isArray(v) && !v.length)));
  await logHistory(req, 'employee', emp.id, {}, { employee_code: after.employee_code, ...filledIn }, { change_request_id, transaction });

  // M2 §11: the manager, Finance (payroll setup) and IT (email and CRM login) hear about the new joiner.
  const sup = emp.supervisor_employee_id ? await HrEmployee.findByPk(emp.supervisor_employee_id, { attributes: ['user_id'], transaction }) : null;
  const mgr = dep && dep.manager_employee_id ? await HrEmployee.findByPk(dep.manager_employee_id, { attributes: ['user_id'], transaction }) : null;
  const when = emp.joining_date ? ` joining ${emp.joining_date}` : '';
  await notify([sup && sup.user_id, mgr && mgr.user_id], emp.branch_id, 'New team member', `${emp.full_name} (${emp.employee_code})${when}.`, transaction);
  await notify((await usersInRoles(['finance_manager'], transaction)).map((u) => u.id), emp.branch_id, 'Payroll setup needed', `Set up payroll for ${emp.full_name} (${emp.employee_code})${when}.`, transaction);
  await notify((await usersInRoles(['it_admin'], transaction)).map((u) => u.id), emp.branch_id, 'Email and CRM login needed', `${emp.full_name} (${emp.employee_code})${when}${user ? `; login ${user.email} ${created ? 'created' : 'linked'}` : '; no email given'}.`, transaction);
  return { ...plain(emp), login: user ? { email: user.email, created } : null };
});

/** Change fields, log each, and keep the login in step with leavers. */
const updateEmployee = async (id, changes, req, { change_request_id = null, transaction: outer } = {}) => inTx(outer, async (transaction) => {
  const emp = await HrEmployee.findByPk(id, { transaction, lock: transaction.LOCK.UPDATE });
  if (!emp) throw Object.assign(new Error('Employee not found'), { status: 404 });
  const before = plain(emp);
  const next = { ...changes };
  if (next.status && next.status !== before.status) {
    next.lifecycle_stage = STAGE[next.status] || before.lifecycle_stage;
    if (LEAVER.includes(next.status) && !before.exit_date && !next.exit_date) next.exit_date = new Date().toISOString().slice(0, 10);
    if (next.status === 'Confirmed' && !before.confirmation_date && !next.confirmation_date) next.confirmation_date = new Date().toISOString().slice(0, 10);
  }
  await emp.update(next, { transaction });
  await logHistory(req, 'employee', emp.id, only(before, Object.keys(next)), next, { change_request_id, transaction });
  if (['position_id', 'department_id', 'joining_date', 'exit_date', 'user_id'].some((k) => k in next)) await require('./hrRoster').syncStaffProfile(plain(emp), { transaction });
  if (emp.user_id && next.status && LEAVER.includes(next.status)) await User.update({ status: 'inactive' }, { where: { id: emp.user_id }, transaction });
  if (emp.user_id && next.status && !LEAVER.includes(next.status) && LEAVER.includes(before.status)) await User.update({ status: 'active' }, { where: { id: emp.user_id }, transaction });
  return plain(emp);
});

/** Names for the ids on employee rows, for lists and profiles. */
const decorate = async (rows) => {
  const ids = (k) => [...new Set(rows.map((r) => r[k]).filter(Boolean))];
  const Branch = require('../models/Branch');
  const [companies, divisions, departments, teams, positions, grades, centres, branches, sups] = await Promise.all([
    Org.HrCompany.findAll({ where: { id: ids('company_id') }, raw: true }), Org.HrDivision.findAll({ where: { id: ids('division_id') }, raw: true }),
    Org.HrDepartment.findAll({ where: { id: ids('department_id') }, raw: true }), Org.HrTeam.findAll({ where: { id: ids('team_id') }, raw: true }),
    Org.HrPosition.findAll({ where: { id: ids('position_id') }, raw: true }), Org.HrSalaryGrade.findAll({ where: { id: ids('salary_grade_id') }, raw: true }),
    Org.HrCostCentre.findAll({ where: { id: ids('cost_centre_id') }, raw: true }), Branch.findAll({ where: { id: ids('work_location_branch_id') }, attributes: ['id', 'name'], raw: true }),
    HrEmployee.findAll({ where: { id: ids('supervisor_employee_id') }, attributes: ['id', 'full_name', 'employee_code'], raw: true }),
  ]);
  const by = (list, id, f = 'name') => (list.find((x) => Number(x.id) === Number(id)) || {})[f] || null;
  return rows.map((r) => ({
    ...r,
    company_name: by(companies, r.company_id), division_name: by(divisions, r.division_id), department_name: by(departments, r.department_id),
    team_name: by(teams, r.team_id), position_title: by(positions, r.position_id, 'title'), salary_grade_name: by(grades, r.salary_grade_id),
    cost_centre_name: by(centres, r.cost_centre_id), work_location_name: by(branches, r.work_location_branch_id), supervisor_name: by(sups, r.supervisor_employee_id, 'full_name'),
  }));
};

/**
 * Everyone a manager may see as "their team" (M2 §13): direct and indirect reports, plus the whole department
 * for its manager, the division for its head, and the team for its leader.
 */
const teamOf = async (employeeId) => {
  if (!employeeId) return [];
  const all = await HrEmployee.findAll({ where: { archived_at: null }, attributes: ['id', 'supervisor_employee_id', 'department_id', 'division_id', 'team_id'], raw: true });
  const [deps, divs, teams] = await Promise.all([
    Org.HrDepartment.findAll({ where: { manager_employee_id: employeeId, is_active: true }, attributes: ['id'], raw: true }),
    Org.HrDivision.findAll({ where: { head_employee_id: employeeId, is_active: true }, attributes: ['id'], raw: true }),
    Org.HrTeam.findAll({ where: { leader_employee_id: employeeId, is_active: true }, attributes: ['id'], raw: true }),
  ]);
  const ids = (list) => list.map((x) => x.id);
  return teamIds(all, employeeId, { departmentIds: ids(deps), divisionIds: ids(divs), teamIds: ids(teams) });
};

/** The people above someone, nearest first. */
const uplineOf = async (employeeId) => upline(await HrEmployee.findAll({ attributes: ['id', 'supervisor_employee_id'], raw: true }), employeeId);

/** Who now holds a position (first active holder), for moving reports when a reporting line changes. */
const holderOf = (positionId, transaction) => HrEmployee.findOne({
  where: { position_id: positionId, archived_at: null, status: ['Onboarding', 'Active', 'Probation', 'Confirmed', 'Suspended'] }, order: [['id', 'ASC']], transaction,
});

module.exports = { createEmployee, updateEmployee, decorate, teamOf, uplineOf, holderOf, plain, only, LOGIN_ROLES, LEAVER };
