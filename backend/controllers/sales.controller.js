const crypto = require('crypto');
const { Op } = require('sequelize');
const sequelize = require('../config/db.config');
const Property = require('../models/Property');
const PropertyDeal = require('../models/PropertyDeal');
const PropertyDocument = require('../models/PropertyDocument');
const KycDocument = require('../models/KycDocument');
const Account = require('../models/Account');
const BankAccount = require('../models/BankAccount');
const BankStatementLine = require('../models/BankStatementLine');
const { PartyBankAccount, accountNumberHash, publicBankAccount } = require('../models/PartyBankAccount');
const PartyRoleProfile = require('../models/PartyRoleProfile');
const Contact = require('../models/Contact');
const Client = require('../models/Client');
const { generateCode } = require('../utils/codeGenerator');
const { asyncHandler, branchScope, pick } = require('../utils/controllerHelpers');
const {
  SaleProfile, SaleParty, SaleOffer, SaleOfferParty, SaleTransaction, SaleTransactionParty,
  SaleSettlement, SaleSettlementLine, SalePayment, SaleDisbursement, SaleSettlementApproval, SaleEvent, SaleVendorInvoice,
} = require('../models/SalesModels');
const { SaleAssessment } = require('../models/SalesAssessmentModels');
const agencyFees = require('../services/agencyFees.service');
const {
  calculateSettlement, getTransition, recordEvent, settlementSnapshot, complianceBlockers, postPaymentJournal, buildStatement, disbursementMatchesLine, validateDisbursementPayment,
} = require('../services/salesSettlement.service');
const { excludeReversalPairs, DEDUCTION_TYPES } = require('../utils/salesSettlementCalculations');
const { SaleFundingRequest, SalePayoutAttempt } = require('../models/SalesTrustModels');
const salesTrust = require('../services/salesTrust.service');
const { toMinor, fromMinor, decimalFromMinor } = require('../utils/money');
const sslCommerzSales = require('../services/sslCommerzSales.service');

const PROFILE_FIELDS = ['asking_price', 'reserve_price', 'agency_type', 'commission_percent', 'commission_fixed', 'marketing_budget', 'agreement_start_date', 'agreement_end_date', 'agreement_status', 'target_settlement_date', 'notes', 'compliance_status', 'client_money_bank_account_id', 'client_funds_liability_account_id', 'trust_bank_account_id', 'agency_bank_account_id', 'agency_operating_account_id', 'commission_revenue_account_id', 'marketing_revenue_account_id'];
const ACCOUNTING_PROFILE_FIELDS = ['client_money_bank_account_id', 'client_funds_liability_account_id', 'trust_bank_account_id', 'agency_bank_account_id', 'agency_operating_account_id', 'commission_revenue_account_id', 'marketing_revenue_account_id'];
const PARTY_FIELDS = ['contact_id', 'role', 'ownership_percent', 'is_primary', 'status', 'start_date', 'end_date', 'notes', 'replaced_by_party_id', 'replacement_reason'];
const OFFER_FIELDS = ['offer_type', 'amount', 'deposit_amount', 'finance_status', 'proof_url', 'conditions', 'expiry_date', 'proposed_completion_date', 'solicitor_name', 'solicitor_phone', 'solicitor_email', 'notes'];
const TRANSACTION_PARTY_FIELDS = ['party_type', 'contact_id', 'client_id', 'ownership_percent', 'is_primary', 'status', 'replaced_party_id', 'replacement_reason'];
const LINE_FIELDS = ['line_type', 'direction', 'amount', 'payee_transaction_party_id', 'payee_contact_id', 'description', 'due_date'];
const PAYMENT_FIELDS = ['direction', 'reference', 'payment_at', 'value_date', 'amount', 'method', 'from_account_name', 'from_account_number', 'to_account_name', 'to_account_number', 'proof_url', 'status', 'bank_account_id', 'liability_account_id', 'transaction_party_id', 'payment_kind', 'counterparty_name', 'counterparty_phone', 'idempotency_key', 'funding_request_id'];
const DISBURSEMENT_FIELDS = ['settlement_line_id', 'payee_type', 'transaction_party_id', 'contact_id', 'amount', 'bank_name', 'bank_account_name', 'bank_account_number', 'routing_number', 'reference', 'proof_url', 'party_bank_account_id', 'destination_bank_account_id', 'payout_method', 'source_payment_id'];
const LINE_TYPES = new Set(['purchase_price', 'deposit', 'buyer_receipt', 'buyer_refund', 'commission', 'agency_fee', 'advertising', 'admin_fee', 'vat_tax', 'legal_fee', 'registration_fee', 'lender_payoff', 'rates_adjustment', 'utility_adjustment', 'third_party', 'vendor_proceeds', 'rounding']);
const money = (value) => Number.parseFloat(value || 0) || 0;
const roundMoney = (value) => Math.round((money(value) + Number.EPSILON) * 100) / 100;
const fail = (status, message) => { throw Object.assign(new Error(message), { status }); };
const ip = (req) => req.ip || req.socket?.remoteAddress || null;
const plain = (row) => row?.get ? row.get({ plain: true }) : row;
const lineFinanciallyChanged = (current, next) => current.line_type !== next.line_type
  || current.direction !== next.direction
  || roundMoney(current.amount) !== roundMoney(next.amount)
  || Number(current.payee_transaction_party_id || 0) !== Number(next.payee_transaction_party_id || 0)
  || Number(current.payee_contact_id || 0) !== Number(next.payee_contact_id || 0);

async function validateAccountingConfiguration(branchId, data) {
  if ((data.client_money_bank_account_id && !data.client_funds_liability_account_id) || (!data.client_money_bank_account_id && data.client_funds_liability_account_id)) fail(400, 'Both posting account IDs must be supplied together');
  const ledgerIds = [data.client_money_bank_account_id, data.client_funds_liability_account_id, data.agency_operating_account_id, data.commission_revenue_account_id, data.marketing_revenue_account_id];
  await validateAccounts(branchId, ledgerIds);
  if (ledgerIds.some(Boolean)) {
    const accounts = await Account.findAll({ where: { id: { [Op.in]: ledgerIds.filter(Boolean) }, branch_id: branchId, is_active: true } });
    const byId = new Map(accounts.map((account) => [Number(account.id), account.type]));
    if (data.client_money_bank_account_id && byId.get(Number(data.client_money_bank_account_id)) !== 'asset') fail(400, 'Client-money ledger account must be an asset');
    if (data.client_funds_liability_account_id && byId.get(Number(data.client_funds_liability_account_id)) !== 'liability') fail(400, 'Client-funds ledger account must be a liability');
    if (data.agency_operating_account_id && byId.get(Number(data.agency_operating_account_id)) !== 'asset') fail(400, 'Agency operating ledger account must be an asset');
    if (data.commission_revenue_account_id && byId.get(Number(data.commission_revenue_account_id)) !== 'revenue') fail(400, 'Commission account must be revenue');
    if (data.marketing_revenue_account_id && byId.get(Number(data.marketing_revenue_account_id)) !== 'revenue') fail(400, 'Marketing account must be revenue');
  }
  await validatePhysicalBankAccounts(branchId, [data.trust_bank_account_id, data.agency_bank_account_id], {
    [data.trust_bank_account_id]: 'trust', [data.agency_bank_account_id]: 'operating',
  });
}

async function markSettlementRevised(settlement, actorId, transaction) {
  await settlement.update({
    prepared_by: actorId,
    submitted_by: null,
    submitted_at: null,
    reviewed_by: null,
    reviewed_at: null,
    approved_by: null,
    approved_at: null,
    locked_by: null,
    locked_at: null,
  }, { transaction });
}

async function replaceGeneratedSettlementLines(settlement, lines, actorId, transaction) {
  const existing = await SaleSettlementLine.findAll({ where: { settlement_id: settlement.id, branch_id: settlement.branch_id }, order: [['id', 'ASC']], transaction, lock: transaction.LOCK.UPDATE });
  const unused = new Set(existing.map((line) => Number(line.id)));
  for (const values of lines) {
    const match = existing.find((line) => unused.has(Number(line.id))
      && line.line_type === values.line_type
      && Number(line.payee_transaction_party_id || 0) === Number(values.payee_transaction_party_id || 0)
      && Number(line.payee_contact_id || 0) === Number(values.payee_contact_id || 0));
    if (match) {
      await match.update(pick(values, LINE_FIELDS), { transaction });
      unused.delete(Number(match.id));
    } else {
      await SaleSettlementLine.create({ ...pick(values, LINE_FIELDS), branch_id: settlement.branch_id, settlement_id: settlement.id, created_by: actorId }, { transaction });
    }
  }
  if (unused.size) {
    const referenced = await SaleDisbursement.count({ where: { settlement_line_id: { [Op.in]: [...unused] } }, transaction });
    if (referenced) fail(409, 'The withdrawal schedule has payout history and cannot remove referenced obligations');
    await SaleSettlementLine.destroy({ where: { id: { [Op.in]: [...unused] }, settlement_id: settlement.id, branch_id: settlement.branch_id }, transaction });
  }
}

async function propertyForRequest(req, propertyId, options = {}) {
  const property = await Property.findOne({ where: { id: propertyId, listing_type: 'sale', ...branchScope(req) }, ...options });
  if (!property) fail(404, 'Sale property not found');
  return property;
}

async function validateContacts(branchId, contactIds, transaction) {
  const ids = [...new Set(contactIds.filter(Boolean).map(Number))];
  if (!ids.length) return;
  if (await Contact.count({ where: { id: { [Op.in]: ids }, branch_id: branchId }, transaction }) !== ids.length) fail(400, 'All contacts must belong to the property branch');
}

async function validateClients(branchId, clientIds, transaction) {
  const ids = [...new Set(clientIds.filter(Boolean).map(Number))];
  if (!ids.length) return;
  if (await Client.count({ where: { id: { [Op.in]: ids }, branch_id: branchId }, transaction }) !== ids.length) fail(400, 'All clients must belong to the property branch');
}

async function validateClientContacts(branchId, parties, transaction) {
  const linked = parties.filter((party) => party.client_id);
  if (!linked.length) return;
  const clients = await Client.findAll({ where: { id: { [Op.in]: linked.map((party) => party.client_id) }, branch_id: branchId }, attributes: ['id', 'contact_id'], transaction, raw: true });
  const contactsByClient = new Map(clients.map((client) => [Number(client.id), Number(client.contact_id)]));
  if (linked.some((party) => contactsByClient.get(Number(party.client_id)) !== Number(party.contact_id))) fail(400, 'Each buyer client_id must belong to its supplied contact_id');
}

async function validateAccounts(branchId, accountIds, transaction) {
  const ids = [...new Set(accountIds.filter(Boolean).map(Number))];
  if (!ids.length) return;
  let count;
  try {
    count = await Account.count({ where: { id: { [Op.in]: ids }, branch_id: branchId, is_active: true }, transaction });
  } catch (error) {
    if (error.original?.code === 'ER_NO_SUCH_TABLE') fail(400, 'Accounting accounts are not configured; omit account IDs and resolve the posting_required blocker later');
    throw error;
  }
  if (count !== ids.length) fail(400, 'All posting accounts must be active accounts in the property branch');
}

function validatePercentage(items, label, options = {}) {
  const total = items.reduce((sum, item) => sum + money(item.ownership_percent), 0);
  if (items.some((item) => money(item.ownership_percent) < 0) || total > 100.0001) fail(400, `${label} ownership percentages cannot exceed 100`);
  if (options.exact && Math.abs(total - 100) > 0.0001) fail(400, `${label} ownership percentages must total exactly 100`);
  if (options.primary && items.filter((item) => Boolean(item.is_primary)).length !== 1) fail(400, `${label} parties must have exactly one primary party`);
}

async function validatePhysicalBankAccounts(branchId, accountIds, expectedTypes = {}, transaction) {
  const ids = [...new Set(accountIds.filter(Boolean).map(Number))];
  if (!ids.length) return;
  const accounts = await BankAccount.findAll({ where: { id: { [Op.in]: ids }, branch_id: branchId, is_active: true }, transaction });
  if (accounts.length !== ids.length) fail(400, 'All physical bank accounts must be active accounts in the property branch');
  for (const [id, type] of Object.entries(expectedTypes)) {
    if (id && accounts.find((account) => Number(account.id) === Number(id))?.account_type !== type) fail(400, `${type} bank account type is required`);
  }
}

async function transactionForRequest(req, id, options = {}) {
  const row = await SaleTransaction.findOne({ where: { id, ...branchScope(req) }, ...options });
  if (!row) fail(404, 'Sale transaction not found');
  return row;
}

async function settlementForRequest(req, id, options = {}) {
  const row = await SaleSettlement.findOne({ where: { id, ...branchScope(req) }, ...options });
  if (!row) fail(404, 'Settlement not found');
  return row;
}

async function withdrawalBlockers(saleTransaction, settlement, transaction) {
  const validation = await complianceBlockers(saleTransaction, settlement, transaction);
  const blockers = [...validation.blockers];
  const lines = validation.lines || [];
  const payments = validation.payments || [];
  const reversedIds = new Set(payments.filter((payment) => payment.reversal_of_payment_id).map((payment) => Number(payment.reversal_of_payment_id)));
  const active = payments.filter((payment) => payment.status === 'cleared' && !payment.reversal_of_payment_id && !reversedIds.has(Number(payment.id)));
  const received = roundMoney(active.filter((payment) => payment.direction === 'incoming').reduce((sum, payment) => sum + money(payment.amount), 0));
  const refundDue = roundMoney(lines.filter((line) => line.line_type === 'buyer_refund').reduce((sum, line) => sum + money(line.amount), 0));
  const ownerCredit = roundMoney(lines.filter((line) => line.line_type === 'vendor_proceeds').reduce((sum, line) => sum + money(line.amount), 0));
  const companyDeductions = roundMoney(lines.filter((line) => ['commission', 'agency_fee', 'advertising', 'admin_fee', 'vat_tax', 'legal_fee', 'registration_fee', 'third_party', 'rounding'].includes(line.line_type)).reduce((sum, line) => sum + (line.direction === 'credit' ? -money(line.amount) : money(line.amount)), 0));
  const refunded = roundMoney(active.filter((payment) => payment.direction === 'outgoing' && payment.payment_kind === 'buyer_refund').reduce((sum, payment) => sum + money(payment.amount), 0));
  const residual = roundMoney(received - ownerCredit - companyDeductions - refunded);
  if (toMinor(refunded) !== toMinor(refundDue)) blockers.push('buyer_refund_unpaid');
  if (toMinor(residual) !== 0) blockers.push('withdrawal_residual_nonzero');
  return { ...validation, blockers: [...new Set(blockers)], withdrawal: { received, refund_due: refundDue, refunded, owner_credit: ownerCredit, company_deductions: companyDeductions, residual } };
}

async function stageValidation(saleTransaction, settlement, action, transaction) {
  const snapshot = await settlementSnapshot(settlement.id, transaction);
  const parties = await SaleTransactionParty.findAll({ where: { transaction_id: saleTransaction.id, branch_id: settlement.branch_id, status: 'active' }, transaction, raw: true });
  const buyers = parties.filter((party) => party.party_type === 'buyer');
  const vendors = parties.filter((party) => party.party_type === 'vendor');
  validatePercentage(buyers, 'Buyer', { exact: true, primary: true });
  validatePercentage(vendors, 'Vendor', { exact: true, primary: true });
  const schedule = salesTrust.validateSchedule(snapshot.lines, parties);
  if (schedule.errors.length) fail(409, `Settlement schedule is invalid: ${schedule.errors.join(', ')}`);
  if (action === 'submit') return { ...snapshot, parties, schedule };

  const profile = await SaleProfile.findOne({ where: { property_id: saleTransaction.property_id, branch_id: settlement.branch_id }, transaction });
  if (!profile || profile.compliance_status !== 'clear' || !['complete', 'waived'].includes(profile.assessment_status) || profile.agreement_status !== 'signed') {
    fail(409, 'Compliance, assessment, and signed agency agreement are required before review');
  }
  const compliance = await complianceBlockers(saleTransaction, settlement, transaction);
  const complianceOnly = new Set(['compliance_not_clear', 'assessment_not_clear', 'agency_agreement_not_signed', 'party_kyc_not_verified', 'active_buyer_required', 'active_vendor_required']);
  const complianceFailures = compliance.blockers.filter((blocker) => complianceOnly.has(blocker));
  if (complianceFailures.length) fail(409, `Settlement compliance is incomplete: ${complianceFailures.join(', ')}`);
  const activeDisbursements = snapshot.disbursements.filter((item) => item.status !== 'cancelled');
  const allocatedByLine = new Map();
  for (const item of activeDisbursements) allocatedByLine.set(Number(item.settlement_line_id), (allocatedByLine.get(Number(item.settlement_line_id)) || 0) + toMinor(item.amount));
  for (const line of schedule.payable) {
    if ((allocatedByLine.get(Number(line.id)) || 0) !== toMinor(line.amount)) fail(409, `Prepare payouts for the full amount of settlement line #${line.id}`);
  }
  if (activeDisbursements.some((item) => !['pending', 'prepared'].includes(item.status))) fail(409, 'Resolve failed or processing payouts before review');
  for (const item of activeDisbursements) {
    if (item.payout_method === 'sslcommerz_refund') {
      if (!item.source_payment_id) fail(409, `SSLCommerz refund #${item.id} needs its original buyer payment`);
    } else if (item.payee_type === 'agency') {
      if (!item.destination_bank_account_id) fail(409, 'Agency payout needs the verified operating bank destination');
    } else {
      const bank = await PartyBankAccount.findOne({ where: { id: item.party_bank_account_id, branch_id: settlement.branch_id, status: 'verified' }, transaction });
      if (!bank) fail(409, `Payout #${item.id} needs a verified recipient bank account`);
    }
  }
  if (action !== 'approve') return { ...snapshot, parties, schedule, profile };

  const livePayments = excludeReversalPairs(snapshot.payments);
  if (livePayments.some((payment) => payment.status === 'pending')) fail(409, 'Pending payments must be cleared or rejected before approval');
  if (livePayments.some((payment) => payment.direction === 'outgoing' && payment.status === 'cleared')) fail(409, 'Outgoing payments cannot exist before settlement approval');
  const clearedReceipts = livePayments.filter((payment) => payment.direction === 'incoming' && payment.status === 'cleared');
  if (clearedReceipts.some((payment) => payment.reconciliation_status !== 'reconciled' || !payment.bank_statement_line_id)) fail(409, 'Every receipt must be matched to the trust-bank statement before approval');
  if (clearedReceipts.some((payment) => !payment.journal_entry_id)) fail(409, 'Every receipt must be posted to the ledger before approval');
  if (toMinor(snapshot.calculations.receipts) !== schedule.obligations_minor) fail(409, 'Cleared trust receipts must exactly equal settlement obligations before approval');
  const trust = await salesTrust.trustSnapshot(settlement.id, transaction);
  const clearing = trust.accounts.find((account) => account.account_type === 'clearing');
  if (!clearing || clearing.balance_minor !== schedule.obligations_minor || trust.accounts.some((account) => account.account_type !== 'clearing' && account.balance_minor !== 0)) {
    fail(409, 'Trust receipt ledger does not match the fully funded settlement');
  }
  return { ...snapshot, parties, schedule, profile, trust };
}

