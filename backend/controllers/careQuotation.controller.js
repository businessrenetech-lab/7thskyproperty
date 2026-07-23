/**
 * careQuotation.controller.js — site assessment + quote → customer agreement → work order.
 */
const { Op } = require('sequelize');
const CareQuotation = require('../models/CareQuotation');
const CareWorkOrder = require('../models/CareWorkOrder');
const CareEnquiry = require('../models/CareEnquiry');
const ServiceItem = require('../models/ServiceItem');
const Contact = require('../models/Contact');
const { generateCode } = require('../utils/codeGenerator');
const { asyncHandler, branchScope, resolveBranchId, getPagination, pick } = require('../utils/controllerHelpers');

const num = (v) => Number(v || 0);
const FIELDS = ['enquiry_id', 'customer_contact_id', 'customer_name', 'mobile', 'email', 'vertical', 'service_id', 'category_id',
  'service_name', 'site_address', 'district', 'city', 'tank_type', 'tank_capacity', 'tank_count', 'water_source', 'findings',
  'issues', 'amount', 'materials_estimate', 'valid_until', 'terms', 'status', 'notes'];
const inc = [{ model: Contact, as: 'customer', attributes: ['id', 'full_name'] }];

// Best-effort auto-fill of a template's fields from a quotation's data.
function quoteToTemplateValues(q, tpl) {
  const today = new Date().toISOString().slice(0, 10);
  const v = {};
  for (const f of (tpl.fields || [])) {
    const L = (f.label || '').toLowerCase();
    if (f.type === 'checkbox_group') {
      const opts = f.options || [];
      const pick = (needle) => opts.find((o) => needle && (o.toLowerCase() === needle.toLowerCase() || needle.toLowerCase().includes(o.toLowerCase()) || o.toLowerCase().includes(needle.toLowerCase())));
      let opt;
      if (/tank type/.test(L)) opt = pick(q.tank_type);
      else if (/property type/.test(L)) opt = pick(q.property_type);
      else opt = pick(q.service_name); // service category groups
      if (opt) v[f.key] = [opt];
      continue;
    }
    if (/client name/.test(L)) v[f.key] = q.customer_name || '';
    else if (/service address/.test(L) || l_isAddress(L)) v[f.key] = q.site_address || '';
    else if (/date/.test(L)) v[f.key] = today;
    else if (/tank capacity|capacity/.test(L)) v[f.key] = q.tank_capacity || '';
    else if (/number of tanks|no\. of tanks|tank count/.test(L)) v[f.key] = q.tank_count != null ? String(q.tank_count) : '';
    else if (/total project value|project value|^amount|deposit amount|final payment|service value/.test(L)) v[f.key] = q.amount != null ? String(q.amount) : '';
  }
  return v;
}
const l_isAddress = (L) => /^address$/.test(L);

function splitFor(service, value, materials = 0) {
  const sv = num(value);
  const fee = service.sspc_fee_type === 'percentage' ? (sv * num(service.sspc_fee_value)) / 100 : num(service.sspc_fee_value);
  const provider = service.provider_pay_type === 'percentage' ? (sv * num(service.provider_pay_value)) / 100
    : service.provider_pay_type === 'fixed' ? num(service.provider_pay_value) : Math.max(0, sv - fee - num(materials));
  return { sspc_fee: Math.round(fee * 100) / 100, provider_charge: Math.round(provider * 100) / 100 };
}

exports.list = asyncHandler(async (req, res) => {
  const { limit, offset, page } = getPagination(req);
  const where = { ...branchScope(req) };
  if (req.query.status) where.status = req.query.status;
  if (req.query.search) { const s = `%${req.query.search}%`; where[Op.or] = [{ quote_code: { [Op.like]: s } }, { customer_name: { [Op.like]: s } }]; }
  const { rows, count } = await CareQuotation.findAndCountAll({ where, include: inc, limit, offset, order: [['created_at', 'DESC']] });
  res.json({ data: rows, pagination: { page, limit, total: count, pages: Math.ceil(count / limit) } });
});

