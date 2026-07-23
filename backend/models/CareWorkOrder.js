const { DataTypes } = require('sequelize');
const sequelize = require('../config/db.config');
const Contact = require('./Contact');
const ServiceItem = require('./ServiceItem');
const ServiceProvider = require('./ServiceProvider');

const CareWorkOrder = sequelize.define('CareWorkOrder', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  branch_id: DataTypes.INTEGER,
  work_order_code: { type: DataTypes.STRING(40), unique: true },
  vertical: DataTypes.STRING(60),
  service_id: DataTypes.INTEGER,
  category_id: DataTypes.INTEGER,
  service_name: DataTypes.STRING,
  customer_contact_id: DataTypes.INTEGER,
  customer_name: DataTypes.STRING,
  customer_phone: DataTypes.STRING,
  site_address: DataTypes.TEXT,
  district: DataTypes.STRING(80),
  city: DataTypes.STRING(80),
  property_id: DataTypes.INTEGER,
  tenancy_id: DataTypes.INTEGER,
  source_type: { type: DataTypes.ENUM('standalone', 'property', 'enquiry'), defaultValue: 'standalone' },
  enquiry_id: DataTypes.INTEGER,
  scope: DataTypes.TEXT,
  requested_date: DataTypes.DATEONLY,
  scheduled_date: DataTypes.DATEONLY,
  completed_date: DataTypes.DATEONLY,
  delivery_mode: { type: DataTypes.ENUM('provider', 'internal'), defaultValue: 'provider' },
  assigned_provider_id: DataTypes.INTEGER,
  service_value: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  materials_cost: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  sspc_fee: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  provider_charge: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  status: { type: DataTypes.ENUM('draft', 'priced', 'matching', 'assigned', 'accepted', 'scheduled', 'in_progress', 'completed', 'inspected', 'invoiced', 'closed', 'cancelled'), defaultValue: 'draft' },
  payment_status: { type: DataTypes.ENUM('unbilled', 'invoiced', 'paid', 'provider_paid', 'settled'), defaultValue: 'unbilled' },
  invoice_id: DataTypes.INTEGER,
  provider_paid_amount: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  client_paid_amount: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  income_posted: { type: DataTypes.BOOLEAN, defaultValue: false },
  settled_at: DataTypes.DATE,
  notes: DataTypes.TEXT,
  created_by: DataTypes.INTEGER,
}, { tableName: 'care_work_orders', underscored: true });

CareWorkOrder.belongsTo(Contact, { as: 'customer', foreignKey: 'customer_contact_id' });
CareWorkOrder.belongsTo(ServiceItem, { as: 'service', foreignKey: 'service_id' });
CareWorkOrder.belongsTo(ServiceProvider, { as: 'provider', foreignKey: 'assigned_provider_id' });

module.exports = CareWorkOrder;