exports.dashboard = asyncHandler(async (req, res) => {
  const category = req.query.category;
  if (category && !['residential', 'commercial', 'rural', 'business'].includes(category)) return res.status(400).json({ error: 'Invalid property category' });
  const propertyWhere = { listing_type: 'sale', ...branchScope(req), ...(category ? { category } : {}) };
  const properties = await Property.findAll({ where: propertyWhere, attributes: ['id', 'branch_id', 'property_code', 'title', 'category', 'property_type', 'status', 'price', 'area', 'district'], order: [['updated_at', 'DESC']] });
  const propertyIds = properties.map((property) => property.id);
  if (!propertyIds.length) return res.json({ counters: { properties: 0, available: 0, reserved: 0, sold: 0, offers_open: 0, transactions_active: 0, settlements_pending: 0 }, metrics: { active_listings: 0, offers_awaiting_review: 0, under_contract: 0, client_funds_held: 0, settlements_review: 0, payout_exceptions: 0, completed_sales: 0, open_enquiries: 0, upcoming_appointments: 0 }, activity: { enquiries: [], appointments: [], appraisals: [], current_sales: [] }, properties: [] });
  const [profiles, offerCounts, transactions, settlements] = await Promise.all([
    SaleProfile.findAll({ where: { property_id: { [Op.in]: propertyIds }, ...branchScope(req) }, raw: true }),
    SaleOffer.findAll({ attributes: ['property_id', [sequelize.fn('COUNT', sequelize.col('id')), 'count']], where: { property_id: { [Op.in]: propertyIds }, status: { [Op.in]: ['draft', 'submitted', 'countered'] }, ...branchScope(req) }, group: ['property_id'], raw: true }),
    SaleTransaction.findAll({ where: { property_id: { [Op.in]: propertyIds }, status: { [Op.in]: ['active', 'settlement'] }, ...branchScope(req) }, raw: true }),
    SaleSettlement.findAll({ where: { ...branchScope(req) }, include: [
      { model: SaleTransaction, required: true, where: { property_id: { [Op.in]: propertyIds } } },
      { model: SalePayment, as: 'payments' }, { model: SaleDisbursement, as: 'disbursements' }, { model: SaleSettlementLine, as: 'lines' },
    ] }),
  ]);
  const profileMap = new Map(profiles.map((profile) => [profile.property_id, profile]));
  const offerMap = new Map(offerCounts.map((count) => [count.property_id, Number(count.count)]));
  const txMap = new Map(transactions.map((transaction) => [transaction.property_id, transaction]));
  const settlementByProperty = new Map();
  let clientFundsHeld = 0;
  let payoutExceptions = 0;
  for (const settlement of settlements) {
    const calculations = calculateSettlement(settlement.lines || [], settlement.payments || [], settlement.disbursements || []);
    settlementByProperty.set(settlement.SaleTransaction.property_id, { settlement, calculations });
    clientFundsHeld += calculations.funds_held;
    if (calculations.pending_disbursements || calculations.unpaid_obligations > 0.01 || Math.abs(calculations.residual) > 0.01) payoutExceptions += 1;
  }
  const settlementsPending = settlements.filter((settlement) => ['submitted', 'reviewed', 'approved'].includes(settlement.status)).length;

  // ─── Activity feed: what's happening in sales for this category ────────────
  const SalesEnquiry = require('../models/SalesEnquiry');
  const { SaleAssessment } = require('../models/SalesAssessmentModels');
  const propertyTitle = new Map(properties.map((property) => [property.id, property.title]));
  const [enquiries, openEnquiryCount, appraisals] = await Promise.all([
    SalesEnquiry.findAll({
      where: { property_id: { [Op.in]: propertyIds }, ...branchScope(req) },
      attributes: ['id', 'enquiry_code', 'enquirer_name', 'phone', 'email', 'property_id', 'contact_id', 'client_id', 'stage', 'viewing_date', 'created_at'],
      order: [['created_at', 'DESC']], limit: 12,
    }),
    SalesEnquiry.count({ where: { property_id: { [Op.in]: propertyIds }, stage: { [Op.in]: ['new', 'contacted', 'viewing_scheduled', 'viewed'] }, ...branchScope(req) } }),
    SaleAssessment.findAll({
      where: { property_id: { [Op.in]: propertyIds }, ...branchScope(req) },
      attributes: ['id', 'property_id', 'status', 'overall_score', 'created_at'],
      order: [['created_at', 'DESC']], limit: 8,
    }).catch(() => []),
  ]);
  // Upcoming viewings/appointments = enquiries with a future viewing_date.
  const now = new Date();
  const appointments = enquiries
    .filter((e) => e.viewing_date && new Date(e.viewing_date) >= now)
    .map((e) => ({ id: e.id, enquirer_name: e.enquirer_name, property_id: e.property_id, property_title: propertyTitle.get(e.property_id) || null, when: e.viewing_date }));
  const currentSales = transactions.map((t) => {
    const s = settlementByProperty.get(t.property_id);
    return { transaction_id: t.id, property_id: t.property_id, property_title: propertyTitle.get(t.property_id) || null, status: t.status, settlement_status: s?.settlement?.status || null, funds_held: s?.calculations?.funds_held || 0 };
  });
  const activity = {
    enquiries: enquiries.map((e) => ({
      id: e.id, enquiry_code: e.enquiry_code, enquirer_name: e.enquirer_name, phone: e.phone, email: e.email,
      property_id: e.property_id, property_title: propertyTitle.get(e.property_id) || null,
      contact_id: e.contact_id, client_id: e.client_id, stage: e.stage, created_at: e.created_at,
    })),
    appointments,
    appraisals: appraisals.map((a) => ({ id: a.id, property_id: a.property_id, property_title: propertyTitle.get(a.property_id) || null, status: a.status, overall_score: a.overall_score, created_at: a.created_at })),
    current_sales: currentSales,
  };

  const metrics = {
    active_listings: properties.filter((property) => ['available', 'reserved', 'draft'].includes(property.status)).length,
    offers_awaiting_review: offerCounts.reduce((sum, count) => sum + Number(count.count), 0),
    under_contract: transactions.filter((transaction) => ['active', 'settlement'].includes(transaction.status)).length,
    client_funds_held: clientFundsHeld,
    settlements_review: settlementsPending,
    payout_exceptions: payoutExceptions,
    completed_sales: properties.filter((property) => property.status === 'sold').length,
    open_enquiries: openEnquiryCount,
    upcoming_appointments: appointments.length,
  };
  res.json({
    counters: {
      properties: properties.length, available: properties.filter((property) => property.status === 'available').length,
      reserved: properties.filter((property) => property.status === 'reserved').length, sold: properties.filter((property) => property.status === 'sold').length,
      offers_open: offerCounts.reduce((sum, count) => sum + Number(count.count), 0), transactions_active: transactions.length, settlements_pending: settlementsPending,
    },
    metrics,
    activity,
    properties: properties.map((property) => {
      const profile = profileMap.get(property.id) || null;
      const activeTransaction = txMap.get(property.id) || null;
      const settlementState = settlementByProperty.get(property.id);
      return {
        ...plain(property), sale_profile: profile, asking_price: profile?.asking_price || property.price,
        open_offer_count: offerMap.get(property.id) || 0, offer_count: offerMap.get(property.id) || 0,
        active_transaction: activeTransaction, lifecycle_state: property.status === 'sold' ? 'completed' : settlementState?.settlement?.status || (activeTransaction ? 'under_contract' : property.status),
        funds_held: settlementState?.calculations?.funds_held || 0,
        next_action: settlementState?.settlement?.status === 'submitted' ? 'Finance review' : settlementState?.settlement?.status === 'reviewed' ? 'Admin approval' : activeTransaction ? 'Open transaction' : 'Review listing',
      };
    }),
  });
});

exports.getPropertyFile = asyncHandler(async (req, res) => {
  const property = await propertyForRequest(req, req.params.propertyId);
  const [profile, parties, offers, activeTransaction, transactionHistory, assessmentSummary] = await Promise.all([
    SaleProfile.findOne({ where: { property_id: property.id, branch_id: property.branch_id } }),
    SaleParty.findAll({ where: { property_id: property.id, branch_id: property.branch_id }, include: [{ model: Contact }], order: [['created_at', 'ASC']] }),
    SaleOffer.findAll({ where: { property_id: property.id, branch_id: property.branch_id }, include: [{ model: SaleOfferParty, as: 'buyers', include: [Contact, Client] }], order: [['created_at', 'DESC']] }),
    SaleTransaction.findOne({ where: { property_id: property.id, branch_id: property.branch_id, status: { [Op.in]: ['active', 'settlement', 'completed'] } }, include: [{ model: SaleTransactionParty, as: 'parties' }], order: [['created_at', 'DESC']] }),
    SaleTransaction.findAll({ where: { property_id: property.id, branch_id: property.branch_id }, include: [{ model: SaleTransactionParty, as: 'parties' }, { model: SaleOffer, as: 'acceptedOffer' }], order: [['created_at', 'DESC']] }),
    SaleAssessment.findOne({ where: { property_id: property.id, branch_id: property.branch_id }, attributes: ['id', 'status', 'inspector_name', 'occupancy_status', 'overall_score', 'marketability_score', 'blockers', 'assessment_date', 'approved_at', 'updated_at'] }),
  ]);
  const fileTransaction = activeTransaction || transactionHistory[0] || null;
  let settlement = null;
  let calculations = calculateSettlement();
  let blockers = [];
  let trust = { accounts: [], entries: [], total_balance: 0, total_balance_minor: 0 };
  let fundingRequests = [];
  if (fileTransaction) {
    settlement = await SaleSettlement.findOne({ where: { transaction_id: fileTransaction.id }, include: [{ model: SaleSettlementLine, as: 'lines' }, { model: SalePayment, as: 'payments' }, { model: SaleDisbursement, as: 'disbursements' }, { model: SaleSettlementApproval, as: 'approvals' }, { model: SaleVendorInvoice, as: 'vendorInvoices' }] });
    if (settlement) {
      calculations = calculateSettlement(settlement.lines || [], settlement.payments || [], settlement.disbursements || []);
      trust = await salesTrust.trustSnapshot(settlement.id);
      fundingRequests = await SaleFundingRequest.findAll({ where: { settlement_id: settlement.id, branch_id: settlement.branch_id }, order: [['created_at', 'ASC']], raw: true });
      const historicalNonzero = settlement.status === 'locked' || fileTransaction.status === 'cancelled'
        ? [
            ...(toMinor(calculations.funds_held) !== 0 ? ['completed_trust_balance_nonzero'] : []),
            ...(trust.total_balance_minor !== 0 || trust.accounts.some((account) => account.balance_minor !== 0) ? ['completed_beneficiary_balance_nonzero'] : []),
          ]
        : null;
      const validation = historicalNonzero
        ? { blockers: historicalNonzero, withdrawal: null }
        : settlement.settlement_type === 'withdrawal' ? await withdrawalBlockers(fileTransaction, settlement) : await complianceBlockers(fileTransaction, settlement);
      blockers = validation.blockers;
      if (validation.withdrawal) calculations = {
        ...calculations,
        purchase_price: validation.withdrawal.received,
        receipts: validation.withdrawal.received,
        deductions: validation.withdrawal.company_deductions,
        refunds: validation.withdrawal.refund_due,
        vendor_proceeds: validation.withdrawal.owner_credit,
        disbursed: validation.withdrawal.refunded,
        funds_held: roundMoney(validation.withdrawal.received - validation.withdrawal.refunded),
        residual: validation.withdrawal.residual,
        withdrawal: validation.withdrawal,
      };
    }
  }
  if (!profile) blockers.push('sale_profile_missing');
  if (!fileTransaction) blockers.push('accepted_transaction_missing');
  if (fileTransaction && !settlement && !['cancelled', 'completed'].includes(fileTransaction.status)) blockers.push('settlement_missing');
  const settlementId = settlement?.id || 0;
  const documentScopes = [{ property_id: property.id }, { entity_type: 'property', entity_id: property.id }];
  if (settlementId) documentScopes.push({ entity_type: 'settlement', entity_id: settlementId });
  const documents = await PropertyDocument.findAll({ where: { [Op.or]: documentScopes }, order: [['created_at', 'DESC']] });
  const roleProfiles = await PartyRoleProfile.findAll({
    where: {
      property_id: property.id,
      branch_id: property.branch_id,
      role_type: { [Op.in]: ['vendor', 'buyer'] },
    },
    attributes: [
      'id', 'profile_code', 'contact_id', 'role_type', 'status', 'kyc_status',
      'documents_status', 'agreement_id', 'envelope_id', 'next_action',
      'registration_submitted_at',
    ],
    order: [['created_at', 'ASC']],
  });
  const kycDocuments = roleProfiles.length ? await KycDocument.findAll({ where: { branch_id: property.branch_id, party_role_profile_id: { [Op.in]: roleProfiles.map((item) => item.id) } }, order: [['created_at', 'DESC']] }) : [];
  const events = await SaleEvent.findAll({ where: { property_id: property.id, branch_id: property.branch_id }, order: [['created_at', 'DESC']] });
  const nextAction = !settlement || !['approved', 'locked'].includes(settlement.status)
    ? settlement?.status === 'draft' || settlement?.status === 'returned' ? 'submit_settlement' : settlement?.status === 'submitted' ? 'review_settlement' : settlement?.status === 'reviewed' ? 'approve_settlement' : blockers.length ? `clear:${blockers[0]}` : 'complete'
    : settlement.status === 'approved' && blockers.length ? `clear:${blockers[0]}` : settlement.status === 'approved' ? 'lock_settlement' : 'complete';
  const canRevealBank = ['super_admin', 'branch_admin', 'accounts'].includes(req.user?.role);
  const settlementPlain = settlement ? plain(settlement) : null;
  if (settlementPlain && !canRevealBank) {
    settlementPlain.payments = (settlementPlain.payments || []).map((item) => ({
      ...item,
      from_account_number: item.from_account_number ? `****${String(item.from_account_number).replace(/\W/g, '').slice(-4)}` : null,
      to_account_number: item.to_account_number ? `****${String(item.to_account_number).replace(/\W/g, '').slice(-4)}` : null,
      proof_url: null,
      statement_url: null,
    }));
    settlementPlain.disbursements = (settlementPlain.disbursements || []).map((item) => ({
      ...item,
      bank_account_number: item.bank_account_number ? `****${String(item.bank_account_number).replace(/\W/g, '').slice(-4)}` : null,
      routing_number: null,
      proof_url: null,
    }));
  }
  const visibleKycDocuments = canRevealBank ? kycDocuments : kycDocuments.map((document) => ({ id: document.id, party_role_profile_id: document.party_role_profile_id, role: document.role, document_type: document.document_type, status: document.status, is_required: document.is_required, verified_at: document.verified_at }));
  const visibleEvents = canRevealBank ? events : events.map((event) => ({ ...plain(event), old_value: null, new_value: null }));
  const visibleDocuments = canRevealBank ? documents : documents.filter((document) => document.entity_type !== 'settlement');
  res.json({ property, profile, sale_profile: profile, assessment_summary: assessmentSummary, parties, offers, transaction: fileTransaction, active_transaction: activeTransaction, transaction_history: transactionHistory, settlement: settlementPlain ? { ...settlementPlain, calculations, summary: calculations, trust, funding_requests: fundingRequests } : null, role_profiles: roleProfiles, documents: visibleDocuments, kyc_documents: visibleKycDocuments, events: visibleEvents, activity: visibleEvents, audit: visibleEvents, blockers: [...new Set(blockers)], next_action: nextAction });
});

exports.upsertProfile = asyncHandler(async (req, res) => {
  const property = await propertyForRequest(req, req.params.propertyId);
  const data = pick(req.body, PROFILE_FIELDS);
  if (data.commission_percent != null && (money(data.commission_percent) < 0 || money(data.commission_percent) > 100)) return res.status(400).json({ error: 'commission_percent must be between 0 and 100' });
  await validateAccountingConfiguration(property.branch_id, data);
  const [profile, created] = await SaleProfile.findOrCreate({ where: { property_id: property.id }, defaults: { ...data, branch_id: property.branch_id, created_by: req.user.id, updated_by: req.user.id } });
  const oldValue = created ? null : plain(profile);
  if (!created) await profile.update({ ...data, updated_by: req.user.id });
  await recordEvent({ branchId: property.branch_id, propertyId: property.id, entityType: 'sale_profile', entityId: profile.id, eventType: created ? 'PROFILE_CREATED' : 'PROFILE_UPDATED', actorId: req.user.id, oldValue, newValue: plain(profile), ipAddress: ip(req) });
  res.status(created ? 201 : 200).json({ data: profile });
});

exports.updateProfileAccounting = asyncHandler(async (req, res) => {
  const property = await propertyForRequest(req, req.params.propertyId);
  const data = pick(req.body, ACCOUNTING_PROFILE_FIELDS);
  const profile = await SaleProfile.findOne({ where: { property_id: property.id, branch_id: property.branch_id } });
  if (!profile) return res.status(409).json({ error: 'Create the sales profile before configuring settlement accounting' });
  await validateAccountingConfiguration(property.branch_id, data);
  const oldValue = pick(plain(profile), ACCOUNTING_PROFILE_FIELDS);
  await profile.update({ ...data, updated_by: req.user.id });
  await recordEvent({ branchId: property.branch_id, propertyId: property.id, entityType: 'sale_profile', entityId: profile.id, eventType: 'ACCOUNTING_CONFIGURATION_UPDATED', actorId: req.user.id, oldValue, newValue: pick(plain(profile), ACCOUNTING_PROFILE_FIELDS), ipAddress: ip(req) });
  res.json({ data: profile });
});

exports.addPropertyParty = asyncHandler(async (req, res) => {
  const property = await propertyForRequest(req, req.params.propertyId);
  const data = pick(req.body, PARTY_FIELDS);
  if (!data.contact_id || !['vendor', 'solicitor', 'representative'].includes(data.role)) return res.status(400).json({ error: 'contact_id and valid role are required' });
  await validateContacts(property.branch_id, [data.contact_id]);
  if (data.role === 'vendor') {
    const existing = await SaleParty.findAll({ where: { property_id: property.id, role: 'vendor', status: 'active' }, raw: true });
    validatePercentage([...existing, data], 'Vendor');
  }
  const party = await SaleParty.create({ ...data, status: data.status || 'active', branch_id: property.branch_id, property_id: property.id, created_by: req.user.id, updated_by: req.user.id });
  let roleProfile = null;
  if (data.role === 'vendor') {
    roleProfile = await PartyRoleProfile.findOne({ where: { branch_id: property.branch_id, property_id: property.id, contact_id: data.contact_id, role_type: 'vendor' } });
    if (!roleProfile) {
      roleProfile = await PartyRoleProfile.create({ branch_id: property.branch_id, property_id: property.id, contact_id: data.contact_id, role_type: 'vendor', profile_code: await generateCode(PartyRoleProfile, 'profile_code', 'SSPC-PR-'), status: 'kyc_pending', kyc_status: 'pending', documents_status: 'pending', next_action: 'Complete vendor KYC and sales agency agreement', source: 'staff', created_by: req.user.id });
      // A returning contact's verified KYC carries over (identity + vendor-role
      // docs); only property-specific documents and the agreement remain.
      try { await require('../services/kycReuse.service').applyKycReuse(roleProfile, { actorId: req.user.id }); } catch { /* non-fatal */ }
    }
  }
  await recordEvent({ branchId: property.branch_id, propertyId: property.id, entityType: 'sale_party', entityId: party.id, eventType: 'PARTY_ADDED', actorId: req.user.id, newValue: plain(party), ipAddress: ip(req) });
  res.status(201).json({ data: party, role_profile: roleProfile });
});

exports.patchPropertyParty = asyncHandler(async (req, res) => {
  const party = await SaleParty.findOne({ where: { id: req.params.id, ...branchScope(req) } });
  if (!party) return res.status(404).json({ error: 'Sale party not found' });
  const data = pick(req.body, PARTY_FIELDS);
  if (data.contact_id) await validateContacts(party.branch_id, [data.contact_id]);
  if (data.status === 'replaced' && (!data.replaced_by_party_id || !data.replacement_reason)) return res.status(400).json({ error: 'replaced_by_party_id and replacement_reason are required' });
  if (data.replaced_by_party_id && !await SaleParty.count({ where: { id: data.replaced_by_party_id, property_id: party.property_id, branch_id: party.branch_id } })) return res.status(400).json({ error: 'Replacement party must belong to the same property' });
  if ((data.role || party.role) === 'vendor' && (data.status || party.status) === 'active') {
    const others = await SaleParty.findAll({ where: { property_id: party.property_id, role: 'vendor', status: 'active', id: { [Op.ne]: party.id } }, raw: true });
    validatePercentage([...others, { ownership_percent: data.ownership_percent ?? party.ownership_percent }], 'Vendor');
  }
  const oldValue = plain(party);
  await party.update({ ...data, updated_by: req.user.id });
  await recordEvent({ branchId: party.branch_id, propertyId: party.property_id, entityType: 'sale_party', entityId: party.id, eventType: 'PARTY_UPDATED', actorId: req.user.id, oldValue, newValue: plain(party), reason: data.replacement_reason, ipAddress: ip(req) });
  res.json({ data: party });
});

