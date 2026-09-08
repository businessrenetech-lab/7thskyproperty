/**
 * wtWorkOrderDoc.service.js
 * ------------------------------------------------------------------
 * Water Tank Cleaning & Maintenance — Project Work Order (SSPC-WTCM-PWO-01 v0.2),
 * issued under the Service Delivery Provider Master Agreement and signed by both
 * Seventh Sky and the assigned Service Provider.
 *
 * Renders the ten sections of the source document in the same house deed design
 * every other Seventh Sky agreement uses (Georgia shell, double-ruled letterhead,
 * linked table of contents, e-signing footer) — see wtCustomerAgreement.service.js
 * and wtProviderAgreement.service.js.
 *
 * Section 8 pricing is seeded from the source quotation but stays editable: the
 * agreed price may legitimately differ from the standard price (Pricing Note 2).
 */
const ServiceItem = require('../models/ServiceItem');

const esc = (v) => String(v == null ? '' : v).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const num = (v) => (v == null || v === '' || Number.isNaN(Number(v)) ? 0 : Number(v));
const money = (v) => (v == null || v === '' ? '' : Number(v).toLocaleString('en-BD', { minimumFractionDigits: 0, maximumFractionDigits: 2 }));
const or = (v, fallback = '__________') => (v == null || v === '' ? fallback : esc(v));
const asArray = (v) => { if (Array.isArray(v)) return v; if (!v) return []; try { const p = JSON.parse(v); return Array.isArray(p) ? p : []; } catch { return []; } };
const asObject = (v) => { if (!v) return {}; if (typeof v === 'object' && !Array.isArray(v)) return v; try { const p = JSON.parse(v); return p && typeof p === 'object' ? p : {}; } catch { return {}; } };

/* ── the document's own vocabulary (Sections 2, 3, 8E, 9, 10) ───────── */

const PROPERTY_TYPES = ['House', 'Apartment', 'Residential Complex', 'Office', 'Retail Shop', 'Shopping Centre',
  'Hotel', 'Restaurant', 'School', 'Hospital', 'Factory', 'Warehouse', 'Commercial Building', 'Other'];

const SERVICE_GROUPS = {
  'Water Tank Cleaning': ['Residential', 'Commercial', 'Industrial', 'Rooftop Tank', 'Underground Tank'],
  'Water Tank Disinfection': ['Tank Sanitisation', 'Bacteria Treatment', 'Algae Treatment', 'Water Quality Improvement'],
  'Water Tank Inspection': ['Internal Inspection', 'External Inspection', 'Leakage Inspection', 'Structural Assessment', 'Water Quality Assessment'],
  'Water Tank Repairs & Maintenance': ['Crack Repair', 'Leakage Repair', 'Valve Replacement', 'Pipe Connection Repair', 'Waterproofing', 'Structural Reinforcement', 'Preventive Maintenance', 'Scheduled Maintenance'],
  'Water Supply System Services': ['Water Pump Inspection', 'Pump Maintenance', 'Pump Replacement', 'Water Line Inspection', 'Leak Detection', 'Pressure Testing'],
  'Water Quality Services': ['Drinking Water Testing', 'Water Quality Assessment', 'Contamination Assessment', 'Filtration System Support', 'Water Treatment Coordination', 'Water Softener Coordination'],
  'Annual Maintenance Contract (AMC)': ['Residential Basic', 'Residential Standard', 'Residential Premium', 'Commercial', 'Industrial'],
  'Emergency Services': ['Emergency Cleaning', 'Emergency Repairs', 'Emergency Leak Response'],
};

const TANK_FIELDS = [
  ['tank_type', 'Tank Type'], ['tank_material', 'Tank Material'], ['tanks_count', 'Number of Tanks'],
  ['capacity', 'Capacity'], ['location', 'Location'], ['approximate_age', 'Approximate Age'],
  ['current_condition', 'Current Condition'],
];

const TIMELINE_FIELDS = [
  ['site_inspection', 'Site Inspection'], ['commencement', 'Work Commencement'],
  ['estimated_completion', 'Estimated Completion'], ['client_handover', 'Client Handover'],
];
const AMC_FIELDS = [['amc_start', 'AMC Start Date'], ['amc_expiry', 'AMC Expiry Date']];
/* Customer Service Agreement Clause 9 — the AMC billing cycle this Work Order sets. */
const AMC_PAYMENT_FREQUENCIES = ['Monthly', 'Quarterly', 'Half-Yearly', 'Annually'];

const COST_ROWS = [
  ['service_charges', 'Service Charges'], ['labour_charges', 'Labour Charges'],
  ['materials', 'Materials & Consumables'], ['transportation', 'Transportation'],
  ['equipment_hire', 'Equipment Hire'], ['lab_fees', 'Water Testing / Laboratory Fees'],
  ['government_fees', 'Government Fees / Permits'], ['discount', 'Discount'], ['vat', 'VAT (if applicable)'],
];

const PAYMENT_METHODS = ['Bank Transfer', 'Mobile Banking', 'Cash', 'Cheque', 'Other'];

const WARRANTY_ROWS = [
  ['cleaning', 'Cleaning Services'], ['workmanship', 'Workmanship'], ['repair', 'Repair Services'],
  ['waterproofing', 'Waterproofing'], ['materials', 'Materials / Parts'], ['manufacturer', 'Manufacturer / Supplier'],
];

const CHECKLIST_GROUPS = {
  'Before Work': ['Site Inspection Completed', 'Quotation Approved', 'Work Order Approved', 'Materials Available', 'Chemicals Available', 'Service Provider Assigned'],
  'During Work': ['Safety Procedures Followed', 'Client Updated', 'Before Photos Taken', 'Water Testing Completed (if applicable)'],
  Completion: ['Cleaning Completed', 'Repairs Completed', 'Final Inspection Completed', 'Water Testing Report Issued (if applicable)',
    'Site Cleaned', 'After Photos Taken', 'Client Demonstration / Handover Completed', 'Warranty Issued', 'Client Acceptance Received'],
};

/* ── per-service content packs ──────────────────────────────────────────
 * The Project Work Order is the same instrument for every service line — same
 * ten sections, same pricing/checkbox machinery, same execution block. Only the
 * document's vocabulary differs: header wording, the Section 3 service taxonomy,
 * Section 4 (Tank vs Equipment details), the warranty rows and the completion
 * checklist. Each service line supplies those as a pack; the builder is shared.
 */
const AC_PROPERTY_TYPES = ['House', 'Apartment', 'Office', 'Retail Shop', 'Restaurant', 'Café', 'School',
  'Hospital', 'Warehouse', 'Factory', 'Commercial Building', 'Other'];

