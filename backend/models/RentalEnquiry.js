const { DataTypes } = require('sequelize');
const sequelize = require('../config/db.config');
const Property = require('./Property');
const Contact = require('./Contact');

const RentalEnquiry = sequelize.define('RentalEnquiry', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  branch_id: { type: DataTypes.INTEGER, allowNull: false },
  enquiry_code: { type: DataTypes.STRING(40), unique: true },
  property_id: DataTypes.INTEGER,
  contact_id: DataTypes.INTEGER,
  enquirer_name: { type: DataTypes.STRING, allowNull: false },
  phone: DataTypes.STRING,
  email: DataTypes.STRING,
  source: DataTypes.STRING,
  budget: DataTypes.DECIMAL(15, 2),
  preferred_area: DataTypes.STRING,
  bedrooms_wanted: DataTypes.INTEGER,
  preferred_move_in: DataTypes.DATEONLY,
  occupancy_requirement: DataTypes.STRING,
  lease_period: DataTypes.STRING,
  viewing_date: DataTypes.DATE,
  stage: { type: DataTypes.ENUM('new', 'contacted', 'viewing_scheduled', 'viewed', 'application_requested', 'application_received', 'shortlisted', 'rejected', 'converted'), defaultValue: 'new' },
  assigned_officer_id: DataTypes.INTEGER,
  next_action: DataTypes.STRING,
  follow_up_date: DataTypes.DATEONLY,
  notes: DataTypes.TEXT,
  converted_application_id: DataTypes.INTEGER,
  created_by: DataTypes.INTEGER,
}, { tableName: 'rental_enquiries', underscored: true });

RentalEnquiry.belongsTo(Property, { as: 'property', foreignKey: 'property_id' });
RentalEnquiry.belongsTo(Contact, { as: 'contact', foreignKey: 'contact_id' });

module.exports = RentalEnquiry;
