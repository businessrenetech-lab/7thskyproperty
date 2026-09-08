/**
 * Seeds (or refreshes) the Survey & Valuation Services — Service Delivery Provider
 * Master Agreement (SSPC-SVS-SDPMA-01 v0.2, 24 clauses + Schedules A–D) for the
 * Agreement Builder + provider KYC intake. Wording reproduced from the client's
 * document — DO NOT reword. Service categories (Clause 4 / Schedule A) and the
 * licence/insurance checklist (Schedule C) are `checkbox_group` fields; fill
 * blanks are text fields. Uses the SAME field keys and {{placeholders}} as the
 * Water Tank / Air Conditioning templates so the shared provider-agreement builder
 * renders it unchanged. Idempotent by (category, vertical). Run from backend dir:
 *   node scripts/seedLpaProviderAgreement.js
 */
require('dotenv').config();
const sequelize = require('../config/db.config');
const AgreementTemplate = require('../models/AgreementTemplate');

const NAME = 'Survey & Valuation Services — Service Provider Master Agreement';
const VERTICAL = 'land_property_assessment'; // the service-line key the builder selects by

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
  F('payment_model', 'Payment Model', 'select', 'Commission & Fees', { required: false, options: ['Project Based', 'Milestone / Multi-Stage', 'Retainer'] }),
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
  CG('svc_land_survey', 'Land Survey Services', 'Service Categories', ['Boundary Survey', 'Cadastral Survey', 'Topographic Survey', 'Contour Survey', 'Construction / Engineering Survey', 'Subdivision Survey', 'GIS / Digital Mapping', 'Drone Survey', 'Utility Mapping']),
  CG('svc_valuation', 'Property Valuation Services', 'Service Categories', ['Residential Valuation', 'Commercial Valuation', 'Industrial Valuation', 'Agricultural Valuation', 'Land Valuation', 'Rental Assessment', 'Insurance Valuation', 'Mortgage / Investment Valuation', 'Development Site Valuation']),
  CG('svc_technical', 'Technical Property Services', 'Service Categories', ['Property Condition Assessment', 'Due Diligence Inspection', 'Site Verification', 'Measurement Verification', 'Technical Property Report', 'Pre-purchase Inspection']),
  CG('svc_nrb', 'NRB Property Support Services', 'Service Categories', ['Remote Property Inspection', 'Property Verification', 'Video Inspection Report', 'Construction Progress Inspection', 'Property Monitoring']),

  // Schedule C — Licence & Insurance Checklist
  CG('docs_business', 'Business Documents', 'Licences & Insurance', ['Trade Licence', 'Company Registration', 'TIN / BIN', 'Professional Registration']),
  CG('insurance_mandatory', 'Insurance', 'Licences & Insurance', ['Professional Indemnity Insurance', 'Public Liability Insurance', 'Workers’ Compensation (where applicable)', 'Other Relevant Insurance']),
  CG('technical_licences', 'Professional / Technical Registrations', 'Licences & Insurance', ['Licensed Surveyor Registration', 'Certified Valuer Registration', 'Engineering Council Membership', 'Other Relevant Licences']),

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
<h1 style="text-align:center">Survey & Valuation Services — Service Delivery Provider Master Agreement</h1>

<h3>1. Purpose</h3>
<p>This Agreement sets out the terms under which the Service Provider delivers Survey &amp; Valuation Services for clients referred by Seventh Sky. It establishes the Parties' responsibilities, service standards, commercial terms and legal obligations. Individual projects will be managed under separate Work Orders.</p>

<h3>2. Appointment</h3>
<p>Seventh Sky appoints the Service Provider as a non-exclusive independent contractor to provide Survey &amp; Valuation Services. Nothing in this Agreement:</p>
${ul(['guarantees a minimum volume of work;', 'restricts either Party from working with others; or', 'creates an employment, partnership, joint venture or agency relationship.'])}

<h3>3. Term</h3>
<p>This Agreement commences on ${V('commencement_date')} and continues for ${V('agreement_term')}, unless terminated earlier under this Agreement. It will automatically renew for further twelve-month terms unless either Party gives at least ${V('notice_period')} written notice.</p>

