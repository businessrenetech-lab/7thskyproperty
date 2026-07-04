const { DataTypes } = require('sequelize');
const sequelize = require('../config/db.config');
const Branch = require('./Branch');

const BiometricDevice = sequelize.define('BiometricDevice', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  serial_number: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true,
    comment: 'Device serial number (SN) — the primary identifier from ZKTeco hardware',
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'Unnamed Device',
    comment: 'Friendly display name (e.g. "Main Entrance", "Reception")',
  },
  branch_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: Branch, key: 'id' },
  },
  model: {
    type: DataTypes.STRING(100),
    comment: 'Device model (e.g. SpeedFace V5L, ProFace X)',
  },
  firmware_version: {
    type: DataTypes.STRING(50),
    comment: 'Reported firmware version from handshake',
  },
  ip_address: {
    type: DataTypes.STRING(45),
    comment: 'Last known IP address of the device',
  },
  port: {
    type: DataTypes.INTEGER,
    defaultValue: 4370,
    comment: 'Connection port for direct pull (default 4370)',
  },

  status: {
    type: DataTypes.ENUM('active', 'inactive', 'offline', 'maintenance'),
    defaultValue: 'active',
  },
  last_heartbeat: {
    type: DataTypes.DATE,
    comment: 'Last time the device communicated with the server',
  },
  last_sync_stamp: {
    type: DataTypes.STRING(50),
    defaultValue: '0',
    comment: 'ADMS Stamp value — tracks which logs have been synced',
  },
  push_version: {
    type: DataTypes.STRING(20),
    comment: 'ADMS push protocol version reported by device',
  },
  timezone: {
    type: DataTypes.STRING(50),
    defaultValue: 'Asia/Dhaka',
  },
  location_description: {
    type: DataTypes.STRING,
    comment: 'Physical location description (e.g. "2nd Floor Entrance")',
  },
  settings: {
    type: DataTypes.JSON,
    defaultValue: {},
    comment: 'Device-specific config: realtime mode, sync intervals, etc.',
  },
}, {
  tableName: 'biometric_devices',
  underscored: true,
  indexes: [
    { unique: true, fields: ['serial_number'] },
    { fields: ['branch_id'] },
    { fields: ['status'] },
  ],
});

BiometricDevice.belongsTo(Branch, { foreignKey: 'branch_id' });

module.exports = BiometricDevice;
