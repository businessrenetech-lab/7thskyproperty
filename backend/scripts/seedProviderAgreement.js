/**
 * Seeds (or refreshes) the FULL Water Tank CM — Service Provider Master Agreement
 * (63 clauses + Schedules A–E) for the Agreement Builder + provider KYC intake.
 * Wording is reproduced verbatim from the client's document — DO NOT reword.
 * Clause 5 service categories and Clause 32 insurance are `checkbox_group`
 * fields (all options render on the agreement; selected ones are ticked ☑).
 * Fill blanks (dates, defect days, authorised reps, witnesses) are text fields.
 * Idempotent by name. Run from backend dir:
 *   node scripts/seedProviderAgreement.js
 */
require('dotenv').config();
const sequelize = require('../config/db.config');
const AgreementTemplate = require('../models/AgreementTemplate');

const NAME = 'Service Provider Master Agreement';

const F = (key, label, type, group, extra = {}) => ({ key, label, type, group, required: extra.required !== false, ...extra });
const CG = (key, label, group, options) => F(key, label, 'checkbox_group', group, { options, required: false });

const FIELDS = [
  // Term & Notice (staff fill — editable)
  F('commencement_date', 'Commencement Date (Clause 3)', 'date', 'Term & Notice', { required: false }),
  F('agreement_term', 'Agreement Term', 'text', 'Term & Notice', { required: false, default: 'Twelve (12) Months' }),
  F('notice_period', 'Termination / Notice Period', 'text', 'Term & Notice', { required: false, default: 'Four (4) Weeks' }),

  // Commission & Fees (staff fill — Seventh Sky's commercial terms; feeds provider payout)
  F('commission_pct', "Seventh Sky Commission (% of Service Provider charges)", 'percentage', 'Commission & Fees', { required: false }),
  F('ss_fee_notes', 'Seventh Sky Fees / Payment Terms (notes)', 'textarea', 'Commission & Fees', { required: false }),

  // Service Provider Account Details (THE PROVIDER FILLS THESE ON THEIR INTAKE)
  F('sp_account_name', 'Account Holder Name', 'text', 'Provider Account Details', { required: false, signer_fill: true }),
  F('sp_bank_name', 'Bank Name', 'text', 'Provider Account Details', { required: false, signer_fill: true }),
  F('sp_bank_branch', 'Branch', 'text', 'Provider Account Details', { required: false, signer_fill: true }),
  F('sp_account_number', 'Account Number', 'text', 'Provider Account Details', { required: false, signer_fill: true }),
  F('sp_routing_number', 'Routing Number', 'text', 'Provider Account Details', { required: false, signer_fill: true }),
  F('sp_mobile_banking', 'bKash / Nagad (mobile banking)', 'text', 'Provider Account Details', { required: false, signer_fill: true }),

  // Clause 5 — Service Categories (A–F)
  CG('svc_cleaning', 'Water Tank Cleaning', 'Service Categories', ['Rooftop Water Tank Cleaning', 'Underground Water Tank Cleaning', 'Apartment Water Tank Cleaning', 'House Water Tank Cleaning']),
  CG('svc_disinfection', 'Water Tank Disinfection', 'Service Categories', ['Water Tank Sanitisation', 'Bacteria Treatment', 'Algae Treatment', 'Water Quality Improvement']),
  CG('svc_inspection', 'Water Tank Inspection', 'Service Categories', ['Internal Condition Inspection', 'Leakage Inspection', 'Structural Assessment', 'Water Quality Review']),
  CG('svc_maintenance', 'Water Tank Maintenance', 'Service Categories', ['Tank Cleaning Schedule Management', 'Preventive Maintenance', 'Minor Repair Coordination', 'Overflow System Inspection']),
  CG('svc_commercial_building', 'Commercial Building Tank Cleaning', 'Service Categories', ['Office Buildings', 'Shopping Centres', 'Retail Complexes', 'Commercial Towers']),
  CG('svc_hospitality', 'Hospitality Sector', 'Service Categories', ['Hotels', 'Guest Houses', 'Resorts', 'Restaurants', 'Cafés']),
  CG('svc_education', 'Educational Institutions', 'Service Categories', ['Schools', 'Colleges', 'Universities', 'Training Centres']),
  CG('svc_healthcare', 'Healthcare Facilities', 'Service Categories', ['Clinics', 'Hospitals', 'Medical Centres']),
  CG('svc_industrial', 'Industrial Facilities', 'Service Categories', ['Factories', 'Warehouses', 'Manufacturing Facilities']),
  CG('svc_repair_coord', 'Tank Repair Coordination', 'Service Categories', ['Crack Repair', 'Leakage Repair', 'Valve Replacement', 'Pipe Connection Repair']),
  CG('svc_refurbishment', 'Tank Refurbishment', 'Service Categories', ['Tank Recoating', 'Waterproofing', 'Structural Reinforcement']),
  CG('svc_pump', 'Pump Services', 'Service Categories', ['Water Pump Inspection', 'Pump Maintenance', 'Pump Replacement Coordination']),
  CG('svc_pipeline', 'Pipeline Services', 'Service Categories', ['Water Line Inspection', 'Leak Detection', 'Pipe Maintenance Coordination']),
  CG('svc_testing_coord', 'Water Testing Coordination', 'Service Categories', ['Drinking Water Testing', 'Water Quality Assessment', 'Contamination Assessment']),
  CG('svc_treatment', 'Water Treatment Support', 'Service Categories', ['Filtration System Installation', 'Water Purification Coordination', 'Water Softener Coordination']),
  CG('amc_residential', 'Residential AMC', 'Service Categories', ['Basic Package — Annual Tank Cleaning; Inspection Report', 'Standard Package — Six-Monthly Cleaning; Water Quality Inspection; Maintenance Report', 'Premium Package — Quarterly Inspection; Tank Cleaning; Pump Inspection; Water Quality Monitoring']),
  CG('amc_commercial', 'Commercial AMC', 'Service Categories', ['Commercial Building Package — Scheduled Cleaning; Inspection Reports; Maintenance Tracking', 'Hotel & Restaurant Package — Regular Cleaning; Hygiene Compliance Monitoring', 'School & Hospital Package — Enhanced Cleaning Frequency; Water Quality Monitoring']),

  // Clause 22 — Defect rectification
  F('defect_rectification_days', 'Defect rectification response (Business Days) (Clause 22)', 'number', 'Defects', { required: false }),

  // Clause 32 — Insurance
  CG('insurance_mandatory', 'Mandatory Insurance', 'Insurance', ['Public Liability Insurance', 'Workers Compensation Insurance', 'Employer Liability Insurance', 'Contractor Insurance', 'Vehicle Insurance']),
  CG('insurance_optional', 'Optional Insurance', 'Insurance', ['Professional Indemnity Insurance', 'Environmental Liability Insurance', 'Product Liability Insurance', 'Contractor All-Risk Insurance', 'Business Interruption Insurance']),

  // Clause 61 — Authorised Representatives
  F('ss_rep_name', 'Seventh Sky Representative — Name', 'text', 'Authorised Representatives', { required: false }),
  F('ss_rep_position', 'Seventh Sky Representative — Position', 'text', 'Authorised Representatives', { required: false }),
  F('ss_rep_phone', 'Seventh Sky Representative — Phone', 'text', 'Authorised Representatives', { required: false }),
  F('ss_rep_email', 'Seventh Sky Representative — Email', 'text', 'Authorised Representatives', { required: false }),
  F('sp_rep_name', 'Service Provider Representative — Name', 'text', 'Authorised Representatives', { required: false }),
  F('sp_rep_position', 'Service Provider Representative — Position', 'text', 'Authorised Representatives', { required: false }),
  F('sp_rep_phone', 'Service Provider Representative — Phone', 'text', 'Authorised Representatives', { required: false }),
  F('sp_rep_email', 'Service Provider Representative — Email', 'text', 'Authorised Representatives', { required: false }),

  // Execution
  F('sp_business_name', 'Service Provider — Business Name', 'text', 'Execution', { required: false }),
  F('witness1_name', 'Witness 1 — Name', 'text', 'Execution', { required: false }),
  F('witness1_nid', 'Witness 1 — NID', 'text', 'Execution', { required: false }),
  F('witness2_name', 'Witness 2 — Name', 'text', 'Execution', { required: false }),
  F('witness2_nid', 'Witness 2 — NID', 'text', 'Execution', { required: false }),
];

