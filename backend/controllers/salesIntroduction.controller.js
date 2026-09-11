// backend/controllers/salesIntroduction.controller.js
//
// Sales introductions (clause 22 / non-circumvention). Reuses the rental-shaped
// non_circumvention_records table with SALES semantics — owner_contact_id =
// seller/vendor, tenant_contact_id = introduced buyer — and is the single place
// those rental column names appear. Every query is scoped context='sale'. The
// 12-month protection window is derived at read time.
const NonCircumventionRecord = require('../models/NonCircumventionRecord');
const Contact = require('../models/Contact');
const Property = require('../models/Property');
const { generateCode } = require('../utils/codeGenerator');
const { asyncHandler, branchScope, pick } = require('../utils/controllerHelpers');

const MONTHS = 12;
const addMonths = (d, n) => { const x = new Date(d); x.setMonth(x.getMonth() + n); return x; };
const today0 = () => new Date(new Date().toISOString().slice(0, 10) + 'T00:00:00');

// Attach the derived protection window + the buyer/seller/property display data.
// `contacts` and `props` are id→row maps so a list resolves in two queries.
const shape = (row, contacts, props) => {
  const o = row.toJSON ? row.toJSON() : row;
  o.seller = o.owner_contact_id ? (contacts.get(Number(o.owner_contact_id)) || null) : null;
  o.buyer = o.tenant_contact_id ? (contacts.get(Number(o.tenant_contact_id)) || null) : null;
  o.property = o.property_id ? (props.get(Number(o.property_id)) || null) : null;
  if (o.introduction_date) {
    const until = addMonths(new Date(o.introduction_date + 'T00:00:00'), MONTHS);
    o.protection_until = until.toISOString().slice(0, 10);
    o.days_remaining = Math.round((until - today0()) / 86400000);
    o.expired = o.days_remaining < 0;
  } else { o.protection_until = null; o.days_remaining = null; o.expired = false; }
  return o;
};

async function resolve(rows) {
  const contactIds = [...new Set(rows.flatMap((r) => [r.owner_contact_id, r.tenant_contact_id]).filter(Boolean))];
  const propIds = [...new Set(rows.map((r) => r.property_id).filter(Boolean))];
  const contacts = new Map((contactIds.length ? await Contact.findAll({ where: { id: contactIds }, attributes: ['id', 'full_name', 'primary_phone'] }) : []).map((c) => [Number(c.id), c.toJSON()]));
  const props = new Map((propIds.length ? await Property.findAll({ where: { id: propIds }, attributes: ['id', 'property_code', 'title'] }) : []).map((p) => [Number(p.id), p.toJSON()]));
  return { contacts, props };
}

exports.list = asyncHandler(async (req, res) => {
  const where = { ...branchScope(req), context: 'sale' };
  if (req.query.property_id) where.property_id = req.query.property_id;
  if (req.query.status) where.status = req.query.status;
  const rows = await NonCircumventionRecord.findAll({ where, order: [['created_at', 'DESC']] });
  const { contacts, props } = await resolve(rows);
  let data = rows.map((r) => shape(r, contacts, props));
  if (req.query.expiry === 'active') data = data.filter((r) => !r.expired && r.status === 'active');
  if (req.query.expiry === 'expired') data = data.filter((r) => r.expired);
  res.json({ data });
});

exports.getOne = asyncHandler(async (req, res) => {
  const row = await NonCircumventionRecord.findOne({ where: { id: req.params.id, ...branchScope(req), context: 'sale' } });
  if (!row) return res.status(404).json({ error: 'Introduction not found.' });
  const { contacts, props } = await resolve([row]);
  res.json({ data: shape(row, contacts, props) });
});

exports.create = asyncHandler(async (req, res) => {
  const b = req.body;
  if (!b.property_id || !b.buyer_contact_id || !b.introduction_date) return res.status(400).json({ error: 'property_id, buyer_contact_id and introduction_date are required.' });
  const property = await Property.findOne({ where: { id: b.property_id, ...branchScope(req) } });
  if (!property) return res.status(404).json({ error: 'Property not found.' });
  const row = await NonCircumventionRecord.create({
    branch_id: property.branch_id, context: 'sale',
    record_code: await generateCode(NonCircumventionRecord, 'record_code', 'SSPC-IN-'),
    property_id: property.id, deal_id: b.deal_id || null,
    owner_contact_id: b.seller_contact_id || null, tenant_contact_id: b.buyer_contact_id,
    protected_relationship: b.protected_relationship || 'Agency-introduced buyer',
    introduction_date: b.introduction_date,
    protection_basis: b.protection_basis || 'Clause 22 — 12-month non-circumvention',
    direct_communication_allowed: !!b.direct_communication_allowed,
    breach_risk: ['low', 'medium', 'high'].includes(b.breach_risk) ? b.breach_risk : 'medium',
    monitoring_notes: b.monitoring_notes || null, status: 'active',
    introduced_by: req.user?.id || null, created_by: req.user?.id || null,
  });
  const { contacts, props } = await resolve([row]);
  res.status(201).json({ data: shape(row, contacts, props) });
});

exports.update = asyncHandler(async (req, res) => {
  const row = await NonCircumventionRecord.findOne({ where: { id: req.params.id, ...branchScope(req), context: 'sale' } });
  if (!row) return res.status(404).json({ error: 'Introduction not found.' });
  const patch = pick(req.body, ['protected_relationship', 'introduction_date', 'protection_basis', 'direct_communication_allowed', 'breach_risk', 'monitoring_notes', 'deal_id']);
  if (req.body.seller_contact_id !== undefined) patch.owner_contact_id = req.body.seller_contact_id || null;
  if (['active', 'breached', 'closed'].includes(req.body.status)) patch.status = req.body.status;
  await row.update(patch);
  const { contacts, props } = await resolve([row]);
  res.json({ data: shape(row, contacts, props) });
});
