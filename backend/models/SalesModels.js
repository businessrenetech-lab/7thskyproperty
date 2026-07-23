const { DataTypes } = require('sequelize');
const sequelize = require('../config/db.config');
const Property = require('./Property');
const PropertyDeal = require('./PropertyDeal');
const Contact = require('./Contact');
const Client = require('./Client');

const money = () => ({ type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0 });
const jsonField = (field, fallback) => ({
  type: DataTypes.JSON,
  get() {
    const value = this.getDataValue(field);
    if (typeof value === 'string') { try { return JSON.parse(value); } catch { return fallback; } }
    return value == null ? fallback : value;
  },
});
const define = (name, tableName, attributes, options = {}) => sequelize.define(name, attributes, { tableName, underscored: true, ...options });

const SaleProfile = define('SaleProfile', 'sale_profiles', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true }, branch_id: { type: DataTypes.INTEGER, allowNull: false },
  property_id: { type: DataTypes.INTEGER, allowNull: false }, asking_price: money(), reserve_price: money(),
  agency_type: DataTypes.ENUM('exclusive', 'open', 'sole', 'joint'), commission_percent: DataTypes.DECIMAL(6, 2), commission_fixed: money(),
  marketing_budget: money(), agreement_start_date: DataTypes.DATEONLY, agreement_end_date: DataTypes.DATEONLY,
  agreement_status: DataTypes.ENUM('not_started', 'draft', 'sent', 'signed', 'expired', 'terminated'), target_settlement_date: DataTypes.DATEONLY,
  notes: DataTypes.TEXT, compliance_status: DataTypes.ENUM('pending', 'clear', 'blocked'),
  assessment_status: DataTypes.ENUM('pending', 'complete', 'waived', 'blocked'), client_money_bank_account_id: DataTypes.INTEGER,
  client_funds_liability_account_id: DataTypes.INTEGER, trust_bank_account_id: DataTypes.INTEGER, agency_bank_account_id: DataTypes.INTEGER,
  agency_operating_account_id: DataTypes.INTEGER, commission_revenue_account_id: DataTypes.INTEGER, marketing_revenue_account_id: DataTypes.INTEGER,
  created_by: DataTypes.INTEGER, updated_by: DataTypes.INTEGER,
});

const SaleParty = define('SaleParty', 'sale_parties', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true }, branch_id: { type: DataTypes.INTEGER, allowNull: false }, property_id: DataTypes.INTEGER,
  contact_id: DataTypes.INTEGER, role: DataTypes.ENUM('vendor', 'solicitor', 'representative'), ownership_percent: DataTypes.DECIMAL(6, 2),
  is_primary: DataTypes.BOOLEAN, status: DataTypes.ENUM('active', 'withdrawn', 'replaced'), start_date: DataTypes.DATEONLY, end_date: DataTypes.DATEONLY,
  notes: DataTypes.TEXT, replaced_by_party_id: DataTypes.INTEGER, replacement_reason: DataTypes.TEXT, created_by: DataTypes.INTEGER, updated_by: DataTypes.INTEGER,
});

const SaleOffer = define('SaleOffer', 'sale_offers', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true }, branch_id: { type: DataTypes.INTEGER, allowNull: false }, property_id: DataTypes.INTEGER,
  offer_code: DataTypes.STRING(40), offer_type: DataTypes.STRING(40), amount: money(), deposit_amount: money(), finance_status: DataTypes.STRING(40),
  source: DataTypes.STRING(20), proof_url: DataTypes.STRING, conditions: jsonField('conditions', []), expiry_date: DataTypes.DATEONLY,
  proposed_completion_date: DataTypes.DATEONLY, solicitor_name: DataTypes.STRING, solicitor_phone: DataTypes.STRING, solicitor_email: DataTypes.STRING,
  notes: DataTypes.TEXT, status: DataTypes.ENUM('draft', 'submitted', 'countered', 'accepted', 'rejected', 'withdrawn', 'expired'),
  status_reason: DataTypes.TEXT, submitted_at: DataTypes.DATE, accepted_at: DataTypes.DATE, created_by: DataTypes.INTEGER, updated_by: DataTypes.INTEGER,
});

const SaleOfferParty = define('SaleOfferParty', 'sale_offer_parties', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true }, branch_id: { type: DataTypes.INTEGER, allowNull: false }, offer_id: DataTypes.INTEGER,
  contact_id: DataTypes.INTEGER, client_id: DataTypes.INTEGER, ownership_percent: DataTypes.DECIMAL(6, 2), is_primary: DataTypes.BOOLEAN,
});

