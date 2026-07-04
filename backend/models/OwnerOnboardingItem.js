const { DataTypes } = require('sequelize');
const sequelize = require('../config/db.config');

const OwnerOnboardingItem = sequelize.define('OwnerOnboardingItem', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  branch_id: { type: DataTypes.INTEGER, allowNull: false },
  property_id: DataTypes.INTEGER,
  owner_contact_id: DataTypes.INTEGER,
  owner_profile_id: DataTypes.INTEGER,
  checklist_item: { type: DataTypes.STRING, allowNull: false },
  required: { type: DataTypes.BOOLEAN, defaultValue: true },
  status: { type: DataTypes.ENUM('pending', 'in_progress', 'done', 'na'), defaultValue: 'pending' },
  evidence_required: DataTypes.STRING,
  evidence_url: DataTypes.STRING,
  responsible_id: DataTypes.INTEGER,
  action_required: DataTypes.STRING,
  notes: DataTypes.TEXT,
  completed_at: DataTypes.DATE,
  sort_order: { type: DataTypes.INTEGER, defaultValue: 0 },
}, { tableName: 'owner_onboarding_items', underscored: true });

module.exports = OwnerOnboardingItem;
