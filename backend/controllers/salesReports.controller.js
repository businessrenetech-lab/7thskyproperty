// backend/controllers/salesReports.controller.js
//
// Sales reports & analytics (read-only aggregation) + per-property expense CRUD.
// Company Expense ledger and existing sales dashboards are untouched.
const SalePropertyExpense = require('../models/SalePropertyExpense');
const Property = require('../models/Property');
const { asyncHandler, branchScope, pick } = require('../utils/controllerHelpers');

// ── Per-property expense CRUD ──────────────────────────────────────────────
exports.listExpenses = asyncHandler(async (req, res) => {
  res.json({ data: await SalePropertyExpense.findAll({ where: { ...branchScope(req), property_id: req.params.propertyId }, order: [['spent_on', 'DESC'], ['id', 'DESC']] }) });
});

exports.addExpense = asyncHandler(async (req, res) => {
  const property = await Property.findOne({ where: { id: req.params.propertyId, ...branchScope(req) } });
  if (!property) return res.status(404).json({ error: 'Property not found.' });
  const b = pick(req.body, ['category', 'amount', 'spent_on', 'description']);
  if (!b.amount) return res.status(400).json({ error: 'amount is required.' });
  const row = await SalePropertyExpense.create({ ...b, branch_id: property.branch_id, property_id: property.id, created_by: req.user?.id || null });
  res.status(201).json({ data: row });
});

exports.removeExpense = asyncHandler(async (req, res) => {
  const n = await SalePropertyExpense.destroy({ where: { id: req.params.id, ...branchScope(req) } });
  if (!n) return res.status(404).json({ error: 'Expense not found.' });
  res.json({ ok: true });
});
