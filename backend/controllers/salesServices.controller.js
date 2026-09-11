// backend/controllers/salesServices.controller.js
//
// Sales service coordination: aggregate a property's service work orders +
// financial commitments for the property file. Read-only; reuses the general
// WorkOrder engine (creation happens via the existing POST /api/work-orders).
const WorkOrder = require('../models/WorkOrder');
const ServiceProvider = require('../models/ServiceProvider');
const PropertyInvoice = require('../models/PropertyInvoice');
const SalePropertyExpense = require('../models/SalePropertyExpense');
const Property = require('../models/Property');
const { asyncHandler, branchScope } = require('../utils/controllerHelpers');

const arr = (v) => { if (Array.isArray(v)) return v; try { const p = JSON.parse(v || '[]'); return Array.isArray(p) ? p : []; } catch { return []; } };
const num = (v) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };

exports.propertyServices = asyncHandler(async (req, res) => {
  const property = await Property.findOne({ where: { id: req.params.propertyId, ...branchScope(req) } });
  if (!property) return res.status(404).json({ error: 'Property not found.' });
  const pid = property.id; const scope = branchScope(req);

  const [wos, invoices, expenses] = await Promise.all([
    WorkOrder.findAll({ where: { property_id: pid, ...scope }, order: [['created_at', 'DESC']], raw: true }),
    PropertyInvoice.findAll({ where: { property_id: pid, ...scope }, order: [['created_at', 'DESC']], raw: true }),
    SalePropertyExpense.findAll({ where: { property_id: pid, ...scope }, order: [['spent_on', 'DESC'], ['id', 'DESC']], raw: true }),
  ]);

  const provIds = [...new Set(wos.map((w) => w.provider_id).filter(Boolean))];
  const provs = provIds.length ? await ServiceProvider.findAll({ where: { id: provIds }, attributes: ['id', 'company_name'], raw: true }) : [];
  const provName = new Map(provs.map((p) => [p.id, p.company_name]));

  const work_orders = wos.map((w) => ({
    id: w.id, work_order_code: w.work_order_code, title: w.title,
    provider_id: w.provider_id || null, provider_name: w.provider_id ? (provName.get(w.provider_id) || null) : null,
    status: w.status, scheduled_date: w.scheduled_date, completed_date: w.completed_date,
    amount: num(w.amount), before_count: arr(w.before_photos).length, after_count: arr(w.after_photos).length,
  }));

  const invoiced = invoices.reduce((s, i) => s + num(i.total), 0);
  const paid = invoices.reduce((s, i) => s + num(i.amount_paid), 0);
  const work_order_committed = wos.filter((w) => w.status !== 'cancelled').reduce((s, w) => s + num(w.amount), 0);
  const expense_total = expenses.reduce((s, e) => s + num(e.amount), 0);
  const commitments = {
    invoices: invoices.map((i) => ({ invoice_code: i.invoice_code, title: i.title, status: i.status, total: num(i.total), agreement_envelope_id: i.agreement_envelope_id || null })),
    totals: { invoiced: Math.round(invoiced), paid: Math.round(paid), outstanding: Math.round(invoiced - paid), work_order_committed: Math.round(work_order_committed), expenses: Math.round(expense_total), margin: Math.round(paid - expense_total) },
  };
  const expenseRows = expenses.map((e) => ({ id: e.id, category: e.category, amount: num(e.amount), spent_on: e.spent_on, description: e.description }));
  res.json({ work_orders, commitments, expenses: expenseRows });
});
