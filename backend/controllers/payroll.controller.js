const User = require('../models/User');
const StaffProfile = require('../models/StaffProfile');
const StaffPayRule = require('../models/StaffPayRule');
const TeacherSession = require('../models/TeacherSession');
const PayrollDeduction = require('../models/PayrollDeduction');
const PayrollBonus = require('../models/PayrollBonus');
const Payroll = require('../models/Payroll');
const Account = require('../models/Account');
const Expense = require('../models/Expense');
const AuditLog = require('../models/AuditLog');
const Batch = require('../models/Batch');
const Course = require('../models/Course');
const sequelize = require('../config/db.config');
const { Op } = require('sequelize');

const money = (value) => Number.parseFloat(value || 0) || 0;

const normalizeEmploymentType = (value) => {
  if (value === 'permanent') return 'full_time';
  return value || 'full_time';
};

const normalizeSalaryMode = (value) => {
  if (value === 'monthly') return 'fixed';
  if (value === 'per_class') return 'session_class';
  if (value === 'per_hour') return 'hourly';
  if (value === 'per_student') return 'session_class';
  return value || 'fixed';
};

const legacyPayType = (salaryMode) => {
  if (salaryMode === 'session_class') return 'per_class';
  if (salaryMode === 'hourly') return 'per_hour';
  if (salaryMode === 'manual') return 'manual';
  return 'monthly';
};

const normalizeExpenseMethod = (method, account) => {
  const source = account?.sub_type || method || 'cash';
  if (source === 'bank') return 'bank_transfer';
  if (source === 'mfs') return 'bkash';
  if (['cash', 'bkash', 'nagad', 'bank_transfer', 'card'].includes(source)) return source;
  return method === 'bank' ? 'bank_transfer' : 'cash';
};

const writePayrollAudit = (req, action, entityId, newValue, transaction) => AuditLog.create({
  user_id: req.user?.id,
  branch_id: req.branchId,
  action,
  entity: 'Payroll',
  entity_id: entityId,
  new_value: newValue,
}, { transaction });

const monthBounds = (month, year) => {
  const paddedMonth = String(month).padStart(2, '0');
  const lastDay = new Date(Number(year), Number(month), 0).getDate();
  return {
    startDate: `${year}-${paddedMonth}-01`,
    endDate: `${year}-${paddedMonth}-${String(lastDay).padStart(2, '0')}`,
  };
};

const dateOnly = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

const parseDateOnly = (value) => {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
};

const daysInclusive = (start, end) => Math.floor((end - start) / 86400000) + 1;

const getActiveWindow = (profile, month, year) => {
  const { startDate, endDate } = monthBounds(month, year);
  const monthStart = parseDateOnly(startDate);
  const monthEnd = parseDateOnly(endDate);
  const joinDate = parseDateOnly(profile?.joining_date);
  const exitDate = parseDateOnly(profile?.exit_date);

  if (joinDate && joinDate > monthEnd) return null;
  if (exitDate && exitDate < monthStart) return null;

  const activeStart = joinDate && joinDate > monthStart ? joinDate : monthStart;
  const activeEnd = exitDate && exitDate < monthEnd ? exitDate : monthEnd;
  if (activeStart > activeEnd) return null;

  const daysInMonth = daysInclusive(monthStart, monthEnd);
  const activeDays = daysInclusive(activeStart, activeEnd);

  return {
    startDate: dateOnly(activeStart),
    endDate: dateOnly(activeEnd),
    activeDays,
    daysInMonth,
    factor: activeDays / daysInMonth,
    joining_date_missing: !profile?.joining_date,
  };
};

const canFinalizePayroll = (month, year) => {
  const today = new Date();
  const currentMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const payrollMonthStart = new Date(Number(year), Number(month) - 1, 1);
  return payrollMonthStart < currentMonthStart;
};

