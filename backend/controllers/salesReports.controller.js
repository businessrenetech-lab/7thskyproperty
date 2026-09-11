// backend/controllers/salesReports.controller.js
//
// Sales reports & analytics (read-only aggregation) + per-property expense CRUD.
// Company Expense ledger and existing sales dashboards are untouched.
const { Op } = require('sequelize');
const SalePropertyExpense = require('../models/SalePropertyExpense');
const Property = require('../models/Property');
const PropertyDeal = require('../models/PropertyDeal');
const PropertyInvoice = require('../models/PropertyInvoice');
const SalesEnquiry = require('../models/SalesEnquiry');
const Communication = require('../models/Communication');
const User = require('../models/User');
const { businessDaysBetween } = require('../utils/businessDays');
const { asyncHandler, branchScope, pick } = require('../utils/controllerHelpers');

const num = (v) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };
const ymd = (d) => { if (!d) return null; const t = new Date(d); return Number.isNaN(t.getTime()) ? null : t.toISOString().slice(0, 10); };
const daysBetween = (a, b) => { const ta = new Date(a).getTime(); const tb = new Date(b).getTime(); if (Number.isNaN(ta) || Number.isNaN(tb)) return 0; return Math.max(0, Math.round((tb - ta) / 86400000)); };

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

// ── GET /api/sales/reports?from&to[&category] — read-only aggregation ───────
exports.report = asyncHandler(async (req, res) => {
  const scope = branchScope(req);
  const now = new Date();
  const from = req.query.from || new Date(now.getTime() - 90 * 86400000).toISOString().slice(0, 10);
  const to = req.query.to || now.toISOString().slice(0, 10);
  const inRange = (d) => d && ymd(d) >= from && ymd(d) <= to;

  // Category → property id filter (optional).
  let propFilter = null;
  if (req.query.category) {
    const props = await Property.findAll({ where: { ...scope, listing_type: 'sale', category: req.query.category }, attributes: ['id'], raw: true });
    propFilter = props.map((p) => p.id);
  }
  const dealWhere = { ...scope, ...(propFilter ? { property_id: { [Op.in]: propFilter } } : {}) };

  const [deals, invoices, enquiries, expenses, profiles] = await Promise.all([
    PropertyDeal.findAll({ where: dealWhere, raw: true }),
    PropertyInvoice.findAll({ where: { ...scope, ...(propFilter ? { property_id: { [Op.in]: propFilter } } : {}) }, raw: true }),
    SalesEnquiry.findAll({ where: { ...scope, ...(propFilter ? { property_id: { [Op.in]: propFilter } } : {}) }, raw: true }),
    SalePropertyExpense.findAll({ where: { ...scope, ...(propFilter ? { property_id: { [Op.in]: propFilter } } : {}) }, raw: true }),
    require('../models/SalesModels').SaleProfile.findAll({ where: { ...scope, ...(propFilter ? { property_id: { [Op.in]: propFilter } } : {}) }, raw: true }),
  ]);

  // property + user name id-maps
  const propIds = [...new Set([...deals, ...invoices, ...expenses, ...profiles].map((r) => r.property_id).filter(Boolean))];
  const props = propIds.length ? await Property.findAll({ where: { id: propIds }, attributes: ['id', 'property_code', 'title'], raw: true }) : [];
  const propName = new Map(props.map((p) => [p.id, p.property_code || p.title || `#${p.id}`]));
  const userIds = [...new Set([...deals.map((d) => d.assigned_to), ...enquiries.map((e) => e.assigned_officer_id)].filter(Boolean))];
  const users = userIds.length ? await User.findAll({ where: { id: userIds }, attributes: ['id', 'name'], raw: true }) : [];
  const userName = new Map(users.map((u) => [u.id, u.name || `User ${u.id}`]));

  // ── pipeline (all open) + conversion (created in range) ──
  const STAGES = ['lead', 'negotiation', 'agreed', 'settlement', 'completed', 'cancelled'];
  const pipeline = STAGES.map((st) => {
    const ds = deals.filter((d) => d.status === st);
    const avg = (arr, f) => (arr.length ? Math.round(arr.reduce((s, x) => s + f(x), 0) / arr.length) : 0);
    return { status: st, count: ds.length, avg_age_days: avg(ds, (d) => daysBetween(d.created_at || d.createdAt, now)), avg_days_in_stage: avg(ds, (d) => daysBetween(d.updated_at || d.updatedAt, now)) };
  });
  const createdInRange = deals.filter((d) => inRange(d.created_at || d.createdAt));
  const reachedAgreed = createdInRange.filter((d) => ['agreed', 'settlement', 'completed'].includes(d.status)).length;
  const completed = createdInRange.filter((d) => d.status === 'completed').length;
  const conversion = { created: createdInRange.length, reached_agreed: reachedAgreed, completed, agreed_rate: createdInRange.length ? Math.round((reachedAgreed / createdInRange.length) * 100) : 0, completed_rate: createdInRange.length ? Math.round((completed / createdInRange.length) * 100) : 0 };

  // ── settlement forecast (settlement_date in range) + overdue receivables ──
  const forecastMap = new Map();
  for (const d of deals) {
    if (!inRange(d.settlement_date) || ['completed', 'cancelled'].includes(d.status)) continue;
    const m = ymd(d.settlement_date).slice(0, 7);
    const cur = forecastMap.get(m) || { month: m, count: 0, expected_value: 0 };
    cur.count += 1; cur.expected_value += num(d.sale_price); forecastMap.set(m, cur);
  }
  const settlement_forecast = [...forecastMap.values()].sort((a, b) => a.month.localeCompare(b.month)).map((r) => ({ ...r, expected_value: Math.round(r.expected_value) }));
  const todayStr = now.toISOString().slice(0, 10);
  const overdue_receivables = deals
    .filter((d) => ['unpaid', 'partial'].includes(d.payment_status) && d.settlement_date && ymd(d.settlement_date) < todayStr && !['cancelled'].includes(d.status))
    .map((d) => ({ property: propName.get(d.property_id) || null, settlement_date: ymd(d.settlement_date), expected: Math.round(num(d.sale_price)), status: d.payment_status }));

  // ── fees expected vs invoiced vs collected (per property) ──
  const invByProp = new Map();
  for (const i of invoices) { const k = i.property_id; if (!k) continue; const c = invByProp.get(k) || { invoiced: 0, collected: 0 }; c.invoiced += num(i.total); c.collected += num(i.amount_paid); invByProp.set(k, c); }
  const dealByProp = new Map(deals.map((d) => [d.property_id, d]));
  const feeRows = [];
  const feeTotals = { expected: 0, invoiced: 0, collected: 0 };
  for (const p of profiles) {
    const d = dealByProp.get(p.property_id) || {};
    const price = num(d.sale_price) || num(p.asking_price);
    const expected = Math.round((num(p.commission_fixed) || (price * num(p.commission_percent)) / 100) + num(p.marketing_budget));
    const inv = invByProp.get(p.property_id) || { invoiced: 0, collected: 0 };
    feeTotals.expected += expected; feeTotals.invoiced += inv.invoiced; feeTotals.collected += inv.collected;
    feeRows.push({ property: propName.get(p.property_id) || null, expected, invoiced: Math.round(inv.invoiced), collected: Math.round(inv.collected), variance: Math.round(inv.collected - expected) });
  }
  const fees = { rows: feeRows, totals: { expected: Math.round(feeTotals.expected), invoiced: Math.round(feeTotals.invoiced), collected: Math.round(feeTotals.collected), variance: Math.round(feeTotals.collected - feeTotals.expected) } };

  // ── SLA (first outbound comm vs enquiry created) + workload ──
  const enqInRange = enquiries.filter((e) => inRange(e.created_at || e.createdAt));
  const enqIds = enqInRange.map((e) => e.id);
  const firstOut = new Map();
  if (enqIds.length) {
    const comms = await Communication.findAll({ where: { ...scope, entity_type: 'sales_enquiry', entity_id: { [Op.in]: enqIds }, direction: 'outbound' }, order: [['occurred_at', 'ASC']], raw: true });
    for (const c of comms) if (!firstOut.has(c.entity_id)) firstOut.set(c.entity_id, c.occurred_at);
  }
  let responded = 0; let withinSla = 0; let totalHours = 0;
  for (const e of enqInRange) {
    const fo = firstOut.get(e.id); if (!fo) continue;
    responded += 1; const created = e.created_at || e.createdAt;
    totalHours += Math.max(0, (new Date(fo) - new Date(created)) / 3600000);
    if (businessDaysBetween(created, fo) <= 1) withinSla += 1;
  }
  const sla = { enquiries: enqInRange.length, responded, within_sla: withinSla, within_sla_pct: responded ? Math.round((withinSla / responded) * 100) : 0, avg_first_response_hours: responded ? Math.round(totalHours / responded) : 0 };

  const wl = new Map();
  const bump = (uid, key) => { if (!uid) return; const w = wl.get(uid) || { name: userName.get(uid) || `User ${uid}`, open_deals: 0, open_enquiries: 0 }; w[key] += 1; wl.set(uid, w); };
  for (const d of deals) if (!['completed', 'cancelled'].includes(d.status)) bump(d.assigned_to, 'open_deals');
  for (const e of enquiries) if (!['converted', 'rejected'].includes(e.stage)) bump(e.assigned_officer_id, 'open_enquiries');
  const workload = [...wl.values()];

  // ── expenses + margin (per property, spent in range) ──
  const expByProp = new Map();
  for (const e of expenses) {
    if (e.spent_on && !inRange(e.spent_on)) continue;
    const k = e.property_id; const c = expByProp.get(k) || { total: 0, byCategory: {} };
    c.total += num(e.amount); c.byCategory[e.category] = (c.byCategory[e.category] || 0) + num(e.amount); expByProp.set(k, c);
  }
  const expenseRows = [...expByProp.entries()].map(([pid, v]) => ({ property: propName.get(pid) || null, total: Math.round(v.total), by_category: v.byCategory, collected: Math.round((invByProp.get(pid) || {}).collected || 0), margin: Math.round(((invByProp.get(pid) || {}).collected || 0) - v.total) }));
  const expenses_total = Math.round([...expByProp.values()].reduce((s, v) => s + v.total, 0));
  const expensesBlock = { rows: expenseRows, totals: { expenses: expenses_total, collected: fees.totals.collected, margin: Math.round(fees.totals.collected - expenses_total) } };

  // ── lead attribution (first-touch UTM, created in range) ──
  const attrMap = new Map();
  for (const e of enquiries) {
    if (!inRange(e.created_at || e.createdAt)) continue;
    const src = e.utm_source || '(none)'; const camp = e.utm_campaign || '(none)';
    const k = `${src}|||${camp}`;
    const c = attrMap.get(k) || { source: src, campaign: camp, created: 0, converted: 0 };
    c.created += 1; if (e.stage === 'converted') c.converted += 1; attrMap.set(k, c);
  }
  const lead_attribution = [...attrMap.values()]
    .map((r) => ({ ...r, rate: r.created ? Math.round((r.converted / r.created) * 100) : 0 }))
    .sort((a, b) => b.created - a.created);

  res.json({ range: { from, to }, pipeline, conversion, settlement_forecast, overdue_receivables, fees, sla, workload, expenses: expensesBlock, lead_attribution });
});
