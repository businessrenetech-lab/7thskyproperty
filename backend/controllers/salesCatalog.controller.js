// backend/controllers/salesCatalog.controller.js
//
// Editable Schedule C price schedules for the property SALES / RENTAL lines —
// the same idea as the Water Tank price schedule (/wt-catalogue), but these
// catalogues are keyed by an explicit ServiceItem `vertical` rather than a
// service-line header. Quotations and agreements (RPSS/RPPS/RPRM/RPTM/CPSS/CPPS)
// are priced from these rows, so a price edited here is the new "standard price"
// for NEW work only — signed agreements keep the figure captured at signing.
const { asyncHandler, resolveBranchId } = require('../utils/controllerHelpers');
const ServiceItem = require('../models/ServiceItem');
const ServiceCategory = require('../models/ServiceCategory');
const { generateCode } = require('../utils/codeGenerator');

// Whitelist — only these verticals may be edited through this endpoint, so it
// can never be pointed at an unrelated service-line catalogue.
const SCHEDULES = {
  sale_sale: { label: 'Residential — Sale', scope: 'residential', group: 'rpss', prefix: 'RPSS-' },
  sale_purchase: { label: 'Residential — Purchase (Buy)', scope: 'residential', group: 'rpps', prefix: 'RPPS-' },
  residential_pm: { label: 'Residential — Rental Management', scope: 'residential', group: 'rprm', prefix: 'RPRM-' },
  tenancy_mgmt: { label: 'Residential — Tenancy Management', scope: 'residential', group: 'rptm', prefix: 'RPTM-' },
  sale_sale_commercial: { label: 'Commercial — Sale', scope: 'commercial', group: 'cpss', prefix: 'CPSS-' },
  sale_purchase_commercial: { label: 'Commercial — Purchase (Buy)', scope: 'commercial', group: 'cpps', prefix: 'CPPS-' },
};
const PRICE_TYPES = ['fixed', 'from', 'percent', 'included'];

const asObj = (t) => { if (!t) return {}; if (typeof t === 'string') { try { return JSON.parse(t); } catch { return {}; } } return t; };
const num = (v) => Number(v || 0);
const shape = (r) => {
  const p = r.get ? r.get({ plain: true }) : r;
  const tags = asObj(p.tags);
  return {
    id: p.id, code: p.code, name: p.name, unit: p.unit,
    standard_price: num(p.base_price), price_type: tags.price_type || 'fixed',
    price_label: tags.price_label || null, percent: tags.percent ?? null,
    is_active: p.is_active !== false, sort_order: p.sort_order || 0,
  };
};

/** GET /api/sales-catalog/schedules?scope= — the price schedules + item counts. */
exports.schedules = asyncHandler(async (req, res) => {
  const branch_id = resolveBranchId(req);
  const scope = req.query.scope ? String(req.query.scope).toLowerCase() : null;
  const out = [];
  for (const [vertical, meta] of Object.entries(SCHEDULES)) {
    if (scope && meta.scope !== scope) continue;
    const count = await ServiceItem.count({ where: { vertical, branch_id } });
    out.push({ vertical, label: meta.label, scope: meta.scope, count });
  }
  res.json(out);
});

/** GET /api/sales-catalog?vertical= — items of one price schedule. */
exports.list = asyncHandler(async (req, res) => {
  const vertical = String(req.query.vertical || '');
  const meta = SCHEDULES[vertical];
  if (!meta) return res.status(400).json({ error: 'Unknown or non-editable price schedule.' });
  const branch_id = resolveBranchId(req);
  const rows = await ServiceItem.findAll({ where: { vertical, branch_id }, order: [['sort_order', 'ASC'], ['code', 'ASC']] });
  const items = rows.map(shape);
  const priced = items.filter((i) => i.standard_price > 0);
  res.json({
    vertical, label: meta.label, scope: meta.scope, items,
    summary: {
      total: items.length,
      priced: priced.length,
      unpriced: items.length - priced.length,
      average_price: priced.length ? Math.round(priced.reduce((s, i) => s + i.standard_price, 0) / priced.length) : 0,
    },
  });
});

function applyTags(existingTags, body) {
  const tags = asObj(existingTags);
  if (body.price_type !== undefined) tags.price_type = PRICE_TYPES.includes(body.price_type) ? body.price_type : 'fixed';
  if (body.price_label !== undefined) tags.price_label = body.price_label || null;
  if (body.percent !== undefined) tags.percent = body.percent === '' || body.percent === null ? null : num(body.percent);
  return tags;
}

/** PATCH /api/sales-catalog/:id — edit one item's standard price / name / type. */
exports.update = asyncHandler(async (req, res) => {
  const branch_id = resolveBranchId(req);
  const row = await ServiceItem.findOne({ where: { id: req.params.id, branch_id } });
  if (!row || !SCHEDULES[row.vertical]) return res.status(404).json({ error: 'Price item not found in an editable schedule.' });
  const b = req.body || {};
  const patch = {};
  if (b.name !== undefined) patch.name = String(b.name).trim() || row.name;
  if (b.unit !== undefined) patch.unit = b.unit || null;
  if (b.standard_price !== undefined) patch.base_price = num(b.standard_price);
  if (b.is_active !== undefined) patch.is_active = !!b.is_active;
  patch.tags = applyTags(row.tags, b);
  await row.update(patch);
  res.json(shape(row));
});

/** POST /api/sales-catalog — add a new item to a price schedule. */
exports.create = asyncHandler(async (req, res) => {
  const b = req.body || {};
  const vertical = String(b.vertical || '');
  const meta = SCHEDULES[vertical];
  if (!meta) return res.status(400).json({ error: 'Unknown or non-editable price schedule.' });
  if (!b.name || !String(b.name).trim()) return res.status(400).json({ error: 'A service name is required.' });
  const branch_id = resolveBranchId(req);
  const [root] = await ServiceCategory.findOrCreate({
    where: { code: `SVC-CAT-${meta.group.toUpperCase()}` },
    defaults: { branch_id, vertical, name: meta.label, code: `SVC-CAT-${meta.group.toUpperCase()}`, slug: vertical.replace(/_/g, '-'), icon: 'FileSignature', sort_order: 0 },
  });
  const code = b.code && String(b.code).trim() ? String(b.code).trim() : await generateCode(ServiceItem, 'code', meta.prefix);
  const maxSort = await ServiceItem.max('sort_order', { where: { vertical, branch_id } });
  const tags = applyTags({ schedule: 'C' }, b);
  const row = await ServiceItem.create({
    branch_id, category_id: root.id, vertical, name: String(b.name).trim(), code,
    service_group: meta.group, fee_model: tags.price_type === 'fixed' ? 'fixed' : 'quote',
    base_price: num(b.standard_price), unit: b.unit || 'Service',
    sspc_fee_type: 'fixed', sspc_fee_value: 0, provider_pay_type: 'remainder', provider_pay_value: 0,
    delivery_mode: 'internal', applicable_to: ['sales'], tags,
    is_active: true, sort_order: (maxSort || 0) + 10,
  });
  res.status(201).json(shape(row));
});
