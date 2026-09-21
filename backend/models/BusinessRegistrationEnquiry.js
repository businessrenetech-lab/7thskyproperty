const { DataTypes } = require('sequelize');
const sequelize = require('../config/db.config');

/**
 * BusinessRegistrationEnquiry — a Phase 1 lead for the Business Registration SOP
 * (SOP Step 1). Optionally converted into a BusinessRegistrationProject.
 * Matches migration 0136.
 */
const BusinessRegistrationEnquiry = sequelize.define('BusinessRegistrationEnquiry', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  branch_id: { type: DataTypes.INTEGER, allowNull: false },
  enquiry_code: { type: DataTypes.STRING(40), unique: true },
  enquirer_name: DataTypes.STRING,
  company_name: DataTypes.STRING,
  phone: DataTypes.STRING,
  email: DataTypes.STRING,
  client_type: { type: DataTypes.STRING(20), defaultValue: 'individual' },
  service_requested: DataTypes.STRING,
  registration_type: DataTypes.STRING(80),
  source: DataTypes.STRING(60),
  message: DataTypes.TEXT,
  stage: { type: DataTypes.STRING(30), defaultValue: 'new' },
  assigned_to: DataTypes.INTEGER,
  contact_id: DataTypes.INTEGER,
  converted: { type: DataTypes.BOOLEAN, defaultValue: false },
  project_id: DataTypes.INTEGER,
  next_action: DataTypes.STRING,
  follow_up_date: DataTypes.DATEONLY,
  notes: DataTypes.TEXT,
  created_by: DataTypes.INTEGER,
}, {
  tableName: 'business_registration_enquiries',
  underscored: true,
});

module.exports = BusinessRegistrationEnquiry;
