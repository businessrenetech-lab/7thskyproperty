const { DataTypes } = require('sequelize');
const sequelize = require('../config/db.config');

// Project Work Order (SSPC-BR-PWO-01) issued to an approved provider (0138).
const BusinessRegistrationWorkOrder = sequelize.define('BusinessRegistrationWorkOrder', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  branch_id: { type: DataTypes.INTEGER, allowNull: false },
  project_id: { type: DataTypes.INTEGER, allowNull: false },
  work_order_no: { type: DataTypes.STRING(40), unique: true },
  provider_contact_id: DataTypes.INTEGER,
  provider_name: DataTypes.STRING,
  provider_category: DataTypes.STRING(80),
  service_category: { type: DataTypes.JSON, defaultValue: null },
  scope: { type: DataTypes.JSON, defaultValue: null },
  deliverables: { type: DataTypes.JSON, defaultValue: null },
  total_fee: DataTypes.DECIMAL(16, 2),
  milestones: { type: DataTypes.JSON, defaultValue: null },
  non_circumvention_flag: { type: DataTypes.BOOLEAN, defaultValue: true },
  status: { type: DataTypes.STRING(20), defaultValue: 'issued' },
  special_instructions: DataTypes.TEXT,
  commencement_date: DataTypes.DATEONLY,
  target_completion_date: DataTypes.DATEONLY,
  issued_at: DataTypes.DATE,
  accepted_at: DataTypes.DATE,
  completed_at: DataTypes.DATE,
  notes: DataTypes.TEXT,
  created_by: DataTypes.INTEGER,
}, { tableName: 'business_registration_workorders', underscored: true });

module.exports = BusinessRegistrationWorkOrder;
