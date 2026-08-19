/**
 * rprmAgreement.service.js
 * ------------------------------------------------------------------
 * Residential Property Rental Management Service Agreement (SSPC-RPRMS-01 v0.2).
 * Always signed Seventh Sky ↔ Landlord/Client. Renders the FULL agreement (visible
 * Table of Contents + all 25 clauses + Schedules A–D) as landlord-visible HTML, with
 * Schedule C showing Standard vs Agreed pricing, a selected-services summary and the
 * payment schedule. Pure render: the admin builder supplies `data`.
 *
 *   getRprmCatalog()                 → the editable Schedule C standard price list (ServiceItem)
 *   buildResidentialPMAgreement(data)→ { title, doc_no, html, terms }
 *   computePricing(catalog, input)   → { lines, summary, payment_schedule }
 */
const { Op } = require('sequelize');
const ServiceItem = require('../models/ServiceItem');

const money = (v) => '৳' + Number(v || 0).toLocaleString('en-US', { maximumFractionDigits: 0 });
const or = (v, f = '__________') => (v == null || v === '' ? f : v);
const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// ── Schedule A: selectable service groups (checkbox scope) ──────────────
const SERVICE_GROUPS = {
  'Leasing & Tenancy Management': ['Rental Consultation', 'Rental Market Assessment', 'Property Listing Preparation', 'Tenant Sourcing', 'Tenant Screening', 'Lease Coordination', 'Tenant Onboarding'],
  'Rental Administration': ['Rent Collection Coordination', 'Owner Disbursement Coordination', 'Rental Ledger', 'Financial Reporting', 'Lease Renewal Coordination', 'Tenant Communication'],
  'Property Care & Maintenance': ['Cleaning Coordination', 'Gardening & Landscaping', 'General Maintenance Coordination', 'Premium Maintenance Coordination', 'Emergency Repair Coordination', 'Utility Bill Coordination', 'Caretaker Coordination'],
  'Property Inspection Services': ['Entry Inspection', 'Routine Inspection', 'Exit Inspection', 'Inspection Reports', 'Photo Documentation'],
  'Property Presentation': ['Property Styling Coordination', 'Furnishing Coordination', 'Seasonal Preparation', 'Property Presentation Improvement'],
  'Smart Property & Security': ['CCTV Coordination', 'Smart Lock Coordination', 'Smart Home Coordination', 'Property Monitoring', 'Security Guard Coordination', 'Vacant Property Checks'],
  'NRB Property Services': ['Overseas Owner Reporting', 'Remote Property Coordination', 'Video Inspection Reports', 'Priority Property Support'],
  'Additional Services': ['Legal Documentation Coordination', 'Insurance Coordination', 'Property Valuation Coordination', 'Renovation Coordination', 'Other'],
};

// ── Schedule D: checklist groups ───────────────────────────────────────
const CHECKLIST_GROUPS = {
  'Property Information': ['Property Ownership Verification', 'National ID / Passport', 'Property Address', 'Property Type', 'Utility Information'],
  'Leasing Requirements': ['Expected Monthly Rent', 'Security Deposit', 'Lease Term', 'Preferred Tenant Criteria', 'Property Available Date'],
  'Property Management': ['Rent Collection Authority', 'Maintenance Approval Limits', 'Contractor Preferences', 'Inspection Frequency', 'Owner Reporting Requirements'],
  'Supporting Documents': ['Property Ownership Documents', 'Existing Tenancy Documents (if applicable)', 'Insurance Information', 'Utility Details', 'Emergency Contacts', 'Other Special Instructions'],
};

