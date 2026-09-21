const { Op, fn, col } = require('sequelize');
const BusinessRegistrationInvoice = require('../models/BusinessRegistrationInvoice');
const BusinessRegistrationProject = require('../models/BusinessRegistrationProject');
const { asyncHandler, branchScope, resolveBranchId, getPagination, pick } = require('../utils/controllerHelpers');
const { generateCode } = require('../utils/codeGenerator');

const FIELDS = ['project_id', 'client_contact_id', 'client_name', 'invoice_type', 'line_items', 'discount', 'vat_percent', 'status', 'issue_date', 'due_date', 'notes', 'payments'];
const projectInc = { model: BusinessRegistrationProject, as: 'project', attributes: ['id', 'project_code', 'client_name', 'business_name'] };
const num = (v) => Number(v || 0);
// JSON columns in this DB frequently round-trip as strings — parse defensively.
const arr = (v) => {
  if (Array.isArray(v)) return v;
  if (typeof v === 'string') { try { const p = JSON.parse(v); return Array.isArray(p) ? p : []; } catch { return []; } }
  return [];
};

// Recompute money fields + status from line_items and payments.
function derive(data, current = {}) {
  const items = arr(data.line_items ?? current.line_items);
  const subtotal = items.reduce((s, it) => s + num(it.amount ?? (num(it.qty) * num(it.unit_price))), 0);
  const discount = num(data.discount ?? current.discount);
  const vatPct = num(data.vat_percent ?? current.vat_percent);
  const vat = Math.round(((subtotal - discount) * vatPct) / 100);
  const total = Math.max(0, subtotal - discount + vat);
  const payments = arr(data.payments ?? current.payments);
  const paid = payments.reduce((s, p) => s + num(p.amount), 0);
  data.subtotal = subtotal; data.vat_amount = vat; data.total_amount = total; data.paid_amount = paid;
  const cur = data.status ?? current.status;
  if (cur !== 'void') {
    if (total > 0 && paid >= total) data.status = 'paid';
    else if (paid > 0) data.status = 'partial';
    else if (cur === 'partial' || cur === 'paid') data.status = 'sent';
  }
  return data;
}

exports.list = asyncHandler(async (req, res) => {
  const { limit, offset, page } = getPagination(req);
  const where = { ...branchScope(req) };
  if (req.query.project_id) where.project_id = req.query.project_id;
  if (req.query.status) where.status = req.query.status;
  if (req.query.invoice_type) where.invoice_type = req.query.invoice_type;
  const { rows, count } = await BusinessRegistrationInvoice.findAndCountAll({ where, include: [projectInc], limit, offset, order: [['created_at', 'DESC']] });
  res.json({ data: rows, pagination: { page, limit, total: count, pages: Math.ceil(count / limit) } });
});

exports.stats = asyncHandler(async (req, res) => {
  const where = { ...branchScope(req) };
  if (req.query.project_id) where.project_id = req.query.project_id;
  const [invoiced, collected, byStatus] = await Promise.all([
    BusinessRegistrationInvoice.sum('total_amount', { where: { ...where, status: { [Op.ne]: 'void' } } }),
    BusinessRegistrationInvoice.sum('paid_amount', { where: { ...where, status: { [Op.ne]: 'void' } } }),
    BusinessRegistrationInvoice.findAll({ where, attributes: ['status', [fn('COUNT', col('id')), 'n']], group: ['status'], raw: true }),
  ]);
  const totalInvoiced = num(invoiced); const totalCollected = num(collected);
  res.json({ data: { total_invoiced: totalInvoiced, total_collected: totalCollected, outstanding: Math.max(0, totalInvoiced - totalCollected), by_status: Object.fromEntries(byStatus.map((r) => [r.status, Number(r.n)])) } });
});

exports.getOne = asyncHandler(async (req, res) => {
  const row = await BusinessRegistrationInvoice.findOne({ where: { id: req.params.id, ...branchScope(req) }, include: [projectInc] });
  if (!row) return res.status(404).json({ error: 'Invoice not found.' });
  res.json({ data: row });
});

exports.create = asyncHandler(async (req, res) => {
  const data = derive(pick(req.body, FIELDS));
  if (!data.project_id) return res.status(400).json({ error: 'project_id is required.' });
  data.branch_id = resolveBranchId(req, req.body.branch_id);
  data.created_by = req.user?.id || null;
  data.invoice_code = await generateCode(BusinessRegistrationInvoice, 'invoice_code', 'SSPC-BRI-');
  const row = await BusinessRegistrationInvoice.create(data);
  res.status(201).json({ data: row, message: 'Invoice created.' });
});

exports.update = asyncHandler(async (req, res) => {
  const row = await BusinessRegistrationInvoice.findOne({ where: { id: req.params.id, ...branchScope(req) } });
  if (!row) return res.status(404).json({ error: 'Invoice not found.' });
  await row.update(derive(pick(req.body, FIELDS), row.get({ plain: true })));
  res.json({ data: row, message: 'Invoice updated.' });
});

// POST /api/business-registration-invoices/:id/payment — record a payment
exports.addPayment = asyncHandler(async (req, res) => {
  const row = await BusinessRegistrationInvoice.findOne({ where: { id: req.params.id, ...branchScope(req) } });
  if (!row) return res.status(404).json({ error: 'Invoice not found.' });
  const p = pick(req.body, ['amount', 'date', 'method', 'ref']);
  if (!num(p.amount)) return res.status(400).json({ error: 'Payment amount is required.' });
  const cur = row.get({ plain: true });
  const payments = [...arr(cur.payments), { ...p, amount: num(p.amount), date: p.date || new Date().toISOString().slice(0, 10) }];
  await row.update(derive({ payments }, cur));
  res.json({ data: row, message: 'Payment recorded.' });
});

exports.remove = asyncHandler(async (req, res) => {
  const row = await BusinessRegistrationInvoice.findOne({ where: { id: req.params.id, ...branchScope(req) } });
  if (!row) return res.status(404).json({ error: 'Invoice not found.' });
  await row.destroy();
  res.json({ message: 'Invoice deleted.' });
});
