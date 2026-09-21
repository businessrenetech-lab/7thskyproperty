const BusinessLease = require('../models/BusinessLease');
const BusinessRentCollection = require('../models/BusinessRentCollection');
const { asyncHandler, branchScope, resolveBranchId, pick } = require('../utils/controllerHelpers');
const { generateCode } = require('../utils/codeGenerator');

const FIELDS = [
  'business_listing_id', 'tenant_contact_id', 'tenant_name', 'monthly_rent', 'security_deposit', 'service_charge',
  'lease_start', 'lease_end', 'lease_term_months', 'rent_due_day', 'rent_review_structure', 'commission_amount', 'status', 'notes',
];
const num = (v) => Number(v || 0);
const pad = (n) => String(n).padStart(2, '0');

// Build a monthly rent schedule from lease terms (SOP ongoing rental management).
function scheduleRows(lease) {
  const rows = [];
  const rent = num(lease.monthly_rent);
  const months = Number(lease.lease_term_months) || 0;
  if (!lease.lease_start || !months || !rent) return rows;
  const start = new Date(lease.lease_start);
  const day = Number(lease.rent_due_day) || 1;
  for (let i = 0; i < months; i++) {
    const d = new Date(start.getFullYear(), start.getMonth() + i, 1);
    const period = `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
    rows.push({
      branch_id: lease.branch_id, lease_id: lease.id, business_listing_id: lease.business_listing_id,
      period_label: period, due_date: `${period}-${pad(Math.min(day, 28))}`, rent_due: rent, rent_received: 0, status: 'due',
    });
  }
  return rows;
}

exports.list = asyncHandler(async (req, res) => {
  const where = { ...branchScope(req) };
  if (req.query.business_listing_id) where.business_listing_id = req.query.business_listing_id;
  if (req.query.status) where.status = req.query.status;
  const rows = await BusinessLease.findAll({ where, order: [['created_at', 'DESC']] });
  res.json({ data: rows });
});

exports.getOne = asyncHandler(async (req, res) => {
  const row = await BusinessLease.findOne({ where: { id: req.params.id, ...branchScope(req) } });
  if (!row) return res.status(404).json({ error: 'Lease not found.' });
  res.json({ data: row });
});

exports.create = asyncHandler(async (req, res) => {
  const data = pick(req.body, FIELDS);
  if (!data.business_listing_id) return res.status(400).json({ error: 'business_listing_id is required.' });
  data.branch_id = resolveBranchId(req, req.body.branch_id);
  data.created_by = req.user?.id || null;
  data.lease_code = await generateCode(BusinessLease, 'lease_code', 'SSPC-BL-');
  const row = await BusinessLease.create(data);
  // Auto-generate the rent schedule unless the caller opts out.
  if (req.body.generate_schedule !== false) {
    const rows = scheduleRows(row.get({ plain: true })).map((r) => ({ ...r, created_by: req.user?.id || null }));
    if (rows.length) await BusinessRentCollection.bulkCreate(rows);
  }
  res.status(201).json({ data: row, message: 'Lease created.' });
});

exports.update = asyncHandler(async (req, res) => {
  const row = await BusinessLease.findOne({ where: { id: req.params.id, ...branchScope(req) } });
  if (!row) return res.status(404).json({ error: 'Lease not found.' });
  await row.update(pick(req.body, FIELDS));
  res.json({ data: row, message: 'Lease updated.' });
});

// POST /api/business-leases/:id/generate-schedule — (re)build the rent schedule
exports.generateSchedule = asyncHandler(async (req, res) => {
  const row = await BusinessLease.findOne({ where: { id: req.params.id, ...branchScope(req) } });
  if (!row) return res.status(404).json({ error: 'Lease not found.' });
  const existing = await BusinessRentCollection.findAll({ where: { lease_id: row.id, ...branchScope(req) }, attributes: ['period_label'] });
  const have = new Set(existing.map((r) => r.period_label));
  const rows = scheduleRows(row.get({ plain: true })).filter((r) => !have.has(r.period_label)).map((r) => ({ ...r, created_by: req.user?.id || null }));
  if (rows.length) await BusinessRentCollection.bulkCreate(rows);
  res.json({ message: `Rent schedule ready (${rows.length} periods added).`, added: rows.length });
});

exports.remove = asyncHandler(async (req, res) => {
  const row = await BusinessLease.findOne({ where: { id: req.params.id, ...branchScope(req) } });
  if (!row) return res.status(404).json({ error: 'Lease not found.' });
  await BusinessRentCollection.destroy({ where: { lease_id: row.id, ...branchScope(req) } });
  await row.destroy();
  res.json({ message: 'Lease deleted.' });
});
