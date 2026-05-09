const { DataTypes } = require('sequelize');
const sequelize = require('../config/db.config');
const User = require('./User');
const Branch = require('./Branch');

const StaffPayRule = sequelize.define('StaffPayRule', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    unique: true,
    references: { model: User, key: 'id' },
  },
  branch_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: Branch, key: 'id' },
  },
  employment_type: {
    type: DataTypes.ENUM('full_time', 'part_time', 'contract', 'guest', 'permanent'),
    defaultValue: 'full_time',
  },
  salary_mode: {
    type: DataTypes.ENUM('fixed', 'session_class', 'hourly', 'manual', 'monthly', 'per_class', 'per_hour', 'per_student'),
    defaultValue: 'fixed',
  },
  work_shift: {
    type: DataTypes.ENUM('morning', 'evening', 'both', 'custom'),
    defaultValue: 'both',
  },
  pay_type: {
    type: DataTypes.ENUM('monthly', 'per_class', 'per_hour', 'per_student', 'manual'),
    defaultValue: 'monthly',
  },
  base_salary: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0,
  },
  class_rate: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0,
  },
  hourly_rate: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0,
  },
  festival_bonus: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0,
  },
  conveyance_fee: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0,
  },
  other_allowance: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0,
  },
  deduction: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0,
  },
  student_rate: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0,
  },
  is_payroll_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
}, {
  tableName: 'staff_pay_rules',
  underscored: true,
});

StaffPayRule.belongsTo(User, { foreignKey: 'user_id' });
StaffPayRule.belongsTo(Branch, { foreignKey: 'branch_id' });
User.hasOne(StaffPayRule, { foreignKey: 'user_id' });

module.exports = StaffPayRule;
