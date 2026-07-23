const { Op } = require('sequelize');
const { SaleTrustAccount, SaleTrustEntry } = require('../models/SalesTrustModels');
const { DEDUCTION_TYPES } = require('../utils/salesSettlementCalculations');
const { toMinor, fromMinor, decimalFromMinor } = require('../utils/money');

const AGENCY_TYPES = new Set(['commission', 'agency_fee', 'advertising', 'admin_fee']);
const NON_PAYABLE_TYPES = new Set(['purchase_price', 'deposit', 'buyer_receipt']);

function payableLines(lines = []) {
  return lines.filter((line) => !NON_PAYABLE_TYPES.has(line.line_type) && toMinor(line.amount) > 0);
}

function beneficiaryForLine(line, parties = []) {
  const party = parties.find((item) => Number(item.id) === Number(line.payee_transaction_party_id)) || null;
  if (line.line_type === 'vendor_proceeds') {
    if (!party || party.party_type !== 'vendor' || party.status !== 'active') throw Object.assign(new Error(`Vendor proceeds line #${line.id} needs an active vendor payee`), { status: 409 });
    return { key: `vendor:${party.id}`, type: 'vendor', transaction_party_id: party.id, contact_id: party.contact_id };
  }
  if (line.line_type === 'buyer_refund') {
    if (!party || party.party_type !== 'buyer' || party.status !== 'active') throw Object.assign(new Error(`Buyer refund line #${line.id} needs an active buyer payee`), { status: 409 });
    return { key: `buyer:${party.id}`, type: 'buyer', transaction_party_id: party.id, contact_id: party.contact_id };
  }
  if (AGENCY_TYPES.has(line.line_type) || (line.line_type === 'rounding' && !line.payee_contact_id)) {
    return { key: 'agency', type: 'agency', transaction_party_id: null, contact_id: null };
  }
  if (DEDUCTION_TYPES.has(line.line_type) && line.payee_contact_id) {
    return { key: `contact:${line.payee_contact_id}`, type: 'third_party', transaction_party_id: null, contact_id: line.payee_contact_id };
  }
  throw Object.assign(new Error(`Settlement line #${line.id} (${line.line_type}) needs an identified payee`), { status: 409 });
}

function validateSchedule(lines = [], parties = []) {
  const errors = [];
  const priceLines = lines.filter((line) => line.line_type === 'purchase_price');
  if (priceLines.length !== 1 || toMinor(priceLines[0]?.amount) <= 0) errors.push('exactly_one_positive_purchase_price_required');
  const payable = payableLines(lines);
  for (const line of payable) {
    if (line.direction !== 'debit') errors.push(`line_${line.id}_must_be_debit`);
    try { beneficiaryForLine(line, parties); } catch (error) { errors.push(error.message); }
  }
  const priceMinor = priceLines.length === 1 ? toMinor(priceLines[0].amount) : 0;
  const obligationsMinor = payable.reduce((sum, line) => sum + toMinor(line.amount), 0);
  if (priceMinor !== obligationsMinor) errors.push('purchase_price_must_equal_all_outgoing_obligations');
  return { errors, price_minor: priceMinor, obligations_minor: obligationsMinor, payable };
}

async function ensureAccount({ settlement, beneficiary, transaction }) {
  const [account] = await SaleTrustAccount.findOrCreate({
    where: { settlement_id: settlement.id, beneficiary_key: beneficiary.key },
    defaults: {
      branch_id: settlement.branch_id,
      account_type: beneficiary.type,
      transaction_party_id: beneficiary.transaction_party_id || null,
      contact_id: beneficiary.contact_id || null,
      status: 'open',
    },
    transaction,
  });
  return account;
}

async function createEntry(values, transaction) {
  const [entry] = await SaleTrustEntry.findOrCreate({
    where: { settlement_id: values.settlement_id, source_key: values.source_key },
    defaults: values,
    transaction,
  });
  return entry;
}

