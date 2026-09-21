const { DataTypes } = require('sequelize');
const sequelize = require('../config/db.config');

/** BusinessSettlement — SOP Step 22–24 settlement, ownership transfer/handover, commission. */
const BusinessSettlement = sequelize.define('BusinessSettlement', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  branch_id: { type: DataTypes.INTEGER, allowNull: false },
  settlement_code: { type: DataTypes.STRING(40), unique: true },
  business_listing_id: { type: DataTypes.INTEGER, allowNull: false },
  offer_id: DataTypes.INTEGER,
  buyer_contact_id: DataTypes.INTEGER,
  agreed_sale_price: DataTypes.DECIMAL(16, 2),
  commission_mode: { type: DataTypes.STRING(12), defaultValue: 'percent' },
  commission_percent: { type: DataTypes.DECIMAL(6, 3), defaultValue: 2 },
  commission_amount: DataTypes.DECIMAL(16, 2),
  deposit_amount: DataTypes.DECIMAL(16, 2),
  balance_amount: DataTypes.DECIMAL(16, 2),
  ownership_transfer_status: { type: DataTypes.STRING(20), defaultValue: 'pending' },
  handover_status: { type: DataTypes.STRING(20), defaultValue: 'pending' },
  handover_date: DataTypes.DATEONLY,
  settlement_date: DataTypes.DATEONLY,
  commission_status: { type: DataTypes.STRING(20), defaultValue: 'pending' },
  commission_collected_at: DataTypes.DATE,
  status: { type: DataTypes.STRING(20), defaultValue: 'open' },
  notes: DataTypes.TEXT,
  created_by: DataTypes.INTEGER,
}, { tableName: 'business_settlements', underscored: true });

module.exports = BusinessSettlement;
