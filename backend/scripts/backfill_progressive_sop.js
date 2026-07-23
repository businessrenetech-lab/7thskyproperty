/**
 * Backfill progressive SOP locking on EXISTING leasing projects.
 * For each project, work out which phases the property has actually reached
 * (owner assigned? assessment ready? application? tenancy? active? vacating?)
 * and re-lock ('blocked') any still-'pending' stage whose phase isn't reached.
 * Never touches 'done' or 'in_progress' stages — preserves real work.
 */
require('dotenv').config();
const sequelize = require('../config/db.config');
const Project = require('../models/Project');
const ProjectStage = require('../models/ProjectStage');
const Property = require('../models/Property');
const Tenancy = require('../models/Tenancy');
const { phaseOf } = require('../services/progressiveSop.service');

async function reachedPhases(property) {
  const pid = property.id;
  const reached = new Set(['property']);
  if (property.owner_contact_id) reached.add('owner');
  if (['ready_for_marketing'].includes(property.rental_readiness_status) || ['marketing', 'application', 'tenanted', 'renewal', 'vacating'].includes(property.pm_status)) reached.add('marketing');

  const [[app]] = await sequelize.query('SELECT COUNT(*) AS c FROM tenant_applications WHERE property_id = :pid', { replacements: { pid } });
  if (Number(app.c) > 0) reached.add('tenant');

  const tenancies = await Tenancy.findAll({ where: { property_id: pid } });
  if (tenancies.length) reached.add('lease');
  if (tenancies.some((t) => ['active'].includes(t.status) || ['active', 'sent_for_signature', 'signed'].includes(t.lease_status))) { reached.add('movein'); reached.add('ongoing'); }

  const [[vn]] = await sequelize.query('SELECT COUNT(*) AS c FROM vacancy_notices WHERE property_id = :pid', { replacements: { pid } });
  if (Number(vn.c) > 0) reached.add('exit');

  return reached;
}

(async () => {
  const projects = await Project.findAll({ where: { vertical_key: 'leasing' } });
  let touched = 0, locked = 0;
  for (const project of projects) {
    if (!project.property_id) continue;
    const property = await Property.findByPk(project.property_id);
    if (!property) continue;
    const reached = await reachedPhases(property);
    const stages = await ProjectStage.findAll({ where: { project_id: project.id }, order: [['sort_order', 'ASC']] });
    let changed = false;
    for (const s of stages) {
      const phase = phaseOf(s.stage_key);
      if (s.status === 'pending' && !reached.has(phase)) {
        await s.update({ status: 'blocked' });
        locked++; changed = true;
      }
    }
    // Ensure at least one active stage among unlocked ones.
    const fresh = await ProjectStage.findAll({ where: { project_id: project.id }, order: [['sort_order', 'ASC']] });
    if (!fresh.some((s) => s.status === 'in_progress')) {
      const firstPending = fresh.find((s) => s.status === 'pending');
      if (firstPending) { await firstPending.update({ status: 'in_progress' }); await project.update({ current_stage_key: firstPending.stage_key }); }
    }
    if (changed) touched++;
  }
  console.log(`Backfill done. Projects touched: ${touched}, stages locked: ${locked}`);
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
