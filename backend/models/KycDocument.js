const { DataTypes } = require('sequelize');
const sequelize = require('../config/db.config');

const KycDocument = sequelize.define('KycDocument', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  branch_id: DataTypes.INTEGER,
  related_type: { type: DataTypes.STRING(60), allowNull: false },
  related_id: { type: DataTypes.INTEGER, allowNull: false },
  party_role_profile_id: DataTypes.INTEGER,
  agreement_id: DataTypes.INTEGER,
  role: DataTypes.STRING(40),
  document_type: { type: DataTypes.STRING(60), allowNull: false },
  title: DataTypes.STRING,
  file_url: DataTypes.STRING,
  file_url_back: DataTypes.STRING,
  reference_no: DataTypes.STRING,
  issue_date: DataTypes.DATEONLY,
  expiry_date: DataTypes.DATEONLY,
  status: { type: DataTypes.ENUM('missing', 'submitted', 'verified', 'rejected', 'needs_resubmission', 'expired'), defaultValue: 'submitted' },
  is_required: { type: DataTypes.BOOLEAN, defaultValue: true },
  uploaded_by: DataTypes.INTEGER,
  uploaded_by_role: { type: DataTypes.STRING(20), defaultValue: 'admin' },
  verified_by: DataTypes.INTEGER,
  verified_at: DataTypes.DATE,
  rejection_reason: DataTypes.TEXT,
  reviewer_notes: DataTypes.TEXT,
  // Provenance when this row was copied from a previously verified document.
  reused_from_document_id: DataTypes.INTEGER,
}, { tableName: 'kyc_documents', underscored: true });

module.exports = KycDocument;