const AC_SERVICE_GROUPS = {
  'Consultation': ['Residential', 'Commercial'],
  'Installation': ['Split System', 'Inverter', 'Cassette', 'Ducted', 'Commercial Installation'],
  'Relocation': ['Residential', 'Commercial'],
  'Maintenance': ['Preventive', 'Corrective', 'Fault Diagnosis'],
  'Repairs': ['Compressor', 'Fan Motor', 'PCB', 'Sensor', 'Other'],
  'Cleaning': ['Standard', 'Deep Chemical'],
  'Refrigerant': ['Leak Detection', 'Gas Refill', 'Pressure Test'],
  'AMC': ['Residential', 'Commercial'],
  'Smart Climate': ['Wi-Fi Setup', 'Smart Thermostat', 'Energy Assessment'],
  'Emergency': ['Priority Call', 'After Hours', 'Breakdown'],
};

const AC_EQUIPMENT_FIELDS = [
  ['equipment_brand', 'Brand'], ['equipment_model', 'Model'], ['units_count', 'Quantity'],
  ['equipment_capacity', 'Capacity'], ['serial_number', 'Serial Number'],
  ['refrigerant_type', 'Refrigerant Type'], ['system_age', 'System Age'],
];

const AC_WARRANTY_ROWS = [
  ['installation', 'Installation'], ['labour', 'Labour'], ['repair', 'Repairs'],
  ['manufacturer', 'Manufacturer'], ['parts', 'Parts'],
];

const AC_CHECKLIST_GROUPS = {
  'Before Work': ['Site Inspection Completed', 'Quotation Approved', 'Work Order Approved', 'Materials Available', 'Technician Assigned'],
  'During Work': ['Safety Procedures Followed', 'Client Updated', 'Progress Photos Taken'],
  Completion: ['Testing Completed', 'Site Cleaned', 'Client Demonstration Completed', 'Completion Photos Taken', 'Warranty Issued', 'Client Acceptance Received'],
};

const WT_PACK = {
  doc_no: 'SSPC-WTCM-PWO-01',
  header_subtitle: 'WATER TANK CLEANING &amp; MAINTENANCE',
  division: 'Seventh Sky Water Tank Cleaning &amp; Maintenance Services',
  document_type: 'water_tank_work_order',
  property_types: PROPERTY_TYPES,
  service_groups: SERVICE_GROUPS,
  section4_label: 'Section 4 — Tank Details',
  section4_fields: TANK_FIELDS,
  warranty_rows: WARRANTY_ROWS,
  checklist_groups: CHECKLIST_GROUPS,
};
const AC_PACK = {
  doc_no: 'SSPC-ACS-PWO-01',
  header_subtitle: 'AIR CONDITIONING SOLUTIONS',
  division: 'Seventh Sky Air Conditioning Solutions',
  document_type: 'air_conditioning_work_order',
  property_types: AC_PROPERTY_TYPES,
  service_groups: AC_SERVICE_GROUPS,
  section4_label: 'Section 4 — Equipment Details',
  section4_fields: AC_EQUIPMENT_FIELDS,
  warranty_rows: AC_WARRANTY_ROWS,
  checklist_groups: AC_CHECKLIST_GROUPS,
};
// ── Land & Property Assessment (Survey & Valuation) — Project Work Order ──
const LPAS_PROPERTY_TYPES = ['Residential Property', 'Commercial Property', 'Industrial Property',
  'Agricultural Property', 'Vacant Land', 'Mixed Use Development', 'Apartment / Unit', 'Office Building',
  'Shopping Complex', 'Hotel / Resort', 'Factory / Warehouse', 'Development Site', 'Government Property',
  'Educational Institution', 'Hospital / Healthcare', 'Other'];

const LPAS_SERVICE_GROUPS = {
  'Land Survey': ['Boundary Survey', 'Cadastral Survey', 'Topographic Survey', 'Contour Survey', 'Construction / Engineering Survey', 'Subdivision Survey', 'GIS / Digital Mapping', 'Drone Survey', 'Utility Mapping'],
  'Property Valuation': ['Residential', 'Commercial', 'Industrial', 'Agricultural', 'Land', 'Rental Assessment', 'Insurance', 'Mortgage / Investment', 'Development Site'],
  'Technical Property Services': ['Property Condition Assessment', 'Due Diligence Inspection', 'Site Verification', 'Measurement Verification', 'Technical Property Report'],
  'NRB Property Support': ['Remote Property Inspection', 'Property Verification', 'Video Inspection', 'Construction Progress Inspection', 'Ownership Verification Coordination'],
};

const LPAS_PROPERTY_FIELDS = [
  ['mouza', 'Mouza'], ['jl_no', 'JL No.'], ['khatian_no', 'Khatian No.'], ['dag_no', 'Dag / Plot No.(s)'],
  ['land_area', 'Land Area'], ['building_area', 'Building Area'], ['current_land_use', 'Current Land Use'],
  ['gps_coordinates', 'GPS Coordinates'],
];

const LPAS_WARRANTY_ROWS = [
  ['survey_report', 'Survey Report'], ['valuation_report', 'Valuation Report'],
  ['technical_report', 'Technical Report'], ['rectification', 'Rectification / Reporting Error'],
];

const LPAS_CHECKLIST_GROUPS = {
  'Before Project': ['Client Service Agreement Signed', 'Quotation Approved', 'Work Order Approved', 'Client Documents Received', 'Site Access Confirmed', 'Resources Assigned'],
  'During Project': ['Site Inspection Completed', 'Survey Measurements Completed', 'Property Photographs Taken', 'Client Updated on Progress', 'Data Verified'],
  Completion: ['Survey Plan Completed', 'Reports Issued', 'Client Handover Completed', 'Final Invoice Issued', 'Warranty / Rectification Summary Issued', 'Client Acceptance Received'],
};

const LPAS_PACK = {
  doc_no: 'SSPC-SVS-PWO-01',
  header_subtitle: 'SURVEY &amp; VALUATION SERVICES',
  division: 'Seventh Sky Survey &amp; Valuation Services',
  document_type: 'land_property_assessment_work_order',
  property_types: LPAS_PROPERTY_TYPES,
  service_groups: LPAS_SERVICE_GROUPS,
  section4_label: 'Section 4 — Property & Land Details',
  section4_fields: LPAS_PROPERTY_FIELDS,
  warranty_rows: LPAS_WARRANTY_ROWS,
  checklist_groups: LPAS_CHECKLIST_GROUPS,
};
// ── Loan & Financial Support — Project Work Order (SSPC-LFSS-PWO-01) ──
const LFS_PROPERTY_TYPES = ['House', 'Apartment', 'Residential Building', 'Commercial Property',
  'Industrial Property', 'Agricultural Property', 'Vacant Land', 'Mixed Use', 'Other'];