const calculateSessionAmount = ({ pay_basis, rate, duration_hours, student_count, amount }) => {
  const parsedRate = money(rate);
  if (pay_basis === 'per_hour') return parsedRate * money(duration_hours || 1);
  if (pay_basis === 'per_student') return parsedRate * Number.parseInt(student_count || 0, 10);
  if (pay_basis === 'manual') return money(amount);
  return parsedRate;
};

const calculatePayrollAmounts = (profile, payRule, sessionSummary, activeWindow, approvedDeductionTotal = 0, approvedBonusTotal = 0) => {
  const salaryMode = normalizeSalaryMode(payRule?.salary_mode || payRule?.pay_type);
  const factor = activeWindow?.factor ?? 1;
  const baseSalary = ['fixed', 'manual'].includes(salaryMode)
    ? money(payRule?.base_salary ?? profile.base_salary) * factor
    : 0;
  const festivalBonus = money(payRule?.festival_bonus);
  const conveyanceFee = money(payRule?.conveyance_fee) * factor;
  const otherAllowance = money(payRule?.other_allowance) * factor;
  const deduction = money(payRule?.deduction) + money(approvedDeductionTotal);
  const variablePay = ['session_class', 'hourly', 'manual'].includes(salaryMode) ? money(sessionSummary.amount) : 0;
  const oneTimeBonus = money(approvedBonusTotal);
  const allowances = festivalBonus + conveyanceFee + otherAllowance + variablePay + oneTimeBonus;

  return {
    salaryMode,
    baseSalary,
    festivalBonus,
    conveyanceFee,
    otherAllowance,
    oneTimeBonus,
    variablePay,
    deduction,
    allowances,
    netSalary: Math.max(0, baseSalary + allowances - deduction),
  };
};

const summarizeSessions = (sessions) => sessions.reduce((summary, session) => {
  summary.session_count += 1;
  summary.total_hours += money(session.duration_hours);
  summary.student_count += Number.parseInt(session.student_count || 0, 10);
  summary.amount += money(session.amount);
  return summary;
}, { session_count: 0, total_hours: 0, student_count: 0, amount: 0 });

const getApprovedSessions = (teacherId, branchId, month, year, activeWindow = null) => {
  const bounds = monthBounds(month, year);
  const startDate = activeWindow?.startDate || bounds.startDate;
  const endDate = activeWindow?.endDate || bounds.endDate;
  return TeacherSession.findAll({
    where: {
      teacher_id: teacherId,
      branch_id: branchId,
      status: 'approved',
      session_date: { [Op.between]: [startDate, endDate] },
    },
  });
};

const getApprovedDeductions = (staffId, branchId, month, year) => PayrollDeduction.findAll({
  where: {
    staff_id: staffId,
    branch_id: branchId,
    month,
    year,
    status: 'approved',
  },
});

const getApprovedBonuses = (staffId, branchId, month, year) => PayrollBonus.findAll({
  where: {
    staff_id: staffId,
    branch_id: branchId,
    month,
    year,
    status: 'approved',
  },
});

