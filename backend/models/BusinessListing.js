const { DataTypes } = require('sequelize');
const sequelize = require('../config/db.config');

/**
 * BusinessListing — a business offered for sale (the subject of the Business
 * Sale SOP). Not a property: it carries company/licence/lease/financial fields.
 * Matches migration 0129-business-sale-crm.
 */
const BusinessListing = sequelize.define('BusinessListing', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  branch_id: { type: DataTypes.INTEGER, allowNull: false },
  business_code: { type: DataTypes.STRING(40), unique: true },
  listing_type: { type: DataTypes.STRING(20), defaultValue: 'sale' },
  business_name: { type: DataTypes.STRING, allowNull: false },
  business_type: DataTypes.STRING(60),
  industry: DataTypes.STRING(80),
  business_address: DataTypes.STRING,
  area: DataTypes.STRING,
  city: DataTypes.STRING,
  district: DataTypes.STRING,
  ownership_structure: DataTypes.STRING(80),
  company_registration_no: DataTypes.STRING(80),
  trade_licence_no: DataTypes.STRING(80),
  tin_bin: DataTypes.STRING(80),
  year_established: DataTypes.INTEGER,
  staff_count: DataTypes.INTEGER,
  lease_status: DataTypes.STRING(20),
  lease_details: DataTypes.TEXT,
  reason_for_sale: DataTypes.TEXT,
  indicative_price: DataTypes.DECIMAL(16, 2),
  currency: { type: DataTypes.STRING(8), defaultValue: 'BDT' },
  annual_turnover: DataTypes.DECIMAL(16, 2),
  annual_profit: DataTypes.DECIMAL(16, 2),
  monthly_revenue: DataTypes.DECIMAL(16, 2),
  included_assets: DataTypes.TEXT,
  stock_info: DataTypes.TEXT,
  employee_info: DataTypes.TEXT,
  ip_details: DataTypes.TEXT,
  description: DataTypes.TEXT,
  highlights: DataTypes.TEXT,
  confidential: { type: DataTypes.BOOLEAN, defaultValue: true },
  seller_contact_id: DataTypes.INTEGER,
  assigned_to: DataTypes.INTEGER,
  stage: { type: DataTypes.STRING(40), defaultValue: 'lead_intake' },
  status: { type: DataTypes.STRING(30), defaultValue: 'active' },
  workflow_state: { type: DataTypes.JSON, defaultValue: null }, // per-stage SOP tracker (0130)
  special_requirements: DataTypes.TEXT,
  commencement_date: DataTypes.DATEONLY,
  completion_date: DataTypes.DATEONLY,
  created_by: DataTypes.INTEGER,
}, {
  tableName: 'business_listings',
  underscored: true,
});

// The seller / business owner is a Contact (category='business').
const Contact = require('./Contact');
BusinessListing.belongsTo(Contact, { foreignKey: 'seller_contact_id', as: 'seller' });

module.exports = BusinessListing;
