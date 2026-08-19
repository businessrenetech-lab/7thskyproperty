/**
 * rptmAgreement.service.js
 * ------------------------------------------------------------------
 * Residential Property Tenancy Management Service Agreement (SSPC-RPTMS-01 v0.2).
 * Always signed Seventh Sky (acting for the Property Owner) ↔ Tenant. Mirrors the RPRM
 * builder: full landlord-/tenant-visible HTML with a visible Table of Contents, all 25
 * clauses, Schedules A–D, and Schedule C Standard vs Agreed pricing + summary + payment schedule.
 *
 *   getRptmCatalog()                → editable Schedule C standard price list (ServiceItem)
 *   computePricing(input, branchId) → { lines, summary, payment_schedule }
 *   buildTenancyMgmtAgreement(data) → { title, doc_no, html, terms }
 */
const ServiceItem = require('../models/ServiceItem');

const money = (v) => '৳' + Number(v || 0).toLocaleString('en-US', { maximumFractionDigits: 0 });
const or = (v, f = '__________') => (v == null || v === '' ? f : v);
const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// ── Schedule A: selectable service groups ──────────────────────────────
const SERVICE_GROUPS = {
  'Tenancy Administration': ['Tenancy Consultation', 'Lease Administration', 'Move-in Coordination', 'Move-out Coordination', 'Rent Administration', 'Tenant Communication', 'Lease Renewal Coordination'],
  'Property Care Services': ['Cleaning Coordination', 'Gardening & Landscaping Coordination', 'General Maintenance Coordination', 'Emergency Maintenance Coordination', 'Utility Bill Coordination', 'Caretaker Coordination'],
  'Inspection Services': ['Entry Inspection', 'Routine Inspection', 'Exit Inspection', 'Inspection Reports', 'Photo Documentation'],
  'Lifestyle & Convenience Services': ['Relocation Support', 'Utility Setup Coordination', 'Property Preparation Assistance', 'Temporary Accommodation Coordination'],
  'Property Presentation': ['Furnishing Coordination', 'Property Styling Assistance', 'Seasonal Preparation'],
  'Smart Property & Security': ['CCTV Coordination', 'Smart Lock Coordination', 'Smart Home Coordination', 'Property Monitoring', 'Emergency Property Response'],
  'Corporate & NRB Support': ['Corporate Relocation Assistance', 'NRB Property Support', 'Remote Coordination', 'Video Inspection Reports'],
  'Additional Services': ['Insurance Coordination', 'Property Valuation Coordination', 'Renovation Coordination', 'Other'],
};

// ── Schedule D: Tenant information & move-in checklist ──────────────────
const CHECKLIST_GROUPS = {
  'Tenant Information': ['National ID / Passport', 'Contact Details', 'Emergency Contact', 'Employment Details', 'Approved Occupants'],
  'Property Information': ['Property Address', 'Lease Commencement Date', 'Lease Expiry Date', 'Monthly Rent', 'Security Deposit', 'Rent Due Date'],
  'Move-In Checklist': ['Keys Received', 'Entry Inspection Completed', 'Condition Report Received', 'Utility Information Provided', 'Emergency Contacts Provided', 'Building Rules Provided (if applicable)'],
  'Additional Services': ['Utility Setup Coordination', 'Cleaning Services', 'Maintenance Requests', 'Relocation Support', 'Other Special Instructions'],
};