const SIGNERS = [
  { role: 'provider', label: 'Service Provider', order: 1 },
  { role: 'seventh_sky', label: 'Seventh Sky Representative', order: 2 },
];

const V = (k) => `{{${k}}}`;
const ul = (items) => '<ul>' + items.map((i) => `<li>${i}</li>`).join('') + '</ul>';

const CONTENT_HTML = `
<h1 style="text-align:center">Water Tank Cleaning &amp; Maintenance — Service Delivery Provider Master Agreement</h1>

<h3>1. Purpose of Agreement</h3>
<p>The purpose of this Agreement is to establish the terms and conditions under which the Service Provider shall provide water tank cleaning, maintenance, repair, inspection, water quality and related technical services to clients referred by Seventh Sky.</p>
<p>The Parties acknowledge that:</p>
<p>Seventh Sky operates as a service coordinator, consultant, project manager and client relationship manager.</p>
<p>Seventh Sky is not generally the cleaning contractor, maintenance contractor, repair contractor, testing laboratory, water treatment specialist or technical service provider unless specifically agreed in writing.</p>
<p>The Service Provider shall perform the actual technical services directly for the client.</p>
<p>Individual client projects shall be governed by separate Work Orders issued under this Agreement.</p>

<h3>2. Appointment</h3>
<p>The Service Provider is appointed as a non-exclusive service delivery partner of Seventh Sky.</p>
<p>Nothing in this Agreement shall:</p>
${ul(['Guarantee a minimum volume of work.', 'Prevent Seventh Sky from engaging other providers.', 'Prevent the Service Provider from providing services to other clients outside the restrictions of this Agreement.'])}

<h3>3. Agreement Term</h3>
<p>This Agreement shall commence on: ${V('commencement_date')} and continue for: ${V('agreement_term')} unless terminated earlier under this Agreement.</p>

<h3>4. Renewal</h3>
<p>Upon expiry, this Agreement shall automatically renew for successive ${V('agreement_term')} periods unless either Party provides at least ${V('notice_period')} written notice prior to expiry.</p>

<h3>5. Service Categories</h3>
<p>The Service Provider may be engaged to provide any one or more of the following services. Only services specified in a Work Order shall apply.</p>
<p><strong>A. Residential Water Tank Services</strong></p>
<p><strong>Water Tank Cleaning</strong></p>${V('svc_cleaning')}
<p><strong>Water Tank Disinfection</strong></p>${V('svc_disinfection')}
<p><strong>Water Tank Inspection</strong></p>${V('svc_inspection')}
<p><strong>Water Tank Maintenance</strong></p>${V('svc_maintenance')}
<p><strong>B. Commercial Water Tank Services</strong></p>
<p><strong>Commercial Building Tank Cleaning</strong></p>${V('svc_commercial_building')}
<p><strong>Hospitality Sector</strong></p>${V('svc_hospitality')}
<p><strong>Educational Institutions</strong></p>${V('svc_education')}
<p><strong>Healthcare Facilities</strong></p>${V('svc_healthcare')}
<p><strong>Industrial Facilities</strong></p>${V('svc_industrial')}
<p><strong>C. Water Tank Repair Services</strong></p>
<p><strong>Tank Repair Coordination</strong></p>${V('svc_repair_coord')}
<p><strong>Tank Refurbishment</strong></p>${V('svc_refurbishment')}
<p><strong>D. Water Supply System Services</strong></p>
<p><strong>Pump Services</strong></p>${V('svc_pump')}
<p><strong>Pipeline Services</strong></p>${V('svc_pipeline')}
<p><strong>E. Water Quality Management</strong></p>
<p><strong>Water Testing Coordination</strong></p>${V('svc_testing_coord')}
<p><strong>Water Treatment Support</strong></p>${V('svc_treatment')}
<p><strong>F. Annual Maintenance Contracts (AMC) — Residential AMC</strong></p>${V('amc_residential')}
<p><strong>Commercial AMC</strong></p>${V('amc_commercial')}

<h3>6. Future Services</h3>
<p>The Parties may mutually agree to add further cleaning, maintenance, repair, inspection, water quality, plumbing, water treatment or related services by written agreement without replacing this Agreement.</p>

<h3>7. Service Delivery Model</h3>
<p>The Parties acknowledge that:</p>
<p>Seventh Sky primarily provides:</p>
${ul(['Client acquisition', 'Marketing', 'Client relationship management', 'Administration', 'Coordination', 'Project oversight', 'Communication management', 'Reporting'])}
<p>The Service Provider primarily provides:</p>
${ul(['Cleaning services', 'Disinfection services', 'Inspection services', 'Repair services', 'Water testing services', 'Water treatment services', 'Maintenance services', 'Technical support'])}
<p>The Service Provider remains fully responsible for the quality and legality of all technical work performed.</p>

<h3>8. Work Orders</h3>
<p>Individual client engagements shall be documented through separate Work Orders. Each Work Order may include:</p>
${ul(['Client details', 'Site address', 'Service requirements', 'Scope of work', 'Timeline', 'Budget', 'Materials', 'Labour requirements', 'Milestones', 'Warranty requirements', 'Insurance requirements', 'Special conditions'])}
<p>In the event of inconsistency: Work Order terms shall prevail only for that specific project. All other terms of this Master Agreement shall remain effective.</p>

<h3>9. Independent Contractor Status</h3>
<p>The Service Provider is an independent contractor. Nothing in this Agreement creates:</p>
${ul(['Employment', 'Joint Venture', 'Partnership', 'Agency', 'Franchise', 'Fiduciary Relationship'])}
<p>between the Parties.</p>

<h3>10. Good Faith Obligation</h3>
<p>Both Parties agree to:</p>
${ul(['Act professionally.', 'Act honestly.', 'Act in good faith.', 'Cooperate reasonably.', 'Protect client interests.', 'Protect each Party&rsquo;s reputation.', 'Comply with all applicable laws and regulations.'])}

<h3>11. Licensing, Registration &amp; Regulatory Compliance</h3>
<p>The Service Provider warrants that throughout the Term of this Agreement it shall maintain all licences, registrations, permits and approvals necessary to legally perform the Services.</p>
<p>The Service Provider shall maintain and comply with:</p>
${ul(['Trade Licence', 'Company Registration', 'TIN', 'BIN (where applicable)', 'Environmental Requirements', 'Occupational Health &amp; Safety Requirements', 'Labour Law Requirements', 'Public Health Requirements', 'Local Government Requirements', 'Water Quality Regulations', 'Any applicable Government approvals'])}
<p>The Service Provider shall immediately notify Seventh Sky if:</p>
${ul(['Any licence expires', 'Any licence is suspended', 'Any licence is cancelled', 'Any investigation occurs', 'Any regulatory action is commenced'])}

<h3>12. Professional Service Standards</h3>
<p>The Service Provider shall ensure all services are performed:</p>
${ul(['Professionally', 'Competently', 'Safely', 'Hygienically', 'In accordance with industry best practice', 'In accordance with manufacturer guidelines', 'In accordance with public health requirements', 'In accordance with applicable Bangladeshi laws'])}
<p>The Service Provider shall ensure all works are:</p>
${ul(['Properly planned', 'Properly supervised', 'Properly documented', 'Properly completed', 'Properly inspected'])}

<h3>13. Site Assessment Requirements</h3>
<p>Prior to commencing works, the Service Provider shall conduct an appropriate site assessment. Site assessments may include:</p>
<p><strong>Water Tank Cleaning Services</strong></p>
${ul(['Tank location assessment', 'Tank accessibility review', 'Capacity assessment', 'Water condition assessment', 'Cleaning requirements review', 'Safety assessment'])}
<p><strong>Water Tank Inspection Services</strong></p>
${ul(['Internal condition inspection', 'External condition inspection', 'Leakage assessment', 'Structural assessment', 'Overflow system assessment', 'Water contamination assessment'])}
<p><strong>Water Tank Repair Services</strong></p>
${ul(['Crack assessment', 'Leakage assessment', 'Structural assessment', 'Pipework assessment', 'Valve assessment'])}
<p><strong>Water Supply System Services</strong></p>
${ul(['Pump inspection', 'Pipeline inspection', 'Leak detection', 'Water pressure review'])}
<p><strong>Water Quality Services</strong></p>
${ul(['Water quality review', 'Sampling requirements', 'Contamination indicators', 'Treatment requirements'])}
<p>The Service Provider shall provide recommendations based upon findings.</p>

<h3>14. Personnel Requirements</h3>
<p>The Service Provider shall ensure all personnel:</p>
${ul(['Are properly trained', 'Are competent', 'Are adequately supervised', 'Follow safety procedures', 'Follow hygiene procedures', 'Conduct themselves professionally', 'Use appropriate equipment'])}
<p>The Service Provider shall remain responsible for:</p>
${ul(['Employees', 'Contractors', 'Subcontractors', 'Consultants'])}
<p>engaged by it.</p>

<h3>15. Subcontracting</h3>
<p>The Service Provider shall not subcontract any Work Order without prior written approval from Seventh Sky. Where approval is granted:</p>
${ul(['The Service Provider remains fully responsible.', 'All subcontractors must meet Agreement requirements.', 'All warranties remain the responsibility of the Service Provider.'])}

<h3>16. Service Delivery Standards</h3>
<p>The Service Provider shall:</p>
<p><strong>Before Services</strong></p>
${ul(['Review Work Order', 'Review client requirements', 'Confirm scope', 'Confirm schedule', 'Confirm resources', 'Confirm workforce availability'])}
<p><strong>During Services</strong></p>
${ul(['Follow approved scope', 'Maintain safety standards', 'Maintain hygiene standards', 'Protect client property', 'Protect water systems', 'Maintain clean worksites', 'Communicate progress', 'Report issues promptly'])}
<p><strong>After Services</strong></p>
${ul(['Complete inspections', 'Complete reporting', 'Remove waste materials', 'Leave site in clean condition', 'Provide recommendations', 'Provide completion reports'])}

<h3>17. Project Management &amp; Communication</h3>
<p>The Service Provider shall provide regular updates to Seventh Sky regarding:</p>
${ul(['Project progress', 'Delays', 'Site issues', 'Resource shortages', 'Safety incidents', 'Water quality concerns', 'Client concerns'])}
<p>Updates shall be provided:</p>
${ul(['By email', 'Through CRM', 'By phone', 'Through written reports'])}
<p>as reasonably required.</p>

<h3>18. Client Communication Protocol</h3>
<p>The Service Provider acknowledges that the client relationship primarily belongs to Seventh Sky. Accordingly:</p>
<p>The Service Provider shall:</p>
${ul(['Treat clients professionally', 'Respect Seventh Sky&rsquo;s role', 'Communicate honestly', 'Maintain confidentiality', 'Avoid misleading statements'])}
<p>The Service Provider shall not:</p>
${ul(['Misrepresent Seventh Sky', 'Make unauthorised promises', 'Offer services outside approved scope', 'Modify commercial arrangements without approval'])}

<h3>19. Site Safety &amp; Hygiene Requirements</h3>
<p>The Service Provider shall be solely responsible for site safety. This includes:</p>
${ul(['Risk assessments', 'Safety briefings', 'Personal protective equipment', 'Safe confined-space practices', 'Safe chemical handling', 'Safe ladder practices', 'Safe roof access procedures', 'Emergency response procedures'])}
<p>The Service Provider shall immediately notify Seventh Sky of:</p>
${ul(['Serious incidents', 'Injuries', 'Property damage', 'Contamination events', 'Safety breaches'])}

<h3>20. Quality Assurance</h3>
<p>The Service Provider shall implement appropriate quality assurance systems. This includes:</p>
${ul(['Cleaning inspections', 'Hygiene inspections', 'Water tank inspections', 'Repair inspections', 'Water quality reviews', 'Documentation reviews'])}
<p>The Service Provider shall rectify identified defects promptly.</p>

<h3>21. Warranties</h3>
<p>The Service Provider shall provide applicable warranties for:</p>
${ul(['Cleaning services', 'Repair services', 'Waterproofing works', 'Structural reinforcement works', 'Installed components', 'Maintenance services'])}
<p>where applicable. Warranty periods shall be specified in each Work Order.</p>

<h3>22. Defect Rectification</h3>
<p>Where defects arise due to:</p>
${ul(['Faulty workmanship', 'Inadequate cleaning', 'Improper repairs', 'Incorrect installation', 'Negligent performance'])}
<p>the Service Provider shall rectify such defects at its own cost. The Service Provider shall respond to defect notifications within: ${V('defect_rectification_days')} Business Days and complete rectification within a reasonable period.</p>

<h3>23. Water Quality Testing Disclaimer</h3>
<p>Where water testing services are coordinated:</p>
${ul(['Testing results reflect conditions at the time of sampling only.', 'Future water quality may change.', 'Water quality may be influenced by external factors.', 'Laboratory reports remain the responsibility of the testing laboratory.'])}
<p>Seventh Sky acts only as coordinator unless otherwise agreed.</p>

<h3>24. Documentation Requirements</h3>
<p>The Service Provider shall provide documentation including:</p>
${ul(['Site reports', 'Cleaning reports', 'Inspection reports', 'Repair reports', 'Water quality reports', 'Testing reports', 'Maintenance reports', 'Completion certificates', 'Warranty documents'])}
<p>where applicable.</p>

<h3>25. Record Keeping</h3>
<p>The Service Provider shall maintain records relating to:</p>
${ul(['Work Orders', 'Cleaning reports', 'Inspection reports', 'Testing reports', 'Safety reports', 'Warranty records', 'Maintenance activities'])}
<p>for a minimum period of: Seven (7) Years or such longer period as required by law.</p>

<h3>26. Commercial Principles</h3>
<p>The Parties acknowledge and agree that:</p>
<p>Seventh Sky primarily provides:</p>
${ul(['Client acquisition', 'Marketing', 'Project coordination', 'Administration', 'Client relationship management', 'Communication management', 'Quality oversight', 'Reporting'])}
<p>Service Provider primarily provides:</p>
${ul(['Water tank cleaning', 'Water tank disinfection', 'Water tank inspection', 'Water tank maintenance', 'Water tank repairs', 'Water quality services', 'Water testing services', 'Water treatment services', 'AMC service delivery', 'Technical support'])}
<p>Seventh Sky generally does not perform the actual cleaning, repair, maintenance, testing or treatment services unless specifically agreed in writing.</p>

<h3>27. Service Fees &amp; Payment Structure</h3>
<p>The Parties acknowledge that client charges may include one or more of the following:</p>
<p><strong>Seventh Sky Fees</strong></p>
${ul(['Consultation Fees', 'Site Assessment Coordination Fees', 'Project Coordination Fees', 'Administration Fees', 'AMC Management Fees', 'Warranty Coordination Fees', 'Insurance Coordination Fees'])}
<p><strong>Service Provider Charges</strong></p>
${ul(['Cleaning Fees', 'Inspection Fees', 'Repair Fees', 'Maintenance Fees', 'Water Testing Fees', 'Water Treatment Fees', 'Emergency Service Fees'])}
<p><strong>Additional Costs</strong></p>
${ul(['Labour', 'Transportation', 'Cleaning Chemicals', 'Disinfection Chemicals', 'Water Treatment Products', 'Equipment Hire', 'Waste Disposal', 'Pump Parts', 'Valves', 'Pipes', 'Waterproofing Materials', 'Government Fees', 'Permit Fees', 'Laboratory Fees', 'Insurance Premiums'])}
<p>Each Work Order shall clearly identify:</p>
${ul(['Seventh Sky Fees', 'Service Provider Fees', 'Materials Costs', 'Labour Costs', 'Payment Milestones', 'Approved Variations'])}
<p><strong>Seventh Sky Commission:</strong> Seventh Sky&rsquo;s commission on Service Provider charges under this Agreement is ${V('commission_pct')}%. ${V('ss_fee_notes')}</p>

<h3>28. Payment of Service Provider</h3>
<p>The Service Provider shall be paid only for:</p>
${ul(['Approved Work Orders', 'Approved Variations', 'Approved Additional Services'])}
<p>Payment structures may include:</p>
<p><strong>Option A – Project-Based Payments</strong></p>${ul(['Deposit', 'Progress Payment', 'Completion Payment'])}
<p><strong>Option B – AMC Payments</strong></p>${ul(['Monthly', 'Quarterly', 'Half-Yearly', 'Annual'])}
<p><strong>Option C – Emergency Service Payments</strong></p>${ul(['Fixed Fee', 'Hourly Fee', 'Call-Out Fee'])}
<p>as specified in the relevant Work Order.</p>

<h3>29. Client Payments</h3>
<p>The Parties acknowledge that:</p>
<p>Clients may pay Seventh Sky. Clients may pay Service Providers directly. Mixed payment structures may apply. Payment arrangements shall be documented in each Work Order.</p>
<p>Where Seventh Sky receives client funds intended for Service Provider services, Seventh Sky shall pay the Service Provider in accordance with agreed payment milestones.</p>
<p><strong>Service Provider Account Details (for settlement of approved payments — completed by the Service Provider):</strong><br/>
Account Holder Name: ${V('sp_account_name')}<br/>Bank Name: ${V('sp_bank_name')}<br/>Branch: ${V('sp_bank_branch')}<br/>
Account Number: ${V('sp_account_number')}<br/>Routing Number: ${V('sp_routing_number')}<br/>bKash / Nagad: ${V('sp_mobile_banking')}</p>

<h3>30. Materials, Chemicals &amp; Equipment</h3>
<p>Unless otherwise agreed: The Client shall ultimately bear the cost of:</p>
${ul(['Cleaning Materials', 'Disinfection Chemicals', 'Water Treatment Products', 'Pumps', 'Valves', 'Pipework', 'Replacement Components', 'Waterproofing Materials', 'Structural Repair Materials', 'Equipment Hire', 'Transport', 'Labour', 'Laboratory Testing', 'Government Fees', 'Other Project Costs'])}
<p>The Service Provider shall remain responsible for:</p>
${ul(['Correct specification', 'Proper use of chemicals', 'Safe handling of materials', 'Quality control', 'Suitability of products', 'Compliance with regulations'])}

<h3>31. Variations</h3>
<p>Variations may arise due to:</p>
${ul(['Additional contamination', 'Structural issues', 'Hidden defects', 'Additional repair requirements', 'Additional client requests', 'Regulatory requirements', 'Safety concerns'])}
<p>All variations must:</p>
${ul(['Be documented', 'Be approved', 'Identify additional costs', 'Identify additional time requirements'])}
<p>before implementation where reasonably possible.</p>

<h3>32. Insurance Requirements</h3>
<p>Throughout the Agreement Term the Service Provider shall maintain appropriate insurance coverage including:</p>
<p><strong>Mandatory Insurance</strong></p>${V('insurance_mandatory')}
<p><strong>Optional Insurance</strong></p>${V('insurance_optional')}
<p>The Service Provider shall provide evidence of insurance upon request.</p>

<h3>33. Optional Client Insurance Program</h3>
<p>Where available, Seventh Sky may coordinate optional insurance arrangements for clients. Examples include:</p>
${ul(['Property Damage Insurance', 'Public Liability Insurance', 'Repair &amp; Replacement Insurance', 'Environmental Incident Insurance', 'Water Damage Insurance', 'Business Interruption Insurance'])}
<p>The Parties acknowledge that: Insurance remains subject to insurer approval. Insurance claims remain subject to insurer terms. Seventh Sky does not guarantee claim approval. Seventh Sky acts only as coordinator unless otherwise agreed.</p>

<h3>34. Liability Allocation</h3>
<p>The Parties acknowledge that:</p>
<p>Seventh Sky is primarily responsible for:</p>
${ul(['Coordination', 'Administration', 'Client communications', 'Project oversight', 'Record management'])}
<p>Service Provider is primarily responsible for:</p>
${ul(['Cleaning services', 'Maintenance services', 'Repair services', 'Water testing services', 'Water treatment services', 'Site safety', 'Hygiene standards', 'Technical compliance', 'Workmanship'])}

<h3>35. Property Damage</h3>
<p>Where damage occurs arising from:</p>
${ul(['Cleaning works', 'Repair works', 'Maintenance works', 'Chemical use', 'Contractor activities', 'Negligent performance'])}
<p>the Service Provider shall remain primarily responsible. The Service Provider shall:</p>
${ul(['Cooperate with investigations', 'Rectify damage', 'Participate in insurance claims', 'Compensate affected parties where legally required'])}

<h3>36. Water Quality Claims</h3>
<p>The Service Provider acknowledges that water quality issues may result in complaints, investigations or claims. Where claims arise due to:</p>
${ul(['Improper cleaning', 'Improper disinfection', 'Negligent maintenance', 'Improper repair', 'Incorrect testing procedures'])}
<p>the Service Provider shall remain responsible.</p>

<h3>37. Client Claims &amp; Complaints</h3>
<p>The Service Provider shall cooperate fully with Seventh Sky regarding:</p>
${ul(['Complaints', 'Investigations', 'Water quality concerns', 'Hygiene concerns', 'Warranty matters', 'Regulatory enquiries'])}
<p>The Service Provider shall provide all information reasonably required to resolve complaints.</p>

<h3>38. Indemnity by Service Provider</h3>
<p>The Service Provider indemnifies and holds harmless Seventh Sky and its:</p>
${ul(['Directors', 'Shareholders', 'Officers', 'Employees', 'Contractors', 'Representatives'])}
<p>against losses arising from:</p>
${ul(['Negligence', 'Unsafe practices', 'Improper cleaning', 'Improper disinfection', 'Regulatory breaches', 'Property damage', 'Personal injury', 'Water contamination caused by the Service Provider', 'Warranty breaches', 'Contract breaches', 'Safety breaches'])}

<h3>39. Limitation of Seventh Sky Liability</h3>
<p>The Service Provider acknowledges that Seventh Sky:</p>
${ul(['Is not generally the cleaning contractor', 'Is not generally the repair contractor', 'Is not generally the testing laboratory', 'Is not generally the water treatment provider', 'Is not generally the maintenance contractor'])}
<p>To the maximum extent permitted by Bangladeshi law, Seventh Sky shall not be liable for losses arising from:</p>
${ul(['Cleaning defects', 'Repair defects', 'Water contamination', 'Laboratory errors', 'Chemical misuse', 'Safety incidents', 'Workmanship defects'])}
<p>where such matters arise from acts or omissions of the Service Provider.</p>

<h3>40. Warranty Claims</h3>
<p>The Service Provider shall manage and administer warranty claims relating to:</p>
${ul(['Cleaning services', 'Repair works', 'Waterproofing works', 'Structural reinforcement works', 'Maintenance services', 'Installed components'])}
<p>The Service Provider shall assist Seventh Sky and clients in resolving warranty matters promptly.</p>

<h3>41. Force Majeure Events</h3>
<p>Neither Party shall be liable for delays caused by:</p>
${ul(['Floods', 'Cyclones', 'Storms', 'Fires', 'Earthquakes', 'Pandemics', 'Political unrest', 'Government restrictions', 'Supply chain disruptions', 'Utility outages', 'Natural disasters'])}
<p>beyond their reasonable control. Affected Parties shall notify the other Party promptly.</p>

<h3>42. Risk Acknowledgement</h3>
<p>The Service Provider acknowledges that Water Tank Cleaning &amp; Maintenance Services involve risks including:</p>
${ul(['Confined-space risks', 'Water contamination risks', 'Chemical handling risks', 'Structural risks', 'Environmental risks', 'Equipment failure risks', 'Pump failure risks', 'Pipe failure risks', 'Client operational risks', 'Regulatory risks'])}
<p>The Service Provider assumes responsibility for managing such risks within its area of expertise and control.</p>

<h3>43. Confidentiality</h3>
<p>The Service Provider shall keep confidential all information relating to:</p>
${ul(['Seventh Sky', 'Clients', 'Prospective Clients', 'Pricing Structures', 'Marketing Strategies', 'Business Processes', 'Supplier Networks', 'Technical Information', 'Financial Information', 'Project Information', 'Commercial Arrangements', 'Water Quality Reports', 'Inspection Reports', 'Maintenance Records'])}
<p>Confidential information shall not be disclosed without prior written consent except where required by law. This obligation survives termination of this Agreement.</p>

<h3>44. Client Ownership &amp; Client Relationship Protection</h3>
<p>The Service Provider acknowledges that: Clients introduced by Seventh Sky are valuable business assets of Seventh Sky. Seventh Sky has invested substantial resources in acquiring, managing and servicing such clients. The Service Provider shall respect Seventh Sky&rsquo;s client relationships.</p>
<p>The Service Provider agrees that all clients introduced through Seventh Sky shall remain Protected Clients of Seventh Sky.</p>

<h3>45. Non-Solicitation of Clients</h3>
<p>During the Agreement Term and for Twenty-Four (24) Months following termination, the Service Provider shall not:</p>
${ul(['Directly solicit Seventh Sky clients.', 'Indirectly solicit Seventh Sky clients.', 'Attempt to divert clients away from Seventh Sky.', 'Encourage clients to cease dealing with Seventh Sky.', 'Encourage clients to bypass Seventh Sky.', 'Offer competing services directly to Protected Clients.'])}
<p>without prior written approval from Seventh Sky.</p>

<h3>46. Exclusive Territory – Cumilla District</h3>
<p>The Service Provider acknowledges that Seventh Sky has established and is developing business operations within the District of Cumilla, Bangladesh.</p>
<p>Accordingly, during the Term of this Agreement and for Twenty-Four (24) Months following termination, the Service Provider shall not directly or indirectly:</p>
${ul(['Market services within Cumilla.', 'Advertise services targeting Cumilla.', 'Solicit clients within Cumilla.', 'Quote for projects within Cumilla.', 'Contract with clients within Cumilla.', 'Deliver services independently within Cumilla.'])}
<p>without the prior written approval of Seventh Sky. All projects located within Cumilla shall be managed through Seventh Sky under an approved Work Order.</p>

<h3>47. Referral of Cumilla Enquiries</h3>
<p>If the Service Provider receives any:</p>
${ul(['Enquiry', 'Referral', 'Quotation request', 'Tender invitation', 'Project opportunity'])}
<p>originating from Cumilla, the Service Provider shall: Notify Seventh Sky within Three (3) Business Days. Provide details of the opportunity. Refer the opportunity to Seventh Sky. Refrain from directly contracting with the prospective client.</p>
<p>Failure to comply shall constitute a material breach of this Agreement.</p>

<h3>48. Restriction on Local Presence</h3>
<p>During the Term of this Agreement and for Twenty-Four (24) Months thereafter, the Service Provider shall not establish, operate, lease, franchise, acquire or maintain within Cumilla:</p>
${ul(['Office', 'Workshop', 'Service Centre', 'Branch', 'Warehouse', 'Sales Office', 'Showroom', 'Customer Service Desk'])}
<p>without prior written approval from Seventh Sky.</p>

<h3>49. Non-Circumvention</h3>
<p>The Service Provider agrees that it shall not:</p>
${ul(['Circumvent Seventh Sky.', 'Bypass Seventh Sky.', 'Enter direct arrangements intended to avoid Seventh Sky fees.', 'Use associated entities to avoid Seventh Sky fees.', 'Use employees, relatives or nominees to avoid Seventh Sky fees.', 'Structure transactions to avoid Seventh Sky&rsquo;s commercial interests.'])}

<h3>50. Protected Client Period</h3>
<p>Any client:</p>
${ul(['Introduced', 'Referred', 'Assigned', 'Coordinated', 'Managed'])}
<p>through Seventh Sky shall remain a Protected Client. The Protected Client Period shall apply: During the Agreement; AND For Twenty-Four (24) Months after:</p>
${ul(['Completion of a Work Order;', 'Termination of a Work Order;', 'Termination of this Agreement;'])}
<p>whichever occurs later.</p>

<h3>51. Direct Dealings with Protected Clients</h3>
<p>The Service Provider shall not directly contract with a Protected Client during the Protected Client Period unless: Seventh Sky provides written consent; or A separate commercial arrangement is agreed with Seventh Sky.</p>
<p>If direct dealings occur without approval, Seventh Sky shall remain entitled to recover:</p>
${ul(['Lost Coordination Fees', 'Lost Administration Fees', 'Lost Service Fees', 'Lost Commissions', 'Legal Costs', 'Investigation Costs', 'Damages'])}

<h3>52. Non-Solicitation of Staff &amp; Contractors</h3>
<p>The Service Provider shall not solicit, employ or engage:</p>
${ul(['Employees', 'Contractors', 'Consultants', 'Representatives'])}
<p>of Seventh Sky during the Agreement and for Twelve (12) Months after termination without written consent.</p>

<h3>53. Intellectual Property</h3>
<p>All intellectual property created by Seventh Sky including:</p>
${ul(['Templates', 'Systems', 'Procedures', 'CRM Structures', 'Documentation', 'Forms', 'Reports', 'Marketing Materials'])}
<p>shall remain the exclusive property of Seventh Sky.</p>

<h3>54. Data Protection</h3>
<p>The Service Provider shall:</p>
${ul(['Protect client information.', 'Use information only for authorised purposes.', 'Maintain appropriate security measures.', 'Comply with applicable privacy obligations.'])}
<p>Client information shall not be sold, shared or disclosed without authorisation.</p>

<h3>55. Dispute Resolution</h3>
<p>The Parties shall first attempt to resolve disputes through: Step 1 Good Faith Negotiations. Step 2 Formal Written Discussions. Step 3 Mediation. Step 4 Arbitration or Court Proceedings.</p>
<p>All proceedings shall be conducted in accordance with the laws of Bangladesh.</p>

<h3>56. Suspension of Work Orders</h3>
<p>Seventh Sky may suspend a Work Order where:</p>
${ul(['Safety concerns arise.', 'Regulatory issues arise.', 'Licensing issues arise.', 'Insurance lapses occur.', 'Quality concerns arise.', 'Client disputes arise.', 'Payment disputes arise.', 'Fraud is suspected.'])}
<p>During suspension:</p>
${ul(['Site work may cease.', 'Cleaning activities may cease.', 'Maintenance activities may cease.', 'Client communications may be restricted.', 'Payments may be withheld pending resolution.'])}

<h3>57. Termination of Agreement</h3>
<p>Either Party may terminate this Agreement: At Expiry By providing ${V('notice_period')} written notice.</p>
<p>Immediately Where:</p>
${ul(['Fraud occurs.', 'Serious misconduct occurs.', 'Material breach occurs.', 'Insolvency occurs.', 'Licences are revoked.', 'Insurance is not maintained.', 'Serious safety breaches occur.', 'Illegal activities occur.'])}

<h3>58. Effect of Termination</h3>
<p>Termination shall not affect:</p>
${ul(['Existing payment obligations.', 'Existing Work Orders (unless terminated).', 'Confidentiality obligations.', 'Warranty obligations.', 'Indemnity obligations.', 'Client Protection obligations.', 'Non-Circumvention obligations.'])}

<h3>59. Survival of Clauses</h3>
<p>The following clauses survive termination:</p>
${ul(['Confidentiality', 'Client Protection', 'Non-Circumvention', 'Territorial Exclusivity', 'Warranties', 'Indemnities', 'Intellectual Property', 'Dispute Resolution', 'Outstanding Payments'])}

<h3>60. Governing Law</h3>
<p>This Agreement shall be governed by and interpreted in accordance with the laws of: THE PEOPLE&rsquo;S REPUBLIC OF BANGLADESH. The Parties submit to the jurisdiction of the Courts of Bangladesh.</p>

<h3>61. Authorised Representatives</h3>
<p><strong>Seventh Sky Representative</strong><br/>Name: ${V('ss_rep_name')}<br/>Position: ${V('ss_rep_position')}<br/>Phone: ${V('ss_rep_phone')}<br/>Email: ${V('ss_rep_email')}</p>
<p><strong>Service Provider Representative</strong><br/>Name: ${V('sp_rep_name')}<br/>Position: ${V('sp_rep_position')}<br/>Phone: ${V('sp_rep_phone')}<br/>Email: ${V('sp_rep_email')}</p>
<p>Only authorised representatives may:</p>
${ul(['Approve Work Orders', 'Approve Variations', 'Approve Pricing Changes', 'Suspend Projects', 'Terminate Projects', 'Amend Agreements', 'Execute Legal Documents'])}

<h3>62. Entire Agreement</h3>
<p>This Agreement constitutes the entire agreement between the Parties. Any amendment must:</p>
${ul(['Be in writing.', 'Be signed by authorised representatives.', 'Clearly identify the amendment.'])}

<h3>63. Execution</h3>
<p>The Parties acknowledge that:</p>
${ul(['They have read this Agreement.', 'They understand this Agreement.', 'They have had the opportunity to obtain independent legal advice.', 'They voluntarily enter into this Agreement.', 'They intend to be legally bound by its terms.'])}
<p><strong>SIGNED FOR SEVENTH SKY</strong><br/>Name: ${V('ss_rep_name')}<br/>Position: ${V('ss_rep_position')}<br/>Signature: __________________<br/>Date: __________</p>
<p><strong>SIGNED FOR SERVICE PROVIDER</strong><br/>Business Name: ${V('sp_business_name')}<br/>Representative: ${V('sp_rep_name')}<br/>Position: ${V('sp_rep_position')}<br/>Signature: __________________<br/>Date: __________</p>
<p><strong>WITNESS 1</strong><br/>Name: ${V('witness1_name')}<br/>NID: ${V('witness1_nid')}<br/>Signature: __________________<br/>Date: __________</p>
<p><strong>WITNESS 2</strong><br/>Name: ${V('witness2_name')}<br/>NID: ${V('witness2_nid')}<br/>Signature: __________________<br/>Date: __________</p>

<h3>Schedule A – Authorised Services</h3>
<p>(Include all Residential, Commercial, Repair, Water Quality, Water Supply System and AMC services with tick boxes exactly as selected under Clause 5.)</p>

<h3>Schedule B – Insurance Requirements</h3>
${ul(['Public Liability Insurance', 'Workers Compensation Insurance', 'Contractor Insurance', 'Vehicle Insurance', 'Environmental Liability Insurance (if applicable)', 'Professional Indemnity Insurance (if applicable)'])}

<h3>Schedule C – Warranty Requirements</h3>
${ul(['Cleaning Service Warranty', 'Repair Warranty', 'Waterproofing Warranty', 'Structural Reinforcement Warranty', 'Component Replacement Warranty', 'AMC Service Warranty'])}

<h3>Schedule D – Service Level Requirements</h3>
${ul(['Response Times', 'Emergency Call-Out Times', 'Cleaning Completion Standards', 'Inspection Reporting Timeframes', 'AMC Service Timeframes', 'Client Satisfaction Targets'])}

<h3>Schedule E – Work Order Template</h3>
<p>(To be completed and signed separately for each individual client/project assigned by Seventh Sky.)</p>
<p>Work Order Number: __________<br/>Client Name: __________<br/>Site Address: __________<br/>Service Category: __________<br/>Scope of Work: __________<br/>Materials: __________<br/>Labour: __________<br/>Project Value: __________<br/>Payment Milestones: __________<br/>Commencement Date: __________<br/>Completion Date: __________<br/>Special Conditions: __________<br/>Approved by Seventh Sky: __________<br/>Accepted by Service Provider: __________</p>

<p style="text-align:center;margin-top:18px"><strong>END OF MASTER SERVICE DELIVERY PROVIDER AGREEMENT</strong></p>
`;

(async () => {
  try {
    await sequelize.authenticate();
    const existing = await AgreementTemplate.findOne({ where: { name: NAME } });
    const payload = {
      name: NAME, category: 'provider_master', vertical: 'water_tank', status: 'active',
      description: 'Full 63-clause Service Provider Master Agreement (verbatim) — checkbox service/insurance selection + provider KYC intake.',
      content_html: CONTENT_HTML, fields: FIELDS, signers: SIGNERS,
      source_filename: 'Water Tank CM - Service Provider Master Agreement - V0.1.docx',
    };
    if (existing) { await existing.update(payload); console.log(`✓ Updated template #${existing.id} "${NAME}" (${FIELDS.length} fields, ${FIELDS.filter((f) => f.type === 'checkbox_group').length} checkbox groups)`); }
    else { const t = await AgreementTemplate.create(payload); console.log(`✓ Created template #${t.id} "${NAME}"`); }
    process.exit(0);
  } catch (e) { console.error('✗ Seed failed:', e.message); process.exit(1); }
})();
