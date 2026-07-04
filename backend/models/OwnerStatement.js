const { DataTypes } = require('sequelize');
const sequelize = require('../config/db.config');
const Contact = require('./Contact');
const Property = require('./Property');
const Folio = require('./Folio');

const OwnerStatement = sequelize.define('OwnerStatement', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  branch_id: { type: DataTypes.INTEGER, allowNull: false },
  statement_code: { type: DataTypes.STRING(40), unique: true },
  owner_contact_id: { type: DataTypes.INTEGER, allowNull: false },
  property_id: DataTypes.INTEGER,
  folio_id: DataTypes.INTEGER,

  period_label: { type: DataTypes.STRING(20), allowNull: false },
  period_start: { type: DataTypes.DATEONLY, allowNull: false },
  period_end: { type: DataTypes.DATEONLY, allowNull: false },

  opening_balance: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  rent_collected: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  service_charge_collected: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  arrears_recovered: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  other_credits: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  total_credits: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },

  management_fee: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  maintenance_deductions: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  utility_deductions: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  landlord_bills_deductions: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  other_deductions: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  total_deductions: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },

  net_disbursement: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  disbursement_date: DataTypes.DATEONLY,
  disbursement_reference: DataTypes.STRING,
  disbursement_method: DataTypes.STRING(40),
  closing_balance: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },

  line_items: { type: DataTypes.JSON, defaultValue: [] },

  status: { type: DataTypes.ENUM('draft', 'ready', 'sent', 'paid', 'closed'), defaultValue: 'draft' },
  sent_at: DataTypes.DATE,
  sent_channel: DataTypes.STRING(20),
  sent_evidence_url: DataTypes.STRING,

  generated_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  generated_by: DataTypes.INTEGER,
  notes: DataTypes.TEXT,
}, { tableName: 'owner_statements', underscored: true });

OwnerStatement.belongsTo(Contact, { as: 'owner', foreignKey: 'owner_contact_id' });
OwnerStatement.belongsTo(Property, { as: 'property', foreignKey: 'property_id' });
OwnerStatement.belongsTo(Folio, { as: 'folio', foreignKey: 'folio_id' });

module.exports = OwnerStatement;
