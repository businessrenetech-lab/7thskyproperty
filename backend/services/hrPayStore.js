/**
 * Payroll storage (plan Task 27): loads what the pay rules need, writes runs and payslips, and applies the
 * Approvals-inbox decision. The rules themselves are in hrPay.service.js.
 *
 *   prepareRun  HR prepares (or re-prepares) a closed month: one payslip per person employed that month
 *   submitRun   raises pay.run; the CEO approves it in the Approvals inbox
 *   approveRun  applier for pay.run
 *   payRun      Accounts marks an approved month paid; its bonuses and deductions become applied and loan
 *               repayments reduce the loan balance
 *   reopenRun   the CEO sends an approved, unpaid month back to draft
 *
 * A run waiting for approval whose request was rejected reads as 'rejected' and may be prepared again.
 */
const { Op } = require('sequelize');
const sequelize = require('../config/db.config');
const { HrPayRun, HrPayslip, HrPayAdjustment } = require('../models/hrPay');
const { HrEmployee } = require('../models/hrEmployee');
const { HrChangeRequest } = require('../models/hrChange');
const LeaveRequest = require('../models/LeaveRequest');
const LeaveType = require('../models/LeaveType');
const StaffAttendance = require('../models/StaffAttendance');
const rules = require('./hrPay.service');
const { raise } = require('./hrRequests');
const { notify, usersWithHrRole } = require('./hrRecruitmentStore');

const fail = (status, message, extra = {}) => Object.assign(new Error(message), { status }, extra);
const plain = (r) => (r && r.get ? r.get({ plain: true }) : r);
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const monthName = (month, year) => `${MONTHS[Number(month) - 1]} ${year}`;
const dhakaToday = () => new Date(Date.now() + 6 * 3600000).toISOString().slice(0, 10);
const NOT_EMPLOYED = ['Applicant', 'Offer Accepted'];

/** The run's status as people see it: a rejected request puts it back in HR's hands. */
const effectiveStatus = (run, request) => (run.status === 'pending_approval' && request && request.status === 'rejected' ? 'rejected' : run.status);

async function loadRun(id, transaction) {
  const run = await HrPayRun.findByPk(id, { transaction, lock: transaction ? transaction.LOCK.UPDATE : undefined });
  if (!run) throw fail(404, 'Payroll month not found');
  const request = run.change_request_id ? await HrChangeRequest.findByPk(run.change_request_id, { transaction }) : null;
  return { run, request, status: effectiveStatus(run, request) };
}

/** Approved leave (with whether its type is paid), attendance and closed days for the month, per user. */
async function monthInputs(userIds, month, year) {
  const start = `${year}-${String(month).padStart(2, '0')}-01`;
  const end = new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);
  const ids = userIds.filter(Boolean);
  const [leaves, types, attendance, closedMap] = await Promise.all([
    ids.length ? LeaveRequest.findAll({ where: { user_id: ids, status: 'approved', start_date: { [Op.lte]: end }, end_date: { [Op.gte]: start } }, raw: true }) : [],
    LeaveType.findAll({ attributes: ['id', 'is_paid'], raw: true }),
    ids.length ? StaffAttendance.findAll({ where: { user_id: ids, date: { [Op.between]: [start, end] } }, attributes: ['user_id', 'date', 'status'], raw: true }) : [],
    require('./officeCalendar.service').closedDays(start, end),
  ]);
  const paid = Object.fromEntries(types.map((t) => [t.id, t.is_paid !== false && t.is_paid !== 0]));
  const by = (rows) => rows.reduce((m, r) => { (m[r.user_id] = m[r.user_id] || []).push(r); return m; }, {});
  return {
    leaves: by(leaves.map((l) => ({ ...l, is_paid: paid[l.leave_type_id] !== false }))),
    attendance: by(attendance),
    closed: new Set(closedMap.keys()),
  };
}

async function prepareRun(req, month, year) {
  const mo = Number(month);
  const yr = Number(year);
  if (!rules.canRunMonth(mo, yr, dhakaToday())) throw fail(400, 'A month can be prepared from the 1st of the next month, once it has closed.');
  const existing = await HrPayRun.findOne({ where: { month: mo, year: yr } });
  if (existing) {
    const { status } = await loadRun(existing.id);
    if (!['draft', 'rejected'].includes(status)) throw fail(409, `${monthName(mo, yr)} is ${status.replace('_', ' ')} and cannot be prepared again.`);
  }
  const employees = (await HrEmployee.findAll({ where: { archived_at: null, status: { [Op.notIn]: NOT_EMPLOYED } } })).map(plain);
  const inputs = await monthInputs(employees.map((e) => e.user_id), mo, yr);
  const adjustments = (await HrPayAdjustment.findAll({ where: { month: mo, year: yr, status: 'approved' } })).map(plain);
  const slips = [];
  const skipped = [];
  for (const e of employees) {
    const window = rules.monthWindow(e, mo, yr);
    if (!window) continue;
    if (!(rules.money(e.basic_salary) > 0)) { skipped.push({ employee_code: e.employee_code, full_name: e.full_name, reason: 'No basic salary on file' }); continue; }
    const leaves = inputs.leaves[e.user_id] || [];
    const slip = rules.payslip(e, window, {
      unpaidDays: rules.unpaidDays(leaves, window, inputs.closed),
      absentDays: rules.absentDays(inputs.attendance[e.user_id] || [], window, inputs.closed, leaves),
      adjustments: adjustments.filter((a) => a.employee_id === e.id),
    });
    slips.push({ employee_id: e.id, ...slip });
  }
  const total = (k) => rules.round2(slips.reduce((s, x) => s + x[k], 0));
  const run = await sequelize.transaction(async (transaction) => {
    let r = existing ? await HrPayRun.findByPk(existing.id, { transaction, lock: transaction.LOCK.UPDATE }) : null;
    const fields = {
      status: 'draft', change_request_id: null, employees: slips.length, gross_total: total('gross'), deduction_total: total('deduction_total'),
      net_total: total('net'), prepared_by: req.user.id, prepared_at: new Date(), approved_at: null,
    };
    if (r) {
      const old = await HrPayslip.findAll({ where: { run_id: r.id }, attributes: ['id'], transaction });
      if (old.length) await HrPayAdjustment.update({ payslip_id: null }, { where: { payslip_id: old.map((o) => o.id) }, transaction });
      await HrPayslip.destroy({ where: { run_id: r.id }, transaction });
      await r.update(fields, { transaction });
    } else {
      r = await HrPayRun.create({ ...fields, month: mo, year: yr, branch_id: req.user.branch_id || null }, { transaction });
    }
    for (const s of slips) {
      const row = await HrPayslip.create({ ...s, run_id: r.id }, { transaction });
      if (s.adjustment_ids.length) await HrPayAdjustment.update({ payslip_id: row.id }, { where: { id: s.adjustment_ids }, transaction });
    }
    return r;
  });
  return { run: plain(run), skipped };
}

