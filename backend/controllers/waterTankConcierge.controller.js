/**
 * waterTankConcierge.controller.js — Concierge & Access for the Property Care line
 * (manifest `concierge: true`). Two related registers:
 *   • Access Declarations (ACC-) — key/alarm/pets/valuables/restricted-areas per client property.
 *   • Property Visits (VIS-)     — Entry/Opening & Exit/Closing checklists per work order.
 * Scoped by branch + service_line; refuses lines without concierge.
 */
const { Op } = require('sequelize');
const { asyncHandler, branchScope, serviceScope, resolveServiceLine } = require('../utils/controllerHelpers');
const { getServiceLine } = require('../config/serviceLines');
const { generateCode } = require('../utils/codeGenerator');
const { WtAccessDeclaration, WtPropertyVisit } = require('../models/waterTankPropertyCare');
const M = require('../models/waterTankOps');

const scoped = (req) => ({ ...branchScope(req), ...serviceScope(req) });
const ACCESS_METHODS = ['Key held by Seventh Sky', 'Lockbox', 'Client present', 'Smart lock code', 'Building management', 'Other'];
const VISIT_TYPES = ['Entry', 'Exit'];

function ensureConcierge(req, res) {
  if (!getServiceLine(resolveServiceLine(req)).concierge) {
    res.status(404).json({ error: 'Concierge & Access is not enabled for this service line.' });
    return false;
  }
  return true;
}

async function findClient(req, { client_id, client_code }) {
  const where = { ...scoped(req) };
  if (client_id) where.id = client_id; else if (client_code) where.code = client_code; else return null;
  return M.WtClient.findOne({ where });
}

exports.reference = asyncHandler(async (req, res) => {
  if (!ensureConcierge(req, res)) return;
  res.json({ access_methods: ACCESS_METHODS, visit_types: VISIT_TYPES });
});

exports.summary = asyncHandler(async (req, res) => {
  if (!ensureConcierge(req, res)) return;
  const where = { ...scoped(req) };
  if (req.query.client_code) where.client_code = req.query.client_code;
  const [decls, visits] = await Promise.all([
    WtAccessDeclaration.count({ where }),
    WtPropertyVisit.findAll({ where, attributes: ['visit_type'], raw: true }),
  ]);
  const entry = visits.filter((v) => v.visit_type === 'Entry').length;
  res.json({ declarations: decls, visits: visits.length, entries: entry, exits: visits.length - entry });
});

/* ── Access Declarations ──────────────────────────────────────────────── */
const DECL_FIELDS = ['property_address', 'key_access_method', 'alarm_managed', 'alarm_notes', 'pets', 'vulnerable_persons', 'known_hazards', 'restricted_areas', 'valuables_secured', 'client_authorisation', 'declaration_date', 'notes'];

exports.listDeclarations = asyncHandler(async (req, res) => {
  if (!ensureConcierge(req, res)) return;
  const where = { ...scoped(req) };
  if (req.query.client_code) where.client_code = req.query.client_code;
  if (req.query.client_id) where.client_id = Number(req.query.client_id);
  if (req.query.q) {
    const like = { [Op.like]: `%${req.query.q}%` };
    where[Op.or] = [{ client_code: like }, { property_address: like }, { key_access_method: like }, { code: like }];
  }
  res.json(await WtAccessDeclaration.findAll({ where, order: [['createdAt', 'DESC']], raw: true }));
});

exports.createDeclaration = asyncHandler(async (req, res) => {
  if (!ensureConcierge(req, res)) return;
  const b = req.body || {};
  const client = await findClient(req, b);
  if (!client) return res.status(404).json({ error: 'Client not found in this service line.' });
  const code = await generateCode(WtAccessDeclaration, 'code', 'ACC-', 4);
  const payload = { ...scoped(req), code, client_id: client.id, client_code: client.code, property_address: client.service_address || null };
  DECL_FIELDS.forEach((k) => { if (b[k] !== undefined && b[k] !== '') payload[k] = b[k]; });
  const row = await WtAccessDeclaration.create(payload);
  res.status(201).json(row);
});

exports.updateDeclaration = asyncHandler(async (req, res) => {
  if (!ensureConcierge(req, res)) return;
  const row = await WtAccessDeclaration.findOne({ where: { ...scoped(req), id: req.params.id } });
  if (!row) return res.status(404).json({ error: 'Declaration not found.' });
  const b = req.body || {}; const patch = {};
  DECL_FIELDS.forEach((k) => { if (b[k] !== undefined) patch[k] = b[k]; });
  await row.update(patch);
  res.json(row);
});

exports.removeDeclaration = asyncHandler(async (req, res) => {
  if (!ensureConcierge(req, res)) return;
  const row = await WtAccessDeclaration.findOne({ where: { ...scoped(req), id: req.params.id } });
  if (!row) return res.status(404).json({ error: 'Declaration not found.' });
  await row.destroy();
  res.json({ ok: true });
});

/* ── Property Visits (Entry / Exit) ───────────────────────────────────── */
const VISIT_FIELDS = ['work_order_code', 'property_address', 'visit_type', 'visit_date', 'access_method', 'condition', 'meter_readings', 'security_check', 'doors_locked', 'alarm_activated', 'keys_returned', 'photos', 'issues', 'completed_by', 'notes'];

exports.listVisits = asyncHandler(async (req, res) => {
  if (!ensureConcierge(req, res)) return;
  const where = { ...scoped(req) };
  if (req.query.client_code) where.client_code = req.query.client_code;
  if (req.query.client_id) where.client_id = Number(req.query.client_id);
  if (req.query.work_order_code) where.work_order_code = req.query.work_order_code;
  if (req.query.visit_type) where.visit_type = req.query.visit_type;
  if (req.query.q) {
    const like = { [Op.like]: `%${req.query.q}%` };
    where[Op.or] = [{ client_code: like }, { work_order_code: like }, { property_address: like }, { code: like }];
  }
  res.json(await WtPropertyVisit.findAll({ where, order: [['visit_date', 'DESC'], ['createdAt', 'DESC']], raw: true }));
});

exports.createVisit = asyncHandler(async (req, res) => {
  if (!ensureConcierge(req, res)) return;
  const b = req.body || {};
  const client = await findClient(req, b);
  if (!client) return res.status(404).json({ error: 'Client not found in this service line.' });
  const code = await generateCode(WtPropertyVisit, 'code', 'VIS-', 4);
  const payload = { ...scoped(req), code, client_id: client.id, client_code: client.code, property_address: client.service_address || null, visit_type: b.visit_type || 'Entry' };
  VISIT_FIELDS.forEach((k) => { if (b[k] !== undefined && b[k] !== '') payload[k] = b[k]; });
  const row = await WtPropertyVisit.create(payload);
  res.status(201).json(row);
});

exports.updateVisit = asyncHandler(async (req, res) => {
  if (!ensureConcierge(req, res)) return;
  const row = await WtPropertyVisit.findOne({ where: { ...scoped(req), id: req.params.id } });
  if (!row) return res.status(404).json({ error: 'Visit not found.' });
  const b = req.body || {}; const patch = {};
  VISIT_FIELDS.forEach((k) => { if (b[k] !== undefined) patch[k] = b[k]; });
  await row.update(patch);
  res.json(row);
});

exports.removeVisit = asyncHandler(async (req, res) => {
  if (!ensureConcierge(req, res)) return;
  const row = await WtPropertyVisit.findOne({ where: { ...scoped(req), id: req.params.id } });
  if (!row) return res.status(404).json({ error: 'Visit not found.' });
  await row.destroy();
  res.json({ ok: true });
});
