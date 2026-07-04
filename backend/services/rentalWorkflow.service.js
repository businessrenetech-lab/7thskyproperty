/**
 * rentalWorkflow.service.js
 * ------------------------------------------------------------------
 * Shared building blocks for the rental & tenancy management workflow:
 *   - default verification checklist (tenant applications)
 *   - default rental-assessment sections/items
 *   - default owner-onboarding checklist
 *   - createLeasingProject(): instantiate the 18-stage PM workflow for a property
 *   - computeReadiness(): rental readiness score + status from assessment items
 */
const sequelize = require('../config/db.config');
const Project = require('../models/Project');
const ProjectStage = require('../models/ProjectStage');
const OwnerOnboardingItem = require('../models/OwnerOnboardingItem');
const { generateCode } = require('../utils/codeGenerator');

// ── Tenant application: SOP verification checklist (Tenant Verification Checklist) ──
const VERIFICATION_ITEMS = [
  { item: 'Identity verification (NID/Passport)', evidence_required: 'ID copy' },
  { item: 'Employment / occupation verification', evidence_required: 'Employment letter / business proof' },
  { item: 'Income evidence / affordability', evidence_required: 'Salary statement / bank statement' },
  { item: 'Reference checks', evidence_required: 'Reference notes' },
  { item: 'Rental history review', evidence_required: 'Previous landlord contact' },
  { item: 'Occupancy declaration collected', evidence_required: 'Occupant list & IDs' },
  { item: 'Risk assessment', evidence_required: 'Risk note' },
  { item: 'Owner approval', evidence_required: 'Owner approval / CRM note' },
];

// ── Rental assessment default items (Rental Assessment & Setup sheet + SOP Stage 2) ──
// is_blocking items must be resolved before a property can move to marketing.
const ASSESSMENT_ITEMS = [
  { section: 'Cleanliness', assessment_item: 'Property cleanliness & general care', is_blocking: true },
  { section: 'Safety', assessment_item: 'Electrical, gas, water & fire safety', is_blocking: true },
  { section: 'Maintenance condition', assessment_item: 'Overall maintenance condition', is_blocking: false },
  { section: 'Functionality', assessment_item: 'Doors, windows, fittings functionality', is_blocking: false },
  { section: 'Utilities', assessment_item: 'Electricity, gas, water status', is_blocking: true },
  { section: 'Furnishings', assessment_item: 'Furniture inventory & condition (if furnished)', is_blocking: false },
  { section: 'Presentation', assessment_item: 'Presentation / styling for marketing', is_blocking: false },
  { section: 'Repairs', assessment_item: 'Repairs required before marketing', is_blocking: false },
  { section: 'Painting', assessment_item: 'Painting required', is_blocking: false },
  { section: 'Renovation', assessment_item: 'Renovation required', is_blocking: false },
  { section: 'Market rent', assessment_item: 'Market rent recommendation', is_blocking: false },
  { section: 'Approved rent', assessment_item: 'Approved rent confirmed with owner', is_blocking: false },
];

// ── Owner onboarding checklist (Owner Onboarding Checklist sheet) ──
const OWNER_ONBOARDING_ITEMS = [
  { checklist_item: 'Owner identity / KYC collected', evidence_required: 'NID / Passport / Company document', action_required: 'Collect documents' },
  { checklist_item: 'Ownership document collected', evidence_required: 'Deed / title / ownership papers', action_required: 'Request ownership copy' },
  { checklist_item: 'Owner lawful authority to rent confirmed', evidence_required: 'Owner declaration / authority', action_required: 'Confirm before marketing' },
  { checklist_item: 'Joint owner consent collected (if joint ownership)', required: false, evidence_required: 'Written consent from all owners', action_required: 'Collect all signatures' },
  { checklist_item: 'Local representative / POA verified (if NRB)', required: false, evidence_required: 'POA / authorisation', action_required: 'Coordinate review' },
  { checklist_item: 'Owner bank account details collected', evidence_required: 'Bank account details', action_required: 'Collect disbursement account' },
  { checklist_item: 'Owner tax / professional advice responsibility acknowledged', evidence_required: 'Signed agreement / CRM note', action_required: 'Record acknowledgement' },
  { checklist_item: 'Rental management agreement signed', evidence_required: 'Signed owner agreement', action_required: 'Send agreement' },
  { checklist_item: 'Property access confirmed', evidence_required: 'Key / caretaker / contact details', action_required: 'Confirm access' },
  { checklist_item: 'Property photos & condition record created', evidence_required: 'Photos / report', action_required: 'Arrange inspection' },
];

