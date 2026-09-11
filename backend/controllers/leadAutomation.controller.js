// backend/controllers/leadAutomation.controller.js
//
// Thin CRUD for lead routing rules + follow-up sequences, plus per-enquiry
// sequence actions (enrol / pause / resume / stop). Routing + scheduler logic
// live in their services; this controller only reads/writes config + state.
const LeadRoutingRule = require('../models/LeadRoutingRule');
const LeadSequence = require('../models/LeadSequence');
const SalesEnquiry = require('../models/SalesEnquiry');
const { asyncHandler, branchScope, resolveBranchId, pick } = require('../utils/controllerHelpers');

const arr = (v) => { if (Array.isArray(v)) return v; try { const p = JSON.parse(v || '[]'); return Array.isArray(p) ? p : []; } catch { return []; } };
const RULE_FIELDS = ['name', 'priority', 'match_category', 'match_area', 'match_source', 'assign_to', 'assign_pool', 'default_sequence_id', 'active'];
const SEQ_FIELDS = ['name', 'active', 'steps'];

function normSteps(steps) {
  return arr(steps)
    .map((s) => ({ day_offset: Math.max(0, Number(s.day_offset) || 0), channel: s.channel === 'sms' ? 'sms' : 'email', template_id: Number(s.template_id) || null }))
    .filter((s) => s.template_id);
}

// ── Routing rules ───────────────────────────────────────────────────────────
exports.listRules = asyncHandler(async (req, res) => {
  res.json({ data: await LeadRoutingRule.findAll({ where: branchScope(req), order: [['priority', 'ASC'], ['id', 'ASC']] }) });
});

exports.createRule = asyncHandler(async (req, res) => {
  const b = pick(req.body, RULE_FIELDS);
  if (!b.name) return res.status(400).json({ error: 'name is required.' });
  if (b.assign_pool != null) b.assign_pool = arr(b.assign_pool).map(Number).filter(Boolean);
  const row = await LeadRoutingRule.create({ ...b, branch_id: resolveBranchId(req, req.body.branch_id), created_by: req.user?.id || null });
  res.status(201).json({ data: row });
});

exports.updateRule = asyncHandler(async (req, res) => {
  const row = await LeadRoutingRule.findOne({ where: { id: req.params.id, ...branchScope(req) } });
  if (!row) return res.status(404).json({ error: 'Rule not found.' });
  const b = pick(req.body, RULE_FIELDS);
  if (b.assign_pool != null) b.assign_pool = arr(b.assign_pool).map(Number).filter(Boolean);
  await row.update(b);
  res.json({ data: row });
});

exports.removeRule = asyncHandler(async (req, res) => {
  const n = await LeadRoutingRule.destroy({ where: { id: req.params.id, ...branchScope(req) } });
  if (!n) return res.status(404).json({ error: 'Rule not found.' });
  res.json({ ok: true });
});

// ── Sequences ───────────────────────────────────────────────────────────────
exports.listSequences = asyncHandler(async (req, res) => {
  res.json({ data: await LeadSequence.findAll({ where: branchScope(req), order: [['id', 'ASC']] }) });
});

exports.createSequence = asyncHandler(async (req, res) => {
  const b = pick(req.body, SEQ_FIELDS);
  if (!b.name) return res.status(400).json({ error: 'name is required.' });
  b.steps = normSteps(b.steps);
  const row = await LeadSequence.create({ ...b, branch_id: resolveBranchId(req, req.body.branch_id), created_by: req.user?.id || null });
  res.status(201).json({ data: row });
});

exports.updateSequence = asyncHandler(async (req, res) => {
  const row = await LeadSequence.findOne({ where: { id: req.params.id, ...branchScope(req) } });
  if (!row) return res.status(404).json({ error: 'Sequence not found.' });
  const b = pick(req.body, SEQ_FIELDS);
  if (b.steps !== undefined) b.steps = normSteps(b.steps);
  await row.update(b);
  res.json({ data: row });
});

exports.removeSequence = asyncHandler(async (req, res) => {
  const n = await LeadSequence.destroy({ where: { id: req.params.id, ...branchScope(req) } });
  if (!n) return res.status(404).json({ error: 'Sequence not found.' });
  res.json({ ok: true });
});

// ── Per-enquiry sequence actions ─────────────────────────────────────────────
async function loadEnquiry(req, res) {
  const e = await SalesEnquiry.findOne({ where: { id: req.params.id, ...branchScope(req) } });
  if (!e) { res.status(404).json({ error: 'Enquiry not found.' }); return null; }
  return e;
}

exports.enrollSequence = asyncHandler(async (req, res) => {
  const e = await loadEnquiry(req, res); if (!e) return;
  const sequenceId = Number(req.body.sequence_id);
  if (!sequenceId) return res.status(400).json({ error: 'sequence_id is required.' });
  // Reset so re-enrolment (even after completion) starts a fresh cadence.
  await e.update({ sequence_id: sequenceId, sequence_status: 'active', sequence_enrolled_at: new Date() });
  res.json({ data: e });
});

const setStatus = (status) => asyncHandler(async (req, res) => {
  const e = await loadEnquiry(req, res); if (!e) return;
  if (!e.sequence_id) return res.status(400).json({ error: 'Enquiry is not enrolled in a sequence.' });
  await e.update({ sequence_status: status });
  res.json({ data: e });
});
exports.pauseSequence = setStatus('paused');
exports.resumeSequence = setStatus('active');
exports.stopSequence = setStatus('stopped');
