/**
 * stsAgreement.service.js
 * ------------------------------------------------------------------
 * Short-Term Rental Management Service Agreement (SSPC-STRMS-01 v0.2).
 * Always signed Seventh Sky ↔ Property Owner. Mirrors the RPRM/RPTM builders: full
 * owner-visible HTML with a visible Table of Contents, all 25 clauses, Schedules A–D,
 * and Schedule C Standard vs Agreed pricing + summary + payment schedule. The chosen
 * management-fee model (STR-013 fixed monthly / STR-014 revenue share %) is surfaced in
 * `terms.fee_model` so the caller can persist it onto ShortStayOwnerManagement, which the
 * owner-statement / disbursement engine already deducts.
 *
 *   getStsCatalog()               → editable Schedule C standard price list (ServiceItem)
 *   computePricing(input,branchId)→ { lines, summary, payment_schedule, fee }
 *   buildStsAgreement(data)       → { title, doc_no, html, terms }
 */
const ServiceItem = require('../models/ServiceItem');

const money = (v) => '৳' + Number(v || 0).toLocaleString('en-US', { maximumFractionDigits: 0 });
const or = (v, f = '__________') => (v == null || v === '' ? f : v);
const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const SERVICE_GROUPS = {
  'Property Setup & Readiness': ['Initial Property Assessment', 'STR Readiness Assessment', 'Furnishing & Setup Coordination', 'Interior Styling Coordination', 'Safety & Operational Setup', 'Professional Photography', 'Listing Preparation'],
  'Marketing & Booking Management': ['Online Listing Management', 'Booking Calendar Management', 'Dynamic Pricing Coordination', 'Marketing & Promotion', 'Guest Enquiry Management', 'Booking Confirmation'],
  'Guest Management': ['Guest Communication', 'Guest Verification', 'Check-in Coordination', 'Check-out Coordination', 'Guest Support', 'Complaint Resolution Coordination'],
  'Property Operations': ['Housekeeping Coordination', 'Linen Management Coordination', 'Routine Property Inspection', 'Maintenance Coordination', 'Emergency Response Coordination', 'Damage Reporting Coordination'],
  'Financial & Reporting': ['Booking Revenue Reporting', 'Owner Statements', 'Occupancy Reporting', 'Expense Tracking', 'Operational Performance Reports'],
  'Additional Services': ['Airport Transfer Coordination', 'Concierge Services', 'Utility Management', 'Shopping Assistance', 'Property Improvement Coordination', 'Interior Design Consultation', 'Other'],
};

const CHECKLIST_GROUPS = {
  'Property Information': ['Ownership Verification', 'Property Address', 'Property Type', 'Insurance Confirmation', 'Utility Services Active'],
  'Property Setup': ['Furnished & Equipped', 'Safety Equipment Installed', 'Professional Photography Completed', 'House Rules Prepared', 'Guest Information Guide Prepared', 'Listing Approved'],
  'Operations': ['Booking Platform Activated', 'Pricing Strategy Approved', 'Housekeeping Arranged', 'Maintenance Contacts Confirmed', 'Emergency Contact Details Recorded', 'Check-in / Check-out Procedure Finalised'],
  'Ongoing Management': ['Monthly Performance Report', 'Occupancy Review', 'Revenue Review', 'Property Inspection', 'Maintenance Review', 'Owner Feedback', 'Other Special Instructions'],
};

