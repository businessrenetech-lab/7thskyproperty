/**
 * Seeds (or refreshes) the FULL Water Tank CM — Service Provider Master Agreement
 * (25 clauses + Schedules A–D, V0.2) for the Agreement Builder + provider KYC intake.
 * Wording is reproduced verbatim from the client's document — DO NOT reword.
 * Schedule A service categories and Schedule C insurance are `checkbox_group`
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
  F('payment_model', 'Payment Model', 'select', 'Commission & Fees', { required: false, options: ['Project Based', 'AMC', 'Emergency / Call-Out'] }),
  F('payout_trigger', 'Provider Payout Trigger', 'select', 'Commission & Fees', { required: false, options: ['Completion Verified', 'Client Payment Received', 'Approved Milestone'] }),
  F('payment_due_days', 'Payment Due After Trigger (Days)', 'number', 'Commission & Fees', { required: false, default: '7' }),

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
<h1 style="text-align:center">Water Tank Cleaning &amp; Maintenance — Service Provider Master Agreement</h1>

<h3>1. PURPOSE</h3>
<p>The purpose of this Agreement is to establish the terms under which the Service Provider may deliver Water Tank Cleaning &amp; Maintenance Solutions to clients referred by Seventh Sky. This Agreement sets out the Parties' respective responsibilities, commercial arrangements, service standards and legal obligations. Individual client engagements will be governed by separate Work Orders issued under this Agreement.</p>

<h3>2. APPOINTMENT</h3>
<p>Seventh Sky appoints the Service Provider as a non-exclusive independent service delivery partner. Nothing in this Agreement guarantees any minimum volume of work; prevents either Party from engaging with other businesses; or creates an employment, partnership, joint venture or agency relationship.</p>

<h3>3. TERM</h3>
<p>This Agreement commences on {{commencement_date}} and continues for {{agreement_term}}, unless terminated earlier in accordance with this Agreement. Unless either Party provides at least {{notice_period}} written notice prior to expiry, this Agreement will automatically renew for successive terms of the same length.</p>

<h3>4. SERVICES</h3>
<p>The Service Provider may be engaged to provide one or more of the services listed in <strong>Schedule A</strong> as specified in a Work Order. Only services selected in the applicable Work Order form part of the Service Provider's engagement. Additional services may be added by written agreement without replacing this Master Agreement.</p>

<h3>5. WORK ORDERS</h3>
<p>Each client project shall be managed under a separate Work Order issued by Seventh Sky. A Work Order may include client details, property address, selected services, scope of work, project timeline, agreed pricing, payment schedule, warranty period, special requirements and any approved variations. If a Work Order conflicts with this Agreement, the Work Order will prevail only for that specific project.</p>

<h3>6. RESPONSIBILITIES OF THE PARTIES</h3>
<p><strong>Seventh Sky</strong> is responsible for client acquisition and marketing, quotations and service coordination, client communication, project administration, work order management, payment coordination, quality monitoring and overall client relationship management. <strong>The Service Provider</strong> is responsible for performing the contracted services, supplying competent personnel, complying with all applicable laws and industry standards, providing required tools and equipment unless otherwise agreed, maintaining licences and insurance, ensuring work quality and safety, rectifying defective workmanship, and completing work within agreed timeframes. The Service Provider remains solely responsible for the quality and compliance of all technical work performed.</p>

<h3>7. LICENSING, COMPLIANCE &amp; INSURANCE</h3>
<p>The Service Provider must, throughout the Agreement, hold and maintain all licences, permits, registrations and approvals required to perform the Services; comply with all applicable laws, regulations, codes and industry standards in Bangladesh; maintain appropriate insurance applicable to its business and services; and immediately notify Seventh Sky of any suspension, cancellation, investigation or material breach affecting its ability to perform. Evidence of licences or insurance must be provided upon request. The licences and insurances applicable to this engagement are recorded in <strong>Schedule C</strong>.</p>

<h3>8. SERVICE DELIVERY STANDARDS</h3>
<p>The Service Provider shall perform all Services professionally, safely and competently; using suitably qualified personnel; in accordance with applicable industry standards; within the agreed timeframe; with reasonable care and skill; and in compliance with the relevant Work Order. The Service Provider shall protect the Client's property, maintain a clean and safe worksite, promptly report delays, safety incidents or unexpected site conditions, and complete all agreed inspections, testing and commissioning before project completion.</p>

<h3>9. PERSONNEL &amp; SUBCONTRACTING</h3>
<p>The Service Provider is responsible for the conduct, competency and supervision of all employees, subcontractors and representatives engaged to perform the Services. No subcontracting of a Work Order is permitted without prior written approval from Seventh Sky. Approval to subcontract does not release the Service Provider from its obligations under this Agreement.</p>

<h3>10. SAFETY, QUALITY &amp; WARRANTIES</h3>
<p>The Service Provider shall maintain appropriate quality control and workplace safety procedures throughout the project, including complying with workplace health and safety requirements; using suitable tools, equipment and materials; ensuring workmanship meets accepted industry standards; correcting defective workmanship at its own cost; and providing any applicable manufacturer and workmanship warranties. Warranty periods applicable to a project shall be specified in the relevant Work Order.</p>

<h3>11. DOCUMENTATION &amp; RECORDS</h3>
<p>The Service Provider shall provide all documents reasonably required for the Services, including where applicable site assessments, quotations, inspection reports, cleaning and maintenance reports, water quality test reports, testing and commissioning records, warranty documents, completion certificates, photographs, and any documents required by law or requested by Seventh Sky. Business records must be retained for at least seven (7) years, or longer where required by law.</p>

<h3>12. SERVICE FEES &amp; PAYMENT</h3>
<p>Each Work Order will specify the agreed commercial arrangements, including services to be provided, agreed pricing, labour charges, material costs, payment milestones, approved variations, taxes and government charges (where applicable) and payment terms. Unless otherwise agreed, the Service Provider will only be paid for Services approved under a Work Order; additional work requires prior approval; invoices must accurately reflect completed work; and payments are subject to the agreed Work Order and supporting documentation. The Service Provider is responsible for its own taxation, employee payments and statutory obligations.</p>
<p><strong>Seventh Sky Commission:</strong> Seventh Sky's commission on Service Provider charges under this Agreement is {{commission_pct}}%. {{ss_fee_notes}}</p>
<p><strong>Service Provider Account Details</strong><br/>Account Holder Name: {{sp_account_name}}<br/>Bank Name: {{sp_bank_name}}<br/>Branch: {{sp_bank_branch}}<br/>Account Number: {{sp_account_number}}<br/>Routing Number: {{sp_routing_number}}<br/>bKash / Nagad (mobile banking): {{sp_mobile_banking}}</p>

<h3>13. STANDARD SERVICE PRICE SCHEDULE</h3>
<p>The Parties acknowledge that Seventh Sky maintains a Standard Service Price Schedule within its CRM (set out in <strong>Schedule B</strong>). The Price Schedule serves as the standard pricing guide for quotations, agreements and Work Orders and may be updated by Seventh Sky from time to time. Unless otherwise agreed, the applicable pricing for each project shall be confirmed in the relevant Work Order; discounts, negotiated or promotional pricing may apply; and the final approved Work Order price shall prevail over the Standard Service Price Schedule.</p>

<h3>14. LIABILITY &amp; INDEMNITY</h3>
<p>Each Party is responsible for its own acts, omissions, negligence and breaches. The Service Provider shall be responsible for any loss, damage, injury, claim or expense arising from defective workmanship, negligent acts or omissions, failure to comply with applicable laws, unsafe work practices, or breach of this Agreement. The Service Provider agrees to indemnify and hold harmless Seventh Sky against claims, losses, damages, costs and liabilities arising from the Service Provider's negligence, misconduct or breach, except to the extent caused by Seventh Sky.</p>

<h3>15. CLIENT CLAIMS, WARRANTIES &amp; DEFECTS</h3>
<p>The Service Provider shall promptly investigate and respond to any client complaint relating to Services performed. Where a defect is caused by the Service Provider's workmanship, materials or negligence, the Service Provider shall rectify the defect at its own cost within a reasonable timeframe, responding to defect notifications within {{defect_rectification_days}} Business Days. Where water quality testing forms part of the Services, testing shall be performed in accordance with applicable industry standards; laboratory analysis or certification remains the responsibility of the authorised testing laboratory. The Service Provider shall reasonably assist Seventh Sky in resolving warranty claims and client complaints.</p>

<h3>16. CONFIDENTIALITY &amp; DATA PROTECTION</h3>
<p>Each Party shall keep confidential all non-public business, commercial and client information obtained during this Agreement. Confidential information shall only be used for the purposes of performing this Agreement and shall not be disclosed to any third party unless required by law, authorised in writing, or reasonably required to perform the Services. The Service Provider shall take reasonable measures to protect all client information from unauthorised access, use or disclosure. These obligations continue after termination.</p>

<h3>17. INTELLECTUAL PROPERTY</h3>
<p>All business systems, templates, forms, procedures, branding, marketing materials, CRM data, documents and intellectual property owned or developed by Seventh Sky remain the exclusive property of Seventh Sky. The Service Provider shall not copy, modify, distribute or use Seventh Sky's intellectual property except for the purpose of performing authorised Services.</p>

<h3>18. CLIENT PROTECTION &amp; NON-CIRCUMVENTION</h3>
<p>Clients introduced or assigned by Seventh Sky remain clients of Seventh Sky. During this Agreement and for twenty-four (24) months after its termination, the Service Provider shall not, without Seventh Sky's prior written consent, directly solicit or contract with a client introduced by Seventh Sky; divert business opportunities intended for Seventh Sky; bypass Seventh Sky to avoid agreed fees or commissions; or use another person or entity to achieve the same outcome. Nothing prevents the Service Provider from working with clients who had an established business relationship with the Service Provider before introduction by Seventh Sky, provided that relationship can be reasonably demonstrated.</p>

<h3>19. EXCLUSIVE SERVICE AREA (IF APPLICABLE)</h3>
<p>Where the Parties agree to an exclusive operating area, the Service Provider shall not independently market or provide competing services within that area without Seventh Sky's written approval. If no exclusive area is specified in a Work Order or Schedule, this clause does not apply. Any agreed exclusive area (e.g. Cumilla District) is recorded in the Work Order or Schedule.</p>

<h3>20. FORCE MAJEURE</h3>
<p>Neither Party shall be liable for delays or failure to perform caused by events beyond its reasonable control, including natural disasters, war, civil unrest, government restrictions, pandemics, major utility failures or other unforeseen events. The affected Party shall notify the other as soon as reasonably practicable and resume performance when the event ends.</p>

<h3>21. DISPUTE RESOLUTION</h3>
<p>The Parties shall attempt to resolve any dispute in the following order: good faith discussions between authorised representatives; senior management negotiations; mediation, where agreed; then the courts of Bangladesh or any other dispute resolution process agreed by the Parties. The Parties shall continue performing their obligations, where reasonably possible, while a dispute is being resolved.</p>

<h3>22. SUSPENSION &amp; TERMINATION</h3>
<p><strong>Suspension.</strong> Seventh Sky may suspend a Work Order or this Agreement immediately where the Service Provider fails to maintain required licences or insurance, commits a material breach, performs unsafe or defective work, breaches applicable laws, fails to meet agreed service standards, or where suspension is reasonably necessary to protect the Client, Seventh Sky or the public. <strong>Termination.</strong> Either Party may terminate by giving thirty (30) days' written notice. Either Party may terminate immediately if the other commits an unremedied material breach, becomes insolvent, engages in fraud or serious misconduct, or no longer holds required licences. Termination does not affect rights or obligations arising before the termination date.</p>

<h3>23. GENERAL PROVISIONS</h3>
<p>Unless otherwise agreed in writing, this Agreement constitutes the entire agreement between the Parties; amendments must be made in writing and signed by both Parties; failure to enforce a provision does not waive any legal rights; if any provision is found invalid or unenforceable, the remaining provisions continue in full force; and notices must be provided in writing by hand, courier, post or electronic mail.</p>

<h3>24. GOVERNING LAW</h3>
<p>This Agreement shall be governed by the laws of the People's Republic of Bangladesh. The Parties submit to the jurisdiction of the competent courts of Bangladesh unless they mutually agree to resolve a dispute by arbitration or another recognised alternative dispute resolution process.</p>

<h3>25. EXECUTION</h3>
<p>The Parties acknowledge that they have read and understood this Agreement, have had the opportunity to obtain independent legal advice, enter into this Agreement voluntarily, and agree to be legally bound by its terms. This Agreement may be executed in counterparts and by electronic signature. Each signed copy will be deemed an original and together constitute one Agreement.</p>

<h3>SCHEDULE A — Authorised Services</h3>
<p>Tick the service categories the Service Provider is authorised to deliver. Only services selected in the applicable Work Order form part of an engagement.</p>
<p><strong>A. Residential Water Tank Services</strong></p>
<p><strong>Water Tank Cleaning</strong></p>{{svc_cleaning}}
<p><strong>Water Tank Disinfection</strong></p>{{svc_disinfection}}
<p><strong>Water Tank Inspection</strong></p>{{svc_inspection}}
<p><strong>Water Tank Maintenance</strong></p>{{svc_maintenance}}
<p><strong>B. Commercial Water Tank Services</strong></p>
<p><strong>Commercial Building Tank Cleaning</strong></p>{{svc_commercial_building}}
<p><strong>Hospitality Sector</strong></p>{{svc_hospitality}}
<p><strong>Educational Institutions</strong></p>{{svc_education}}
<p><strong>Healthcare Facilities</strong></p>{{svc_healthcare}}
<p><strong>Industrial Facilities</strong></p>{{svc_industrial}}
<p><strong>C. Water Tank Repair Services</strong></p>
<p><strong>Tank Repair Coordination</strong></p>{{svc_repair_coord}}
<p><strong>Tank Refurbishment</strong></p>{{svc_refurbishment}}
<p><strong>D. Water Supply System Services</strong></p>
<p><strong>Pump Services</strong></p>{{svc_pump}}
<p><strong>Pipeline Services</strong></p>{{svc_pipeline}}
<p><strong>E. Water Quality Management</strong></p>
<p><strong>Water Testing Coordination</strong></p>{{svc_testing_coord}}
<p><strong>Water Treatment Support</strong></p>{{svc_treatment}}
<p><strong>F. Annual Maintenance Contracts (AMC) — Residential AMC</strong></p>{{amc_residential}}
<p><strong>Commercial AMC</strong></p>{{amc_commercial}}

<h3>SCHEDULE B — Standard Service Price Schedule</h3>
<p>The standard service price schedule maintained by Seventh Sky. The agreed provider rate schedule for this engagement is set out below; the final approved Work Order price prevails for each project.</p>
{{provider_rate_schedule}}

<h3>SCHEDULE C — Insurance &amp; Licence Checklist</h3>
<p><strong>Business Documents</strong></p>
<ul><li>☐ Trade Licence</li><li>☐ Company Registration</li><li>☐ TIN</li><li>☐ BIN (if applicable)</li></ul>
<p><strong>Insurance — Mandatory</strong></p>{{insurance_mandatory}}
<p><strong>Insurance — Optional</strong></p>{{insurance_optional}}
<p><strong>Technical Licences / Certifications</strong></p>
<ul><li>☐ Trade Licence for Water Tank Cleaning &amp; Maintenance Services (where required)</li><li>☐ Water Quality Testing Accreditation (where applicable)</li><li>☐ Public Health / Environmental Compliance Certification (where applicable)</li></ul>

<h3>SCHEDULE D — Work Order Summary</h3>
<p>Each Work Order issued under this Agreement should include:</p>
<ul><li>Work Order Number</li><li>Client Name</li><li>Property Address</li><li>Service Category</li><li>Scope of Work</li><li>Materials</li><li>Equipment</li><li>Timeline</li><li>Project Value</li><li>Payment Schedule</li><li>Warranty Period</li><li>Special Conditions</li><li>Variation Approval</li><li>Completion Date</li><li>Client Acceptance</li><li>Seventh Sky Approval</li><li>Service Provider Acceptance</li></ul>

<h3>Execution</h3>
<p>Executed by the Parties as of the Effective Date. This Agreement may be signed electronically; the electronic record, audit trail and content hash constitute proof of execution.</p>
<p><strong>SIGNED FOR SEVENTH SKY</strong><br/>Name: {{ss_rep_name}}<br/>Position: {{ss_rep_position}}<br/>Phone: {{ss_rep_phone}}<br/>Email: {{ss_rep_email}}<br/>Signature: __________________<br/>Date: __________</p>
<p><strong>SIGNED FOR SERVICE PROVIDER</strong><br/>Business Name: {{sp_business_name}}<br/>Representative: {{sp_rep_name}}<br/>Position: {{sp_rep_position}}<br/>Phone: {{sp_rep_phone}}<br/>Email: {{sp_rep_email}}<br/>Signature: __________________<br/>Date: __________</p>
<p><strong>WITNESS 1</strong><br/>Name: {{witness1_name}}<br/>NID: {{witness1_nid}}<br/>Signature: __________________<br/>Date: __________</p>
<p><strong>WITNESS 2</strong><br/>Name: {{witness2_name}}<br/>NID: {{witness2_nid}}<br/>Signature: __________________<br/>Date: __________</p>
`;

(async () => {
  try {
    await sequelize.authenticate();
    const existing = await AgreementTemplate.findOne({ where: { name: NAME } });
    const payload = {
      name: NAME, category: 'provider_master', vertical: 'water_tank', status: 'active',
      description: 'Service Provider Master Agreement V0.2 (25 clauses + Schedules A–D) — checkbox service/insurance selection + provider KYC intake.',
      content_html: CONTENT_HTML, fields: FIELDS, signers: SIGNERS,
      source_filename: 'Water Tank CM - Service Provider Master Agreement - V0.2.docx',
    };
    if (existing) { await existing.update(payload); console.log(`✓ Updated template #${existing.id} "${NAME}" (${FIELDS.length} fields, ${FIELDS.filter((f) => f.type === 'checkbox_group').length} checkbox groups)`); }
    else { const t = await AgreementTemplate.create(payload); console.log(`✓ Created template #${t.id} "${NAME}"`); }
    process.exit(0);
  } catch (e) { console.error('✗ Seed failed:', e.message); process.exit(1); }
})();
