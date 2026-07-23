const { DataTypes } = require('sequelize');
const sequelize = require('../config/db.config');

const AgreementTemplate = sequelize.define('AgreementTemplate', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  branch_id: DataTypes.INTEGER,
  name: { type: DataTypes.STRING, allowNull: false },
  category: { type: DataTypes.STRING(60), defaultValue: 'other' },
  vertical: DataTypes.STRING(60),
  description: DataTypes.TEXT,
  content_html: DataTypes.TEXT('long'),
  // JSON columns in this DB sometimes round-trip as strings — parse defensively.
  fields: { type: DataTypes.JSON, defaultValue: [], get() { const v = this.getDataValue('fields'); try { return typeof v === 'string' ? JSON.parse(v || '[]') : (v || []); } catch { return []; } } },
  signers: { type: DataTypes.JSON, defaultValue: [], get() { const v = this.getDataValue('signers'); try { return typeof v === 'string' ? JSON.parse(v || '[]') : (v || []); } catch { return []; } } },
  source_filename: DataTypes.STRING,
  status: { type: DataTypes.ENUM('draft', 'active', 'archived'), defaultValue: 'active' },
  created_by: DataTypes.INTEGER,
}, { tableName: 'agreement_templates', underscored: true });

module.exports = AgreementTemplate;
