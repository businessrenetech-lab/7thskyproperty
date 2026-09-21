const { DataTypes } = require('sequelize');
const sequelize = require('../config/db.config');

/** BusinessRentCollection — one monthly rent period on a lease (0135). */
const BusinessRentCollection = sequelize.define('BusinessRentCollection', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  branch_id: { type: DataTypes.INTEGER, allowNull: false },
  lease_id: { type: DataTypes.INTEGER, allowNull: false },
  business_listing_id: DataTypes.INTEGER,
  period_label: DataTypes.STRING(7),
  due_date: DataTypes.DATEONLY,
  rent_due: DataTypes.DECIMAL(16, 2),
  rent_received: { type: DataTypes.DECIMAL(16, 2), defaultValue: 0 },
  status: { type: DataTypes.STRING(20), defaultValue: 'due' },
  paid_date: DataTypes.DATEONLY,
  method: DataTypes.STRING(30),
  notes: DataTypes.TEXT,
  created_by: DataTypes.INTEGER,
}, { tableName: 'business_rent_collections', underscored: true });

module.exports = BusinessRentCollection;
