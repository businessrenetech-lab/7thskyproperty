/**
 * careAmc.controller.js — recurring AMC contracts that generate scheduled visits (work orders).
 */
const { Op } = require('sequelize');
const CareAmcContract = require('../models/CareAmcContract');
const CareWorkOrder = require('../models/CareWorkOrder');
const ServiceItem = require('../models/ServiceItem');
const Contact = require('../models/Contact');
const { generateCode } = require('../utils/codeGenerator');
const { asyncHandler, branchScope, resolveBranchId, getPagination, pick } = require('../utils/controllerHelpers');

const num = (v) => Number(v || 0);
const FIELDS = ['customer_contact_id', 'customer_name', 'mobile', 'service_id', 'service_name', 'site_address', 'district',
  'frequency', 'visits_per_year', 'annual_value', 'start_date', 'end_date', 'next_visit_date', 'assigned_provider_id', 'status', 'notes'];
const VISITS = { monthly: 12, quarterly: 4, half_yearly: 2, annual: 1 };
const MONTHS = { monthly: 1, quarterly: 3, half_yearly: 6, annual: 12 };
const addMonths = (d, m) => { const x = new Date(d); x.setMonth(x.getMonth() + m); return x.toISOString().slice(0, 10); };

exports.list = asyncHandler(async (req, res) => {
  const { limit, offset, page } = getPagination(req);
  const where = { ...branchScope(req) };
  if (req.query.status) where.status = req.query.status;
  const { rows, count } = await CareAmcContract.findAndCountAll({ where, include: [{ model: Contact, as: 'customer', attributes: ['id', 'full_name'] }], limit, offset, order: [['created_at', 'DESC']] });
  res.json({ data: rows, pagination: { page, limit, total: count, pages: Math.ceil(count / limit) } });
});

exports.create = asyncHandler(async (req, res) => {
  const data = pick(req.body, FIELDS);
  data.branch_id = resolveBranchId(req, req.body.branch_id);
  data.created_by = req.user?.id || null;
  data.contract_code = await generateCode(CareAmcContract, 'contract_code', 'SSPC-AMC-');
  data.visits_per_year = data.visits_per_year || VISITS[data.frequency] || 4;
  if (data.service_id && !data.service_name) { const s = await ServiceItem.findByPk(data.service_id); if (s) data.service_name = s.name; }
  data.start_date = data.start_date || new Date().toISOString().slice(0, 10);
  data.next_visit_date = data.next_visit_date || data.start_date;
  if (!data.end_date) data.end_date = addMonths(data.start_date, 12);
  const c = await CareAmcContract.create(data);
  res.status(201).json({ data: c, message: `AMC contract ${c.contract_code} created.` });
});

exports.update = asyncHandler(async (req, res) => {
  const c = await CareAmcContract.findOne({ where: { id: req.params.id, ...branchScope(req) } });
  if (!c) return res.status(404).json({ error: 'Contract not found.' });
  await c.update(pick(req.body, FIELDS));
  res.json({ data: c, message: 'Contract updated.' });
});

// Generate the next scheduled visit as a work order + advance the schedule.
exports.generateVisit = asyncHandler(async (req, res) => {
  const c = await CareAmcContract.findOne({ where: { id: req.params.id, ...branchScope(req) } });
  if (!c) return res.status(404).json({ error: 'Contract not found.' });
  if (c.status !== 'active') return res.status(400).json({ error: 'Contract is not active.' });

  let split = { sspc_fee: 0, provider_charge: 0 };
  const perVisit = num(c.annual_value) / (c.visits_per_year || 1);
  if (c.service_id) { const s = await ServiceItem.findByPk(c.service_id); if (s) { const fee = s.sspc_fee_type === 'percentage' ? (perVisit * num(s.sspc_fee_value)) / 100 : num(s.sspc_fee_value); const prov = s.provider_pay_type === 'remainder' ? Math.max(0, perVisit - fee) : s.provider_pay_type === 'percentage' ? (perVisit * num(s.provider_pay_value)) / 100 : num(s.provider_pay_value); split = { sspc_fee: Math.round(fee * 100) / 100, provider_charge: Math.round(prov * 100) / 100 }; } }

  const wo = await CareWorkOrder.create({
    branch_id: c.branch_id, work_order_code: await generateCode(CareWorkOrder, 'work_order_code', 'SSPC-SWO-'),
    vertical: 'water_tank', service_id: c.service_id, service_name: `${c.service_name || 'AMC visit'} (AMC ${c.contract_code})`,
    customer_contact_id: c.customer_contact_id, customer_name: c.customer_name, customer_phone: c.mobile,
    site_address: c.site_address, district: c.district, source_type: 'standalone',
    assigned_provider_id: c.assigned_provider_id, delivery_mode: c.assigned_provider_id ? 'provider' : 'internal',
    requested_date: c.next_visit_date || new Date().toISOString().slice(0, 10), scheduled_date: c.next_visit_date,
    service_value: perVisit, sspc_fee: split.sspc_fee, provider_charge: split.provider_charge,
    status: c.assigned_provider_id ? 'assigned' : 'priced', created_by: req.user?.id || null,
  });
  const next = addMonths(c.next_visit_date || new Date(), MONTHS[c.frequency] || 3);
  const visitsDone = num(c.visits_done) + 1;
  const expired = c.end_date && next > c.end_date;
  await c.update({ next_visit_date: expired ? c.next_visit_date : next, visits_done: visitsDone, status: expired ? 'expired' : 'active' });
  res.status(201).json({ data: { work_order: wo, contract: c }, message: `Visit ${visitsDone} scheduled as ${wo.work_order_code}. Next visit ${expired ? '— contract complete' : next}.` });
});
