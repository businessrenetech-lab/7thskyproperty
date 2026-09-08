/**
 * waterTankVerifications.controller.js — the Verification Register for the Property
 * Documentation & Verification line (manifest `verification_register: true`). Tracks
 * each verification check / government search with its finding and risk rating
 * (workbook Sheets 8 & 9). Scoped by branch + service_line; refuses lines without
 * the register enabled.
 */
const { Op } = require('sequelize');
const { asyncHandler, branchScope, serviceScope, resolveServiceLine, serviceUi } = require('../utils/controllerHelpers');
const { getServiceLine } = require('../config/serviceLines');
const { generateCode } = require('../utils/codeGenerator');
const { WtVerificationCheck } = require('../models/waterTankVerifications');
const M = require('../models/waterTankOps');

const scoped = (req) => ({ ...branchScope(req), ...serviceScope(req) });
const STATUSES = ['Pending', 'In Progress', 'Completed', 'Blocked'];
const RISK_LEVELS = ['Clear', 'Low', 'Medium', 'High', 'Critical'];
const CHECK_TYPES = ['Deed Verification', 'Chain of Ownership', 'Title Review', 'Registry Search', 'Land Office Search', 'Mutation Search', 'Encumbrance Search', 'Government Record', 'Due Diligence', 'Conveyancing', 'Other'];

function ensureRegister(req, res) {
  if (!getServiceLine(resolveServiceLine(req)).verification_register) {
    res.status(404).json({ error: 'The Verification Register is not enabled for this service line.' });
    return false;
  }
  return true;
}

async function findClient(req, { client_id, client_code }) {
  const where = { ...scoped(req) };
  if (client_id) where.id = client_id;
  else if (client_code) where.code = client_code;
  else return null;
  return M.WtClient.findOne({ where });
}

/** GET /reference — check types, statuses, risk levels and search authorities. */
exports.reference = asyncHandler(async (req, res) => {
  if (!ensureRegister(req, res)) return;
  res.json({
    check_types: CHECK_TYPES,
    statuses: STATUSES,
    risk_levels: RISK_LEVELS,
    authorities: serviceUi(req).assess_sources || [],
  });
});

/** GET / — verification checks for the line. Filters: client_code, status, risk_level, q. */
exports.list = asyncHandler(async (req, res) => {
  if (!ensureRegister(req, res)) return;
  const where = { ...scoped(req) };
  const { client_code, client_id, status, risk_level, q } = req.query;
  if (client_code) where.client_code = client_code;
  if (client_id) where.client_id = Number(client_id);
  if (status) where.status = status;
  if (risk_level) where.risk_level = risk_level;
  if (q) {
    const like = { [Op.like]: `%${q}%` };
    where[Op.or] = [{ check_type: like }, { client_name: like }, { client_code: like }, { authority: like }, { reference_no: like }, { finding: like }, { code: like }];
  }
  const rows = await WtVerificationCheck.findAll({ where, order: [['createdAt', 'DESC']], raw: true });
  res.json(rows);
});

/** GET /summary — counts by status and by risk (for the header + risk dashboard). */
exports.summary = asyncHandler(async (req, res) => {
  if (!ensureRegister(req, res)) return;
  const rows = await WtVerificationCheck.findAll({ where: scoped(req), attributes: ['status', 'risk_level'], raw: true });
  const byStatus = {}; const byRisk = {};
  rows.forEach((r) => { byStatus[r.status] = (byStatus[r.status] || 0) + 1; byRisk[r.risk_level] = (byRisk[r.risk_level] || 0) + 1; });
  const flagged = rows.filter((r) => ['High', 'Critical'].includes(r.risk_level)).length;
  res.json({ total: rows.length, by_status: byStatus, by_risk: byRisk, flagged });
});

const FIELDS = ['check_type', 'authority', 'reference_no', 'status', 'finding', 'risk_level', 'recommended_action', 'notes', 'project_id', 'work_order_code'];

/** POST / — create a verification check for a client. */
exports.create = asyncHandler(async (req, res) => {
  if (!ensureRegister(req, res)) return;
  const b = req.body || {};
  const client = await findClient(req, b);
  if (!client) return res.status(404).json({ error: 'Client not found in this service line.' });
  if (!b.check_type) return res.status(400).json({ error: 'Check type is required.' });
  if (b.status && !STATUSES.includes(b.status)) return res.status(400).json({ error: 'Invalid status.' });
  if (b.risk_level && !RISK_LEVELS.includes(b.risk_level)) return res.status(400).json({ error: 'Invalid risk level.' });
  const code = await generateCode(WtVerificationCheck, 'code', 'VER-', 4);
  const payload = { ...scoped(req), code, client_id: client.id, client_code: client.code, client_name: client.name, created_by: req.user?.name || req.user?.email || 'Staff' };
  FIELDS.forEach((k) => { if (b[k] !== undefined && b[k] !== '') payload[k] = b[k]; });
  const row = await WtVerificationCheck.create(payload);
  res.status(201).json(row);
});

/** PATCH /:id — update status / finding / risk. Stamps verified_date on completion. */
exports.update = asyncHandler(async (req, res) => {
  if (!ensureRegister(req, res)) return;
  const row = await WtVerificationCheck.findOne({ where: { ...scoped(req), id: req.params.id } });
  if (!row) return res.status(404).json({ error: 'Verification check not found.' });
  const b = req.body || {};
  if (b.status && !STATUSES.includes(b.status)) return res.status(400).json({ error: 'Invalid status.' });
  if (b.risk_level && !RISK_LEVELS.includes(b.risk_level)) return res.status(400).json({ error: 'Invalid risk level.' });
  const patch = {};
  FIELDS.forEach((k) => { if (b[k] !== undefined) patch[k] = b[k]; });
  if (b.status === 'Completed' && !row.verified_date && !b.verified_date) {
    patch.verified_date = new Date();
    patch.verified_by = req.user?.name || req.user?.email || 'Staff';
  }
  await row.update(patch);
  res.json(row);
});

/** DELETE /:id */
exports.remove = asyncHandler(async (req, res) => {
  if (!ensureRegister(req, res)) return;
  const row = await WtVerificationCheck.findOne({ where: { ...scoped(req), id: req.params.id } });
  if (!row) return res.status(404).json({ error: 'Verification check not found.' });
  await row.destroy();
  res.json({ ok: true });
});
