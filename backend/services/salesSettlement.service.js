const { Op } = require('sequelize');
const sequelize = require('../config/db.config');
const Account = require('../models/Account');
const AuditLog = require('../models/AuditLog');
const JournalEntry = require('../models/JournalEntry');
const JournalLine = require('../models/JournalLine');
const PartyRoleProfile = require('../models/PartyRoleProfile');
const KycDocument = require('../models/KycDocument');
const {
  SaleProfile, SaleTransaction, SaleTransactionParty, SaleSettlement, SaleSettlementLine, SalePayment, SaleDisbursement, SaleEvent,
} = require('../models/SalesModels');
const { calculateSettlement, getTransition, excludeReversalPairs, DEDUCTION_TYPES } = require('../utils/salesSettlementCalculations');
const { toMinor, fromMinor, decimalFromMinor } = require('../utils/money');
const salesTrust = require('./salesTrust.service');

async function recordEvent({ branchId, propertyId, entityType, entityId, eventType, actorId, oldValue, newValue, reason, ipAddress, transaction }) {
  const event = await SaleEvent.create({ branch_id: branchId, property_id: propertyId, entity_type: entityType, entity_id: entityId, event_type: eventType, actor_id: actorId, old_value: oldValue, new_value: newValue, reason, ip_address: ipAddress }, { transaction });
  await AuditLog.create({ user_id: actorId, branch_id: branchId, action: eventType, entity: entityType, entity_id: entityId, old_value: oldValue, new_value: { ...(newValue || {}), reason }, ip_address: ipAddress }, { transaction });
  return event;
}

async function settlementSnapshot(settlementId, transaction) {
  const [lines, payments, disbursements] = await Promise.all([
    SaleSettlementLine.findAll({ where: { settlement_id: settlementId }, transaction, raw: true }),
    SalePayment.findAll({ where: { settlement_id: settlementId }, transaction, raw: true }),
    SaleDisbursement.findAll({ where: { settlement_id: settlementId }, transaction, raw: true }),
  ]);
  return { lines, payments, disbursements, calculations: calculateSettlement(lines, payments, disbursements) };
}

