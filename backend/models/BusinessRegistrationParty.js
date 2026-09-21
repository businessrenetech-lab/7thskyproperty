const { DataTypes } = require('sequelize');
const sequelize = require('../config/db.config');

// Shareholders & directors of a registration project (workbook Sheets 5/6, 0137).
const BusinessRegistrationParty = sequelize.define('BusinessRegistrationParty', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  branch_id: { type: DataTypes.INTEGER, allowNull: false },
  project_id: { type: DataTypes.INTEGER, allowNull: false },
  party_role: { type: DataTypes.STRING(20), defaultValue: 'shareholder' },
  name: { type: DataTypes.STRING, allowNull: false },
  nid: DataTypes.STRING(80),
  designation: DataTypes.STRING(80),
  share_percentage: DataTypes.DECIMAL(6, 2),
  mobile: DataTypes.STRING,
  email: DataTypes.STRING,
  address: DataTypes.STRING,
  nationality: DataTypes.STRING(60),
  notes: DataTypes.TEXT,
  created_by: DataTypes.INTEGER,
}, { tableName: 'business_registration_parties', underscored: true });

module.exports = BusinessRegistrationParty;
