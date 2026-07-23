/**
 * careEnquiry.controller.js — Property Care enquiries + lead pipeline.
 * The same records power the Enquiries list and the Leads kanban (by stage),
 * and convert into a service work order.
 */
const { Op } = require('sequelize');
const sequelize = require('../config/db.config');
const CareEnquiry = require('../models/CareEnquiry');
const CareWorkOrder = require('../models/CareWorkOrder');
const ServiceItem = require('../models/ServiceItem');
const Contact = require('../models/Contact');
const { generateCode } = require('../utils/codeGenerator');
const { asyncHandler, branchScope, resolveBranchId, getPagination, pick } = require('../utils/controllerHelpers');

const FIELDS = ['customer_contact_id', 'customer_name', 'mobile', 'email', 'vertical', 'service_id', 'category_id',
  'service_interest', 'site_address', 'district', 'city', 'property_type', 'message', 'source', 'stage',
  'estimated_value', 'assigned_to', 'notes'];
const inc = [{ model: ServiceItem, as: 'service', attributes: ['id', 'name'] }, { model: Contact, as: 'customer', attributes: ['id', 'full_name'] }];

exports.list = asyncHandler(async (req, res) => {
  const { limit, offset, page } = getPagination(req);
  const where = { ...branchScope(req) };
  if (req.query.stage) where.stage = req.query.stage;
  if (req.query.search) { const s = `%${req.query.search}%`; where[Op.or] = [{ customer_name: { [Op.like]: s } }, { mobile: { [Op.like]: s } }, { enquiry_code: { [Op.like]: s } }]; }
  const { rows, count } = await CareEnquiry.findAndCountAll({ where, include: inc, limit, offset, order: [['created_at', 'DESC']] });
  const grp = await CareEnquiry.findAll({ where: branchScope(req), attributes: ['stage', [sequelize.fn('COUNT', sequelize.col('id')), 'c']], group: ['stage'], raw: true });
  const stage_counts = grp.reduce((a, r) => { a[r.stage] = Number(r.c); return a; }, {});
  res.json({ data: rows, pagination: { page, limit, total: count, pages: Math.ceil(count / limit) }, stage_counts });
});

exports.create = asyncHandler(async (req, res) => {
  const data = pick(req.body, FIELDS);
  if (!data.customer_name && !data.mobile) return res.status(400).json({ error: 'Customer name or mobile is required.' });
  data.branch_id = resolveBranchId(req, req.body.branch_id);
  data.created_by = req.user?.id || null;
  data.enquiry_code = await generateCode(CareEnquiry, 'enquiry_code', 'SSPC-CEN-');
  if (data.service_id && !data.service_interest) { const s = await ServiceItem.findByPk(data.service_id); if (s) data.service_interest = s.name; }
  const e = await CareEnquiry.create(data);
  res.status(201).json({ data: e, message: `Enquiry ${e.enquiry_code} logged.` });
});

exports.update = asyncHandler(async (req, res) => {
  const e = await CareEnquiry.findOne({ where: { id: req.params.id, ...branchScope(req) } });
  if (!e) return res.status(404).json({ error: 'Enquiry not found.' });
  await e.update(pick(req.body, FIELDS));
  res.json({ data: e, message: 'Enquiry updated.' });
});

// PATCH /:id/stage — move a lead through the pipeline
exports.setStage = asyncHandler(async (req, res) => {
  const e = await CareEnquiry.findOne({ where: { id: req.params.id, ...branchScope(req) } });
  if (!e) return res.status(404).json({ error: 'Enquiry not found.' });
  await e.update({ stage: req.body.stage });
  res.json({ data: e });
});

// POST /:id/convert — turn an enquiry into a service work order
exports.convert = asyncHandler(async (req, res) => {
  const e = await CareEnquiry.findOne({ where: { id: req.params.id, ...branchScope(req) } });
  if (!e) return res.status(404).json({ error: 'Enquiry not found.' });
  if (e.work_order_id) return res.status(400).json({ error: 'Already converted to a work order.' });

  let priceFields = {};
  if (e.service_id) {
    const service = await ServiceItem.findByPk(e.service_id);
    if (service) {
      const sv = Number(req.body.service_value || service.base_price || e.estimated_value || 0);
      const fee = service.sspc_fee_type === 'percentage' ? (sv * Number(service.sspc_fee_value || 0)) / 100 : Number(service.sspc_fee_value || 0);
      const provider = service.provider_pay_type === 'percentage' ? (sv * Number(service.provider_pay_value || 0)) / 100
        : service.provider_pay_type === 'fixed' ? Number(service.provider_pay_value || 0) : Math.max(0, sv - fee);
      priceFields = { service_name: service.name, category_id: service.category_id, vertical: service.vertical, service_value: sv, sspc_fee: fee, provider_charge: provider, status: sv > 0 ? 'priced' : 'draft' };
    }
  }
  const wo = await CareWorkOrder.create({
    branch_id: e.branch_id, work_order_code: await generateCode(CareWorkOrder, 'work_order_code', 'SSPC-SWO-'),
    vertical: e.vertical, service_id: e.service_id, customer_contact_id: e.customer_contact_id,
    customer_name: e.customer_name, customer_phone: e.mobile, site_address: e.site_address,
    district: e.district, city: e.city, source_type: 'enquiry', enquiry_id: e.id,
    scope: e.message, requested_date: new Date().toISOString().slice(0, 10), created_by: req.user?.id || null,
    ...priceFields,
  });
  await e.update({ stage: 'won', work_order_id: wo.id });
  res.status(201).json({ data: wo, message: `Converted to work order ${wo.work_order_code}.` });
});
