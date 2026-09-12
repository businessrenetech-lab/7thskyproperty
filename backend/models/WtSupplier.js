const { DataTypes } = require('sequelize');
const sequelize = require('../config/db.config');

// Supplier / vendor register for project costing + accounts payable. Scoped by
// service_line (shared across a line's projects). Table created by migration 0123.
const WtSupplier = sequelize.define('WtSupplier', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  branch_id: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
  service_line: { type: DataTypes.STRING(40), allowNull: false, defaultValue: 'water_tank' },
  code: { type: DataTypes.STRING(30), allowNull: false, unique: true },
  name: { type: DataTypes.STRING(200), allowNull: false },
  category: DataTypes.STRING(80),
  contact_person: DataTypes.STRING(120),
  phone: DataTypes.STRING(40),
  email: DataTypes.STRING(160),
  address: DataTypes.STRING(255),
  bank_details: DataTypes.JSON,
  opening_balance: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  notes: DataTypes.TEXT,
  is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
  created_by: DataTypes.INTEGER,
}, { tableName: 'wt_suppliers', underscored: true });

module.exports = WtSupplier;
