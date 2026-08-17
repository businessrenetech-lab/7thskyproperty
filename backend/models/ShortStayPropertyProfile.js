const { DataTypes } = require('sequelize');
const sequelize = require('../config/db.config');
const Property = require('./Property');

const ShortStayPropertyProfile = sequelize.define('ShortStayPropertyProfile', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  branch_id: { type: DataTypes.INTEGER, allowNull: false },
  property_id: { type: DataTypes.INTEGER, allowNull: false, unique: true },
  public_headline: DataTypes.STRING,
  public_description: DataTypes.TEXT,
  accommodation_type: { type: DataTypes.STRING(60), defaultValue: 'serviced_apartment' },
  bedrooms: { type: DataTypes.INTEGER, defaultValue: 1 },
  bathrooms: { type: DataTypes.INTEGER, defaultValue: 1 },
  max_guests: { type: DataTypes.INTEGER, defaultValue: 2 },
  max_adults: { type: DataTypes.INTEGER, defaultValue: 2 },
  max_children: { type: DataTypes.INTEGER, defaultValue: 0 },
  furnishing_status: { type: DataTypes.STRING(40), defaultValue: 'furnished' },
  amenities: {
    type: DataTypes.JSON, defaultValue: [],
    get() { const v = this.getDataValue('amenities'); if (typeof v === 'string') { try { return JSON.parse(v); } catch { return []; } } return v || []; },
  },
  base_nightly_rate: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0.00 },
  weekend_rate: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0.00 },
  weekly_rate: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0.00 },
  monthly_rate: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0.00 },
  cleaning_fee: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0.00 },
  security_deposit: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0.00 },
  extra_guest_fee: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0.00 },
  early_checkin_fee: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0.00 },
  late_checkout_fee: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0.00 },
  min_nights: { type: DataTypes.INTEGER, defaultValue: 1 },
  cancellation_policy: DataTypes.TEXT,
  house_rules: {
    type: DataTypes.JSON, defaultValue: [],
    get() { const v = this.getDataValue('house_rules'); if (typeof v === 'string') { try { return JSON.parse(v); } catch { return []; } } return v || []; },
  },
  checkin_time: { type: DataTypes.STRING(20), defaultValue: '14:00' },
  checkout_time: { type: DataTypes.STRING(20), defaultValue: '11:00' },
  access_instructions: DataTypes.TEXT,
  wifi_name: DataTypes.STRING(100),
  wifi_password: DataTypes.STRING(100),
  is_website_listed: { type: DataTypes.BOOLEAN, defaultValue: false },
  is_featured_on_website: { type: DataTypes.BOOLEAN, defaultValue: false },
  seo_title: DataTypes.STRING,
  seo_description: DataTypes.TEXT,
  public_slug: { type: DataTypes.STRING(150), unique: true },
  current_occupancy_status: {
    type: DataTypes.ENUM('available', 'booked', 'occupied', 'maintenance_blocked', 'owner_blocked'),
    defaultValue: 'available',
  },
  is_manual_status_override: { type: DataTypes.BOOLEAN, defaultValue: false },
  manual_status_notes: DataTypes.TEXT,
  status: {
    type: DataTypes.ENUM('draft', 'readiness_pending', 'ready', 'active', 'suspended'),
    defaultValue: 'draft',
  },
}, { tableName: 'short_stay_property_profiles', underscored: true });

ShortStayPropertyProfile.belongsTo(Property, { foreignKey: 'property_id', as: 'property' });
Property.hasOne(ShortStayPropertyProfile, { foreignKey: 'property_id', as: 'short_stay_profile' });

module.exports = ShortStayPropertyProfile;
