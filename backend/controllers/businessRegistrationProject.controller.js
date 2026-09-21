const { Op, fn, col } = require('sequelize');
const BusinessRegistrationProject = require('../models/BusinessRegistrationProject');
const Contact = require('../models/Contact');
const { asyncHandler, branchScope, resolveBranchId, getPagination, pick } = require('../utils/controllerHelpers');
const { generateCode } = require('../utils/codeGenerator');

const FIELDS = [
  'client_contact_id', 'client_type', 'client_name', 'client_nid', 'client_phone', 'client_email', 'client_address',
  'business_name', 'business_type', 'registration_type', 'nature_of_business', 'business_address',
  'number_of_owners', 'number_of_directors', 'capital_structure', 'existing_trade_licence_no', 'existing_registration_no',
  'lead_source', 'urgency', 'assigned_to', 'service_selection', 'authorities',
  'quoted_amount', 'deposit_amount', 'government_fees', 'contract_value', 'currency',
  'stage', 'status', 'workflow_state', 'scope_of_work', 'special_requirements',
  'commencement_date', 'target_completion_date', 'completion_date', 'notes',
];

const clientInc = { model: Contact, as: 'client', attributes: ['id', 'full_name', 'primary_phone', 'email', 'company_name'] };

// GET /api/business-registration-projects
exports.list = asyncHandler(async (req, res) => {
  const { limit, offset, page } = getPagination(req);
  const where = { ...branchScope(req) };
  if (req.query.stage) where.stage = req.query.stage;
  if (req.query.status) where.status = req.query.status;
  if (req.query.business_type) where.business_type = req.query.business_type;
  if (req.query.urgency) where.urgency = req.query.urgency;
  if (req.query.search) {
    const s = `%${req.query.search}%`;
    where[Op.or] = [
      { project_code: { [Op.like]: s } }, { client_name: { [Op.like]: s } },
      { business_name: { [Op.like]: s } }, { registration_type: { [Op.like]: s } },
    ];
  }
  const { rows, count } = await BusinessRegistrationProject.findAndCountAll({
    where, include: [clientInc], limit, offset, order: [['created_at', 'DESC']],
  });
  res.json({ data: rows, pagination: { page, limit, total: count, pages: Math.ceil(count / limit) } });
});

// GET /api/business-registration-projects/stats — dashboard metrics (scoped)
exports.stats = asyncHandler(async (req, res) => {
  const where = { ...branchScope(req) };
  const [total, byStage, byStatus, byType, byUrgency, pipelineValue, collected] = await Promise.all([
    BusinessRegistrationProject.count({ where }),
    BusinessRegistrationProject.findAll({ where, attributes: ['stage', [fn('COUNT', col('id')), 'n']], group: ['stage'], raw: true }),
    BusinessRegistrationProject.findAll({ where, attributes: ['status', [fn('COUNT', col('id')), 'n']], group: ['status'], raw: true }),
    BusinessRegistrationProject.findAll({ where, attributes: ['business_type', [fn('COUNT', col('id')), 'n']], group: ['business_type'], raw: true }),
    BusinessRegistrationProject.findAll({ where, attributes: ['urgency', [fn('COUNT', col('id')), 'n']], group: ['urgency'], raw: true }),
    BusinessRegistrationProject.sum('contract_value', { where: { ...where, status: { [Op.in]: ['active', 'completed'] } } }),
    BusinessRegistrationProject.sum('deposit_amount', { where }),
  ]);
  res.json({
    data: {
      total,
      by_stage: Object.fromEntries(byStage.map((r) => [r.stage, Number(r.n)])),
      by_status: Object.fromEntries(byStatus.map((r) => [r.status, Number(r.n)])),
      by_type: Object.fromEntries(byType.filter((r) => r.business_type).map((r) => [r.business_type, Number(r.n)])),
      by_urgency: Object.fromEntries(byUrgency.map((r) => [r.urgency, Number(r.n)])),
      contract_value: Number(pipelineValue || 0),
      deposits_collected: Number(collected || 0),
    },
  });
});

// GET /api/business-registration-projects/:id
exports.getOne = asyncHandler(async (req, res) => {
  const row = await BusinessRegistrationProject.findOne({ where: { id: req.params.id, ...branchScope(req) }, include: [clientInc] });
  if (!row) return res.status(404).json({ error: 'Registration project not found.' });
  res.json({ data: row });
});

// POST /api/business-registration-projects
exports.create = asyncHandler(async (req, res) => {
  const data = pick(req.body, FIELDS);
  if (!data.client_name || !String(data.client_name).trim()) return res.status(400).json({ error: 'Client name is required.' });
  data.branch_id = resolveBranchId(req, req.body.branch_id);
  data.created_by = req.user?.id || null;
  data.project_code = await generateCode(BusinessRegistrationProject, 'project_code', 'SSPC-BRP-');
  const row = await BusinessRegistrationProject.create(data);
  res.status(201).json({ data: row, message: 'Registration project created.' });
});

// PUT /api/business-registration-projects/:id
exports.update = asyncHandler(async (req, res) => {
  const row = await BusinessRegistrationProject.findOne({ where: { id: req.params.id, ...branchScope(req) } });
  if (!row) return res.status(404).json({ error: 'Registration project not found.' });
  await row.update(pick(req.body, FIELDS));
  res.json({ data: row, message: 'Registration project updated.' });
});

// PATCH /api/business-registration-projects/:id/move — advance the SOP pipeline stage
exports.move = asyncHandler(async (req, res) => {
  const row = await BusinessRegistrationProject.findOne({ where: { id: req.params.id, ...branchScope(req) } });
  if (!row) return res.status(404).json({ error: 'Registration project not found.' });
  const { stage, status, workflow_state } = pick(req.body, ['stage', 'status', 'workflow_state']);
  const patch = { ...(stage ? { stage } : {}), ...(status ? { status } : {}), ...(workflow_state ? { workflow_state } : {}) };
  if (status === 'completed' && !row.completion_date) patch.completion_date = new Date();
  await row.update(patch);
  res.json({ data: row, message: 'Registration project updated.' });
});

// DELETE /api/business-registration-projects/:id
exports.remove = asyncHandler(async (req, res) => {
  const row = await BusinessRegistrationProject.findOne({ where: { id: req.params.id, ...branchScope(req) } });
  if (!row) return res.status(404).json({ error: 'Registration project not found.' });
  await row.destroy();
  res.json({ message: 'Registration project deleted.' });
});