// ── Fixed legal clauses (full text, faithful to v0.2, tenancy) ─────────
const CLAUSES = [
  ['PURPOSE', `<p>This Agreement sets out the terms under which Seventh Sky, acting on behalf of the Property Owner, will provide Residential Property Tenancy Management Services and manage the Tenant's occupancy of the property. It establishes the rights and responsibilities of the Parties relating to tenancy administration, property access, inspections, maintenance coordination, communication and other agreed tenancy management services. The specific tenancy details, services and pricing will be confirmed in the approved Tenancy Schedule, Quotation or Work Order where applicable.</p>`],
  ['TERM', `<p>This Agreement becomes effective on the date signed by both Parties and continues until: the tenancy ends; the Tenant vacates the property; all outstanding obligations have been fulfilled; or the Agreement is terminated in accordance with this Agreement. Any lease renewal or extension shall be subject to mutual agreement between the Property Owner (or authorised representative) and the Tenant.</p>`],
  ['SERVICES', `<p>Depending on the tenancy arrangement, Seventh Sky may provide one or more of the services listed in <b>Schedule A</b>. Only the services selected in Schedule A or the approved Work Order form part of this Agreement. Additional services may be included by written agreement.</p>`],
  ['PROPERTY & TENANCY DETAILS', `<p>The details of each tenancy shall be recorded in <b>Schedule B</b> or the approved Tenancy Schedule, including Property Address, Property Type, Lease Commencement Date, Lease Expiry Date, Monthly Rent, Security Deposit, Rent Due Date, Approved Occupants, Selected Services and Special Conditions. If any inconsistency exists between this Agreement and the approved Tenancy Schedule or Work Order, the approved Tenancy Schedule or Work Order prevails for that tenancy.</p>`],
  ['RESPONSIBILITIES OF SEVENTH SKY', `<p>Seventh Sky will: manage the tenancy on behalf of the Property Owner; communicate with the Tenant regarding tenancy matters; coordinate rent administration where authorised; arrange inspections in accordance with this Agreement; coordinate approved maintenance and repairs; facilitate communication between the Property Owner and the Tenant where appropriate; coordinate approved third-party contractors where required; and provide the agreed Services with reasonable care and skill. Unless otherwise agreed in writing, Seventh Sky acts as the Property Manager and authorised representative of the Property Owner, and is not the owner of the property.</p>`],
  ['TENANT RESPONSIBILITIES', `<p>The Tenant agrees to: provide accurate information; pay rent and other approved charges on time; occupy the property lawfully and responsibly; maintain reasonable cleanliness and care of the property; promptly report maintenance or safety concerns; comply with the tenancy conditions and building rules; cooperate with lawful inspections and authorised access; obtain written approval before making alterations or permitting unauthorised occupants; avoid unlawful, dangerous or disruptive conduct; and return the property in substantially the same condition as received, allowing for fair wear and tear. The Tenant remains responsible for rent payments, utility charges where applicable, damage beyond fair wear and tear, approved repair costs arising from tenant negligence, and complying with applicable laws and tenancy obligations.</p>`],
  ['QUOTATIONS & WORK ORDERS', `<p>Where the Tenant requests additional services outside the standard tenancy management scope, Seventh Sky may issue a Quotation or Work Order setting out requested services, scope of work, agreed fees, payment schedule, expected completion timeframe and any special conditions. Additional services will commence once the Tenant accepts the Quotation or Work Order. Where additional services are requested after commencement, a revised quotation or approved variation may be issued.</p>`],
  ['SERVICE FEES & PAYMENT', `<p>The fees payable will be specified in the approved Tenancy Schedule, Quotation or Work Order. Depending on the selected services, fees may include tenancy administration fees, move-in or move-out coordination, utility coordination, maintenance coordination, relocation assistance, inspection services, approved additional tenant services, approved third-party service fees and any other agreed service charges. The Tenant agrees to pay all agreed fees per the approved payment schedule. Rent, utility charges, maintenance costs from tenant negligence, government charges and approved third-party costs remain the Tenant's responsibility unless otherwise stated in writing.</p>`],
  ['PAYMENT TERMS', `<p>Unless otherwise agreed in writing — <b>Standard Tenancy Services:</b> any applicable service fee is payable upon acceptance of the Quotation or Work Order; additional approved services are invoiced separately; payment is due within the period stated on the invoice. <b>Ongoing Tenancy Support Services:</b> payment may be made weekly, monthly, quarterly or annually as specified in the approved Work Order. Late payments may result in suspension of optional services until outstanding amounts are paid. Nothing in this clause affects the Tenant's obligation to pay rent under the tenancy agreement.</p>`],
  ['TENANCY MANAGEMENT & PROPERTY SERVICES', `<p>Seventh Sky will provide tenancy management services on behalf of the Property Owner. The Tenant acknowledges that Seventh Sky acts as the authorised property manager; that the Property Owner retains ownership and final authority regarding tenancy decisions unless delegated; that maintenance requests are subject to assessment and approval where required; that property access will be managed in accordance with applicable law and reasonable notice; and that additional tenant support services are only provided where included in the selected services.</p>`],
  ['PROJECT TIMELINES', `<p>Estimated timeframes for requested services will be provided in the approved Quotation or Work Order. Service delivery may be affected by contractor availability, maintenance complexity, availability of parts or materials, Property Owner approvals, public holidays, weather, government processing or other circumstances beyond Seventh Sky's reasonable control. Where delays occur, Seventh Sky will keep the Tenant reasonably informed.</p>`],
  ['VARIATIONS & ADDITIONAL SERVICES', `<p>A variation occurs where the Tenant requests work or services outside the agreed scope. Where practical, Seventh Sky will advise the Tenant of the additional services, any additional fees and any expected impact on the timeframe. No additional work will proceed without the Tenant's approval unless immediate action is reasonably necessary to protect the property or occupants.</p>`],
  ['PROPERTY ACCESS & THIRD-PARTY SERVICES', `<p>Where required, Seventh Sky may arrange access to the property for inspections, maintenance, repairs or other authorised purposes. The Tenant acknowledges that access will be arranged in accordance with applicable laws and reasonable notice (except emergencies), that independent contractors remain responsible for their own services, that Seventh Sky coordinates on behalf of the Property Owner but does not guarantee contractor performance, and that the Tenant must provide reasonable access for approved inspections and maintenance.</p>`],
  ['SERVICE COMPLETION', `<p>The Services are completed when the agreed scope specified in the Tenancy Schedule, Quotation or Work Order has been substantially delivered. Where ongoing tenancy management services are provided, completion occurs upon the expiry or termination of the agreed service period unless renewed by mutual agreement.</p>`],
  ['TENANT COMPLAINTS & SERVICE ISSUES', `<p>If the Tenant believes the Services have not been delivered as agreed, they should notify Seventh Sky promptly. Seventh Sky will acknowledge, investigate, liaise with the Property Owner or relevant parties, take reasonable steps to resolve, keep the Tenant informed and implement corrective action where appropriate. Nothing in this Agreement limits any rights available to the Tenant under applicable law.</p>`],
  ['LIABILITY', `<p>To the extent permitted by the laws of Bangladesh, Seventh Sky will provide the Services with reasonable care and skill and is responsible only for the Services it agreed to provide. The Property Owner remains responsible for the condition of the property except where delegated. The Tenant remains responsible for complying with the tenancy agreement and for damage beyond fair wear and tear. Independent contractors and other professionals remain responsible for their own services. Neither Party is liable for delays or failures beyond its reasonable control.</p>`],
  ['LIMITATION OF LIABILITY', `<p>Except where liability cannot legally be excluded, Seventh Sky shall not be liable for delays in maintenance by contractors/third parties, interruptions to utilities beyond its control, delays from Property Owner approvals, damage caused by third parties, loss of the Tenant's belongings (except caused by Seventh Sky's negligence), inaccurate Tenant/Owner information, or indirect/consequential loss. Where permitted by law, Seventh Sky's total liability shall not exceed the amount paid by the Tenant for the affected Services. This clause does not exclude liability for fraud or wilful misconduct.</p>`],
  ['CONFIDENTIALITY & PRIVACY', `<p>Each Party agrees to keep confidential all non-public information obtained through this Agreement. Personal and tenancy information will only be used to provide the Services, administer the tenancy, communicate with authorised parties, coordinate inspections/maintenance/contractor access, prepare documents and invoices, comply with legal obligations, or as authorised. These obligations continue after completion or termination.</p>`],
  ['FORCE MAJEURE', `<p>Neither Party is responsible for delays or failure caused by circumstances beyond its reasonable control, including natural disasters, severe weather, fire or flood, government restrictions, industrial action, civil unrest, pandemics, utility failures or major technology failures. The affected Party shall notify the other as soon as practicable and resume once the event has ended.</p>`],
  ['TENANT ACKNOWLEDGEMENTS', `<p>The Tenant acknowledges that they have reviewed and accepted this Agreement before Services commence; that Seventh Sky manages the property on behalf of the Property Owner; that the Property Owner retains ownership and certain decisions may require the Owner's approval; that maintenance requests are managed by urgency and tenancy terms; that access may be required for inspections, maintenance or emergencies per applicable law; that independent advice should be obtained where appropriate; and that they have had the opportunity to ask questions before entering into this Agreement.</p>`],
  ['SUSPENSION & TERMINATION', `<p><b>Suspension.</b> Seventh Sky may suspend the Services where the Tenant fails to pay, fails to provide required information, provides false information, requests suspension, or where continuation would be unlawful or impracticable. <b>Termination.</b> Either Party may terminate by giving thirty (30) days' written notice, unless the tenancy agreement or applicable law requires a different period. Seventh Sky may terminate immediately for material breach, fraud, non-payment after notice, unlawful conduct, serious damage to the property, or prevention of performance. Where the Tenant terminates after additional services have commenced, the Tenant remains responsible for Services already completed, approved contractor attendance, inspections completed, approved third-party costs and other reasonable expenses incurred before termination.</p>`],
  ['NON-CIRCUMVENTION', `<p>Where Seventh Sky introduces optional service providers, contractors or relocation partners to the Tenant, the Tenant agrees not to intentionally bypass Seventh Sky to obtain the same approved services directly during the agreed service period where those services were introduced and coordinated by Seventh Sky. This applies only to optional services arranged by Seventh Sky and does not restrict the Tenant from communicating with the Property Owner where authorised, exercising legal rights under the tenancy agreement, or engaging providers not introduced by Seventh Sky. Where such introduced services proceed outside this Agreement without written consent, any agreed coordination fees remain payable.</p>`],
  ['GENERAL PROVISIONS', `<p>Unless otherwise agreed in writing, this Agreement together with the accepted Tenancy Schedule, Quotation, Work Order and Schedules constitutes the entire agreement relating to the Services; any amendment must be in writing and signed or electronically accepted; failure to enforce a provision does not waive rights; if any provision is invalid, the remainder continues in force; and notices may be delivered by hand, courier, registered post or email.</p>`],
  ['GOVERNING LAW & DISPUTE RESOLUTION', `<p>This Agreement is governed by the laws of the People's Republic of Bangladesh. The Parties will make reasonable efforts to resolve disputes through good-faith discussions before commencing legal proceedings, and may agree to mediation or another recognised process before referring the matter to the competent courts of Bangladesh. Nothing prevents either Party from seeking urgent relief where necessary.</p>`],
  ['EXECUTION', `<p>By signing this Agreement, the Parties confirm that they have read and understood it, have had the opportunity to obtain independent advice, enter into it voluntarily, and agree to be legally bound by its terms. This Agreement may be executed in counterparts and by electronic signature. Each signed copy is deemed an original and together constitute one Agreement.</p>`],
];

