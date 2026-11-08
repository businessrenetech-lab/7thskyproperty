/**
 * /api/hr/payroll (plan Task 27), ported from Hadi Real Estate's payroll. HR (pay.manage) prepares a closed
 * month and its one-off bonuses and deductions, the CEO approves the month in the Approvals inbox, and
 * Accounts (pay.pay) marks it paid. Everyone sees their own paid payslips under /mine.
 */
const { Op } = require('sequelize');
const { asyncHandler } = require('../utils/controllerHelpers');
const { HrPayRun, HrPayslip, HrPayAdjustment } = require('../models/hrPay');
const { HrEmployee } = require('../models/hrEmployee');
const { HrChangeRequest } = require('../models/hrChange');
const Org = require('../models/hrOrganisation');
const User = require('../models/User');
const access = require('../services/hrAccess.service');
const rules = require('../services/hrPay.service');
const store = require('../services/hrPayStore');

const bad = (res, error, status = 400) => res.status(status).json({ error });
const send = (res, err) => {
  if (!err.status) throw err;
  return res.status(err.status).json({ error: err.message });
};
const may = (req, action) => access.can(req.hrRole, action, req.hrSettings);
const validMonth = (m, y) => Number.isInteger(Number(m)) && Number(m) >= 1 && Number(m) <= 12 && Number.isInteger(Number(y)) && Number(y) >= 2000 && Number(y) <= 2100;

async function employeeNames(ids) {
  const emps = ids.length ? await HrEmployee.findAll({ where: { id: [...new Set(ids)] }, attributes: ['id', 'employee_code', 'full_name', 'department_id', 'user_id', 'bank_name', 'bank_account_no', 'mobile_banking_no'], raw: true }) : [];
  const deps = await Org.HrDepartment.findAll({ where: { id: [...new Set(emps.map((e) => e.department_id).filter(Boolean))] }, attributes: ['id', 'name'], raw: true });
  const dep = Object.fromEntries(deps.map((d) => [d.id, d.name]));
  return Object.fromEntries(emps.map((e) => [e.id, { ...e, department_name: dep[e.department_id] || null }]));
}

async function shapeRuns(runs) {
  const crIds = runs.map((r) => r.change_request_id).filter(Boolean);
  const crs = crIds.length ? await HrChangeRequest.findAll({ where: { id: crIds }, attributes: ['id', 'code', 'status'], raw: true }) : [];
  const userIds = runs.flatMap((r) => [r.prepared_by, r.paid_by]).filter(Boolean);
  const users = userIds.length ? await User.findAll({ where: { id: userIds }, attributes: ['id', 'name'], raw: true }) : [];
  const uname = Object.fromEntries(users.map((u) => [u.id, u.name]));
  return runs.map((r) => {
    const cr = crs.find((c) => c.id === r.change_request_id) || null;
    return {
      ...r, label: store.monthName(r.month, r.year), status: store.effectiveStatus(r, cr), request_code: cr ? cr.code : null,
      prepared_by_name: uname[r.prepared_by] || null, paid_by_name: uname[r.paid_by] || null,
    };
  });
}

exports.meta = asyncHandler(async (req, res) => {
  const emps = await HrEmployee.findAll({ where: { archived_at: null, status: { [Op.notIn]: ['Applicant', 'Offer Accepted', 'Inactive'] } }, attributes: ['id', 'employee_code', 'full_name'], order: [['full_name', 'ASC']], raw: true });
  res.json({
    bonusTypes: rules.BONUS_TYPES, deductionTypes: rules.DEDUCTION_TYPES, employees: emps,
    canManage: may(req, 'pay.manage'), canPay: may(req, 'pay.pay'), canReopen: req.hrRole === 'ceo',
  });
});

exports.listRuns = asyncHandler(async (req, res) => {
  const runs = await HrPayRun.findAll({ order: [['year', 'DESC'], ['month', 'DESC']], raw: true });
  res.json({ data: await shapeRuns(runs) });
});

exports.prepare = asyncHandler(async (req, res) => {
  const { month, year } = req.body || {};
  if (!validMonth(month, year)) return bad(res, 'Choose a month and year');
  try {
    const out = await store.prepareRun(req, Number(month), Number(year));
    const [run] = await shapeRuns([out.run]);
    return res.status(201).json({ run, skipped: out.skipped });
  } catch (err) { return send(res, err); }
});

