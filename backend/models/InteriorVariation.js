const { DataTypes } = require('sequelize');
const sequelize = require('../config/db.config');

// A client-approved, re-priced change to an in-flight interior-design project.
// Scoped by service_line (shared across the Interior Design verticals). Table
// created by migration 0121.
const InteriorVariation = sequelize.define('InteriorVariation', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  branch_id: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
  service_line: { type: DataTypes.STRING(40), allowNull: false, defaultValue: 'residential_interior_design' },
  variation_code: { type: DataTypes.STRING(40), allowNull: false, unique: true },
  project_id: DataTypes.STRING(30),
  work_order_code: DataTypes.STRING(30),
  client_name: DataTypes.STRING(200),
  description: DataTypes.TEXT,
  reason: DataTypes.STRING(255),
  amount_delta: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  timeline_impact: DataTypes.STRING(255),
  status: { type: DataTypes.ENUM('draft', 'sent', 'approved', 'rejected'), defaultValue: 'draft' },
  decided_at: DataTypes.DATE,
  decided_by: DataTypes.STRING(120),
  created_by: DataTypes.INTEGER,
}, { tableName: 'interior_variations', underscored: true });

module.exports = InteriorVariation;