exports.createOffer = asyncHandler(async (req, res) => {
  const property = await propertyForRequest(req, req.params.propertyId);
  if (['sold'].includes(property.status)) return res.status(409).json({ error: 'Offers cannot be created for a sold property' });
  const buyers = Array.isArray(req.body.buyers) ? req.body.buyers.map((buyer) => pick(buyer, ['contact_id', 'client_id', 'ownership_percent', 'is_primary'])) : [];
  if (!buyers.length || buyers.some((buyer) => !buyer.contact_id)) return res.status(400).json({ error: 'At least one buyer with contact_id is required' });
  if (toMinor(req.body.amount) <= 0) return res.status(400).json({ error: 'Offer amount must be positive' });
  if (toMinor(req.body.deposit_amount) < 0 || toMinor(req.body.deposit_amount) > toMinor(req.body.amount)) return res.status(400).json({ error: 'Deposit must be between zero and the offer amount' });
  validatePercentage(buyers, 'Buyer', { exact: true, primary: true });
  await validateContacts(property.branch_id, buyers.map((buyer) => buyer.contact_id));
  await validateClients(property.branch_id, buyers.map((buyer) => buyer.client_id));
  await validateClientContacts(property.branch_id, buyers);
  const offer = await sequelize.transaction(async (transaction) => {
    const data = pick(req.body, OFFER_FIELDS);
    const initialStatus = req.body.status === 'submitted' ? 'submitted' : 'draft';
    const row = await SaleOffer.create({ ...data, branch_id: property.branch_id, property_id: property.id, offer_code: await generateCode(SaleOffer, 'offer_code', 'SSPC-OF-'), source: 'staff', status: initialStatus, submitted_at: initialStatus === 'submitted' ? new Date() : null, created_by: req.user.id, updated_by: req.user.id }, { transaction });
    await SaleOfferParty.bulkCreate(buyers.map((buyer) => ({ ...buyer, branch_id: property.branch_id, offer_id: row.id })), { transaction });
    await recordEvent({ branchId: property.branch_id, propertyId: property.id, entityType: 'sale_offer', entityId: row.id, eventType: 'OFFER_CREATED', actorId: req.user.id, newValue: { ...plain(row), buyers }, ipAddress: ip(req), transaction });
    return row;
  });
  res.status(201).json({ data: offer });
});

exports.patchOffer = asyncHandler(async (req, res) => {
  const offer = await SaleOffer.findOne({ where: { id: req.params.id, ...branchScope(req) } });
  if (!offer) return res.status(404).json({ error: 'Offer not found' });
  if (!['draft', 'submitted', 'countered'].includes(offer.status)) return res.status(409).json({ error: 'Only draft, submitted or countered offers can be edited' });
  const buyers = Array.isArray(req.body.buyers) ? req.body.buyers.map((buyer) => pick(buyer, ['contact_id', 'client_id', 'ownership_percent', 'is_primary'])) : null;
  if (buyers) {
    if (!buyers.length || buyers.some((buyer) => !buyer.contact_id)) return res.status(400).json({ error: 'At least one buyer with contact_id is required' });
    validatePercentage(buyers, 'Buyer', { exact: true, primary: true });
    await validateContacts(offer.branch_id, buyers.map((buyer) => buyer.contact_id));
    await validateClients(offer.branch_id, buyers.map((buyer) => buyer.client_id));
    await validateClientContacts(offer.branch_id, buyers);
  }
  const nextAmount = req.body.amount ?? offer.amount;
  const nextDeposit = req.body.deposit_amount ?? offer.deposit_amount;
  if (toMinor(nextAmount) <= 0 || toMinor(nextDeposit) < 0 || toMinor(nextDeposit) > toMinor(nextAmount)) return res.status(400).json({ error: 'Offer amount must be positive and deposit cannot exceed it' });
  const oldValue = plain(offer);
  await sequelize.transaction(async (transaction) => {
    await offer.update({ ...pick(req.body, OFFER_FIELDS), updated_by: req.user.id }, { transaction });
    if (buyers) {
      await SaleOfferParty.destroy({ where: { offer_id: offer.id, branch_id: offer.branch_id }, transaction });
      await SaleOfferParty.bulkCreate(buyers.map((buyer) => ({ ...buyer, branch_id: offer.branch_id, offer_id: offer.id })), { transaction });
    }
  });
  await recordEvent({ branchId: offer.branch_id, propertyId: offer.property_id, entityType: 'sale_offer', entityId: offer.id, eventType: 'OFFER_UPDATED', actorId: req.user.id, oldValue, newValue: plain(offer), ipAddress: ip(req) });
  res.json({ data: offer });
});

exports.updateOfferStatus = asyncHandler(async (req, res) => {
  const body = pick(req.body, ['status', 'reason']);
  const target = body.status;
  const allowed = { draft: ['submitted', 'withdrawn'], submitted: ['countered', 'rejected', 'withdrawn', 'expired'], countered: ['submitted', 'rejected', 'withdrawn', 'expired'] };
  if (!['submitted', 'countered', 'rejected', 'withdrawn', 'expired'].includes(target)) return res.status(400).json({ error: 'Invalid offer status' });
  const offer = await SaleOffer.findOne({ where: { id: req.params.id, ...branchScope(req) } });
  if (!offer) return res.status(404).json({ error: 'Offer not found' });
  if (!(allowed[offer.status] || []).includes(target)) return res.status(409).json({ error: `Cannot move offer from ${offer.status} to ${target}` });
  const old = offer.status;
  await offer.update({ status: target, status_reason: body.reason || null, submitted_at: target === 'submitted' ? new Date() : offer.submitted_at, updated_by: req.user.id });
  await recordEvent({ branchId: offer.branch_id, propertyId: offer.property_id, entityType: 'sale_offer', entityId: offer.id, eventType: 'STATUS_CHANGED', actorId: req.user.id, oldValue: { status: old }, newValue: { status: target }, reason: body.reason, ipAddress: ip(req) });
  res.json({ data: offer });
});

exports.acceptOffer = asyncHandler(async (req, res) => {
  const body = pick(req.body, ['reason']);
  const result = await sequelize.transaction(async (transaction) => {
    const offer = await SaleOffer.findOne({ where: { id: req.params.id, ...branchScope(req) }, include: [{ model: SaleOfferParty, as: 'buyers', include: [Contact] }], transaction, lock: transaction.LOCK.UPDATE });
    if (!offer) fail(404, 'Offer not found');
    if (!['submitted', 'countered'].includes(offer.status)) fail(409, 'Only submitted or countered offers can be accepted');
    if (toMinor(offer.amount) <= 0) fail(409, 'Offer amount must be positive before acceptance');
    if (offer.expiry_date && new Date(`${offer.expiry_date}T23:59:59`) < new Date()) fail(409, 'Expired offers cannot be accepted');
    const property = await Property.findOne({ where: { id: offer.property_id, branch_id: offer.branch_id, listing_type: 'sale' }, transaction, lock: transaction.LOCK.UPDATE });
    if (!property) fail(404, 'Sale property not found');
    if (!['available', 'reserved', 'draft'].includes(property.status)) fail(409, `A ${property.status} property cannot accept an offer`);
    let vendors = await SaleParty.findAll({ where: { property_id: property.id, branch_id: property.branch_id, role: 'vendor', status: 'active' }, include: [Contact], transaction });
    if (!vendors.length && property.owner_contact_id) {
      await validateContacts(property.branch_id, [property.owner_contact_id], transaction);
      await SaleParty.create({ branch_id: property.branch_id, property_id: property.id, contact_id: property.owner_contact_id, role: 'vendor', ownership_percent: 100, is_primary: true, status: 'active', start_date: new Date(), notes: 'Adopted from the property owner during offer acceptance', created_by: req.user.id, updated_by: req.user.id }, { transaction });
      vendors = await SaleParty.findAll({ where: { property_id: property.id, branch_id: property.branch_id, role: 'vendor', status: 'active' }, include: [Contact], transaction });
    }
    if (!vendors.length) fail(409, 'Add a vendor/owner in the Parties section before accepting this offer');
    validatePercentage(vendors, 'Vendor', { exact: true, primary: true });
    await SaleOffer.update({ status: 'rejected', status_reason: 'Superseded by accepted offer', updated_by: req.user.id }, { where: { property_id: property.id, status: 'accepted', id: { [Op.ne]: offer.id } }, transaction });
    const existingTransaction = await SaleTransaction.findOne({ where: { property_id: property.id, branch_id: property.branch_id, status: { [Op.in]: ['active', 'settlement'] } }, transaction, lock: transaction.LOCK.UPDATE });
    if (existingTransaction && await SaleSettlement.count({ where: { transaction_id: existingTransaction.id }, transaction })) fail(409, 'An accepted transaction with a settlement already exists');
    let deal = await PropertyDeal.findOne({ where: { property_id: property.id, branch_id: property.branch_id, deal_type: 'sell', status: { [Op.notIn]: ['completed', 'cancelled'] } }, transaction, lock: transaction.LOCK.UPDATE });
    const primaryBuyer = offer.buyers.find((buyer) => buyer.is_primary) || offer.buyers[0];
    const primaryVendor = vendors.find((vendor) => vendor.is_primary) || vendors[0];
    const dealData = { buyer_client_id: primaryBuyer?.client_id || null, seller_contact_id: primaryVendor?.contact_id || null, owner_contact_id: primaryVendor?.contact_id || property.owner_contact_id || null, sale_price: offer.amount, status: 'agreed', settlement_date: offer.proposed_completion_date, assigned_to: req.user.id };
    if (deal) await deal.update(dealData, { transaction });
    else deal = await PropertyDeal.create({ ...dealData, branch_id: property.branch_id, property_id: property.id, deal_type: 'sell', deal_code: await generateCode(PropertyDeal, 'deal_code', 'SSPC-DL-'), created_by: req.user.id }, { transaction });
    let saleTransaction;
    if (existingTransaction) {
      await SaleTransactionParty.update({ status: 'withdrawn', withdrawn_at: new Date(), replacement_reason: 'Accepted offer superseded' }, { where: { transaction_id: existingTransaction.id, status: 'active' }, transaction });
      await existingTransaction.update({ property_deal_id: deal.id, accepted_offer_id: offer.id, status: 'active' }, { transaction });
      saleTransaction = existingTransaction;
    } else {
      saleTransaction = await SaleTransaction.create({ branch_id: property.branch_id, property_id: property.id, property_deal_id: deal.id, accepted_offer_id: offer.id, status: 'active', created_by: req.user.id }, { transaction });
    }
    const snapshots = [
      ...offer.buyers.map((buyer) => ({ party_type: 'buyer', contact_id: buyer.contact_id, client_id: buyer.client_id, ownership_percent: buyer.ownership_percent, is_primary: buyer.is_primary, contact: buyer.Contact })),
      ...vendors.map((vendor) => ({ party_type: 'vendor', contact_id: vendor.contact_id, ownership_percent: vendor.ownership_percent, is_primary: vendor.is_primary, contact: vendor.Contact })),
    ];
    const firstRoleCode = await generateCode(PartyRoleProfile, 'profile_code', 'SSPC-PR-');
    let roleCodeNumber = Number(String(firstRoleCode).match(/(\d+)$/)?.[1] || 1);
    for (const snapshot of snapshots) {
      const roleType = snapshot.party_type === 'buyer' ? 'buyer' : 'vendor';
      let roleProfile = await PartyRoleProfile.findOne({ where: { branch_id: property.branch_id, property_id: property.id, contact_id: snapshot.contact_id, role_type: roleType }, transaction });
      if (!roleProfile) {
        const profileCode = `SSPC-PR-${String(roleCodeNumber++).padStart(6, '0')}`;
        roleProfile = await PartyRoleProfile.create({ branch_id: property.branch_id, property_id: property.id, contact_id: snapshot.contact_id, role_type: roleType, profile_code: profileCode, status: 'kyc_pending', kyc_status: 'pending', documents_status: 'pending', next_action: `Complete ${roleType} KYC and agreement`, source: 'staff', created_by: req.user.id }, { transaction });
        // Returning buyers/vendors keep their verified KYC — only the
        // per-property documents and this property's agreement remain.
        try { await require('../services/kycReuse.service').applyKycReuse(roleProfile, { transaction, actorId: req.user.id }); } catch { /* non-fatal */ }
      }
    }
    await SaleTransactionParty.bulkCreate(snapshots.map((snapshot) => ({ branch_id: property.branch_id, transaction_id: saleTransaction.id, party_type: snapshot.party_type, contact_id: snapshot.contact_id, client_id: snapshot.client_id, snapshot_name: snapshot.contact?.full_name || 'Unknown', snapshot_phone: snapshot.contact?.primary_phone, snapshot_email: snapshot.contact?.email, ownership_percent: snapshot.ownership_percent, is_primary: snapshot.is_primary, status: 'active', created_by: req.user.id })), { transaction });
    await offer.update({ status: 'accepted', accepted_at: new Date(), updated_by: req.user.id }, { transaction });
    await property.update({ status: 'reserved' }, { transaction });
    await recordEvent({ branchId: property.branch_id, propertyId: property.id, entityType: 'sale_transaction', entityId: saleTransaction.id, eventType: 'OFFER_ACCEPTED', actorId: req.user.id, oldValue: null, newValue: { offer_id: offer.id, deal_id: deal.id }, reason: body.reason, ipAddress: ip(req), transaction });
    return { offer, deal, transaction: saleTransaction };
  });
  res.status(201).json(result);
});

exports.addTransactionParty = asyncHandler(async (req, res) => {
  const saleTransaction = await transactionForRequest(req, req.params.id);
  if (!['active', 'settlement'].includes(saleTransaction.status)) return res.status(409).json({ error: 'Transaction parties cannot be changed in this status' });
  const data = pick(req.body, TRANSACTION_PARTY_FIELDS);
  if (!['buyer', 'vendor'].includes(data.party_type) || !data.contact_id) return res.status(400).json({ error: 'party_type and contact_id are required' });
  if (data.replaced_party_id && !data.replacement_reason) return res.status(400).json({ error: 'replacement_reason is required when replacing a party' });
  const row = await sequelize.transaction(async (transaction) => {
    await validateContacts(saleTransaction.branch_id, [data.contact_id], transaction);
    await validateClients(saleTransaction.branch_id, [data.client_id], transaction);
    await validateClientContacts(saleTransaction.branch_id, [data], transaction);
    const contact = await Contact.findByPk(data.contact_id, { transaction });
    const active = await SaleTransactionParty.findAll({ where: { transaction_id: saleTransaction.id, party_type: data.party_type, status: 'active' }, transaction, raw: true });
    validatePercentage([...active.filter((party) => party.id !== Number(data.replaced_party_id)), data], data.party_type);
    if (data.replaced_party_id) {
      const replaced = await SaleTransactionParty.findOne({ where: { id: data.replaced_party_id, transaction_id: saleTransaction.id, status: 'active' }, transaction, lock: transaction.LOCK.UPDATE });
      if (!replaced) fail(400, 'Active replaced party not found in transaction');
      await replaced.update({ status: 'replaced', replacement_reason: data.replacement_reason, withdrawn_at: new Date() }, { transaction });
    }
    const created = await SaleTransactionParty.create({ ...data, branch_id: saleTransaction.branch_id, transaction_id: saleTransaction.id, snapshot_name: contact.full_name, snapshot_phone: contact.primary_phone, snapshot_email: contact.email, status: 'active', created_by: req.user.id }, { transaction });
    await recordEvent({ branchId: saleTransaction.branch_id, propertyId: saleTransaction.property_id, entityType: 'sale_transaction_party', entityId: created.id, eventType: data.replaced_party_id ? 'TRANSACTION_PARTY_REPLACED' : 'TRANSACTION_PARTY_ADDED', actorId: req.user.id, newValue: plain(created), reason: data.replacement_reason, ipAddress: ip(req), transaction });
    return created;
  });
  res.status(201).json({ data: row });
});

exports.patchTransactionParty = asyncHandler(async (req, res) => {
  const party = await SaleTransactionParty.findOne({ where: { id: req.params.id, ...branchScope(req) } });
  if (!party) return res.status(404).json({ error: 'Transaction party not found' });
  const data = pick(req.body, ['status', 'replacement_reason']);
  if (!['withdrawn', 'replaced'].includes(data.status)) return res.status(400).json({ error: 'Historical snapshots may only be withdrawn or replaced' });
  if (!data.replacement_reason) return res.status(400).json({ error: 'replacement_reason is required' });
  const saleTransaction = await SaleTransaction.findOne({ where: { id: party.transaction_id, branch_id: party.branch_id } });
  if (!saleTransaction || !['active', 'settlement'].includes(saleTransaction.status)) return res.status(409).json({ error: 'Transaction parties cannot be changed in this status' });
  const oldValue = plain(party);
  await party.update({ status: data.status, replacement_reason: data.replacement_reason, withdrawn_at: new Date() });
  await recordEvent({ branchId: party.branch_id, propertyId: saleTransaction.property_id, entityType: 'sale_transaction_party', entityId: party.id, eventType: 'TRANSACTION_PARTY_UPDATED', actorId: req.user.id, oldValue, newValue: plain(party), reason: data.replacement_reason, ipAddress: ip(req) });
  res.json({ data: party });
});

exports.createSettlement = asyncHandler(async (req, res) => {
  const result = await sequelize.transaction(async (transaction) => {
    const saleTransaction = await SaleTransaction.findOne({ where: { id: req.params.id, ...branchScope(req) }, transaction, lock: transaction.LOCK.UPDATE });
    if (!saleTransaction) fail(404, 'Sale transaction not found');
    if (!['active', 'settlement'].includes(saleTransaction.status)) fail(409, 'Settlement cannot be created for this transaction');
    const deal = await PropertyDeal.findOne({ where: { id: saleTransaction.property_deal_id, branch_id: saleTransaction.branch_id }, transaction, lock: transaction.LOCK.UPDATE });
    const purchaseMinor = toMinor(deal?.sale_price || req.body.purchase_price);
    if (purchaseMinor <= 0) fail(400, 'A positive accepted sale price is required');
    const [settlement, created] = await SaleSettlement.findOrCreate({
      where: { transaction_id: saleTransaction.id },
      defaults: { branch_id: saleTransaction.branch_id, settlement_code: await generateCode(SaleSettlement, 'settlement_code', 'SSPC-ST-'), status: 'draft', prepared_by: req.user.id },
      transaction,
    });
    if (!created) return { settlement, created };

    const [vendorParties, buyerParties, acceptedOffer] = await Promise.all([
      SaleTransactionParty.findAll({ where: { transaction_id: saleTransaction.id, party_type: 'vendor', status: 'active' }, order: [['is_primary', 'DESC'], ['id', 'ASC']], transaction }),
      SaleTransactionParty.findAll({ where: { transaction_id: saleTransaction.id, party_type: 'buyer', status: 'active' }, order: [['is_primary', 'DESC'], ['id', 'ASC']], transaction }),
      SaleOffer.findOne({ where: { id: saleTransaction.accepted_offer_id, branch_id: saleTransaction.branch_id }, transaction }),
    ]);
    validatePercentage(vendorParties, 'Vendor', { exact: true, primary: true });
    validatePercentage(buyerParties, 'Buyer', { exact: true, primary: true });
    const purchasePrice = fromMinor(purchaseMinor);
    const quote = await agencyFees.quoteForSale({ property_id: saleTransaction.property_id, branch_id: saleTransaction.branch_id, sale_value: purchasePrice }, { transaction });
    const commissionMinor = toMinor(quote.commission.amount);
    const marketingMinor = toMinor(quote.marketing_fee);
    const vendorTotalMinor = purchaseMinor - commissionMinor - marketingMinor;
    if (vendorTotalMinor < 0) fail(409, 'Agency fees cannot exceed the accepted purchase price');
    const lines = [{ line_type: 'purchase_price', direction: 'debit', amount: decimalFromMinor(purchaseMinor), description: 'Accepted property purchase price' }];
    if (commissionMinor > 0) lines.push({
      line_type: 'commission', direction: 'debit', amount: decimalFromMinor(commissionMinor), description: 'Seventh Sky sales commission',
      fee_basis: quote.commission.basis, fee_rate: quote.commission.rate, fee_basis_amount: quote.commission.basis_amount,
      auto_amount: decimalFromMinor(commissionMinor), terms: quote.commission_terms,
    });
    if (marketingMinor > 0) lines.push({
      line_type: 'advertising', direction: 'debit', amount: decimalFromMinor(marketingMinor), description: 'Agreed marketing fee',
      fee_basis: 'fixed', fee_basis_amount: purchasePrice, auto_amount: decimalFromMinor(marketingMinor), terms: quote.marketing_terms,
    });
    let allocatedMinor = 0;
    vendorParties.forEach((party, index) => {
      const amountMinor = index === vendorParties.length - 1
        ? vendorTotalMinor - allocatedMinor
        : Math.round(vendorTotalMinor * Number(party.ownership_percent) / 100);
      allocatedMinor += amountMinor;
      lines.push({ line_type: 'vendor_proceeds', direction: 'debit', amount: decimalFromMinor(amountMinor), payee_transaction_party_id: party.id, description: `Vendor proceeds - ${party.snapshot_name}` });
    });
    await SaleSettlementLine.bulkCreate(lines.map((line) => ({ ...line, branch_id: saleTransaction.branch_id, settlement_id: settlement.id, created_by: req.user.id })), { transaction });
    const depositMinor = toMinor(acceptedOffer?.deposit_amount);
    if (depositMinor > 0) {
      const buyer = buyerParties.find((party) => party.is_primary) || buyerParties[0];
      await SaleFundingRequest.findOrCreate({
        where: { branch_id: saleTransaction.branch_id, idempotency_key: `settlement:${settlement.id}:deposit` },
        defaults: { branch_id: saleTransaction.branch_id, settlement_id: settlement.id, transaction_party_id: buyer.id, request_type: 'deposit', amount: decimalFromMinor(depositMinor), provider: 'manual_bank', status: 'draft', created_by: req.user.id },
        transaction,
      });
    }
    await saleTransaction.update({ status: 'settlement' }, { transaction });
    await PropertyDeal.update({ status: 'settlement' }, { where: { id: saleTransaction.property_deal_id, branch_id: saleTransaction.branch_id }, transaction });
    await recordEvent({ branchId: saleTransaction.branch_id, propertyId: saleTransaction.property_id, entityType: 'sale_settlement', entityId: settlement.id, eventType: 'SETTLEMENT_CREATED', actorId: req.user.id, newValue: { ...plain(settlement), lines }, ipAddress: ip(req), transaction });
    return { settlement, created };
  });
  res.status(result.created ? 201 : 200).json({ data: result.settlement, created: result.created });
});

