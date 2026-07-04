/**
 * ownerStatement.service.js
 * ------------------------------------------------------------------
 * Computes owner statements from folio_transactions + invoices + payments
 * for a single (owner, property, period).
 *
 * Bucket mapping (from FolioTransaction.bucket enum):
 *   rent            -> rent_collected (credit) / rent_charge (debit)
 *   service_charge  -> service_charge_collected
 *   utility         -> utility_deductions (debit if owner-paid)
 *   maintenance     -> maintenance_deductions
 *   supplier_bill   -> landlord_bills_deductions
 *   landlord_fee    -> management_fee
 *   deposit         -> excluded from statement (held)
 *   owner_payout    -> reduces net (already-paid disbursements)
 *   adjustment      -> other_credits or other_deductions per sign
 *
 * All numbers are computed from actual folio_transactions rows (credit/debit)
 * to keep the statement in lockstep with the ledger.
 */
const sequelize = require('../config/db.config');
const OwnerStatement = require('../models/OwnerStatement');
const Folio = require('../models/Folio');
const Contact = require('../models/Contact');
const Property = require('../models/Property');
const FolioTransaction = require('../models/FolioTransaction');
const { generateCode } = require('../utils/codeGenerator');
const { Op } = require('sequelize');

const num = (v) => Number(v || 0);

/** Given YYYY-MM, return { period_start, period_end } (inclusive). */
function periodBounds(period_label) {
  const [y, m] = period_label.split('-').map((x) => parseInt(x, 10));
  const start = new Date(Date.UTC(y, m - 1, 1));
  const end = new Date(Date.UTC(y, m, 0)); // last day of month
  return {
    period_start: start.toISOString().slice(0, 10),
    period_end: end.toISOString().slice(0, 10),
  };
}

/** Find the landlord folio for (owner, property). Prefer landlord_property scope. */
async function findOwnerFolio(owner_contact_id, property_id) {
  const where = { folio_type: 'landlord', owner_contact_id };
  if (property_id) where.property_id = property_id;
  return Folio.findOne({ where, order: [['id', 'DESC']] });
}

/**
 * Compute a statement WITHOUT persisting it. Returns the full payload the
 * dashboard preview + PDF template render from.
 */
async function computeStatement({ owner_contact_id, property_id, period_label }) {
  const { period_start, period_end } = periodBounds(period_label);
  const folio = await findOwnerFolio(owner_contact_id, property_id);
  if (!folio) {
    // Compute an empty statement so the UI can still preview / offer manual entry.
    return {
      folio_id: null, period_label, period_start, period_end,
      opening_balance: 0, rent_collected: 0, service_charge_collected: 0, arrears_recovered: 0, other_credits: 0, total_credits: 0,
      management_fee: 0, maintenance_deductions: 0, utility_deductions: 0, landlord_bills_deductions: 0, other_deductions: 0, total_deductions: 0,
      net_disbursement: 0, closing_balance: 0,
      line_items: [], _empty: true,
    };
  }

  // ── Opening balance: sum of all transactions BEFORE period_start ──
  const [[open]] = await sequelize.query(
    `SELECT COALESCE(SUM(credit) - SUM(debit), 0) AS bal
       FROM folio_transactions
      WHERE folio_id = :fid AND transaction_date < :start`,
    { replacements: { fid: folio.id, start: period_start } }
  );
  const opening_balance = num(open?.bal);

  // ── All transactions IN period ──
  const txns = await FolioTransaction.findAll({
    where: {
      folio_id: folio.id,
      transaction_date: { [Op.between]: [period_start, period_end] },
    },
    order: [['transaction_date', 'ASC'], ['id', 'ASC']],
  });

  // ── Bucket rollups ──
  const rollup = {
    rent_collected: 0, service_charge_collected: 0, arrears_recovered: 0, other_credits: 0,
    management_fee: 0, maintenance_deductions: 0, utility_deductions: 0, landlord_bills_deductions: 0, other_deductions: 0,
  };
  const line_items = [];

  for (const t of txns) {
    const debit = num(t.debit);
    const credit = num(t.credit);
    const b = t.bucket;
    const label = t.description || (b || '').replace(/_/g, ' ');

    // Track for statement rollup (money-in = credit on landlord folio; money-out = debit)
    if (credit > 0) {
      if (b === 'rent') rollup.rent_collected += credit;
      else if (b === 'service_charge') rollup.service_charge_collected += credit;
      else if (b === 'adjustment') rollup.other_credits += credit;
      else rollup.other_credits += credit;
    }
    if (debit > 0) {
      if (b === 'landlord_fee') rollup.management_fee += debit;
      else if (b === 'maintenance') rollup.maintenance_deductions += debit;
      else if (b === 'utility') rollup.utility_deductions += debit;
      else if (b === 'supplier_bill') rollup.landlord_bills_deductions += debit;
      else if (b === 'owner_payout') { /* excluded from deductions — pure payout */ }
      else if (b === 'deposit' || b === 'deposit_deduction') { /* deposit is separate, not statement income */ }
      else if (b === 'adjustment') rollup.other_deductions += debit;
      else rollup.other_deductions += debit;
    }

    line_items.push({
      date: t.transaction_date,
      description: label,
      bucket: b,
      type: t.transaction_type,
      debit, credit,
      running_after: num(t.balance_after),
      invoice_id: t.invoice_id, payment_id: t.payment_id,
    });
  }

  const total_credits = rollup.rent_collected + rollup.service_charge_collected + rollup.arrears_recovered + rollup.other_credits;
  const total_deductions = rollup.management_fee + rollup.maintenance_deductions + rollup.utility_deductions + rollup.landlord_bills_deductions + rollup.other_deductions;
  const net_disbursement = total_credits - total_deductions;
  // Closing balance = opening + net movement over the period (credits - debits, ignoring deposit-only)
  const netMovement = txns.reduce((a, t) => a + num(t.credit) - num(t.debit), 0);
  const closing_balance = opening_balance + netMovement;

  return {
    folio_id: folio.id, period_label, period_start, period_end,
    opening_balance,
    rent_collected: rollup.rent_collected,
    service_charge_collected: rollup.service_charge_collected,
    arrears_recovered: rollup.arrears_recovered,
    other_credits: rollup.other_credits,
    total_credits,
    management_fee: rollup.management_fee,
    maintenance_deductions: rollup.maintenance_deductions,
    utility_deductions: rollup.utility_deductions,
    landlord_bills_deductions: rollup.landlord_bills_deductions,
    other_deductions: rollup.other_deductions,
    total_deductions,
    net_disbursement,
    closing_balance,
    line_items,
  };
}

