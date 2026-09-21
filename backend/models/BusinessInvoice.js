const { DataTypes } = require('sequelize');
const sequelize = require('../config/db.config');

/** BusinessInvoice — service-fee + commission invoices for a business sale (0132). */
const BusinessInvoice = sequelize.define('BusinessInvoice', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  branch_id: { type: DataTypes.INTEGER, allowNull: false },
  invoice_code: { type: DataTypes.STRING(40), unique: true },
  business_listing_id: { type: DataTypes.INTEGER, allowNull: false },
  settlement_id: DataTypes.INTEGER,
  client_contact_id: DataTypes.INTEGER,
  client_name: DataTypes.STRING,
  invoice_type: { type: DataTypes.STRING(20), defaultValue: 'service_fee' },
  line_items: { type: DataTypes.JSON, defaultValue: null },
  subtotal: { type: DataTypes.DECIMAL(16, 2), defaultValue: 0 },
  discount: { type: DataTypes.DECIMAL(16, 2), defaultValue: 0 },
  vat_percent: { type: DataTypes.DECIMAL(6, 3), defaultValue: 0 },
  vat_amount: { type: DataTypes.DECIMAL(16, 2), defaultValue: 0 },
  total_amount: { type: DataTypes.DECIMAL(16, 2), defaultValue: 0 },
  paid_amount: { type: DataTypes.DECIMAL(16, 2), defaultValue: 0 },
  payments: { type: DataTypes.JSON, defaultValue: null },
  status: { type: DataTypes.STRING(20), defaultValue: 'draft' },
  issue_date: DataTypes.DATEONLY,
  due_date: DataTypes.DATEONLY,
  notes: DataTypes.TEXT,
  created_by: DataTypes.INTEGER,
}, { tableName: 'business_invoices', underscored: true });

// Convenience join to the listing on list/detail.
const BusinessListing = require('./BusinessListing');
BusinessInvoice.belongsTo(BusinessListing, { foreignKey: 'business_listing_id', as: 'listing' });

module.exports = BusinessInvoice;
