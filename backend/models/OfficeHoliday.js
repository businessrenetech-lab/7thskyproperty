const { DataTypes } = require('sequelize');
const sequelize = require('../config/db.config');

/**
 * A day (or run of days) the office is closed besides the weekly day off (owner request 2026-10-17): a public
 * holiday or any other closure. Attendance is not counted on these days (services/officeCalendar.service.js).
 *
 *   branch_id  null = every office; otherwise that office only
 *   kind       public_holiday | office_closed
 *   date_from / date_to   Dhaka days, both included (one day: the same date)
 */
const OfficeHoliday = sequelize.define('OfficeHoliday', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  branch_id: { type: DataTypes.INTEGER, allowNull: true },
  name: { type: DataTypes.STRING(120), allowNull: false },
  kind: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'public_holiday' },
  date_from: { type: DataTypes.DATEONLY, allowNull: false },
  date_to: { type: DataTypes.DATEONLY, allowNull: false },
  created_by: { type: DataTypes.INTEGER, allowNull: true },
}, {
  tableName: 'office_holidays',
  underscored: true,
  timestamps: true,
  indexes: [{ fields: ['date_from'] }, { fields: ['branch_id'] }],
});

module.exports = OfficeHoliday;
