const BusinessSettlement = require('../models/BusinessSettlement');
const { asyncHandler, branchScope, resolveBranchId, pick } = require('../utils/controllerHelpers');
const { generateCode } = require('../utils/codeGenerator');

const FIELDS = [
  'business_listing_id', 'offer_id', 'buyer_contact_id', 'agreed_sale_price',
  'commission_mode', 'commission_percent', 'commission_amount', 'deposit_amount', 'balance_amount',
  'ownership_transfer_status', 'handover_status', 'handover_date', 'settlement_date',
  'commission_status', 'commission_collected_at', 'status', 'notes',
];

// SOP Step 24 — derive commission and balance from the agreed price.
function derive(data, current = {}) {
  const price = Number(data.agreed_sale_price ?? current.agreed_sale_price ?? 0);
  const mode = data.commission_mode ?? current.commission_mode ?? 'percent';
  if (mode === 'percent') {
    const pct = Number(data.commission_percent ?? current.commission_percent ?? 0);
    if (price && pct) data.commission_amount = Math.round((price * pct) / 100);
  }
  const deposit = Number(data.deposit_amount ?? current.deposit_amount ?? 0);
  if (price) data.balance_amount = Math.max(0, price - deposit);
  return data;
}

exports.list = asyncHandler(async (req, res) => {
  const where = { ...branchScope(req) };
  if (req.query.business_listing_id) where.business_listing_id = req.query.business_listing_id;
  const rows = await BusinessSettlement.findAll({ where, order: [['created_at', 'DESC']] });
  res.json({ data: rows });
});

exports.create = asyncHandler(async (req, res) => {
  const data = derive(pick(req.body, FIELDS));
  if (!data.business_listing_id) return res.status(400).json({ error: 'business_listing_id is required.' });
  data.branch_id = resolveBranchId(req, req.body.branch_id);
  data.created_by = req.user?.id || null;
  data.settlement_code = await generateCode(BusinessSettlement, 'settlement_code', 'SSPC-ST-');
  const row = await BusinessSettlement.create(data);
  res.status(201).json({ data: row, message: 'Settlement created.' });
});

exports.update = asyncHandler(async (req, res) => {
  const row = await BusinessSettlement.findOne({ where: { id: req.params.id, ...branchScope(req) } });
  if (!row) return res.status(404).json({ error: 'Settlement not found.' });
  await row.update(derive(pick(req.body, FIELDS), row.get({ plain: true })));
  res.json({ data: row, message: 'Settlement updated.' });
});

// PATCH /api/business-settlements/:id/collect-commission — SOP Step 24
exports.collectCommission = asyncHandler(async (req, res) => {
  const row = await BusinessSettlement.findOne({ where: { id: req.params.id, ...branchScope(req) } });
  if (!row) return res.status(404).json({ error: 'Settlement not found.' });
  await row.update({ commission_status: 'collected', commission_collected_at: new Date() });
  res.json({ data: row, message: 'Commission marked collected.' });
});

exports.remove = asyncHandler(async (req, res) => {
  const row = await BusinessSettlement.findOne({ where: { id: req.params.id, ...branchScope(req) } });
  if (!row) return res.status(404).json({ error: 'Settlement not found.' });
  await row.destroy();
  res.json({ message: 'Settlement deleted.' });
});
