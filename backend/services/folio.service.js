const { Op } = require('sequelize');
const Folio = require('../models/Folio');
const FolioTransaction = require('../models/FolioTransaction');
const SystemSetting = require('../models/SystemSetting');
const { generateCode } = require('../utils/codeGenerator');

const num = (v) => Number(v || 0);
const SETTING_KEY = 'property_management.folio_mode';
const DEFAULT_MODE = 'one_folio_per_landlord_property';

async function getFolioMode() {
  const row = await SystemSetting.findOne({ where: { setting_key: SETTING_KEY } });
  return row?.setting_value || DEFAULT_MODE;
}

async function setFolioMode(mode) {
  const safeMode = mode === 'one_folio_per_landlord' ? mode : DEFAULT_MODE;
  const [row] = await SystemSetting.findOrCreate({
    where: { setting_key: SETTING_KEY },
    defaults: { setting_value: safeMode, category: 'property_management', description: 'Landlord folio grouping mode' },
  });
  await row.update({ setting_value: safeMode, category: 'property_management' });
  return safeMode;
}

async function ensureTenantFolio(tenancy, opts = {}) {
  if (!tenancy?.id || !tenancy.tenant_contact_id) return null;
  const existing = await Folio.findOne({ where: { folio_type: 'tenant', tenancy_id: tenancy.id }, transaction: opts.transaction });
  if (existing) return existing;
  return Folio.create({
    branch_id: tenancy.branch_id,
    folio_code: await generateCode(Folio, 'folio_code', 'SSPC-TF-'),
    folio_type: 'tenant',
    folio_scope: 'tenancy',
    tenancy_id: tenancy.id,
    property_id: tenancy.property_id,
    contact_id: tenancy.tenant_contact_id,
    tenant_contact_id: tenancy.tenant_contact_id,
    owner_contact_id: tenancy.owner_contact_id,
    deposit_held: 0,
    deposit_available: 0,
    status: 'active',
  }, { transaction: opts.transaction });
}

async function ensureLandlordFolio(tenancy, opts = {}) {
  if (!tenancy?.owner_contact_id) return null;
  const mode = opts.mode || await getFolioMode();
  const where = { folio_type: 'landlord', contact_id: tenancy.owner_contact_id };
  if (mode !== 'one_folio_per_landlord') where.property_id = tenancy.property_id;
  const existing = await Folio.findOne({ where, transaction: opts.transaction });
  if (existing) return existing;
  return Folio.create({
    branch_id: tenancy.branch_id,
    folio_code: await generateCode(Folio, 'folio_code', 'SSPC-LF-'),
    folio_type: 'landlord',
    folio_scope: mode === 'one_folio_per_landlord' ? 'landlord' : 'landlord_property',
    tenancy_id: mode === 'one_folio_per_landlord' ? null : tenancy.id,
    property_id: mode === 'one_folio_per_landlord' ? null : tenancy.property_id,
    contact_id: tenancy.owner_contact_id,
    owner_contact_id: tenancy.owner_contact_id,
    status: 'active',
  }, { transaction: opts.transaction });
}

async function ensureFoliosForTenancy(tenancy, opts = {}) {
  const [tenantFolio, landlordFolio] = await Promise.all([
    ensureTenantFolio(tenancy, opts),
    ensureLandlordFolio(tenancy, opts),
  ]);
  return { tenantFolio, landlordFolio };
}

async function findTenantFolioForTenancy(tenancyId, opts = {}) {
  if (!tenancyId) return null;
  return Folio.findOne({ where: { folio_type: 'tenant', tenancy_id: tenancyId }, transaction: opts.transaction });
}

async function findBestLandlordFolio(ownerContactId, propertyId, opts = {}) {
  if (!ownerContactId) return null;
  const byProperty = propertyId ? await Folio.findOne({ where: { folio_type: 'landlord', contact_id: ownerContactId, property_id: propertyId }, transaction: opts.transaction }) : null;
  if (byProperty) return byProperty;
  return Folio.findOne({ where: { folio_type: 'landlord', contact_id: ownerContactId, property_id: null }, transaction: opts.transaction });
}