// ── Fixed legal clauses (full text, faithful to v0.2) ──────────────────
const CLAUSES = [
  ['PURPOSE', `<p>This Agreement sets out the terms under which Seventh Sky will provide Residential Property Rental Management Services to assist the Client with leasing, tenant management, rent administration, inspections, maintenance coordination and ongoing property management.</p><p>The specific services, pricing and project requirements for each engagement will be confirmed in the approved Quotation and Work Order.</p>`],
  ['TERM', `<p>This Agreement becomes effective on the date it is signed by both Parties and continues until: the agreed Services have been completed; all outstanding payments have been made; and all obligations under this Agreement have been fulfilled, unless terminated earlier in accordance with this Agreement. Where ongoing property management services are engaged, this Agreement continues until terminated in accordance with this Agreement.</p>`],
  ['SERVICES', `<p>The Client may request one or more of the services listed in <b>Schedule A</b>. Only the services selected in Schedule A or the approved Work Order form part of this Agreement. Additional services may be included by written agreement.</p>`],
  ['PROPERTY DETAILS', `<p>The details of each engagement shall be recorded in <b>Schedule B</b> or the approved Work Order, including Property Address, Property Type, Ownership Details, Expected Monthly Rent, Security Deposit, Lease Term, Selected Services, Agreed Pricing, Management Commencement Date and Special Requirements. If any inconsistency exists between this Agreement and the Work Order, the Work Order prevails for that project only.</p>`],
  ['RESPONSIBILITIES OF SEVENTH SKY', `<p>Seventh Sky will: assess the Client's property management requirements; provide rental market guidance where requested; coordinate property marketing and tenant sourcing; conduct preliminary tenant screening; coordinate lease documentation and tenant onboarding; coordinate rent collection and owner disbursement where authorised; coordinate inspections and maintenance requests; provide periodic reports where included; coordinate approved third-party contractors where required; and use reasonable care and skill in delivering the agreed Services. Unless otherwise agreed in writing, Seventh Sky acts as the Client's property management consultant and service coordinator and is not the owner, landlord, insurer, legal adviser or financial adviser.</p>`],
  ['OWNER RESPONSIBILITIES', `<p>The Client agrees to: provide accurate ownership and property information; ensure the property is legally available for rent; provide documents and approvals reasonably required; cooperate with inspections, maintenance and tenancy processes; promptly advise Seventh Sky of material changes; maintain appropriate landlord insurance where applicable; obtain independent legal, taxation and financial advice where required; pay all agreed fees and approved expenses; and cooperate throughout the management period. The Client remains responsible for ownership, legal compliance, taxation, insurance, approved maintenance expenses, contractor charges, material costs, government fees and utility charges unless otherwise agreed in writing.</p>`],
  ['QUOTATIONS & WORK ORDERS', `<p>Before work commences, Seventh Sky will provide a Quotation and, where applicable, a Work Order setting out selected services, scope of work, management commencement date, agreed fees, payment schedule, expected deliverables and any special conditions. Services will commence once the Client accepts the Quotation or Work Order. Where the Client requests additional services after acceptance, a revised quotation or approved variation may be issued.</p>`],
  ['SERVICE FEES & PAYMENT', `<p>The total project cost will be specified in the approved Quotation or Work Order. Project fees may include consultation, rental market assessment, marketing and advertising, tenant sourcing and screening, lease coordination, property management, rent administration, inspection services, maintenance coordination, approved third-party service fees and any approved additional services. The Client agrees to pay all agreed fees in accordance with the approved payment schedule. Advertising, maintenance, contractor, utility, legal, government and other third-party costs are payable by the Client unless otherwise stated.</p>`],
  ['PAYMENT TERMS', `<p>Unless otherwise agreed in writing — <b>One-Time Leasing Services:</b> deposit upon acceptance, progress payment (where applicable), and final payment upon successful commencement of the tenancy or completion of the agreed leasing services. <b>Ongoing Property Management Services:</b> payment may be made weekly, monthly, quarterly or annually as specified in the approved Work Order. Monthly management fees may be based on a fixed monthly fee, a percentage of collected rent, or another agreed model. Invoices are payable within the period stated on the invoice. Late payments may result in suspension of the Services.</p>`],
  ['LEASING, TENANT MANAGEMENT & PROPERTY MANAGEMENT', `<p>Seventh Sky will use reasonable efforts to market the property and identify suitable prospective tenants. The Client acknowledges that tenant availability and rental values are subject to market conditions, that prospective tenants decide whether to lease, that the owner retains the final decision on accepting a tenant unless otherwise authorised, and that successful leasing cannot be guaranteed.</p>`],
  ['PROJECT TIMELINES', `<p>Estimated commencement and completion dates will be provided in the approved Quotation or Work Order. Timeframes may be affected by market demand, tenant availability, Client instructions, maintenance, lease negotiations, contractor availability, government processing, public holidays or other circumstances beyond Seventh Sky's reasonable control.</p>`],
  ['VARIATIONS & ADDITIONAL SERVICES', `<p>A variation occurs where the Client requests work outside the approved scope or where additional work becomes necessary. Where practical, Seventh Sky will advise the Client of the additional work, any additional charges and any impact on the timeline. No variation will proceed without the Client's approval unless immediate action is reasonably necessary to protect the property or the Client's interests.</p>`],
  ['TENANT MANAGEMENT & THIRD-PARTY SERVICES', `<p>Where requested, Seventh Sky may coordinate tenant management and engage independent contractors on behalf of the Client. Preliminary screening is based on information reasonably available; Seventh Sky does not guarantee a tenant's future conduct or compliance; contractors and other providers remain responsible for their own services; and the Client remains responsible for approving major repairs and significant expenditure unless otherwise authorised.</p>`],
  ['SERVICE COMPLETION', `<p>The Services are completed when the agreed scope specified in the Quotation or Work Order has been substantially delivered. Where ongoing property management is engaged, completion occurs at the expiry or termination of the agreed management period unless renewed by mutual agreement.</p>`],
  ['CLIENT COMPLAINTS & SERVICE ISSUES', `<p>If the Client believes the Services have not been delivered as agreed, they should notify Seventh Sky promptly. Seventh Sky will acknowledge, investigate, liaise with relevant parties, take reasonable steps to resolve, keep the Client informed and implement corrective action where appropriate. Nothing in this Agreement limits any rights available under applicable law.</p>`],
  ['LIABILITY', `<p>To the extent permitted by the laws of Bangladesh, Seventh Sky will provide the Services with reasonable care and skill and is responsible only for the Services it agreed to provide. The Client remains responsible for ownership, legal compliance and insurance. Tenants remain responsible for their tenancy agreement. Independent providers remain responsible for their own services. Neither Party is liable for delays or failures beyond its reasonable control.</p>`],
  ['LIMITATION OF LIABILITY', `<p>Except where liability cannot legally be excluded, Seventh Sky shall not be liable for a prospective tenant declining, the Client declining a tenant, rental vacancies or lost income due to market conditions, tenant default or arrears, damage caused by tenants/contractors/third parties, third-party delays, inaccurate Client information, or indirect/consequential loss. Where permitted by law, Seventh Sky's total liability for a project shall not exceed the amount paid for the affected Services. This clause does not exclude liability for fraud or wilful misconduct.</p>`],
  ['CONFIDENTIALITY & PRIVACY', `<p>Each Party agrees to keep confidential all non-public information obtained through this Agreement. Personal and property information will only be used to provide the Services, market and lease the property, communicate with relevant parties, coordinate with authorised third parties, prepare documents and invoices, comply with legal obligations, or as authorised by the Client. These obligations continue after completion or termination.</p>`],
  ['FORCE MAJEURE', `<p>Neither Party is responsible for delays or failure caused by circumstances beyond its reasonable control, including natural disasters, severe weather, floods or fire, government restrictions, industrial action, civil unrest, pandemics, utility failures or major technology failures. The affected Party shall notify the other as soon as practicable and resume once the event has ended.</p>`],
  ['OWNER ACKNOWLEDGEMENTS', `<p>The Client acknowledges that they have reviewed and accepted the Quotation or Work Order before Services commence; that successful leasing depends on market conditions and tenant availability; that the final decision to approve or reject a tenant remains with the Client unless otherwise authorised; that rental values may change; that maintenance and repair costs remain the Client's responsibility unless otherwise agreed; that independent professional advice should be obtained where appropriate; and that they have had the opportunity to ask questions before entering into this Agreement.</p>`],
  ['SUSPENSION & TERMINATION', `<p><b>Suspension.</b> Seventh Sky may suspend the Services where the Client fails to pay, fails to provide required information/approvals, provides false information, requests suspension, or where continuation would be unlawful or impracticable. <b>Termination.</b> Either Party may terminate by providing thirty (30) days' written notice, provided completed Services and outstanding payments are settled. Seventh Sky may terminate immediately for material breach, fraud, non-payment after notice, unlawful conduct, or prevention of performance. Where the Client terminates after Services have commenced, the Client remains responsible for Services already completed, marketing costs, tenant sourcing/screening completed, inspections coordinated, approved third-party costs and other reasonable expenses incurred before termination.</p>`],
  ['NON-CIRCUMVENTION', `<p>Where Seventh Sky introduces a prospective tenant to the Client, the Client agrees that during the term and for twelve (12) months after the introduction, the Client will not intentionally bypass Seventh Sky to enter into a tenancy with the introduced tenant without Seventh Sky's prior written consent. Where a tenancy is entered into with such a tenant during this period, the agreed leasing or management fees remain payable. This does not prevent the Client from renting to a tenant not introduced by Seventh Sky.</p>`],
  ['GENERAL PROVISIONS', `<p>Unless otherwise agreed in writing, this Agreement together with the accepted Quotation, Work Order and Schedules constitutes the entire agreement; any amendment must be in writing and signed or electronically accepted by both Parties; failure to enforce a provision does not waive rights; if any provision is invalid, the remainder continues in force; and notices may be delivered by hand, courier, registered post or email.</p>`],
  ['GOVERNING LAW & DISPUTE RESOLUTION', `<p>This Agreement is governed by the laws of the People's Republic of Bangladesh. The Parties will make reasonable efforts to resolve disputes through good-faith discussions before commencing legal proceedings, and may agree to mediation or another recognised process before referring the matter to the competent courts of Bangladesh. Nothing prevents either Party from seeking urgent relief where necessary.</p>`],
  ['EXECUTION', `<p>By signing this Agreement, the Parties confirm that they have read and understood it, have had the opportunity to obtain independent advice, enter into it voluntarily, and agree to be legally bound by its terms. This Agreement may be executed in counterparts and by electronic signature. Each signed copy is deemed an original and together constitute one Agreement.</p>`],
];

