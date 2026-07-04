const { DataTypes } = require('sequelize');
const sequelize = require('../config/db.config');

const DocumentTemplate = sequelize.define('DocumentTemplate', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  branch_id: DataTypes.INTEGER,
  name: { type: DataTypes.STRING, allowNull: false },
  category: DataTypes.STRING,
  vertical_key: DataTypes.STRING(40),
  description: DataTypes.TEXT,
  body_html: DataTypes.TEXT('long'),
  placeholders: { type: DataTypes.JSON, defaultValue: [] },
  default_signers: { type: DataTypes.JSON, defaultValue: [] },
  field_layout: { type: DataTypes.JSON, defaultValue: [] },
  is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
  created_by: DataTypes.INTEGER,
}, { tableName: 'document_templates', underscored: true });

module.exports = DocumentTemplate;
