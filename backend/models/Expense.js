const { DataTypes } = require('sequelize');
const sequelize = require('../config/db.config');
const Branch = require('./Branch');
const Account = require('./Account');
const User = require('./User');

const Expense = sequelize.define('Expense', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  branch_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: Branch, key: 'id' },
  },
  account_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: Account, key: 'id' },
  },
  amount: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
  },
  description: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  category: {
    type: DataTypes.STRING,
  },
  payment_method: {
    type: DataTypes.ENUM('cash', 'bkash', 'nagad', 'bank_transfer', 'card'),
    defaultValue: 'cash',
  },
  receipt_url: {
    type: DataTypes.STRING,
  },
  date: {
    type: DataTypes.DATEONLY,
    defaultValue: DataTypes.NOW,
  },
  approved_by: {
    type: DataTypes.INTEGER,
    references: { model: User, key: 'id' },
  },
  verified_by: {
    type: DataTypes.INTEGER,
    references: { model: User, key: 'id' },
  },
  verification_date: {
    type: DataTypes.DATE,
  },
  status: {
    type: DataTypes.ENUM('pending', 'verified', 'approved', 'rejected', 'deleted'),
    defaultValue: 'pending',
  },
  rejection_reason: {
    type: DataTypes.TEXT,
  },
  deletion_reason: {
    type: DataTypes.TEXT,
  },
  expense_origin: {
    type: DataTypes.STRING(50),
    defaultValue: 'manual',
  },
  payroll_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  payment_source_selected: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  payment_source_selected_by: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: User, key: 'id' },
  },
  payment_source_selected_at: {
    type: DataTypes.DATE,
  },
  deleted_by: {
    type: DataTypes.INTEGER,
    references: { model: User, key: 'id' },
  },
  deleted_at: {
    type: DataTypes.DATE,
  },
}, {
  tableName: 'expenses',
  underscored: true,
});

Expense.belongsTo(Branch, { foreignKey: 'branch_id' });
Expense.belongsTo(Account, { foreignKey: 'account_id' });
Expense.belongsTo(User, { as: 'Approver', foreignKey: 'approved_by' });
Expense.belongsTo(User, { as: 'Verifier', foreignKey: 'verified_by' });
Expense.belongsTo(User, { as: 'Deleter', foreignKey: 'deleted_by' });
Expense.belongsTo(User, { as: 'PaymentSourceSelector', foreignKey: 'payment_source_selected_by' });

module.exports = Expense;
