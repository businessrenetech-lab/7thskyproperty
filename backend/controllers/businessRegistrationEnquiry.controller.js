const { Op, fn, col } = require('sequelize');
const BusinessRegistrationEnquiry = require('../models/BusinessRegistrationEnquiry');
const BusinessRegistrationProject = require('../models/BusinessRegistrationProject');
const { asyncHandler, branchScope, resolveBranchId, getPagination, pick } = require('../utils/controllerHelpers');
const { generateCode } = require('../utils/codeGenerator');

const FIELDS = [
  'enquirer_name', 'company_name', 'phone', 'email', 'client_type', 'service_requested',
  'registration_type', 'source', 'message', 'stage', 'assigned_to', 'contact_id',
  'next_action', 'follow_up_date', 'notes',
];

// GET /api/business-registration-enquiries
exports.list = asyncHandler(async (req, res) => {
  const { limit, offset, page } = getPagination(req);
  const where = { ...branchScope(req) };
  if (req.query.stage) where.stage = req.query.stage;
  if (req.query.converted != null) where.converted = req.query.converted === 'true';
  if (req.query.search) {
    const s = `%${req.query.search}%`;
    where[Op.or] = [
      { enquiry_code: { [Op.like]: s } }, { enquirer_name: { [Op.like]: s } },
      { company_name: { [Op.like]: s } }, { service_requested: { [Op.like]: s } },
    ];
  }
  const { rows, count } = await BusinessRegistrationEnquiry.findAndCountAll({ where, limit, offset, order: [['created_at', 'DESC']] });
  res.json({ data: rows, pagination: { page, limit, total: count, pages: Math.ceil(count / limit) } });
});

// GET /api/business-registration-enquiries/stats
exports.stats = asyncHandler(async (req, res) => {
  const where = { ...branchScope(req) };
  const [total, byStage, converted] = await Promise.all([
    BusinessRegistrationEnquiry.count({ where }),
    BusinessRegistrationEnquiry.findAll({ where, attributes: ['stage', [fn('COUNT', col('id')), 'n']], group: ['stage'], raw: true }),
    BusinessRegistrationEnquiry.count({ where: { ...where, converted: true } }),
  ]);
  res.json({ data: { total, converted, by_stage: Object.fromEntries(byStage.map((r) => [r.stage, Number(r.n)])) } });
});

// GET /api/business-registration-enquiries/:id
exports.getOne = asyncHandler(async (req, res) => {
  const row = await BusinessRegistrationEnquiry.findOne({ where: { id: req.params.id, ...branchScope(req) } });
  if (!row) return res.status(404).json({ error: 'Enquiry not found.' });
  res.json({ data: row });
});

// POST /api/business-registration-enquiries
exports.create = asyncHandler(async (req, res) => {
  const data = pick(req.body, FIELDS);
  if (!data.enquirer_name || !String(data.enquirer_name).trim()) return res.status(400).json({ error: 'Enquirer name is required.' });
  data.branch_id = resolveBranchId(req, req.body.branch_id);
  data.created_by = req.user?.id || null;
  data.enquiry_code = await generateCode(BusinessRegistrationEnquiry, 'enquiry_code', 'SSPC-BRE-');
  const row = await BusinessRegistrationEnquiry.create(data);
  res.status(201).json({ data: row, message: 'Enquiry created.' });
});

// PUT /api/business-registration-enquiries/:id
exports.update = asyncHandler(async (req, res) => {
  const row = await BusinessRegistrationEnquiry.findOne({ where: { id: req.params.id, ...branchScope(req) } });
  if (!row) return res.status(404).json({ error: 'Enquiry not found.' });
  await row.update(pick(req.body, FIELDS));
  res.json({ data: row, message: 'Enquiry updated.' });
});

// POST /api/business-registration-enquiries/:id/convert — spin up a registration project (SOP Step 2)
exports.convert = asyncHandler(async (req, res) => {
  const row = await BusinessRegistrationEnquiry.findOne({ where: { id: req.params.id, ...branchScope(req) } });
  if (!row) return res.status(404).json({ error: 'Enquiry not found.' });
  if (row.converted && row.project_id) return res.status(409).json({ error: 'Enquiry already converted to a project.' });
  const branch_id = resolveBranchId(req);
  const project_code = await generateCode(BusinessRegistrationProject, 'project_code', 'SSPC-BRP-');
  const project = await BusinessRegistrationProject.create({
    branch_id,
    project_code,
    client_contact_id: row.contact_id || null,
    client_type: row.client_type || 'individual',
    client_name: row.company_name || row.enquirer_name,
    client_phone: row.phone,
    client_email: row.email,
    registration_type: row.registration_type || row.service_requested,
    lead_source: row.source,
    assigned_to: row.assigned_to || req.user?.id || null,
    stage: 'consultation',
    status: 'active',
    notes: row.message,
    created_by: req.user?.id || null,
  });
  await row.update({ converted: true, project_id: project.id, stage: 'converted' });
  res.status(201).json({ data: project, message: 'Enquiry converted to a registration project.' });
});

// DELETE /api/business-registration-enquiries/:id
exports.remove = asyncHandler(async (req, res) => {
  const row = await BusinessRegistrationEnquiry.findOne({ where: { id: req.params.id, ...branchScope(req) } });
  if (!row) return res.status(404).json({ error: 'Enquiry not found.' });
  await row.destroy();
  res.json({ message: 'Enquiry deleted.' });
});
