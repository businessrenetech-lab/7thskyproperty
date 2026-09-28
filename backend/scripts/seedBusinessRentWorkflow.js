/**
 * Corrects the business_rent workflow template to the workbook's 13 lease stages.
 *
 * The template shipped with 20 stages: the 13 below plus the seven DEPARTMENT
 * names from the enterprise sheet's Department column (Client Relations,
 * Operations, Compliance, Business Leasing, Accounts, Property Management,
 * CRM & Compliance), whose checklist items merely restated work the 13 already
 * carry. The department is now an attribute of the stage, and each stage carries
 * the sheet's escalation trigger.
 *
 * Idempotent — re-running rewrites the same template. Run from backend/:
 *   node scripts/seedBusinessRentWorkflow.js
 */
const sequelize = require('../config/db.config');

const item = (label, responsible, evidence_required, detailed_task = '', output = '') =>
  ({ label, required: true, responsible, evidence_required, detailed_task, output });

const BUSINESS_RENT_STAGES = [
  {
    key: 'lead_intake', name: 'Lead Intake', order: 1, department: 'Client Relations',
    escalation_trigger: 'Suspicious owner information',
    checklist: [
      item('Receive owner enquiry and create CRM profile', 'Client Relations', 'Owner ID'),
      item('Record introduction for non-circumvention protection', 'Client Relations', 'CRM log'),
    ],
    required_docs: ['Owner NID / passport', 'Company document (if corporate owner)'],
  },
  {
    key: 'consultation', name: 'Consultation', order: 2, department: 'Client Relations',
    escalation_trigger: 'Unrealistic owner expectations or undisclosed encumbrance',
    checklist: [item('Conduct initial business lease consultation', 'Business Leasing Team', 'Consultation Form')],
    required_docs: ['Signed consultation form'],
  },
  {
    key: 'assessment', name: 'Assessment', order: 3, department: 'Operations',
    escalation_trigger: 'Unsafe or unlawful operations',
    checklist: [
      item('Assess business readiness for leasing', 'Operations Team', 'Business Assessment'),
      item('Complete commercial premises assessment', 'Operations Team', 'Assessment Report'),
    ],
    required_docs: ['Commercial premises assessment report'],
  },
  {
    key: 'documentation', name: 'Documentation', order: 4, department: 'Compliance',
    escalation_trigger: 'Fraudulent documents',
    checklist: [
      item('Collect trade licence and company documents', 'Compliance Team', 'Trade Licence, TIN, Lease'),
      item('Document verification against the required-document register', 'Compliance Team', 'Document Register'),
      item('Prepare the rental management service agreement', 'Documentation Team', 'Signed Agreements'),
    ],
    required_docs: ['Trade licence', 'TIN certificate', 'Ownership document', 'Signed BRM agreement'],
  },
  {
    key: 'marketing', name: 'Marketing', order: 5, department: 'Operations',
    escalation_trigger: 'Misleading information in listing material',
    checklist: [
      item('Prepare listing and marketing materials', 'Marketing Team', 'Photos, Videos'),
      item('Launch commercial marketing campaign', 'Marketing Team', 'Advertising Records'),
      item('Marketing activation recorded', 'Marketing Team', 'Marketing Evidence'),
    ],
    required_docs: ['Listing photos', 'Advertising record'],
  },
  {
    key: 'tenant_screening', name: 'Tenant Screening', order: 6, department: 'Business Leasing',
    escalation_trigger: 'High-risk tenant or unverifiable trade licence',
    checklist: [
      item('Screen potential tenant/operator', 'Business Leasing Team', 'Tenant Application'),
      item('Tenant sourcing and screening report completed', 'Business Leasing Team', 'Tenant Screening Report'),
    ],
    required_docs: ['Tenant trade licence', 'Corporate profile', 'Financial capability evidence'],
  },
  {
    key: 'inspection', name: 'Inspection', order: 7, department: 'Operations',
    escalation_trigger: 'Operational hazards observed on site',
    checklist: [
      item('Coordinate inspections and meetings', 'Operations Team', 'Inspection Records'),
      item('Inspection coordination log maintained', 'Operations Team', 'Inspection Logs'),
    ],
    required_docs: ['Inspection log'],
  },
  {
    key: 'negotiation', name: 'Negotiation', order: 8, department: 'Business Leasing',
    escalation_trigger: 'Circumvention risk — parties dealing directly',
    checklist: [
      item('Coordinate lease negotiation', 'Business Leasing Team', 'Offer Summary'),
      item('Negotiation coordination log maintained', 'Business Leasing Team', 'Negotiation Log'),
    ],
    required_docs: ['Offer summary'],
  },
  {
    key: 'agreement', name: 'Agreement', order: 9, department: 'Compliance',
    escalation_trigger: 'Material disputes over lease terms',
    checklist: [item('Prepare lease agreement', 'Documentation Team', 'Draft Lease Agreement')],
    required_docs: ['Executed lease agreement'],
  },
  {
    key: 'settlement', name: 'Settlement', order: 10, department: 'Accounts',
    escalation_trigger: 'Payment default',
    checklist: [
      item('Coordinate advance payment collection', 'Accounts Team', 'Payment Receipt'),
      item('Financial settlement recorded against the folio', 'Accounts Team', 'Payment Records'),
    ],
    required_docs: ['Advance rent receipt', 'Deposit receipts'],
  },
  {
    key: 'handover', name: 'Handover', order: 11, department: 'Operations',
    escalation_trigger: 'Access disputes at handover',
    checklist: [
      item('Coordinate operational handover', 'Operations Team', 'Handover Checklist'),
      item('Business handover checklist completed and signed', 'Operations Team', 'Handover Checklist'),
    ],
    required_docs: ['Signed handover checklist'],
  },
  {
    key: 'management', name: 'Management', order: 12, department: 'Property Management',
    escalation_trigger: 'Repeated disputes or unresolved maintenance',
    checklist: [
      item('Ongoing lease management support', 'Property Management Team', 'Maintenance Reports'),
      item('Lease management support logged', 'Property Management Team', 'Maintenance Logs'),
    ],
    required_docs: ['Maintenance log'],
  },
  {
    key: 'closure', name: 'Closure', order: 13, department: 'CRM & Compliance',
    escalation_trigger: 'Legal claims after closure',
    checklist: [
      item('Archive records and close workflow', 'CRM Team', 'Archived File'),
      item('Record retention and closure register updated', 'CRM Team', 'Archive Register'),
    ],
    required_docs: ['Archive register entry'],
  },
];

async function run() {
  const [rows] = await sequelize.query(
    "SELECT id FROM workflow_templates WHERE vertical_key = 'business_rent' ORDER BY id ASC LIMIT 1",
  );
  if (!rows.length) throw new Error('No business_rent workflow template to correct.');

  // Refuse to rewrite a template that live projects are already running on.
  const [used] = await sequelize.query(
    "SELECT COUNT(*) AS c FROM projects WHERE vertical_key = 'business_rent'",
  );
  if (Number(used[0].c) > 0) {
    throw new Error(`${used[0].c} project(s) already run this template — correct them before reseeding.`);
  }

  await sequelize.query(
    'UPDATE workflow_templates SET stages = :s, name = :n WHERE id = :id',
    { replacements: { s: JSON.stringify(BUSINESS_RENT_STAGES), n: 'Business Rent & Lease', id: rows[0].id } },
  );
  console.log(`business_rent template #${rows[0].id} corrected to ${BUSINESS_RENT_STAGES.length} stages.`);
}

module.exports = { BUSINESS_RENT_STAGES };

if (require.main === module) {
  run().then(() => process.exit(0)).catch((e) => { console.error(e.message); process.exit(1); });
}
