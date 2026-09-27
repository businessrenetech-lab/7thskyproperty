/**
 * The two rural SALE pipelines, from the SOPs.
 *
 * `rural_sale` shipped with 18 "stages" that were three different lists
 * concatenated: the 9 seller workflow steps (CRM workbook Sheet 1), the 5 rows of
 * the Ownership Checklist (Sheet 4 — Title Deed, Khatiyan, Dag, Mutation, Tax
 * Receipt) promoted from DOCUMENTS to stages, and 4 rows of the BUYER workflow
 * (Sheet 7). The same class of corruption `rural_rent` carried before the Rent
 * build corrected it.
 *
 * The SOPs describe two separate systems, so `rural_sale` becomes the seller
 * pipeline (SOP Rural Property Sale §4, 10 stages) and `rural_purchase` is added
 * for the buyer one (SOP Rural Property Purchase §4, 7 stages). The five
 * ownership documents belong to the ownership_verification register, which is
 * where stage 4 looks for them.
 *
 * Idempotent, and refuses to rewrite a template that live projects run on.
 * Run from backend/:  node scripts/seedRuralSaleWorkflow.js
 */
const sequelize = require('../config/db.config');

const item = (label, responsible, evidence_required, detailed_task = '', output = '') =>
  ({ label, required: true, responsible, evidence_required, detailed_task, output });

// ── Seller pipeline — SOP Rural Property Sale, workbook Sheet 1 ──────────────
const RURAL_SELLER_STAGES = [
  {
    key: 'seller_enquiry', name: 'Seller Enquiry', order: 1, department: 'Client Relations',
    escalation_trigger: 'Seller not contacted within 24 hours',
    checklist: [
      item('Receive the enquiry, create the lead and assign a consultant', 'Sales Consultant', 'Lead form'),
      item('Record the introduction for non-circumvention protection', 'Property Coordinator', 'CRM log'),
    ],
    required_docs: ['Lead form'],
  },
  {
    key: 'ownership_check', name: 'Ownership Check', order: 2, department: 'Client Relations',
    escalation_trigger: 'Seller authority over the property cannot be confirmed',
    checklist: [
      item('Confirm the seller holds authority to sell, and the property type', 'Property Consultant', 'NID + property information'),
    ],
    required_docs: ['Seller NID / passport', 'Property summary'],
  },
  {
    key: 'seller_registration', name: 'Seller Registration', order: 3, department: 'Administration',
    escalation_trigger: 'NID or contact details missing after 48 hours',
    checklist: [
      item('Create the CRM record, the seller ID and the project file', 'Property Coordinator', 'Seller ID'),
      item('Register the land record — district, upazila, mouza, khatiyan, dag, area, current use', 'Property Coordinator', 'Property register entry'),
    ],
    required_docs: ['Seller NID / passport', 'Contact details', 'Land record'],
  },
  {
    key: 'document_verification', name: 'Document Verification', order: 4, department: 'Legal & Compliance',
    escalation_trigger: 'Any ownership document unverified, or a dispute found',
    checklist: [
      // The five documents live on the ownership_verification register, not here.
      item('Verify deed, khatiyan, dag, mutation and tax receipts on the ownership register', 'Property Coordinator', 'Verification report'),
      item('Assess ownership, boundary, succession, encumbrance and access risks', 'Operations Manager', 'Risk / dispute record'),
    ],
    required_docs: ['Title documents', 'Verification report'],
  },
  {
    key: 'seller_agreement', name: 'Seller Agreement', order: 5, department: 'Commercial',
    escalation_trigger: 'Agreement unsigned after 7 days',
    checklist: [
      item('Execute the Rural Property Sale Service Agreement — commission, exclusive period, scope, marketing budget', 'Operations Manager', 'Signed agreement'),
      item('Agree the target sale price and the minimum acceptable value', 'Property Consultant', 'CRM record'),
    ],
    required_docs: ['Signed Rural Property Sale Service Agreement'],
  },
  {
    key: 'marketing_preparation', name: 'Marketing Preparation', order: 6, department: 'Marketing',
    escalation_trigger: 'Media not collected within the agreed window',
    checklist: [
      item('Arrange photography, videography, drone shoot, signboard and brochure', 'Marketing', 'Marketing assets'),
    ],
    required_docs: ['Access approval', 'Marketing asset log'],
  },
  {
    key: 'property_marketing', name: 'Property Marketing', order: 7, department: 'Marketing',
    escalation_trigger: 'No listing live, or no enquiry in 30 days',
    checklist: [
      item('Launch website, social media, buyer database and NRB campaigns', 'Marketing', 'Live listing'),
      item('Monitor campaign results on the marketing register', 'Marketing', 'Marketing register entry'),
    ],
    required_docs: ['Marketing content', 'Listing record'],
  },
  {
    key: 'buyer_inspections', name: 'Buyer Inspections', order: 8, department: 'Sales',
    escalation_trigger: 'No inspection arranged within 30 days of listing',
    checklist: [
      item('Qualify buyers on seriousness, financial capacity and suitability', 'Property Consultant', 'Screening record'),
      item('Arrange inspections and keep the visitor log and feedback records', 'Property Consultant', 'Inspection report'),
    ],
    required_docs: ['Inspection form', 'Visitor log'],
  },
  {
    key: 'offer_management', name: 'Offer Management', order: 9, department: 'Sales',
    escalation_trigger: 'Offer left unanswered for 48 hours',
    checklist: [
      item('Record offers and counteroffers on the offer and negotiation registers', 'Property Consultant', 'Accepted offer'),
      item('Check the offer against the agreed minimum sale value', 'Operations Manager', 'Approval note'),
    ],
    required_docs: ['Offer forms', 'Negotiation record'],
  },
  {
    key: 'transfer_registration', name: 'Transfer & Registration', order: 10, department: 'Legal & Compliance',
    escalation_trigger: 'Registration stalled, or commission unpaid at settlement',
    checklist: [
      item('Coordinate lawyer, surveyor, valuer and registration consultant', 'Property Coordinator', 'Legal coordination register'),
      item('Monitor sale agreement execution, registration and handover', 'Property Coordinator', 'Completed sale'),
      item('Verify commission entitlement and protected-buyer provisions, then invoice', 'Operations Manager', 'Paid invoice'),
      item('Seller feedback, commission reconciliation, CRM closure and file archiving', 'Property Coordinator', 'Closure register entry'),
    ],
    required_docs: ['Transfer documents', 'Registration receipt', 'Commission invoice'],
  },
];