function bucketField(bucket) {
  if (bucket === 'rent') return 'rent_balance';
  if (bucket === 'service_charge') return 'service_charge_balance';
  if (bucket === 'utility') return 'utility_balance';
  if (bucket === 'deposit') return 'deposit_held';
  if (bucket === 'deposit_deduction') return 'deposit_deductions';
  return null;
}

async function postFolioTransaction(input, opts = {}) {
  const folio = await Folio.findByPk(input.folio_id, { transaction: opts.transaction });
  if (!folio) return null;

  // Memo rows are informational (e.g. tenant paid a supplier directly): they
  // appear in the ledger + reports but never move the balance.
  if (input.is_memo) {
    return FolioTransaction.create({
      branch_id: folio.branch_id,
      folio_id: folio.id,
      transaction_type: input.transaction_type || 'adjustment',
      bucket: input.bucket || 'adjustment',
      account_category_id: input.account_category_id || null,
      invoice_id: input.invoice_id || null,
      payment_id: input.payment_id || null,
      provider_id: input.provider_id || null,
      property_id: input.property_id || folio.property_id,
      tenancy_id: input.tenancy_id || folio.tenancy_id,
      description: input.description || null,
      debit: 0,
      credit: 0,
      balance_after: num(folio.current_balance),
      is_memo: true,
      memo_amount: num(input.memo_amount ?? input.debit ?? input.credit),
      transaction_date: input.transaction_date || new Date(),
      created_by: input.created_by || null,
    }, { transaction: opts.transaction });
  }

  const debit = num(input.debit);
  const credit = num(input.credit);
  const currentBalance = num(folio.current_balance) + debit - credit;
  const patch = { current_balance: currentBalance };
  const field = bucketField(input.bucket);
  if (field) {
    if (input.bucket === 'deposit') patch.deposit_available = num(folio.deposit_available) + debit - credit;
    patch[field] = num(folio[field]) + debit - credit;
  }
  await folio.update(patch, { transaction: opts.transaction });
  return FolioTransaction.create({
    branch_id: folio.branch_id,
    folio_id: folio.id,
    transaction_type: input.transaction_type,
    bucket: input.bucket || 'adjustment',
    account_category_id: input.account_category_id || null,
    invoice_id: input.invoice_id || null,
    payment_id: input.payment_id || null,
    provider_id: input.provider_id || null,
    property_id: input.property_id || folio.property_id,
    tenancy_id: input.tenancy_id || folio.tenancy_id,
    description: input.description || null,
    debit,
    credit,
    balance_after: currentBalance,
    transaction_date: input.transaction_date || new Date(),
    created_by: input.created_by || null,
  }, { transaction: opts.transaction });
}

/**
 * Allocate a tenant payment across the outstanding buckets in priority order
 * (rent → service_charge → utility → remainder as adjustment), so the folio's
 * bucket balances stay reconciled with its current_balance. Returns the txns.
 */
async function allocatePaymentToBuckets(folioId, amount, meta = {}, opts = {}) {
  const folio = await Folio.findByPk(folioId, { transaction: opts.transaction });
  if (!folio) return [];
  let remaining = num(amount);
  const order = ['rent', 'service_charge', 'utility'];
  const txns = [];
  for (const bucket of order) {
    if (remaining <= 0) break;
    const bal = num(folio[bucketField(bucket)]);
    if (bal <= 0) continue;
    const applied = Math.min(bal, remaining);
    txns.push(await postFolioTransaction({
      folio_id: folioId, transaction_type: 'payment', bucket,
      ...meta, credit: applied,
    }, opts));
    remaining -= applied;
  }
  // Anything left over (overpayment / non-bucketed invoice) → adjustment.
  if (remaining > 0.001) {
    txns.push(await postFolioTransaction({
      folio_id: folioId, transaction_type: 'payment', bucket: 'adjustment',
      ...meta, credit: remaining,
    }, opts));
  }
  return txns;
}

function folioWhereForBranch(req) {
  if (req.user?.role === 'super_admin') return {};
  return { branch_id: req.branchId ?? req.user?.branch_id ?? null };
}

module.exports = {
  SETTING_KEY,
  getFolioMode,
  setFolioMode,
  ensureTenantFolio,
  ensureLandlordFolio,
  ensureFoliosForTenancy,
  findTenantFolioForTenancy,
  findBestLandlordFolio,
  postFolioTransaction,
  allocatePaymentToBuckets,
  folioWhereForBranch,
};
