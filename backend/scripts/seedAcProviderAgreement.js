/**
 * Seeds (or refreshes) the Air Conditioning Solutions — Service Delivery Provider
 * Master Agreement (SSPC-ACS-SDPMA-01 v0.2, 25 clauses + Schedules A–D) for the
 * Agreement Builder + provider KYC intake. Wording reproduced from the client's
 * document — DO NOT reword. Service categories (Clause 4 / Schedule A) and the
 * insurance/licence checklist (Schedule C) are `checkbox_group` fields; fill
 * blanks are text fields. Uses the SAME field keys and {{placeholders}} as the
 * Water Tank template so the shared provider-agreement builder renders it
 * unchanged. Idempotent by (category, vertical). Run from backend dir:
 *   node scripts/seedAcProviderAgreement.js
 */
require('dotenv').config();
const sequelize = require('../config/db.config');
const AgreementTemplate = require('../models/AgreementTemplate');

const NAME = 'Air Conditioning Solutions — Service Provider Master Agreement';
const VERTICAL = 'air_conditioning'; // the service-line key the builder selects by

const F = (key, label, type, group, extra = {}) => ({ key, label, type, group, required: extra.required !== false, ...extra });
const CG = (key, label, group, options) => F(key, label, 'checkbox_group', group, { options, required: false });