exports.getOne = asyncHandler(async (req, res) => {
  const q = await CareQuotation.findOne({ where: { id: req.params.id, ...branchScope(req) }, include: inc });
  if (!q) return res.status(404).json({ error: 'Quotation not found.' });
  res.json({ data: q });
});

exports.create = asyncHandler(async (req, res) => {
  const data = pick(req.body, FIELDS);
  data.branch_id = resolveBranchId(req, req.body.branch_id);
  data.created_by = req.user?.id || null;
  data.quote_code = await generateCode(CareQuotation, 'quote_code', 'SSPC-QT-');
  if (data.service_id && !data.service_name) { const s = await ServiceItem.findByPk(data.service_id); if (s) { data.service_name = s.name; data.category_id = data.category_id || s.category_id; data.vertical = data.vertical || s.vertical; if (!data.amount && num(s.base_price) > 0) data.amount = num(s.base_price); } }
  if (num(data.amount) > 0 && data.status === 'draft') data.status = 'assessed';
  const q = await CareQuotation.create(data);
  res.status(201).json({ data: q, message: `Quotation ${q.quote_code} created.` });
});

// From an enquiry — prefill customer + service.
exports.fromEnquiry = asyncHandler(async (req, res) => {
  const e = await CareEnquiry.findOne({ where: { id: req.params.enquiryId, ...branchScope(req) } });
  if (!e) return res.status(404).json({ error: 'Enquiry not found.' });
  const q = await CareQuotation.create({
    branch_id: e.branch_id, quote_code: await generateCode(CareQuotation, 'quote_code', 'SSPC-QT-'),
    enquiry_id: e.id, customer_contact_id: e.customer_contact_id, customer_name: e.customer_name, mobile: e.mobile, email: e.email,
    vertical: e.vertical, service_id: e.service_id, service_name: e.service_interest, site_address: e.site_address,
    district: e.district, city: e.city, status: 'draft', created_by: req.user?.id || null,
  });
  await e.update({ stage: e.stage === 'new' || e.stage === 'contacted' ? 'quoted' : e.stage });
  res.status(201).json({ data: q, message: `Quotation ${q.quote_code} started from enquiry.` });
});

exports.update = asyncHandler(async (req, res) => {
  const q = await CareQuotation.findOne({ where: { id: req.params.id, ...branchScope(req) } });
  if (!q) return res.status(404).json({ error: 'Quotation not found.' });
  await q.update(pick(req.body, FIELDS));
  res.json({ data: q, message: 'Quotation updated.' });
});