exports.getStaff = async (req, res) => {
  try {
    const branchId = req.branchId;
    const staff = await User.findAll({
      where: { 
        branch_id: branchId,
        role: { [Op.not]: 'student' }
      },
      include: [{ model: StaffProfile }, { model: StaffPayRule }],
      attributes: ['id', 'name', 'email', 'role', 'status']
    });
    res.json(staff);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateStaffProfile = async (req, res) => {
  try {
    const { 
      user_id, designation, base_salary, bank_name, account_no,
      father_name, mother_name, address, contact_details, educational_background, work_experience, joining_date,
      employment_status, exit_date, exit_reason, notice_start_date, notice_end_date,
      final_settlement_status, final_settlement_notes,
      employment_type, salary_mode, work_shift, pay_type, class_rate, hourly_rate, student_rate,
      festival_bonus, conveyance_fee, other_allowance, deduction, is_payroll_active
    } = req.body;
    const staff = await User.findOne({ where: { id: user_id, branch_id: req.branchId, role: { [Op.not]: 'student' } } });
    if (!staff) return res.status(404).json({ error: 'Staff not found.' });

    let profile = await StaffProfile.findOne({ where: { user_id, branch_id: req.branchId } });

    if (profile) {
      await profile.update({ 
        designation, base_salary, bank_name, account_no,
        father_name, mother_name, address, contact_details, educational_background, work_experience, joining_date,
        employment_status, exit_date, exit_reason, notice_start_date, notice_end_date,
        final_settlement_status, final_settlement_notes
      });
    } else {
      profile = await StaffProfile.create({
        user_id,
        branch_id: req.branchId,
        designation,
        base_salary,
        bank_name,
        account_no,
        father_name, mother_name, address, contact_details, educational_background, work_experience, joining_date,
        employment_status, exit_date, exit_reason, notice_start_date, notice_end_date,
        final_settlement_status, final_settlement_notes
      });
    }

    const normalizedSalaryMode = normalizeSalaryMode(salary_mode || pay_type);
    const payRulePayload = {
      user_id,
      branch_id: req.branchId,
      employment_type: normalizeEmploymentType(employment_type),
      salary_mode: normalizedSalaryMode,
      work_shift: work_shift || 'both',
      pay_type: pay_type || legacyPayType(normalizedSalaryMode),
      base_salary: money(base_salary),
      class_rate: money(class_rate),
      hourly_rate: money(hourly_rate),
      student_rate: money(student_rate),
      festival_bonus: money(festival_bonus),
      conveyance_fee: money(conveyance_fee),
      other_allowance: money(other_allowance),
      deduction: money(deduction),
      is_payroll_active: is_payroll_active !== false,
    };

    const existingRule = await StaffPayRule.findOne({ where: { user_id, branch_id: req.branchId } });
    if (existingRule) {
      await existingRule.update(payRulePayload);
    } else {
      await StaffPayRule.create(payRulePayload);
    }

    res.json(profile);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateStaffStatus = async (req, res) => {
  try {
    const { employment_status, exit_date, exit_reason, notice_start_date, notice_end_date, final_settlement_notes } = req.body;
    const staff = await User.findOne({ where: { id: req.params.id, branch_id: req.branchId } });
    if (!staff) return res.status(404).json({ error: 'Staff not found.' });

    const userStatus = ['resigned', 'terminated', 'inactive'].includes(employment_status)
      ? 'inactive'
      : employment_status === 'suspended'
        ? 'suspended'
        : 'active';

    await staff.update({ status: userStatus });

    const [profile] = await StaffProfile.findOrCreate({
      where: { user_id: staff.id, branch_id: req.branchId },
      defaults: {
        user_id: staff.id,
        branch_id: req.branchId,
        designation: staff.role || 'Staff',
        base_salary: 0,
      },
    });

    await profile.update({
      employment_status: employment_status || 'active',
      exit_date: exit_date || null,
      exit_reason: exit_reason || null,
      notice_start_date: notice_start_date || null,
      notice_end_date: notice_end_date || null,
      final_settlement_notes: final_settlement_notes || null,
      final_settlement_status: ['resigned', 'terminated', 'inactive'].includes(employment_status) ? 'calculated' : 'pending',
    });

    await AuditLog.create({
      user_id: req.user?.id,
      branch_id: req.branchId,
      action: 'UPDATE_STATUS',
      entity: 'StaffProfile',
      entity_id: profile.id,
      new_value: { staff_id: staff.id, employment_status, exit_date, exit_reason },
    });

    res.json({ message: 'Staff status updated.', staff, profile });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getPayrollHistory = async (req, res) => {
  try {
    const { month, year } = req.query;
    const where = { branch_id: req.branchId };
    if (month) where.month = month;
    if (year) where.year = year;

    const payrolls = await Payroll.findAll({
      where,
      include: [{ model: User, as: 'Staff', attributes: ['name'] }]
    });

    const enrichedPayrolls = await Promise.all(payrolls.map(async (payroll) => {
      const item = payroll.toJSON();
      const [payRule, expense, sessions, deductions, bonuses] = await Promise.all([
        StaffPayRule.findOne({ where: { user_id: item.staff_id, branch_id: item.branch_id } }),
        item.expense_id ? Expense.findOne({ where: { id: item.expense_id, branch_id: item.branch_id } }) : Expense.findOne({ where: { payroll_id: item.id, branch_id: item.branch_id } }),
        getApprovedSessions(item.staff_id, item.branch_id, month, year),
        PayrollDeduction.findAll({ where: { staff_id: item.staff_id, branch_id: item.branch_id, month: item.month, year: item.year } }),
        PayrollBonus.findAll({ where: { staff_id: item.staff_id, branch_id: item.branch_id, month: item.month, year: item.year } }),
      ]);
      item.pay_rule = payRule ? payRule.toJSON() : null;
      item.accounting_expense = expense ? expense.toJSON() : null;
      item.session_summary = summarizeSessions(sessions);
      item.deductions_detail = deductions.map(deduction => deduction.toJSON());
      item.deductions_summary = deductions.reduce((summary, deduction) => {
        const status = deduction.status || 'pending';
        summary[status] = (summary[status] || 0) + money(deduction.amount);
        summary.total_count += 1;
        return summary;
      }, { total_count: 0, approved: 0, pending: 0, applied: 0, rejected: 0 });
      item.bonuses_detail = bonuses.map(bonus => bonus.toJSON());
      item.bonuses_summary = bonuses.reduce((summary, bonus) => {
        const status = bonus.status || 'pending';
        summary[status] = (summary[status] || 0) + money(bonus.amount);
        summary.total_count += 1;
        return summary;
      }, { total_count: 0, approved: 0, pending: 0, applied: 0, rejected: 0 });
      return item;
    }));

    res.json(enrichedPayrolls);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getDeductions = async (req, res) => {
  try {
    const { month, year, staff_id } = req.query;
    const where = { branch_id: req.branchId };
    if (month) where.month = month;
    if (year) where.year = year;
    if (staff_id) where.staff_id = staff_id;

    const deductions = await PayrollDeduction.findAll({
      where,
      include: [{ model: User, as: 'Staff', attributes: ['id', 'name', 'role'] }],
      order: [['year', 'DESC'], ['month', 'DESC'], ['id', 'DESC']],
    });
    res.json(deductions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.createDeduction = async (req, res) => {
  try {
    const staff = await User.findOne({ where: { id: req.body.staff_id, branch_id: req.branchId, role: { [Op.not]: 'student' } } });
    if (!staff) return res.status(404).json({ error: 'Staff not found.' });

    const deduction = await PayrollDeduction.create({
      staff_id: req.body.staff_id,
      branch_id: req.branchId,
      month: req.body.month,
      year: req.body.year,
      deduction_type: req.body.deduction_type || 'other',
      source: req.body.source || 'manual',
      amount: money(req.body.amount),
      reason: req.body.reason,
      status: req.body.status || 'approved',
      created_by: req.user?.id,
      approved_by: (req.body.status || 'approved') === 'approved' ? req.user?.id : null,
    });
    await AuditLog.create({
      user_id: req.user?.id,
      branch_id: req.branchId,
      action: 'CREATE_DEDUCTION',
      entity: 'PayrollDeduction',
      entity_id: deduction.id,
      new_value: deduction.toJSON(),
    });
    res.status(201).json(deduction);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateDeduction = async (req, res) => {
  try {
    const deduction = await PayrollDeduction.findOne({ where: { id: req.params.id, branch_id: req.branchId } });
    if (!deduction) return res.status(404).json({ error: 'Deduction not found.' });

    const nextData = { ...req.body };
    delete nextData.branch_id;
    if (nextData.amount !== undefined) nextData.amount = money(nextData.amount);
    if (nextData.status === 'approved' && deduction.status !== 'approved') nextData.approved_by = req.user?.id;
    await deduction.update(nextData);
    res.json(deduction);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.deleteDeduction = async (req, res) => {
  try {
    const deduction = await PayrollDeduction.findOne({ where: { id: req.params.id, branch_id: req.branchId } });
    if (!deduction) return res.status(404).json({ error: 'Deduction not found.' });
    if (deduction.status === 'applied') return res.status(400).json({ error: 'Applied deductions cannot be deleted.' });
    await deduction.destroy();
    res.json({ message: 'Deduction removed.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getBonuses = async (req, res) => {
  try {
    const { month, year, staff_id } = req.query;
    const where = { branch_id: req.branchId };
    if (month) where.month = month;
    if (year) where.year = year;
    if (staff_id) where.staff_id = staff_id;

    const bonuses = await PayrollBonus.findAll({
      where,
      include: [{ model: User, as: 'Staff', attributes: ['id', 'name', 'role'] }],
      order: [['year', 'DESC'], ['month', 'DESC'], ['id', 'DESC']],
    });
    res.json(bonuses);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.createBonus = async (req, res) => {
  try {
    const staff = await User.findOne({ where: { id: req.body.staff_id, branch_id: req.branchId, role: { [Op.not]: 'student' } } });
    if (!staff) return res.status(404).json({ error: 'Staff not found.' });

    const bonus = await PayrollBonus.create({
      staff_id: req.body.staff_id,
      branch_id: req.branchId,
      month: req.body.month,
      year: req.body.year,
      bonus_type: req.body.bonus_type || 'performance_bonus',
      source: req.body.source || 'manual',
      amount: money(req.body.amount),
      reason: req.body.reason,
      status: req.body.status || 'approved',
      created_by: req.user?.id,
      approved_by: (req.body.status || 'approved') === 'approved' ? req.user?.id : null,
    });
    await AuditLog.create({
      user_id: req.user?.id,
      branch_id: req.branchId,
      action: 'CREATE_BONUS',
      entity: 'PayrollBonus',
      entity_id: bonus.id,
      new_value: bonus.toJSON(),
    });
    res.status(201).json(bonus);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateBonus = async (req, res) => {
  try {
    const bonus = await PayrollBonus.findOne({ where: { id: req.params.id, branch_id: req.branchId } });
    if (!bonus) return res.status(404).json({ error: 'Bonus not found.' });

    const nextData = { ...req.body };
    delete nextData.branch_id;
    if (nextData.amount !== undefined) nextData.amount = money(nextData.amount);
    if (nextData.status === 'approved' && bonus.status !== 'approved') nextData.approved_by = req.user?.id;
    await bonus.update(nextData);
    res.json(bonus);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.deleteBonus = async (req, res) => {
  try {
    const bonus = await PayrollBonus.findOne({ where: { id: req.params.id, branch_id: req.branchId } });
    if (!bonus) return res.status(404).json({ error: 'Bonus not found.' });
    if (bonus.status === 'applied') return res.status(400).json({ error: 'Applied bonuses cannot be deleted.' });
    await bonus.destroy();
    res.json({ message: 'Bonus removed.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getTeacherSessions = async (req, res) => {
  try {
    const { month, year, teacher_id } = req.query;
    const where = { branch_id: req.branchId };
    if (month && year) {
      const { startDate, endDate } = monthBounds(month, year);
      where.session_date = { [Op.between]: [startDate, endDate] };
    }
    if (teacher_id) where.teacher_id = teacher_id;

    const sessions = await TeacherSession.findAll({
      where,
      include: [
        { model: User, as: 'Teacher', attributes: ['id', 'name', 'role'] },
        { model: Batch, attributes: ['id', 'name', 'code'], required: false },
        { model: Course, attributes: ['id', 'title'], required: false },
      ],
      order: [['session_date', 'DESC'], ['id', 'DESC']],
    });
    res.json(sessions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.createTeacherSession = async (req, res) => {
  try {
    const teacher = req.body.teacher_id ? await User.findOne({ where: { id: req.body.teacher_id, branch_id: req.branchId } }) : null;
    if (req.body.teacher_id && !teacher) return res.status(404).json({ error: 'Teacher not found.' });

    const payRule = req.body.teacher_id ? await StaffPayRule.findOne({ where: { user_id: req.body.teacher_id, branch_id: req.branchId } }) : null;
    const payBasis = req.body.pay_basis || (normalizeSalaryMode(payRule?.salary_mode || payRule?.pay_type) === 'hourly' ? 'per_hour' : 'per_class');
    const fallbackRate = payBasis === 'per_hour' ? payRule?.hourly_rate : payRule?.class_rate;
    const payload = {
      ...req.body,
      pay_basis: payBasis,
      rate: req.body.rate === '' || req.body.rate === undefined ? money(fallbackRate) : req.body.rate,
      branch_id: req.branchId,
    };
    payload.amount = calculateSessionAmount(payload);
    if (payload.status === 'approved') {
      payload.approved_by = req.user.id;
      payload.approved_at = new Date();
    }
    const session = await TeacherSession.create(payload);
    res.status(201).json(session);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateTeacherSession = async (req, res) => {
  try {
    const session = await TeacherSession.findOne({ where: { id: req.params.id, branch_id: req.branchId } });
    if (!session) return res.status(404).json({ error: 'Teacher session not found.' });

    const nextData = { ...req.body };
    delete nextData.branch_id;
    nextData.amount = calculateSessionAmount({ ...session.toJSON(), ...nextData });
    if (nextData.status === 'approved' && session.status !== 'approved') {
      nextData.approved_by = req.user.id;
      nextData.approved_at = new Date();
    }
    await session.update(nextData);
    res.json(session);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.deleteTeacherSession = async (req, res) => {
  try {
    const session = await TeacherSession.findOne({ where: { id: req.params.id, branch_id: req.branchId } });
    if (!session) return res.status(404).json({ error: 'Teacher session not found.' });
    await session.destroy();
    res.json({ message: 'Teacher session deleted.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.generateDraftPayroll = async (req, res) => {
  try {
    const { month, year } = req.body;
    const branchId = req.branchId;

    if (!canFinalizePayroll(month, year)) {
      return res.status(400).json({ error: 'Payroll can be generated from the 1st day of the next month after the salary month closes.' });
    }

    // ── Guard: block if payroll for this month is already fully completed ──
    const existingPayrolls = await Payroll.findAll({ where: { branch_id: branchId, month, year } });
    if (existingPayrolls.length > 0) {
      const allCompleted = existingPayrolls.every(p => ['paid', 'pending_accounting', 'pending_admin'].includes(p.status));
      if (allCompleted) {
        return res.status(400).json({
          error: `Payroll for ${month}/${year} is already completed (${existingPayrolls.length} records paid/pending). Wait for the next month to generate a new payroll.`,
        });
      }
    }

    // Get all staff with profiles in this branch
    const staffMembers = await User.findAll({
      where: {
        branch_id: branchId,
        role: { [Op.notIn]: ['student', 'guardian'] },
      },
      include: [{ model: StaffProfile, required: true }, { model: StaffPayRule, required: false }],
    });
    
    if (staffMembers.length === 0) {
      return res.status(400).json({ error: 'No staff profiles found for this branch. Please set up salaries first.' });
    }

    const payrollDrafts = await Promise.all(staffMembers.map(async (staff) => {
      const profile = staff.StaffProfile;
      const payRule = staff.StaffPayRule;
      if (payRule && payRule.is_payroll_active === false) return null;

      const activeWindow = getActiveWindow(profile, month, year);
      if (!activeWindow) return null;

      const inactiveWithoutExit = staff.status !== 'active' && !profile.exit_date;
      if (inactiveWithoutExit) return null;

      const [sessions, approvedDeductions, approvedBonuses] = await Promise.all([
        getApprovedSessions(staff.id, branchId, month, year, activeWindow),
        getApprovedDeductions(staff.id, branchId, month, year),
        getApprovedBonuses(staff.id, branchId, month, year),
      ]);
      const sessionSummary = summarizeSessions(sessions);
      const approvedDeductionTotal = approvedDeductions.reduce((sum, deduction) => sum + money(deduction.amount), 0);
      const approvedBonusTotal = approvedBonuses.reduce((sum, bonus) => sum + money(bonus.amount), 0);
      const amounts = calculatePayrollAmounts(profile, payRule, sessionSummary, activeWindow, approvedDeductionTotal, approvedBonusTotal);

      return {
        staff_id: staff.id,
        branch_id: branchId,
        month,
        year,
        base_salary: amounts.baseSalary,
        allowances: amounts.allowances,
        deductions: amounts.deduction,
        net_salary: amounts.netSalary,
        status: 'draft',
        meta: {
          active_window: activeWindow,
          approved_deduction_ids: approvedDeductions.map(deduction => deduction.id),
          approved_bonus_ids: approvedBonuses.map(bonus => bonus.id),
        },
      };
    }));

    const drafts = payrollDrafts.filter(Boolean);
    const writtenPayrolls = [];
    for (const draft of drafts) {
      const existing = await Payroll.findOne({ where: { branch_id: branchId, staff_id: draft.staff_id, month, year } });
      if (existing && ['paid', 'pending_accounting', 'pending_admin'].includes(existing.status)) {
        writtenPayrolls.push(existing);
        continue;
      }

      const deductionIds = draft.meta.approved_deduction_ids;
      const bonusIds = draft.meta.approved_bonus_ids;
      delete draft.meta;
      let payroll;
      if (existing) {
        await existing.update({
          base_salary: draft.base_salary,
          allowances: draft.allowances,
          deductions: draft.deductions,
          net_salary: draft.net_salary,
          status: 'draft',
          rejection_reason: null,
        });
        payroll = existing;
      } else {
        payroll = await Payroll.create(draft);
      }

      if (deductionIds.length) {
        await PayrollDeduction.update({ payroll_id: payroll.id }, { where: { id: { [Op.in]: deductionIds }, branch_id: branchId } });
      }
      if (bonusIds.length) {
        await PayrollBonus.update({ payroll_id: payroll.id }, { where: { id: { [Op.in]: bonusIds }, branch_id: branchId } });
      }
      writtenPayrolls.push(payroll);
    }

    await AuditLog.create({
      user_id: req.user?.id,
      branch_id: branchId,
      action: 'GENERATE',
      entity: 'Payroll',
      new_value: { month, year, records: writtenPayrolls.length },
    });
    res.status(201).json({ message: 'Draft payroll generated successfully.', records: writtenPayrolls.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.processPayment = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { id } = req.params;

    const payroll = await Payroll.findOne({
      where: { id, branch_id: req.branchId },
      include: [{ model: User, as: 'Staff' }]
    });

    if (!payroll || ['paid', 'pending_accounting', 'pending_admin'].includes(payroll.status)) {
      throw new Error('Invalid payroll record or payroll request already submitted.');
    }

    if (payroll.expense_id) {
      const existingExpense = await Expense.findOne({ where: { id: payroll.expense_id, branch_id: req.branchId } });
      if (existingExpense && !['rejected', 'deleted'].includes(existingExpense.status)) {
        throw new Error('This payroll is already waiting for accounting action.');
      }
    }

    const expense = await Expense.create({
      branch_id: req.branchId,
      account_id: null,
      amount: payroll.net_salary,
      description: `Staff Salary: ${payroll.Staff.name} (${payroll.month}/${payroll.year})`,
      category: 'Salaries & Wages',
      payment_method: null,
      date: new Date(),
      status: 'pending',
      expense_origin: 'payroll',
      payroll_id: payroll.id,
      payment_source_selected: false,
    }, { transaction: t });

    await payroll.update({
      status: 'pending_admin',
      expense_id: expense.id,
      rejection_reason: null,
    }, { transaction: t });

    await writePayrollAudit(req, 'SUBMIT_REQUEST', payroll.id, {
      expense_id: expense.id,
      amount: payroll.net_salary,
    }, t);

    await t.commit();
    res.json({ message: 'Salary request sent to Expense Manager for admin payment source selection.', expense });
  } catch (error) {
    await t.rollback();
    res.status(500).json({ error: error.message });
  }
};
