const { DataTypes } = require('sequelize');
const sequelize = require('../config/db.config');

const ServiceProvider = sequelize.define('ServiceProvider', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  branch_id: { type: DataTypes.INTEGER, allowNull: false },
  provider_code: { type: DataTypes.STRING(40), unique: true },
  contact_id: DataTypes.INTEGER,
  company_name: { type: DataTypes.STRING, allowNull: false },
  contact_person: DataTypes.STRING,
  phone: DataTypes.STRING,
  email: DataTypes.STRING,
  address: DataTypes.TEXT,
  specialisations: { type: DataTypes.JSON, defaultValue: [] },
  service_categories: { type: DataTypes.JSON, defaultValue: [] },
  coverage_areas: { type: DataTypes.JSON, defaultValue: [] },
  availability: { type: DataTypes.ENUM('available', 'busy', 'unavailable'), defaultValue: 'available' },
  portal_enabled: { type: DataTypes.BOOLEAN, defaultValue: false },
  portal_user_id: DataTypes.INTEGER,
  rate_card: { type: DataTypes.JSON, defaultValue: {} },
  bank_details: { type: DataTypes.JSON, defaultValue: {} },
  rating: DataTypes.DECIMAL(3, 2),
  internal_notes: DataTypes.TEXT,
  non_circumvention_agreed: { type: DataTypes.BOOLEAN, defaultValue: false },
  status: { type: DataTypes.ENUM('pending_onboarding', 'approved', 'suspended', 'terminated', 'inactive'), defaultValue: 'pending_onboarding' },
  onboarded_at: DataTypes.DATE,
  created_by: DataTypes.INTEGER,
}, { tableName: 'service_providers', underscored: true });

module.exports = ServiceProvider;
