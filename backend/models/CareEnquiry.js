const { DataTypes } = require('sequelize');
const sequelize = require('../config/db.config');
const Contact = require('./Contact');
const ServiceItem = require('./ServiceItem');

const CareEnquiry = sequelize.define('CareEnquiry', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  branch_id: DataTypes.INTEGER,
  enquiry_code: { type: DataTypes.STRING(40), unique: true },
  customer_contact_id: DataTypes.INTEGER,
  customer_name: DataTypes.STRING,
  mobile: DataTypes.STRING,
  email: DataTypes.STRING,
  vertical: DataTypes.STRING(60),
  service_id: DataTypes.INTEGER,
  category_id: DataTypes.INTEGER,
  service_interest: DataTypes.STRING,
  site_address: DataTypes.TEXT,
  district: DataTypes.STRING(80),
  city: DataTypes.STRING(80),
  property_type: DataTypes.STRING(60),
  message: DataTypes.TEXT,
  source: { type: DataTypes.STRING(40), defaultValue: 'manual' },
  stage: { type: DataTypes.ENUM('new', 'contacted', 'assessment', 'quoted', 'won', 'lost'), defaultValue: 'new' },
  estimated_value: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  assigned_to: DataTypes.INTEGER,
  work_order_id: DataTypes.INTEGER,
  notes: DataTypes.TEXT,
  created_by: DataTypes.INTEGER,
}, { tableName: 'care_enquiries', underscored: true });

CareEnquiry.belongsTo(Contact, { as: 'customer', foreignKey: 'customer_contact_id' });
CareEnquiry.belongsTo(ServiceItem, { as: 'service', foreignKey: 'service_id' });

module.exports = CareEnquiry;
