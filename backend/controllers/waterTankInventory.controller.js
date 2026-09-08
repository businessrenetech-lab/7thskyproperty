/**
 * waterTankInventory.controller.js — the moving inventory list for delivery-by-own-team
 * lines (manifest `inventory: true`; Removal & Relocation). Items being moved on a
 * job (room, qty, fragile/high-value, photo, condition), keyed to the client and
 * (optionally) the work order. The client's Inventory Acknowledgement is captured
 * at agreement signing (Schedule-D checklist); this is the itemised list itself.
 * Scoped by branch + service_line; refuses lines without inventory.
 */
const { Op } = require('sequelize');
const { asyncHandler, branchScope, serviceScope, resolveServiceLine } = require('../utils/controllerHelpers');
const { getServiceLine } = require('../config/serviceLines');
const { WtInventoryItem } = require('../models/waterTankResources');
const M = require('../models/waterTankOps');

const scoped = (req) => ({ ...branchScope(req), ...serviceScope(req) });
const STATUSES = ['Listed', 'Packed', 'Loaded', 'Delivered', 'Damaged', 'Missing'];

function ensureInventory(req, res) {
  if (!getServiceLine(resolveServiceLine(req)).inventory) {
    res.status(404).json({ error: 'Inventory is not enabled for this service line.' });
    return false;
  }
  return true;
}

exports.reference = asyncHandler(async (req, res) => {
  if (!ensureInventory(req, res)) return;
  res.json({ statuses: STATUSES, rooms: ['Living Room', 'Bedroom', 'Kitchen', 'Bathroom', 'Office', 'Store', 'Garage', 'Other'] });
});

exports.list = asyncHandler(async (req, res) => {
  if (!ensureInventory(req, res)) return;
  const where = { ...scoped(req) };
  if (req.query.client_code) where.client_code = req.query.client_code;
  if (req.query.client_id) where.client_id = Number(req.query.client_id);
  if (req.query.work_order_code) where.work_order_code = req.query.work_order_code;
  if (req.query.status) where.status = req.query.status;
  if (req.query.q) {
    const like = { [Op.like]: `%${req.query.q}%` };
    where[Op.or] = [{ item: like }, { room: like }, { client_code: like }, { condition_note: like }];
  }
  res.json(await WtInventoryItem.findAll({ where, order: [['room', 'ASC'], ['createdAt', 'ASC']], raw: true }));
});

exports.summary = asyncHandler(async (req, res) => {
  if (!ensureInventory(req, res)) return;
  const where = { ...scoped(req) };
  if (req.query.client_code) where.client_code = req.query.client_code;
  const rows = await WtInventoryItem.findAll({ where, attributes: ['status', 'qty', 'fragile', 'high_value'], raw: true });
  const byStatus = {}; let items = 0; let fragile = 0; let highValue = 0;
  rows.forEach((r) => { byStatus[r.status] = (byStatus[r.status] || 0) + 1; items += Number(r.qty || 1); if (r.fragile) fragile += 1; if (r.high_value) highValue += 1; });
  res.json({ lines: rows.length, items, fragile, high_value: highValue, by_status: byStatus });
});

async function findClient(req, { client_id, client_code }) {
  const where = { ...scoped(req) };
  if (client_id) where.id = client_id; else if (client_code) where.code = client_code; else return null;
  return M.WtClient.findOne({ where });
}

const FIELDS = ['room', 'item', 'qty', 'fragile', 'high_value', 'photo_url', 'condition_note', 'status', 'work_order_code', 'project_id'];

exports.create = asyncHandler(async (req, res) => {
  if (!ensureInventory(req, res)) return;
  const b = req.body || {};
  const client = await findClient(req, b);
  if (!client) return res.status(404).json({ error: 'Client not found in this service line.' });
  if (!b.item) return res.status(400).json({ error: 'Item is required.' });
  const payload = { ...scoped(req), client_id: client.id, client_code: client.code };
  FIELDS.forEach((k) => { if (b[k] !== undefined && b[k] !== '') payload[k] = b[k]; });
  const row = await WtInventoryItem.create(payload);
  res.status(201).json(row);
});

exports.update = asyncHandler(async (req, res) => {
  if (!ensureInventory(req, res)) return;
  const row = await WtInventoryItem.findOne({ where: { ...scoped(req), id: req.params.id } });
  if (!row) return res.status(404).json({ error: 'Inventory item not found.' });
  const b = req.body || {}; const patch = {};
  FIELDS.forEach((k) => { if (b[k] !== undefined) patch[k] = b[k]; });
  await row.update(patch);
  res.json(row);
});

exports.remove = asyncHandler(async (req, res) => {
  if (!ensureInventory(req, res)) return;
  const row = await WtInventoryItem.findOne({ where: { ...scoped(req), id: req.params.id } });
  if (!row) return res.status(404).json({ error: 'Inventory item not found.' });
  await row.destroy();
  res.json({ ok: true });
});
