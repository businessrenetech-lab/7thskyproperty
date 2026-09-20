const { Op } = require('sequelize');
const BusinessEnquiry = require('../models/BusinessEnquiry');
const BusinessListing = require('../models/BusinessListing');
const { asyncHandler, branchScope, resolveBranchId, getPagination, pick } = require('../utils/controllerHelpers');
const { generateCode } = require('../utils/codeGenerator');

const FIELDS = [
  'business_listing_id', 'enquiry_type', 'enquirer_name', 'company_name', 'phone', 'email',
  'interest', 'preferred_industry', 'preferred_location', 'budget', 'source', 'message',
  'buyer_seriousness', 'financial_capability', 'stage', 'assigned_to', 'contact_id',
  'converted', 'next_action', 'follow_up_date', 'notes',
];

const listingInc = { model: BusinessListing, as: 'listing', attributes: ['id', 'business_code', 'business_name', 'business_type'] };

// GET /api/business-enquiries
exports.list = asyncHandler(async (req, res) => {
  const { limit, offset, page } = getPagination(req);
  const where = { ...branchScope(req) };
  if (req.query.stage) where.stage = req.query.stage;
  if (req.query.enquiry_type) where.enquiry_type = req.query.enquiry_type;
  if (req.query.business_listing_id) where.business_listing_id = req.query.business_listing_id;
  if (req.query.search) {
    const s = `%${req.query.search}%`;
    where[Op.or] = [
      { enquirer_name: { [Op.like]: s } }, { enquiry_code: { [Op.like]: s } },
      { phone: { [Op.like]: s } }, { email: { [Op.like]: s } }, { interest: { [Op.like]: s } },
    ];
  }
  const { rows, count } = await BusinessEnquiry.findAndCountAll({
    where, include: [listingInc], limit, offset, order: [['created_at', 'DESC']],
  });
  res.json({ data: rows, pagination: { page, limit, total: count, pages: Math.ceil(count / limit) } });
});

// GET /api/business-enquiries/:id
exports.getOne = asyncHandler(async (req, res) => {
  const row = await BusinessEnquiry.findOne({ where: { id: req.params.id, ...branchScope(req) }, include: [listingInc] });
  if (!row) return res.status(404).json({ error: 'Business enquiry not found.' });
  res.json({ data: row });
});

// POST /api/business-enquiries
exports.create = asyncHandler(async (req, res) => {
  const data = pick(req.body, FIELDS);
  if (!data.enquirer_name || !String(data.enquirer_name).trim()) return res.status(400).json({ error: 'Enquirer name is required.' });
  data.branch_id = resolveBranchId(req, req.body.branch_id);
  data.created_by = req.user?.id || null;
  data.enquiry_code = await generateCode(BusinessEnquiry, 'enquiry_code', 'SSPC-BE-');
  const row = await BusinessEnquiry.create(data);
  res.status(201).json({ data: row, message: 'Business enquiry created.' });
});

// PUT /api/business-enquiries/:id
exports.update = asyncHandler(async (req, res) => {
  const row = await BusinessEnquiry.findOne({ where: { id: req.params.id, ...branchScope(req) } });
  if (!row) return res.status(404).json({ error: 'Business enquiry not found.' });
  await row.update(pick(req.body, FIELDS));
  res.json({ data: row, message: 'Business enquiry updated.' });
});

// PATCH /api/business-enquiries/:id/move — advance the lead stage
exports.move = asyncHandler(async (req, res) => {
  const row = await BusinessEnquiry.findOne({ where: { id: req.params.id, ...branchScope(req) } });
  if (!row) return res.status(404).json({ error: 'Business enquiry not found.' });
  const { stage } = pick(req.body, ['stage']);
  if (stage) await row.update({ stage });
  res.json({ data: row, message: 'Business enquiry updated.' });
});

// DELETE /api/business-enquiries/:id
exports.remove = asyncHandler(async (req, res) => {
  const row = await BusinessEnquiry.findOne({ where: { id: req.params.id, ...branchScope(req) } });
  if (!row) return res.status(404).json({ error: 'Business enquiry not found.' });
  await row.destroy();
  res.json({ message: 'Business enquiry deleted.' });
});
