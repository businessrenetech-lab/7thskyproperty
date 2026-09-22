const BusinessAssessment = require('../models/BusinessAssessment');
const { asyncHandler, branchScope, resolveBranchId, pick } = require('../utils/controllerHelpers');

const FIELDS = [
  'business_listing_id', 'property_id', 'assessment_type', 'assessor_id', 'assessment_date',
  'operational_condition', 'market_attractiveness', 'business_readiness',
  'commercial_viability', 'growth_potential', 'transaction_feasibility',
  'presentation_score', 'risks', 'overall_rating', 'recommendation', 'summary', 'next_steps', 'status',
];

// GET /api/business-assessments?business_listing_id=
exports.list = asyncHandler(async (req, res) => {
  const where = { ...branchScope(req) };
  if (req.query.business_listing_id) where.business_listing_id = req.query.business_listing_id;
  if (req.query.property_id) where.property_id = req.query.property_id;
  const rows = await BusinessAssessment.findAll({ where, order: [['created_at', 'DESC']] });
  res.json({ data: rows });
});

// GET /api/business-assessments/:id
exports.getOne = asyncHandler(async (req, res) => {
  const row = await BusinessAssessment.findOne({ where: { id: req.params.id, ...branchScope(req) } });
  if (!row) return res.status(404).json({ error: 'Assessment not found.' });
  res.json({ data: row });
});

// POST /api/business-assessments
exports.create = asyncHandler(async (req, res) => {
  const data = pick(req.body, FIELDS);
  if (!data.business_listing_id && !data.property_id) return res.status(400).json({ error: 'property_id or business_listing_id is required.' });
  data.branch_id = resolveBranchId(req, req.body.branch_id);
  data.created_by = req.user?.id || null;
  if (!data.assessor_id) data.assessor_id = req.user?.id || null;
  const row = await BusinessAssessment.create(data);
  res.status(201).json({ data: row, message: 'Assessment saved.' });
});

// PUT /api/business-assessments/:id
exports.update = asyncHandler(async (req, res) => {
  const row = await BusinessAssessment.findOne({ where: { id: req.params.id, ...branchScope(req) } });
  if (!row) return res.status(404).json({ error: 'Assessment not found.' });
  await row.update(pick(req.body, FIELDS));
  res.json({ data: row, message: 'Assessment updated.' });
});

// DELETE /api/business-assessments/:id
exports.remove = asyncHandler(async (req, res) => {
  const row = await BusinessAssessment.findOne({ where: { id: req.params.id, ...branchScope(req) } });
  if (!row) return res.status(404).json({ error: 'Assessment not found.' });
  await row.destroy();
  res.json({ message: 'Assessment deleted.' });
});
