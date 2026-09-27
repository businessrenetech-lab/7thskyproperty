const PropertyRisk = require('../models/PropertyRisk');
const { makeController } = require('./propertyControlCrud');
const { asyncHandler, branchScope, resolveBranchId, pick } = require('../utils/controllerHelpers');
const { generateCode } = require('../utils/codeGenerator');
const {
  canTransition, nextStages, needsAttention, DISPUTE_STAGES,
  ALL_DISPUTE_CATEGORIES, categoriesFor,
} = require('../services/disputeLifecycle');

const base = makeController({
  Model: PropertyRisk,
  codeField: 'risk_code',
  codePrefix: 'SSPC-RISK-',
  fields: ['property_id', 'tenancy_id', 'owner_contact_id', 'tenant_contact_id', 'risk_category', 'description', 'likelihood', 'impact', 'risk_rating', 'mitigation', 'owner_user_id', 'review_date', 'status'],
  searchFields: ['risk_code', 'risk_category', 'description', 'mitigation'],
});

const RISK_FIELDS = ['property_id', 'tenancy_id', 'owner_contact_id', 'tenant_contact_id', 'risk_category', 'description', 'likelihood', 'impact', 'risk_rating', 'mitigation', 'owner_user_id', 'review_date'];

/** stage_history is a JSON column, so it can come back as a string. */
const asArray = (v) => {
  if (Array.isArray(v)) return v;
  try { const p = JSON.parse(v || '[]'); return Array.isArray(p) ? p : []; } catch { return []; }
};

/**
 * POST /api/property-risks/disputes — raise one.
 *
 * A dispute always starts at 'raised' with a history entry, so the escalation
 * trail is complete from the first row rather than from the first transition.
 * dispute_stage is never accepted from the caller — it only moves through the
 * transition endpoint below.
 */
exports.createDispute = asyncHandler(async (req, res) => {
  const body = req.body || {};
  // ?scope=rent|sale narrows what may be raised; without it the union is
  // accepted, so an older caller is never blocked by the sale-side addition.
  const allowed = categoriesFor(req.query.scope || body.scope);
  const category = String(body.risk_category || '');
  if (!allowed.includes(category)) {
    return res.status(400).json({ error: `risk_category must be one of: ${allowed.join(', ')}.` });
  }
  const data = pick(body, RISK_FIELDS);
  data.branch_id = resolveBranchId(req, body.branch_id);
  data.created_by = req.user?.id || null;
  data.risk_code = await generateCode(PropertyRisk, 'risk_code', 'SSPC-RISK-');
  data.is_dispute = true;
  data.dispute_stage = 'raised';
  data.stage_history = [{
    stage: 'raised', at: new Date().toISOString(), by: req.user?.id || null, note: body.note || 'Dispute raised',
  }];
  const row = await PropertyRisk.create(data);
  res.status(201).json({ data: row, message: `Dispute ${row.risk_code} raised.` });
});

/** GET /api/property-risks/disputes — disputes only, with what each may do next. */
exports.listDisputes = asyncHandler(async (req, res) => {
  const where = { ...branchScope(req), is_dispute: true };
  for (const key of ['dispute_stage', 'property_id', 'risk_category']) {
    if (req.query[key]) where[key] = req.query[key];
  }
  const rows = await PropertyRisk.findAll({ where, order: [['created_at', 'DESC']], limit: 500 });
  const data = rows.map((r) => {
    const d = r.toJSON();
    return {
      ...d,
      stage_history: asArray(d.stage_history),
      next_stages: nextStages(d.dispute_stage),
      needs_attention: needsAttention(d),
    };
  });
  const byStage = {};
  for (const stage of DISPUTE_STAGES) byStage[stage] = data.filter((d) => d.dispute_stage === stage).length;
  res.json({
    data,
    meta: {
      stages: DISPUTE_STAGES,
      categories: categoriesFor(req.query.scope),
      all_categories: ALL_DISPUTE_CATEGORIES,
      by_stage: byStage,
      escalated: data.filter((d) => d.needs_attention).length,
    },
  });
});

/**
 * PATCH /api/property-risks/:id/dispute-stage — move a dispute along.
 *
 * The transition is validated, never assumed, and every move is appended to
 * stage_history so the escalation trail the SOP asks for actually exists.
 */
exports.moveDisputeStage = asyncHandler(async (req, res) => {
  const body = req.body || {};
  const row = await PropertyRisk.findOne({ where: { id: req.params.id, ...branchScope(req) } });
  if (!row) return res.status(404).json({ error: 'Risk not found.' });
  if (!row.is_dispute) return res.status(400).json({ error: 'This risk is not a dispute. Raise it as one first.' });

  const to = String(body.dispute_stage || '');
  const { ok, reason } = canTransition(row.dispute_stage, to);
  if (!ok) return res.status(400).json({ error: reason });

  // Escalating without a name, or resolving without a resolution, is how a
  // dispute register quietly stops being evidence.
  if (to === 'escalated' && !body.escalated_to) {
    return res.status(400).json({ error: 'Escalating a dispute must say who it is escalated to.' });
  }
  if (to === 'resolved' && !body.resolution) {
    return res.status(400).json({ error: 'Resolving a dispute must record the resolution.' });
  }

  const patch = {
    dispute_stage: to,
    stage_history: [...asArray(row.stage_history), {
      stage: to, at: new Date().toISOString(), by: req.user?.id || null, note: body.note || null,
    }],
  };
  if (to === 'escalated') { patch.escalated_at = new Date(); patch.escalated_to = body.escalated_to; }
  if (to === 'resolved') {
    patch.resolved_on = body.resolved_on || new Date().toISOString().slice(0, 10);
    patch.resolution = body.resolution;
  }
  if (to === 'closed') patch.status = 'closed';

  await row.update(patch);
  const d = row.toJSON();
  res.json({
    data: { ...d, stage_history: asArray(d.stage_history), next_stages: nextStages(to) },
    message: `Dispute ${row.risk_code} is now ${to.replace('_', ' ')}.`,
  });
});

module.exports = { ...base, ...module.exports };
