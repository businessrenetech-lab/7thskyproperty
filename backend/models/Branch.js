const { DataTypes } = require('sequelize');
const sequelize = require('../config/db.config');

const Branch = sequelize.define('Branch', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  code: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  slug: {
    type: DataTypes.STRING,
    allowNull: true,
    unique: true,
  },
  type: {
    type: DataTypes.ENUM('head', 'branch'),
    defaultValue: 'branch',
  },
  address: {
    type: DataTypes.TEXT,
  },
  phone: {
    type: DataTypes.STRING,
  },
  email: {
    type: DataTypes.STRING,
  },
  public_title: {
    type: DataTypes.STRING,
  },
  public_description: {
    type: DataTypes.TEXT,
  },
  seo_title: {
    type: DataTypes.STRING,
  },
  seo_description: {
    type: DataTypes.STRING(500),
  },
  hero_image_url: {
    type: DataTypes.STRING,
  },
  opening_hours: {
    type: DataTypes.STRING,
  },
  map_url: {
    type: DataTypes.TEXT,
  },
  coming_soon_message: {
    type: DataTypes.STRING(500),
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  manager_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
  }
}, {
  tableName: 'branches',
  underscored: true,
});

module.exports = Branch;
