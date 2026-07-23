const { DataTypes } = require('sequelize');
const sequelize = require('../config/db.config');

const ServiceCategory = sequelize.define('ServiceCategory', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  branch_id: DataTypes.INTEGER,
  parent_id: DataTypes.INTEGER,
  vertical: { type: DataTypes.STRING(60), defaultValue: 'general' },
  name: { type: DataTypes.STRING, allowNull: false },
  code: DataTypes.STRING(60),
  slug: DataTypes.STRING(120),
  description: DataTypes.TEXT,
  icon: DataTypes.STRING(60),
  sort_order: { type: DataTypes.INTEGER, defaultValue: 0 },
  is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
  created_by: DataTypes.INTEGER,
}, { tableName: 'care_service_categories', underscored: true });

// Self-referential tree
ServiceCategory.hasMany(ServiceCategory, { as: 'children', foreignKey: 'parent_id' });
ServiceCategory.belongsTo(ServiceCategory, { as: 'parent', foreignKey: 'parent_id' });

module.exports = ServiceCategory;
