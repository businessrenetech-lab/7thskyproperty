/**
 * Organisation levels and the writes behind them (plan Tasks 5–6). The controller uses this for direct
 * changes; hrAppliers.js uses it once an approval chain finishes. Codes are assigned here, inside a
 * transaction, so two people creating at once never get the same code (M1 §9).
 */
const { Op } = require('sequelize');
const sequelize = require('../config/db.config');
const M = require('../models/hrOrganisation');
const { nextCode, reportingCycle, deactivationBlockers } = require('./hrOrg.service');
const { logHistory } = require('./hrRequests');

const LEVELS = {
  companies: {
    model: M.HrCompany, prefix: 'CO-', entity: 'company', required: ['name'],
    fields: ['name', 'trading_name', 'registration_no', 'tin', 'bin', 'address', 'phone', 'email', 'website', 'logo_url', 'policies'],
    children: [['divisions', 'company_id'], ['cost-centres', 'company_id']],
  },
  divisions: {
    model: M.HrDivision, prefix: 'DIV-', entity: 'division', required: ['name', 'company_id'], parent: 'company_id',
    fields: ['company_id', 'name', 'head_employee_id', 'business_function', 'website'],
    children: [['departments', 'division_id']],
  },
  departments: {
    model: M.HrDepartment, prefix: 'DEP-', entity: 'department', required: ['name', 'division_id'], parent: 'division_id',
    fields: ['division_id', 'name', 'manager_employee_id', 'location_branch_id', 'cost_centre_id'], costFields: ['cost_centre_id'],
    children: [['teams', 'department_id'], ['positions', 'department_id']],
    createKind: 'org.department.create', deactivateKind: 'org.restructure', governed: { division_id: 'org.restructure' },
  },
  teams: {
    model: M.HrTeam, prefix: 'TEAM-', entity: 'team', required: ['name', 'department_id'], parent: 'department_id',
    fields: ['department_id', 'name', 'leader_employee_id'],
    children: [['positions', 'team_id']],
  },
  positions: {
    model: M.HrPosition, prefix: 'POS-', entity: 'position', required: ['title', 'department_id'], parent: 'department_id',
    fields: ['department_id', 'team_id', 'title', 'reports_to_position_id', 'is_top', 'employment_type', 'salary_grade_id', 'job_description',
      'qualifications', 'experience', 'skills', 'approval_authority', 'headcount'],
    costFields: ['salary_grade_id'],
    children: [['positions', 'reports_to_position_id']],
    createKind: 'org.position.create', deactivateKind: 'org.position.deactivate',
    governed: { reports_to_position_id: 'org.reporting_line', salary_grade_id: 'org.salary_grade', title: 'org.restructure' },
  },
  'cost-centres': {
    model: M.HrCostCentre, prefix: 'CC-', entity: 'cost_centre', required: ['name'], cost: true,
    fields: ['company_id', 'name'],
    children: [['departments', 'cost_centre_id']],
  },
  'salary-grades': {
    model: M.HrSalaryGrade, prefix: 'GRD-', entity: 'salary_grade', required: ['name'], cost: true,
    fields: ['name', 'min_amount', 'max_amount'],
    children: [['positions', 'salary_grade_id']],
    governed: { min_amount: 'org.salary_grade', max_amount: 'org.salary_grade' },
  },
};
const LEVEL_BY_ENTITY = Object.fromEntries(Object.entries(LEVELS).map(([k, v]) => [v.entity, k]));

// Run inside the caller's transaction when there is one (an approval and its write commit together).
const inTx = (transaction, fn) => (transaction ? fn(transaction) : sequelize.transaction(fn));

const plain = (row) => (row ? row.get({ plain: true }) : null);
const only = (obj, keys) => Object.fromEntries(keys.filter((k) => obj[k] !== undefined).map((k) => [k, obj[k]]));

/** Create a row with the next code. Returns the plain row. */
const createEntity = async (level, data, req, { change_request_id = null, transaction: outer } = {}) => {
  const L = LEVELS[level];
  return inTx(outer, async (transaction) => {
    const last = await L.model.findOne({ where: { code: { [Op.like]: `${L.prefix}%` } }, order: [['id', 'DESC']], attributes: ['code'], transaction, lock: transaction.LOCK.UPDATE });
    const row = await L.model.create({
      ...only(data, L.fields), code: nextCode(L.prefix, last ? last.code : null), is_active: true,
      branch_id: req.user ? req.user.branch_id || null : null, created_by: req.user ? req.user.id : null,
    }, { transaction });
    const after = plain(row);
    await logHistory(req, L.entity, row.id, {}, { code: after.code, ...only(after, L.fields) }, { change_request_id, transaction });
    return after;
  });
};

/** Change fields on a row and log each change. Returns the plain row. */
const updateEntity = async (level, id, changes, req, { change_request_id = null, transaction: outer } = {}) => {
  const L = LEVELS[level];
  return inTx(outer, async (transaction) => {
    const row = await L.model.findByPk(id, { transaction, lock: transaction.LOCK.UPDATE });
    if (!row) throw Object.assign(new Error('Not found'), { status: 404 });
    const before = plain(row);
    await row.update(changes, { transaction });
    await logHistory(req, L.entity, row.id, only(before, Object.keys(changes)), changes, { change_request_id, transaction });
    return plain(row);
  });
};

/** Active rows directly under this one (child units, or positions reporting to a position). */
const activeChildren = async (level, id, transaction) => {
  let n = 0;
  for (const [childLevel, key] of LEVELS[level].children || []) {
    n += await LEVELS[childLevel].model.count({ where: { [key]: id, is_active: true }, transaction });
  }
  return n;
};

/** People in a seat-holding status placed in this unit or position (M1 §10: it cannot close while they are there). */
const activeEmployees = async (level, id, transaction) => {
  const { HrEmployee } = require('../models/hrEmployee');
  const employees = await HrEmployee.findAll({ where: { archived_at: null }, raw: true, transaction });
  return deactivationBlockers(LEVELS[level].entity, id, { employees }).activeEmployees;
};

/** "That would make a reporting loop: A → B → A", or null. */
const reportingLoopMessage = async (positionId, reportsToId, transaction) => {
  const positions = await M.HrPosition.findAll({ attributes: ['id', 'title', 'reports_to_position_id'], raw: true, transaction });
  const loop = reportingCycle(positionId, reportsToId, positions);
  if (!loop) return null;
  const title = (pid) => (positions.find((p) => Number(p.id) === Number(pid)) || {}).title || `#${pid}`;
  return `That would make a reporting loop: ${loop.map(title).join(' → ')}`;
};

module.exports = { LEVELS, LEVEL_BY_ENTITY, createEntity, updateEntity, activeChildren, activeEmployees, reportingLoopMessage, plain, only };
