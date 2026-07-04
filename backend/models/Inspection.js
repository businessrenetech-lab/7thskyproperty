const { DataTypes } = require('sequelize');
const sequelize = require('../config/db.config');
const Property = require('./Property');

const Inspection = sequelize.define('Inspection', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  branch_id: { type: DataTypes.INTEGER, allowNull: false },
  inspection_code: { type: DataTypes.STRING(40), unique: true },
  property_id: DataTypes.INTEGER,
  tenancy_id: DataTypes.INTEGER,
  tenant_contact_id: DataTypes.INTEGER,
  owner_contact_id: DataTypes.INTEGER,
  project_id: DataTypes.INTEGER,
  client_id: DataTypes.INTEGER,
  inspection_type: { type: DataTypes.ENUM('site_assessment', 'entry', 'routine', 'exit', 'other'), defaultValue: 'routine' },
  status: { type: DataTypes.ENUM('scheduled', 'in_progress', 'completed', 'cancelled'), defaultValue: 'scheduled' },
  scheduled_date: DataTypes.DATE,
  completed_date: DataTypes.DATE,
  inspector_id: DataTypes.INTEGER,
  summary: DataTypes.TEXT,
  photo_video_evidence: { type: DataTypes.JSON, defaultValue: [] },
  follow_up_required: { type: DataTypes.BOOLEAN, defaultValue: false },
  report_sent_to_owner: { type: DataTypes.BOOLEAN, defaultValue: false },
  report_url: DataTypes.STRING,
  created_by: DataTypes.INTEGER,
}, { tableName: 'inspections', underscored: true });

const InspectionItem = sequelize.define('InspectionItem', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  inspection_id: { type: DataTypes.INTEGER, allowNull: false },
  area: DataTypes.STRING,
  item: DataTypes.STRING,
  required: { type: DataTypes.BOOLEAN, defaultValue: true },
  finding: DataTypes.TEXT,
  photo_required: { type: DataTypes.BOOLEAN, defaultValue: false },
  risk_rating: { type: DataTypes.ENUM('low', 'medium', 'high', 'critical', 'na'), defaultValue: 'na' },
  deduction_required: { type: DataTypes.BOOLEAN, defaultValue: false },
  action_required: DataTypes.STRING,
  responsible_id: DataTypes.INTEGER,
  condition: { type: DataTypes.ENUM('good', 'fair', 'poor', 'damaged', 'na'), defaultValue: 'good' },
  notes: DataTypes.TEXT,
  photo_url: DataTypes.STRING,
  sort_order: { type: DataTypes.INTEGER, defaultValue: 0 },
}, { tableName: 'inspection_items', underscored: true });

Inspection.belongsTo(Property, { as: 'property', foreignKey: 'property_id' });
Inspection.hasMany(InspectionItem, { foreignKey: 'inspection_id', as: 'items' });
InspectionItem.belongsTo(Inspection, { foreignKey: 'inspection_id' });

module.exports = { Inspection, InspectionItem };
