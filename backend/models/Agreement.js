const { DataTypes } = require('sequelize');
const sequelize = require('../config/db.config');

const Agreement = sequelize.define('Agreement', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  branch_id: DataTypes.INTEGER,
  agreement_code: { type: DataTypes.STRING(40), allowNull: false, unique: true },
  title: { type: DataTypes.STRING, allowNull: false },
  category: DataTypes.STRING,
  vertical_key: DataTypes.STRING(40),
  description: DataTypes.TEXT,
  purpose: DataTypes.TEXT,
  current_version: { type: DataTypes.INTEGER, defaultValue: 0 },
  current_effective_date: DataTypes.DATEONLY,
  current_file_url: DataTypes.STRING,
  status: { type: DataTypes.ENUM('draft', 'active', 'archived'), defaultValue: 'active' },
  created_by: DataTypes.INTEGER,
}, { tableName: 'agreements', underscored: true });

module.exports = Agreement;
