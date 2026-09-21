const { DataTypes } = require('sequelize');
const sequelize = require('../config/db.config');

/** BusinessOffer — SOP Step 16–18 offers, counteroffers, non-circumvention. */
const BusinessOffer = sequelize.define('BusinessOffer', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  branch_id: { type: DataTypes.INTEGER, allowNull: false },
  offer_code: { type: DataTypes.STRING(40), unique: true },
  business_listing_id: { type: DataTypes.INTEGER, allowNull: false },
  business_enquiry_id: DataTypes.INTEGER,
  buyer_contact_id: DataTypes.INTEGER,
  buyer_name: DataTypes.STRING,
  offer_amount: DataTypes.DECIMAL(16, 2),
  offer_date: DataTypes.DATEONLY,
  conditions: DataTypes.TEXT,
  operational_transition: DataTypes.TEXT,
  settlement_terms: DataTypes.TEXT,
  status: { type: DataTypes.STRING(20), defaultValue: 'submitted' },
  counter_amount: DataTypes.DECIMAL(16, 2),
  counter_notes: DataTypes.TEXT,
  non_circumvention_flag: { type: DataTypes.BOOLEAN, defaultValue: false },
  notes: DataTypes.TEXT,
  created_by: DataTypes.INTEGER,
}, { tableName: 'business_offers', underscored: true });

module.exports = BusinessOffer;
