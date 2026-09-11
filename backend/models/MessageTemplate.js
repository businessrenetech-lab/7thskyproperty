const { DataTypes } = require('sequelize');
const sequelize = require('../config/db.config');

// Reusable message templates for inbox replies (subject + body with
// {{placeholders}}). scope segregates sales from any future uses.
const MessageTemplate = sequelize.define('MessageTemplate', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  branch_id: { type: DataTypes.INTEGER, allowNull: false },
  name: { type: DataTypes.STRING, allowNull: false },
  channel: { type: DataTypes.ENUM('email', 'sms', 'any'), defaultValue: 'any' },
  scope: { type: DataTypes.STRING(40), defaultValue: 'sales' },
  subject: DataTypes.STRING,
  body: { type: DataTypes.TEXT, allowNull: false },
  is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
  created_by: DataTypes.INTEGER,
}, { tableName: 'message_templates', underscored: true });

module.exports = MessageTemplate;
