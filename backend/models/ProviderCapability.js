const { DataTypes } = require('sequelize');
const sequelize = require('../config/db.config');
const ServiceProvider = require('./ServiceProvider');
const ServiceCategory = require('./ServiceCategory');

const ProviderCapability = sequelize.define('ProviderCapability', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  provider_id: { type: DataTypes.INTEGER, allowNull: false },
  category_id: DataTypes.INTEGER,
  service_id: DataTypes.INTEGER,
  is_capable: { type: DataTypes.BOOLEAN, defaultValue: true },
  notes: DataTypes.STRING,
}, { tableName: 'provider_capabilities', underscored: true });

ServiceProvider.hasMany(ProviderCapability, { foreignKey: 'provider_id', as: 'capabilities' });
ProviderCapability.belongsTo(ServiceProvider, { foreignKey: 'provider_id' });
ProviderCapability.belongsTo(ServiceCategory, { foreignKey: 'category_id', as: 'category' });

module.exports = ProviderCapability;
