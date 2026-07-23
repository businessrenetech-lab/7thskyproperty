const { DataTypes } = require('sequelize');
const sequelize = require('../config/db.config');
const Property = require('./Property');
const Contact = require('./Contact');
const Client = require('./Client');

/**
 * SalesEnquiry — a buyer's interest in a SALE property. Lighter than an offer:
 * it captures who enquired, on which property, and when, then flows through a
 * pipeline until it becomes an offer. Every enquiry links a Contact (flagged
 * is_buyer) and a buyer Client, so the enquirer appears in /clients.
 */
const SalesEnquiry = sequelize.define('SalesEnquiry', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  branch_id: { type: DataTypes.INTEGER, allowNull: false },
  enquiry_code: { type: DataTypes.STRING(40), unique: true },
  property_id: DataTypes.INTEGER,
  contact_id: DataTypes.INTEGER,
  client_id: DataTypes.INTEGER,
  enquirer_name: { type: DataTypes.STRING, allowNull: false },
  phone: DataTypes.STRING,
  email: DataTypes.STRING,
  source: DataTypes.STRING,          // website | walk_in | phone | referral | staff
  budget: DataTypes.DECIMAL(15, 2),
  preferred_area: DataTypes.STRING,
  message: DataTypes.TEXT,           // what the buyer wrote
  viewing_date: DataTypes.DATE,      // scheduled appointment/viewing
  stage: {
    type: DataTypes.ENUM('new', 'contacted', 'viewing_scheduled', 'viewed', 'offer_made', 'converted', 'rejected'),
    defaultValue: 'new',
  },
  assigned_officer_id: DataTypes.INTEGER,
  next_action: DataTypes.STRING,
  follow_up_date: DataTypes.DATEONLY,
  notes: DataTypes.TEXT,
  converted_offer_id: DataTypes.INTEGER,
  created_by: DataTypes.INTEGER,
}, { tableName: 'sales_enquiries', underscored: true });

SalesEnquiry.belongsTo(Property, { as: 'property', foreignKey: 'property_id' });
SalesEnquiry.belongsTo(Contact, { as: 'contact', foreignKey: 'contact_id' });
SalesEnquiry.belongsTo(Client, { as: 'client', foreignKey: 'client_id' });

module.exports = SalesEnquiry;
