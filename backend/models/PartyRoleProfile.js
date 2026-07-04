const { DataTypes } = require('sequelize');
const sequelize = require('../config/db.config');
const Contact = require('./Contact');
const Property = require('./Property');
const Agreement = require('./Agreement');
const SigningEnvelope = require('./SigningEnvelope');

const PartyRoleProfile = sequelize.define('PartyRoleProfile', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  branch_id: { type: DataTypes.INTEGER, allowNull: false },
  profile_code: { type: DataTypes.STRING(40), unique: true },
  contact_id: { type: DataTypes.INTEGER, allowNull: false },
  role_type: {
    type: DataTypes.ENUM('landlord', 'tenant', 'vendor', 'buyer', 'supplier', 'third_party'),
    allowNull: false,
  },
  status: {
    type: DataTypes.ENUM(
      'draft', 'kyc_pending', 'documents_pending', 'agreement_pending', 'signing_sent',
      'partially_signed', 'signed', 'approval_pending', 'active', 'rejected', 'declined', 'expired', 'voided'
    ),
    defaultValue: 'draft',
  },
  property_id: DataTypes.INTEGER,
  application_id: DataTypes.INTEGER,
  tenancy_id: DataTypes.INTEGER,
  agreement_id: DataTypes.INTEGER,
  envelope_id: DataTypes.INTEGER,
  kyc_status: { type: DataTypes.ENUM('not_started', 'pending', 'complete'), defaultValue: 'not_started' },
  documents_status: { type: DataTypes.ENUM('not_started', 'pending', 'complete'), defaultValue: 'not_started' },
  approval_status: { type: DataTypes.ENUM('not_required', 'pending', 'approved', 'rejected'), defaultValue: 'not_required' },
  next_action: DataTypes.STRING,
  notes: DataTypes.TEXT,
  activated_at: DataTypes.DATE,
  approved_by: DataTypes.INTEGER,
  approved_at: DataTypes.DATE,
  created_by: DataTypes.INTEGER,
  // Public self-registration link (vendor/buyer/supplier/landlord KYC intake)
  registration_token: { type: DataTypes.STRING(120), unique: true },
  registration_expires_at: DataTypes.DATE,
  registration_submitted_at: DataTypes.DATE,
}, { tableName: 'party_role_profiles', underscored: true });

PartyRoleProfile.belongsTo(Contact, { as: 'contact', foreignKey: 'contact_id' });
PartyRoleProfile.belongsTo(Property, { as: 'property', foreignKey: 'property_id' });
PartyRoleProfile.belongsTo(Agreement, { as: 'agreement', foreignKey: 'agreement_id' });
PartyRoleProfile.belongsTo(SigningEnvelope, { as: 'envelope', foreignKey: 'envelope_id' });

module.exports = PartyRoleProfile;
