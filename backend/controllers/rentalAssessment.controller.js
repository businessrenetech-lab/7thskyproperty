const sequelize = require('../config/db.config');
const { RentalAssessment, RentalAssessmentItem } = require('../models/RentalAssessment');
const Property = require('../models/Property');
const WorkOrder = require('../models/WorkOrder');
const { generateCode } = require('../utils/codeGenerator');
const { asyncHandler, branchScope, resolveBranchId, getPagination, pick } = require('../utils/controllerHelpers');
const { ASSESSMENT_ITEMS, ROOM_ASSESSMENT_ITEMS, computeReadiness } = require('../services/rentalWorkflow.service');

const propInc = { model: Property, as: 'property', attributes: ['id', 'property_code', 'title', 'area', 'district'] };
const itemsInc = { model: RentalAssessmentItem, as: 'items', separate: true, order: [['sort_order', 'ASC']] };

// Recompute readiness on the assessment + reflect onto the property.
async function recompute(assessmentId, tx) {
  const items = await RentalAssessmentItem.findAll({ where: { assessment_id: assessmentId }, transaction: tx });
  const { score, status } = computeReadiness(items.map((i) => i.toJSON()));
  const a = await RentalAssessment.findByPk(assessmentId, { transaction: tx });
  await a.update({ readiness_score: score, readiness_status: status, ready_for_marketing: status === 'ready_for_marketing' }, { transaction: tx });
  if (a.property_id) {
    const p = await Property.findByPk(a.property_id, { transaction: tx });
    if (p) await p.update({ rental_readiness_status: status }, { transaction: tx });
  }
  return { score, status };
}

// ─── LIST ───────────────────────────────────────────────────────────────────
exports.list = asyncHandler(async (req, res) => {
  const { limit, offset, page } = getPagination(req);
  const where = { ...branchScope(req) };
  if (req.query.property_id) where.property_id = req.query.property_id;
  if (req.query.status) where.status = req.query.status;
  const { rows, count } = await RentalAssessment.findAndCountAll({ where, include: [propInc], limit, offset, order: [['created_at', 'DESC']] });
  res.json({ data: rows, pagination: { page, limit, total: count, pages: Math.ceil(count / limit) } });
});

exports.getOne = asyncHandler(async (req, res) => {
  const a = await RentalAssessment.findOne({ where: { id: req.params.id, ...branchScope(req) }, include: [propInc, itemsInc] });
  if (!a) return res.status(404).json({ error: 'Assessment not found.' });
  res.json({ data: a });
});

// Latest (or new) assessment for a property — convenience for the property detail tab.
exports.forProperty = asyncHandler(async (req, res) => {
  const a = await RentalAssessment.findOne({
    where: { property_id: req.params.propertyId, ...branchScope(req) },
    include: [propInc, itemsInc], order: [['created_at', 'DESC']],
  });
  res.json({ data: a });
});

// ─── CREATE (seeds default section items) ───────────────────────────────────
exports.create = asyncHandler(async (req, res) => {
  const data = pick(req.body, ['property_id', 'owner_contact_id', 'assessment_date', 'inspector_id', 'market_rent_min', 'market_rent_max', 'recommended_rent', 'approved_rent', 'summary']);
  if (!data.property_id) return res.status(400).json({ error: 'property_id is required.' });
  data.branch_id = resolveBranchId(req, req.body.branch_id);
  data.created_by = req.user?.id || null;
  data.assessment_date = data.assessment_date || new Date().toISOString().slice(0, 10);
  data.status = 'in_progress';
  data.assessment_code = await generateCode(RentalAssessment, 'assessment_code', 'SSPC-RA-');

  const result = await sequelize.transaction(async (tx) => {
    const prop = await Property.findByPk(data.property_id, { transaction: tx });
    if (prop && !data.owner_contact_id) data.owner_contact_id = prop.owner_contact_id;
    const a = await RentalAssessment.create(data, { transaction: tx });
    const seed = Array.isArray(req.body.items) && req.body.items.length ? req.body.items : ROOM_ASSESSMENT_ITEMS;
    await RentalAssessmentItem.bulkCreate(
      seed.map((it, i) => ({
        assessment_id: a.id, section: it.section || null, assessment_item: it.assessment_item,
        is_blocking: !!it.is_blocking, status: 'pending', sort_order: i,
      })), { transaction: tx }
    );
    if (prop) await prop.update({ pm_status: prop.pm_status === 'not_managed' ? 'assessment_pending' : prop.pm_status }, { transaction: tx });
    await recompute(a.id, tx);
    return a;
  });

  const fresh = await RentalAssessment.findByPk(result.id, { include: [propInc, itemsInc] });
  res.status(201).json({ data: fresh, message: `Assessment ${result.assessment_code} created.` });
});

// ─── UPDATE assessment header ───────────────────────────────────────────────
exports.update = asyncHandler(async (req, res) => {
  const a = await RentalAssessment.findOne({ where: { id: req.params.id, ...branchScope(req) } });
  if (!a) return res.status(404).json({ error: 'Assessment not found.' });
  await a.update(pick(req.body, ['assessment_date', 'inspector_id', 'market_rent_min', 'market_rent_max', 'recommended_rent', 'approved_rent', 'summary', 'status', 'report_url']));
  // If approved_rent set, reflect onto property
  if (req.body.approved_rent != null && a.property_id) {
    const p = await Property.findByPk(a.property_id);
    if (p) await p.update({ approved_monthly_rent: req.body.approved_rent });
  }
  res.json({ data: a });
});

