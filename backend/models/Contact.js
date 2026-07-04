const { DataTypes } = require('sequelize');
const sequelize = require('../config/db.config');
const Branch = require('./Branch');

/**
 * Contact — master person/organisation directory (detailed).
 * Matches migration 0002-crm-contacts-clients.
 */
const Contact = sequelize.define('Contact', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  branch_id: { type: DataTypes.INTEGER, allowNull: false },
  contact_code: { type: DataTypes.STRING(40), unique: true },
  contact_type: { type: DataTypes.ENUM('individual', 'company'), defaultValue: 'individual' },
  salutation: DataTypes.STRING(20),
  first_name: DataTypes.STRING,
  last_name: DataTypes.STRING,
  full_name: { type: DataTypes.STRING, allowNull: false },
  company_name: DataTypes.STRING,
  designation: DataTypes.STRING,
  primary_phone: DataTypes.STRING,
  alt_phone: DataTypes.STRING,
  whatsapp: DataTypes.STRING,
  email: DataTypes.STRING,
  alt_email: DataTypes.STRING,
  website: DataTypes.STRING,
  preferred_contact_method: { type: DataTypes.ENUM('phone', 'email', 'whatsapp', 'sms'), defaultValue: 'phone' },
  preferred_language: { type: DataTypes.STRING(40), defaultValue: 'Bangla' },
  address_line1: DataTypes.STRING,
  address_line2: DataTypes.STRING,
  area: DataTypes.STRING,
  city: DataTypes.STRING,
  district: DataTypes.STRING,
  postal_code: DataTypes.STRING(20),
  country: { type: DataTypes.STRING, defaultValue: 'Bangladesh' },
  national_id: DataTypes.STRING(40),
  passport_no: DataTypes.STRING(40),
  tin: DataTypes.STRING(40),
  trade_licence_no: DataTypes.STRING(60),
  company_reg_no: DataTypes.STRING(60),
  date_of_birth: DataTypes.DATEONLY,
  gender: DataTypes.ENUM('male', 'female', 'other'),
  nationality: { type: DataTypes.STRING, defaultValue: 'Bangladeshi' },
  is_nrb: { type: DataTypes.BOOLEAN, defaultValue: false },
  nrb_country: DataTypes.STRING,
  source: DataTypes.STRING,
  source_detail: DataTypes.STRING,
  assigned_to: DataTypes.INTEGER,
  tags: { type: DataTypes.JSON, defaultValue: [] },
  notes: DataTypes.TEXT,
  status: { type: DataTypes.ENUM('active', 'inactive', 'blacklisted'), defaultValue: 'active' },
  is_client: { type: DataTypes.BOOLEAN, defaultValue: false },
  created_by: DataTypes.INTEGER,
}, {
  tableName: 'contacts',
  underscored: true,
});

Contact.belongsTo(Branch, { foreignKey: 'branch_id' });

module.exports = Contact;
