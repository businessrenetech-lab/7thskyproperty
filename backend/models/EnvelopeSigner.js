const { DataTypes } = require('sequelize');
const sequelize = require('../config/db.config');
const SigningEnvelope = require('./SigningEnvelope');

const EnvelopeSigner = sequelize.define('EnvelopeSigner', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  envelope_id: { type: DataTypes.INTEGER, allowNull: false },
  signer_order: { type: DataTypes.INTEGER, defaultValue: 1 },
  role: { type: DataTypes.ENUM('internal_approver', 'client', 'landlord', 'tenant', 'provider', 'staff_countersign', 'witness'), defaultValue: 'client' },
  name: { type: DataTypes.STRING, allowNull: false },
  email: { type: DataTypes.STRING, allowNull: false },
  phone: DataTypes.STRING,
  contact_id: DataTypes.INTEGER,
  user_id: DataTypes.INTEGER,
  access_token: { type: DataTypes.STRING(120), unique: true },
  token_expires_at: DataTypes.DATE,
  otp_required: { type: DataTypes.BOOLEAN, defaultValue: false },
  otp_code: DataTypes.STRING(10),
  status: { type: DataTypes.ENUM('pending', 'sent', 'viewed', 'signed', 'declined'), defaultValue: 'pending' },
  viewed_at: DataTypes.DATE,
  signed_at: DataTypes.DATE,
  declined_reason: DataTypes.STRING,
  ip_address: DataTypes.STRING,
  user_agent: DataTypes.STRING,
}, { tableName: 'envelope_signers', underscored: true });

SigningEnvelope.hasMany(EnvelopeSigner, { foreignKey: 'envelope_id', as: 'signers' });
EnvelopeSigner.belongsTo(SigningEnvelope, { foreignKey: 'envelope_id' });

module.exports = EnvelopeSigner;
