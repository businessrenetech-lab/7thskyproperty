const { DataTypes } = require('sequelize');
const sequelize = require('../config/db.config');
const Property = require('./Property');
const Tenancy = require('./Tenancy');
const Contact = require('./Contact');

const UtilityBill = sequelize.define('UtilityBill', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  branch_id: { type: DataTypes.INTEGER, allowNull: false },
  utility_code: { type: DataTypes.STRING(40), unique: true },
  property_id: DataTypes.INTEGER,
  tenancy_id: DataTypes.INTEGER,
  tenant_contact_id: DataTypes.INTEGER,
  owner_contact_id: DataTypes.INTEGER,
  utility_type: { type: DataTypes.ENUM('electricity', 'gas', 'water', 'internet', 'building_charge', 'other'), defaultValue: 'electricity' },
  responsibility: { type: DataTypes.ENUM('tenant', 'owner', 'shared', 'seventh_sky', 'tbc'), defaultValue: 'tenant' },
  provider: DataTypes.STRING,
  bill_period: DataTypes.STRING(30),
  amount: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  due_date: DataTypes.DATEONLY,
  paid_by: { type: DataTypes.ENUM('tenant', 'owner', 'seventh_sky', 'tbc'), defaultValue: 'tbc' },
  payment_status: { type: DataTypes.ENUM('pending', 'paid', 'overdue', 'waived', 'disputed'), defaultValue: 'pending' },
  evidence_url: DataTypes.STRING,
  notes: DataTypes.TEXT,
  invoice_id: DataTypes.INTEGER,
  landlord_bill_id: DataTypes.INTEGER,
  created_by: DataTypes.INTEGER,
}, { tableName: 'utility_bills', underscored: true });

UtilityBill.belongsTo(Property, { as: 'property', foreignKey: 'property_id' });
UtilityBill.belongsTo(Tenancy, { as: 'tenancy', foreignKey: 'tenancy_id' });
UtilityBill.belongsTo(Contact, { as: 'tenant', foreignKey: 'tenant_contact_id' });
UtilityBill.belongsTo(Contact, { as: 'owner', foreignKey: 'owner_contact_id' });

module.exports = UtilityBill;
