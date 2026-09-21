// Nested child resources of a Business Registration project:
//   consultation assessment, parties (shareholders/directors) and documents.
// Mounted under /api/business-registration-projects/:id/{assessment,parties,documents}.
const BusinessRegistrationProject = require('../models/BusinessRegistrationProject');
const BusinessRegistrationAssessment = require('../models/BusinessRegistrationAssessment');
const BusinessRegistrationParty = require('../models/BusinessRegistrationParty');
const BusinessRegistrationDocument = require('../models/BusinessRegistrationDocument');
const { asyncHandler, branchScope, resolveBranchId, pick } = require('../utils/controllerHelpers');

// Ensure the parent project exists and is in this branch, else 404.
async function ownedProject(req) {
  return BusinessRegistrationProject.findOne({ where: { id: req.params.id, ...branchScope(req) } });
}

// ── Consultation assessment (one per project) ────────────────────────────────
const ASSESS_FIELDS = ['business_objectives', 'ownership_structure', 'proposed_activities', 'regulatory_requirements', 'recommended_structure', 'estimated_timeline', 'risks_notes'];

exports.getAssessment = asyncHandler(async (req, res) => {
  if (!(await ownedProject(req))) return res.status(404).json({ error: 'Project not found.' });
  const row = await BusinessRegistrationAssessment.findOne({ where: { project_id: req.params.id, ...branchScope(req) } });
  res.json({ data: row });
});

// PUT — upsert the single assessment for a project.
exports.saveAssessment = asyncHandler(async (req, res) => {
  const project = await ownedProject(req);
  if (!project) return res.status(404).json({ error: 'Project not found.' });
  const data = pick(req.body, ASSESS_FIELDS);
  let row = await BusinessRegistrationAssessment.findOne({ where: { project_id: req.params.id, ...branchScope(req) } });
  if (row) {
    await row.update({ ...data, assessed_by: req.user?.id || row.assessed_by, assessed_at: new Date() });
  } else {
    row = await BusinessRegistrationAssessment.create({
      ...data, project_id: project.id, branch_id: resolveBranchId(req),
      assessed_by: req.user?.id || null, assessed_at: new Date(), created_by: req.user?.id || null,
    });
  }
  res.json({ data: row, message: 'Assessment saved.' });
});

// ── Parties (shareholders / directors) ───────────────────────────────────────
const PARTY_FIELDS = ['party_role', 'name', 'nid', 'designation', 'share_percentage', 'mobile', 'email', 'address', 'nationality', 'notes'];

exports.listParties = asyncHandler(async (req, res) => {
  if (!(await ownedProject(req))) return res.status(404).json({ error: 'Project not found.' });
  const where = { project_id: req.params.id, ...branchScope(req) };
  if (req.query.party_role) where.party_role = req.query.party_role;
  const rows = await BusinessRegistrationParty.findAll({ where, order: [['created_at', 'ASC']] });
  res.json({ data: rows });
});

exports.createParty = asyncHandler(async (req, res) => {
  const project = await ownedProject(req);
  if (!project) return res.status(404).json({ error: 'Project not found.' });
  const data = pick(req.body, PARTY_FIELDS);
  if (!data.name || !String(data.name).trim()) return res.status(400).json({ error: 'Party name is required.' });
  const row = await BusinessRegistrationParty.create({ ...data, project_id: project.id, branch_id: resolveBranchId(req), created_by: req.user?.id || null });
  res.status(201).json({ data: row, message: 'Party added.' });
});

exports.updateParty = asyncHandler(async (req, res) => {
  const row = await BusinessRegistrationParty.findOne({ where: { id: req.params.pid, project_id: req.params.id, ...branchScope(req) } });
  if (!row) return res.status(404).json({ error: 'Party not found.' });
  await row.update(pick(req.body, PARTY_FIELDS));
  res.json({ data: row, message: 'Party updated.' });
});

exports.removeParty = asyncHandler(async (req, res) => {
  const row = await BusinessRegistrationParty.findOne({ where: { id: req.params.pid, project_id: req.params.id, ...branchScope(req) } });
  if (!row) return res.status(404).json({ error: 'Party not found.' });
  await row.destroy();
  res.json({ message: 'Party removed.' });
});

// ── Documents (register / Schedule D KYC checklist) ──────────────────────────
const DOC_FIELDS = ['category', 'doc_type', 'file_url', 'status', 'notes'];

exports.listDocuments = asyncHandler(async (req, res) => {
  if (!(await ownedProject(req))) return res.status(404).json({ error: 'Project not found.' });
  const rows = await BusinessRegistrationDocument.findAll({ where: { project_id: req.params.id, ...branchScope(req) }, order: [['created_at', 'ASC']] });
  res.json({ data: rows });
});

exports.createDocument = asyncHandler(async (req, res) => {
  const project = await ownedProject(req);
  if (!project) return res.status(404).json({ error: 'Project not found.' });
  const data = pick(req.body, DOC_FIELDS);
  if (!data.doc_type || !String(data.doc_type).trim()) return res.status(400).json({ error: 'Document type is required.' });
  const row = await BusinessRegistrationDocument.create({ ...data, project_id: project.id, branch_id: resolveBranchId(req), created_by: req.user?.id || null });
  res.status(201).json({ data: row, message: 'Document added.' });
});

exports.updateDocument = asyncHandler(async (req, res) => {
  const row = await BusinessRegistrationDocument.findOne({ where: { id: req.params.did, project_id: req.params.id, ...branchScope(req) } });
  if (!row) return res.status(404).json({ error: 'Document not found.' });
  const data = pick(req.body, DOC_FIELDS);
  // Stamp verifier when a document is marked verified.
  if (data.status === 'verified' && row.status !== 'verified') { data.verified_by = req.user?.id || null; data.verified_at = new Date(); }
  await row.update(data);
  res.json({ data: row, message: 'Document updated.' });
});

exports.removeDocument = asyncHandler(async (req, res) => {
  const row = await BusinessRegistrationDocument.findOne({ where: { id: req.params.did, project_id: req.params.id, ...branchScope(req) } });
  if (!row) return res.status(404).json({ error: 'Document not found.' });
  await row.destroy();
  res.json({ message: 'Document removed.' });
});
