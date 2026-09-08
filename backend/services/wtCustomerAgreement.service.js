/**
 * wtCustomerAgreement.service.js
 * ------------------------------------------------------------------
 * Water Tank Cleaning & Maintenance — Customer Service Agreement (SS-WTCM-CSA-01 v0.2).
 * Always signed Seventh Sky ↔ Client (customer). Renders the full agreement (visible
 * TOC + 25 clauses + Schedules A–D) with Schedule C showing Standard vs Agreed pricing
 * (Services / Materials / Labour), a selected-services summary, project cost summary and
 * payment schedule. Mirrors the RPRM/PM builder. Pure render: the admin builder supplies data.
 */
const ServiceItem = require('../models/ServiceItem');

const money = (v) => '৳' + Number(v || 0).toLocaleString('en-US', { maximumFractionDigits: 0 });
const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
// Always HTML-escapes the value — user-supplied names, positions, NIDs etc. flow
// into generated agreement HTML that is later rendered with dangerouslySetInnerHTML,
// so an unescaped value would be a stored-XSS vector.
const or = (v, f = '__________') => (v == null || v === '' ? f : esc(v));

// ── Schedule A: selectable service groups (checkbox scope) ──────────────
const SERVICE_GROUPS = {
  'Water Tank Cleaning': ['Residential Water Tank Cleaning', 'Commercial Water Tank Cleaning', 'Industrial Water Tank Cleaning', 'Rooftop Water Tank Cleaning', 'Underground Water Tank Cleaning'],
  'Water Tank Disinfection': ['Tank Sanitisation', 'Bacteria Treatment', 'Algae Treatment', 'Water Quality Improvement'],
  'Water Tank Inspection': ['Internal Tank Inspection', 'External Tank Inspection', 'Leakage Inspection', 'Structural Assessment', 'Water Quality Assessment'],
  'Water Tank Repairs & Maintenance': ['Crack Repair', 'Leakage Repair', 'Valve Replacement', 'Pipe Connection Repair', 'Waterproofing', 'Structural Reinforcement', 'Preventive Maintenance', 'Scheduled Maintenance'],
  'Water Supply System Services': ['Water Pump Inspection', 'Pump Maintenance', 'Pump Replacement', 'Water Line Inspection', 'Leak Detection', 'Pressure Testing'],
  'Water Quality Services': ['Drinking Water Testing', 'Water Quality Assessment', 'Contamination Assessment', 'Filtration System Support', 'Water Treatment Coordination', 'Water Softener Coordination'],
  'Annual Maintenance Contracts (AMC)': ['Residential Basic', 'Residential Standard', 'Residential Premium', 'Commercial Building', 'Hotel & Restaurant', 'School & Hospital', 'Industrial Facility'],
  'Emergency Services': ['Emergency Water Tank Cleaning', 'Emergency Repairs', 'Emergency Leak Response'],
};

/**
 * Schedule C prices things by catalogue code (WTC-004); Schedule A ticks a fixed
 * legal taxonomy of service NAMES. The two vocabularies do not match — the
 * catalogue is priced by tank size and duty ("Residential Water Tank Cleaning
 * (1,001–2,500L)") while Schedule A names the class of work the Agreement
 * actually covers ("Residential Water Tank Cleaning"). Without this map, picking
 * priced services leaves every Schedule A box unticked, so the signed document
 * says nothing was agreed. One code may legitimately tick more than one box.
 * Materials (MAT-*) and labour (LAB-*) tick nothing — they are priced in
 * Schedule C but are not services in their own right.
 */
const CODE_TO_SCHEDULE_A = {
  'WTC-001': ['Internal Tank Inspection', 'External Tank Inspection'],
  'WTC-002': ['Internal Tank Inspection', 'External Tank Inspection'],
  'WTC-003': ['Residential Water Tank Cleaning'],
  'WTC-004': ['Residential Water Tank Cleaning'],
  'WTC-005': ['Commercial Water Tank Cleaning'],
  'WTC-006': ['Industrial Water Tank Cleaning'],
  'WTC-007': ['Underground Water Tank Cleaning'],
  'WTC-008': ['Rooftop Water Tank Cleaning'],
  'WTC-009': ['Tank Sanitisation'],
  'WTC-010': ['Tank Sanitisation'],
  'WTC-011': ['Bacteria Treatment', 'Algae Treatment'],
  'WTC-012': ['Drinking Water Testing'],
  'WTC-013': ['Water Quality Assessment'],
  'WTC-014': ['Leak Detection', 'Leakage Inspection'],
  'WTC-015': ['Crack Repair'],
  'WTC-016': ['Waterproofing'],
  'WTC-017': ['Valve Replacement'],
  'WTC-018': ['Pipe Connection Repair'],
  'WTC-019': ['Preventive Maintenance'],
  'WTC-020': ['Scheduled Maintenance'],
  'WTC-021': ['Water Pump Inspection'],
  'WTC-022': ['Pump Maintenance'],
  'WTC-023': ['Pressure Testing'],
  'WTC-024': ['Emergency Repairs'],
  'WTC-025': ['Emergency Repairs'],
  'WTC-026': ['Residential Standard'],
  'WTC-027': ['Commercial Building'],
  'WTC-028': ['Industrial Facility'],
};

/** Schedule A tick list implied by a set of priced catalogue codes. */
function scheduleAFromCodes(codes = [], map = CODE_TO_SCHEDULE_A) {
  const out = new Set();
  codes.forEach((code) => (map[String(code).toUpperCase()] || []).forEach((n) => out.add(n)));
  return [...out];
}

// ── Schedule D: warranty checklist groups ──────────────────────────────
const CHECKLIST_GROUPS = {
  'Warranty Coverage': ['Workmanship Warranty', 'Cleaning Service Warranty', 'Repair Warranty', 'Materials / Parts Warranty'],
  'Project Requirements': ['Tank Ownership Confirmed', 'Safe Site Access Provided', 'Water Supply Isolation Available', 'Backup Water Arrangement', 'Special Access Instructions'],
};

// ── 25 clauses (faithful to SS-WTCM-CSA-01 v0.2) ───────────────────────
const CLAUSES = [
  ['PURPOSE', `<p>This Agreement sets out the terms under which Seventh Sky will coordinate and manage Water Tank Cleaning & Maintenance Services requested by the Client. Depending on the nature of the project, services may be provided directly by Seventh Sky or by qualified third-party service providers appointed or coordinated by Seventh Sky. The specific services, pricing and project requirements for each engagement will be confirmed in the relevant Quotation and Work Order.</p>`],
  ['TERM', `<p>This Agreement becomes effective on the date it is signed by both Parties and continues until all agreed Services have been completed, all outstanding payments have been made, and any applicable warranty obligations have expired, unless terminated earlier under this Agreement. For Annual Maintenance Contracts (AMC), this Agreement remains effective for the duration specified in the approved Work Order.</p>`],
  ['SERVICES', `<p>The Client may request one or more of the services listed in <b>Schedule A</b>. Only the services selected in Schedule A or the approved Work Order form part of this Agreement. Additional services may be included by written agreement.</p>`],
  ['PROJECT DETAILS', `<p>The details of each project shall be recorded in <b>Schedule B</b> or the approved Work Order, including Property Address, Property Type, Number of Tanks, Tank Type, Tank Capacity, Scope of Work, Materials, Timeline, Agreed Price, Warranty and Special Requirements. If any inconsistency exists between this Agreement and the Work Order, the Work Order prevails for that project only.</p>`],
  ['RESPONSIBILITIES OF SEVENTH SKY', `<p>Seventh Sky will coordinate the requested services; obtain quotations where applicable; arrange qualified service providers where required; monitor project progress; keep the Client reasonably informed; coordinate warranty requests where applicable; manage project administration and documentation; and endeavour to ensure services are delivered professionally and within agreed timeframes. Unless expressly stated otherwise, Seventh Sky acts as the project coordinator and contract administrator and does not manufacture products, perform laboratory testing or guarantee the performance of products or services supplied by third parties.</p>`],
  ['CLIENT RESPONSIBILITIES', `<p>The Client agrees to provide accurate information; provide safe and reasonable access to the property and water tanks; provide access to pumps, pipelines and related infrastructure where required; review and approve quotations before work commences; promptly advise Seventh Sky of any changes affecting the project; make payments in accordance with this Agreement; and inspect completed work and notify Seventh Sky of any concerns within a reasonable time. Delays caused by the Client may result in revised project timelines or additional costs.</p>`],
  ['QUOTATIONS & WORK ORDERS', `<p>Before any work begins, Seventh Sky will provide the Client with a Quotation and, where applicable, a Work Order outlining the selected services, scope of work, estimated project timeline, agreed pricing, payment schedule, warranty information and any special conditions. Work will commence only after the Client accepts the Quotation or Work Order. If the Client requests additional work after approval, a revised quotation or variation may be required.</p>`],
  ['SERVICE FEES & PAYMENT', `<p>The total project cost will be specified in the approved Quotation or Work Order. Project fees may include consultation fees, inspection fees, cleaning charges, maintenance or repair charges, water quality testing fees, materials and consumables, transportation, government fees or permits (where applicable), emergency service charges and any approved additional costs. The Client agrees to pay the agreed amount in accordance with the approved payment schedule.</p>`],
  ['PAYMENT TERMS', `<p>Unless otherwise agreed in writing — <b>Cleaning, Inspection & Testing Services:</b> deposit upon acceptance of quotation, final payment upon completion of the Services. <b>Repair & Maintenance Projects:</b> deposit upon acceptance, progress payment (if applicable), final payment upon practical completion. <b>Annual Maintenance Contracts (AMC):</b> payment may be made monthly, quarterly, half-yearly or annually as specified in the Work Order. Invoices are payable within the agreed payment period stated on the invoice. Late payments may delay the commencement or continuation of the Services.</p>`],
  ['MATERIALS, CHEMICALS & TESTING', `<p>Unless otherwise stated in the Quotation, all materials, chemicals and replacement components will be supplied as specified in the approved quotation; equivalent products of similar quality may be used where the specified product is unavailable, subject to Client approval where practical; water testing may be undertaken by qualified independent laboratories where applicable; and ownership of supplied materials and replacement components passes to the Client after full payment has been received. Manufacturer warranties remain subject to the manufacturer's terms. Laboratory reports remain the responsibility of the issuing laboratory.</p>`],
  ['PROJECT TIMELINES', `<p>Estimated commencement and completion dates will be provided in the Quotation or Work Order. Project timeframes may be affected by weather conditions, site access restrictions, availability of materials or chemicals, laboratory turnaround times, unforeseen site conditions, utility interruptions, regulatory requirements or other circumstances beyond reasonable control. Where delays occur, Seventh Sky will keep the Client reasonably informed and provide an updated estimated completion date.</p>`],
  ['VARIATIONS & ADDITIONAL SERVICES', `<p>A variation occurs when the Client requests work that differs from the approved scope, or when unforeseen site conditions require changes. Where practical, Seventh Sky will provide a description of the variation, any additional cost and any impact on the timeline. No variation will be carried out without the Client's approval unless immediate action is reasonably required for safety or to prevent further property damage.</p>`],
  ['THIRD-PARTY SERVICE PROVIDERS', `<p>The Client acknowledges that some Services may be performed by qualified independent contractors or laboratories appointed or coordinated by Seventh Sky. Seventh Sky will exercise reasonable care in selecting appropriately qualified providers. Unless otherwise agreed, contractors are responsible for the quality of their workmanship, laboratories for the accuracy of their testing, manufacturers for manufacturer warranties, and suppliers for supplied products; Seventh Sky remains responsible for coordinating the project and assisting the Client in resolving service-related issues.</p>`],
  ['WARRANTIES', `<p>Seventh Sky will coordinate the warranty process for Services provided under this Agreement. Warranty coverage may include workmanship, cleaning services, repair and maintenance services, supplied materials or replacement components where covered by the manufacturer or supplier, and other services specified in the approved Quotation, Work Order or Schedule D. The applicable warranty period shall be specified in the approved Quotation, Work Order or Schedule D. Warranty claims do not apply where defects arise from misuse or neglect, unauthorised repairs or alterations, accidental damage, normal wear and tear, natural disasters, or failure to follow operating or maintenance instructions.</p>`],
  ['DEFECTS, PROPERTY DAMAGE & CLIENT COMPLAINTS', `<p>If the Client believes the Services have not been completed in accordance with the approved scope, the Client should notify Seventh Sky as soon as reasonably practicable. Seventh Sky will investigate, coordinate with the relevant service provider where applicable, arrange inspection if required, and take reasonable steps to resolve the issue. Where property damage or defects are caused by negligent workmanship, the responsible service provider will be required to rectify the damage or defect within a reasonable time. Nothing in this Agreement limits any rights available to the Client under applicable law.</p>`],
  ['LIABILITY', `<p>To the extent permitted by the laws of Bangladesh, Seventh Sky is responsible for coordinating and administering the Services with reasonable care and skill. Technical workmanship remains the responsibility of the person or business performing the work. Independent laboratories remain responsible for the accuracy of any testing or certification they issue. Manufacturers and suppliers remain responsible for defects covered by their warranties. Neither Party shall be liable for losses resulting from circumstances beyond their reasonable control.</p>`],
  ['LIMITATION OF LIABILITY', `<p>Except where liability cannot legally be excluded or limited, Seventh Sky shall not be liable for indirect or consequential losses, loss of profit or business opportunity, delays caused by third parties, manufacturer or supplier defects, delays relating to independent laboratory testing, utility interruptions, pre-existing defects, or events outside its reasonable control. Where permitted by law, Seventh Sky's total liability arising from a project shall not exceed the amount paid by the Client for the affected Services. This clause does not exclude liability arising from fraud, wilful misconduct or any liability that cannot be excluded under applicable law.</p>`],
  ['INSURANCE', `<p>Where applicable, Seventh Sky may assist the Client in arranging or coordinating optional insurance relating to the project. Any insurance is subject to the insurer's acceptance, is governed by the insurer's policy terms, does not guarantee approval of a claim, and is separate from this Agreement. The Client remains responsible for maintaining adequate insurance over their property and assets unless otherwise agreed.</p>`],
  ['CONFIDENTIALITY & PRIVACY', `<p>Each Party agrees to keep confidential all non-public information obtained through this Agreement. Personal information will only be collected, used and disclosed for purposes directly related to the Services or where required by law. Neither Party shall disclose confidential information to a third party without prior consent unless legally required. These obligations continue after completion or termination of this Agreement.</p>`],
  ['FORCE MAJEURE', `<p>Neither Party will be responsible for delays or failure to perform caused by events beyond its reasonable control, including natural disasters, fire, flood, cyclone, pandemic, government restrictions, civil unrest, major utility failures, supply chain disruptions or other unforeseen events. The affected Party shall notify the other as soon as reasonably practicable and resume performance when reasonably possible.</p>`],
  ['CLIENT ACKNOWLEDGEMENTS', `<p>The Client acknowledges that they have reviewed and accepted the Quotation or Work Order before the Services commence; that project timelines are estimates only; that unforeseen circumstances may require variations or additional work; that some Services may be delivered by qualified independent service providers coordinated by Seventh Sky; that independent laboratory testing, where applicable, remains the responsibility of the issuing laboratory; that manufacturer and supplier warranties are separate from this Agreement; and that they have had the opportunity to ask questions and obtain independent advice before signing.</p>`],
  ['SUSPENSION & TERMINATION', `<p><b>Suspension.</b> Seventh Sky may suspend the Services where the Client fails to make payments, prevents reasonable access, the worksite is considered unsafe, the Client requests suspension, or continuation would be unlawful or unsafe. Where practical, Seventh Sky will notify the Client before suspending. <b>Termination.</b> Either Party may terminate by giving thirty (30) days' written notice, provided completed work and outstanding payments are settled. Seventh Sky may terminate immediately for material breach, false or misleading information, repeated prevention of access, non-payment after notice, or threatening/abusive/unlawful behaviour. The Client may terminate before work commences by written notice; if work has commenced, the Client remains responsible for payment of Services completed, materials ordered and reasonable costs incurred up to termination.</p>`],
  ['GENERAL PROVISIONS', `<p>Unless otherwise agreed in writing, this Agreement together with the accepted Quotation, Work Order and Schedules forms the entire agreement; any amendment must be in writing and signed or electronically accepted by both Parties; failure to enforce a provision does not waive rights; if any provision is invalid or unenforceable, the remaining provisions remain in full force; and notices may be delivered by hand, courier, registered post or email.</p>`],
  ['GOVERNING LAW & DISPUTE RESOLUTION', `<p>This Agreement shall be governed by the laws of the People's Republic of Bangladesh. The Parties agree to make reasonable efforts to resolve any dispute through good faith discussions before commencing legal proceedings. If a dispute cannot be resolved through negotiation, the Parties may agree to mediation or another recognised alternative dispute resolution process before referring the matter to the competent courts of Bangladesh. Nothing prevents either Party from seeking urgent legal or equitable relief where necessary.</p>`],
  ['EXECUTION', `<p>By signing this Agreement, the Parties confirm that they have read and understood this Agreement, have had the opportunity to seek independent legal or professional advice, enter into this Agreement voluntarily, and agree to be legally bound by its terms. This Agreement may be executed in counterparts and by electronic signature, including through approved digital signature platforms. Each signed copy will be deemed an original and together will constitute one Agreement.</p>`],
];

/* ────────────────────────────────────────────────────────────────────────────
 * Per-service content packs.
 *
 * The Customer Service Agreement is the same instrument for every service line —
 * same 24 clauses, same Schedule A–D shape, same pricing engine and signing
 * flow. Only the WORDING differs: the title, the service taxonomy in Schedule A,
 * the code→Schedule-A map, the warranty checklist and the service-specific rows
 * in Schedule B. Each service line supplies those as a pack; the renderer below
 * is shared, so a fix to the engine reaches every service at once.
 * ──────────────────────────────────────────────────────────────────────────── */

// Air Conditioning Solutions — Customer Service Agreement (SSPC-ACS-CSA-01 v0.2).
const AC_SERVICE_GROUPS = {
  'Consultation': ['Residential Consultation', 'Commercial Consultation'],
  'Installation': ['Split System Installation', 'Inverter Installation', 'Cassette System Installation', 'Ducted System Installation', 'Commercial Installation'],
  'Relocation': ['Residential Relocation', 'Commercial Relocation'],
  'Maintenance & Repairs': ['Preventive Maintenance', 'Corrective Maintenance', 'Fault Diagnosis', 'Component Replacement'],
  'Cleaning': ['Standard Cleaning', 'Deep Chemical Cleaning'],
  'Refrigerant Services': ['Leak Detection', 'Gas Refill', 'Pressure Testing'],
  'Annual Maintenance Contract (AMC)': ['Residential AMC', 'Commercial AMC'],
  'Smart Climate Control': ['Smart Thermostat', 'Wi-Fi Configuration', 'Energy Assessment'],
  'Emergency Services': ['Emergency Repair', 'Priority Attendance'],
};

