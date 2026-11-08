/**
 * Offboarding (plan Task 28), ported from Hadi Real Estate's staffOffboard.service: leaving is a record, never a
 * delete. HR records the exit and the status change goes through the usual approval (emp.status, or
 * emp.termination for a termination). When it is approved, hrAppliers calls completeExit: the people who
 * reported to the leaver move to the handover person, and the exit is completed. The login is switched off by
 * the employee update itself (hrEmployeeStore).
 */
const { Op } = require('sequelize');
const { HrExit } = require('../models/hrPay');
const { HrEmployee } = require('../models/hrEmployee');
const { HrChangeRequest } = require('../models/hrChange');
const { logHistory } = require('./hrRequests');

/** Hadi's offboarding checklist. */
const CHECKLIST = ['Company assets returned', 'Work handed over', 'Advances and loans cleared', 'Email and system access removed', 'ID card returned', 'Exit interview done'];
const EXIT_TYPES = ['Resigned', 'Terminated', 'Retired'];

/** open (waiting for approval), rejected, completed or cancelled. */
const exitStatus = (exit, request) => (exit.status === 'open' && request && request.status === 'rejected' ? 'rejected' : exit.status);

async function completeExit(request, req, { transaction } = {}) {
  const exit = await HrExit.findOne({ where: { change_request_id: request.id, status: 'open' }, transaction, lock: transaction ? transaction.LOCK.UPDATE : undefined });
  if (!exit) return null;
  if (exit.handover_employee_id) {
    const reports = await HrEmployee.findAll({ where: { supervisor_employee_id: exit.employee_id, archived_at: null, id: { [Op.ne]: exit.handover_employee_id } }, transaction });
    for (const r of reports) {
      const before = { supervisor_employee_id: r.supervisor_employee_id };
      await r.update({ supervisor_employee_id: exit.handover_employee_id }, { transaction });
      await logHistory(req, 'employee', r.id, before, { supervisor_employee_id: exit.handover_employee_id }, { change_request_id: request.id, transaction });
    }
  }
  await exit.update({ status: 'completed' }, { transaction });
  return exit;
}

async function loadExit(id) {
  const exit = await HrExit.findByPk(id);
  if (!exit) return null;
  const request = exit.change_request_id ? await HrChangeRequest.findByPk(exit.change_request_id, { attributes: ['id', 'code', 'status'], raw: true }) : null;
  return { exit, request, status: exitStatus(exit, request) };
}

module.exports = { CHECKLIST, EXIT_TYPES, exitStatus, completeExit, loadExit };
