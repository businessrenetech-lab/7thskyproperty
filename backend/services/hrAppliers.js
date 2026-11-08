/**
 * What happens when the last approver says yes (plan Tasks 6 and 11). One applier per change kind:
 * `async (request, req, { transaction }) → entity`. Organisation kinds write through hrOrgStore, employee kinds
 * through hrEmployeeStore; recruitment kinds are built in Task 19 and answer 501 until then.
 *
 * Each applier re-checks what may have changed while the request waited: a unit gained children, a reporting
 * line now closes a loop, a status move is no longer allowed, a required link went missing. A failed check
 * refuses the approval and leaves the request pending.
 */
const { KINDS, ORG_KINDS } = require('./hrApproval.service');
const { blockerMessage } = require('./hrOrg.service');
const { nextStatuses, missingLinks } = require('./hrEmployee.service');

const fail = (status, message) => Object.assign(new Error(message), { status });

const makeAppliers = (store) => {
  const { LEVEL_BY_ENTITY } = require('./hrOrgStore');
  const levelOf = (request) => {
    const level = LEVEL_BY_ENTITY[request.entity_type];
    if (!level) throw fail(400, `Unknown organisation item: ${request.entity_type}`);
    return level;
  };

  const create = (level) => (request, req, opts = {}) => store.createEntity(level, request.payload, req, { change_request_id: request.id, transaction: opts.transaction });

  const update = async (request, req, opts = {}) => {
    const level = levelOf(request);
    const payload = request.payload || {};
    if (payload.is_active === false) {
      const n = await store.activeChildren(level, request.entity_id, opts.transaction);
      const people = store.activeEmployees ? await store.activeEmployees(level, request.entity_id, opts.transaction) : 0;
      const msg = blockerMessage(request.entity_type.replace('_', ' '), { activeChildren: n, activeEmployees: people });
      if (msg) throw fail(409, msg);
    }
    if (payload.reports_to_position_id != null) {
      const loop = await store.reportingLoopMessage(request.entity_id, payload.reports_to_position_id, opts.transaction);
      if (loop) throw fail(400, loop);
    }
    const entity = await store.updateEntity(level, request.entity_id, payload, req, { change_request_id: request.id, transaction: opts.transaction });
    // M1 §9 "update employee reporting line": the people in this position move to the new supervisor.
    if (request.kind === 'org.reporting_line' && payload.reports_to_position_id != null && store.moveReports) {
      await store.moveReports(request.entity_id, payload.reports_to_position_id, req, { change_request_id: request.id, transaction: opts.transaction });
    }
    return entity;
  };

  const LOGIN_KEYS = { login_email: 'email', login_role: 'role' };
  const createEmployee = (request, req, opts = {}) => {
    const data = { ...(request.payload || {}) };
    const login = {};
    Object.entries(LOGIN_KEYS).forEach(([k, as]) => { if (k in data) { login[as] = data[k]; delete data[k]; } });
    return store.createEmployee(data, req, { change_request_id: request.id, transaction: opts.transaction, login });
  };

  const updateEmployee = async (request, req, opts = {}) => {
    const payload = request.payload || {};
    const emp = await store.getEmployee(request.entity_id, opts.transaction);
    if (!emp) throw fail(404, 'Employee not found');
    if (payload.status && payload.status !== emp.status && !nextStatuses(emp.status).includes(payload.status)) {
      throw fail(400, `An employee who is ${emp.status} cannot become ${payload.status}`);
    }
    const merged = { ...emp, ...payload };
    const gaps = missingLinks(merged, { topPosition: await store.isTopPosition(merged.position_id, opts.transaction) });
    if (gaps.length && ['company_id', 'division_id', 'department_id', 'position_id', 'supervisor_employee_id'].some((k) => k in payload)) {
      throw fail(400, `Required: ${gaps.join(', ')}`);
    }
    const updated = await store.updateEmployee(request.entity_id, payload, req, { change_request_id: request.id, transaction: opts.transaction });
    if (['Resigned', 'Terminated', 'Retired'].includes(payload.status)) await require('./hrExitStore').completeExit(request, req, { transaction: opts.transaction });
    return updated;
  };

  const out = {};
  KINDS.forEach((k) => { out[k] = async () => { throw fail(501, 'This kind of change is not available yet'); }; });
  ORG_KINDS.forEach((k) => { out[k] = update; });
  out['org.department.create'] = create('departments');
  out['org.position.create'] = create('positions');
  KINDS.filter((k) => k.startsWith('emp.')).forEach((k) => { out[k] = updateEmployee; });
  out['emp.create'] = createEmployee;
  return out;
};

const org = () => require('./hrOrgStore');
const emps = () => require('./hrEmployeeStore');
const appliers = makeAppliers({
  createEntity: (...a) => org().createEntity(...a),
  updateEntity: (...a) => org().updateEntity(...a),
  activeChildren: (...a) => org().activeChildren(...a),
  activeEmployees: (...a) => org().activeEmployees(...a),
  reportingLoopMessage: (...a) => org().reportingLoopMessage(...a),
  createEmployee: (...a) => emps().createEmployee(...a),
  updateEmployee: (...a) => emps().updateEmployee(...a),
  getEmployee: async (id, transaction) => {
    const { HrEmployee } = require('../models/hrEmployee');
    const row = await HrEmployee.findByPk(id, { transaction });
    return row ? row.get({ plain: true }) : null;
  },
  isTopPosition: async (positionId, transaction) => {
    if (!positionId) return false;
    const p = await require('../models/hrOrganisation').HrPosition.findByPk(positionId, { attributes: ['is_top'], transaction });
    return Boolean(p && p.is_top);
  },
  // Everyone in the position now reports to whoever holds the new parent position.
  moveReports: async (positionId, reportsToPositionId, req, opts) => {
    const { HrEmployee } = require('../models/hrEmployee');
    const boss = await emps().holderOf(reportsToPositionId, opts.transaction);
    if (!boss) return 0;
    const people = await HrEmployee.findAll({ where: { position_id: positionId, archived_at: null }, attributes: ['id', 'supervisor_employee_id'], transaction: opts.transaction });
    const moving = people.filter((p) => Number(p.supervisor_employee_id) !== Number(boss.id) && p.id !== boss.id);
    for (const p of moving) await emps().updateEmployee(p.id, { supervisor_employee_id: boss.id }, req, opts);
    return moving.length;
  },
});

// Recruitment (M3 §5, §21): the approved vacancy request is published; the approved hire becomes an employee.
const rec = () => require('./hrRecruitmentStore');
appliers['rec.vacancy'] = (...a) => rec().approveVacancy(...a);
appliers['rec.hire'] = (...a) => rec().hire(...a);
appliers['pay.run'] = (...a) => require('./hrPayStore').approveRun(...a);

module.exports = { appliers, makeAppliers };
