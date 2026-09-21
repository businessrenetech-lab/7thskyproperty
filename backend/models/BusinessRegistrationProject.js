const { DataTypes } = require('sequelize');
const sequelize = require('../config/db.config');

/**
 * BusinessRegistrationProject — the client file / project of the Business
 * Registration SOP (SSPC-BR-SOP-01). Not a property or a listing: it carries the
 * client, the business being registered, the selected services and the pipeline
 * stage through the 9-phase workflow. Matches migration 0136.
 */
const BusinessRegistrationProject = sequelize.define('BusinessRegistrationProject', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  branch_id: { type: DataTypes.INTEGER, allowNull: false },
  project_code: { type: DataTypes.STRING(40), unique: true },
  client_contact_id: DataTypes.INTEGER,
  client_type: { type: DataTypes.STRING(20), defaultValue: 'individual' },
  client_name: { type: DataTypes.STRING, allowNull: false },
  client_nid: DataTypes.STRING(80),
  client_phone: DataTypes.STRING,
  client_email: DataTypes.STRING,
  client_address: DataTypes.STRING,
  business_name: DataTypes.STRING,
  business_type: DataTypes.STRING(60),
  registration_type: DataTypes.STRING(80),
  nature_of_business: DataTypes.STRING,
  business_address: DataTypes.STRING,
  number_of_owners: DataTypes.INTEGER,
  number_of_directors: DataTypes.INTEGER,
  capital_structure: DataTypes.STRING(160),
  existing_trade_licence_no: DataTypes.STRING(80),
  existing_registration_no: DataTypes.STRING(80),
  lead_source: DataTypes.STRING(60),
  urgency: { type: DataTypes.STRING(20), defaultValue: 'normal' },
  assigned_to: DataTypes.INTEGER,
  service_selection: { type: DataTypes.JSON, defaultValue: null },
  authorities: DataTypes.STRING,
  quoted_amount: DataTypes.DECIMAL(16, 2),
  deposit_amount: DataTypes.DECIMAL(16, 2),
  government_fees: DataTypes.DECIMAL(16, 2),
  contract_value: DataTypes.DECIMAL(16, 2),
  currency: { type: DataTypes.STRING(8), defaultValue: 'BDT' },
  stage: { type: DataTypes.STRING(40), defaultValue: 'consultation' },
  status: { type: DataTypes.STRING(30), defaultValue: 'active' },
  workflow_state: { type: DataTypes.JSON, defaultValue: null },
  scope_of_work: DataTypes.TEXT,
  special_requirements: DataTypes.TEXT,
  commencement_date: DataTypes.DATEONLY,
  target_completion_date: DataTypes.DATEONLY,
  completion_date: DataTypes.DATEONLY,
  notes: DataTypes.TEXT,
  created_by: DataTypes.INTEGER,
}, {
  tableName: 'business_registration_projects',
  underscored: true,
});

// The client is a Contact (category='business' or individual).
const Contact = require('./Contact');
BusinessRegistrationProject.belongsTo(Contact, { foreignKey: 'client_contact_id', as: 'client' });

module.exports = BusinessRegistrationProject;
