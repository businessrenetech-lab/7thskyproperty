const { DataTypes } = require('sequelize');
const sequelize = require('../config/db.config');
const Contact = require('./Contact');
const Property = require('./Property');
const Tenancy = require('./Tenancy');

const Folio = sequelize.define('Folio', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  branch_id: { type: DataTypes.INTEGER, allowNull: false },
  folio_code: { type: DataTypes.STRING(40), unique: true },
  folio_type: { type: DataTypes.ENUM('tenant', 'landlord'), allowNull: false },
  folio_scope: { type: DataTypes.ENUM('tenancy', 'landlord', 'landlord_property'), allowNull: false },
  tenancy_id: DataTypes.INTEGER,
  property_id: DataTypes.INTEGER,
  contact_id: DataTypes.INTEGER,
  owner_contact_id: DataTypes.INTEGER,
  tenant_contact_id: DataTypes.INTEGER,
  status: { type: DataTypes.ENUM('active', 'closed', 'suspended'), defaultValue: 'active' },
  opening_balance: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  current_balance: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  rent_balance: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  service_charge_balance: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  utility_balance: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  deposit_held: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  deposit_available: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  deposit_deductions: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
}, { tableName: 'folios', underscored: true });

Folio.belongsTo(Contact, { as: 'contact', foreignKey: 'contact_id' });
Folio.belongsTo(Contact, { as: 'owner', foreignKey: 'owner_contact_id' });
Folio.belongsTo(Contact, { as: 'tenant', foreignKey: 'tenant_contact_id' });
Folio.belongsTo(Property, { as: 'property', foreignKey: 'property_id' });
Folio.belongsTo(Tenancy, { as: 'tenancy', foreignKey: 'tenancy_id' });

module.exports = Folio;
