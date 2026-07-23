const { DataTypes } = require('sequelize');
const sequelize = require('../config/db.config');

const money = () => ({ type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0 });
const define = (name, tableName, attributes) => sequelize.define(name, attributes, { tableName, underscored: true });

const SaleTrustAccount = define('SaleTrustAccount', 'sale_trust_accounts', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  branch_id: { type: DataTypes.INTEGER, allowNull: false },
  settlement_id: { type: DataTypes.INTEGER, allowNull: false },
  beneficiary_key: { type: DataTypes.STRING(80), allowNull: false },
  account_type: { type: DataTypes.ENUM('clearing', 'vendor', 'buyer', 'agency', 'third_party'), allowNull: false },
  transaction_party_id: DataTypes.INTEGER,
  contact_id: DataTypes.INTEGER,
  status: { type: DataTypes.ENUM('open', 'closed'), defaultValue: 'open' },
  closed_at: DataTypes.DATE,
});

const SaleTrustEntry = define('SaleTrustEntry', 'sale_trust_entries', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  branch_id: { type: DataTypes.INTEGER, allowNull: false },
  settlement_id: { type: DataTypes.INTEGER, allowNull: false },
  trust_account_id: { type: DataTypes.INTEGER, allowNull: false },
  settlement_line_id: DataTypes.INTEGER,
  payment_id: DataTypes.INTEGER,
  disbursement_id: DataTypes.INTEGER,
  entry_type: { type: DataTypes.ENUM('receipt', 'allocation_in', 'allocation_out', 'payout', 'reversal', 'adjustment'), allowNull: false },
  debit: money(),
  credit: money(),
  source_key: { type: DataTypes.STRING(140), allowNull: false },
  description: DataTypes.TEXT,
  created_by: DataTypes.INTEGER,
});

const SaleFundingRequest = define('SaleFundingRequest', 'sale_funding_requests', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  branch_id: { type: DataTypes.INTEGER, allowNull: false },
  settlement_id: { type: DataTypes.INTEGER, allowNull: false },
  transaction_party_id: { type: DataTypes.INTEGER, allowNull: false },
  request_type: { type: DataTypes.ENUM('deposit', 'balance', 'full', 'top_up'), allowNull: false },
  amount: money(),
  provider: { type: DataTypes.ENUM('manual_bank', 'sslcommerz'), defaultValue: 'manual_bank' },
  provider_reference: DataTypes.STRING(120),
  idempotency_key: { type: DataTypes.STRING(120), allowNull: false },
  status: { type: DataTypes.ENUM('draft', 'pending', 'paid', 'failed', 'cancelled', 'expired'), defaultValue: 'draft' },
  expires_at: DataTypes.DATE,
  paid_payment_id: DataTypes.INTEGER,
  created_by: DataTypes.INTEGER,
});

const SalePayoutAttempt = define('SalePayoutAttempt', 'sale_payout_attempts', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  branch_id: { type: DataTypes.INTEGER, allowNull: false },
  disbursement_id: { type: DataTypes.INTEGER, allowNull: false },
  attempt_no: { type: DataTypes.INTEGER, allowNull: false },
  method: { type: DataTypes.ENUM('manual_bank', 'sslcommerz_refund', 'provider'), allowNull: false },
  provider_reference: DataTypes.STRING(120),
  idempotency_key: { type: DataTypes.STRING(120), allowNull: false },
  status: { type: DataTypes.ENUM('submitted', 'processing', 'paid', 'failed'), allowNull: false },
  failure_code: DataTypes.STRING(80),
  failure_reason: DataTypes.TEXT,
  request_payload: DataTypes.JSON,
  response_payload: DataTypes.JSON,
  submitted_at: DataTypes.DATE,
  completed_at: DataTypes.DATE,
  created_by: DataTypes.INTEGER,
});

SaleTrustAccount.hasMany(SaleTrustEntry, { as: 'entries', foreignKey: 'trust_account_id' });
SaleTrustEntry.belongsTo(SaleTrustAccount, { as: 'account', foreignKey: 'trust_account_id' });

module.exports = { SaleTrustAccount, SaleTrustEntry, SaleFundingRequest, SalePayoutAttempt };
