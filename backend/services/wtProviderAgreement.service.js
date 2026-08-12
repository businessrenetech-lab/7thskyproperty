/**
 * wtProviderAgreement.service.js
 * ------------------------------------------------------------------
 * Water Tank Cleaning & Maintenance — Service Delivery Provider Master Agreement
 * (SSPC-WTCM-SDPMA-01 v0.2). Always signed Seventh Sky ↔ Service Provider.
 * Renders the full agreement (visible TOC + 25 clauses + Schedules A–D). Schedule B
 * is the Standard Service Price Schedule (Standard vs Agreed); Schedule C is the
 * Insurance & Licence checklist; Schedule D the Work Order summary. Mirrors PM/TM.
 */
const ServiceItem = require('../models/ServiceItem');
const AgreementTemplate = require('../models/AgreementTemplate');
const { merge } = require('./docTemplate.service');

const money = (v) => '৳' + Number(v || 0).toLocaleString('en-US', { maximumFractionDigits: 0 });
const or = (v, f = '__________') => (v == null || v === '' ? f : v);
const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// ── Schedule A: authorised services (checkbox scope) ────────────────────
const SERVICE_GROUPS = {
  'Water Tank Cleaning': ['Residential Water Tank Cleaning', 'Commercial Water Tank Cleaning', 'Industrial Water Tank Cleaning', 'Underground Water Tank Cleaning', 'Overhead Water Tank Cleaning'],
  'Disinfection & Inspection': ['Water Tank Disinfection', 'Tank Sanitisation', 'Water Tank Inspection', 'Structural Assessment', 'Leakage Inspection'],
  'Repairs & Maintenance': ['Water Tank Repairs', 'Waterproofing', 'Preventive Maintenance', 'Scheduled Maintenance'],
  'Water Supply & Quality': ['Water Pump Inspection', 'Water Pump Maintenance', 'Water Pipeline Inspection', 'Leak Detection', 'Pressure Testing', 'Water Quality Testing', 'Water Treatment Support'],
  'Contracts & Emergency': ['Residential Annual Maintenance Contract', 'Commercial Annual Maintenance Contract', 'Industrial Annual Maintenance Contract', 'Emergency Services'],
};

// ── Schedule C: insurance & licence checklist groups ────────────────────
const CHECKLIST_GROUPS = {
  'Business Documents': ['Trade Licence', 'Company Registration', 'TIN', 'BIN (if applicable)'],
  'Insurance': ['Public Liability', 'Workers’ Compensation (where applicable)', 'Employer Liability (where applicable)', 'Motor Vehicle Insurance (if applicable)', 'Professional Indemnity (if applicable)'],
  'Technical Licences / Certifications': ['Trade Licence for Water Tank Services', 'Water Quality Testing Accreditation (where applicable)', 'Public Health / Environmental Compliance Certification (where applicable)'],
};

const WORK_ORDER_SUMMARY = ['Work Order Number', 'Client Name', 'Property Address', 'Service Category', 'Scope of Work', 'Materials', 'Equipment', 'Timeline', 'Project Value', 'Payment Schedule', 'Warranty Period', 'Special Conditions', 'Variation Approval', 'Completion Date', 'Client Acceptance', 'Seventh Sky Approval', 'Service Provider Acceptance'];

