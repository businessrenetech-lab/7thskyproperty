/**
 * The two rural rental pipelines, from the SOPs.
 *
 * `rural_rent` shipped with 12 stages that mashed the OWNER pipeline (lead,
 * verification, marketing, leasing, lease) together with the TENANT pipeline
 * (search, inspection, negotiation) and promoted four Due-Diligence checklist
 * rows — lease_review, landlord_verification, property_inspection,
 * business_suitability — into stages. Tenant workbook Sheet 16 shows those four
 * are checklist rows.
 *
 * The SOPs describe two separate 11-stage pipelines, so `rural_rent` becomes the
 * owner pipeline (Rural Property Rental Management §4) and `rural_tenancy` is
 * added for the tenant one (Rural Property Tenancy Management §4).
 *
 * Idempotent. Run from backend/:  node scripts/seedRuralRentWorkflow.js
 */
const sequelize = require('../config/db.config');

const item = (label, responsible, evidence_required, detailed_task = '', output = '') =>
  ({ label, required: true, responsible, evidence_required, detailed_task, output });

const RURAL_OWNER_STAGES = [
  {
    key: 'owner_enquiry', name: 'Owner Enquiry', order: 1, department: 'Client Relations',
    escalation_trigger: 'Suspicious or unverifiable owner identity',
    checklist: [
      item('Register the owner and the property', 'Property Consultant', 'Owner NID / passport'),
      item('Record the introduction for non-circumvention protection', 'Property Coordinator', 'CRM log'),
    ],
    required_docs: ['Owner NID / passport', 'Property summary'],
  },
  {
    key: 'property_assessment', name: 'Property Assessment', order: 2, department: 'Operations',
    escalation_trigger: 'Unsafe access or unusable land condition',
    checklist: [
      item('Assess presentation, security, access, utilities and infrastructure', 'Property Consultant', 'Assessment report'),
    ],
    required_docs: ['Rural readiness assessment'],
  },
  {
    key: 'ownership_verification', name: 'Ownership Verification', order: 3, department: 'Compliance',
    escalation_trigger: 'Ownership dispute, boundary dispute or succession issue',
    checklist: [
      item('Verify deed, khatiyan, dag, mutation, tax receipts and succession records', 'Property Coordinator', 'Ownership Verification register'),
      item('Record ownership, boundary, access and regulatory risk', 'Operations Manager', 'Risk register entry'),
    ],
    required_docs: ['Title deed', 'Khatiyan', 'Dag', 'Mutation', 'Tax receipt', 'Succession records', 'POA (if applicable)'],
  },
  {
    key: 'owner_agreement', name: 'Owner Agreement', order: 4, department: 'Compliance',
    escalation_trigger: 'Owner declines the service agreement before marketing',
    checklist: [
      item('Execute the Rural Property Rental Service Agreement (Owner) before marketing', 'Property Coordinator', 'Signed agreement'),
      item('Confirm leasing fee, management fee, marketing budget and early termination fee', 'Operations Manager', 'Fee record'),
    ],
    required_docs: ['Signed owner agreement'],
  },
  {
    key: 'marketing_preparation', name: 'Marketing Preparation', order: 5, department: 'Operations',
    escalation_trigger: 'Misleading representation of the land',
    checklist: [
      item('Coordinate photography, videography, drone footage, brochures and signboards', 'Property Coordinator', 'Media upload'),
    ],
    required_docs: ['Photographs', 'Drone footage'],
  },
  {
    key: 'property_marketing', name: 'Property Marketing', order: 6, department: 'Operations',
    escalation_trigger: 'Advertising compliance breach',
    checklist: [
      item('Launch website, Facebook, WhatsApp, database and NRB channels', 'Property Coordinator', 'Advertising records'),
      item('Record tenant enquiries and their source', 'Property Consultant', 'Enquiry register'),
    ],
    required_docs: ['Advertising record'],
  },
  {
    key: 'tenant_screening', name: 'Tenant Screening', order: 7, department: 'Business Leasing',
    escalation_trigger: 'High-risk tenant or unverifiable financial capacity',
    checklist: [
      item('Screen identity, references, business profile, financial capacity and intended use', 'Property Consultant', 'Tenant screening record'),
      item('Prepare the recommendation for the owner', 'Property Consultant', 'Recommendation'),
    ],
    required_docs: ['Tenant NID', 'References', 'Financial capacity evidence'],
  },
  {
    key: 'lease_negotiation', name: 'Lease Negotiation', order: 8, department: 'Business Leasing',
    escalation_trigger: 'Circumvention risk — owner and tenant dealing directly',
    checklist: [
      item('Coordinate rent, deposit, duration and special conditions', 'Property Consultant', 'Negotiation log'),
    ],
    required_docs: ['Offer summary'],
  },
  {
    key: 'lease_execution', name: 'Lease Execution', order: 9, department: 'Compliance',
    escalation_trigger: 'Material dispute over lease terms',
    checklist: [
      item('Coordinate lease preparation, signing, deposit collection and occupancy', 'Property Coordinator', 'Executed lease'),
    ],
    required_docs: ['Executed lease', 'Deposit receipt'],
  },
  {
    key: 'property_management', name: 'Property Management', order: 10, department: 'Property Management',
    escalation_trigger: 'Tenant default or repeated maintenance failure',
    checklist: [
      item('Rent collection, maintenance, inspections, renewals and vacate inspections', 'Property Coordinator', 'Maintenance and inspection logs'),
    ],
    required_docs: ['Maintenance log', 'Inspection log'],
  },
  {
    key: 'closure', name: 'Closure', order: 11, department: 'CRM & Compliance',
    escalation_trigger: 'Legal claim after closure',
    checklist: [
      item('Final reconciliation, owner feedback, CRM closure and file archiving', 'Property Coordinator', 'Archive record'),
    ],
    required_docs: ['Archive register entry'],
  },
];

