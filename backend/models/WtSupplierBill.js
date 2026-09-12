const { DataTypes } = require('sequelize');
const sequelize = require('../config/db.config');

// Supplier bill (A/P): what we owe a supplier, per project + cost category. Table
// created by migration 0124. balance = total − amount_paid; status derived on write.
const WtSupplierBill = sequelize.define('WtSupplierBill', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  branch_id: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
  service_line: { type: DataTypes.STRING(40), allowNull: false, defaultValue: 'water_tank' },
  bill_code: { type: DataTypes.STRING(30), allowNull: false, unique: true },
  supplier_id: { type: DataTypes.INTEGER, allowNull: false },
  supplier_name: DataTypes.STRING(200),
  project_code: DataTypes.STRING(30),
  category: { type: DataTypes.STRING(60), defaultValue: 'Materials' },
  description: DataTypes.TEXT,
  bill_date: DataTypes.DATEONLY,
  due_date: DataTypes.DATEONLY,
  total: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  amount_paid: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  balance: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  status: { type: DataTypes.ENUM('unpaid', 'partial', 'paid', 'void'), defaultValue: 'unpaid' },
  bill_url: DataTypes.STRING(500),
  notes: DataTypes.TEXT,
  created_by: DataTypes.INTEGER,
}, { tableName: 'wt_supplier_bills', underscored: true });

module.exports = WtSupplierBill;
