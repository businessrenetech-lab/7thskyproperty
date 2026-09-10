// backend/services/workflowProject.service.js
//
// Shared "create a Project + seed its stages from the vertical's workflow
// template" logic — used by project.controller.create and the sales-SOP
// find-or-create. Extracted verbatim so both call sites stay identical.
const sequelize = require('../config/db.config');
const Project = require('../models/Project');
const ProjectStage = require('../models/ProjectStage');
const { generateCode } = require('../utils/codeGenerator');

async function createProjectFromTemplate(meta, transaction) {
  const p = await Project.create({
    branch_id: meta.branch_id,
    vertical_key: meta.vertical_key,
    property_id: meta.property_id || null,
    client_id: meta.client_id || null,
    contact_id: meta.contact_id || null,
    service_id: meta.service_id || null,
    title: meta.title,
    priority: meta.priority || 'medium',
    value: meta.value || null,
    start_date: meta.start_date || null,
    due_date: meta.due_date || null,
    notes: meta.notes || null,
    project_code: await generateCode(Project, 'project_code', 'SSPC-PJ-'),
    status: meta.status || 'lead',
    created_by: meta.actorId || null,
  }, { transaction });

  if (meta.vertical_key) {
    const [tpl] = await sequelize.query(
      'SELECT stages FROM workflow_templates WHERE vertical_key = :v AND is_active = 1 ORDER BY id ASC LIMIT 1',
      { replacements: { v: meta.vertical_key }, transaction },
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
          remarks: '',
        })),
        required_documents: s.required_docs || [],
      }, { transaction });
    }
    if (stages[0]) await p.update({ current_stage_key: stages[0].key }, { transaction });
  }
  return p;
}

module.exports = { createProjectFromTemplate };
