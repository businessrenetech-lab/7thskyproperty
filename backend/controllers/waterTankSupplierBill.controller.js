// waterTankSupplierBill.controller.js — accounts payable. A bill is what we owe a
// supplier for a project (materials/furniture/labour/etc). Paying a bill records a
// money-OUT disbursement (wt_project_disbursements) and reduces the balance, so the
// project cost sheet and the supplier's running balance stay in sync.
const { Op } = require('sequelize');
const sequelize = require('../config/db.config');
const WtSupplierBill = require('../models/WtSupplierBill');
const WtSupplier = require('../models/WtSupplier');
const M = require('../models/waterTankOps');
const { generateCode } = require('../utils/codeGenerator');
const { asyncHandler, branchScope, resolveBranchId, resolveServiceLine, serviceScope, serviceUi, codePrefix, pick } = require('../utils/controllerHelpers');

const num = (v) => Number(v || 0);
const round2 = (v) => Math.round(num(v) * 100) / 100;
const scoped = (req) => ({ ...branchScope(req), ...serviceScope(req) });
const statusFor = (total, paid) => (num(paid) <= 0 ? 'unpaid' : num(paid) + 0.009 >= num(total) ? 'paid' : 'partial');

// GET /api/wt-supplier-bills?project_code=&supplier_id=&status=&q=
exports.list = asyncHandler(async (req, res) => {
  const where = { ...scoped(req) };
  if (req.query.project_code) where.project_code = req.query.project_code;
  if (req.query.supplier_id) where.supplier_id = req.query.supplier_id;
  if (req.query.status) where.status = req.query.status;
  if (req.query.q && String(req.query.q).trim()) {
    const like = { [Op.like]: `%${String(req.query.q).trim()}%` };
    where[Op.or] = [{ bill_code: like }, { supplier_name: like }, { description: like }, { category: like }, { project_code: like }];
  }
  const rows = await WtSupplierBill.findAll({ where, order: [['id', 'DESC']], limit: 500 });
  const totals = rows.reduce((t, b) => {
    if (b.status === 'void') return t;
    t.billed += num(b.total); t.paid += num(b.amount_paid); t.outstanding += num(b.balance); return t;
  }, { billed: 0, paid: 0, outstanding: 0 });
  res.json({
    data: rows,
    summary: { billed: round2(totals.billed), paid: round2(totals.paid), outstanding: round2(totals.outstanding) },
    categories: serviceUi(req).cost_categories || [],
  });
});

// POST /api/wt-supplier-bills  { supplier_id, project_code?, category, description?, total, bill_date?, due_date?, bill_url? }
exports.create = asyncHandler(async (req, res) => {
  const b = req.body || {};
  if (!b.supplier_id) return res.status(400).json({ error: 'Choose a supplier.' });
  if (num(b.total) <= 0) return res.status(400).json({ error: 'Bill amount must be greater than zero.' });
  const supplier = await WtSupplier.findOne({ where: { id: b.supplier_id, ...scoped(req) } });
  if (!supplier) return res.status(404).json({ error: 'Supplier not found.' });

  const total = round2(b.total);
  const row = await WtSupplierBill.create({
    branch_id: resolveBranchId(req), service_line: resolveServiceLine(req),
    bill_code: await generateCode(WtSupplierBill, 'bill_code', codePrefix(req, 'supplier_bill')),
    supplier_id: supplier.id, supplier_name: supplier.name,
    ...pick(b, ['project_code', 'category', 'description', 'bill_date', 'due_date', 'bill_url', 'notes']),
    total, amount_paid: 0, balance: total, status: 'unpaid',
    created_by: req.user?.id || null,
  });
  res.status(201).json({ data: row, message: `Bill ${row.bill_code} recorded — ${supplier.name} owes-us ${total.toLocaleString()}.` });
});

// POST /api/wt-supplier-bills/:code/pay  { amount, method?, reference?, paid_on? }
// Records a payment: a money-OUT disbursement on the project + reduces the bill.
exports.pay = asyncHandler(async (req, res) => {
  const amount = round2(req.body?.amount);
  if (amount <= 0) return res.status(400).json({ error: 'Enter an amount greater than zero.' });
  const result = await sequelize.transaction(async (t) => {
    const bill = await WtSupplierBill.findOne({ where: { bill_code: req.params.code, ...scoped(req) }, transaction: t, lock: t.LOCK.UPDATE });
    if (!bill) { const e = new Error('Bill not found.'); e.status = 404; throw e; }
    if (bill.status === 'void') { const e = new Error('This bill is void.'); e.status = 409; throw e; }
    if (amount > num(bill.balance) + 0.009) { const e = new Error(`Payment exceeds the outstanding balance of ${num(bill.balance).toLocaleString()}.`); e.status = 400; throw e; }

    // Money-OUT disbursement against the project, tagged to this supplier + bill.
    const disb = await M.WtProjectDisbursement.create({
      branch_id: bill.branch_id, service_line: bill.service_line,
      code: await generateCode(M.WtProjectDisbursement, 'code', 'WD-'),
      project_code: bill.project_code || null, category: bill.category,
      payee: bill.supplier_name, payee_type: 'Supplier',
      disbursement_type: 'direct',
      description: `Payment for supplier bill ${bill.bill_code}${bill.description ? ` — ${bill.description}` : ''}`,
      amount, status: 'Paid',
      paid_on: req.body?.paid_on || new Date().toISOString().slice(0, 10),
      method: req.body?.method || 'bank_transfer', reference: req.body?.reference || bill.bill_code,
      paid_by: req.user?.name || req.user?.email || 'Accounts', requested_by: req.user?.name || null,
    }, { transaction: t });

    const paid = round2(num(bill.amount_paid) + amount);
    await bill.update({ amount_paid: paid, balance: round2(num(bill.total) - paid), status: statusFor(bill.total, paid) }, { transaction: t });
    return { bill, disb };
  });
  res.json({ data: result.bill, disbursement_code: result.disb.code, message: `Paid ${amount.toLocaleString()} — bill ${result.bill.bill_code} is now ${result.bill.status}.` });
});

// POST /api/wt-supplier-bills/:code/void
exports.void = asyncHandler(async (req, res) => {
  const bill = await WtSupplierBill.findOne({ where: { bill_code: req.params.code, ...scoped(req) } });
  if (!bill) return res.status(404).json({ error: 'Bill not found.' });
  if (num(bill.amount_paid) > 0) return res.status(409).json({ error: 'This bill has payments against it — reverse those first.' });
  await bill.update({ status: 'void', balance: 0 });
  res.json({ data: bill, message: `Bill ${bill.bill_code} voided.` });
});