async function complianceBlockers(saleTransaction, settlement, transaction) {
  const blockers = [];
  const [profile, parties, snapshot] = await Promise.all([
    SaleProfile.findOne({ where: { property_id: saleTransaction.property_id, branch_id: saleTransaction.branch_id }, transaction }),
    SaleTransactionParty.findAll({ where: { transaction_id: saleTransaction.id, status: 'active' }, transaction }),
    settlementSnapshot(settlement.id, transaction),
  ]);
  if (!profile || profile.compliance_status !== 'clear') blockers.push('compliance_not_clear');
  if (!profile || !['complete', 'waived'].includes(profile.assessment_status)) blockers.push('assessment_not_clear');
  if (!profile || profile.agreement_status !== 'signed') blockers.push('agency_agreement_not_signed');
  const contactIds = parties.map((party) => party.contact_id).filter(Boolean);
  if (contactIds.length) {
    const profiles = await PartyRoleProfile.findAll({ attributes: ['id', 'contact_id', 'kyc_status'], where: { branch_id: saleTransaction.branch_id, property_id: saleTransaction.property_id, contact_id: { [Op.in]: contactIds } }, transaction, raw: true });
    const requiredDocs = profiles.length ? await KycDocument.findAll({ attributes: ['party_role_profile_id', 'status'], where: { branch_id: saleTransaction.branch_id, party_role_profile_id: { [Op.in]: profiles.map((profile) => profile.id) }, is_required: true }, transaction, raw: true }) : [];
    const docsByProfile = new Map();
    for (const doc of requiredDocs) {
      const current = docsByProfile.get(doc.party_role_profile_id) || [];
      current.push(doc.status);
      docsByProfile.set(doc.party_role_profile_id, current);
    }
    const verifiedContacts = new Set(profiles.filter((profile) => {
      const statuses = docsByProfile.get(profile.id) || [];
      return profile.kyc_status === 'complete' && statuses.length > 0 && statuses.every((status) => status === 'verified');
    }).map((profile) => profile.contact_id));
    if (verifiedContacts.size < new Set(contactIds).size) blockers.push('party_kyc_not_verified');
  }
  if (!parties.some((party) => party.party_type === 'buyer')) blockers.push('active_buyer_required');
  if (!parties.some((party) => party.party_type === 'vendor')) blockers.push('active_vendor_required');
  const activePayments = excludeReversalPairs(snapshot.payments);
  if (activePayments.some((payment) => payment.status === 'pending')) blockers.push('pending_payments');
  if (snapshot.payments.some((payment) => ['cleared', 'reversed'].includes(payment.status) && payment.reconciliation_status !== 'reconciled')) blockers.push('unreconciled_payments');
  if (snapshot.calculations.pending_disbursements) blockers.push('pending_disbursements');
  if (toMinor(snapshot.calculations.unpaid_obligations) !== 0) blockers.push('outgoing_obligations_unpaid');
  if (toMinor(snapshot.calculations.residual) !== 0) blockers.push('settlement_residual_nonzero');
  const schedule = salesTrust.validateSchedule(snapshot.lines, parties);
  if (schedule.errors.length) blockers.push('invalid_settlement_schedule');
  const paidDisbursements = snapshot.disbursements.filter((item) => item.status === 'paid');
  const paidByPaymentId = new Map(paidDisbursements.filter((item) => item.payment_id).map((item) => [Number(item.payment_id), item]));
  const liveOutgoing = activePayments.filter((payment) => payment.direction === 'outgoing' && payment.status === 'cleared');
  if (liveOutgoing.some((payment) => !paidByPaymentId.has(Number(payment.id)))) blockers.push('unallocated_outgoing_payments');
  const linesById = new Map(snapshot.lines.map((line) => [Number(line.id), line]));
  const activePaymentsById = new Map(activePayments.map((payment) => [Number(payment.id), payment]));
  const allocatedByLine = new Map();
  let invalidAllocation = paidByPaymentId.size !== paidDisbursements.filter((item) => item.payment_id).length;
  for (const disbursement of paidDisbursements) {
    const line = linesById.get(Number(disbursement.settlement_line_id));
    const payment = activePaymentsById.get(Number(disbursement.payment_id));
    const payeeParty = parties.find((party) => Number(party.id) === Number(disbursement.transaction_party_id)) || null;
    if (!line || !payment || !disbursementMatchesLine(disbursement, line, payeeParty)) {
      invalidAllocation = true;
      continue;
    }
    try {
      validateDisbursementPayment(disbursement, payment, payeeParty);
    } catch {
      invalidAllocation = true;
    }
    const allocated = (allocatedByLine.get(line.id) || 0) + toMinor(disbursement.amount);
    allocatedByLine.set(line.id, allocated);
    if (allocated > toMinor(line.amount)) invalidAllocation = true;
  }
  for (const line of schedule.payable) {
    if ((allocatedByLine.get(line.id) || 0) !== toMinor(line.amount)) invalidAllocation = true;
  }
  if (invalidAllocation) blockers.push('invalid_disbursement_allocations');
  const postingRequired = activePayments.some((payment) => payment.status === 'cleared' && !payment.journal_entry_id);
  if (postingRequired) blockers.push('posting_required');
  const trust = await salesTrust.trustSnapshot(settlement.id, transaction);
  if (!trust.accounts.length) blockers.push('trust_ledger_missing');
  if (trust.total_balance_minor !== 0 || trust.accounts.some((account) => account.balance_minor !== 0)) blockers.push('trust_accounts_nonzero');
  return { blockers: [...new Set(blockers)], ...snapshot, trust };
}

function expectedPaymentKind(disbursement, payeeParty) {
  if (payeeParty?.party_type === 'buyer') return 'buyer_refund';
  if (disbursement.payee_type === 'vendor') return 'vendor_payout';
  if (disbursement.payee_type === 'agency') return 'agency_fee';
  return 'third_party';
}

function normalizedAccount(value) {
  return String(value || '').replace(/[^a-z0-9]/gi, '').toLowerCase();
}

