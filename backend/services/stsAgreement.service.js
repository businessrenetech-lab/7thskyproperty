/**
 * stsAgreement.service.js
 * ------------------------------------------------------------------
 * Short-Term Rental Management Service Agreement (SSPC-STRMS-01 v0.2).
 * Always signed Seventh Sky ↔ Property Owner.
 * Upgraded with Figma-grade aesthetic:
 *   1. Dedicated Minimalist Cover Page (Page 1) with branding & owner dossier
 *   2. Dedicated 1-Page Table of Contents (Page 2) with 2-column roadmap
 *   3. Modern card-based presentation for all 25 clauses & Schedules A–D
 *   4. Anchored signature slots for Seventh Sky, Property Owner, and Witnesses
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
    if (line.price_type === 'revenue_share') agreed = 0;
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
  const fee = {
    model: revenueSharePercent > 0 && monthlyFee > 0 ? 'hybrid' : revenueSharePercent > 0 ? 'revenue_share' : monthlyFee > 0 ? 'fixed_monthly' : 'none',
    revenue_share_percent: revenueSharePercent, fixed_monthly_fee: monthlyFee,
  };
  return { lines: selected, summary, payment_schedule, fee };
}

const kvTable = (rows) => `
<div style="border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;background:#ffffff;margin:10px 0 16px;box-shadow:0 1px 3px rgba(0,0,0,0.02);">
  <table style="width:100%;border-collapse:collapse;">
    ${rows.map(([k, v], idx) => `
      <tr style="${idx > 0 ? 'border-top:1px solid #f1f5f9;' : ''}">
        <td style="padding:9px 14px;background:#f8fafc;width:36%;font-weight:600;font-size:12px;color:#475569;border-right:1px solid #f1f5f9;">${esc(k)}</td>
        <td style="padding:9px 14px;font-size:12.5px;color:#0f172a;font-weight:500;">${v == null ? '<span style="color:#94a3b8;">__________</span>' : esc(v)}</td>
      </tr>
    `).join('')}
  </table>
</div>`;

function scheduleC(pricing) {
  const rows = pricing.lines.map((l) => {
    const agreedCell = l.price_type === 'revenue_share'
      ? `<span style="display:inline-block;padding:2px 8px;border-radius:9999px;background:#e0f2fe;color:#0369a1;font-size:10.5px;font-weight:700;">${l.agreed_percent || 0}% of gross</span>`
      : l.price_type === 'included'
      ? '<span style="display:inline-block;padding:2px 8px;border-radius:9999px;background:#e0f2fe;color:#0369a1;font-size:10.5px;font-weight:700;">Included</span>'
      : money(l.agreed_price);
    return `
    <tr style="border-bottom:1px solid #f1f5f9;">
      <td style="padding:9px 12px;font-size:11.5px;font-weight:700;color:#003768;">${esc(l.code)}</td>
      <td style="padding:9px 12px;font-size:12px;color:#1e293b;font-weight:600;">${esc(l.name)}</td>
      <td style="padding:9px 12px;font-size:11.5px;color:#64748b;">${esc(l.unit || '')}</td>
      <td style="padding:9px 12px;font-size:11.5px;text-align:right;color:#64748b;">${esc(l.std_label)}</td>
      <td style="padding:9px 12px;font-size:12px;text-align:right;font-weight:700;color:#0f172a;">${agreedCell}</td>
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
  ].map(([k, v]) => `
    <tr style="border-bottom:1px solid #f1f5f9;">
      <td style="padding:7px 12px;font-size:12px;color:#475569;">${k}</td>
      <td style="padding:7px 12px;font-size:12px;text-align:right;font-weight:600;color:#0f172a;">${v}</td>
    </tr>`).join('');
  const payRows = pricing.payment_schedule.map((p) => `
    <tr style="border-bottom:1px solid #f1f5f9;">
      <td style="padding:8px 12px;font-size:12px;font-weight:600;color:#1e293b;">${esc(p.stage)}</td>
      <td style="padding:8px 12px;font-size:12px;text-align:right;font-weight:700;color:#0f172a;">${p.amount ? money(p.amount) : '—'}</td>
      <td style="padding:8px 12px;font-size:11.5px;color:#64748b;">${esc(p.due || '')}</td>
    </tr>`).join('');

  return `
  <div style="margin:26px 0 16px;">
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
      <span style="background:#012a4e;color:#fff;font-size:10px;font-weight:800;padding:2px 7px;border-radius:4px;letter-spacing:0.8px;">SCHEDULE C</span>
      <h2 id="sched-c" style="font-size:15px;color:#012a4e;font-weight:800;margin:0;">Price Schedule (Standard vs Agreed)</h2>
    </div>
    <div style="border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;background:#ffffff;margin:10px 0 16px;box-shadow:0 1px 3px rgba(0,0,0,0.02);">
      <table style="width:100%;border-collapse:collapse;">
        <thead>
          <tr style="background:#f8fafc;border-bottom:1px solid #e2e8f0;">
            ${['Code', 'Service', 'Unit', 'Standard Price (BDT)', 'Agreed Price (BDT)'].map((h) => `<th style="padding:9px 12px;font-size:11px;font-weight:700;color:#475569;text-transform:uppercase;letter-spacing:0.5px;text-align:${h.includes('Price') ? 'right' : 'left'};">${h}</th>`).join('')}
          </tr>
        </thead>
        <tbody>${rows || '<tr><td colspan="5" style="padding:14px;text-align:center;color:#94a3b8;">No services selected yet.</td></tr>'}</tbody>
      </table>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:14px;">
      <div>
        <div style="font-weight:700;font-size:12px;color:#012a4e;margin-bottom:6px;text-transform:uppercase;letter-spacing:0.6px;">Project Cost Summary</div>
        <div style="border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;background:#ffffff;box-shadow:0 1px 3px rgba(0,0,0,0.02);">
          <table style="width:100%;border-collapse:collapse;">
            ${sumRows}
            <tr style="background:#003768;color:#ffffff;">
              <td style="padding:9px 12px;font-weight:800;font-size:12px;letter-spacing:0.5px;">TOTAL CONTRACT VALUE</td>
              <td style="padding:9px 12px;font-weight:800;font-size:13px;text-align:right;">${money(s.total_contract_value)}</td>
            </tr>
          </table>
        </div>
      </div>

      <div>
        <div style="font-weight:700;font-size:12px;color:#012a4e;margin-bottom:6px;text-transform:uppercase;letter-spacing:0.6px;">Payment Schedule</div>
        <div style="border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;background:#ffffff;box-shadow:0 1px 3px rgba(0,0,0,0.02);">
          <table style="width:100%;border-collapse:collapse;">
            <thead>
              <tr style="background:#f8fafc;border-bottom:1px solid #e2e8f0;">
                ${['Payment Stage', 'Amount (BDT)', 'Due Date'].map((h) => `<th style="padding:8px 12px;font-size:11px;font-weight:700;color:#475569;text-transform:uppercase;letter-spacing:0.5px;text-align:${h.includes('Amount') ? 'right' : 'left'};">${h}</th>`).join('')}
              </tr>
            </thead>
            <tbody>${payRows}</tbody>
          </table>
        </div>
      </div>
    </div>
  </div>`;
}

function checkboxGroups(id, title, groups, selectedSet) {
  const scheduleCode = id === 'sched-a' ? 'SCHEDULE A' : 'SCHEDULE D';
  const body = Object.entries(groups).map(([g, items]) => `
    <div style="background:#ffffff;border:1px solid #e2e8f0;border-radius:12px;padding:12px 16px;margin-bottom:10px;box-shadow:0 1px 2px rgba(0,0,0,0.02);">
      <div style="margin:0 0 8px;font-weight:700;font-size:11.5px;color:#003768;text-transform:uppercase;letter-spacing:0.5px;display:flex;align-items:center;gap:6px;">
        <span style="width:5px;height:5px;border-radius:50%;background:#00AEEF;"></span>
        ${esc(g)}
      </div>
      <div style="display:flex;flex-wrap:wrap;gap:6px 14px;">
        ${items.map((it) => {
          const on = selectedSet.has(it);
          const box = on
            ? '<span style="display:inline-block;width:13px;height:13px;border:1.5px solid #003768;background:#003768;color:#fff;text-align:center;line-height:12px;font-size:11px;font-weight:700;vertical-align:middle;margin-right:6px;">&#10003;</span>'
            : '<span style="display:inline-block;width:13px;height:13px;border:1.5px solid #9aa4b2;background:#fff;vertical-align:middle;margin-right:6px;"></span>';
          return `<span style="font-size:11.5px;display:inline-flex;align-items:center;padding:3px 7px;border-radius:6px;${on ? 'background:#f0f9ff;font-weight:700;color:#0f172a;border:1px solid #bae6fd;' : 'color:#475569;background:#f8fafc;border:1px solid #f1f5f9;'}">${box}${esc(it)}</span>`;
        }).join('')}
      </div>
    </div>`).join('');

  return `
  <div style="margin:26px 0 16px;">
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;">
      <span style="background:#012a4e;color:#fff;font-size:10px;font-weight:800;padding:2px 7px;border-radius:4px;letter-spacing:0.8px;">${scheduleCode}</span>
      <h2 id="${id}" style="font-size:15px;color:#012a4e;font-weight:800;margin:0;">${esc(title)}</h2>
    </div>
    ${body}
  </div>`;
}

function buildStsAgreement(data = {}) {
  const org = {
    name: 'Seventh Sky Property Care',
    represented_by: data.org?.represented_by || 'Authorized Signatory',
    position: data.org?.position || 'PM Director',
    email: data.org?.email || 'pm@seventhskyproperty.com',
    phone: data.org?.phone || '+880 1700-000000',
    ...(data.org || {}),
  };
  const c = data.client || {};
  const b = { ...(data.schedule_b || {}) };
  if (!b.work_order_no) b.work_order_no = `SSPC-WO-${Date.now().toString().slice(-6)}`;
  if (!b.quotation_no) b.quotation_no = `SSPC-QT-${Date.now().toString().slice(-6)}`;
  function normalizeCollection(raw) {
    if (!raw) return new Set();
    if (raw instanceof Set) return raw;
    if (Array.isArray(raw)) return new Set(raw);
    if (typeof raw === 'string') {
      try {
        const p = JSON.parse(raw);
        if (Array.isArray(p)) return new Set(p);
        if (typeof p === 'object' && p !== null) return new Set(Object.keys(p).filter(k => p[k]));
      } catch (_) {
        return new Set();
      }
    }
    if (typeof raw === 'object' && raw !== null) {
      return new Set(Object.keys(raw).filter(k => raw[k]));
    }
    return new Set();
  }
  const servicesSet = normalizeCollection(data.services);
  const checklistSet = normalizeCollection(data.checklist);
  const pricing = data.pricing || { lines: [], summary: {}, payment_schedule: [], fee: {} };
  const doc_no = 'SSPC-STRMS-01';
  const title = 'Short-Term Rental Management Service Agreement';

  // ── 1. Dedicated Minimalist Cover Page (Page 1) ───────────────────────────
  const coverPage = `
  <div class="agreement-page agreement-cover-page" style="box-sizing:border-box;min-height:760px;max-height:920px;page-break-after:always;break-after:page;display:flex;flex-direction:column;justify-content:space-between;padding:32px 44px 24px;background:#ffffff;border-bottom:2px solid #e2e8f0;position:relative;">
    <div>
      <div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:1.5px solid #012a4e;padding-bottom:18px;">
        <div style="display:flex;align-items:center;gap:12px;">
          <div style="width:42px;height:42px;border-radius:10px;background:linear-gradient(135deg,#012a4e 0%,#003768 50%,#00AEEF 100%);display:flex;align-items:center;justify-content:center;color:#ffffff;font-weight:800;font-size:19px;letter-spacing:-0.5px;box-shadow:0 3px 10px rgba(1,42,78,0.18);">7S</div>
          <div>
            <div style="font-size:15px;font-weight:800;color:#012a4e;letter-spacing:0.8px;text-transform:uppercase;">Seventh Sky Property Care</div>
            <div style="font-size:10.5px;font-weight:600;color:#00AEEF;letter-spacing:1px;text-transform:uppercase;">Short-Term Stay &amp; Rental Management</div>
          </div>
        </div>
        <div style="text-align:right;">
          <span style="display:inline-block;padding:3px 10px;border-radius:9999px;background:#e0f2fe;color:#0369a1;font-size:10.5px;font-weight:700;border:1px solid #bae6fd;">SERVICE AGREEMENT</span>
          <div style="font-size:10.5px;color:#64748b;margin-top:3px;font-weight:500;">DOC REF: ${doc_no} · v0.2</div>
        </div>
      </div>

      <div style="margin-top:80px;text-align:left;">
        <div style="display:inline-flex;align-items:center;gap:8px;font-size:11.5px;font-weight:700;color:#00AEEF;text-transform:uppercase;letter-spacing:2px;margin-bottom:14px;">
          <span style="width:20px;height:2px;background:#00AEEF;display:inline-block;"></span>
          Hospitality Operations &amp; Property Care
        </div>
        <h1 style="font-size:34px;font-weight:800;color:#012a4e;line-height:1.2;margin:0 0 16px;letter-spacing:-0.6px;">
          Short-Term Rental<br/>Management Service<br/>Agreement
        </h1>
        <div style="width:70px;height:4px;background:linear-gradient(90deg,#012a4e,#00AEEF);border-radius:2px;margin-bottom:20px;"></div>
        <p style="font-size:13.5px;color:#475569;line-height:1.65;max-width:580px;margin:0;font-weight:400;">
          A comprehensive management covenants agreement governing property setup, marketing, guest relations, dynamic pricing, housekeeping, and revenue distribution between Seventh Sky Property Care and the Property Owner.
        </p>
      </div>
    </div>

    <div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-bottom:24px;">
        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:16px 18px;box-shadow:0 1px 3px rgba(0,0,0,0.02);">
          <div style="font-size:10px;font-weight:800;color:#00AEEF;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;">Property Owner / Client</div>
          <div style="font-size:15px;font-weight:800;color:#012a4e;margin-bottom:4px;">${or(c.full_name)}</div>
          <div style="font-size:12px;color:#64748b;line-height:1.6;">
            <div>NID / Passport: <strong>${or(c.nid)}</strong></div>
            <div>Contact: ${or(c.phone)} · ${or(c.email)}</div>
            <div>Address: ${or(c.current_address)}</div>
          </div>
        </div>

        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:16px 18px;box-shadow:0 1px 3px rgba(0,0,0,0.02);">
          <div style="font-size:10px;font-weight:800;color:#012a4e;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;">Managing Operator</div>
          <div style="font-size:15px;font-weight:800;color:#012a4e;margin-bottom:4px;">Seventh Sky Private Limited</div>
          <div style="font-size:12px;color:#64748b;line-height:1.6;">
            <div>Rep: <strong>${or(org.represented_by, 'Authorized Signatory')}</strong> (${or(org.position, 'STR Director')})</div>
            <div>Contact: ${or(org.phone)} · ${or(org.email)}</div>
            <div>Effective Date: <strong>${or(data.effective_date)}</strong></div>
          </div>
        </div>
      </div>

      <div style="border-top:1px solid #e2e8f0;padding-top:14px;display:flex;justify-content:space-between;align-items:center;font-size:11px;color:#94a3b8;">
        <div>Confidential Legal Document · Official Execution Draft</div>
        <div>Page 1 of Agreement Package</div>
      </div>
    </div>
  </div>`;

  // ── 2. Dedicated 1-Page Table of Contents (Page 2) ────────────────────────
  const tocPage = `
  <div class="agreement-page agreement-toc-page" style="box-sizing:border-box;min-height:760px;max-height:920px;page-break-after:always;break-after:page;padding:28px 44px 20px;background:#ffffff;border-bottom:2px solid #e2e8f0;display:flex;flex-direction:column;justify-content:space-between;">
    <div>
      <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #e2e8f0;padding-bottom:12px;margin-bottom:28px;">
        <span style="font-size:11px;font-weight:700;color:#00AEEF;text-transform:uppercase;letter-spacing:1px;">DOCUMENT ARCHITECTURE &amp; INDEX</span>
        <span style="font-size:11px;color:#94a3b8;">Ref: ${doc_no} · Section Index</span>
      </div>

      <div style="margin-bottom:24px;">
        <h2 style="font-size:22px;font-weight:800;color:#012a4e;margin:0 0 6px;letter-spacing:-0.4px;">Table of Contents</h2>
        <p style="font-size:12.5px;color:#64748b;margin:0;">A structured roadmap of commercial covenants, operational scopes, and execution schedules.</p>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;column-gap:32px;row-gap:8px;font-size:12px;line-height:1.75;">
        ${CLAUSES.map(([t], i) => `
          <div style="display:flex;justify-content:space-between;align-items:baseline;border-bottom:1px dotted #e2e8f0;padding:3px 0;">
            <a href="#cl-${i + 1}" style="color:#1e293b;text-decoration:none;font-weight:600;display:flex;gap:6px;">
              <span style="color:#00AEEF;font-weight:700;width:18px;">${String(i + 1).padStart(2, '0')}.</span>
              <span>${esc(t)}</span>
            </a>
            <span style="color:#94a3b8;font-size:11px;">p.${Math.floor(i / 8) + 3}</span>
          </div>
        `).join('')}
      </div>

      <div style="margin-top:20px;padding:14px 18px;border-radius:12px;background:#f8fafc;border:1px solid #e2e8f0;">
        <div style="font-size:11px;font-weight:800;color:#012a4e;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:8px;">Contractual Schedules</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:11.5px;">
          <div style="display:flex;justify-content:space-between;padding:2px 0;">
            <a href="#sched-a" style="color:#003768;text-decoration:none;font-weight:700;">Schedule A — Selected Services</a>
            <span style="color:#94a3b8;">Scope</span>
          </div>
          <div style="display:flex;justify-content:space-between;padding:2px 0;">
            <a href="#sched-b" style="color:#003768;text-decoration:none;font-weight:700;">Schedule B — STR Property Summary</a>
            <span style="color:#94a3b8;">Asset Spec</span>
          </div>
          <div style="display:flex;justify-content:space-between;padding:2px 0;">
            <a href="#sched-c" style="color:#003768;text-decoration:none;font-weight:700;">Schedule C — Price &amp; Fee Schedule</a>
            <span style="color:#94a3b8;">Commercials</span>
          </div>
          <div style="display:flex;justify-content:space-between;padding:2px 0;">
            <a href="#sched-d" style="color:#003768;text-decoration:none;font-weight:700;">Schedule D — Setup &amp; Readiness Checklist</a>
            <span style="color:#94a3b8;">Audit Log</span>
          </div>
        </div>
      </div>
    </div>

    <div style="border-top:1px solid #e2e8f0;padding-top:12px;display:flex;justify-content:space-between;font-size:11px;color:#94a3b8;">
      <div>Table of Contents · Seventh Sky Property Care Standard Agreement</div>
      <div>Page 2</div>
    </div>
  </div>`;

  // ── 3. Parties Section ──────────────────────────────────────────────────
  const parties = `
  <div style="margin-bottom:28px;">
    <div style="font-size:11px;font-weight:800;color:#00AEEF;letter-spacing:1px;text-transform:uppercase;margin-bottom:4px;">Parties to the Agreement</div>
    <div style="font-size:12.5px;color:#475569;margin-bottom:12px;">This Agreement is entered into on <strong>${or(data.effective_date)}</strong> by and between:</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
      <div style="border:1px solid #e2e8f0;border-radius:12px;padding:16px;background:#ffffff;box-shadow:0 1px 3px rgba(0,0,0,0.02);">
        <div style="font-size:10px;font-weight:800;color:#012a4e;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:6px;">Short-Term Rental Operator</div>
        <div style="font-size:14px;font-weight:800;color:#012a4e;margin-bottom:6px;">Seventh Sky Private Limited</div>
        <div style="font-size:11.5px;color:#64748b;line-height:1.6;">
          <div>Operating as: <strong>${org.name || 'Seventh Sky Property Care'}</strong></div>
          <div>Represented By: <strong>${or(org.represented_by, 'Authorized Signatory')}</strong></div>
          <div>Position: <strong>${or(org.position, 'STR Director')}</strong></div>
          <div>Contact: ${or(org.phone)} · ${or(org.email)}</div>
        </div>
      </div>
      <div style="border:1px solid #e2e8f0;border-radius:12px;padding:16px;background:#ffffff;box-shadow:0 1px 3px rgba(0,0,0,0.02);">
        <div style="font-size:10px;font-weight:800;color:#00AEEF;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:6px;">Property Owner / Client</div>
        <div style="font-size:14px;font-weight:800;color:#0f172a;margin-bottom:6px;">${or(c.full_name)}</div>
        <div style="font-size:11.5px;color:#64748b;line-height:1.6;">
          <div>NID / Passport: <strong>${or(c.nid)}</strong></div>
          <div>Current Address: <strong>${or(c.current_address)}</strong></div>
          <div>Contact: ${or(c.phone)} · ${or(c.email)}</div>
          ${c.rep ? `<div>Represented By: <strong>${esc(c.rep)}</strong> (${esc(c.rep_position || 'Representative')})</div>` : ''}
        </div>
      </div>
    </div>
  </div>`;

  // ── 4. Fixed Legal Clauses (Faithful to v0.2) ─────────────────────────────
  const clausesHtml = CLAUSES.map(([t, body], i) => `
    <div style="margin:20px 0;padding-bottom:14px;border-bottom:1px solid #f1f5f9;">
      <h2 id="cl-${i + 1}" style="font-size:13.5px;color:#012a4e;font-weight:800;margin:0 0 6px;letter-spacing:0.3px;display:flex;align-items:center;gap:6px;">
        <span style="color:#00AEEF;font-weight:800;">${String(i + 1).padStart(2, '0')}.</span>
        <span>${esc(t)}</span>
      </h2>
      <div style="font-size:12.5px;color:#334155;line-height:1.7;">${body}</div>
    </div>`).join('');

  // ── 5. Signatures (Execution Block) ───────────────────────────────────────
  const signSlot = (label) => `
    <div data-sign-anchor="${esc(label)}" style="margin-top:12px;">
      <div style="font-size:10.5px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">Signature</div>
      <div data-sign-field="signature" data-sign-party="${esc(label)}"
           style="min-height:50px;border-bottom:2px dashed #cbd5e1;background:#f8fafc;border-radius:6px;padding:4px 8px;display:flex;align-items:center;justify-content:center;">
        <span style="font-size:11px;color:#94a3b8;font-style:italic;">Awaiting e-signature</span>
      </div>
      <div style="display:flex;justify-content:space-between;align-items:center;margin-top:6px;">
        <span style="font-size:10.5px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;">Date Signed</span>
        <span data-sign-field="date_signed" data-sign-party="${esc(label)}"
              style="font-size:11.5px;font-weight:700;color:#012a4e;">__________</span>
      </div>
    </div>`;

  const signatures = `
  <div style="margin:32px 0 16px;">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
      <h2 style="font-size:16px;color:#012a4e;font-weight:800;margin:0;">Signatures</h2>
      <span style="font-size:11px;color:#64748b;">Legally Binding Execution Counterparts</span>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
      <div style="background:#ffffff;border:1.5px solid #cbd5e1;border-radius:12px;padding:16px;box-shadow:0 1px 3px rgba(0,0,0,0.03);">
        <div style="font-size:10.5px;font-weight:700;color:#012a4e;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:4px;">Short-Term Rental Operator</div>
        <div style="font-size:13.5px;font-weight:800;color:#012a4e;">${esc(org.name || 'Seventh Sky Private Limited')}</div>
        <div style="font-size:11.5px;color:#475569;margin-top:2px;">Name: <strong>${or(org.represented_by)}</strong></div>
        <div style="font-size:11.5px;color:#475569;">Position: <strong>${or(org.position)}</strong></div>
        ${org.email ? `<div style="font-size:11px;color:#64748b;">Email: ${esc(org.email)}</div>` : ''}
        ${signSlot('Seventh Sky')}
      </div>
      <div style="background:#ffffff;border:1.5px solid #cbd5e1;border-radius:12px;padding:16px;box-shadow:0 1px 3px rgba(0,0,0,0.03);">
        <div style="font-size:10.5px;font-weight:700;color:#00AEEF;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:4px;">Property Owner / Client</div>
        <div style="font-size:13.5px;font-weight:800;color:#012a4e;">Property Owner</div>
        <div style="font-size:11.5px;color:#475569;margin-top:2px;">Name: <strong>${or(c.full_name)}</strong></div>
        <div style="font-size:11.5px;color:#475569;">NID / Passport: <strong>${or(c.nid)}</strong></div>
        ${signSlot('Client')}
      </div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:14px;">
      ${(data.witnesses || [{}, {}]).slice(0, 2).map((w, i) => `
        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:14px;">
          <div style="font-size:10.5px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:4px;">Witness Attestation</div>
          <div style="font-size:13px;font-weight:800;color:#012a4e;">Witness ${i + 1}</div>
          <div style="font-size:11.5px;color:#475569;margin-top:2px;">Name: <strong>${or(w.name)}</strong></div>
          <div style="font-size:11.5px;color:#475569;">NID / Passport: <strong>${or(w.nid)}</strong></div>
          ${w.email ? `<div style="font-size:11.5px;color:#475569;">Email: ${esc(w.email)}</div>` : ''}
          ${signSlot(`Witness ${i + 1}`)}
        </div>
      `).join('')}
    </div>
  </div>`;

  const schedA = checkboxGroups('sched-a', 'SCHEDULE A — Selected Services', SERVICE_GROUPS, servicesSet);
  const schedB = `
  <div style="margin:26px 0 16px;">
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;">
      <span style="background:#012a4e;color:#fff;font-size:10px;font-weight:800;padding:2px 7px;border-radius:4px;letter-spacing:0.8px;">SCHEDULE B</span>
      <h2 id="sched-b" style="font-size:15px;color:#012a4e;font-weight:800;margin:0;">SCHEDULE B — STR Property Management Summary</h2>
    </div>
    ${kvTable([
      ['Work Order No.', b.work_order_no], ['Quotation No.', b.quotation_no], ['Property Owner', c.full_name],
      ['Property Address', b.property_address || c.current_address], ['Property Type', data.property_type],
      ['Maximum Guest Capacity', b.max_guests], ['Booking Platform(s)', b.booking_platforms], ['Management Package', b.management_package],
      ['Management Commencement Date', b.commencement_date], ['Reporting Frequency', b.reporting_frequency], ['Special Requirements', b.special_requirements],
    ])}
  </div>`;
  const schedC = scheduleC(pricing);
  const schedD = checkboxGroups('sched-d', 'SCHEDULE D — STR Property Setup & Management Checklist', CHECKLIST_GROUPS, checklistSet);

  const html = `
  <div class="sts-doc" style="font-family:'Plus Jakarta Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1e293b;line-height:1.65;font-size:13.5px;max-width:840px;margin:0 auto;background:#ffffff;">
    <style>
      @media print {
        body { background:#fff !important; padding:0 !important; }
        .sts-doc { max-width:100% !important; margin:0 !important; }
        .agreement-cover-page { min-height:auto !important; max-height:none !important; page-break-after:always !important; break-after:page !important; }
        .agreement-toc-page { min-height:auto !important; max-height:none !important; page-break-after:always !important; break-after:page !important; }
        .no-break { page-break-inside:avoid !important; break-inside:avoid !important; }
      }
      .sts-doc a:hover { color:#00AEEF !important; }
    </style>
    ${coverPage}
    ${tocPage}
    <div class="agreement-page agreement-body-page" style="padding:32px 48px 48px;">
      ${parties}
      ${clausesHtml}
      ${schedA}
      ${schedB}
      ${schedC}
      ${schedD}
      <div style="margin-top:22px;padding:12px 16px;border-radius:8px;background:#f8fafc;border:1px solid #e2e8f0;font-size:11px;color:#64748b;line-height:1.5;">
        This Agreement becomes effective when signed by both Parties through the Seventh Sky electronic signing system. The electronic record, audit trail and content hash constitute proof of execution.
      </div>
      ${signatures}
    </div>
  </div>`;

  const terms = {
    doc_no,
    services: data.services || [],
    selected_services: data.services || [],
    checklist: data.checklist || [],
    schedule_b: b,
    org,
    client: data.client || {},
    property_id: data.property_id || null,
    client_contact_id: data.client_contact_id || null,
    property_type: data.property_type || '',
    effective_date: data.effective_date || '',
    witnesses: data.witnesses || [],
    pricing_input: data.pricing_input || { selected: [] },
    pricing_summary: pricing.summary,
    payment_schedule: pricing.payment_schedule,
    fee: pricing.fee,
    agreed_lines: pricing.lines.map((l) => ({ code: l.code, name: l.name, agreed_price: l.agreed_price, agreed_percent: l.agreed_percent, recurring: l.recurring })),
  };
  return { title, doc_no, html, terms };
}

module.exports = { getStsCatalog, computePricing, buildStsAgreement, SERVICE_GROUPS, CHECKLIST_GROUPS };
