const { DataTypes } = require('sequelize');
const sequelize = require('../config/db.config');
const Property = require('./Property');
const Tenancy = require('./Tenancy');
const Contact = require('./Contact');
const WorkOrder = require('./WorkOrder');

const TenantRequest = sequelize.define('TenantRequest', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  branch_id: { type: DataTypes.INTEGER, allowNull: false },
  request_code: { type: DataTypes.STRING(40), unique: true },
  tenant_contact_id: DataTypes.INTEGER,
  property_id: DataTypes.INTEGER,
  tenancy_id: DataTypes.INTEGER,
  work_order_id: DataTypes.INTEGER,
  request_date: DataTypes.DATEONLY,
  request_type: { type: DataTypes.ENUM('maintenance', 'utility', 'move_in', 'billing', 'complaint', 'document', 'general'), defaultValue: 'general' },
  details: DataTypes.TEXT,
  priority: { type: DataTypes.ENUM('low', 'medium', 'high', 'critical'), defaultValue: 'medium' },
  assigned_to: DataTypes.INTEGER,
  owner_approval_required: { type: DataTypes.BOOLEAN, defaultValue: false },
  status: { type: DataTypes.ENUM('open', 'in_progress', 'waiting_owner', 'waiting_tenant', 'resolved', 'closed', 'cancelled'), defaultValue: 'open' },
  resolution_notes: DataTypes.TEXT,
  created_by: DataTypes.INTEGER,
}, { tableName: 'tenant_requests', underscored: true });

TenantRequest.belongsTo(Property, { as: 'property', foreignKey: 'property_id' });
TenantRequest.belongsTo(Tenancy, { as: 'tenancy', foreignKey: 'tenancy_id' });
TenantRequest.belongsTo(Contact, { as: 'tenant', foreignKey: 'tenant_contact_id' });
TenantRequest.belongsTo(WorkOrder, { as: 'workOrder', foreignKey: 'work_order_id' });

module.exports = TenantRequest;
