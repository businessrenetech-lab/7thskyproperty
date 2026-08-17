const { DataTypes } = require('sequelize');
const sequelize = require('../config/db.config');
const Property = require('./Property');

const ShortStayRatePlan = sequelize.define('ShortStayRatePlan', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  branch_id: { type: DataTypes.INTEGER, allowNull: false },
  property_id: { type: DataTypes.INTEGER, allowNull: false },
  name: { type: DataTypes.STRING(120), allowNull: false },
  start_date: { type: DataTypes.DATEONLY, allowNull: false },
  end_date: { type: DataTypes.DATEONLY, allowNull: false },
  nightly_rate: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
  weekend_rate: DataTypes.DECIMAL(15, 2),
  min_nights: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
  priority: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
}, { tableName: 'short_stay_rate_plans', underscored: true });

ShortStayRatePlan.belongsTo(Property, { foreignKey: 'property_id', as: 'property' });

module.exports = ShortStayRatePlan;