const LFS_SERVICE_GROUPS = {
  'Loan & Mortgage Support': ['Home Loan Assistance', 'Investment Property Loan', 'Commercial Property Loan', 'Construction Loan', 'Land Purchase Loan', 'Mortgage Coordination', 'Loan Refinancing', 'Loan Documentation Assistance', 'Banking Liaison', 'Loan Settlement Coordination'],
  'Property Valuation Coordination': ['Residential Valuation', 'Commercial Valuation', 'Industrial Valuation', 'Agricultural Valuation', 'Land Valuation', 'Mortgage Valuation', 'Independent Valuation', 'Valuation Report Review'],
  'Financial Documentation Support': ['Financial Document Review', 'Income Verification', 'Asset Verification', 'Liability Assessment', 'Loan Application Documentation', 'Supporting Documentation', 'Compliance Documentation'],
  'NRB Financial Support': ['Overseas Client Coordination', 'Remote Documentation Support', 'Digital Verification', 'Financial Institution Liaison', 'Overseas Settlement Coordination', 'Cross-Border Documentation Support'],
};

// Section 4 = the finance/property snapshot (WO Section 2 "Project Summary").
const LFS_FINANCE_FIELDS = [
  ['finance_purpose', 'Purpose of Finance'], ['property_value', 'Estimated Property Value'],
  ['loan_amount', 'Estimated Loan Amount'], ['lender', 'Preferred Lender'],
  ['applicants', 'Number of Applicants'], ['target_completion', 'Target Completion Date'],
];

const LFS_WARRANTY_ROWS = [
  ['loan_submitted', 'Loan Application Submitted'], ['loan_outcome', 'Loan Outcome'],
  ['valuation', 'Valuation Coordinated'], ['documentation', 'Financial Documents Completed'],
  ['settlement', 'Settlement Coordinated'],
];

const LFS_CHECKLIST_GROUPS = {
  'Before Work': ['Client Identity Verified', 'Quotation Approved', 'Work Order Approved', 'Required Documents Received', 'Consultant Confirmed', 'Privacy Consent Obtained'],
  'During Project': ['Client Consultation Completed', 'Documentation Reviewed', 'Loan Application Prepared', 'Loan Application Submitted', 'Financial Institution Liaison', 'Valuation Coordinated', 'Progress Updates Provided'],
  Completion: ['Loan Outcome Communicated', 'Settlement Completed', 'Final Documents Issued', 'Outstanding Fees Paid', 'Client Acceptance Received', 'Project Closed'],
};

const LFS_PACK = {
  doc_no: 'SSPC-LFSS-PWO-01',
  header_subtitle: 'LOAN &amp; FINANCIAL SUPPORT SERVICES',
  division: 'Seventh Sky Loan &amp; Financial Support Services',
  document_type: 'loan_financial_support_work_order',
  property_types: LFS_PROPERTY_TYPES,
  service_groups: LFS_SERVICE_GROUPS,
  section4_label: 'Section 4 — Finance & Property Details',
  section4_fields: LFS_FINANCE_FIELDS,
  warranty_rows: LFS_WARRANTY_ROWS,
  checklist_groups: LFS_CHECKLIST_GROUPS,
};
// ── Property Documentation & Verification — Project Work Order (SSPC-PDVS-PWO-01) ──
const PDV_PROPERTY_TYPES = ['House', 'Apartment', 'Residential Building', 'Commercial Property',
  'Industrial Property', 'Agricultural Property', 'Vacant Land', 'Mixed Use', 'Development Site', 'Other'];

const PDV_SERVICE_GROUPS = {
  'Property Documentation & Verification': ['Deed Verification', 'Chain of Ownership Verification', 'Title Review', 'Property Document Verification', 'Land Record Verification', 'Government Record Verification', 'Encumbrance Review', 'Due Diligence Review', 'Property Background Verification'],
  'Mutation & Land Record Support': ['Mutation Documentation Review', 'Mutation Application Support', 'Land Record Correction', 'Government Liaison', 'Record Status Verification', 'Mutation Follow-up'],
  'Documentation & Correspondence': ['Documentation Review', 'Correspondence Drafting', 'Official Correspondence', 'File Compilation', 'Record Management'],
  'Conveyancing & Transfer': ['Transfer Documentation', 'Conveyancing Coordination', 'Sale & Purchase Review', 'Registration Coordination', 'Settlement Coordination'],
  'NRB Documentation': ['Overseas Documentation', 'Remote Verification', 'Digital Documentation', 'Ownership Verification', 'Cross-Border Coordination'],
};

// Section 4 = property + records snapshot (Work Order Section 2/Property Details).
const PDV_PROPERTY_FIELDS = [
  ['mouza', 'Mouza'], ['jl_no', 'JL No.'], ['khatian_no', 'Khatian No.'], ['dag_no', 'Dag / Plot No.(s)'],
  ['land_area', 'Land Area'], ['latest_record', 'Latest Land Record'], ['district', 'District'], ['upazila', 'Upazila'],
];

const PDV_WARRANTY_ROWS = [
  ['documentation_review', 'Documentation Review'], ['verification', 'Verification'],
  ['govt_record', 'Government Record Verification'], ['mutation', 'Mutation / Registration Support'],
  ['final_report', 'Final Report Issued'],
];

const PDV_CHECKLIST_GROUPS = {
  'Before Work': ['Client Documents Received', 'Quotation Approved', 'Work Order Approved', 'Written Authority Obtained', 'Specialist Assigned'],
  'Verification & Investigation': ['Registry Search', 'Land Office Search', 'Record Verification', 'Mutation Review', 'Risk Assessment'],
  Completion: ['Findings Compiled', 'Final Report Issued', 'Client Briefing Completed', 'Final Invoice Issued', 'Client Acceptance Received', 'Project Closed'],
};

const PDV_PACK = {
  doc_no: 'SSPC-PDVS-PWO-01',
  header_subtitle: 'PROPERTY DOCUMENTATION &amp; VERIFICATION SERVICES',
  division: 'Seventh Sky Property Documentation &amp; Verification Services',
  document_type: 'property_documentation_verification_work_order',
  property_types: PDV_PROPERTY_TYPES,
  service_groups: PDV_SERVICE_GROUPS,
  section4_label: 'Section 4 — Property & Records',
  section4_fields: PDV_PROPERTY_FIELDS,
  warranty_rows: PDV_WARRANTY_ROWS,
  checklist_groups: PDV_CHECKLIST_GROUPS,
};
// ── Property Will & Succession Support — Project Work Order (SSPC-PWSS-PWO-01) ──
const PWS_PROPERTY_TYPES = ['House', 'Apartment', 'Residential Building', 'Commercial Property',
  'Industrial Property', 'Agricultural Property', 'Vacant Land', 'Mixed Use', 'Estate / Portfolio', 'Other'];

const PWS_SERVICE_GROUPS = {
  'Will Documentation Support': ['Will Documentation Review', 'Will Preparation Coordination', 'Will Documentation Assistance', 'Witness Coordination', 'Will Registration Coordination', 'Estate Documentation Review'],
  'Ownership Transfer Support': ['Transfer Documentation', 'Beneficiary Documentation', 'Ownership Transfer Coordination', 'Estate Transfer Coordination', 'Succession Documentation Review', 'Property Record Verification'],
  'Nomination & Record Support': ['Beneficiary Record Review', 'Nomination Documentation', 'Ownership Record Review', 'Family Property Record Coordination', 'Portfolio Record Review'],
  'Legal & Professional Coordination': ['Lawyer Coordination', 'Conveyancer Coordination', 'Probate Coordination', 'Estate Administration', 'Land Registry Coordination', 'Government Authority Liaison'],
  'Succession Support': ['Succession Planning', 'Family Property Succession', 'Estate Documentation', 'Beneficiary Coordination', 'Succession Administration', 'Property Distribution', 'NRB Succession Support'],
};