const AC_CODE_TO_SCHEDULE_A = {
  'ACS-001': ['Residential Consultation'],
  'ACS-002': ['Commercial Consultation'],
  'ACS-003': ['Split System Installation'],
  'ACS-004': ['Inverter Installation'],
  'ACS-005': ['Cassette System Installation'],
  'ACS-006': ['Ducted System Installation'],
  'ACS-007': ['Commercial Installation'],
  'ACS-008': ['Residential Relocation'],
  'ACS-009': ['Commercial Relocation'],
  'ACS-010': ['Preventive Maintenance'],
  'ACS-011': ['Preventive Maintenance'],
  'ACS-012': ['Standard Cleaning'],
  'ACS-013': ['Deep Chemical Cleaning'],
  'ACS-014': ['Standard Cleaning'],
  'ACS-015': ['Standard Cleaning'],
  'ACS-016': ['Leak Detection'],
  'ACS-017': ['Gas Refill'],
  'ACS-018': ['Gas Refill'],
  'ACS-019': ['Component Replacement'],
  'ACS-020': ['Component Replacement'],
  'ACS-021': ['Component Replacement'],
  'ACS-022': ['Component Replacement'],
  'ACS-023': ['Fault Diagnosis'],
  'ACS-024': ['Emergency Repair'],
  'ACS-025': ['Priority Attendance'],
  'ACS-026': ['Residential AMC'],
  'ACS-027': ['Commercial AMC'],
  'ACS-028': ['Smart Thermostat'],
  'ACS-029': ['Wi-Fi Configuration'],
  'ACS-030': ['Energy Assessment'],
};

const AC_CHECKLIST_GROUPS = {
  'Warranty Coverage': ['Workmanship Warranty', 'Installation Warranty', 'Repair Warranty', 'Manufacturer Warranty'],
  'Project Requirements': ['Safe Site Access Provided', 'Power Supply Available', 'Equipment Details Confirmed', 'Special Access Instructions'],
};

// 24 clauses faithful to SSPC-ACS-CSA-01 v0.2 (22 combines Suspension & Termination).
const AC_CLAUSES = [
  ['PURPOSE', `<p>This Agreement sets out the terms under which Seventh Sky will coordinate and manage Air Conditioning Solutions requested by the Client. Depending on the nature of the project, services may be provided directly by Seventh Sky or by qualified third-party service providers appointed or coordinated by Seventh Sky. The specific services, pricing and project requirements for each engagement will be confirmed in the relevant Quotation and Work Order.</p>`],
  ['TERM', `<p>This Agreement becomes effective on the date it is signed by both Parties and continues until all agreed Services have been completed, all outstanding payments have been made, and any applicable warranty obligations have expired, unless terminated earlier under this Agreement. For Annual Maintenance Contracts (AMC), this Agreement remains effective for the duration specified in the approved Work Order.</p>`],
  ['SERVICES', `<p>The Client may request one or more of the services listed in <b>Schedule A</b>, covering Consultation, Installation, Relocation, Maintenance &amp; Repairs, Cleaning, Refrigerant Services, Annual Maintenance Contracts, Smart Climate Control and Emergency Services. Only the services selected in Schedule A or the approved Work Order form part of this Agreement. Additional services may be included by written agreement.</p>`],
  ['PROJECT DETAILS', `<p>The details of each project shall be recorded in <b>Schedule B</b> or the approved Work Order, including Property Address, Property Type, Number of Units, Equipment Details, Scope of Work, Materials, Timeline, Agreed Price, Warranty and Special Requirements. If any inconsistency exists between this Agreement and the Work Order, the Work Order prevails for that project only.</p>`],
  ['RESPONSIBILITIES OF SEVENTH SKY', `<p>Seventh Sky will coordinate the requested services; obtain quotations where applicable; arrange qualified service providers where required; monitor project progress; keep the Client reasonably informed; coordinate warranty requests where applicable; manage project administration and documentation; and endeavour to ensure services are delivered professionally and within agreed timeframes. Unless expressly stated otherwise, Seventh Sky acts as the project coordinator and contract administrator and does not manufacture equipment or guarantee the performance of products supplied by third parties.</p>`],
  ['CLIENT RESPONSIBILITIES', `<p>The Client agrees to provide accurate information; provide safe and reasonable access to the property; ensure electricity and utilities are available where required; review and approve quotations before work commences; promptly advise Seventh Sky of any changes affecting the project; make payments in accordance with this Agreement; and inspect completed work and notify Seventh Sky of any concerns within a reasonable time. Delays caused by the Client may result in revised project timelines or additional costs.</p>`],
  ['QUOTATIONS & WORK ORDERS', `<p>Before any work begins, Seventh Sky will provide the Client with a Quotation and, where applicable, a Work Order outlining the selected services, scope of work, estimated project timeline, agreed pricing, payment schedule, warranty information and any special conditions. Work will commence only after the Client accepts the Quotation or Work Order. If the Client requests additional work after approval, a revised quotation or variation may be required.</p>`],
  ['SERVICE FEES & PAYMENT', `<p>The total project cost will be specified in the approved Quotation or Work Order. Project fees may include consultation fees, installation or labour charges, equipment and materials, maintenance or repair charges, transportation, government fees or permits (where applicable), emergency service charges and any approved additional costs. The Client agrees to pay the agreed amount in accordance with the approved payment schedule.</p>`],
  ['PAYMENT TERMS', `<p>Unless otherwise agreed in writing — <b>Installation Projects:</b> deposit upon acceptance of quotation, progress payment (if applicable), final payment upon practical completion. <b>Maintenance &amp; Repair Services:</b> payment upon completion of the service unless otherwise agreed. <b>Annual Maintenance Contracts (AMC):</b> payment may be made monthly, quarterly, half-yearly or annually as specified in the Work Order. Invoices are payable within the agreed payment period stated on the invoice. Late payments may delay the commencement or continuation of the Services.</p>`],
  ['MATERIALS & EQUIPMENT', `<p>Unless otherwise stated in the Quotation, all equipment and materials will be supplied as specified in the approved quotation; equivalent products of similar quality may be used where the specified product is unavailable, subject to Client approval where practical; and ownership of supplied equipment and materials passes to the Client after full payment has been received. Manufacturer warranties remain subject to the manufacturer's terms and conditions.</p>`],
  ['PROJECT TIMELINES', `<p>Estimated commencement and completion dates will be provided in the Quotation or Work Order. Project timeframes may be affected by weather conditions, site access restrictions, delays in Client approvals, availability of equipment or materials, unforeseen site conditions, utility interruptions, regulatory requirements or other circumstances beyond reasonable control. Where delays occur, Seventh Sky will keep the Client reasonably informed and provide an updated estimated completion date.</p>`],
  ['VARIATIONS & ADDITIONAL SERVICES', `<p>A variation occurs when the Client requests work that differs from the approved scope, or when unforeseen site conditions require changes — for example additional installations, relocation of equipment, additional materials, electrical upgrades, structural modifications or replacement of defective components not included in the original quotation. Where practical, Seventh Sky will provide a description of the variation, any additional cost and any impact on the timeline. No variation will be carried out without the Client's approval unless immediate action is reasonably required for safety or to prevent further property damage.</p>`],
  ['THIRD-PARTY SERVICE PROVIDERS', `<p>The Client acknowledges that some Services may be performed by qualified independent contractors appointed or coordinated by Seventh Sky. Seventh Sky will exercise reasonable care in selecting appropriately qualified service providers. Unless otherwise agreed, the contractor is responsible for the quality of its workmanship, manufacturers are responsible for manufacturer warranties, and suppliers are responsible for supplied products; Seventh Sky remains responsible for coordinating the project and assisting the Client in resolving service-related issues.</p>`],
  ['WARRANTIES', `<p>Seventh Sky will coordinate the warranty process for Services provided under this Agreement. Warranty coverage may include workmanship, installation services, repairs, maintenance services, and supplied equipment or materials where covered by the manufacturer. The applicable warranty period for each project shall be specified in the approved Quotation, Work Order or Schedule D. Manufacturer warranties remain subject to the manufacturer's terms and conditions. Warranty claims do not apply where defects arise from misuse or neglect, unauthorised repairs or alterations, accidental damage, normal wear and tear, natural disasters, or failure to follow operating or maintenance instructions.</p>`],
  ['DEFECTS, PROPERTY DAMAGE & CLIENT COMPLAINTS', `<p>If the Client believes the Services have not been completed in accordance with the approved scope, the Client should notify Seventh Sky as soon as reasonably practicable. Seventh Sky will investigate, coordinate with the relevant service provider where applicable, arrange inspection if required, and take reasonable steps to resolve the issue. Where property damage or defects are caused by negligent workmanship, the responsible service provider will be required to rectify the damage or defect within a reasonable time. Nothing in this Agreement limits any rights available to the Client under applicable law.</p>`],
  ['LIABILITY', `<p>To the extent permitted by the laws of Bangladesh, Seventh Sky is responsible for coordinating and administering the Services with reasonable care and skill. Technical workmanship remains the responsibility of the person or business performing the work. Manufacturers remain responsible for defects covered by manufacturer warranties. Suppliers remain responsible for the products they supply. Neither Party shall be liable for losses resulting from circumstances beyond their reasonable control.</p>`],
  ['LIMITATION OF LIABILITY', `<p>Except where liability cannot legally be excluded or limited, Seventh Sky shall not be liable for indirect or consequential losses, loss of profit or business opportunity, delays caused by third parties, manufacturer defects, utility interruptions, pre-existing defects, or events outside its reasonable control. Where permitted by law, Seventh Sky's total liability arising from a project shall not exceed the amount paid by the Client for the affected Services. This clause does not exclude liability arising from fraud, wilful misconduct or any liability that cannot be excluded under applicable law.</p>`],
  ['INSURANCE', `<p>Where applicable, Seventh Sky may assist the Client in arranging or coordinating optional insurance relating to the project. Any insurance is subject to the insurer's acceptance, is governed by the insurer's policy terms, does not guarantee approval of a claim, and is separate from this Agreement. The Client remains responsible for maintaining adequate insurance over their property and assets unless otherwise agreed.</p>`],
  ['CONFIDENTIALITY & PRIVACY', `<p>Each Party agrees to keep confidential all non-public information obtained through this Agreement. Personal information will only be collected, used and disclosed for purposes directly related to the Services or where required by law. Neither Party shall disclose confidential information to a third party without prior consent unless legally required. These obligations continue after completion or termination of this Agreement.</p>`],
  ['FORCE MAJEURE', `<p>Neither Party will be responsible for delays or failure to perform caused by events beyond its reasonable control, including natural disasters, fire, flood, cyclone, pandemic, government restrictions, civil unrest, major utility failures, supply chain disruptions or other unforeseen events. The affected Party shall notify the other as soon as reasonably practicable and resume performance when reasonably possible.</p>`],
  ['CLIENT ACKNOWLEDGEMENTS', `<p>The Client acknowledges that they have reviewed and accepted the Quotation or Work Order before the Services commence; that project timelines are estimates only; that unforeseen circumstances may require variations or additional work; that some Services may be delivered by qualified independent service providers coordinated by Seventh Sky; that manufacturer warranties are separate from this Agreement; and that they have had the opportunity to ask questions and obtain independent advice before signing.</p>`],
  ['SUSPENSION & TERMINATION', `<p><b>Suspension.</b> Seventh Sky may suspend the Services where the Client fails to make payments, prevents reasonable access, the worksite is considered unsafe, the Client requests suspension, or continuation would be unlawful or unsafe. Where practical, Seventh Sky will notify the Client before suspending. <b>Termination.</b> Either Party may terminate by giving thirty (30) days' written notice, provided completed work and outstanding payments are settled. Seventh Sky may terminate immediately for material breach, false or misleading information, repeated prevention of access, non-payment after notice, or threatening/abusive/unlawful behaviour. The Client may terminate before work commences by written notice; if work has commenced, the Client remains responsible for payment of Services completed, materials ordered and reasonable costs incurred up to termination.</p>`],
  ['GENERAL PROVISIONS', `<p>Unless otherwise agreed in writing, this Agreement together with the accepted Quotation, Work Order and Schedules forms the entire agreement; any amendment must be in writing and signed or electronically accepted by both Parties; failure to enforce a provision does not waive rights; if any provision is invalid or unenforceable, the remaining provisions remain in full force; and notices may be delivered by hand, courier, registered post or email.</p>`],
  ['GOVERNING LAW & DISPUTE RESOLUTION', `<p>This Agreement shall be governed by the laws of the People's Republic of Bangladesh. The Parties agree to make reasonable efforts to resolve any dispute through good faith discussions before commencing legal proceedings. If a dispute cannot be resolved through negotiation, the Parties may agree to mediation or another recognised alternative dispute resolution process before referring the matter to the competent courts of Bangladesh. Nothing prevents either Party from seeking urgent legal or equitable relief where necessary.</p>`],
  ['EXECUTION', `<p>By signing this Agreement, the Parties confirm that they have read and understood this Agreement, have had the opportunity to seek independent legal or professional advice, enter into this Agreement voluntarily, and agree to be legally bound by its terms. This Agreement may be executed in counterparts and by electronic signature, including through approved digital signature platforms such as DocuSign. Each signed copy will be deemed an original and together will constitute one Agreement.</p>`],
];

// Service-specific Schedule B rows (falls back to the shared builder's tank_*
// keys so the existing agreement form still populates them until AC gets its own
// equipment fields).
const WT_SCHEDULE_B_ROWS = (b) => [
  ['Tank Type', b.tank_type], ['Tank Capacity', b.tank_capacity],
  ['Number of Tanks', b.tanks_count], ['Water Source', b.water_source],
];
const AC_SCHEDULE_B_ROWS = (b) => [
  ['Equipment / Brand', b.equipment_brand || b.tank_type],
  ['Model', b.equipment_model],
  ['Units / Quantity', b.units_count || b.tanks_count],
  ['Capacity (Ton / BTU)', b.equipment_capacity || b.tank_capacity],
  ['Refrigerant Type', b.refrigerant_type || b.water_source],
  ['System Age', b.system_age],
];

// ── Land & Property Assessment (Survey & Valuation Services) — Customer Service
// Agreement (SSPC-SVS-CSA-01 v0.2). Faithful to the client document. ─────────
const LPAS_SERVICE_GROUPS = {
  'Land Survey Services': ['Boundary Survey', 'Cadastral Survey', 'Topographic Survey', 'Contour Survey', 'Construction / Engineering Survey', 'Subdivision Survey', 'GIS / Digital Mapping', 'Drone Survey', 'Utility Mapping'],
  'Property Valuation Services': ['Residential Property Valuation', 'Commercial Property Valuation', 'Industrial Property Valuation', 'Agricultural / Land Valuation', 'Rental Assessment', 'Insurance Valuation', 'Investment / Mortgage Valuation', 'Development Site Valuation'],
  'Technical Property Services': ['Property Condition Assessment', 'Due Diligence Inspection', 'Site Verification', 'Measurement Verification', 'Technical Property Report'],
  'NRB Property Support Services': ['Remote Property Inspection', 'Property Verification', 'Video Inspection', 'Construction Progress Inspection', 'Ownership Verification Coordination'],
};

// Catalogue code (SVS-*) → Schedule A service class. Materials (GOV-/TPC-) and
// professional fees (PRO-) tick nothing — they are priced but are not services.
const LPAS_CODE_TO_SCHEDULE_A = {
  'SVS-001': ['Boundary Survey'], 'SVS-002': ['Cadastral Survey'], 'SVS-003': ['Topographic Survey'],
  'SVS-004': ['Contour Survey'], 'SVS-005': ['Construction / Engineering Survey'], 'SVS-006': ['Subdivision Survey'],
  'SVS-007': ['GIS / Digital Mapping'], 'SVS-008': ['Drone Survey'], 'SVS-009': ['Utility Mapping'],
  'SVS-010': ['Residential Property Valuation'], 'SVS-011': ['Commercial Property Valuation'],
  'SVS-012': ['Industrial Property Valuation'], 'SVS-013': ['Agricultural / Land Valuation'],
  'SVS-014': ['Rental Assessment'], 'SVS-015': ['Insurance Valuation'], 'SVS-016': ['Investment / Mortgage Valuation'],
  'SVS-017': ['Development Site Valuation'], 'SVS-018': ['Property Condition Assessment'],
  'SVS-019': ['Due Diligence Inspection'], 'SVS-020': ['Site Verification'], 'SVS-021': ['Measurement Verification'],
  'SVS-022': ['Technical Property Report'], 'SVS-023': ['Remote Property Inspection'], 'SVS-024': ['Property Verification'],
  'SVS-025': ['Video Inspection'], 'SVS-026': ['Construction Progress Inspection'], 'SVS-027': ['Ownership Verification Coordination'],
};

const LPAS_CHECKLIST_GROUPS = {
  'Warranty Coverage': ['Survey Report Rectification', 'Valuation Report Rectification', 'Technical Report Rectification', 'Administrative / Reporting Errors'],
  'Project Requirements': ['Safe Site Access Provided', 'Ownership Documents Provided', 'Property Access Confirmed', 'Special Access Instructions'],
};

const LPAS_SCHEDULE_B_ROWS = (b) => [
  ['Mouza', b.mouza], ['JL No.', b.jl_no], ['Khatian No.', b.khatian_no], ['Dag / Plot No.(s)', b.dag_no || b.tank_type],
  ['Land Area', b.land_area || b.tank_capacity], ['Property Type', b.property_type],
  ['Land Record Basis', b.land_record_basis || b.water_source],
];

