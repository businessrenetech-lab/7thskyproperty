/**
 * /api/hr/exits (plan Task 28): offboarding ported from Hadi Real Estate. HR (off.manage) records how and when
 * someone leaves and who takes over; the status change is approved like any other (HR Manager, and the CEO for
 * a termination). HR ticks the checklist. The final settlement (the last month's pay less what is owed on a
 * loan) is worked out by payroll staff and sent to Accounts, who mark it paid.
 */
const { Op } = require('sequelize');
const { asyncHandler } = require('../utils/controllerHelpers');
const { HrExit, HrPayAdjustment } = require('../models/hrPay');
const { HrEmployee } = require('../models/hrEmployee');
const { HrChangeRequest } = require('../models/hrChange');
const access = require('../services/hrAccess.service');
const empRules = require('../services/hrEmployee.service');
const rules = require('../services/hrPay.service');
const payStore = require('../services/hrPayStore');
const exits = require('../services/hrExitStore');
const { raise } = require('../services/hrRequests');
const { notify, usersWithHrRole } = require('../services/hrRecruitmentStore');

const bad = (res, error, status = 400) => res.status(status).json({ error });
const may = (req, action) => access.can(req.hrRole, action, req.hrSettings);
const seesPay = (req) => ['pay.manage', 'pay.view', 'pay.pay'].some((a) => may(req, a));
const dateOk = (v) => /^\d{4}-\d{2}-\d{2}$/.test(v || '') && !Number.isNaN(Date.parse(`${v}T00:00:00Z`));
const ON_ROSTER = ['Probation', 'Active', 'Confirmed', 'Suspended', 'Onboarding'];

async function shape(req, rows) {
  const ids = rows.flatMap((r) => [r.employee_id, r.handover_employee_id]).filter(Boolean);
  const emps = ids.length ? await HrEmployee.findAll({ where: { id: ids }, attributes: ['id', 'employee_code', 'full_name', 'status'], raw: true }) : [];
  const crs = rows.some((r) => r.change_request_id) ? await HrChangeRequest.findAll({ where: { id: rows.map((r) => r.change_request_id).filter(Boolean) }, attributes: ['id', 'code', 'status'], raw: true }) : [];
  const pay = seesPay(req);
  return rows.map((r) => {
    const e = emps.find((x) => x.id === r.employee_id) || {};
    const h = emps.find((x) => x.id === r.handover_employee_id) || null;
    const cr = crs.find((c) => c.id === r.change_request_id) || null;
    const parse = (v, f) => { if (typeof v !== 'string') return v ?? f; try { return JSON.parse(v); } catch { return f; } };
    return {
      ...r, checklist: parse(r.checklist, []), settlement: pay ? parse(r.settlement, null) : undefined,
      status: exits.exitStatus(r, cr), request_code: cr ? cr.code : null,
      employee_code: e.employee_code, full_name: e.full_name, employee_status: e.status,
      handover: h ? { employee_code: h.employee_code, full_name: h.full_name } : null,
    };
  });
}

exports.meta = asyncHandler(async (req, res) => {
  const people = await HrEmployee.findAll({ where: { archived_at: null, status: ON_ROSTER }, attributes: ['employee_code', 'full_name'], order: [['full_name', 'ASC']], raw: true });
  res.json({ exitTypes: exits.EXIT_TYPES, checklist: exits.CHECKLIST, people, seesPay: seesPay(req), canPay: may(req, 'pay.pay') });
});

exports.list = asyncHandler(async (req, res) => {
  const rows = await HrExit.findAll({ order: [['created_at', 'DESC']], limit: 500, raw: true });
  res.json({ data: await shape(req, rows) });
});

exports.get = asyncHandler(async (req, res) => {
  const row = await HrExit.findByPk(req.params.id, { raw: true });
  if (!row) return bad(res, 'Exit not found', 404);
  const [out] = await shape(req, [row]);
  return res.json(out);
});