/** The editable Schedule C standard price catalog (from ServiceItem, vertical residential_pm). */
async function getRprmCatalog(branchId) {
  const where = { vertical: 'residential_pm', is_active: true };
  if (branchId) where.branch_id = branchId;
  const rows = await ServiceItem.findAll({ where, order: [['sort_order', 'ASC']] });
  return rows.map((r) => {
    const p = r.get({ plain: true });
    let tags = p.tags; if (typeof tags === 'string') { try { tags = JSON.parse(tags); } catch { tags = {}; } }
    tags = tags || {};
    return {
      id: p.id, code: p.code, name: p.name, unit: p.unit,
      standard_price: Number(p.base_price || 0),
      price_type: tags.price_type || 'fixed',
      price_label: tags.price_label || null,
      percent: tags.percent || null, min: tags.min || null,
      fee_model: p.fee_model,
    };
  });
}

/** Standard-price display string for a catalog line. */
function stdLabel(line) {
  if (line.price_label) return line.price_label;
  if (line.price_type === 'from') return `From ${money(line.standard_price)}`;
  if (line.price_type === 'percent_of_rent') return `${line.percent}% of Monthly Rent (Min ${money(line.min)})`;
  return money(line.standard_price);
}

/** Resolve the effective agreed amount for a line given the entered agreed price + monthly rent. */
function agreedAmount(line, agreed, monthlyRent) {
  if (agreed != null && agreed !== '') return Number(agreed);
  if (line.price_type === 'percent_of_rent') return Math.max(Number(line.min || 0), Math.round(Number(monthlyRent || 0) * (Number(line.percent || 0) / 100)));
  if (line.price_type === 'included') return 0;
  return Number(line.standard_price || 0);
}

