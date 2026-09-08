/**
 * waterTankUtilities.controller.js — Utility Bill & Connection Assistance register
 * (manifest `utility_coordination: true`; Property Care & Concierge). Tracks utility
 * requests handled on a client's behalf (bill payment, new connection, transfer),
 * with provider/account, amount, client approval and status. Scoped by branch +
 * service_line; refuses lines without the register.
 */
const { Op } = require('sequelize');
const { asyncHandler, branchScope, serviceScope, resolveServiceLine } = require('../utils/controllerHelpers');
const { getServiceLine } = require('../config/serviceLines');
const { generateCode } = require('../utils/codeGenerator');
const { WtUtilityRequest } = require('../models/waterTankPropertyCare');
const M = require('../models/waterTankOps');

const scoped = (req) => ({ ...branchScope(req), ...serviceScope(req) });
const UTILITY_TYPES = ['Electricity', 'Water (WASA)', 'Gas', 'Internet / Telecom', 'Council / Rates', 'Service Charge', 'Other'];
const REQUEST_TYPES = ['Bill Payment', 'New Connection', 'Disconnection', 'Transfer', 'Query / Dispute', 'Meter Reading'];
const STATUSES = ['Requested', 'In Progress', 'Awaiting Client', 'Completed', 'Cancelled'];
const FIELDS = ['property_address', 'utility_type', 'service_request', 'provider', 'account_ref', 'request_date', 'required_date', 'amount', 'client_approval', 'completion_date', 'status', 'notes'];

function ensureUtilities(req, res) {
  if (!getServiceLine(resolveServiceLine(req)).utility_coordination) {
    res.status(404).json({ error: 'Utility Coordination is not enabled for this service line.' });
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
  if (!ensureUtilities(req, res)) return;
  res.json({ utility_types: UTILITY_TYPES, request_types: REQUEST_TYPES, statuses: STATUSES });
});

exports.list = asyncHandler(async (req, res) => {
  if (!ensureUtilities(req, res)) return;
  const where = { ...scoped(req) };
  if (req.query.client_code) where.client_code = req.query.client_code;
  if (req.query.client_id) where.client_id = Number(req.query.client_id);
  if (req.query.status) where.status = req.query.status;
  if (req.query.utility_type) where.utility_type = req.query.utility_type;
  if (req.query.q) {
    const like = { [Op.like]: `%${req.query.q}%` };
    where[Op.or] = [{ provider: like }, { account_ref: like }, { client_code: like }, { property_address: like }, { code: like }];
  }
  res.json(await WtUtilityRequest.findAll({ where, order: [['request_date', 'DESC'], ['createdAt', 'DESC']], raw: true }));
});

exports.summary = asyncHandler(async (req, res) => {
  if (!ensureUtilities(req, res)) return;
  const where = { ...scoped(req) };
  if (req.query.client_code) where.client_code = req.query.client_code;
  const rows = await WtUtilityRequest.findAll({ where, attributes: ['status', 'amount', 'client_approval'], raw: true });
  const byStatus = {}; let amount = 0; let open = 0;
  rows.forEach((r) => {
    byStatus[r.status] = (byStatus[r.status] || 0) + 1;
    amount += Number(r.amount || 0);
    if (!['Completed', 'Cancelled'].includes(r.status)) open += 1;
  });
  res.json({ total: rows.length, open, total_amount: amount, by_status: byStatus });
});

exports.create = asyncHandler(async (req, res) => {
  if (!ensureUtilities(req, res)) return;
  const b = req.body || {};
  const client = await findClient(req, b);
  if (!client) return res.status(404).json({ error: 'Client not found in this service line.' });
  if (!b.utility_type) return res.status(400).json({ error: 'Utility type is required.' });
  const code = await generateCode(WtUtilityRequest, 'code', 'UTL-', 4);
  const payload = { ...scoped(req), code, client_id: client.id, client_code: client.code, property_address: client.service_address || null };
  FIELDS.forEach((k) => { if (b[k] !== undefined && b[k] !== '') payload[k] = b[k]; });
  const row = await WtUtilityRequest.create(payload);
  res.status(201).json(row);
});

exports.update = asyncHandler(async (req, res) => {
  if (!ensureUtilities(req, res)) return;
  const row = await WtUtilityRequest.findOne({ where: { ...scoped(req), id: req.params.id } });
  if (!row) return res.status(404).json({ error: 'Utility request not found.' });
  const b = req.body || {}; const patch = {};
  FIELDS.forEach((k) => { if (b[k] !== undefined) patch[k] = b[k]; });
  await row.update(patch);
  res.json(row);
});

exports.remove = asyncHandler(async (req, res) => {
  if (!ensureUtilities(req, res)) return;
  const row = await WtUtilityRequest.findOne({ where: { ...scoped(req), id: req.params.id } });
  if (!row) return res.status(404).json({ error: 'Utility request not found.' });
  await row.destroy();
  res.json({ ok: true });
});
