const { DataTypes } = require('sequelize');
const sequelize = require('../config/db.config');
const ServiceProvider = require('./ServiceProvider');
const Property = require('./Property');

const WorkOrder = sequelize.define('WorkOrder', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  branch_id: { type: DataTypes.INTEGER, allowNull: false },
  work_order_code: { type: DataTypes.STRING(40), unique: true },
  project_id: DataTypes.INTEGER,
  provider_id: DataTypes.INTEGER,
  service_id: DataTypes.INTEGER,
  property_id: DataTypes.INTEGER,
  client_id: DataTypes.INTEGER,
  title: { type: DataTypes.STRING, allowNull: false },
  scope: DataTypes.TEXT,
  status: { type: DataTypes.ENUM('draft', 'issued', 'accepted', 'in_progress', 'completed', 'cancelled'), defaultValue: 'draft' },
  scheduled_date: DataTypes.DATEONLY,
  completed_date: DataTypes.DATEONLY,
  amount: DataTypes.DECIMAL(15, 2),
  before_photos: { type: DataTypes.JSON, defaultValue: [] },
  after_photos: { type: DataTypes.JSON, defaultValue: [] },
  provider_notes: DataTypes.TEXT,
  notes: DataTypes.TEXT,
  created_by: DataTypes.INTEGER,
  // ── Maintenance workflow (0020) ──
  reported_by_type: { type: DataTypes.ENUM('tenant', 'staff', 'inspector', 'owner', 'system'), defaultValue: 'staff' },
  reported_by_contact_id: DataTypes.INTEGER,
  severity: { type: DataTypes.ENUM('emergency', 'urgent', 'normal', 'cosmetic'), defaultValue: 'normal' },
  category: { type: DataTypes.ENUM('plumbing', 'electrical', 'ac', 'appliance', 'structural', 'cleaning', 'security', 'general'), defaultValue: 'general' },
  approval_status: { type: DataTypes.ENUM('not_required', 'pending_owner', 'approved', 'rejected'), defaultValue: 'not_required' },
  approval_threshold: { type: DataTypes.DECIMAL(15, 2), defaultValue: 5000 },
  owner_decision_at: DataTypes.DATE,
  owner_decision_note: DataTypes.TEXT,
  tenant_visible_status: { type: DataTypes.ENUM('submitted', 'triaged', 'approved', 'scheduled', 'in_progress', 'completed', 'cancelled'), defaultValue: 'submitted' },
  sla_due_at: DataTypes.DATE,
  triaged_at: DataTypes.DATE,
  triaged_by: DataTypes.INTEGER,
  started_at: DataTypes.DATE,
  estimated_cost: DataTypes.DECIMAL(15, 2),
  actual_cost: DataTypes.DECIMAL(15, 2),
  tenant_recharge: { type: DataTypes.BOOLEAN, defaultValue: false },
  tenant_recharge_amount: DataTypes.DECIMAL(15, 2),
  landlord_bill_id: DataTypes.INTEGER,
  tenant_recharge_invoice_id: DataTypes.INTEGER,
  category_notes: DataTypes.TEXT,
}, { tableName: 'work_orders', underscored: true });

WorkOrder.belongsTo(ServiceProvider, { as: 'provider', foreignKey: 'provider_id' });
WorkOrder.belongsTo(Property, { as: 'property', foreignKey: 'property_id' });

module.exports = WorkOrder;
