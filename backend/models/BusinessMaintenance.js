const { DataTypes } = require('sequelize');
const sequelize = require('../config/db.config');

/** BusinessMaintenance — SOP Step 16 maintenance request log (0135). */
const BusinessMaintenance = sequelize.define('BusinessMaintenance', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  branch_id: { type: DataTypes.INTEGER, allowNull: false },
  business_listing_id: { type: DataTypes.INTEGER, allowNull: false },
  lease_id: DataTypes.INTEGER,
  title: DataTypes.STRING,
  description: DataTypes.TEXT,
  reported_date: DataTypes.DATEONLY,
  priority: { type: DataTypes.STRING(20), defaultValue: 'medium' },
  status: { type: DataTypes.STRING(20), defaultValue: 'open' },
  cost: DataTypes.DECIMAL(16, 2),
  vendor: DataTypes.STRING,
  resolved_date: DataTypes.DATEONLY,
  notes: DataTypes.TEXT,
  created_by: DataTypes.INTEGER,
}, { tableName: 'business_maintenance', underscored: true });

module.exports = BusinessMaintenance;
