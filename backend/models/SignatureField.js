const { DataTypes } = require('sequelize');
const sequelize = require('../config/db.config');
const SigningEnvelope = require('./SigningEnvelope');
const EnvelopeSigner = require('./EnvelopeSigner');

const SignatureField = sequelize.define('SignatureField', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  envelope_id: { type: DataTypes.INTEGER, allowNull: false },
  signer_id: DataTypes.INTEGER,
  field_type: { type: DataTypes.ENUM('signature', 'initials', 'date_signed', 'full_name', 'email', 'text', 'checkbox'), defaultValue: 'signature' },
  page: { type: DataTypes.INTEGER, defaultValue: 1 },
  pos_x: { type: DataTypes.INTEGER, defaultValue: 0 },
  pos_y: { type: DataTypes.INTEGER, defaultValue: 0 },
  width: { type: DataTypes.INTEGER, defaultValue: 180 },
  height: { type: DataTypes.INTEGER, defaultValue: 60 },
  required: { type: DataTypes.BOOLEAN, defaultValue: true },
  label: DataTypes.STRING,
  value: DataTypes.TEXT,
}, { tableName: 'signature_fields', underscored: true });

SigningEnvelope.hasMany(SignatureField, { foreignKey: 'envelope_id', as: 'fields' });
SignatureField.belongsTo(SigningEnvelope, { foreignKey: 'envelope_id' });
EnvelopeSigner.hasMany(SignatureField, { foreignKey: 'signer_id', as: 'fields' });
SignatureField.belongsTo(EnvelopeSigner, { foreignKey: 'signer_id' });

module.exports = SignatureField;
