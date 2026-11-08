const { DataTypes } = require('sequelize');
const sequelize = require('../config/db.config');

const LeaveType = sequelize.define('LeaveType', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  days_per_year: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  is_paid: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  color: {
    type: DataTypes.STRING(7),
    defaultValue: '#00D4FF',
  },
  // Built-in types (services/leave.service.js DEFAULT_TYPES): 'sick', 'casual', 'weekend'; null for one HR added.
  code: { type: DataTypes.STRING(30), allowNull: true },
  // 'annual' (counts toward the yearly 21), 'weekend' (earned by working a weekly day off), 'other'.
  category: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'other' },
  // Weekend leave: the worked day and a proof note are required on the request.
  requires_proof: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  // The application letter staff start from ({name}, {designation}, {type}, {from}, {to}, {days}, {worked_date}).
  template: { type: DataTypes.TEXT, allowNull: true },
  description: { type: DataTypes.STRING(255), allowNull: true },
  sort_order: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
}, {
  tableName: 'leave_types',
  underscored: true,
});

module.exports = LeaveType;
