const { DataTypes } = require('sequelize');
const sequelize = require('../config/db.config');

/** BusinessInspection — SOP Step 14–15 buyer meeting / operational walkthrough. */
const BusinessInspection = sequelize.define('BusinessInspection', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  branch_id: { type: DataTypes.INTEGER, allowNull: false },
  business_listing_id: { type: DataTypes.INTEGER, allowNull: false },
  business_enquiry_id: DataTypes.INTEGER,
  inspection_type: { type: DataTypes.STRING(30), defaultValue: 'walkthrough' },
  scheduled_date: DataTypes.DATE,
  attendees: DataTypes.STRING,
  outcome: DataTypes.STRING(30),
  feedback: DataTypes.TEXT,
  status: { type: DataTypes.STRING(20), defaultValue: 'scheduled' },
  notes: DataTypes.TEXT,
  created_by: DataTypes.INTEGER,
}, { tableName: 'business_inspections', underscored: true });

module.exports = BusinessInspection;
