const { DataTypes } = require('sequelize');
const sequelize = require('../config/db.config');

// Per-property sales expense (marketing / advertising / staging / photography /
// other). Separate from the company-wide Expense ledger (which has no property_id).
const SalePropertyExpense = sequelize.define('SalePropertyExpense', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  branch_id: { type: DataTypes.INTEGER, allowNull: false },
  property_id: { type: DataTypes.INTEGER, allowNull: false },
  category: { type: DataTypes.ENUM('marketing', 'advertising', 'staging', 'photography', 'other'), defaultValue: 'other' },
  amount: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  spent_on: DataTypes.DATEONLY,
  description: DataTypes.STRING,
  created_by: DataTypes.INTEGER,
}, { tableName: 'sale_property_expenses', underscored: true });

module.exports = SalePropertyExpense;
