/**
 * careDashboard.controller.js — Property Care Services overview metrics,
 * customer list (service customers = contacts), and provider payables.
 */
const { Op } = require('sequelize');
const sequelize = require('../config/db.config');
const CareWorkOrder = require('../models/CareWorkOrder');
const CareEnquiry = require('../models/CareEnquiry');
const ServiceProvider = require('../models/ServiceProvider');
const ServiceItem = require('../models/ServiceItem');
const Contact = require('../models/Contact');
const { asyncHandler, branchScope, getPagination } = require('../utils/controllerHelpers');

const num = (v) => Number(v || 0);
const OPEN = ['priced', 'matching', 'assigned', 'accepted', 'scheduled', 'in_progress'];

exports.metrics = asyncHandler(async (req, res) => {
  const scope = branchScope(req);
  const [woByStatus, active, servicesCount, providers, enqByStage, revenue, payables] = await Promise.all([
    CareWorkOrder.findAll({ where: scope, attributes: ['status', [sequelize.fn('COUNT', sequelize.col('id')), 'c']], group: ['status'], raw: true }),
    CareWorkOrder.count({ where: { ...scope, status: { [Op.in]: OPEN } } }),
    ServiceItem.count({ where: { ...scope, is_active: true } }),
    ServiceProvider.findAll({ where: scope, attributes: ['onboarding_stage', [sequelize.fn('COUNT', sequelize.col('id')), 'c']], group: ['onboarding_stage'], raw: true }),
    CareEnquiry.findAll({ where: scope, attributes: ['stage', [sequelize.fn('COUNT', sequelize.col('id')), 'c']], group: ['stage'], raw: true }),
    CareWorkOrder.findAll({ where: scope, attributes: [[sequelize.fn('SUM', sequelize.col('service_value')), 'sv'], [sequelize.fn('SUM', sequelize.col('sspc_fee')), 'fee'], [sequelize.fn('SUM', sequelize.col('provider_charge')), 'pc']], raw: true }),
    // provider charges on completed-but-unpaid work
    CareWorkOrder.findAll({ where: { ...scope, status: { [Op.in]: ['completed', 'inspected', 'invoiced'] }, payment_status: { [Op.notIn]: ['provider_paid', 'settled'] } }, attributes: [[sequelize.fn('SUM', sequelize.col('provider_charge')), 'due']], raw: true }),
  ]);
  const woCounts = woByStatus.reduce((a, r) => { a[r.status] = Number(r.c); return a; }, {});
  const providerCounts = providers.reduce((a, r) => { a[r.onboarding_stage] = Number(r.c); return a; }, {});
  const enqCounts = enqByStage.reduce((a, r) => { a[r.stage] = Number(r.c); return a; }, {});
  res.json({
    work_orders: { by_status: woCounts, open: active, total: Object.values(woCounts).reduce((a, b) => a + b, 0) },
    services: servicesCount,
    providers: { by_stage: providerCounts, active: providerCounts.active || 0, total: Object.values(providerCounts).reduce((a, b) => a + b, 0) },
    enquiries: { by_stage: enqCounts, open: (enqCounts.new || 0) + (enqCounts.contacted || 0) + (enqCounts.assessment || 0) + (enqCounts.quoted || 0) },
    revenue: { service_value: num(revenue[0]?.sv), our_income: num(revenue[0]?.fee), provider_charges: num(revenue[0]?.pc) },
    provider_payable: num(payables[0]?.due),
  });
});

// Service customers = contacts that appear on a care work order or enquiry.
exports.customers = asyncHandler(async (req, res) => {
  const { limit, offset, page } = getPagination(req);
  const scope = branchScope(req);
  const bw = scope.branch_id ? ' AND branch_id = :bid' : '';
  // distinct customer_contact_ids from work orders + enquiries
  const [ids] = await sequelize.query(
    `SELECT customer_contact_id AS id FROM care_work_orders WHERE customer_contact_id IS NOT NULL${bw}
     UNION SELECT customer_contact_id AS id FROM care_enquiries WHERE customer_contact_id IS NOT NULL${bw}`,
    { replacements: { bid: scope.branch_id } });
  const contactIds = ids.map((r) => r.id);
  if (!contactIds.length) return res.json({ data: [], pagination: { page, limit, total: 0, pages: 0 } });

  const where = { id: { [Op.in]: contactIds } };
  if (req.query.search) where.full_name = { [Op.like]: `%${req.query.search}%` };
  const { rows, count } = await Contact.findAndCountAll({ where, attributes: ['id', 'full_name', 'primary_phone', 'email'], limit, offset, order: [['full_name', 'ASC']] });
  // attach counts
  const [woCounts] = await sequelize.query(`SELECT customer_contact_id AS id, COUNT(*) c, COALESCE(SUM(service_value),0) v FROM care_work_orders WHERE customer_contact_id IN (:ids) GROUP BY customer_contact_id`, { replacements: { ids: rows.map((r) => r.id).concat(0) } });
  const cmap = woCounts.reduce((a, r) => { a[r.id] = { jobs: Number(r.c), value: Number(r.v) }; return a; }, {});
  res.json({ data: rows.map((r) => ({ ...r.toJSON(), jobs: cmap[r.id]?.jobs || 0, lifetime_value: cmap[r.id]?.value || 0 })), pagination: { page, limit, total: count, pages: Math.ceil(count / limit) } });
});