exports.accountingOptions = asyncHandler(async (req, res) => {
  const where = branchScope(req);
  const [accounts, bankAccounts] = await Promise.all([
    Account.findAll({ where: { ...where, is_active: true }, order: [['code', 'ASC']] }),
    BankAccount.findAll({ where: { ...where, is_active: true }, order: [['account_type', 'ASC'], ['id', 'ASC']] }),
  ]);
  res.json({ data: { ledger_accounts: accounts, bank_accounts: bankAccounts.map((account) => ({ ...plain(account), account_number: `****${String(account.account_number).replace(/\W/g, '').slice(-4)}` })) } });
});

exports.createPhysicalBankAccount = asyncHandler(async (req, res) => {
  const body = pick(req.body, ['account_name', 'account_number', 'bank_name', 'routing_number', 'account_type', 'currency']);
  if (!body.account_name || !body.account_number || !body.bank_name || !['trust', 'operating', 'other'].includes(body.account_type)) return res.status(400).json({ error: 'account_name, account_number, bank_name, and valid account_type are required' });
  const branchId = req.user?.role === 'super_admin' ? Number(req.body.branch_id || req.user.branch_id) : Number(req.user.branch_id);
  if (!branchId) return res.status(400).json({ error: 'branch_id is required' });
  const [account, created] = await BankAccount.findOrCreate({ where: { branch_id: branchId, account_number: body.account_number }, defaults: { ...body, branch_id: branchId, currency: body.currency || 'BDT', is_active: true } });
  res.status(created ? 201 : 200).json({ data: { ...plain(account), account_number: `****${String(account.account_number).replace(/\W/g, '').slice(-4)}` }, created });
});

exports.listTransactionBankAccounts = asyncHandler(async (req, res) => {
  const saleTransaction = await transactionForRequest(req, req.params.id);
  const parties = await SaleTransactionParty.findAll({ where: { transaction_id: saleTransaction.id, branch_id: saleTransaction.branch_id, status: 'active' }, raw: true });
  const settlement = await SaleSettlement.findOne({ where: { transaction_id: saleTransaction.id, branch_id: saleTransaction.branch_id }, attributes: ['id'], raw: true });
  const payeeLines = settlement ? await SaleSettlementLine.findAll({ where: { settlement_id: settlement.id, branch_id: saleTransaction.branch_id, payee_contact_id: { [Op.ne]: null } }, attributes: ['payee_contact_id'], raw: true }) : [];
  const contactIds = [...new Set([
    ...parties.map((party) => Number(party.contact_id)),
    ...payeeLines.map((line) => Number(line.payee_contact_id)),
  ].filter(Boolean))];
  const accounts = contactIds.length ? await PartyBankAccount.findAll({ where: { branch_id: saleTransaction.branch_id, contact_id: { [Op.in]: contactIds } }, order: [['is_primary', 'DESC'], ['id', 'ASC']] }) : [];
  res.json({ data: accounts.map((account) => publicBankAccount(account, true)) });
});

exports.createPartyBankAccount = asyncHandler(async (req, res) => {
  const party = await SaleTransactionParty.findOne({ where: { id: req.params.id, ...branchScope(req), status: 'active' } });
  if (!party) return res.status(404).json({ error: 'Active transaction party not found' });
  const body = pick(req.body, ['bank_name', 'bank_branch', 'account_name', 'account_number', 'routing_number', 'is_primary']);
  if (!body.bank_name || !body.account_name || !body.account_number) return res.status(400).json({ error: 'bank_name, account_name, and account_number are required' });
  const account = await sequelize.transaction(async (transaction) => {
    if (body.is_primary) await PartyBankAccount.update({ is_primary: false }, { where: { branch_id: party.branch_id, contact_id: party.contact_id, role_type: party.party_type }, transaction });
    return PartyBankAccount.create({
      ...body, branch_id: party.branch_id, contact_id: party.contact_id, role_type: party.party_type,
      account_number_hash: accountNumberHash(body.account_number), status: 'pending', created_by: req.user.id,
    }, { transaction });
  });
  res.status(201).json({ data: publicBankAccount(account, true) });
});

exports.createContactBankAccount = asyncHandler(async (req, res) => {
  const contact = await Contact.findOne({ where: { id: req.params.id, ...branchScope(req) } });
  if (!contact) return res.status(404).json({ error: 'Contact not found' });
  const body = pick(req.body, ['bank_name', 'bank_branch', 'account_name', 'account_number', 'routing_number', 'is_primary']);
  if (!body.bank_name || !body.account_name || !body.account_number) return res.status(400).json({ error: 'bank_name, account_name, and account_number are required' });
  const account = await PartyBankAccount.create({ ...body, branch_id: contact.branch_id, contact_id: contact.id, role_type: 'third_party', account_number_hash: accountNumberHash(body.account_number), status: 'pending', created_by: req.user.id });
  res.status(201).json({ data: publicBankAccount(account, true) });
});

exports.verifyPartyBankAccount = asyncHandler(async (req, res) => {
  const body = pick(req.body, ['action', 'note']);
  if (!['verify', 'reject'].includes(body.action) || !String(body.note || '').trim()) return res.status(400).json({ error: 'action (verify/reject) and note are required' });
  const account = await PartyBankAccount.findOne({ where: { id: req.params.id, ...branchScope(req) } });
  if (!account) return res.status(404).json({ error: 'Party bank account not found' });
  if (Number(account.created_by) === Number(req.user.id)) return res.status(409).json({ error: 'A different accounts user must verify recipient bank details' });
  await account.update({ status: body.action === 'verify' ? 'verified' : 'rejected', verification_note: body.note, verified_by: req.user.id, verified_at: new Date() });
  res.json({ data: publicBankAccount(account, true) });
});

exports.listSettlementBankLines = asyncHandler(async (req, res) => {
  const settlement = await settlementForRequest(req, req.params.id);
  const saleTransaction = await SaleTransaction.findOne({ where: { id: settlement.transaction_id, branch_id: settlement.branch_id } });
  const profile = saleTransaction && await SaleProfile.findOne({ where: { property_id: saleTransaction.property_id, branch_id: settlement.branch_id } });
  if (!profile?.trust_bank_account_id) return res.status(409).json({ error: 'Configure the physical trust bank account first' });
  const lines = await BankStatementLine.findAll({ where: { branch_id: settlement.branch_id, bank_account_id: profile.trust_bank_account_id }, order: [['date', 'DESC'], ['id', 'DESC']] });
  res.json({ data: lines });
});

exports.createSettlementBankLine = asyncHandler(async (req, res) => {
  const settlement = await settlementForRequest(req, req.params.id);
  const body = pick(req.body, ['date', 'description', 'reference', 'amount', 'import_key']);
  if (!body.date || toMinor(body.amount) === 0) return res.status(400).json({ error: 'date and non-zero signed amount are required' });
  const saleTransaction = await SaleTransaction.findOne({ where: { id: settlement.transaction_id, branch_id: settlement.branch_id } });
  const profile = saleTransaction && await SaleProfile.findOne({ where: { property_id: saleTransaction.property_id, branch_id: settlement.branch_id } });
  if (!profile?.trust_bank_account_id) return res.status(409).json({ error: 'Configure the physical trust bank account first' });
  const importKey = body.import_key || crypto.createHash('sha256').update(`${profile.trust_bank_account_id}|${body.date}|${body.reference || ''}|${decimalFromMinor(toMinor(body.amount))}`).digest('hex');
  const [line, created] = await BankStatementLine.findOrCreate({
    where: { bank_account_id: profile.trust_bank_account_id, import_key: importKey },
    defaults: { ...body, amount: decimalFromMinor(toMinor(body.amount)), import_key: importKey, branch_id: settlement.branch_id, bank_account_id: profile.trust_bank_account_id, status: 'unmatched' },
  });
  res.status(created ? 201 : 200).json({ data: line, created });
});

/* POST /sales/transactions/:id/cancel — the fast unwind for a deal that died
   before any money cleared: offer withdrawn, transaction cancelled, property
   back on the market. If cleared funds exist, this refuses and points at the
   buyer-withdrawal settlement, which is the only path that refunds correctly. */
exports.cancelTransaction = asyncHandler(async (req, res) => {
  const body = pick(req.body, ['reason']);
  if (!String(body.reason || '').trim()) return res.status(400).json({ error: 'A written reason is required to cancel the transaction' });
  const result = await sequelize.transaction(async (transaction) => {
    const saleTransaction = await SaleTransaction.findOne({ where: { id: req.params.id, ...branchScope(req) }, transaction, lock: transaction.LOCK.UPDATE });
    if (!saleTransaction) fail(404, 'Sale transaction not found');
    if (!['active', 'settlement'].includes(saleTransaction.status)) fail(409, `A ${saleTransaction.status} transaction cannot be cancelled`);
    const settlement = await SaleSettlement.findOne({ where: { transaction_id: saleTransaction.id, branch_id: saleTransaction.branch_id }, transaction, lock: transaction.LOCK.UPDATE });
    if (settlement) {
      if (!['draft', 'returned'].includes(settlement.status)) fail(409, `Return the settlement to draft before cancelling (it is ${settlement.status})`);
      const payments = await SalePayment.findAll({ where: { settlement_id: settlement.id, branch_id: settlement.branch_id }, transaction, raw: true });
      const live = excludeReversalPairs(payments);
      if (live.some((payment) => payment.status === 'cleared')) fail(409, 'Cleared client money exists on this settlement — use Buyer withdrawal / refund so the funds are returned and accounted for');
      if (live.some((payment) => payment.status === 'pending')) fail(409, 'A pending payment exists — clear-and-refund it via Buyer withdrawal, or reject it first');
      if (await SaleDisbursement.count({ where: { settlement_id: settlement.id, status: 'paid' }, transaction })) fail(409, 'A paid payout exists on this settlement — it cannot be cancelled outright');
    }
    await SaleTransactionParty.update({ status: 'withdrawn', withdrawn_at: new Date(), replacement_reason: body.reason }, { where: { transaction_id: saleTransaction.id, status: 'active' }, transaction });
    await saleTransaction.update({ status: 'cancelled' }, { transaction });
    await PropertyDeal.update({ status: 'cancelled' }, { where: { id: saleTransaction.property_deal_id, branch_id: saleTransaction.branch_id }, transaction });
    await Property.update({ status: 'available' }, { where: { id: saleTransaction.property_id, branch_id: saleTransaction.branch_id }, transaction });
    if (saleTransaction.accepted_offer_id) {
      const acceptedOffer = await SaleOffer.findOne({ where: { id: saleTransaction.accepted_offer_id, branch_id: saleTransaction.branch_id, status: 'accepted' }, transaction });
      if (acceptedOffer) {
        await acceptedOffer.update({ status: 'withdrawn', status_reason: body.reason, updated_by: req.user.id }, { transaction });
        await recordEvent({ branchId: saleTransaction.branch_id, propertyId: saleTransaction.property_id, entityType: 'sale_offer', entityId: acceptedOffer.id, eventType: 'STATUS_CHANGED', actorId: req.user.id, oldValue: { status: 'accepted' }, newValue: { status: 'withdrawn' }, reason: body.reason, ipAddress: ip(req), transaction });
      }
    }
    await recordEvent({ branchId: saleTransaction.branch_id, propertyId: saleTransaction.property_id, entityType: 'sale_transaction', entityId: saleTransaction.id, eventType: 'TRANSACTION_CANCELLED', actorId: req.user.id, oldValue: { status: 'active' }, newValue: { status: 'cancelled' }, reason: body.reason, ipAddress: ip(req), transaction });
    return saleTransaction;
  });
  res.json({ data: result, message: 'Transaction cancelled — the property is back on the market and a new offer can be accepted.' });
});

exports.prepareWithdrawal = asyncHandler(async (req, res) => {
  const body = pick(req.body, ['buyer_party_id', 'reason', 'withdrawal_date', 'owner_deduction', 'company_deduction', 'deductions']);
  if (!body.buyer_party_id || !body.reason) return res.status(400).json({ error: 'buyer_party_id and withdrawal reason are required' });
  const saleTransaction = await transactionForRequest(req, req.params.id);
  if (!['active', 'settlement'].includes(saleTransaction.status)) return res.status(409).json({ error: 'This transaction cannot enter withdrawal settlement' });
  const result = await sequelize.transaction(async (transaction) => {
    const buyer = await SaleTransactionParty.findOne({ where: { id: body.buyer_party_id, transaction_id: saleTransaction.id, branch_id: saleTransaction.branch_id, party_type: 'buyer', status: 'active' }, transaction, lock: transaction.LOCK.UPDATE });
    if (!buyer) fail(400, 'Active buyer not found in this transaction');
    const activeBuyers = await SaleTransactionParty.count({ where: { transaction_id: saleTransaction.id, party_type: 'buyer', status: 'active' }, transaction });
    let settlement = await SaleSettlement.findOne({ where: { transaction_id: saleTransaction.id, branch_id: saleTransaction.branch_id }, transaction, lock: transaction.LOCK.UPDATE });
    if (settlement && !['draft', 'returned'].includes(settlement.status)) fail(409, 'Return the settlement to draft before preparing a buyer withdrawal');
    if (settlement) {
      const [paymentCount, disbursementCount, approvalCount, invoiceCount] = await Promise.all([
        SalePayment.count({ where: { settlement_id: settlement.id, branch_id: settlement.branch_id }, transaction }),
        SaleDisbursement.count({ where: { settlement_id: settlement.id, branch_id: settlement.branch_id }, transaction }),
        SaleSettlementApproval.count({ where: { settlement_id: settlement.id, branch_id: settlement.branch_id }, transaction }),
        SaleVendorInvoice.count({ where: { settlement_id: settlement.id, branch_id: settlement.branch_id, status: { [Op.ne]: 'void' } }, transaction }),
      ]);
      if (settlement.settlement_type !== 'withdrawal' && paymentCount + disbursementCount + approvalCount + invoiceCount > 0) fail(409, 'A completion settlement with payments, payouts, approvals, or invoices cannot be converted to a withdrawal');
      if (settlement.settlement_type === 'withdrawal' && disbursementCount + invoiceCount > 0) fail(409, 'A withdrawal schedule with payout history or an active invoice cannot be rebuilt; edit its lines instead');
    } else settlement = await SaleSettlement.create({ branch_id: saleTransaction.branch_id, transaction_id: saleTransaction.id, settlement_code: await generateCode(SaleSettlement, 'settlement_code', 'SSPC-ST-'), status: 'draft', prepared_by: req.user.id }, { transaction });
    const payments = await SalePayment.findAll({ where: { settlement_id: settlement.id, branch_id: settlement.branch_id, direction: 'incoming', status: 'cleared' }, transaction, raw: true });
    const reversedIds = new Set(payments.filter((payment) => payment.reversal_of_payment_id).map((payment) => Number(payment.reversal_of_payment_id)));
    const received = roundMoney(payments.filter((payment) => !payment.reversal_of_payment_id && !reversedIds.has(Number(payment.id)) && (Number(payment.transaction_party_id) === Number(buyer.id) || (!payment.transaction_party_id && activeBuyers === 1))).reduce((sum, payment) => sum + money(payment.amount), 0));
    const ownerDeductionMinor = toMinor(body.owner_deduction);
    const companyDeductionMinor = toMinor(body.company_deduction);
    const extras = Array.isArray(body.deductions) ? body.deductions.map((item) => pick(item, ['line_type', 'amount', 'description', 'payee_transaction_party_id', 'payee_contact_id'])).filter((item) => ['agency_fee', 'advertising', 'admin_fee', 'vat_tax', 'legal_fee', 'registration_fee', 'third_party', 'rounding'].includes(item.line_type) && money(item.amount) > 0) : [];
    const extraTotalMinor = extras.reduce((sum, item) => sum + toMinor(item.amount), 0);
    const receivedMinor = toMinor(received);
    if ([ownerDeductionMinor, companyDeductionMinor].some((amount) => amount < 0) || ownerDeductionMinor + companyDeductionMinor + extraTotalMinor > receivedMinor) fail(400, 'Withdrawal deductions cannot exceed cleared funds received from the buyer');
    const vendors = await SaleTransactionParty.findAll({ where: { transaction_id: saleTransaction.id, party_type: 'vendor', status: 'active' }, order: [['is_primary', 'DESC'], ['id', 'ASC']], transaction });
    if (ownerDeductionMinor > 0) validatePercentage(vendors, 'Vendor', { exact: true, primary: true });
    const refundDueMinor = receivedMinor - ownerDeductionMinor - companyDeductionMinor - extraTotalMinor;
    const lines = [{ line_type: 'purchase_price', direction: 'debit', amount: decimalFromMinor(receivedMinor), description: `Cleared funds received from withdrawn buyer ${buyer.snapshot_name}` }];
    if (ownerDeductionMinor > 0) {
      let vendorAllocatedMinor = 0;
      vendors.forEach((vendor, index) => {
        const amountMinor = index === vendors.length - 1 ? ownerDeductionMinor - vendorAllocatedMinor : Math.round(ownerDeductionMinor * Number(vendor.ownership_percent) / 100);
        vendorAllocatedMinor += amountMinor;
        lines.push({ line_type: 'vendor_proceeds', direction: 'debit', amount: decimalFromMinor(amountMinor), payee_transaction_party_id: vendor.id, description: `Buyer withdrawal deduction credited to ${vendor.snapshot_name}` });
      });
    }
    if (companyDeductionMinor > 0) lines.push({ line_type: 'admin_fee', direction: 'debit', amount: decimalFromMinor(companyDeductionMinor), description: 'Buyer withdrawal administration deduction' });
    lines.push(...extras.map((item) => ({ ...item, direction: 'debit', amount: decimalFromMinor(toMinor(item.amount)) })));
    if (refundDueMinor > 0) lines.push({ line_type: 'buyer_refund', direction: 'debit', amount: decimalFromMinor(refundDueMinor), payee_transaction_party_id: buyer.id, description: 'Refund due to withdrawn buyer' });
    await replaceGeneratedSettlementLines(settlement, lines, req.user.id, transaction);
    await markSettlementRevised(settlement, req.user.id, transaction);
    await settlement.update({ settlement_type: 'withdrawal', withdrawal_buyer_party_id: buyer.id, withdrawal_reason: body.reason, withdrawal_date: body.withdrawal_date || new Date(), prepared_by: req.user.id, status: 'draft' }, { transaction });
    await saleTransaction.update({ status: 'settlement' }, { transaction });
    await recordEvent({ branchId: settlement.branch_id, propertyId: saleTransaction.property_id, entityType: 'sale_settlement', entityId: settlement.id, eventType: 'BUYER_WITHDRAWAL_PREPARED', actorId: req.user.id, newValue: { buyer_party_id: buyer.id, received, owner_deduction: fromMinor(ownerDeductionMinor), company_deduction: fromMinor(companyDeductionMinor), extra_deductions: fromMinor(extraTotalMinor), refund_due: fromMinor(refundDueMinor) }, reason: body.reason, ipAddress: ip(req), transaction });
    return { settlement, lines, summary: { received, owner_deduction: fromMinor(ownerDeductionMinor), company_deduction: fromMinor(companyDeductionMinor), extra_deductions: fromMinor(extraTotalMinor), refund_due: fromMinor(refundDueMinor) } };
  });
  res.status(201).json(result);
});

