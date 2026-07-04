const { DataTypes } = require('sequelize');
const sequelize = require('../config/db.config');
const Property = require('./Property');
const Contact = require('./Contact');
const Tenancy = require('./Tenancy');

const VacancyNotice = sequelize.define('VacancyNotice', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  branch_id: { type: DataTypes.INTEGER, allowNull: false },
  notice_code: { type: DataTypes.STRING(40), unique: true },
  tenancy_id: { type: DataTypes.INTEGER, allowNull: false },
  property_id: DataTypes.INTEGER,
  tenant_contact_id: DataTypes.INTEGER,
  submitted_by_type: { type: DataTypes.ENUM('tenant', 'staff', 'owner'), defaultValue: 'tenant' },
  intended_vacate_date: { type: DataTypes.DATEONLY, allowNull: false },
  notice_received_date: DataTypes.DATEONLY,
  notice_period_days: DataTypes.INTEGER,
  notice_period_met: DataTypes.BOOLEAN,
  reason: DataTypes.STRING,
  status: { type: DataTypes.ENUM('submitted', 'acknowledged', 'exit_scheduled', 'exit_completed', 'closed', 'cancelled'), defaultValue: 'submitted' },
  exit_inspection_id: DataTypes.INTEGER,
  exit_inspection_date: DataTypes.DATEONLY,
  keys_returned_at: DataTypes.DATE,
  settlement_id: DataTypes.INTEGER,
  notes: DataTypes.TEXT,
  created_by: DataTypes.INTEGER,
}, { tableName: 'vacancy_notices', underscored: true });

VacancyNotice.belongsTo(Property, { as: 'property', foreignKey: 'property_id' });
VacancyNotice.belongsTo(Contact, { as: 'tenant', foreignKey: 'tenant_contact_id' });
VacancyNotice.belongsTo(Tenancy, { as: 'tenancy', foreignKey: 'tenancy_id' });

module.exports = VacancyNotice;
