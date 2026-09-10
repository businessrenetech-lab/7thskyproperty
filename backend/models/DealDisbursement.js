const { DataTypes } = require('sequelize');
const sequelize = require('../config/db.config');
const DealDisbursement = sequelize.define('DealDisbursement', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  branch_id: { type: DataTypes.INTEGER, allowNull: false },
  disbursement_code: { type: DataTypes.STRING(40), unique: true },
  deal_id: { type: DataTypes.INTEGER, allowNull: false },
  payee_type: { type: DataTypes.ENUM('agent', 'vendor', 'client_refund', 'expense', 'other'), defaultValue: 'other' },
  payee_contact_id: DataTypes.INTEGER, payee_name: DataTypes.STRING(160),
  description: DataTypes.STRING(255), amount: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  method: { type: DataTypes.STRING(40), defaultValue: 'bank_transfer' }, reference: DataTypes.STRING(120),
  status: { type: DataTypes.ENUM('draft', 'approved', 'paid', 'void'), defaultValue: 'draft' },
  source_hash: DataTypes.STRING(80), approved_by: DataTypes.INTEGER, approved_at: DataTypes.DATE, paid_at: DataTypes.DATE,
  created_by: DataTypes.INTEGER,
}, { tableName: 'deal_disbursements', underscored: true });
module.exports = DealDisbursement;