// Section 4 = estate / property + beneficiary snapshot.
const PWS_ESTATE_FIELDS = [
  ['will_status', 'Will Status'], ['estate_value', 'Estimated Estate Value'], ['beneficiaries', 'Number of Beneficiaries'],
  ['mouza', 'Mouza'], ['dag_no', 'Dag / Plot No.'], ['khatian_no', 'Khatian No.'],
];

const PWS_WARRANTY_ROWS = [
  ['will_review', 'Will Documentation Review'], ['succession_review', 'Succession Review'],
  ['beneficiary_review', 'Beneficiary Review'], ['transfer', 'Ownership Transfer Coordination'],
  ['final_report', 'Final Deliverables Issued'],
];

const PWS_CHECKLIST_GROUPS = {
  'Before Work': ['Client Documents Received', 'Quotation Approved', 'Work Order Approved', 'Beneficiary Details Received', 'Specialist Assigned'],
  'Review & Coordination': ['Documentation Review', 'Succession Review', 'Beneficiary Review', 'Legal Coordination', 'Estate Coordination'],
  Completion: ['Findings Compiled', 'Final Deliverables Issued', 'Client Briefing Completed', 'Final Invoice Issued', 'Client Acceptance Received', 'Project Closed'],
};

const PWS_PACK = {
  doc_no: 'SSPC-PWSS-PWO-01',
  header_subtitle: 'PROPERTY WILL &amp; SUCCESSION SUPPORT SERVICES',
  division: 'Seventh Sky Property Will &amp; Succession Support Services',
  document_type: 'property_will_succession_work_order',
  property_types: PWS_PROPERTY_TYPES,
  service_groups: PWS_SERVICE_GROUPS,
  section4_label: 'Section 4 — Estate & Property',
  section4_fields: PWS_ESTATE_FIELDS,
  warranty_rows: PWS_WARRANTY_ROWS,
  checklist_groups: PWS_CHECKLIST_GROUPS,
};
// ── Removal & Relocation — Project Work Order (SSPC-RRS-PWO-01) ──
const RRS_PROPERTY_TYPES = ['Studio Apartment', '1 Bedroom', '2 Bedroom', '3 Bedroom', '4 Bedroom+',
  'Office', 'Retail Shop', 'Warehouse', 'House', 'Other'];

const RRS_SERVICE_GROUPS = {
  'Residential Relocation': ['Studio', '1 Bedroom', '2 Bedroom', '3 Bedroom', '4 Bedroom+'],
  'Commercial Relocation': ['Office', 'Retail Shop', 'Warehouse', 'Business'],
  'Packing': ['Packing', 'Unpacking', 'Fragile Packing', 'Furniture Wrapping', 'Carton Supply'],
  'Furniture': ['Moving', 'Dismantling', 'Reassembly', 'Heavy Item'],
  'Clearance & Support': ['Household Clearance', 'Office Clearance', 'Disposal', 'Move-In/Out Support', 'Utility Coordination'],
};

// Section 4 = the move snapshot (pickup/drop-off + resources).
const RRS_MOVE_FIELDS = [
  ['pickup_address', 'Pickup Address'], ['dropoff_address', 'Drop-off Address'], ['move_type', 'Move Type'],
  ['volume', 'Estimated Volume'], ['vehicle', 'Vehicle Required'], ['move_date', 'Scheduled Move Date'],
];

const RRS_WARRANTY_ROWS = [
  ['inventory', 'Inventory Verified'], ['loaded', 'Loaded & Signed Off'],
  ['delivered', 'Delivered & Unloaded'], ['damage', 'Damage Reported'], ['signoff', 'Customer Sign-Off'],
];

const RRS_CHECKLIST_GROUPS = {
  'Before Move': ['Agreement + Declarations Signed', 'Deposit (50%) Received', 'Work Order Approved', 'Inventory Prepared', 'Crew & Vehicle Allocated', 'Prohibited-Items Check'],
  'Loading (Sec. 15)': ['Inventory Verified', 'Vehicle Inspected', 'Fragile Items Secured', 'Heavy Items Balanced', 'Customer Sign-Off (Loading)'],
  Delivery: ['Access Verified', 'Items Unloaded', 'Inventory Checked', 'Furniture Positioned', 'Customer Sign-Off (Delivery)', 'Final Payment Received', 'Job Closed'],
};

const RRS_PACK = {
  doc_no: 'SSPC-RRS-PWO-01',
  header_subtitle: 'REMOVAL &amp; RELOCATION SERVICES',
  division: 'Seventh Sky Removal &amp; Relocation Services',
  document_type: 'removal_relocation_work_order',
  property_types: RRS_PROPERTY_TYPES,
  service_groups: RRS_SERVICE_GROUPS,
  section4_label: 'Section 4 — Move Details',
  section4_fields: RRS_MOVE_FIELDS,
  warranty_rows: RRS_WARRANTY_ROWS,
  checklist_groups: RRS_CHECKLIST_GROUPS,
};
const PCC_PROPERTY_TYPES = ['Apartment', 'House', 'Townhouse', 'Villa', 'Commercial', 'Retail', 'Office', 'Warehouse', 'Vacant Land', 'Other'];

const PCC_SERVICE_GROUPS = {
  'Property Care & Maintenance': ['Cleaning', 'Gardening', 'Repairs', 'Painting', 'Renovation', 'Emergency', 'Inspection'],
  'Property Presentation': ['Styling', 'Home Staging', 'Furnishing', 'Seasonal Prep', 'Readiness'],
  'Smart Property Solutions': ['CCTV', 'Smart Lock', 'Smart Devices', 'Access Control', 'Remote Monitoring'],
  'Security & Monitoring': ['Vacant Checks', 'Monitoring', 'Emergency Response', 'Patrol'],
  'Marketing & NRB': ['Photography', 'Videography', 'Drone', 'Listing Prep', 'Owner Reporting', 'Video Inspection'],
  'Concierge': ['Mail Collection', 'Key Holding', 'Opening & Closing', 'Appointment Coordination', 'Utility Assistance', 'Pre-Arrival Prep'],
};

// Section 4 = the service & property snapshot (frequency + access).
const PCC_SERVICE_FIELDS = [
  ['service_category', 'Service Category'], ['frequency', 'Service Frequency'], ['occupancy', 'Occupancy Status'],
  ['access_method', 'Access Method'], ['start_date', 'Scheduled Start'], ['property_type', 'Property Type'],
];

