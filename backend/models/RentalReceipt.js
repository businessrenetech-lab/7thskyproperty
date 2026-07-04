const { DataTypes } = require('sequelize');
const sequelize = require('../config/db.config');
const Contact = require('./Contact');
const Folio = require('./Folio');
const Property = require('./Property');
const Tenancy = require('./Tenancy');
const PropertyInvoice = require('./PropertyInvoice');

const RentalReceipt = sequelize.define('RentalReceipt', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  branch_id: { type: DataTypes.INTEGER, allowNull: false },
  receipt_code: { type: DataTypes.STRING(40), unique: true },
  period_label: { type: DataTypes.STRING(20), allowNull: false },
  tenancy_id: DataTypes.INTEGER,
  tenant_contact_id: DataTypes.INTEGER,
  landlord_contact_id: DataTypes.INTEGER,
  property_id: DataTypes.INTEGER,
  tenant_folio_id: DataTypes.INTEGER,
  landlord_folio_id: DataTypes.INTEGER,
  invoice_id: DataTypes.INTEGER,
  rent_amount: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  service_charge: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  total_amount: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  amount_paid: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  balance: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  due_date: DataTypes.DATEONLY,
  status: { type: DataTypes.ENUM('generated', 'sent', 'paid', 'partial', 'overdue', 'cancelled'), defaultValue: 'generated' },
  created_by: DataTypes.INTEGER,
}, { tableName: 'rental_receipts', underscored: true });

RentalReceipt.belongsTo(Tenancy, { as: 'tenancy', foreignKey: 'tenancy_id' });
RentalReceipt.belongsTo(Contact, { as: 'tenant', foreignKey: 'tenant_contact_id' });
RentalReceipt.belongsTo(Contact, { as: 'landlord', foreignKey: 'landlord_contact_id' });
RentalReceipt.belongsTo(Folio, { as: 'tenantFolio', foreignKey: 'tenant_folio_id' });
RentalReceipt.belongsTo(Folio, { as: 'landlordFolio', foreignKey: 'landlord_folio_id' });
RentalReceipt.belongsTo(Property, { as: 'property', foreignKey: 'property_id' });
RentalReceipt.belongsTo(PropertyInvoice, { as: 'invoice', foreignKey: 'invoice_id' });

module.exports = RentalReceipt;