async function accountBalanceMinor(accountId, transaction) {
  const entries = await SaleTrustEntry.findAll({ where: { trust_account_id: accountId }, transaction, raw: true });
  return entries.reduce((sum, entry) => sum + toMinor(entry.debit) - toMinor(entry.credit), 0);
}

async function recordReceipt(settlement, payment, actorId, transaction) {
  if (payment.direction !== 'incoming' || payment.status !== 'cleared' || payment.reversal_of_payment_id) return null;
  const clearing = await ensureAccount({ settlement, beneficiary: { key: 'clearing', type: 'clearing' }, transaction });
  return createEntry({
    branch_id: settlement.branch_id, settlement_id: settlement.id, trust_account_id: clearing.id,
    payment_id: payment.id, entry_type: 'receipt', debit: decimalFromMinor(toMinor(payment.amount)), credit: '0.00',
    source_key: `payment:${payment.id}:receipt`, description: `Cleared receipt ${payment.reference}`, created_by: actorId,
  }, transaction);
}

async function reverseReceipt(settlement, original, reversal, actorId, transaction) {
  if (original.direction !== 'incoming') return null;
  const clearing = await ensureAccount({ settlement, beneficiary: { key: 'clearing', type: 'clearing' }, transaction });
  return createEntry({
    branch_id: settlement.branch_id, settlement_id: settlement.id, trust_account_id: clearing.id,
    payment_id: reversal.id, entry_type: 'reversal', debit: '0.00', credit: decimalFromMinor(toMinor(original.amount)),
    source_key: `payment:${reversal.id}:receipt-reversal`, description: `Receipt reversal for payment #${original.id}`, created_by: actorId,
  }, transaction);
}

async function allocateSettlement(settlement, lines, parties, actorId, transaction) {
  const schedule = validateSchedule(lines, parties);
  if (schedule.errors.length) throw Object.assign(new Error(`Invalid settlement schedule: ${schedule.errors.join(', ')}`), { status: 409 });
  const clearing = await ensureAccount({ settlement, beneficiary: { key: 'clearing', type: 'clearing' }, transaction });
  const clearingMinor = await accountBalanceMinor(clearing.id, transaction);
  if (clearingMinor !== schedule.obligations_minor) {
    throw Object.assign(new Error(`Trust funding must exactly equal obligations (${fromMinor(clearingMinor)} held, ${fromMinor(schedule.obligations_minor)} required)`), { status: 409 });
  }
  const version = Number(settlement.allocation_version || 0) + 1;
  for (const line of schedule.payable) {
    const beneficiary = beneficiaryForLine(line, parties);
    const account = await ensureAccount({ settlement, beneficiary, transaction });
    const amount = decimalFromMinor(toMinor(line.amount));
    await createEntry({
      branch_id: settlement.branch_id, settlement_id: settlement.id, trust_account_id: clearing.id,
      settlement_line_id: line.id, entry_type: 'allocation_out', debit: '0.00', credit: amount,
      source_key: `allocation:v${version}:line:${line.id}:out`, description: `Allocate line #${line.id} from settlement clearing`, created_by: actorId,
    }, transaction);
    await createEntry({
      branch_id: settlement.branch_id, settlement_id: settlement.id, trust_account_id: account.id,
      settlement_line_id: line.id, entry_type: 'allocation_in', debit: amount, credit: '0.00',
      source_key: `allocation:v${version}:line:${line.id}:in`, description: `Allocate line #${line.id} to ${beneficiary.key}`, created_by: actorId,
    }, transaction);
  }
  await settlement.update({ allocation_version: version }, { transaction });
  return version;
}

