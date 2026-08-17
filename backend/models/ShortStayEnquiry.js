const { DataTypes } = require('sequelize');
const sequelize = require('../config/db.config');
const Property = require('./Property');
const ShortStayPropertyProfile = require('./ShortStayPropertyProfile');

const ShortStayEnquiry = sequelize.define('ShortStayEnquiry', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  branch_id: { type: DataTypes.INTEGER, allowNull: false },
  property_id: DataTypes.INTEGER,
  profile_id: DataTypes.INTEGER,
  guest_name: { type: DataTypes.STRING(150), allowNull: false },
  guest_email: DataTypes.STRING(190),
  guest_phone: DataTypes.STRING(60),
  check_in_date: { type: DataTypes.DATEONLY, allowNull: false },
  check_out_date: { type: DataTypes.DATEONLY, allowNull: false },
  adults_count: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
  children_count: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  message: DataTypes.TEXT,
  quoted_amount: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
  status: {
    type: DataTypes.ENUM('new', 'contacted', 'quoted', 'converted', 'closed'),
    allowNull: false,
    defaultValue: 'new',
  },
  source: { type: DataTypes.STRING(40), allowNull: false, defaultValue: 'website' },
}, { tableName: 'short_stay_enquiries', underscored: true });

ShortStayEnquiry.belongsTo(Property, { foreignKey: 'property_id', as: 'property' });
ShortStayEnquiry.belongsTo(ShortStayPropertyProfile, { foreignKey: 'profile_id', as: 'profile' });

module.exports = ShortStayEnquiry;
