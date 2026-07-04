const { DataTypes } = require('sequelize');
const sequelize = require('../config/db.config');

const BondDepositRecord = sequelize.define('BondDepositRecord', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  branch_id: { type: DataTypes.INTEGER, allowNull: false },
  bond_code: { type: DataTypes.STRING(40), unique: true },
  tenancy_id: DataTypes.INTEGER,
  application_id: DataTypes.INTEGER,
  property_id: DataTypes.INTEGER,
  tenant_contact_id: DataTypes.INTEGER,
  monthly_rent: DataTypes.DECIMAL(15, 2),
  advance_rent_required: DataTypes.DECIMAL(15, 2),
  security_deposit_required: DataTypes.DECIMAL(15, 2),
  advance_rent_received: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  security_deposit_received: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  total_received: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  receipt_evidence: DataTypes.STRING,
  bond_status: { type: DataTypes.ENUM('pending_collection', 'held', 'refunded', 'adjusted'), defaultValue: 'pending_collection' },
  total_deductions: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  refund_amount: DataTypes.DECIMAL(15, 2),
  refund_status: DataTypes.STRING,
  notes: DataTypes.TEXT,
  created_by: DataTypes.INTEGER,
}, { tableName: 'bond_deposit_records', underscored: true });

module.exports = BondDepositRecord;