const SaleTransaction = define('SaleTransaction', 'sale_transactions', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true }, branch_id: { type: DataTypes.INTEGER, allowNull: false }, property_id: DataTypes.INTEGER,
  property_deal_id: DataTypes.INTEGER, accepted_offer_id: DataTypes.INTEGER, status: DataTypes.ENUM('active', 'settlement', 'completed', 'cancelled'), created_by: DataTypes.INTEGER,
});

const SaleTransactionParty = define('SaleTransactionParty', 'sale_transaction_parties', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true }, branch_id: { type: DataTypes.INTEGER, allowNull: false }, transaction_id: DataTypes.INTEGER,
  party_type: DataTypes.ENUM('buyer', 'vendor'), contact_id: DataTypes.INTEGER, client_id: DataTypes.INTEGER, snapshot_name: DataTypes.STRING,
  snapshot_phone: DataTypes.STRING, snapshot_email: DataTypes.STRING, ownership_percent: DataTypes.DECIMAL(6, 2), is_primary: DataTypes.BOOLEAN,
  status: DataTypes.ENUM('active', 'withdrawn', 'replaced'), replaced_party_id: DataTypes.INTEGER, replacement_reason: DataTypes.TEXT,
  withdrawn_at: DataTypes.DATE, created_by: DataTypes.INTEGER,
});

const SaleSettlement = define('SaleSettlement', 'sale_settlements', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true }, branch_id: { type: DataTypes.INTEGER, allowNull: false }, transaction_id: DataTypes.INTEGER,
  settlement_code: DataTypes.STRING(40), status: DataTypes.ENUM('draft', 'submitted', 'reviewed', 'returned', 'approved', 'locked'),
  prepared_by: DataTypes.INTEGER, submitted_by: DataTypes.INTEGER, submitted_at: DataTypes.DATE, reviewed_by: DataTypes.INTEGER, reviewed_at: DataTypes.DATE,
  approved_by: DataTypes.INTEGER, approved_at: DataTypes.DATE, returned_by: DataTypes.INTEGER, returned_at: DataTypes.DATE, return_reason: DataTypes.TEXT,
  locked_by: DataTypes.INTEGER, locked_at: DataTypes.DATE, allocation_version: { type: DataTypes.INTEGER, defaultValue: 0 },
  settlement_type: { type: DataTypes.ENUM('completion', 'withdrawal'), defaultValue: 'completion' },
  withdrawal_buyer_party_id: DataTypes.INTEGER, withdrawal_reason: DataTypes.TEXT, withdrawal_date: DataTypes.DATEONLY,
});

const SaleSettlementLine = define('SaleSettlementLine', 'sale_settlement_lines', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true }, branch_id: { type: DataTypes.INTEGER, allowNull: false }, settlement_id: DataTypes.INTEGER,
  line_type: DataTypes.STRING, direction: DataTypes.ENUM('debit', 'credit'), amount: money(), payee_transaction_party_id: DataTypes.INTEGER,
  payee_contact_id: DataTypes.INTEGER, description: DataTypes.TEXT, due_date: DataTypes.DATEONLY, created_by: DataTypes.INTEGER,
  // How the fee was derived from the agency agreement, and any staff edit (0049).
  fee_basis: DataTypes.ENUM('fixed', 'percent'), fee_rate: DataTypes.DECIMAL(6, 2), fee_basis_amount: DataTypes.DECIMAL(15, 2),
  auto_amount: DataTypes.DECIMAL(15, 2), edit_reason: DataTypes.TEXT, edited_by: DataTypes.INTEGER, edited_at: DataTypes.DATE,
  terms: DataTypes.TEXT,
});