async function submitRun(req, id) {
  const { run, status } = await loadRun(id);
  if (!['draft', 'rejected'].includes(status)) throw fail(409, 'Only a prepared month can be sent for approval.');
  if (!run.employees) throw fail(400, 'Nobody is paid in this month. Check salaries before sending it for approval.');
  const cr = await raise(req, {
    kind: 'pay.run', entity_type: 'pay_run', entity_id: run.id,
    payload: { month: monthName(run.month, run.year), employees: run.employees, gross_total: Number(run.gross_total), net_total: Number(run.net_total) },
    reason: (req.body && req.body.note) || null,
  });
  await run.update({ status: 'pending_approval', change_request_id: cr.id });
  await notify(await usersWithHrRole(['ceo']), req.user.branch_id, 'Payroll needs your approval', `${cr.code}: ${monthName(run.month, run.year)} payroll for ${run.employees} people is waiting for you.`);
  return { run: plain(run), request: plain(cr) };
}

/** Applier for pay.run. */
async function approveRun(request, req, { transaction } = {}) {
  const run = await HrPayRun.findByPk(request.entity_id, { transaction, lock: transaction ? transaction.LOCK.UPDATE : undefined });
  if (!run) throw fail(404, 'Payroll month not found');
  if (run.status !== 'pending_approval' || run.change_request_id !== request.id) throw fail(409, 'This payroll month was prepared again after this request. Send the new version for approval.');
  await run.update({ status: 'approved', approved_at: new Date() }, { transaction });
  await notify([run.prepared_by, ...(await usersWithHrRole(['finance_manager'], transaction))], run.branch_id, 'Payroll approved',
    `${monthName(run.month, run.year)} payroll is approved and ready to pay.`, transaction);
  return plain(run);
}

async function payRun(req, id, { payment_method, payment_reference }) {
  return sequelize.transaction(async (transaction) => {
    const { run, status } = await loadRun(id, transaction);
    if (status !== 'approved') throw fail(409, status === 'paid' ? 'This month is already paid.' : 'Only a month the CEO has approved can be paid.');
    const slips = await HrPayslip.findAll({ where: { run_id: run.id }, transaction });
    const adj = slips.length ? await HrPayAdjustment.findAll({ where: { payslip_id: slips.map((s) => s.id) }, transaction }) : [];
    for (const a of adj.filter((x) => x.direction === 'deduction' && x.type === 'loan_repayment')) {
      const emp = await HrEmployee.findByPk(a.employee_id, { transaction, lock: transaction.LOCK.UPDATE });
      if (emp) await emp.update({ loan_balance: Math.max(0, rules.round2(rules.money(emp.loan_balance) - rules.money(a.amount))) }, { transaction });
    }
    if (adj.length) await HrPayAdjustment.update({ status: 'applied' }, { where: { id: adj.map((a) => a.id) }, transaction });
    await run.update({ status: 'paid', paid_by: req.user.id, paid_at: new Date(), payment_method: payment_method || 'bank_transfer', payment_reference: payment_reference || null }, { transaction });
    const emps = slips.length ? await HrEmployee.findAll({ where: { id: slips.map((s) => s.employee_id) }, attributes: ['user_id'], raw: true, transaction }) : [];
    await notify(emps.map((e) => e.user_id), run.branch_id, 'Payslip ready', `Your payslip for ${monthName(run.month, run.year)} is ready in My HR.`, transaction);
    return plain(run);
  });
}

async function reopenRun(req, id) {
  const { run, status } = await loadRun(id);
  if (status !== 'approved') throw fail(409, 'Only an approved month that is not yet paid can be reopened.');
  await run.update({ status: 'draft', change_request_id: null, approved_at: null, notes: [run.notes, `Reopened ${new Date().toISOString().slice(0, 10)}${req.body && req.body.reason ? `: ${req.body.reason}` : ''}`].filter(Boolean).join('\n') });
  return plain(run);
}

module.exports = { fail, plain, monthName, effectiveStatus, loadRun, monthInputs, prepareRun, submitRun, approveRun, payRun, reopenRun };
