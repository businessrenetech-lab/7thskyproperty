const { Op } = require('sequelize');
const sequelize = require('../config/db.config');
const Project = require('../models/Project');
const ProjectStage = require('../models/ProjectStage');
const Client = require('../models/Client');
const Contact = require('../models/Contact');
const Property = require('../models/Property');
const { generateCode } = require('../utils/codeGenerator');
const { asyncHandler, branchScope, resolveBranchId, getPagination, pick } = require('../utils/controllerHelpers');

const clientInc = { model: Client, as: 'client', include: [{ model: Contact, attributes: ['id', 'full_name'] }] };
const propInc = { model: Property, as: 'property', attributes: ['id', 'property_code', 'title'] };

// JSON columns can come back as strings on some MySQL/Sequelize combos — coerce to array.
const arr = (v) => { if (Array.isArray(v)) return v; try { return JSON.parse(v || '[]'); } catch { return []; } };
const hydrate = (project) => {
  if (!project) return project;
  const o = project.toJSON ? project.toJSON() : project;
  if (o.stages) o.stages = o.stages.map((s) => ({ ...s, checklist: arr(s.checklist), required_documents: arr(s.required_documents) }));
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

  const project = await sequelize.transaction(async (t) => {
    const p = await Project.create({
      ...meta, branch_id: resolveBranchId(req, req.body.branch_id),
      project_code: await generateCode(Project, 'project_code', 'SSPC-PJ-'),
      status: 'lead', created_by: req.user?.id || null,
    }, { transaction: t });

    // Instantiate stage-gate from the vertical's workflow template (from the workbooks)
    if (meta.vertical_key) {
      const [tpl] = await sequelize.query(
        'SELECT stages FROM workflow_templates WHERE vertical_key = :v AND is_active = 1 ORDER BY id ASC LIMIT 1',
        { replacements: { v: meta.vertical_key }, transaction: t }
      );
      let stages = [];
      try { stages = tpl[0] ? (typeof tpl[0].stages === 'string' ? JSON.parse(tpl[0].stages) : tpl[0].stages) : []; } catch { stages = []; }
      for (let i = 0; i < stages.length; i++) {
        const s = stages[i];
        await ProjectStage.create({
          project_id: p.id, stage_key: s.key, stage_name: s.name, sort_order: s.order ?? i + 1,
          status: i === 0 ? 'in_progress' : 'pending',
          checklist: (s.checklist || []).map((c) => ({
            label: c.label,
            required: !!c.required,
            done: false,
            detailed_task: c.detailed_task || '',
            responsible: c.responsible || '',
            evidence_required: c.evidence_required || '',
            output: c.output || '',
            evidence_url: '',
            evidence_name: '',
            remarks: ''
          })),
          required_documents: s.required_docs || [],
        }, { transaction: t });
      }
      if (stages[0]) await p.update({ current_stage_key: stages[0].key }, { transaction: t });
    }
    return p;
  });

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
    const next = stages.find((s) => s.status !== 'done' && s.status !== 'skipped');
    if (next) {
      if (next.status === 'pending') await next.update({ status: 'in_progress' });
      await p.update({ current_stage_key: next.stage_key });
    } else {
      await p.update({ status: 'completion', current_stage_key: null, completed_at: new Date() });
    }
  }
  const fresh = await Project.findByPk(p.id, { include: [{ model: ProjectStage, as: 'stages' }], order: [[{ model: ProjectStage, as: 'stages' }, 'sort_order', 'ASC']] });
  res.json({ data: hydrate(fresh) });
});

