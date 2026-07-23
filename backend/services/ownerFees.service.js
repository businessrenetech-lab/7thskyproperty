/**
 * ownerFees.service.js
 * ------------------------------------------------------------------
 * When a tenant's rent is received, Seventh Sky earns its management (and
 * other scheduled) fees. This service, called from the payment path:
 *
 *   1. computes each active owner fee for the property,
 *   2. posts a `landlord_fee` CREDIT on the landlord folio — reducing the
 *      owner's balance so what's held for them becomes NET, not gross,
 *   3. records a `pm_income_entry` — Seventh Sky's earned income, queryable
 *      by the PM income report + reconciled against the deduction.
 *
 * Idempotent per (fee, source): won't double-charge if a payment webhook or
 * retry hits twice — keyed on (source_type, source_id, fee_name).
 */
const OwnerFeeSchedule = require('../models/OwnerFeeSchedule');
const PropertyOwnerProfile = require('../models/PropertyOwnerProfile');
const PmIncomeEntry = require('../models/PmIncomeEntry');
const AccountCategory = require('../models/AccountCategory');
const { generateCode } = require('../utils/codeGenerator');
const { findBestLandlordFolio, postFolioTransaction } = require('./folio.service');

const num = (v) => Number(v || 0);

// Map a fee's category/name → the PM income category enum.
function incomeCategoryFor(fee) {
  const s = `${fee.fee_category || ''} ${fee.fee_name || ''}`.toLowerCase();
  if (s.includes('management')) return 'management_fee';
  if (s.includes('let') || s.includes('leasing')) return 'letting_fee';
  if (s.includes('renew')) return 'renewal_fee';
  if (s.includes('maintenance')) return 'maintenance_admin';
  if (s.includes('statement') || s.includes('admin')) return 'statement_fee';
  if (s.includes('advert') || s.includes('marketing')) return 'advertising_fee';
  return 'other';
}

/**
 * Apply owner fees triggered by a rent receipt.
 * @param {object} p
 * @param {object} p.tenancy            the tenancy (needs owner_contact_id, property_id, branch_id)
 * @param {number} p.rentReceived       the rent amount just received (percentage fees compute on this)
 * @param {string} [p.period_label]     YYYY-MM
 * @param {number} [p.source_id]        e.g. payment id or receipt id
 * @param {string} [p.source_type]      'rent_receipt' | 'invoice' (default 'rent_receipt')
 * @param {boolean}[p.isFirstRent]      also apply 'first_rent'-triggered fees
 * @param {number} [p.user_id]
 * @param {object} [opts.transaction]
 * @returns {Promise<{ total_fees:number, entries:Array }>}
 */
async function applyOwnerFeesOnRent({ tenancy, rentReceived, period_label, source_id, source_type = 'rent_receipt', isFirstRent = false, user_id = null }, opts = {}) {
  const tx = opts.transaction;
  if (!tenancy?.owner_contact_id || !tenancy.property_id || num(rentReceived) <= 0) {
    return { total_fees: 0, entries: [] };
  }

  const ownerProfile = await PropertyOwnerProfile.findOne({ where: { property_id: tenancy.property_id }, transaction: tx });
  if (!ownerProfile) return { total_fees: 0, entries: [] };

  const triggers = ['rental_receipt'];
  if (isFirstRent) triggers.push('first_rent');
  const fees = await OwnerFeeSchedule.findAll({
    where: { owner_profile_id: ownerProfile.id, is_active: true },
    transaction: tx,
  });
  const applicable = fees.filter((f) => triggers.includes(f.fee_trigger));
  if (!applicable.length) return { total_fees: 0, entries: [] };

  const landlordFolio = await findBestLandlordFolio(tenancy.owner_contact_id, tenancy.property_id, { transaction: tx });
  if (!landlordFolio) return { total_fees: 0, entries: [] };

  const feeCategory = await AccountCategory.findOne({ where: { type: 'income', is_deductible_from_landlord: true }, transaction: tx })
    || await AccountCategory.findOne({ where: { code: 'MGMT_FEE' }, transaction: tx });

  const entries = [];
  let total = 0;

  for (const fee of applicable) {
    // percentage → % of rent received; fixed → flat amount
    const amount = fee.amount_type === 'percentage'
      ? (num(rentReceived) * num(fee.amount_value)) / 100
      : num(fee.amount_value);
    if (amount <= 0) continue;

    // Idempotency: skip if we already booked this fee for this source.
    if (source_id) {
      const existing = await PmIncomeEntry.findOne({
        where: { source_type, source_id, fee_name: fee.fee_name, property_id: tenancy.property_id },
        transaction: tx,
      });
      if (existing) continue;
    }

    // 1. Deduct from the owner: credit the landlord folio (reduces owner balance).
    const folioTxn = await postFolioTransaction({
      folio_id: landlordFolio.id,
      transaction_type: 'charge',
      bucket: 'landlord_fee',
      account_category_id: feeCategory?.id || null,
      property_id: tenancy.property_id,
      tenancy_id: tenancy.id,
      description: `${fee.fee_name} on rent ${period_label || ''}`.trim(),
      credit: amount,
      created_by: user_id,
    }, { transaction: tx });

    // 2. Record Seventh Sky's earned income.
    const entry = await PmIncomeEntry.create({
      branch_id: tenancy.branch_id,
      entry_code: await generateCode(PmIncomeEntry, 'entry_code', 'SSPC-INC-'),
      category: incomeCategoryFor(fee),
      source_type,
      source_id: source_id || null,
      property_id: tenancy.property_id,
      owner_contact_id: tenancy.owner_contact_id,
      tenancy_id: tenancy.id,
      period_label: period_label || null,
      fee_name: fee.fee_name,
      amount,
      account_category_id: feeCategory?.id || null,
      landlord_folio_txn_id: folioTxn?.id || null,
      created_by: user_id,
    }, { transaction: tx });

    entries.push(entry);
    total += amount;
  }

  return { total_fees: total, entries };
}

module.exports = { applyOwnerFeesOnRent, incomeCategoryFor };