// 23 clauses faithful to SSPC-SVS-CSA-01 v0.2.
const LPAS_CLAUSES = [
  ['PURPOSE', `<p>This Agreement sets out the terms under which Seventh Sky will coordinate and manage the Survey &amp; Valuation Services requested by the Client. Depending on the project, services may be provided directly by Seventh Sky or by qualified independent professionals appointed or coordinated by Seventh Sky. The scope, pricing and project requirements for each engagement will be confirmed in the approved Quotation and Work Order.</p>`],
  ['TERM', `<p>This Agreement becomes effective on the date it is signed by both Parties and continues until the agreed Services have been completed, all outstanding payments have been made, and any applicable warranty obligations have expired, unless terminated earlier under this Agreement.</p>`],
  ['SERVICES', `<p>The Client may request one or more of the services listed in <b>Schedule A</b>, covering Land Survey Services, Property Valuation Services, Technical Property Services and NRB Property Support Services. Only the services selected in Schedule A or the approved Work Order form part of this Agreement. Additional services may be included by written agreement.</p>`],
  ['PROJECT DETAILS', `<p>The project details shall be recorded in <b>Schedule B</b> or the approved Work Order, including Property Address, Mouza, JL No., Dag No., Khatian No., Property Type, Selected Services, Scope of Work, Deliverables, Estimated Timeline, Agreed Price and Special Requirements. If there is any inconsistency between this Agreement and the Work Order, the Work Order prevails for that project.</p>`],
  ['RESPONSIBILITIES OF SEVENTH SKY', `<p>Seventh Sky will coordinate the requested Services; arrange qualified professionals where required; obtain quotations where applicable; monitor project progress; keep the Client reasonably informed; coordinate project documentation; and assist in resolving service-related issues. Unless otherwise agreed, Seventh Sky acts as the project coordinator and contract administrator and does not independently certify the technical accuracy of surveys, valuations or specialist reports prepared by independent professionals.</p>`],
  ['CLIENT RESPONSIBILITIES', `<p>The Client agrees to provide accurate information and requested documents; provide safe and reasonable access to the property; obtain any required permissions for site access; review and approve quotations before work commences; promptly advise Seventh Sky of any changes affecting the project; make payments in accordance with this Agreement; and review the completed Services and notify Seventh Sky of any concerns within a reasonable time. Delays caused by the Client may result in revised project timelines or additional costs.</p>`],
  ['QUOTATIONS & WORK ORDERS', `<p>Before the Services commence, Seventh Sky will provide the Client with a Quotation and, where applicable, a Work Order outlining the selected Services, scope of work, deliverables, estimated project timeline, agreed fees, payment terms and any special conditions. Work will commence only after the Client has accepted the Quotation or Work Order. Any changes requested after approval may require a revised quotation or approved variation.</p>`],
  ['SERVICE FEES & PAYMENT', `<p>The total project cost will be specified in the approved Quotation or Work Order. Unless otherwise agreed, the project fee may include consultation and professional fees, survey or valuation fees, inspection fees, report preparation, travel or transport costs, government fees (where applicable), approved third-party costs and any approved additional services. The Client agrees to pay all fees in accordance with the approved payment schedule.</p>`],
  ['PAYMENT TERMS', `<p>Unless otherwise agreed in writing — <b>Survey &amp; Valuation Services:</b> deposit upon acceptance of the Quotation, balance upon completion of the Services and issue of the final report. <b>Large or Multi-Stage Projects:</b> payment may be made by deposit, progress payments (where applicable) and final payment upon completion. Invoices are payable within the period specified on the invoice. Late payment may delay the commencement or completion of the Services.</p>`],
  ['PROJECT TIMELINES', `<p>Estimated commencement and completion dates will be provided in the Quotation or Work Order. Project timelines may be affected by weather conditions, site access restrictions, delays in obtaining documents or approvals, government processing times, unforeseen site conditions or other circumstances beyond reasonable control. Where delays occur, Seventh Sky will keep the Client reasonably informed and provide an updated estimated completion date where practicable.</p>`],
  ['VARIATIONS & ADDITIONAL SERVICES', `<p>A variation occurs where the Client requests additional Services, the scope of work changes, or unforeseen circumstances require additional work. Where practicable, Seventh Sky will provide details of the variation, any additional cost and any impact on the project timeline. No variation will be carried out without the Client's approval unless immediate action is reasonably necessary to protect the Client's interests or comply with legal or safety requirements.</p>`],
  ['THIRD-PARTY SERVICE PROVIDERS', `<p>The Client acknowledges that some Services may be provided by qualified independent surveyors, valuers, engineers, laboratories or other specialists appointed or coordinated by Seventh Sky. Seventh Sky will exercise reasonable care in selecting appropriately qualified service providers. Unless otherwise agreed, service providers are responsible for the quality of their professional services, laboratories for the accuracy of their testing, and government authorities for approvals and registrations under their control; Seventh Sky remains responsible for coordinating the project and assisting the Client throughout the engagement.</p>`],
  ['WARRANTIES', `<p>Seventh Sky will coordinate any applicable warranty or rectification relating to the Services provided under this Agreement. Where applicable, coverage may include professional services, survey or valuation reports, inspection services and supplied documents, together with any additional warranties specified in the approved Quotation, Work Order or Schedule C/D. The warranty or rectification period applies only to administrative errors, reporting errors, omissions attributable to the service provider, or defects in Services resulting from negligent workmanship. It does not apply where defects arise from misuse, unauthorised alterations, inaccurate information supplied by the Client, changes in market value or site conditions after the report date, changes to legislation, or circumstances beyond reasonable control.</p>`],
  ['PROPERTY DAMAGE & CLIENT COMPLAINTS', `<p>If the Client believes the Services have not been completed in accordance with the approved scope, the Client shall notify Seventh Sky as soon as reasonably practicable. Seventh Sky will investigate the matter, coordinate with the relevant service provider where applicable, arrange further inspection if required, and take reasonable steps to resolve the issue. Where property damage or professional errors are caused by negligent workmanship or services, the responsible service provider shall be required to rectify the issue within a reasonable time. Nothing in this Agreement limits any rights available to the Client under applicable law.</p>`],
  ['LIABILITY', `<p>To the extent permitted by the laws of Bangladesh, Seventh Sky is responsible for coordinating and administering the Services with reasonable care and skill. Independent surveyors, valuers, engineers and other specialists remain responsible for the professional accuracy of their reports and services. Government authorities remain responsible for approvals, registrations and official records under their control. Neither Party is liable for delays or losses caused by events beyond their reasonable control.</p>`],
  ['LIMITATION OF LIABILITY', `<p>To the extent permitted by law, Seventh Sky is not liable for indirect or consequential loss, loss of profit or business opportunity, delays caused by third parties or government authorities, inaccurate information supplied by the Client, pre-existing property defects, or events beyond its reasonable control. Where permitted by law, Seventh Sky's total liability for any claim arising from a project shall not exceed the amount paid by the Client for the affected Services. Nothing in this Agreement excludes liability that cannot legally be excluded under the laws of Bangladesh.</p>`],
  ['CONFIDENTIALITY & PRIVACY', `<p>Each Party shall keep confidential all non-public information obtained through this Agreement and use it only for purposes related to the Services. Personal information will be collected, used and disclosed only as reasonably necessary to provide the Services or where required by law. These obligations continue after completion or termination of this Agreement.</p>`],
  ['FORCE MAJEURE', `<p>Neither Party shall be liable for any delay or failure to perform its obligations due to events beyond its reasonable control. The affected Party shall notify the other Party as soon as reasonably practicable. If the event continues for more than sixty (60) days, either Party may terminate the affected Services by written notice.</p>`],
  ['CLIENT ACKNOWLEDGEMENTS', `<p>The Client acknowledges that the selected Services have been explained and accepted; that all information provided to Seventh Sky is accurate to the best of the Client's knowledge; that survey, valuation and technical reports are based on the information and site conditions available at the time of inspection; that delays may occur due to factors beyond Seventh Sky's reasonable control; and that the Client has had the opportunity to seek independent legal, financial or professional advice before signing this Agreement.</p>`],
  ['SUSPENSION & TERMINATION', `<p><b>Suspension.</b> Seventh Sky may suspend the Services where the Client fails to make payment, fails to provide safe or reasonable access, breaches this Agreement, or where suspension is necessary for legal, safety or operational reasons. <b>Termination.</b> Either Party may terminate this Agreement where the other Party commits a material breach and fails to remedy it within fourteen (14) days after written notice; where the Services cannot reasonably proceed due to circumstances beyond either Party's control; or where both Parties agree in writing. Termination does not affect any rights or obligations that arose before termination.</p>`],
  ['GENERAL PROVISIONS', `<p>This Agreement constitutes the entire agreement between the Parties regarding the Services and supersedes all previous discussions or understandings. Any amendment must be made in writing and signed by both Parties. If any provision is found to be invalid or unenforceable, the remaining provisions shall remain in full force and effect. Electronic signatures shall have the same legal effect as original signatures.</p>`],
  ['GOVERNING LAW & DISPUTE RESOLUTION', `<p>This Agreement shall be governed by the laws of the People's Republic of Bangladesh. The Parties shall first attempt to resolve any dispute through good faith discussions. If the dispute cannot be resolved within fourteen (14) days, the Parties may refer the matter to mediation before commencing legal proceedings, unless urgent court action is required.</p>`],
  ['EXECUTION', `<p>This Agreement becomes effective on the date it is signed by both Parties. By signing this Agreement, the Parties confirm that they have read and understood this Agreement, agree to be bound by its terms, and warrant that the person signing is authorised to do so. This Agreement may be executed in counterparts and by electronic signature.</p>`],
];

// ── Loan & Financial Support Services — Customer Service Agreement
// (SSPC-LFSS-CSA-01 v0.2). Faithful to the client document. ──────────────────
const LFS_SERVICE_GROUPS = {
  'Loan & Mortgage Support Services': ['Home Loan Assistance', 'Investment Property Loan Assistance', 'Commercial Property Loan Assistance', 'Construction Loan Assistance', 'Land Purchase Loan Assistance', 'Mortgage Coordination', 'Loan Refinancing Support', 'Loan Documentation Assistance', 'Banking Liaison Support', 'Pre-Approval Coordination', 'Loan Settlement Coordination'],
  'Property Valuation Coordination': ['Residential Property Valuation Coordination', 'Commercial Property Valuation Coordination', 'Industrial Property Valuation Coordination', 'Agricultural Property Valuation Coordination', 'Land Valuation Coordination', 'Mortgage Valuation Coordination', 'Independent Valuation Coordination', 'Valuation Report Review', 'Revaluation Coordination'],
  'Financial Documentation Support': ['Financial Document Review', 'Income Verification Coordination', 'Asset & Liability Documentation', 'Loan Application Documentation', 'Financial Record Coordination', 'Supporting Evidence Collection', 'Identity Verification Coordination', 'Compliance Documentation'],
  'NRB Financial Support Services': ['Overseas Client Loan Coordination', 'Remote Documentation Support', 'Digital Document Verification Coordination', 'Financial Institution Liaison', 'Overseas Settlement Coordination', 'Cross-Border Documentation Support', 'Property Finance Coordination'],
};

// Catalogue code (LFS-*) → Schedule A service. Professional fees (PRO-) and
// third-party costs (TPC-) tick nothing — priced, but not client-selectable services.
const LFS_CODE_TO_SCHEDULE_A = {
  'LFS-001': ['Home Loan Assistance'], 'LFS-002': ['Investment Property Loan Assistance'], 'LFS-003': ['Commercial Property Loan Assistance'],
  'LFS-004': ['Construction Loan Assistance'], 'LFS-005': ['Land Purchase Loan Assistance'], 'LFS-006': ['Mortgage Coordination'],
  'LFS-007': ['Loan Refinancing Support'], 'LFS-008': ['Loan Documentation Assistance'], 'LFS-009': ['Banking Liaison Support'],
  'LFS-010': ['Pre-Approval Coordination'], 'LFS-011': ['Loan Settlement Coordination'],
  'LFS-012': ['Residential Property Valuation Coordination'], 'LFS-013': ['Commercial Property Valuation Coordination'],
  'LFS-014': ['Industrial Property Valuation Coordination'], 'LFS-015': ['Agricultural Property Valuation Coordination'],
  'LFS-016': ['Land Valuation Coordination'], 'LFS-017': ['Mortgage Valuation Coordination'], 'LFS-018': ['Independent Valuation Coordination'],
  'LFS-019': ['Valuation Report Review'], 'LFS-020': ['Revaluation Coordination'],
  'LFS-021': ['Financial Document Review'], 'LFS-022': ['Income Verification Coordination'], 'LFS-023': ['Asset & Liability Documentation'],
  'LFS-024': ['Loan Application Documentation'], 'LFS-025': ['Financial Record Coordination'], 'LFS-026': ['Supporting Evidence Collection'],
  'LFS-027': ['Identity Verification Coordination'], 'LFS-028': ['Compliance Documentation'],
  'LFS-029': ['Overseas Client Loan Coordination'], 'LFS-030': ['Remote Documentation Support'], 'LFS-031': ['Digital Document Verification Coordination'],
  'LFS-032': ['Financial Institution Liaison'], 'LFS-033': ['Overseas Settlement Coordination'], 'LFS-034': ['Cross-Border Documentation Support'],
  'LFS-035': ['Property Finance Coordination'],
};

const LFS_CHECKLIST_GROUPS = {
  'Warranty Coverage': ['Administrative Error Rectification', 'Documentation Rectification', 'Coordination Rectification'],
  'Project Requirements': ['Financial Documents Provided', 'Privacy Consent Provided', 'Accurate Information Confirmed'],
};

const LFS_SCHEDULE_B_ROWS = (b) => [
  ['Purpose of Finance', b.finance_purpose || b.tank_type],
  ['Estimated Loan Amount', b.loan_amount || b.tank_capacity],
  ['Number of Applicants', b.applicants || b.tanks_count],
  ['Preferred Lender', b.lender || b.water_source],
  ['Estimated Property Value', b.property_value],
];

// 24 clauses faithful to SSPC-LFSS-CSA-01 v0.2 (adds a Financial Services Disclaimer).
const LFS_CLAUSES = [
  ['PURPOSE', `<p>This Agreement sets out the terms under which Seventh Sky will coordinate and manage Loan &amp; Financial Support Services requested by the Client. Depending on the nature of the engagement, services may be provided directly by Seventh Sky or coordinated through appropriately qualified third-party service providers. The specific services, pricing, project requirements and deliverables for each engagement will be confirmed in the approved Quotation and Work Order.</p>`],
  ['TERM', `<p>This Agreement becomes effective on the date it is signed by both Parties and continues until all agreed Services have been completed, all outstanding payments received, all agreed deliverables provided, and any applicable post-service obligations completed, unless terminated earlier under this Agreement. Where ongoing advisory or support services are provided, this Agreement continues for the period specified in the relevant Work Order.</p>`],
  ['SERVICES', `<p>The Client may request one or more of the Services listed in <b>Schedule A</b>, covering Loan &amp; Mortgage Support, Property Valuation Coordination, Financial Documentation Support and NRB Financial Support. Only the Services selected in Schedule A or the approved Work Order form part of this Agreement.</p>`],
  ['PROJECT DETAILS', `<p>The details of each engagement shall be recorded in <b>Schedule B</b> or the approved Work Order, including client details, property details (where applicable), selected Services, scope of Services, required documentation, project timeline, agreed service fees, payment schedule, third-party costs and any special requirements. If any inconsistency exists between this Agreement and an approved Work Order, the Work Order prevails for that engagement only.</p>`],
  ['RESPONSIBILITIES OF SEVENTH SKY', `<p>Unless otherwise agreed in writing, Seventh Sky will discuss the Client's requirements and recommend suitable options; coordinate the requested Services; appoint or coordinate appropriately qualified third-party professionals where required; liaise with lenders, valuers and financial institutions where authorised by the Client; monitor progress and keep the Client reasonably informed; coordinate documentation and records; assist in resolving service-related issues; and deliver the agreed Services with reasonable care and skill. Unless separately licensed to provide regulated financial services, Seventh Sky acts primarily as a consultant, coordinator, project manager and client representative.</p>`],
  ['CLIENT RESPONSIBILITIES', `<p>The Client agrees to provide accurate, complete and up-to-date information; provide all documents reasonably required; promptly notify Seventh Sky of material changes to their financial circumstances; cooperate with reasonable requests for additional information; attend meetings or interviews where required; review quotations, loan documents and other documentation before approval; make payments in accordance with this Agreement; and comply with reasonable requirements of lenders, valuers or government authorities. The Client is responsible for ensuring all information and supporting documents provided are genuine, complete and accurate.</p>`],
  ['QUOTATIONS & WORK ORDERS', `<p>Before Services commence, Seventh Sky will provide the Client with a Quotation and, where applicable, a Work Order outlining the selected Services, scope of work, required documentation, estimated project timeline, agreed fees, payment schedule, third-party costs and any special conditions. Services will commence only after the Client has accepted the Quotation or Work Order. Any changes requested after approval may require a revised quotation or approved variation.</p>`],
  ['SERVICE FEES & PAYMENT', `<p>The total project cost will be specified in the approved Quotation or Work Order. Unless otherwise agreed, the project fee may include consultation fees, loan coordination fees, banking liaison services, mortgage coordination services, valuation coordination fees, financial documentation services, project management services, administration fees, approved third-party coordination fees and any approved additional services. Government fees, lender charges and other third-party costs are payable by the Client unless expressly included in the approved quotation.</p>`],
  ['PAYMENT TERMS', `<p>Unless otherwise agreed in writing — <b>Standard Projects:</b> deposit upon acceptance of the Quotation or Work Order, progress payment (where applicable), final payment before release of final documentation or completion of the agreed Services. <b>Ongoing Services:</b> payment may be made monthly, by agreed project milestones, or in accordance with another agreed schedule. Invoices are payable within the period specified on the invoice. Late payment may result in delays to the Services or suspension of the engagement.</p>`],
  ['PROJECT TIMELINES', `<p>Estimated project milestones will be provided in the approved Quotation or Work Order. Project timelines may be affected by factors outside Seventh Sky's reasonable control, including lender assessment timeframes, requests for additional documentation, government processing times, valuation scheduling, third-party service provider availability, regulatory requirements or other unforeseen circumstances. Where delays occur, Seventh Sky will keep the Client reasonably informed and provide revised estimated completion dates where practicable.</p>`],
  ['VARIATIONS & ADDITIONAL SERVICES', `<p>A variation occurs where the Client requests additional Services, the scope of work changes, additional documentation or lender requirements arise, or unforeseen circumstances require additional work. Where practicable, Seventh Sky will advise the Client of the proposed variation, any additional fees, any revised timeline and any changes to the agreed deliverables. No variation will be undertaken without the Client's approval unless immediate action is reasonably necessary to protect the Client's interests or comply with legal or regulatory requirements.</p>`],
  ['THIRD-PARTY SERVICE PROVIDERS', `<p>The Client acknowledges that certain Services may be delivered by qualified independent professionals, including banks and financial institutions, licensed mortgage brokers, licensed valuers, accountants, lawyers, financial advisers, surveyors, government authorities and other approved specialists. Seventh Sky will exercise reasonable care in selecting and coordinating third-party providers. Unless otherwise agreed, third-party providers remain responsible for the professional quality and accuracy of their own services; lenders remain solely responsible for lending decisions; valuers remain responsible for valuation reports; and government authorities remain responsible for approvals and official records. Seventh Sky remains responsible for coordinating the Services and supporting the Client throughout the engagement.</p>`],
  ['WARRANTIES', `<p>Seventh Sky will coordinate the agreed Services with reasonable care and skill. Where applicable, Seventh Sky will coordinate the correction of administrative errors or omissions relating to the Services it provided. Any warranty or rectification applies only to the Services coordinated by Seventh Sky and does not extend to lending decisions made by financial institutions, valuation opinions prepared by independent valuers, legal advice provided by lawyers, taxation advice provided by accountants, investment advice provided by financial advisers, government decisions, or matters beyond the reasonable control of Seventh Sky. Lender and third-party warranties remain subject to their own terms.</p>`],
  ['CLIENT COMPLAINTS', `<p>If the Client believes the Services have not been provided in accordance with the agreed scope, the Client shall notify Seventh Sky as soon as reasonably practicable. Seventh Sky will acknowledge the complaint, investigate the matter, liaise with the relevant third-party provider where applicable, provide updates and take reasonable steps to resolve the issue. Where the complaint relates to services provided by an independent third party, Seventh Sky will assist in coordinating the resolution but cannot require that third party to make a particular decision. Nothing in this Agreement limits any rights available to the Client under applicable law.</p>`],
  ['LIABILITY', `<p>To the extent permitted by the laws of Bangladesh, Seventh Sky is responsible for coordinating the agreed Services with reasonable care and skill. Financial institutions remain solely responsible for lending decisions. Licensed valuers remain responsible for valuation reports and professional opinions. Lawyers, accountants and other professionals remain responsible for the advice they provide. Government authorities remain responsible for approvals, registrations and official records under their control. Neither Party is liable for delays or losses caused by events beyond its reasonable control.</p>`],
  ['LIMITATION OF LIABILITY', `<p>To the extent permitted by law, Seventh Sky is not liable for indirect or consequential loss, loss of income or anticipated financial benefit, refusal of loan or finance applications, changes in lending policies or interest rates, changes in property values, delays caused by financial institutions, government authorities or third-party providers, inaccurate or incomplete information supplied by the Client, or events beyond its reasonable control. Where permitted by law, Seventh Sky's total liability arising from a particular engagement shall not exceed the total professional fees paid by the Client for the affected Services. Nothing excludes liability that cannot legally be excluded under the laws of Bangladesh.</p>`],
  ['CONFIDENTIALITY & PRIVACY', `<p>Each Party shall keep confidential all non-public personal, financial and commercial information obtained through this Agreement. Personal information will be collected, used and disclosed only to perform the agreed Services, where authorised by the Client, where required by law, or where reasonably necessary to coordinate with approved third-party providers. Each Party shall take reasonable measures to protect confidential information. These obligations continue after completion or termination of this Agreement.</p>`],
  ['FINANCIAL SERVICES DISCLAIMER', `<p>The Client acknowledges and agrees that Seventh Sky primarily acts as a consultant, coordinator, project manager and client representative unless separately licensed to provide regulated financial services. Loan approvals remain solely at the discretion of the relevant lender or financial institution. Property valuations remain the independent professional opinion of the appointed valuer. Interest rates, lending policies, credit assessment criteria and property values may change without notice. Seventh Sky cannot guarantee loan approval, mortgage approval, refinancing approval, valuation outcomes, financing terms, interest rates or any particular financial result. The Client is encouraged to obtain independent legal, taxation and financial advice before making significant financial decisions.</p>`],
  ['FORCE MAJEURE', `<p>Neither Party shall be liable for any delay or failure to perform its obligations where such delay or failure results from circumstances beyond its reasonable control, including natural disasters, fire, flood or severe weather, war, civil unrest or terrorism, pandemics or public health emergencies, government actions or regulatory changes, major failures of utilities or communication systems, or any other event beyond the reasonable control of the affected Party. The affected Party shall notify the other as soon as reasonably practicable. If the event continues for more than sixty (60) days, either Party may terminate the affected Services by written notice.</p>`],
  ['CLIENT ACKNOWLEDGEMENTS', `<p>The Client acknowledges that the selected Services have been explained and accepted; that all information and documents provided are true, accurate and complete to the best of the Client's knowledge; that failure to provide complete or accurate information may affect the outcome of the Services; that they have reviewed and accepted the approved Quotation and Work Order; that lending decisions remain solely with the relevant financial institution; that valuation reports remain the independent professional opinion of the appointed valuer; and that they have had the opportunity to obtain independent legal, taxation and financial advice before entering into this Agreement.</p>`],
  ['SUSPENSION & TERMINATION', `<p><b>Suspension.</b> Seventh Sky may suspend the Services where the Client fails to make payments, fails to provide required documents or information, provides false, misleading or incomplete information, where continuation would breach applicable laws or regulatory requirements, or where suspension is reasonably necessary to protect the Client, Seventh Sky or a third-party provider. <b>Termination.</b> Either Party may terminate this Agreement where the other Party commits a material breach and fails to remedy it within fourteen (14) days after written notice; where the Services cannot reasonably continue due to circumstances beyond either Party's control; where both Parties agree in writing; or where a Force Majeure event continues beyond the specified period. Termination does not affect accrued rights, outstanding payments or obligations that survive termination.</p>`],
  ['GENERAL PROVISIONS', `<p>This Agreement constitutes the entire agreement between the Parties regarding the Services and supersedes all previous discussions and understandings. Any amendment must be made in writing and signed by both Parties. If any provision is found to be invalid or unenforceable, the remaining provisions shall remain in full force and effect. Electronic signatures shall have the same legal effect as original signatures.</p>`],
  ['GOVERNING LAW & DISPUTE RESOLUTION', `<p>This Agreement shall be governed by the laws of the People's Republic of Bangladesh. The Parties shall first attempt to resolve any dispute through good faith discussions. If the dispute cannot be resolved within fourteen (14) days, the Parties may refer the matter to mediation before commencing legal proceedings, unless urgent court action is required. Nothing prevents either Party from seeking urgent interim or injunctive relief.</p>`],
  ['EXECUTION', `<p>This Agreement becomes effective on the date it is signed by both Parties. By signing this Agreement, each Party confirms that it has read and understood this Agreement, agrees to be bound by its terms, and confirms that the person signing has authority to bind the relevant Party. This Agreement may be executed in counterparts and by electronic signature.</p>`],
];

