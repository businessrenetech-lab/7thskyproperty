const BusinessTarget = require('../models/BusinessTarget');
const { asyncHandler, branchScope, resolveBranchId, pick } = require('../utils/controllerHelpers');

const FIELDS = ['mandate_id', 'business_listing_id', 'business_name', 'business_type', 'industry', 'location', 'source', 'asking_price', 'fit_score', 'status', 'contact_info', 'notes'];

exports.list = asyncHandler(async (req, res) => {
  const where = { ...branchScope(req) };
  if (req.query.mandate_id) where.mandate_id = req.query.mandate_id;
  const rows = await BusinessTarget.findAll({ where, order: [['fit_score', 'DESC'], ['created_at', 'DESC']] });
  res.json({ data: rows });
});

exports.create = asyncHandler(async (req, res) => {
  const data = pick(req.body, FIELDS);
  if (!data.mandate_id) return res.status(400).json({ error: 'mandate_id is required.' });
  if (!data.business_name || !String(data.business_name).trim()) return res.status(400).json({ error: 'Business name is required.' });
  data.branch_id = resolveBranchId(req, req.body.branch_id);
  data.created_by = req.user?.id || null;
  const row = await BusinessTarget.create(data);
  res.status(201).json({ data: row, message: 'Target added.' });
});

exports.update = asyncHandler(async (req, res) => {
  const row = await BusinessTarget.findOne({ where: { id: req.params.id, ...branchScope(req) } });
  if (!row) return res.status(404).json({ error: 'Target not found.' });
  await row.update(pick(req.body, FIELDS));
  res.json({ data: row, message: 'Target updated.' });
});

exports.remove = asyncHandler(async (req, res) => {
  const row = await BusinessTarget.findOne({ where: { id: req.params.id, ...branchScope(req) } });
  if (!row) return res.status(404).json({ error: 'Target not found.' });
  await row.destroy();
  res.json({ message: 'Target deleted.' });
});
