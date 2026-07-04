const PropertyDeal = require('../models/PropertyDeal');
const Property = require('../models/Property');
const Contact = require('../models/Contact');
const Client = require('../models/Client');
const Agreement = require('../models/Agreement');
const { generateCode } = require('../utils/codeGenerator');
const { asyncHandler, branchScope, resolveBranchId, getPagination, pick } = require('../utils/controllerHelpers');

const FIELDS = ['property_id', 'deal_type', 'buyer_client_id', 'seller_contact_id', 'owner_contact_id', 'agreement_id',
  'agreement_date', 'sale_price', 'commission_amount', 'commission_percent', 'expenses_total', 'status', 'settlement_date', 'assigned_to', 'notes'];

const propInc = (category) => ({
  model: Property,
  attributes: ['id', 'property_code', 'title', 'category', 'listing_type', 'area', 'district', 'price'],
  ...(category ? { where: { category }, required: true } : {}),
});
const buyerInc = { model: Client, as: 'buyer', include: [{ model: Contact, attributes: ['id', 'full_name', 'primary_phone'] }] };
const sellerInc = { model: Contact, as: 'seller', attributes: ['id', 'full_name', 'primary_phone'] };
const ownerInc = { model: Contact, as: 'owner', attributes: ['id', 'full_name', 'primary_phone'] };

exports.list = asyncHandler(async (req, res) => {
  const { limit, offset, page } = getPagination(req);
  const where = { ...branchScope(req) };
  if (req.query.deal_type) where.deal_type = req.query.deal_type;
  if (req.query.status) where.status = req.query.status;
  const { rows, count } = await PropertyDeal.findAndCountAll({
    where, include: [propInc(req.query.category), buyerInc, sellerInc, ownerInc],
    limit, offset, order: [['created_at', 'DESC']], distinct: true,
  });
  res.json({ data: rows, pagination: { page, limit, total: count, pages: Math.ceil(count / limit) } });
});

exports.getOne = asyncHandler(async (req, res) => {
  const d = await PropertyDeal.findOne({
    where: { id: req.params.id, ...branchScope(req) },
    include: [propInc(), buyerInc, sellerInc, ownerInc, { model: Agreement }],
  });
  if (!d) return res.status(404).json({ error: 'Deal not found.' });
  res.json({ data: d });
});

exports.create = asyncHandler(async (req, res) => {
  const data = pick(req.body, FIELDS);
  if (!data.deal_type) return res.status(400).json({ error: 'deal_type (buy|sell) is required.' });
  data.branch_id = resolveBranchId(req, req.body.branch_id);
  data.created_by = req.user?.id || null;
  data.deal_code = await generateCode(PropertyDeal, 'deal_code', 'SSPC-DL-');
  const d = await PropertyDeal.create(data);
  res.status(201).json({ data: d, message: 'Deal created.' });
});

exports.update = asyncHandler(async (req, res) => {
  const d = await PropertyDeal.findOne({ where: { id: req.params.id, ...branchScope(req) } });
  if (!d) return res.status(404).json({ error: 'Deal not found.' });
  await d.update(pick(req.body, FIELDS));
  res.json({ data: d, message: 'Deal updated.' });
});
