const { DataTypes } = require('sequelize');
const sequelize = require('../config/db.config');
const Property = require('./Property');

const PropertyMedia = sequelize.define('PropertyMedia', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  property_id: { type: DataTypes.INTEGER, allowNull: false },
  media_type: { type: DataTypes.ENUM('image', 'video', 'drone', 'floor_plan', 'document'), defaultValue: 'image' },
  file_url: { type: DataTypes.STRING, allowNull: false },
  caption: DataTypes.STRING,
  sort_order: { type: DataTypes.INTEGER, defaultValue: 0 },
}, { tableName: 'property_media', underscored: true });

Property.hasMany(PropertyMedia, { foreignKey: 'property_id', as: 'media' });
PropertyMedia.belongsTo(Property, { foreignKey: 'property_id' });

module.exports = PropertyMedia;
