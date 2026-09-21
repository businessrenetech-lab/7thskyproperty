const BusinessMaintenance = require('../models/BusinessMaintenance');
const { asyncHandler, branchScope, resolveBranchId, pick } = require('../utils/controllerHelpers');

const FIELDS = ['business_listing_id', 'lease_id', 'title', 'description', 'reported_date', 'priority', 'status', 'cost', 'vendor', 'resolved_date', 'notes'];

exports.list = asyncHandler(async (req, res) => {
  const where = { ...branchScope(req) };
  if (req.query.business_listing_id) where.business_listing_id = req.query.business_listing_id;
  if (req.query.status) where.status = req.query.status;
  const rows = await BusinessMaintenance.findAll({ where, order: [['created_at', 'DESC']] });
  res.json({ data: rows });
});

exports.create = asyncHandler(async (req, res) => {
  const data = pick(req.body, FIELDS);
  if (!data.business_listing_id) return res.status(400).json({ error: 'business_listing_id is required.' });
  if (!data.title || !String(data.title).trim()) return res.status(400).json({ error: 'Title is required.' });
  data.branch_id = resolveBranchId(req, req.body.branch_id);
  data.created_by = req.user?.id || null;
  if (!data.reported_date) data.reported_date = new Date().toISOString().slice(0, 10);
  const row = await BusinessMaintenance.create(data);
  res.status(201).json({ data: row, message: 'Maintenance request logged.' });
});

exports.update = asyncHandler(async (req, res) => {
  const row = await BusinessMaintenance.findOne({ where: { id: req.params.id, ...branchScope(req) } });
  if (!row) return res.status(404).json({ error: 'Request not found.' });
  const patch = pick(req.body, FIELDS);
  if (patch.status === 'resolved' && !patch.resolved_date && !row.resolved_date) patch.resolved_date = new Date().toISOString().slice(0, 10);
  await row.update(patch);
  res.json({ data: row, message: 'Maintenance request updated.' });
});

exports.remove = asyncHandler(async (req, res) => {
  const row = await BusinessMaintenance.findOne({ where: { id: req.params.id, ...branchScope(req) } });
  if (!row) return res.status(404).json({ error: 'Request not found.' });
  await row.destroy();
  res.json({ message: 'Maintenance request deleted.' });
});
