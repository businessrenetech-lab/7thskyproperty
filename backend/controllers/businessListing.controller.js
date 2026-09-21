const { Op, fn, col } = require('sequelize');
const BusinessListing = require('../models/BusinessListing');
const Contact = require('../models/Contact');
const { asyncHandler, branchScope, resolveBranchId, getPagination, pick } = require('../utils/controllerHelpers');
const { generateCode } = require('../utils/codeGenerator');

const FIELDS = [
  'listing_type', 'business_name', 'business_type', 'industry', 'business_address', 'area', 'city', 'district',
  'ownership_structure', 'company_registration_no', 'trade_licence_no', 'tin_bin',
  'year_established', 'staff_count', 'lease_status', 'lease_details',
  'reason_for_sale', 'indicative_price', 'currency', 'annual_turnover', 'annual_profit', 'monthly_revenue',
  'monthly_rent', 'security_deposit', 'lease_term_months', 'rent_review_structure', 'available_from', 'operational_status',
  'included_assets', 'stock_info', 'employee_info', 'ip_details',
  'description', 'highlights', 'confidential', 'seller_contact_id', 'assigned_to',
  'stage', 'status', 'special_requirements', 'commencement_date', 'completion_date', 'workflow_state',
];

const sellerInc = { model: Contact, as: 'seller', attributes: ['id', 'full_name', 'primary_phone', 'email', 'company_name'] };

// GET /api/business-listings
exports.list = asyncHandler(async (req, res) => {
  const { limit, offset, page } = getPagination(req);
  const where = { ...branchScope(req) };
  if (req.query.listing_type) where.listing_type = req.query.listing_type;
  if (req.query.stage) where.stage = req.query.stage;
  if (req.query.status) where.status = req.query.status;
  if (req.query.business_type) where.business_type = req.query.business_type;
  if (req.query.search) {
    const s = `%${req.query.search}%`;
    where[Op.or] = [
      { business_name: { [Op.like]: s } }, { business_code: { [Op.like]: s } },
      { industry: { [Op.like]: s } }, { area: { [Op.like]: s } }, { city: { [Op.like]: s } },
    ];
  }
  const { rows, count } = await BusinessListing.findAndCountAll({
    where, include: [sellerInc], limit, offset, order: [['created_at', 'DESC']],
  });
  res.json({ data: rows, pagination: { page, limit, total: count, pages: Math.ceil(count / limit) } });
});

// GET /api/business-listings/stats — dashboard metrics (business-sale scoped)
exports.stats = asyncHandler(async (req, res) => {
  const where = { ...branchScope(req) };
  if (req.query.listing_type) where.listing_type = req.query.listing_type;
  // Rent listings measure pipeline by total monthly rent; sale listings by price.
  const valueCol = req.query.listing_type === 'rent' ? 'monthly_rent' : 'indicative_price';
  const [total, byStage, byStatus, pipelineValue] = await Promise.all([
    BusinessListing.count({ where }),
    BusinessListing.findAll({ where, attributes: ['stage', [fn('COUNT', col('id')), 'n']], group: ['stage'], raw: true }),
    BusinessListing.findAll({ where, attributes: ['status', [fn('COUNT', col('id')), 'n']], group: ['status'], raw: true }),
    BusinessListing.sum(valueCol, { where: { ...where, status: { [Op.in]: ['active', 'under_offer'] } } }),
  ]);
  res.json({
    data: {
      total,
      by_stage: Object.fromEntries(byStage.map((r) => [r.stage, Number(r.n)])),
      by_status: Object.fromEntries(byStatus.map((r) => [r.status, Number(r.n)])),
      pipeline_value: Number(pipelineValue || 0),
    },
  });
});

// GET /api/business-listings/:id
exports.getOne = asyncHandler(async (req, res) => {
  const row = await BusinessListing.findOne({ where: { id: req.params.id, ...branchScope(req) }, include: [sellerInc] });
  if (!row) return res.status(404).json({ error: 'Business listing not found.' });
  res.json({ data: row });
});

// POST /api/business-listings
exports.create = asyncHandler(async (req, res) => {
  const data = pick(req.body, FIELDS);
  if (!data.business_name || !String(data.business_name).trim()) return res.status(400).json({ error: 'Business name is required.' });
  data.branch_id = resolveBranchId(req, req.body.branch_id);
  data.created_by = req.user?.id || null;
  data.business_code = await generateCode(BusinessListing, 'business_code', 'SSPC-BZ-');
  const row = await BusinessListing.create(data);
  res.status(201).json({ data: row, message: 'Business listing created.' });
});

// PUT /api/business-listings/:id
exports.update = asyncHandler(async (req, res) => {
  const row = await BusinessListing.findOne({ where: { id: req.params.id, ...branchScope(req) } });
  if (!row) return res.status(404).json({ error: 'Business listing not found.' });
  await row.update(pick(req.body, FIELDS));
  res.json({ data: row, message: 'Business listing updated.' });
});

// PATCH /api/business-listings/:id/move — advance the SOP pipeline stage
exports.move = asyncHandler(async (req, res) => {
  const row = await BusinessListing.findOne({ where: { id: req.params.id, ...branchScope(req) } });
  if (!row) return res.status(404).json({ error: 'Business listing not found.' });
  const { stage, status } = pick(req.body, ['stage', 'status']);
  await row.update({ ...(stage ? { stage } : {}), ...(status ? { status } : {}) });
  res.json({ data: row, message: 'Business listing updated.' });
});

// DELETE /api/business-listings/:id
exports.remove = asyncHandler(async (req, res) => {
  const row = await BusinessListing.findOne({ where: { id: req.params.id, ...branchScope(req) } });
  if (!row) return res.status(404).json({ error: 'Business listing not found.' });
  await row.destroy();
  res.json({ message: 'Business listing deleted.' });
});
