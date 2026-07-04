const { Op } = require('sequelize');
const sequelize = require('../config/db.config');
const WorkOrder = require('../models/WorkOrder');
const WorkOrderQuote = require('../models/WorkOrderQuote');
const ServiceProvider = require('../models/ServiceProvider');
const Property = require('../models/Property');
const { generateCode } = require('../utils/codeGenerator');
const { asyncHandler, branchScope, resolveBranchId, getPagination, pick } = require('../utils/controllerHelpers');
const maintenance = require('../services/maintenanceWorkflow.service');

const FIELDS = ['project_id', 'provider_id', 'service_id', 'property_id', 'client_id', 'title', 'scope', 'status',
  'scheduled_date', 'completed_date', 'amount', 'provider_notes', 'notes',
  'severity', 'category', 'category_notes', 'estimated_cost', 'approval_threshold',
  'reported_by_type', 'reported_by_contact_id', 'before_photos', 'after_photos'];
const provInc = { model: ServiceProvider, as: 'provider', attributes: ['id', 'company_name'] };
const propInc = { model: Property, as: 'property', attributes: ['id', 'property_code', 'title'] };
const quotesInc = { model: WorkOrderQuote, as: 'quotes', separate: true, order: [['quote_amount', 'ASC']] };

exports.list = asyncHandler(async (req, res) => {
  const { limit, offset, page } = getPagination(req);
  const where = { ...branchScope(req) };
  if (req.query.status) where.status = req.query.status;
  if (req.query.provider_id) where.provider_id = req.query.provider_id;
  if (req.query.property_id) where.property_id = req.query.property_id;
  if (req.query.severity) where.severity = req.query.severity;
  if (req.query.category) where.category = req.query.category;
  if (req.query.tenant_visible_status) where.tenant_visible_status = req.query.tenant_visible_status;
  if (req.query.approval_status) where.approval_status = req.query.approval_status;
  if (req.query.search) where[Op.or] = [{ title: { [Op.like]: `%${req.query.search}%` } }, { work_order_code: { [Op.like]: `%${req.query.search}%` } }];
  const { rows, count } = await WorkOrder.findAndCountAll({ where, include: [provInc, propInc], limit, offset, order: [['created_at', 'DESC']] });

  // Optional lifecycle counts for kanban-style tabs
  let stage_counts;
  if (req.query.include_counts === 'true') {
    const base = { ...branchScope(req) };
    const stages = ['submitted', 'triaged', 'approved', 'scheduled', 'in_progress', 'completed', 'cancelled'];
    stage_counts = {};
    for (const s of stages) stage_counts[s] = await WorkOrder.count({ where: { ...base, tenant_visible_status: s } });
    stage_counts.pending_owner = await WorkOrder.count({ where: { ...base, approval_status: 'pending_owner' } });
    stage_counts.emergency = await WorkOrder.count({ where: { ...base, severity: 'emergency', status: { [Op.notIn]: ['completed', 'cancelled'] } } });
    stage_counts.all = rows.length; // client-visible page — not global
  }

  res.json({ data: rows, pagination: { page, limit, total: count, pages: Math.ceil(count / limit) }, stage_counts });
});

exports.getOne = asyncHandler(async (req, res) => {
  const wo = await WorkOrder.findOne({ where: { id: req.params.id, ...branchScope(req) }, include: [provInc, propInc, quotesInc] });
  if (!wo) return res.status(404).json({ error: 'Work order not found.' });
  res.json({ data: wo });
});

exports.create = asyncHandler(async (req, res) => {
  const data = pick(req.body, FIELDS);
  if (!data.title) return res.status(400).json({ error: 'title is required.' });
  data.branch_id = resolveBranchId(req, req.body.branch_id);
  data.created_by = req.user?.id || null;
  data.work_order_code = await generateCode(WorkOrder, 'work_order_code', 'SSPC-WO-');
  const wo = await WorkOrder.create(data);
  res.status(201).json({ data: wo, message: 'Work order created.' });
});

exports.update = asyncHandler(async (req, res) => {
  const wo = await WorkOrder.findOne({ where: { id: req.params.id, ...branchScope(req) } });
  if (!wo) return res.status(404).json({ error: 'Work order not found.' });
  await wo.update(pick(req.body, FIELDS));
  res.json({ data: wo });
});

// ─── LIFECYCLE ENDPOINTS ────────────────────────────────────────────────────

// POST /api/work-orders/:id/triage
exports.triage = asyncHandler(async (req, res) => {
  const wo = await WorkOrder.findOne({ where: { id: req.params.id, ...branchScope(req) } });
  if (!wo) return res.status(404).json({ error: 'Work order not found.' });
  const updated = await maintenance.triage(wo.id, {
    ...pick(req.body, ['severity', 'category', 'estimated_cost', 'approval_threshold', 'notes']),
    user_id: req.user?.id || null,
  });
  res.json({ data: updated, message: updated.approval_status === 'pending_owner' ? 'Triaged — sent for owner approval.' : 'Triaged — no owner approval needed.' });
});

