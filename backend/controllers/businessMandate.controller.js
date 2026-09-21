const { Op, fn, col } = require('sequelize');
const BusinessMandate = require('../models/BusinessMandate');
const { asyncHandler, branchScope, resolveBranchId, getPagination, pick } = require('../utils/controllerHelpers');
const { generateCode } = require('../utils/codeGenerator');

const FIELDS = [
  'buyer_contact_id', 'buyer_name', 'buyer_company', 'preferred_business_type', 'preferred_industry',
  'preferred_location', 'budget_min', 'budget_max', 'purchase_purpose', 'financing_status',
  'requirements', 'timeline', 'stage', 'status', 'assigned_to', 'notes',
];

exports.list = asyncHandler(async (req, res) => {
  const { limit, offset, page } = getPagination(req);
  const where = { ...branchScope(req) };
  if (req.query.stage) where.stage = req.query.stage;
  if (req.query.status) where.status = req.query.status;
  if (req.query.search) {
    const s = `%${req.query.search}%`;
    where[Op.or] = [{ buyer_name: { [Op.like]: s } }, { mandate_code: { [Op.like]: s } }, { preferred_industry: { [Op.like]: s } }];
  }
  const { rows, count } = await BusinessMandate.findAndCountAll({ where, limit, offset, order: [['created_at', 'DESC']] });
  res.json({ data: rows, pagination: { page, limit, total: count, pages: Math.ceil(count / limit) } });
});

exports.stats = asyncHandler(async (req, res) => {
  const where = { ...branchScope(req) };
  const [total, byStage, byStatus] = await Promise.all([
    BusinessMandate.count({ where }),
    BusinessMandate.findAll({ where, attributes: ['stage', [fn('COUNT', col('id')), 'n']], group: ['stage'], raw: true }),
    BusinessMandate.findAll({ where, attributes: ['status', [fn('COUNT', col('id')), 'n']], group: ['status'], raw: true }),
  ]);
  res.json({ data: { total, by_stage: Object.fromEntries(byStage.map((r) => [r.stage, Number(r.n)])), by_status: Object.fromEntries(byStatus.map((r) => [r.status, Number(r.n)])) } });
});

exports.getOne = asyncHandler(async (req, res) => {
  const row = await BusinessMandate.findOne({ where: { id: req.params.id, ...branchScope(req) } });
  if (!row) return res.status(404).json({ error: 'Mandate not found.' });
  res.json({ data: row });
});

exports.create = asyncHandler(async (req, res) => {
  const data = pick(req.body, FIELDS);
  if (!data.buyer_name || !String(data.buyer_name).trim()) return res.status(400).json({ error: 'Buyer name is required.' });
  data.branch_id = resolveBranchId(req, req.body.branch_id);
  data.created_by = req.user?.id || null;
  data.mandate_code = await generateCode(BusinessMandate, 'mandate_code', 'SSPC-BM-');
  const row = await BusinessMandate.create(data);
  res.status(201).json({ data: row, message: 'Acquisition mandate created.' });
});

exports.update = asyncHandler(async (req, res) => {
  const row = await BusinessMandate.findOne({ where: { id: req.params.id, ...branchScope(req) } });
  if (!row) return res.status(404).json({ error: 'Mandate not found.' });
  await row.update(pick(req.body, FIELDS));
  res.json({ data: row, message: 'Mandate updated.' });
});

exports.move = asyncHandler(async (req, res) => {
  const row = await BusinessMandate.findOne({ where: { id: req.params.id, ...branchScope(req) } });
  if (!row) return res.status(404).json({ error: 'Mandate not found.' });
  const { stage, status } = pick(req.body, ['stage', 'status']);
  await row.update({ ...(stage ? { stage } : {}), ...(status ? { status } : {}) });
  res.json({ data: row, message: 'Mandate updated.' });
});

exports.remove = asyncHandler(async (req, res) => {
  const row = await BusinessMandate.findOne({ where: { id: req.params.id, ...branchScope(req) } });
  if (!row) return res.status(404).json({ error: 'Mandate not found.' });
  await row.destroy();
  res.json({ message: 'Mandate deleted.' });
});
