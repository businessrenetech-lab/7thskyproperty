const { DataTypes } = require('sequelize');
const sequelize = require('../config/db.config');
const Contact = require('./Contact');

/**
 * Client — a contact promoted to a client, with role flags and portal access.
 */
const Client = sequelize.define('Client', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  branch_id: { type: DataTypes.INTEGER, allowNull: false },
  contact_id: { type: DataTypes.INTEGER, allowNull: false },
  client_code: { type: DataTypes.STRING(40), unique: true },
  is_buyer: { type: DataTypes.BOOLEAN, defaultValue: false },
  is_seller: { type: DataTypes.BOOLEAN, defaultValue: false },
  is_landlord: { type: DataTypes.BOOLEAN, defaultValue: false },
  is_tenant: { type: DataTypes.BOOLEAN, defaultValue: false },
  is_service_client: { type: DataTypes.BOOLEAN, defaultValue: false },
  is_nrb_client: { type: DataTypes.BOOLEAN, defaultValue: false },
  client_segment: { type: DataTypes.ENUM('standard', 'priority', 'vip'), defaultValue: 'standard' },
  portal_enabled: { type: DataTypes.BOOLEAN, defaultValue: false },
  portal_user_id: DataTypes.INTEGER,
  relationship_owner_id: DataTypes.INTEGER,
  onboarded_at: DataTypes.DATE,
  status: { type: DataTypes.ENUM('prospect', 'active', 'dormant', 'closed'), defaultValue: 'active' },
  notes: DataTypes.TEXT,
  created_by: DataTypes.INTEGER,
}, {
  tableName: 'clients',
  underscored: true,
});

Client.belongsTo(Contact, { foreignKey: 'contact_id' });
Contact.hasMany(Client, { foreignKey: 'contact_id' });

module.exports = Client;