// Send the customer service agreement for signing (eSign).
exports.sendAgreement = asyncHandler(async (req, res) => {
  const crypto = require('crypto');
  const SigningEnvelope = require('../models/SigningEnvelope');
  const EnvelopeSigner = require('../models/EnvelopeSigner');
  const SignatureField = require('../models/SignatureField');
  const { buildCustomerServiceAgreement } = require('../services/serviceAgreementTemplates.service');

  const q = await CareQuotation.findOne({ where: { id: req.params.id, ...branchScope(req) } });
  if (!q) return res.status(404).json({ error: 'Quotation not found.' });
  if (!q.email && !req.body.email) return res.status(400).json({ error: 'Add a customer email to send the agreement.' });

  // Use a dynamic agreement template if one is chosen (or the default customer-
  // service template for this vertical); else fall back to the built-in builder.
  let doc;
  const AgreementTemplate = require('../models/AgreementTemplate');
  let tpl = null;
  if (req.body.template_id) tpl = await AgreementTemplate.findByPk(req.body.template_id);
  else if (req.body.use_template !== false) tpl = await AgreementTemplate.findOne({ where: { category: 'customer_service', status: 'active', ...(q.vertical ? { vertical: q.vertical } : {}) }, order: [['created_at', 'ASC']] });

  if (tpl) {
    const { merge } = require('../services/docTemplate.service');
    const values = { ...quoteToTemplateValues(q, tpl), ...(req.body.values || {}) };
    doc = { title: tpl.name, html: merge(tpl.content_html || '', values), terms: { agreement_type: 'customer_service_agreement', template_id: tpl.id, price: num(q.amount), ...values } };
  } else {
    doc = buildCustomerServiceAgreement({
      client: { full_name: q.customer_name, mobile: q.mobile, email: q.email, address: q.site_address },
      service: { name: q.service_name, base_price: q.amount },
      overrides: { price: num(q.amount), site_address: q.site_address, warranty_months: num(req.body.warranty_months) },
    });
  }
  const expires = new Date(Date.now() + 14 * 86400000);
  const env = await SigningEnvelope.create({
    branch_id: q.branch_id, envelope_code: await generateCode(SigningEnvelope, 'envelope_code', 'SSPC-ENV-'),
    title: doc.title, document_html: doc.html, related_type: 'care_quotation', related_id: q.id, terms: doc.terms,
    cc_emails: [], signing_order_enforced: true, status: 'sent', sent_at: new Date(), expires_at: expires, created_by: req.user?.id || null,
  });
  const token = crypto.randomBytes(24).toString('hex');
  const signer = await EnvelopeSigner.create({ envelope_id: env.id, name: q.customer_name, email: q.email || req.body.email, role: 'customer', contact_id: q.customer_contact_id, signer_order: 1, access_token: token, token_expires_at: expires, status: 'sent' });
  await SignatureField.bulkCreate([{ envelope_id: env.id, signer_id: signer.id, field_type: 'signature', label: 'Signature', required: true }, { envelope_id: env.id, signer_id: signer.id, field_type: 'date_signed', label: 'Date', required: false }]);
  await q.update({ agreement_envelope_id: env.id, agreement_status: 'sent', status: 'sent' });

  const base = process.env.SIGN_BASE_URL || `${req.protocol}://${req.get('host')}/admin/sign`;
  try { const { sendEmail } = require('../services/communication.service'); if (signer.email) await sendEmail(signer.email, `Please sign: ${doc.title}`, `<p>Dear ${q.customer_name},</p><p>Please review and sign your service agreement:</p><p><a href="${base}/${token}">${base}/${token}</a></p>`).catch(() => {}); } catch {}
  res.status(201).json({ data: env, link: `${base}/${token}`, message: 'Customer agreement sent for signing. A work order is created on completion.' });
});

// Accept + convert to a work order (manual, or auto after agreement signs).
async function convertToWorkOrder(q, userId, opts = {}) {
  if (q.work_order_id) return null;
  const tx = opts.transaction;
  let split = { sspc_fee: 0, provider_charge: 0 };
  if (q.service_id) { const s = await ServiceItem.findByPk(q.service_id, { transaction: tx }); if (s) split = splitFor(s, q.amount, q.materials_estimate); }
  const wo = await CareWorkOrder.create({
    branch_id: q.branch_id, work_order_code: await generateCode(CareWorkOrder, 'work_order_code', 'SSPC-SWO-'),
    vertical: q.vertical, service_id: q.service_id, category_id: q.category_id, service_name: q.service_name,
    customer_contact_id: q.customer_contact_id, customer_name: q.customer_name, customer_phone: q.mobile,
    site_address: q.site_address, district: q.district, city: q.city, source_type: 'enquiry', enquiry_id: q.enquiry_id,
    scope: q.findings, requested_date: new Date().toISOString().slice(0, 10),
    service_value: num(q.amount), materials_cost: num(q.materials_estimate), sspc_fee: split.sspc_fee, provider_charge: split.provider_charge,
    status: num(q.amount) > 0 ? 'priced' : 'draft', created_by: userId || null,
  }, { transaction: tx });
  await q.update({ status: 'converted', work_order_id: wo.id }, { transaction: tx });
  if (q.enquiry_id) await CareEnquiry.update({ stage: 'won', work_order_id: wo.id }, { where: { id: q.enquiry_id }, transaction: tx });
  return wo;
}
exports.convertToWorkOrder = convertToWorkOrder;

exports.convert = asyncHandler(async (req, res) => {
  const q = await CareQuotation.findOne({ where: { id: req.params.id, ...branchScope(req) } });
  if (!q) return res.status(404).json({ error: 'Quotation not found.' });
  if (q.work_order_id) return res.status(400).json({ error: 'Already converted.' });
  const wo = await convertToWorkOrder(q, req.user?.id);
  res.status(201).json({ data: wo, message: `Converted to work order ${wo.work_order_code}.` });
});
