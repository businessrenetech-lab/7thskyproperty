const { DataTypes } = require('sequelize');
const sequelize = require('../config/db.config');
const Property = require('./Property');
const ShortStayBooking = require('./ShortStayBooking');

const ShortStayReadinessCheck = sequelize.define('ShortStayReadinessCheck', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  branch_id: { type: DataTypes.INTEGER, allowNull: false },
  property_id: { type: DataTypes.INTEGER, allowNull: false },
  booking_id: DataTypes.INTEGER,
  check_type: {
    type: DataTypes.ENUM('initial_setup', 'str_readiness', 'pre_arrival', 'exit_inspection'),
    defaultValue: 'str_readiness',
  },
  checklist_data: {
    type: DataTypes.JSON, defaultValue: [],
    get() { const v = this.getDataValue('checklist_data'); if (typeof v === 'string') { try { return JSON.parse(v); } catch { return []; } } return v || []; },
  },
  photos: {
    type: DataTypes.JSON, defaultValue: [],
    get() { const v = this.getDataValue('photos'); if (typeof v === 'string') { try { return JSON.parse(v); } catch { return []; } } return v || []; },
  },
  completed_by_user_id: DataTypes.INTEGER,
  is_passed: { type: DataTypes.BOOLEAN, defaultValue: false },
  completed_at: DataTypes.DATE,
}, { tableName: 'short_stay_readiness_checks', underscored: true });

ShortStayReadinessCheck.belongsTo(Property, { foreignKey: 'property_id', as: 'property' });
ShortStayReadinessCheck.belongsTo(ShortStayBooking, { foreignKey: 'booking_id', as: 'booking' });

module.exports = ShortStayReadinessCheck;