// ── Property Documentation & Verification Services — Customer Service Agreement
// (SSPC-PDVS-CSA-01 v0.2). Faithful to the client document. ──────────────────
const PDV_SERVICE_GROUPS = {
  'Property Documentation & Verification': ['Deed Verification', 'Chain of Ownership Verification', 'Title Review', 'Property Document Verification', 'Land Record Verification', 'Government Record Verification', 'Encumbrance Review', 'Due Diligence Documentation Review', 'Property Background Verification'],
  'Mutation & Land Record Support': ['Mutation Documentation Review', 'Mutation Application Support', 'Land Record Correction Support', 'Government Liaison Support', 'Record Status Verification', 'Mutation Follow-up'],
  'Property Documentation Support': ['Documentation Review', 'Drafting Property Correspondence', 'Official Correspondence Coordination', 'Property File Compilation', 'Administrative Documentation Support', 'Record Management Support'],
  'Conveyancing & Transfer Coordination': ['Property Transfer Documentation Support', 'Conveyancing Coordination', 'Sale & Purchase Documentation Review', 'Registration Coordination', 'Settlement Coordination', 'Due Diligence Coordination'],
  'NRB Property Documentation Support': ['Overseas Documentation Coordination', 'Remote Document Verification', 'Digital Documentation Support', 'Property Ownership Verification', 'Cross-Border Documentation Coordination'],
};

const PDV_CODE_TO_SCHEDULE_A = {
  'PDV-001': ['Deed Verification'], 'PDV-002': ['Chain of Ownership Verification'], 'PDV-003': ['Title Review'],
  'PDV-004': ['Property Document Verification'], 'PDV-005': ['Land Record Verification'], 'PDV-006': ['Government Record Verification'],
  'PDV-007': ['Encumbrance Review'], 'PDV-008': ['Due Diligence Documentation Review'], 'PDV-009': ['Property Background Verification'],
  'PDV-010': ['Mutation Documentation Review'], 'PDV-011': ['Mutation Application Support'], 'PDV-012': ['Land Record Correction Support'],
  'PDV-013': ['Government Liaison Support'], 'PDV-014': ['Record Status Verification'], 'PDV-015': ['Mutation Follow-up'],
  'PDV-016': ['Documentation Review'], 'PDV-017': ['Drafting Property Correspondence'], 'PDV-018': ['Official Correspondence Coordination'],
  'PDV-019': ['Property File Compilation'], 'PDV-020': ['Administrative Documentation Support'], 'PDV-021': ['Record Management Support'],
  'PDV-022': ['Property Transfer Documentation Support'], 'PDV-023': ['Conveyancing Coordination'], 'PDV-024': ['Sale & Purchase Documentation Review'],
  'PDV-025': ['Registration Coordination'], 'PDV-026': ['Settlement Coordination'], 'PDV-027': ['Due Diligence Coordination'],
  'PDV-028': ['Overseas Documentation Coordination'], 'PDV-029': ['Remote Document Verification'], 'PDV-030': ['Digital Documentation Support'],
  'PDV-031': ['Property Ownership Verification'], 'PDV-032': ['Cross-Border Documentation Coordination'],
};

const PDV_CHECKLIST_GROUPS = {
  'Warranty Coverage': ['Administrative Error Rectification', 'Documentation Rectification', 'Report Correction'],
  'Project Requirements': ['Documents Provided', 'Written Authority Provided', 'Accurate Information Confirmed'],
};

const PDV_SCHEDULE_B_ROWS = (b) => [
  ['Mouza', b.mouza], ['Dag / Plot No.', b.dag_no || b.tank_type], ['Khatian No.', b.khatian_no],
  ['Latest Land Record', b.land_record_basis || b.water_source], ['Property Type', b.property_type],
];

// 24 clauses faithful to SSPC-PDVS-CSA-01 v0.2 (adds Documentation & Verification Process + Service Standards).
const PDV_CLAUSES = [
  ['PURPOSE', `<p>This Agreement sets out the terms under which Seventh Sky will coordinate and manage Property Documentation &amp; Verification Services requested by the Client. Depending on the nature of the engagement, the Services may be performed directly by Seventh Sky or by qualified independent professionals appointed or coordinated by Seventh Sky. The specific Services, pricing and project requirements for each engagement will be confirmed in the approved Quotation and Work Order.</p>`],
  ['TERM', `<p>This Agreement becomes effective on the date it is signed by both Parties and continues until the agreed Services have been completed, all outstanding payments have been made, and both Parties have fulfilled their obligations, unless terminated earlier under this Agreement.</p>`],
  ['SERVICES', `<p>The Client may request one or more of the Services listed in <b>Schedule A</b>, covering Property Documentation &amp; Verification, Mutation &amp; Land Record Support, Property Documentation Support, Conveyancing &amp; Transfer Coordination and NRB Property Documentation Support. Only the Services selected in Schedule A or the approved Work Order form part of this Agreement.</p>`],
  ['PROJECT DETAILS', `<p>The details of each engagement shall be recorded in <b>Schedule B</b> or the approved Work Order, including property address, property type, selected Services, scope of work, required documentation, expected deliverables, estimated timeline, agreed fees, payment schedule and special requirements. If any inconsistency exists between this Agreement and the approved Work Order, the Work Order will prevail for that specific project.</p>`],
  ['RESPONSIBILITIES OF SEVENTH SKY', `<p>Seventh Sky will coordinate the requested Services; obtain quotations from independent professionals where required; appoint or coordinate qualified third-party service providers where applicable; manage project administration and documentation; keep the Client reasonably informed; coordinate communication with relevant stakeholders where authorised; provide copies of agreed deliverables upon completion; and use reasonable care and skill. Unless expressly stated otherwise, Seventh Sky acts as project coordinator and service administrator and does not guarantee decisions made by government authorities, courts, registries or independent professionals.</p>`],
  ['CLIENT RESPONSIBILITIES', `<p>The Client agrees to provide complete, accurate and up-to-date information and documents; promptly notify Seventh Sky of any relevant changes; cooperate with reasonable requests for additional information; provide written authorities where required to obtain or verify records; review quotations and Work Orders before Services commence; make payments in accordance with this Agreement; and review the completed Services and notify Seventh Sky of any concerns within a reasonable time. The Client warrants that all documents and information supplied are genuine to the best of their knowledge.</p>`],
  ['QUOTATIONS & WORK ORDERS', `<p>Before Services commence, Seventh Sky will provide the Client with a Quotation and, where applicable, a Work Order outlining the selected Services, scope of work, required documentation, expected deliverables, estimated timeline, agreed fees, payment schedule, anticipated third-party costs and any special conditions. Services will commence only after the Client has accepted the Quotation or Work Order. Any changes requested after approval may require a revised quotation or approved variation.</p>`],
  ['SERVICE FEES & PAYMENT', `<p>The total project cost will be specified in the approved Quotation or Work Order. Unless otherwise agreed, project fees may include consultation fees, documentation review fees, document verification coordination, mutation coordination services, conveyancing coordination services, project management services, administration fees, third-party coordination fees and approved additional services. Government charges, registration fees, legal fees, valuation fees and other third-party costs are payable by the Client unless expressly included in the approved quotation.</p>`],
  ['PAYMENT TERMS', `<p>Unless otherwise agreed in writing — <b>Standard Projects:</b> deposit upon acceptance of the Quotation or Work Order, progress payment (where applicable), final payment before release of the final report, completed documentation or project deliverables. <b>Ongoing Services:</b> payment may be made monthly, by agreed milestones, or in accordance with another agreed schedule. Invoices are payable within the period specified on the invoice. Late payment may result in delays, suspension of Services or withholding of final deliverables until outstanding payments are received.</p>`],
  ['DOCUMENTATION & VERIFICATION PROCESS', `<p>The Client acknowledges that documentation and verification Services are based on the information, records and documents available at the time of review. Where required, Seventh Sky may coordinate with Land Registry Offices, Sub-Registry Offices, AC Land Offices, City Corporations, Municipal Authorities, government agencies, licensed lawyers, conveyancers, surveyors and other qualified professionals. Verification findings may be affected by incomplete or inaccurate records, changes to government databases, pending registrations or applications, unavailable historical records, legal disputes, delays by government authorities, or circumstances beyond Seventh Sky's reasonable control. Where discrepancies, missing records or suspected irregularities are identified, Seventh Sky will inform the Client and, where appropriate, recommend further investigation or referral to a qualified professional.</p>`],
  ['PROJECT TIMELINES', `<p>Estimated project milestones will be provided in the approved Quotation or Work Order. Completion dates are estimates only and may be affected by government processing times, document availability, court or registry delays, client response times, third-party availability, additional investigations or other unforeseen circumstances. Where delays occur, Seventh Sky will keep the Client reasonably informed and provide revised estimated completion dates where practicable.</p>`],
  ['VARIATIONS & ADDITIONAL SERVICES', `<p>A variation occurs where the Client requests additional Services, additional documents require review or verification, the scope of work changes, new legal or administrative requirements arise, or unforeseen circumstances require additional work. Where practicable, Seventh Sky will advise the Client of the proposed variation, any additional fees, any revised timeline and any changes to the agreed deliverables. No variation will be undertaken without the Client's approval unless immediate action is reasonably necessary to protect the Client's interests or comply with legal or regulatory requirements.</p>`],
  ['THIRD-PARTY SERVICE PROVIDERS', `<p>The Client acknowledges that certain Services may require the involvement of independent professionals or government authorities, including lawyers, conveyancers, land consultants, surveyors, valuers, government departments, courts and tribunals, and other qualified specialists. Seventh Sky will exercise reasonable care in selecting and coordinating third-party providers. Unless otherwise agreed, third-party professionals remain responsible for the professional quality and accuracy of their own work; government authorities remain responsible for official records, approvals and registrations; courts and tribunals remain responsible for judicial decisions; and Seventh Sky remains responsible for coordinating the agreed Services.</p>`],
  ['SERVICE STANDARDS', `<p>Seventh Sky will perform the agreed Services with reasonable care, skill and diligence. Where applicable, Seventh Sky will coordinate document verification activities, review documentation provided by the Client or obtained from authorised sources, identify material inconsistencies or missing information, keep appropriate project records, and provide the agreed deliverables within the scope of the approved Work Order. Verification findings are based on the documents and records reasonably available at the time of review. Seventh Sky does not warrant the accuracy or completeness of government records, third-party documents or information supplied by the Client or other parties.</p>`],
  ['CLIENT COMPLAINTS & DOCUMENT DISCREPANCIES', `<p>If the Client believes the Services have not been provided in accordance with the agreed scope, the Client shall notify Seventh Sky as soon as reasonably practicable. Seventh Sky will acknowledge the complaint, investigate the matter, review relevant documentation, liaise with any relevant third-party provider where appropriate, provide updates and take reasonable steps to resolve the matter. Where discrepancies, missing documents or suspected irregularities are identified during the engagement, Seventh Sky will advise the Client and recommend appropriate next steps. Nothing in this Agreement limits any rights available to the Client under applicable law.</p>`],
  ['LIABILITY', `<p>To the extent permitted by the laws of Bangladesh, Seventh Sky is responsible for coordinating the agreed Services with reasonable care and skill. Government authorities remain responsible for official records, registrations and administrative decisions. Licensed lawyers remain responsible for legal advice and opinions. Surveyors, valuers and other professionals remain responsible for their own professional services. The Client remains responsible for the authenticity and completeness of the information and documents provided. Neither Party is liable for delays or losses caused by events beyond its reasonable control.</p>`],
  ['LIMITATION OF LIABILITY', `<p>To the extent permitted by law, Seventh Sky shall not be liable for indirect or consequential loss, loss of business opportunity or anticipated financial benefit, decisions made by government authorities, courts or tribunals, delays in government processing, incomplete or outdated public records, inaccurate or misleading information supplied by the Client or third parties, legal disputes relating to property ownership, or events beyond its reasonable control. Where permitted by law, Seventh Sky's total liability arising from a particular engagement shall not exceed the professional fees paid by the Client for the affected Services. Nothing excludes any liability that cannot legally be excluded.</p>`],
  ['CONFIDENTIALITY & PRIVACY', `<p>Each Party shall keep confidential all non-public personal, commercial and property-related information obtained through this Agreement. Personal information and documentation will only be collected, used and disclosed to perform the agreed Services, where authorised by the Client, where required by law, or where reasonably necessary to coordinate with approved third-party providers or government authorities. Each Party shall take reasonable measures to protect confidential information. These obligations continue after completion or termination of this Agreement.</p>`],
  ['FORCE MAJEURE', `<p>Neither Party shall be liable for any delay or failure to perform its obligations where such delay or failure results from circumstances beyond its reasonable control, including natural disasters, fire, flood or severe weather, war, civil unrest or terrorism, pandemics or public health emergencies, government actions or regulatory changes, major failures of utilities or communication systems, or any other event beyond the reasonable control of the affected Party. The affected Party shall notify the other as soon as reasonably practicable. If the event continues for more than sixty (60) days, either Party may terminate the affected Services by written notice.</p>`],
  ['CLIENT ACKNOWLEDGEMENTS', `<p>The Client acknowledges that the selected Services have been explained and accepted; that all documents and information provided are true and complete to the best of the Client's knowledge; that verification outcomes depend on the information and records available at the time of review; that government records and registration information may change after completion; that Seventh Sky does not provide legal advice unless expressly stated otherwise in writing; that independent legal advice should be obtained where appropriate; and that the Client has reviewed and accepted the approved Quotation and Work Order.</p>`],
  ['SUSPENSION & TERMINATION', `<p><b>Suspension.</b> Seventh Sky may suspend the Services where the Client fails to make payments, required documents or information are not provided, the Client provides false, misleading or incomplete information, continuation would breach applicable laws, or suspension is reasonably necessary to protect the Client, Seventh Sky or a third party. <b>Termination.</b> Either Party may terminate this Agreement where the other Party commits a material breach and fails to remedy it within fourteen (14) days after written notice; where the Services cannot reasonably continue due to circumstances beyond either Party's control; where both Parties agree in writing; or where a Force Majeure event continues beyond the specified period. Termination does not affect accrued rights, outstanding payments or obligations that survive termination.</p>`],
  ['GENERAL PROVISIONS', `<p>This Agreement constitutes the entire agreement between the Parties regarding the Services and supersedes all previous discussions and understandings. Any amendment must be made in writing and signed by both Parties. If any provision is found to be invalid or unenforceable, the remaining provisions shall remain in full force and effect. Electronic signatures and electronically exchanged documents shall have the same legal effect as original signed documents unless otherwise required by law.</p>`],
  ['GOVERNING LAW & DISPUTE RESOLUTION', `<p>This Agreement shall be governed by the laws of the People's Republic of Bangladesh. The Parties shall first attempt to resolve any dispute through good faith discussions. If the dispute cannot be resolved within fourteen (14) days, the Parties may refer the matter to mediation before commencing legal proceedings, unless urgent court action is required. Nothing prevents either Party from seeking urgent interim or injunctive relief.</p>`],
  ['EXECUTION', `<p>This Agreement becomes effective on the date it is signed by both Parties. By signing this Agreement, each Party confirms that it has read and understood this Agreement, agrees to be bound by its terms, and confirms that the person signing has authority to bind the relevant Party. This Agreement may be executed in counterparts and by electronic signature.</p>`],
];