const RURAL_TENANT_STAGES = [
  {
    key: 'tenant_enquiry', name: 'Tenant Enquiry', order: 1, department: 'Client Relations',
    escalation_trigger: 'Unverifiable tenant identity',
    checklist: [
      item('Capture identity, contact, occupation and business type', 'Property Consultant', 'Tenant NID / passport'),
    ],
    required_docs: ['Tenant NID / passport'],
  },
  {
    key: 'consultation', name: 'Consultation', order: 2, department: 'Client Relations',
    escalation_trigger: 'Requirements outside the lawful use of the land',
    checklist: [
      item('Discuss requirements, budget, location, intended use and duration', 'Property Consultant', 'Consultation notes'),
      item('Explain the fees and the non-circumvention obligations', 'Property Consultant', 'Tenant acknowledgement'),
    ],
    required_docs: ['Consultation notes'],
  },
  {
    key: 'requirement_assessment', name: 'Requirement Assessment', order: 3, department: 'Operations',
    escalation_trigger: 'Budget and requirement materially mismatched',
    checklist: [
      item('Record property type, budget, duration, land area and business requirements', 'Property Coordinator', 'Requirement register'),
    ],
    required_docs: ['Requirement register entry'],
  },
  {
    key: 'tenant_agreement', name: 'Tenant Agreement', order: 4, department: 'Compliance',
    escalation_trigger: 'Tenant declines the service agreement before sourcing',
    checklist: [
      item('Execute the Rural Property Rental Service Agreement (Tenant) before sourcing', 'Property Coordinator', 'Signed agreement'),
    ],
    required_docs: ['Signed tenant agreement'],
  },
  {
    key: 'property_search', name: 'Property Search', order: 5, department: 'Business Leasing',
    escalation_trigger: 'Circumvention risk on an introduced property',
    checklist: [
      item('Search the internal database, active listings, off-market, network and referrals', 'Property Consultant', 'Property search register'),
      item('Record every introduced property as protected', 'Property Coordinator', 'Protected property record'),
    ],
    required_docs: ['Property search register entry'],
  },
  {
    key: 'property_shortlisting', name: 'Property Shortlisting', order: 6, department: 'Business Leasing',
    escalation_trigger: 'Shortlist presented without disclosed risks',
    checklist: [
      item('Present a shortlist with details, photos, location, value, advantages and risks', 'Property Consultant', 'Shortlist register'),
    ],
    required_docs: ['Shortlist register entry'],
  },
  {
    key: 'inspection', name: 'Inspection', order: 7, department: 'Operations',
    escalation_trigger: 'Site access refused or unsafe',
    checklist: [
      item('Arrange the inspection, landlord availability and site access', 'Property Coordinator', 'Inspection log'),
      item('Assess access, utilities, water sources, land condition and suitability', 'Property Consultant', 'Suitability findings'),
    ],
    required_docs: ['Inspection log'],
  },
  {
    key: 'negotiation', name: 'Negotiation', order: 8, department: 'Business Leasing',
    escalation_trigger: 'Parties negotiating directly',
    checklist: [
      item('Prepare the offer and manage counteroffers and conditions', 'Property Consultant', 'Negotiation log'),
    ],
    required_docs: ['Offer record'],
  },
  {
    key: 'lease_coordination', name: 'Lease Coordination', order: 9, department: 'Compliance',
    escalation_trigger: 'Legal or environmental review unresolved',
    checklist: [
      item('Lease review', 'Property Coordinator', 'Lease copy'),
      item('Landlord verification', 'Property Coordinator', 'Ownership evidence'),
      item('Environmental review', 'Operations Manager', 'Environmental note'),
      item('Legal review', 'Operations Manager', 'Legal note'),
      item('Coordinate signing and the deposit', 'Property Coordinator', 'Executed lease'),
    ],
    required_docs: ['Executed lease', 'Deposit receipt'],
  },
  {
    key: 'move_in_support', name: 'Move-In Support', order: 10, department: 'Operations',
    escalation_trigger: 'Handover or utility dispute',
    checklist: [
      item('Coordinate handover, utilities and the initial inspection', 'Property Coordinator', 'Handover checklist'),
    ],
    required_docs: ['Signed handover checklist'],
  },
  {
    key: 'closure', name: 'Closure', order: 11, department: 'CRM & Compliance',
    escalation_trigger: 'Legal claim after closure',
    checklist: [
      item('Tenant feedback, final invoice, CRM closure and file archiving', 'Property Coordinator', 'Archive record'),
    ],
    required_docs: ['Archive register entry'],
  },
];