exports.create = asyncHandler(async (req, res) => {
  const b = req.body || {};
  if (!exits.EXIT_TYPES.includes(b.exit_type)) return bad(res, 'Choose resigned, terminated or retired');
  if (!b.reason || String(b.reason).trim().length < 5) return bad(res, 'Write the reason for leaving (at least 5 characters)');
  if (!dateOk(b.last_working_day)) return bad(res, 'Enter the last working day');
  if (b.notice_date && !dateOk(b.notice_date)) return bad(res, 'The notice date is not a real date');
  if (b.notice_date && b.notice_date > b.last_working_day) return bad(res, 'Notice is given before the last working day');
  const emp = await HrEmployee.findOne({ where: { employee_code: String(b.employee_code || ''), archived_at: null } });
  if (!emp) return bad(res, 'Choose an employee');
  if (!empRules.nextStatuses(emp.status).includes(b.exit_type)) return bad(res, `An employee who is ${emp.status} cannot become ${b.exit_type}`);
  const open = await HrExit.findOne({ where: { employee_id: emp.id, status: 'open' } });
  if (open) {
    const cr = open.change_request_id ? await HrChangeRequest.findByPk(open.change_request_id, { raw: true }) : null;
    if (!cr || cr.status !== 'rejected') return bad(res, 'An exit for this employee is already open', 409);
    await open.update({ status: 'cancelled' });
  }
  let handover = null;
  if (b.handover_employee_code) {
    handover = await HrEmployee.findOne({ where: { employee_code: String(b.handover_employee_code), archived_at: null, status: ON_ROSTER }, attributes: ['id'], raw: true });
    if (!handover || handover.id === emp.id) return bad(res, 'Choose someone else who works here to take over');
  }
  const reports = await HrEmployee.count({ where: { supervisor_employee_id: emp.id, archived_at: null, status: { [Op.in]: ON_ROSTER } } });
  if (reports && !handover) return bad(res, `${reports} ${reports === 1 ? 'person reports' : 'people report'} to ${emp.full_name}. Choose who takes over.`);
  let cr;
  try {
    cr = await raise(req, {
      kind: b.exit_type === 'Terminated' ? 'emp.termination' : 'emp.status', entity_type: 'employee', entity_id: emp.id,
      payload: { status: b.exit_type, exit_date: b.last_working_day }, before: { status: emp.status, exit_date: emp.exit_date || null },
      reason: String(b.reason).trim().slice(0, 2000),
    });
  } catch (err) { return bad(res, err.message, err.status || 500); }
  const row = await HrExit.create({
    employee_id: emp.id, exit_type: b.exit_type, reason: String(b.reason).trim().slice(0, 2000), notice_date: b.notice_date || null,
    last_working_day: b.last_working_day, handover_employee_id: handover ? handover.id : null, change_request_id: cr.id,
    checklist: exits.CHECKLIST.map((item) => ({ item, done: false })), status: 'open', created_by: req.user.id, branch_id: req.user.branch_id || null,
  });
  await notify(await usersWithHrRole(b.exit_type === 'Terminated' ? ['hr_manager', 'ceo'] : ['hr_manager']), req.user.branch_id,
    'Exit needs approval', `${cr.code}: ${emp.full_name} (${b.exit_type.toLowerCase()}, last day ${b.last_working_day}) is waiting for you.`);
  const [out] = await shape(req, [row.get({ plain: true })]);
  return res.status(202).json(out);
});

exports.tick = asyncHandler(async (req, res) => {
  const found = await exits.loadExit(req.params.id);
  if (!found) return bad(res, 'Exit not found', 404);
  if (['cancelled', 'rejected'].includes(found.status)) return bad(res, 'This exit is closed', 409);
  const { item, done } = req.body || {};
  const list = found.exit.checklist;
  if (!list.some((c) => c.item === item)) return bad(res, 'Unknown checklist item');
  const next = list.map((c) => (c.item === item ? { ...c, done: Boolean(done), by: Boolean(done) ? req.user.id : null, at: Boolean(done) ? new Date().toISOString() : null } : c));
  await found.exit.update({ checklist: next });
  const [out] = await shape(req, [found.exit.get({ plain: true })]);
  return res.json(out);
});

