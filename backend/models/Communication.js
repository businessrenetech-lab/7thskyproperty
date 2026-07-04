const { DataTypes } = require('sequelize');
const sequelize = require('../config/db.config');

/**
 * Communication — polymorphic comms history reused across
 * contacts / clients / leads / providers / projects.
 */
const Communication = sequelize.define('Communication', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  branch_id: { type: DataTypes.INTEGER, allowNull: false },
  entity_type: { type: DataTypes.STRING(40), allowNull: false },
  entity_id: { type: DataTypes.INTEGER, allowNull: false },
  property_id: DataTypes.INTEGER,
  tenancy_id: DataTypes.INTEGER,
  owner_contact_id: DataTypes.INTEGER,
  tenant_contact_id: DataTypes.INTEGER,
  channel: { type: DataTypes.ENUM('call', 'email', 'sms', 'whatsapp', 'meeting', 'note'), defaultValue: 'note' },
  direction: { type: DataTypes.ENUM('inbound', 'outbound', 'internal'), defaultValue: 'outbound' },
  subject: DataTypes.STRING,
  body: DataTypes.TEXT,
  action_required: DataTypes.STRING,
  responsible_id: DataTypes.INTEGER,
  due_date: DataTypes.DATEONLY,
  status: { type: DataTypes.ENUM('open', 'in_progress', 'done', 'closed'), defaultValue: 'open' },
  occurred_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  follow_up_at: DataTypes.DATE,
  user_id: DataTypes.INTEGER,
}, {
  tableName: 'communications',
  underscored: true,
});

module.exports = Communication;
