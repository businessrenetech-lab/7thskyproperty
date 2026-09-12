// interiorVariation.controller.js — Variation Requests for Interior Design
// projects (Schedule/scope changes → re-priced, client-approved). Scoped by
// service_line + branch like the shared ops surface.
const InteriorVariation = require('../models/InteriorVariation');
const { generateCode } = require('../utils/codeGenerator');
const { asyncHandler, branchScope, resolveBranchId, resolveServiceLine, serviceScope, codePrefix, pick } = require('../utils/controllerHelpers');

const scoped = (req) => ({ ...branchScope(req), ...serviceScope(req) });

// GET /api/interior-variations?project_id=&work_order_code=&status=
exports.list = asyncHandler(async (req, res) => {
  const where = { ...scoped(req) };
  if (req.query.project_id) where.project_id = req.query.project_id;
  if (req.query.work_order_code) where.work_order_code = req.query.work_order_code;
  if (req.query.status) where.status = req.query.status;
  const rows = await InteriorVariation.findAll({ where, order: [['id', 'DESC']], limit: Math.min(Number(req.query.limit) || 200, 500) });
  res.json({ data: rows });
});

// GET /api/interior-variations/:code
exports.detail = asyncHandler(async (req, res) => {
  const row = await InteriorVariation.findOne({ where: { variation_code: req.params.code, ...scoped(req) } });
  if (!row) return res.status(404).json({ error: 'Variation not found.' });
  res.json({ data: row });
});

// POST /api/interior-variations
exports.create = asyncHandler(async (req, res) => {
  const data = pick(req.body, ['project_id', 'work_order_code', 'client_name', 'description', 'reason', 'amount_delta', 'timeline_impact']);
  data.branch_id = resolveBranchId(req);
  data.service_line = resolveServiceLine(req);
  data.status = 'draft';
  data.created_by = req.user?.id || null;
  data.variation_code = await generateCode(InteriorVariation, 'variation_code', `${codePrefix(req, 'work_order')}V-`);
  const row = await InteriorVariation.create(data);
  res.status(201).json({ data: row, message: `Variation ${row.variation_code} created.` });
});

// PATCH /api/interior-variations/:code
exports.update = asyncHandler(async (req, res) => {
  const row = await InteriorVariation.findOne({ where: { variation_code: req.params.code, ...scoped(req) } });
  if (!row) return res.status(404).json({ error: 'Variation not found.' });
  if (row.status !== 'draft') return res.status(409).json({ error: 'Only a draft variation can be edited.' });
  await row.update(pick(req.body, ['project_id', 'work_order_code', 'client_name', 'description', 'reason', 'amount_delta', 'timeline_impact', 'status']));
  res.json({ data: row });
});

// POST /api/interior-variations/:code/decision  { decision: 'approved'|'rejected', by? }
exports.decision = asyncHandler(async (req, res) => {
  const decision = String(req.body?.decision || '').toLowerCase();
  if (!['approved', 'rejected'].includes(decision)) return res.status(400).json({ error: "decision must be 'approved' or 'rejected'." });
  const row = await InteriorVariation.findOne({ where: { variation_code: req.params.code, ...scoped(req) } });
  if (!row) return res.status(404).json({ error: 'Variation not found.' });
  await row.update({ status: decision, decided_at: new Date(), decided_by: req.body?.by || req.user?.name || req.user?.email || null });
  res.json({ data: row, message: `Variation ${decision}.` });
});
