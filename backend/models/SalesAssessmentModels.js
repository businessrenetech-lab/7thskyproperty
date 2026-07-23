const { DataTypes } = require('sequelize');
const sequelize = require('../config/db.config');
const Property = require('./Property');
const Contact = require('./Contact');

function cleanJson(value) {
  if (Array.isArray(value)) return value.map(cleanJson);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.entries(value)
    .filter(([key]) => !/^\d+$/.test(key) && !['__proto__', 'prototype', 'constructor'].includes(key))
    .map(([key, child]) => [key, cleanJson(child)]));
}

function jsonField(field, fallback) {
  const wantsArray = Array.isArray(fallback);
  return {
    type: DataTypes.JSON,
    defaultValue: fallback,
    get() {
      let value = this.getDataValue(field);
      if (typeof value === 'string') {
        try { value = JSON.parse(value); } catch { return fallback; }
      }
      if (value == null || (wantsArray ? !Array.isArray(value) : Array.isArray(value) || typeof value !== 'object')) return fallback;
      return cleanJson(value);
    },
  };
}

const define = (name, tableName, attributes) => sequelize.define(name, attributes, { tableName, underscored: true });

const SaleAssessment = define('SaleAssessment', 'sale_assessments', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  branch_id: { type: DataTypes.INTEGER, allowNull: false }, property_id: { type: DataTypes.INTEGER, allowNull: false }, owner_contact_id: DataTypes.INTEGER,
  assessed_by: DataTypes.INTEGER, scheduled_at: DataTypes.DATE, assessment_date: DataTypes.DATEONLY,
  inspector_name: DataTypes.STRING, occupancy_status: DataTypes.STRING(40),
  status: DataTypes.ENUM('draft', 'submitted', 'changes_requested', 'approved'), overall_score: DataTypes.DECIMAL(5, 2), marketability_score: DataTypes.DECIMAL(5, 2),
  condition_summary: DataTypes.TEXT, access_notes: DataTypes.TEXT, marketability_notes: DataTypes.TEXT, recommended_actions: DataTypes.TEXT,
  photos: jsonField('photos', []), blockers: jsonField('blockers', []), submitted_by: DataTypes.INTEGER, submitted_at: DataTypes.DATE,
  approved_by: DataTypes.INTEGER, approved_at: DataTypes.DATE, approval_notes: DataTypes.TEXT, reopen_reason: DataTypes.TEXT,
  created_by: DataTypes.INTEGER, updated_by: DataTypes.INTEGER,
});

const SaleAssessmentItem = define('SaleAssessmentItem', 'sale_assessment_items', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true }, branch_id: { type: DataTypes.INTEGER, allowNull: false },
  assessment_id: { type: DataTypes.INTEGER, allowNull: false }, section: DataTypes.STRING(80), item_key: DataTypes.STRING(100), label: DataTypes.STRING,
  condition_status: DataTypes.ENUM('not_assessed', 'poor', 'fair', 'good', 'excellent', 'not_applicable'), score: DataTypes.DECIMAL(5, 2),
  priority: DataTypes.ENUM('low', 'medium', 'high', 'critical'), notes: DataTypes.TEXT, recommendation: DataTypes.TEXT,
  is_clean: DataTypes.BOOLEAN, is_undamaged: DataTypes.BOOLEAN, is_working: DataTypes.BOOLEAN,
  estimated_cost: DataTypes.DECIMAL(15, 2), photos: jsonField('photos', []), sort_order: DataTypes.INTEGER,
  created_by: DataTypes.INTEGER, updated_by: DataTypes.INTEGER,
});