exports.replaceSettlementLines = asyncHandler(async (req, res) => {
  if (!Array.isArray(req.body.lines)) return res.status(400).json({ error: 'lines array is required' });
  const settlement = await settlementForRequest(req, req.params.id);
  if (!['draft', 'returned'].includes(settlement.status)) return res.status(409).json({ error: 'Lines can only be replaced while draft or returned' });
  const lines = req.body.lines.map((line) => ({ id: line.id == null || line.id === '' ? null : Number(line.id), ...pick(line, LINE_FIELDS) }));
  if (lines.some((line) => line.id != null && (!Number.isInteger(line.id) || line.id <= 0))) return res.status(400).json({ error: 'Line ids must be positive integers' });
  const suppliedIds = lines.filter((line) => line.id).map((line) => line.id);
  if (new Set(suppliedIds).size !== suppliedIds.length) return res.status(400).json({ error: 'Each existing settlement line id may only appear once' });
  if (lines.some((line) => !LINE_TYPES.has(line.line_type) || line.direction !== 'debit' || toMinor(line.amount) < 0)) return res.status(400).json({ error: 'Each line requires a valid line_type, debit direction, and non-negative amount' });
  const result = await sequelize.transaction(async (transaction) => {
    const lockedSettlement = await SaleSettlement.findOne({ where: { id: settlement.id, branch_id: settlement.branch_id }, transaction, lock: transaction.LOCK.UPDATE });
    if (!lockedSettlement || !['draft', 'returned'].includes(lockedSettlement.status)) fail(409, 'Lines can only be changed while draft or returned');
    const partyIds = lines.map((line) => line.payee_transaction_party_id).filter(Boolean);
    const contactIds = lines.map((line) => line.payee_contact_id).filter(Boolean);
    if (partyIds.length && await SaleTransactionParty.count({ where: { id: { [Op.in]: [...new Set(partyIds.map(Number))] }, transaction_id: lockedSettlement.transaction_id, branch_id: lockedSettlement.branch_id }, transaction }) !== new Set(partyIds.map(Number)).size) fail(400, 'Line payee parties must belong to the settlement transaction');
    await validateContacts(lockedSettlement.branch_id, contactIds, transaction);
    const existing = await SaleSettlementLine.findAll({ where: { settlement_id: lockedSettlement.id, branch_id: lockedSettlement.branch_id }, transaction, lock: transaction.LOCK.UPDATE });
    const existingById = new Map(existing.map((line) => [Number(line.id), line]));
    if (suppliedIds.some((id) => !existingById.has(id))) fail(400, 'Every supplied line id must belong to this settlement');
    const linkedDisbursements = existing.length ? await SaleDisbursement.findAll({ where: { settlement_line_id: { [Op.in]: existing.map((line) => line.id) } }, attributes: ['settlement_line_id', 'status'], transaction, raw: true }) : [];
    const referencedIds = new Set(linkedDisbursements.map((item) => Number(item.settlement_line_id)));
    const activeReferenceIds = new Set(linkedDisbursements.filter((item) => item.status !== 'cancelled').map((item) => Number(item.settlement_line_id)));
    const incomingById = new Map(lines.filter((line) => line.id).map((line) => [line.id, line]));
    for (const current of existing) {
      const incoming = incomingById.get(Number(current.id));
      const provenanceProtected = agencyFees.AGENCY_LINE_TYPES.includes(current.line_type);
      if (!incoming && referencedIds.has(Number(current.id))) fail(409, `Settlement line #${current.id} is linked to a disbursement and cannot be deleted`);
      if (!incoming && provenanceProtected) fail(409, `Settlement line #${current.id} carries fee/invoice provenance and cannot be deleted; use the fee editor to set it to zero`);
      if (incoming && activeReferenceIds.has(Number(current.id)) && lineFinanciallyChanged(current, incoming)) fail(409, `Settlement line #${current.id} is linked to an active disbursement and its financial fields cannot change`);
      if (incoming && provenanceProtected && lineFinanciallyChanged(current, incoming)) fail(409, `Settlement line #${current.id} carries fee/invoice provenance; change its amount through the fee editor`);
    }
    for (const line of lines.filter((item) => item.id)) await existingById.get(line.id).update(pick(line, LINE_FIELDS), { transaction });
    const omittedIds = existing.filter((line) => !incomingById.has(Number(line.id))).map((line) => line.id);
    if (omittedIds.length) await SaleSettlementLine.destroy({ where: { id: { [Op.in]: omittedIds }, settlement_id: lockedSettlement.id, branch_id: lockedSettlement.branch_id }, transaction });
    const additions = lines.filter((line) => !line.id);
    if (additions.some((line) => agencyFees.AGENCY_LINE_TYPES.includes(line.line_type))) fail(409, 'Commission and advertising lines must come from the agency agreement; edit an existing fee through the audited fee action');
    if (additions.length) await SaleSettlementLine.bulkCreate(additions.map((line) => ({ ...pick(line, LINE_FIELDS), branch_id: lockedSettlement.branch_id, settlement_id: lockedSettlement.id, created_by: req.user.id })), { transaction });
    // auto_balance: recompute vendor proceeds from the new schedule so the
    // statement lands balanced instead of with a residual exception.
    if (req.body.auto_balance && lockedSettlement.settlement_type !== 'withdrawal') await rebalanceVendorProceeds(lockedSettlement, req.user.id, transaction);
    await markSettlementRevised(lockedSettlement, req.user.id, transaction);
    const updated = await SaleSettlementLine.findAll({ where: { settlement_id: lockedSettlement.id, branch_id: lockedSettlement.branch_id }, order: [['id', 'ASC']], transaction });
    const saleTransaction = await SaleTransaction.findOne({ where: { id: lockedSettlement.transaction_id, branch_id: lockedSettlement.branch_id }, transaction });
    await recordEvent({ branchId: lockedSettlement.branch_id, propertyId: saleTransaction.property_id, entityType: 'sale_settlement', entityId: lockedSettlement.id, eventType: 'SETTLEMENT_LINES_UPDATED', actorId: req.user.id, newValue: { line_count: updated.length, auto_balanced: !!req.body.auto_balance, calculations: calculateSettlement(updated, [], []) }, ipAddress: ip(req), transaction });
    return updated;
  });
  res.json({ data: result, calculations: calculateSettlement(result, [], []) });
});

/* Keep the statement identity true after any fee/line change:
   vendor proceeds = purchase price − deductions − refunds due.
   Existing vendor_proceeds lines are scaled proportionally so a multi-vendor
   split survives; the last line absorbs the rounding remainder. */
async function rebalanceVendorProceeds(settlement, actorId, transaction) {
  const lines = await SaleSettlementLine.findAll({ where: { settlement_id: settlement.id, branch_id: settlement.branch_id }, order: [['id', 'ASC']], transaction });
  const priceMinor = lines.filter((line) => line.line_type === 'purchase_price').reduce((sum, line) => sum + toMinor(line.amount), 0);
  const deductionsMinor = lines.filter((line) => DEDUCTION_TYPES.has(line.line_type)).reduce((sum, line) => sum + (line.direction === 'credit' ? -toMinor(line.amount) : toMinor(line.amount)), 0);
  const refundsMinor = lines.filter((line) => line.line_type === 'buyer_refund').reduce((sum, line) => sum + toMinor(line.amount), 0);
  const targetMinor = Math.max(priceMinor - deductionsMinor - refundsMinor, 0);
  const vendorLines = lines.filter((line) => line.line_type === 'vendor_proceeds');
  const currentMinor = vendorLines.reduce((sum, line) => sum + toMinor(line.amount), 0);
  const vendorParties = await SaleTransactionParty.findAll({ where: { transaction_id: settlement.transaction_id, party_type: 'vendor', status: 'active' }, order: [['is_primary', 'DESC'], ['id', 'ASC']], transaction });
  validatePercentage(vendorParties, 'Vendor', { exact: true, primary: true });
  const expected = new Map();
  let allocatedMinor = 0;
  vendorParties.forEach((party, index) => {
    const amountMinor = index === vendorParties.length - 1 ? targetMinor - allocatedMinor : Math.round(targetMinor * Number(party.ownership_percent) / 100);
    allocatedMinor += amountMinor;
    expected.set(Number(party.id), amountMinor);
  });
  const alreadyExact = vendorLines.length === vendorParties.length
    && vendorLines.every((line) => expected.get(Number(line.payee_transaction_party_id)) === toMinor(line.amount));
  if (alreadyExact) return { changed: false, target: fromMinor(targetMinor), previous: fromMinor(currentMinor) };
  if (vendorLines.length && await SaleDisbursement.count({ where: { settlement_line_id: { [Op.in]: vendorLines.map((line) => line.id) }, status: { [Op.ne]: 'cancelled' } }, transaction })) fail(409, 'Vendor proceeds are linked to an active disbursement; cancel the payout before rebalancing');
  if (vendorLines.length) await SaleSettlementLine.destroy({ where: { id: { [Op.in]: vendorLines.map((line) => line.id) }, settlement_id: settlement.id }, transaction });
  await SaleSettlementLine.bulkCreate(vendorParties.map((party) => ({
    line_type: 'vendor_proceeds', direction: 'debit', amount: decimalFromMinor(expected.get(Number(party.id))),
    payee_transaction_party_id: party.id, description: `Vendor proceeds - ${party.snapshot_name}`,
    branch_id: settlement.branch_id, settlement_id: settlement.id, created_by: actorId,
  })), { transaction });
  return { changed: true, target: fromMinor(targetMinor), previous: fromMinor(currentMinor) };
}

/* POST /sales/settlements/:id/rebalance — one click to make the statement
   balance again after fees or refunds changed. Draft/returned only, audited. */
exports.rebalanceSettlement = asyncHandler(async (req, res) => {
  const settlement = await settlementForRequest(req, req.params.id);
  if (!['draft', 'returned'].includes(settlement.status)) return res.status(409).json({ error: `Rebalancing is only allowed while draft or returned (it is ${settlement.status})` });
  // A withdrawal statement balances against the buyer's cleared funds, not the
  // price identity — recomputing it here would corrupt the refund schedule.
  if (settlement.settlement_type === 'withdrawal') return res.status(409).json({ error: 'Withdrawal settlements are balanced from the buyer\'s cleared funds — re-run Prepare withdrawal to recalculate' });
  const result = await sequelize.transaction(async (transaction) => {
    const lockedSettlement = await SaleSettlement.findOne({ where: { id: settlement.id, branch_id: settlement.branch_id }, transaction, lock: transaction.LOCK.UPDATE });
    if (!lockedSettlement || !['draft', 'returned'].includes(lockedSettlement.status)) fail(409, 'Rebalancing is only allowed while draft or returned');
    const outcome = await rebalanceVendorProceeds(lockedSettlement, req.user.id, transaction);
    await markSettlementRevised(lockedSettlement, req.user.id, transaction);
    const saleTransaction = await SaleTransaction.findOne({ where: { id: lockedSettlement.transaction_id, branch_id: lockedSettlement.branch_id }, transaction });
    if (outcome.changed) {
      await recordEvent({ branchId: lockedSettlement.branch_id, propertyId: saleTransaction?.property_id, entityType: 'sale_settlement', entityId: lockedSettlement.id, eventType: 'SETTLEMENT_REBALANCED', actorId: req.user.id, oldValue: { vendor_proceeds: outcome.previous }, newValue: { vendor_proceeds: outcome.target }, reason: 'Vendor proceeds recomputed as price − deductions − refunds', ipAddress: ip(req), transaction });
    }
    const snapshot = await settlementSnapshot(lockedSettlement.id, transaction);
    return { ...outcome, calculations: snapshot.calculations, lines: snapshot.lines };
  });
  res.json({ data: result, message: result.changed ? `Vendor proceeds rebalanced from ${result.previous} to ${result.target}.` : 'Statement already balanced — nothing changed.' });
});

exports.createFundingRequest = asyncHandler(async (req, res) => {
  const settlement = await settlementForRequest(req, req.params.id);
  if (settlement.status === 'locked') return res.status(409).json({ error: 'Locked settlements are immutable' });
  const body = pick(req.body, ['transaction_party_id', 'request_type', 'amount', 'provider', 'idempotency_key', 'expires_at']);
  if (!body.transaction_party_id || !['deposit', 'balance', 'full', 'top_up'].includes(body.request_type) || toMinor(body.amount) <= 0 || !['manual_bank', 'sslcommerz'].includes(body.provider)) return res.status(400).json({ error: 'buyer party, request type, provider, and positive amount are required' });
  if (!body.idempotency_key) return res.status(400).json({ error: 'idempotency_key is required' });
  const request = await sequelize.transaction(async (transaction) => {
    const locked = await SaleSettlement.findOne({ where: { id: settlement.id, branch_id: settlement.branch_id }, transaction, lock: transaction.LOCK.UPDATE });
    const buyer = await SaleTransactionParty.findOne({ where: { id: body.transaction_party_id, transaction_id: locked.transaction_id, branch_id: locked.branch_id, party_type: 'buyer', status: 'active' }, transaction });
    if (!buyer) fail(400, 'Funding request must belong to an active buyer');
    const existing = await SaleFundingRequest.findOne({ where: { branch_id: locked.branch_id, idempotency_key: body.idempotency_key }, transaction, lock: transaction.LOCK.UPDATE });
    if (existing) {
      const sameRequest = Number(existing.settlement_id) === Number(locked.id)
        && Number(existing.transaction_party_id) === Number(body.transaction_party_id)
        && existing.request_type === body.request_type
        && existing.provider === body.provider
        && toMinor(existing.amount) === toMinor(body.amount);
      if (!sameRequest) fail(409, 'Idempotency key is already used by a different funding request');
      return existing;
    }
    const snapshot = await settlementSnapshot(locked.id, transaction);
    const live = excludeReversalPairs(snapshot.payments);
    const receivedMinor = live.filter((payment) => payment.direction === 'incoming' && ['pending', 'cleared'].includes(payment.status)).reduce((sum, payment) => sum + toMinor(payment.gross_amount || payment.amount), 0);
    const requests = await SaleFundingRequest.findAll({ where: { settlement_id: locked.id, status: { [Op.in]: ['draft', 'pending'] } }, transaction });
    const reservedMinor = requests.reduce((sum, item) => sum + toMinor(item.amount), 0);
    if (toMinor(body.amount) > toMinor(snapshot.calculations.outgoing_obligations) - receivedMinor - reservedMinor) fail(409, 'Funding request exceeds the remaining settlement amount');
    if (body.provider === 'sslcommerz' && toMinor(body.amount) > 50000000) fail(400, 'SSLCommerz is limited to BDT 500,000 per funding request; split it into installments');
    const [row, created] = await SaleFundingRequest.findOrCreate({
      where: { branch_id: locked.branch_id, idempotency_key: body.idempotency_key },
      defaults: { ...body, amount: decimalFromMinor(toMinor(body.amount)), branch_id: locked.branch_id, settlement_id: locked.id, status: 'draft', created_by: req.user.id },
      transaction,
    });
    if (!created) {
      const sameRequest = Number(row.settlement_id) === Number(locked.id)
        && Number(row.transaction_party_id) === Number(body.transaction_party_id)
        && row.request_type === body.request_type
        && row.provider === body.provider
        && toMinor(row.amount) === toMinor(body.amount);
      if (!sameRequest) fail(409, 'Idempotency key is already used by a different funding request');
    }
    return row;
  });
  res.status(201).json({ data: request });
});

exports.initiateFundingRequest = asyncHandler(async (req, res) => {
  const request = await SaleFundingRequest.findOne({ where: { id: req.params.id, ...branchScope(req) } });
  if (!request) return res.status(404).json({ error: 'Funding request not found' });
  if (request.provider !== 'sslcommerz') return res.status(409).json({ error: 'Only SSLCommerz funding requests are initiated online' });
  if (request.status === 'paid') return res.status(409).json({ error: 'Funding request is already paid' });
  const settlement = await SaleSettlement.findOne({ where: { id: request.settlement_id, branch_id: request.branch_id } });
  if (!settlement || settlement.status === 'locked') return res.status(409).json({ error: 'Settlement cannot accept funding' });
  const [saleTransaction, buyer] = await Promise.all([
    SaleTransaction.findOne({ where: { id: settlement.transaction_id, branch_id: settlement.branch_id } }),
    SaleTransactionParty.findOne({ where: { id: request.transaction_party_id, transaction_id: settlement.transaction_id, branch_id: settlement.branch_id, party_type: 'buyer', status: 'active' } }),
  ]);
  const property = saleTransaction && await Property.findOne({ where: { id: saleTransaction.property_id, branch_id: settlement.branch_id } });
  if (!saleTransaction || !buyer || !property) return res.status(409).json({ error: 'Funding request transaction context is incomplete' });
  if (!request.provider_reference) await request.update({ provider_reference: `SSPCSF${request.id}${Date.now().toString().slice(-8)}`.slice(0, 30), status: 'pending' });
  try {
    const session = await sslCommerzSales.initiateCollection({ fundingRequest: request, buyer, property });
    await request.update({ provider_reference: session.transactionId, status: 'pending' });
    res.json({ data: request, gateway_url: session.gatewayUrl, session_key: session.sessionKey });
  } catch (error) {
    await request.update({ status: 'failed' });
    throw error;
  }
});

/* POST /sales/payments/:id/post — post (or re-attempt) the ledger journal for a
   cleared payment. This is how the posting_required blocker is cleared for a
   payment recorded before the accounts were configured. */
exports.postPayment = asyncHandler(async (req, res) => {
  const body = pick(req.body, ['bank_account_id', 'liability_account_id']);
  const result = await sequelize.transaction(async (transaction) => {
    const payment = await SalePayment.findOne({ where: { id: req.params.id, ...branchScope(req) }, transaction, lock: transaction.LOCK.UPDATE });
    if (!payment) fail(404, 'Payment not found');
    if (payment.journal_entry_id) fail(409, 'This payment is already posted to the ledger');
    if (!['cleared', 'reversed'].includes(payment.status)) fail(409, 'Only cleared payments can be posted to the ledger');
    const settlement = await SaleSettlement.findOne({ where: { id: payment.settlement_id, branch_id: payment.branch_id }, transaction });
    if (!settlement) fail(404, 'Settlement not found');
    if (settlement.status === 'locked') fail(409, 'Locked settlements are immutable');
    if ((body.bank_account_id && !body.liability_account_id) || (!body.bank_account_id && body.liability_account_id)) fail(400, 'Both posting account IDs must be supplied together');
    if (body.bank_account_id) {
      await validateAccounts(payment.branch_id, [body.bank_account_id, body.liability_account_id], transaction);
      await payment.update({ bank_account_id: body.bank_account_id, liability_account_id: body.liability_account_id }, { transaction });
    }
    let line = null;
    if (payment.direction === 'outgoing') {
      const disbursement = await SaleDisbursement.findOne({ where: { payment_id: payment.id, settlement_id: settlement.id, status: 'paid' }, transaction });
      if (!disbursement) fail(409, 'Outgoing payments can only be posted after allocation to a paid disbursement');
      line = await SaleSettlementLine.findOne({ where: { id: disbursement.settlement_line_id, settlement_id: settlement.id }, transaction });
    }
    const entry = await postPaymentJournal(payment, req.user.id, transaction, { settlement, line });
    const saleTransaction = await SaleTransaction.findOne({ where: { id: settlement.transaction_id, branch_id: settlement.branch_id }, transaction });
    await recordEvent({ branchId: payment.branch_id, propertyId: saleTransaction?.property_id, entityType: 'sale_payment', entityId: payment.id, eventType: 'PAYMENT_POSTED', actorId: req.user.id, newValue: { journal_entry_id: entry.id }, ipAddress: ip(req), transaction });
    return { payment, journal_entry_id: entry.id };
  });
  res.json({ data: result.payment, journal_entry_id: result.journal_entry_id });
});

