const { DataTypes } = require('sequelize');
const sequelize = require('../config/db.config');
const Branch = require('./Branch');

const Resource = sequelize.define('Resource', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  branch_id: {
    type: DataTypes.INTEGER,
    references: {
      model: Branch,
      key: 'id',
    },
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  slug: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
  },
  type: {
    type: DataTypes.STRING, // e.g., 'PDF', 'Doc', 'Sheet', 'Image', 'Video'
    allowNull: false,
  },
  category: {
    type: DataTypes.STRING,
  },
  level: {
    type: DataTypes.STRING, // Basic, Core, Advanced, Premium
  },
  file_url: {
    type: DataTypes.STRING,
  },
  external_url: {
    type: DataTypes.STRING,
  },
  thumbnail_url: {
    type: DataTypes.STRING,
  },
  is_free: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  download_count: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  share_count: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  status: {
    type: DataTypes.STRING,
    defaultValue: 'published', // draft, published, archived
  },
}, {
  tableName: 'resources',
  underscored: true,
});

Resource.belongsTo(Branch, { foreignKey: 'branch_id' });
Branch.hasMany(Resource, { foreignKey: 'branch_id' });

module.exports = Resource;