const SaleAppraisal = define('SaleAppraisal', 'sale_appraisals', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true }, branch_id: { type: DataTypes.INTEGER, allowNull: false },
  property_id: { type: DataTypes.INTEGER, allowNull: false }, assessment_id: { type: DataTypes.INTEGER, allowNull: false }, appraiser_id: DataTypes.INTEGER,
  appraisal_date: DataTypes.DATEONLY, status: DataTypes.ENUM('draft', 'submitted', 'changes_requested', 'approved'), currency: DataTypes.STRING(8),
  market_value_min: DataTypes.DECIMAL(15, 2), recommended_value: DataTypes.DECIMAL(15, 2), market_value_max: DataTypes.DECIMAL(15, 2),
  approved_value: DataTypes.DECIMAL(15, 2), reserve_value: DataTypes.DECIMAL(15, 2), quick_sale_value: DataTypes.DECIMAL(15, 2), expected_days: DataTypes.INTEGER,
  confidence_score: DataTypes.DECIMAL(5, 2), valuation_method: DataTypes.STRING(80), market_summary: DataTypes.TEXT,
  condition_adjustment_percent: DataTypes.DECIMAL(6, 2), location_adjustment_percent: DataTypes.DECIMAL(6, 2),
  assumptions: DataTypes.TEXT, disclaimer: DataTypes.TEXT, blockers: jsonField('blockers', []),
  strengths: jsonField('strengths', []), weaknesses: jsonField('weaknesses', []), report_url: DataTypes.STRING, pdf_url: DataTypes.STRING,
  submitted_by: DataTypes.INTEGER, submitted_at: DataTypes.DATE, approved_by: DataTypes.INTEGER, approved_at: DataTypes.DATE,
  approval_notes: DataTypes.TEXT, created_by: DataTypes.INTEGER, updated_by: DataTypes.INTEGER,
});

const SaleAppraisalComparable = define('SaleAppraisalComparable', 'sale_appraisal_comparables', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true }, branch_id: { type: DataTypes.INTEGER, allowNull: false },
  appraisal_id: { type: DataTypes.INTEGER, allowNull: false }, title: DataTypes.STRING, address: DataTypes.TEXT, property_type: DataTypes.STRING(80),
  transaction_type: DataTypes.ENUM('sale', 'listing'), transaction_date: DataTypes.DATEONLY, asking_price: DataTypes.DECIMAL(15, 2),
  sale_price: DataTypes.DECIMAL(15, 2), adjusted_value: DataTypes.DECIMAL(15, 2), area: DataTypes.STRING(80), land_size: DataTypes.STRING(80),
  building_size: DataTypes.STRING(80), bedrooms: DataTypes.INTEGER, bathrooms: DataTypes.INTEGER, distance_km: DataTypes.DECIMAL(8, 2),
  adjustment_percent: DataTypes.DECIMAL(6, 2), source: DataTypes.STRING, source_url: DataTypes.STRING, notes: DataTypes.TEXT,
  photos: jsonField('photos', []), sort_order: DataTypes.INTEGER, created_by: DataTypes.INTEGER, updated_by: DataTypes.INTEGER,
});

const SaleProposal = define('SaleProposal', 'sale_proposals', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true }, branch_id: { type: DataTypes.INTEGER, allowNull: false },
  property_id: { type: DataTypes.INTEGER, allowNull: false }, assessment_id: { type: DataTypes.INTEGER, allowNull: false }, appraisal_id: DataTypes.INTEGER,
  vendor_contact_id: DataTypes.INTEGER, proposal_number: DataTypes.STRING(50), status: DataTypes.ENUM('draft', 'generated', 'sending', 'sent', 'accepted', 'rejected', 'expired'),
  proposal_date: DataTypes.DATEONLY, valid_until: DataTypes.DATEONLY, currency: DataTypes.STRING(8), proposed_asking_price: DataTypes.DECIMAL(15, 2),
  proposed_reserve_price: DataTypes.DECIMAL(15, 2), agency_type: DataTypes.ENUM('exclusive', 'open', 'sole', 'joint'),
  commission_percent: DataTypes.DECIMAL(6, 2), commission_fixed: DataTypes.DECIMAL(15, 2), marketing_budget: DataTypes.DECIMAL(15, 2),
  marketing_plan: jsonField('marketing_plan', []), included_services: jsonField('included_services', []), summary: DataTypes.TEXT,
  terms: DataTypes.TEXT, assumptions: DataTypes.TEXT, disclaimer: DataTypes.TEXT, report_url: DataTypes.STRING, pdf_url: DataTypes.STRING,
  generated_at: DataTypes.DATE, sent_at: DataTypes.DATE, accepted_at: DataTypes.DATE, rejected_at: DataTypes.DATE,
  rejection_reason: DataTypes.TEXT, created_by: DataTypes.INTEGER, updated_by: DataTypes.INTEGER,
});

