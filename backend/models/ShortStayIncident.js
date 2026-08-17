const { DataTypes } = require('sequelize');
const sequelize = require('../config/db.config');
const Property = require('./Property');
const ShortStayBooking = require('./ShortStayBooking');
const WorkOrder = require('./WorkOrder');

const ShortStayIncident = sequelize.define('ShortStayIncident', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  branch_id: { type: DataTypes.INTEGER, allowNull: false },
  property_id: { type: DataTypes.INTEGER, allowNull: false },
  booking_id: DataTypes.INTEGER,
  severity: {
    type: DataTypes.ENUM('low', 'medium', 'high', 'critical'),
    defaultValue: 'medium',
  },
  category: {
    type: DataTypes.ENUM('damage', 'noise_complaint', 'missing_item', 'safety', 'breach'),
    defaultValue: 'damage',
  },
  description: { type: DataTypes.TEXT, allowNull: false },
  evidence_urls: {
    type: DataTypes.JSON, defaultValue: [],
    get() { const v = this.getDataValue('evidence_urls'); if (typeof v === 'string') { try { return JSON.parse(v); } catch { return []; } } return v || []; },
  },
  work_order_id: DataTypes.INTEGER,
  assigned_provider_id: DataTypes.INTEGER,
  estimated_cost: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0.00 },
  deduct_from_deposit_amount: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0.00 },
  status: {
    type: DataTypes.ENUM('reported', 'investigating', 'resolved', 'closed'),
    defaultValue: 'reported',
  },
}, { tableName: 'short_stay_incidents', underscored: true });

ShortStayIncident.belongsTo(Property, { foreignKey: 'property_id', as: 'property' });
ShortStayIncident.belongsTo(ShortStayBooking, { foreignKey: 'booking_id', as: 'booking' });
ShortStayIncident.belongsTo(WorkOrder, { foreignKey: 'work_order_id', as: 'work_order' });

module.exports = ShortStayIncident;
