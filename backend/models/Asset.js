const { DataTypes } = require('sequelize');
const sequelize = require('../config/db.config');
const Branch = require('./Branch');

const Asset = sequelize.define('Asset', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  branch_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Branch,
      key: 'id'
    }
  },
  asset_tag: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Unique human-readable tag like AST-001'
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  type: {
    type: DataTypes.ENUM('hardware', 'furniture', 'appliance', 'stationery', 'electronics', 'electrical', 'av_equipment', 'computers', 'security', 'books', 'other'),
    defaultValue: 'hardware'
  },
  category: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Display category label e.g. A/V, Electronics, Furniture'
  },
  serial_no: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: true
  },
  location: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Physical location e.g. Room 201, Admin Office, Hall A'
  },
  image_url: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Uploaded asset image URL'
  },
  purchase_date: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  cost: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0.00
  },
  book_value: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: true,
    comment: 'Current book value after depreciation'
  },
  depreciation_rate: {
    type: DataTypes.DECIMAL(5, 2),
    defaultValue: 20.00,
    comment: 'Annual depreciation rate in percent'
  },
  warranty_expiry: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('active', 'good', 'maintenance', 'repair', 'retired', 'disposed', 'lost'),
    defaultValue: 'active'
  },
  condition_notes: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Current condition description'
  },
  last_maintained: {
    type: DataTypes.DATE,
    allowNull: true
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'assets',
  timestamps: true,
  underscored: true
});

Asset.belongsTo(Branch, { foreignKey: 'branch_id' });

module.exports = Asset;