const SaleReportVersion = define('SaleReportVersion', 'sale_report_versions', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true }, branch_id: { type: DataTypes.INTEGER, allowNull: false },
  property_id: { type: DataTypes.INTEGER, allowNull: false }, assessment_id: DataTypes.INTEGER, appraisal_id: DataTypes.INTEGER,
  proposal_id: DataTypes.INTEGER, report_type: DataTypes.ENUM('appraisal', 'proposal'), version_number: DataTypes.INTEGER,
  status: DataTypes.ENUM('generated', 'superseded'), snapshot: jsonField('snapshot', {}), snapshot_hash: DataTypes.STRING(64),
  file_name: DataTypes.STRING, report_url: DataTypes.STRING, pdf_url: DataTypes.STRING, mime_type: DataTypes.STRING(80),
  generated_by: DataTypes.INTEGER, generated_at: DataTypes.DATE,
});

SaleAssessment.belongsTo(Property, { as: 'property', foreignKey: 'property_id' });
SaleAssessment.belongsTo(Contact, { as: 'owner', foreignKey: 'owner_contact_id' });
SaleAssessment.hasMany(SaleAssessmentItem, { as: 'items', foreignKey: 'assessment_id' });
SaleAssessment.hasOne(SaleAppraisal, { as: 'appraisal', foreignKey: 'assessment_id' });
SaleAssessment.hasMany(SaleProposal, { as: 'proposals', foreignKey: 'assessment_id' });
SaleAssessment.hasMany(SaleReportVersion, { as: 'reports', foreignKey: 'assessment_id' });
SaleAssessmentItem.belongsTo(SaleAssessment, { as: 'assessment', foreignKey: 'assessment_id' });
SaleAppraisal.belongsTo(SaleAssessment, { as: 'assessment', foreignKey: 'assessment_id' });
SaleAppraisal.belongsTo(Property, { as: 'property', foreignKey: 'property_id' });
SaleAppraisal.hasMany(SaleAppraisalComparable, { as: 'comparables', foreignKey: 'appraisal_id' });
SaleAppraisal.hasMany(SaleReportVersion, { as: 'reports', foreignKey: 'appraisal_id' });
SaleAppraisalComparable.belongsTo(SaleAppraisal, { as: 'appraisal', foreignKey: 'appraisal_id' });
SaleProposal.belongsTo(SaleAssessment, { as: 'assessment', foreignKey: 'assessment_id' });
SaleProposal.belongsTo(SaleAppraisal, { as: 'appraisal', foreignKey: 'appraisal_id' });
SaleProposal.belongsTo(Property, { as: 'property', foreignKey: 'property_id' });
SaleProposal.belongsTo(Contact, { as: 'vendor', foreignKey: 'vendor_contact_id' });
SaleProposal.hasMany(SaleReportVersion, { as: 'reports', foreignKey: 'proposal_id' });
SaleReportVersion.belongsTo(SaleAssessment, { as: 'assessment', foreignKey: 'assessment_id' });
SaleReportVersion.belongsTo(SaleAppraisal, { as: 'appraisal', foreignKey: 'appraisal_id' });
SaleReportVersion.belongsTo(SaleProposal, { as: 'proposal', foreignKey: 'proposal_id' });
SaleReportVersion.belongsTo(Property, { as: 'property', foreignKey: 'property_id' });

module.exports = {
  SaleAssessment,
  SaleAssessmentItem,
  SaleAppraisal,
  SaleAppraisalComparable,
  SaleProposal,
  SaleReportVersion,
};