const CLAUSES = [
  ['PURPOSE', `<p>This Agreement sets out the terms under which Seventh Sky will provide Short-Term Rental (STR) Management Services for the Client's property. The Services assist the Client in preparing, marketing, managing and operating furnished accommodation, holiday homes, serviced apartments, guest houses and other short-term rental properties. The specific Services, pricing, management fees and engagement scope for each property shall be confirmed in the approved Quotation, Work Order or Property Management Schedule.</p>`],
  ['TERM', `<p>This Agreement becomes effective on the date signed by both Parties and continues until terminated by either Party in accordance with this Agreement; replaced by another written agreement; the property is withdrawn from management; or both Parties otherwise agree in writing. The management commencement date, management period and renewal arrangements shall be specified in the approved Work Order or Property Management Schedule.</p>`],
  ['SERVICES', `<p>Depending on the selected management package, Seventh Sky may provide one or more of the services listed in <b>Schedule A</b>. Only the Services selected in Schedule A or the approved Work Order form part of this Agreement. Additional Services may be included by written agreement.</p>`],
  ['PROPERTY DETAILS', `<p>The property to be managed shall be recorded in <b>Schedule B</b> or the approved Property Management Schedule, including Property Address, Property Type, Bedrooms/Bathrooms, Maximum Guest Capacity, Furnished status, Facilities, Parking, Check-in/out Requirements, House Rules, Booking Platform(s), Management Package and other agreed operational requirements. Where any inconsistency exists between this Agreement and the approved Work Order or Property Management Schedule, the latter prevails for that property.</p>`],
  ['OWNER RESPONSIBILITIES', `<p>The Owner agrees to provide accurate ownership and property information; confirm they are legally authorised to offer the property for short-term rental; maintain valid ownership, approvals and licences; keep utilities connected unless otherwise agreed; provide safe and lawful access; approve maintenance, repairs and operational expenses where required; maintain appropriate building, contents and public liability insurance where applicable; promptly notify Seventh Sky of legal, regulatory or operational issues; pay all agreed management fees and approved operational expenses; and cooperate in managing bookings and guest services. The Owner remains responsible for legal compliance, declaring rental income and taxation, structural condition, independent professional advice, and final decisions on major improvements and capital expenditure.</p>`],
  ['RESPONSIBILITIES OF SEVENTH SKY', `<p>Seventh Sky will provide the agreed Services with reasonable care and skill; manage bookings and guest communications per the selected package; coordinate property preparation before guest arrival; coordinate housekeeping and maintenance where required; monitor booking performance and occupancy; provide periodic owner reports; coordinate approved third-party providers; use reasonable efforts to maximise occupancy through effective marketing; and keep the Owner reasonably informed. Unless otherwise agreed in writing, Seventh Sky acts as the Short-Term Rental Management Service Provider and does not guarantee occupancy levels, booking frequency, rental income or guest behaviour.</p>`],
  ['QUOTATIONS & WORK ORDERS', `<p>Before commencing the Services, Seventh Sky may issue a Quotation or Work Order specifying the selected management package, management fees, setup fees, revenue-sharing arrangement, payment schedule, approved operational expenses, management commencement date, reporting frequency and any special conditions. Additional Services requested after commencement may require a revised Quotation, Work Order or approved variation before work proceeds.</p>`],
  ['SERVICE FEES & PAYMENT', `<p>The fees payable shall be specified in the approved Quotation, Work Order or Property Management Schedule. Depending on the package, fees may include initial consultation, property setup and readiness, listing and marketing, professional photography, management fees, revenue sharing (where applicable), housekeeping/maintenance/guest-service coordination, approved third-party fees and any other agreed Services. The Owner agrees to pay all agreed fees per the approved payment schedule. Utility charges, government fees, insurance premiums, maintenance, contractor charges, cleaning, replacement of damaged items, consumables and other approved operational expenses remain the Owner's responsibility unless otherwise agreed in writing.</p>`],
  ['PAYMENT TERMS', `<p>Unless otherwise agreed in writing — <b>Initial Setup Services:</b> deposit upon acceptance (where applicable), balance on completion of the agreed setup services. <b>Ongoing STR Management:</b> the arrangement may be based on a Fixed Monthly Management Fee, a Percentage of Gross Booking Revenue, a Hybrid Fee (fixed + revenue share) or another agreed model, as specified in the approved Work Order or Property Management Schedule. Revenue distributions, management fees and approved reimbursements are processed according to the agreed reporting cycle. Invoices are payable within the period stated on the invoice. Late payments may result in suspension of non-essential management services.</p>`],
  ['BOOKING & PROPERTY MANAGEMENT SERVICES', `<p>Seventh Sky will use reasonable efforts to maximise booking opportunities through effective property presentation, marketing and operational management. The Owner acknowledges that occupancy depends on market demand, booking platforms operate independently, booking rates fluctuate, guest bookings cannot be guaranteed and rental income may vary throughout the year. Where requested, Seventh Sky may coordinate online listings, booking enquiries, reservation management, guest communication, check-in/out, housekeeping, maintenance, property inspections, owner reporting and other agreed management services.</p>`],
  ['PROJECT TIMELINES', `<p>Estimated commencement dates for setup and ongoing management will be provided in the approved Quotation or Work Order. Delivery may be affected by owner approvals, property readiness, contractor availability, booking-platform approvals, guest schedules, maintenance, weather, public holidays, government requirements or other circumstances beyond Seventh Sky's reasonable control. Where delays occur, Seventh Sky will keep the Owner reasonably informed.</p>`],
  ['VARIATIONS & ADDITIONAL SERVICES', `<p>A variation occurs where the Owner requests work outside the agreed management scope or where additional work becomes necessary. Where practical, Seventh Sky will advise the Owner of the additional Services, any additional fees and any expected impact on delivery. No variation will proceed without the Owner's approval unless immediate action is reasonably necessary to protect the property, guests or the Owner's interests.</p>`],
  ['BOOKING PLATFORMS & THIRD-PARTY SERVICES', `<p>Where requested, Seventh Sky may coordinate bookings and operational services through third-party booking platforms and independent providers. The Owner acknowledges that platforms determine their own terms and fees; that housekeeping, maintenance, utility, payment and other providers remain responsible for their own services; that Seventh Sky does not guarantee platform performance, rankings, reviews or reservation volumes; that guest conduct cannot be guaranteed despite reasonable screening; and that the Owner remains responsible for major property decisions, insurance, taxation and legal compliance.</p>`],
  ['SERVICE COMPLETION', `<p>The Services are completed when the agreed scope specified in the Quotation, Work Order or Property Management Schedule has been substantially delivered. Where Seventh Sky is engaged for ongoing STR management, completion occurs upon the expiry or termination of the agreed management period unless renewed by mutual agreement.</p>`],
  ['CLIENT COMPLAINTS & SERVICE ISSUES', `<p>If the Owner believes the Services have not been delivered as agreed, they should notify Seventh Sky promptly. Seventh Sky will acknowledge, investigate, liaise with relevant parties, take reasonable steps to resolve, keep the Owner informed and implement corrective action where appropriate. Nothing in this Agreement limits any rights available to the Owner under applicable law.</p>`],
  ['LIABILITY', `<p>To the extent permitted by the laws of Bangladesh, Seventh Sky will provide the agreed Services with reasonable care and skill and is responsible only for the Services it agreed to provide. The Owner remains responsible for legal ownership and ensuring the property is suitable and legally permitted for short-term rental, and for maintaining appropriate insurance, licences and statutory approvals. Guests remain responsible for complying with booking conditions and house rules and for damage caused by their actions. Independent providers remain responsible for their own services. Neither Party is liable for delays or failures beyond its reasonable control.</p>`],
  ['LIMITATION OF LIABILITY', `<p>Except where liability cannot legally be excluded, Seventh Sky shall not be liable for fluctuations in booking volumes/occupancy/income, guest or platform cancellations, guest misconduct or excessive wear beyond its control, delays by independent contractors, utility/internet/platform interruptions, inaccurate Owner/guest information, regulatory/taxation/licensing changes, or indirect/consequential loss. Where permitted by law, Seventh Sky's total liability shall not exceed the management fees paid for the affected Services. This clause does not exclude liability for fraud or wilful misconduct.</p>`],
  ['CONFIDENTIALITY & PRIVACY', `<p>Each Party agrees to keep confidential all non-public information obtained through this Agreement. Personal, financial and property information will only be used to provide the Services, manage bookings and guest communications, coordinate with platforms and authorised providers, arrange housekeeping/maintenance/operational support, prepare documents and statements, comply with legal obligations, or as authorised by the Owner. These obligations continue after completion or termination.</p>`],
  ['FORCE MAJEURE', `<p>Neither Party is responsible for delays or failure caused by circumstances beyond its reasonable control, including natural disasters, severe weather, fire/flood or property damage, pandemics or public-health emergencies, government restrictions, industrial action, civil unrest, utility failures, booking-platform outages or major technology failures. The affected Party shall notify the other as soon as practicable and resume once the event has ended.</p>`],
  ['OWNER ACKNOWLEDGEMENTS', `<p>The Owner acknowledges that they have reviewed and accepted the Quotation or Work Order before Services commence; that booking demand, occupancy and income depend on market conditions and cannot be guaranteed; that booking platforms operate independently and may change policies/fees/algorithms; that the property must comply with applicable legal, safety and licensing requirements; that reviews, ratings and occupancy may be influenced by factors outside Seventh Sky's control; that some Services involve independent third-party providers; that independent professional advice should be obtained where appropriate; and that they have had the opportunity to ask questions before entering into this Agreement.</p>`],
  ['SUSPENSION & TERMINATION', `<p><b>Suspension.</b> Seventh Sky may suspend the Services where the Owner fails to pay, fails to provide required information/approvals, provides false information, requests suspension, or where continuation would be unlawful, unsafe or impracticable. <b>Termination.</b> Either Party may terminate by giving thirty (30) days' written notice unless otherwise specified in the approved Work Order or Management Schedule. Seventh Sky may terminate immediately for material breach, false information, non-payment after notice, unlawful conduct, or prevention of performance. Where the Owner terminates after Services have commenced, the Owner remains responsible for Services already completed, approved setup costs, marketing/listing costs, approved contractor fees, confirmed guest bookings (where applicable), approved third-party expenses and other reasonable expenses incurred before termination.</p>`],
  ['NON-CIRCUMVENTION', `<p>Where Seventh Sky introduces guests, booking opportunities or corporate accommodation clients, the Owner agrees that during the term and for twelve (12) months after the introduction, they will not intentionally bypass Seventh Sky to accept direct bookings from those introduced guests or clients without Seventh Sky's prior written consent. Where such introduced bookings proceed outside this Agreement during this period, the agreed management fees or revenue-sharing arrangements remain payable. This does not restrict bookings received independently through channels not introduced or managed by Seventh Sky.</p>`],
  ['GENERAL PROVISIONS', `<p>Unless otherwise agreed in writing, this Agreement together with the accepted Quotation, Work Order and Schedules constitutes the entire agreement; any amendment must be in writing and signed or electronically accepted; failure to enforce a provision does not waive rights; if any provision is invalid, the remainder continues in force; and notices may be delivered by hand, courier, registered post or email.</p>`],
  ['GOVERNING LAW & DISPUTE RESOLUTION', `<p>This Agreement is governed by the laws of the People's Republic of Bangladesh. The Parties will make reasonable efforts to resolve disputes through good-faith discussions before commencing legal proceedings, and may agree to mediation or another recognised process before referring the matter to the competent courts of Bangladesh. Nothing prevents either Party from seeking urgent relief where necessary.</p>`],
  ['EXECUTION', `<p>By signing this Agreement, the Parties confirm that they have read and understood it, have had the opportunity to obtain independent advice, enter into it voluntarily, and agree to be legally bound by its terms. This Agreement may be executed in counterparts and by electronic signature. Each signed copy is deemed an original and together constitute one Agreement.</p>`],
];

