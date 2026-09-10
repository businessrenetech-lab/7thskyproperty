const { DataTypes } = require('sequelize');
const sequelize = require('../config/db.config');
const DealEvent = sequelize.define('DealEvent', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  branch_id: { type: DataTypes.INTEGER, allowNull: false },
  deal_id: { type: DataTypes.INTEGER, allowNull: false },
  event_type: { type: DataTypes.STRING(60), allowNull: false },
  detail: DataTypes.TEXT, amount: DataTypes.DECIMAL(15, 2),
  actor_user_id: DataTypes.INTEGER,
  occurred_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, { tableName: 'deal_events', underscored: true, updatedAt: false });
module.exports = DealEvent;
