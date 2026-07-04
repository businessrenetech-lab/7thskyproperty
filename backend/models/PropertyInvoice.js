const { DataTypes } = require('sequelize');
const sequelize = require('../config/db.config');

// New property-care invoice (distinct model name to avoid clashing with the
// leftover legacy Invoice model that still maps to the same table name).
const PropertyInvoice = sequelize.define('PropertyInvoice', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  branch_id: { type: DataTypes.INTEGER, allowNull: false },
  invoice_code: { type: DataTypes.STRING(40), unique: true },
  invoice_kind: { type: DataTypes.ENUM('client', 'provider'), defaultValue: 'client' },
  invoice_type: DataTypes.STRING(40),
  client_id: DataTypes.INTEGER,
  contact_id: DataTypes.INTEGER,
  provider_id: DataTypes.INTEGER,
  project_id: DataTypes.INTEGER,
  work_order_id: DataTypes.INTEGER,
  quotation_id: DataTypes.INTEGER,
  property_id: DataTypes.INTEGER,
  tenancy_id: DataTypes.INTEGER,
  rental_ledger_id: DataTypes.INTEGER,
  folio_id: DataTypes.INTEGER,
  account_category_id: DataTypes.INTEGER,
  billed_to_type: DataTypes.ENUM('tenant', 'landlord', 'client', 'provider'),
  service_for: DataTypes.ENUM('tenant', 'landlord', 'property', 'tenancy'),
  service_period_start: DataTypes.DATEONLY,
  service_period_end: DataTypes.DATEONLY,
  title: DataTypes.STRING,
  status: { type: DataTypes.ENUM('draft', 'sent', 'pending', 'paid', 'partially_paid', 'overdue', 'cancelled', 'refunded'), defaultValue: 'draft' },
  subtotal: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  discount: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  tax: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  tax_enabled: { type: DataTypes.BOOLEAN, defaultValue: false },
  tax_included: { type: DataTypes.BOOLEAN, defaultValue: false },
  tax_rate: { type: DataTypes.DECIMAL(6, 2), defaultValue: 0 },
  tax_amount: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  total: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  amount_paid: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  balance: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  currency: { type: DataTypes.STRING(8), defaultValue: 'BDT' },
  issue_date: DataTypes.DATEONLY,
  due_date: DataTypes.DATEONLY,
  notes: DataTypes.TEXT,
  uploaded_invoice_url: DataTypes.STRING,
  source_bill_id: DataTypes.INTEGER,
  source_receipt_id: DataTypes.INTEGER,
  created_by: DataTypes.INTEGER,
}, { tableName: 'invoices', underscored: true });

const Client = require('./Client');
const Contact = require('./Contact');
const ServiceProvider = require('./ServiceProvider');
const Folio = require('./Folio');
const AccountCategory = require('./AccountCategory');
PropertyInvoice.belongsTo(Client, { as: 'client', foreignKey: 'client_id' });
PropertyInvoice.belongsTo(Contact, { as: 'contact', foreignKey: 'contact_id' });
PropertyInvoice.belongsTo(ServiceProvider, { as: 'provider', foreignKey: 'provider_id' });
PropertyInvoice.belongsTo(Folio, { as: 'folio', foreignKey: 'folio_id' });
PropertyInvoice.belongsTo(AccountCategory, { as: 'category', foreignKey: 'account_category_id' });

module.exports = PropertyInvoice;