async function getRptmCatalog(branchId) {
  const where = { vertical: 'tenancy_mgmt', is_active: true };
  if (branchId) where.branch_id = branchId;
  const rows = await ServiceItem.findAll({ where, order: [['sort_order', 'ASC']] });
  return rows.map((r) => {
    const p = r.get({ plain: true });
    let tags = p.tags; if (typeof tags === 'string') { try { tags = JSON.parse(tags); } catch { tags = {}; } }
    tags = tags || {};
    return {
      id: p.id, code: p.code, name: p.name, unit: p.unit,
      standard_price: Number(p.base_price || 0),
      price_type: tags.price_type || 'fixed', price_label: tags.price_label || null,
      recurring: !!tags.recurring, fee_model: p.fee_model,
    };
  });
}

function stdLabel(line) {
  if (line.price_label) return line.price_label;
  if (line.price_type === 'from') return `From ${money(line.standard_price)}`;
  return money(line.standard_price);
}
function agreedAmount(line, agreed) {
  if (agreed != null && agreed !== '') return Number(agreed);
  if (line.price_type === 'included') return 0;
  return Number(line.standard_price || 0);
}

/** Schedule C compute: professional vs coordination fee buckets + auto payment schedule. */
async function computePricing(input = {}, branchId) {
  const catalog = await getRptmCatalog(branchId);
  const byCode = Object.fromEntries(catalog.map((c) => [c.code, c]));
  const selected = (input.selected || []).map((s) => {
    const line = byCode[s.code]; if (!line) return null;
    return { ...line, std_label: stdLabel(line), agreed_price: agreedAmount(line, s.agreed_price), coordination: /coordination/i.test(line.name) };
  }).filter(Boolean);

  const professional = selected.filter((l) => !l.recurring && !l.coordination).reduce((s, l) => s + Number(l.agreed_price || 0), 0);
  const coordination = selected.filter((l) => !l.recurring && l.coordination).reduce((s, l) => s + Number(l.agreed_price || 0), 0);
  const recurring = selected.filter((l) => l.recurring).reduce((s, l) => s + Number(l.agreed_price || 0), 0);
  const oneTime = professional + coordination;
  const discount = Number(input.discount || 0);
  const vat = Math.round(((oneTime - discount) * Number(input.vat_percent || 0)) / 100);
  const total = oneTime - discount + vat;

  const summary = {
    professional_service_fees: professional, coordination_fees: coordination,
    third_party_costs: Number(input.third_party_costs || 0), admin_charges: Number(input.admin_charges || 0),
    recurring_support_fee: recurring, discount, vat_percent: Number(input.vat_percent || 0), vat,
    total_contract_value: total,
  };
  const payment_schedule = input.payment_overrides || [
    { stage: 'Deposit (if applicable)', amount: Math.round(oneTime * 0.5), due: 'On acceptance' },
    { stage: 'Service Fee', amount: oneTime - Math.round(oneTime * 0.5), due: 'On service commencement' },
    ...(recurring > 0 ? [{ stage: `Ongoing Support (${input.frequency || 'Monthly'})`, amount: recurring, due: 'Recurring per period' }] : []),
    { stage: 'Additional Services', amount: summary.third_party_costs + summary.admin_charges, due: 'As incurred' },
  ];
  return { lines: selected, summary, payment_schedule };
}