/**
 * Compute + persist a statement. If one already exists for
 * (owner, property, period), returns it unchanged unless `regenerate` is set.
 */
async function generateStatement({ owner_contact_id, property_id, period_label, generated_by, branch_id, regenerate = false }) {
  const existing = await OwnerStatement.findOne({
    where: {
      owner_contact_id,
      period_label,
      property_id: property_id || null,
    },
  });

  if (existing && !regenerate) return existing;

  const computed = await computeStatement({ owner_contact_id, property_id, period_label });

  if (existing && regenerate) {
    // Only update the computed fields — preserve status, sent_at, notes.
    await existing.update({
      folio_id: computed.folio_id,
      opening_balance: computed.opening_balance,
      rent_collected: computed.rent_collected,
      service_charge_collected: computed.service_charge_collected,
      arrears_recovered: computed.arrears_recovered,
      other_credits: computed.other_credits,
      total_credits: computed.total_credits,
      management_fee: computed.management_fee,
      maintenance_deductions: computed.maintenance_deductions,
      utility_deductions: computed.utility_deductions,
      landlord_bills_deductions: computed.landlord_bills_deductions,
      other_deductions: computed.other_deductions,
      total_deductions: computed.total_deductions,
      net_disbursement: computed.net_disbursement,
      closing_balance: computed.closing_balance,
      line_items: computed.line_items,
      generated_at: new Date(),
    });
    return existing;
  }

  const statement_code = await generateCode(OwnerStatement, 'statement_code', 'SSPC-OS-');
  return OwnerStatement.create({
    branch_id,
    statement_code,
    owner_contact_id,
    property_id: property_id || null,
    folio_id: computed.folio_id,
    period_label,
    period_start: computed.period_start,
    period_end: computed.period_end,
    opening_balance: computed.opening_balance,
    rent_collected: computed.rent_collected,
    service_charge_collected: computed.service_charge_collected,
    arrears_recovered: computed.arrears_recovered,
    other_credits: computed.other_credits,
    total_credits: computed.total_credits,
    management_fee: computed.management_fee,
    maintenance_deductions: computed.maintenance_deductions,
    utility_deductions: computed.utility_deductions,
    landlord_bills_deductions: computed.landlord_bills_deductions,
    other_deductions: computed.other_deductions,
    total_deductions: computed.total_deductions,
    net_disbursement: computed.net_disbursement,
    closing_balance: computed.closing_balance,
    line_items: computed.line_items,
    status: computed._empty ? 'draft' : 'ready',
    generated_by,
    generated_at: new Date(),
  });
}

module.exports = { computeStatement, generateStatement, periodBounds };
