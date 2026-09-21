const { DataTypes } = require('sequelize');
const sequelize = require('../config/db.config');

// Registration activities coordinated with government authorities (0138).
const BusinessRegistrationActivity = sequelize.define('BusinessRegistrationActivity', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  branch_id: { type: DataTypes.INTEGER, allowNull: false },
  project_id: { type: DataTypes.INTEGER, allowNull: false },
  work_order_id: DataTypes.INTEGER,
  activity_type: { type: DataTypes.STRING(40), allowNull: false },
  title: DataTypes.STRING,
  authority: DataTypes.STRING(120),
  reference_no: DataTypes.STRING(120),
  status: { type: DataTypes.STRING(20), defaultValue: 'pending' },
  submitted_at: DataTypes.DATE,
  completed_at: DataTypes.DATE,
  outcome: DataTypes.STRING,
  notes: DataTypes.TEXT,
  created_by: DataTypes.INTEGER,
}, { tableName: 'business_registration_activities', underscored: true });

module.exports = BusinessRegistrationActivity;
