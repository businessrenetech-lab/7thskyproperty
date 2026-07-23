const { DataTypes } = require('sequelize');
const sequelize = require('../config/db.config');
const Property = require('./Property');
const Contact = require('./Contact');
const Tenancy = require('./Tenancy');

const DepositSettlement = sequelize.define('DepositSettlement', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  branch_id: { type: DataTypes.INTEGER, allowNull: false },
  settlement_code: { type: DataTypes.STRING(40), unique: true },
  tenancy_id: { type: DataTypes.INTEGER, allowNull: false },
  vacancy_notice_id: DataTypes.INTEGER,
  bond_record_id: DataTypes.INTEGER,
  property_id: DataTypes.INTEGER,
  tenant_contact_id: DataTypes.INTEGER,
  owner_contact_id: DataTypes.INTEGER,

  deposit_held: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  advance_rent_held: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  unpaid_rent: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  unpaid_service_charge: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  damages: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  cleaning: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  utility_dues: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  other_deductions: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  total_deductions: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  refund_amount: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  // Signed net + collect-from-tenant case (0043)
  settlement_direction: { type: DataTypes.ENUM('refund', 'collect', 'nil'), defaultValue: 'nil' },
  net_position: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  amount_to_collect: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  owner_funded: { type: DataTypes.BOOLEAN, defaultValue: false },
  collected_at: DataTypes.DATE,
  collection_method: DataTypes.STRING(40),
  collection_reference: DataTypes.STRING,

  deduction_lines: { type: DataTypes.JSON, defaultValue: [] },
  status: { type: DataTypes.ENUM('computing', 'pending_owner', 'pending_review', 'reviewed', 'approved', 'disputed', 'refunded', 'closed'), defaultValue: 'computing' },
  owner_decision_at: DataTypes.DATE,
  owner_decision_note: DataTypes.TEXT,
  owner_approved: { type: DataTypes.BOOLEAN, defaultValue: false },
  refunded_at: DataTypes.DATE,
  refund_method: DataTypes.STRING(40),
  refund_reference: DataTypes.STRING,
  notes: DataTypes.TEXT,
  created_by: DataTypes.INTEGER,

  // Maker-checker controls (0048): submit → independent review → approval → final lock.
  submitted_by: DataTypes.INTEGER,
  submitted_at: DataTypes.DATE,
  reviewed_by: DataTypes.INTEGER,
  reviewed_at: DataTypes.DATE,
  review_notes: DataTypes.TEXT,
  approved_by: DataTypes.INTEGER,
  approved_at: DataTypes.DATE,
  locked_by: DataTypes.INTEGER,
  locked_at: DataTypes.DATE,
  is_locked: { type: DataTypes.BOOLEAN, defaultValue: false },
  override_reason: DataTypes.TEXT,
}, { tableName: 'deposit_settlements', underscored: true });

DepositSettlement.belongsTo(Property, { as: 'property', foreignKey: 'property_id' });
DepositSettlement.belongsTo(Contact, { as: 'tenant', foreignKey: 'tenant_contact_id' });
DepositSettlement.belongsTo(Contact, { as: 'owner', foreignKey: 'owner_contact_id' });
DepositSettlement.belongsTo(Tenancy, { as: 'tenancy', foreignKey: 'tenancy_id' });

module.exports = DepositSettlement;