const PCC_WARRANTY_ROWS = [
  ['prep', 'Preparation Verified'], ['attended', 'Property Attended'],
  ['performed', 'Services Performed'], ['inspected', 'Final Inspection Passed'], ['signoff', 'Client Sign-Off'],
];

const PCC_CHECKLIST_GROUPS = {
  'Preparation (SOP Sec. 7)': ['Agreement + Declarations Signed', 'Required Payment Confirmed', 'Work Order Approved', 'Access / Keys Confirmed', 'Staff & Vehicle Allocated', 'Materials Available'],
  'Execution (SOP Sec. 5)': ['Arrival & Access Recorded', 'Pre-Service Photos Taken', 'Work Area Protected', 'Services Performed to Scope', 'Waste Removed & Cleaned', 'Client Update Provided'],
  'Completion (SOP Sec. 6-7)': ['Final Inspection Passed', 'Before & After Photos Uploaded', 'Property Secured & Access Returned', 'Client Walkthrough Completed', 'Client Acceptance Recorded', 'Final Invoice Confirmed'],
};

const PCC_PACK = {
  doc_no: 'SSPC-PCCS-PWO-01',
  header_subtitle: 'PROPERTY CARE &amp; CONCIERGE SERVICES',
  division: 'Seventh Sky Property Care &amp; Concierge Services',
  document_type: 'property_care_concierge_work_order',
  property_types: PCC_PROPERTY_TYPES,
  service_groups: PCC_SERVICE_GROUPS,
  section4_label: 'Section 4 — Service & Property Details',
  section4_fields: PCC_SERVICE_FIELDS,
  warranty_rows: PCC_WARRANTY_ROWS,
  checklist_groups: PCC_CHECKLIST_GROUPS,
};
const WO_PACKS = { water_tank: WT_PACK, air_conditioning: AC_PACK, land_property_assessment: LPAS_PACK, loan_financial_support: LFS_PACK, property_documentation_verification: PDV_PACK, property_will_succession: PWS_PACK, removal_relocation: RRS_PACK, property_care_concierge: PCC_PACK };
// Resolve a pack by service_line key (or catalogue vertical / related_type prefix
// for callers that pass those). Falls back to Water Tank.
const packForWo = (v) => {
  const s = String(v || '');
  const hit = Object.keys(WO_PACKS).find((k) => s === k || s.startsWith(k));
  return WO_PACKS[hit] || WT_PACK;
};

const PRICING_NOTES = [
  "The above prices are based on Seventh Sky's Standard Price Schedule.",
  'The Agreed Price may differ from the Standard Price following negotiation, promotions or project-specific requirements.',
  'Materials, chemicals, laboratory testing and labour will only be charged where applicable to the approved scope of work.',
  'Additional work requested after approval of this Work Order will be treated as a variation and may incur additional charges.',
  'All prices are in Bangladeshi Taka (BDT) and are exclusive of VAT and government charges where applicable.',
];

const DEFAULT_PAYMENT_SCHEDULE = [
  { stage: 'Deposit', percentage: 30 },
  { stage: 'Progress Payment', percentage: 40 },
  { stage: 'Final Payment', percentage: 30 },
];

/* ── shared presentation helpers ────────────────────────────────────── */

const H2 = 'font-size:15px;color:#003768;margin:22px 0 6px;page-break-after:avoid;';
const H3 = 'font-weight:700;font-size:12.8px;color:#334155;margin:12px 0 4px;';
const TD = 'padding:6px 9px;border:1px solid #d9dee6;font-size:12.2px;';
const TH = 'padding:7px 9px;border:1px solid #d9dee6;background:#eef3f8;font-size:11px;font-weight:700;text-align:left;';

const section = (id, title, body) => `<h2 id="${id}" style="${H2}">${esc(title)}</h2>${body}`;

const kvTable = (rows) => `<table style="width:100%;border-collapse:collapse;margin:8px 0;">${rows
  .map(([k, v]) => `<tr><td style="${TD}background:#f6f8fb;width:38%;font-weight:600;">${esc(k)}</td><td style="${TD}">${v == null || v === '' ? '__________' : esc(v)}</td></tr>`)
  .join('')}</table>`;

const checkboxes = (options, selectedSet, columns = 3) => `<div style="display:grid;grid-template-columns:repeat(${columns},minmax(0,1fr));gap:4px 16px;margin:6px 0 10px;">${options
  .map((o) => `<span style="font-size:12.2px;">${selectedSet.has(String(o).toLowerCase()) ? '☑' : '☐'} ${esc(o)}</span>`).join('')}</div>`;

function dataTable(headers, rows, emptyText) {
  if (!rows.length) return `<div style="color:#9aa4b2;font-size:12.2px;margin:4px 0 10px;">${esc(emptyText)}</div>`;
  return `<table style="width:100%;border-collapse:collapse;margin:6px 0 12px;">
    <thead><tr>${headers.map((h) => `<th style="${TH}${h.right ? 'text-align:right;' : ''}${h.width ? `width:${h.width};` : ''}">${esc(h.label)}</th>`).join('')}</tr></thead>
    <tbody>${rows.map((cells) => `<tr>${cells.map((c, i) => `<td style="${TD}${headers[i]?.right ? 'text-align:right;' : ''}${c.bold ? 'font-weight:700;' : ''}${c.muted ? 'color:#6b7280;' : ''}">${c.html != null ? c.html : esc(c.value == null ? '' : c.value)}</td>`).join('')}</tr>`).join('')}</tbody>
  </table>`;
}

/* ── pricing ────────────────────────────────────────────────────────── */

/**
 * Section 8 totals. Every figure is derived from the line tables so the summary can
 * never silently disagree with the schedule above it; only the adjustment rows
 * (transport, hire, lab, government fees, discount, VAT) are operator-entered.
 */
function computeTotals(wo) {
  const services = asArray(wo.lines);
  const materials = asArray(wo.material_lines);
  const labour = asArray(wo.labour_lines);
  const entered = asObject(wo.cost_summary);

  const serviceTotal = services.reduce((s, l) => s + (l.line_total != null ? num(l.line_total) : num(l.qty || 1) * num(l.agreed_price != null && l.agreed_price !== '' ? l.agreed_price : l.price ?? l.standard_price)), 0);
  const materialTotal = materials.reduce((s, l) => s + (l.line_total != null ? num(l.line_total) : num(l.qty) * num(l.unit_price)), 0);
  const labourTotal = labour.reduce((s, l) => s + (l.line_total != null ? num(l.line_total) : num(l.hours) * num(l.rate)), 0);

  const summary = {
    service_charges: serviceTotal,
    labour_charges: labourTotal,
    materials: materialTotal,
    transportation: num(entered.transportation),
    equipment_hire: num(entered.equipment_hire),
    lab_fees: num(entered.lab_fees),
    government_fees: num(entered.government_fees),
    discount: num(entered.discount),
    vat: num(entered.vat),
  };
  summary.total = summary.service_charges + summary.labour_charges + summary.materials
    + summary.transportation + summary.equipment_hire + summary.lab_fees + summary.government_fees
    - summary.discount + summary.vat;
  return summary;
}

