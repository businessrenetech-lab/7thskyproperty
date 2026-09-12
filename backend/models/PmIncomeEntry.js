const { DataTypes } = require('sequelize');
const sequelize = require('../config/db.config');
const Property = require('./Property');
const Contact = require('./Contact');

const PmIncomeEntry = sequelize.define('PmIncomeEntry', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  branch_id: { type: DataTypes.INTEGER, allowNull: false },
  entry_code: { type: DataTypes.STRING(40), unique: true },
  category: { type: DataTypes.ENUM('management_fee', 'letting_fee', 'renewal_fee', 'maintenance_admin', 'statement_fee', 'advertising_fee', 'other'), defaultValue: 'management_fee' },
  source_type: { type: DataTypes.ENUM('rent_receipt', 'invoice', 'disbursement', 'manual'), defaultValue: 'rent_receipt' },
  source_id: DataTypes.INTEGER,
  property_id: DataTypes.INTEGER,
  owner_contact_id: DataTypes.INTEGER,
  tenancy_id: DataTypes.INTEGER,
  period_label: DataTypes.STRING(20),
  fee_name: DataTypes.STRING,
  amount: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  account_category_id: DataTypes.INTEGER,
  landlord_folio_txn_id: DataTypes.INTEGER,
  // Lifecycle: 'accrued' when earned on rent; 'collected' once the owner is paid
  // out (the fee is netted at disbursement). collected_at + disbursement_id link
  // the realized fee to the payout that collected it.
  status: { type: DataTypes.ENUM('accrued', 'collected'), defaultValue: 'accrued' },
  collected_at: DataTypes.DATE,
  disbursement_id: DataTypes.INTEGER,
  notes: DataTypes.TEXT,
  created_by: DataTypes.INTEGER,
}, { tableName: 'pm_income_entries', underscored: true });

PmIncomeEntry.belongsTo(Property, { as: 'property', foreignKey: 'property_id' });
PmIncomeEntry.belongsTo(Contact, { as: 'owner', foreignKey: 'owner_contact_id' });

module.exports = PmIncomeEntry;
