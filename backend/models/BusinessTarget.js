const { DataTypes } = require('sequelize');
const sequelize = require('../config/db.config');

/** BusinessTarget — a candidate business shortlisted for an acquisition mandate. 0133. */
const BusinessTarget = sequelize.define('BusinessTarget', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  branch_id: { type: DataTypes.INTEGER, allowNull: false },
  mandate_id: { type: DataTypes.INTEGER, allowNull: false },
  business_listing_id: DataTypes.INTEGER,
  business_name: { type: DataTypes.STRING, allowNull: false },
  business_type: DataTypes.STRING(60),
  industry: DataTypes.STRING(80),
  location: DataTypes.STRING,
  source: DataTypes.STRING,
  asking_price: DataTypes.DECIMAL(16, 2),
  fit_score: DataTypes.INTEGER,
  status: { type: DataTypes.STRING(30), defaultValue: 'identified' },
  contact_info: DataTypes.STRING,
  notes: DataTypes.TEXT,
  created_by: DataTypes.INTEGER,
}, { tableName: 'business_targets', underscored: true });

module.exports = BusinessTarget;