exports.createPayment = asyncHandler(async (req, res) => {
  const settlement = await settlementForRequest(req, req.params.id);
  const data = pick(req.body, PAYMENT_FIELDS);
  const amountMinor = toMinor(data.amount);
  if (!['incoming', 'outgoing'].includes(data.direction) || !data.reference || amountMinor <= 0) return res.status(400).json({ error: 'direction, reference, and positive amount are required' });
  data.amount = decimalFromMinor(amountMinor);
  if (!['pending', 'cleared'].includes(data.status || 'pending')) return res.status(400).json({ error: 'New payments must be pending or cleared; reject an existing pending payment through the reject action' });
  const allowedKinds = data.direction === 'incoming' ? ['buyer_receipt', 'adjustment'] : ['buyer_refund', 'vendor_payout', 'third_party', 'agency_fee', 'adjustment'];
  data.payment_kind = data.payment_kind || (data.direction === 'incoming' ? 'buyer_receipt' : 'adjustment');
  if (!allowedKinds.includes(data.payment_kind)) return res.status(400).json({ error: 'Payment kind does not match its direction' });
  // A third-party payment must name who actually received the money.
  if (data.payment_kind === 'third_party' && (!String(data.counterparty_name || '').trim() || !String(data.counterparty_phone || '').trim())) return res.status(400).json({ error: 'Third-party payments require the payee name and phone number' });
  // Agency transfers go to Seventh Sky, never to a transaction party.
  if (data.payment_kind === 'agency_fee') data.transaction_party_id = null;
  if (data.direction === 'incoming' && data.payment_kind === 'buyer_receipt' && !data.transaction_party_id) return res.status(400).json({ error: 'Buyer receipts must reference the buyer transaction party' });
  if (data.direction === 'outgoing' && settlement.status !== 'approved') return res.status(409).json({ error: 'Outgoing payments require an approved settlement' });
  if (settlement.status === 'locked') return res.status(409).json({ error: 'Locked settlements are immutable' });
  if ((data.bank_account_id && !data.liability_account_id) || (!data.bank_account_id && data.liability_account_id)) return res.status(400).json({ error: 'Both posting account IDs must be supplied together' });
  await validateAccounts(settlement.branch_id, [data.bank_account_id, data.liability_account_id]);
  const payment = await sequelize.transaction(async (transaction) => {
    const locked = await SaleSettlement.findOne({ where: { id: settlement.id, branch_id: settlement.branch_id }, transaction, lock: transaction.LOCK.UPDATE });
    if (!locked || locked.status === 'locked') fail(409, 'Locked settlements are immutable');
    if (data.direction === 'outgoing' && locked.status !== 'approved') fail(409, 'Outgoing payments require an approved settlement');
    if (data.transaction_party_id) {
      const party = await SaleTransactionParty.findOne({ where: { id: data.transaction_party_id, transaction_id: locked.transaction_id, branch_id: locked.branch_id }, transaction });
      if (!party) fail(400, 'Payment party must belong to the settlement transaction');
      if (data.payment_kind.startsWith('buyer_') && party.party_type !== 'buyer') fail(400, 'Buyer payments must reference a buyer party');
      if (data.payment_kind === 'vendor_payout' && party.party_type !== 'vendor') fail(400, 'Vendor payouts must reference a vendor party');
    }
    let fundingRequest = null;
    if (data.funding_request_id) {
      fundingRequest = await SaleFundingRequest.findOne({ where: { id: data.funding_request_id, settlement_id: locked.id, branch_id: locked.branch_id }, transaction, lock: transaction.LOCK.UPDATE });
      if (!fundingRequest) fail(400, 'Funding request must belong to this settlement');
      if (data.direction !== 'incoming' || Number(fundingRequest.transaction_party_id) !== Number(data.transaction_party_id) || toMinor(fundingRequest.amount) !== toMinor(data.amount)) fail(400, 'Payment must exactly match the funding request buyer and amount');
      if (fundingRequest.status === 'paid') fail(409, 'Funding request is already paid');
    }
    if (data.idempotency_key) {
      const existing = await SalePayment.findOne({ where: { branch_id: locked.branch_id, idempotency_key: data.idempotency_key }, transaction, lock: transaction.LOCK.UPDATE });
      if (existing) {
        const sameRequest = Number(existing.settlement_id) === Number(locked.id)
          && existing.direction === data.direction
          && existing.payment_kind === data.payment_kind
          && Number(existing.transaction_party_id || 0) === Number(data.transaction_party_id || 0)
          && toMinor(existing.amount) === amountMinor
          && Number(existing.funding_request_id || 0) === Number(data.funding_request_id || 0);
        if (!sameRequest) fail(409, 'Idempotency key is already used by a different payment request');
        return existing;
      }
    }
    if (data.direction === 'outgoing') {
      const snapshot = await settlementSnapshot(locked.id, transaction);
      // Reversal pairs must drop out of both sides together, or a reversed
      // receipt still looks spendable (or a reversed payout stays reserved).
      const unreversed = excludeReversalPairs(snapshot.payments);
      const reservedOutgoing = unreversed.filter((item) => item.direction === 'outgoing' && !['rejected', 'reversed'].includes(item.status)).reduce((sum, item) => sum + toMinor(item.amount), 0);
      const clearedIncoming = unreversed.filter((item) => item.direction === 'incoming' && item.status === 'cleared').reduce((sum, item) => sum + toMinor(item.amount), 0);
      if (toMinor(data.amount) > clearedIncoming - reservedOutgoing) fail(409, 'Insufficient cleared settlement funds');
    }
    const row = await SalePayment.create({ ...data, payment_at: data.payment_at || new Date(), status: data.status || 'pending', reconciliation_status: 'unreconciled', branch_id: locked.branch_id, settlement_id: locked.id, created_by: req.user.id }, { transaction });
    const saleTransaction = await SaleTransaction.findOne({ where: { id: locked.transaction_id, branch_id: locked.branch_id }, transaction });
    if (!saleTransaction) fail(404, 'Sale transaction not found');
    if (row.status === 'cleared') {
      if (row.direction === 'incoming') {
        await postPaymentJournal(row, req.user.id, transaction, { settlement: locked });
        await salesTrust.recordReceipt(locked, row, req.user.id, transaction);
      }
    }
    if (fundingRequest) await fundingRequest.update({ status: row.status === 'cleared' ? 'paid' : 'pending', paid_payment_id: row.status === 'cleared' ? row.id : null }, { transaction });
    await recordEvent({ branchId: locked.branch_id, propertyId: saleTransaction.property_id, entityType: 'sale_payment', entityId: row.id, eventType: 'PAYMENT_RECORDED', actorId: req.user.id, newValue: { direction: row.direction, amount: row.amount, status: row.status, journal_entry_id: row.journal_entry_id }, ipAddress: ip(req), transaction });
    return row;
  });
  res.status(201).json({ data: payment, posting_required: payment.status === 'cleared' && payment.direction === 'incoming' && !payment.journal_entry_id });
});

async function resolvePendingPayment(req, res, action) {
  const body = pick(req.body, ['payment_at', 'value_date', 'reason']);
  const result = await sequelize.transaction(async (transaction) => {
    const payment = await SalePayment.findOne({ where: { id: req.params.id, ...branchScope(req) }, transaction, lock: transaction.LOCK.UPDATE });
    if (!payment) fail(404, 'Payment not found');
    if (payment.status !== 'pending') fail(409, 'Only pending payments can be cleared or rejected');
    const settlement = await SaleSettlement.findOne({ where: { id: payment.settlement_id, branch_id: payment.branch_id }, transaction, lock: transaction.LOCK.UPDATE });
    if (!settlement) fail(404, 'Settlement not found');
    if (settlement.status === 'locked') fail(409, 'Locked settlements are immutable');
    if (action === 'clear' && payment.direction === 'outgoing' && settlement.status !== 'approved') fail(409, 'Outgoing payments require an approved settlement before clearance');
    if (action === 'clear' && payment.direction === 'outgoing') {
      const payments = excludeReversalPairs(await SalePayment.findAll({ where: { settlement_id: settlement.id, branch_id: settlement.branch_id }, transaction, raw: true }));
      const clearedIncoming = payments.filter((item) => item.direction === 'incoming' && item.status === 'cleared').reduce((sum, item) => sum + toMinor(item.amount), 0);
      const otherReservedOutgoing = payments.filter((item) => Number(item.id) !== Number(payment.id) && item.direction === 'outgoing' && ['pending', 'cleared'].includes(item.status)).reduce((sum, item) => sum + toMinor(item.amount), 0);
      if (toMinor(payment.amount) > clearedIncoming - otherReservedOutgoing) fail(409, 'Insufficient cleared settlement funds to clear this outgoing payment');
    }
    if (action === 'reject' && !String(body.reason || '').trim()) fail(400, 'reason is required when rejecting a payment');
    const oldValue = { status: payment.status, reconciliation_status: payment.reconciliation_status };
    await payment.update({
      status: action === 'clear' ? 'cleared' : 'rejected',
      payment_at: body.payment_at || payment.payment_at,
      value_date: body.value_date || payment.value_date,
      reconciliation_status: 'unreconciled', reconciled_by: null, reconciled_at: null,
      reconciliation_note: action === 'reject' ? String(body.reason).trim() : payment.reconciliation_note,
    }, { transaction });
    if (action === 'clear' && payment.direction === 'incoming' && !payment.journal_entry_id) {
      await postPaymentJournal(payment, req.user.id, transaction, { settlement });
      await salesTrust.recordReceipt(settlement, payment, req.user.id, transaction);
    }
    if (payment.funding_request_id) await SaleFundingRequest.update({ status: action === 'clear' ? 'paid' : 'failed', paid_payment_id: action === 'clear' ? payment.id : null }, { where: { id: payment.funding_request_id, settlement_id: settlement.id }, transaction });
    const saleTransaction = await SaleTransaction.findOne({ where: { id: settlement.transaction_id, branch_id: settlement.branch_id }, transaction });
    await recordEvent({ branchId: payment.branch_id, propertyId: saleTransaction?.property_id, entityType: 'sale_payment', entityId: payment.id, eventType: action === 'clear' ? 'PAYMENT_CLEARED' : 'PAYMENT_REJECTED', actorId: req.user.id, oldValue, newValue: { status: payment.status, journal_entry_id: payment.journal_entry_id }, reason: body.reason, ipAddress: ip(req), transaction });
    return payment;
  });
  res.json({ data: result, posting_required: result.status === 'cleared' && result.direction === 'incoming' && !result.journal_entry_id });
}

exports.clearPayment = asyncHandler((req, res) => resolvePendingPayment(req, res, 'clear'));
exports.rejectPayment = asyncHandler((req, res) => resolvePendingPayment(req, res, 'reject'));

exports.reversePayment = asyncHandler(async (req, res) => {
  const body = pick(req.body, ['reason', 'value_date']);
  const reversed = await sequelize.transaction(async (transaction) => {
    const original = await SalePayment.findOne({ where: { id: req.params.id, ...branchScope(req) }, transaction, lock: transaction.LOCK.UPDATE });
    if (!original) fail(404, 'Payment not found');
    if (original.status !== 'cleared' || original.reversal_of_payment_id || await SalePayment.count({ where: { reversal_of_payment_id: original.id }, transaction })) fail(409, 'Only an unreversed cleared payment can be reversed');
    const reason = body.reason;
    if (!reason) fail(400, 'reason is required');
    const settlement = await SaleSettlement.findOne({ where: { id: original.settlement_id, branch_id: original.branch_id }, transaction, lock: transaction.LOCK.UPDATE });
    if (!settlement || settlement.branch_id !== original.branch_id) fail(404, 'Settlement not found');
    if (settlement.status === 'locked') fail(409, 'Locked settlements are immutable');
    const reversal = await SalePayment.create({ branch_id: original.branch_id, settlement_id: original.settlement_id, direction: original.direction === 'incoming' ? 'outgoing' : 'incoming', reference: `${original.reference}-REV-${original.id}`, payment_at: new Date(), value_date: body.value_date || new Date(), amount: original.amount, method: original.method, status: 'cleared', reconciliation_status: 'unreconciled', bank_account_id: original.bank_account_id, liability_account_id: original.liability_account_id, transaction_party_id: original.transaction_party_id, payment_kind: 'adjustment', reversal_of_payment_id: original.id, reversal_reason: reason, created_by: req.user.id }, { transaction });
    const saleTransaction = await SaleTransaction.findOne({ where: { id: settlement.transaction_id, branch_id: original.branch_id }, transaction });
    if (!saleTransaction) fail(404, 'Sale transaction not found');
    // The original stops reading as live money: its status becomes 'reversed'
    // so every consumer (statement, funds checks, payout eligibility) sees it.
    await original.update({ status: 'reversed', reversal_reason: reason }, { transaction });
    // A reversed outgoing payment can no longer evidence a paid payout — put
    // the payout back to pending so it must be paid (and proven) again.
    if (original.direction === 'outgoing') {
      const linkedDisbursements = await SaleDisbursement.findAll({ where: { payment_id: original.id, settlement_id: original.settlement_id, status: 'paid' }, transaction, lock: transaction.LOCK.UPDATE });
      for (const disbursement of linkedDisbursements) {
        await salesTrust.reversePayout(settlement, disbursement, reversal, req.user.id, transaction);
        await disbursement.update({ status: 'failed', payment_id: null, paid_at: null, failure_code: 'PAYMENT_REVERSED', failure_reason: reason }, { transaction });
        await recordEvent({ branchId: original.branch_id, propertyId: saleTransaction.property_id, entityType: 'sale_disbursement', entityId: disbursement.id, eventType: 'DISBURSEMENT_UNPAID', actorId: req.user.id, oldValue: { status: 'paid', payment_id: original.id }, newValue: { status: 'failed', payment_id: null }, reason: `Funding payment #${original.id} was reversed — ${reason}`, ipAddress: ip(req), transaction });
      }
    }
    if (original.funding_request_id) {
      await SaleFundingRequest.update({ status: 'pending', paid_payment_id: null }, { where: { id: original.funding_request_id, settlement_id: settlement.id }, transaction });
    }
    await postPaymentJournal(reversal, req.user.id, transaction, { settlement });
    if (original.direction === 'incoming') await salesTrust.reverseReceipt(settlement, original, reversal, req.user.id, transaction);
    await recordEvent({ branchId: original.branch_id, propertyId: saleTransaction.property_id, entityType: 'sale_payment', entityId: original.id, eventType: 'PAYMENT_REVERSED', actorId: req.user.id, oldValue: { reversal_payment_id: null, status: 'cleared' }, newValue: { reversal_payment_id: reversal.id, status: 'reversed' }, reason, ipAddress: ip(req), transaction });
    return reversal;
  });
  res.status(201).json({ data: reversed, posting_required: !reversed.journal_entry_id });
});

/* POST /sales/payments/:id/reconcile — match a cleared payment to the bank
   statement. The uploaded statement is the evidence: 'reconciled' requires it,
   and the reconciler + timestamp go on the audit statement. */
exports.reconcilePayment = asyncHandler(async (req, res) => {
  const body = pick(req.body, ['reconciliation_status', 'statement_url', 'bank_statement_line_id', 'note']);
  const status = body.reconciliation_status || 'reconciled';
  if (!['unreconciled', 'matched', 'reconciled'].includes(status)) return res.status(400).json({ error: 'Invalid reconciliation status' });
  const payment = await sequelize.transaction(async (transaction) => {
    const row = await SalePayment.findOne({ where: { id: req.params.id, ...branchScope(req) }, transaction, lock: transaction.LOCK.UPDATE });
    if (!row) fail(404, 'Payment not found');
    const providerReady = row.status === 'pending' && row.provider === 'sslcommerz' && ['validated', 'refunded'].includes(String(row.provider_status || '').toLowerCase());
    if (!['cleared', 'reversed'].includes(row.status) && !providerReady) fail(409, 'Only cleared payments or provider-confirmed SSLCommerz movements can be reconciled');
    const statementUrl = body.statement_url || row.statement_url;
    if (statementUrl && !/^\/uploads\/documents\/[a-z0-9._-]+$/i.test(statementUrl)) fail(400, 'Bank statement evidence must be an uploaded private document');
    if (status === 'reconciled' && !statementUrl) fail(400, 'Upload the bank statement showing this transaction before marking it reconciled');
    const settlement = await SaleSettlement.findOne({ where: { id: row.settlement_id, branch_id: row.branch_id }, transaction, lock: transaction.LOCK.UPDATE });
    if (!settlement) fail(404, 'Settlement not found');
    if (settlement.status === 'locked') fail(409, 'Locked settlements are immutable');
    const saleTransaction = await SaleTransaction.findOne({ where: { id: settlement.transaction_id, branch_id: settlement.branch_id }, transaction });
    const profile = saleTransaction && await SaleProfile.findOne({ where: { property_id: saleTransaction.property_id, branch_id: settlement.branch_id }, transaction });
    let bankLine = null;
    if (status === 'reconciled') {
      if (!body.bank_statement_line_id) fail(400, 'A matching trust-bank statement line is required');
      if (!profile?.trust_bank_account_id) fail(409, 'Configure the physical trust bank account on the sale profile first');
      bankLine = await BankStatementLine.findOne({ where: { id: body.bank_statement_line_id, branch_id: row.branch_id }, transaction, lock: transaction.LOCK.UPDATE });
      if (!bankLine) fail(404, 'Bank statement line not found');
      if (Number(bankLine.bank_account_id) !== Number(profile.trust_bank_account_id)) fail(400, 'Payment must be matched against the configured trust bank account');
      if (bankLine.status === 'matched' && !(bankLine.matched_entity_type === 'sale_payment' && Number(bankLine.matched_entity_id) === Number(row.id))) fail(409, 'Bank statement line is already matched');
      const expectedMinor = row.direction === 'incoming' ? toMinor(row.amount) : -toMinor(row.amount);
      if (toMinor(bankLine.amount) !== expectedMinor) fail(400, 'Bank statement amount and direction must exactly match the payment');
    }
    const oldValue = { reconciliation_status: row.reconciliation_status, statement_url: row.statement_url, reconciliation_note: row.reconciliation_note };
    if (status === 'unreconciled' && row.bank_statement_line_id) {
      const priorLine = await BankStatementLine.findOne({ where: { id: row.bank_statement_line_id, branch_id: row.branch_id }, transaction, lock: transaction.LOCK.UPDATE });
      if (priorLine?.matched_entity_type === 'sale_payment' && Number(priorLine.matched_entity_id) === Number(row.id)) {
        await priorLine.update({ status: 'unmatched', matched_entity_type: null, matched_entity_id: null, matched_by: null, matched_at: null }, { transaction });
      }
    }
    if (bankLine) await bankLine.update({ status: 'matched', matched_entity_type: 'sale_payment', matched_entity_id: row.id, matched_by: req.user.id, matched_at: new Date() }, { transaction });
    await row.update({
      status: providerReady && status === 'reconciled' ? 'cleared' : row.status,
      reconciliation_status: status,
      bank_statement_line_id: bankLine?.id || (status === 'unreconciled' ? null : row.bank_statement_line_id),
      statement_url: statementUrl || null,
      reconciliation_note: body.note ?? row.reconciliation_note,
      reconciled_by: status === 'unreconciled' ? null : req.user.id,
      reconciled_at: status === 'unreconciled' ? null : new Date(),
    }, { transaction });
    if (providerReady && status === 'reconciled' && row.direction === 'incoming') {
      await postPaymentJournal(row, req.user.id, transaction, { settlement });
      await salesTrust.recordReceipt(settlement, row, req.user.id, transaction);
    }
    await recordEvent({ branchId: row.branch_id, propertyId: saleTransaction?.property_id, entityType: 'sale_payment', entityId: row.id, eventType: status === 'unreconciled' ? 'PAYMENT_UNRECONCILED' : 'PAYMENT_RECONCILED', actorId: req.user.id, oldValue, newValue: { reconciliation_status: status, bank_statement_line_id: bankLine?.id || null, statement_url: statementUrl || null, note: body.note || null }, ipAddress: ip(req), transaction });
    return row;
  });
  res.json({ data: payment });
});

