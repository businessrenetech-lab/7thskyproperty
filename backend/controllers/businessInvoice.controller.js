const BusinessInvoice = require('../models/BusinessInvoice');
const BusinessListing = require('../models/BusinessListing');
const { asyncHandler, branchScope, resolveBranchId, getPagination, pick } = require('../utils/controllerHelpers');
const { generateCode } = require('../utils/codeGenerator');

const FIELDS = [
  'business_listing_id', 'settlement_id', 'client_contact_id', 'client_name', 'invoice_type',
  'line_items', 'discount', 'vat_percent', 'status', 'issue_date', 'due_date', 'notes', 'payments',
];
const listingInc = { model: BusinessListing, as: 'listing', attributes: ['id', 'business_code', 'business_name'] };
const num = (v) => Number(v || 0);
// JSON columns in this DB frequently round-trip as strings — parse defensively.
const arr = (v) => {
  if (Array.isArray(v)) return v;
  if (typeof v === 'string') { try { const p = JSON.parse(v); return Array.isArray(p) ? p : []; } catch { return []; } }
  return [];
};

// Recompute money fields + status from line_items and payments (SOP Step 8 fees).
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
  if (req.query.business_listing_id) where.business_listing_id = req.query.business_listing_id;
  if (req.query.status) where.status = req.query.status;
  const { rows, count } = await BusinessInvoice.findAndCountAll({ where, include: [listingInc], limit, offset, order: [['created_at', 'DESC']] });
  res.json({ data: rows, pagination: { page, limit, total: count, pages: Math.ceil(count / limit) } });
});

exports.getOne = asyncHandler(async (req, res) => {
  const row = await BusinessInvoice.findOne({ where: { id: req.params.id, ...branchScope(req) }, include: [listingInc] });
  if (!row) return res.status(404).json({ error: 'Invoice not found.' });
  res.json({ data: row });
});

exports.create = asyncHandler(async (req, res) => {
  const data = derive(pick(req.body, FIELDS));
  if (!data.business_listing_id) return res.status(400).json({ error: 'business_listing_id is required.' });
  data.branch_id = resolveBranchId(req, req.body.branch_id);
  data.created_by = req.user?.id || null;
  data.invoice_code = await generateCode(BusinessInvoice, 'invoice_code', 'SSPC-BI-');
  const row = await BusinessInvoice.create(data);
  res.status(201).json({ data: row, message: 'Invoice created.' });
});

exports.update = asyncHandler(async (req, res) => {
  const row = await BusinessInvoice.findOne({ where: { id: req.params.id, ...branchScope(req) } });
  if (!row) return res.status(404).json({ error: 'Invoice not found.' });
  await row.update(derive(pick(req.body, FIELDS), row.get({ plain: true })));
  res.json({ data: row, message: 'Invoice updated.' });
});

// POST /api/business-invoices/:id/payment — record a payment (SOP Step 8/24)
exports.addPayment = asyncHandler(async (req, res) => {
  const row = await BusinessInvoice.findOne({ where: { id: req.params.id, ...branchScope(req) } });
  if (!row) return res.status(404).json({ error: 'Invoice not found.' });
  const p = pick(req.body, ['amount', 'date', 'method', 'ref']);
  if (!num(p.amount)) return res.status(400).json({ error: 'Payment amount is required.' });
  const cur = row.get({ plain: true });
  const payments = [...arr(cur.payments), { ...p, amount: num(p.amount), date: p.date || new Date().toISOString().slice(0, 10) }];
  await row.update(derive({ payments }, cur));
  res.json({ data: row, message: 'Payment recorded.' });
});

exports.remove = asyncHandler(async (req, res) => {
  const row = await BusinessInvoice.findOne({ where: { id: req.params.id, ...branchScope(req) } });
  if (!row) return res.status(404).json({ error: 'Invoice not found.' });
  await row.destroy();
  res.json({ message: 'Invoice deleted.' });
});
