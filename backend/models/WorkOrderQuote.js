const { DataTypes } = require('sequelize');
const sequelize = require('../config/db.config');
const WorkOrder = require('./WorkOrder');

const WorkOrderQuote = sequelize.define('WorkOrderQuote', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  work_order_id: { type: DataTypes.INTEGER, allowNull: false },
  provider_id: DataTypes.INTEGER,
  provider_name: DataTypes.STRING,
  quote_amount: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
  quoted_at: DataTypes.DATEONLY,
  notes: DataTypes.TEXT,
  is_selected: { type: DataTypes.BOOLEAN, defaultValue: false },
  created_by: DataTypes.INTEGER,
}, { tableName: 'work_order_quotes', underscored: true });

WorkOrder.hasMany(WorkOrderQuote, { as: 'quotes', foreignKey: 'work_order_id' });
WorkOrderQuote.belongsTo(WorkOrder, { foreignKey: 'work_order_id' });

module.exports = WorkOrderQuote;
