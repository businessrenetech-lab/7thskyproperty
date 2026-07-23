const { DataTypes } = require('sequelize');
const sequelize = require('../config/db.config');
const CareIncident = sequelize.define('CareIncident', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  branch_id: DataTypes.INTEGER, incident_code: { type: DataTypes.STRING(40), unique: true },
  work_order_id: DataTypes.INTEGER, provider_id: DataTypes.INTEGER,
  incident_type: { type: DataTypes.ENUM('injury','contamination','property_damage','environmental','other'), defaultValue: 'other' },
  severity: { type: DataTypes.ENUM('low','medium','high','critical'), defaultValue: 'medium' },
  description: DataTypes.TEXT, action_taken: DataTypes.TEXT,
  status: { type: DataTypes.ENUM('open','investigating','closed'), defaultValue: 'open' }, incident_date: DataTypes.DATEONLY, created_by: DataTypes.INTEGER,
}, { tableName: 'care_incidents', underscored: true });
module.exports = CareIncident;
