const { DataTypes } = require('sequelize');
const sequelize = require('../config/db.config');

/**
 * BusinessAssessment — SOP Step 2 (viability/readiness scoring), Step 3 (risk
 * identification) and Step 6 (presentation) for a BusinessListing.
 * Matches migration 0130.
 */
const BusinessAssessment = sequelize.define('BusinessAssessment', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  branch_id: { type: DataTypes.INTEGER, allowNull: false },
  business_listing_id: { type: DataTypes.INTEGER, allowNull: true },
  property_id: DataTypes.INTEGER, // business property on the shared sales engine (0143)
  assessment_type: { type: DataTypes.STRING(30), defaultValue: 'preliminary' },
  assessor_id: DataTypes.INTEGER,
  assessment_date: DataTypes.DATEONLY,
  operational_condition: DataTypes.INTEGER,
  market_attractiveness: DataTypes.INTEGER,
  business_readiness: DataTypes.INTEGER,
  commercial_viability: DataTypes.INTEGER,
  growth_potential: DataTypes.INTEGER,
  transaction_feasibility: DataTypes.INTEGER,
  presentation_score: DataTypes.INTEGER,
  risks: { type: DataTypes.JSON, defaultValue: null },
  overall_rating: DataTypes.INTEGER,
  recommendation: DataTypes.STRING(30),
  summary: DataTypes.TEXT,
  next_steps: DataTypes.TEXT,
  status: { type: DataTypes.STRING(20), defaultValue: 'draft' },
  created_by: DataTypes.INTEGER,
}, {
  tableName: 'business_assessments',
  underscored: true,
});

module.exports = BusinessAssessment;