// ─── ITEM CRUD ──────────────────────────────────────────────────────────────
const ITEM_FIELDS = ['section', 'assessment_item', 'finding', 'required_action', 'responsible_id', 'due_date', 'status', 'is_blocking',
  'maintenance_recommendation', 'safety_observation', 'condition_rating', 'photo_url', 'notes', 'is_clean', 'is_undamaged', 'is_working', 'photos'];

// Room-checklist verdicts drive item status unless the caller sets it explicitly:
// any "No" → in_progress (action needed); all three answered (true) → done.
function deriveItemStatus(patch, existing) {
  if (patch.status !== undefined) return patch;
  const merged = {
    is_clean: patch.is_clean !== undefined ? patch.is_clean : existing?.is_clean,
    is_undamaged: patch.is_undamaged !== undefined ? patch.is_undamaged : existing?.is_undamaged,
    is_working: patch.is_working !== undefined ? patch.is_working : existing?.is_working,
  };
  const vals = Object.values(merged);
  if (!vals.some((v) => v !== undefined && v !== null)) return patch;
  if (vals.some((v) => v === false)) patch.status = 'in_progress';
  else if (vals.every((v) => v === true)) patch.status = 'done';
  return patch;
}

exports.addItem = asyncHandler(async (req, res) => {
  const a = await RentalAssessment.findOne({ where: { id: req.params.id, ...branchScope(req) } });
  if (!a) return res.status(404).json({ error: 'Assessment not found.' });
  const count = await RentalAssessmentItem.count({ where: { assessment_id: a.id } });
  const it = await RentalAssessmentItem.create({
    assessment_id: a.id, sort_order: count,
    ...deriveItemStatus(pick(req.body, ITEM_FIELDS), null),
  });
  await sequelize.transaction((tx) => recompute(a.id, tx));
  res.status(201).json({ data: it });
});

exports.updateItem = asyncHandler(async (req, res) => {
  const it = await RentalAssessmentItem.findOne({ where: { id: req.params.itemId, assessment_id: req.params.id } });
  if (!it) return res.status(404).json({ error: 'Assessment item not found.' });
  await it.update(deriveItemStatus(pick(req.body, ITEM_FIELDS), it));
  const result = await sequelize.transaction((tx) => recompute(req.params.id, tx));
  res.json({ data: it, readiness: result });
});

exports.removeItem = asyncHandler(async (req, res) => {
  const it = await RentalAssessmentItem.findOne({ where: { id: req.params.itemId, assessment_id: req.params.id } });
  if (!it) return res.status(404).json({ error: 'Assessment item not found.' });
  await it.destroy();
  await sequelize.transaction((tx) => recompute(req.params.id, tx));
  res.json({ message: 'Item removed.' });
});

// ─── GENERATE WORK ORDERS for items that need action ────────────────────────
// Creates a draft work order per item with a required_action and no work_order_id yet.
exports.generateWorkOrders = asyncHandler(async (req, res) => {
  const a = await RentalAssessment.findOne({ where: { id: req.params.id, ...branchScope(req) }, include: [itemsInc] });
  if (!a) return res.status(404).json({ error: 'Assessment not found.' });
  const items = (a.items || []).filter((it) => it.required_action && !it.work_order_id && it.status !== 'done');
  if (!items.length) return res.json({ message: 'No outstanding required actions to convert into work orders.', created: 0 });

  let created = 0;
  for (const it of items) {
    const wo = await WorkOrder.create({
      branch_id: a.branch_id, work_order_code: await generateCode(WorkOrder, 'work_order_code', 'SSPC-WO-'),
      property_id: a.property_id, title: `${it.section || 'Preparation'}: ${it.assessment_item}`,
      scope: it.required_action, status: 'draft', scheduled_date: it.due_date || null,
      notes: `Auto-generated from rental assessment ${a.assessment_code}`, created_by: req.user?.id || null,
    });
    await it.update({ work_order_id: wo.id, status: it.status === 'pending' ? 'in_progress' : it.status });
    created++;
  }
  await sequelize.transaction((tx) => recompute(a.id, tx));
  res.json({ message: `${created} work order(s) created from assessment actions.`, created });
});

// ─── MARK COMPLETE (gates marketing) ────────────────────────────────────────
exports.complete = asyncHandler(async (req, res) => {
  const a = await RentalAssessment.findOne({ where: { id: req.params.id, ...branchScope(req) }, include: [itemsInc] });
  if (!a) return res.status(404).json({ error: 'Assessment not found.' });
  const items = (a.items || []).map((i) => i.toJSON());
  const { status } = computeReadiness(items);
  const override = req.body.override === true;
  if (status !== 'ready_for_marketing' && !override) {
    return res.status(400).json({ error: 'Property is not ready for marketing — required/blocking items are incomplete. Resolve them or pass override=true (manager).' });
  }
  await a.update({ status: 'completed', ready_for_marketing: true, readiness_status: 'ready_for_marketing' });
  if (a.property_id) {
    const p = await Property.findByPk(a.property_id);
    if (p) await p.update({ rental_readiness_status: 'ready_for_marketing', pm_status: 'marketing', listing_status: p.listing_status === 'not_listed' ? 'drafting' : p.listing_status });
    // Progressive SOP: readiness unlocks the marketing phase.
    try { await require('../services/progressiveSop.service').unlockForEvent(a.property_id, 'assessment_ready'); } catch {}
  }
  res.json({ data: a, message: override ? 'Assessment completed (manager override).' : 'Assessment completed — property ready for marketing.' });
});
