const { DataTypes } = require('sequelize');
const sequelize = require('../config/db.config');
const ShortStayBooking = require('./ShortStayBooking');

const ShortStayBookingOccupant = sequelize.define('ShortStayBookingOccupant', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  booking_id: { type: DataTypes.INTEGER, allowNull: false },
  full_name: { type: DataTypes.STRING(150), allowNull: false },
  is_adult: { type: DataTypes.BOOLEAN, defaultValue: true },
  relationship: { type: DataTypes.STRING(60), defaultValue: 'guest' },
  phone: DataTypes.STRING(50),
  id_passport_number: DataTypes.STRING(100),
  id_document_url: DataTypes.STRING,
  id_document_type: DataTypes.STRING(60),
  is_contractual_signer: { type: DataTypes.BOOLEAN, defaultValue: false },
  verification_status: { type: DataTypes.STRING(40), defaultValue: 'pending' },
}, { tableName: 'short_stay_booking_occupants', underscored: true });

ShortStayBookingOccupant.belongsTo(ShortStayBooking, { foreignKey: 'booking_id', as: 'booking' });
ShortStayBooking.hasMany(ShortStayBookingOccupant, { foreignKey: 'booking_id', as: 'occupants' });

module.exports = ShortStayBookingOccupant;