/* GET /sales/settlements/:id/statement — the trust account statement: every
   receipt, refund, payout and reversal in order, with a running balance and the
   reconciliation evidence next to each entry. */
exports.getStatement = asyncHandler(async (req, res) => {
  const settlement = await settlementForRequest(req, req.params.id);
  const [lines, payments, disbursements, approvals, parties] = await Promise.all([
    SaleSettlementLine.findAll({ where: { settlement_id: settlement.id, branch_id: settlement.branch_id }, raw: true }),
    SalePayment.findAll({ where: { settlement_id: settlement.id, branch_id: settlement.branch_id }, raw: true }),
    SaleDisbursement.findAll({ where: { settlement_id: settlement.id, branch_id: settlement.branch_id }, raw: true }),
    SaleSettlementApproval.findAll({ where: { settlement_id: settlement.id, branch_id: settlement.branch_id }, order: [['created_at', 'ASC']], raw: true }),
    SaleTransactionParty.findAll({ where: { transaction_id: settlement.transaction_id, branch_id: settlement.branch_id }, raw: true }),
  ]);
  const statement = buildStatement({ lines, payments, disbursements, parties });
  const trust = await salesTrust.trustSnapshot(settlement.id);
  if (!['super_admin', 'branch_admin', 'accounts'].includes(req.user?.role)) {
    statement.entries = statement.entries.map((entry) => ({ ...entry, proof_url: null, statement_url: null }));
  }
  res.json({
    data: {
      settlement_id: settlement.id,
      settlement_code: settlement.settlement_code,
      settlement_status: settlement.status,
      settlement_type: settlement.settlement_type,
      ...statement,
      trust,
      approvals,
    },
  });
});

/* GET /sales/settlements/:id/agency-fees — the commission + marketing fee owed to
   the agency under the vendor's agreement. Prefills "Create payout → Agency". */
exports.agencyFeeQuote = asyncHandler(async (req, res) => {
  const settlement = await settlementForRequest(req, req.params.id);
  const saleTransaction = await SaleTransaction.findOne({ where: { id: settlement.transaction_id, branch_id: settlement.branch_id } });
  if (!saleTransaction) return res.status(404).json({ error: 'Sale transaction not found' });
  const lines = await SaleSettlementLine.findAll({ where: { settlement_id: settlement.id, branch_id: settlement.branch_id } });
  const priceLine = lines.find((l) => l.line_type === 'purchase_price');
  const deal = await PropertyDeal.findOne({ where: { id: saleTransaction.property_deal_id, branch_id: settlement.branch_id } });
  const saleValue = money(priceLine?.amount) || money(deal?.sale_price);
  const quote = await agencyFees.quoteForSale({ property_id: saleTransaction.property_id, branch_id: settlement.branch_id, sale_value: saleValue });
  // What the settlement actually holds today (may have been edited away from the agreement).
  const onSettlement = agencyFees.invoiceFigures(lines);
  const agencyDisbursements = await SaleDisbursement.findAll({ where: { settlement_id: settlement.id, branch_id: settlement.branch_id, payee_type: 'agency' } });
  // Only settled money counts as paid; a pending payout is reserved, not paid.
  const alreadyPaid = roundMoney(agencyDisbursements.filter((d) => d.status === 'paid').reduce((s, d) => s + money(d.amount), 0));
  const reserved = roundMoney(agencyDisbursements.filter((d) => d.status === 'pending').reduce((s, d) => s + money(d.amount), 0));
  res.json({
    data: {
      ...quote,
      on_settlement: onSettlement,
      already_paid: alreadyPaid,
      reserved_pending: reserved,
      outstanding: roundMoney(onSettlement.total_amount - alreadyPaid),
    },
  });
});

/* PATCH /sales/settlement-lines/:id/fee — edit a commission / marketing fee.
   A written term is mandatory: it explains the change and is printed on the
   vendor's invoice next to the original agreed figure. */
exports.editFeeLine = asyncHandler(async (req, res) => {
  const body = pick(req.body, ['amount', 'fee_basis', 'fee_rate', 'edit_reason']);
  const reason = String(body.edit_reason || '').trim();
  if (!reason) return res.status(400).json({ error: 'A term/reason is required for any change to the agreed commission — it is shown on the vendor invoice' });
  const result = await sequelize.transaction(async (transaction) => {
    const line = await SaleSettlementLine.findOne({ where: { id: req.params.id, ...branchScope(req) }, transaction, lock: transaction.LOCK.UPDATE });
    if (!line) fail(404, 'Settlement line not found');
    if (!agencyFees.AGENCY_LINE_TYPES.includes(line.line_type)) fail(400, 'Only commission and marketing fee lines can be edited here');
    const settlement = await SaleSettlement.findOne({ where: { id: line.settlement_id, branch_id: line.branch_id }, transaction, lock: transaction.LOCK.UPDATE });
    if (!settlement) fail(404, 'Settlement not found');
    if (!['draft', 'returned'].includes(settlement.status)) fail(409, `Fees can only be changed while the settlement is draft or returned (it is ${settlement.status})`);
    const basisAmount = money(line.fee_basis_amount);
    let amount = money(body.amount);
    const basis = body.fee_basis || line.fee_basis;
    const rate = body.fee_rate != null ? Number(body.fee_rate) : line.fee_rate;
    if (basis === 'percent' && body.fee_rate != null) amount = roundMoney(basisAmount * Number(body.fee_rate) / 100);
    if (amount < 0) fail(400, 'Amount must be zero or more');
    const wasAgreed = money(line.auto_amount);
    const editedNote = `Varied from the agreed ${money(wasAgreed).toLocaleString('en-US', { minimumFractionDigits: 2 })} to ${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })} — ${reason}`;
    const terms = line.line_type === 'commission'
      ? agencyFees.commissionTerms({ basis, rate: basis === 'percent' ? rate : null, basis_amount: basisAmount, amount }, { edited: editedNote })
      : `${agencyFees.marketingTerms(amount) || 'Marketing fee waived.'} ${editedNote}`;
    await line.update({ amount, fee_basis: basis, fee_rate: basis === 'percent' ? rate : null, edit_reason: reason, edited_by: req.user.id, edited_at: new Date(), terms }, { transaction });
    const rebalance = settlement.settlement_type === 'withdrawal'
      ? { changed: false, target: money(line.amount), previous: money(line.amount) }
      : await rebalanceVendorProceeds(settlement, req.user.id, transaction);
    await markSettlementRevised(settlement, req.user.id, transaction);
    const saleTransaction = await SaleTransaction.findOne({ where: { id: settlement.transaction_id, branch_id: settlement.branch_id }, transaction });
    await recordEvent({ branchId: settlement.branch_id, propertyId: saleTransaction?.property_id, entityType: 'sale_settlement_line', entityId: line.id, eventType: 'FEE_EDITED', actorId: req.user.id, oldValue: { amount: wasAgreed }, newValue: { amount, basis, rate, vendor_proceeds: rebalance.target }, reason, ipAddress: ip(req), transaction });
    return { line, rebalance };
  });
  res.json({ data: result.line, rebalanced: result.rebalance.changed, message: result.rebalance.changed ? `Fee updated and vendor proceeds rebalanced to ${result.rebalance.target.toLocaleString('en-US', { minimumFractionDigits: 2 })}. The term is recorded and will show on the vendor invoice.` : 'Fee updated. The term is recorded and will show on the vendor invoice.' });
});

exports.createDisbursement = asyncHandler(async (req, res) => {
  const settlement = await settlementForRequest(req, req.params.id);
  if (!['draft', 'returned'].includes(settlement.status)) return res.status(409).json({ error: 'Disbursements can only be prepared while draft or returned' });
  const data = pick(req.body, DISBURSEMENT_FIELDS);
  if (!['vendor', 'third_party', 'agency'].includes(data.payee_type) || toMinor(data.amount) <= 0 || !data.settlement_line_id) return res.status(400).json({ error: 'settlement_line_id, payee_type, and positive amount are required' });
  const row = await sequelize.transaction(async (transaction) => {
    const locked = await SaleSettlement.findOne({ where: { id: settlement.id, branch_id: settlement.branch_id }, transaction, lock: transaction.LOCK.UPDATE });
    if (!locked || !['draft', 'returned'].includes(locked.status)) fail(409, 'Disbursements can only be prepared while draft or returned');
    let payeeParty = null;
    if (data.transaction_party_id) payeeParty = await SaleTransactionParty.findOne({ where: { id: data.transaction_party_id, transaction_id: locked.transaction_id, branch_id: locked.branch_id, status: 'active' }, transaction });
    if (data.transaction_party_id && !payeeParty) fail(400, 'Payee party must be active in the settlement transaction');
    if (data.payee_type === 'vendor' && payeeParty?.party_type !== 'vendor') fail(400, 'Vendor disbursements require an active vendor transaction party');
    if (data.payee_type === 'agency' && (data.transaction_party_id || data.contact_id)) fail(400, 'Agency disbursements must not be assigned to a transaction party or contact');
    if (data.payee_type === 'third_party' && !data.contact_id && payeeParty?.party_type !== 'buyer') fail(400, 'Third-party disbursements require a contact, or an active buyer for a refund');
    if (data.contact_id) await validateContacts(locked.branch_id, [data.contact_id], transaction);
    const settlementLine = await SaleSettlementLine.findOne({ where: { id: data.settlement_line_id, settlement_id: locked.id, branch_id: locked.branch_id }, transaction, lock: transaction.LOCK.UPDATE });
    if (!settlementLine) fail(400, 'Settlement line must belong to the settlement');
    if (!disbursementMatchesLine(data, settlementLine, payeeParty)) fail(400, 'Payout payee must match the selected settlement obligation');
    const saleTransaction = await SaleTransaction.findOne({ where: { id: locked.transaction_id, branch_id: locked.branch_id }, transaction });
    const profile = saleTransaction && await SaleProfile.findOne({ where: { property_id: saleTransaction.property_id, branch_id: locked.branch_id }, transaction });
    if (data.payout_method === 'sslcommerz_refund') {
      if (payeeParty?.party_type !== 'buyer') fail(400, 'SSLCommerz refunds are only available to the original buyer payer');
      if (!data.source_payment_id) fail(400, 'Select the original SSLCommerz buyer payment to refund');
      const sourcePayment = await SalePayment.findOne({ where: { id: data.source_payment_id, settlement_id: locked.id, branch_id: locked.branch_id, direction: 'incoming', transaction_party_id: payeeParty.id, provider: 'sslcommerz', status: 'cleared' }, transaction });
      if (!sourcePayment?.provider_payment_id) fail(409, 'The selected payment does not have a refundable SSLCommerz bank transaction');
      const priorRefunds = await SaleDisbursement.findAll({ where: { settlement_id: locked.id, source_payment_id: sourcePayment.id, status: { [Op.ne]: 'cancelled' } }, transaction, raw: true });
      const refundableMinor = toMinor(sourcePayment.gross_amount || sourcePayment.amount) - priorRefunds.reduce((sum, item) => sum + toMinor(item.amount), 0);
      if (toMinor(data.amount) > refundableMinor) fail(409, 'Refund exceeds the remaining amount on the original SSLCommerz payment');
      Object.assign(data, { provider: 'sslcommerz', party_bank_account_id: null, destination_bank_account_id: null, bank_name: 'SSLCommerz', bank_account_name: payeeParty.snapshot_name, bank_account_number: 'sslcommerz-original-payer', routing_number: null });
    } else if (data.payee_type === 'agency') {
      const destinationId = data.destination_bank_account_id || profile?.agency_bank_account_id;
      if (!destinationId) fail(409, 'Configure the agency operating bank account before preparing this payout');
      await validatePhysicalBankAccounts(locked.branch_id, [destinationId], { [destinationId]: 'operating' }, transaction);
      const destination = await BankAccount.findByPk(destinationId, { transaction });
      Object.assign(data, { destination_bank_account_id: destination.id, bank_name: destination.bank_name, bank_account_name: destination.account_name, bank_account_number: destination.account_number, routing_number: destination.routing_number, party_bank_account_id: null });
    } else {
      const contactId = payeeParty?.contact_id || data.contact_id;
      if (!data.party_bank_account_id) fail(409, 'Select a verified recipient bank account');
      const partyBank = await PartyBankAccount.findOne({ where: { id: data.party_bank_account_id, branch_id: locked.branch_id, contact_id: contactId, status: 'verified' }, transaction });
      if (!partyBank) fail(409, 'Select a verified bank account belonging to the payout recipient');
      Object.assign(data, { party_bank_account_id: partyBank.id, bank_name: partyBank.bank_name, bank_account_name: partyBank.account_name, bank_account_number: partyBank.account_number, routing_number: partyBank.routing_number, destination_bank_account_id: null });
    }
    if (data.payout_method === 'provider') fail(409, 'No vendor payout provider is configured; use verified manual bank transfer');
    const allocated = await SaleDisbursement.findAll({ where: { settlement_line_id: settlementLine.id, settlement_id: locked.id, branch_id: locked.branch_id, status: { [Op.ne]: 'cancelled' } }, transaction, lock: transaction.LOCK.UPDATE });
    const remainingMinor = toMinor(settlementLine.amount) - allocated.reduce((sum, item) => sum + toMinor(item.amount), 0);
    if (toMinor(data.amount) > remainingMinor) fail(409, `Payout exceeds the ${fromMinor(remainingMinor).toFixed(2)} remaining on this obligation`);
    const created = await SaleDisbursement.create({ ...data, amount: decimalFromMinor(toMinor(data.amount)), branch_id: locked.branch_id, settlement_id: locked.id, status: 'prepared', payout_method: data.payout_method || 'manual_bank', created_by: req.user.id }, { transaction });
    await markSettlementRevised(locked, req.user.id, transaction);
    await recordEvent({ branchId: locked.branch_id, propertyId: saleTransaction.property_id, entityType: 'sale_disbursement', entityId: created.id, eventType: 'DISBURSEMENT_CREATED', actorId: req.user.id, newValue: plain(created), ipAddress: ip(req), transaction });
    return created;
  });
  res.status(201).json({ data: row });
});

exports.submitDisbursement = asyncHandler(async (req, res) => {
  const body = pick(req.body, ['reference', 'proof_url', 'idempotency_key']);
  if (!body.reference || !body.idempotency_key) return res.status(400).json({ error: 'reference and idempotency_key are required' });
  const result = await sequelize.transaction(async (transaction) => {
    const disbursement = await SaleDisbursement.findOne({ where: { id: req.params.id, ...branchScope(req) }, transaction, lock: transaction.LOCK.UPDATE });
    if (!disbursement) fail(404, 'Disbursement not found');
    const existing = await SalePayoutAttempt.findOne({ where: { branch_id: disbursement.branch_id, idempotency_key: body.idempotency_key }, transaction });
    if (existing) {
      if (Number(existing.disbursement_id) !== Number(disbursement.id)) fail(409, 'Idempotency key is already used by a different payout');
      return { disbursement, attempt: existing, shouldInitiate: false };
    }
    if (!['pending', 'prepared', 'failed'].includes(disbursement.status)) fail(409, 'Only a prepared or failed payout can be submitted');
    const settlement = await SaleSettlement.findOne({ where: { id: disbursement.settlement_id, branch_id: disbursement.branch_id }, transaction, lock: transaction.LOCK.UPDATE });
    if (!settlement || settlement.status !== 'approved') fail(409, 'Payout submission requires an approved settlement');
    if (disbursement.payout_method === 'provider') fail(409, 'No direct vendor payout provider is configured');
    const attemptNo = Number(disbursement.attempt_count || 0) + 1;
    const attempt = await SalePayoutAttempt.create({ branch_id: disbursement.branch_id, disbursement_id: disbursement.id, attempt_no: attemptNo, method: disbursement.payout_method || 'manual_bank', provider_reference: body.reference, idempotency_key: body.idempotency_key, status: disbursement.payout_method === 'sslcommerz_refund' ? 'processing' : 'submitted', submitted_at: new Date(), created_by: req.user.id }, { transaction });
    await disbursement.update({ status: disbursement.payout_method === 'sslcommerz_refund' ? 'processing' : 'submitted', provider_reference: body.reference, reference: body.reference, proof_url: body.proof_url || disbursement.proof_url, attempt_count: attemptNo, last_attempt_at: new Date(), failure_code: null, failure_reason: null }, { transaction });
    return { disbursement, attempt, shouldInitiate: true };
  });
  if (result.shouldInitiate && result.disbursement.payout_method === 'sslcommerz_refund') {
    try {
      const originalPayment = await SalePayment.findOne({ where: { id: result.disbursement.source_payment_id, settlement_id: result.disbursement.settlement_id, branch_id: result.disbursement.branch_id } });
      const providerResult = await sslCommerzSales.initiateRefund({ originalPayment, disbursement: result.disbursement, refundTransactionId: body.reference });
      await sequelize.transaction(async (transaction) => {
        await result.attempt.update({ status: 'processing', provider_reference: providerResult.refund_ref_id, response_payload: providerResult }, { transaction });
        await result.disbursement.update({ status: 'processing', provider: 'sslcommerz', provider_reference: providerResult.refund_ref_id }, { transaction });
      });
    } catch (error) {
      await sequelize.transaction(async (transaction) => {
        await result.attempt.update({ status: 'failed', failure_code: 'SSLCOMMERZ_REFUND_FAILED', failure_reason: error.message, completed_at: new Date() }, { transaction });
        await result.disbursement.update({ status: 'failed', failure_code: 'SSLCOMMERZ_REFUND_FAILED', failure_reason: error.message }, { transaction });
      });
      throw error;
    }
  }
  res.json({ data: result.disbursement, attempt: result.attempt });
});

exports.syncDisbursement = asyncHandler(async (req, res) => {
  const disbursement = await SaleDisbursement.findOne({ where: { id: req.params.id, ...branchScope(req) } });
  if (!disbursement) return res.status(404).json({ error: 'Disbursement not found' });
  if (disbursement.payout_method !== 'sslcommerz_refund' || !disbursement.provider_reference) return res.status(409).json({ error: 'This payout is not an initiated SSLCommerz refund' });
  const providerResult = await sslCommerzSales.queryRefund(disbursement.provider_reference);
  const providerStatus = String(providerResult.status || '').toLowerCase();
  const result = await sequelize.transaction(async (transaction) => {
    const locked = await SaleDisbursement.findOne({ where: { id: disbursement.id, branch_id: disbursement.branch_id }, transaction, lock: transaction.LOCK.UPDATE });
    const attempt = await SalePayoutAttempt.findOne({ where: { disbursement_id: locked.id }, order: [['attempt_no', 'DESC']], transaction, lock: transaction.LOCK.UPDATE });
    if (providerStatus === 'refunded') {
      let payment = await SalePayment.findOne({ where: { branch_id: locked.branch_id, idempotency_key: `sslrefund:${locked.provider_reference}` }, transaction });
      if (!payment) payment = await SalePayment.create({
        branch_id: locked.branch_id, settlement_id: locked.settlement_id, direction: 'outgoing', reference: locked.provider_reference,
        payment_at: providerResult.refunded_on || new Date(), value_date: providerResult.refunded_on || new Date(), amount: locked.amount,
        method: 'sslcommerz', to_account_name: locked.bank_account_name, to_account_number: 'sslcommerz-original-payer',
        status: 'pending', reconciliation_status: 'unreconciled', transaction_party_id: locked.transaction_party_id,
        payment_kind: 'buyer_refund', provider: 'sslcommerz', provider_payment_id: providerResult.bank_tran_id || null,
        provider_status: 'refunded', idempotency_key: `sslrefund:${locked.provider_reference}`, created_by: req.user.id,
      }, { transaction });
      await locked.update({ status: 'processing', payment_id: payment.id }, { transaction });
      if (attempt) await attempt.update({ status: 'processing', response_payload: providerResult }, { transaction });
      return { disbursement: locked, payment, provider_status: providerStatus, next_action: 'match_refund_to_trust_bank_statement' };
    }
    if (providerStatus === 'cancelled') {
      await locked.update({ status: 'failed', failure_code: 'SSLCOMMERZ_REFUND_CANCELLED', failure_reason: providerResult.errorReason || 'Refund cancelled' }, { transaction });
      if (attempt) await attempt.update({ status: 'failed', failure_code: 'SSLCOMMERZ_REFUND_CANCELLED', failure_reason: providerResult.errorReason || 'Refund cancelled', response_payload: providerResult, completed_at: new Date() }, { transaction });
    } else if (attempt) await attempt.update({ response_payload: providerResult }, { transaction });
    return { disbursement: locked, provider_status: providerStatus, next_action: 'wait_for_provider' };
  });
  res.json({ data: result });
});