function disbursementMatchesLine(disbursement, line, payeeParty) {
  if (!line) return false;
  if (disbursement.payee_type === 'vendor') {
    return line.line_type === 'vendor_proceeds'
      && Number(line.payee_transaction_party_id || 0) === Number(disbursement.transaction_party_id || 0);
  }
  if (disbursement.payee_type === 'agency') return ['commission', 'agency_fee', 'advertising', 'admin_fee'].includes(line.line_type);
  if (payeeParty?.party_type === 'buyer') {
    return line.line_type === 'buyer_refund'
      && Number(line.payee_transaction_party_id || 0) === Number(disbursement.transaction_party_id || 0);
  }
  return DEDUCTION_TYPES.has(line.line_type)
    && Number(line.payee_contact_id || 0) === Number(disbursement.contact_id || 0);
}

function validateDisbursementPayment(disbursement, payment, payeeParty, alreadyAllocated = false) {
  const invalid = (status, message) => { throw Object.assign(new Error(message), { status }); };
  if (!payment || payment.direction !== 'outgoing' || payment.status !== 'cleared' || payment.reversal_of_payment_id) {
    invalid(400, 'A live cleared outgoing payment is required');
  }
  const expectedKind = expectedPaymentKind(disbursement, payeeParty);
  if (payment.payment_kind !== expectedKind) invalid(400, `Payment kind must be ${expectedKind} for this payee`);
  const disbursementPartyId = Number(disbursement.transaction_party_id || 0);
  const paymentPartyId = Number(payment.transaction_party_id || 0);
  if ((disbursementPartyId || paymentPartyId) && disbursementPartyId !== paymentPartyId) invalid(400, 'Payment party must match the disbursement payee');
  if (toMinor(payment.amount) !== toMinor(disbursement.amount)) invalid(400, 'Payment amount must exactly match the disbursement amount');
  const destination = normalizedAccount(disbursement.bank_account_number);
  if (disbursement.payout_method !== 'sslcommerz_refund' && destination && normalizedAccount(payment.to_account_number) !== destination) invalid(400, 'Payment destination account must match the disbursement account');
  if (alreadyAllocated) invalid(409, 'Payment is already allocated to another disbursement');
  return true;
}

const toNumber = (value) => fromMinor(toMinor(value));
const toMoney = (value) => fromMinor(toMinor(value));

/* The trust account statement: every receipt, refund, payout and reversal in
   chronological order with a running balance. Money only ever moves through
   payments — disbursements are allocations of an outgoing payment, so they are
   annotated on their payment row rather than double-counted. */
