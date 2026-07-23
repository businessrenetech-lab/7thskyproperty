const { DataTypes } = require('sequelize');
const sequelize = require('../config/db.config');
const Contact = require('./Contact');

const PropertyOwnerProfile = sequelize.define('PropertyOwnerProfile', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  property_id: { type: DataTypes.INTEGER, allowNull: false },
  contact_id: { type: DataTypes.INTEGER, allowNull: false },
  // KYC
  nid_number: DataTypes.STRING(20),
  tin_number: DataTypes.STRING(20),
  passport_number: DataTypes.STRING(30),
  nid_front_url: DataTypes.STRING,
  nid_back_url: DataTypes.STRING,
  // Banking
  bank_name: DataTypes.STRING,
  bank_branch: DataTypes.STRING,
  bank_account_name: DataTypes.STRING,
  bank_account_number: DataTypes.STRING(30),
  bank_routing_number: DataTypes.STRING(20),
  bkash_number: DataTypes.STRING(20),
  nagad_number: DataTypes.STRING(20),
  preferred_payment: { type: DataTypes.ENUM('cash', 'bank_transfer', 'bkash', 'nagad', 'cheque'), defaultValue: 'bank_transfer' },
  // Disbursement
  disbursement_frequency: { type: DataTypes.ENUM('weekly', 'fortnightly', 'monthly', 'quarterly'), defaultValue: 'monthly' },
  disbursement_day: { type: DataTypes.INTEGER, defaultValue: 1 },
  next_disbursement_date: DataTypes.DATEONLY,
  opening_balance: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  notes: DataTypes.TEXT,
  // ── Owner Master Register + SOP owner onboarding ──
  owner_type: { type: DataTypes.ENUM('individual', 'joint', 'nrb', 'company'), defaultValue: 'individual' },
  ownership_status: { type: DataTypes.ENUM('sole', 'joint', 'company', 'inherited'), defaultValue: 'sole' },
  current_address: DataTypes.TEXT,
  property_address: DataTypes.TEXT,
  district: DataTypes.STRING,
  bank_details_collected: { type: DataTypes.BOOLEAN, defaultValue: false },
  lawful_authority_confirmed: { type: DataTypes.BOOLEAN, defaultValue: false },
  joint_consent_collected: { type: DataTypes.BOOLEAN, defaultValue: false },
  poa_verified: { type: DataTypes.BOOLEAN, defaultValue: false },
  tax_responsibility_ack: { type: DataTypes.BOOLEAN, defaultValue: false },
  owner_obligations_accepted: { type: DataTypes.BOOLEAN, defaultValue: false },
  indemnity_accepted: { type: DataTypes.BOOLEAN, defaultValue: false },
  management_commission: { type: DataTypes.DECIMAL(6, 2), defaultValue: 5 },
  onboarding_fee: DataTypes.DECIMAL(15, 2),
  maintenance_responsibility: DataTypes.STRING,
  // Agreement commercials (0040) — feed the landlord management agreement.
  repair_budget_max: DataTypes.DECIMAL(15, 2),
  termination_notice_days: DataTypes.INTEGER,
  security_money_amount: DataTypes.DECIMAL(15, 2),
  advance_rent_amount: DataTypes.DECIMAL(15, 2),
  service_charge_amount: DataTypes.DECIMAL(15, 2),
  agreement_start_date: DataTypes.DATEONLY,
  // Joint second owner (plain columns — one profile per property stays).
  joint_owner_name: DataTypes.STRING,
  joint_owner_phone: DataTypes.STRING(40),
  joint_owner_email: DataTypes.STRING,
  joint_owner_nid: DataTypes.STRING(40),
  joint_owner_address: DataTypes.TEXT,
  assigned_officer_id: DataTypes.INTEGER,
  next_action: DataTypes.STRING,
  next_follow_up: DataTypes.DATEONLY,
  agreement_status: { type: DataTypes.ENUM('not_started', 'draft', 'sent', 'signed'), defaultValue: 'not_started' },
  onboarding_status: { type: DataTypes.ENUM('new', 'in_progress', 'completed'), defaultValue: 'new' },
}, { tableName: 'property_owner_profiles', underscored: true });

PropertyOwnerProfile.belongsTo(Contact, { as: 'contact', foreignKey: 'contact_id' });

module.exports = PropertyOwnerProfile;
