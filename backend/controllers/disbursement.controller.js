/**
 * disbursement.controller.js
 * ------------------------------------------------------------------
 * Payouts. Three parties, one engine:
 *   · OWNER   — pay the net held in the landlord folio to the property owner.
 *   · SUPPLIER— pay a provider invoice / landlord bill (money out).
 *   · TENANT  — refund a deposit or overpayment to the tenant.
 *
 * Owner disbursement is the headline: it reads the current landlord-folio
 * balance (already NET because management fees were deducted on each rent
 * receipt — see ownerFees.service), posts an `owner_payout` credit that
 * reduces the balance, and records an OwnerDisbursement row with before/after
 * balances so the owner dashboard always reconciles.
 */
const sequelize = require('../config/db.config');
const OwnerDisbursement = require('../models/OwnerDisbursement');
const PmIncomeEntry = require('../models/PmIncomeEntry');
const Folio = require('../models/Folio');
const Contact = require('../models/Contact');
const Property = require('../models/Property');
const PropertyOwnerProfile = require('../models/PropertyOwnerProfile');
const PropertyInvoice = require('../models/PropertyInvoice');
const Payment = require('../models/Payment');
const Tenancy = require('../models/Tenancy');
const { generateCode } = require('../utils/codeGenerator');
const { asyncHandler, branchScope, resolveBranchId, getPagination, pick } = require('../utils/controllerHelpers');
const { findBestLandlordFolio, findTenantFolioForTenancy, postFolioTransaction } = require('../services/folio.service');

const num = (v) => Number(v || 0);

// ═══ OWNER: preview what's payable now ═══════════════════════════════════════
// GET /api/disbursements/owner/:ownerId/preview?property_id=&period=
exports.previewOwner = asyncHandler(async (req, res) => {
  const ownerId = Number(req.params.ownerId);
  const propertyId = req.query.property_id ? Number(req.query.property_id) : null;
  const folio = await findBestLandlordFolio(ownerId, propertyId);
  if (!folio) return res.json({ data: { payable: 0, folio: null, breakdown: null } });

  const period = req.query.period || null;
  // Property attribution is transaction-based because portfolio folios have no property_id.
  const propertyFilter = propertyId ? 'AND property_id = :propertyId' : '';
  const [[agg]] = await sequelize.query(
    `SELECT
       COALESCE(SUM(CASE WHEN bucket='rent' THEN debit ELSE 0 END),0) AS rent_collected,
       COALESCE(SUM(CASE WHEN bucket='service_charge' THEN debit ELSE 0 END),0) AS service_collected,
       COALESCE(SUM(CASE WHEN bucket='landlord_fee' THEN credit ELSE 0 END),0) AS fees,
       COALESCE(SUM(CASE WHEN bucket='supplier_bill' THEN credit ELSE 0 END),0) AS supplier_bills,
       COALESCE(SUM(CASE WHEN bucket='owner_payout' THEN credit ELSE 0 END),0) AS already_paid
       FROM folio_transactions
      WHERE folio_id = :fid ${propertyFilter} ${period ? "AND DATE_FORMAT(transaction_date,'%Y-%m') = :period" : ''}`,
    { replacements: { fid: folio.id, propertyId, period } }
  );
  const [[held]] = propertyId ? await sequelize.query(
    `SELECT COALESCE(SUM(debit - credit),0) AS total
       FROM folio_transactions
      WHERE folio_id = :fid AND property_id = :propertyId`,
    { replacements: { fid: folio.id, propertyId } }
  ) : [[{ total: folio.current_balance }]];

  const owner = await Contact.findByPk(ownerId, { attributes: ['id', 'full_name', 'primary_phone', 'email'] });
  const ownerProfile = propertyId ? await PropertyOwnerProfile.findOne({ where: { property_id: propertyId } }) : null;

  res.json({
    data: {
      owner,
      folio: { id: folio.id, code: folio.folio_code, current_balance: num(folio.current_balance) },
      payable: Math.max(0, num(held?.total)),
      breakdown: {
        rent_collected: num(agg?.rent_collected),
        service_collected: num(agg?.service_collected),
        fees_deducted: num(agg?.fees),
        supplier_bills: num(agg?.supplier_bills),
        already_paid: num(agg?.already_paid),
      },
      bank: ownerProfile ? {
        bank_name: ownerProfile.bank_name, bank_account_name: ownerProfile.bank_account_name,
        bank_account_number: ownerProfile.bank_account_number, preferred_payment: ownerProfile.preferred_payment,
        bkash_number: ownerProfile.bkash_number, nagad_number: ownerProfile.nagad_number,
      } : null,
    },
  });
});

