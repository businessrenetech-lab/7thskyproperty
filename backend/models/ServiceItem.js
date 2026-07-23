const { DataTypes } = require('sequelize');
const sequelize = require('../config/db.config');
const ServiceCategory = require('./ServiceCategory');

const ServiceItem = sequelize.define('ServiceItem', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  branch_id: DataTypes.INTEGER,
  category_id: DataTypes.INTEGER,
  vertical: { type: DataTypes.STRING(60), defaultValue: 'general' },
  name: { type: DataTypes.STRING, allowNull: false },
  code: DataTypes.STRING(60),
  description: DataTypes.TEXT,
  service_group: DataTypes.STRING(60),
  fee_model: { type: DataTypes.ENUM('fixed', 'quote', 'hourly', 'per_visit', 'call_out', 'amc'), defaultValue: 'quote' },
  base_price: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  unit: DataTypes.STRING(40),
  sspc_fee_type: { type: DataTypes.ENUM('percentage', 'fixed'), defaultValue: 'percentage' },
  sspc_fee_value: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 },
  provider_pay_type: { type: DataTypes.ENUM('percentage', 'fixed', 'remainder'), defaultValue: 'remainder' },
  provider_pay_value: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 },
  delivery_mode: { type: DataTypes.ENUM('provider', 'internal', 'either'), defaultValue: 'either' },
  applicable_to: { type: DataTypes.JSON, defaultValue: null },
  requires_site_assessment: { type: DataTypes.BOOLEAN, defaultValue: false },
  tags: { type: DataTypes.JSON, defaultValue: null },
  is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
  sort_order: { type: DataTypes.INTEGER, defaultValue: 0 },
  notes: DataTypes.TEXT,
  created_by: DataTypes.INTEGER,
}, { tableName: 'care_services', underscored: true });

ServiceItem.belongsTo(ServiceCategory, { as: 'category', foreignKey: 'category_id' });
ServiceCategory.hasMany(ServiceItem, { as: 'services', foreignKey: 'category_id' });

module.exports = ServiceItem;
