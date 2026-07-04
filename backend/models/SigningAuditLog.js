const { DataTypes } = require('sequelize');
const sequelize = require('../config/db.config');
const SigningEnvelope = require('./SigningEnvelope');

const SigningAuditLog = sequelize.define('SigningAuditLog', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  envelope_id: { type: DataTypes.INTEGER, allowNull: false },
  signer_id: DataTypes.INTEGER,
  event: { type: DataTypes.STRING, allowNull: false },
  actor_email: DataTypes.STRING,
  ip_address: DataTypes.STRING,
  user_agent: DataTypes.STRING,
  meta: { type: DataTypes.JSON, defaultValue: {} },
  created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, { tableName: 'signing_audit_logs', underscored: true, timestamps: false });

SigningEnvelope.hasMany(SigningAuditLog, { foreignKey: 'envelope_id', as: 'audit_logs' });
SigningAuditLog.belongsTo(SigningEnvelope, { foreignKey: 'envelope_id' });

module.exports = SigningAuditLog;