function buildStatement({ lines = [], payments = [], disbursements = [], parties = [] }) {
  const sorted = [...payments].sort((a, b) => {
    const dateA = new Date(a.payment_at || a.created_at || 0).getTime();
    const dateB = new Date(b.payment_at || b.created_at || 0).getTime();
    return dateA - dateB || Number(a.id) - Number(b.id);
  });
  const partyNames = new Map(parties.map((party) => [Number(party.id), party.snapshot_name]));
  const paidDisbursementByPayment = new Map(disbursements.filter((item) => item.status === 'paid' && item.payment_id).map((item) => [Number(item.payment_id), item]));
  const reversalByOriginal = new Map(payments.filter((payment) => payment.reversal_of_payment_id).map((payment) => [Number(payment.reversal_of_payment_id), payment]));
  let balance = 0;
  const entries = sorted.map((payment) => {
    // 'reversed' means the entry cleared and was later reversed by its pair row,
    // so both legs moved money through the trust account and both hit the balance.
    const movesFunds = ['cleared', 'reversed'].includes(payment.status);
    const inflow = payment.direction === 'incoming' ? toMoney(payment.amount) : 0;
    const outflow = payment.direction === 'outgoing' ? toMoney(payment.amount) : 0;
    if (movesFunds) balance = toMoney(balance + inflow - outflow);
    const disbursement = paidDisbursementByPayment.get(Number(payment.id)) || null;
    const reversal = reversalByOriginal.get(Number(payment.id)) || null;
    const kind = payment.reversal_of_payment_id ? 'reversal' : (payment.payment_kind || (payment.direction === 'incoming' ? 'buyer_receipt' : 'adjustment'));
    return {
      id: payment.id,
      entry_kind: kind,
      direction: payment.direction,
      date: payment.payment_at || payment.created_at,
      value_date: payment.value_date,
      reference: payment.reference,
      method: payment.method,
      party: partyNames.get(Number(payment.transaction_party_id))
        || (payment.payment_kind === 'agency_fee' ? 'Seventh Sky (agency)' : null)
        || (payment.counterparty_name ? `${payment.counterparty_name}${payment.counterparty_phone ? ` · ${payment.counterparty_phone}` : ''}` : null),
      description: payment.reversal_of_payment_id
        ? `Reversal of payment #${payment.reversal_of_payment_id}${payment.reversal_reason ? ` — ${payment.reversal_reason}` : ''}`
        : disbursement
          ? `${kind} — pays ${disbursement.payee_type} payout ${disbursement.reference || `#${disbursement.id}`}`
          : kind,
      amount_in: inflow,
      amount_out: outflow,
      status: payment.status,
      moves_funds: movesFunds,
      running_balance: movesFunds ? balance : null,
      reconciliation_status: payment.reconciliation_status || 'unreconciled',
      reconciled_at: payment.reconciled_at || null,
      reconciliation_note: payment.reconciliation_note || null,
      statement_url: payment.statement_url || null,
      proof_url: payment.proof_url || null,
      journal_entry_id: payment.journal_entry_id || null,
      reversal_of_payment_id: payment.reversal_of_payment_id || null,
      reversed_by_payment_id: reversal ? reversal.id : null,
      disbursement: disbursement ? { id: disbursement.id, payee_type: disbursement.payee_type, reference: disbursement.reference, amount: toMoney(disbursement.amount) } : null,
    };
  });
  const active = excludeReversalPairs(payments).filter((payment) => payment.status === 'cleared');
  return {
    opening_balance: 0,
    closing_balance: balance,
    entries,
    totals: {
      ...calculateSettlement(lines, payments, disbursements),
      cleared_in: toMoney(active.filter((payment) => payment.direction === 'incoming').reduce((sum, payment) => sum + toNumber(payment.amount), 0)),
      cleared_out: toMoney(active.filter((payment) => payment.direction === 'outgoing').reduce((sum, payment) => sum + toNumber(payment.amount), 0)),
      unreconciled_count: excludeReversalPairs(payments).filter((payment) => payment.status === 'cleared' && payment.reconciliation_status !== 'reconciled').length,
    },
  };
}