// ── Property Will & Succession Support Services — Customer Service Agreement
// (SSPC-PWSS-CSA-01 v0.2). Faithful to the client document (whose doc-no field
// carried a PDVS copy-paste slip; the division/SOP are PWSS). ─────────────────
const PWS_SERVICE_GROUPS = {
  'Property Will Documentation Support': ['Property Will Documentation Review', 'Property Will Preparation Coordination', 'Will Documentation Assistance', 'Witness Coordination', 'Will Registration Coordination', 'Estate Documentation Review', 'Secure Document Storage Coordination'],
  'Property Ownership Transfer Support': ['Ownership Transfer Documentation Support', 'Beneficiary Documentation', 'Property Ownership Transfer Coordination', 'Estate Transfer Coordination', 'Succession Documentation Review', 'Property Record Verification'],
  'Property Nomination & Record Support': ['Beneficiary Record Review', 'Nomination Documentation', 'Property Ownership Record Review', 'Family Property Record Coordination', 'Property Portfolio Record Review'],
  'Legal & Professional Coordination': ['Lawyer Coordination', 'Conveyancer Coordination', 'Probate Practitioner Coordination', 'Estate Administration Coordination', 'Land Registry Coordination', 'Government Authority Liaison', 'Financial Institution Coordination'],
  'Property Succession Support': ['Succession Planning Coordination', 'Family Property Succession Coordination', 'Estate Documentation Coordination', 'Beneficiary Coordination', 'Property Succession Administration Support', 'Property Distribution Coordination', 'NRB Property Succession Support'],
};

const PWS_CODE_TO_SCHEDULE_A = {
  'PWS-001': ['Property Will Documentation Review'], 'PWS-002': ['Property Will Preparation Coordination'], 'PWS-003': ['Will Documentation Assistance'],
  'PWS-004': ['Witness Coordination'], 'PWS-005': ['Will Registration Coordination'], 'PWS-006': ['Estate Documentation Review'], 'PWS-007': ['Secure Document Storage Coordination'],
  'PWS-008': ['Ownership Transfer Documentation Support'], 'PWS-009': ['Beneficiary Documentation'], 'PWS-010': ['Property Ownership Transfer Coordination'],
  'PWS-011': ['Estate Transfer Coordination'], 'PWS-012': ['Succession Documentation Review'], 'PWS-013': ['Property Record Verification'],
  'PWS-014': ['Beneficiary Record Review'], 'PWS-015': ['Nomination Documentation'], 'PWS-016': ['Property Ownership Record Review'],
  'PWS-017': ['Family Property Record Coordination'], 'PWS-018': ['Property Portfolio Record Review'],
  'PWS-019': ['Lawyer Coordination'], 'PWS-020': ['Conveyancer Coordination'], 'PWS-021': ['Probate Practitioner Coordination'], 'PWS-022': ['Estate Administration Coordination'],
  'PWS-023': ['Land Registry Coordination'], 'PWS-024': ['Government Authority Liaison'], 'PWS-025': ['Financial Institution Coordination'],
  'PWS-026': ['Succession Planning Coordination'], 'PWS-027': ['Family Property Succession Coordination'], 'PWS-028': ['Estate Documentation Coordination'],
  'PWS-029': ['Beneficiary Coordination'], 'PWS-030': ['Property Succession Administration Support'], 'PWS-031': ['Property Distribution Coordination'], 'PWS-032': ['NRB Property Succession Support'],
};

const PWS_CHECKLIST_GROUPS = {
  'Warranty Coverage': ['Administrative Error Rectification', 'Documentation Rectification', 'Coordination Rectification'],
  'Project Requirements': ['Documents Provided', 'Beneficiary Details Provided', 'Accurate Information Confirmed'],
};

const PWS_SCHEDULE_B_ROWS = (b) => [
  ['Will Status', b.will_status || b.water_source], ['Estimated Estate Value', b.estate_value || b.tank_capacity],
  ['Number of Beneficiaries', b.beneficiaries || b.tanks_count], ['Property Type', b.property_type],
];

// 24 clauses faithful to SSPC-PWSS-CSA-01 v0.2 (Service Delivery Process + Professional Service Standards).
const PWS_CLAUSES = [
  ['PURPOSE', `<p>This Agreement sets out the terms under which Seventh Sky will coordinate and manage Property Will &amp; Succession Support Services requested by the Client. Depending on the nature of the engagement, the Services may be performed directly by Seventh Sky or coordinated through qualified independent professionals. Seventh Sky acts as a coordination and support provider; legal advice is provided only by qualified legal practitioners where required. The specific Services, pricing and project requirements for each engagement will be confirmed in the approved Quotation and Work Order.</p>`],
  ['TERM', `<p>This Agreement becomes effective on the date it is signed by both Parties and continues until the agreed Services have been completed, all outstanding payments have been made, and both Parties have fulfilled their obligations, unless terminated earlier under this Agreement.</p>`],
  ['SERVICES', `<p>The Client may request one or more of the Services listed in <b>Schedule A</b>, covering Property Will Documentation Support, Property Ownership Transfer Support, Property Nomination &amp; Record Support, Legal &amp; Professional Coordination, and Property Succession Support. Only the Services selected in Schedule A or the approved Work Order form part of this Agreement.</p>`],
  ['PROJECT DETAILS', `<p>The details of each engagement shall be recorded in <b>Schedule B</b> or the approved Work Order, including property and estate details, beneficiary information, selected Services, scope of work, required documentation, expected deliverables, estimated timeline, agreed fees, payment schedule and special requirements. If any inconsistency exists between this Agreement and the approved Work Order, the Work Order prevails for that specific engagement.</p>`],
  ['RESPONSIBILITIES OF SEVENTH SKY', `<p>Seventh Sky will coordinate the requested Services; obtain quotations from independent professionals where required; appoint or coordinate qualified third-party professionals (lawyers, conveyancers, estate administrators, probate practitioners) where applicable; manage project administration and documentation; keep the Client reasonably informed; coordinate with relevant stakeholders where authorised; and use reasonable care and skill. Unless separately licensed, Seventh Sky acts as a coordination and support provider and does not itself provide legal advice or guarantee decisions of courts, government authorities or independent professionals.</p>`],
  ['CLIENT RESPONSIBILITIES', `<p>The Client agrees to provide complete, accurate and up-to-date information and documents (including beneficiary and family details); promptly notify Seventh Sky of any relevant changes; cooperate with reasonable requests for additional information; provide written authorities where required; review quotations and Work Orders before Services commence; make payments in accordance with this Agreement; and review the completed Services and notify Seventh Sky of any concerns within a reasonable time. The Client warrants that all documents and information supplied are genuine and complete to the best of their knowledge.</p>`],
  ['QUOTATIONS & WORK ORDERS', `<p>Before Services commence, Seventh Sky will provide the Client with a Quotation and, where applicable, a Work Order outlining the selected Services, scope of work, required documentation, expected deliverables, estimated timeline, agreed fees, payment schedule, anticipated third-party costs and any special conditions. Services will commence only after the Client has accepted the Quotation or Work Order. Any changes requested after approval may require a revised quotation or approved variation.</p>`],
  ['SERVICE FEES & PAYMENT', `<p>The total project cost will be specified in the approved Quotation or Work Order. Unless otherwise agreed, project fees may include consultation fees, documentation review and coordination fees, will and succession coordination services, ownership transfer coordination, project management services, administration fees, third-party coordination fees and approved additional services. Government charges, registration fees, court fees, legal fees and other third-party costs are payable by the Client unless expressly included in the approved quotation.</p>`],
  ['PAYMENT TERMS', `<p>Unless otherwise agreed in writing — <b>Standard Projects:</b> deposit upon acceptance of the Quotation or Work Order, progress payment (where applicable), final payment before release of the final deliverables. <b>Ongoing Services:</b> payment may be made monthly, by agreed milestones, or in accordance with another agreed schedule. Invoices are payable within the period specified on the invoice. Late payment may result in delays, suspension of Services or withholding of final deliverables until outstanding payments are received.</p>`],
  ['SERVICE DELIVERY PROCESS', `<p>The Client acknowledges that will, succession and transfer Services are based on the information, documents and instructions available at the time. Where required, Seventh Sky may coordinate with lawyers, conveyancers, estate administrators, probate practitioners, Sub-Registry Offices, AC Land Offices, courts, government authorities and financial institutions. Outcomes may be affected by incomplete or inaccurate documents, family or beneficiary disputes, court or registry timeframes, missing records, changes in law, or circumstances beyond Seventh Sky's reasonable control. Where discrepancies, disputes or suspected irregularities are identified, Seventh Sky will inform the Client and, where appropriate, recommend referral to a qualified legal practitioner.</p>`],
  ['PROJECT TIMELINES', `<p>Estimated project milestones will be provided in the approved Quotation or Work Order. Completion dates are estimates only and may be affected by government or court processing times, document availability, beneficiary responsiveness, third-party availability, disputes, additional investigations or other unforeseen circumstances. Where delays occur, Seventh Sky will keep the Client reasonably informed and provide revised estimated completion dates where practicable.</p>`],
  ['VARIATIONS & ADDITIONAL SERVICES', `<p>A variation occurs where the Client requests additional Services, additional documents or beneficiaries require review, the scope of work changes, new legal or administrative requirements arise, or unforeseen circumstances require additional work. Where practicable, Seventh Sky will advise the Client of the proposed variation, any additional fees, any revised timeline and any changes to the agreed deliverables. No variation will be undertaken without the Client's approval unless immediate action is reasonably necessary to protect the Client's interests or comply with legal or regulatory requirements.</p>`],
  ['THIRD-PARTY SERVICE PROVIDERS', `<p>The Client acknowledges that certain Services may require the involvement of independent professionals or authorities, including lawyers, conveyancers, estate administrators, probate practitioners, notaries, government departments, courts and financial institutions. Seventh Sky will exercise reasonable care in selecting and coordinating third-party providers. Unless otherwise agreed, third-party professionals remain responsible for the professional quality and accuracy of their own work and any legal advice; government authorities and courts remain responsible for official records, registrations and judicial decisions; and Seventh Sky remains responsible for coordinating the agreed Services.</p>`],
  ['PROFESSIONAL SERVICE STANDARDS', `<p>Seventh Sky will perform the agreed Services with reasonable care, skill and diligence. Where applicable, Seventh Sky will coordinate documentation review, review documents provided by the Client or obtained from authorised sources, identify material inconsistencies or missing information, keep appropriate project records, and provide the agreed deliverables within the scope of the approved Work Order. Seventh Sky verifies completeness of documents, not their legal validity, which remains a matter for a qualified legal practitioner. Seventh Sky does not warrant the accuracy or completeness of government records, third-party documents or information supplied by the Client or other parties.</p>`],
  ['CLIENT COMPLAINTS & SERVICE ISSUES', `<p>If the Client believes the Services have not been provided in accordance with the agreed scope, the Client shall notify Seventh Sky as soon as reasonably practicable. Seventh Sky will acknowledge the complaint, investigate the matter, review relevant documentation, liaise with any relevant third-party provider where appropriate, provide updates and take reasonable steps to resolve the matter. Nothing in this Agreement limits any rights available to the Client under applicable law.</p>`],
  ['LIABILITY', `<p>To the extent permitted by the laws of Bangladesh, Seventh Sky is responsible for coordinating the agreed Services with reasonable care and skill. Licensed lawyers and probate practitioners remain responsible for legal advice and opinions. Government authorities and courts remain responsible for official records, registrations and judicial decisions. The Client remains responsible for the authenticity and completeness of the information and documents provided, including beneficiary details. Neither Party is liable for delays or losses caused by events beyond its reasonable control.</p>`],
  ['LIMITATION OF LIABILITY', `<p>To the extent permitted by law, Seventh Sky shall not be liable for indirect or consequential loss, loss of inheritance, entitlement or anticipated benefit, decisions made by courts, government authorities or independent professionals, delays in government or court processing, incomplete or outdated records, inaccurate or misleading information supplied by the Client or third parties, family, beneficiary or ownership disputes, or events beyond its reasonable control. Where permitted by law, Seventh Sky's total liability arising from a particular engagement shall not exceed the professional fees paid by the Client for the affected Services. Nothing excludes any liability that cannot legally be excluded.</p>`],
  ['CONFIDENTIALITY & PRIVACY', `<p>Each Party shall keep confidential all non-public personal, family, financial and property-related information obtained through this Agreement. Personal information and documentation will only be collected, used and disclosed to perform the agreed Services, where authorised by the Client, where required by law, or where reasonably necessary to coordinate with approved third-party providers, authorities or courts. Each Party shall take reasonable measures to protect confidential information. These obligations continue after completion or termination of this Agreement.</p>`],
  ['FORCE MAJEURE', `<p>Neither Party shall be liable for any delay or failure to perform its obligations where such delay or failure results from circumstances beyond its reasonable control, including natural disasters, fire, flood or severe weather, war, civil unrest or terrorism, pandemics or public health emergencies, government actions or regulatory changes, major failures of utilities or communication systems, or any other event beyond the reasonable control of the affected Party. The affected Party shall notify the other as soon as reasonably practicable. If the event continues for more than sixty (60) days, either Party may terminate the affected Services by written notice.</p>`],
  ['CLIENT ACKNOWLEDGEMENTS', `<p>The Client acknowledges that the selected Services have been explained and accepted; that Seventh Sky acts as a coordination and support provider and does not itself provide legal advice unless expressly stated otherwise in writing; that all documents and information provided (including beneficiary details) are true and complete to the best of the Client's knowledge; that outcomes depend on documents, instructions and third-party or court decisions; that independent legal advice should be obtained where appropriate; and that the Client has reviewed and accepted the approved Quotation and Work Order.</p>`],
  ['SUSPENSION & TERMINATION', `<p><b>Suspension.</b> Seventh Sky may suspend the Services where the Client fails to make payments, required documents or information are not provided, the Client provides false, misleading or incomplete information, continuation would breach applicable laws, or suspension is reasonably necessary to protect the Client, Seventh Sky or a third party. <b>Termination.</b> Either Party may terminate this Agreement where the other Party commits a material breach and fails to remedy it within fourteen (14) days after written notice; where the Services cannot reasonably continue due to circumstances beyond either Party's control; where both Parties agree in writing; or where a Force Majeure event continues beyond the specified period. Termination does not affect accrued rights, outstanding payments or obligations that survive termination.</p>`],
  ['GENERAL PROVISIONS', `<p>This Agreement constitutes the entire agreement between the Parties regarding the Services and supersedes all previous discussions and understandings. Any amendment must be made in writing and signed by both Parties. If any provision is found to be invalid or unenforceable, the remaining provisions shall remain in full force and effect. Electronic signatures and electronically exchanged documents shall have the same legal effect as original signed documents unless otherwise required by law.</p>`],
  ['GOVERNING LAW & DISPUTE RESOLUTION', `<p>This Agreement shall be governed by the laws of the People's Republic of Bangladesh. The Parties shall first attempt to resolve any dispute through good faith discussions. If the dispute cannot be resolved within fourteen (14) days, the Parties may refer the matter to mediation before commencing legal proceedings, unless urgent court action is required. Nothing prevents either Party from seeking urgent interim or injunctive relief.</p>`],
  ['EXECUTION', `<p>This Agreement becomes effective on the date it is signed by both Parties. By signing this Agreement, each Party confirms that it has read and understood this Agreement, agrees to be bound by its terms, and confirms that the person signing has authority to bind the relevant Party. This Agreement may be executed in counterparts and by electronic signature.</p>`],
];

// ── Removal & Relocation Services — Customer Service Agreement
// (SSPC-RRS-CSA-01 v0.2). Delivered by Seventh Sky's own team/vehicles; the
// Prohibited-Items Declaration + Inventory Acknowledgement ride along as signed
// Schedule-D checklist groups. Faithful to the client document. ──────────────
const RRS_SERVICE_GROUPS = {
  'Residential Relocation': ['Studio Apartment', '1 Bedroom', '2 Bedroom', '3 Bedroom', '4 Bedroom+'],
  'Commercial Relocation': ['Office Relocation', 'Retail Shop Relocation', 'Warehouse Relocation', 'Business Relocation'],
  'Packing Services': ['Packing', 'Unpacking', 'Fragile Item Packing', 'Furniture Wrapping', 'Carton Supply'],
  'Furniture Services': ['Furniture Moving', 'Furniture Dismantling', 'Furniture Reassembly', 'Heavy Item Moving'],
  'Clearance & Disposal': ['Household Clearance', 'Office Clearance', 'Furniture Disposal', 'General Waste Removal'],
  'Move Support': ['Move-In Support', 'Move-Out Support', 'Utility Coordination', 'Address Change Assistance'],
  'Other Services': ['Temporary Storage Coordination', 'Labour Only', 'Vehicle Only', 'Emergency Relocation'],
};

const RRS_CODE_TO_SCHEDULE_A = {
  'REM-001': ['Studio Apartment'], 'REM-002': ['1 Bedroom'], 'REM-003': ['2 Bedroom'], 'REM-004': ['3 Bedroom'], 'REM-005': ['4 Bedroom+'],
  'REM-006': ['Office Relocation'], 'REM-007': ['Retail Shop Relocation'], 'REM-008': ['Warehouse Relocation'], 'REM-009': ['Business Relocation'],
  'REM-010': ['Packing'], 'REM-011': ['Unpacking'], 'REM-012': ['Fragile Item Packing'], 'REM-013': ['Furniture Wrapping'], 'REM-014': ['Carton Supply'],
  'REM-015': ['Furniture Moving'], 'REM-016': ['Furniture Dismantling'], 'REM-017': ['Furniture Reassembly'], 'REM-018': ['Heavy Item Moving'],
  'REM-019': ['Household Clearance'], 'REM-020': ['Office Clearance'], 'REM-021': ['Furniture Disposal'], 'REM-022': ['General Waste Removal'],
  'REM-023': ['Move-In Support'], 'REM-024': ['Move-Out Support'], 'REM-025': ['Utility Coordination'], 'REM-026': ['Address Change Assistance'],
  'REM-027': ['Temporary Storage Coordination'], 'REM-028': ['Labour Only'], 'REM-029': ['Vehicle Only'], 'REM-030': ['Emergency Relocation'],
};

const RRS_CHECKLIST_GROUPS = {
  'Warranty Coverage': ['Service Rectification', 'Damage Rectification'],
  'Prohibited Items Declaration': ['No illegal or prohibited items', 'No explosives, firearms or ammunition', 'No flammable, hazardous or toxic substances', 'No cash, jewellery or valuables in cartons', 'All special-handling items declared'],
  'Inventory Acknowledgement': ['The inventory list is accurate and complete', 'Valuables/cash excluded unless separately insured', 'Fragile / high-value items identified'],
  'Project Requirements': ['Pickup access confirmed', 'Drop-off access confirmed', 'Deposit (50%) understood'],
};