// ── 25 clauses (faithful to SSPC-WTCM-SDPMA-01 v0.2) ───────────────────
const CLAUSES = [
  ['PURPOSE', `<p>The purpose of this Agreement is to establish the terms under which the Service Provider may deliver Water Tank Cleaning & Maintenance Solutions to clients referred by Seventh Sky. This Agreement sets out the Parties' respective responsibilities, commercial arrangements, service standards and legal obligations. Individual client engagements will be governed by separate Work Orders issued under this Agreement.</p>`],
  ['APPOINTMENT', `<p>Seventh Sky appoints the Service Provider as a non-exclusive independent service delivery partner. Nothing in this Agreement guarantees any minimum volume of work; prevents either Party from engaging with other businesses; or creates an employment, partnership, joint venture or agency relationship.</p>`],
  ['TERM', `<p>This Agreement commences on the Effective Date and continues for twelve (12) months, unless terminated earlier in accordance with this Agreement. Unless either Party provides at least 30 days' written notice, this Agreement will automatically renew for successive twelve-month periods.</p>`],
  ['SERVICES', `<p>The Service Provider may be engaged to provide one or more of the services listed in <b>Schedule A</b> as specified in a Work Order. Only services selected in the applicable Work Order form part of the Service Provider's engagement. Additional services may be added by written agreement without replacing this Master Agreement.</p>`],
  ['WORK ORDERS', `<p>Each client project shall be managed under a separate Work Order issued by Seventh Sky. A Work Order may include client details, property address, selected services, scope of work, project timeline, agreed pricing, payment schedule, warranty period, special requirements and any approved variations. If a Work Order conflicts with this Agreement, the Work Order will prevail only for that specific project.</p>`],
  ['RESPONSIBILITIES OF THE PARTIES', `<p><b>Seventh Sky</b> is responsible for client acquisition and marketing, quotations and service coordination, client communication, project administration, work order management, payment coordination, quality monitoring and overall client relationship management. <b>The Service Provider</b> is responsible for performing the contracted services, supplying competent personnel, complying with all applicable laws and industry standards, providing required tools and equipment unless otherwise agreed, maintaining licences and insurance, ensuring work quality and safety, rectifying defective workmanship, and completing work within agreed timeframes. The Service Provider remains solely responsible for the quality and compliance of all technical work performed.</p>`],
  ['LICENSING, COMPLIANCE & INSURANCE', `<p>The Service Provider must, throughout the Agreement, hold and maintain all licences, permits, registrations and approvals required to perform the Services; comply with all applicable laws, regulations, codes and industry standards in Bangladesh; maintain appropriate insurance applicable to its business and services; and immediately notify Seventh Sky of any suspension, cancellation, investigation or material breach affecting its ability to perform. Evidence of licences or insurance must be provided upon request.</p>`],
  ['SERVICE DELIVERY STANDARDS', `<p>The Service Provider shall perform all Services professionally, safely and competently; using suitably qualified personnel; in accordance with applicable industry standards; within the agreed timeframe; with reasonable care and skill; and in compliance with the relevant Work Order. The Service Provider shall protect the Client's property, maintain a clean and safe worksite, promptly report delays, safety incidents or unexpected site conditions, and complete all agreed inspections, testing and commissioning before project completion.</p>`],
  ['PERSONNEL & SUBCONTRACTING', `<p>The Service Provider is responsible for the conduct, competency and supervision of all employees, subcontractors and representatives engaged to perform the Services. No subcontracting of a Work Order is permitted without prior written approval from Seventh Sky. Approval to subcontract does not release the Service Provider from its obligations under this Agreement.</p>`],
  ['SAFETY, QUALITY & WARRANTIES', `<p>The Service Provider shall maintain appropriate quality control and workplace safety procedures throughout the project, including complying with workplace health and safety requirements; using suitable tools, equipment and materials; ensuring workmanship meets accepted industry standards; correcting defective workmanship at its own cost; and providing any applicable manufacturer and workmanship warranties. Warranty periods applicable to a project shall be specified in the relevant Work Order.</p>`],
  ['DOCUMENTATION & RECORDS', `<p>The Service Provider shall provide all documents reasonably required for the Services, including where applicable site assessments, quotations, inspection reports, cleaning and maintenance reports, water quality test reports, testing and commissioning records, warranty documents, completion certificates, photographs, and any documents required by law or requested by Seventh Sky. Business records must be retained for at least seven (7) years, or longer where required by law.</p>`],
  ['SERVICE FEES & PAYMENT', `<p>Each Work Order will specify the agreed commercial arrangements, including services to be provided, agreed pricing, labour charges, material costs, payment milestones, approved variations, taxes and government charges (where applicable) and payment terms. Unless otherwise agreed, the Service Provider will only be paid for Services approved under a Work Order; additional work requires prior approval; invoices must accurately reflect completed work; and payments are subject to the agreed Work Order and supporting documentation. The Service Provider is responsible for its own taxation, employee payments and statutory obligations.</p>`],
  ['STANDARD SERVICE PRICE SCHEDULE', `<p>The Parties acknowledge that Seventh Sky maintains a Standard Service Price Schedule within its CRM (set out in <b>Schedule B</b>). The Price Schedule serves as the standard pricing guide for quotations, agreements and Work Orders and may be updated by Seventh Sky from time to time. Unless otherwise agreed, the applicable pricing for each project shall be confirmed in the relevant Work Order; discounts, negotiated or promotional pricing may apply; and the final approved Work Order price shall prevail over the Standard Service Price Schedule.</p>`],
  ['LIABILITY & INDEMNITY', `<p>Each Party is responsible for its own acts, omissions, negligence and breaches. The Service Provider shall be responsible for any loss, damage, injury, claim or expense arising from defective workmanship, negligent acts or omissions, failure to comply with applicable laws, unsafe work practices, or breach of this Agreement. The Service Provider agrees to indemnify and hold harmless Seventh Sky against claims, losses, damages, costs and liabilities arising from the Service Provider's negligence, misconduct or breach, except to the extent caused by Seventh Sky.</p>`],
  ['CLIENT CLAIMS, WARRANTIES & DEFECTS', `<p>The Service Provider shall promptly investigate and respond to any client complaint relating to Services performed. Where a defect is caused by the Service Provider's workmanship, materials or negligence, the Service Provider shall rectify the defect at its own cost within a reasonable timeframe. Where water quality testing forms part of the Services, testing shall be performed in accordance with applicable industry standards; laboratory analysis or certification remains the responsibility of the authorised testing laboratory. The Service Provider shall reasonably assist Seventh Sky in resolving warranty claims and client complaints.</p>`],
  ['CONFIDENTIALITY & DATA PROTECTION', `<p>Each Party shall keep confidential all non-public business, commercial and client information obtained during this Agreement. Confidential information shall only be used for the purposes of performing this Agreement and shall not be disclosed to any third party unless required by law, authorised in writing, or reasonably required to perform the Services. The Service Provider shall take reasonable measures to protect all client information from unauthorised access, use or disclosure. These obligations continue after termination.</p>`],
  ['INTELLECTUAL PROPERTY', `<p>All business systems, templates, forms, procedures, branding, marketing materials, CRM data, documents and intellectual property owned or developed by Seventh Sky remain the exclusive property of Seventh Sky. The Service Provider shall not copy, modify, distribute or use Seventh Sky's intellectual property except for the purpose of performing authorised Services.</p>`],
  ['CLIENT PROTECTION & NON-CIRCUMVENTION', `<p>Clients introduced or assigned by Seventh Sky remain clients of Seventh Sky. During this Agreement and for twenty-four (24) months after its termination, the Service Provider shall not, without Seventh Sky's prior written consent, directly solicit or contract with a client introduced by Seventh Sky; divert business opportunities intended for Seventh Sky; bypass Seventh Sky to avoid agreed fees or commissions; or use another person or entity to achieve the same outcome. Nothing prevents the Service Provider from working with clients who had an established business relationship with the Service Provider before introduction by Seventh Sky, provided that relationship can be reasonably demonstrated.</p>`],
  ['EXCLUSIVE SERVICE AREA (IF APPLICABLE)', `<p>Where the Parties agree to an exclusive operating area, the Service Provider shall not independently market or provide competing services within that area without Seventh Sky's written approval. If no exclusive area is specified in a Work Order or Schedule, this clause does not apply. Any agreed exclusive area (e.g. Cumilla District) is recorded in the Work Order or Schedule.</p>`],
  ['FORCE MAJEURE', `<p>Neither Party shall be liable for delays or failure to perform caused by events beyond its reasonable control, including natural disasters, war, civil unrest, government restrictions, pandemics, major utility failures or other unforeseen events. The affected Party shall notify the other as soon as reasonably practicable and resume performance when the event ends.</p>`],
  ['DISPUTE RESOLUTION', `<p>The Parties shall attempt to resolve any dispute in the following order: good faith discussions between authorised representatives; senior management negotiations; mediation, where agreed; then the courts of Bangladesh or any other dispute resolution process agreed by the Parties. The Parties shall continue performing their obligations, where reasonably possible, while a dispute is being resolved.</p>`],
  ['SUSPENSION & TERMINATION', `<p><b>Suspension.</b> Seventh Sky may suspend a Work Order or this Agreement immediately where the Service Provider fails to maintain required licences or insurance, commits a material breach, performs unsafe or defective work, breaches applicable laws, fails to meet agreed service standards, or where suspension is reasonably necessary to protect the Client, Seventh Sky or the public. <b>Termination.</b> Either Party may terminate by giving thirty (30) days' written notice. Either Party may terminate immediately if the other commits an unremedied material breach, becomes insolvent, engages in fraud or serious misconduct, or no longer holds required licences. Termination does not affect rights or obligations arising before the termination date.</p>`],
  ['GENERAL PROVISIONS', `<p>Unless otherwise agreed in writing, this Agreement constitutes the entire agreement between the Parties; amendments must be made in writing and signed by both Parties; failure to enforce a provision does not waive any legal rights; if any provision is found invalid or unenforceable, the remaining provisions continue in full force; and notices must be provided in writing by hand, courier, post or electronic mail.</p>`],
  ['GOVERNING LAW', `<p>This Agreement shall be governed by the laws of the People's Republic of Bangladesh. The Parties submit to the jurisdiction of the competent courts of Bangladesh unless they mutually agree to resolve a dispute by arbitration or another recognised alternative dispute resolution process.</p>`],
  ['EXECUTION', `<p>The Parties acknowledge that they have read and understood this Agreement, have had the opportunity to obtain independent legal advice, enter into this Agreement voluntarily, and agree to be legally bound by its terms. This Agreement may be executed in counterparts and by electronic signature. Each signed copy will be deemed an original and together constitute one Agreement.</p>`],
];

