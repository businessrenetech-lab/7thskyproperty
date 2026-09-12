const { DataTypes } = require('sequelize');
const sequelize = require('../config/db.config');

// Buyer service settlement COORDINATION (non-trust). Seventh Sky coordinates the
// external settlement — it does not hold the purchase funds — so this tracks the
// milestones (agreement, registration, external settlement date, payment
// tracking, handover), not a trust ledger. One per buy PropertyDeal.
const BuyerSettlementCoordination = sequelize.define('BuyerSettlementCoordination', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  branch_id: { type: DataTypes.INTEGER, allowNull: false },
  property_deal_id: { type: DataTypes.INTEGER, allowNull: false },
  agreement_date: DataTypes.DATEONLY,
  registration_status: { type: DataTypes.ENUM('not_started', 'in_progress', 'registered', 'delayed'), defaultValue: 'not_started' },
  external_settlement_date: DataTypes.DATEONLY,
  payment_tracking_notes: DataTypes.TEXT,
  handover_confirmed: { type: DataTypes.BOOLEAN, defaultValue: false },
  notes: DataTypes.TEXT,
  created_by: DataTypes.INTEGER,
}, { tableName: 'buyer_settlement_coordination', underscored: true });

module.exports = BuyerSettlementCoordination;