async function upsert(verticalKey, name, stages) {
  const [rows] = await sequelize.query(
    'SELECT id FROM workflow_templates WHERE vertical_key = :v ORDER BY id ASC LIMIT 1',
    { replacements: { v: verticalKey } },
  );
  // Refuse to rewrite a template that live projects are already running on.
  const [used] = await sequelize.query(
    'SELECT COUNT(*) AS c FROM projects WHERE vertical_key = :v',
    { replacements: { v: verticalKey } },
  );
  if (Number(used[0].c) > 0) {
    throw new Error(`${used[0].c} project(s) already run ${verticalKey} — correct them before reseeding.`);
  }

  if (rows.length) {
    await sequelize.query('UPDATE workflow_templates SET stages = :s, name = :n WHERE id = :id',
      { replacements: { s: JSON.stringify(stages), n: name, id: rows[0].id } });
    console.log(`${verticalKey}: template #${rows[0].id} corrected to ${stages.length} stages.`);
  } else {
    await sequelize.query(
      'INSERT INTO workflow_templates (vertical_key, name, stages, is_active, created_at, updated_at) VALUES (:v, :n, :s, 1, NOW(), NOW())',
      { replacements: { v: verticalKey, n: name, s: JSON.stringify(stages) } });
    console.log(`${verticalKey}: template created with ${stages.length} stages.`);
  }
}

async function run() {
  await upsert('rural_rent', 'Rural Property Rental Management (Owner)', RURAL_OWNER_STAGES);
  await upsert('rural_tenancy', 'Rural Property Tenancy Management (Tenant)', RURAL_TENANT_STAGES);
}

module.exports = { RURAL_OWNER_STAGES, RURAL_TENANT_STAGES };

if (require.main === module) {
  run().then(() => process.exit(0)).catch((e) => { console.error(e.message); process.exit(1); });
}
