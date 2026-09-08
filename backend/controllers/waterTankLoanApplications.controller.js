/**
 * waterTankLoanApplications.controller.js — the Loan Application Tracker for the
 * Loan & Financial Support service line (manifest `loan_tracker: true`). Tracks
 * each loan application to a lender through to its outcome (workbook Sheet 8 +
 * banking liaison). Scoped by branch + service_line; refuses lines without the
 * tracker enabled.
 */
const { Op } = require('sequelize');
const { asyncHandler, branchScope, serviceScope, resolveServiceLine, serviceUi } = require('../utils/controllerHelpers');
const { getServiceLine } = require('../config/serviceLines');
const { generateCode } = require('../utils/codeGenerator');
const { WtLoanApplication } = require('../models/waterTankLoanApplications');
const M = require('../models/waterTankOps');

const scoped = (req) => ({ ...branchScope(req), ...serviceScope(req) });
const STATUSES = ['Enquiry', 'Preparing', 'Submitted', 'Under Review', 'Approved', 'Declined', 'Disbursed', 'Withdrawn'];

function ensureLoanTracker(req, res) {
  if (!getServiceLine(resolveServiceLine(req)).loan_tracker) {
    res.status(404).json({ error: 'The Loan Application Tracker is not enabled for this service line.' });
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

/** GET /reference — status list, loan types and lenders for the pickers. */
exports.reference = asyncHandler(async (req, res) => {
  if (!ensureLoanTracker(req, res)) return;
  const ui = serviceUi(req);
  res.json({
    statuses: STATUSES,
    loan_types: (ui.service_catalogue && ui.service_catalogue['Loan & Mortgage Support']) || [],
    lenders: (ui.equipment && ui.equipment.source_options) || [],
    purposes: (ui.equipment && ui.equipment.type_options) || [],
  });
});

/** GET / — loan applications for the line. Filters: client_code, status, q. */
exports.list = asyncHandler(async (req, res) => {
  if (!ensureLoanTracker(req, res)) return;
  const where = { ...scoped(req) };
  const { client_code, client_id, status, q } = req.query;
  if (client_code) where.client_code = client_code;
  if (client_id) where.client_id = Number(client_id);
  if (status) where.status = status;
  if (q) {
    const like = { [Op.like]: `%${q}%` };
    where[Op.or] = [{ lender: like }, { client_name: like }, { client_code: like }, { loan_type: like }, { outcome: like }, { code: like }, { relationship_manager: like }];
  }
  const rows = await WtLoanApplication.findAll({ where, order: [['createdAt', 'DESC']], raw: true });
  res.json(rows);
});

/** GET /summary — counts by status (for a dashboard header). */
exports.summary = asyncHandler(async (req, res) => {
  if (!ensureLoanTracker(req, res)) return;
  const rows = await WtLoanApplication.findAll({ where: scoped(req), attributes: ['status', 'loan_amount', 'approved_amount'], raw: true });
  const byStatus = {};
  let pipeline = 0, approved = 0;
  rows.forEach((r) => {
    byStatus[r.status] = (byStatus[r.status] || 0) + 1;
    if (!['Declined', 'Withdrawn'].includes(r.status)) pipeline += Number(r.loan_amount || 0);
    if (['Approved', 'Disbursed'].includes(r.status)) approved += Number(r.approved_amount || r.loan_amount || 0);
  });
  res.json({ total: rows.length, by_status: byStatus, pipeline_amount: pipeline, approved_amount: approved });
});

const FIELDS = ['lender', 'relationship_manager', 'loan_type', 'purpose', 'loan_amount', 'approved_amount', 'interest_rate', 'application_date', 'decision_date', 'status', 'outcome', 'notes', 'project_id', 'work_order_code'];

/** POST / — create a loan application for a client. */
exports.create = asyncHandler(async (req, res) => {
  if (!ensureLoanTracker(req, res)) return;
  const b = req.body || {};
  const client = await findClient(req, b);
  if (!client) return res.status(404).json({ error: 'Client not found in this service line.' });
  if (b.status && !STATUSES.includes(b.status)) return res.status(400).json({ error: 'Invalid status.' });
  const code = await generateCode(WtLoanApplication, 'code', 'LAPP-', 4);
  const payload = { ...scoped(req), code, client_id: client.id, client_code: client.code, client_name: client.name, created_by: req.user?.name || req.user?.email || 'Staff' };
  FIELDS.forEach((k) => { if (b[k] !== undefined && b[k] !== '') payload[k] = b[k]; });
  if (!payload.project_id && client.active_project_code) payload.project_id = client.active_project_code;
  const row = await WtLoanApplication.create(payload);
  res.status(201).json(row);
});

/** PATCH /:id — update status / amounts / outcome. */
exports.update = asyncHandler(async (req, res) => {
  if (!ensureLoanTracker(req, res)) return;
  const row = await WtLoanApplication.findOne({ where: { ...scoped(req), id: req.params.id } });
  if (!row) return res.status(404).json({ error: 'Loan application not found.' });
  const b = req.body || {};
  if (b.status && !STATUSES.includes(b.status)) return res.status(400).json({ error: 'Invalid status.' });
  const patch = {};
  FIELDS.forEach((k) => { if (b[k] !== undefined) patch[k] = b[k]; });
  // Stamp a decision date when a decision status is set and none was given.
  if (b.status && ['Approved', 'Declined', 'Disbursed'].includes(b.status) && !row.decision_date && !b.decision_date) {
    patch.decision_date = new Date();
  }
  await row.update(patch);
  res.json(row);
});

/** DELETE /:id */
exports.remove = asyncHandler(async (req, res) => {
  if (!ensureLoanTracker(req, res)) return;
  const row = await WtLoanApplication.findOne({ where: { ...scoped(req), id: req.params.id } });
  if (!row) return res.status(404).json({ error: 'Loan application not found.' });
  await row.destroy();
  res.json({ ok: true });
});