const SalePayment = define('SalePayment', 'sale_payments', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true }, branch_id: { type: DataTypes.INTEGER, allowNull: false }, settlement_id: DataTypes.INTEGER,
  direction: DataTypes.ENUM('incoming', 'outgoing'), reference: DataTypes.STRING(80), payment_at: DataTypes.DATE, value_date: DataTypes.DATEONLY,
  amount: money(), method: DataTypes.STRING(40), from_account_name: DataTypes.STRING, from_account_number: DataTypes.STRING,
  to_account_name: DataTypes.STRING, to_account_number: DataTypes.STRING, proof_url: DataTypes.STRING,
  status: DataTypes.ENUM('pending', 'cleared', 'rejected', 'reversed'), reconciliation_status: DataTypes.ENUM('unreconciled', 'matched', 'reconciled'),
  bank_account_id: DataTypes.INTEGER, liability_account_id: DataTypes.INTEGER, journal_entry_id: DataTypes.INTEGER,
  reversal_of_payment_id: DataTypes.INTEGER, reversal_reason: DataTypes.TEXT, created_by: DataTypes.INTEGER,
  transaction_party_id: DataTypes.INTEGER,
  payment_kind: DataTypes.ENUM('buyer_receipt', 'buyer_refund', 'vendor_payout', 'third_party', 'agency_fee', 'adjustment'),
  // Who a third-party payment actually went to (audit trail).
  counterparty_name: DataTypes.STRING, counterparty_phone: DataTypes.STRING(40),
  // Bank reconciliation evidence (0050): who matched the entry to the bank
  // statement, when, against which uploaded statement, and any note.
  reconciled_by: DataTypes.INTEGER, reconciled_at: DataTypes.DATE,
  reconciliation_note: DataTypes.TEXT, statement_url: DataTypes.STRING,
  bank_statement_line_id: DataTypes.INTEGER, provider: DataTypes.ENUM('manual_bank', 'sslcommerz'),
  provider_payment_id: DataTypes.STRING(120), provider_status: DataTypes.STRING(40), idempotency_key: DataTypes.STRING(120),
  gross_amount: DataTypes.DECIMAL(15, 2), fee_amount: money(), funding_request_id: DataTypes.INTEGER,
});

const SaleDisbursement = define('SaleDisbursement', 'sale_disbursements', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true }, branch_id: { type: DataTypes.INTEGER, allowNull: false }, settlement_id: DataTypes.INTEGER,
  settlement_line_id: DataTypes.INTEGER, payee_type: DataTypes.ENUM('vendor', 'third_party', 'agency'), transaction_party_id: DataTypes.INTEGER,
  contact_id: DataTypes.INTEGER, amount: money(), bank_name: DataTypes.STRING, bank_account_name: DataTypes.STRING,
  bank_account_number: DataTypes.STRING, routing_number: DataTypes.STRING, reference: DataTypes.STRING(80), proof_url: DataTypes.STRING,
  status: DataTypes.ENUM('pending', 'prepared', 'submitted', 'processing', 'paid', 'failed', 'cancelled'), payment_id: DataTypes.INTEGER, paid_at: DataTypes.DATE, created_by: DataTypes.INTEGER,
  party_bank_account_id: DataTypes.INTEGER, destination_bank_account_id: DataTypes.INTEGER,
  payout_method: { type: DataTypes.ENUM('manual_bank', 'sslcommerz_refund', 'provider'), defaultValue: 'manual_bank' },
  provider: DataTypes.STRING(40), provider_reference: DataTypes.STRING(120), failure_code: DataTypes.STRING(80), failure_reason: DataTypes.TEXT,
  attempt_count: { type: DataTypes.INTEGER, defaultValue: 0 }, last_attempt_at: DataTypes.DATE,
  source_payment_id: DataTypes.INTEGER,
});

const SaleSettlementApproval = define('SaleSettlementApproval', 'sale_settlement_approvals', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true }, branch_id: { type: DataTypes.INTEGER, allowNull: false }, settlement_id: DataTypes.INTEGER,
  action: DataTypes.ENUM('submit', 'review', 'approve', 'return', 'lock'), actor_id: DataTypes.INTEGER, reason: DataTypes.TEXT,
  from_status: DataTypes.STRING(20), to_status: DataTypes.STRING(20), ip_address: DataTypes.STRING(64),
});

const SaleEvent = define('SaleEvent', 'sale_events', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true }, branch_id: { type: DataTypes.INTEGER, allowNull: false }, property_id: DataTypes.INTEGER,
  entity_type: DataTypes.STRING(40), entity_id: DataTypes.INTEGER, event_type: DataTypes.STRING(60), actor_id: DataTypes.INTEGER,
  old_value: jsonField('old_value', null), new_value: jsonField('new_value', null), reason: DataTypes.TEXT, ip_address: DataTypes.STRING(64),
});

