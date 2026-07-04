const { DataTypes } = require('sequelize');
const sequelize = require('../config/db.config');
const PropertyInvoice = require('./PropertyInvoice');
const AccountCategory = require('./AccountCategory');
const ServiceProvider = require('./ServiceProvider');

const InvoiceItem = sequelize.define('InvoiceItem', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  invoice_id: { type: DataTypes.INTEGER, allowNull: false },
  description: { type: DataTypes.STRING, allowNull: false },
  quantity: { type: DataTypes.DECIMAL(12, 2), defaultValue: 1 },
  unit: DataTypes.STRING(40),
  unit_price: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  amount: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  account_category_id: DataTypes.INTEGER,
  provider_id: DataTypes.INTEGER,
  property_id: DataTypes.INTEGER,
  tenancy_id: DataTypes.INTEGER,
  tax_enabled: { type: DataTypes.BOOLEAN, defaultValue: false },
  tax_included: { type: DataTypes.BOOLEAN, defaultValue: false },
  tax_rate: { type: DataTypes.DECIMAL(6, 2), defaultValue: 0 },
  tax_amount: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  billable_to_tenant: { type: DataTypes.BOOLEAN, defaultValue: false },
  deductible_from_landlord: { type: DataTypes.BOOLEAN, defaultValue: false },
  sort_order: { type: DataTypes.INTEGER, defaultValue: 0 },
}, { tableName: 'invoice_items', underscored: true });

PropertyInvoice.hasMany(InvoiceItem, { foreignKey: 'invoice_id', as: 'items' });
InvoiceItem.belongsTo(PropertyInvoice, { foreignKey: 'invoice_id' });
InvoiceItem.belongsTo(AccountCategory, { as: 'category', foreignKey: 'account_category_id' });
InvoiceItem.belongsTo(ServiceProvider, { as: 'provider', foreignKey: 'provider_id' });

module.exports = InvoiceItem;