exports.getRun = asyncHandler(async (req, res) => {
  const run = await HrPayRun.findByPk(req.params.id, { raw: true });
  if (!run) return bad(res, 'Payroll month not found', 404);
  const slips = await HrPayslip.findAll({ where: { run_id: run.id }, raw: true });
  const names = await employeeNames(slips.map((s) => s.employee_id));
  const [shaped] = await shapeRuns([run]);
  const payslips = slips.map((s) => {
    const e = names[s.employee_id] || {};
    let lines = s.lines;
    if (typeof lines === 'string') { try { lines = JSON.parse(lines); } catch { lines = []; } }
    return {
      ...s, lines: lines || [], employee_code: e.employee_code, full_name: e.full_name, department_name: e.department_name,
      paid_to: e.bank_account_no ? `${e.bank_name || 'Bank'} ${e.bank_account_no}` : e.mobile_banking_no ? `Mobile banking ${e.mobile_banking_no}` : null,
    };
  }).sort((a, b) => String(a.full_name).localeCompare(String(b.full_name)));
  return res.json({ ...shaped, payslips });
});

exports.submit = asyncHandler(async (req, res) => {
  try { return res.status(202).json(await store.submitRun(req, req.params.id)); } catch (err) { return send(res, err); }
});

exports.pay = asyncHandler(async (req, res) => {
  const body = req.body || {};
  try {
    const run = await store.payRun(req, req.params.id, { payment_method: body.payment_method ? String(body.payment_method).slice(0, 30) : null, payment_reference: body.payment_reference ? String(body.payment_reference).slice(0, 120) : null });
    const [shaped] = await shapeRuns([run]);
    return res.json(shaped);
  } catch (err) { return send(res, err); }
});

exports.reopen = asyncHandler(async (req, res) => {
  if (req.hrRole !== 'ceo') return bad(res, 'Only the CEO can reopen an approved month', 403);
  try { const [shaped] = await shapeRuns([await store.reopenRun(req, req.params.id)]); return res.json(shaped); } catch (err) { return send(res, err); }
});

/** One payslip: payroll staff see any; an employee sees their own once the month is paid. */
exports.getPayslip = asyncHandler(async (req, res) => {
  const slip = await HrPayslip.findByPk(req.params.id, { raw: true });
  if (!slip) return bad(res, 'Payslip not found', 404);
  const run = await HrPayRun.findByPk(slip.run_id, { raw: true });
  const settings = await access.loadSettings();
  const ctx = req.hrContext || await access.loadContext(req.user);
  const role = access.hrRoleOf(req.user, ctx);
  const staff = ['pay.view', 'pay.manage', 'pay.pay'].some((a) => access.can(role, a, settings));
  const own = ctx.employee && ctx.employee.id === slip.employee_id && run.status === 'paid';
  if (!staff && !own) return bad(res, 'You do not have access to this payslip', 403);
  const e = (await employeeNames([slip.employee_id]))[slip.employee_id] || {};
  let lines = slip.lines;
  if (typeof lines === 'string') { try { lines = JSON.parse(lines); } catch { lines = []; } }
  return res.json({
    ...slip, lines: lines || [], month_label: store.monthName(run.month, run.year), run_status: run.status, paid_at: run.paid_at,
    payment_method: run.payment_method, employee_code: e.employee_code, full_name: e.full_name, department_name: e.department_name,
  });
});

exports.mine = asyncHandler(async (req, res) => {
  const ctx = req.hrContext || await access.loadContext(req.user);
  if (!ctx.employee) return res.json({ data: [] });
  const slips = await HrPayslip.findAll({ where: { employee_id: ctx.employee.id }, attributes: ['id', 'run_id', 'gross', 'deduction_total', 'net'], raw: true });
  const runs = slips.length ? await HrPayRun.findAll({ where: { id: slips.map((s) => s.run_id), status: 'paid' }, raw: true }) : [];
  const data = runs.map((r) => ({ ...slips.find((s) => s.run_id === r.id), month: r.month, year: r.year, label: store.monthName(r.month, r.year), paid_at: r.paid_at }))
    .sort((a, b) => b.year - a.year || b.month - a.month);
  return res.json({ data });
});

/* One-off bonuses and deductions (Hadi PayrollBonus / PayrollDeduction). */