async function postPaymentJournal(payment, actorId, transaction, options = {}) {
  if (payment.journal_entry_id) return JournalEntry.findByPk(payment.journal_entry_id, { transaction });
  const settlement = options.settlement || await SaleSettlement.findOne({ where: { id: payment.settlement_id, branch_id: payment.branch_id }, transaction });
  const saleTransaction = settlement && await SaleTransaction.findOne({ where: { id: settlement.transaction_id, branch_id: settlement.branch_id }, transaction });
  const profile = saleTransaction && await SaleProfile.findOne({ where: { property_id: saleTransaction.property_id, branch_id: payment.branch_id }, transaction });
  const defaults = await Account.findAll({ where: { branch_id: payment.branch_id, code: { [Op.in]: ['1100', '1110', '2100', '4100', '4110'] }, is_active: true }, transaction });
  const defaultByCode = new Map(defaults.map((account) => [account.code, account.id]));
  const bankAccountId = payment.bank_account_id || profile?.client_money_bank_account_id || defaultByCode.get('1100');
  const liabilityAccountId = payment.liability_account_id || profile?.client_funds_liability_account_id || defaultByCode.get('2100');
  if (!bankAccountId || !liabilityAccountId) throw Object.assign(new Error('Trust bank and client-funds liability ledger accounts are required'), { status: 409 });
  if (Number(bankAccountId) === Number(liabilityAccountId)) throw Object.assign(new Error('Trust bank and liability accounts must be different'), { status: 400 });

  const existing = await JournalEntry.findOne({ where: { branch_id: payment.branch_id, ref_no: `SALE-PAY-${payment.id}` }, transaction });
  if (existing) {
    await payment.update({ journal_entry_id: existing.id, bank_account_id: bankAccountId, liability_account_id: liabilityAccountId }, { transaction });
    return existing;
  }

  if (payment.reversal_of_payment_id) {
    const original = await SalePayment.findByPk(payment.reversal_of_payment_id, { transaction });
    if (!original?.journal_entry_id) throw Object.assign(new Error('The original payment must be posted before it can be reversed'), { status: 409 });
    const originalLines = await JournalLine.findAll({ where: { journal_entry_id: original.journal_entry_id }, transaction, raw: true });
    const entry = await JournalEntry.create({ branch_id: payment.branch_id, ref_no: `SALE-PAY-${payment.id}`, description: `Reversal of sale payment ${original.reference}`, date: payment.value_date || payment.payment_at, posted_by: actorId }, { transaction });
    await JournalLine.bulkCreate(originalLines.map((line) => ({ journal_entry_id: entry.id, account_id: line.account_id, debit: line.credit, credit: line.debit, notes: payment.reference })), { transaction });
    await payment.update({ journal_entry_id: entry.id, bank_account_id: bankAccountId, liability_account_id: liabilityAccountId }, { transaction });
    return entry;
  }

  const accountIds = [bankAccountId, liabilityAccountId];
  let line = options.line || null;
  const agencyPayment = payment.payment_kind === 'agency_fee';
  if (agencyPayment) {
    const operatingId = profile?.agency_operating_account_id || defaultByCode.get('1110');
    const revenueId = line?.line_type === 'advertising' ? (profile?.marketing_revenue_account_id || defaultByCode.get('4110')) : (profile?.commission_revenue_account_id || defaultByCode.get('4100'));
    if (!operatingId || !revenueId) throw Object.assign(new Error('Agency operating bank and revenue ledger accounts are required for agency payouts'), { status: 409 });
    accountIds.push(operatingId, revenueId);
    options.operatingAccountId = operatingId;
    options.revenueAccountId = revenueId;
  }
  const accounts = await Account.findAll({ where: { id: { [Op.in]: [...new Set(accountIds)] }, branch_id: payment.branch_id, is_active: true }, transaction });
  const byId = new Map(accounts.map((account) => [Number(account.id), account]));
  if (byId.size !== new Set(accountIds.map(Number)).size) throw Object.assign(new Error('All posting accounts must be active accounts in the settlement branch'), { status: 400 });
  if (byId.get(Number(bankAccountId))?.type !== 'asset' || byId.get(Number(liabilityAccountId))?.type !== 'liability') {
    throw Object.assign(new Error('Posting requires an asset trust-bank account and a liability client-funds account'), { status: 400 });
  }

  const entry = await JournalEntry.create({ branch_id: payment.branch_id, ref_no: `SALE-PAY-${payment.id}`, description: `Sale settlement payment ${payment.reference}`, date: payment.value_date || payment.payment_at, posted_by: actorId }, { transaction });
  const amount = decimalFromMinor(toMinor(payment.amount));
  let journalLines;
  if (payment.direction === 'incoming') {
    journalLines = [
      { journal_entry_id: entry.id, account_id: bankAccountId, debit: amount, credit: 0, notes: payment.reference },
      { journal_entry_id: entry.id, account_id: liabilityAccountId, debit: 0, credit: amount, notes: payment.reference },
    ];
  } else if (agencyPayment) {
    journalLines = [
      { journal_entry_id: entry.id, account_id: liabilityAccountId, debit: amount, credit: 0, notes: payment.reference },
      { journal_entry_id: entry.id, account_id: options.revenueAccountId, debit: 0, credit: amount, notes: payment.reference },
      { journal_entry_id: entry.id, account_id: options.operatingAccountId, debit: amount, credit: 0, notes: payment.reference },
      { journal_entry_id: entry.id, account_id: bankAccountId, debit: 0, credit: amount, notes: payment.reference },
    ];
  } else {
    journalLines = [
      { journal_entry_id: entry.id, account_id: liabilityAccountId, debit: amount, credit: 0, notes: payment.reference },
      { journal_entry_id: entry.id, account_id: bankAccountId, debit: 0, credit: amount, notes: payment.reference },
    ];
  }
  await JournalLine.bulkCreate(journalLines, { transaction });
  await payment.update({ journal_entry_id: entry.id, bank_account_id: bankAccountId, liability_account_id: liabilityAccountId }, { transaction });
  return entry;
}

module.exports = { calculateSettlement, getTransition, recordEvent, settlementSnapshot, complianceBlockers, postPaymentJournal, buildStatement, excludeReversalPairs, expectedPaymentKind, disbursementMatchesLine, validateDisbursementPayment };
