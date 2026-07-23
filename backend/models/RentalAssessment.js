const { DataTypes } = require('sequelize');
const sequelize = require('../config/db.config');
const Property = require('./Property');

const RentalAssessment = sequelize.define('RentalAssessment', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  branch_id: { type: DataTypes.INTEGER, allowNull: false },
  assessment_code: { type: DataTypes.STRING(40), unique: true },
  property_id: { type: DataTypes.INTEGER, allowNull: false },
  owner_contact_id: DataTypes.INTEGER,
  assessment_date: DataTypes.DATEONLY,
  inspector_id: DataTypes.INTEGER,
  market_rent_min: DataTypes.DECIMAL(15, 2),
  market_rent_max: DataTypes.DECIMAL(15, 2),
  recommended_rent: DataTypes.DECIMAL(15, 2),
  approved_rent: DataTypes.DECIMAL(15, 2),
  readiness_score: { type: DataTypes.INTEGER, defaultValue: 0 },
  readiness_status: { type: DataTypes.ENUM('not_ready', 'action_required', 'ready_for_marketing'), defaultValue: 'not_ready' },
  ready_for_marketing: { type: DataTypes.BOOLEAN, defaultValue: false },
  summary: DataTypes.TEXT,
  status: { type: DataTypes.ENUM('draft', 'in_progress', 'completed'), defaultValue: 'draft' },
  report_url: DataTypes.STRING,
  created_by: DataTypes.INTEGER,
}, { tableName: 'rental_assessments', underscored: true });

const RentalAssessmentItem = sequelize.define('RentalAssessmentItem', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  assessment_id: { type: DataTypes.INTEGER, allowNull: false },
  section: DataTypes.STRING,
  assessment_item: { type: DataTypes.STRING, allowNull: false },
  finding: DataTypes.TEXT,
  required_action: DataTypes.TEXT,
  responsible_id: DataTypes.INTEGER,
  due_date: DataTypes.DATEONLY,
  status: { type: DataTypes.ENUM('pending', 'in_progress', 'done', 'na'), defaultValue: 'pending' },
  is_blocking: { type: DataTypes.BOOLEAN, defaultValue: false },
  maintenance_recommendation: DataTypes.TEXT,
  safety_observation: DataTypes.TEXT,
  condition_rating: { type: DataTypes.ENUM('good', 'fair', 'poor', 'damaged', 'na'), defaultValue: 'na' },
  // Room-checklist verdicts (null = not assessed / N/A)
  is_clean: DataTypes.BOOLEAN,
  is_undamaged: DataTypes.BOOLEAN,
  is_working: DataTypes.BOOLEAN,
  photos: {
    type: DataTypes.JSON, defaultValue: [],
    get() { const v = this.getDataValue('photos'); if (typeof v === 'string') { try { return JSON.parse(v); } catch { return []; } } return v || []; },
  },
  photo_url: DataTypes.STRING,
  work_order_id: DataTypes.INTEGER,
  notes: DataTypes.TEXT,
  sort_order: { type: DataTypes.INTEGER, defaultValue: 0 },
}, { tableName: 'rental_assessment_items', underscored: true });

RentalAssessment.belongsTo(Property, { as: 'property', foreignKey: 'property_id' });
RentalAssessment.hasMany(RentalAssessmentItem, { as: 'items', foreignKey: 'assessment_id' });
RentalAssessmentItem.belongsTo(RentalAssessment, { foreignKey: 'assessment_id' });

module.exports = { RentalAssessment, RentalAssessmentItem };
