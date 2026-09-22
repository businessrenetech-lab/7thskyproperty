const BusinessDocument = require('../models/BusinessDocument');
const BusinessAssessment = require('../models/BusinessAssessment');
const Notification = require('../models/Notification');
const User = require('../models/User');
const { Op } = require('sequelize');
const { asyncHandler, branchScope, resolveBranchId, pick } = require('../utils/controllerHelpers');

const parseList = (v) => { if (Array.isArray(v)) return v; if (typeof v === 'string') { try { const p = JSON.parse(v); return Array.isArray(p) ? p : []; } catch { return []; } } return []; };

const FIELDS = ['business_listing_id', 'property_id', 'doc_type', 'name', 'status', 'file_url', 'is_confidential', 'notes'];

// The Schedule D document checklist — seeds a listing's register on demand.
const DEFAULT_DOCS = [
  ['trade_licence', 'Trade Licence'],
  ['company_registration', 'Company Registration Certificate'],
  ['tin_bin', 'TIN / BIN'],
  ['financial_statements', 'Financial Statements'],
  ['tax_records', 'Tax Records'],
  ['lease_agreement', 'Lease Agreement'],
  ['asset_register', 'Business Asset Register'],
  ['supplier_agreement', 'Supplier Agreements'],
  ['employee_info', 'Employee Information'],
  ['operational_licence', 'Operational Licences'],
];

// GET /api/business-documents?business_listing_id=
exports.list = asyncHandler(async (req, res) => {
  const where = { ...branchScope(req) };
  if (req.query.business_listing_id) where.business_listing_id = req.query.business_listing_id;
  if (req.query.property_id) where.property_id = req.query.property_id;
  const rows = await BusinessDocument.findAll({ where, order: [['created_at', 'ASC']] });
  res.json({ data: rows });
});

// POST /api/business-documents
exports.create = asyncHandler(async (req, res) => {
  const data = pick(req.body, FIELDS);
  if (!data.business_listing_id && !data.property_id) return res.status(400).json({ error: 'property_id or business_listing_id is required.' });
  data.branch_id = resolveBranchId(req, req.body.branch_id);
  data.created_by = req.user?.id || null;
  const row = await BusinessDocument.create(data);
  res.status(201).json({ data: row, message: 'Document added.' });
});

// POST /api/business-documents/seed-checklist — { property_id } or { business_listing_id }
exports.seedChecklist = asyncHandler(async (req, res) => {
  const key = req.body.property_id ? { property_id: Number(req.body.property_id) }
    : req.body.business_listing_id ? { business_listing_id: Number(req.body.business_listing_id) } : null;
  if (!key) return res.status(400).json({ error: 'property_id or business_listing_id is required.' });
  const branch_id = resolveBranchId(req, req.body.branch_id);
  const existing = await BusinessDocument.findAll({ where: { ...key, ...branchScope(req) }, attributes: ['doc_type'] });
  const have = new Set(existing.map((r) => r.doc_type));
  const toAdd = DEFAULT_DOCS.filter(([type]) => !have.has(type));
  if (toAdd.length) {
    await BusinessDocument.bulkCreate(toAdd.map(([doc_type, name]) => ({
      branch_id, ...key, doc_type, name, status: 'required', is_confidential: true, created_by: req.user?.id || null,
    })));
  }
  const rows = await BusinessDocument.findAll({ where: { ...key, ...branchScope(req) }, order: [['created_at', 'ASC']] });
  res.json({ data: rows, message: `Checklist ready (${toAdd.length} added).` });
});

// PUT /api/business-documents/:id
exports.update = asyncHandler(async (req, res) => {
  const row = await BusinessDocument.findOne({ where: { id: req.params.id, ...branchScope(req) } });
  if (!row) return res.status(404).json({ error: 'Document not found.' });
  await row.update(pick(req.body, FIELDS));
  res.json({ data: row, message: 'Document updated.' });
});

// PATCH /api/business-documents/:id/verify — mark verified/rejected
exports.verify = asyncHandler(async (req, res) => {
  const row = await BusinessDocument.findOne({ where: { id: req.params.id, ...branchScope(req) } });
  if (!row) return res.status(404).json({ error: 'Document not found.' });
  const status = req.body.status === 'rejected' ? 'rejected' : 'verified';
  await row.update({ status, verified_by: req.user?.id || null, verified_at: new Date(), notes: req.body.notes ?? row.notes });
  res.json({ data: row, message: `Document ${status}.` });
});

// POST /api/business-documents/:id/escalate — flag a compliance risk (SOP Step 20):
// document → rejected, risk added to the property's latest assessment, managers notified.
exports.escalate = asyncHandler(async (req, res) => {
  const doc = await BusinessDocument.findOne({ where: { id: req.params.id, ...branchScope(req) } });
  if (!doc) return res.status(404).json({ error: 'Document not found.' });
  const note = String(req.body.note || '').trim();
  if (!note) return res.status(400).json({ error: 'Describe the compliance concern.' });
  await doc.update({ status: 'rejected', notes: [doc.notes, `ESCALATED: ${note}`].filter(Boolean).join('\n'), verified_by: req.user?.id || null, verified_at: new Date() });

  const owner = doc.property_id ? { property_id: doc.property_id } : { business_listing_id: doc.business_listing_id };
  let assessment = await BusinessAssessment.findOne({ where: { ...owner, ...branchScope(req) }, order: [['created_at', 'DESC']] });
  const risk = { category: 'compliance', description: `${doc.name}: ${note}`, severity: 'high', source_document_id: doc.id, raised_at: new Date().toISOString() };
  if (assessment) await assessment.update({ risks: [...parseList(assessment.risks), risk] });
  else assessment = await BusinessAssessment.create({ ...owner, branch_id: doc.branch_id, assessment_type: 'risk', risks: [risk], status: 'draft', created_by: req.user?.id || null });

  const managers = await User.findAll({ where: { role: { [Op.in]: ['super_admin', 'branch_admin'] } }, attributes: ['id', 'branch_id'], raw: true });
  await Promise.all(managers.filter((m) => !m.branch_id || m.branch_id === doc.branch_id).map((m) => Notification.create({
    user_id: m.id, branch_id: doc.branch_id, title: 'Compliance risk escalated', type: 'alert',
    message: `${doc.name} flagged on ${doc.property_id ? `property #${doc.property_id}` : `listing #${doc.business_listing_id}`}: ${note}`,
  })));
  res.json({ data: { document: doc, assessment }, message: 'Escalated to management.' });
});

// DELETE /api/business-documents/:id
exports.remove = asyncHandler(async (req, res) => {
  const row = await BusinessDocument.findOne({ where: { id: req.params.id, ...branchScope(req) } });
  if (!row) return res.status(404).json({ error: 'Document not found.' });
  await row.destroy();
  res.json({ message: 'Document deleted.' });
});