<h3>4. Services</h3>
<p>The Service Provider may provide the services approved by Seventh Sky and specified in the relevant Work Order. Only services selected in the applicable Work Order form part of the Service Provider's engagement. Additional services may be approved by Seventh Sky from time to time.</p>
<p><strong>A. Land Survey Services</strong></p>${V('svc_land_survey')}
<p><strong>B. Property Valuation Services</strong></p>${V('svc_valuation')}
<p><strong>C. Technical Property Services</strong></p>${V('svc_technical')}
<p><strong>D. NRB Property Support Services</strong></p>${V('svc_nrb')}

<h3>5. Work Orders</h3>
<p>Each project shall be undertaken under a separate Work Order issued by Seventh Sky. A Work Order may specify client and property details, scope of services, deliverables, project timeframe, fees and payment terms, and any special requirements. Where there is any inconsistency, the Work Order prevails for that project.</p>

<h3>6. Responsibilities of the Parties</h3>
<p><strong>Seventh Sky</strong> will:</p>
${ul(['source and manage clients;', 'prepare quotations and Customer Service Agreements;', 'issue Work Orders;', 'coordinate project delivery;', 'manage client communications;', 'monitor service quality; and', 'process payments to the Service Provider.'])}
<p><strong>The Service Provider</strong> will:</p>
${ul(['perform the Services professionally and in accordance with the Work Order;', 'maintain all required licences, registrations and insurance;', 'provide suitably qualified personnel and equipment;', 'comply with applicable laws and professional standards;', 'protect client property and confidential information;', 'promptly report delays, safety issues or defects; and', 'rectify any defects arising from its work at its own cost.'])}
<p>The Service Provider remains responsible for the quality, accuracy and professional integrity of all services, reports and advice provided under this Agreement.</p>

<h3>7. Professional Requirements</h3>
<p>The Service Provider shall, at all times, maintain all licences, registrations and approvals required to provide the Services; comply with applicable laws, regulations and recognised professional standards; maintain appropriate insurance relevant to the Services; and immediately notify Seventh Sky of any suspension, cancellation or material change affecting its ability to perform the Services. Evidence of licences or insurance shall be provided upon request.</p>

<h3>8. Service Delivery Standards</h3>
<p>The Service Provider shall perform the Services with reasonable skill, care and professionalism; comply with the relevant Work Order; use suitable personnel, equipment and technology; complete the Services within the agreed timeframe; protect the Client's property; maintain accurate records and supporting evidence; and promptly notify Seventh Sky of any delay, safety issue or circumstance affecting service delivery. Where a site inspection is required, the Service Provider shall carry out all necessary inspections, measurements and observations required to complete the Services and prepare an accurate professional report.</p>

<h3>9. Personnel &amp; Subcontracting</h3>
<p>The Service Provider is responsible for ensuring that its employees, contractors and approved subcontractors are suitably qualified and competent, comply with this Agreement, maintain confidentiality and perform the Services safely and professionally. The Service Provider shall not subcontract any material part of the Services without Seventh Sky's prior written approval and remains fully responsible for all work performed.</p>

<h3>10. Reports &amp; Records</h3>
<p>The Service Provider shall prepare and submit all reports required under the relevant Work Order, including survey reports, valuation reports, inspection reports or other technical reports. Reports shall be accurate, complete and supported by appropriate evidence where applicable. The Service Provider shall retain project records for at least seven (7) years, or longer if required by law.</p>

<h3>11. Service Fees &amp; Payment</h3>
<p>The Service Provider will be paid the fees agreed in the relevant Work Order. Unless otherwise agreed, fees are exclusive of applicable taxes; payment will be made following completion of the Services and receipt of a valid tax invoice; variations require prior written approval; and Seventh Sky may withhold payment for incomplete or non-compliant Services until rectified. Unless stated otherwise in the Work Order, the Service Provider is responsible for its own labour, equipment, transport, licences, insurance and operating expenses.</p>
<p><strong>Seventh Sky Commission:</strong> Seventh Sky's commission on Service Provider charges under this Agreement is ${V('commission_pct')}%. ${V('ss_fee_notes')}</p>
<p><strong>Service Provider Account Details (for settlement of approved payments — completed by the Service Provider):</strong><br/>
Account Holder Name: ${V('sp_account_name')}<br/>Bank Name: ${V('sp_bank_name')}<br/>Branch: ${V('sp_bank_branch')}<br/>
Account Number: ${V('sp_account_number')}<br/>Routing Number: ${V('sp_routing_number')}<br/>bKash / Nagad: ${V('sp_mobile_banking')}</p>

