const BusinessDocument = require('../models/BusinessDocument');
const { asyncHandler, branchScope, resolveBranchId, pick } = require('../utils/controllerHelpers');

const FIELDS = ['business_listing_id', 'doc_type', 'name', 'status', 'file_url', 'is_confidential', 'notes'];

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
  const rows = await BusinessDocument.findAll({ where, order: [['created_at', 'ASC']] });
  res.json({ data: rows });
});

// POST /api/business-documents
exports.create = asyncHandler(async (req, res) => {
  const data = pick(req.body, FIELDS);
  if (!data.business_listing_id) return res.status(400).json({ error: 'business_listing_id is required.' });
  data.branch_id = resolveBranchId(req, req.body.branch_id);
  data.created_by = req.user?.id || null;
  const row = await BusinessDocument.create(data);
  res.status(201).json({ data: row, message: 'Document added.' });
});

// POST /api/business-documents/seed-checklist — create the Schedule D register for a listing
exports.seedChecklist = asyncHandler(async (req, res) => {
  const business_listing_id = req.body.business_listing_id;
  if (!business_listing_id) return res.status(400).json({ error: 'business_listing_id is required.' });
  const branch_id = resolveBranchId(req, req.body.branch_id);
  const existing = await BusinessDocument.findAll({ where: { business_listing_id, ...branchScope(req) }, attributes: ['doc_type'] });
  const have = new Set(existing.map((r) => r.doc_type));
  const toAdd = DEFAULT_DOCS.filter(([type]) => !have.has(type));
  if (toAdd.length) {
    await BusinessDocument.bulkCreate(toAdd.map(([doc_type, name]) => ({
      branch_id, business_listing_id, doc_type, name, status: 'required', is_confidential: true, created_by: req.user?.id || null,
    })));
  }
  const rows = await BusinessDocument.findAll({ where: { business_listing_id, ...branchScope(req) }, order: [['created_at', 'ASC']] });
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

// DELETE /api/business-documents/:id
exports.remove = asyncHandler(async (req, res) => {
  const row = await BusinessDocument.findOne({ where: { id: req.params.id, ...branchScope(req) } });
  if (!row) return res.status(404).json({ error: 'Document not found.' });
  await row.destroy();
  res.json({ message: 'Document deleted.' });
});
