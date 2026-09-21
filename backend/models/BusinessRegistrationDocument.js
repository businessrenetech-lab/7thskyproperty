const { DataTypes } = require('sequelize');
const sequelize = require('../config/db.config');

// Document register / Schedule D KYC checklist for a registration project (0137).
const BusinessRegistrationDocument = sequelize.define('BusinessRegistrationDocument', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  branch_id: { type: DataTypes.INTEGER, allowNull: false },
  project_id: { type: DataTypes.INTEGER, allowNull: false },
  category: DataTypes.STRING(60),
  doc_type: { type: DataTypes.STRING(120), allowNull: false },
  file_url: DataTypes.STRING,
  status: { type: DataTypes.STRING(20), defaultValue: 'pending' },
  verified_by: DataTypes.INTEGER,
  verified_at: DataTypes.DATE,
  notes: DataTypes.TEXT,
  created_by: DataTypes.INTEGER,
}, { tableName: 'business_registration_documents', underscored: true });

module.exports = BusinessRegistrationDocument;
