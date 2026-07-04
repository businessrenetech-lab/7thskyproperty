const { DataTypes } = require('sequelize');
const sequelize = require('../config/db.config');
const Lead = require('./Lead');

const LeadActivity = sequelize.define('LeadActivity', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  lead_id: { type: DataTypes.INTEGER, allowNull: false },
  activity_type: { type: DataTypes.ENUM('call', 'email', 'sms', 'whatsapp', 'meeting', 'note', 'status_change'), defaultValue: 'note' },
  title: DataTypes.STRING,
  notes: DataTypes.TEXT,
  outcome: DataTypes.STRING,
  occurred_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  user_id: DataTypes.INTEGER,
}, { tableName: 'lead_activities', underscored: true, updatedAt: false });

Lead.hasMany(LeadActivity, { foreignKey: 'lead_id', as: 'activities' });
LeadActivity.belongsTo(Lead, { foreignKey: 'lead_id' });

module.exports = LeadActivity;