async function reverseAllocation(settlement, actorId, transaction) {
  const version = Number(settlement.allocation_version || 0);
  if (!version) return false;
  const entries = await SaleTrustEntry.findAll({
    where: { settlement_id: settlement.id, source_key: { [Op.like]: `allocation:v${version}:%` } },
    transaction,
    raw: true,
  });
  if (!entries.length) return false;
  const laterPayouts = await SaleTrustEntry.count({ where: { settlement_id: settlement.id, entry_type: 'payout' }, transaction });
  if (laterPayouts) throw Object.assign(new Error('An approved settlement with payout history cannot be returned; reverse the payout first'), { status: 409 });
  for (const entry of entries) {
    await createEntry({
      branch_id: settlement.branch_id, settlement_id: settlement.id, trust_account_id: entry.trust_account_id,
      settlement_line_id: entry.settlement_line_id, entry_type: 'reversal', debit: entry.credit, credit: entry.debit,
      source_key: `allocation-reversal:v${version}:entry:${entry.id}`, description: `Reverse allocation version ${version}`, created_by: actorId,
    }, transaction);
  }
  return true;
}

async function recordPayout(settlement, disbursement, line, parties, actorId, transaction) {
  const beneficiary = beneficiaryForLine(line, parties);
  const account = await ensureAccount({ settlement, beneficiary, transaction });
  const amountMinor = toMinor(disbursement.amount);
  const balanceMinor = await accountBalanceMinor(account.id, transaction);
  if (amountMinor > balanceMinor) throw Object.assign(new Error(`Payout exceeds ${beneficiary.key} trust balance`), { status: 409 });
  return createEntry({
    branch_id: settlement.branch_id, settlement_id: settlement.id, trust_account_id: account.id,
    settlement_line_id: line.id, payment_id: disbursement.payment_id, disbursement_id: disbursement.id,
    entry_type: 'payout', debit: '0.00', credit: decimalFromMinor(amountMinor),
    source_key: `disbursement:${disbursement.id}:payout`, description: `Paid ${beneficiary.key}`, created_by: actorId,
  }, transaction);
}

async function reversePayout(settlement, disbursement, reversalPayment, actorId, transaction) {
  const payouts = await SaleTrustEntry.findAll({ where: { settlement_id: settlement.id, disbursement_id: disbursement.id, entry_type: 'payout' }, transaction, raw: true });
  for (const payout of payouts) {
    await createEntry({
      branch_id: settlement.branch_id, settlement_id: settlement.id, trust_account_id: payout.trust_account_id,
      settlement_line_id: payout.settlement_line_id, payment_id: reversalPayment.id, disbursement_id: disbursement.id,
      entry_type: 'reversal', debit: payout.credit, credit: '0.00', source_key: `disbursement:${disbursement.id}:reversal:${reversalPayment.id}`,
      description: `Restore trust balance after payout reversal`, created_by: actorId,
    }, transaction);
  }
}

async function trustSnapshot(settlementId, transaction) {
  const accounts = await SaleTrustAccount.findAll({ where: { settlement_id: settlementId }, order: [['id', 'ASC']], transaction, raw: true });
  const entries = accounts.length ? await SaleTrustEntry.findAll({ where: { settlement_id: settlementId }, order: [['id', 'ASC']], transaction, raw: true }) : [];
  const balances = accounts.map((account) => {
    const accountEntries = entries.filter((entry) => Number(entry.trust_account_id) === Number(account.id));
    const balanceMinor = accountEntries.reduce((sum, entry) => sum + toMinor(entry.debit) - toMinor(entry.credit), 0);
    return { ...account, balance: fromMinor(balanceMinor), balance_minor: balanceMinor };
  });
  return {
    accounts: balances,
    entries,
    total_balance: fromMinor(balances.reduce((sum, account) => sum + account.balance_minor, 0)),
    total_balance_minor: balances.reduce((sum, account) => sum + account.balance_minor, 0),
  };
}

module.exports = {
  payableLines, beneficiaryForLine, validateSchedule, recordReceipt, reverseReceipt,
  allocateSettlement, reverseAllocation, recordPayout, reversePayout, trustSnapshot, accountBalanceMinor,
};
