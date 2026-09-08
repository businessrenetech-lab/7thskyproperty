/**
 * waterTankAssets.controller.js — the per-property Asset & Maintenance register
 * (manifest `asset_register: true`; Property Care & Concierge). Tracks the assets
 * at a client's property (brand/model/serial, condition, last service, next service
 * due, warranty expiry) so recurring maintenance can be scheduled and warranties
 * watched. Scoped by branch + service_line; refuses lines without the register.
 */
const { Op } = require('sequelize');
const { asyncHandler, branchScope, serviceScope, resolveServiceLine } = require('../utils/controllerHelpers');
const { getServiceLine } = require('../config/serviceLines');
const { generateCode } = require('../utils/codeGenerator');
const { WtPropertyAsset } = require('../models/waterTankPropertyCare');
const M = require('../models/waterTankOps');

const scoped = (req) => ({ ...branchScope(req), ...serviceScope(req) });
const CATEGORIES = ['Appliance', 'HVAC', 'Plumbing', 'Electrical', 'Garden', 'Security', 'Structure', 'Furnishing', 'Other'];
const CONDITIONS = ['Excellent', 'Good', 'Fair', 'Poor', 'Needs Repair'];
const STATUSES = ['Active', 'Due', 'Overdue', 'Retired'];
const FIELDS = ['property_address', 'area', 'category', 'brand_model', 'serial_no', 'condition', 'last_service_date', 'next_service_due', 'warranty_expiry', 'responsible_tech', 'maintenance_requirement', 'est_cost', 'photo_url', 'status', 'notes'];

function ensureAssetRegister(req, res) {
  if (!getServiceLine(resolveServiceLine(req)).asset_register) {
    res.status(404).json({ error: 'The asset register is not enabled for this service line.' });
    return false;
  }
  return true;
}

exports.reference = asyncHandler(async (req, res) => {
  if (!ensureAssetRegister(req, res)) return;
  res.json({ categories: CATEGORIES, conditions: CONDITIONS, statuses: STATUSES });
});

exports.list = asyncHandler(async (req, res) => {
  if (!ensureAssetRegister(req, res)) return;
  const where = { ...scoped(req) };
  if (req.query.client_code) where.client_code = req.query.client_code;
  if (req.query.client_id) where.client_id = Number(req.query.client_id);
  if (req.query.status) where.status = req.query.status;
  if (req.query.category) where.category = req.query.category;
  if (req.query.q) {
    const like = { [Op.like]: `%${req.query.q}%` };
    where[Op.or] = [{ area: like }, { brand_model: like }, { serial_no: like }, { client_code: like }, { property_address: like }, { code: like }];
  }
  res.json(await WtPropertyAsset.findAll({ where, order: [['next_service_due', 'ASC'], ['createdAt', 'DESC']], raw: true }));
});

exports.summary = asyncHandler(async (req, res) => {
  if (!ensureAssetRegister(req, res)) return;
  const where = { ...scoped(req) };
  if (req.query.client_code) where.client_code = req.query.client_code;
  const rows = await WtPropertyAsset.findAll({ where, attributes: ['next_service_due', 'warranty_expiry', 'status'], raw: true });
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const soon = new Date(today); soon.setDate(soon.getDate() + 30);
  const asDate = (v) => (v ? new Date(v) : null);
  let dueSoon = 0; let overdue = 0; let warrantyExpiring = 0;
  const byStatus = {};
  rows.forEach((r) => {
    byStatus[r.status] = (byStatus[r.status] || 0) + 1;
    const nd = asDate(r.next_service_due);
    if (nd) { if (nd < today) overdue += 1; else if (nd <= soon) dueSoon += 1; }
    const we = asDate(r.warranty_expiry);
    if (we && we >= today && we <= soon) warrantyExpiring += 1;
  });
  res.json({ total: rows.length, due_soon: dueSoon, overdue, warranty_expiring: warrantyExpiring, by_status: byStatus });
});

async function findClient(req, { client_id, client_code }) {
  const where = { ...scoped(req) };
  if (client_id) where.id = client_id; else if (client_code) where.code = client_code; else return null;
  return M.WtClient.findOne({ where });
}

exports.create = asyncHandler(async (req, res) => {
  if (!ensureAssetRegister(req, res)) return;
  const b = req.body || {};
  const client = await findClient(req, b);
  if (!client) return res.status(404).json({ error: 'Client not found in this service line.' });
  if (!b.area && !b.brand_model) return res.status(400).json({ error: 'Asset / area is required.' });
  const code = await generateCode(WtPropertyAsset, 'code', 'AST-', 4);
  const payload = { ...scoped(req), code, client_id: client.id, client_code: client.code, property_address: client.service_address || null };
  FIELDS.forEach((k) => { if (b[k] !== undefined && b[k] !== '') payload[k] = b[k]; });
  const row = await WtPropertyAsset.create(payload);
  res.status(201).json(row);
});

exports.update = asyncHandler(async (req, res) => {
  if (!ensureAssetRegister(req, res)) return;
  const row = await WtPropertyAsset.findOne({ where: { ...scoped(req), id: req.params.id } });
  if (!row) return res.status(404).json({ error: 'Asset not found.' });
  const b = req.body || {}; const patch = {};
  FIELDS.forEach((k) => { if (b[k] !== undefined) patch[k] = b[k]; });
  await row.update(patch);
  res.json(row);
});

exports.remove = asyncHandler(async (req, res) => {
  if (!ensureAssetRegister(req, res)) return;
  const row = await WtPropertyAsset.findOne({ where: { ...scoped(req), id: req.params.id } });
  if (!row) return res.status(404).json({ error: 'Asset not found.' });
  await row.destroy();
  res.json({ ok: true });
});