/** Payment schedule amounts follow the total, so percentages always reconcile. */
function computePaymentSchedule(wo, total) {
  const rows = asArray(wo.payment_schedule);
  const base = rows.length ? rows : DEFAULT_PAYMENT_SCHEDULE;
  return base.map((r) => ({
    stage: r.stage,
    percentage: num(r.percentage),
    amount: r.amount != null && r.amount !== '' ? num(r.amount) : Math.round(total * (num(r.percentage) / 100) * 100) / 100,
    due_date: r.due_date || '',
  }));
}

function scheduleA(wo) {
  const rows = asArray(wo.lines).map((l) => {
    const qty = l.qty == null || l.qty === '' ? 1 : num(l.qty);
    const standard = l.standard_price != null ? l.standard_price : l.price;
    const agreed = l.agreed_price != null && l.agreed_price !== '' ? l.agreed_price : standard;
    const total = l.line_total != null ? num(l.line_total) : qty * num(agreed);
    return [
      { value: l.code || '' }, { value: l.name || l.description || '' }, { value: qty },
      { value: l.unit || '' }, { value: money(standard), muted: true }, { value: money(agreed) },
      { value: money(total), bold: true },
    ];
  });
  return dataTable([
    { label: 'Code', width: '10%' }, { label: 'Service Description' }, { label: 'Qty', width: '6%' },
    { label: 'Unit', width: '9%' }, { label: 'Standard Price (BDT)', right: true, width: '15%' },
    { label: 'Agreed Price (BDT)', right: true, width: '14%' }, { label: 'Total (BDT)', right: true, width: '13%' },
  ], rows, 'No services selected on this work order yet.');
}

function scheduleMaterials(wo) {
  const rows = asArray(wo.material_lines).map((l) => [
    { value: l.code || '' }, { value: l.name || l.item || '' }, { value: l.qty ?? '' },
    { value: money(l.unit_price) }, { value: money(l.line_total != null ? l.line_total : num(l.qty) * num(l.unit_price)), bold: true },
  ]);
  return dataTable([
    { label: 'Code', width: '12%' }, { label: 'Item' }, { label: 'Qty', width: '10%' },
    { label: 'Unit Price (BDT)', right: true, width: '18%' }, { label: 'Total (BDT)', right: true, width: '16%' },
  ], rows, 'No materials or consumables charged on this work order.');
}

function scheduleLabour(wo) {
  const rows = asArray(wo.labour_lines).map((l) => [
    { value: l.code || '' }, { value: l.name || l.description || '' }, { value: l.hours ?? '' },
    { value: money(l.rate) }, { value: money(l.line_total != null ? l.line_total : num(l.hours) * num(l.rate)), bold: true },
  ]);
  return dataTable([
    { label: 'Code', width: '12%' }, { label: 'Description' }, { label: 'Hours', width: '10%' },
    { label: 'Rate (BDT)', right: true, width: '18%' }, { label: 'Total (BDT)', right: true, width: '16%' },
  ], rows, 'No labour charged separately on this work order.');
}

function costSummaryTable(summary) {
  const rows = COST_ROWS.map(([key, label]) => `<tr>
    <td style="${TD}background:#f6f8fb;width:62%;font-weight:600;">${esc(label)}</td>
    <td style="${TD}text-align:right;">${summary[key] ? `${key === 'discount' ? '− ' : ''}${money(summary[key])}` : '—'}</td>
  </tr>`).join('');
  return `<table style="width:100%;border-collapse:collapse;margin:6px 0 12px;">${rows}
    <tr><td style="${TD}background:#eef3f8;font-weight:700;font-size:13px;">TOTAL PROJECT VALUE</td>
    <td style="${TD}background:#eef3f8;text-align:right;font-weight:700;font-size:13px;">BDT ${money(summary.total)}</td></tr>
  </table>`;
}

function paymentScheduleTable(rows, methodSet) {
  const table = dataTable([
    { label: 'Stage' }, { label: 'Percentage', width: '16%' },
    { label: 'Amount (BDT)', right: true, width: '22%' }, { label: 'Due Date', width: '22%' },
  ], rows.map((r) => [
    { value: r.stage }, { value: `${r.percentage}%` }, { value: money(r.amount), bold: true }, { value: r.due_date || '' },
  ]), 'No payment schedule recorded.');
  return `${table}<div style="${H3}">Payment Method</div>${checkboxes(PAYMENT_METHODS, methodSet, 5)}`;
}

/* ── the document ───────────────────────────────────────────────────── */

const SECTIONS = [
  ['s1', 'Section 1 — Project Information'], ['s2', 'Section 2 — Client Details'],
  ['s3', 'Section 3 — Services Requested'], ['s4', 'Section 4 — Tank Details'],
  ['s5', 'Section 5 — Scope of Work'], ['s6', 'Section 6 — Materials & Equipment'],
  ['s7', 'Section 7 — Project Timeline'], ['s8', 'Section 8 — Pricing Summary'],
  ['s9', 'Section 9 — Warranty'], ['s10', 'Section 10 — Project Checklist'],
  ['s11', 'Execution'],
];

/**
 * Build the Project Work Order document.
 * @param {object} wo    the work order row (plain object or model instance)
 * @param {object} extra { provider, client, org } — parties for the execution block
 */
