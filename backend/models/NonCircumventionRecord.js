const { DataTypes } = require('sequelize');
const sequelize = require('../config/db.config');

const NonCircumventionRecord = sequelize.define('NonCircumventionRecord', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  branch_id: { type: DataTypes.INTEGER, allowNull: false },
  record_code: { type: DataTypes.STRING(40), unique: true },
  owner_contact_id: DataTypes.INTEGER,
  tenant_contact_id: DataTypes.INTEGER,
  property_id: DataTypes.INTEGER,
  tenancy_id: DataTypes.INTEGER,
  protected_relationship: DataTypes.STRING,
  introduction_date: DataTypes.DATEONLY,
  protection_basis: DataTypes.STRING,
  direct_communication_allowed: { type: DataTypes.BOOLEAN, defaultValue: false },
  breach_risk: { type: DataTypes.ENUM('low', 'medium', 'high'), defaultValue: 'medium' },
  monitoring_notes: DataTypes.TEXT,
  status: { type: DataTypes.ENUM('pending', 'active', 'breached', 'closed'), defaultValue: 'active' },
  created_by: DataTypes.INTEGER,
}, { tableName: 'non_circumvention_records', underscored: true });

module.exports = NonCircumventionRecord;
