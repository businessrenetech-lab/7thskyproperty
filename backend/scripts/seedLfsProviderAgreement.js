/**
 * Seeds (or refreshes) the Loan & Financial Support Services — Service Delivery
 * Provider Master Agreement (SSPC-LFSS-SDPMA-01 v0.2, Schedules A–D) for the
 * Agreement Builder + provider KYC intake. Wording reproduced from the client's
 * document. Service categories (Clause 4 / Schedule A) and the licence/insurance
 * checklist (Schedule C) are `checkbox_group` fields; fill blanks are text fields.
 * Uses the SAME field keys and {{placeholders}} as the other provider templates so
 * the shared builder renders it unchanged. Idempotent by (category, vertical).
 *   node scripts/seedLfsProviderAgreement.js
 */
require('dotenv').config();
const sequelize = require('../config/db.config');
const AgreementTemplate = require('../models/AgreementTemplate');

const NAME = 'Loan & Financial Support Services — Service Provider Master Agreement';
const VERTICAL = 'loan_financial_support';

const F = (key, label, type, group, extra = {}) => ({ key, label, type, group, required: extra.required !== false, ...extra });
const CG = (key, label, group, options) => F(key, label, 'checkbox_group', group, { options, required: false });

const FIELDS = [
  F('commencement_date', 'Commencement Date (Clause 3)', 'date', 'Term & Notice', { required: false }),
  F('agreement_term', 'Agreement Term', 'text', 'Term & Notice', { required: false, default: 'Twelve (12) Months' }),
  F('notice_period', 'Termination / Notice Period', 'text', 'Term & Notice', { required: false, default: 'Thirty (30) Days' }),

  F('commission_pct', 'Seventh Sky Commission (% of Service Provider charges)', 'percentage', 'Commission & Fees', { required: false }),
  F('ss_fee_notes', 'Seventh Sky Fees / Payment Terms (notes)', 'textarea', 'Commission & Fees', { required: false }),
  F('payment_model', 'Payment Model', 'select', 'Commission & Fees', { required: false, options: ['Case Based', 'Milestone', 'Retainer'] }),
  F('payout_trigger', 'Provider Payout Trigger', 'select', 'Commission & Fees', { required: false, options: ['Completion Verified', 'Client Payment Received', 'Approved Milestone'] }),
  F('payment_due_days', 'Payment Due After Trigger (Days)', 'number', 'Commission & Fees', { required: false, default: '7' }),

  F('sp_account_name', 'Account Holder Name', 'text', 'Provider Account Details', { required: false, signer_fill: true }),
  F('sp_bank_name', 'Bank Name', 'text', 'Provider Account Details', { required: false, signer_fill: true }),
  F('sp_bank_branch', 'Branch', 'text', 'Provider Account Details', { required: false, signer_fill: true }),
  F('sp_account_number', 'Account Number', 'text', 'Provider Account Details', { required: false, signer_fill: true }),
  F('sp_routing_number', 'Routing Number', 'text', 'Provider Account Details', { required: false, signer_fill: true }),
  F('sp_mobile_banking', 'bKash / Nagad (mobile banking)', 'text', 'Provider Account Details', { required: false, signer_fill: true }),

  CG('svc_loan', 'Loan & Mortgage Support Services', 'Service Categories', ['Home Loan Assistance', 'Investment Property Loan', 'Commercial Property Loan', 'Construction Loan', 'Mortgage Coordination', 'Loan Refinancing', 'Loan Documentation', 'Banking Liaison', 'Loan Settlement Coordination']),
  CG('svc_valuation', 'Property Valuation Coordination', 'Service Categories', ['Residential Valuation', 'Commercial Valuation', 'Industrial Valuation', 'Agricultural Valuation', 'Land Valuation', 'Mortgage Valuation', 'Independent Valuation', 'Valuation Report Review']),
  CG('svc_documentation', 'Financial Documentation Support', 'Service Categories', ['Financial Document Review', 'Income Verification', 'Asset & Liability Documentation', 'Loan Application Documentation', 'Supporting Documentation', 'Compliance Documentation']),
  CG('svc_nrb', 'NRB Financial Support', 'Service Categories', ['Overseas Client Coordination', 'Remote Documentation Support', 'Digital Verification', 'Financial Institution Liaison', 'Cross-Border Documentation Support']),

  CG('docs_business', 'Business Documents', 'Licences & Insurance', ['Trade Licence', 'Company Registration', 'TIN / BIN', 'Professional Registration']),
  CG('insurance_mandatory', 'Insurance', 'Licences & Insurance', ['Professional Indemnity Insurance', 'Public Liability Insurance', 'Other Relevant Insurance']),
  CG('technical_licences', 'Professional Registrations / Memberships', 'Licences & Insurance', ['Mortgage Broker Registration', 'Certified Valuer Registration', 'Financial Adviser Registration', 'Other Relevant Licences']),

  F('ss_rep_name', 'Seventh Sky Representative — Name', 'text', 'Authorised Representatives', { required: false }),
  F('ss_rep_position', 'Seventh Sky Representative — Position', 'text', 'Authorised Representatives', { required: false }),
  F('ss_rep_phone', 'Seventh Sky Representative — Phone', 'text', 'Authorised Representatives', { required: false }),
  F('ss_rep_email', 'Seventh Sky Representative — Email', 'text', 'Authorised Representatives', { required: false }),
  F('sp_rep_name', 'Service Provider Representative — Name', 'text', 'Authorised Representatives', { required: false }),
  F('sp_rep_position', 'Service Provider Representative — Position', 'text', 'Authorised Representatives', { required: false }),
  F('sp_rep_phone', 'Service Provider Representative — Phone', 'text', 'Authorised Representatives', { required: false }),
  F('sp_rep_email', 'Service Provider Representative — Email', 'text', 'Authorised Representatives', { required: false }),

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
<h1 style="text-align:center">Loan & Financial Support Services — Service Delivery Provider Master Agreement</h1>

<h3>1. Purpose</h3>
<p>This Agreement sets out the terms under which the Service Provider delivers Loan &amp; Financial Support Services for clients referred by Seventh Sky. It establishes the Parties' responsibilities, service standards, commercial terms and legal obligations. Individual client engagements will be managed under separate Work Orders.</p>

<h3>2. Appointment</h3>
<p>Seventh Sky appoints the Service Provider as a non-exclusive independent service delivery partner. Nothing in this Agreement:</p>
${ul(['guarantees any minimum volume of work;', 'prevents either Party from engaging with other businesses; or', 'creates an employment, partnership, joint venture or agency relationship.'])}

<h3>3. Term</h3>
<p>This Agreement commences on ${V('commencement_date')} and continues for ${V('agreement_term')}, unless terminated earlier under this Agreement. Unless either Party provides at least ${V('notice_period')} written notice, it will automatically renew for successive twelve-month periods.</p>

<h3>4. Services</h3>
<p>The Service Provider may be engaged to provide one or more of the following services as specified in a Work Order. Only services selected in the applicable Work Order form part of the engagement.</p>
<p><strong>A. Loan &amp; Mortgage Support Services</strong></p>${V('svc_loan')}
<p><strong>B. Property Valuation Coordination</strong></p>${V('svc_valuation')}
<p><strong>C. Financial Documentation Support</strong></p>${V('svc_documentation')}
<p><strong>D. NRB Financial Support</strong></p>${V('svc_nrb')}

<h3>5. Work Orders</h3>
<p>Each client engagement shall be managed under a separate Work Order issued by Seventh Sky, which may include client details, selected services, scope of work, project timeline, agreed pricing, payment schedule and any special requirements. If a Work Order conflicts with this Agreement, the Work Order prevails for that specific engagement.</p>

<h3>6. Responsibilities of the Parties</h3>
<p><strong>Seventh Sky</strong> is responsible for client acquisition and marketing, quotations and service coordination, client communication, project administration, work order management, payment coordination and quality monitoring.</p>
<p><strong>The Service Provider</strong> is responsible for performing the contracted services professionally; supplying competent, qualified personnel; complying with all applicable laws and industry standards; maintaining all required licences, registrations and approvals; ensuring service quality; rectifying deficient work; and completing work within agreed timeframes. The Service Provider remains solely responsible for the professional quality and accuracy of all advice, assessments and documentation it provides.</p>

<h3>7. Licensing, Compliance &amp; Insurance</h3>
<p>The Service Provider must, throughout the Agreement, maintain all licences, registrations and approvals required to perform the Services; comply with all applicable laws, regulations and industry standards in Bangladesh; maintain appropriate insurance applicable to its business, where available and appropriate; and immediately notify Seventh Sky of any suspension, cancellation, investigation or material change affecting its ability to perform the Services. Evidence of licences, registrations or insurance shall be provided upon request.</p>

<h3>8. Service Delivery Standards</h3>
<p>The Service Provider shall perform all Services professionally, competently and with reasonable care and skill; using suitably qualified personnel; within the agreed timeframe; and in compliance with the relevant Work Order. The Service Provider shall protect client information, promptly report delays or issues, and complete all agreed reviews and coordination before completion.</p>

<h3>9. Personnel &amp; Subcontracting</h3>
<p>The Service Provider is responsible for the conduct, competency and supervision of all employees, subcontractors and representatives engaged to perform the Services. No subcontracting of a Work Order is permitted without prior written approval from Seventh Sky, and such approval does not release the Service Provider from its obligations.</p>

<h3>10. Quality &amp; Client Complaints</h3>
<p>The Service Provider shall maintain appropriate quality-control procedures, correct deficient work at its own cost, and promptly investigate and respond to any client complaint relating to the Services it performed. The Service Provider shall cooperate with Seventh Sky in resolving client complaints.</p>

<h3>11. Documentation &amp; Records</h3>
<p>The Service Provider shall provide all documents reasonably required for the Services, including loan assessment summaries, valuation coordination records, documentation review reports and banking liaison records where applicable. Business records relating to Services performed under this Agreement must be retained for at least seven (7) years, or longer where required by law.</p>

<h3>12. Service Fees, Payment &amp; Standard Price Schedule</h3>
<p>Each Work Order will specify the agreed commercial arrangements. Unless otherwise agreed in writing, the Service Provider will only be paid for Services approved under a Work Order; additional work requires prior approval; and payments are subject to the agreed Work Order and supporting documentation. Seventh Sky maintains a Standard Service Price Schedule (<b>Schedule B</b>) within its CRM; the final approved Work Order price shall prevail over the Standard Service Price Schedule.</p>
<p><strong>Seventh Sky Commission:</strong> Seventh Sky's commission on Service Provider charges under this Agreement is ${V('commission_pct')}%. ${V('ss_fee_notes')}</p>
<p><strong>Service Provider Account Details (for settlement of approved payments — completed by the Service Provider):</strong><br/>
Account Holder Name: ${V('sp_account_name')}<br/>Bank Name: ${V('sp_bank_name')}<br/>Branch: ${V('sp_bank_branch')}<br/>
Account Number: ${V('sp_account_number')}<br/>Routing Number: ${V('sp_routing_number')}<br/>bKash / Nagad: ${V('sp_mobile_banking')}</p>

<h3>13. Liability &amp; Indemnity</h3>
<p>Each Party is responsible for its own acts, omissions, negligence and breaches. The Service Provider shall be responsible for any loss, damage, claim or expense arising from deficient work, negligent acts or omissions, failure to comply with applicable laws, or breach of this Agreement, and shall indemnify Seventh Sky against claims, losses, damages, costs and liabilities arising from the Service Provider's negligence, misconduct or breach, except to the extent caused by Seventh Sky.</p>

<h3>14. Financial Services Disclaimer</h3>
<p>Seventh Sky primarily acts as a consultant, coordinator, project manager and client representative unless separately licensed to provide regulated financial services. Loan approvals remain solely at the discretion of the relevant lender. Property valuation outcomes remain the responsibility of the appointed independent valuer. Neither Seventh Sky nor the Service Provider guarantees loan approval, mortgage approval, refinancing approval, valuation outcomes or any particular financial result.</p>

<h3>15. Confidentiality &amp; Data Protection</h3>
<p>Each Party shall keep confidential all non-public business, commercial and client financial information obtained during this Agreement, use it only for the purposes of performing this Agreement, and not disclose it to any third party unless required by law, authorised in writing, or reasonably required to perform the Services. The Service Provider shall take reasonable measures to protect all client information. These obligations continue after termination.</p>

<h3>16. Intellectual Property</h3>
<p>All business systems, templates, forms, procedures, branding, CRM data and intellectual property owned or developed by Seventh Sky remain the exclusive property of Seventh Sky. The Service Provider shall not copy, modify, distribute or use Seventh Sky's intellectual property except to perform authorised Services.</p>

<h3>17. Client Protection &amp; Non-Circumvention</h3>
<p>Clients introduced or assigned by Seventh Sky remain clients of Seventh Sky. During this Agreement and for twenty-four (24) months after its termination, the Service Provider shall not, without Seventh Sky's prior written consent, directly solicit or contract with a client introduced by Seventh Sky, divert business opportunities intended for Seventh Sky, or bypass Seventh Sky to avoid agreed fees or commissions. This clause does not apply to clients with whom the Service Provider had an established relationship before introduction by Seventh Sky.</p>

<h3>18. Exclusive Service Area (If Applicable)</h3>
<p>Where the Parties agree in writing, Seventh Sky may appoint the Service Provider to provide Services within a specified geographic area or service category on an exclusive basis. If no exclusive arrangement is specified in a Work Order or Schedule, this clause does not apply.</p>

<h3>19. Force Majeure</h3>
<p>Neither Party shall be liable for delays or failure to perform caused by events beyond its reasonable control. The affected Party shall notify the other Party as soon as reasonably practicable and resume performance when the event ends. If the event continues beyond sixty (60) days, either Party may terminate the affected Work Order by written notice.</p>

<h3>20. Dispute Resolution</h3>
<p>The Parties shall attempt to resolve any dispute through good faith discussions, then senior management negotiation, then mediation where agreed, before referring the matter to the courts of Bangladesh. The Parties shall continue performing their obligations, where reasonably possible, while a dispute is being resolved.</p>

<h3>21. Suspension &amp; Termination</h3>
<p><strong>Suspension.</strong> Seventh Sky may suspend a Work Order or this Agreement immediately where the Service Provider fails to maintain required licences or registrations, commits a material breach, performs deficient work, breaches applicable laws, fails to meet agreed service standards, or where suspension is reasonably necessary to protect the client, Seventh Sky or the public.</p>
<p><strong>Termination.</strong> Either Party may terminate this Agreement by giving thirty (30) days' written notice, or immediately if the other commits an unremedied material breach, becomes insolvent, engages in fraud or serious misconduct, or no longer holds the licences required to perform the Services. Termination does not affect rights or obligations that arose before the termination date.</p>

<h3>22. General Provisions</h3>
<p>Unless otherwise agreed in writing, this Agreement constitutes the entire agreement between the Parties; amendments must be in writing and signed by both Parties; failure to enforce a provision does not waive rights; if any provision is invalid or unenforceable, the remaining provisions continue in full force; and notices must be provided in writing by hand, courier, post or electronic mail.</p>

<h3>23. Governing Law</h3>
<p>This Agreement shall be governed by the laws of the People's Republic of Bangladesh. The Parties submit to the jurisdiction of the competent courts of Bangladesh unless they mutually agree to resolve a dispute by arbitration or another recognised alternative dispute resolution process.</p>

<h3>24. Execution</h3>
<p>The Parties acknowledge that they have read and understood this Agreement, have had the opportunity to obtain independent legal advice, enter into this Agreement voluntarily, and agree to be legally bound by its terms.</p>
<p><strong>SIGNED FOR SEVENTH SKY</strong><br/>Name: ${V('ss_rep_name')}<br/>Position: ${V('ss_rep_position')}<br/>Signature: __________________<br/>Date: __________</p>
<p><strong>SIGNED FOR SERVICE PROVIDER</strong><br/>Business Name: ${V('sp_business_name')}<br/>Representative: ${V('sp_rep_name')}<br/>Position: ${V('sp_rep_position')}<br/>Signature: __________________<br/>Date: __________</p>
<p><strong>WITNESS 1</strong><br/>Name: ${V('witness1_name')}<br/>NID: ${V('witness1_nid')}<br/>Signature: __________________<br/>Date: __________</p>
<p><strong>WITNESS 2</strong><br/>Name: ${V('witness2_name')}<br/>NID: ${V('witness2_nid')}<br/>Signature: __________________<br/>Date: __________</p>

<h3>Schedule A – Authorised Services</h3>
<p>(The services selected under Clause 4 form the Service Provider's authorised scope, ticked exactly as selected.)</p>

<h3>Schedule B – Standard Service Price Schedule</h3>
<p>The Standard Service Price Schedule is maintained within Seventh Sky's CRM. The agreed price for each engagement shall be confirmed in the applicable Work Order.</p>
${V('provider_rate_schedule')}

<h3>Schedule C – Licence &amp; Insurance Checklist</h3>
<p><strong>Business Documents</strong></p>${V('docs_business')}
<p><strong>Insurance</strong></p>${V('insurance_mandatory')}
<p><strong>Professional Registrations / Memberships</strong></p>${V('technical_licences')}

<h3>Schedule D – Work Order Summary</h3>
<p>Each Work Order should include:</p>
${ul(['Work Order Number', 'Client Name', 'Service Category', 'Scope of Work', 'Required Documentation', 'Timeline', 'Project Value', 'Payment Schedule', 'Special Conditions', 'Completion Confirmation', 'Client Acceptance', 'Seventh Sky Approval', 'Service Provider Acceptance'])}

<p style="text-align:center;margin-top:18px"><strong>END OF MASTER SERVICE DELIVERY PROVIDER AGREEMENT</strong></p>
`;

(async () => {
  try {
    await sequelize.authenticate();
    const existing = await AgreementTemplate.findOne({ where: { category: 'provider_master', vertical: VERTICAL } });
    const payload = {
      name: NAME, category: 'provider_master', vertical: VERTICAL, status: 'active',
      description: 'Loan & Financial Support Services Service Provider Master Agreement (SSPC-LFSS-SDPMA-01 v0.2) — Schedules A–D, checkbox service/insurance selection + provider KYC intake.',
      content_html: CONTENT_HTML, fields: FIELDS, signers: SIGNERS,
      source_filename: 'Loan and Financial Support - Third Party Agreement - V0.2.docx',
    };
    if (existing) { await existing.update(payload); console.log(`✓ Updated template #${existing.id} "${NAME}" (${FIELDS.length} fields)`); }
    else { const t = await AgreementTemplate.create(payload); console.log(`✓ Created template #${t.id} "${NAME}"`); }
    process.exit(0);
  } catch (e) { console.error('✗ Seed failed:', e.message); process.exit(1); }
})();