async function monthLocked(month, year) {
  const run = await HrPayRun.findOne({ where: { month, year }, raw: true });
  if (!run) return null;
  const cr = run.change_request_id ? await HrChangeRequest.findByPk(run.change_request_id, { raw: true }) : null;
  const status = store.effectiveStatus(run, cr);
  return ['draft', 'rejected'].includes(status) ? null : status;
}

exports.listAdjustments = asyncHandler(async (req, res) => {
  const where = {};
  if (req.query.month) where.month = Number(req.query.month);
  if (req.query.year) where.year = Number(req.query.year);
  if (req.query.status) where.status = String(req.query.status).split(',');
  const rows = await HrPayAdjustment.findAll({ where, order: [['created_at', 'DESC']], limit: 500, raw: true });
  const names = await employeeNames(rows.map((r) => r.employee_id));
  const users = await User.findAll({ where: { id: rows.flatMap((r) => [r.created_by, r.decided_by]).filter(Boolean) }, attributes: ['id', 'name'], raw: true });
  const uname = Object.fromEntries(users.map((u) => [u.id, u.name]));
  res.json({
    data: rows.map((r) => ({
      ...r, employee_code: (names[r.employee_id] || {}).employee_code, full_name: (names[r.employee_id] || {}).full_name,
      created_by_name: uname[r.created_by] || null, decided_by_name: uname[r.decided_by] || null, mine: r.created_by === req.user.id,
    })),
  });
});

exports.createAdjustment = asyncHandler(async (req, res) => {
  const b = req.body || {};
  const direction = b.direction === 'bonus' ? 'bonus' : b.direction === 'deduction' ? 'deduction' : null;
  if (!direction) return bad(res, 'Choose a bonus or a deduction');
  const types = direction === 'bonus' ? rules.BONUS_TYPES : rules.DEDUCTION_TYPES;
  if (!types.includes(b.type)) return bad(res, 'Choose a type');
  const amount = rules.round2(Number(b.amount));
  if (!(amount > 0) || amount > 100000000) return bad(res, 'Enter an amount above 0');
  if (!validMonth(b.month, b.year)) return bad(res, 'Choose the month it belongs to');
  if (!b.reason || String(b.reason).trim().length < 3) return bad(res, 'Write the reason');
  const emp = await HrEmployee.findOne({ where: { employee_code: String(b.employee_code || '') }, attributes: ['id'], raw: true });
  if (!emp) return bad(res, 'Choose an employee');
  const locked = await monthLocked(Number(b.month), Number(b.year));
  if (locked) return bad(res, `${store.monthName(b.month, b.year)} payroll is ${locked.replace('_', ' ')}. Add it to a later month.`, 409);
  const row = await HrPayAdjustment.create({
    employee_id: emp.id, direction, type: b.type, amount, month: Number(b.month), year: Number(b.year), reason: String(b.reason).trim().slice(0, 2000),
    status: 'pending', created_by: req.user.id, branch_id: req.user.branch_id || null,
  });
  return res.status(201).json(row);
});

exports.decideAdjustment = asyncHandler(async (req, res) => {
  const decision = req.body && req.body.decision;
  if (!['approve', 'reject'].includes(decision)) return bad(res, 'Approve or reject');
  const row = await HrPayAdjustment.findByPk(req.params.id);
  if (!row) return bad(res, 'Not found', 404);
  if (row.status !== 'pending') return bad(res, 'This one has already been decided', 409);
  if (row.created_by === req.user.id) return bad(res, 'Someone else must approve what you added', 403);
  const locked = await monthLocked(row.month, row.year);
  if (locked && decision === 'approve') return bad(res, `${store.monthName(row.month, row.year)} payroll is ${locked.replace('_', ' ')}. Add it to a later month.`, 409);
  await row.update({ status: decision === 'approve' ? 'approved' : 'rejected', decided_by: req.user.id, decided_at: new Date() });
  return res.json(row);
});

exports.deleteAdjustment = asyncHandler(async (req, res) => {
  const row = await HrPayAdjustment.findByPk(req.params.id);
  if (!row) return bad(res, 'Not found', 404);
  if (row.status !== 'pending') return bad(res, 'Only a pending one can be removed', 409);
  await row.destroy();
  return res.status(204).end();
});
