/**
 * rptmAgreement.service.js
 * ------------------------------------------------------------------
 * Residential Property Tenancy Management Service Agreement (SSPC-RPTMS-01 v0.2).
 * Always signed Seventh Sky (acting for the Property Owner) ↔ Tenant.
 * Redesigned with Figma-grade aesthetic:
 *   1. Dedicated Minimalist Cover Page (Page 1) with branding & tenant dossier
 *   2. Dedicated 1-Page Table of Contents (Page 2) with 2-column roadmap
 *   3. Modern card-based presentation for all 25 clauses & Schedules A–D
 *   4. Anchored signature slots for Client, Seventh Sky, and Witnesses
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

// ── Fixed legal clauses (100% exact text, faithful to v0.2, tenancy) ───
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

// ── HTML building blocks (Figma-grade presentation) ────────────────────
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
  const rows = pricing.lines.map((l) => `
    <tr style="border-bottom:1px solid #f1f5f9;">
      <td style="padding:9px 12px;font-size:11.5px;font-weight:700;color:#003768;">${esc(l.code)}</td>
      <td style="padding:9px 12px;font-size:12px;color:#1e293b;font-weight:600;">${esc(l.name)}</td>
      <td style="padding:9px 12px;font-size:11.5px;color:#64748b;">${esc(l.unit || '')}</td>
      <td style="padding:9px 12px;font-size:11.5px;text-align:right;color:#64748b;">${esc(l.std_label)}</td>
      <td style="padding:9px 12px;font-size:12px;text-align:right;font-weight:700;color:#0f172a;">${l.price_type === 'included' ? '<span style="display:inline-block;padding:2px 8px;border-radius:9999px;background:#e0f2fe;color:#0369a1;font-size:10.5px;font-weight:700;">Included</span>' : money(l.agreed_price)}</td>
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
  ].map(([k, v]) => `
    <tr style="border-bottom:1px solid #f1f5f9;">
      <td style="padding:7px 12px;font-size:12px;color:#475569;">${k}</td>
      <td style="padding:7px 12px;font-size:12px;text-align:right;font-weight:600;color:#0f172a;">${v}</td>
    </tr>`).join('');
  const payRows = pricing.payment_schedule.map((p) => `
    <tr style="border-bottom:1px solid #f1f5f9;">
      <td style="padding:8px 12px;font-size:12px;font-weight:600;color:#1e293b;">${esc(p.stage)}</td>
      <td style="padding:8px 12px;font-size:12px;text-align:right;font-weight:700;color:#0f172a;">${money(p.amount)}</td>
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

/**
 * data: org, client{full_name,nid,current_address,phone,email,occupation,emergency_contact},
 * property_type, services[], pricing, schedule_b{...tenancy}, payment_terms{frequency},
 * checklist[], witnesses[{name,nid,email}], effective_date
 */