async function getCatalog(branchId) {
  const where = { vertical: 'water_tank_csa', is_active: true };
  if (branchId) where.branch_id = branchId;
  const rows = await ServiceItem.findAll({ where, order: [['sort_order', 'ASC']] });
  return rows.map((r) => {
    const p = r.get({ plain: true });
    let tags = p.tags; if (typeof tags === 'string') { try { tags = JSON.parse(tags); } catch { tags = {}; } }
    return { id: p.id, code: p.code, name: p.name, unit: p.unit, standard_price: Number(p.base_price || 0), group: (tags || {}).group || 'service' };
  });
}

/** Provider Schedule B pricing: selected lines with standard vs agreed (no client cost summary). */
async function computePricing(input = {}, branchId) {
  const catalog = await getCatalog(branchId);
  const byCode = Object.fromEntries(catalog.map((c) => [c.code, c]));
  const selected = (input.selected || []).map((s) => {
    const line = byCode[s.code]; if (!line) return null;
    const agreed = (s.agreed_price != null && s.agreed_price !== '') ? Number(s.agreed_price) : line.standard_price;
    return { ...line, agreed_price: agreed };
  }).filter(Boolean);
  return { lines: selected, summary: {}, payment_schedule: [] };
}

const kvTable = (rows) => `<table style="width:100%;border-collapse:collapse;margin:8px 0;">${rows.map(([k, v]) => `<tr><td style="padding:6px 10px;border:1px solid #d9dee6;background:#f6f8fb;width:38%;font-weight:600;font-size:12.5px;">${esc(k)}</td><td style="padding:6px 10px;border:1px solid #d9dee6;font-size:12.5px;">${v == null ? '__________' : esc(v)}</td></tr>`).join('')}</table>`;

