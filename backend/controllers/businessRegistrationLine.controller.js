const BusinessRegistrationParty = require('../models/BusinessRegistrationParty');
const BusinessRegistrationActivity = require('../models/BusinessRegistrationActivity');
const { getServiceLine } = require('../config/serviceLines');
const { asyncHandler, branchScope, resolveBranchId, resolveServiceLine, pick } = require('../utils/controllerHelpers');

// Business Registration line module (manifest `registration_register: true`):
// shareholders/directors and the registration activities (name clearance, trade
// licence, RJSC, TIN/BIN/VAT, authority liaison). SOP Phases 2 and 6.
const PARTY_FIELDS = ['party_role', 'name', 'nid', 'designation', 'share_percentage', 'mobile', 'email', 'address', 'nationality', 'notes'];
const ACTIVITY_FIELDS = ['activity_type', 'title', 'authority', 'reference_no', 'status', 'outcome', 'rejection_reason', 'work_order_id', 'notes'];
const PARTY_ROLES = ['shareholder', 'director'];
const ACTIVITY_TYPES = ['name_clearance', 'trade_licence', 'rjsc', 'tin', 'bin', 'vat', 'authority_liaison'];

// Guard: this module exists only for lines whose manifest switches it on.
function guard(req, res) {
  if (!getServiceLine(resolveServiceLine(req)).registration_register) {
    res.status(403).json({ error: 'Not available for this service line.' });
    return false;
  }
  return true;
}

const scope = (req) => ({ ...branchScope(req) });

exports.listParties = asyncHandler(async (req, res) => {
  if (!guard(req, res)) return;
  const rows = await BusinessRegistrationParty.findAll({
    where: { wt_project_id: req.params.projectId, ...scope(req) },
    order: [['party_role', 'ASC'], ['created_at', 'ASC']],
  });
  res.json({ data: rows });
});

exports.createParty = asyncHandler(async (req, res) => {
  if (!guard(req, res)) return;
  const data = pick(req.body, PARTY_FIELDS);
  if (!PARTY_ROLES.includes(data.party_role)) return res.status(400).json({ error: 'party_role must be shareholder or director.' });
  if (!data.name) return res.status(400).json({ error: 'name is required.' });
  const row = await BusinessRegistrationParty.create({
    ...data,
    wt_project_id: Number(req.params.projectId),
    branch_id: resolveBranchId(req, req.body.branch_id),
    created_by: req.user?.id || null,
  });
  res.status(201).json({ data: row, message: 'Party added.' });
});

exports.updateParty = asyncHandler(async (req, res) => {
  if (!guard(req, res)) return;
  const row = await BusinessRegistrationParty.findOne({ where: { id: req.params.id, ...scope(req) } });
  if (!row) return res.status(404).json({ error: 'Party not found.' });
  await row.update(pick(req.body, PARTY_FIELDS));
  res.json({ data: row, message: 'Party updated.' });
});

exports.removeParty = asyncHandler(async (req, res) => {
  if (!guard(req, res)) return;
  const row = await BusinessRegistrationParty.findOne({ where: { id: req.params.id, ...scope(req) } });
  if (!row) return res.status(404).json({ error: 'Party not found.' });
  await row.destroy();
  res.json({ message: 'Party removed.' });
});

// GET /api/br-line/activities — every activity for this line, newest first (console list).
exports.allActivities = asyncHandler(async (req, res) => {
  if (!guard(req, res)) return;
  const rows = await BusinessRegistrationActivity.findAll({ where: scope(req), order: [['created_at', 'DESC']], limit: 500 });
  res.json({ data: rows });
});

exports.listActivities = asyncHandler(async (req, res) => {
  if (!guard(req, res)) return;
  const rows = await BusinessRegistrationActivity.findAll({
    where: { wt_project_id: req.params.projectId, ...scope(req) },
    order: [['created_at', 'ASC']],
  });
  res.json({ data: rows });
});

exports.createActivity = asyncHandler(async (req, res) => {
  if (!guard(req, res)) return;
  const data = pick(req.body, ACTIVITY_FIELDS);
  if (!ACTIVITY_TYPES.includes(data.activity_type)) {
    return res.status(400).json({ error: `activity_type must be one of: ${ACTIVITY_TYPES.join(', ')}.` });
  }
  const row = await BusinessRegistrationActivity.create({
    ...data,
    status: data.status || 'pending',
    wt_project_id: Number(req.params.projectId),
    branch_id: resolveBranchId(req, req.body.branch_id),
    created_by: req.user?.id || null,
  });
  res.status(201).json({ data: row, message: 'Activity created.' });
});

// Status changes stamp their own timestamps, so the Government Liaison and Risk
// dashboards can measure turnaround and count rejections.
exports.updateActivity = asyncHandler(async (req, res) => {
  if (!guard(req, res)) return;
  const row = await BusinessRegistrationActivity.findOne({ where: { id: req.params.id, ...scope(req) } });
  if (!row) return res.status(404).json({ error: 'Activity not found.' });
  const data = pick(req.body, ACTIVITY_FIELDS);
  if (data.status === 'submitted' && !row.submitted_at) data.submitted_at = new Date();
  if (['completed', 'rejected'].includes(data.status) && !row.completed_at) data.completed_at = new Date();
  await row.update(data);
  res.json({ data: row, message: 'Activity updated.' });
});