<h3>12. Standard Service Price Schedule</h3>
<p>The Parties acknowledge that the Standard Service Price Schedule (<b>Schedule B</b>) provides the standard pricing framework for Survey &amp; Valuation Services. The fees specified in an approved Work Order will prevail over the Standard Service Price Schedule where they differ. Seventh Sky may review and update the Standard Service Price Schedule from time to time.</p>

<h3>13. Liability &amp; Indemnity</h3>
<p>The Service Provider is responsible for any loss, damage or expense arising from negligence or misconduct, breach of this Agreement, failure to comply with applicable laws or professional standards, or acts or omissions of its employees, contractors or approved subcontractors. The Service Provider shall promptly rectify, at its own cost, any defects or errors resulting from its work. The Service Provider indemnifies Seventh Sky against any claims, losses, liabilities or expenses arising from its negligence, breach of this Agreement or unlawful acts, to the extent permitted by law.</p>

<h3>14. Warranties &amp; Client Complaints</h3>
<p>The Service Provider warrants that the Services will be performed by suitably qualified personnel, completed with reasonable skill, care and professionalism, compliant with the applicable Work Order, and prepared in accordance with recognised professional standards. If a Client raises a complaint regarding the Services, the Service Provider shall promptly investigate the matter and, where responsible, rectify the issue or provide an amended report at no additional cost. The Service Provider shall cooperate with Seventh Sky in resolving client complaints.</p>

<h3>15. Confidentiality</h3>
<p>Each Party shall keep confidential all business, commercial and client information obtained through this Agreement and use it only for the purposes of performing the Services. Neither Party shall disclose confidential information without the other Party's written consent, except where required by law. The Service Provider shall take reasonable steps to protect confidential information from unauthorised access, use or disclosure. These obligations continue after termination of this Agreement.</p>

<h3>16. Intellectual Property</h3>
<p>All templates, forms, procedures, branding, CRM systems and operational documents supplied by Seventh Sky remain the property of Seventh Sky. The Service Provider retains ownership of its pre-existing intellectual property. Upon payment of the agreed fees, Seventh Sky may use reports, plans, drawings, survey data and other project deliverables for the purpose for which they were commissioned.</p>

<h3>17. Client Protection &amp; Non-Circumvention</h3>
<p>The Service Provider shall not, without Seventh Sky's prior written consent, directly accept work from clients introduced by Seventh Sky outside this Agreement, encourage clients to bypass Seventh Sky, or use client information for personal or commercial benefit. This restriction applies during the Term of this Agreement and for twelve (12) months after its termination. This clause does not apply to clients with whom the Service Provider had an established business relationship before being introduced by Seventh Sky.</p>

<h3>18. Exclusive Service Area (If Applicable)</h3>
<p>Unless otherwise agreed in writing, this Agreement does not grant the Service Provider any exclusive service area. Seventh Sky may appoint other Service Providers based on availability, capability, pricing, service quality and client requirements. Where an exclusive service area is agreed, the details shall be recorded in the relevant Work Order or a separate written agreement.</p>

<h3>19. Force Majeure</h3>
<p>Neither Party shall be liable for any delay or failure to perform its obligations due to circumstances beyond its reasonable control. The affected Party shall promptly notify the other Party and resume performance as soon as reasonably practicable. If the event continues for more than sixty (60) days, either Party may terminate the affected Work Order by written notice.</p>

<h3>20. Dispute Resolution</h3>
<p>The Parties shall first attempt to resolve any dispute through good faith discussions. If the dispute remains unresolved within fourteen (14) days, the Parties may refer the matter to mediation before commencing legal proceedings, unless urgent court action is required.</p>

<h3>21. Suspension &amp; Termination</h3>
<p><strong>Suspension.</strong> Seventh Sky may suspend this Agreement or any Work Order where the Service Provider breaches this Agreement, fails to maintain required licences or insurance, fails to meet agreed service standards, poses a safety or compliance risk, or is suspected of fraudulent or unlawful conduct. During suspension, Seventh Sky may appoint another Service Provider to complete the Services.</p>
<p><strong>Termination.</strong> Either Party may terminate this Agreement by written notice where the other Party commits a material breach and fails to remedy it within fourteen (14) days; becomes insolvent or ceases business; the Service Provider loses a required licence or registration; a Force Majeure event continues beyond sixty (60) days; or both Parties agree in writing. Termination does not affect Work Orders already in progress unless otherwise agreed.</p>
<p><strong>Effect of Termination.</strong> Upon termination, completed Services will be paid in accordance with this Agreement; confidential information shall be returned or securely destroyed upon request; all outstanding project documents shall be provided to Seventh Sky; and clauses relating to confidentiality, intellectual property, liability and dispute resolution shall survive termination.</p>

