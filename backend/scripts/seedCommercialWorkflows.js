/**
 * The two Commercial pipelines, from the client's workbooks.
 *
 * `commercial_sale` shipped with 18 "stages" that were the TWO SHEETS of
 * "Commercial_Property_Sale_Checklist_Enterprise_Workflow - V.1.xlsx" unioned:
 * Sheet 1 "Commercial Sale Checklist" gave stages 1-13 (its checklist task and
 * responsible team are still visible on them) and Sheet 2 "Commercial Sale CRM
 * Workflow" gave stages 14-18 (its CRM action and required document are visible
 * on those). Sheet 2 is the SAME process expressed as CRM actions, not five extra
 * stages — three of the five are stages 1, 9 and 10 under a second name:
 *
 *     Consultation          = Initial Consultation
 *     Negotiation Tracking  = Negotiation Support
 *     Due Diligence         = Due Diligence Coordination
 *
 * Only two are genuinely new: Lead Capture, which precedes the consultation, and
 * Commission Tracking, which precedes final reporting. The corrected pipeline is
 * therefore 15 stages in Sheet 2's order, each carrying Sheet 1's checklist and
 * responsible team AND Sheet 2's CRM action, tracking requirement and evidence.
 *
 * `commercial_rent` already had the right 14 stages in the right order (Sheet 2
 * "Enterprise Workflow" of Commercial_Rent_Lease_Workflow_and_Checklists - V0.1).
 * Its names and order are NOT changed here. What it lacked is what every rural and
 * business stage carries: a department and an escalation trigger, and the Sheet 1
 * checklist items attached to the stage that owns them.
 *
 * ESCALATION TRIGGERS, honestly sourced:
 *  - Rent: taken from Sheet 2's own "Risk / Compliance Check" column, which is
 *    literally the compliance gate for each stage.
 *  - Sale: DERIVED. The client supplied SOPs for Commercial Purchase, Rental
 *    Management and Tenancy Management, but NO Commercial Property SALE SOP, so
 *    there is no document to quote. Each trigger below is the failure the
 *    workbook's own "Purpose / Client Benefit" implies, and should be confirmed
 *    with the client when that SOP arrives.
 *
 * Idempotent, and refuses to rewrite a template that live projects run on.
 * Run from backend/:  node scripts/seedCommercialWorkflows.js
 */
const sequelize = require('../config/db.config');

const item = (label, responsible, evidence_required, detailed_task = '', output = '') =>
  ({ label, required: true, responsible, evidence_required, detailed_task, output });

