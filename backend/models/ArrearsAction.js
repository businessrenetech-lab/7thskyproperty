const { DataTypes } = require('sequelize');
const sequelize = require('../config/db.config');
const Property = require('./Property');
const Contact = require('./Contact');

const ArrearsAction = sequelize.define('ArrearsAction', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  branch_id: { type: DataTypes.INTEGER, allowNull: false },
  arrears_code: { type: DataTypes.STRING(40), unique: true },
  rental_ledger_id: DataTypes.INTEGER,
  property_id: DataTypes.INTEGER,
  owner_contact_id: DataTypes.INTEGER,
  tenant_contact_id: DataTypes.INTEGER,
  due_date: DataTypes.DATEONLY,
  amount_due: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  amount_received: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  outstanding_amount: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  days_overdue: { type: DataTypes.INTEGER, defaultValue: 0 },
  reminder_stage: { type: DataTypes.ENUM('none', '1_7_days', '8_14_days', '15_plus_days', 'final_notice'), defaultValue: 'none' },
  reminder_sent_at: DataTypes.DATE,
  notice_issued: { type: DataTypes.BOOLEAN, defaultValue: false },
  escalation_level: { type: DataTypes.ENUM('monitor', 'reminder_1', 'reminder_2', 'manager_review', 'legal_review'), defaultValue: 'monitor' },
  action_required: DataTypes.STRING,
  status: { type: DataTypes.ENUM('open', 'in_progress', 'resolved', 'written_off', 'closed'), defaultValue: 'open' },
  notes: DataTypes.TEXT,
  created_by: DataTypes.INTEGER,
}, { tableName: 'arrears_actions', underscored: true });

ArrearsAction.belongsTo(Property, { as: 'property', foreignKey: 'property_id' });
ArrearsAction.belongsTo(Contact, { as: 'tenant', foreignKey: 'tenant_contact_id' });
ArrearsAction.belongsTo(Contact, { as: 'owner', foreignKey: 'owner_contact_id' });

module.exports = ArrearsAction;
