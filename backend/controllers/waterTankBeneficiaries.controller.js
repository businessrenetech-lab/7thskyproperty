/**
 * waterTankBeneficiaries.controller.js — the Beneficiary / Heirs Register for the
 * Property Will & Succession Support line (manifest `beneficiary_register: true`).
 * Tracks each beneficiary / legal heir and their entitlement (workbook Sheets 3 & 7).
 * Scoped by branch + service_line; refuses lines without the register enabled.
 */
const { Op } = require('sequelize');
const { asyncHandler, branchScope, serviceScope, resolveServiceLine } = require('../utils/controllerHelpers');
const { getServiceLine } = require('../config/serviceLines');
const { generateCode } = require('../utils/codeGenerator');
const { WtBeneficiary } = require('../models/waterTankBeneficiaries');
const M = require('../models/waterTankOps');

const scoped = (req) => ({ ...branchScope(req), ...serviceScope(req) });
const STATUSES = ['Identified', 'Documented', 'Consented', 'Disputed', 'Settled'];
const RELATIONSHIPS = ['Spouse', 'Son', 'Daughter', 'Father', 'Mother', 'Brother', 'Sister', 'Grandchild', 'Nominee', 'Other'];

function ensureRegister(req, res) {
  if (!getServiceLine(resolveServiceLine(req)).beneficiary_register) {
    res.status(404).json({ error: 'The Beneficiary Register is not enabled for this service line.' });
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

/** GET /reference — relationships and statuses for the pickers. */
exports.reference = asyncHandler(async (req, res) => {
  if (!ensureRegister(req, res)) return;
  res.json({ relationships: RELATIONSHIPS, statuses: STATUSES });
});

/** GET / — beneficiaries for the line. Filters: client_code, status, q. */
exports.list = asyncHandler(async (req, res) => {
  if (!ensureRegister(req, res)) return;
  const where = { ...scoped(req) };
  const { client_code, client_id, status, q } = req.query;
  if (client_code) where.client_code = client_code;
  if (client_id) where.client_id = Number(client_id);
  if (status) where.status = status;
  if (q) {
    const like = { [Op.like]: `%${q}%` };
    where[Op.or] = [{ beneficiary_name: like }, { client_name: like }, { client_code: like }, { relationship: like }, { nid_passport: like }, { entitlement: like }, { code: like }];
  }
  const rows = await WtBeneficiary.findAll({ where, order: [['client_code', 'ASC'], ['createdAt', 'ASC']], raw: true });
  res.json(rows);
});

/** GET /summary — counts by status + total share, and per-client share totals to flag over/under 100%. */
exports.summary = asyncHandler(async (req, res) => {
  if (!ensureRegister(req, res)) return;
  const rows = await WtBeneficiary.findAll({ where: scoped(req), attributes: ['status', 'share_percent', 'client_code'], raw: true });
  const byStatus = {}; const shareByClient = {};
  rows.forEach((r) => {
    byStatus[r.status] = (byStatus[r.status] || 0) + 1;
    if (r.client_code) shareByClient[r.client_code] = (shareByClient[r.client_code] || 0) + Number(r.share_percent || 0);
  });
  const disputed = rows.filter((r) => r.status === 'Disputed').length;
  res.json({ total: rows.length, by_status: byStatus, disputed, share_by_client: shareByClient });
});

const FIELDS = ['beneficiary_name', 'relationship', 'nid_passport', 'contact', 'share_percent', 'entitlement', 'status', 'notes', 'project_id'];

/** POST / — add a beneficiary to a client's estate. */
exports.create = asyncHandler(async (req, res) => {
  if (!ensureRegister(req, res)) return;
  const b = req.body || {};
  const client = await findClient(req, b);
  if (!client) return res.status(404).json({ error: 'Client not found in this service line.' });
  if (!b.beneficiary_name) return res.status(400).json({ error: 'Beneficiary name is required.' });
  if (b.status && !STATUSES.includes(b.status)) return res.status(400).json({ error: 'Invalid status.' });
  const code = await generateCode(WtBeneficiary, 'code', 'BEN-', 4);
  const payload = { ...scoped(req), code, client_id: client.id, client_code: client.code, client_name: client.name, created_by: req.user?.name || req.user?.email || 'Staff' };
  FIELDS.forEach((k) => { if (b[k] !== undefined && b[k] !== '') payload[k] = b[k]; });
  const row = await WtBeneficiary.create(payload);
  res.status(201).json(row);
});

/** PATCH /:id */
exports.update = asyncHandler(async (req, res) => {
  if (!ensureRegister(req, res)) return;
  const row = await WtBeneficiary.findOne({ where: { ...scoped(req), id: req.params.id } });
  if (!row) return res.status(404).json({ error: 'Beneficiary not found.' });
  const b = req.body || {};
  if (b.status && !STATUSES.includes(b.status)) return res.status(400).json({ error: 'Invalid status.' });
  const patch = {};
  FIELDS.forEach((k) => { if (b[k] !== undefined) patch[k] = b[k]; });
  await row.update(patch);
  res.json(row);
});

/** DELETE /:id */
exports.remove = asyncHandler(async (req, res) => {
  if (!ensureRegister(req, res)) return;
  const row = await WtBeneficiary.findOne({ where: { ...scoped(req), id: req.params.id } });
  if (!row) return res.status(404).json({ error: 'Beneficiary not found.' });
  await row.destroy();
  res.json({ ok: true });
});
