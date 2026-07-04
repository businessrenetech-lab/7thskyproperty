const { DataTypes } = require('sequelize');
const sequelize = require('../config/db.config');

const Lead = sequelize.define('Lead', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  branch_id: { type: DataTypes.INTEGER, allowNull: false },
  lead_code: { type: DataTypes.STRING(40), unique: true },
  contact_id: DataTypes.INTEGER,
  name: { type: DataTypes.STRING, allowNull: false },
  phone: DataTypes.STRING,
  email: DataTypes.STRING,
  vertical_key: DataTypes.STRING(40),
  service_id: DataTypes.INTEGER,
  property_id: DataTypes.INTEGER,
  requirement: DataTypes.TEXT,
  source: DataTypes.STRING,
  status: { type: DataTypes.ENUM('new', 'contacted', 'follow_up', 'meeting', 'converted', 'lost'), defaultValue: 'new' },
  priority: { type: DataTypes.ENUM('low', 'medium', 'high', 'critical'), defaultValue: 'medium' },
  estimated_value: DataTypes.DECIMAL(15, 2),
  assigned_to: DataTypes.INTEGER,
  next_follow_up: DataTypes.DATE,
  lost_reason: DataTypes.STRING,
  converted_client_id: DataTypes.INTEGER,
  converted_at: DataTypes.DATE,
  notes: DataTypes.TEXT,
  created_by: DataTypes.INTEGER,
}, { tableName: 'leads', underscored: true });

module.exports = Lead;
