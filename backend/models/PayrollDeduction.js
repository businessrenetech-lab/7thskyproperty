const { DataTypes } = require('sequelize');
const sequelize = require('../config/db.config');
const User = require('./User');
const Branch = require('./Branch');
const Payroll = require('./Payroll');

const PayrollDeduction = sequelize.define('PayrollDeduction', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  staff_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: User, key: 'id' },
  },
  branch_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: Branch, key: 'id' },
  },
  payroll_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: Payroll, key: 'id' },
  },
  month: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  year: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  deduction_type: {
    type: DataTypes.ENUM('loan_repayment', 'advance_recovery', 'unpaid_leave', 'absence', 'late_fine', 'disciplinary_fine', 'manual_adjustment', 'tax', 'other'),
    defaultValue: 'other',
  },
  source: {
    type: DataTypes.ENUM('manual', 'loan', 'attendance', 'fine', 'advance'),
    defaultValue: 'manual',
  },
  amount: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
    defaultValue: 0,
  },
  reason: {
    type: DataTypes.TEXT,
  },
  status: {
    type: DataTypes.ENUM('pending', 'approved', 'applied', 'rejected'),
    defaultValue: 'approved',
  },
  created_by: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: User, key: 'id' },
  },
  approved_by: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: User, key: 'id' },
  },
  applied_at: {
    type: DataTypes.DATE,
  },
}, {
  tableName: 'payroll_deductions',
  underscored: true,
  indexes: [
    { fields: ['staff_id', 'month', 'year'] },
    { fields: ['branch_id', 'month', 'year'] },
  ],
});

PayrollDeduction.belongsTo(User, { as: 'Staff', foreignKey: 'staff_id' });
PayrollDeduction.belongsTo(User, { as: 'Creator', foreignKey: 'created_by' });
PayrollDeduction.belongsTo(User, { as: 'Approver', foreignKey: 'approved_by' });
PayrollDeduction.belongsTo(Branch, { foreignKey: 'branch_id' });
PayrollDeduction.belongsTo(Payroll, { foreignKey: 'payroll_id' });
User.hasMany(PayrollDeduction, { as: 'PayrollDeductions', foreignKey: 'staff_id' });

module.exports = PayrollDeduction;
