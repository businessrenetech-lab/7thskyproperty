const { Op } = require('sequelize');
const ServiceProvider = require('../models/ServiceProvider');
const ProviderCompliance = require('../models/ProviderCompliance');
const { generateCode } = require('../utils/codeGenerator');
const { asyncHandler, branchScope, resolveBranchId, getPagination, pick } = require('../utils/controllerHelpers');

const FIELDS = ['contact_id', 'company_name', 'contact_person', 'phone', 'email', 'address', 'specialisations',
  'service_categories', 'coverage_areas', 'availability', 'rate_card', 'bank_details', 'rating', 'internal_notes',
  'non_circumvention_agreed', 'status'];

const computeStatus = (expiry) => {
  if (!expiry) return 'valid';
  const days = (new Date(expiry) - new Date()) / 86400000;
  if (days < 0) return 'expired';
  if (days < 30) return 'expiring';
  return 'valid';
};

exports.list = asyncHandler(async (req, res) => {
  const { limit, offset, page } = getPagination(req);
  const where = { ...branchScope(req) };
  if (req.query.status) where.status = req.query.status;
  if (req.query.search) {
    const s = `%${req.query.search}%`;
    where[Op.or] = [{ company_name: { [Op.like]: s } }, { provider_code: { [Op.like]: s } }, { phone: { [Op.like]: s } }, { email: { [Op.like]: s } }];
  }
  const { rows, count } = await ServiceProvider.findAndCountAll({
    where, limit, offset, order: [['created_at', 'DESC']],
    include: [{ model: ProviderCompliance, as: 'compliance', attributes: ['id', 'expiry_date', 'status'] }],
  });
  res.json({ data: rows, pagination: { page, limit, total: count, pages: Math.ceil(count / limit) } });
});

exports.getOne = asyncHandler(async (req, res) => {
  const p = await ServiceProvider.findOne({ where: { id: req.params.id, ...branchScope(req) }, include: [{ model: ProviderCompliance, as: 'compliance' }] });
  if (!p) return res.status(404).json({ error: 'Provider not found.' });
  res.json({ data: p });
});

exports.create = asyncHandler(async (req, res) => {
  const data = pick(req.body, FIELDS);
  if (!data.company_name) return res.status(400).json({ error: 'company_name is required.' });
  data.branch_id = resolveBranchId(req, req.body.branch_id);
  data.created_by = req.user?.id || null;
  data.provider_code = await generateCode(ServiceProvider, 'provider_code', 'SSPC-SP-');
  if (data.status === 'approved') data.onboarded_at = new Date();
  const p = await ServiceProvider.create(data);
  res.status(201).json({ data: p, message: 'Provider created.' });
});

exports.update = asyncHandler(async (req, res) => {
  const p = await ServiceProvider.findOne({ where: { id: req.params.id, ...branchScope(req) } });
  if (!p) return res.status(404).json({ error: 'Provider not found.' });
  const data = pick(req.body, FIELDS);
  if (data.status === 'approved' && !p.onboarded_at) data.onboarded_at = new Date();
  await p.update(data);
  res.json({ data: p, message: 'Provider updated.' });
});

exports.addCompliance = asyncHandler(async (req, res) => {
  const p = await ServiceProvider.findOne({ where: { id: req.params.id, ...branchScope(req) } });
  if (!p) return res.status(404).json({ error: 'Provider not found.' });
  const body = pick(req.body, ['doc_type', 'title', 'reference_no', 'file_url', 'issued_date', 'expiry_date']);
  body.status = computeStatus(body.expiry_date);
  const c = await ProviderCompliance.create({ provider_id: p.id, ...body, uploaded_by: req.user?.id || null });
  res.status(201).json({ data: c });
});

exports.removeCompliance = asyncHandler(async (req, res) => {
  const c = await ProviderCompliance.findByPk(req.params.complianceId);
  if (!c) return res.status(404).json({ error: 'Record not found.' });
  await c.destroy();
  res.json({ message: 'Compliance record removed.' });
});

// POST /api/providers/:id/portal-access  { email, password, name? }
exports.enablePortal = asyncHandler(async (req, res) => {
  const bcrypt = require('bcryptjs');
  const User = require('../models/User');
  const p = await ServiceProvider.findOne({ where: { id: req.params.id, ...branchScope(req) } });
  if (!p) return res.status(404).json({ error: 'Provider not found.' });
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'email and password are required.' });
  if (await User.findOne({ where: { email } })) return res.status(409).json({ error: 'A user with this email already exists.' });
  const user = await User.create({
    branch_id: p.branch_id, name: req.body.name || p.company_name || email,
    email, password: await bcrypt.hash(password, 12), role: 'supplier', status: 'active',
  });
  await p.update({ portal_user_id: user.id, portal_enabled: true });
  res.status(201).json({ message: 'Portal access enabled.', data: { user_id: user.id, email, role: 'supplier' } });
});
