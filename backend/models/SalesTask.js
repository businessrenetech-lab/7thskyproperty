const { DataTypes } = require('sequelize');
const sequelize = require('../config/db.config');
const Property = require('./Property');
const Contact = require('./Contact');
const User = require('./User');
const SalesEnquiry = require('./SalesEnquiry');

const SalesTask = sequelize.define('SalesTask', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  branch_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  task_code: {
    type: DataTypes.STRING(32),
    allowNull: false,
  },
  title: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  task_type: {
    type: DataTypes.ENUM('call', 'email', 'meeting', 'viewing', 'document', 'negotiation', 'settlement', 'general'),
    defaultValue: 'general',
    allowNull: false,
  },
  priority: {
    type: DataTypes.ENUM('urgent', 'high', 'medium', 'low'),
    defaultValue: 'medium',
    allowNull: false,
  },
  status: {
    type: DataTypes.ENUM('pending', 'in_progress', 'completed', 'cancelled'),
    defaultValue: 'pending',
    allowNull: false,
  },
  due_date: {
    type: DataTypes.DATEONLY,
    allowNull: true,
  },
  due_time: {
    type: DataTypes.STRING(10),
    allowNull: true,
  },
  property_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  deal_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  contact_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  enquiry_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  assigned_to: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  created_by: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  completed_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  completed_by: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  completion_notes: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  metadata: {
    type: DataTypes.JSON,
    allowNull: true,
  },
}, {
  tableName: 'sales_tasks',
  underscored: true,
});

SalesTask.belongsTo(Property, { as: 'property', foreignKey: 'property_id' });
SalesTask.belongsTo(Contact, { as: 'contact', foreignKey: 'contact_id' });
SalesTask.belongsTo(SalesEnquiry, { as: 'enquiry', foreignKey: 'enquiry_id' });
SalesTask.belongsTo(User, { as: 'assignee', foreignKey: 'assigned_to' });
SalesTask.belongsTo(User, { as: 'creator', foreignKey: 'created_by' });

module.exports = SalesTask;