const kvTable = (rows) => `<table style="width:100%;border-collapse:collapse;margin:8px 0;">${rows.map(([k, v]) => `<tr><td style="padding:6px 10px;border:1px solid #d9dee6;background:#f6f8fb;width:38%;font-weight:600;font-size:12.5px;">${esc(k)}</td><td style="padding:6px 10px;border:1px solid #d9dee6;font-size:12.5px;">${v == null ? '__________' : esc(v)}</td></tr>`).join('')}</table>`;

function scheduleC(pricing) {
  const rows = pricing.lines.map((l) => `<tr>
    <td style="padding:6px 8px;border:1px solid #d9dee6;font-size:12px;">${esc(l.code)}</td>
    <td style="padding:6px 8px;border:1px solid #d9dee6;font-size:12px;">${esc(l.name)}</td>
    <td style="padding:6px 8px;border:1px solid #d9dee6;font-size:12px;">${esc(l.unit || '')}</td>
    <td style="padding:6px 8px;border:1px solid #d9dee6;font-size:12px;text-align:right;color:#6b7280;">${esc(l.std_label)}</td>
    <td style="padding:6px 8px;border:1px solid #d9dee6;font-size:12px;text-align:right;font-weight:700;">${l.price_type === 'included' ? 'Included' : money(l.agreed_price)}</td>
  </tr>`).join('');
  const s = pricing.summary;
  const sumRows = [
    ['Professional Service Fees', money(s.professional_service_fees)],
    ['Coordination Fees', money(s.coordination_fees)],
    ['Ongoing Support Fee', money(s.recurring_support_fee)],
    ['Third-Party Costs (if applicable)', money(s.third_party_costs)],
    ['Administrative Charges', money(s.admin_charges)],
    ['Discount', '– ' + money(s.discount)],
    [`VAT (${s.vat_percent}%)`, money(s.vat)],
  ].map(([k, v]) => `<tr><td style="padding:5px 10px;border:1px solid #d9dee6;font-size:12.5px;">${k}</td><td style="padding:5px 10px;border:1px solid #d9dee6;font-size:12.5px;text-align:right;">${v}</td></tr>`).join('');
  const payRows = pricing.payment_schedule.map((p) => `<tr><td style="padding:5px 10px;border:1px solid #d9dee6;font-size:12.5px;">${esc(p.stage)}</td><td style="padding:5px 10px;border:1px solid #d9dee6;font-size:12.5px;text-align:right;">${money(p.amount)}</td><td style="padding:5px 10px;border:1px solid #d9dee6;font-size:12.5px;">${esc(p.due || '')}</td></tr>`).join('');
  return `
  <h2 id="sched-c" style="font-size:15px;color:#003768;margin:22px 0 6px;">SCHEDULE C — Price Schedule (Standard vs Agreed)</h2>
  <table style="width:100%;border-collapse:collapse;margin:8px 0;">
    <thead><tr>${['Code', 'Service', 'Unit', 'Standard Price (BDT)', 'Agreed Price (BDT)'].map((h) => `<th style="padding:7px 8px;border:1px solid #d9dee6;background:#eef3f8;font-size:11.5px;text-align:${h.includes('Price') ? 'right' : 'left'};">${h}</th>`).join('')}</tr></thead>
    <tbody>${rows || '<tr><td colspan="5" style="padding:12px;text-align:center;color:#9aa4b2;border:1px solid #d9dee6;">No services selected yet.</td></tr>'}</tbody>
  </table>
  <div style="font-weight:700;font-size:13px;color:#003768;margin:16px 0 4px;">Project Cost Summary</div>
  <table style="width:100%;border-collapse:collapse;">${sumRows}
    <tr><td style="padding:7px 10px;border:1px solid #003768;background:#003768;color:#fff;font-weight:700;">TOTAL CONTRACT VALUE</td><td style="padding:7px 10px;border:1px solid #003768;background:#003768;color:#fff;font-weight:700;text-align:right;">${money(s.total_contract_value)}</td></tr>
  </table>
  <div style="font-weight:700;font-size:13px;color:#003768;margin:16px 0 4px;">Payment Schedule</div>
  <table style="width:100%;border-collapse:collapse;"><thead><tr>${['Payment Stage', 'Amount (BDT)', 'Due Date'].map((h) => `<th style="padding:6px 10px;border:1px solid #d9dee6;background:#eef3f8;font-size:11.5px;text-align:${h.includes('Amount') ? 'right' : 'left'};">${h}</th>`).join('')}</tr></thead><tbody>${payRows}</tbody></table>`;
}

