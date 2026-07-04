const { DataTypes } = require('sequelize');
const sequelize = require('../config/db.config');
const Property = require('./Property');
const Tenancy = require('./Tenancy');
const Contact = require('./Contact');

const PropertyRisk = sequelize.define('PropertyRisk', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  branch_id: { type: DataTypes.INTEGER, allowNull: false },
  risk_code: { type: DataTypes.STRING(40), unique: true },
  property_id: DataTypes.INTEGER,
  tenancy_id: DataTypes.INTEGER,
  owner_contact_id: DataTypes.INTEGER,
  tenant_contact_id: DataTypes.INTEGER,
  risk_category: DataTypes.STRING(80),
  description: DataTypes.TEXT,
  likelihood: { type: DataTypes.ENUM('low', 'medium', 'high'), defaultValue: 'medium' },
  impact: { type: DataTypes.ENUM('low', 'medium', 'high'), defaultValue: 'medium' },
  risk_rating: { type: DataTypes.ENUM('low', 'medium', 'high', 'critical'), defaultValue: 'medium' },
  mitigation: DataTypes.TEXT,
  owner_user_id: DataTypes.INTEGER,
  review_date: DataTypes.DATEONLY,
  status: { type: DataTypes.ENUM('open', 'monitoring', 'mitigated', 'closed'), defaultValue: 'open' },
  created_by: DataTypes.INTEGER,
}, { tableName: 'property_risks', underscored: true });

PropertyRisk.belongsTo(Property, { as: 'property', foreignKey: 'property_id' });
PropertyRisk.belongsTo(Tenancy, { as: 'tenancy', foreignKey: 'tenancy_id' });
PropertyRisk.belongsTo(Contact, { as: 'tenant', foreignKey: 'tenant_contact_id' });
PropertyRisk.belongsTo(Contact, { as: 'owner', foreignKey: 'owner_contact_id' });

module.exports = PropertyRisk;
