const { DataTypes } = require('sequelize');
const sequelize = require('../config/db.config');

// A participant on a communication thread (keyed by thread_key, e.g.
// 'sales_enquiry:12' / 'property:40' / 'deal:7') — supports multiple parties
// (e.g. two buyers + an agent) on one conversation.
const CommParticipant = sequelize.define('CommParticipant', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  branch_id: { type: DataTypes.INTEGER, allowNull: false },
  thread_key: { type: DataTypes.STRING(80), allowNull: false },
  contact_id: DataTypes.INTEGER,
  user_id: DataTypes.INTEGER,
  role: DataTypes.STRING(40),
  added_by: DataTypes.INTEGER,
}, { tableName: 'comm_participants', underscored: true });

module.exports = CommParticipant;
