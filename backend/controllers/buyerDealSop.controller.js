// backend/controllers/buyerDealSop.controller.js
//
// The buyer deal's SOP workflow: find-or-create a Project (vertical
// 'residential_purchase') linked to the buy PropertyDeal, read back hydrated.
// Stage work (advance / tick checklist / attach evidence) reuses the existing
// PATCH /api/projects/:id/stages/:stageId — no new gate logic here. Mirrors
// salesSop.controller but keyed to the DEAL, not a property.
const sequelize = require('../config/db.config');
const Project = require('../models/Project');
const ProjectStage = require('../models/ProjectStage');
const PropertyDeal = require('../models/PropertyDeal');
const { createProjectFromTemplate } = require('../services/workflowProject.service');
const { phaseOf, hintFor, stageDeadline } = require('../services/progressiveSop.service');
const { asyncHandler, branchScope } = require('../utils/controllerHelpers');

const VERTICAL = 'residential_purchase';
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
const loadSop = (dealId, req) => Project.findOne({
  where: { property_deal_id: dealId, vertical_key: VERTICAL, ...branchScope(req) },
  include: [{ model: ProjectStage, as: 'stages' }],
  order: [[{ model: ProjectStage, as: 'stages' }, 'sort_order', 'ASC']],
});

exports.getSop = asyncHandler(async (req, res) => {
  res.json({ data: hydrate(await loadSop(req.params.dealId, req)) });
});

exports.ensureSop = asyncHandler(async (req, res) => {
  const deal = await PropertyDeal.findOne({ where: { id: req.params.dealId, deal_type: 'buy', ...branchScope(req) } });
  if (!deal) return res.status(404).json({ error: 'Buy deal not found.' });
  const existing = await loadSop(deal.id, req);
  if (existing) return res.json({ data: hydrate(existing) });
  await sequelize.transaction(async (t) => {
    // Re-check under lock so a double-submit does not create two SOP projects.
    const again = await Project.findOne({ where: { property_deal_id: deal.id, vertical_key: VERTICAL, ...branchScope(req) }, transaction: t, lock: t.LOCK.UPDATE });
    if (again) return;
    await createProjectFromTemplate({
      branch_id: deal.branch_id, vertical_key: VERTICAL,
      property_deal_id: deal.id, property_id: deal.property_id || null, client_id: deal.buyer_client_id || null,
      title: `Buyer SOP · ${deal.deal_code || deal.id}`, actorId: req.user?.id || null,
    }, t);
  });
  res.status(201).json({ data: hydrate(await loadSop(deal.id, req)) });
});