SaleProfile.belongsTo(Property, { foreignKey: 'property_id' });
SaleParty.belongsTo(Property, { foreignKey: 'property_id' }); SaleParty.belongsTo(Contact, { foreignKey: 'contact_id' });
SaleParty.belongsTo(SaleParty, { as: 'replacement', foreignKey: 'replaced_by_party_id' });
SaleOffer.belongsTo(Property, { foreignKey: 'property_id' }); SaleOffer.hasMany(SaleOfferParty, { as: 'buyers', foreignKey: 'offer_id' });
SaleOfferParty.belongsTo(SaleOffer, { foreignKey: 'offer_id' }); SaleOfferParty.belongsTo(Contact, { foreignKey: 'contact_id' }); SaleOfferParty.belongsTo(Client, { foreignKey: 'client_id' });
SaleTransaction.belongsTo(Property, { foreignKey: 'property_id' }); SaleTransaction.belongsTo(PropertyDeal, { foreignKey: 'property_deal_id' }); SaleTransaction.belongsTo(SaleOffer, { as: 'acceptedOffer', foreignKey: 'accepted_offer_id' });
SaleTransaction.hasMany(SaleTransactionParty, { as: 'parties', foreignKey: 'transaction_id' }); SaleTransactionParty.belongsTo(SaleTransaction, { foreignKey: 'transaction_id' });
SaleTransactionParty.belongsTo(Contact, { foreignKey: 'contact_id' }); SaleTransactionParty.belongsTo(Client, { foreignKey: 'client_id' });
SaleTransactionParty.belongsTo(SaleTransactionParty, { as: 'replacedParty', foreignKey: 'replaced_party_id' });
SaleTransaction.hasOne(SaleSettlement, { as: 'settlement', foreignKey: 'transaction_id' }); SaleSettlement.belongsTo(SaleTransaction, { foreignKey: 'transaction_id' });
SaleSettlement.hasMany(SaleSettlementLine, { as: 'lines', foreignKey: 'settlement_id' }); SaleSettlement.hasMany(SalePayment, { as: 'payments', foreignKey: 'settlement_id' });
SaleSettlement.hasMany(SaleDisbursement, { as: 'disbursements', foreignKey: 'settlement_id' }); SaleSettlement.hasMany(SaleSettlementApproval, { as: 'approvals', foreignKey: 'settlement_id' });
SaleSettlementLine.belongsTo(SaleSettlement, { foreignKey: 'settlement_id' }); SaleSettlementLine.belongsTo(SaleTransactionParty, { as: 'payeeParty', foreignKey: 'payee_transaction_party_id' });
SalePayment.belongsTo(SaleSettlement, { foreignKey: 'settlement_id' }); SalePayment.belongsTo(SalePayment, { as: 'reversedPayment', foreignKey: 'reversal_of_payment_id' });
SalePayment.belongsTo(SaleTransactionParty, { as: 'transactionParty', foreignKey: 'transaction_party_id' });
SaleDisbursement.belongsTo(SaleSettlement, { foreignKey: 'settlement_id' }); SaleDisbursement.belongsTo(SaleSettlementLine, { foreignKey: 'settlement_line_id' });
SaleDisbursement.belongsTo(SaleTransactionParty, { as: 'payeeParty', foreignKey: 'transaction_party_id' }); SaleDisbursement.belongsTo(SalePayment, { foreignKey: 'payment_id' });
SaleSettlementApproval.belongsTo(SaleSettlement, { foreignKey: 'settlement_id' });

/* The vendor's invoice for the agency's fees — commission + marketing fee, and the
   terms behind them (including any edit). Generated from the settlement. */
const SaleVendorInvoice = define('SaleVendorInvoice', 'sale_vendor_invoices', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true }, branch_id: { type: DataTypes.INTEGER, allowNull: false },
  settlement_id: { type: DataTypes.INTEGER, allowNull: false }, transaction_id: DataTypes.INTEGER, property_id: DataTypes.INTEGER,
  invoice_code: DataTypes.STRING(40), vendor_party_id: DataTypes.INTEGER, vendor_contact_id: DataTypes.INTEGER, vendor_name: DataTypes.STRING,
  sale_value: money(), commission_amount: money(), commission_basis: DataTypes.ENUM('fixed', 'percent'), commission_rate: DataTypes.DECIMAL(6, 2),
  marketing_fee: money(), other_fees: money(), total_amount: money(), terms: DataTypes.TEXT,
  lines_snapshot: jsonField('lines_snapshot', []),
  status: DataTypes.ENUM('draft', 'issued', 'paid', 'void'), issued_at: DataTypes.DATE, issued_by: DataTypes.INTEGER,
  pdf_url: DataTypes.STRING, created_by: DataTypes.INTEGER,
});
SaleVendorInvoice.belongsTo(SaleSettlement, { foreignKey: 'settlement_id' });
SaleVendorInvoice.belongsTo(Contact, { as: 'vendorContact', foreignKey: 'vendor_contact_id' });
SaleVendorInvoice.belongsTo(Property, { as: 'property', foreignKey: 'property_id' });
SaleSettlement.hasMany(SaleVendorInvoice, { as: 'vendorInvoices', foreignKey: 'settlement_id' });

module.exports = { SaleProfile, SaleParty, SaleOffer, SaleOfferParty, SaleTransaction, SaleTransactionParty, SaleSettlement, SaleSettlementLine, SalePayment, SaleDisbursement, SaleSettlementApproval, SaleEvent, SaleVendorInvoice };
