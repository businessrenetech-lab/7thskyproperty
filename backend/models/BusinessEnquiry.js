const { DataTypes } = require('sequelize');
const sequelize = require('../config/db.config');

/**
 * BusinessEnquiry — a buyer / investor (or seller) lead in the Business Sale
 * pipeline (SOP Step 11 buyer lead tracking + workflow "Lead Intake"). May be
 * tied to a specific BusinessListing or be a general acquisition requirement.
 * Matches migration 0129-business-sale-crm.
 */
const BusinessEnquiry = sequelize.define('BusinessEnquiry', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  branch_id: { type: DataTypes.INTEGER, allowNull: false },
  enquiry_code: { type: DataTypes.STRING(40), unique: true },
  business_listing_id: DataTypes.INTEGER,
  enquiry_type: { type: DataTypes.STRING(20), defaultValue: 'buyer' },
  enquirer_name: DataTypes.STRING,
  company_name: DataTypes.STRING,
  phone: DataTypes.STRING,
  email: DataTypes.STRING,
  interest: DataTypes.STRING,
  preferred_industry: DataTypes.STRING(80),
  preferred_location: DataTypes.STRING,
  budget: DataTypes.DECIMAL(16, 2),
  source: DataTypes.STRING,
  message: DataTypes.TEXT,
  buyer_seriousness: DataTypes.STRING(30),
  financial_capability: DataTypes.STRING(30),
  stage: { type: DataTypes.STRING(30), defaultValue: 'new' },
  assigned_to: DataTypes.INTEGER,
  contact_id: DataTypes.INTEGER,
  converted: { type: DataTypes.BOOLEAN, defaultValue: false },
  next_action: DataTypes.STRING,
  follow_up_date: DataTypes.DATEONLY,
  notes: DataTypes.TEXT,
  created_by: DataTypes.INTEGER,
}, {
  tableName: 'business_enquiries',
  underscored: true,
});

const BusinessListing = require('./BusinessListing');
BusinessEnquiry.belongsTo(BusinessListing, { foreignKey: 'business_listing_id', as: 'listing' });

module.exports = BusinessEnquiry;