// ── Commercial SALE — 15 stages, Sheet 2's order ─────────────────────────────
const COMMERCIAL_SALE_STAGES = [
  {
    key: 'lead_capture', name: 'Lead Capture', order: 1, department: 'Client Relations',
    escalation_trigger: 'Owner enquiry not acknowledged within 24 hours',
    checklist: [
      item('Record the owner enquiry and the property details', 'Sales Coordinator', 'Owner enquiry form',
        'Capture the lead source and assign the consultant'),
    ],
    required_docs: ['Owner enquiry form'],
  },
  {
    key: 'initial_consultation', name: 'Initial Consultation', order: 2, department: 'Commercial Sales',
    escalation_trigger: 'Sale goals or pricing expectations cannot be agreed',
    checklist: [
      item('Understand the commercial property sale goals', 'Commercial Property Manager', 'Consultation summary',
        'Establish pricing, strategy and commercial sale direction'),
      item('Upload the consultation notes and the agreed strategy', 'Commercial Property Manager', 'Consultation records'),
    ],
    required_docs: ['Consultation summary'],
  },
  {
    key: 'property_assessment', name: 'Property Assessment', order: 3, department: 'Operations',
    escalation_trigger: 'Inspection finds a compliance defect or a safety risk',
    checklist: [
      item('Conduct a detailed commercial property inspection', 'Inspection Officer', 'Assessment report',
        'Identify risks, strengths and compliance concerns'),
      item('Upload the inspection findings and photographs', 'Inspection Officer', 'Inspection reports'),
    ],
    required_docs: ['Assessment report', 'Inspection photographs'],
  },
  {
    key: 'ownership_verification', name: 'Ownership Verification', order: 4, department: 'Legal & Compliance',
    escalation_trigger: 'An ownership or legal record is missing, disputed or unverifiable',
    checklist: [
      item('Review the ownership and legal records', 'Documentation Coordinator', 'Verification update',
        'Reduce transaction risk and identify document gaps'),
      item('Track the legal document collection to completion', 'Documentation Coordinator', 'Ownership documents'),
    ],
    required_docs: ['Ownership documents', 'Verification report'],
  },
  {
    key: 'market_analysis', name: 'Market Analysis', order: 5, department: 'Commercial Sales',
    escalation_trigger: 'Owner expectation is materially above the assessed market value',
    checklist: [
      item('Assess the market value and buyer demand', 'Market Research Officer', 'Pricing recommendation',
        'Support pricing and commercial positioning'),
      item('Record the pricing analysis and the comparables used', 'Market Research Officer', 'Valuation reports'),
    ],
    required_docs: ['Valuation report', 'Comparable market analysis'],
  },
  {
    key: 'property_preparation', name: 'Property Preparation', order: 6, department: 'Operations',
    escalation_trigger: 'Preparation work overruns its approved scope or cost',
    checklist: [
      item('Coordinate repairs, cleaning and presentation', 'Property Preparation Team', 'Preparation updates',
        'Improve buyer confidence and presentation quality'),
      item('Track the vendor work and its progress', 'Property Preparation Team', 'Invoices and photographs'),
    ],
    required_docs: ['Work orders', 'Vendor invoices'],
  },
  {
    key: 'marketing_activation', name: 'Marketing Activation', order: 7, department: 'Marketing',
    escalation_trigger: 'No listing live, or no enquiry within 30 days of launch',
    checklist: [
      item('Launch the commercial marketing campaign', 'Marketing Team', 'Marketing activation update',
        'Increase visibility and attract serious buyers'),
      item('Launch the listings and campaigns, and track enquiries against them', 'Marketing Team', 'Marketing records'),
    ],
    required_docs: ['Listing evidence', 'Campaign record'],
  },
  {
    key: 'buyer_enquiry_management', name: 'Buyer Enquiry Management', order: 8, department: 'Commercial Sales',
    escalation_trigger: 'A buyer enquiry is left unanswered for 48 hours',
    checklist: [
      item('Respond to buyer enquiries', 'Sales Coordinator', 'Buyer enquiry updates',
        'Improve conversion and buyer engagement'),
      item('Track buyer communication and screening', 'Sales Coordinator', 'Buyer enquiry records'),
    ],
    required_docs: ['Buyer enquiry records'],
  },
  {
    key: 'inspection_coordination', name: 'Inspection Coordination', order: 9, department: 'Operations',
    escalation_trigger: 'No inspection arranged within 30 days, or access repeatedly refused',
    checklist: [
      item('Arrange the property inspections', 'Inspection Coordinator', 'Inspection feedback',
        'Deliver an organised buyer inspection experience'),
      item('Schedule the inspections and site visits, and record attendance', 'Inspection Coordinator', 'Inspection reports'),
    ],
    required_docs: ['Inspection schedule', 'Visitor log'],
  },
  {
    key: 'negotiation_support', name: 'Negotiation Support', order: 10, department: 'Commercial Sales',
    escalation_trigger: 'An offer is below the agreed minimum, or negotiation stalls for 7 days',
    checklist: [
      item('Coordinate the negotiation and the offers', 'Commercial Sales Manager', 'Negotiation updates',
        'Maximise the sales outcome and reduce disputes'),
      item('Track every offer and counteroffer with its history', 'Commercial Sales Manager', 'Offer documents'),
    ],
    required_docs: ['Offer documents', 'Negotiation log'],
  },
  {
    key: 'due_diligence_coordination', name: 'Due Diligence Coordination', order: 11, department: 'Legal & Compliance',
    escalation_trigger: 'Due diligence uncovers a title, compliance or encumbrance issue',
    checklist: [
      item('Coordinate the buyer verification and review', 'Compliance Team', 'Due diligence updates',
        'Support smooth transaction progression'),
      item('Track the buyer review and verification to completion', 'Compliance Team', 'Verification records'),
    ],
    required_docs: ['Due diligence report', 'Verification records'],
  },
  {
    key: 'agreement_coordination', name: 'Agreement Coordination', order: 12, department: 'Legal & Compliance',
    escalation_trigger: 'The sale agreement is unsigned 7 days after issue',
    checklist: [
      item('Coordinate the sale agreements', 'Legal Coordinator', 'Agreement progress',
        'Ensure an organised transaction process'),
      item('Upload the signed agreements and the approvals', 'Legal Coordinator', 'Signed agreements'),
    ],
    required_docs: ['Signed sale agreement'],
  },
  {
    key: 'settlement_coordination', name: 'Settlement Coordination', order: 13, department: 'Accounts',
    escalation_trigger: 'Settlement or ownership transfer misses its agreed date',
    checklist: [
      item('Coordinate the settlement and the transfer', 'Settlement Officer', 'Settlement updates',
        'Support a smooth ownership transfer'),
      item('Track the payment and the ownership transfer', 'Settlement Officer', 'Settlement records'),
    ],
    required_docs: ['Settlement records', 'Transfer documents'],
  },
  {
    key: 'commission_tracking', name: 'Commission Tracking', order: 14, department: 'Accounts',
    escalation_trigger: 'Commission unpaid at settlement, or a protected buyer is bypassed',
    checklist: [
      item('Track the commission and the operational expenses', 'Accounts Team', 'Invoices and receipts',
        'Financial disbursement tracking'),
      item('Verify the commission entitlement before closure', 'Commercial Property Manager', 'Paid invoice'),
    ],
    required_docs: ['Commission invoice', 'Receipts'],
  },
  {
    key: 'final_reporting', name: 'Final Reporting', order: 15, department: 'Commercial Sales',
    escalation_trigger: 'A claim or dispute is raised after closure',
    checklist: [
      item('Prepare the completion and financial report', 'Commercial Property Manager', 'Final completion report',
        'Provide transparent closure reporting'),
      item('Archive the records and prepare the reports', 'Commercial Property Manager', 'Final reports'),
    ],
    required_docs: ['Final completion report', 'Archive record'],
  },
];

