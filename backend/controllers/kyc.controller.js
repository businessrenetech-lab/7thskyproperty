/**
 * kyc.controller.js — unified KYC documents across all roles + the review center.
 */
const { Op } = require('sequelize');
const sequelize = require('../config/db.config');
const KycDocument = require('../models/KycDocument');
const { requirementsFor, evaluate } = require('../services/kycRequirements.service');
const { asyncHandler, branchScope, resolveBranchId, getPagination, pick } = require('../utils/controllerHelpers');

const FIELDS = ['related_type', 'related_id', 'party_role_profile_id', 'agreement_id', 'role', 'document_type', 'title',
  'file_url', 'file_url_back', 'reference_no', 'issue_date', 'expiry_date', 'is_required'];

// GET /api/kyc/requirements/:role
exports.requirements = asyncHandler(async (req, res) => {
  res.json({ data: requirementsFor(req.params.role) });
});

// GET /api/kyc/documents?related_type=&related_id=&role=
exports.list = asyncHandler(async (req, res) => {
  const where = { ...branchScope(req) };
  if (req.query.related_type) where.related_type = req.query.related_type;
  if (req.query.related_id) where.related_id = req.query.related_id;
  if (req.query.role) where.role = req.query.role;
  const rows = await KycDocument.findAll({ where, order: [['created_at', 'DESC']] });
  res.json({ data: rows });
});

// GET /api/kyc/status?related_type=&related_id=&role=
exports.status = asyncHandler(async (req, res) => {
  const where = { ...branchScope(req), related_type: req.query.related_type, related_id: req.query.related_id };
  const docs = await KycDocument.findAll({ where, raw: true });
  res.json({ data: evaluate(req.query.role, docs) });
});

// POST /api/kyc/documents
exports.create = asyncHandler(async (req, res) => {
  const data = pick(req.body, FIELDS);
  if (!data.related_type || !data.related_id || !data.document_type) return res.status(400).json({ error: 'related_type, related_id and document_type are required.' });
  data.branch_id = resolveBranchId(req, req.body.branch_id);
  data.uploaded_by = req.user?.id || null;
  data.uploaded_by_role = 'admin';
  data.status = data.file_url ? 'submitted' : 'missing';
  const row = await KycDocument.create(data);
  try { await require('../services/kycAutomation.service').onKycChange(row); } catch (e) { /* non-fatal */ }
  res.status(201).json({ data: row, message: 'Document added.' });
});

// PATCH /api/kyc/documents/:id  (edit fields / replace file)
exports.update = asyncHandler(async (req, res) => {
  const row = await KycDocument.findOne({ where: { id: req.params.id, ...branchScope(req) } });
  if (!row) return res.status(404).json({ error: 'Document not found.' });
  const patch = pick(req.body, FIELDS);
  if (patch.file_url || patch.file_url_back) patch.status = 'submitted';
  await row.update(patch);
  try { await require('../services/kycAutomation.service').onKycChange(row); } catch (e) { /* non-fatal */ }
  res.json({ data: row, message: 'Document updated.' });
});

// PATCH /api/kyc/documents/:id/verify  { action: verify|reject|resubmit|expire, reason?, notes? }
exports.verify = asyncHandler(async (req, res) => {
  const row = await KycDocument.findOne({ where: { id: req.params.id, ...branchScope(req) } });
  if (!row) return res.status(404).json({ error: 'Document not found.' });
  const map = { verify: 'verified', reject: 'rejected', resubmit: 'needs_resubmission', expire: 'expired' };
  const status = map[req.body.action];
  if (!status) return res.status(400).json({ error: 'Invalid action.' });
  await row.update({
    status, verified_by: req.user?.id || null, verified_at: new Date(),
    rejection_reason: (status === 'rejected' || status === 'needs_resubmission') ? (req.body.reason || null) : null,
    reviewer_notes: req.body.notes || row.reviewer_notes,
  });
  // Roll up to the linked role/agreement automation.
  try { await require('../services/kycAutomation.service').onKycChange(row); } catch (e) { /* non-fatal */ }
  res.json({ data: row, message: `Document ${status.replace(/_/g, ' ')}.` });
});

exports.remove = asyncHandler(async (req, res) => {
  const row = await KycDocument.findOne({ where: { id: req.params.id, ...branchScope(req) } });
  if (!row) return res.status(404).json({ error: 'Document not found.' });
  await row.destroy();
  try { await require('../services/kycAutomation.service').onKycChange(row); } catch (e) { /* non-fatal */ }
  res.json({ message: 'Document removed.' });
});

// GET /api/kyc/review  — the KYC Review Center (all documents needing attention)
exports.review = asyncHandler(async (req, res) => {
  const { limit, offset, page } = getPagination(req);
  const where = { ...branchScope(req) };
  if (req.query.role) where.role = req.query.role;
  if (req.query.status) where.status = req.query.status;
  else where.status = { [Op.in]: ['submitted', 'needs_resubmission', 'rejected'] };
  const { rows, count } = await KycDocument.findAndCountAll({ where, limit, offset, order: [['created_at', 'ASC']] });
  // status breakdown for tabs
  const grp = await KycDocument.findAll({ where: branchScope(req), attributes: ['status', [sequelize.fn('COUNT', sequelize.col('id')), 'c']], group: ['status'], raw: true });
  res.json({ data: rows, status_counts: grp.reduce((a, r) => { a[r.status] = Number(r.c); return a; }, {}), pagination: { page, limit, total: count, pages: Math.ceil(count / limit) } });
});