function buildWorkOrderDocument(wo = {}, extra = {}) {
  const provider = extra.provider || {};
  const org = extra.org || {};
  // Service line comes from the caller (X-Service-Line) or the WO's own tag.
  const pack = packForWo(extra.vertical || extra.service_line || wo.service_line);
  const doc_no = pack.doc_no;
  const title = 'Project Work Order';

  const selections = asObject(wo.service_selections);
  const tank = asObject(wo.tank_details);
  const timeline = asObject(wo.timeline_dates);
  const warranty = asObject(wo.warranty_terms);
  const checklist = asObject(wo.project_checklist);
  const propertySet = new Set([String(wo.property_type || '').toLowerCase()]);
  const methodSet = new Set([String(wo.payment_method || '').toLowerCase()]);

  const summary = computeTotals(wo);
  const schedule = computePaymentSchedule(wo, summary.total);

  const s1 = section('s1', 'Section 1 — Project Information', kvTable([
    ['Work Order No.', wo.code], ['Quotation No.', wo.quotation_no], ['Project No.', wo.project_id],
    ['Agreement Reference', wo.agreement_reference], ['Date Issued', wo.date_issued],
    ['Project Manager', wo.project_manager], ['Assigned Service Provider', wo.provider_name || provider.business_name],
  ]));

  const s2 = section('s2', 'Section 2 — Client Details', `${kvTable([
    ['Client Name', wo.client_name], ['Company (if applicable)', wo.client_company],
    ['Contact Person', wo.client_contact_person], ['Phone', wo.client_phone], ['Email', wo.client_email],
    ['Service Address', wo.site_address],
  ])}<div style="${H3}">Property Type</div>${checkboxes(pack.property_types, propertySet, 4)}`);

  const s3 = section('s3', 'Section 3 — Services Requested', Object.entries(pack.service_groups).map(([group, options]) => {
    const chosen = new Set(asArray(selections[group]).map((v) => String(v).toLowerCase()));
    return `<div style="${H3}">${esc(group)}</div>${checkboxes(options, chosen)}`;
  }).join(''));

  const s4 = section('s4', pack.section4_label, kvTable(pack.section4_fields.map(([key, label]) => [label, tank[key]])));

  const s5 = section('s5', 'Section 5 — Scope of Work', `<div style="${H3}">Description</div>
    <div style="font-size:12.5px;white-space:pre-wrap;margin-bottom:10px;">${wo.scope ? esc(wo.scope) : '__________'}</div>
    <div style="${H3}">Expected Deliverables</div>
    <div style="font-size:12.5px;white-space:pre-wrap;">${wo.deliverables ? esc(wo.deliverables) : '__________'}</div>`);

  const itemQty = (list, emptyText) => dataTable(
    [{ label: 'Item' }, { label: 'Qty', width: '22%' }],
    asArray(list).map((r) => [{ value: r.item || r.name || '' }, { value: r.qty ?? '' }]), emptyText,
  );
  const s6 = section('s6', 'Section 6 — Materials & Equipment', `
    <div style="${H3}">Materials Required</div>${itemQty(wo.materials_required, 'No materials recorded.')}
    <div style="${H3}">Chemicals Required</div>${itemQty(wo.chemicals_required, 'No chemicals recorded.')}
    <div style="${H3}">Equipment Required</div>${itemQty(wo.equipment_required, 'No equipment recorded.')}`);

  /*
   * Customer Service Agreement Clause 9 makes the AMC payment frequency
   * "as specified in the Work Order" — so the Work Order has to actually specify
   * it. The four options are ticked here against wo.amc_payment_frequency.
   */
  const amcFreqSet = new Set([String(wo.amc_payment_frequency || '').toLowerCase()]);
  const s7 = section('s7', 'Section 7 — Project Timeline', `${kvTable(TIMELINE_FIELDS.map(([key, label]) => [label, timeline[key]]))}
    <div style="${H3}">For Annual Maintenance Contracts (AMC)</div>${kvTable(AMC_FIELDS.map(([key, label]) => [label, timeline[key]]))}
    <div style="font-size:12.5px;margin:8px 0 4px;">
      Annual Maintenance Contracts (AMC): payment may be made monthly, quarterly,
      half-yearly or annually as specified in this Work Order.
    </div>
    ${checkboxes(AMC_PAYMENT_FREQUENCIES, amcFreqSet, 4)}`);

  const s8 = section('s8', 'Section 8 — Pricing Summary', `
    <div style="${H3}">A. Selected Services</div>${scheduleA(wo)}
    <div style="${H3}">B. Materials & Consumables</div>${scheduleMaterials(wo)}
    <div style="${H3}">C. Labour Charges</div>${scheduleLabour(wo)}
    <div style="${H3}">D. Project Cost Summary</div>${costSummaryTable(summary)}
    <div style="${H3}">E. Payment Schedule</div>${paymentScheduleTable(schedule, methodSet)}
    <div style="${H3}">Pricing Notes</div>
    <ol style="font-size:12px;color:#4b5563;margin:4px 0 0;padding-left:20px;line-height:1.65;">
      ${PRICING_NOTES.map((n) => `<li style="margin:2px 0;">${esc(n)}</li>`).join('')}
    </ol>
    ${wo.pricing_notes ? `<div style="font-size:12.2px;margin-top:8px;white-space:pre-wrap;"><b>Project-specific notes:</b> ${esc(wo.pricing_notes)}</div>` : ''}`);

  const s9 = section('s9', 'Section 9 — Warranty', dataTable(
    [{ label: 'Warranty' }, { label: 'Period', width: '40%' }],
    pack.warranty_rows.map(([key, label]) => [{ value: label }, { value: warranty[key] || '' }]),
    'No warranty periods recorded.',
  ));

  const s10 = section('s10', 'Section 10 — Project Checklist', Object.entries(pack.checklist_groups).map(([group, options]) => {
    const chosen = new Set(asArray(checklist[group]).map((v) => String(v).toLowerCase()));
    return `<div style="${H3}">${esc(group)}</div>${checkboxes(options, chosen, 2)}`;
  }).join(''));

  /*
   * Anchored signature slots, matching the agreements.
   *
   * The work order previously ended in dead "Signature: ______" lines, so even a
   * fully executed order showed blank signatures — the captured marks had
   * nowhere to land. data-sign-party matches the SignatureField labels created
   * with the envelope, which is how wtSignedDocument.service.js injects them.
   */
  const signSlot = (label) => `
    <div data-sign-anchor="${esc(label)}" style="margin-top:8px;">
      <div style="font-size:11px;color:#6b7280;">Signature</div>
      <div data-sign-field="signature" data-sign-party="${esc(label)}"
           style="height:46px;border-bottom:1px solid #333;margin:2px 0 6px;"></div>
      <div style="font-size:11px;color:#6b7280;">Date signed</div>
      <div data-sign-field="date_signed" data-sign-party="${esc(label)}"
           style="height:20px;border-bottom:1px solid #333;"></div>
    </div>`;

  const s11 = section('s11', 'Execution', `
    <p style="font-size:12.5px;margin:6px 0 12px;">This Project Work Order is issued under, and governed by, the Master Service Delivery Provider Agreement between the Parties. By signing below the Service Provider accepts the scope, timeline, agreed pricing and warranty terms set out above, and is thereby onboarded to this project.</p>
    <table style="width:100%;margin-top:10px;"><tr>
      <td style="width:50%;vertical-align:top;padding:0 16px 0 0;"><div style="border-top:1px solid #333;padding-top:6px;font-size:12px;">
        <b>For Seventh Sky Property Care</b><br/>Name: ${or(org.represented_by)}<br/>Position: ${or(org.position, 'Project Manager')}${signSlot('Seventh Sky')}</div></td>
      <td style="width:50%;vertical-align:top;padding:0 0 0 16px;"><div style="border-top:1px solid #333;padding-top:6px;font-size:12px;">
        <b>For the Service Provider</b><br/>Business: ${or(provider.business_name || wo.provider_name)}<br/>Name: ${or(provider.contact_person)}${signSlot('Service Provider')}</div></td>
    </tr></table>`);

  const toc = `
  <div style="border:1px solid #d9dee6;border-radius:10px;padding:14px 18px;margin:14px 0;background:#f8fafc;">
    <div style="font-weight:700;font-size:13px;color:#003768;margin-bottom:8px;">Table of Contents</div>
    <div style="columns:2;column-gap:32px;font-size:12.5px;line-height:1.9;">
      ${SECTIONS.map(([id, label]) => `<div style="break-inside:avoid;"><a href="#${id}" style="color:#1e3a8a;text-decoration:none;">${esc(id === 's4' ? pack.section4_label : label)}</a></div>`).join('')}
    </div>
  </div>`;

  const html = `
  <div style="font-family: Georgia,'Times New Roman',serif;color:#1f2430;line-height:1.6;font-size:14px;max-width:820px;margin:0 auto;">
    <div style="text-align:center;border-bottom:3px double #003768;padding-bottom:12px;">
      <div style="font-size:20px;font-weight:bold;color:#003768;">Seventh Sky Property Care</div>
      <div style="font-size:13px;color:#12b6f3;font-weight:bold;letter-spacing:.04em;margin-top:2px;">${pack.header_subtitle}</div>
      <div style="font-size:16px;font-weight:bold;margin-top:10px;text-transform:uppercase;">${esc(title)}</div>
      <div style="font-size:11.5px;color:#4b5563;margin-top:2px;">(Under Service Delivery Provider Master Agreement)</div>
      <div style="font-size:11px;color:#6b7280;margin-top:4px;">Document No: ${doc_no} · Version: 0.2 · Effective Date: ${or(wo.date_issued)}</div>
      <div style="font-size:11px;color:#6b7280;">Division: ${pack.division}</div>
    </div>
    ${toc}
    ${s1}${s2}${s3}${s4}${s5}${s6}${s7}${s8}${s9}${s10}${s11}
    <div style="margin-top:22px;padding-top:10px;border-top:1px solid #d1d5db;font-size:11px;color:#6b7280;">This Work Order becomes effective when signed by both Parties through the Seventh Sky electronic signing system. The electronic record, audit trail and content hash constitute proof of execution.</div>
  </div>`;

  return {
    title: `${title} — ${wo.code || ''}`.trim(),
    doc_no,
    html,
    summary,
    payment_schedule: schedule,
    terms: {
      document_type: pack.document_type, doc_no,
      work_order_id: wo.id || null, work_order_code: wo.code || null,
      quotation_no: wo.quotation_no || null, project_id: wo.project_id || null,
      provider_id: wo.provider_id || provider.id || null, provider_name: wo.provider_name || provider.business_name || null,
      total_project_value: summary.total, cost_summary: summary, payment_schedule: schedule,
      agreed_lines: asArray(wo.lines), material_lines: asArray(wo.material_lines), labour_lines: asArray(wo.labour_lines),
    },
  };
}

