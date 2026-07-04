const { DataTypes } = require('sequelize');
const sequelize = require('../config/db.config');
const Agreement = require('./Agreement');

const AgreementVersion = sequelize.define('AgreementVersion', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  agreement_id: { type: DataTypes.INTEGER, allowNull: false },
  version: { type: DataTypes.INTEGER, allowNull: false },
  file_url: { type: DataTypes.STRING, allowNull: false },
  file_name: DataTypes.STRING,
  mime_type: DataTypes.STRING(120),
  effective_date: DataTypes.DATEONLY,
  change_note: DataTypes.STRING,
  is_current: { type: DataTypes.BOOLEAN, defaultValue: false },
  uploaded_by: DataTypes.INTEGER,
}, { tableName: 'agreement_versions', underscored: true, updatedAt: false });

Agreement.hasMany(AgreementVersion, { foreignKey: 'agreement_id', as: 'versions' });
AgreementVersion.belongsTo(Agreement, { foreignKey: 'agreement_id' });

module.exports = AgreementVersion;
