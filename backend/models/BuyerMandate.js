const { DataTypes } = require('sequelize');
const sequelize = require('../config/db.config');
const Client = require('./Client');
const Contact = require('./Contact');
const User = require('./User');

/**
 * BuyerMandate — a buyer's engagement that exists BEFORE a property is chosen:
 * their requirements brief. Candidates (shortlisted properties) hang off it, and
 * a committed candidate converts into a property-linked buy PropertyDeal.
 */
const BuyerMandate = sequelize.define('BuyerMandate', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  branch_id: { type: DataTypes.INTEGER, allowNull: false },
  mandate_code: { type: DataTypes.STRING(40), unique: true },
  buyer_client_id: DataTypes.INTEGER,
  buyer_contact_id: DataTypes.INTEGER,
  status: { type: DataTypes.ENUM('active', 'engaged', 'fulfilled', 'cancelled'), defaultValue: 'active' },
  budget_min: DataTypes.DECIMAL(15, 2),
  budget_max: DataTypes.DECIMAL(15, 2),
  areas: DataTypes.STRING,
  property_type: DataTypes.STRING,
  beds_min: DataTypes.INTEGER,
  baths_min: DataTypes.INTEGER,
  timeframe: DataTypes.STRING,
  notes: DataTypes.TEXT,
  assigned_to: DataTypes.INTEGER,
  cancel_reason: DataTypes.TEXT,
  created_by: DataTypes.INTEGER,
}, { tableName: 'buyer_mandates', underscored: true });

BuyerMandate.belongsTo(Client, { as: 'buyerClient', foreignKey: 'buyer_client_id' });
BuyerMandate.belongsTo(Contact, { as: 'buyerContact', foreignKey: 'buyer_contact_id' });
BuyerMandate.belongsTo(User, { as: 'assignee', foreignKey: 'assigned_to' });

module.exports = BuyerMandate;
