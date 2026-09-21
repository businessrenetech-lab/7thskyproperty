const { DataTypes } = require('sequelize');
const sequelize = require('../config/db.config');

// Registration invoices — deposit/progress/final/provider (migration 0139).
const BusinessRegistrationInvoice = sequelize.define('BusinessRegistrationInvoice', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  branch_id: { type: DataTypes.INTEGER, allowNull: false },
  invoice_code: { type: DataTypes.STRING(40), unique: true },
  project_id: { type: DataTypes.INTEGER, allowNull: false },
  client_contact_id: DataTypes.INTEGER,
  client_name: DataTypes.STRING,
  invoice_type: { type: DataTypes.STRING(20), defaultValue: 'deposit' },
  line_items: { type: DataTypes.JSON, defaultValue: null },
  subtotal: { type: DataTypes.DECIMAL(16, 2), defaultValue: 0 },
  discount: { type: DataTypes.DECIMAL(16, 2), defaultValue: 0 },
  vat_percent: { type: DataTypes.DECIMAL(6, 2), defaultValue: 0 },
  vat_amount: { type: DataTypes.DECIMAL(16, 2), defaultValue: 0 },
  total_amount: { type: DataTypes.DECIMAL(16, 2), defaultValue: 0 },
  paid_amount: { type: DataTypes.DECIMAL(16, 2), defaultValue: 0 },
  payments: { type: DataTypes.JSON, defaultValue: null },
  status: { type: DataTypes.STRING(20), defaultValue: 'draft' },
  issue_date: DataTypes.DATEONLY,
  due_date: DataTypes.DATEONLY,
  notes: DataTypes.TEXT,
  created_by: DataTypes.INTEGER,
}, { tableName: 'business_registration_invoices', underscored: true });

const BusinessRegistrationProject = require('./BusinessRegistrationProject');
BusinessRegistrationInvoice.belongsTo(BusinessRegistrationProject, { foreignKey: 'project_id', as: 'project' });

module.exports = BusinessRegistrationInvoice;