function scheduleB(pricing, withHeading = true) {
  // Only the services selected/authorised for this provider appear (not the full catalog).
  const lines = pricing.lines || [];
  const groupRows = (g) => lines.filter((l) => l.group === g).map((l) => `<tr>
    <td style="padding:6px 8px;border:1px solid #d9dee6;font-size:12px;">${esc(l.code)}</td>
    <td style="padding:6px 8px;border:1px solid #d9dee6;font-size:12px;">${esc(l.name)}</td>
    <td style="padding:6px 8px;border:1px solid #d9dee6;font-size:12px;">${esc(l.unit || '')}</td>
    <td style="padding:6px 8px;border:1px solid #d9dee6;font-size:12px;text-align:right;color:#6b7280;">${money(l.standard_price)}</td>
    <td style="padding:6px 8px;border:1px solid #d9dee6;font-size:12px;text-align:right;font-weight:700;">${l.agreed_price != null ? money(l.agreed_price) : ''}</td>
  </tr>`).join('');
  const section = (title, g) => { const rows = groupRows(g); if (!rows) return ''; return `<div style="font-weight:700;font-size:12.5px;color:#003768;margin:12px 0 4px;">${title}</div><table style="width:100%;border-collapse:collapse;margin:4px 0;"><thead><tr>${['Code', 'Service', 'Unit', 'Standard Price (BDT)', 'Agreed Price (BDT)'].map((h) => `<th style="padding:7px 8px;border:1px solid #d9dee6;background:#eef3f8;font-size:11px;text-align:${h.includes('Price') ? 'right' : 'left'};">${h}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table>`; };
  const body = [section('Water Tank Cleaning & Maintenance Services', 'service'), section('Materials & Consumables', 'material'), section('Labour Rates (Where Applicable)', 'labour')].join('');
  const table = body || '<div style="color:#9aa4b2;font-size:12.5px;">No services selected yet.</div>';
  // The template already prints its own "Schedule F" heading above the placeholder,
  // so the injected block must not repeat it under a different letter.
  if (!withHeading) return table;
  return `<h2 id="sched-f" style="font-size:15px;color:#003768;margin:22px 0 6px;">SCHEDULE F — Agreed Provider Rate Schedule</h2>
  ${table}`;
}

function scheduleChecks(id, title, groups, selectedSet) {
  const body = Object.entries(groups).map(([g, items]) => `
    <div style="margin:10px 0 4px;font-weight:700;font-size:12.5px;color:#334155;">${esc(g)}</div>
    <div style="display:flex;flex-wrap:wrap;gap:6px 18px;">${items.map((it) => `<span style="font-size:12.5px;">${selectedSet.has(it) ? '☑' : '☐'} ${esc(it)}</span>`).join('')}</div>`).join('');
  return `<h2 id="${id}" style="font-size:15px;color:#003768;margin:22px 0 6px;">${esc(title)}</h2>${body}`;
}

/**
 * The master agreement body comes from the seeded Word template, so it arrives as
 * bare <h1>/<h3>/<p>/<ul> markup with no typography of its own. Dress it in the same
 * deed styling every other Seventh Sky agreement uses (RPRM, tenancy, customer
 * service): anchored clause headings, a two-column table of contents, and the
 * Georgia serif shell with the double-ruled letterhead.
 */
const PAGE_BREAK = '<div style="page-break-after:always;break-after:page;"></div>';

/* A labelled fact table for the parties page. */
const partyTable = (rows) => `<table style="width:100%;border-collapse:collapse;margin:8px 0 16px;">${
  rows.filter(([, v]) => v != null).map(([k, v]) => `<tr>
    <td style="padding:6px 10px;border:1px solid #d9dee6;background:#f6f8fb;width:38%;font-weight:600;font-size:12.5px;">${esc(k)}</td>
    <td style="padding:6px 10px;border:1px solid #d9dee6;font-size:12.5px;">${v === '' ? '__________' : esc(v)}</td>
  </tr>`).join('')}</table>`;

/**
 * The document shell.
 *   page 1 — cover: branding, the contract name naming both parties, contract date
 *   page 2 — table of contents
 *   page 3 — full contact and business details of both parties
 *   then    — the agreement body, and the execution block
 */
function decorate(body, { title, docNo, version, effectiveDate, provider = {}, org = {}, contractDate, signatures = '' }) {
  let html = String(body || '');

  // the letterhead replaces the template's own centred title
  html = html.replace(/<h1\b[^>]*>[\s\S]*?<\/h1>/i, '');

  // anchor every clause and schedule heading, then index them
  const toc = [];
  html = html.replace(/<h3\b([^>]*)>([\s\S]*?)<\/h3>/gi, (match, attrs, inner) => {
    const label = inner.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
    if (!label) return match;
    const id = `cl-${toc.length + 1}`;
    toc.push({ id, label });
    const keep = String(attrs).replace(/\sstyle="[^"]*"/i, '').replace(/\sid="[^"]*"/i, '');
    return `<h3${keep} id="${id}" style="font-size:15px;color:#003768;margin:22px 0 6px;page-break-after:avoid;">${inner}</h3>`;
  });

  // body typography — only where the template did not set its own
  html = html.replace(/<p(?![^>]*\sstyle=)([^>]*)>/gi, '<p$1 style="margin:8px 0;">');
  html = html.replace(/<ul(?![^>]*\sstyle=)([^>]*)>/gi, '<ul$1 style="margin:8px 0 8px 4px;padding-left:20px;">');
  html = html.replace(/<li(?![^>]*\sstyle=)([^>]*)>/gi, '<li$1 style="margin:3px 0;">');

  const providerName = provider.business_name || 'Service Provider';

  // ── page 1: cover ──
  const cover = `
  <div style="min-height:860px;display:flex;flex-direction:column;justify-content:center;text-align:center;padding:40px 0;">
    <div style="font-size:30px;font-weight:bold;color:#003768;letter-spacing:.01em;">Seventh Sky Property Care</div>
    <div style="font-size:14px;color:#12b6f3;font-weight:bold;letter-spacing:.12em;margin-top:6px;">WATER TANK CLEANING &amp; MAINTENANCE</div>
    <div style="width:120px;height:3px;background:#003768;margin:26px auto;"></div>
    <div style="font-size:13px;color:#6b7280;letter-spacing:.16em;text-transform:uppercase;">Contract Name</div>
    <div style="font-size:23px;font-weight:bold;color:#1f2430;margin:10px auto 0;max-width:640px;line-height:1.4;">
      Service Provider Agreement<br/>
      <span style="font-size:16px;font-weight:normal;color:#6b7280;">between</span><br/>
      Seventh Sky Properties<br/>
      <span style="font-size:16px;font-weight:normal;color:#6b7280;">and</span><br/>
      ${esc(providerName)}
    </div>
    <div style="margin-top:40px;font-size:13px;color:#1f2430;">
      <div><b>Contract Date:</b> ${esc(contractDate || 'On execution by both Parties')}</div>
      <div style="margin-top:6px;color:#6b7280;font-size:12px;">
        ${contractDate ? 'Date this Agreement was signed.' : 'This Agreement is dated on the day the last Party signs it.'}
      </div>
    </div>
    <div style="margin-top:44px;font-size:11.5px;color:#6b7280;">
      Document No: ${esc(docNo)} · Version: ${esc(version)}${effectiveDate ? ` · Effective Date: ${esc(effectiveDate)}` : ''}
    </div>
  </div>
  ${PAGE_BREAK}`;

  // ── page 2: table of contents ──
  const tocHtml = `
  <h2 style="font-size:17px;color:#003768;margin:0 0 12px;">Table of Contents</h2>
  ${toc.length ? `<div style="columns:2;column-gap:32px;font-size:12.5px;line-height:2;">
      ${toc.map((t, i) => `<div style="break-inside:avoid;"><a href="#${t.id}" style="color:#1e3a8a;text-decoration:none;">${i + 1}. ${t.label}</a></div>`).join('')}
    </div>` : '<div style="color:#9aa4b2;font-size:12.5px;">No numbered clauses found in this template.</div>'}
  ${PAGE_BREAK}`;

  // ── page 3: the parties in full ──
  const partiesHtml = `
  <h2 style="font-size:17px;color:#003768;margin:0 0 4px;">The Parties</h2>
  <p style="margin:0 0 14px;font-size:12.5px;color:#6b7280;">
    This Agreement is made between the following Parties, whose details are recorded below.
  </p>
  <h3 style="font-size:14px;color:#003768;margin:14px 0 4px;">1. Seventh Sky Properties (&ldquo;Seventh Sky&rdquo;)</h3>
  ${partyTable([
    ['Legal Name', org.name || 'Seventh Sky Property Care'],
    ['Division', 'Water Tank Cleaning & Maintenance Services'],
    ['Registered Address', org.address || ''],
    ['Phone', org.phone || ''],
    ['Email', org.email || ''],
    ['Represented By', org.represented_by || ''],
    ['Position', org.position || ''],
  ])}
  <h3 style="font-size:14px;color:#003768;margin:18px 0 4px;">2. ${esc(providerName)} (&ldquo;Service Provider&rdquo;)</h3>
  ${partyTable([
    ['Business Name', provider.business_name || ''],
    ['Legal / Trading Name', provider.legal_name || provider.business_name || ''],
    ['Business Type', provider.business_type || ''],
    ['Registered Address', provider.address || provider.registered_address || ''],
    ['District', provider.district || ''],
    ['Trade Licence No.', provider.trade_licence_no || provider.trade_licence || ''],
    ['Company Registration No.', provider.registration_no || provider.company_registration_no || ''],
    ['TIN', provider.tin || ''],
    ['BIN', provider.bin || ''],
    ['Contact Person', provider.contact_person || ''],
    ['Represented By', provider.represented_by || provider.contact_person || ''],
    ['Position', provider.position || ''],
    ['Phone', provider.phone || provider.contact_phone || ''],
    ['Email', provider.email || provider.contact_email || ''],
    ['Years of Experience', provider.years_experience || ''],
    ['Coverage', provider.coverage || ''],
  ])}
  ${PAGE_BREAK}`;

  return `
  <div style="font-family: Georgia,'Times New Roman',serif;color:#1f2430;line-height:1.6;font-size:14px;max-width:820px;margin:0 auto;">
    ${cover}
    ${tocHtml}
    ${partiesHtml}
    <div style="text-align:center;border-bottom:3px double #003768;padding-bottom:10px;margin-bottom:8px;">
      <div style="font-size:16px;font-weight:bold;color:#003768;">Seventh Sky Property Care</div>
      <div style="font-size:14px;font-weight:bold;margin-top:6px;text-transform:uppercase;">${esc(title)}</div>
    </div>
    ${html}
    ${signatures}
    <div style="margin-top:22px;padding-top:10px;border-top:1px solid #d1d5db;font-size:11px;color:#6b7280;">This Agreement becomes effective when signed by both Parties through the Seventh Sky electronic signing system. The electronic record, audit trail and content hash constitute proof of execution.</div>
  </div>`;
}

const checkboxHtml = (options = [], selected = []) => {
  const chosen = new Set((selected || []).map((v) => String(v).toLowerCase()));
  return `<div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:5px 16px;margin:6px 0 12px;">${options.map((item) => {
    const key = String(item).toLowerCase();
    const on = chosen.has(key) || [...chosen].some((v) => v.includes(key) || key.includes(v));
    return `<span style="font-size:12.5px;">${on ? '☑' : '☐'} ${esc(item)}</span>`;
  }).join('')}</div>`;
};

async function getMasterTemplate() {
  const template = await AgreementTemplate.findOne({
    where: { name: 'Service Provider Master Agreement', vertical: 'water_tank', status: 'active' },
    order: [['id', 'DESC']],
  });
  if (!template) {
    const err = new Error('The canonical 63-clause Service Provider Master Agreement is not seeded. Run node scripts/seedProviderAgreement.js from backend/.');
    err.status = 409;
    throw err;
  }
  return template;
}

async function getTemplateFields() {
  const template = await getMasterTemplate();
  let fields = template.fields || [];
  if (typeof fields === 'string') { try { fields = JSON.parse(fields); } catch { fields = []; } }
  return fields;
}

/** Build the canonical 63-clause Provider Master Agreement plus Schedule F rates. */
async function buildAgreement(data = {}) {
  const template = await getMasterTemplate();
  const fields = await getTemplateFields();
  const org = data.org || {};
  const p = data.provider || {};
  const pricing = data.pricing || { lines: [], summary: {}, payment_schedule: [] };
  const templateValues = { ...(data.template_values || {}) };
  const witnesses = data.witnesses || [{}, {}];
  const bank = data.bank_details || {};
  const paymentSummary = [
    data.payment_model && `Model: ${data.payment_model}`,
    data.payout_trigger && `Trigger: ${data.payout_trigger}`,
    data.payment_due_days != null && `Due: ${data.payment_due_days} days after trigger`,
    data.payment_terms,
    data.fee_notes,
  ].filter(Boolean).join(' · ');
  const hasRatePlaceholder = String(template.content_html || '').includes('{{provider_rate_schedule}}');
  const rateScheduleHtml = scheduleB(pricing, !hasRatePlaceholder);
  /*
   * Derived defaults. These used to be spread AFTER templateValues, which meant
   * every one of the 23 legal-template fields that also has a derived source was
   * silently overwritten — usually with '' when the structured source was empty,
   * so the operator typed a value in "All legal template inputs" and got
   * __________ in the document. templateValues is now overlaid on top (below),
   * so anything actually entered wins and every offered field reaches the page.
   */
  const derived = {
    commencement_date: data.effective_date || templateValues.commencement_date || '',
    agreement_term: `${Number(data.term_months || 12)} Month${Number(data.term_months || 12) === 1 ? '' : 's'}`,
    notice_period: `${Number(data.notice_days || 30)} Days`,
    commission_pct: Number(data.commission_pct || 0),
    ss_fee_notes: paymentSummary,
    payment_model: data.payment_model || 'Project Based',
    payout_trigger: data.payout_trigger || 'Completion Verified',
    payment_due_days: Number(data.payment_due_days || 7),
    sp_account_name: bank.account_name || '', sp_bank_name: bank.bank_name || '',
    sp_bank_branch: bank.branch || '', sp_account_number: bank.account_number || '',
    sp_routing_number: bank.routing_number || '', sp_mobile_banking: bank.mobile_banking || '',
    ss_rep_name: org.represented_by || '', ss_rep_position: org.position || '',
    ss_rep_phone: org.phone || '', ss_rep_email: org.email || '',
    sp_rep_name: p.represented_by || p.contact_person || '', sp_rep_position: p.position || '',
    sp_rep_phone: p.phone || '', sp_rep_email: p.email || '', sp_business_name: p.business_name || '',
    witness1_name: witnesses[0]?.name || '', witness1_nid: witnesses[0]?.nid || '',
    witness2_name: witnesses[1]?.name || '', witness2_nid: witnesses[1]?.nid || '',

    /*
     * The template was imported from the Word document, so its placeholders carry
     * the DOCUMENT's field names — registered_address, trade_licence_no,
     * company_registration_no — not the sp_* names used above. Without these the
     * provider's legal identity rendered blank on every agreement: the parties
     * block named the business but not the address, licence or registration it
     * is being bound by. Supply both vocabularies.
     */
    /*
     * The provider's legal identity. The currently active template has no
     * placeholders for these, so they are inert there — but the Word-imported
     * template (registered_address / trade_licence_no / company_registration_no)
     * does, and supplying both vocabularies means whichever template is active
     * renders the same facts rather than blanks.
     */
    registered_address: p.address || p.registered_address || '',
    trade_licence_no: p.trade_licence_no || p.trade_licence || '',
    company_registration_no: p.registration_no || p.company_registration_no || '',
    tin: p.tin || '', bin: p.bin || '',
    business_name: p.business_name || '', business_name_2: p.business_name || '',
    contact_person: p.contact_person || p.represented_by || '',
    district: p.district || '',
    represented_by: org.represented_by || '',
    represented_by_2: p.represented_by || p.contact_person || '',
    seventh_sky_representative_name: org.represented_by || '',
    service_provider_representative_name: p.represented_by || p.contact_person || '',
    name: org.represented_by || '', name_2: p.represented_by || p.contact_person || '',
    position: org.position || '', position_2: p.position || '',
    phone: org.phone || '', phone_2: p.phone || '',
    email: org.email || '', email_2: p.email || '',
  };

  // Operator input wins. A blank or unticked field falls back to the derived
  // default rather than wiping it.
  const values = { ...derived };
  for (const [key, v] of Object.entries(templateValues)) {
    if (v == null || v === '') continue;
    if (Array.isArray(v) && !v.length) continue;
    values[key] = v;
  }

  /*
   * Payment model, payout trigger and due days have no placeholder of their own
   * in the template — they ride inside ss_fee_notes. They are legally material
   * (the trigger decides when the provider is entitled to be paid), so they must
   * survive an operator who overwrites the fee notes with their own wording.
   */
  const structuredPay = [
    data.payment_model && `Model: ${data.payment_model}`,
    data.payout_trigger && `Trigger: ${data.payout_trigger}`,
    data.payment_due_days != null && `Due: ${data.payment_due_days} days after trigger`,
  ].filter(Boolean).join(' · ');
  if (structuredPay && !String(values.ss_fee_notes || '').includes(structuredPay)) {
    values.ss_fee_notes = [structuredPay, values.ss_fee_notes].filter(Boolean).join(' · ');
  }
  const rawBlocks = { provider_rate_schedule: rateScheduleHtml };
  for (const field of fields.filter((f) => f.type === 'checkbox_group')) {
    const selected = Array.isArray(templateValues[field.key]) ? templateValues[field.key] : (data.services || []);
    rawBlocks[field.key] = checkboxHtml(field.options || [], selected);
  }
  let source = template.content_html || '';
  for (const [key, block] of Object.entries(rawBlocks)) {
    source = source.replace(new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'gi'), block);
  }
  let html = merge(source, values);
  if (!hasRatePlaceholder) {
    html = html.replace(/<p[^>]*>\s*<strong>END OF MASTER SERVICE DELIVERY PROVIDER AGREEMENT<\/strong>\s*<\/p>/i,
      `${rateScheduleHtml}$&`);
  }
  const doc_no = 'SSPC-WTCM-SDPMA-01';
  const title = 'Master Service Delivery Provider Agreement';

  /*
   * Execution block — same treatment as the customer agreement: every party the
   * block names gets its own anchored signature and date slot, so a captured
   * signature lands in that party's box instead of a dead underscore line.
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
  /*
   * The template carries its own execution section — "SIGNED FOR SEVENTH SKY",
   * "SIGNED FOR SERVICE PROVIDER", "WITNESS 1", "WITNESS 2" — each ending in a
   * dead "Signature: ____ Date: ____" pair. Appending a second signature block
   * would leave the document with two, so the template's own lines are upgraded
   * in place: same wording and position, but anchored slots a captured signature
   * can actually land in. The four occurrences appear in that fixed order.
   */
  const SIGN_PARTIES = ['Seventh Sky', 'Service Provider', 'Witness 1', 'Witness 2'];
  let signIdx = 0;
  const anchorLines = (chunk) => chunk
    .replace(/Signature:\s*_{5,}\s*(?:<[^>]+>\s*)*Date:\s*_{5,}/gi,
      () => signSlot(SIGN_PARTIES[signIdx++] || `Party ${signIdx}`))
    // any stray line the pattern above did not pair with a date
    .replace(/Signature:\s*_{5,}/gi, () => signSlot(SIGN_PARTIES[signIdx++] || `Party ${signIdx}`));

  /*
   * In the template the four signing blocks sit inside clause 63 — BEFORE
   * Schedule A — so the parties would sign above the schedules they are agreeing
   * to. Lift them out and hand them to decorate() to place at the very end,
   * after every schedule. Clause 63's acknowledgement paragraph stays where it
   * is; only the signing blocks move.
   */
  let signatures = '';
  const execBlock = /<p>\s*<strong>\s*SIGNED FOR SEVENTH SKY[\s\S]*?(?=<h3[^>]*>\s*Schedule\s+A)/i;
  const m = html.match(execBlock);
  if (m) {
    html = html.replace(execBlock, '');
    signatures = `<h2 style="font-size:15px;color:#003768;margin:26px 0 8px;">Execution</h2>${anchorLines(m[0])}`;
  } else {
    // Template variant without that marker — anchor in place rather than lose them.
    html = anchorLines(html);
  }

  html = decorate(html, {
    title, docNo: doc_no, version: '0.2', effectiveDate: data.effective_date,
    provider: p, org, contractDate: data.signed_date || data.contract_date || null,
    signatures,
  });

  const terms = {
    agreement_type: 'water_tank_provider_master', template_id: template.id,
    provider_id: data.provider_id || data.related_id || null,
    effective_date: data.effective_date || null,
    term_months: Number(data.term_months || 12), notice_days: Number(data.notice_days || 30),
    commission_pct: Number(data.commission_pct || 0), payment_model: data.payment_model || 'Project Based',
    payout_trigger: data.payout_trigger || 'Completion Verified', payment_due_days: Number(data.payment_due_days || 7),
    payment_terms: data.payment_terms || '', fee_notes: data.fee_notes || '', bank_details: bank,
    authorised_services: data.services || [], compliance_checklist: data.checklist || [],
    cumilla_exclusive: !!data.cumilla_exclusive,
    provider: p, org, witnesses, template_values: templateValues,
    agreed_lines: pricing.lines.map((l) => ({ id: l.id, code: l.code, name: l.name, unit: l.unit, standard_price: l.standard_price, agreed_price: l.agreed_price, group: l.group })),
  };
  return { title, doc_no, html, terms, template_id: template.id };
}

module.exports = { getCatalog, computePricing, buildAgreement, getTemplateFields, SERVICE_GROUPS, CHECKLIST_GROUPS };