exports.failDisbursement = asyncHandler(async (req, res) => {
  const body = pick(req.body, ['failure_code', 'failure_reason']);
  if (!String(body.failure_reason || '').trim()) return res.status(400).json({ error: 'failure_reason is required' });
  const result = await sequelize.transaction(async (transaction) => {
    const disbursement = await SaleDisbursement.findOne({ where: { id: req.params.id, ...branchScope(req) }, transaction, lock: transaction.LOCK.UPDATE });
    if (!disbursement) fail(404, 'Disbursement not found');
    if (!['submitted', 'processing'].includes(disbursement.status)) fail(409, 'Only a submitted or processing payout can fail');
    await disbursement.update({ status: 'failed', failure_code: body.failure_code || 'TRANSFER_FAILED', failure_reason: body.failure_reason, last_attempt_at: new Date() }, { transaction });
    const attempt = await SalePayoutAttempt.findOne({ where: { disbursement_id: disbursement.id, status: { [Op.in]: ['submitted', 'processing'] } }, order: [['attempt_no', 'DESC']], transaction, lock: transaction.LOCK.UPDATE });
    if (attempt) await attempt.update({ status: 'failed', failure_code: body.failure_code || 'TRANSFER_FAILED', failure_reason: body.failure_reason, completed_at: new Date() }, { transaction });
    return disbursement;
  });
  res.json({ data: result });
});

exports.payDisbursement = asyncHandler(async (req, res) => {
  const body = pick(req.body, ['payment_id', 'proof_url', 'idempotency_key']);
  const result = await sequelize.transaction(async (transaction) => {
    const disbursement = await SaleDisbursement.findOne({ where: { id: req.params.id, ...branchScope(req) }, transaction, lock: transaction.LOCK.UPDATE });
    if (!disbursement) fail(404, 'Disbursement not found');
    if (disbursement.status === 'paid') {
      if (Number(disbursement.payment_id) === Number(body.payment_id)) return disbursement;
      fail(409, 'Paid disbursement is already allocated to a different payment');
    }
    if (!['pending', 'prepared', 'submitted', 'processing', 'failed'].includes(disbursement.status)) fail(409, 'Only prepared, submitted, processing, or failed disbursements can be paid');
    const settlement = await SaleSettlement.findOne({ where: { id: disbursement.settlement_id, branch_id: disbursement.branch_id }, transaction, lock: transaction.LOCK.UPDATE });
    if (!settlement || settlement.status !== 'approved') fail(409, 'Disbursements can only be paid from an approved settlement');
    const payment = await SalePayment.findOne({ where: { id: body.payment_id, settlement_id: disbursement.settlement_id, branch_id: disbursement.branch_id }, transaction, lock: transaction.LOCK.UPDATE });
    const payeeParty = disbursement.transaction_party_id ? await SaleTransactionParty.findOne({ where: { id: disbursement.transaction_party_id, transaction_id: settlement.transaction_id, branch_id: settlement.branch_id }, transaction }) : null;
    if (disbursement.transaction_party_id && !payeeParty) fail(409, 'Disbursement payee party no longer exists in this transaction');
    const alreadyAllocated = payment ? await SaleDisbursement.count({ where: { payment_id: payment.id, id: { [Op.ne]: disbursement.id } }, transaction }) > 0 : false;
    validateDisbursementPayment(disbursement, payment, payeeParty, alreadyAllocated);
    if (payment.reconciliation_status !== 'reconciled' || !payment.bank_statement_line_id) fail(409, 'The outgoing payment must be matched to the trust-bank statement before the payout can be paid');
    if (!settlement.allocation_version) fail(409, 'Trust funds must be allocated at approval before payouts can be paid');
    const line = await SaleSettlementLine.findOne({ where: { id: disbursement.settlement_line_id, settlement_id: settlement.id, branch_id: settlement.branch_id }, transaction, lock: transaction.LOCK.UPDATE });
    if (!line) fail(409, 'Settlement obligation no longer exists');
    if (disbursement.party_bank_account_id) {
      const partyBank = await PartyBankAccount.findOne({ where: { id: disbursement.party_bank_account_id, branch_id: settlement.branch_id, status: 'verified' }, transaction });
      if (!partyBank) fail(409, 'The recipient bank account is no longer verified');
    }
    const idempotencyKey = body.idempotency_key || `disbursement:${disbursement.id}:payment:${payment.id}`;
    const existingAttempt = await SalePayoutAttempt.findOne({ where: { branch_id: settlement.branch_id, idempotency_key: idempotencyKey }, transaction, lock: transaction.LOCK.UPDATE });
    if (existingAttempt && Number(existingAttempt.disbursement_id) !== Number(disbursement.id)) fail(409, 'Idempotency key is already used by a different payout');
    if (existingAttempt?.status === 'paid') return disbursement;
    const attemptNo = Number(disbursement.attempt_count || 0) + 1;
    const [attempt] = existingAttempt ? [existingAttempt] : await SalePayoutAttempt.findOrCreate({
      where: { branch_id: settlement.branch_id, idempotency_key: idempotencyKey },
      defaults: { branch_id: settlement.branch_id, disbursement_id: disbursement.id, attempt_no: attemptNo, method: disbursement.payout_method || 'manual_bank', provider_reference: payment.reference, status: 'processing', submitted_at: new Date(), created_by: req.user.id },
      transaction,
    });
    await disbursement.update({ status: 'paid', payment_id: payment.id, paid_at: new Date(), proof_url: body.proof_url || disbursement.proof_url, attempt_count: attemptNo, last_attempt_at: new Date(), failure_code: null, failure_reason: null }, { transaction });
    await postPaymentJournal(payment, req.user.id, transaction, { settlement, line });
    const parties = await SaleTransactionParty.findAll({ where: { transaction_id: settlement.transaction_id, branch_id: settlement.branch_id, status: 'active' }, transaction, raw: true });
    await salesTrust.recordPayout(settlement, disbursement, line, parties, req.user.id, transaction);
    await attempt.update({ status: 'paid', completed_at: new Date(), provider_reference: payment.reference }, { transaction });
    const saleTransaction = await SaleTransaction.findOne({ where: { id: settlement.transaction_id, branch_id: settlement.branch_id }, transaction });
    await recordEvent({ branchId: settlement.branch_id, propertyId: saleTransaction.property_id, entityType: 'sale_disbursement', entityId: disbursement.id, eventType: 'DISBURSEMENT_PAID', actorId: req.user.id, newValue: plain(disbursement), ipAddress: ip(req), transaction });
    return disbursement;
  });
  res.json({ data: result });
});

exports.cancelDisbursement = asyncHandler(async (req, res) => {
  const body = pick(req.body, ['reason']);
  if (!String(body.reason || '').trim()) return res.status(400).json({ error: 'reason is required when cancelling a disbursement' });
  const result = await sequelize.transaction(async (transaction) => {
    const disbursement = await SaleDisbursement.findOne({ where: { id: req.params.id, ...branchScope(req) }, transaction, lock: transaction.LOCK.UPDATE });
    if (!disbursement) fail(404, 'Disbursement not found');
    if (!['pending', 'prepared', 'failed'].includes(disbursement.status)) fail(409, 'Only pending, prepared, or failed disbursements can be cancelled');
    const settlement = await SaleSettlement.findOne({ where: { id: disbursement.settlement_id, branch_id: disbursement.branch_id }, transaction, lock: transaction.LOCK.UPDATE });
    if (!settlement) fail(404, 'Settlement not found');
    if (!['draft', 'returned'].includes(settlement.status)) fail(409, 'Return the settlement to draft before cancelling a pending disbursement');
    await disbursement.update({ status: 'cancelled' }, { transaction });
    const saleTransaction = await SaleTransaction.findOne({ where: { id: settlement.transaction_id, branch_id: settlement.branch_id }, transaction });
    await recordEvent({ branchId: settlement.branch_id, propertyId: saleTransaction?.property_id, entityType: 'sale_disbursement', entityId: disbursement.id, eventType: 'DISBURSEMENT_CANCELLED', actorId: req.user.id, oldValue: { status: 'pending' }, newValue: { status: 'cancelled' }, reason: String(body.reason).trim(), ipAddress: ip(req), transaction });
    return disbursement;
  });
  res.json({ data: result });
});

/* POST /sales/settlements/:id/vendor-invoice — issue the vendor's invoice for the
   agency's fees. Figures and terms are snapshotted from the settlement lines, so an
   edited commission is invoiced with the term that explains the change. */
exports.issueVendorInvoice = asyncHandler(async (req, res) => {
  const settlement = await settlementForRequest(req, req.params.id);
  const result = await sequelize.transaction(async (transaction) => {
    const locked = await SaleSettlement.findOne({ where: { id: settlement.id, branch_id: settlement.branch_id }, transaction, lock: transaction.LOCK.UPDATE });
    if (!locked) fail(404, 'Settlement not found');
    if (!['draft', 'returned'].includes(locked.status)) fail(409, 'Vendor invoices can only be issued or refreshed while the settlement is draft or returned');
    const saleTransaction = await SaleTransaction.findOne({ where: { id: locked.transaction_id, branch_id: locked.branch_id }, transaction });
    if (!saleTransaction) fail(404, 'Sale transaction not found');
    const lines = await SaleSettlementLine.findAll({ where: { settlement_id: locked.id, branch_id: locked.branch_id }, transaction });
    const feeLines = lines.filter((line) => agencyFees.AGENCY_LINE_TYPES.includes(line.line_type));
    if (!feeLines.length) fail(400, 'This settlement has no agency commission or marketing fee to invoice');
    const figures = agencyFees.invoiceFigures(lines);
    const vendorParty = await SaleTransactionParty.findOne({ where: { transaction_id: saleTransaction.id, party_type: 'vendor', status: 'active' }, transaction });
    const existing = await SaleVendorInvoice.findOne({ where: { settlement_id: locked.id, branch_id: locked.branch_id, status: { [Op.ne]: 'void' } }, transaction, lock: transaction.LOCK.UPDATE });
    const payload = {
      branch_id: locked.branch_id, settlement_id: locked.id, transaction_id: saleTransaction.id, property_id: saleTransaction.property_id,
      vendor_party_id: vendorParty?.id || null, vendor_contact_id: vendorParty?.contact_id || null, vendor_name: vendorParty?.snapshot_name || null,
      ...figures, lines_snapshot: feeLines.map((line) => ({ settlement_line_id: line.id, line_type: line.line_type, amount: money(line.amount), agreed: money(line.auto_amount), fee_basis: line.fee_basis, fee_rate: line.fee_rate, terms: line.terms, edit_reason: line.edit_reason })),
      status: 'issued', issued_at: new Date(), issued_by: req.user.id,
    };
    const invoice = existing
      ? await existing.update(payload, { transaction })
      : await SaleVendorInvoice.create({ ...payload, invoice_code: await generateCode(SaleVendorInvoice, 'invoice_code', 'SSPC-VI-'), created_by: req.user.id }, { transaction });
    await markSettlementRevised(locked, req.user.id, transaction);
    await recordEvent({ branchId: locked.branch_id, propertyId: saleTransaction.property_id, entityType: 'sale_vendor_invoice', entityId: invoice.id, eventType: existing ? 'VENDOR_INVOICE_REISSUED' : 'VENDOR_INVOICE_ISSUED', actorId: req.user.id, newValue: plain(invoice), ipAddress: ip(req), transaction });
    return { invoice, existing: Boolean(existing) };
  });
  res.status(result.existing ? 200 : 201).json({ data: result.invoice, message: `Vendor invoice ${result.invoice.invoice_code} issued.` });
});

// GET /sales/settlements/:id/vendor-invoice
exports.getVendorInvoice = asyncHandler(async (req, res) => {
  const settlement = await settlementForRequest(req, req.params.id);
  const invoice = await SaleVendorInvoice.findOne({ where: { settlement_id: settlement.id, branch_id: settlement.branch_id, status: { [Op.ne]: 'void' } } });
  res.json({ data: invoice });
});

exports.settlementAction = (action) => asyncHandler(async (req, res) => {
  const body = pick(req.body, ['reason', 'override', 'override_reason']);
  const result = await sequelize.transaction(async (transaction) => {
    const settlement = await SaleSettlement.findOne({ where: { id: req.params.id, ...branchScope(req) }, transaction, lock: transaction.LOCK.UPDATE });
    if (!settlement) fail(404, 'Settlement not found');
    const nextStatus = getTransition(settlement.status, action);
    const saleTransaction = await SaleTransaction.findOne({ where: { id: settlement.transaction_id, branch_id: settlement.branch_id }, transaction });
    if (!saleTransaction) fail(404, 'Sale transaction not found');

    /* Separation of duties. A single-staff branch would otherwise deadlock here —
       a settlement submitted by the only staff member could never be reviewed,
       approved or locked. A super admin may override with a written reason, which
       is recorded on the approval trail; nobody else can. */
    let overrideNote = null;
    const separation = (message) => {
      if (req.user?.role === 'super_admin' && body.override && String(body.override_reason || '').trim()) {
        overrideNote = `Separation of duties overridden by super admin: ${String(body.override_reason).trim()}`;
        return;
      }
      fail(409, `${message}. A super admin can override this with a written reason if no second staff member is available.`);
    };
    if (action === 'review' && settlement.prepared_by === req.user.id) separation('Reviewer must be different from preparer');
    if (action === 'approve' && [settlement.prepared_by, settlement.reviewed_by].includes(req.user.id)) separation('Approver must be different from preparer and reviewer');
    if (action === 'return' && !body.reason) fail(400, 'reason is required when returning a settlement');
    let validation = null;
    if (['submit', 'review', 'approve'].includes(action)) validation = await stageValidation(saleTransaction, settlement, action, transaction);
    if (action === 'approve') await salesTrust.allocateSettlement(settlement, validation.lines, validation.parties, req.user.id, transaction);
    if (action === 'return' && settlement.status === 'approved') await salesTrust.reverseAllocation(settlement, req.user.id, transaction);
    if (action === 'lock') {
      if (settlement.prepared_by === req.user.id || settlement.reviewed_by === req.user.id) separation('Lock actor must be independent from preparer and reviewer');
      validation = settlement.settlement_type === 'withdrawal' ? await withdrawalBlockers(saleTransaction, settlement, transaction) : await complianceBlockers(saleTransaction, settlement, transaction);
      if (validation.blockers.length) fail(409, `Settlement cannot be locked: ${validation.blockers.join(', ')}`);
    }
    const changes = { status: nextStatus };
    if (action === 'submit') Object.assign(changes, { submitted_by: req.user.id, submitted_at: new Date(), prepared_by: settlement.prepared_by || req.user.id, reviewed_by: null, reviewed_at: null, approved_by: null, approved_at: null, locked_by: null, locked_at: null });
    if (action === 'review') Object.assign(changes, { reviewed_by: req.user.id, reviewed_at: new Date() });
    if (action === 'approve') Object.assign(changes, { approved_by: req.user.id, approved_at: new Date() });
    if (action === 'return') Object.assign(changes, { returned_by: req.user.id, returned_at: new Date(), return_reason: body.reason, submitted_by: null, submitted_at: null, reviewed_by: null, reviewed_at: null, approved_by: null, approved_at: null, locked_by: null, locked_at: null });
    if (action === 'lock') Object.assign(changes, { locked_by: req.user.id, locked_at: new Date() });
    const oldStatus = settlement.status;
    await settlement.update(changes, { transaction });
    await SaleSettlementApproval.create({ branch_id: settlement.branch_id, settlement_id: settlement.id, action, actor_id: req.user.id, reason: [body.reason, overrideNote].filter(Boolean).join(' — ') || null, from_status: oldStatus, to_status: nextStatus, ip_address: ip(req) }, { transaction });
    if (action === 'lock') {
      if (settlement.settlement_type === 'withdrawal') {
        await SaleTransactionParty.update({ status: 'withdrawn', withdrawn_at: new Date(), replacement_reason: settlement.withdrawal_reason }, { where: { id: settlement.withdrawal_buyer_party_id, transaction_id: saleTransaction.id }, transaction });
        await saleTransaction.update({ status: 'cancelled' }, { transaction });
        await PropertyDeal.update({ status: 'cancelled' }, { where: { id: saleTransaction.property_deal_id, branch_id: settlement.branch_id }, transaction });
        await Property.update({ status: 'available' }, { where: { id: saleTransaction.property_id, branch_id: settlement.branch_id }, transaction });
        // The accepted offer is unwound with the transaction — it must not stay
        // 'accepted' on a property that is back on the market.
        if (saleTransaction.accepted_offer_id) {
          const acceptedOffer = await SaleOffer.findOne({ where: { id: saleTransaction.accepted_offer_id, branch_id: settlement.branch_id, status: 'accepted' }, transaction });
          if (acceptedOffer) {
            await acceptedOffer.update({ status: 'withdrawn', status_reason: `Buyer withdrew — ${settlement.withdrawal_reason || 'withdrawal settlement locked'}`, updated_by: req.user.id }, { transaction });
            await recordEvent({ branchId: settlement.branch_id, propertyId: saleTransaction.property_id, entityType: 'sale_offer', entityId: acceptedOffer.id, eventType: 'STATUS_CHANGED', actorId: req.user.id, oldValue: { status: 'accepted' }, newValue: { status: 'withdrawn' }, reason: settlement.withdrawal_reason, ipAddress: ip(req), transaction });
          }
        }
      } else {
        await saleTransaction.update({ status: 'completed' }, { transaction });
        await PropertyDeal.update({ status: 'completed' }, { where: { id: saleTransaction.property_deal_id, branch_id: settlement.branch_id }, transaction });
        await Property.update({ status: 'sold' }, { where: { id: saleTransaction.property_id, branch_id: settlement.branch_id }, transaction });
        // Close out every other open offer — the property is sold, so nothing
        // should keep counting as an offer awaiting review.
        const openOffers = await SaleOffer.findAll({ where: { property_id: saleTransaction.property_id, branch_id: settlement.branch_id, status: { [Op.in]: ['draft', 'submitted', 'countered'] } }, transaction });
        for (const openOffer of openOffers) {
          const oldOfferStatus = openOffer.status;
          await openOffer.update({ status: 'rejected', status_reason: 'Property sold — settlement completed', updated_by: req.user.id }, { transaction });
          await recordEvent({ branchId: settlement.branch_id, propertyId: saleTransaction.property_id, entityType: 'sale_offer', entityId: openOffer.id, eventType: 'STATUS_CHANGED', actorId: req.user.id, oldValue: { status: oldOfferStatus }, newValue: { status: 'rejected' }, reason: 'Property sold — settlement completed', ipAddress: ip(req), transaction });
        }
      }
    }
    await recordEvent({ branchId: settlement.branch_id, propertyId: saleTransaction.property_id, entityType: 'sale_settlement', entityId: settlement.id, eventType: `SETTLEMENT_${action.toUpperCase()}`, actorId: req.user.id, oldValue: { status: oldStatus }, newValue: { status: nextStatus }, reason: body.reason, ipAddress: ip(req), transaction });
    return { settlement, validation };
  });
  res.json(result);
});

exports.errorHandler = (err, req, res, next) => { // eslint-disable-line no-unused-vars
  if (err.name === 'SequelizeUniqueConstraintError') return res.status(409).json({ error: 'Duplicate reference or code' });
  res.status(err.status || 500).json({ error: err.message || 'Sales operation failed' });
};
