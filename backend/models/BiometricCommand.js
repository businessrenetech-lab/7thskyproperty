const { DataTypes } = require('sequelize');
const sequelize = require('../config/db.config');

const BiometricCommand = sequelize.define('BiometricCommand', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  device_serial: {
    type: DataTypes.STRING(100),
    allowNull: false,
    comment: 'Target device serial number',
  },
  command: {
    type: DataTypes.TEXT,
    allowNull: false,
    comment: 'The raw ADMS command string to send to device',
  },
  command_type: {
    type: DataTypes.ENUM('INFO', 'REBOOT', 'CLEAR_LOG', 'CLEAR_DATA', 'SET_USER', 'DEL_USER', 'SET_TIME', 'ENROLL_FP', 'CHECK', 'CUSTOM'),
    defaultValue: 'INFO',
    comment: 'Human-readable command type for UI display',
  },
  status: {
    type: DataTypes.ENUM('pending', 'delivered', 'executed', 'failed'),
    defaultValue: 'pending',
  },
  response: {
    type: DataTypes.TEXT,
    comment: 'Response from device after executing the command',
  },
  delivered_at: {
    type: DataTypes.DATE,
  },
  executed_at: {
    type: DataTypes.DATE,
  },
  created_by: {
    type: DataTypes.INTEGER,
    comment: 'Admin user who issued the command',
  },
}, {
  tableName: 'biometric_commands',
  underscored: true,
  indexes: [
    { fields: ['device_serial', 'status'] },
  ],
});

module.exports = BiometricCommand;