async function getStsCatalog(branchId) {
  const where = { vertical: 'str_mgmt', is_active: true };
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

/**
 * Schedule C compute. Special lines: STR-013 fixed_monthly (agreed fixed fee), STR-014
 * revenue_share (agreed % of gross booking revenue). Returns `fee` describing the ongoing
 * management-fee model so the caller can persist it to ShortStayOwnerManagement.
 */
async function computePricing(input = {}, branchId) {
  const catalog = await getStsCatalog(branchId);
  const byCode = Object.fromEntries(catalog.map((c) => [c.code, c]));
  const selected = (input.selected || []).map((s) => {
    const line = byCode[s.code]; if (!line) return null;
    let agreed;
    if (line.price_type === 'revenue_share') agreed = 0; // percent captured separately
    else if (line.price_type === 'included') agreed = 0;
    else agreed = (s.agreed_price != null && s.agreed_price !== '') ? Number(s.agreed_price) : Number(line.standard_price || 0);
    return { ...line, std_label: stdLabel(line), agreed_price: agreed, agreed_percent: line.price_type === 'revenue_share' ? Number(s.agreed_price || input.revenue_share_percent || 0) : null };
  }).filter(Boolean);

  const setupLines = selected.filter((l) => !l.recurring && l.price_type !== 'included');
  const setup = setupLines.reduce((s, l) => s + Number(l.agreed_price || 0), 0);
  const fixedFeeLine = selected.find((l) => l.price_type === 'fixed_monthly');
  const revShareLine = selected.find((l) => l.price_type === 'revenue_share');
  const monthlyFee = fixedFeeLine ? Number(fixedFeeLine.agreed_price || 0) : 0;
  const revenueSharePercent = revShareLine ? Number(revShareLine.agreed_percent || 0) : 0;

  const discount = Number(input.discount || 0);
  const vat = Math.round(((setup - discount) * Number(input.vat_percent || 0)) / 100);
  const total = setup - discount + vat;

  const summary = {
    initial_setup_fees: setup, monthly_management_fees: monthlyFee, revenue_share_percent: revenueSharePercent,
    third_party_costs: Number(input.third_party_costs || 0), admin_charges: Number(input.admin_charges || 0),
    discount, vat_percent: Number(input.vat_percent || 0), vat, total_contract_value: total,
  };
  const payment_schedule = input.payment_overrides || [
    { stage: 'Initial Deposit (if applicable)', amount: Math.round(setup * 0.5), due: 'On acceptance' },
    { stage: 'Setup Completion', amount: setup - Math.round(setup * 0.5), due: 'On setup completion' },
    ...(monthlyFee > 0 ? [{ stage: 'Monthly Management Fee', amount: monthlyFee, due: 'Monthly' }] : []),
    ...(revenueSharePercent > 0 ? [{ stage: `Revenue Share Settlement (${revenueSharePercent}%)`, amount: 0, due: 'Per reporting cycle' }] : []),
  ];
  // fee model for ShortStayOwnerManagement: prefer revenue share, else fixed monthly, else hybrid
  const fee = {
    model: revenueSharePercent > 0 && monthlyFee > 0 ? 'hybrid' : revenueSharePercent > 0 ? 'revenue_share' : monthlyFee > 0 ? 'fixed_monthly' : 'none',
    revenue_share_percent: revenueSharePercent, fixed_monthly_fee: monthlyFee,
  };
  return { lines: selected, summary, payment_schedule, fee };
}

const kvTable = (rows) => `<table style="width:100%;border-collapse:collapse;margin:8px 0;">${rows.map(([k, v]) => `<tr><td style="padding:6px 10px;border:1px solid #d9dee6;background:#f6f8fb;width:38%;font-weight:600;font-size:12.5px;">${esc(k)}</td><td style="padding:6px 10px;border:1px solid #d9dee6;font-size:12.5px;">${v == null ? '__________' : esc(v)}</td></tr>`).join('')}</table>`;

function scheduleC(pricing) {
  const rows = pricing.lines.map((l) => {
    const agreedCell = l.price_type === 'revenue_share' ? `${l.agreed_percent || 0}% of gross` : l.price_type === 'included' ? 'Included' : money(l.agreed_price);
    return `<tr>
      <td style="padding:6px 8px;border:1px solid #d9dee6;font-size:12px;">${esc(l.code)}</td>
      <td style="padding:6px 8px;border:1px solid #d9dee6;font-size:12px;">${esc(l.name)}</td>
      <td style="padding:6px 8px;border:1px solid #d9dee6;font-size:12px;">${esc(l.unit || '')}</td>
      <td style="padding:6px 8px;border:1px solid #d9dee6;font-size:12px;text-align:right;color:#6b7280;">${esc(l.std_label)}</td>
      <td style="padding:6px 8px;border:1px solid #d9dee6;font-size:12px;text-align:right;font-weight:700;">${agreedCell}</td>
    </tr>`;
  }).join('');
  const s = pricing.summary;
  const sumRows = [
    ['Initial Setup Fees', money(s.initial_setup_fees)],
    ['Monthly Management Fees', money(s.monthly_management_fees)],
    ['Revenue Share (if applicable)', s.revenue_share_percent ? `${s.revenue_share_percent}% of gross booking revenue` : '—'],
    ['Third-Party Costs', money(s.third_party_costs)],
    ['Administrative Charges', money(s.admin_charges)],
    ['Discount', '– ' + money(s.discount)],
    [`VAT (${s.vat_percent}%)`, money(s.vat)],
  ].map(([k, v]) => `<tr><td style="padding:5px 10px;border:1px solid #d9dee6;font-size:12.5px;">${k}</td><td style="padding:5px 10px;border:1px solid #d9dee6;font-size:12.5px;text-align:right;">${v}</td></tr>`).join('');
  const payRows = pricing.payment_schedule.map((p) => `<tr><td style="padding:5px 10px;border:1px solid #d9dee6;font-size:12.5px;">${esc(p.stage)}</td><td style="padding:5px 10px;border:1px solid #d9dee6;font-size:12.5px;text-align:right;">${p.amount ? money(p.amount) : '—'}</td><td style="padding:5px 10px;border:1px solid #d9dee6;font-size:12.5px;">${esc(p.due || '')}</td></tr>`).join('');
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

function buildStsAgreement(data = {}) {
  const org = data.org || {};
  const c = data.client || {};
  const b = data.schedule_b || {};
  const servicesSet = new Set(data.services || []);
  const checklistSet = new Set(data.checklist || []);
  const pricing = data.pricing || { lines: [], summary: {}, payment_schedule: [], fee: {} };
  const doc_no = 'SSPC-STRMS-01';
  const title = 'Short-Term Rental Management Service Agreement';

  const toc = `
  <div style="border:1px solid #d9dee6;border-radius:10px;padding:14px 18px;margin:14px 0;background:#f8fafc;">
    <div style="font-weight:700;font-size:13px;color:#003768;margin-bottom:8px;">Table of Contents</div>
    <ol style="columns:2;column-gap:32px;margin:0;padding-left:18px;font-size:12.5px;line-height:1.9;">
      ${CLAUSES.map(([t], i) => `<li><a href="#cl-${i + 1}" style="color:#1e3a8a;text-decoration:none;">${esc(t)}</a></li>`).join('')}
      <li><a href="#sched-a" style="color:#1e3a8a;text-decoration:none;">Schedule A — Selected Services</a></li>
      <li><a href="#sched-b" style="color:#1e3a8a;text-decoration:none;">Schedule B — STR Property Management Summary</a></li>
      <li><a href="#sched-c" style="color:#1e3a8a;text-decoration:none;">Schedule C — Price Schedule</a></li>
      <li><a href="#sched-d" style="color:#1e3a8a;text-decoration:none;">Schedule D — Setup & Management Checklist</a></li>
    </ol>
  </div>`;

  const parties = `
  <p style="margin:14px 0 6px;">This Agreement is made on: <b>${or(data.effective_date)}</b></p>
  <div style="font-weight:700;color:#003768;margin-top:8px;">BETWEEN</div>
  ${kvTable([['Seventh Sky Private Limited', org.name || 'Seventh Sky Property Care'], ['Address', org.address], ['Phone', org.phone], ['Email', org.email], ['Represented by', org.represented_by], ['Position', org.position]])}
  <div style="font-weight:700;color:#003768;margin-top:8px;">AND — Property Owner / Client</div>
  ${kvTable([['Full Name', c.full_name], ['National ID / Passport No.', c.nid], ['Current Address', c.current_address], ['Phone', c.phone], ['Email', c.email], ['Represented by (if applicable)', c.rep], ['Relationship / Position', c.rep_position]])}`;

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
    <td style="width:50%;vertical-align:top;padding-left:16px;"><div style="border-top:1px solid #333;padding-top:6px;font-size:12px;"><b>Property Owner / Client</b><br/>Name: ${or(c.full_name)}${signSlot('Client')}</div></td>
  </tr></table>
  <table style="width:100%;margin-top:14px;"><tr>
    ${(data.witnesses || [{}, {}]).slice(0, 2).map((w, i) => `<td style="width:50%;vertical-align:top;padding:0 16px;"><div style="border-top:1px solid #333;padding-top:6px;font-size:12px;"><b>Witness ${i + 1}</b><br/>Name: ${or(w.name)}<br/>NID / Passport: ${or(w.nid)}${w.email ? `<br/>Email: ${esc(w.email)}` : ''}${signSlot(`Witness ${i + 1}`)}</div></td>`).join('')}
  </tr></table>`;

  const schedA = checkboxGroups('sched-a', 'SCHEDULE A — Selected Services', SERVICE_GROUPS, servicesSet);
  const schedB = `<h2 id="sched-b" style="font-size:15px;color:#003768;margin:22px 0 6px;">SCHEDULE B — STR Property Management Summary</h2>${kvTable([
    ['Work Order No.', b.work_order_no], ['Quotation No.', b.quotation_no], ['Property Owner', c.full_name], ['Property Address', b.property_address || c.current_address],
    ['Property Type', data.property_type], ['Maximum Guest Capacity', b.max_guests], ['Booking Platform(s)', b.booking_platforms], ['Management Package', b.management_package],
    ['Management Commencement Date', b.commencement_date], ['Reporting Frequency', b.reporting_frequency], ['Special Requirements', b.special_requirements],
  ])}`;
  const schedC = scheduleC(pricing);
  const schedD = checkboxGroups('sched-d', 'SCHEDULE D — STR Property Setup & Management Checklist', CHECKLIST_GROUPS, checklistSet);

  const html = `
  <div style="font-family: Georgia,'Times New Roman',serif;color:#1f2430;line-height:1.6;font-size:14px;max-width:820px;margin:0 auto;">
    <div style="text-align:center;border-bottom:3px double #003768;padding-bottom:12px;">
      <div style="font-size:20px;font-weight:bold;color:#003768;">Seventh Sky Property Care</div>
      <div style="font-size:16px;font-weight:bold;margin-top:12px;text-transform:uppercase;">${esc(title)}</div>
      <div style="font-size:11px;color:#6b7280;margin-top:4px;">Document No: ${doc_no} · Version: 0.2 · Effective Date: ${or(data.effective_date)}</div>
    </div>
    ${toc}${parties}${clausesHtml}${schedA}${schedB}${schedC}${schedD}${signatures}
    <div style="margin-top:22px;padding-top:10px;border-top:1px solid #d1d5db;font-size:11px;color:#6b7280;">This Agreement becomes effective when signed by both Parties through the Seventh Sky electronic signing system. The electronic record, audit trail and content hash constitute proof of execution.</div>
  </div>`;

  const terms = {
    doc_no, selected_services: data.services || [], schedule_b: b,
    pricing_summary: pricing.summary, payment_schedule: pricing.payment_schedule,
    fee: pricing.fee,
    agreed_lines: pricing.lines.map((l) => ({ code: l.code, name: l.name, agreed_price: l.agreed_price, agreed_percent: l.agreed_percent, recurring: l.recurring })),
  };
  return { title, doc_no, html, terms };
}

module.exports = { getStsCatalog, computePricing, buildStsAgreement, SERVICE_GROUPS, CHECKLIST_GROUPS };
