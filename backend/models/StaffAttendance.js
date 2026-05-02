const { DataTypes } = require('sequelize');
const sequelize = require('../config/db.config');
const User = require('./User');
const Branch = require('./Branch');

const StaffAttendance = sequelize.define('StaffAttendance', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: User, key: 'id' },
  },
  branch_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: Branch, key: 'id' },
  },
  date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  check_in: {
    type: DataTypes.TIME,
  },
  check_out: {
    type: DataTypes.TIME,
  },
  status: {
    type: DataTypes.ENUM('present', 'absent', 'late', 'half_day', 'on_leave'),
    defaultValue: 'absent',
  },
  method: {
    type: DataTypes.ENUM('manual', 'biometric', 'qr', 'mobile'),
    defaultValue: 'manual',
  },
  notes: {
    type: DataTypes.TEXT,
  },
  ip_address: {
    type: DataTypes.STRING,
  },
  latitude: {
    type: DataTypes.STRING,
  },
  longitude: {
    type: DataTypes.STRING,
  },
}, {
  tableName: 'staff_attendance',
  underscored: true,
  indexes: [{ unique: true, fields: ['user_id', 'date'] }],
});

StaffAttendance.belongsTo(User, { foreignKey: 'user_id' });
StaffAttendance.belongsTo(Branch, { foreignKey: 'branch_id' });
User.hasMany(StaffAttendance, { foreignKey: 'user_id' });

module.exports = StaffAttendance;
