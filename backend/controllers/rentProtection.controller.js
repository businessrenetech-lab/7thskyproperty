/**
 * Non-circumvention protection for the rent consoles — SOP Business Rental
 * Management §13 and Business Tenancy Management §12.
 *
 * Reuses non_circumvention_records with context 'rental' (the sales engine owns
 * context 'sale' and is untouched here). `category` scopes the record to the
 * console that made the introduction; rows written before this existed carry
 * category NULL and are returned by an unscoped query exactly as before.
 */
const NonCircumventionRecord = require('../models/NonCircumventionRecord');
const Property = require('../models/Property');
const { generateCode } = require('../utils/codeGenerator');
const { asyncHandler, branchScope, resolveBranchId, pick } = require('../utils/controllerHelpers');
const { pmCategory } = require('../utils/pmCategory');
const { protectionExpiry, protectionState } = require('../services/protectionWindow');

const FIELDS = ['owner_contact_id', 'tenant_contact_id', 'property_id', 'tenancy_id',
  'protected_relationship', 'introduction_date', 'protection_basis', 'direct_communication_allowed',
  'breach_risk', 'monitoring_notes', 'status', 'protection_expires_on', 'evidence_trail'];

const withState = (row) => {
  const r = row.toJSON ? row.toJSON() : row;
  return { ...r, protection: protectionState(r) };
};

exports.list = asyncHandler(async (req, res) => {
  const where = { ...branchScope(req), context: 'rental' };
  const cat = pmCategory(req.query.category);
  if (cat) where.category = cat;
  if (req.query.property_id) where.property_id = req.query.property_id;
  if (req.query.status) where.status = req.query.status;
  const rows = await NonCircumventionRecord.findAll({ where, order: [['created_at', 'DESC']] });
  res.json({ data: rows.map(withState) });
});

exports.create = asyncHandler(async (req, res) => {
  const data = pick(req.body, FIELDS);
  if (!data.introduction_date) data.introduction_date = new Date().toISOString().slice(0, 10);
  // The SOP window is the engagement plus 12 months unless one was given.
  if (!data.protection_expires_on) data.protection_expires_on = protectionExpiry(data.introduction_date);

  const property = data.property_id ? await Property.findByPk(data.property_id) : null;
  data.category = pmCategory(req.query.category) || property?.category || null;
  data.context = 'rental';
  data.branch_id = resolveBranchId(req, property?.branch_id ?? req.body.branch_id);
  data.created_by = req.user?.id || null;
  data.introduced_by = req.body.introduced_by || req.user?.id || null;
  data.record_code = await generateCode(NonCircumventionRecord, 'record_code', 'SSPC-IN-');

  const row = await NonCircumventionRecord.create(data);
  res.status(201).json({ data: withState(row), message: `Introduction ${row.record_code} protected.` });
});

exports.update = asyncHandler(async (req, res) => {
  const row = await NonCircumventionRecord.findOne({
    where: { id: req.params.id, ...branchScope(req), context: 'rental' },
  });
  if (!row) return res.status(404).json({ error: 'Protected introduction not found.' });
  const patch = pick(req.body, FIELDS);
  // Moving the introduction date moves the window with it, unless one is given.
  if (patch.introduction_date && !patch.protection_expires_on) {
    patch.protection_expires_on = protectionExpiry(patch.introduction_date);
  }
  await row.update(patch);
  res.json({ data: withState(row), message: 'Protected introduction updated.' });
});
