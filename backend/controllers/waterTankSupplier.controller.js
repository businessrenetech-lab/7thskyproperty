// waterTankSupplier.controller.js — supplier / vendor register for project
// costing + accounts payable. Scoped by service_line + branch. A supplier's
// running balance is derived from their bills (billed − paid) + opening balance.
const { Op } = require('sequelize');
const WtSupplier = require('../models/WtSupplier');
const { generateCode } = require('../utils/codeGenerator');
const { asyncHandler, branchScope, resolveBranchId, resolveServiceLine, serviceScope, serviceUi, codePrefix, pick } = require('../utils/controllerHelpers');

const num = (v) => Number(v || 0);
const round2 = (v) => Math.round(num(v) * 100) / 100;
const scoped = (req) => ({ ...branchScope(req), ...serviceScope(req) });
const FIELDS = ['name', 'category', 'contact_person', 'phone', 'email', 'address', 'bank_details', 'opening_balance', 'notes', 'is_active'];

// Bills are added in the next increment; resolve lazily so this works either way.
function billsModel() { try { return require('../models/WtSupplierBill'); } catch { return null; } }

// Running balance for a set of suppliers: opening + Σ(bill.balance still owed).
async function balancesFor(supplierIds, req) {
  const out = {};
  const Bill = billsModel();
  if (!Bill || !supplierIds.length) return out;
  const bills = await Bill.findAll({
    where: { ...scoped(req), supplier_id: { [Op.in]: supplierIds }, status: { [Op.ne]: 'void' } },
    attributes: ['supplier_id', 'total', 'amount_paid'], raw: true,
  }).catch(() => []);
  for (const b of bills) {
    const owed = num(b.total) - num(b.amount_paid);
    out[b.supplier_id] = round2((out[b.supplier_id] || 0) + owed);
  }
  return out;
}

// GET /api/wt-suppliers?q=&category=&active=
exports.list = asyncHandler(async (req, res) => {
  const where = { ...scoped(req) };
  if (req.query.category) where.category = req.query.category;
  if (req.query.active === 'true') where.is_active = true;
  if (req.query.q && String(req.query.q).trim()) {
    const like = { [Op.like]: `%${String(req.query.q).trim()}%` };
    where[Op.or] = [{ name: like }, { code: like }, { phone: like }, { email: like }, { contact_person: like }, { category: like }];
  }
  const rows = await WtSupplier.findAll({ where, order: [['name', 'ASC']], limit: 500 });
  const bal = await balancesFor(rows.map((r) => r.id), req);
  res.json({
    data: rows.map((r) => ({ ...r.get({ plain: true }), payable: round2(num(r.opening_balance) + (bal[r.id] || 0)) })),
    categories: serviceUi(req).supplier_categories || [],
  });
});

// GET /api/wt-suppliers/:code — supplier + a simple statement (bills + running balance).
exports.detail = asyncHandler(async (req, res) => {
  const s = await WtSupplier.findOne({ where: { code: req.params.code, ...scoped(req) } });
  if (!s) return res.status(404).json({ error: 'Supplier not found.' });
  const Bill = billsModel();
  let bills = [];
  if (Bill) {
    bills = await Bill.findAll({ where: { ...scoped(req), supplier_id: s.id }, order: [['id', 'DESC']], raw: true }).catch(() => []);
  }
  const outstanding = bills.filter((b) => b.status !== 'void').reduce((t, b) => t + (num(b.total) - num(b.amount_paid)), 0);
  res.json({
    data: s,
    bills,
    summary: {
      opening_balance: round2(s.opening_balance),
      billed: round2(bills.reduce((t, b) => t + (b.status !== 'void' ? num(b.total) : 0), 0)),
      paid: round2(bills.reduce((t, b) => t + (b.status !== 'void' ? num(b.amount_paid) : 0), 0)),
      payable: round2(num(s.opening_balance) + outstanding),
    },
  });
});

// POST /api/wt-suppliers
exports.create = asyncHandler(async (req, res) => {
  const data = pick(req.body, FIELDS);
  if (!data.name) return res.status(400).json({ error: 'Supplier name is required.' });
  data.branch_id = resolveBranchId(req);
  data.service_line = resolveServiceLine(req);
  data.created_by = req.user?.id || null;
  data.code = await generateCode(WtSupplier, 'code', codePrefix(req, 'supplier'));
  const row = await WtSupplier.create(data);
  res.status(201).json({ data: row, message: `Supplier ${row.code} added.` });
});

// PATCH /api/wt-suppliers/:code
exports.update = asyncHandler(async (req, res) => {
  const s = await WtSupplier.findOne({ where: { code: req.params.code, ...scoped(req) } });
  if (!s) return res.status(404).json({ error: 'Supplier not found.' });
  await s.update(pick(req.body, FIELDS));
  res.json({ data: s });
});
