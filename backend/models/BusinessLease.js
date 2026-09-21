const { DataTypes } = require('sequelize');
const sequelize = require('../config/db.config');

/** BusinessLease — executed lease terms for a rent listing (0135). */
const BusinessLease = sequelize.define('BusinessLease', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  branch_id: { type: DataTypes.INTEGER, allowNull: false },
  lease_code: { type: DataTypes.STRING(40), unique: true },
  business_listing_id: { type: DataTypes.INTEGER, allowNull: false },
  tenant_contact_id: DataTypes.INTEGER,
  tenant_name: DataTypes.STRING,
  monthly_rent: DataTypes.DECIMAL(16, 2),
  security_deposit: DataTypes.DECIMAL(16, 2),
  service_charge: DataTypes.DECIMAL(16, 2),
  lease_start: DataTypes.DATEONLY,
  lease_end: DataTypes.DATEONLY,
  lease_term_months: DataTypes.INTEGER,
  rent_due_day: { type: DataTypes.INTEGER, defaultValue: 1 },
  rent_review_structure: DataTypes.STRING(120),
  commission_amount: DataTypes.DECIMAL(16, 2),
  status: { type: DataTypes.STRING(20), defaultValue: 'active' },
  notes: DataTypes.TEXT,
  created_by: DataTypes.INTEGER,
}, { tableName: 'business_leases', underscored: true });

module.exports = BusinessLease;