/**
 * Compute Schedule C: selected lines with standard+agreed, the cost summary and an
 * auto-suggested payment schedule (editable downstream).
 * input: { selected:[{code, agreed_price}], monthly_rent, discount, vat_percent, fee_model, frequency, payment_overrides }
 */
async function computePricing(input = {}, branchId) {
  const catalog = await getRprmCatalog(branchId);
  const byCode = Object.fromEntries(catalog.map((c) => [c.code, c]));
  const selected = (input.selected || []).map((s) => {
    const line = byCode[s.code]; if (!line) return null;
    const agreed = agreedAmount(line, s.agreed_price, input.monthly_rent);
    return { ...line, std_label: stdLabel(line), agreed_price: agreed, recurring: line.fee_model === 'amc' || line.price_type === 'percent_of_rent' };
  }).filter(Boolean);

  const oneTime = selected.filter((l) => !l.recurring).reduce((s, l) => s + Number(l.agreed_price || 0), 0);
  const monthly = selected.filter((l) => l.recurring).reduce((s, l) => s + Number(l.agreed_price || 0), 0);
  const discount = Number(input.discount || 0);
  const vat = Math.round(((oneTime - discount) * Number(input.vat_percent || 0)) / 100);
  const total = oneTime - discount + vat;

  const summary = {
    one_time_leasing: oneTime, monthly_management_fee: monthly,
    third_party_costs: Number(input.third_party_costs || 0), maintenance_fees: Number(input.maintenance_fees || 0),
    admin_charges: Number(input.admin_charges || 0), discount, vat_percent: Number(input.vat_percent || 0), vat,
    total_contract_value: total,
  };

  // Auto-suggested payment schedule (editable): deposit 50% of one-time on acceptance, balance on tenancy start, then recurring fee.
  const payment_schedule = input.payment_overrides || [
    { stage: 'Deposit (on acceptance)', amount: Math.round(oneTime * 0.5), due: 'On acceptance' },
    { stage: 'Leasing Service Fee (balance)', amount: oneTime - Math.round(oneTime * 0.5), due: 'On tenancy commencement' },
    ...(monthly > 0 ? [{ stage: `Monthly Management Fee (${input.frequency || 'Monthly'})`, amount: monthly, due: 'Recurring per period' }] : []),
    { stage: 'Other Approved Charges', amount: summary.third_party_costs + summary.maintenance_fees + summary.admin_charges, due: 'As incurred' },
  ];

  return { lines: selected, summary, payment_schedule };
}

