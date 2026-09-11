const { DataTypes } = require('sequelize');
const sequelize = require('../config/db.config');

// A follow-up sequence template. `steps` is an ordered array of
// { day_offset (business days from enrolment), channel: 'email'|'sms',
// template_id (MessageTemplate) }. The scheduler sends each due step once.
const LeadSequence = sequelize.define('LeadSequence', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  branch_id: { type: DataTypes.INTEGER, allowNull: false },
  name: { type: DataTypes.STRING, allowNull: false },
  active: { type: DataTypes.BOOLEAN, defaultValue: true },
  steps: DataTypes.JSON,
  created_by: DataTypes.INTEGER,
}, { tableName: 'lead_sequences', underscored: true });

module.exports = LeadSequence;
