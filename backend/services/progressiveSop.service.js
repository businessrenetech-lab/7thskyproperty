/**
 * progressiveSop.service.js
 * ------------------------------------------------------------------
 * Step-by-step SOP activation. Instead of measuring all 18 workflow stages
 * the moment a property is added, stages are grouped into PHASES that unlock
 * as the real lifecycle events happen:
 *
 *   add property        → PROPERTY phase active (setup / assessment / prep)
 *   assign owner        → OWNER phase (consultation / onboarding)
 *   assessment ready    → MARKETING phase
 *   tenant application  → TENANT phase (application / verification / approval)
 *   create tenancy      → LEASE phase
 *   tenancy signed      → MOVE-IN + ONGOING phases
 *   vacancy / renewal   → EXIT phase
 *
 * Locked stages use ProjectStage.status = 'blocked' (existing enum value), so
 * no schema change. The onboarding UI shows them greyed with "unlocks when …".
 * The advance logic in project.controller skips 'blocked' stages.
 */
const ProjectStage = require('../models/ProjectStage');
const Project = require('../models/Project');

// stage_key → phase. Keys are the slugs from seed_leasing_workflow.js.
const STAGE_PHASE = {
  property_master_setup: 'property',
  rental_assessment_setup: 'property',
  property_preparation: 'property',
  owner_enquiry_initial_consultation: 'owner',
  owner_onboarding: 'owner',
  marketing_enquiry_management: 'marketing',
  tenant_application: 'tenant',
  tenant_verification: 'tenant',
  tenant_approval: 'tenant',
  lease_finalisation: 'lease',
  move_in_entry_checklist: 'movein',
  ongoing_rental_management: 'ongoing',
  rent_collection_owner_disbursement: 'ongoing',
  routine_inspection: 'ongoing',
  maintenance_tenant_requests: 'ongoing',
  renewal_termination: 'exit',
  exit_inspection_bond_adjustment: 'exit',
  service_closure_archive: 'exit',
};

// Which phases each lifecycle event unlocks.
const EVENT_UNLOCKS = {
  property_added: ['property'],
  owner_assigned: ['owner'],
  assessment_ready: ['marketing'],
  application_created: ['tenant'],
  tenancy_created: ['lease'],
  tenancy_signed: ['movein', 'ongoing'],
  vacating: ['exit'],
};

// Human labels used by the UI for "unlocks when …".
const PHASE_UNLOCK_HINT = {
  property: 'active from the start',
  owner: 'unlocks when an owner is assigned',
  marketing: 'unlocks when the property is ready for marketing',
  tenant: 'unlocks when a tenant application is received',
  lease: 'unlocks when a tenancy is created',
  movein: 'unlocks when the tenancy agreement is signed',
  ongoing: 'unlocks when the tenancy is active',
  exit: 'unlocks when a vacancy / renewal begins',
};

const phaseOf = (stageKey) => STAGE_PHASE[stageKey] || 'ongoing';

/**
 * Initial status for a stage when the project is created.
 * Only the PROPERTY phase (plus OWNER if an owner is already linked) starts
 * unlocked; everything else is 'blocked' until its event fires.
 */
function initialStatusFor(stageKey, { ownerLinked = false } = {}) {
  const phase = phaseOf(stageKey);
  const activePhases = new Set(['property']);
  if (ownerLinked) activePhases.add('owner');
  return activePhases.has(phase) ? 'pending' : 'blocked';
}

/**
 * Unlock the phase(s) for an event: any 'blocked' stage in those phases → 'pending'.
 * Sets the first newly-unlocked stage to 'in_progress' if the project has no
 * active stage yet. Idempotent.
 */
async function unlockForEvent(propertyId, event, opts = {}) {
  const tx = opts.transaction;
  const phases = EVENT_UNLOCKS[event];
  if (!phases || !phases.length) return { unlocked: 0 };

  const project = await Project.findOne({ where: { property_id: propertyId, vertical_key: 'leasing' }, order: [['created_at', 'DESC']], transaction: tx });
  if (!project) return { unlocked: 0 };

  const stages = await ProjectStage.findAll({ where: { project_id: project.id }, order: [['sort_order', 'ASC']], transaction: tx });
  const inPhase = stages.filter((s) => phases.includes(phaseOf(s.stage_key)));
  let unlocked = 0;
  for (const s of inPhase) {
    if (s.status === 'blocked') { await s.update({ status: 'pending' }, { transaction: tx }); unlocked++; }
  }
  // If nothing is currently active, promote the earliest pending unlocked stage.
  const hasActive = stages.some((s) => s.status === 'in_progress');
  if (!hasActive) {
    const firstPending = (await ProjectStage.findAll({ where: { project_id: project.id }, order: [['sort_order', 'ASC']], transaction: tx }))
      .find((s) => s.status === 'pending');
    if (firstPending) {
      await firstPending.update({ status: 'in_progress' }, { transaction: tx });
      await project.update({ current_stage_key: firstPending.stage_key }, { transaction: tx });
    }
  }
  return { unlocked };
}

module.exports = { STAGE_PHASE, EVENT_UNLOCKS, PHASE_UNLOCK_HINT, phaseOf, initialStatusFor, unlockForEvent };
