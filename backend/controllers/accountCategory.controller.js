const { Op } = require('sequelize');
const AccountCategory = require('../models/AccountCategory');
const { asyncHandler, resolveBranchId, pick } = require('../utils/controllerHelpers');

const FIELDS = ['name', 'code', 'type', 'applies_to', 'default_tax_rate', 'is_billable_to_tenant', 'is_deductible_from_landlord', 'is_active'];

function categoryScope(req) {
  if (req.user?.role === 'super_admin') {
    return req.query.branch_id ? { branch_id: { [Op.or]: [req.query.branch_id, null] } } : {};
  }
  return { branch_id: { [Op.or]: [req.branchId ?? req.user?.branch_id ?? null, null] } };
}

exports.list = asyncHandler(async (req, res) => {
  const where = categoryScope(req);
  if (req.query.active !== 'false') where.is_active = true;
  if (req.query.applies_to) where.applies_to = { [Op.in]: [req.query.applies_to, 'both'] };
  const rows = await AccountCategory.findAll({ where, order: [['name', 'ASC']] });
  res.json({ data: rows });
});

exports.getOne = asyncHandler(async (req, res) => {
  const row = await AccountCategory.findByPk(req.params.id);
  const branchId = req.branchId ?? req.user?.branch_id;
  if (!row || (row.branch_id && req.user?.role !== 'super_admin' && row.branch_id !== branchId)) {
    return res.status(404).json({ error: 'Account category not found.' });
  }
  res.json({ data: row });
});

exports.create = asyncHandler(async (req, res) => {
  const data = pick(req.body, FIELDS);
  if (!data.name) return res.status(400).json({ error: 'Name is required.' });
  data.branch_id = resolveBranchId(req, req.body.branch_id);
  data.created_by = req.user?.id || null;
  const row = await AccountCategory.create(data);
  res.status(201).json({ data: row, message: 'Account category created.' });
});

exports.update = asyncHandler(async (req, res) => {
  const row = await AccountCategory.findByPk(req.params.id);
  if (!row) return res.status(404).json({ error: 'Account category not found.' });
  const branchId = req.branchId ?? req.user?.branch_id;
  if (req.user?.role !== 'super_admin' && row.branch_id !== branchId) return res.status(403).json({ error: 'Cannot edit this category.' });
  await row.update(pick(req.body, FIELDS));
  res.json({ data: row, message: 'Account category updated.' });
});

exports.remove = asyncHandler(async (req, res) => {
  const row = await AccountCategory.findByPk(req.params.id);
  if (!row) return res.status(404).json({ error: 'Account category not found.' });
  const branchId = req.branchId ?? req.user?.branch_id;
  if (req.user?.role !== 'super_admin' && row.branch_id !== branchId) return res.status(403).json({ error: 'Cannot deactivate this category.' });
  await row.update({ is_active: false });
  res.json({ message: 'Account category deactivated.' });
});
