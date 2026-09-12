const { Op } = require('sequelize');
const Lead = require('../models/Lead');
const LeadActivity = require('../models/LeadActivity');
const Contact = require('../models/Contact');
const Client = require('../models/Client');
const Property = require('../models/Property');
const { generateCode } = require('../utils/codeGenerator');
const { asyncHandler, branchScope, resolveBranchId, getPagination, pick } = require('../utils/controllerHelpers');

const FIELDS = ['contact_id', 'name', 'phone', 'email', 'vertical_key', 'service_id', 'property_id', 'requirement',
  'source', 'status', 'priority', 'estimated_value', 'assigned_to', 'next_follow_up', 'lost_reason', 'notes'];

exports.list = asyncHandler(async (req, res) => {
  const { limit, offset, page } = getPagination(req, 100);
  const where = { ...branchScope(req) };
  if (req.query.status) where.status = req.query.status;
  if (req.query.priority) where.priority = req.query.priority;
  if (req.query.vertical_key) where.vertical_key = req.query.vertical_key;
  if (req.query.search) {
    const s = `%${req.query.search}%`;
    where[Op.or] = [{ name: { [Op.like]: s } }, { phone: { [Op.like]: s } }, { email: { [Op.like]: s } }, { lead_code: { [Op.like]: s } }];
  }
  const include = [
    { model: Property, as: 'property', attributes: ['id', 'property_code', 'title', 'area', 'district'], required: false },
    { model: Contact, as: 'contact', attributes: ['id', 'full_name', 'primary_phone', 'email'], required: false },
    { model: Client, as: 'converted_client', attributes: ['id', 'client_code', 'is_buyer', 'is_seller'], required: false },
  ];
  const { rows, count } = await Lead.findAndCountAll({ where, include, limit, offset, order: [['created_at', 'DESC']] });
  res.json({ data: rows, pagination: { page, limit, total: count, pages: Math.ceil(count / limit) } });
});

exports.getOne = asyncHandler(async (req, res) => {
  const lead = await Lead.findOne({
    where: { id: req.params.id, ...branchScope(req) },
    include: [{ model: LeadActivity, as: 'activities' }],
    order: [[{ model: LeadActivity, as: 'activities' }, 'occurred_at', 'DESC']],
  });
  if (!lead) return res.status(404).json({ error: 'Lead not found.' });
  res.json({ data: lead });
});

exports.create = asyncHandler(async (req, res) => {
  const data = pick(req.body, FIELDS);
  if (!data.name) return res.status(400).json({ error: 'name is required.' });
  data.branch_id = resolveBranchId(req, req.body.branch_id);
  data.created_by = req.user?.id || null;
  data.lead_code = await generateCode(Lead, 'lead_code', 'SSPC-LD-');
  const lead = await Lead.create(data);
  res.status(201).json({ data: lead, message: 'Lead created.' });
});

exports.update = asyncHandler(async (req, res) => {
  const lead = await Lead.findOne({ where: { id: req.params.id, ...branchScope(req) } });
  if (!lead) return res.status(404).json({ error: 'Lead not found.' });
  await lead.update(pick(req.body, FIELDS));
  res.json({ data: lead, message: 'Lead updated.' });
});

exports.setStatus = asyncHandler(async (req, res) => {
  const lead = await Lead.findOne({ where: { id: req.params.id, ...branchScope(req) } });
  if (!lead) return res.status(404).json({ error: 'Lead not found.' });
  const { status, lost_reason } = req.body;
  await lead.update({ status, ...(status === 'lost' ? { lost_reason } : {}) });
  await LeadActivity.create({ lead_id: lead.id, activity_type: 'status_change', title: `Status → ${status}`, user_id: req.user?.id || null });
  res.json({ data: lead });
});

exports.addActivity = asyncHandler(async (req, res) => {
  const lead = await Lead.findOne({ where: { id: req.params.id, ...branchScope(req) } });
  if (!lead) return res.status(404).json({ error: 'Lead not found.' });
  const act = await LeadActivity.create({
    lead_id: lead.id,
    ...pick(req.body, ['activity_type', 'title', 'notes', 'outcome', 'occurred_at']),
    user_id: req.user?.id || null,
  });
  if (req.body.next_follow_up !== undefined) await lead.update({ next_follow_up: req.body.next_follow_up });
  res.status(201).json({ data: act });
});

// Convert a lead → contact (if needed) + client
exports.convert = asyncHandler(async (req, res) => {
  const lead = await Lead.findOne({ where: { id: req.params.id, ...branchScope(req) } });
  if (!lead) return res.status(404).json({ error: 'Lead not found.' });

  let contact = null;
  let contactId = lead.contact_id;
  if (!contactId) {
    contact = await Contact.create({
      branch_id: lead.branch_id,
      full_name: lead.name,
      primary_phone: lead.phone,
      email: lead.email,
      source: lead.source || 'lead_conversion',
      contact_code: await generateCode(Contact, 'contact_code', 'SSPC-CT-'),
      is_client: true,
      created_by: req.user?.id || null,
    });
    contactId = contact.id;
    await lead.update({ contact_id: contactId });
  } else {
    contact = await Contact.findByPk(contactId);
    if (contact) await contact.update({ is_client: true });
  }

  const role = req.body.target_role || (req.body.is_seller ? 'seller' : 'buyer');
  const isBuyer = req.body.is_buyer !== undefined ? Boolean(req.body.is_buyer) : (role === 'buyer');
  const isSeller = req.body.is_seller !== undefined ? Boolean(req.body.is_seller) : (role === 'seller');

  const client = await Client.create({
    branch_id: lead.branch_id,
    contact_id: contactId,
    client_code: await generateCode(Client, 'client_code', 'SSPC-CL-'),
    is_buyer: isBuyer,
    is_seller: isSeller,
    ...pick(req.body, ['is_landlord', 'is_tenant', 'is_service_client', 'notes']),
    relationship_owner_id: req.user?.id || null,
    onboarded_at: new Date(),
    created_by: req.user?.id || null,
  });

  await lead.update({
    status: 'converted',
    converted_client_id: client.id,
    converted_at: new Date(),
  });

  res.status(201).json({
    data: { lead, client, contact },
    message: `Lead converted to ${isSeller ? 'Vendor (Seller)' : 'Buyer'} successfully.`
  });
});
