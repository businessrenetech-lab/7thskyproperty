const { Op } = require('sequelize');
const sequelize = require('../config/db.config');
const Agreement = require('../models/Agreement');
const AgreementVersion = require('../models/AgreementVersion');
const { generateCode } = require('../utils/codeGenerator');
const { asyncHandler, branchScope, resolveBranchId, getPagination, pick } = require('../utils/controllerHelpers');

const META_FIELDS = ['title', 'category', 'vertical_key', 'description', 'purpose', 'status'];

// GET /api/agreements
exports.list = asyncHandler(async (req, res) => {
  const { limit, offset, page } = getPagination(req);
  const where = { ...branchScope(req) };
  if (req.query.category) where.category = req.query.category;
  if (req.query.vertical_key) where.vertical_key = req.query.vertical_key;
  if (req.query.status) where.status = req.query.status;
  if (req.query.search) {
    const s = `%${req.query.search}%`;
    where[Op.or] = [{ title: { [Op.like]: s } }, { agreement_code: { [Op.like]: s } }];
  }
  const { rows, count } = await Agreement.findAndCountAll({ where, limit, offset, order: [['created_at', 'DESC']] });
  res.json({ data: rows, pagination: { page, limit, total: count, pages: Math.ceil(count / limit) } });
});

// GET /api/agreements/:id  (with full version history)
exports.getOne = asyncHandler(async (req, res) => {
  const agreement = await Agreement.findOne({
    where: { id: req.params.id, ...branchScope(req) },
    include: [{ model: AgreementVersion, as: 'versions' }],
    order: [[{ model: AgreementVersion, as: 'versions' }, 'version', 'DESC']],
  });
  if (!agreement) return res.status(404).json({ error: 'Agreement not found.' });
  res.json({ data: agreement });
});

// POST /api/agreements   (multipart; optional first-version file)
exports.create = asyncHandler(async (req, res) => {
  const data = pick(req.body, META_FIELDS);
  if (!data.title) return res.status(400).json({ error: 'title is required.' });

  const result = await sequelize.transaction(async (t) => {
    const agreement = await Agreement.create({
      ...data,
      branch_id: resolveBranchId(req, req.body.branch_id),
      agreement_code: await generateCode(Agreement, 'agreement_code', 'SSPC-AGR-'),
      created_by: req.user?.id || null,
    }, { transaction: t });

    // Optional first version on creation
    if (req.file) {
      const v = await AgreementVersion.create({
        agreement_id: agreement.id,
        version: 1,
        file_url: `/uploads/agreements/${req.file.filename}`,
        file_name: req.file.originalname,
        mime_type: req.file.mimetype,
        effective_date: req.body.effective_date || null,
        change_note: req.body.change_note || 'Initial version',
        is_current: true,
        uploaded_by: req.user?.id || null,
      }, { transaction: t });
      await agreement.update({
        current_version: 1,
        current_effective_date: v.effective_date,
        current_file_url: v.file_url,
      }, { transaction: t });
    }
    return agreement;
  });

  const fresh = await Agreement.findByPk(result.id, { include: [{ model: AgreementVersion, as: 'versions' }] });
  res.status(201).json({ data: fresh, message: 'Agreement created.' });
});

// PUT /api/agreements/:id   (metadata only — code & id never change)
exports.update = asyncHandler(async (req, res) => {
  const agreement = await Agreement.findOne({ where: { id: req.params.id, ...branchScope(req) } });
  if (!agreement) return res.status(404).json({ error: 'Agreement not found.' });
  await agreement.update(pick(req.body, META_FIELDS));
  res.json({ data: agreement, message: 'Agreement updated.' });
});

// POST /api/agreements/:id/versions   (multipart file -> new version)
exports.uploadVersion = asyncHandler(async (req, res) => {
  const agreement = await Agreement.findOne({ where: { id: req.params.id, ...branchScope(req) } });
  if (!agreement) return res.status(404).json({ error: 'Agreement not found.' });
  if (!req.file) return res.status(400).json({ error: 'A document file is required.' });

  const version = await sequelize.transaction(async (t) => {
    const nextVersion = (agreement.current_version || 0) + 1;
    // Unset previous current
    await AgreementVersion.update({ is_current: false }, { where: { agreement_id: agreement.id }, transaction: t });
    const v = await AgreementVersion.create({
      agreement_id: agreement.id,
      version: nextVersion,
      file_url: `/uploads/agreements/${req.file.filename}`,
      file_name: req.file.originalname,
      mime_type: req.file.mimetype,
      effective_date: req.body.effective_date || null,
      change_note: req.body.change_note || null,
      is_current: true,
      uploaded_by: req.user?.id || null,
    }, { transaction: t });
    await agreement.update({
      current_version: nextVersion,
      current_effective_date: v.effective_date,
      current_file_url: v.file_url,
    }, { transaction: t });
    return v;
  });

  res.status(201).json({ data: version, message: `Version ${version.version} uploaded. Agreement ${agreement.agreement_code} (ID unchanged).` });
});

// GET /api/agreements/:id/versions
exports.listVersions = asyncHandler(async (req, res) => {
  const agreement = await Agreement.findOne({ where: { id: req.params.id, ...branchScope(req) } });
  if (!agreement) return res.status(404).json({ error: 'Agreement not found.' });
  const versions = await AgreementVersion.findAll({ where: { agreement_id: agreement.id }, order: [['version', 'DESC']] });
  res.json({ data: versions });
});

// PATCH /api/agreements/:id/versions/:versionId/set-current  (choose effective version)
exports.setCurrentVersion = asyncHandler(async (req, res) => {
  const agreement = await Agreement.findOne({ where: { id: req.params.id, ...branchScope(req) } });
  if (!agreement) return res.status(404).json({ error: 'Agreement not found.' });
  const target = await AgreementVersion.findOne({ where: { id: req.params.versionId, agreement_id: agreement.id } });
  if (!target) return res.status(404).json({ error: 'Version not found.' });

  await sequelize.transaction(async (t) => {
    await AgreementVersion.update({ is_current: false }, { where: { agreement_id: agreement.id }, transaction: t });
    await target.update({ is_current: true }, { transaction: t });
    await agreement.update({
      current_version: target.version,
      current_effective_date: target.effective_date,
      current_file_url: target.file_url,
    }, { transaction: t });
  });
  res.json({ data: target, message: `Version ${target.version} set as current.` });
});

// DELETE /api/agreements/:id  (archive — never hard-delete legal records)
exports.archive = asyncHandler(async (req, res) => {
  const agreement = await Agreement.findOne({ where: { id: req.params.id, ...branchScope(req) } });
  if (!agreement) return res.status(404).json({ error: 'Agreement not found.' });
  await agreement.update({ status: 'archived' });
  res.json({ message: 'Agreement archived.' });
});