const RRS_SCHEDULE_B_ROWS = (b) => [
  ['Pickup Address', b.pickup_address], ['Drop-off Address', b.dropoff_address],
  ['Move Type', b.move_type || b.tank_type], ['Estimated Volume', b.volume || b.tanks_count],
  ['Vehicle Required', b.vehicle || b.tank_capacity], ['Distance / Route', b.distance || b.water_source],
  ['Scheduled Move Date', b.move_date],
];

// 23 clauses faithful to SSPC-RRS-CSA-01 v0.2.
const RRS_CLAUSES = [
  ['PURPOSE', `<p>This Agreement sets out the terms under which Seventh Sky will provide Removal &amp; Relocation Services to the Client. The Services are delivered by Seventh Sky's own trained personnel and vehicles, or where agreed by an approved contractor coordinated by Seventh Sky. The specific services, pricing and requirements for each move will be confirmed in the approved Quotation and Work Order.</p>`],
  ['TERM', `<p>This Agreement becomes effective on the date it is signed by both Parties and continues until the agreed Services have been completed, all outstanding payments have been made, and any claims have been resolved, unless terminated earlier under this Agreement.</p>`],
  ['SERVICES', `<p>The Client may request one or more of the services listed in <b>Schedule A</b>, covering Residential Relocation, Commercial Relocation, Packing, Furniture Services, Clearance &amp; Disposal, Move Support and other services. Only the services selected in Schedule A or the approved Work Order form part of this Agreement.</p>`],
  ['SERVICE BOOKING & WORK ORDER', `<p>Before the Services commence, Seventh Sky will issue a Work Order confirming the pickup address, delivery address, selected services, scheduled service date, estimated completion timeframe, agreed pricing, payment schedule and any special instructions. The Work Order forms part of this Agreement; if any inconsistency exists between this Agreement and the Work Order, the Work Order prevails for that particular project.</p>`],
  ['RESPONSIBILITIES OF SEVENTH SKY', `<p>Seventh Sky will provide the agreed Services with reasonable care and skill; provide suitably trained personnel; use appropriate vehicles and equipment; exercise reasonable care when handling Client property; keep the Client informed of significant delays where reasonably practicable; comply with applicable laws; and complete the Services within the agreed timeframe where reasonably possible.</p>`],
  ['CLIENT RESPONSIBILITIES', `<p>The Client agrees to provide accurate information regarding the items to be transported; ensure safe and reasonable access at both pickup and delivery locations; ensure parking or loading access where reasonably available; identify fragile, valuable or special-handling items before work commences; ensure all items are properly packed unless packing services have been purchased; arrange access to lifts or building management where required; and make payments in accordance with this Agreement. The Client remains responsible for ensuring that all goods presented for transport are lawful and suitable for relocation.</p>`],
  ['PROHIBITED ITEMS', `<p>Unless otherwise agreed in writing, Seventh Sky will not transport or store illegal or prohibited items; explosives, firearms or ammunition; flammable, hazardous or toxic substances; perishable goods; live animals; cash, jewellery, precious metals or valuable collectibles; passports, legal documents or negotiable instruments; dangerous chemicals; or any item prohibited under applicable law. The Client must declare any item requiring special handling before the Services commence. If prohibited or undeclared dangerous goods are discovered, Seventh Sky may refuse to transport them without liability. (The Client's Prohibited-Items Declaration is recorded in Schedule D.)</p>`],
  ['SERVICE FEES & PAYMENT', `<p>The total project price shall be confirmed in the approved Work Order and may include relocation services, packing and unpacking, loading and unloading, dismantling and reassembly, labour charges, vehicle charges, packing materials, disposal services, waiting time, stair-carrying charges, long-carry distance charges, tolls/parking/government charges (where applicable) and any approved additional services. The Client agrees to pay all agreed charges in accordance with the approved payment schedule.</p>`],
  ['PAYMENT TERMS', `<p>Unless otherwise agreed in writing — <b>Residential Relocation:</b> deposit upon acceptance of the Work Order, balance payable upon completion. <b>Commercial Relocation:</b> deposit upon acceptance, progress payment (where applicable), final payment upon completion. Invoices are payable within the period specified on the invoice; late payments may result in suspension of the Services. Ownership of packing materials supplied by Seventh Sky remains with Seventh Sky until full payment has been received where applicable.</p>`],
  ['VARIATIONS & ADDITIONAL SERVICES', `<p>A variation occurs where additional items are added after booking, additional labour or vehicles are required, access conditions differ from those advised, dismantling/reassembly requirements change, waiting time exceeds the agreed allowance, additional packing materials are required, or the Client requests additional services. Where practical, Seventh Sky will advise the Client of the additional work, any additional charges and any expected delay. Variations proceed only after Client approval unless immediate action is required for safety or property protection.</p>`],
  ['LIABILITY', `<p>Seventh Sky will exercise reasonable care in handling the Client's property. However, Seventh Sky shall not be responsible for loss or damage resulting from inadequate packing by the Client, pre-existing damage, ordinary wear and tear, concealed defects, mechanical or electrical failure of transported items, prohibited or undeclared goods, events beyond reasonable control, or instructions provided by the Client. Where loss or damage is caused by Seventh Sky's negligence, liability shall be determined in accordance with applicable law.</p>`],
  ['CLIENT INSURANCE', `<p>The Client is encouraged to maintain appropriate insurance for valuable belongings being transported. Unless specifically agreed in writing, Seventh Sky does not provide automatic transit insurance; insurance claims remain subject to the insurer's policy terms; and high-value items should be separately insured by the Client before transportation. Where transit insurance is arranged through Seventh Sky, it remains subject to the insurer's acceptance, terms and conditions.</p>`],
  ['STANDARD PRICE SCHEDULE', `<p>The Parties acknowledge that Seventh Sky maintains a Standard Price Schedule within its CRM, which serves as the pricing guide for quotations, agreements and Work Orders and may be updated from time to time. Unless otherwise agreed in writing, the applicable pricing for each project shall be confirmed in the approved Work Order; discounts or negotiated pricing may apply; and the final approved Work Order price prevails over the Standard Price Schedule (Schedule B).</p>`],
  ['DELAYS & FORCE MAJEURE', `<p>Seventh Sky will make reasonable efforts to complete the Services within the agreed timeframe. However, delays may occur due to circumstances beyond reasonable control, including severe weather, road closures or traffic incidents, government restrictions, natural disasters, vehicle breakdowns, industrial action, utility disruptions or other unforeseen events. Where reasonably practicable, Seventh Sky will notify the Client of any significant delay and provide an updated estimated completion time.</p>`],
  ['PROPERTY DAMAGE & CLIENT COMPLAINTS', `<p>The Client should inspect the Services upon completion and notify Seventh Sky of any damage, loss or concerns as soon as reasonably practicable. Upon receiving a complaint, Seventh Sky will acknowledge it, investigate the matter, inspect the affected items where required, determine appropriate corrective action and respond within a reasonable timeframe. Where Seventh Sky accepts responsibility for damage caused by its negligence, it will take reasonable steps to repair, replace or compensate the Client in accordance with applicable law. Nothing in this Agreement limits any rights available to the Client under applicable consumer protection laws.</p>`],
  ['LIMITATION OF LIABILITY', `<p>To the extent permitted by the laws of Bangladesh, Seventh Sky's liability is limited to direct loss or damage resulting from its negligence or breach of this Agreement; Seventh Sky shall not be liable for indirect, consequential or business losses, including loss of income, profit, goodwill or opportunity; and liability shall not exceed the total amount paid by the Client for the affected Services unless otherwise required by law. This clause does not exclude liability that cannot legally be excluded.</p>`],
  ['CONFIDENTIALITY & PRIVACY', `<p>Each Party agrees to keep confidential all non-public information obtained during the provision of the Services. Personal information collected by Seventh Sky will only be used for providing the requested Services, communicating with the Client, preparing quotations/invoices/Work Orders, complying with legal obligations, or other purposes authorised by the Client. Neither Party shall disclose confidential information to any third party except where required by law or with the other Party's written consent. These obligations continue after completion or termination of this Agreement.</p>`],
  ['CLIENT ACKNOWLEDGEMENTS', `<p>The Client acknowledges that the quotation is based on the information provided by the Client; that additional charges may apply where the actual scope of work differs from the original booking; that delays may occur due to circumstances beyond Seventh Sky's reasonable control; that valuable, fragile or special-handling items must be declared before the Services commence; that prohibited items will not be transported; and that the Client has had the opportunity to ask questions and obtain independent advice before signing this Agreement.</p>`],
  ['DISPUTE RESOLUTION', `<p>If a dispute arises, the Parties agree to attempt to resolve the matter through good faith discussions. If the dispute cannot be resolved through negotiation, the Parties may agree to mediation before commencing legal proceedings. Nothing in this clause prevents either Party from seeking urgent legal remedies where necessary.</p>`],
  ['SUSPENSION & TERMINATION', `<p><b>Suspension.</b> Seventh Sky may suspend the Services where payment has not been made in accordance with this Agreement, the worksite is unsafe, access to the property is unavailable, the Client requests suspension, or continuation would be unlawful or unsafe. <b>Termination.</b> Either Party may terminate this Agreement by written notice before the Services commence. Where the Client terminates after work has commenced, the Client remains responsible for payment for Services already performed, labour costs incurred, packing materials used, transportation costs incurred, equipment hired and any other reasonable costs incurred before termination. Termination does not affect any rights or obligations that arose before termination.</p>`],
  ['GENERAL PROVISIONS', `<p>Unless otherwise agreed in writing, this Agreement together with the accepted Quotation, Work Order and Schedules constitutes the entire agreement between the Parties; any amendment must be made in writing and signed or electronically accepted by both Parties; failure by either Party to enforce a provision does not waive its rights; if any provision is found invalid or unenforceable, the remaining provisions continue in full force and effect; and notices under this Agreement may be delivered by hand, courier, registered post or email.</p>`],
  ['GOVERNING LAW', `<p>This Agreement shall be governed by the laws of the People's Republic of Bangladesh. The Parties agree to attempt to resolve disputes through good faith discussions before commencing legal proceedings. If a dispute cannot be resolved amicably, it shall be submitted to the competent courts of Bangladesh.</p>`],
  ['EXECUTION', `<p>By signing this Agreement, the Parties confirm that they have read and understood this Agreement, have had the opportunity to obtain independent legal or professional advice, voluntarily enter into this Agreement, and agree to be legally bound by its terms. This Agreement may be executed electronically through an approved electronic signature platform.</p>`],
];

/* ── Property Care & Concierge (SSPC-PCCS-CSA-01) ── */
const PCC_SERVICE_GROUPS = {
  'Property Care & Maintenance': ['Cleaning Services', 'Gardening & Landscaping', 'General Repairs & Maintenance', 'Painting Services', 'Minor Renovation Services', 'Emergency Assistance', 'Property Inspections', 'Utility Bill Assistance', 'Work Progress Reporting', 'Before & After Work Photography'],
  'Property Presentation': ['Property Styling', 'Home Staging', 'Furnishing Assistance', 'Seasonal Property Preparation', 'Property Readiness'],
  'Smart Property Solutions': ['CCTV Installation', 'Smart Lock Installation', 'Smart Home Devices', 'Access Control Systems', 'Remote Property Monitoring'],
  'Security & Monitoring': ['Vacant Property Checks', 'Property Monitoring', 'Emergency Property Response', 'Security Patrol Services'],
  'Property Marketing Support': ['Professional Photography', 'Videography', 'Drone Photography', 'Listing Preparation', 'Social Media Promotion'],
  'NRB Property Services': ['Overseas Owner Reporting', 'Remote Property Monitoring (NRB)', 'Periodic Video Inspection Reports', 'Property Visit Reports', 'Property Care While Owner is Overseas'],
  'Concierge Services': ['Mail Collection', 'Key Holding', 'Property Opening & Closing', 'Appointment Coordination', 'Utility Connection Assistance', 'Property Preparation Before Arrival'],
};

const PCC_CODE_TO_SCHEDULE_A = {
  'PCM-001': ['Cleaning Services'], 'PCM-002': ['Gardening & Landscaping'], 'PCM-003': ['General Repairs & Maintenance'], 'PCM-004': ['Painting Services'], 'PCM-005': ['Minor Renovation Services'], 'PCM-006': ['Emergency Assistance'], 'PCM-007': ['Property Inspections'], 'PCM-008': ['Utility Bill Assistance'], 'PCM-009': ['Work Progress Reporting'], 'PCM-010': ['Before & After Work Photography'],
  'PPR-001': ['Property Styling'], 'PPR-002': ['Home Staging'], 'PPR-003': ['Furnishing Assistance'], 'PPR-004': ['Seasonal Property Preparation'], 'PPR-005': ['Property Readiness'],
  'SPS-001': ['CCTV Installation'], 'SPS-002': ['Smart Lock Installation'], 'SPS-003': ['Smart Home Devices'], 'SPS-004': ['Access Control Systems'], 'SPS-005': ['Remote Property Monitoring'],
  'SEC-001': ['Vacant Property Checks'], 'SEC-002': ['Property Monitoring'], 'SEC-003': ['Emergency Property Response'], 'SEC-004': ['Security Patrol Services'],
  'MKT-001': ['Professional Photography'], 'MKT-002': ['Videography'], 'MKT-003': ['Drone Photography'], 'MKT-004': ['Listing Preparation'], 'MKT-005': ['Social Media Promotion'],
  'NRB-001': ['Overseas Owner Reporting'], 'NRB-002': ['Remote Property Monitoring (NRB)'], 'NRB-003': ['Periodic Video Inspection Reports'], 'NRB-004': ['Property Visit Reports'], 'NRB-005': ['Property Care While Owner is Overseas'],
  'CON-001': ['Mail Collection'], 'CON-002': ['Key Holding'], 'CON-003': ['Property Opening & Closing'], 'CON-004': ['Appointment Coordination'], 'CON-005': ['Utility Connection Assistance'], 'CON-006': ['Property Preparation Before Arrival'],
};

const PCC_CHECKLIST_GROUPS = {
  'Warranty Coverage': ['Service Rectification', 'Workmanship Rectification'],
  'Client Acknowledgements': ['The selected services are those in Schedule A / the approved Work Order', 'Quotations are based on the information available at preparation', 'Additional work may be needed if previously unknown conditions are found', 'Variations may result in additional charges', 'Reasonable access to the property will be provided throughout'],
  'Property Access & Valuables Declaration': ['Safe and reasonable access to the property will be provided', 'Keys / access cards / security codes arrangement confirmed', 'Valuable, fragile or confidential items secured before service', 'Known hazards or safety risks declared', 'Restricted areas identified'],
  'Service Standards': ['The property will be protected during the service', 'The work area will be cleaned on completion', 'Before & after photos taken where applicable', 'The property will be secured and access returned on completion'],
};

const PCC_SCHEDULE_B_ROWS = (b) => [
  ['Property Address', b.property_address || b.site_address], ['Service Category', b.service_category || b.tank_type],
  ['Service Frequency', b.frequency || b.tanks_count], ['Access Method', b.access_method || b.tank_capacity],
  ['Occupancy Status', b.occupancy || b.water_source], ['Scheduled Start Date', b.start_date || b.move_date],
];