<h3>22. General Provisions</h3>
<p>This Agreement constitutes the entire agreement between the Parties and supersedes all previous discussions relating to its subject matter. Any amendment must be made in writing and signed by both Parties. If any provision is held to be invalid or unenforceable, the remaining provisions will continue in full force. Neither Party may assign this Agreement without the other Party's written consent, except where required by law. Electronic signatures are deemed to have the same legal effect as original signatures.</p>

<h3>23. Governing Law</h3>
<p>This Agreement is governed by the laws of the People's Republic of Bangladesh, and the Parties submit to the jurisdiction of the competent courts of Bangladesh.</p>

<h3>24. Execution</h3>
<p>By signing this Agreement, the Parties confirm that they have read and understood this Agreement, agree to be bound by its terms, and warrant that the person signing is authorised to do so.</p>
<p><strong>SIGNED FOR SEVENTH SKY</strong><br/>Name: ${V('ss_rep_name')}<br/>Position: ${V('ss_rep_position')}<br/>Signature: __________________<br/>Date: __________</p>
<p><strong>SIGNED FOR SERVICE PROVIDER</strong><br/>Business Name: ${V('sp_business_name')}<br/>Representative: ${V('sp_rep_name')}<br/>Position: ${V('sp_rep_position')}<br/>Signature: __________________<br/>Date: __________</p>
<p><strong>WITNESS 1</strong><br/>Name: ${V('witness1_name')}<br/>NID: ${V('witness1_nid')}<br/>Signature: __________________<br/>Date: __________</p>
<p><strong>WITNESS 2</strong><br/>Name: ${V('witness2_name')}<br/>NID: ${V('witness2_nid')}<br/>Signature: __________________<br/>Date: __________</p>

<h3>Schedule A – Authorised Services</h3>
<p>(The services selected under Clause 4 form the Service Provider's authorised scope, ticked exactly as selected.)</p>

<h3>Schedule B – Standard Service Price Schedule</h3>
<p>The Standard Service Price Schedule is maintained within Seventh Sky's CRM. The agreed price for each project shall be confirmed in the applicable Work Order.</p>
${V('provider_rate_schedule')}

<h3>Schedule C – Licence &amp; Insurance Checklist</h3>
<p><strong>Business Documents</strong></p>${V('docs_business')}
<p><strong>Insurance</strong></p>${V('insurance_mandatory')}
<p><strong>Professional / Technical Registrations</strong></p>${V('technical_licences')}

<h3>Schedule D – Work Order Summary</h3>
<p>Each Work Order should include:</p>
${ul(['Work Order Number', 'Client Name', 'Property Address', 'Authorised Services', 'Scope of Work', 'Deliverables', 'Commencement Date', 'Completion Date', 'Service Fee', 'Special Conditions', 'Seventh Sky Approval', 'Service Provider Acceptance'])}

<p style="text-align:center;margin-top:18px"><strong>END OF MASTER SERVICE DELIVERY PROVIDER AGREEMENT</strong></p>
`;

(async () => {
  try {
    await sequelize.authenticate();
    const existing = await AgreementTemplate.findOne({ where: { category: 'provider_master', vertical: VERTICAL } });
    const payload = {
      name: NAME, category: 'provider_master', vertical: VERTICAL, status: 'active',
      description: 'Survey & Valuation Services Service Provider Master Agreement (SSPC-SVS-SDPMA-01 v0.2) — 24 clauses + Schedules A–D, checkbox service/insurance selection + provider KYC intake.',
      content_html: CONTENT_HTML, fields: FIELDS, signers: SIGNERS,
      source_filename: 'Survey and Valuation Services - Service Provider Master Agreement - V0.2.docx',
    };
    if (existing) { await existing.update(payload); console.log(`✓ Updated template #${existing.id} "${NAME}" (${FIELDS.length} fields, ${FIELDS.filter((f) => f.type === 'checkbox_group').length} checkbox groups)`); }
    else { const t = await AgreementTemplate.create(payload); console.log(`✓ Created template #${t.id} "${NAME}"`); }
    process.exit(0);
  } catch (e) { console.error('✗ Seed failed:', e.message); process.exit(1); }
})();
