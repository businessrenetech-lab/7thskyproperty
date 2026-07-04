const { DataTypes } = require('sequelize');
const sequelize = require('../config/db.config');
const Contact = require('./Contact');
const Folio = require('./Folio');
const Property = require('./Property');
const AccountCategory = require('./AccountCategory');
const ServiceProvider = require('./ServiceProvider');
const PropertyInvoice = require('./PropertyInvoice');

const LandlordBill = sequelize.define('LandlordBill', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  branch_id: { type: DataTypes.INTEGER, allowNull: false },
  bill_code: { type: DataTypes.STRING(40), unique: true },
  landlord_contact_id: DataTypes.INTEGER,
  landlord_folio_id: DataTypes.INTEGER,
  property_id: DataTypes.INTEGER,
  bill_account_id: DataTypes.INTEGER,
  provider_id: DataTypes.INTEGER,
  description: DataTypes.TEXT,
  full_bill_amount: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  tenant_pays_part: { type: DataTypes.BOOLEAN, defaultValue: false },
  tenant_contact_id: DataTypes.INTEGER,
  tenant_tenancy_id: DataTypes.INTEGER,
  tenant_amount: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  tenant_invoice_id: DataTypes.INTEGER,
  tenant_invoice_account_id: DataTypes.INTEGER,
  tenant_invoice_description: DataTypes.TEXT,
  due_date: DataTypes.DATEONLY,
  uploaded_bill_url: DataTypes.STRING,
  status: { type: DataTypes.ENUM('draft', 'approved', 'pending', 'paid', 'cancelled'), defaultValue: 'pending' },
  created_by: DataTypes.INTEGER,
}, { tableName: 'landlord_bills', underscored: true });

LandlordBill.belongsTo(Contact, { as: 'landlord', foreignKey: 'landlord_contact_id' });
LandlordBill.belongsTo(Contact, { as: 'tenant', foreignKey: 'tenant_contact_id' });
LandlordBill.belongsTo(Folio, { as: 'landlordFolio', foreignKey: 'landlord_folio_id' });
LandlordBill.belongsTo(Property, { as: 'property', foreignKey: 'property_id' });
LandlordBill.belongsTo(AccountCategory, { as: 'billAccount', foreignKey: 'bill_account_id' });
LandlordBill.belongsTo(AccountCategory, { as: 'tenantInvoiceAccount', foreignKey: 'tenant_invoice_account_id' });
LandlordBill.belongsTo(ServiceProvider, { as: 'provider', foreignKey: 'provider_id' });
LandlordBill.belongsTo(PropertyInvoice, { as: 'tenantInvoice', foreignKey: 'tenant_invoice_id' });

module.exports = LandlordBill;
