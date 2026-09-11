// backend/controllers/messageTemplate.controller.js
// CRUD for reusable inbox message templates (branch + scope scoped).
const MessageTemplate = require('../models/MessageTemplate');
const { asyncHandler, branchScope, resolveBranchId, pick } = require('../utils/controllerHelpers');

const FIELDS = ['name', 'channel', 'scope', 'subject', 'body', 'is_active'];

exports.list = asyncHandler(async (req, res) => {
  const where = { ...branchScope(req) };
  if (req.query.scope) where.scope = req.query.scope;
  if (req.query.channel && req.query.channel !== 'any') where.channel = [req.query.channel, 'any'];
  res.json({ data: await MessageTemplate.findAll({ where, order: [['name', 'ASC']] }) });
});

exports.create = asyncHandler(async (req, res) => {
  const b = pick(req.body, FIELDS);
  if (!b.name || !b.body) return res.status(400).json({ error: 'name and body are required.' });
  const row = await MessageTemplate.create({ ...b, scope: b.scope || 'sales', branch_id: resolveBranchId(req, req.body.branch_id), created_by: req.user?.id || null });
  res.status(201).json({ data: row });
});

exports.update = asyncHandler(async (req, res) => {
  const row = await MessageTemplate.findOne({ where: { id: req.params.id, ...branchScope(req) } });
  if (!row) return res.status(404).json({ error: 'Template not found.' });
  await row.update(pick(req.body, FIELDS));
  res.json({ data: row });
});

exports.remove = asyncHandler(async (req, res) => {
  const n = await MessageTemplate.destroy({ where: { id: req.params.id, ...branchScope(req) } });
  if (!n) return res.status(404).json({ error: 'Template not found.' });
  res.json({ ok: true });
});
