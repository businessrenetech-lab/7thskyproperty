const { DataTypes } = require('sequelize');
const sequelize = require('../config/db.config');
const Property = require('./Property');
const Tenancy = require('./Tenancy');
const Contact = require('./Contact');

const MoveInChecklistItem = sequelize.define('MoveInChecklistItem', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  branch_id: { type: DataTypes.INTEGER, allowNull: false },
  checklist_code: { type: DataTypes.STRING(40), unique: true },
  tenancy_id: { type: DataTypes.INTEGER, allowNull: false },
  property_id: DataTypes.INTEGER,
  tenant_contact_id: DataTypes.INTEGER,
  checklist_item: { type: DataTypes.STRING, allowNull: false },
  required: { type: DataTypes.BOOLEAN, defaultValue: true },
  status: { type: DataTypes.ENUM('pending', 'in_progress', 'done', 'na'), defaultValue: 'pending' },
  evidence_required: DataTypes.STRING,
  evidence_url: DataTypes.STRING,
  responsible_id: DataTypes.INTEGER,
  notes: DataTypes.TEXT,
  completed_at: DataTypes.DATE,
  sort_order: { type: DataTypes.INTEGER, defaultValue: 0 },
  created_by: DataTypes.INTEGER,
}, { tableName: 'move_in_checklist_items', underscored: true });

MoveInChecklistItem.belongsTo(Property, { as: 'property', foreignKey: 'property_id' });
MoveInChecklistItem.belongsTo(Tenancy, { as: 'tenancy', foreignKey: 'tenancy_id' });
MoveInChecklistItem.belongsTo(Contact, { as: 'tenant', foreignKey: 'tenant_contact_id' });

module.exports = MoveInChecklistItem;
