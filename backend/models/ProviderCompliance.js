const { DataTypes } = require('sequelize');
const sequelize = require('../config/db.config');
const ServiceProvider = require('./ServiceProvider');

const ProviderCompliance = sequelize.define('ProviderCompliance', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  provider_id: { type: DataTypes.INTEGER, allowNull: false },
  doc_type: { type: DataTypes.STRING, allowNull: false },
  title: DataTypes.STRING,
  reference_no: DataTypes.STRING,
  file_url: DataTypes.STRING,
  issued_date: DataTypes.DATEONLY,
  expiry_date: DataTypes.DATEONLY,
  status: { type: DataTypes.ENUM('valid', 'expiring', 'expired', 'missing'), defaultValue: 'valid' },
  doc_category: { type: DataTypes.ENUM('kyc', 'compliance', 'insurance', 'certification', 'other'), defaultValue: 'compliance' },
  verified: { type: DataTypes.BOOLEAN, defaultValue: false },
  last_reminded_at: DataTypes.DATE,
  uploaded_by: DataTypes.INTEGER,
}, { tableName: 'provider_compliance', underscored: true });

ServiceProvider.hasMany(ProviderCompliance, { foreignKey: 'provider_id', as: 'compliance' });
ProviderCompliance.belongsTo(ServiceProvider, { foreignKey: 'provider_id' });

module.exports = ProviderCompliance;
