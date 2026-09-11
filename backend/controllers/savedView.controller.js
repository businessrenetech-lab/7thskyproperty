// backend/controllers/savedView.controller.js
//
// Per-user saved filter presets. Every query is scoped to the caller
// (req.user.id) + branch; params is opaque JSON the client owns.
const SavedView = require('../models/SavedView');
const { asyncHandler, branchScope, resolveBranchId, pick } = require('../utils/controllerHelpers');

// MySQL JSON columns can come back as strings on some Sequelize/driver combos
// (same quirk the SalesModels jsonField helper guards). Always return params as
// a real object so clients never receive a JSON string.
const obj = (v) => { if (v && typeof v === 'object') return v; try { return JSON.parse(v || '{}'); } catch { return {}; } };
const shape = (row) => { const o = row.toJSON ? row.toJSON() : row; o.params = obj(o.params); return o; };

exports.list = asyncHandler(async (req, res) => {
  const where = { ...branchScope(req), user_id: req.user.id };
  if (req.query.scope) where.scope = req.query.scope;
  const rows = await SavedView.findAll({ where, order: [['created_at', 'ASC']] });
  res.json({ data: rows.map(shape) });
});

exports.create = asyncHandler(async (req, res) => {
  const b = pick(req.body, ['scope', 'name', 'params']);
  if (!b.scope || !b.name) return res.status(400).json({ error: 'scope and name are required.' });
  const row = await SavedView.create({
    branch_id: resolveBranchId(req, req.body.branch_id), user_id: req.user.id,
    scope: b.scope, name: b.name, params: b.params || {},
  });
  res.status(201).json({ data: shape(row) });
});

exports.remove = asyncHandler(async (req, res) => {
  const n = await SavedView.destroy({ where: { id: req.params.id, ...branchScope(req), user_id: req.user.id } });
  if (!n) return res.status(404).json({ error: 'Saved view not found.' });
  res.json({ ok: true });
});
