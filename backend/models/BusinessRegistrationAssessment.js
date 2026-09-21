const { DataTypes } = require('sequelize');
const sequelize = require('../config/db.config');

// Consultation / business-structure assessment for a registration project (0137).
const BusinessRegistrationAssessment = sequelize.define('BusinessRegistrationAssessment', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  branch_id: { type: DataTypes.INTEGER, allowNull: false },
  project_id: { type: DataTypes.INTEGER, allowNull: false },
  business_objectives: DataTypes.TEXT,
  ownership_structure: DataTypes.STRING(160),
  proposed_activities: DataTypes.TEXT,
  regulatory_requirements: DataTypes.TEXT,
  recommended_structure: DataTypes.STRING(120),
  estimated_timeline: DataTypes.STRING(120),
  risks_notes: DataTypes.TEXT,
  assessed_by: DataTypes.INTEGER,
  assessed_at: DataTypes.DATE,
  created_by: DataTypes.INTEGER,
}, { tableName: 'business_registration_assessments', underscored: true });

module.exports = BusinessRegistrationAssessment;