// ── Buyer pipeline — SOP Rural Property Purchase, workbook Sheet 7 ───────────
const RURAL_BUYER_STAGES = [
  {
    key: 'buyer_enquiry', name: 'Buyer Enquiry', order: 1, department: 'Client Relations',
    escalation_trigger: 'Buyer not contacted within 24 hours',
    checklist: [
      item('Capture name, contact, budget, preferred district, property type and purpose', 'Property Consultant', 'Lead form'),
      item('Explain service scope, fees and the non-circumvention provisions', 'Property Consultant', 'Consultation note'),
    ],
    required_docs: ['Lead form'],
  },
  {
    key: 'buyer_registration', name: 'Buyer Registration', order: 2, department: 'Administration',
    escalation_trigger: 'Buyer agreement unsigned after 7 days',
    checklist: [
      item('Create the buyer profile, buyer ID and project file', 'Property Coordinator', 'Buyer ID'),
      item('Execute the Rural Property Purchase Service Agreement', 'Operations Manager', 'Signed agreement'),
      item('Record budget, financing need and search criteria on their registers', 'Property Coordinator', 'Register entries'),
    ],
    required_docs: ['Buyer NID / passport', 'Signed Rural Property Purchase Service Agreement'],
  },
  {
    key: 'property_search', name: 'Property Search', order: 3, department: 'Sales',
    escalation_trigger: 'No property presented within the agreed window',
    checklist: [
      item('Search internal, external, off-market and network listings', 'Property Consultant', 'Property search register'),
      item('Prepare the shortlist with photos, location, pricing, advantages and risks', 'Property Consultant', 'Shortlist register'),
      item('Record every property introduced, for non-circumvention protection', 'Property Coordinator', 'Protected property record'),
    ],
    required_docs: ['Search criteria', 'Shortlist pack'],
  },
  {
    key: 'site_visit', name: 'Site Visit', order: 4, department: 'Sales',
    escalation_trigger: 'Inspection cancelled twice, or access refused',
    checklist: [
      item('Arrange the visit, seller availability and transport', 'Property Coordinator', 'Inspection schedule'),
      item('Assess access roads, land condition, boundaries, utilities, structures, farming suitability and development potential', 'Property Consultant', 'Inspection report'),
    ],
    required_docs: ['Inspection form', 'Site notes'],
  },
  {
    key: 'offer_negotiation', name: 'Offer & Negotiation', order: 5, department: 'Sales',
    escalation_trigger: 'Negotiation stalled for 7 days',
    checklist: [
      item('Assist with offer price, conditions, deposit structure and settlement timeframe', 'Property Consultant', 'Submitted offer'),
      item('Coordinate counteroffers and record every round', 'Property Consultant', 'Accepted offer'),
    ],
    required_docs: ['Offer form', 'Negotiation record'],
  },
  {
    key: 'legal_review', name: 'Legal Review', order: 6, department: 'Legal & Compliance',
    escalation_trigger: 'Title, boundary, succession, encumbrance or acquisition risk found',
    checklist: [
      item('Coordinate lawyer review, survey, valuation and documentation review', 'Property Coordinator', 'Due diligence register'),
      item('Identify ownership, boundary, succession, encumbrance and government acquisition risks', 'Operations Manager', 'Risk / dispute record'),
      item('Advise the buyer in writing to seek independent legal advice', 'Property Consultant', 'Written advice'),
    ],
    required_docs: ['Property documents', 'Due diligence report'],
  },
  {
    key: 'registration_handover', name: 'Registration & Handover', order: 7, department: 'Legal & Compliance',
    escalation_trigger: 'Registration delayed, or possession not delivered',
    checklist: [
      item('Coordinate lawyer, seller, registration office and surveyor', 'Property Coordinator', 'Registration record'),
      item('Confirm registration complete, possession delivered and documentation transferred', 'Property Coordinator', 'Handover confirmation'),
      item('Buyer feedback, success fee reconciliation, invoice collection and CRM closure', 'Property Coordinator', 'Closure register entry'),
    ],
    required_docs: ['Transfer documents', 'Handover confirmation', 'Success fee invoice'],
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
  await upsert('rural_sale', 'Rural Property Sale (Seller)', RURAL_SELLER_STAGES);
  await upsert('rural_purchase', 'Rural Property Purchase (Buyer)', RURAL_BUYER_STAGES);
}

module.exports = { RURAL_SELLER_STAGES, RURAL_BUYER_STAGES };

if (require.main === module) {
  run().then(() => process.exit(0)).catch((e) => { console.error(e.message); process.exit(1); });
}
