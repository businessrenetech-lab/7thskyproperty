const { DataTypes } = require('sequelize');
const sequelize = require('../config/db.config');
const Property = require('./Property');
const ShortStayBooking = require('./ShortStayBooking');

const ShortStayAvailabilityBlock = sequelize.define('ShortStayAvailabilityBlock', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  branch_id: { type: DataTypes.INTEGER, allowNull: false },
  property_id: { type: DataTypes.INTEGER, allowNull: false },
  start_date: { type: DataTypes.DATEONLY, allowNull: false },
  end_date: { type: DataTypes.DATEONLY, allowNull: false },
  block_type: {
    type: DataTypes.ENUM('booking', 'owner_hold', 'maintenance', 'cleaning', 'blocked'),
    defaultValue: 'blocked',
  },
  booking_id: DataTypes.INTEGER,
  notes: DataTypes.TEXT,
}, { tableName: 'short_stay_availability_blocks', underscored: true });

ShortStayAvailabilityBlock.belongsTo(Property, { foreignKey: 'property_id', as: 'property' });
ShortStayAvailabilityBlock.belongsTo(ShortStayBooking, { foreignKey: 'booking_id', as: 'booking' });

module.exports = ShortStayAvailabilityBlock;
