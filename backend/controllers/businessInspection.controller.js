const BusinessInspection = require('../models/BusinessInspection');
const { asyncHandler, branchScope, resolveBranchId, pick } = require('../utils/controllerHelpers');

const FIELDS = ['business_listing_id', 'business_enquiry_id', 'inspection_type', 'scheduled_date', 'attendees', 'outcome', 'feedback', 'status', 'notes'];

exports.list = asyncHandler(async (req, res) => {
  const where = { ...branchScope(req) };
  if (req.query.business_listing_id) where.business_listing_id = req.query.business_listing_id;
  const rows = await BusinessInspection.findAll({ where, order: [['scheduled_date', 'DESC'], ['created_at', 'DESC']] });
  res.json({ data: rows });
});

exports.create = asyncHandler(async (req, res) => {
  const data = pick(req.body, FIELDS);
  if (!data.business_listing_id) return res.status(400).json({ error: 'business_listing_id is required.' });
  data.branch_id = resolveBranchId(req, req.body.branch_id);
  data.created_by = req.user?.id || null;
  const row = await BusinessInspection.create(data);
  res.status(201).json({ data: row, message: 'Inspection scheduled.' });
});

exports.update = asyncHandler(async (req, res) => {
  const row = await BusinessInspection.findOne({ where: { id: req.params.id, ...branchScope(req) } });
  if (!row) return res.status(404).json({ error: 'Inspection not found.' });
  await row.update(pick(req.body, FIELDS));
  res.json({ data: row, message: 'Inspection updated.' });
});

exports.remove = asyncHandler(async (req, res) => {
  const row = await BusinessInspection.findOne({ where: { id: req.params.id, ...branchScope(req) } });
  if (!row) return res.status(404).json({ error: 'Inspection not found.' });
  await row.destroy();
  res.json({ message: 'Inspection deleted.' });
});
