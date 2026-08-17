const { DataTypes } = require('sequelize');
const sequelize = require('../config/db.config');
const Property = require('./Property');
const ShortStayBooking = require('./ShortStayBooking');
const ServiceProvider = require('./ServiceProvider');

const ShortStayHousekeepingTask = sequelize.define('ShortStayHousekeepingTask', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  branch_id: { type: DataTypes.INTEGER, allowNull: false },
  property_id: { type: DataTypes.INTEGER, allowNull: false },
  booking_id: DataTypes.INTEGER,
  task_type: {
    type: DataTypes.ENUM('turnover', 'mid_stay', 'deep_clean'),
    defaultValue: 'turnover',
  },
  assigned_provider_id: DataTypes.INTEGER,
  scheduled_date: { type: DataTypes.DATEONLY, allowNull: false },
  status: {
    type: DataTypes.ENUM('pending', 'in_progress', 'completed'),
    defaultValue: 'pending',
  },
  checklist: {
    type: DataTypes.JSON, defaultValue: [],
    get() { const v = this.getDataValue('checklist'); if (typeof v === 'string') { try { return JSON.parse(v); } catch { return []; } } return v || []; },
  },
  cost: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0.00 },
  charge_to: {
    type: DataTypes.ENUM('owner', 'guest', 'agency'),
    defaultValue: 'owner',
  },
}, { tableName: 'short_stay_housekeeping_tasks', underscored: true });

ShortStayHousekeepingTask.belongsTo(Property, { foreignKey: 'property_id', as: 'property' });
ShortStayHousekeepingTask.belongsTo(ShortStayBooking, { foreignKey: 'booking_id', as: 'booking' });
ShortStayHousekeepingTask.belongsTo(ServiceProvider, { foreignKey: 'assigned_provider_id', as: 'provider' });

module.exports = ShortStayHousekeepingTask;
