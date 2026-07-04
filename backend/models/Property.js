const { DataTypes } = require('sequelize');
const sequelize = require('../config/db.config');
const Contact = require('./Contact');

const Property = sequelize.define('Property', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  branch_id: { type: DataTypes.INTEGER, allowNull: false },
  property_code: { type: DataTypes.STRING(40), unique: true },
  title: { type: DataTypes.STRING, allowNull: false },
  slug: DataTypes.STRING,
  category: { type: DataTypes.ENUM('residential', 'commercial', 'rural', 'business'), allowNull: false },
  property_type: DataTypes.STRING,
  listing_type: { type: DataTypes.ENUM('sale', 'rent', 'lease', 'short_term'), allowNull: false },
  status: { type: DataTypes.ENUM('available', 'occupied', 'under_maintenance', 'reserved', 'sold', 'rented', 'inactive', 'draft'), defaultValue: 'draft' },
  price: DataTypes.DECIMAL(15, 2),
  price_unit: DataTypes.STRING(40),
  currency: { type: DataTypes.STRING(8), defaultValue: 'BDT' },
  is_negotiable: { type: DataTypes.BOOLEAN, defaultValue: true },
  address: DataTypes.TEXT,
  area: DataTypes.STRING, city: DataTypes.STRING, district: DataTypes.STRING,
  postal_code: DataTypes.STRING(20), country: { type: DataTypes.STRING, defaultValue: 'Bangladesh' },
  latitude: DataTypes.DECIMAL(10, 7), longitude: DataTypes.DECIMAL(10, 7), map_url: DataTypes.TEXT,
  nearby_places: { type: DataTypes.JSON, defaultValue: [] },
  bedrooms: DataTypes.INTEGER, bathrooms: DataTypes.INTEGER, parking: DataTypes.INTEGER,
  land_size: DataTypes.STRING(60), building_size: DataTypes.STRING(60),
  floor_number: DataTypes.STRING(20), total_floors: DataTypes.STRING(20), year_built: DataTypes.STRING(10),
  furnishing: DataTypes.ENUM('unfurnished', 'semi_furnished', 'furnished'),
  features: { type: DataTypes.JSON, defaultValue: [] },
  description: DataTypes.TEXT,
  featured_image_url: DataTypes.STRING, video_tour_url: DataTypes.STRING, drone_video_url: DataTypes.STRING,
  floor_plan_url: DataTypes.STRING, virtual_tour_url: DataTypes.STRING,
  owner_contact_id: DataTypes.INTEGER, tenant_contact_id: DataTypes.INTEGER, listing_agent_id: DataTypes.INTEGER, manager_id: DataTypes.INTEGER,
  is_published: { type: DataTypes.BOOLEAN, defaultValue: false },
  is_featured: { type: DataTypes.BOOLEAN, defaultValue: false },
  seo_title: DataTypes.STRING, seo_description: DataTypes.STRING(500),
  views_count: { type: DataTypes.INTEGER, defaultValue: 0 },
  created_by: DataTypes.INTEGER,
  // ── Rental management (workbook: Property Master Register) ──
  occupancy_status: { type: DataTypes.ENUM('vacant', 'occupied', 'caretaker', 'notice_period'), defaultValue: 'vacant' },
  utilities_active: { type: DataTypes.BOOLEAN, defaultValue: false },
  market_rent_min: DataTypes.DECIMAL(15, 2),
  market_rent_max: DataTypes.DECIMAL(15, 2),
  approved_monthly_rent: DataTypes.DECIMAL(15, 2),
  rent_due_day: { type: DataTypes.INTEGER, defaultValue: 5 },
  management_fee_pct: { type: DataTypes.DECIMAL(6, 2), defaultValue: 5 },
  lease_min_period_months: { type: DataTypes.INTEGER, defaultValue: 6 },
  property_condition: DataTypes.STRING,
  access_contact: DataTypes.STRING,
  remarks: DataTypes.TEXT,
  pm_status: { type: DataTypes.ENUM('not_managed', 'onboarding', 'assessment_pending', 'marketing', 'tenanted', 'closed'), defaultValue: 'not_managed' },
  rental_readiness_status: { type: DataTypes.ENUM('not_ready', 'action_required', 'ready_for_marketing'), defaultValue: 'not_ready' },
  listing_status: { type: DataTypes.ENUM('not_listed', 'drafting', 'live', 'paused', 'let'), defaultValue: 'not_listed' },
  pm_project_id: DataTypes.INTEGER,
}, { tableName: 'properties', underscored: true });

Property.belongsTo(Contact, { as: 'owner', foreignKey: 'owner_contact_id' });
Property.belongsTo(Contact, { as: 'tenant', foreignKey: 'tenant_contact_id' });
Property.belongsTo(Contact, { as: 'manager', foreignKey: 'manager_id' });

module.exports = Property;