// POST /api/disbursements/owner — pay the owner
//   body: { owner_contact_id, property_id?, amount?, period_label?, method?, reference?, notes? }
exports.payOwner = asyncHandler(async (req, res) => {
  const { owner_contact_id, property_id = null, period_label = null } = req.body || {};
  if (!owner_contact_id) return res.status(400).json({ error: 'owner_contact_id is required.' });

  const folio = await findBestLandlordFolio(owner_contact_id, property_id);
  if (!folio) return res.status(400).json({ error: 'No landlord folio found for this owner.' });

  const balanceBefore = num(folio.current_balance);
  const amount = req.body.amount != null ? num(req.body.amount) : balanceBefore;
  if (amount <= 0) return res.status(400).json({ error: 'Nothing to disburse — owner balance is zero.' });
  if (amount > balanceBefore + 0.001) return res.status(400).json({ error: `Amount exceeds the owner's held balance (${balanceBefore.toLocaleString()}).` });

  const ownerProfile = property_id ? await PropertyOwnerProfile.findOne({ where: { property_id } }) : null;

  const result = await sequelize.transaction(async (tx) => {
    // Period rollups for the record
    const [[agg]] = await sequelize.query(
      `SELECT
         COALESCE(SUM(CASE WHEN bucket='rent' THEN debit ELSE 0 END),0) AS rent,
         COALESCE(SUM(CASE WHEN bucket='landlord_fee' THEN credit ELSE 0 END),0) AS fees,
         COALESCE(SUM(CASE WHEN bucket IN ('supplier_bill','maintenance','utility') THEN credit ELSE 0 END),0) AS expenses
         FROM folio_transactions
        WHERE folio_id = :fid ${period_label ? "AND DATE_FORMAT(transaction_date,'%Y-%m') = :period" : ''}`,
      { replacements: { fid: folio.id, period: period_label }, transaction: tx }
    );

    // Post owner_payout — credit reduces the landlord folio balance.
    const folioTxn = await postFolioTransaction({
      folio_id: folio.id,
      transaction_type: 'owner_payout',
      bucket: 'owner_payout',
      property_id: property_id || folio.property_id,
      description: `Owner disbursement${period_label ? ' ' + period_label : ''}`,
      credit: amount,
      created_by: req.user?.id || null,
    }, { transaction: tx });

    const disb = await OwnerDisbursement.create({
      branch_id: resolveBranchId(req, req.body.branch_id) || folio.branch_id,
      disbursement_code: await generateCode(OwnerDisbursement, 'disbursement_code', 'SSPC-OD-'),
      owner_contact_id, landlord_folio_id: folio.id, property_id: property_id || folio.property_id,
      period_label,
      gross_collected: num(agg?.rent), fees_deducted: num(agg?.fees), expenses_deducted: num(agg?.expenses),
      net_amount: amount, balance_before: balanceBefore, balance_after: balanceBefore - amount,
      method: req.body.method || ownerProfile?.preferred_payment || 'bank_transfer',
      reference: req.body.reference || null,
      bank_snapshot: ownerProfile ? {
        bank_name: ownerProfile.bank_name, bank_account_name: ownerProfile.bank_account_name,
        bank_account_number: ownerProfile.bank_account_number,
      } : null,
      status: 'paid', paid_at: new Date(), notes: req.body.notes || null,
      folio_txn_id: folioTxn?.id || null, created_by: req.user?.id || null,
    }, { transaction: tx });

    return disb;
  });

  res.status(201).json({ data: result, message: `Disbursed ${amount.toLocaleString()} to owner. Balance updated.` });
});

// ═══ SUPPLIER: pay a provider invoice / landlord bill ════════════════════════
// POST /api/disbursements/supplier  body: { invoice_id, amount?, method?, reference? }
exports.paySupplier = asyncHandler(async (req, res) => {
  const inv = await PropertyInvoice.findOne({ where: { id: req.body.invoice_id, ...branchScope(req) } });
  if (!inv) return res.status(404).json({ error: 'Provider invoice not found.' });
  if (inv.invoice_kind !== 'provider') return res.status(400).json({ error: 'Not a provider bill.' });
  const amount = req.body.amount != null ? num(req.body.amount) : num(inv.balance);
  if (amount <= 0) return res.status(400).json({ error: 'Nothing to pay — bill already settled.' });

  const result = await sequelize.transaction(async (tx) => {
    const payment = await Payment.create({
      branch_id: inv.branch_id, payment_code: await generateCode(Payment, 'payment_code', 'SSPC-PY-'),
      invoice_id: inv.id, direction: 'outgoing', amount,
      method: req.body.method || 'bank_transfer', reference: req.body.reference || null,
      status: 'completed', paid_at: new Date(), notes: req.body.notes || 'Supplier payout', recorded_by: req.user?.id || null,
    }, { transaction: tx });
    const amount_paid = num(inv.amount_paid) + amount;
    await inv.update({ amount_paid, balance: num(inv.total) - amount_paid, status: num(inv.total) - amount_paid <= 0 ? 'paid' : 'partially_paid' }, { transaction: tx });
    return payment;
  });
  res.status(201).json({ data: result, message: `Paid ${amount.toLocaleString()} to supplier for ${inv.invoice_code}.` });
});

