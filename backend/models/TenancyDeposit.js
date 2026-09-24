const { DataTypes } = require('sequelize');
const sequelize = require('../config/db.config');

/** Deposits held per tenancy, by type — SOP Business Rental Management §9. */
const TenancyDeposit = sequelize.define('TenancyDeposit', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  branch_id: { type: DataTypes.INTEGER, allowNull: false },
  tenancy_id: { type: DataTypes.INTEGER, allowNull: false },
  deposit_type: { type: DataTypes.STRING(40), allowNull: false },
  amount: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  received_amount: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  received_on: DataTypes.DATEONLY,
  settled_amount: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  settled_on: DataTypes.DATEONLY,
  notes: DataTypes.TEXT,
  created_by: DataTypes.INTEGER,
}, { tableName: 'tenancy_deposits', underscored: true });

module.exports = TenancyDeposit;