function checkboxGroups(id, title, groups, selectedSet) {
  const body = Object.entries(groups).map(([g, items]) => `
    <div style="margin:10px 0 4px;font-weight:700;font-size:12.5px;color:#334155;">${esc(g)}</div>
    <div style="display:flex;flex-wrap:wrap;gap:6px 18px;">${items.map((it) => `<span style="font-size:12.5px;">${selectedSet.has(it) ? '☑' : '☐'} ${esc(it)}</span>`).join('')}</div>`).join('');
  return `<h2 id="${id}" style="font-size:15px;color:#003768;margin:22px 0 6px;">${esc(title)}</h2>${body}`;
}

/**
 * data: org, client{full_name,nid,current_address,phone,email,occupation,emergency_contact},
 * property_type, services[], pricing, schedule_b{...tenancy}, payment_terms{frequency},
 * checklist[], witnesses[{name,nid}], effective_date
 */
function buildTenancyMgmtAgreement(data = {}) {
  const org = data.org || {};
  const c = data.client || {};
  const b = data.schedule_b || {};
  const servicesSet = new Set(data.services || []);
  const checklistSet = new Set(data.checklist || []);
  const pricing = data.pricing || { lines: [], summary: {}, payment_schedule: [] };
  const doc_no = 'SSPC-RPTMS-01';
  const title = 'Residential Property Tenancy Management Service Agreement';

  const toc = `
  <div style="border:1px solid #d9dee6;border-radius:10px;padding:14px 18px;margin:14px 0;background:#f8fafc;">
    <div style="font-weight:700;font-size:13px;color:#003768;margin-bottom:8px;">Table of Contents</div>
    <ol style="columns:2;column-gap:32px;margin:0;padding-left:18px;font-size:12.5px;line-height:1.9;">
      ${CLAUSES.map(([t], i) => `<li><a href="#cl-${i + 1}" style="color:#1e3a8a;text-decoration:none;">${esc(t)}</a></li>`).join('')}
      <li><a href="#sched-a" style="color:#1e3a8a;text-decoration:none;">Schedule A — Selected Services</a></li>
      <li><a href="#sched-b" style="color:#1e3a8a;text-decoration:none;">Schedule B — Property & Tenancy Summary</a></li>
      <li><a href="#sched-c" style="color:#1e3a8a;text-decoration:none;">Schedule C — Price Schedule</a></li>
      <li><a href="#sched-d" style="color:#1e3a8a;text-decoration:none;">Schedule D — Tenant Info & Move-in Checklist</a></li>
    </ol>
  </div>`;

  const parties = `
  <p style="margin:14px 0 6px;">This Agreement is made on: <b>${or(data.effective_date)}</b></p>
  <div style="font-weight:700;color:#003768;margin-top:8px;">BETWEEN</div>
  ${kvTable([['Seventh Sky Private Limited', org.name || 'Seventh Sky Property Care'], ['Acting on behalf of', 'The Property Owner / Landlord'], ['Address', org.address], ['Phone', org.phone], ['Email', org.email], ['Represented by', org.represented_by], ['Position', org.position]])}
  <div style="font-weight:700;color:#003768;margin-top:8px;">AND — Tenant (Client)</div>
  ${kvTable([['Full Name', c.full_name], ['National ID / Passport No.', c.nid], ['Current Address', c.current_address], ['Phone', c.phone], ['Email', c.email], ['Occupation / Employer', c.occupation], ['Emergency Contact', c.emergency_contact]])}`;

  const clausesHtml = CLAUSES.map(([t, body], i) => `
    <div style="margin:16px 0;">
      <h2 id="cl-${i + 1}" style="font-size:14.5px;color:#003768;margin:0 0 4px;">${i + 1}. ${esc(t)}</h2>
      <div style="font-size:13px;">${body}</div>
    </div>`).join('');

  /*
   * Execution block — placed LAST in the document so the parties sign after the
   * schedules they are agreeing to, not before them. Each party gets an anchored
   * signature and date slot (data-sign-party matches the SignatureField labels)
   * so a captured signature lands in its own box rather than on a dead line.
   * Same treatment as the Water Tank customer and provider agreements.
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
  const signatures = `
  <h2 style="font-size:15px;color:#003768;margin:22px 0 6px;">Signatures</h2>
  <table style="width:100%;margin-top:6px;"><tr>
    <td style="width:50%;vertical-align:top;padding-right:16px;"><div style="border-top:1px solid #333;padding-top:6px;font-size:12px;"><b>Seventh Sky Private Limited</b><br/>Name: ${or(org.represented_by)}<br/>Position: ${or(org.position)}${signSlot('Seventh Sky')}</div></td>
    <td style="width:50%;vertical-align:top;padding-left:16px;"><div style="border-top:1px solid #333;padding-top:6px;font-size:12px;"><b>Tenant</b><br/>Name: ${or(c.full_name)}${signSlot('Client')}</div></td>
  </tr></table>
  <table style="width:100%;margin-top:14px;"><tr>
    ${(data.witnesses || [{}, {}]).slice(0, 2).map((w, i) => `<td style="width:50%;vertical-align:top;padding:0 16px;"><div style="border-top:1px solid #333;padding-top:6px;font-size:12px;"><b>Witness ${i + 1}</b><br/>Name: ${or(w.name)}<br/>NID / Passport: ${or(w.nid)}${w.email ? `<br/>Email: ${esc(w.email)}` : ''}${signSlot(`Witness ${i + 1}`)}</div></td>`).join('')}
  </tr></table>`;

  const schedA = checkboxGroups('sched-a', 'SCHEDULE A — Selected Services', SERVICE_GROUPS, servicesSet);
  const schedB = `<h2 id="sched-b" style="font-size:15px;color:#003768;margin:22px 0 6px;">SCHEDULE B — Property & Tenancy Summary</h2>${kvTable([
    ['Work Order No.', b.work_order_no], ['Tenancy Reference No.', b.tenancy_ref_no], ['Property Address', c.current_address || b.property_address],
    ['Property Type', data.property_type], ['Tenant Name', c.full_name], ['Lease Commencement Date', b.commencement_date], ['Lease Expiry Date', b.expiry_date],
    ['Monthly Rent', b.monthly_rent != null ? money(b.monthly_rent) : null], ['Security Deposit', b.security_deposit != null ? money(b.security_deposit) : null],
    ['Rent Due Date', b.rent_due_date], ['Approved Occupants', b.approved_occupants], ['Selected Services', (data.services || []).join(', ')], ['Special Conditions', b.special_conditions],
  ])}`;
  const schedC = scheduleC(pricing);
  const schedD = checkboxGroups('sched-d', 'SCHEDULE D — Tenant Information & Move-in Checklist', CHECKLIST_GROUPS, checklistSet);

  const html = `
  <div style="font-family: Georgia,'Times New Roman',serif;color:#1f2430;line-height:1.6;font-size:14px;max-width:820px;margin:0 auto;">
    <div style="text-align:center;border-bottom:3px double #003768;padding-bottom:12px;">
      <div style="font-size:20px;font-weight:bold;color:#003768;">Seventh Sky Property Care</div>
      <div style="font-size:16px;font-weight:bold;margin-top:12px;text-transform:uppercase;">${esc(title)}</div>
      <div style="font-size:11px;color:#6b7280;margin-top:4px;">Document No: ${doc_no} · Version: 0.2 · Effective Date: ${or(data.effective_date)}</div>
    </div>
    ${toc}
    ${parties}
    ${clausesHtml}
    ${schedA}
    ${schedB}
    ${schedC}
    ${schedD}
    ${signatures}
    <div style="margin-top:22px;padding-top:10px;border-top:1px solid #d1d5db;font-size:11px;color:#6b7280;">This Agreement becomes effective when signed by both Parties through the Seventh Sky electronic signing system. The electronic record, audit trail and content hash constitute proof of execution.</div>
  </div>`;

  const terms = {
    doc_no, selected_services: data.services || [], schedule_b: b,
    frequency: data.payment_terms?.frequency, pricing_summary: pricing.summary,
    payment_schedule: pricing.payment_schedule,
    agreed_lines: pricing.lines.map((l) => ({ code: l.code, name: l.name, agreed_price: l.agreed_price, recurring: l.recurring })),
  };
  return { title, doc_no, html, terms };
}

module.exports = { getRptmCatalog, computePricing, buildTenancyMgmtAgreement, SERVICE_GROUPS, CHECKLIST_GROUPS };
