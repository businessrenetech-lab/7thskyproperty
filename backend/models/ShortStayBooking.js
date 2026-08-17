const { DataTypes } = require('sequelize');
const sequelize = require('../config/db.config');
const Property = require('./Property');
const Contact = require('./Contact');
const SigningEnvelope = require('./SigningEnvelope');
const Folio = require('./Folio');

const ShortStayBooking = sequelize.define('ShortStayBooking', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  branch_id: { type: DataTypes.INTEGER, allowNull: false },
  booking_code: { type: DataTypes.STRING(40), allowNull: false, unique: true },
  property_id: { type: DataTypes.INTEGER, allowNull: false },
  lead_guest_contact_id: { type: DataTypes.INTEGER, allowNull: false },
  booking_source: {
    type: DataTypes.ENUM('direct', 'website', 'phone', 'airbnb', 'booking_com', 'agoda', 'corporate'),
    defaultValue: 'direct',
  },
  external_reference: DataTypes.STRING(100),
  check_in_date: { type: DataTypes.DATEONLY, allowNull: false },
  check_out_date: { type: DataTypes.DATEONLY, allowNull: false },
  nights_count: { type: DataTypes.INTEGER, defaultValue: 1 },
  adults_count: { type: DataTypes.INTEGER, defaultValue: 1 },
  children_count: { type: DataTypes.INTEGER, defaultValue: 0 },
  total_accommodation_amount: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0.00 },
  cleaning_fee: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0.00 },
  security_deposit_amount: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0.00 },
  extra_services_amount: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0.00 },
  discount_amount: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0.00 },
  tax_amount: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0.00 },
  total_booking_value: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0.00 },
  paid_amount: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0.00 },
  security_deposit_paid: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0.00 },
  cancellation_reason: DataTypes.TEXT,
  cancelled_at: DataTypes.DATE,
  refund_amount: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0.00 },
  deposit_refunded_amount: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0.00 },
  checkin_notes: DataTypes.TEXT,
  checkout_notes: DataTypes.TEXT,
  // Guest verification metadata: { state, risk_notes, occupation, emergency_contact, timeline:[{state,at,by}], protected_docs:[{label,url,status}] }
  verification_meta: {
    type: DataTypes.JSON, defaultValue: null,
    get() { const v = this.getDataValue('verification_meta'); if (typeof v === 'string') { try { return JSON.parse(v); } catch { return null; } } return v || null; },
  },
  agreement_envelope_id: DataTypes.INTEGER,
  folio_id: DataTypes.INTEGER,
  status: {
    type: DataTypes.ENUM(
      'enquiry', 'hold', 'pending_verification', 'pending_agreement',
      'pending_payment', 'confirmed', 'ready_checkin', 'checked_in',
      'checked_out', 'inspection_pending', 'closed', 'cancelled'
    ),
    defaultValue: 'enquiry',
  },
}, { tableName: 'short_stay_bookings', underscored: true });

ShortStayBooking.belongsTo(Property, { foreignKey: 'property_id', as: 'property' });
ShortStayBooking.belongsTo(Contact, { foreignKey: 'lead_guest_contact_id', as: 'lead_guest' });
ShortStayBooking.belongsTo(SigningEnvelope, { foreignKey: 'agreement_envelope_id', as: 'envelope' });
ShortStayBooking.belongsTo(Folio, { foreignKey: 'folio_id', as: 'folio' });

module.exports = ShortStayBooking;
