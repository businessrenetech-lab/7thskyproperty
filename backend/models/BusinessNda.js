const { DataTypes } = require('sequelize');
const sequelize = require('../config/db.config');

/** A buyer's NDA for one confidential business listing (0144). */
const BusinessNda = sequelize.define('BusinessNda', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  branch_id: { type: DataTypes.INTEGER, allowNull: false },
  property_id: { type: DataTypes.INTEGER, allowNull: false },
  contact_id: { type: DataTypes.INTEGER, allowNull: false },
  enquiry_id: DataTypes.INTEGER,
  envelope_id: DataTypes.INTEGER,
  status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'requested' },
  buyer_company: DataTypes.STRING(160),
  approved_by: DataTypes.INTEGER,
  approved_at: DataTypes.DATE,
  signed_at: DataTypes.DATE,
  released_by: DataTypes.INTEGER,
  released_at: DataTypes.DATE,
  release_token: { type: DataTypes.STRING(64), unique: true },
  token_expires_at: DataTypes.DATE,
  decline_reason: DataTypes.TEXT,
  last_error: DataTypes.TEXT,
}, { tableName: 'business_ndas', underscored: true });

module.exports = BusinessNda;
