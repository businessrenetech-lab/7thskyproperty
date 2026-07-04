const { DataTypes } = require('sequelize');
const sequelize = require('../config/db.config');
const Property = require('./Property');
const Contact = require('./Contact');
const Client = require('./Client');

const PropertyDeal = sequelize.define('PropertyDeal', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  branch_id: { type: DataTypes.INTEGER, allowNull: false },
  deal_code: { type: DataTypes.STRING(40), unique: true },
  property_id: DataTypes.INTEGER,
  deal_type: { type: DataTypes.ENUM('buy', 'sell'), allowNull: false },
  buyer_client_id: DataTypes.INTEGER,
  seller_contact_id: DataTypes.INTEGER,
  owner_contact_id: DataTypes.INTEGER,
  agreement_id: DataTypes.INTEGER,
  agreement_date: DataTypes.DATEONLY,
  sale_price: DataTypes.DECIMAL(15, 2),
  commission_amount: DataTypes.DECIMAL(15, 2),
  commission_percent: DataTypes.DECIMAL(6, 2),
  expenses_total: DataTypes.DECIMAL(15, 2),
  status: { type: DataTypes.ENUM('lead', 'negotiation', 'agreed', 'settlement', 'completed', 'cancelled'), defaultValue: 'lead' },
  settlement_date: DataTypes.DATEONLY,
  assigned_to: DataTypes.INTEGER,
  notes: DataTypes.TEXT,
  created_by: DataTypes.INTEGER,
}, { tableName: 'property_deals', underscored: true });

PropertyDeal.belongsTo(Property, { foreignKey: 'property_id' });
PropertyDeal.belongsTo(Client, { as: 'buyer', foreignKey: 'buyer_client_id' });
PropertyDeal.belongsTo(Contact, { as: 'seller', foreignKey: 'seller_contact_id' });
PropertyDeal.belongsTo(Contact, { as: 'owner', foreignKey: 'owner_contact_id' });

module.exports = PropertyDeal;
