const { DataTypes } = require('sequelize');
const sequelize = require('../config/db.config');
const Property = require('./Property');
const Contact = require('./Contact');
const Folio = require('./Folio');

const OwnerDisbursement = sequelize.define('OwnerDisbursement', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  branch_id: { type: DataTypes.INTEGER, allowNull: false },
  disbursement_code: { type: DataTypes.STRING(40), unique: true },
  owner_contact_id: { type: DataTypes.INTEGER, allowNull: false },
  landlord_folio_id: DataTypes.INTEGER,
  property_id: DataTypes.INTEGER,
  period_label: DataTypes.STRING(20),
  gross_collected: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  fees_deducted: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  expenses_deducted: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  net_amount: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  balance_before: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  balance_after: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  method: { type: DataTypes.STRING(40), defaultValue: 'bank_transfer' },
  reference: DataTypes.STRING,
  bank_snapshot: { type: DataTypes.JSON, defaultValue: null },
  status: { type: DataTypes.ENUM('draft', 'paid', 'void'), defaultValue: 'paid' },
  paid_at: DataTypes.DATE,
  notes: DataTypes.TEXT,
  folio_txn_id: DataTypes.INTEGER,
  statement_id: DataTypes.INTEGER,
  created_by: DataTypes.INTEGER,
}, { tableName: 'owner_disbursements', underscored: true });

OwnerDisbursement.belongsTo(Contact, { as: 'owner', foreignKey: 'owner_contact_id' });
OwnerDisbursement.belongsTo(Property, { as: 'property', foreignKey: 'property_id' });
OwnerDisbursement.belongsTo(Folio, { as: 'landlordFolio', foreignKey: 'landlord_folio_id' });

module.exports = OwnerDisbursement;
