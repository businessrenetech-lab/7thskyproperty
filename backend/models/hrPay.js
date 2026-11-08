const { DataTypes } = require('sequelize');
const sequelize = require('../config/db.config');

/**
 * HRM Phase 4 (migration 0168): pay runs, payslips, one-off bonuses and deductions, performance reviews and
 * exits. JSON columns come back as strings in this database, so each has a getter that parses defensively.
 * Every attribute is a fresh object: Sequelize writes the column name into it, so a shared one maps every
 * column that uses it to the same field.
 */
const json = (name, fallback) => ({
  type: DataTypes.JSON,
  get() {
    const v = this.getDataValue(name);
    if (v == null) return fallback;
    if (typeof v !== 'string') return v;
    try { return JSON.parse(v); } catch { return fallback; }
  },
});
const S = (n) => DataTypes.STRING(n);
const I = DataTypes.INTEGER;
const T = DataTypes.TEXT;
const money = () => ({ type: DataTypes.DECIMAL(14, 2), allowNull: false, defaultValue: 0 });
const opts = (tableName) => ({ tableName, underscored: true, timestamps: true });

const HrPayRun = sequelize.define('HrPayRun', {
  branch_id: I,
  month: { type: I, allowNull: false },
  year: { type: I, allowNull: false },
  status: { type: S(20), allowNull: false, defaultValue: 'draft' },
  change_request_id: I,
  employees: { type: I, allowNull: false, defaultValue: 0 },
  gross_total: money(),
  deduction_total: money(),
  net_total: money(),
  prepared_by: I,
  prepared_at: DataTypes.DATE,
  approved_at: DataTypes.DATE,
  paid_by: I,
  paid_at: DataTypes.DATE,
  payment_method: S(30),
  payment_reference: S(120),
  notes: T,
}, opts('hr_pay_runs'));

const HrPayslip = sequelize.define('HrPayslip', {
  run_id: { type: I, allowNull: false },
  employee_id: { type: I, allowNull: false },
  active_days: { type: I, allowNull: false, defaultValue: 0 },
  days_in_month: { type: I, allowNull: false, defaultValue: 0 },
  unpaid_days: { type: DataTypes.DECIMAL(5, 1), allowNull: false, defaultValue: 0 },
  basic: money(),
  allowances_total: money(),
  bonus_total: money(),
  deduction_total: money(),
  gross: money(),
  net: money(),
  lines: json('lines', []),
}, opts('hr_payslips'));

const HrPayAdjustment = sequelize.define('HrPayAdjustment', {
  branch_id: I,
  employee_id: { type: I, allowNull: false },
  direction: S(10),
  type: S(40),
  month: { type: I, allowNull: false },
  year: { type: I, allowNull: false },
  amount: money(),
  reason: T,
  status: { type: S(12), allowNull: false, defaultValue: 'pending' },
  payslip_id: I,
  created_by: I,
  decided_by: I,
  decided_at: DataTypes.DATE,
}, opts('hr_pay_adjustments'));

const HrPerformanceReview = sequelize.define('HrPerformanceReview', {
  branch_id: I,
  employee_id: { type: I, allowNull: false },
  reviewer_user_id: I,
  period_label: S(60),
  period_start: DataTypes.DATEONLY,
  period_end: DataTypes.DATEONLY,
  ratings: json('ratings', {}),
  overall: DataTypes.DECIMAL(3, 1),
  strengths: T,
  improvements: T,
  goals: T,
  status: { type: S(14), allowNull: false, defaultValue: 'draft' },
  submitted_at: DataTypes.DATE,
  acknowledged_at: DataTypes.DATE,
  employee_comment: T,
}, opts('hr_performance_reviews'));

const HrExit = sequelize.define('HrExit', {
  branch_id: I,
  employee_id: { type: I, allowNull: false },
  exit_type: S(20),
  reason: T,
  notice_date: DataTypes.DATEONLY,
  last_working_day: { type: DataTypes.DATEONLY, allowNull: false },
  handover_employee_id: I,
  checklist: json('checklist', []),
  settlement: json('settlement', null),
  settlement_status: { type: S(20), allowNull: false, defaultValue: 'pending' },
  change_request_id: I,
  status: { type: S(14), allowNull: false, defaultValue: 'open' },
  created_by: I,
}, opts('hr_exits'));

HrPayRun.hasMany(HrPayslip, { foreignKey: 'run_id', as: 'payslips' });
HrPayslip.belongsTo(HrPayRun, { foreignKey: 'run_id', as: 'run' });

module.exports = { HrPayRun, HrPayslip, HrPayAdjustment, HrPerformanceReview, HrExit };