const FIELDS = [
  // Term & Notice
  F('commencement_date', 'Commencement Date (Clause 3)', 'date', 'Term & Notice', { required: false }),
  F('agreement_term', 'Agreement Term', 'text', 'Term & Notice', { required: false, default: 'Twelve (12) Months' }),
  F('notice_period', 'Termination / Notice Period', 'text', 'Term & Notice', { required: false, default: 'Thirty (30) Days' }),

  // Commission & Fees
  F('commission_pct', 'Seventh Sky Commission (% of Service Provider charges)', 'percentage', 'Commission & Fees', { required: false }),
  F('ss_fee_notes', 'Seventh Sky Fees / Payment Terms (notes)', 'textarea', 'Commission & Fees', { required: false }),
  F('payment_model', 'Payment Model', 'select', 'Commission & Fees', { required: false, options: ['Project Based', 'AMC', 'Emergency / Call-Out'] }),
  F('payout_trigger', 'Provider Payout Trigger', 'select', 'Commission & Fees', { required: false, options: ['Completion Verified', 'Client Payment Received', 'Approved Milestone'] }),
  F('payment_due_days', 'Payment Due After Trigger (Days)', 'number', 'Commission & Fees', { required: false, default: '7' }),

  // Service Provider Account Details (provider fills on intake)
  F('sp_account_name', 'Account Holder Name', 'text', 'Provider Account Details', { required: false, signer_fill: true }),
  F('sp_bank_name', 'Bank Name', 'text', 'Provider Account Details', { required: false, signer_fill: true }),
  F('sp_bank_branch', 'Branch', 'text', 'Provider Account Details', { required: false, signer_fill: true }),
  F('sp_account_number', 'Account Number', 'text', 'Provider Account Details', { required: false, signer_fill: true }),
  F('sp_routing_number', 'Routing Number', 'text', 'Provider Account Details', { required: false, signer_fill: true }),
  F('sp_mobile_banking', 'bKash / Nagad (mobile banking)', 'text', 'Provider Account Details', { required: false, signer_fill: true }),

  // Clause 4 — Authorised Services (Schedule A)
  CG('svc_consultation', 'Consultation', 'Service Categories', ['Residential Consultation', 'Commercial Consultation']),
  CG('svc_installation', 'Installation', 'Service Categories', ['Residential Installation', 'Commercial Installation', 'Split Systems', 'Inverter Systems', 'Multi-Zone Systems']),
  CG('svc_relocation', 'Relocation', 'Service Categories', ['Residential Relocation', 'Commercial Relocation']),
  CG('svc_maintenance', 'Maintenance & Repairs', 'Service Categories', ['Preventive Maintenance', 'Corrective Maintenance', 'Repairs', 'Component Replacement']),
  CG('svc_cleaning', 'Cleaning', 'Service Categories', ['Standard Cleaning', 'Deep Cleaning']),
  CG('svc_refrigerant', 'Refrigerant Services', 'Service Categories', ['Gas Refill', 'Leak Detection', 'Pressure Testing']),
  CG('svc_other', 'Contracts, Smart & Emergency', 'Service Categories', ['Annual Maintenance Contract (AMC)', 'Smart Climate Control Solutions', 'Emergency Services']),

  // Schedule C — Insurance & Licence Checklist
  CG('docs_business', 'Business Documents', 'Insurance & Licences', ['Trade Licence', 'Company Registration', 'TIN', 'BIN (if applicable)']),
  CG('insurance_mandatory', 'Insurance', 'Insurance & Licences', ['Public Liability', 'Workers’ Compensation (where applicable)', 'Employer Liability (where applicable)', 'Motor Vehicle Insurance (if applicable)', 'Professional Indemnity (if applicable)']),
  CG('technical_licences', 'Technical Licences / Certifications', 'Insurance & Licences', ['Applicable Technical Licence(s)', 'Manufacturer Accreditation (if applicable)', 'Electrical Competency', 'Refrigerant Handling Competency']),

  // Authorised Representatives
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
<h1 style="text-align:center">Air Conditioning Solutions — Service Delivery Provider Master Agreement</h1>

<h3>1. Purpose</h3>
<p>The purpose of this Agreement is to establish the terms under which the Service Provider may deliver Air Conditioning Solutions to clients referred by Seventh Sky. This Agreement sets out the Parties' respective responsibilities, commercial arrangements, service standards and legal obligations. Individual client engagements will be governed by separate Work Orders issued under this Agreement.</p>

<h3>2. Appointment</h3>
<p>Seventh Sky appoints the Service Provider as a non-exclusive independent service delivery partner. Nothing in this Agreement:</p>
${ul(['guarantees any minimum volume of work;', 'prevents either Party from engaging with other businesses; or', 'creates an employment, partnership, joint venture or agency relationship.'])}

<h3>3. Term</h3>
<p>This Agreement commences on ${V('commencement_date')} and continues for ${V('agreement_term')}, unless terminated earlier in accordance with this Agreement. Unless either Party provides at least ${V('notice_period')} written notice, this Agreement will automatically renew for successive twelve-month periods.</p>

<h3>4. Services</h3>
<p>The Service Provider may be engaged to provide one or more of the following services as specified in a Work Order. Only services selected in the applicable Work Order form part of the Service Provider's engagement. Additional services may be added by written agreement without replacing this Master Agreement.</p>
<p><strong>A. Consultation</strong></p>${V('svc_consultation')}
<p><strong>B. Installation</strong></p>${V('svc_installation')}
<p><strong>C. Relocation</strong></p>${V('svc_relocation')}
<p><strong>D. Maintenance &amp; Repairs</strong></p>${V('svc_maintenance')}
<p><strong>E. Cleaning</strong></p>${V('svc_cleaning')}
<p><strong>F. Refrigerant Services</strong></p>${V('svc_refrigerant')}
<p><strong>G–I. Annual Maintenance Contracts, Smart Climate Control &amp; Emergency Services</strong></p>${V('svc_other')}

<h3>5. Work Orders</h3>
<p>Each client project shall be managed under a separate Work Order issued by Seventh Sky. A Work Order may include client details, property address, selected services, scope of work, project timeline, agreed pricing, payment schedule, warranty period, special requirements and any approved variations. If a Work Order conflicts with this Agreement, the Work Order will prevail only for that specific project.</p>

<h3>6. Responsibilities of the Parties</h3>
<p><strong>Seventh Sky</strong> is responsible for:</p>
${ul(['client acquisition and marketing;', 'quotations and service coordination;', 'client communication;', 'project administration;', 'work order management;', 'payment coordination;', 'quality monitoring; and', 'overall client relationship management.'])}
<p><strong>The Service Provider</strong> is responsible for:</p>
${ul(['performing the contracted services;', 'supplying competent personnel;', 'complying with all applicable laws and industry standards;', 'providing required tools and equipment unless otherwise agreed;', 'maintaining licences and insurance;', 'ensuring work quality and safety;', 'rectifying defective workmanship; and', 'completing work within agreed timeframes.'])}
<p>The Service Provider remains solely responsible for the quality and compliance of all technical work performed.</p>

<h3>7. Licensing, Compliance &amp; Insurance</h3>
<p>The Service Provider must, throughout the Agreement, hold and maintain all licences, permits, registrations and approvals required to perform the Services; comply with all applicable laws, regulations, codes and industry standards in Bangladesh; maintain appropriate insurance applicable to its business and services; and immediately notify Seventh Sky of any suspension, cancellation, investigation or material breach affecting its ability to perform the Services. Evidence of licences or insurance must be provided upon request.</p>

<h3>8. Service Delivery Standards</h3>
<p>The Service Provider shall perform all Services professionally, safely and competently; using suitably qualified personnel; in accordance with manufacturer recommendations (where applicable); within the agreed timeframe; with reasonable care and skill; and in compliance with the relevant Work Order. The Service Provider shall protect the Client's property, maintain a clean and safe worksite, promptly report delays, safety incidents or unexpected site conditions, and complete all agreed inspections, testing and commissioning before project completion.</p>

<h3>9. Personnel &amp; Subcontracting</h3>
<p>The Service Provider is responsible for the conduct, competency and supervision of all employees, subcontractors and representatives engaged to perform the Services. No subcontracting of a Work Order is permitted without prior written approval from Seventh Sky. Approval to subcontract does not release the Service Provider from its obligations under this Agreement.</p>

<h3>10. Safety, Quality &amp; Warranties</h3>
<p>The Service Provider shall maintain appropriate quality control and workplace safety procedures throughout the project, including complying with workplace health and safety requirements; using suitable tools, equipment and materials; ensuring workmanship meets accepted industry standards; correcting defective workmanship at its own cost; and providing any applicable manufacturer and workmanship warranties. Warranty periods applicable to a project shall be specified in the relevant Work Order.</p>

<h3>11. Documentation &amp; Records</h3>
<p>The Service Provider shall provide all documents reasonably required for the Services, including where applicable site assessments, quotations, service reports, installation or maintenance reports, testing and commissioning records, warranty documents, completion certificates, photographs, and any documents required by law or requested by Seventh Sky. Business records relating to Services performed under this Agreement must be retained for at least seven (7) years, or longer where required by law.</p>

<h3>12. Service Fees &amp; Payment</h3>
<p>Each Work Order will specify the agreed commercial arrangements, including services to be provided, agreed pricing, labour charges, material costs, payment milestones, approved variations, taxes and government charges (where applicable) and payment terms. Unless otherwise agreed in writing, the Service Provider will only be paid for Services approved under a Work Order; additional work requires prior approval; invoices must accurately reflect completed work; and payments are subject to the agreed Work Order and supporting documentation. The Service Provider is responsible for its own taxation, employee payments and statutory obligations.</p>
<p><strong>Seventh Sky Commission:</strong> Seventh Sky's commission on Service Provider charges under this Agreement is ${V('commission_pct')}%. ${V('ss_fee_notes')}</p>
<p><strong>Service Provider Account Details (for settlement of approved payments — completed by the Service Provider):</strong><br/>
Account Holder Name: ${V('sp_account_name')}<br/>Bank Name: ${V('sp_bank_name')}<br/>Branch: ${V('sp_bank_branch')}<br/>
Account Number: ${V('sp_account_number')}<br/>Routing Number: ${V('sp_routing_number')}<br/>bKash / Nagad: ${V('sp_mobile_banking')}</p>

<h3>13. Standard Service Price Schedule</h3>
<p>The Parties acknowledge that Seventh Sky maintains a Standard Service Price Schedule within its CRM (set out in <b>Schedule B</b>). The Price Schedule serves as the standard pricing guide for quotations, agreements and Work Orders and may be updated by Seventh Sky from time to time. Unless otherwise agreed in writing, the applicable pricing for each project shall be confirmed in the relevant Work Order; discounts, negotiated pricing or promotional pricing may apply; and the final approved Work Order price shall prevail over the Standard Service Price Schedule.</p>

<h3>14. Liability &amp; Indemnity</h3>
<p>Each Party is responsible for its own acts, omissions, negligence and breaches of this Agreement. The Service Provider shall be responsible for any loss, damage, injury, claim or expense arising from defective workmanship, negligent acts or omissions, failure to comply with applicable laws or regulations, unsafe work practices, or breach of this Agreement. The Service Provider agrees to indemnify and hold harmless Seventh Sky against claims, losses, damages, costs and liabilities arising from the Service Provider's negligence, misconduct or breach of this Agreement, except to the extent caused by Seventh Sky.</p>

<h3>15. Client Claims, Warranties &amp; Defects</h3>
<p>The Service Provider shall promptly investigate and respond to any client complaint relating to Services performed under this Agreement. Where a defect is caused by the Service Provider's workmanship, materials or negligence, the Service Provider shall rectify the defect at its own cost within a reasonable timeframe. Manufacturer warranties remain the responsibility of the relevant manufacturer or supplier unless otherwise agreed. The Service Provider shall reasonably assist Seventh Sky in resolving warranty claims and client complaints.</p>

<h3>16. Confidentiality &amp; Data Protection</h3>
<p>Each Party shall keep confidential all non-public business, commercial and client information obtained during this Agreement. Confidential information shall only be used for the purposes of performing this Agreement and shall not be disclosed to any third party unless required by law, authorised in writing by the other Party, or reasonably required to perform the Services. The Service Provider shall take reasonable measures to protect all client information from unauthorised access, use or disclosure. These obligations continue after termination of this Agreement.</p>

<h3>17. Intellectual Property</h3>
<p>All business systems, templates, forms, procedures, branding, marketing materials, CRM data, documents and intellectual property owned or developed by Seventh Sky remain the exclusive property of Seventh Sky. The Service Provider shall not copy, modify, distribute or use Seventh Sky's intellectual property except for the purpose of performing authorised Services.</p>

<h3>18. Client Protection &amp; Non-Circumvention</h3>
<p>Clients introduced or assigned by Seventh Sky remain clients of Seventh Sky. During this Agreement and for twenty-four (24) months after its termination, the Service Provider shall not, without Seventh Sky's prior written consent:</p>
${ul(['directly solicit or contract with a client introduced by Seventh Sky;', 'divert business opportunities intended for Seventh Sky;', 'bypass Seventh Sky to avoid agreed fees or commissions; or', 'use another person or entity to achieve the same outcome.'])}
<p>Nothing in this clause prevents the Service Provider from working with clients who had an established business relationship with the Service Provider before introduction by Seventh Sky, provided that relationship can be reasonably demonstrated.</p>

<h3>19. Exclusive Service Area (If Applicable)</h3>
<p>Where the Parties agree to an exclusive operating area, the Service Provider shall not independently market or provide competing services within that area without Seventh Sky's written approval. If no exclusive area is specified in a Work Order or Schedule, this clause does not apply. Any agreed exclusive area (for example, Cumilla District) is recorded in the applicable Work Order or Schedule.</p>

<h3>20. Force Majeure</h3>
<p>Neither Party shall be liable for delays or failure to perform caused by events beyond its reasonable control, including natural disasters, war, civil unrest, government restrictions, pandemics, major utility failures or other unforeseen events. The affected Party shall notify the other Party as soon as reasonably practicable and resume performance when the event ends.</p>

<h3>21. Dispute Resolution</h3>
<p>The Parties shall attempt to resolve any dispute in the following order: good faith discussions between authorised representatives; senior management negotiations; mediation, where agreed; then the courts of Bangladesh or any other dispute resolution process agreed by the Parties. The Parties shall continue performing their obligations, where reasonably possible, while a dispute is being resolved.</p>

<h3>22. Suspension &amp; Termination</h3>
<p><strong>Suspension.</strong> Seventh Sky may suspend a Work Order or this Agreement immediately where the Service Provider fails to maintain required licences or insurance, commits a material breach, performs unsafe or defective work, breaches applicable laws or regulations, fails to meet agreed service standards, or where suspension is reasonably necessary to protect the Client, Seventh Sky or the public. Where practicable, Seventh Sky will provide written notice of the reason for suspension.</p>
<p><strong>Termination.</strong> Either Party may terminate this Agreement by giving thirty (30) days' written notice. Either Party may terminate immediately if the other commits an unremedied material breach, becomes insolvent or ceases business, engages in fraud, illegal conduct or serious misconduct, or no longer holds the licences or approvals required to perform the Services. Termination does not affect any rights or obligations that arose before the termination date.</p>

<h3>23. General Provisions</h3>
<p>Unless otherwise agreed in writing, this Agreement constitutes the entire agreement between the Parties; amendments must be made in writing and signed by both Parties; failure to enforce a provision does not waive any legal rights; if any provision is found to be invalid or unenforceable, the remaining provisions continue in full force; and notices under this Agreement must be provided in writing by hand, courier, post or electronic mail.</p>

<h3>24. Governing Law</h3>
<p>This Agreement shall be governed by the laws of the People's Republic of Bangladesh. The Parties submit to the jurisdiction of the competent courts of Bangladesh unless they mutually agree to resolve a dispute by arbitration or another recognised alternative dispute resolution process.</p>

<h3>25. Execution</h3>
<p>The Parties acknowledge that they have read and understood this Agreement, have had the opportunity to obtain independent legal advice, enter into this Agreement voluntarily, and agree to be legally bound by its terms.</p>
<p><strong>SIGNED FOR SEVENTH SKY</strong><br/>Name: ${V('ss_rep_name')}<br/>Position: ${V('ss_rep_position')}<br/>Signature: __________________<br/>Date: __________</p>
<p><strong>SIGNED FOR SERVICE PROVIDER</strong><br/>Business Name: ${V('sp_business_name')}<br/>Representative: ${V('sp_rep_name')}<br/>Position: ${V('sp_rep_position')}<br/>Signature: __________________<br/>Date: __________</p>
<p><strong>WITNESS 1</strong><br/>Name: ${V('witness1_name')}<br/>NID: ${V('witness1_nid')}<br/>Signature: __________________<br/>Date: __________</p>
<p><strong>WITNESS 2</strong><br/>Name: ${V('witness2_name')}<br/>NID: ${V('witness2_nid')}<br/>Signature: __________________<br/>Date: __________</p>

<h3>Schedule A – Authorised Services</h3>
<p>(The services selected under Clause 4 form the Service Provider's authorised scope, ticked exactly as selected.)</p>

<h3>Schedule B – Standard Price Schedule</h3>
<p>The Standard Price Schedule is maintained within Seventh Sky's CRM. The agreed price for each project shall be confirmed in the applicable Work Order.</p>
${V('provider_rate_schedule')}

<h3>Schedule C – Insurance &amp; Licence Checklist</h3>
<p><strong>Business Documents</strong></p>${V('docs_business')}
<p><strong>Insurance</strong></p>${V('insurance_mandatory')}
<p><strong>Technical Licences / Certifications</strong></p>${V('technical_licences')}

<h3>Schedule D – Work Order Summary</h3>
<p>Each Work Order should include:</p>
${ul(['Work Order Number', 'Client Name', 'Property Address', 'Service Category', 'Scope of Work', 'Materials', 'Equipment', 'Timeline', 'Project Value', 'Payment Schedule', 'Warranty Period', 'Special Conditions', 'Variation Approval', 'Completion Date', 'Client Acceptance', 'Seventh Sky Approval', 'Service Provider Acceptance'])}

<p style="text-align:center;margin-top:18px"><strong>END OF MASTER SERVICE DELIVERY PROVIDER AGREEMENT</strong></p>
`;

(async () => {
  try {
    await sequelize.authenticate();
    const existing = await AgreementTemplate.findOne({ where: { category: 'provider_master', vertical: VERTICAL } });
    const payload = {
      name: NAME, category: 'provider_master', vertical: VERTICAL, status: 'active',
      description: 'Air Conditioning Solutions Service Provider Master Agreement (SSPC-ACS-SDPMA-01 v0.2) — 25 clauses + Schedules A–D, checkbox service/insurance selection + provider KYC intake.',
      content_html: CONTENT_HTML, fields: FIELDS, signers: SIGNERS,
      source_filename: 'Air Conditioning Solutions - Service Provider Master Agreement - V0.2.docx',
    };
    if (existing) { await existing.update(payload); console.log(`✓ Updated template #${existing.id} "${NAME}" (${FIELDS.length} fields, ${FIELDS.filter((f) => f.type === 'checkbox_group').length} checkbox groups)`); }
    else { const t = await AgreementTemplate.create(payload); console.log(`✓ Created template #${t.id} "${NAME}"`); }
    process.exit(0);
  } catch (e) { console.error('✗ Seed failed:', e.message); process.exit(1); }
})();
