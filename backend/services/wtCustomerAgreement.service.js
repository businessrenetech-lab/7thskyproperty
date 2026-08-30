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
const PACKS = { water_tank_csa: WT_PACK, air_conditioning_csa: AC_PACK };
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
