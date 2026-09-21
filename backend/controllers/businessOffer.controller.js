const BusinessOffer = require('../models/BusinessOffer');
const { asyncHandler, branchScope, resolveBranchId, pick } = require('../utils/controllerHelpers');
const { generateCode } = require('../utils/codeGenerator');

const FIELDS = [
  'business_listing_id', 'business_enquiry_id', 'buyer_contact_id', 'buyer_name',
  'offer_amount', 'offer_date', 'conditions', 'operational_transition', 'settlement_terms',
  'status', 'counter_amount', 'counter_notes', 'non_circumvention_flag', 'notes',
];

exports.list = asyncHandler(async (req, res) => {
  const where = { ...branchScope(req) };
  if (req.query.business_listing_id) where.business_listing_id = req.query.business_listing_id;
  if (req.query.status) where.status = req.query.status;
  const rows = await BusinessOffer.findAll({ where, order: [['created_at', 'DESC']] });
  res.json({ data: rows });
});

exports.create = asyncHandler(async (req, res) => {
  const data = pick(req.body, FIELDS);
  if (!data.business_listing_id) return res.status(400).json({ error: 'business_listing_id is required.' });
  data.branch_id = resolveBranchId(req, req.body.branch_id);
  data.created_by = req.user?.id || null;
  data.offer_code = await generateCode(BusinessOffer, 'offer_code', 'SSPC-BO-');
  const row = await BusinessOffer.create(data);
  res.status(201).json({ data: row, message: 'Offer recorded.' });
});

exports.update = asyncHandler(async (req, res) => {
  const row = await BusinessOffer.findOne({ where: { id: req.params.id, ...branchScope(req) } });
  if (!row) return res.status(404).json({ error: 'Offer not found.' });
  await row.update(pick(req.body, FIELDS));
  res.json({ data: row, message: 'Offer updated.' });
});

// PATCH /api/business-offers/:id/status — quick status transition (accept/reject/counter/withdraw)
exports.setStatus = asyncHandler(async (req, res) => {
  const row = await BusinessOffer.findOne({ where: { id: req.params.id, ...branchScope(req) } });
  if (!row) return res.status(404).json({ error: 'Offer not found.' });
  const patch = pick(req.body, ['status', 'counter_amount', 'counter_notes']);
  await row.update(patch);
  res.json({ data: row, message: `Offer ${patch.status || 'updated'}.` });
});

exports.remove = asyncHandler(async (req, res) => {
  const row = await BusinessOffer.findOne({ where: { id: req.params.id, ...branchScope(req) } });
  if (!row) return res.status(404).json({ error: 'Offer not found.' });
  await row.destroy();
  res.json({ message: 'Offer deleted.' });
});
