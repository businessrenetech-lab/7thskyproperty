const { DataTypes } = require('sequelize');
const sequelize = require('../config/db.config');
const Property = require('./Property');
const Contact = require('./Contact');

const TenantApplication = sequelize.define('TenantApplication', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  branch_id: { type: DataTypes.INTEGER, allowNull: false },
  application_code: { type: DataTypes.STRING(40), unique: true },
  property_id: DataTypes.INTEGER,
  tenant_contact_id: DataTypes.INTEGER,
  enquiry_id: DataTypes.INTEGER,
  applicant_name: { type: DataTypes.STRING, allowNull: false },
  mobile: DataTypes.STRING,
  email: DataTypes.STRING,
  occupation: DataTypes.STRING,
  employer: DataTypes.STRING,
  monthly_income: DataTypes.DECIMAL(15, 2),
  application_date: DataTypes.DATEONLY,
  preferred_move_in: DataTypes.DATEONLY,
  lease_period: DataTypes.STRING,
  occupancy_requirement: DataTypes.STRING,
  budget: DataTypes.DECIMAL(15, 2),
  source: DataTypes.STRING,
  id_received: { type: DataTypes.BOOLEAN, defaultValue: false },
  employment_verified: { type: DataTypes.BOOLEAN, defaultValue: false },
  income_verified: { type: DataTypes.BOOLEAN, defaultValue: false },
  references_checked: { type: DataTypes.BOOLEAN, defaultValue: false },
  background_check_status: { type: DataTypes.ENUM('pending', 'in_progress', 'clear', 'flagged', 'na'), defaultValue: 'pending' },
  status: { type: DataTypes.ENUM('draft', 'submitted', 'screening', 'verification', 'awaiting_documents', 'awaiting_owner_approval', 'approved', 'rejected', 'withdrawn', 'converted'), defaultValue: 'draft' },
  recommendation: { type: DataTypes.ENUM('pending', 'recommend', 'hold', 'reject'), defaultValue: 'pending' },
  owner_approval_required: { type: DataTypes.BOOLEAN, defaultValue: true },
  owner_decision: { type: DataTypes.ENUM('pending', 'approved', 'hold', 'rejected', 'na'), defaultValue: 'pending' },
  approved_rent: DataTypes.DECIMAL(15, 2),
  lease_start_target: DataTypes.DATEONLY,
  risk_level: { type: DataTypes.ENUM('low', 'medium', 'high'), defaultValue: 'medium' },
  screening_notes: DataTypes.TEXT,
  assigned_officer_id: DataTypes.INTEGER,
  notes: DataTypes.TEXT,
  converted_tenancy_id: DataTypes.INTEGER,
  created_by: DataTypes.INTEGER,
  // Owner approval link (0024)
  owner_approval_token: { type: DataTypes.STRING(120), unique: true },
  owner_approval_expires_at: DataTypes.DATE,
  owner_approval_sent_at: DataTypes.DATE,
  owner_decided_at: DataTypes.DATE,
  owner_decision_note: DataTypes.TEXT,
}, { tableName: 'tenant_applications', underscored: true });

const TenantApplicationDocument = sequelize.define('TenantApplicationDocument', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  application_id: { type: DataTypes.INTEGER, allowNull: false },
  title: DataTypes.STRING,
  doc_type: DataTypes.STRING,
  file_url: DataTypes.STRING,
  file_name: DataTypes.STRING,
  uploaded_by: DataTypes.INTEGER,
}, { tableName: 'tenant_application_documents', underscored: true });

const TenantVerification = sequelize.define('TenantVerification', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  application_id: { type: DataTypes.INTEGER, allowNull: false },
  item: { type: DataTypes.STRING, allowNull: false },
  required: { type: DataTypes.BOOLEAN, defaultValue: true },
  status: { type: DataTypes.ENUM('pending', 'in_progress', 'passed', 'failed', 'na'), defaultValue: 'pending' },
  evidence_required: DataTypes.STRING,
  evidence_url: DataTypes.STRING,
  responsible_id: DataTypes.INTEGER,
  notes: DataTypes.TEXT,
  completed_at: DataTypes.DATE,
  sort_order: { type: DataTypes.INTEGER, defaultValue: 0 },
}, { tableName: 'tenant_verifications', underscored: true });

const TenantOccupant = sequelize.define('TenantOccupant', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  application_id: DataTypes.INTEGER,
  tenancy_id: DataTypes.INTEGER,
  property_id: DataTypes.INTEGER,
  name: { type: DataTypes.STRING, allowNull: false },
  relationship: DataTypes.STRING,
  id_received: { type: DataTypes.BOOLEAN, defaultValue: false },
  contact: DataTypes.STRING,
  occupation: DataTypes.STRING,
  approved: { type: DataTypes.BOOLEAN, defaultValue: false },
  subletting_concern: { type: DataTypes.BOOLEAN, defaultValue: false },
  notes: DataTypes.TEXT,
}, { tableName: 'tenant_occupants', underscored: true });

TenantApplication.belongsTo(Property, { as: 'property', foreignKey: 'property_id' });
TenantApplication.belongsTo(Contact, { as: 'tenant', foreignKey: 'tenant_contact_id' });
TenantApplication.hasMany(TenantApplicationDocument, { as: 'documents', foreignKey: 'application_id' });
TenantApplication.hasMany(TenantVerification, { as: 'verifications', foreignKey: 'application_id' });
TenantApplication.hasMany(TenantOccupant, { as: 'occupants', foreignKey: 'application_id' });
TenantApplicationDocument.belongsTo(TenantApplication, { foreignKey: 'application_id' });
TenantVerification.belongsTo(TenantApplication, { foreignKey: 'application_id' });
TenantOccupant.belongsTo(TenantApplication, { foreignKey: 'application_id' });

module.exports = { TenantApplication, TenantApplicationDocument, TenantVerification, TenantOccupant };
