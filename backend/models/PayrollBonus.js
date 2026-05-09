const { DataTypes } = require('sequelize');
const sequelize = require('../config/db.config');
const User = require('./User');
const Branch = require('./Branch');
const Payroll = require('./Payroll');

const PayrollBonus = sequelize.define('PayrollBonus', {
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
  bonus_type: {
    type: DataTypes.ENUM('performance_bonus', 'festival_bonus', 'attendance_bonus', 'sales_bonus', 'manual_adjustment', 'other'),
    defaultValue: 'performance_bonus',
  },
  source: {
    type: DataTypes.ENUM('manual', 'performance', 'festival', 'attendance', 'sales'),
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
  tableName: 'payroll_bonuses',
  underscored: true,
  indexes: [
    { fields: ['staff_id', 'month', 'year'] },
    { fields: ['branch_id', 'month', 'year'] },
  ],
});

PayrollBonus.belongsTo(User, { as: 'Staff', foreignKey: 'staff_id' });
PayrollBonus.belongsTo(User, { as: 'Creator', foreignKey: 'created_by' });
PayrollBonus.belongsTo(User, { as: 'Approver', foreignKey: 'approved_by' });
PayrollBonus.belongsTo(Branch, { foreignKey: 'branch_id' });
PayrollBonus.belongsTo(Payroll, { foreignKey: 'payroll_id' });
User.hasMany(PayrollBonus, { as: 'PayrollBonuses', foreignKey: 'staff_id' });

module.exports = PayrollBonus;
