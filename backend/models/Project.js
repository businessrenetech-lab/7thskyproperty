const { DataTypes } = require('sequelize');
const sequelize = require('../config/db.config');
const Client = require('./Client');
const Contact = require('./Contact');
const Property = require('./Property');

const Project = sequelize.define('Project', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  branch_id: { type: DataTypes.INTEGER, allowNull: false },
  project_code: { type: DataTypes.STRING(40), unique: true },
  title: { type: DataTypes.STRING, allowNull: false },
  vertical_key: DataTypes.STRING(40),
  client_id: DataTypes.INTEGER,
  contact_id: DataTypes.INTEGER,
  property_id: DataTypes.INTEGER,
  service_id: DataTypes.INTEGER,
  status: { type: DataTypes.ENUM('lead', 'assessment', 'quote', 'agreement', 'delivery', 'completion', 'feedback', 'closed', 'cancelled', 'on_hold'), defaultValue: 'lead' },
  current_stage_key: DataTypes.STRING(60),
  priority: { type: DataTypes.ENUM('low', 'medium', 'high', 'critical'), defaultValue: 'medium' },
  assigned_to: DataTypes.INTEGER,
  value: DataTypes.DECIMAL(15, 2),
  start_date: DataTypes.DATEONLY,
  due_date: DataTypes.DATEONLY,
  completed_at: DataTypes.DATE,
  notes: DataTypes.TEXT,
  created_by: DataTypes.INTEGER,
}, { tableName: 'projects', underscored: true });

Project.belongsTo(Client, { as: 'client', foreignKey: 'client_id', include: [Contact] });
Project.belongsTo(Property, { as: 'property', foreignKey: 'property_id' });

module.exports = Project;
