const Property = require('../models/Property');
const PropertyBusinessProfile = require('../models/PropertyBusinessProfile');
const { asyncHandler, branchScope, resolveBranchId, pick } = require('../utils/controllerHelpers');

const FIELDS = ['business_type', 'industry', 'ownership_structure', 'company_registration_no', 'trade_licence_no', 'tin_bin',
  'year_established', 'staff_count', 'lease_status', 'lease_details', 'reason_for_sale', 'annual_turnover', 'annual_profit',
  'monthly_revenue', 'included_assets', 'stock_info', 'employee_info', 'ip_details', 'teaser_headline', 'teaser_summary', 'preparation'];
const NUMERIC = ['year_established', 'staff_count', 'annual_turnover', 'annual_profit', 'monthly_revenue'];

const parseJson = (v) => { if (typeof v !== 'string') return v; try { return JSON.parse(v); } catch { return null; } };
const shape = (row) => { if (!row) return null; const p = row.get ? row.get({ plain: true }) : row; return { ...p, preparation: parseJson(p.preparation) || [] }; };

async function businessProperty(req) {
  return Property.findOne({ where: { id: req.params.id, ...branchScope(req) }, attributes: ['id', 'branch_id', 'category'] });
}

// GET /api/properties/:id/business-profile
exports.get = asyncHandler(async (req, res) => {
  const prop = await businessProperty(req);
  if (!prop) return res.status(404).json({ error: 'Property not found.' });
  const row = await PropertyBusinessProfile.findOne({ where: { property_id: prop.id } });
  res.json({ data: shape(row) });
});

// PUT /api/properties/:id/business-profile — partial upsert (only the fields sent change)
exports.upsert = asyncHandler(async (req, res) => {
  const prop = await businessProperty(req);
  if (!prop) return res.status(404).json({ error: 'Property not found.' });
  if (prop.category !== 'business') return res.status(400).json({ error: 'Business profiles apply to business properties only.' });
  const data = pick(req.body, FIELDS);
  for (const k of NUMERIC) if (k in data) data[k] = data[k] === '' || data[k] == null ? null : Number(data[k]);
  if ('preparation' in data && !Array.isArray(parseJson(data.preparation))) return res.status(400).json({ error: 'preparation must be a list.' });
  let row = await PropertyBusinessProfile.findOne({ where: { property_id: prop.id } });
  if (row) await row.update(data);
  else row = await PropertyBusinessProfile.create({ ...data, property_id: prop.id, branch_id: resolveBranchId(req, prop.branch_id), created_by: req.user?.id || null });
  res.json({ data: shape(row), message: 'Business profile saved.' });
});
