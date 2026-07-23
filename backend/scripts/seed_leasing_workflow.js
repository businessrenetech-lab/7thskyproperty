/**
 * seed_leasing_workflow.js
 * ------------------------------------------------------------------
 * Upgrades the `leasing` workflow_template to the full 18-stage SOP /
 * workbook workflow with rich checklist items. Re-runnable (idempotent):
 * it overwrites the stages JSON for vertical_key = 'leasing'.
 *
 * Checklist item shape (consumed by project.controller -> ProjectStage):
 *   { label, required, responsible, evidence_required, output }
 *
 * Run:  node scripts/seed_leasing_workflow.js
 */
require('dotenv').config();
const sequelize = require('../config/db.config');

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');

// label, required, responsible, evidence_required, output
const C = (label, responsible, evidence_required = '', output = '', required = true) =>
  ({ label, required, responsible, evidence_required, output });

const STAGES = [
  { name: 'Owner Enquiry & Initial Consultation', checklist: [
    C('Owner enquiry received & logged', 'Property Manager', 'CRM enquiry / call log', 'Enquiry recorded'),
    C('Owner profile created in CRM', 'Admin', 'Owner contact record', 'Owner profile'),
    C('Property details & rental expectations collected', 'Property Manager', 'Notes / property info', 'Consultation notes'),
    C('Consultation meeting conducted', 'Property Manager', 'Meeting notes', 'Service scope agreed'),
    C('Service scope, commission & fees discussed', 'Property Manager', 'CRM note', 'Scope & fee record'),
    C('Service agreement & quotation issued', 'Property Manager', 'Quotation / agreement', 'Agreement issued'),
  ] },
  { name: 'Owner Onboarding', checklist: [
    C('Owner identity / KYC collected', 'Admin', 'NID / Passport / Company doc', 'KYC on file'),
    C('Ownership document collected', 'Property Manager', 'Deed / title / ownership papers', 'Ownership verified'),
    C('Lawful authority to rent confirmed', 'Property Manager', 'Owner declaration / authority', 'Authority confirmed'),
    C('Joint owner consent collected (if joint)', 'Owner', 'Written consent of all owners', 'Consent on file', false),
    C('Local representative / POA verified (if NRB)', 'Legal Coordinator', 'POA / authorisation', 'POA verified', false),
    C('Owner bank account details collected', 'Accounts', 'Bank account details', 'Disbursement account'),
    C('Tax / professional advice responsibility acknowledged', 'Property Manager', 'Signed agreement / CRM note', 'Acknowledgement recorded'),
    C('Rental management agreement signed', 'Property Manager', 'Signed owner agreement', 'Agreement signed'),
  ] },
  { name: 'Property Master Setup', checklist: [
    C('Property master record created', 'Property Manager', 'CRM property record', 'Property profile'),
    C('Property address, type & attributes captured', 'Property Manager', 'Property data', 'Attributes recorded'),
    C('Occupancy & utility status confirmed', 'Coordinator', 'Utility/occupancy note', 'Status confirmed'),
    C('Property access confirmed (key/caretaker)', 'Coordinator', 'Key / contact details', 'Access confirmed'),
    C('Property photos & condition record created', 'Inspection Officer', 'Photos / report', 'Condition baseline'),
    C('Management fee % & rent due day set', 'Accounts', 'Fee schedule', 'Fees configured'),
  ] },
  { name: 'Rental Assessment & Setup', checklist: [
    C('Rental market analysis completed', 'Leasing Officer', 'Comparable rents', 'Rent range'),
    C('Approved monthly rent confirmed', 'Property Manager', 'Owner approval / CRM note', 'Approved rent'),
    C('Property readiness assessed', 'Inspection Officer', 'Assessment report / photos', 'Readiness status'),
    C('Repairs / cleaning / furnishing needs identified', 'Property Manager', 'Assessment items', 'Action list'),
    C('Furniture inventory prepared (if furnished)', 'Inspection Officer', 'Inventory + photos', 'Inventory record', false),
    C('Rental readiness report prepared', 'Property Manager', 'Readiness report', 'Ready-for-marketing decision'),
  ] },
  { name: 'Property Preparation', checklist: [
    C('Approved preparation works coordinated', 'Coordinator', 'Work approvals', 'Works scheduled'),
    C('Quotations obtained where required', 'Coordinator', 'Quotations', 'Quotes on file', false),
    C('Contractors / suppliers coordinated', 'Maintenance Coordinator', 'Vendor assignment', 'Vendor assigned', false),
    C('Work progress & completion tracked', 'Coordinator', 'Progress notes', 'Works completed'),
    C('Before-and-after photos & invoices retained', 'Coordinator', 'Photos / invoices', 'Evidence on file'),
    C('Final rental readiness confirmed', 'Property Manager', 'Readiness confirmation', 'Ready for marketing'),
  ] },
  { name: 'Marketing & Enquiry Management', checklist: [
    C('Photography / videography & marketing pack ready', 'Leasing Officer', 'Marketing assets', 'Listing pack'),
    C('Online listing & social marketing activated', 'Leasing Officer', 'Listing links', 'Listing live'),
    C('Tenant enquiries logged in tracker', 'Leasing Officer', 'Enquiry log', 'Enquiries captured'),
    C('Viewings scheduled & conducted', 'Leasing Consultant', 'Viewing schedule', 'Viewings done'),
    C('Communication records maintained', 'Leasing Officer', 'Communication log', 'Records kept'),
  ] },
  { name: 'Tenant Application', checklist: [
    C('Tenant application(s) received', 'Leasing Officer', 'Application form', 'Application logged'),
    C('Applicant details & occupancy needs captured', 'Leasing Officer', 'Application data', 'Applicant profile'),
    C('Supporting documents collected', 'Leasing Officer', 'ID / income / references', 'Documents on file'),
    C('Occupant declaration collected', 'Leasing Officer', 'Occupant list & IDs', 'Occupants recorded'),
  ] },
  { name: 'Tenant Verification', checklist: [
    C('Identity verified (NID/Passport)', 'Leasing Officer', 'ID copy', 'Identity verified'),
    C('Current address verified', 'Leasing Officer', 'Address proof', 'Address verified'),
    C('Employment / occupation verified', 'Leasing Officer', 'Employment letter / business proof', 'Employment verified'),
    C('Income / affordability checked', 'Leasing Officer', 'Salary / bank statement', 'Affordability assessed'),
    C('References checked', 'Leasing Officer', 'Reference notes', 'References cleared'),
    C('Rental history reviewed', 'Leasing Officer', 'Previous landlord contact', 'History reviewed', false),
    C('Risk assessment completed', 'Property Manager', 'Risk note', 'Risk rating'),
    C('Fraud / false information warning acknowledged', 'Leasing Officer', 'Signed application', 'Acknowledged'),
  ] },
  { name: 'Tenant Approval', checklist: [
    C('Seventh Sky recommendation prepared', 'Property Manager', 'Recommendation note', 'Recommendation'),
    C('Shortlisted tenant submitted to owner', 'Property Manager', 'Owner submission', 'Owner reviewing', false),
    C('Owner approval obtained', 'Property Manager', 'Owner approval / CRM note', 'Approval recorded'),
    C('Approved rent & lease start confirmed', 'Property Manager', 'Approval evidence', 'Terms confirmed'),
  ] },
  { name: 'Lease Finalisation', checklist: [
    C('Tenancy agreement prepared', 'Documentation Officer', 'Draft agreement', 'Lease drafted'),
    C('Lease terms explained to tenant', 'Leasing Consultant', 'CRM note', 'Terms explained'),
    C('Signed lease agreement collected', 'Documentation Officer', 'Signed agreement', 'Lease signed'),
    C('Advance rent collected', 'Accounts', 'Receipt', 'Advance received'),
    C('Security deposit / bond collected', 'Accounts', 'Receipt', 'Bond received'),
    C('Signed records uploaded to CRM', 'Admin', 'Uploaded documents', 'Records on file'),
  ] },
  { name: 'Move-In & Entry Checklist', checklist: [
    C('Signed tenancy agreement received', 'Admin', 'Signed agreement', 'Confirmed'),
    C('Advance rent & bond confirmed received', 'Accounts', 'Receipts', 'Funds confirmed'),
    C('Entry inspection completed', 'Inspection Officer', 'Entry inspection report / photos', 'Baseline recorded'),
    C('Keys / access handover recorded', 'Coordinator', 'Key handover form', 'Keys handed over'),
    C('Building rules & utility responsibility explained', 'Coordinator', 'Tenant acknowledgement', 'Tenant briefed'),
    C('CRM tenancy activated', 'Admin', 'CRM status active', 'Tenancy active'),
  ] },
  { name: 'Ongoing Rental Management', checklist: [
    C('Tenant communication channel established', 'Tenant Relationship Officer', 'Communication log', 'Channel active'),
    C('Rent payment monitoring active', 'Accounts', 'Rent ledger', 'Monitoring on'),
    C('Complaint & request handling in place', 'Property Manager', 'Request register', 'SLA active'),
    C('Operational records & communication logs maintained', 'Property Manager', 'Logs', 'Records kept'),
  ] },
  { name: 'Rent Collection & Owner Disbursement', checklist: [
    C('Monthly rent invoiced', 'Accounts', 'Invoice', 'Invoice raised'),
    C('Rent collected & receipted', 'Accounts', 'Receipt', 'Payment recorded'),
    C('Arrears reviewed & reminders sent', 'Accounts', 'Arrears tracker', 'Arrears managed'),
    C('Management fee & approved expenses deducted', 'Accounts', 'Deduction record', 'Deductions applied'),
    C('Owner statement prepared', 'Accounts', 'Owner statement', 'Statement ready'),
    C('Owner disbursement paid', 'Accounts', 'Disbursement record', 'Owner paid'),
  ] },
  { name: 'Routine Inspection', checklist: [
    C('Routine inspection scheduled (every 6 months)', 'Property Manager', 'Inspection schedule', 'Scheduled'),
    C('Inspection conducted with photos/notes', 'Inspection Officer', 'Inspection report / photos', 'Inspection done'),
    C('Damage / subletting / compliance assessed', 'Property Manager', 'Findings', 'Issues recorded'),
    C('Corrective actions raised where required', 'Coordinator', 'Action / maintenance request', 'Actions raised', false),
    C('Inspection report sent to owner', 'Coordinator', 'Owner report', 'Owner updated'),
  ] },
  { name: 'Maintenance / Tenant Requests', checklist: [
    C('Maintenance / tenant request logged', 'Property Manager', 'Request register', 'Request logged'),
    C('Urgency & owner approval assessed', 'Coordinator', 'Approval note', 'Triaged'),
    C('Expense approval obtained where required', 'Coordinator', 'Owner approval', 'Approved', false),
    C('Contractor coordinated & work completed', 'Maintenance Coordinator', 'Work order', 'Work done'),
    C('Before/after photos & invoices retained', 'Coordinator', 'Photos / invoices', 'Evidence on file'),
  ] },
  { name: 'Renewal / Termination', checklist: [
    C('Lease end / renewal reminder triggered', 'Property Manager', 'Renewal reminder', 'Reminder sent'),
    C('Tenant history reviewed for renewal', 'Property Manager', 'History note', 'Reviewed'),
    C('Owner approval & updated rent agreed', 'Property Manager', 'Owner approval', 'Terms agreed', false),
    C('Renewal executed OR termination notice processed', 'Documentation Officer', 'Renewal / notice', 'Outcome recorded'),
  ] },
  { name: 'Exit Inspection / Bond Adjustment', checklist: [
    C('Vacancy / termination notice received', 'Property Manager', 'Notice', 'Notice logged'),
    C('Exit inspection conducted vs entry condition', 'Inspection Officer', 'Exit inspection report', 'Comparison done'),
    C('Damage, cleaning & unpaid liabilities assessed', 'Property Manager', 'Findings / quotes', 'Deductions assessed'),
    C('Bond adjustment summary prepared', 'Accounts', 'Bond adjustment record', 'Summary ready'),
    C('Bond refund / deduction coordinated', 'Accounts', 'Refund record', 'Bond settled'),
    C('Keys returned & property reset', 'Coordinator', 'Key return record', 'Property vacated'),
  ] },
  { name: 'Service Closure / Archive', checklist: [
    C('Final tenant ledger reconciled', 'Accounts', 'Final ledger', 'Reconciled'),
    C('All records archived (tenancy, inspections, financials)', 'Documentation Officer', 'Archived records', 'Archive complete'),
    C('Owner follow-up / re-marketing decision', 'Property Manager', 'Owner note', 'Next step set', false),
    C('CRM workflow closed', 'Admin', 'CRM status closed', 'File closed'),
  ] },
];

async function run() {
  const stages = STAGES.map((s, i) => ({
    key: slug(s.name),
    name: s.name,
    order: i + 1,
    gate: true,
    checklist: (s.checklist || []).map((c) => ({
      label: c.label,
      required: c.required !== false,
      responsible: c.responsible || '',
      evidence_required: c.evidence_required || '',
      output: c.output || '',
    })),
    required_docs: [],
  }));

  const [res] = await sequelize.query(
    'UPDATE workflow_templates SET stages = :stages, name = :name, updated_at = NOW() WHERE vertical_key = :v',
    { replacements: { stages: JSON.stringify(stages), name: 'Residential Rental & Tenancy Management', v: 'leasing' } }
  );
  console.log(`✓ Updated leasing workflow_template to ${stages.length} stages.`);
  console.log('  Stages:', stages.map((s) => s.name).join(' → '));
}

module.exports = { STAGES, slug, run };

// Only execute the DB update when run directly (node scripts/seed_leasing_workflow.js),
// NOT when imported (e.g. by the seeder which reuses STAGES as a single source of truth).
if (require.main === module) {
  run().then(() => process.exit(0)).catch((e) => { console.error('ERR', e.message); process.exit(1); });
}