// ── Commercial RENT — the SAME 14 stages, enriched ───────────────────────────
// Names, keys and order are unchanged from what already shipped; this adds the
// department, the escalation trigger (Sheet 2's "Risk / Compliance Check") and
// the Sheet 1 checklist items that belong to each stage.
const COMMERCIAL_RENT_STAGES = [
  {
    key: 'lead_intake', name: 'Lead Intake', order: 1, department: 'Client Relations',
    escalation_trigger: 'Identity verification fails, or the landlord cannot be verified',
    checklist: [
      item('Receive the landlord enquiry and create the CRM profile', 'Client Relations', 'Lead Record'),
      item('Collect the owner / landlord details', 'Leasing Coordinator', 'Owner Profile'),
      item('Collect the commercial property details', 'Leasing Coordinator', 'Property Profile'),
    ],
    required_docs: ['Lead record', 'Owner profile'],
  },
  {
    key: 'consultation', name: 'Consultation', order: 2, department: 'Commercial Team',
    escalation_trigger: 'The property is not commercially suitable for the intended use',
    checklist: [
      item('Conduct the commercial leasing consultation', 'Commercial Team', 'Consultation Notes'),
    ],
    required_docs: ['Consultation notes'],
  },
  {
    key: 'assessment', name: 'Assessment', order: 3, department: 'Commercial Team',
    escalation_trigger: 'Ownership review raises a question over title or authority',
    checklist: [
      item('Assess the property condition and the market value', 'Commercial Team', 'Assessment Report'),
    ],
    required_docs: ['Assessment report'],
  },
  {
    key: 'documentation', name: 'Documentation', order: 4, department: 'Compliance Team',
    escalation_trigger: 'Compliance review finds a missing or invalid ownership record',
    checklist: [
      item('Collect and review the ownership records', 'Compliance Team', 'Document Register'),
      item('Collect the deed and the ownership documents', 'Documentation Team', 'Document Register'),
    ],
    required_docs: ['Deed', 'Ownership documents'],
  },
  {
    key: 'preparation', name: 'Preparation', order: 5, department: 'Operations Team',
    escalation_trigger: 'A safety review fails, or preparation overruns its approved scope',
    checklist: [
      item('Coordinate the property preparation', 'Operations Team', 'Work Orders'),
      item('Coordinate the cleaning and the repairs', 'Operations Team', 'Work Progress Tracker'),
    ],
    required_docs: ['Work orders'],
  },
  {
    key: 'marketing', name: 'Marketing', order: 6, department: 'Marketing Team',
    escalation_trigger: 'Advertising compliance is breached, or no listing goes live',
    checklist: [
      item('Launch the property marketing campaign', 'Marketing Team', 'Listing Evidence'),
      item('Publish the listings on the portals and social media', 'Marketing Team', 'Marketing Record'),
    ],
    required_docs: ['Listing evidence'],
  },
  {
    key: 'lead_management', name: 'Lead Management', order: 7, department: 'CRM Team',
    escalation_trigger: 'Fraud screening flags a tenant lead',
    checklist: [
      item('Track and qualify the tenant leads', 'CRM Team', 'Lead Notes'),
      item('Conduct the initial tenant screening', 'Leasing Coordinator', 'Screening Notes'),
    ],
    required_docs: ['Screening notes'],
  },
  {
    key: 'inspection', name: 'Inspection', order: 8, department: 'Inspection Team',
    escalation_trigger: 'The visitor log is incomplete, or an inspection is repeatedly cancelled',
    checklist: [
      item('Conduct the inspections', 'Inspection Team', 'Inspection Reports'),
      item('Coordinate the commercial property inspection', 'Inspection Team', 'Inspection Schedule'),
    ],
    required_docs: ['Inspection reports', 'Visitor log'],
  },
  {
    key: 'negotiation', name: 'Negotiation', order: 9, department: 'Leasing Team',
    escalation_trigger: 'Commission protection is at risk, or terms fall below the agreed minimum',
    checklist: [
      item('Coordinate the lease negotiation', 'Leasing Team', 'Negotiation Logs'),
      item('Coordinate the rental negotiation and the offer', 'Leasing Team', 'Negotiation Record'),
    ],
    required_docs: ['Negotiation log'],
  },
  {
    key: 'agreement', name: 'Agreement', order: 10, department: 'Documentation Team',
    escalation_trigger: 'Legal review objects, or the lease is unsigned after 7 days',
    checklist: [
      item('Finalise the lease agreement', 'Documentation Team', 'Signed Agreement'),
      item('Prepare the commercial lease agreement', 'Documentation Team', 'Lease Draft'),
    ],
    required_docs: ['Signed lease agreement'],
  },
  {
    key: 'financial', name: 'Financial', order: 11, department: 'Accounts Team',
    escalation_trigger: 'Financial verification fails, or the deposit is not received',
    checklist: [
      item('Collect the payments and the deposits', 'Accounts Team', 'Receipts'),
      item('Collect the security deposit and the rent', 'Accounts Team', 'Payment Record'),
    ],
    required_docs: ['Receipts', 'Payment record'],
  },
  {
    key: 'handover', name: 'Handover', order: 12, department: 'Operations Team',
    escalation_trigger: 'Asset verification disagrees with the handover checklist',
    checklist: [
      item('Coordinate the handover', 'Operations Team', 'Handover Checklist'),
      item('Coordinate the property handover', 'Operations Team', 'Handover Record'),
    ],
    required_docs: ['Signed handover checklist'],
  },
  {
    key: 'management', name: 'Management', order: 13, department: 'Management Team',
    escalation_trigger: 'Operational compliance lapses, or rent falls into arrears',
    checklist: [
      item('Manage the ongoing tenancy', 'Management Team', 'Rental Ledger'),
      item('Track the rent collection', 'Accounts Team', 'Rental Ledger'),
      item('Coordinate the maintenance requests', 'Operations Team', 'Maintenance Tracker'),
    ],
    required_docs: ['Rental ledger'],
  },
  {
    key: 'closure', name: 'Closure', order: 14, department: 'CRM Team',
    escalation_trigger: 'Record retention is incomplete, or a claim follows closure',
    checklist: [
      item('Archive the tenancy records', 'CRM Team', 'Closure Report'),
      item('Process the tenancy closure', 'Leasing Coordinator', 'Exit Checklist'),
    ],
    required_docs: ['Closure report', 'Exit checklist'],
  },
];

async function upsert(verticalKey, name, stages) {
  const [rows] = await sequelize.query(
    'SELECT id FROM workflow_templates WHERE vertical_key = :v ORDER BY id ASC LIMIT 1',
    { replacements: { v: verticalKey } },
  );
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
    console.log(`${verticalKey}: template #${rows[0].id} set to ${stages.length} stages.`);
  } else {
    await sequelize.query(
      'INSERT INTO workflow_templates (vertical_key, name, stages, is_active, created_at, updated_at) VALUES (:v, :n, :s, 1, NOW(), NOW())',
      { replacements: { v: verticalKey, n: name, s: JSON.stringify(stages) } });
    console.log(`${verticalKey}: template created with ${stages.length} stages.`);
  }
}

async function run() {
  await upsert('commercial_sale', 'Commercial Property Sale', COMMERCIAL_SALE_STAGES);
  await upsert('commercial_rent', 'Commercial Rent & Lease', COMMERCIAL_RENT_STAGES);
}

module.exports = { COMMERCIAL_SALE_STAGES, COMMERCIAL_RENT_STAGES };

if (require.main === module) {
  run().then(() => process.exit(0)).catch((e) => { console.error(e.message); process.exit(1); });
}