/* ── seeding a work order from its source quotation ─────────────────── */

/**
 * Copy the priced selections from the quotation the work order came from.
 * Only fills blanks — an operator who has already edited the work order keeps
 * their figures, since the agreed price may differ from the quoted price.
 */
function hydrateFromQuotation(wo, quotation, client) {
  if (!quotation) return {};
  const patch = {};
  const setIfEmpty = (key, value) => {
    if (value == null || value === '') return;
    const current = wo[key];
    const empty = current == null || current === '' || (Array.isArray(current) && !current.length)
      || (typeof current === 'string' && current.trim() === '');
    if (empty) patch[key] = value;
  };

  setIfEmpty('quotation_no', quotation.code);
  setIfEmpty('client_name', quotation.client_name);
  setIfEmpty('site_address', quotation.site_address || client?.service_address || client?.address);
  setIfEmpty('client_phone', quotation.client_phone || client?.mobile);
  setIfEmpty('client_email', quotation.client_email || client?.email);
  setIfEmpty('client_contact_person', quotation.contact_person || client?.contact_person);
  setIfEmpty('property_type', quotation.property_type || client?.property_type);

  if (!asArray(wo.lines).length) {
    const lines = asArray(quotation.lines).filter((l) => (l.kind || 'service') === 'service').map((l) => ({
      kind: 'service', code: l.code || '', name: l.name || l.description || '',
      qty: l.qty == null ? 1 : num(l.qty), unit: l.unit || '',
      standard_price: l.standard_price != null ? num(l.standard_price) : num(l.price),
      agreed_price: num(l.price != null ? l.price : l.standard_price),
      line_total: l.line_total != null ? num(l.line_total) : num(l.qty == null ? 1 : l.qty) * num(l.price != null ? l.price : l.standard_price),
    }));
    if (lines.length) patch.lines = lines;
  }
  if (!asArray(wo.material_lines).length) {
    const materials = asArray(quotation.lines).filter((l) => l.kind === 'material').map((l) => ({
      code: l.code || '', name: l.name || '', qty: num(l.qty), unit_price: num(l.price),
      line_total: num(l.qty) * num(l.price),
    }));
    if (materials.length) patch.material_lines = materials;
  }
  if (!asArray(wo.labour_lines).length) {
    const labour = asArray(quotation.lines).filter((l) => l.kind === 'labour').map((l) => ({
      code: l.code || '', name: l.name || '', hours: num(l.qty), rate: num(l.price),
      line_total: num(l.qty) * num(l.price),
    }));
    if (labour.length) patch.labour_lines = labour;
  }
  if (!Object.keys(asObject(wo.cost_summary)).length) {
    patch.cost_summary = {
      transportation: num(quotation.provider_allocation_fee ?? quotation.transport_fee),
      equipment_hire: num(quotation.equipment_hire), lab_fees: num(quotation.lab_fees),
      government_fees: num(quotation.government_fees), discount: num(quotation.discount), vat: num(quotation.vat),
    };
  }
  return patch;
}

/** Catalogue used by the work-order builder to add priced lines by hand. */
async function getCatalog(branchId, { vertical = 'water_tank_csa' } = {}) {
  const rows = await ServiceItem.findAll({
    where: { vertical, is_active: true, branch_id: branchId },
    order: [['sort_order', 'ASC']], raw: true,
  });
  return rows.map((r) => ({
    code: r.code, name: r.name, unit: r.unit || '', standard_price: num(r.base_price),
    group: asObject(r.tags).group || r.service_group || 'service',
  }));
}

/** The document's own vocabulary for a service line, for the builder's reference endpoint. */
function documentVocab(serviceLine = 'water_tank') {
  const pack = packForWo(serviceLine);
  return {
    property_types: pack.property_types,
    service_groups: pack.service_groups,
    tank_fields: pack.section4_fields,
    section4_label: pack.section4_label,
    warranty_rows: pack.warranty_rows,
    checklist_groups: pack.checklist_groups,
  };
}

module.exports = {
  buildWorkOrderDocument, hydrateFromQuotation, computeTotals, computePaymentSchedule, getCatalog,
  documentVocab, packForWo,
  PROPERTY_TYPES, SERVICE_GROUPS, TANK_FIELDS, TIMELINE_FIELDS, AMC_FIELDS,
  COST_ROWS, PAYMENT_METHODS, WARRANTY_ROWS, CHECKLIST_GROUPS, DEFAULT_PAYMENT_SCHEDULE,
};
