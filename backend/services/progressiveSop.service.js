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
const { addBusinessDays, businessDaysBetween } = require('../utils/businessDays');

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

// --- sale (properties_sale) ---
// Sale SOP is progressive too: only the engagement phase is active at seed; the
// rest unlock as the sale lifecycle events fire. Keys are the slugs from
// migration 0107 (slug of the layer-1 stage names).
const SALE_STAGE_PHASE = {
  enquiry_consultation: 'engagement', inspection_assessment: 'engagement',
  documents_risk: 'engagement', agreement_phase_2_approval: 'engagement',
  preparation: 'marketing', marketing_listing: 'marketing', buyer_enquiries_inspections: 'marketing',
  offers_negotiation: 'offer',
  agreement_settlement: 'settlement',
  closure_post_sale: 'closure',
};
const SALE_EVENT_UNLOCKS = {
  sale_assessment_approved: ['marketing'],
  sale_offer_received: ['offer'],
  sale_offer_accepted: ['settlement'],
  sale_settlement_locked: ['closure'],
};
const SALE_HINTS = {
  engagement: 'active from the start',
  marketing: 'unlocks when the assessment is approved',
  offer: 'unlocks when an offer is received',
  settlement: 'unlocks when an offer is accepted',
  closure: 'unlocks when the settlement completes',
};
// Per-phase SLA in BUSINESS DAYS, measured from when a stage becomes in_progress.
const SALE_PHASE_SLA = { engagement: 3, marketing: 7, offer: 3, settlement: 14, closure: 7 };

// Vertical-keyed registry. Leasing preserved verbatim; sale added. A vertical
// with NO entry here has no phase gating (initialStatusFor returns null).
const REGISTRY = {
  leasing: { stagePhase: STAGE_PHASE, eventUnlocks: EVENT_UNLOCKS, hints: PHASE_UNLOCK_HINT, activeAtStart: ['property'], ownerPhase: 'owner', fallbackPhase: 'ongoing', phaseSla: null },
  properties_sale: { stagePhase: SALE_STAGE_PHASE, eventUnlocks: SALE_EVENT_UNLOCKS, hints: SALE_HINTS, activeAtStart: ['engagement'], ownerPhase: null, fallbackPhase: 'engagement', phaseSla: SALE_PHASE_SLA },
};

const phaseOf = (stageKey, vertical = 'leasing') => {
  const reg = REGISTRY[vertical] || REGISTRY.leasing;
  return reg.stagePhase[stageKey] || reg.fallbackPhase;
};
const hintFor = (phase, vertical = 'leasing') => {
  const reg = REGISTRY[vertical] || REGISTRY.leasing;
  return reg.hints[phase] || 'unlocks later in the lifecycle';
};

// Business-day SLA for a stage's phase, or null when the vertical has no SLAs.
const slaBusinessDaysFor = (stageKey, vertical = 'leasing') => {
  const reg = REGISTRY[vertical];
  if (!reg || !reg.phaseSla) return null;
  return reg.phaseSla[phaseOf(stageKey, vertical)] ?? null;
};

// Stamp a DATEONLY due_date on a stage that just became active — only when it
// has none yet and its phase has an SLA. Mutates in memory; the caller persists.
function applyStageDueDate(stage, vertical, today = new Date()) {
  if (stage.due_date) return;
  const sla = slaBusinessDaysFor(stage.stage_key, vertical);
  if (sla == null) return;
  stage.due_date = addBusinessDays(today, sla).toISOString().slice(0, 10);
}

// Pure, compute-on-read deadline status for a stage.
// tier ∈ on_track | due_soon | overdue | escalated. Inactive stages (no due_date
// or done/skipped/blocked) never show a deadline tier.
function stageDeadline(stage, today = new Date()) {
  const inactive = !stage.due_date || ['done', 'skipped', 'blocked'].includes(stage.status);
  if (inactive) return { due_date: stage.due_date || null, days_overdue: 0, deadline_tier: 'on_track' };
  const d = businessDaysBetween(today, new Date(stage.due_date + 'T00:00:00'));
  const days_overdue = Math.max(0, -d);
  const sla = slaBusinessDaysFor(stage.stage_key, 'properties_sale') || 0;
  const deadline_tier = d >= 2 ? 'on_track'
    : d >= 0 ? 'due_soon'
    : (sla && days_overdue >= sla ? 'escalated' : 'overdue');
  return { due_date: stage.due_date, days_overdue, deadline_tier };
}

/**
 * Initial status for a stage when the project is created.
 * For a registered vertical, only its activeAtStart phase(s) (plus its owner
 * phase when ownerLinked) start unlocked; everything else is 'blocked'. For a
 * vertical with no registry entry, returns null = no phase gating (the caller
 * keeps its default first-active seeding).
 */
function initialStatusFor(stageKey, { vertical = 'leasing', ownerLinked = false } = {}) {
  const reg = REGISTRY[vertical];
  if (!reg) return null;
  const active = new Set(reg.activeAtStart);
  if (ownerLinked && reg.ownerPhase) active.add(reg.ownerPhase);
  return active.has(phaseOf(stageKey, vertical)) ? 'pending' : 'blocked';
}

/**
 * Unlock the phase(s) for an event: any 'blocked' stage in those phases → 'pending'.
 * Sets the first newly-unlocked stage to 'in_progress' if the project has no
 * active stage yet. Idempotent.
 */
async function unlockForEvent(propertyId, event, opts = {}) {
  const vertical = opts.vertical || 'leasing';
  const tx = opts.transaction;
  const reg = REGISTRY[vertical];
  if (!reg) return { unlocked: 0 };
  const phases = reg.eventUnlocks[event];
  if (!phases || !phases.length) return { unlocked: 0 };

  const project = await Project.findOne({ where: { property_id: propertyId, vertical_key: vertical }, order: [['created_at', 'DESC']], transaction: tx });
  if (!project) return { unlocked: 0 };

  const stages = await ProjectStage.findAll({ where: { project_id: project.id }, order: [['sort_order', 'ASC']], transaction: tx });
  const inPhase = stages.filter((s) => phases.includes(phaseOf(s.stage_key, vertical)));
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
      applyStageDueDate(firstPending, vertical);
      await firstPending.update({ status: 'in_progress', due_date: firstPending.due_date }, { transaction: tx });
      await project.update({ current_stage_key: firstPending.stage_key }, { transaction: tx });
    }
  }
  return { unlocked };
}

module.exports = { STAGE_PHASE, EVENT_UNLOCKS, PHASE_UNLOCK_HINT, phaseOf, hintFor, initialStatusFor, unlockForEvent, REGISTRY, slaBusinessDaysFor, applyStageDueDate, stageDeadline };
