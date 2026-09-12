// backend/controllers/salesSop.controller.js
//
// The sale property's SOP workflow: find-or-create a Project (vertical
// 'properties_sale') linked to the property, and read it back hydrated. Stage
// work (advance / tick checklist / attach evidence) reuses the existing
// PATCH /api/projects/:id/stages/:stageId — no new gate logic here.
const sequelize = require('../config/db.config');
const Project = require('../models/Project');
const ProjectStage = require('../models/ProjectStage');
const Property = require('../models/Property');
const { createProjectFromTemplate } = require('../services/workflowProject.service');
const { phaseOf, hintFor, stageDeadline, unlockForEvent } = require('../services/progressiveSop.service');
const { asyncHandler, branchScope } = require('../utils/controllerHelpers');
const { Op } = require('sequelize');
const { SaleProfile, SaleOffer, SaleTransaction, SaleSettlement } = require('../models/SalesModels');
const { SaleAssessment } = require('../models/SalesAssessmentModels');

const VERTICAL = 'properties_sale';

// Replay lifecycle events that ALREADY happened, so a SOP started late on an
// advanced (or sold) property unlocks the phases those past events would have.
// unlockForEvent is idempotent, so this is safe to run on every load.
async function reconcileSaleSop(propertyId, branchId, tx) {
  const scope = { property_id: propertyId, branch_id: branchId };
  const [profile, assessmentApproved, offer, txn] = await Promise.all([
    SaleProfile.findOne({ where: scope, transaction: tx }),
    SaleAssessment.findOne({ where: { ...scope, status: 'approved' }, transaction: tx }),
    SaleOffer.findOne({ where: { ...scope, status: { [Op.in]: ['submitted', 'countered', 'accepted'] } }, transaction: tx }),
    SaleTransaction.findOne({ where: scope, transaction: tx }),
  ]);
  // A settlement links to the property via its transaction (no property_id column).
  const settlement = txn ? await SaleSettlement.findOne({ where: { transaction_id: txn.id, status: 'locked' }, transaction: tx }) : null;
  const opts = { vertical: VERTICAL, transaction: tx };
  if (assessmentApproved || ['complete', 'waived'].includes(profile?.assessment_status)) await unlockForEvent(propertyId, 'sale_assessment_approved', opts);
  if (offer) await unlockForEvent(propertyId, 'sale_offer_received', opts);
  if (txn) await unlockForEvent(propertyId, 'sale_offer_accepted', opts);
  if (settlement) await unlockForEvent(propertyId, 'sale_settlement_locked', opts);
}
const arr = (v) => { if (Array.isArray(v)) return v; try { return JSON.parse(v || '[]'); } catch { return []; } };
const hydrate = (p) => {
  if (!p) return null;
  const o = p.toJSON ? p.toJSON() : p;
  if (o.stages) o.stages = o.stages.map((s) => {
    const phase = phaseOf(s.stage_key, VERTICAL);
    return {
      ...s,
      checklist: arr(s.checklist),
      required_documents: arr(s.required_documents),
      phase,
      locked: s.status === 'blocked',
      unlock_hint: s.status === 'blocked' ? hintFor(phase, VERTICAL) : null,
      ...stageDeadline(s),
    };
  });
  return o;
};
const loadSop = (propertyId, req) => Project.findOne({
  where: { property_id: propertyId, vertical_key: VERTICAL, ...branchScope(req) },
  include: [{ model: ProjectStage, as: 'stages' }],
  order: [[{ model: ProjectStage, as: 'stages' }, 'sort_order', 'ASC']],
});

exports.getSop = asyncHandler(async (req, res) => {
  const existing = await loadSop(req.params.propertyId, req);
  if (existing) {
    // Self-heal: unlock phases whose triggering events already occurred.
    try { await reconcileSaleSop(Number(req.params.propertyId), existing.branch_id, undefined); } catch { /* non-fatal */ }
    return res.json({ data: hydrate(await loadSop(req.params.propertyId, req)) });
  }
  res.json({ data: hydrate(existing) });
});

exports.ensureSop = asyncHandler(async (req, res) => {
  const property = await Property.findOne({ where: { id: req.params.propertyId, ...branchScope(req) } });
  if (!property) return res.status(404).json({ error: 'Property not found.' });
  const existing = await loadSop(req.params.propertyId, req);
  if (existing) {
    try { await reconcileSaleSop(property.id, property.branch_id, undefined); } catch { /* non-fatal */ }
    return res.json({ data: hydrate(await loadSop(req.params.propertyId, req)) });
  }
  await sequelize.transaction(async (t) => {
    // Re-check under lock so a double-submit does not create two SOP projects.
    const again = await Project.findOne({ where: { property_id: property.id, vertical_key: VERTICAL, ...branchScope(req) }, transaction: t, lock: t.LOCK.UPDATE });
    if (again) return;
    await createProjectFromTemplate({
      branch_id: property.branch_id, vertical_key: VERTICAL, property_id: property.id,
      title: `SOP · ${property.property_code || property.title || property.id}`, actorId: req.user?.id || null,
    }, t);
    // Reconcile inside the same transaction so a SOP created on an advanced
    // property is born with the right phases already unlocked.
    await reconcileSaleSop(property.id, property.branch_id, t);
  });
  res.status(201).json({ data: hydrate(await loadSop(req.params.propertyId, req)) });
});
