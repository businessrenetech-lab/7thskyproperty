const { DataTypes } = require('sequelize');
const sequelize = require('../config/db.config');
const Contact = require('./Contact');
const CareQuotation = sequelize.define('CareQuotation', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  branch_id: DataTypes.INTEGER, quote_code: { type: DataTypes.STRING(40), unique: true },
  enquiry_id: DataTypes.INTEGER, customer_contact_id: DataTypes.INTEGER, customer_name: DataTypes.STRING, mobile: DataTypes.STRING, email: DataTypes.STRING,
  vertical: DataTypes.STRING(60), service_id: DataTypes.INTEGER, category_id: DataTypes.INTEGER, service_name: DataTypes.STRING,
  site_address: DataTypes.TEXT, district: DataTypes.STRING(80), city: DataTypes.STRING(80),
  tank_type: DataTypes.STRING(60), tank_capacity: DataTypes.STRING(60), tank_count: DataTypes.INTEGER, water_source: DataTypes.STRING(60),
  findings: DataTypes.TEXT, issues: DataTypes.TEXT,
  amount: { type: DataTypes.DECIMAL(15,2), defaultValue: 0 }, materials_estimate: { type: DataTypes.DECIMAL(15,2), defaultValue: 0 },
  valid_until: DataTypes.DATEONLY, terms: DataTypes.TEXT,
  status: { type: DataTypes.ENUM('draft','assessed','sent','accepted','rejected','expired','converted'), defaultValue: 'draft' },
  agreement_envelope_id: DataTypes.INTEGER, agreement_status: { type: DataTypes.ENUM('none','sent','signed'), defaultValue: 'none' },
  work_order_id: DataTypes.INTEGER, notes: DataTypes.TEXT, created_by: DataTypes.INTEGER,
}, { tableName: 'care_quotations', underscored: true });
CareQuotation.belongsTo(Contact, { as: 'customer', foreignKey: 'customer_contact_id' });
module.exports = CareQuotation;
