const { DataTypes } = require('sequelize');
const sequelize = require('../config/db.config');
const CareWarranty = sequelize.define('CareWarranty', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  branch_id: DataTypes.INTEGER, warranty_code: { type: DataTypes.STRING(40), unique: true },
  work_order_id: DataTypes.INTEGER, customer_contact_id: DataTypes.INTEGER, customer_name: DataTypes.STRING,
  warranty_type: DataTypes.STRING(60), start_date: DataTypes.DATEONLY, expiry_date: DataTypes.DATEONLY,
  terms: DataTypes.TEXT, status: { type: DataTypes.ENUM('active','expiring','expired','claimed','void'), defaultValue: 'active' },
  notes: DataTypes.TEXT, created_by: DataTypes.INTEGER,
}, { tableName: 'care_warranties', underscored: true });
module.exports = CareWarranty;