// POST /api/work-orders/:id/decide (staff-side; landlord decides via /api/landlord/*)
exports.decide = asyncHandler(async (req, res) => {
  const wo = await WorkOrder.findOne({ where: { id: req.params.id, ...branchScope(req) } });
  if (!wo) return res.status(404).json({ error: 'Work order not found.' });
  try {
    const updated = await maintenance.decide(wo.id, pick(req.body, ['decision', 'note']));
    res.json({ data: updated, message: `Work order ${req.body.decision}.` });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

// POST /api/work-orders/:id/assign
exports.assign = asyncHandler(async (req, res) => {
  const wo = await WorkOrder.findOne({ where: { id: req.params.id, ...branchScope(req) } });
  if (!wo) return res.status(404).json({ error: 'Work order not found.' });
  const updated = await maintenance.assign(wo.id, pick(req.body, ['provider_id', 'scheduled_date', 'amount']));
  res.json({ data: updated, message: 'Provider assigned and scheduled.' });
});

// POST /api/work-orders/:id/start
exports.start = asyncHandler(async (req, res) => {
  const wo = await WorkOrder.findOne({ where: { id: req.params.id, ...branchScope(req) } });
  if (!wo) return res.status(404).json({ error: 'Work order not found.' });
  const updated = await maintenance.start(wo.id);
  res.json({ data: updated, message: 'Work started.' });
});

// POST /api/work-orders/:id/complete — completes + auto-creates landlord bill + optional tenant recharge
exports.complete = asyncHandler(async (req, res) => {
  const wo = await WorkOrder.findOne({ where: { id: req.params.id, ...branchScope(req) } });
  if (!wo) return res.status(404).json({ error: 'Work order not found.' });
  const result = await maintenance.complete(wo.id, {
    ...pick(req.body, ['actual_cost', 'after_photos', 'provider_notes', 'tenant_recharge', 'tenant_recharge_amount']),
    user_id: req.user?.id || null,
  });
  res.json({
    data: result.workOrder,
    landlord_bill: result.landlordBill,
    tenant_recharge_invoice: result.tenantRechargeInvoice,
    message: `Work completed. ${result.landlordBill ? `Landlord bill ${result.landlordBill.invoice_code} created.` : ''} ${result.tenantRechargeInvoice ? `Tenant recharge ${result.tenantRechargeInvoice.invoice_code} raised.` : ''}`.trim(),
  });
});

// ─── QUOTES ─────────────────────────────────────────────────────────────────
exports.listQuotes = asyncHandler(async (req, res) => {
  const wo = await WorkOrder.findOne({ where: { id: req.params.id, ...branchScope(req) } });
  if (!wo) return res.status(404).json({ error: 'Work order not found.' });
  const rows = await WorkOrderQuote.findAll({ where: { work_order_id: wo.id }, order: [['quote_amount', 'ASC']] });
  res.json({ data: rows });
});

exports.addQuote = asyncHandler(async (req, res) => {
  const wo = await WorkOrder.findOne({ where: { id: req.params.id, ...branchScope(req) } });
  if (!wo) return res.status(404).json({ error: 'Work order not found.' });
  const q = await WorkOrderQuote.create({
    work_order_id: wo.id,
    ...pick(req.body, ['provider_id', 'provider_name', 'quote_amount', 'quoted_at', 'notes']),
    created_by: req.user?.id || null,
  });
  res.status(201).json({ data: q });
});

exports.selectQuote = asyncHandler(async (req, res) => {
  const wo = await WorkOrder.findOne({ where: { id: req.params.id, ...branchScope(req) } });
  if (!wo) return res.status(404).json({ error: 'Work order not found.' });
  const q = await WorkOrderQuote.findOne({ where: { id: req.params.quoteId, work_order_id: wo.id } });
  if (!q) return res.status(404).json({ error: 'Quote not found.' });
  await WorkOrderQuote.update({ is_selected: false }, { where: { work_order_id: wo.id } });
  await q.update({ is_selected: true });
  await wo.update({ estimated_cost: q.quote_amount, provider_id: q.provider_id || wo.provider_id });
  res.json({ data: q, message: 'Quote selected — WO estimated cost updated.' });
});

exports.removeQuote = asyncHandler(async (req, res) => {
  const q = await WorkOrderQuote.findByPk(req.params.quoteId);
  if (!q) return res.status(404).json({ error: 'Quote not found.' });
  await q.destroy();
  res.json({ message: 'Quote removed.' });
});
