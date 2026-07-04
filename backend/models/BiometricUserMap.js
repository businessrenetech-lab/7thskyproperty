const { DataTypes } = require('sequelize');
const sequelize = require('../config/db.config');
const User = require('./User');

const BiometricUserMap = sequelize.define('BiometricUserMap', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  device_serial: {
    type: DataTypes.STRING(100),
    allowNull: false,
    comment: 'Device serial number — allows different PINs per device',
  },
  pin: {
    type: DataTypes.STRING(50),
    allowNull: false,
    comment: 'User PIN/ID on the biometric device',
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: User, key: 'id' },
    comment: 'System user this device PIN maps to',
  },
  employee_name: {
    type: DataTypes.STRING,
    comment: 'Name as registered on device (for reference/debugging)',
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
}, {
  tableName: 'biometric_user_maps',
  underscored: true,
  indexes: [
    { unique: true, fields: ['device_serial', 'pin'] },
    { fields: ['user_id'] },
  ],
});

BiometricUserMap.belongsTo(User, { foreignKey: 'user_id' });
User.hasMany(BiometricUserMap, { foreignKey: 'user_id' });

module.exports = BiometricUserMap;