// ── HTML building blocks ───────────────────────────────────────────────
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
    ['One-Time Leasing Services', money(s.one_time_leasing)],
    ['Monthly Management Fee', money(s.monthly_management_fee)],
    ['Third-Party Costs (if applicable)', money(s.third_party_costs)],
    ['Maintenance Coordination Fees', money(s.maintenance_fees)],
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

function scheduleChecklboxes(id, title, groups, selectedSet) {
  const body = Object.entries(groups).map(([g, items]) => `
    <div style="margin:10px 0 4px;font-weight:700;font-size:12.5px;color:#334155;">${esc(g)}</div>
    <div style="display:flex;flex-wrap:wrap;gap:6px 18px;">${items.map((it) => {
    const on = selectedSet.has(it);
    return `<span style="font-size:12.5px;">${on ? '☑' : '☐'} ${esc(it)}</span>`;
  }).join('')}</div>`).join('');
  return `<h2 id="${id}" style="font-size:15px;color:#003768;margin:22px 0 6px;">${esc(title)}</h2>${body}`;
}

/**
 * Build the full agreement. `data`:
 *  org, client{full_name,nid,property_address,phone,email,rep}, property_type,
 *  services[] (Schedule A selected names), pricing (from computePricing),
 *  schedule_b{expected_rent,security_deposit,lease_term,commencement_date,review_date,special_requirements,work_order_no,quotation_no},
 *  payment_terms{frequency,fee_model}, checklist[] (Schedule D), witnesses[{name,nid}], effective_date
 */
