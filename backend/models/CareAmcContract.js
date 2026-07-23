const { DataTypes } = require('sequelize');
const sequelize = require('../config/db.config');
const Contact = require('./Contact');
const CareAmcContract = sequelize.define('CareAmcContract', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  branch_id: DataTypes.INTEGER, contract_code: { type: DataTypes.STRING(40), unique: true },
  customer_contact_id: DataTypes.INTEGER, customer_name: DataTypes.STRING, mobile: DataTypes.STRING,
  service_id: DataTypes.INTEGER, service_name: DataTypes.STRING, site_address: DataTypes.TEXT, district: DataTypes.STRING(80),
  frequency: { type: DataTypes.ENUM('monthly','quarterly','half_yearly','annual'), defaultValue: 'quarterly' },
  visits_per_year: { type: DataTypes.INTEGER, defaultValue: 4 }, annual_value: { type: DataTypes.DECIMAL(15,2), defaultValue: 0 },
  start_date: DataTypes.DATEONLY, end_date: DataTypes.DATEONLY, next_visit_date: DataTypes.DATEONLY, visits_done: { type: DataTypes.INTEGER, defaultValue: 0 },
  assigned_provider_id: DataTypes.INTEGER, status: { type: DataTypes.ENUM('active','paused','expired','cancelled'), defaultValue: 'active' },
  notes: DataTypes.TEXT, created_by: DataTypes.INTEGER,
}, { tableName: 'care_amc_contracts', underscored: true });
CareAmcContract.belongsTo(Contact, { as: 'customer', foreignKey: 'customer_contact_id' });
module.exports = CareAmcContract;
