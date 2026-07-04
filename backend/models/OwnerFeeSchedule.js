const { DataTypes } = require('sequelize');
const sequelize = require('../config/db.config');

const OwnerFeeSchedule = sequelize.define('OwnerFeeSchedule', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  property_id: DataTypes.INTEGER,
  owner_profile_id: { type: DataTypes.INTEGER, allowNull: false },
  fee_name: { type: DataTypes.STRING, allowNull: false },
  fee_category: DataTypes.STRING,
  fee_trigger: { type: DataTypes.ENUM('manual', 'first_rent', 'rental_receipt', 'invoice_receipt', 'renewal', 'statement_period'), defaultValue: 'manual' },
  amount_type: { type: DataTypes.ENUM('fixed', 'percentage'), defaultValue: 'percentage' },
  amount_value: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
  notes: DataTypes.TEXT,
  is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
}, { tableName: 'owner_fee_schedules', underscored: true });

module.exports = OwnerFeeSchedule;
