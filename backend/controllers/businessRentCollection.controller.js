const BusinessRentCollection = require('../models/BusinessRentCollection');
const { asyncHandler, branchScope, pick } = require('../utils/controllerHelpers');

const num = (v) => Number(v || 0);

exports.list = asyncHandler(async (req, res) => {
  const where = { ...branchScope(req) };
  if (req.query.lease_id) where.lease_id = req.query.lease_id;
  if (req.query.business_listing_id) where.business_listing_id = req.query.business_listing_id;
  const rows = await BusinessRentCollection.findAll({ where, order: [['period_label', 'ASC']] });
  res.json({ data: rows });
});

// PUT /api/business-rent-collections/:id — record rent received (status derived)
exports.update = asyncHandler(async (req, res) => {
  const row = await BusinessRentCollection.findOne({ where: { id: req.params.id, ...branchScope(req) } });
  if (!row) return res.status(404).json({ error: 'Collection not found.' });
  const patch = pick(req.body, ['rent_received', 'paid_date', 'method', 'status', 'notes']);
  const received = num(patch.rent_received != null ? patch.rent_received : row.rent_received);
  const due = num(row.rent_due);
  if (patch.status !== 'waived') {
    patch.status = due > 0 && received >= due ? 'paid' : received > 0 ? 'partial' : 'due';
  }
  if (received > 0 && !patch.paid_date && !row.paid_date) patch.paid_date = new Date().toISOString().slice(0, 10);
  await row.update(patch);
  res.json({ data: row, message: 'Collection updated.' });
});

exports.remove = asyncHandler(async (req, res) => {
  const row = await BusinessRentCollection.findOne({ where: { id: req.params.id, ...branchScope(req) } });
  if (!row) return res.status(404).json({ error: 'Collection not found.' });
  await row.destroy();
  res.json({ message: 'Collection deleted.' });
});
