const { DataTypes } = require('sequelize');
const sequelize = require('../config/db.config');

const RegisterEntry = sequelize.define('RegisterEntry', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  branch_id: { type: DataTypes.INTEGER, allowNull: false },
  register_definition_id: { type: DataTypes.INTEGER, allowNull: false },
  vertical_key: DataTypes.STRING(40),
  project_id: DataTypes.INTEGER,
  property_id: DataTypes.INTEGER,
  client_id: DataTypes.INTEGER,
  entry_code: DataTypes.STRING(40),
  data: { type: DataTypes.JSON, defaultValue: {} },
  status: DataTypes.STRING(40),
  created_by: DataTypes.INTEGER,
}, { tableName: 'register_entries', underscored: true });

module.exports = RegisterEntry;
