const { DataTypes } = require('sequelize');
const sequelize = require('../config/db.config');

const BiometricLog = sequelize.define('BiometricLog', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  device_serial: {
    type: DataTypes.STRING(100),
    allowNull: false,
    comment: 'Serial number of the device that sent this log',
  },
  pin: {
    type: DataTypes.STRING(50),
    allowNull: false,
    comment: 'User PIN/ID registered on the biometric device (NOT the system user_id)',
  },
  punch_time: {
    type: DataTypes.DATE,
    allowNull: false,
    comment: 'Exact timestamp of the biometric punch event',
  },
  verify_type: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: 'Verification method: 0=Password, 1=Fingerprint, 2=Card, 9=Face, 15=Palm',
  },
  io_mode: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: 'In/Out mode: 0=Check-In, 1=Check-Out, 2=Break-Out, 3=Break-In, 4=OT-In, 5=OT-Out',
  },
  work_code: {
    type: DataTypes.STRING(20),
    defaultValue: '0',
    comment: 'Work code if supported by device',
  },
  reserved: {
    type: DataTypes.STRING(100),
    comment: 'Reserved fields from ATTLOG format',
  },
  processed: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'Whether this log has been processed into StaffAttendance',
  },
  processed_at: {
    type: DataTypes.DATE,
    comment: 'When this log was processed',
  },
  process_error: {
    type: DataTypes.TEXT,
    comment: 'Error message if processing failed (e.g. unmapped PIN)',
  },
  matched_user_id: {
    type: DataTypes.INTEGER,
    comment: 'The system user_id this log was matched to (null if unmatched)',
  },
}, {
  tableName: 'biometric_logs',
  underscored: true,
  indexes: [
    { fields: ['device_serial'] },
    { fields: ['pin'] },
    { fields: ['punch_time'] },
    { fields: ['processed'] },
    { fields: ['device_serial', 'pin', 'punch_time'], unique: true },
  ],
});

module.exports = BiometricLog;
