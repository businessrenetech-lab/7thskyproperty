const { DataTypes } = require('sequelize');
const sequelize = require('../config/db.config');

const SigningEnvelope = sequelize.define('SigningEnvelope', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  branch_id: { type: DataTypes.INTEGER, allowNull: false },
  envelope_code: { type: DataTypes.STRING(40), unique: true },
  template_id: DataTypes.INTEGER,
  agreement_id: DataTypes.INTEGER,
  title: { type: DataTypes.STRING, allowNull: false },
  status: { type: DataTypes.ENUM('draft', 'pending_approval', 'sent', 'viewed', 'partially_signed', 'completed', 'declined', 'voided', 'expired'), defaultValue: 'draft' },
  related_type: DataTypes.STRING(40),
  related_id: DataTypes.INTEGER,
  document_html: DataTypes.TEXT('long'),
  message: DataTypes.TEXT,
  signing_order_enforced: { type: DataTypes.BOOLEAN, defaultValue: true },
  final_pdf_url: DataTypes.STRING,
  certificate_url: DataTypes.STRING,
  content_hash: DataTypes.STRING(128),
  expires_at: DataTypes.DATE,
  sent_at: DataTypes.DATE,
  completed_at: DataTypes.DATE,
  voided_reason: DataTypes.STRING,
  created_by: DataTypes.INTEGER,
  // Structured agreement terms captured at generation time; synced into the
  // operational records (property fees, owner profile, tenancy) on completion.
  terms: { type: DataTypes.JSON, defaultValue: null },
  // CC recipients (e.g. owner CC on tenancy agreements).
  cc_emails: { type: DataTypes.JSON, defaultValue: [] },
}, { tableName: 'signing_envelopes', underscored: true });

module.exports = SigningEnvelope;