// ═══ TENANT: refund a deposit / overpayment ══════════════════════════════════
// POST /api/disbursements/tenant  body: { tenancy_id, amount, kind?: 'deposit'|'overpayment', method?, reference? }
exports.refundTenant = asyncHandler(async (req, res) => {
  const { tenancy_id, amount, kind = 'overpayment' } = req.body || {};
  const amt = num(amount);
  if (!tenancy_id || amt <= 0) return res.status(400).json({ error: 'tenancy_id and a positive amount are required.' });
  const tenancy = await Tenancy.findOne({ where: { id: tenancy_id, ...branchScope(req) } });
  if (!tenancy) return res.status(404).json({ error: 'Tenancy not found.' });
  const folio = await findTenantFolioForTenancy(tenancy_id);
  if (!folio) return res.status(400).json({ error: 'No tenant folio found.' });

  const result = await sequelize.transaction(async (tx) => {
    // Refund reduces what the tenant holds with us: credit deposit bucket (refund)
    // or credit current balance for an overpayment.
    const txn = await postFolioTransaction({
      folio_id: folio.id,
      transaction_type: 'credit',
      bucket: kind === 'deposit' ? 'deposit' : 'adjustment',
      property_id: tenancy.property_id, tenancy_id: tenancy.id,
      description: `Tenant ${kind} refund`,
      credit: amt,
      created_by: req.user?.id || null,
    }, { transaction: tx });
    return txn;
  });
  res.status(201).json({ data: result, message: `Refunded ${amt.toLocaleString()} to tenant (${kind}).` });
});

// ═══ TENANT-PAID-SUPPLIER-PERSONALLY (memo only) ═════════════════════════════
// POST /api/disbursements/tenant-personal-payment
//   body: { tenancy_id, amount, description }
// Records on the tenant folio + reports for visibility. Does NOT change tenant
// outstanding or owner balance.
exports.tenantPersonalPayment = asyncHandler(async (req, res) => {
  const { tenancy_id, amount, description } = req.body || {};
  const amt = num(amount);
  if (!tenancy_id || amt <= 0) return res.status(400).json({ error: 'tenancy_id and a positive amount are required.' });
  const tenancy = await Tenancy.findOne({ where: { id: tenancy_id, ...branchScope(req) } });
  if (!tenancy) return res.status(404).json({ error: 'Tenancy not found.' });
  const folio = await findTenantFolioForTenancy(tenancy_id);
  if (!folio) return res.status(400).json({ error: 'No tenant folio found.' });

  const txn = await postFolioTransaction({
    folio_id: folio.id,
    transaction_type: 'adjustment',
    bucket: 'maintenance',
    is_memo: true, memo_amount: amt,
    property_id: tenancy.property_id, tenancy_id: tenancy.id,
    description: description || 'Tenant paid supplier directly',
    created_by: req.user?.id || null,
  });
  res.status(201).json({ data: txn, message: 'Recorded as a memo on the tenant folio — does not affect balances.' });
});