/**
 * Instantiate the leasing (rental & tenancy) 18-stage workflow project for a property.
 * Mirrors project.controller.create's stage-gate instantiation. Returns the Project.
 */
async function createLeasingProject(property, req, options = {}) {
  const tx = options.transaction;
  const project = await Project.create({
    branch_id: property.branch_id,
    project_code: await generateCode(Project, 'project_code', 'SSPC-PJ-'),
    title: `Rental Management — ${property.title}`,
    vertical_key: 'leasing',
    property_id: property.id,
    status: 'lead',
    priority: 'medium',
    created_by: req?.user?.id || null,
  }, { transaction: tx });

  const [tpl] = await sequelize.query(
    'SELECT stages FROM workflow_templates WHERE vertical_key = :v AND is_active = 1 ORDER BY id ASC LIMIT 1',
    { replacements: { v: 'leasing' }, transaction: tx }
  );
  let stages = [];
  try { stages = tpl[0] ? (typeof tpl[0].stages === 'string' ? JSON.parse(tpl[0].stages) : tpl[0].stages) : []; } catch { stages = []; }

  for (let i = 0; i < stages.length; i++) {
    const s = stages[i];
    await ProjectStage.create({
      project_id: project.id, stage_key: s.key, stage_name: s.name, sort_order: s.order ?? i + 1,
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
        completed_at: null,
        remarks: '',
      })),
      required_documents: s.required_docs || [],
    }, { transaction: tx });
  }
  if (stages[0]) await project.update({ current_stage_key: stages[0].key }, { transaction: tx });
  return project;
}

/** Seed owner onboarding checklist rows for a property/owner. */
async function seedOwnerOnboardingItems(property, ownerContactId, ownerProfileId, options = {}) {
  const tx = options.transaction;
  const rows = OWNER_ONBOARDING_ITEMS.map((it, i) => ({
    branch_id: property.branch_id,
    property_id: property.id,
    owner_contact_id: ownerContactId || null,
    owner_profile_id: ownerProfileId || null,
    checklist_item: it.checklist_item,
    required: it.required !== false,
    evidence_required: it.evidence_required || null,
    action_required: it.action_required || null,
    status: 'pending',
    sort_order: i,
  }));
  return OwnerOnboardingItem.bulkCreate(rows, { transaction: tx });
}

/** Compute readiness score (0-100) + status from assessment items. */
function computeReadiness(items = []) {
  if (!items.length) return { score: 0, status: 'not_ready' };
  const done = items.filter((i) => i.status === 'done' || i.status === 'na').length;
  const score = Math.round((done / items.length) * 100);
  const blockingOpen = items.some((i) => i.is_blocking && i.status !== 'done' && i.status !== 'na');
  const allDone = done === items.length;
  let status = 'action_required';
  if (allDone && !blockingOpen) status = 'ready_for_marketing';
  else if (!blockingOpen && score >= 80) status = 'ready_for_marketing';
  else if (score === 0) status = 'not_ready';
  return { score, status, blockingOpen };
}

module.exports = {
  VERIFICATION_ITEMS,
  ASSESSMENT_ITEMS,
  OWNER_ONBOARDING_ITEMS,
  createLeasingProject,
  seedOwnerOnboardingItems,
  computeReadiness,
};
