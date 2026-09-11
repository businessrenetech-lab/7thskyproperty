const { DataTypes } = require('sequelize');
const sequelize = require('../config/db.config');

const SavedView = sequelize.define('SavedView', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  branch_id: { type: DataTypes.INTEGER, allowNull: false },
  user_id: { type: DataTypes.INTEGER, allowNull: false },
  scope: { type: DataTypes.STRING(40), allowNull: false },
  name: { type: DataTypes.STRING, allowNull: false },
  params: { type: DataTypes.JSON, defaultValue: {} },
}, { tableName: 'saved_views', underscored: true });

module.exports = SavedView;
