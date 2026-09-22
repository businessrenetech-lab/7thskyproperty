const { DataTypes } = require('sequelize');
const sequelize = require('../config/db.config');

/** One row per business property — profile, teaser copy, preparation checklist (0142). */
const PropertyBusinessProfile = sequelize.define('PropertyBusinessProfile', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  branch_id: { type: DataTypes.INTEGER, allowNull: false },
  property_id: { type: DataTypes.INTEGER, allowNull: false, unique: true },
  business_type: DataTypes.STRING(30),
  industry: DataTypes.STRING(120),
  ownership_structure: DataTypes.STRING(60),
  company_registration_no: DataTypes.STRING(80),
  trade_licence_no: DataTypes.STRING(80),
  tin_bin: DataTypes.STRING(80),
  year_established: DataTypes.INTEGER,
  staff_count: DataTypes.INTEGER,
  lease_status: DataTypes.STRING(20),
  lease_details: DataTypes.TEXT,
  reason_for_sale: DataTypes.TEXT,
  annual_turnover: DataTypes.DECIMAL(16, 2),
  annual_profit: DataTypes.DECIMAL(16, 2),
  monthly_revenue: DataTypes.DECIMAL(16, 2),
  included_assets: DataTypes.TEXT,
  stock_info: DataTypes.TEXT,
  employee_info: DataTypes.TEXT,
  ip_details: DataTypes.TEXT,
  teaser_headline: DataTypes.STRING(160),
  teaser_summary: DataTypes.TEXT,
  preparation: DataTypes.JSON,
  created_by: DataTypes.INTEGER,
}, { tableName: 'property_business_profiles', underscored: true });

module.exports = PropertyBusinessProfile;