exports.settlement = asyncHandler(async (req, res) => {
  if (!may(req, 'pay.manage')) return bad(res, 'Payroll staff work out the settlement', 403);
  const found = await exits.loadExit(req.params.id);
  if (!found) return bad(res, 'Exit not found', 404);
  if (['cancelled', 'rejected'].includes(found.status)) return bad(res, 'This exit is closed', 409);
  if (['sent_to_accounts', 'paid'].includes(found.exit.settlement_status)) return bad(res, 'The settlement has gone to Accounts', 409);
  const emp = (await HrEmployee.findByPk(found.exit.employee_id)).get({ plain: true });
  const last = String(found.exit.last_working_day).slice(0, 10);
  const [y, m] = last.split('-').map(Number);
  const inputs = await payStore.monthInputs([emp.user_id], m, y);
  const window = rules.monthWindow({ joining_date: emp.joining_date, exit_date: last }, m, y);
  const leaves = inputs.leaves[emp.user_id] || [];
  const adjustments = (await HrPayAdjustment.findAll({ where: { employee_id: emp.id, month: m, year: y, status: 'approved' }, raw: true }));
  const s = rules.settlement(emp, { last_working_day: last }, {
    unpaidDays: window ? rules.unpaidDays(leaves, window, inputs.closed) : 0,
    absentDays: window ? rules.absentDays(inputs.attendance[emp.user_id] || [], window, inputs.closed, leaves) : 0,
    adjustments,
  });
  await found.exit.update({ settlement: { ...s, worked_out_at: new Date().toISOString(), worked_out_by: req.user.id }, settlement_status: 'calculated' });
  const [out] = await shape(req, [found.exit.get({ plain: true })]);
  return res.json(out);
});

exports.sendSettlement = asyncHandler(async (req, res) => {
  if (!may(req, 'pay.manage')) return bad(res, 'Payroll staff send the settlement', 403);
  const found = await exits.loadExit(req.params.id);
  if (!found) return bad(res, 'Exit not found', 404);
  if (found.exit.settlement_status !== 'calculated') return bad(res, 'Work out the settlement first', 409);
  if (found.status !== 'completed') return bad(res, 'The exit must be approved before the settlement goes to Accounts', 409);
  await found.exit.update({ settlement_status: 'sent_to_accounts' });
  await notify(await usersWithHrRole(['finance_manager']), req.user.branch_id, 'Final settlement to pay', `A final settlement is waiting in HR → Exits.`);
  const [out] = await shape(req, [found.exit.get({ plain: true })]);
  return res.json(out);
});

exports.settlementPaid = asyncHandler(async (req, res) => {
  if (!may(req, 'pay.pay')) return bad(res, 'Accounts marks a settlement paid', 403);
  const found = await exits.loadExit(req.params.id);
  if (!found) return bad(res, 'Exit not found', 404);
  if (found.exit.settlement_status !== 'sent_to_accounts') return bad(res, 'Only a settlement sent to Accounts can be marked paid', 409);
  const s = found.exit.settlement || {};
  await found.exit.update({ settlement: { ...s, paid_at: new Date().toISOString(), paid_by: req.user.id }, settlement_status: 'paid' });
  const adjIds = ((s.payslip && s.payslip.adjustment_ids) || []);
  if (adjIds.length) await HrPayAdjustment.update({ status: 'applied' }, { where: { id: adjIds, status: 'approved' } });
  const [out] = await shape(req, [found.exit.get({ plain: true })]);
  return res.json(out);
});

exports.cancel = asyncHandler(async (req, res) => {
  const found = await exits.loadExit(req.params.id);
  if (!found) return bad(res, 'Exit not found', 404);
  if (found.status === 'completed') return bad(res, 'The employee has already left. Re-hire them from their profile instead.', 409);
  if (found.status === 'open' && found.request && found.request.status === 'pending') return bad(res, 'The status change is waiting for approval. Ask the approver to reject it first.', 409);
  await found.exit.update({ status: 'cancelled' });
  const [out] = await shape(req, [found.exit.get({ plain: true })]);
  return res.json(out);
});