// ═══ TENANT OUTSTANDING — 3-way split ════════════════════════════════════════
// GET /api/disbursements/tenant/:tenancyId/outstanding
// Splits the tenant's outstanding into: (1) rent arrears, (2) other open
// invoices, (3) service + utility — with the total. All three roll up to the
// owner's held balance; personal supplier memos are excluded (they never
// touched the balance). Reads the tenant folio buckets as the source of truth.
exports.tenantOutstanding = asyncHandler(async (req, res) => {
  const tenancy = await Tenancy.findOne({ where: { id: req.params.tenancyId, ...branchScope(req) } });
  if (!tenancy) return res.status(404).json({ error: 'Tenancy not found.' });

  // Computed from actual unpaid invoice balances (drift-proof), classified into
  // the 3 buckets by service_for / invoice_type.
  const [[agg]] = await sequelize.query(
    `SELECT
       COALESCE(SUM(CASE WHEN service_for='tenancy' OR invoice_type='rental_receipt' THEN balance ELSE 0 END),0) AS rent_arrears,
       COALESCE(SUM(CASE WHEN service_for='utility' OR service_for='property' THEN balance ELSE 0 END),0) AS service_utility,
       COALESCE(SUM(CASE WHEN service_for NOT IN ('tenancy','utility','property') AND invoice_type <> 'rental_receipt' THEN balance ELSE 0 END),0) AS other_invoices,
       COALESCE(SUM(balance),0) AS total
       FROM invoices
      WHERE tenancy_id = :tid AND invoice_kind='client' AND status NOT IN ('paid','cancelled','voided')`,
    { replacements: { tid: tenancy.id } }
  );

  const folio = await findTenantFolioForTenancy(tenancy.id);
  let memoPaid = 0;
  if (folio) {
    const [[memo]] = await sequelize.query(`SELECT COALESCE(SUM(memo_amount),0) AS t FROM folio_transactions WHERE folio_id = :fid AND is_memo = 1`, { replacements: { fid: folio.id } });
    memoPaid = num(memo?.t);
  }

  res.json({
    data: {
      folio: folio ? { id: folio.id, code: folio.folio_code } : null,
      rent_arrears: num(agg?.rent_arrears),
      invoices: num(agg?.other_invoices),
      service_utility: num(agg?.service_utility),
      total: num(agg?.total),
      memo_paid_directly: memoPaid,
    },
  });
});

// ═══ LIST owner disbursements ════════════════════════════════════════════════
exports.listOwnerDisbursements = asyncHandler(async (req, res) => {
  const { limit, offset, page } = getPagination(req);
  const where = { ...branchScope(req) };
  if (req.query.owner_contact_id) where.owner_contact_id = req.query.owner_contact_id;
  if (req.query.property_id) where.property_id = req.query.property_id;
  const { rows, count } = await OwnerDisbursement.findAndCountAll({
    where,
    include: [{ model: Contact, as: 'owner', attributes: ['id', 'full_name'] }, { model: Property, as: 'property', attributes: ['id', 'title', 'property_code'] }],
    limit, offset, order: [['created_at', 'DESC']],
  });
  res.json({ data: rows, pagination: { page, limit, total: count, pages: Math.ceil(count / limit) } });
});

// ═══ OWNER BALANCES — everyone with money held ═══════════════════════════════
// GET /api/disbursements/owner-balances
exports.ownerBalances = asyncHandler(async (req, res) => {
  const scope = branchScope(req);
  const bw = scope.branch_id ? ' AND f.branch_id = :bid' : '';
  const [rows] = await sequelize.query(
    `SELECT f.id AS folio_id, f.folio_code, f.property_id, f.owner_contact_id,
            f.current_balance,
            c.full_name AS owner_name, c.primary_phone,
            p.title AS property_title, p.property_code
       FROM folios f
       LEFT JOIN contacts c ON c.id = f.owner_contact_id
       LEFT JOIN properties p ON p.id = f.property_id
      WHERE f.folio_type = 'landlord'${bw}
      ORDER BY f.current_balance DESC`,
    { replacements: { bid: scope.branch_id } }
  );
  const total_held = rows.reduce((a, r) => a + num(r.current_balance), 0);
  res.json({ data: rows, total_held });
});

// ═══ PM INCOME ledger ════════════════════════════════════════════════════════
exports.listIncome = asyncHandler(async (req, res) => {
  const { limit, offset, page } = getPagination(req);
  const where = { ...branchScope(req) };
  if (req.query.property_id) where.property_id = req.query.property_id;
  if (req.query.category) where.category = req.query.category;
  if (req.query.period_label) where.period_label = req.query.period_label;
  const { rows, count } = await PmIncomeEntry.findAndCountAll({
    where,
    include: [{ model: Property, as: 'property', attributes: ['id', 'title', 'property_code'] }, { model: Contact, as: 'owner', attributes: ['id', 'full_name'] }],
    limit, offset, order: [['created_at', 'DESC']],
  });
  // Category rollup
  const grp = await PmIncomeEntry.findAll({
    where: branchScope(req),
    attributes: ['category', [sequelize.fn('SUM', sequelize.col('amount')), 'total']],
    group: ['category'], raw: true,
  });
  const by_category = grp.reduce((a, r) => { a[r.category] = num(r.total); return a; }, {});
  const total_income = Object.values(by_category).reduce((a, b) => a + b, 0);
  res.json({ data: rows, pagination: { page, limit, total: count, pages: Math.ceil(count / limit) }, by_category, total_income });
});
