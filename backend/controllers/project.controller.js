const { Op } = require('sequelize');
const sequelize = require('../config/db.config');
const Project = require('../models/Project');
const ProjectStage = require('../models/ProjectStage');
const Client = require('../models/Client');
const Contact = require('../models/Contact');
const Property = require('../models/Property');
const { generateCode } = require('../utils/codeGenerator');
const { asyncHandler, branchScope, resolveBranchId, getPagination, pick } = require('../utils/controllerHelpers');
const { createProjectFromTemplate } = require('../services/workflowProject.service');

const clientInc = { model: Client, as: 'client', include: [{ model: Contact, attributes: ['id', 'full_name'] }] };
const propInc = { model: Property, as: 'property', attributes: ['id', 'property_code', 'title'] };

// JSON columns can come back as strings on some MySQL/Sequelize combos — coerce to array.
const arr = (v) => { if (Array.isArray(v)) return v; try { return JSON.parse(v || '[]'); } catch { return []; } };
const { phaseOf, hintFor } = require('../services/progressiveSop.service');
const hydrate = (project) => {
  if (!project) return project;
  const o = project.toJSON ? project.toJSON() : project;
  const vertical = o.vertical_key || 'leasing';
  if (o.stages) o.stages = o.stages.map((s) => {
    const phase = phaseOf(s.stage_key, vertical);
    return {
      ...s,
      checklist: arr(s.checklist),
      required_documents: arr(s.required_documents),
      // Progressive SOP metadata for the UI.
      phase,
      locked: s.status === 'blocked',
      unlock_hint: s.status === 'blocked' ? hintFor(phase, vertical) : null,
    };
  });
  return o;
};

exports.list = asyncHandler(async (req, res) => {
  const { limit, offset, page } = getPagination(req);
  const where = { ...branchScope(req) };
  if (req.query.vertical_key) {
    if (req.query.vertical_key.includes(',')) {
      where.vertical_key = { [Op.in]: req.query.vertical_key.split(',') };
    } else {
      where.vertical_key = req.query.vertical_key;
    }
  }
  if (req.query.status) where.status = req.query.status;
  if (req.query.search) where[Op.or] = [{ title: { [Op.like]: `%${req.query.search}%` } }, { project_code: { [Op.like]: `%${req.query.search}%` } }];
  const { rows, count } = await Project.findAndCountAll({ where, include: [clientInc, propInc], limit, offset, order: [['created_at', 'DESC']] });
  res.json({ data: rows, pagination: { page, limit, total: count, pages: Math.ceil(count / limit) } });
});

exports.getOne = asyncHandler(async (req, res) => {
  const project = await Project.findOne({
    where: { id: req.params.id, ...branchScope(req) },
    include: [clientInc, propInc, { model: ProjectStage, as: 'stages' }],
    order: [[{ model: ProjectStage, as: 'stages' }, 'sort_order', 'ASC']],
  });
  if (!project) return res.status(404).json({ error: 'Project not found.' });
  res.json({ data: hydrate(project) });
});

exports.create = asyncHandler(async (req, res) => {
  const meta = pick(req.body, ['title', 'vertical_key', 'client_id', 'contact_id', 'property_id', 'service_id', 'priority', 'value', 'start_date', 'due_date', 'notes']);
  if (!meta.title) return res.status(400).json({ error: 'title is required.' });

  const project = await sequelize.transaction(async (t) => createProjectFromTemplate(
    { ...meta, branch_id: resolveBranchId(req, req.body.branch_id), actorId: req.user?.id || null },
    t,
  ));

  const fresh = await Project.findByPk(project.id, { include: [{ model: ProjectStage, as: 'stages' }] });
  res.status(201).json({ data: hydrate(fresh), message: 'Project created with workflow stages.' });
});

exports.update = asyncHandler(async (req, res) => {
  const p = await Project.findOne({ where: { id: req.params.id, ...branchScope(req) } });
  if (!p) return res.status(404).json({ error: 'Project not found.' });
  await p.update(pick(req.body, ['title', 'priority', 'assigned_to', 'value', 'start_date', 'due_date', 'status', 'notes']));
  res.json({ data: p });
});

// PATCH /api/projects/:id/stages/:stageId  { checklist?, status?, notes? }
exports.updateStage = asyncHandler(async (req, res) => {
  const p = await Project.findOne({ where: { id: req.params.id, ...branchScope(req) } });
  if (!p) return res.status(404).json({ error: 'Project not found.' });
  const stage = await ProjectStage.findOne({ where: { id: req.params.stageId, project_id: p.id } });
  if (!stage) return res.status(404).json({ error: 'Stage not found.' });

  const patch = pick(req.body, ['checklist', 'status', 'notes', 'assigned_to', 'due_date']);
  if (patch.status === 'done' && stage.status !== 'done') patch.completed_at = new Date();
  await stage.update(patch);

  // When a stage completes, advance the next pending stage + project.current_stage_key
  if (patch.status === 'done') {
    const stages = await ProjectStage.findAll({ where: { project_id: p.id }, order: [['sort_order', 'ASC']] });
    // Advance to the next UNLOCKED stage only — 'blocked' stages stay locked
    // until their lifecycle event fires (progressive SOP).
    const next = stages.find((s) => s.status !== 'done' && s.status !== 'skipped' && s.status !== 'blocked');
    if (next) {
      if (next.status === 'pending') await next.update({ status: 'in_progress' });
      await p.update({ current_stage_key: next.stage_key });
    } else {
      // No unlocked stage left to work on right now. Only mark the whole project
      // complete if there are genuinely no blocked stages waiting either.
      const anyBlocked = stages.some((s) => s.status === 'blocked');
      if (!anyBlocked) await p.update({ status: 'completion', current_stage_key: null, completed_at: new Date() });
      else await p.update({ current_stage_key: null });
    }
  }
  const fresh = await Project.findByPk(p.id, { include: [{ model: ProjectStage, as: 'stages' }], order: [[{ model: ProjectStage, as: 'stages' }, 'sort_order', 'ASC']] });
  res.json({ data: hydrate(fresh) });
});