// 22 clauses faithful to SSPC-PCCS-CSA-01 v0.2.
const PCC_CLAUSES = [
  ['PURPOSE', `<p>This Agreement sets out the terms and conditions under which Seventh Sky will provide Property Care &amp; Concierge Services requested by the Client. The Services are delivered by Seventh Sky's own trained personnel, or where agreed by an authorised subcontractor coordinated by Seventh Sky. The specific services, project requirements, pricing and payment arrangements shall be confirmed in the approved Work Order.</p>`],
  ['TERM', `<p>This Agreement commences on the date it is signed by both Parties and remains in effect until the Services have been completed, all payments have been made and all obligations under this Agreement have been fulfilled, unless terminated earlier in accordance with this Agreement. For ongoing or scheduled services, this Agreement continues for the agreed service term.</p>`],
  ['SERVICES', `<p>The Client may request one or more of the services listed in <b>Schedule A</b>, covering Property Care &amp; Maintenance, Property Presentation, Smart Property Solutions, Security &amp; Monitoring, Property Marketing Support, NRB Property Services and Concierge Services. Only the services selected in Schedule A or the approved Work Order form part of this Agreement.</p>`],
  ['SERVICE BOOKING & WORK ORDER', `<p>Before the Services commence, Seventh Sky will issue a Work Order confirming the property address, selected services, scheduled service date(s), estimated completion timeframe, agreed pricing, payment schedule, any materials or equipment, and any special instructions. The approved Work Order forms part of this Agreement; if any inconsistency exists between this Agreement and the Work Order, the Work Order prevails for that particular project.</p>`],
  ['SEVENTH SKY RESPONSIBILITIES', `<p>Seventh Sky will provide the agreed Services with reasonable care and skill; provide suitably trained personnel or authorised representatives; use appropriate equipment, tools and materials where applicable; perform the Services in accordance with applicable laws and industry standards; take reasonable care while attending the Client's property; keep the Client informed of significant delays where reasonably practicable; complete the Services within the agreed timeframe where reasonably possible; and promptly notify the Client where additional work is identified. Where specialist work requiring licensing or certification is necessary, appropriately qualified personnel will perform the Services.</p>`],
  ['CLIENT RESPONSIBILITIES', `<p>The Client agrees to provide accurate information regarding the property and requested Services; provide safe and reasonable access to the property; ensure utilities required for the Services (such as electricity and water) are available where necessary; remove or secure valuable, fragile or confidential items before the Services commence; obtain approvals from landlords, body corporates or relevant authorities where required; advise Seventh Sky of any known hazards or safety risks; inspect completed work within a reasonable time; and make payments in accordance with this Agreement.</p>`],
  ['SITE ACCESS', `<p>The Client shall provide reasonable access to the property during the agreed service period. If access is unavailable at the scheduled time, Seventh Sky may reschedule the Services, charge a reasonable call-out or waiting fee, or recover any additional costs reasonably incurred. Where keys, access cards or security codes are provided to Seventh Sky, they will be used solely for the purpose of delivering the agreed Services and handled with reasonable care. (Key-holding and access arrangements are recorded in the Property Access Declaration — Schedule D.)</p>`],
  ['SERVICE FEES & PAYMENT', `<p>The total project price shall be confirmed in the approved Work Order and may include labour charges, service call-out fees, inspection fees, equipment hire, cleaning/gardening/repair/painting materials, replacement parts, security equipment, smart property devices, transportation costs, disposal costs, permit or government charges (where applicable) and any approved additional services. The Client agrees to pay all agreed charges in accordance with the approved payment schedule.</p>`],
  ['PAYMENT TERMS', `<p>Unless otherwise agreed in writing — <b>One-Off Services:</b> deposit upon acceptance of the Work Order (where applicable), balance payable upon completion. <b>Ongoing or Scheduled Services:</b> payment shall be made in accordance with the agreed service schedule, with monthly or periodic invoices payable within the period stated on the invoice. Late payments may result in suspension of Services, postponement of future bookings, and recovery of any reasonable collection costs permitted by law. Ownership of any materials or equipment supplied by Seventh Sky remains with Seventh Sky until full payment has been received where applicable.</p>`],
  ['VARIATIONS & ADDITIONAL SERVICES', `<p>A variation occurs where additional Services are requested, additional labour or materials are required, access conditions differ from those advised, hidden defects or previously undisclosed issues are identified, emergency work becomes necessary, or the Client requests changes after the Work Order has been approved. Where practical, Seventh Sky will advise the Client of the additional work, any additional charges and any expected delay. Variations proceed only after Client approval unless immediate action is reasonably required to protect persons, prevent further property damage, or comply with legal or safety obligations. Approved variations become part of the relevant Work Order.</p>`],
  ['LIABILITY', `<p>Seventh Sky will exercise reasonable care and skill in providing the Services. However, Seventh Sky shall not be responsible for loss, damage or delays resulting from pre-existing defects or damage, hidden structural or building defects, inaccurate information supplied by the Client, normal wear and tear, manufacturer defects, unsuitable building materials previously installed, failure of existing building systems, events beyond Seventh Sky's reasonable control, acts or omissions of the Client or third parties, or the Client's failure to follow reasonable maintenance recommendations. Where loss or damage is caused by Seventh Sky's negligence, liability shall be determined in accordance with the applicable laws of Bangladesh.</p>`],
  ['STANDARD PRICE SCHEDULE', `<p>The Parties acknowledge that Seventh Sky maintains a Standard Price Schedule within its CRM, which serves as the pricing guide for quotations, agreements and Work Orders and may be updated from time to time. Unless otherwise agreed in writing, the applicable pricing for each project shall be confirmed in the approved Work Order; promotional, negotiated or package pricing may apply; and the final approved Work Order price prevails over the Standard Price Schedule (Schedule B).</p>`],
  ['DELAYS & FORCE MAJEURE', `<p>Seventh Sky will make reasonable efforts to complete the Services within the agreed timeframe. However, delays may occur due to circumstances beyond reasonable control, including severe weather, natural disasters, government restrictions or regulatory requirements, utility disruptions, supplier or material shortages, transportation disruptions, labour shortages or industrial action, emergencies affecting the property, or any other event beyond the reasonable control of Seventh Sky. Neither Party shall be liable for any delay or failure to perform where such delay or failure results from a Force Majeure event.</p>`],
  ['PROPERTY DAMAGE & CLIENT COMPLAINTS', `<p>If the Client believes that property has been damaged, the Services have not been completed as agreed, or there is any concern regarding the quality of the Services, the Client must notify Seventh Sky as soon as reasonably practicable. Upon receiving notification, Seventh Sky may inspect the property, investigate the matter, request supporting photographs or information, rectify the issue where appropriate, or propose another reasonable resolution. The Client agrees to provide Seventh Sky with a reasonable opportunity to inspect and rectify any issue before engaging another service provider, except where immediate action is reasonably necessary to protect persons or property.</p>`],
  ['LIMITATION OF LIABILITY', `<p>To the extent permitted by the applicable laws of Bangladesh, Seventh Sky's liability is limited to the reasonable cost of rectifying defective Services directly provided by Seventh Sky; Seventh Sky shall not be liable for indirect, consequential or economic loss, including loss of income, business interruption or loss of opportunity; Seventh Sky shall not be responsible for damage arising from pre-existing defects, hidden conditions, structural failures or matters beyond its reasonable control; and any compensation payable shall not exceed the total fees paid by the Client for the specific Services giving rise to the claim, except where liability cannot be excluded under applicable law. Nothing in this Agreement excludes any rights or remedies that cannot lawfully be excluded.</p>`],
  ['CONFIDENTIALITY & PRIVACY', `<p>Each Party agrees to keep confidential all personal, commercial and property-related information obtained in connection with this Agreement. Seventh Sky may collect, use and retain Client information for providing the Services, communicating with the Client, preparing quotations/Work Orders/invoices, maintaining service records within its CRM, complying with legal obligations, and improving service quality. Neither Party shall disclose confidential information to any third party except with the other Party's consent, where required by law, or where reasonably necessary for the provision of the agreed Services.</p>`],
  ['CLIENT ACKNOWLEDGEMENTS', `<p>The Client acknowledges and agrees that the selected Services are those identified in Schedule A and the approved Work Order; quotations are based on the information available at the time of preparation; additional work may become necessary if previously unknown conditions are discovered; delays may occur due to circumstances beyond Seventh Sky's reasonable control; variations may result in additional charges; reasonable access to the property must be provided throughout the project; and the Client has had the opportunity to read and understand this Agreement before signing it. (The Client's acknowledgements and declarations are recorded in Schedule D.)</p>`],
  ['DISPUTE RESOLUTION', `<p>If any dispute arises under this Agreement, the Parties agree to attempt to resolve the matter in good faith through direct discussion. If the dispute cannot be resolved within a reasonable time, either Party may refer the matter to mediation before commencing legal proceedings, unless urgent legal action is required. Nothing in this clause prevents either Party from seeking urgent relief through a court of competent jurisdiction.</p>`],
  ['SUSPENSION & TERMINATION', `<p><b>Suspension.</b> Seventh Sky may suspend the Services where the Client fails to make payments when due, fails to provide safe or reasonable site access, continuing the Services would create an unacceptable safety risk, the Client breaches this Agreement, or suspension is required by law. <b>Termination.</b> Either Party may terminate this Agreement by written notice where the other Party commits a material breach and fails to remedy it within a reasonable period after written notice, the Services cannot reasonably proceed due to circumstances beyond the Parties' control, or both Parties mutually agree to terminate. Termination does not affect any rights or obligations that accrued before termination, including payment obligations.</p>`],
  ['GENERAL PROVISIONS', `<p>This Agreement constitutes the entire agreement between the Parties regarding the Services. No amendment or variation is valid unless agreed in writing by both Parties. If any provision is held invalid or unenforceable, the remaining provisions continue in full force and effect. A failure or delay by either Party to exercise any right shall not constitute a waiver of that right. Neither Party may assign its rights or obligations without the prior written consent of the other Party, except where required by law.</p>`],
  ['GOVERNING LAW', `<p>This Agreement shall be governed by and interpreted in accordance with the laws of the People's Republic of Bangladesh. The Parties submit to the jurisdiction of the competent courts of Bangladesh for the resolution of any dispute arising under this Agreement.</p>`],
  ['EXECUTION', `<p>This Agreement becomes effective on the date it is signed by both Parties. The Parties acknowledge that they have read, understood and agreed to be bound by the terms and conditions of this Agreement. This Agreement may be executed electronically through an approved electronic signature platform.</p>`],
];

const WT_PACK = {
  vertical: 'water_tank_csa',
  doc_no: 'SS-WTCM-CSA-01',
  version: '0.2',
  title: 'Water Tank Cleaning & Maintenance — Customer Service Agreement',
  header_subtitle: 'WATER TANK CLEANING &amp; MAINTENANCE',
  service_groups: SERVICE_GROUPS,
  code_to_schedule_a: CODE_TO_SCHEDULE_A,
  checklist_groups: CHECKLIST_GROUPS,
  clauses: CLAUSES,
  schedule_b_rows: WT_SCHEDULE_B_ROWS,
  // fallback payment split when the operator chooses no advance
  default_split: [0.4, 0.3, 0.3],
};
const AC_PACK = {
  vertical: 'air_conditioning_csa',
  doc_no: 'SSPC-ACS-CSA-01',
  version: '0.2',
  title: 'Air Conditioning Solutions — Customer Service Agreement',
  header_subtitle: 'AIR CONDITIONING SOLUTIONS',
  service_groups: AC_SERVICE_GROUPS,
  code_to_schedule_a: AC_CODE_TO_SCHEDULE_A,
  checklist_groups: AC_CHECKLIST_GROUPS,
  clauses: AC_CLAUSES,
  schedule_b_rows: AC_SCHEDULE_B_ROWS,
  default_split: [0.3, 0.4, 0.3],
};
const LPAS_PACK = {
  vertical: 'land_property_assessment_csa',
  doc_no: 'SSPC-SVS-CSA-01',
  version: '0.2',
  title: 'Survey & Valuation Services — Customer Service Agreement',
  header_subtitle: 'SURVEY &amp; VALUATION SERVICES',
  service_groups: LPAS_SERVICE_GROUPS,
  code_to_schedule_a: LPAS_CODE_TO_SCHEDULE_A,
  checklist_groups: LPAS_CHECKLIST_GROUPS,
  clauses: LPAS_CLAUSES,
  schedule_b_rows: LPAS_SCHEDULE_B_ROWS,
  // Survey & Valuation is normally deposit-on-acceptance + balance-on-report, so
  // operators choose an advance; this 3-stage figure is only the no-advance fallback.
  default_split: [0.5, 0.2, 0.3],
};
const LFS_PACK = {
  vertical: 'loan_financial_support_csa',
  doc_no: 'SSPC-LFSS-CSA-01',
  version: '0.2',
  title: 'Loan & Financial Support Services — Customer Service Agreement',
  header_subtitle: 'LOAN &amp; FINANCIAL SUPPORT SERVICES',
  service_groups: LFS_SERVICE_GROUPS,
  code_to_schedule_a: LFS_CODE_TO_SCHEDULE_A,
  checklist_groups: LFS_CHECKLIST_GROUPS,
  clauses: LFS_CLAUSES,
  schedule_b_rows: LFS_SCHEDULE_B_ROWS,
  // Standard Projects: deposit on acceptance, progress, final before release.
  default_split: [0.4, 0.3, 0.3],
};
const PDV_PACK = {
  vertical: 'property_documentation_verification_csa',
  doc_no: 'SSPC-PDVS-CSA-01',
  version: '0.2',
  title: 'Property Documentation & Verification Services — Customer Service Agreement',
  header_subtitle: 'PROPERTY DOCUMENTATION &amp; VERIFICATION SERVICES',
  service_groups: PDV_SERVICE_GROUPS,
  code_to_schedule_a: PDV_CODE_TO_SCHEDULE_A,
  checklist_groups: PDV_CHECKLIST_GROUPS,
  clauses: PDV_CLAUSES,
  schedule_b_rows: PDV_SCHEDULE_B_ROWS,
  default_split: [0.4, 0.3, 0.3],
};
const PWS_PACK = {
  vertical: 'property_will_succession_csa',
  doc_no: 'SSPC-PWSS-CSA-01',
  version: '0.2',
  title: 'Property Will & Succession Support Services — Customer Service Agreement',
  header_subtitle: 'PROPERTY WILL &amp; SUCCESSION SUPPORT SERVICES',
  service_groups: PWS_SERVICE_GROUPS,
  code_to_schedule_a: PWS_CODE_TO_SCHEDULE_A,
  checklist_groups: PWS_CHECKLIST_GROUPS,
  clauses: PWS_CLAUSES,
  schedule_b_rows: PWS_SCHEDULE_B_ROWS,
  default_split: [0.4, 0.3, 0.3],
};
const RRS_PACK = {
  vertical: 'removal_relocation_csa',
  doc_no: 'SSPC-RRS-CSA-01',
  version: '0.2',
  title: 'Removal & Relocation Services — Customer Service Agreement',
  header_subtitle: 'REMOVAL &amp; RELOCATION SERVICES',
  service_groups: RRS_SERVICE_GROUPS,
  code_to_schedule_a: RRS_CODE_TO_SCHEDULE_A,
  checklist_groups: RRS_CHECKLIST_GROUPS,
  clauses: RRS_CLAUSES,
  schedule_b_rows: RRS_SCHEDULE_B_ROWS,
  // Residential is deposit-50%-on-acceptance + balance-on-completion, so operators
  // choose an advance; this 3-stage figure is only the no-advance fallback.
  default_split: [0.5, 0.25, 0.25],
};
const PCC_PACK = {
  vertical: 'property_care_concierge_csa',
  doc_no: 'SSPC-PCCS-CSA-01',
  version: '0.2',
  title: 'Property Care & Concierge Services — Customer Service Agreement',
  header_subtitle: 'PROPERTY CARE &amp; CONCIERGE SERVICES',
  service_groups: PCC_SERVICE_GROUPS,
  code_to_schedule_a: PCC_CODE_TO_SCHEDULE_A,
  checklist_groups: PCC_CHECKLIST_GROUPS,
  clauses: PCC_CLAUSES,
  schedule_b_rows: PCC_SCHEDULE_B_ROWS,
  // One-off: deposit on acceptance + balance on completion; ongoing: per schedule.
  // This 3-stage figure is only the no-advance fallback.
  default_split: [0.4, 0.3, 0.3],
};
const PACKS = { water_tank_csa: WT_PACK, air_conditioning_csa: AC_PACK, land_property_assessment_csa: LPAS_PACK, loan_financial_support_csa: LFS_PACK, property_documentation_verification_csa: PDV_PACK, property_will_succession_csa: PWS_PACK, removal_relocation_csa: RRS_PACK, property_care_concierge_csa: PCC_PACK };
const packFor = (vertical) => PACKS[vertical] || WT_PACK;
/** Service-line content for the agreement builder UI (Schedule A / D taxonomies). */
const contentFor = (vertical) => {
  const p = packFor(vertical);
  return { service_groups: p.service_groups, code_to_schedule_a: p.code_to_schedule_a, checklist_groups: p.checklist_groups };
};

/**
 * Editable Schedule C price catalog (ServiceItem, vertical water_tank_csa).
 *
 * `includeArchived` exists for RESOLUTION, not for the picker. A line already on
 * an agreement has to keep rendering after its item is withdrawn, so recompute
 * looks the item up including archived rows; the item picker still shows only
 * what is currently on offer.
 */
async function getCatalog(branchId, { includeArchived = false, vertical = 'water_tank_csa' } = {}) {
  const where = { vertical };
  if (!includeArchived) where.is_active = true;
  if (branchId) where.branch_id = branchId;
  const rows = await ServiceItem.findAll({ where, order: [['sort_order', 'ASC']] });
  return rows.map((r) => {
    const p = r.get({ plain: true });
    let tags = p.tags; if (typeof tags === 'string') { try { tags = JSON.parse(tags); } catch { tags = {}; } }
    return {
      id: p.id, code: p.code, name: p.name, unit: p.unit,
      standard_price: Number(p.base_price || 0), group: (tags || {}).group || 'service',
      is_active: p.is_active !== false,
    };
  });
}

/**
 * Compute Schedule C: selected lines with standard+agreed, cost summary and payment schedule.
 * input: { selected:[{code, qty, agreed_price, snapshot}], discount, vat_percent, transport, govt_fees, payment_overrides }
 *
 * This used to resolve every line against the LIVE catalogue and spread that row
 * in — `const line = byCode[s.code]; if (!line) return null; ... { ...line }`.
 * Two consequences were confirmed against real data:
 *
 *   - renaming a catalogue item REWROTE the name and unit on a Schedule C that
 *     was recomputed, so a signed scope could describe itself differently later
 *   - archiving an item made its line SILENTLY DISAPPEAR — two lines in, one
 *     line out, no error. A client's agreed scope shrinking without a word is
 *     the worst failure of the three, because nothing looks wrong.
 *
 * Lines now resolve through wtCatalogue.resolveLine, which reads the line's own
 * snapshot first and treats the catalogue as a fallback for new lines only. An
 * item that has since been archived or deleted still renders, flagged as
 * `orphaned`, at the price that was agreed.
 */
async function computePricing(input = {}, branchId, opts = {}) {
  const wtCat = require('./wtCatalogue.service');
  // Archived items are included HERE only: a line already on this agreement must
  // still resolve after its catalogue item is withdrawn. getCatalog() without the
  // flag — what the item picker calls — still offers active items only.
  const catalog = await getCatalog(branchId, { includeArchived: true, vertical: opts.vertical });
  const byCode = Object.fromEntries(catalog.map((c) => [c.code, c]));
  const active = new Set(catalog.filter((c) => c.is_active !== false).map((c) => c.code));
  const selected = (input.selected || [])
    .map((s) => {
      const line = wtCat.resolveLine(s, byCode);
      // Flag a line whose item is no longer on offer, rather than dropping it.
      if (line && line.code && !active.has(line.code)) {
        line.orphaned = true;
        line.orphan_note = 'This item has been withdrawn from the catalogue. It is shown as it was agreed.';
      }
      return line;
    })
    .filter(Boolean);

  const groupTotal = (g) => selected.filter((l) => l.group === g).reduce((s, l) => s + l.line_total, 0);
  const service_charges = groupTotal('service');
  const materials = groupTotal('material');
  const labour = groupTotal('labour');
  const transport = Number(input.transport || 0);
  const govt_fees = Number(input.govt_fees || 0);
  const discount = Number(input.discount || 0);
  const preVat = service_charges + materials + labour + transport + govt_fees - discount;
  const vat = Math.round((preVat * Number(input.vat_percent || 0)) / 100);
  const total = preVat + vat;

  /*
   * Advance / deposit. The figure the client is actually asked for on acceptance
   * comes from the project or the quotation, so it is taken as given when
   * supplied — either as an amount or as a percentage of the total. It is never
   * invented: with nothing supplied the schedule falls back to the standard
   * 40/30/30 the template has always used, and advance_amount reports what that
   * first stage comes to so the agreement and the quotation cannot disagree.
   */
  const explicitAdvance = input.advance_amount != null && input.advance_amount !== ''
    ? Number(input.advance_amount)
    : (input.advance_percent != null && input.advance_percent !== ''
      ? Math.round((total * Number(input.advance_percent)) / 100)
      : null);
  // Never ask for more than the contract is worth.
  const advance_amount = explicitAdvance == null ? null : Math.max(0, Math.min(explicitAdvance, total));
  const advance_percent = advance_amount != null && total > 0
    ? Math.round((advance_amount / total) * 1000) / 10
    : Number(input.advance_percent || 0);
  const balance_due = advance_amount == null ? null : Math.round((total - advance_amount) * 100) / 100;

  const summary = {
    service_charges, labour, materials, transport, govt_fees, discount,
    vat_percent: Number(input.vat_percent || 0), vat, total_contract_value: total,
    advance_amount, advance_percent, balance_due,
    // Whether the operator actually chose an advance, as opposed to the template
    // falling back to 40/30/30. The document renders the advance/balance pair
    // only when it was chosen — printing "balance 60%" beside a three-stage
    // 40/30/30 schedule would have the agreement contradict itself.
    advance_explicit: advance_amount != null,
    advance_label: input.advance_label || 'Advance / Deposit (on acceptance)',
  };

  let payment_schedule;
  if (input.payment_overrides && input.payment_overrides.length) {
    payment_schedule = input.payment_overrides;
  } else if (advance_amount != null) {
    payment_schedule = [
      { stage: summary.advance_label, amount: advance_amount, due: 'On acceptance of quotation / before commencement' },
      { stage: 'Balance on Completion', amount: balance_due, due: 'On practical completion' },
    ];
  } else {
    const split = packFor(opts.vertical).default_split;
    const deposit = Math.round(total * split[0]);
    const progress = Math.round(total * split[1]);
    payment_schedule = [
      { stage: 'Deposit (on acceptance)', amount: deposit, due: 'On acceptance of quotation' },
      { stage: 'Progress Payment', amount: progress, due: 'On work commencement' },
      { stage: 'Final Payment', amount: total - deposit - progress, due: 'On practical completion' },
    ];
    summary.advance_amount = deposit;
    summary.advance_percent = total > 0 ? Math.round(split[0] * 100) : 0;
    summary.balance_due = total - deposit;
  }

  return { lines: selected, summary, payment_schedule };
}

