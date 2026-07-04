const sequelize = require('../config/db.config');
const RegisterEntry = require('../models/RegisterEntry');
const { asyncHandler, branchScope, resolveBranchId, pick } = require('../utils/controllerHelpers');

const arr = (v) => { if (Array.isArray(v)) return v; try { return JSON.parse(v || '[]'); } catch { return []; } };
const obj = (v) => { if (v && typeof v === 'object') return v; try { return JSON.parse(v || '{}'); } catch { return {}; } };

// GET /api/registers/definitions?vertical_key=leasing
exports.definitions = asyncHandler(async (req, res) => {
  const where = req.query.vertical_key ? 'WHERE vertical_key = :vk AND is_active = 1' : 'WHERE is_active = 1';
  const [defs] = await sequelize.query(
    `SELECT id, vertical_key, register_key, name, columns, sort_order FROM register_definitions ${where} ORDER BY sort_order ASC`,
    { replacements: { vk: req.query.vertical_key } }
  );
  res.json({ data: defs.map((d) => ({ ...d, columns: arr(d.columns) })) });
});

// GET /api/registers/entries?register_definition_id=&project_id=&property_id=&client_id=
exports.listEntries = asyncHandler(async (req, res) => {
  const where = { ...branchScope(req) };
  if (req.query.register_definition_id) where.register_definition_id = req.query.register_definition_id;
  if (req.query.project_id) where.project_id = req.query.project_id;
  if (req.query.property_id) where.property_id = req.query.property_id;
  if (req.query.client_id) where.client_id = req.query.client_id;
  const rows = await RegisterEntry.findAll({ where, order: [['created_at', 'DESC']], limit: 500 });
  res.json({ data: rows.map((r) => ({ ...r.toJSON(), data: obj(r.data) })) });
});

// POST /api/registers/entries
exports.createEntry = asyncHandler(async (req, res) => {
  const body = pick(req.body, ['register_definition_id', 'vertical_key', 'project_id', 'property_id', 'client_id', 'status', 'data']);
  if (!body.register_definition_id) return res.status(400).json({ error: 'register_definition_id is required.' });
  body.branch_id = resolveBranchId(req, req.body.branch_id);
  body.created_by = req.user?.id || null;
  const entry = await RegisterEntry.create(body);
  res.status(201).json({ data: { ...entry.toJSON(), data: obj(entry.data) }, message: 'Entry added.' });
});

// PUT /api/registers/entries/:id
exports.updateEntry = asyncHandler(async (req, res) => {
  const entry = await RegisterEntry.findOne({ where: { id: req.params.id, ...branchScope(req) } });
  if (!entry) return res.status(404).json({ error: 'Entry not found.' });
  await entry.update(pick(req.body, ['data', 'status', 'project_id', 'property_id', 'client_id']));
  res.json({ data: { ...entry.toJSON(), data: obj(entry.data) } });
});

// DELETE /api/registers/entries/:id
exports.removeEntry = asyncHandler(async (req, res) => {
  const entry = await RegisterEntry.findOne({ where: { id: req.params.id, ...branchScope(req) } });
  if (!entry) return res.status(404).json({ error: 'Entry not found.' });
  await entry.destroy();
  res.json({ message: 'Entry removed.' });
});
