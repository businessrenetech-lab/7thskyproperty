const { DataTypes } = require('sequelize');
const sequelize = require('../config/db.config');

/** BusinessMandate — a buyer's acquisition brief (Business Purchase SOP). 0133. */
const BusinessMandate = sequelize.define('BusinessMandate', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  branch_id: { type: DataTypes.INTEGER, allowNull: false },
  mandate_code: { type: DataTypes.STRING(40), unique: true },
  buyer_contact_id: DataTypes.INTEGER,
  buyer_name: DataTypes.STRING,
  buyer_company: DataTypes.STRING,
  preferred_business_type: DataTypes.STRING(60),
  preferred_industry: DataTypes.STRING(80),
  preferred_location: DataTypes.STRING,
  budget_min: DataTypes.DECIMAL(16, 2),
  budget_max: DataTypes.DECIMAL(16, 2),
  purchase_purpose: DataTypes.STRING(40),
  financing_status: DataTypes.STRING(40),
  requirements: DataTypes.TEXT,
  timeline: DataTypes.STRING(60),
  stage: { type: DataTypes.STRING(40), defaultValue: 'consultation' },
  status: { type: DataTypes.STRING(30), defaultValue: 'active' },
  assigned_to: DataTypes.INTEGER,
  notes: DataTypes.TEXT,
  created_by: DataTypes.INTEGER,
}, { tableName: 'business_mandates', underscored: true });

module.exports = BusinessMandate;
