const { DataTypes } = require('sequelize');
const sequelize = require('../config/db.config');
const Property = require('./Property');
const Contact = require('./Contact');

const MarketingActivity = sequelize.define('MarketingActivity', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  branch_id: { type: DataTypes.INTEGER, allowNull: false },
  marketing_code: { type: DataTypes.STRING(40), unique: true },
  property_id: DataTypes.INTEGER,
  owner_contact_id: DataTypes.INTEGER,
  channel: DataTypes.STRING(80),
  asset_task: DataTypes.STRING,
  start_date: DataTypes.DATEONLY,
  end_date: DataTypes.DATEONLY,
  budget: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  status: { type: DataTypes.ENUM('planned', 'active', 'paused', 'completed', 'cancelled'), defaultValue: 'planned' },
  enquiries_generated: { type: DataTypes.INTEGER, defaultValue: 0 },
  inspections_booked: { type: DataTypes.INTEGER, defaultValue: 0 },
  next_action: DataTypes.STRING,
  notes: DataTypes.TEXT,
  created_by: DataTypes.INTEGER,
}, { tableName: 'marketing_activities', underscored: true });

MarketingActivity.belongsTo(Property, { as: 'property', foreignKey: 'property_id' });
MarketingActivity.belongsTo(Contact, { as: 'owner', foreignKey: 'owner_contact_id' });

module.exports = MarketingActivity;
