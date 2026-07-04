const { DataTypes } = require('sequelize');
const sequelize = require('../config/db.config');

const AccountCategory = sequelize.define('AccountCategory', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  branch_id: DataTypes.INTEGER,
  name: { type: DataTypes.STRING, allowNull: false },
  code: DataTypes.STRING(40),
  type: { type: DataTypes.ENUM('income', 'expense', 'asset', 'liability', 'equity'), defaultValue: 'income' },
  applies_to: { type: DataTypes.ENUM('tenant', 'landlord', 'provider', 'both'), defaultValue: 'both' },
  default_tax_rate: { type: DataTypes.DECIMAL(6, 2), defaultValue: 0 },
  is_billable_to_tenant: { type: DataTypes.BOOLEAN, defaultValue: false },
  is_deductible_from_landlord: { type: DataTypes.BOOLEAN, defaultValue: false },
  is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
  created_by: DataTypes.INTEGER,
}, { tableName: 'account_categories', underscored: true });

module.exports = AccountCategory;