function buildTenancyMgmtAgreement(data = {}) {
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
  if (!b.tenancy_ref_no) b.tenancy_ref_no = `SSPC-TN-${Date.now().toString().slice(-6)}`;
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
  const pricing = data.pricing || { lines: [], summary: {}, payment_schedule: [] };
  const doc_no = 'SSPC-RPTMS-01';
  const title = 'Residential Property Tenancy Management Service Agreement';

  // ── 1. Dedicated Minimalist Cover Page (Page 1) ───────────────────────────
  const coverPage = `
  <div class="agreement-page agreement-cover-page" style="box-sizing:border-box;min-height:1020px;page-break-after:always;break-after:page;display:flex;flex-direction:column;justify-content:space-between;padding:52px 48px 40px;background:#ffffff;border-bottom:2px solid #e2e8f0;position:relative;">
    <div>
      <div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:1.5px solid #012a4e;padding-bottom:18px;">
        <div style="display:flex;align-items:center;gap:12px;">
          <div style="width:42px;height:42px;border-radius:10px;background:linear-gradient(135deg,#012a4e 0%,#003768 50%,#00AEEF 100%);display:flex;align-items:center;justify-content:center;color:#ffffff;font-weight:800;font-size:19px;letter-spacing:-0.5px;box-shadow:0 3px 10px rgba(1,42,78,0.18);">7S</div>
          <div>
            <div style="font-size:15px;font-weight:800;color:#012a4e;letter-spacing:0.8px;text-transform:uppercase;">Seventh Sky Property Care</div>
            <div style="font-size:10.5px;font-weight:600;color:#00AEEF;letter-spacing:1px;text-transform:uppercase;">Residential Tenancy &amp; Occupancy Management</div>
          </div>
        </div>
        <div style="text-align:right;">
          <span style="display:inline-block;padding:3px 10px;border-radius:9999px;background:#e0f2fe;color:#0369a1;font-size:10.5px;font-weight:700;border:1px solid #bae6fd;">STANDARD TENANCY AGREEMENT</span>
          <div style="font-size:10.5px;color:#64748b;margin-top:3px;font-weight:500;">DOC REF: ${doc_no} · v0.2</div>
        </div>
      </div>

      <!-- Center Hero Title Block -->
      <div style="margin-top:80px;text-align:left;">
        <div style="display:inline-flex;align-items:center;gap:8px;font-size:11.5px;font-weight:700;color:#00AEEF;text-transform:uppercase;letter-spacing:2px;margin-bottom:14px;">
          <span style="width:20px;height:2px;background:#00AEEF;display:inline-block;"></span>
          Tenancy Governance &amp; Asset Care
        </div>
        <h1 style="font-size:34px;font-weight:800;color:#012a4e;line-height:1.2;margin:0 0 16px;letter-spacing:-0.6px;">
          Residential Property<br/>Tenancy Management<br/>Service Agreement
        </h1>
        <div style="width:70px;height:4px;background:linear-gradient(90deg,#012a4e,#00AEEF);border-radius:2px;margin-bottom:20px;"></div>
        <p style="font-size:13.5px;color:#475569;line-height:1.65;max-width:580px;margin:0;font-weight:400;">
          A comprehensive operational and legal framework establishing the terms of occupancy, property access, rent administration, maintenance coordination, routine inspections, and property care covenants between Seventh Sky Property Care (acting on behalf of the Property Owner) and the Tenant.
        </p>
      </div>
    </div>

    <!-- Bottom Dossier Grid -->
    <div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-bottom:24px;">
        <!-- Tenant Dossier -->
        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:16px 18px;box-shadow:0 1px 3px rgba(0,0,0,0.02);">
          <div style="font-size:10.5px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;color:#00AEEF;margin-bottom:8px;display:flex;align-items:center;gap:6px;">
            <span style="width:6px;height:6px;border-radius:50%;background:#00AEEF;"></span>
            Tenant (Client)
          </div>
          <div style="font-size:14px;font-weight:700;color:#0f172a;margin-bottom:4px;">${or(c.full_name)}</div>
          <div style="font-size:11.5px;color:#475569;line-height:1.5;">
            <div><strong>NID / Passport:</strong> ${or(c.nid)}</div>
            <div><strong>Contact:</strong> ${or(c.phone)} · ${or(c.email)}</div>
            <div><strong>Current Address:</strong> ${or(c.current_address)}</div>
            ${c.emergency_contact ? `<div><strong>Emergency Contact:</strong> ${esc(c.emergency_contact)}</div>` : ''}
          </div>
        </div>

        <!-- Management Agency Dossier -->
        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:16px 18px;box-shadow:0 1px 3px rgba(0,0,0,0.02);">
          <div style="font-size:10.5px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;color:#012a4e;margin-bottom:8px;display:flex;align-items:center;gap:6px;">
            <span style="width:6px;height:6px;border-radius:50%;background:#012a4e;"></span>
            Property Manager (Acting on behalf of Owner)
          </div>
          <div style="font-size:14px;font-weight:700;color:#0f172a;margin-bottom:4px;">${esc(org.name || 'Seventh Sky Private Limited')}</div>
          <div style="font-size:11.5px;color:#475569;line-height:1.5;">
            <div><strong>Represented By:</strong> ${or(org.represented_by, 'Authorized Signatory')}</div>
            <div><strong>Position:</strong> ${or(org.position, 'PM Director')}</div>
            <div><strong>Contact:</strong> ${or(org.phone)} · ${or(org.email)}</div>
            <div><strong>Jurisdiction:</strong> Dhaka, People's Republic of Bangladesh</div>
          </div>
        </div>
      </div>

      <!-- Bottom Status Strip -->
      <div style="border-top:1px solid #e2e8f0;padding-top:14px;display:flex;justify-content:space-between;align-items:center;font-size:11px;color:#64748b;">
        <div>Effective Date: <strong style="color:#0f172a;">${or(data.effective_date)}</strong> · Governing Law: <strong style="color:#0f172a;">Laws of Bangladesh</strong></div>
        <div style="display:flex;align-items:center;gap:6px;">
          <span style="display:inline-block;width:6px;height:6px;background:#10b981;border-radius:50%;"></span>
          <span>Electronic Signature &amp; SHA-256 Audit Trail Protected</span>
        </div>
      </div>
    </div>
  </div>`;

  // ── 2. Dedicated 1-Page Table of Contents (Page 2) ────────────────────────
  const tocRowsLeft = [
    { part: 'PART I — PRELIMINARY & PURPOSE', items: CLAUSES.slice(0, 4) },
    { part: 'PART II — RESPONSIBILITIES & OPERATIONS', items: CLAUSES.slice(4, 9) },
    { part: 'PART III — TENANCY MANAGEMENT & OPERATIONS', items: CLAUSES.slice(9, 14) },
  ];

  const tocRowsRight = [
    { part: 'PART IV — PERFORMANCE, LIABILITY & RISK', items: CLAUSES.slice(14, 20) },
    { part: 'PART V — TERMINATION, LAW & EXECUTION', items: CLAUSES.slice(20, 25) },
  ];

  const renderTocPart = (p, startIdx) => `
    <div style="margin-bottom:12px;">
      <div style="font-size:10px;font-weight:800;color:#00AEEF;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:4px;border-bottom:1px solid #e2e8f0;padding-bottom:2px;">
        ${p.part}
      </div>
      ${p.items.map(([t], subIdx) => {
        const clNum = startIdx + subIdx + 1;
        return `
        <div style="display:flex;justify-content:space-between;align-items:baseline;padding:2px 0;">
          <a href="#cl-${clNum}" style="color:#1e293b;text-decoration:none;font-size:11px;font-weight:500;display:inline-flex;align-items:center;gap:5px;">
            <span style="color:#00AEEF;font-weight:700;">${String(clNum).padStart(2, '0')}.</span>
            <span>${esc(t)}</span>
          </a>
          <span style="flex:1;border-bottom:1px dotted #cbd5e1;margin:0 6px;"></span>
          <span style="font-size:10px;color:#94a3b8;font-weight:600;">§${clNum}</span>
        </div>`;
      }).join('')}
    </div>`;

  const tocPage = `
  <div class="agreement-page agreement-toc-page" style="box-sizing:border-box;min-height:1020px;page-break-before:always;page-break-after:always;break-after:page;padding:48px 48px 36px;background:#ffffff;border-bottom:2px solid #e2e8f0;display:flex;flex-direction:column;justify-content:space-between;">
    <div>
      <div style="display:flex;justify-content:space-between;align-items:flex-end;border-bottom:2px solid #012a4e;padding-bottom:12px;margin-bottom:20px;">
        <div>
          <div style="font-size:10.5px;font-weight:700;color:#00AEEF;letter-spacing:1.2px;text-transform:uppercase;">Document Roadmap</div>
          <h2 style="font-size:22px;font-weight:800;color:#012a4e;margin:2px 0 0;">Table of Contents</h2>
        </div>
        <div>
          <span style="display:inline-block;padding:3px 10px;border-radius:9999px;background:#f1f5f9;color:#334155;font-size:10.5px;font-weight:700;border:1px solid #e2e8f0;">25 CLAUSES · 4 SCHEDULES</span>
        </div>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;column-gap:28px;align-items:start;">
        <!-- Left Column -->
        <div>
          ${renderTocPart(tocRowsLeft[0], 0)}
          ${renderTocPart(tocRowsLeft[1], 4)}
          ${renderTocPart(tocRowsLeft[2], 9)}
        </div>

        <!-- Right Column -->
        <div>
          ${renderTocPart(tocRowsRight[0], 14)}
          ${renderTocPart(tocRowsRight[1], 20)}

          <!-- Operational Schedules & Attestation Block in TOC -->
          <div style="margin-top:8px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:8px 12px;">
            <div style="font-size:10px;font-weight:800;color:#012a4e;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:4px;border-bottom:1px solid #e2e8f0;padding-bottom:2px;">
              Operational Schedules &amp; Signatures
            </div>
            <div style="display:flex;justify-content:space-between;align-items:baseline;padding:2px 0;">
              <a href="#sched-a" style="color:#1e293b;text-decoration:none;font-size:11px;font-weight:600;"><span style="color:#00AEEF;">A.</span> Schedule A — Selected Services</a>
              <span style="flex:1;border-bottom:1px dotted #cbd5e1;margin:0 6px;"></span>
              <span style="font-size:10px;color:#94a3b8;font-weight:600;">Scope</span>
            </div>
            <div style="display:flex;justify-content:space-between;align-items:baseline;padding:2px 0;">
              <a href="#sched-b" style="color:#1e293b;text-decoration:none;font-size:11px;font-weight:600;"><span style="color:#00AEEF;">B.</span> Schedule B — Property &amp; Tenancy Summary</a>
              <span style="flex:1;border-bottom:1px dotted #cbd5e1;margin:0 6px;"></span>
              <span style="font-size:10px;color:#94a3b8;font-weight:600;">Details</span>
            </div>
            <div style="display:flex;justify-content:space-between;align-items:baseline;padding:2px 0;">
              <a href="#sched-c" style="color:#1e293b;text-decoration:none;font-size:11px;font-weight:600;"><span style="color:#00AEEF;">C.</span> Schedule C — Price Schedule</a>
              <span style="flex:1;border-bottom:1px dotted #cbd5e1;margin:0 6px;"></span>
              <span style="font-size:10px;color:#94a3b8;font-weight:600;">Pricing</span>
            </div>
            <div style="display:flex;justify-content:space-between;align-items:baseline;padding:2px 0;">
              <a href="#sched-d" style="color:#1e293b;text-decoration:none;font-size:11px;font-weight:600;"><span style="color:#00AEEF;">D.</span> Schedule D — Tenant Info &amp; Move-in</a>
              <span style="flex:1;border-bottom:1px dotted #cbd5e1;margin:0 6px;"></span>
              <span style="font-size:10px;color:#94a3b8;font-weight:600;">Checklist</span>
            </div>
            <div style="display:flex;justify-content:space-between;align-items:baseline;padding:2px 0;margin-top:2px;">
              <a href="#signatures-section" style="color:#012a4e;text-decoration:none;font-size:11px;font-weight:700;"><span style="color:#10b981;">✓</span> Execution Block — Signatures</a>
              <span style="flex:1;border-bottom:1px dotted #cbd5e1;margin:0 6px;"></span>
              <span style="font-size:10px;color:#10b981;font-weight:700;">Attest</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- TOC Footer Bar -->
    <div style="border-top:1px solid #e2e8f0;padding-top:14px;display:flex;justify-content:space-between;align-items:center;font-size:11px;color:#64748b;">
      <div>Seventh Sky Property Care · Residential Tenancy Agreement SSPC-RPTMS-01 v0.2</div>
      <div style="font-weight:700;color:#012a4e;">Page 2 of Document Roadmap</div>
    </div>
  </div>`;

  // ── 3. Parties Section ──────────────────────────────────────────────────
  const parties = `
  <div style="margin-bottom:28px;">
    <div style="font-size:11px;font-weight:800;color:#00AEEF;letter-spacing:1px;text-transform:uppercase;margin-bottom:4px;">Parties to the Agreement</div>
    <div style="font-size:12.5px;color:#475569;margin-bottom:12px;">This Agreement is entered into on <strong>${or(data.effective_date)}</strong> by and between:</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
      <!-- Manager -->
      <div style="border:1px solid #e2e8f0;border-radius:12px;padding:16px;background:#ffffff;box-shadow:0 1px 3px rgba(0,0,0,0.02);">
        <div style="font-size:10px;font-weight:800;color:#012a4e;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:6px;">Management Agency</div>
        <div style="font-size:14px;font-weight:800;color:#012a4e;margin-bottom:6px;">Seventh Sky Private Limited</div>
        <div style="font-size:11.5px;color:#64748b;line-height:1.6;">
          <div>Acting on behalf of: <strong>The Property Owner / Landlord</strong></div>
          <div>Represented By: <strong>${or(org.represented_by, 'Authorized Signatory')}</strong></div>
          <div>Position: <strong>${or(org.position, 'PM Director')}</strong></div>
          <div>Contact: ${or(org.phone)} · ${or(org.email)}</div>
        </div>
      </div>
      <!-- Tenant -->
      <div style="border:1px solid #e2e8f0;border-radius:12px;padding:16px;background:#ffffff;box-shadow:0 1px 3px rgba(0,0,0,0.02);">
        <div style="font-size:10px;font-weight:800;color:#00AEEF;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:6px;">Tenant (Client)</div>
        <div style="font-size:14px;font-weight:800;color:#0f172a;margin-bottom:6px;">${or(c.full_name)}</div>
        <div style="font-size:11.5px;color:#64748b;line-height:1.6;">
          <div>NID / Passport: <strong>${or(c.nid)}</strong></div>
          <div>Current Address: <strong>${or(c.current_address)}</strong></div>
          <div>Contact: ${or(c.phone)} · ${or(c.email)}</div>
          ${c.occupation ? `<div>Occupation / Employer: ${esc(c.occupation)}</div>` : ''}
          ${c.emergency_contact ? `<div>Emergency Contact: ${esc(c.emergency_contact)}</div>` : ''}
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
      <div style="font-size:12.5px;color:#334155;line-height:1.65;text-align:justify;">${body}</div>
    </div>`).join('');

  // ── 5. Execution Section & Anchors ───────────────────────────────────────
  const signSlot = (label) => `
    <div data-sign-anchor="${esc(label)}" style="margin-top:12px;background:#f8fafc;border:1px dashed #cbd5e1;border-radius:8px;padding:10px 12px;">
      <div style="font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">Signature</div>
      <div data-sign-field="signature" data-sign-party="${esc(label)}"
           style="min-height:46px;display:flex;align-items:center;border-bottom:1.5px solid #012a4e;margin:2px 0 6px;padding:2px 0;"></div>
      <div style="display:flex;justify-content:space-between;align-items:center;margin-top:4px;">
        <div style="font-size:10px;color:#94a3b8;font-weight:600;">Date Signed:</div>
        <div data-sign-field="date_signed" data-sign-party="${esc(label)}"
             style="font-size:11px;font-weight:700;color:#0f172a;"></div>
      </div>
    </div>`;

  const signatures = `
  <div id="signatures-section" style="margin-top:32px;padding-top:20px;border-top:2px solid #012a4e;">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
      <h2 style="font-size:16px;color:#012a4e;font-weight:800;margin:0;">Signatures</h2>
      <span style="font-size:11px;color:#64748b;">Legally Binding Execution Counterparts</span>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
      <div style="background:#ffffff;border:1.5px solid #cbd5e1;border-radius:12px;padding:16px;box-shadow:0 1px 3px rgba(0,0,0,0.03);">
        <div style="font-size:10.5px;font-weight:700;color:#012a4e;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:4px;">Property Management Agency</div>
        <div style="font-size:13.5px;font-weight:800;color:#012a4e;">${esc(org.name || 'Seventh Sky Private Limited')}</div>
        <div style="font-size:11.5px;color:#475569;margin-top:2px;">Name: <strong>${or(org.represented_by)}</strong></div>
        <div style="font-size:11.5px;color:#475569;">Position: <strong>${or(org.position)}</strong></div>
        ${org.email ? `<div style="font-size:11px;color:#64748b;">Email: ${esc(org.email)}</div>` : ''}
        ${signSlot('Seventh Sky')}
      </div>
      <div style="background:#ffffff;border:1.5px solid #cbd5e1;border-radius:12px;padding:16px;box-shadow:0 1px 3px rgba(0,0,0,0.03);">
        <div style="font-size:10.5px;font-weight:700;color:#00AEEF;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:4px;">Tenant (Client)</div>
        <div style="font-size:13.5px;font-weight:800;color:#012a4e;">Client</div>
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
      <h2 id="sched-b" style="font-size:15px;color:#012a4e;font-weight:800;margin:0;">SCHEDULE B — Property &amp; Tenancy Summary</h2>
    </div>
    ${kvTable([
      ['Work Order No.', b.work_order_no], ['Tenancy Reference No.', b.tenancy_ref_no], ['Property Address', c.current_address || b.property_address],
      ['Property Type', data.property_type], ['Tenant Name', c.full_name], ['Lease Commencement Date', b.commencement_date], ['Lease Expiry Date', b.expiry_date],
      ['Monthly Rent', b.monthly_rent != null ? money(b.monthly_rent) : null], ['Security Deposit', b.security_deposit != null ? money(b.security_deposit) : null],
      ['Rent Due Date', b.rent_due_date], ['Approved Occupants', b.approved_occupants], ['Selected Services', (data.services || []).join(', ')], ['Special Conditions', b.special_conditions],
    ])}
  </div>`;
  const schedC = scheduleC(pricing);
  const schedD = checkboxGroups('sched-d', 'SCHEDULE D — Tenant Information & Move-in Checklist', CHECKLIST_GROUPS, checklistSet);

  const html = `
  <div class="rptm-doc" style="font-family:'Plus Jakarta Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1e293b;line-height:1.65;font-size:13.5px;max-width:840px;margin:0 auto;background:#ffffff;">
    <style>
      @media print {
        body { background:#fff !important; padding:0 !important; }
        .rptm-doc { max-width:100% !important; margin:0 !important; }
        .agreement-cover-page { min-height:100vh !important; page-break-after:always !important; break-after:page !important; }
        .agreement-toc-page { min-height:100vh !important; page-break-before:always !important; page-break-after:always !important; break-after:page !important; }
        .no-break { page-break-inside:avoid !important; break-inside:avoid !important; }
      }
      .rptm-doc a:hover { color:#00AEEF !important; }
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
    payment_terms: data.payment_terms || { frequency: data.payment_terms?.frequency || 'Monthly' },
    frequency: data.payment_terms?.frequency || 'Monthly',
    pricing_input: data.pricing_input || { selected: [], monthly_rent: b.monthly_rent },
    pricing_summary: pricing.summary,
    payment_schedule: pricing.payment_schedule,
    agreed_lines: pricing.lines.map((l) => ({ code: l.code, name: l.name, agreed_price: l.agreed_price, recurring: l.recurring })),
  };
  return { title, doc_no, html, terms };
}

module.exports = { getRptmCatalog, computePricing, buildTenancyMgmtAgreement, SERVICE_GROUPS, CHECKLIST_GROUPS };
