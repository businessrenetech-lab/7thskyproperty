const BuyerMandate = require('../models/BuyerMandate');
const MandateCandidate = require('../models/MandateCandidate');
const PropertyDeal = require('../models/PropertyDeal');
const Property = require('../models/Property');
const Client = require('../models/Client');
const Contact = require('../models/Contact');
const User = require('../models/User');
const sequelize = require('../config/db.config');
const { generateCode } = require('../utils/codeGenerator');
const { asyncHandler, branchScope, resolveBranchId, pick } = require('../utils/controllerHelpers');

const MANDATE_FIELDS = ['buyer_client_id', 'buyer_contact_id', 'status', 'budget_min', 'budget_max', 'areas', 'property_type', 'beds_min', 'baths_min', 'timeframe', 'notes', 'assigned_to', 'cancel_reason'];
const PROP_ATTRS = ['id', 'property_code', 'title', 'area', 'price', 'owner_contact_id'];
// Client belongsTo Contact with no alias, so the accessor is `.Contact`.
const buyerName = (m) => m.buyerClient?.Contact?.full_name || m.buyerContact?.full_name || '—';

const mandateIncludes = (withCandidateProps) => [
  { model: Client, as: 'buyerClient', include: [{ model: Contact, attributes: ['id', 'full_name'] }] },
  { model: Contact, as: 'buyerContact', attributes: ['id', 'full_name'] },
  { model: User, as: 'assignee', attributes: ['id', 'name'] },
  withCandidateProps
    ? { model: MandateCandidate, as: 'candidates', include: [{ model: Property, as: 'property', attributes: PROP_ATTRS }] }
    : { model: MandateCandidate, as: 'candidates', attributes: ['id', 'status'] },
];

exports.list = asyncHandler(async (req, res) => {
  const where = { ...branchScope(req) };
  if (req.query.status) where.status = req.query.status;
  if (req.query.assigned_to) where.assigned_to = req.query.assigned_to;
  const rows = await BuyerMandate.findAll({ where, order: [['created_at', 'DESC']], include: mandateIncludes(false) });
  res.json({ data: rows.map((m) => ({ ...m.toJSON(), buyer_name: buyerName(m), candidate_count: (m.candidates || []).length })) });
});

exports.getOne = asyncHandler(async (req, res) => {
  const m = await BuyerMandate.findOne({ where: { id: req.params.id, ...branchScope(req) }, include: mandateIncludes(true) });
  if (!m) return res.status(404).json({ error: 'Mandate not found.' });
  res.json({ data: { ...m.toJSON(), buyer_name: buyerName(m) } });
});

exports.create = asyncHandler(async (req, res) => {
  const data = pick(req.body, MANDATE_FIELDS);
  if (!data.buyer_client_id && !data.buyer_contact_id) return res.status(400).json({ error: 'A buyer client or contact is required.' });
  data.branch_id = resolveBranchId(req, req.body.branch_id);
  data.created_by = req.user?.id || null;
  data.mandate_code = await generateCode(BuyerMandate, 'mandate_code', 'SSPC-BM-');
  const m = await BuyerMandate.create(data);
  res.status(201).json({ data: m, message: 'Mandate created.' });
});

exports.update = asyncHandler(async (req, res) => {
  const m = await BuyerMandate.findOne({ where: { id: req.params.id, ...branchScope(req) } });
  if (!m) return res.status(404).json({ error: 'Mandate not found.' });
  const data = pick(req.body, MANDATE_FIELDS);
  if (data.status === 'cancelled' && !String(data.cancel_reason || m.cancel_reason || '').trim()) return res.status(400).json({ error: 'A reason is required to cancel a mandate.' });
  await m.update(data);
  res.json({ data: m, message: 'Mandate updated.' });
});

exports.addCandidate = asyncHandler(async (req, res) => {
  const m = await BuyerMandate.findOne({ where: { id: req.params.id, ...branchScope(req) } });
  if (!m) return res.status(404).json({ error: 'Mandate not found.' });
  const property_id = Number(req.body.property_id);
  if (!property_id) return res.status(400).json({ error: 'property_id is required.' });
  if (await MandateCandidate.count({ where: { mandate_id: m.id, property_id } })) return res.status(409).json({ error: 'That property is already on this shortlist.' });
  const c = await MandateCandidate.create({ branch_id: m.branch_id, mandate_id: m.id, property_id, fit_note: req.body.fit_note || null, created_by: req.user?.id || null });
  const withProp = await MandateCandidate.findOne({ where: { id: c.id }, include: [{ model: Property, as: 'property', attributes: PROP_ATTRS }] });
  res.status(201).json({ data: withProp });
});

exports.patchCandidate = asyncHandler(async (req, res) => {
  const c = await MandateCandidate.findOne({ where: { id: req.params.cid, ...branchScope(req) } });
  if (!c) return res.status(404).json({ error: 'Candidate not found.' });
  await c.update(pick(req.body, ['status', 'feedback', 'fit_note']));
  res.json({ data: c });
});

exports.removeCandidate = asyncHandler(async (req, res) => {
  const c = await MandateCandidate.findOne({ where: { id: req.params.cid, ...branchScope(req) } });
  if (!c) return res.status(404).json({ error: 'Candidate not found.' });
  if (c.status === 'converted') return res.status(409).json({ error: 'A converted candidate cannot be removed.' });
  await c.destroy();
  res.json({ message: 'Candidate removed.' });
});

exports.convert = asyncHandler(async (req, res) => {
  const result = await sequelize.transaction(async (transaction) => {
    const m = await BuyerMandate.findOne({ where: { id: req.params.id, ...branchScope(req) }, transaction, lock: transaction.LOCK.UPDATE });
    if (!m) { const e = new Error('Mandate not found.'); e.status = 404; throw e; }
    const c = await MandateCandidate.findOne({ where: { id: req.params.cid, mandate_id: m.id }, transaction, lock: transaction.LOCK.UPDATE });
    if (!c) { const e = new Error('Candidate not found.'); e.status = 404; throw e; }
    if (c.status === 'converted') { const e = new Error('This candidate is already converted.'); e.status = 409; throw e; }
    const property = await Property.findByPk(c.property_id, { transaction });
    const deal = await PropertyDeal.create({
      branch_id: m.branch_id, deal_type: 'buy', property_id: c.property_id,
      buyer_client_id: m.buyer_client_id || null, owner_contact_id: property?.owner_contact_id || null,
      status: 'lead', assigned_to: m.assigned_to || null,
      deal_code: await generateCode(PropertyDeal, 'deal_code', 'SSPC-DL-'), created_by: req.user?.id || null,
    }, { transaction });
    await c.update({ status: 'converted', converted_deal_id: deal.id }, { transaction });
    if (m.status === 'active') await m.update({ status: 'engaged' }, { transaction });
    return { deal, candidate: c };
  }).catch((e) => { res.status(e.status || 500).json({ error: e.message }); return null; });
  if (result) res.status(201).json({ data: result, message: 'Converted to a buy deal.' });
});
