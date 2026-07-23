const { DataTypes } = require('sequelize');
const sequelize = require('../config/db.config');
const CareComplaint = sequelize.define('CareComplaint', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  branch_id: DataTypes.INTEGER, complaint_code: { type: DataTypes.STRING(40), unique: true },
  customer_contact_id: DataTypes.INTEGER, customer_name: DataTypes.STRING, work_order_id: DataTypes.INTEGER, provider_id: DataTypes.INTEGER,
  complaint_type: DataTypes.STRING(60), severity: { type: DataTypes.ENUM('low','medium','high'), defaultValue: 'medium' },
  description: DataTypes.TEXT, investigation: DataTypes.TEXT, resolution: DataTypes.TEXT,
  status: { type: DataTypes.ENUM('open','investigating','resolved','closed','escalated'), defaultValue: 'open' },
  reported_date: DataTypes.DATEONLY, resolved_date: DataTypes.DATEONLY, created_by: DataTypes.INTEGER,
}, { tableName: 'care_complaints', underscored: true });
module.exports = CareComplaint;