function buildResidentialPMAgreement(data = {}) {
  const org = data.org || {};
  const c = data.client || {};
  const b = data.schedule_b || {};
  const servicesSet = new Set(data.services || []);
  const checklistSet = new Set(data.checklist || []);
  const pricing = data.pricing || { lines: [], summary: {}, payment_schedule: [] };
  const doc_no = 'SSPC-RPRMS-01';
  const title = 'Residential Property Rental Management Service Agreement';

  // Table of Contents
  const toc = `
  <div style="border:1px solid #d9dee6;border-radius:10px;padding:14px 18px;margin:14px 0;background:#f8fafc;">
    <div style="font-weight:700;font-size:13px;color:#003768;margin-bottom:8px;">Table of Contents</div>
    <ol style="columns:2;column-gap:32px;margin:0;padding-left:18px;font-size:12.5px;line-height:1.9;">
      ${CLAUSES.map(([t], i) => `<li><a href="#cl-${i + 1}" style="color:#1e3a8a;text-decoration:none;">${esc(t)}</a></li>`).join('')}
      <li><a href="#sched-a" style="color:#1e3a8a;text-decoration:none;">Schedule A — Selected Services</a></li>
      <li><a href="#sched-b" style="color:#1e3a8a;text-decoration:none;">Schedule B — Property Summary</a></li>
      <li><a href="#sched-c" style="color:#1e3a8a;text-decoration:none;">Schedule C — Price Schedule</a></li>
      <li><a href="#sched-d" style="color:#1e3a8a;text-decoration:none;">Schedule D — Management Checklist</a></li>
    </ol>
  </div>`;

  const parties = `
  <p style="margin:14px 0 6px;">This Agreement is made on: <b>${or(data.effective_date)}</b></p>
  <div style="font-weight:700;color:#003768;margin-top:8px;">BETWEEN</div>
  ${kvTable([['Seventh Sky Private Limited', org.name || 'Seventh Sky Property Care'], ['Address', org.address], ['Phone', org.phone], ['Email', org.email], ['Represented by', org.represented_by], ['Position', org.position]])}
  <div style="font-weight:700;color:#003768;margin-top:8px;">AND — Property Owner / Landlord (Client)</div>
  ${kvTable([['Full Name', c.full_name], ['National ID / Passport No.', c.nid], ['Property Address', c.property_address], ['Phone', c.phone], ['Email', c.email], ['Authorised Representative (if applicable)', c.rep]])}`;

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
  <h2 style="font-size:15px;color:#003768;margin:26px 0 6px;">Signatures</h2>
  <table style="width:100%;margin-top:6px;"><tr>
    <td style="width:50%;vertical-align:top;padding-right:16px;"><div style="border-top:1px solid #333;padding-top:6px;font-size:12px;"><b>Seventh Sky Private Limited</b><br/>Name: ${or(org.represented_by)}<br/>Position: ${or(org.position)}${signSlot('Seventh Sky')}</div></td>
    <td style="width:50%;vertical-align:top;padding-left:16px;"><div style="border-top:1px solid #333;padding-top:6px;font-size:12px;"><b>Client (Property Owner / Landlord)</b><br/>Name: ${or(c.full_name)}${signSlot('Client')}</div></td>
  </tr></table>
  <table style="width:100%;margin-top:14px;"><tr>
    ${(data.witnesses || [{}, {}]).slice(0, 2).map((w, i) => `<td style="width:50%;vertical-align:top;padding:0 16px;"><div style="border-top:1px solid #333;padding-top:6px;font-size:12px;"><b>Witness ${i + 1}</b><br/>Name: ${or(w.name)}<br/>NID / Passport: ${or(w.nid)}${w.email ? `<br/>Email: ${esc(w.email)}` : ''}${signSlot(`Witness ${i + 1}`)}</div></td>`).join('')}
  </tr></table>`;

  const schedA = scheduleChecklboxes('sched-a', 'SCHEDULE A — Selected Services', SERVICE_GROUPS, servicesSet);
  const schedB = `<h2 id="sched-b" style="font-size:15px;color:#003768;margin:22px 0 6px;">SCHEDULE B — Property Management Summary</h2>${kvTable([
    ['Work Order No.', b.work_order_no], ['Quotation No.', b.quotation_no], ['Property Owner', c.full_name], ['Property Address', c.property_address],
    ['Property Type', data.property_type], ['Expected Monthly Rent', b.expected_rent != null ? money(b.expected_rent) : null], ['Security Deposit', b.security_deposit != null ? money(b.security_deposit) : null],
    ['Lease Term', b.lease_term], ['Selected Services', (data.services || []).join(', ')], ['Management Commencement Date', b.commencement_date], ['Management Review Date', b.review_date], ['Special Requirements', b.special_requirements],
  ])}`;
  const schedC = scheduleC(pricing);
  const schedD = scheduleChecklboxes('sched-d', 'SCHEDULE D — Property Management Checklist', CHECKLIST_GROUPS, checklistSet);

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

  // structured terms synced onto records when the envelope completes
  const terms = {
    doc_no, selected_services: data.services || [], schedule_b: b,
    fee_model: data.payment_terms?.fee_model, frequency: data.payment_terms?.frequency,
    pricing_summary: pricing.summary, payment_schedule: pricing.payment_schedule,
    agreed_lines: pricing.lines.map((l) => ({ code: l.code, name: l.name, agreed_price: l.agreed_price, recurring: l.recurring })),
  };
  return { title, doc_no, html, terms };
}

module.exports = { getRprmCatalog, computePricing, buildResidentialPMAgreement, SERVICE_GROUPS, CHECKLIST_GROUPS };
