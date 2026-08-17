const { DataTypes } = require('sequelize');
const sequelize = require('../config/db.config');
const Property = require('./Property');
const Contact = require('./Contact');
const SigningEnvelope = require('./SigningEnvelope');

const ShortStayOwnerManagement = sequelize.define('ShortStayOwnerManagement', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  branch_id: { type: DataTypes.INTEGER, allowNull: false },
  property_id: { type: DataTypes.INTEGER, allowNull: false },
  primary_owner_contact_id: { type: DataTypes.INTEGER, allowNull: false },
  joint_owner_contact_ids: {
    type: DataTypes.JSON, defaultValue: [],
    get() { const v = this.getDataValue('joint_owner_contact_ids'); if (typeof v === 'string') { try { return JSON.parse(v); } catch { return []; } } return v || []; },
  },
  management_package: { type: DataTypes.STRING(60), defaultValue: 'full_management' },
  fixed_monthly_fee: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0.00 },
  revenue_share_percent: { type: DataTypes.DECIMAL(5, 2), defaultValue: 15.00 },
  commencement_date: DataTypes.DATEONLY,
  agreement_envelope_id: DataTypes.INTEGER,
  selected_services: {
    type: DataTypes.JSON, defaultValue: [],
    get() { const v = this.getDataValue('selected_services'); if (typeof v === 'string') { try { return JSON.parse(v); } catch { return []; } } return v || []; },
  },
  agreed_rates: {
    type: DataTypes.JSON, defaultValue: {},
    get() { const v = this.getDataValue('agreed_rates'); if (typeof v === 'string') { try { return JSON.parse(v); } catch { return {}; } } return v || {}; },
  },
  status: {
    type: DataTypes.ENUM('draft', 'pending_signature', 'active', 'terminated'),
    defaultValue: 'draft',
  },
}, { tableName: 'short_stay_owner_managements', underscored: true });

ShortStayOwnerManagement.belongsTo(Property, { foreignKey: 'property_id', as: 'property' });
ShortStayOwnerManagement.belongsTo(Contact, { foreignKey: 'primary_owner_contact_id', as: 'primary_owner' });
ShortStayOwnerManagement.belongsTo(SigningEnvelope, { foreignKey: 'agreement_envelope_id', as: 'envelope' });

module.exports = ShortStayOwnerManagement;