// ── HTML building blocks ───────────────────────────────────────────────
const kvTable = (rows) => `<table style="width:100%;border-collapse:collapse;margin:8px 0;">${rows.map(([k, v]) => `<tr><td style="padding:6px 10px;border:1px solid #d9dee6;background:#f6f8fb;width:38%;font-weight:600;font-size:12.5px;">${esc(k)}</td><td style="padding:6px 10px;border:1px solid #d9dee6;font-size:12.5px;">${v == null ? '__________' : esc(v)}</td></tr>`).join('')}</table>`;

function scheduleC(pricing) {
  const groupRows = (g) => pricing.lines.filter((l) => l.group === g).map((l) => `<tr>
    <td style="padding:6px 8px;border:1px solid #d9dee6;font-size:12px;">${esc(l.code)}</td>
    <td style="padding:6px 8px;border:1px solid #d9dee6;font-size:12px;">${esc(l.name)}</td>
    <td style="padding:6px 8px;border:1px solid #d9dee6;font-size:12px;text-align:center;">${l.qty}</td>
    <td style="padding:6px 8px;border:1px solid #d9dee6;font-size:12px;">${esc(l.unit || '')}</td>
    <td style="padding:6px 8px;border:1px solid #d9dee6;font-size:12px;text-align:right;color:#6b7280;">${money(l.standard_price)}</td>
    <td style="padding:6px 8px;border:1px solid #d9dee6;font-size:12px;text-align:right;font-weight:700;">${money(l.line_total)}</td>
  </tr>`).join('');
  const section = (title, g) => {
    const rows = groupRows(g); if (!rows) return '';
    return `<div style="font-weight:700;font-size:12.5px;color:#003768;margin:12px 0 4px;">${title}</div>
    <table style="width:100%;border-collapse:collapse;margin:4px 0;"><thead><tr>${['Code', 'Item', 'Qty', 'Unit', 'Standard (BDT)', 'Agreed Total (BDT)'].map((h) => `<th style="padding:7px 8px;border:1px solid #d9dee6;background:#eef3f8;font-size:11px;text-align:${h.includes('BDT') ? 'right' : h === 'Qty' ? 'center' : 'left'};">${h}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table>`;
  };
  const s = pricing.summary;
  const sumRows = [
    ['Service Charges', money(s.service_charges)], ['Labour Charges', money(s.labour)], ['Materials & Consumables', money(s.materials)],
    ['Transportation', money(s.transport)], ['Government Fees / Permits', money(s.govt_fees)], ['Discount', '– ' + money(s.discount)], [`VAT (${s.vat_percent}%)`, money(s.vat)],
  ].map(([k, v]) => `<tr><td style="padding:5px 10px;border:1px solid #d9dee6;font-size:12.5px;">${k}</td><td style="padding:5px 10px;border:1px solid #d9dee6;font-size:12.5px;text-align:right;">${v}</td></tr>`).join('');
  const payRows = pricing.payment_schedule.map((p) => `<tr><td style="padding:5px 10px;border:1px solid #d9dee6;font-size:12.5px;">${esc(p.stage)}</td><td style="padding:5px 10px;border:1px solid #d9dee6;font-size:12.5px;text-align:right;">${money(p.amount)}</td><td style="padding:5px 10px;border:1px solid #d9dee6;font-size:12.5px;">${esc(p.due || '')}</td></tr>`).join('');

  return `
  <h2 id="sched-c" style="font-size:15px;color:#003768;margin:22px 0 6px;">SCHEDULE C — Pricing & Payment Summary (Standard vs Agreed)</h2>
  ${section('Standard Service Pricing', 'service') || '<div style="color:#9aa4b2;font-size:12.5px;">No services selected yet.</div>'}
  ${section('Materials & Consumables', 'material')}
  ${section('Labour Charges', 'labour')}
  <div style="font-weight:700;font-size:13px;color:#003768;margin:16px 0 4px;">Project Cost Summary</div>
  <table style="width:100%;border-collapse:collapse;">${sumRows}
    <tr><td style="padding:7px 10px;border:1px solid #003768;background:#003768;color:#fff;font-weight:700;">TOTAL CONTRACT PRICE</td><td style="padding:7px 10px;border:1px solid #003768;background:#003768;color:#fff;font-weight:700;text-align:right;">${money(s.total_contract_value)}</td></tr>
  </table>
  <div style="font-weight:700;font-size:13px;color:#003768;margin:16px 0 4px;">Payment Schedule</div>
  <table style="width:100%;border-collapse:collapse;"><thead><tr>${['Payment Stage', 'Amount (BDT)', 'Due Date'].map((h) => `<th style="padding:6px 10px;border:1px solid #d9dee6;background:#eef3f8;font-size:11.5px;text-align:${h.includes('Amount') ? 'right' : 'left'};">${h}</th>`).join('')}</tr></thead><tbody>${payRows}</tbody></table>
  ${!s.advance_explicit ? '' : `
  <table style="width:100%;border-collapse:collapse;margin-top:10px;">
    <tr><td style="padding:7px 10px;border:1px solid #d9dee6;background:#f6f8fb;font-weight:700;font-size:12.5px;width:62%;">Advance payable on acceptance${s.advance_percent ? ` (${s.advance_percent}% of contract price)` : ''}</td><td style="padding:7px 10px;border:1px solid #d9dee6;font-size:12.5px;text-align:right;font-weight:700;">${money(s.advance_amount)}</td></tr>
    <tr><td style="padding:7px 10px;border:1px solid #d9dee6;background:#f6f8fb;font-weight:700;font-size:12.5px;">Balance payable on completion</td><td style="padding:7px 10px;border:1px solid #d9dee6;font-size:12.5px;text-align:right;font-weight:700;">${money(s.balance_due)}</td></tr>
  </table>
  <div style="font-size:11.5px;color:#6b7280;margin-top:5px;">The Services will not commence until the advance shown above has been received (Clause 9 — Payment Terms).</div>`}`;
}

function scheduleChecks(id, title, groups, selectedSet) {
  const body = Object.entries(groups).map(([g, items]) => `
    <div style="margin:10px 0 4px;font-weight:700;font-size:12.5px;color:#334155;">${esc(g)}</div>
    <div style="display:flex;flex-wrap:wrap;gap:6px 18px;">${items.map((it) => `<span style="font-size:12.5px;">${selectedSet.has(it) ? '☑' : '☐'} ${esc(it)}</span>`).join('')}</div>`).join('');
  return `<h2 id="${id}" style="font-size:15px;color:#003768;margin:22px 0 6px;">${esc(title)}</h2>${body}`;
}

/** Build the full Customer Service Agreement. */
function buildAgreement(data = {}) {
  const org = data.org || {};
  const c = data.client || {};
  /*
   * Schedule B. Callers should send `schedule_b`, but an older draft shape used
   * `property` / `project` — and a caller sending that got a blank Schedule B
   * with no error, so whatever the operator typed silently vanished from the
   * signed document. Fold the legacy shape in wherever schedule_b left a gap.
   */
  const b0 = data.schedule_b || {};
  const legacyB = {
    property_address: data.property?.address,
    property_type: data.property?.type,
    tank_type: data.property?.tank_type,
    tank_capacity: data.property?.tank_capacity,
    tanks_count: data.property?.tanks_count,
    scope: data.project?.scope || data.project?.summary,
    start_date: data.project?.start_date,
  };
  const b = { ...b0 };
  Object.entries(legacyB).forEach(([k, v]) => {
    if ((b[k] == null || b[k] === '') && v != null && v !== '') b[k] = v;
  });
  /*
   * Schedule A ticks. Whatever the caller passed is honoured, but the priced
   * lines in Schedule C are folded in as well: a service the client is being
   * charged for must appear as agreed scope, or Clause 3 ("only the services
   * selected in Schedule A ... form part of this Agreement") would exclude the
   * very work being billed.
   */
  const pack = packFor(data.vertical);
  const pricedCodes = (data.pricing?.lines || []).map((l) => l.code);
  const servicesSet = new Set([...(data.services || []), ...scheduleAFromCodes(pricedCodes, pack.code_to_schedule_a)]);
  const checklistSet = new Set(data.checklist || []);
  const pricing = data.pricing || { lines: [], summary: {}, payment_schedule: [] };
  const doc_no = pack.doc_no;
  const title = pack.title;

  const toc = `
  <div style="border:1px solid #d9dee6;border-radius:10px;padding:14px 18px;margin:14px 0;background:#f8fafc;">
    <div style="font-weight:700;font-size:13px;color:#003768;margin-bottom:8px;">Table of Contents</div>
    <ol style="columns:2;column-gap:32px;margin:0;padding-left:18px;font-size:12.5px;line-height:1.9;">
      ${pack.clauses.map(([t], i) => `<li><a href="#cl-${i + 1}" style="color:#1e3a8a;text-decoration:none;">${esc(t)}</a></li>`).join('')}
      <li><a href="#sched-a" style="color:#1e3a8a;text-decoration:none;">Schedule A — Selected Services</a></li>
      <li><a href="#sched-b" style="color:#1e3a8a;text-decoration:none;">Schedule B — Project Summary</a></li>
      <li><a href="#sched-c" style="color:#1e3a8a;text-decoration:none;">Schedule C — Pricing & Payment</a></li>
      <li><a href="#sched-d" style="color:#1e3a8a;text-decoration:none;">Schedule D — Warranty Summary</a></li>
    </ol>
  </div>`;

  /*
   * The Client block. A residential customer signs personally, so name + NID +
   * contact is the whole party. A commercial, industrial or institutional client
   * is a BUSINESS signing through a representative — the agreement has to name
   * the entity, its registration and the person with authority to bind it, or
   * there is no way to tell who is actually liable under it.
   */
  const isBusiness = ['commercial', 'industrial', 'institutional']
    .includes(String(data.client_type || c.client_type || '').toLowerCase());

  const clientRows = isBusiness
    ? [
      ['Client Type', data.client_type || c.client_type],
      ['Business / Organisation Name', c.company || c.full_name],
      ['Trading Name (if different)', c.trading_name],
      ['Business Type', c.business_type],
      ['Trade Licence No.', c.trade_licence_no],
      ['Company Registration No.', c.registration_no],
      ['TIN', c.tin], ['BIN / VAT Reg. No.', c.bin],
      ['Registered Address', c.address],
      ['Service Address', c.service_address],
      ['Authorised Representative', c.representative_name || c.full_name],
      ['Position / Designation', c.representative_position],
      ['Representative NID / Passport', c.nid],
      ['Representative Phone', c.phone],
      ['Representative Email', c.email],
      ['Accounts Contact', c.accounts_contact],
      ['Accounts Email', c.accounts_email],
    ]
    : [
      ['Client Type', data.client_type || c.client_type || 'Residential'],
      ['Client Name', c.full_name],
      ['National ID / Passport No.', c.nid],
      ['Address', c.address],
      ['Phone', c.phone],
      ['Email', c.email],
      ['Service Address', c.service_address],
      ['Alternate Contact', c.alt_contact],
    ];

  const parties = `
  <p style="margin:14px 0 6px;">This Agreement is made on: <b>${or(data.effective_date)}</b></p>
  <div style="font-weight:700;color:#003768;margin-top:8px;">BETWEEN</div>
  ${kvTable([['Seventh Sky Private Limited', org.name || 'Seventh Sky Property Care'], ['Address', org.address], ['Phone', org.phone], ['Email', org.email], ['Represented by', org.represented_by], ['Position', org.position]])}
  <div style="font-weight:700;color:#003768;margin-top:8px;">AND — Client (Customer)</div>
  ${kvTable(clientRows.filter(([, v]) => v != null))}`;

  const clausesHtml = pack.clauses.map(([t, body], i) => `
    <div style="margin:16px 0;"><h2 id="cl-${i + 1}" style="font-size:14.5px;color:#003768;margin:0 0 4px;">${i + 1}. ${esc(t)}</h2><div style="font-size:13px;">${body}</div></div>`).join('');

  /*
   * Execution block. Each party gets a named signature and date slot carrying a
   * data-sign anchor, so the signing page can place that party's captured
   * signature in its own box rather than printing a dead "__________" line.
   * The anchors match the SignatureField labels created with the envelope.
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

  const witnessList = (data.witnesses || [{}, {}]).slice(0, 2);
  const signatures = `
  <h2 style="font-size:15px;color:#003768;margin:22px 0 6px;">Signatures</h2>
  <table style="width:100%;margin-top:6px;"><tr>
    <td style="width:50%;vertical-align:top;padding-right:16px;"><div style="border-top:1px solid #333;padding-top:6px;font-size:12px;"><b>Seventh Sky Private Limited</b><br/>Name: ${or(org.represented_by)}<br/>Position: ${or(org.position)}${signSlot('Seventh Sky')}</div></td>
    <td style="width:50%;vertical-align:top;padding-left:16px;"><div style="border-top:1px solid #333;padding-top:6px;font-size:12px;"><b>Client (Customer)</b><br/>Name: ${or(c.full_name)}${signSlot('Client')}</div></td>
  </tr></table>
  <table style="width:100%;margin-top:14px;"><tr>
    ${witnessList.map((w, i) => `<td style="width:50%;vertical-align:top;padding:0 16px;"><div style="border-top:1px solid #333;padding-top:6px;font-size:12px;"><b>Witness ${i + 1}</b><br/>Name: ${or(w.name)}<br/>NID / Passport: ${or(w.nid)}${w.email ? `<br/>Email: ${esc(w.email)}` : ''}${signSlot(`Witness ${i + 1}`)}</div></td>`).join('')}
  </tr></table>`;

  const schedA = scheduleChecks('sched-a', 'SCHEDULE A — Selected Services', pack.service_groups, servicesSet);
  // Clause 4 (PROJECT DETAILS) names exactly what Schedule B must record, so every
  // one of those items appears here. The reference numbers are system-generated
  // and carried from the project — they are never typed by hand.
  const schedB = `<h2 id="sched-b" style="font-size:15px;color:#003768;margin:22px 0 6px;">SCHEDULE B — Project Summary</h2>${kvTable([
    ['Project No.', b.project_no], ['Work Order No.', b.work_order_no], ['Quotation No.', b.quotation_no],
    ['Client Name', c.full_name], ['Client Contact', [c.phone, c.email].filter(Boolean).join(' · ') || null],
    ['Property Address', b.property_address || c.service_address || c.address],
    ['Property Type', b.property_type || data.property_type],
    ...pack.schedule_b_rows(b),
    ['Scope of Work', b.scope],
    ['Materials & Consumables', b.materials],
    ['Service Provider', b.provider_name],
    ['Site Contact', [b.site_contact_name, b.site_contact_phone].filter(Boolean).join(' · ') || null],
    ['Site Access Requirements', b.access_notes],
    ['Estimated Start Date', b.start_date], ['Estimated Completion Date', b.completion_date],
    ['Agreed Price (Total Contract)', pricing.summary?.total_contract_value != null ? money(pricing.summary.total_contract_value) : null],
    // Always the first payment stage, whether that is a chosen advance or the
    // template's standard deposit — so this row can never disagree with the
    // Payment Schedule in Schedule C.
    ['Advance Payable on Acceptance', pricing.summary?.advance_amount != null
      ? `${money(pricing.summary.advance_amount)}${pricing.summary.advance_percent ? ` (${pricing.summary.advance_percent}% of contract price)` : ''}${pricing.summary.advance_explicit ? '' : ' — standard schedule'}`
      : null],
    // AMC rows only when the project is genuinely under one. Printing empty AMC
    // lines on a one-off job invites the client to think a contract exists.
    ...(b.under_amc || b.amc_code || b.amc_package ? [
      ['AMC Contract', b.amc_code],
      ['AMC Package', b.amc_package],
      ['AMC Visit Frequency', b.amc_frequency],
      // Clause 9 — the billing cycle "as specified in the Work Order"
      ['AMC Billing Cycle', b.amc_payment_frequency],
      ['AMC Start Date', b.amc_start],
      ['AMC Expiry Date', b.amc_expiry],
    ] : []),
    ['Warranty Period', b.warranty_period], ['Special Conditions', b.special_conditions],
  ])}`;
  const schedC = scheduleC(pricing);
  const schedD = scheduleChecks('sched-d', 'SCHEDULE D — Warranty Summary', pack.checklist_groups, checklistSet);

  const html = `
  <div style="font-family: Georgia,'Times New Roman',serif;color:#1f2430;line-height:1.6;font-size:14px;max-width:820px;margin:0 auto;">
    <div style="text-align:center;border-bottom:3px double #003768;padding-bottom:12px;">
      <div style="font-size:20px;font-weight:bold;color:#003768;">Seventh Sky Property Care</div>
      <div style="font-size:13px;color:#12b6f3;font-weight:bold;letter-spacing:.04em;margin-top:2px;">${pack.header_subtitle}</div>
      <div style="font-size:16px;font-weight:bold;margin-top:10px;text-transform:uppercase;">Customer Service Agreement</div>
      <div style="font-size:11px;color:#6b7280;margin-top:4px;">Document No: ${doc_no} · Version: ${pack.version} · Effective Date: ${or(data.effective_date)}</div>
    </div>
    ${toc}${parties}${clausesHtml}${schedA}${schedB}${schedC}${schedD}${signatures}
    <div style="margin-top:22px;padding-top:10px;border-top:1px solid #d1d5db;font-size:11px;color:#6b7280;">This Agreement becomes effective when signed by both Parties through the Seventh Sky electronic signing system. The electronic record, audit trail and content hash constitute proof of execution.</div>
  </div>`;

  // Schedule D warranty selection, persisted so the job's completion can decide
  // whether to auto-register a warranty (only when the client agreed one here).
  const warrantyItems = [...checklistSet].filter((c) => (pack.checklist_groups['Warranty Coverage'] || []).includes(c));
  const terms = {
    doc_no, selected_services: [...servicesSet], schedule_b: b,
    project_code: b.project_no || data.project_code || null,
    // The client identity, persisted so the draft invoices raised on signing are
    // attached to this client and project (not left as an unlinked "Client").
    client_name: c.full_name || data.client_name || null,
    client_code: c.client_code || data.client_code || null,
    client_email: c.email || null,
    client_phone: c.phone || null,
    site_address: c.address || b.property_address || null,
    pricing_summary: pricing.summary, payment_schedule: pricing.payment_schedule,
    advance_amount: pricing.summary?.advance_amount ?? null,
    balance_due: pricing.summary?.balance_due ?? null,
    warranty_selected: warrantyItems.length > 0,
    warranty_items: warrantyItems,
    warranty_period: b.warranty_period || null,
    agreed_lines: pricing.lines.map((l) => ({ code: l.code, name: l.name, qty: l.qty, agreed_price: l.agreed_price, line_total: l.line_total, group: l.group })),
  };
  return { title, doc_no, html, terms };
}

module.exports = {
  getCatalog, computePricing, buildAgreement,
  SERVICE_GROUPS, CHECKLIST_GROUPS, CODE_TO_SCHEDULE_A, scheduleAFromCodes,
  // per-service content: contentFor(vertical) drives the builder UI's Schedule A/D
  // taxonomies; packFor exposes the whole pack (title, clauses, splits).
  contentFor, packFor,
};
