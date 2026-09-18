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
const { SERVICE_LINE_KEYS, getServiceLine } = require('../config/serviceLines');

const money = (v) => Number(v || 0).toLocaleString('en-US', { maximumFractionDigits: 0 });
const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
// Escapes user-supplied values — they end up in HTML rendered with
// dangerouslySetInnerHTML, so an unescaped value would be a stored-XSS vector.
const or = (v, f = '__________') => (v == null || v === '' ? f : esc(v));

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

async function getCatalog(branchId, { vertical = 'water_tank_csa' } = {}) {
  const where = { vertical, is_active: true };
  if (branchId) where.branch_id = branchId;
  const rows = await ServiceItem.findAll({ where, order: [['sort_order', 'ASC']] });
  return rows.map((r) => {
    const p = r.get({ plain: true });
    let tags = p.tags; if (typeof tags === 'string') { try { tags = JSON.parse(tags); } catch { tags = {}; } }
    return { id: p.id, code: p.code, name: p.name, unit: p.unit, standard_price: Number(p.base_price || 0), group: (tags || {}).group || 'service' };
  });
}

/** Provider Schedule B pricing: selected lines with standard vs agreed (no client cost summary). */
async function computePricing(input = {}, branchId, opts = {}) {
  const catalog = await getCatalog(branchId, { vertical: opts.vertical });
  const byCode = Object.fromEntries(catalog.map((c) => [c.code, c]));
  const selected = (input.selected || []).map((s) => {
    const line = byCode[s.code]; if (!line) return null;
    const agreed = (s.agreed_price != null && s.agreed_price !== '') ? Number(s.agreed_price) : line.standard_price;
    return { ...line, agreed_price: agreed };
  }).filter(Boolean);
  return { lines: selected, summary: {}, payment_schedule: [] };
}

const kvTable = (rows) => `<table style="width:100%;border-collapse:collapse;margin:8px 0;">${rows.map(([k, v]) => `<tr><td style="padding:6px 10px;border:1px solid #d9dee6;background:#f6f8fb;width:38%;font-weight:600;font-size:12.5px;">${esc(k)}</td><td style="padding:6px 10px;border:1px solid #d9dee6;font-size:12.5px;">${v == null ? '__________' : esc(v)}</td></tr>`).join('')}</table>`;

function scheduleB(pricing, withHeading = true, serviceLine = 'water_tank') {
  // Only the services selected/authorised for this provider appear (not the full catalog).
  const lines = pricing.lines || [];
  const groupRows = (filterFn) => lines.filter(filterFn).map((l) => `<tr>
    <td style="padding:8px 10px;border:1px solid #e2e8f0;font-size:12px;font-weight:600;color:#012a4e;">${esc(l.code)}</td>
    <td style="padding:8px 10px;border:1px solid #e2e8f0;font-size:12px;color:#334155;">${esc(l.name)}</td>
    <td style="padding:8px 10px;border:1px solid #e2e8f0;font-size:12px;color:#64748b;">${esc(l.unit || '')}</td>
    <td style="padding:8px 10px;border:1px solid #e2e8f0;font-size:12px;text-align:right;color:#64748b;">৳ ${money(l.standard_price)}</td>
    <td style="padding:8px 10px;border:1px solid #e2e8f0;font-size:12px;text-align:right;font-weight:700;color:#012a4e;">${l.agreed_price != null ? `৳ ${money(l.agreed_price)}` : ''}</td>
  </tr>`).join('');

  const renderSection = (title, rows) => {
    if (!rows) return '';
    return `<div style="font-weight:700;font-size:12.5px;color:#012a4e;margin:14px 0 6px;display:flex;align-items:center;gap:6px;">
      <span style="width:5px;height:5px;border-radius:50%;background:#00AEEF;"></span>${esc(title)}
    </div>
    <table style="width:100%;border-collapse:collapse;margin:4px 0 14px;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;">
      <thead>
        <tr style="background:#012a4e;color:#ffffff;">
          ${['Code', 'Service / Scope', 'Unit', 'Standard Price', 'Agreed Price'].map((h) => `<th style="padding:8px 10px;border:1px solid #012a4e;font-size:11px;font-weight:700;letter-spacing:0.5px;text-transform:uppercase;text-align:${h.includes('Price') ? 'right' : 'left'};">${h}</th>`).join('')}
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`;
  };

  const primaryTitle = serviceLine === 'air_conditioning'
    ? 'Air Conditioning Services & Solutions'
    : 'Water Tank Cleaning & Maintenance Services';

  const sections = [
    renderSection(primaryTitle, groupRows((l) => !l.group || l.group === 'service')),
    renderSection('Materials, Spare Parts & Consumables', groupRows((l) => l.group === 'material')),
    renderSection('Labour & Specialized Technicians', groupRows((l) => l.group === 'labour')),
    renderSection('Additional Authorized Services', groupRows((l) => l.group && !['service', 'material', 'labour'].includes(l.group))),
  ].filter(Boolean).join('');

  const table = sections || '<div style="color:#94a3b8;font-size:12.5px;font-style:italic;padding:12px 0;">No services selected yet. Select services in the builder to populate the rate schedule.</div>';
  if (!withHeading) return table;
  return `<h2 id="sched-f" style="font-size:15px;color:#012a4e;font-weight:800;margin:24px 0 8px;">SCHEDULE B — Agreed Provider Rate Schedule</h2>
  ${table}`;
}

function scheduleChecks(id, title, groups, selectedSet) {
  const body = Object.entries(groups).map(([g, items]) => `
    <div style="margin:10px 0 4px;font-weight:700;font-size:12.5px;color:#334155;">${esc(g)}</div>
    <div style="display:flex;flex-wrap:wrap;gap:6px 18px;">${items.map((it) => `<span style="font-size:12.5px;">${selectedSet.has(it) ? '☑' : '☐'} ${esc(it)}</span>`).join('')}</div>`).join('');
  return `<h2 id="${id}" style="font-size:15px;color:#003768;margin:22px 0 6px;">${esc(title)}</h2>${body}`;
}

/**
 * The master agreement body comes from the seeded Word template. Dress it in the
 * same luxury Plus Jakarta Sans styling every other Seventh Sky agreement uses
 * (Customer Service, Sales, RPRM, STS): branded cover page, two-column roadmap TOC,
 * structured parties block, clause card typography, and anchored execution cards.
 */
const PAGE_BREAK = '';

/* A labelled fact table for the parties page. */
const partyTable = (rows) => `<table style="width:100%;border-collapse:collapse;margin:8px 0 16px;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;">${
  rows.filter(([, v]) => v != null).map(([k, v]) => `<tr>
    <td style="padding:7px 12px;border:1px solid #e2e8f0;background:#f8fafc;width:36%;font-weight:700;font-size:12px;color:#334155;">${esc(k)}</td>
    <td style="padding:7px 12px;border:1px solid #e2e8f0;font-size:12.5px;color:#0f172a;">${v === '' ? '__________' : esc(v)}</td>
  </tr>`).join('')}</table>`;

/**
 * The document shell.
 *   page 1 — cover: 7S branding badge, contract name, parties dossier, status strip
 *   page 2 — table of contents: 2-column roadmap with dotted leader lines and schedule links
 *   page 3 — full contact and legal details of both parties
 *   then   — the agreement body, clauses, schedules A–D, and execution block
 */
function decorate(body, { title, docNo, version, effectiveDate, provider = {}, org = {}, contractDate, signatures = '', serviceLine = 'water_tank' }) {
  let html = String(body || '');

  // 1. Strip raw template h1 and old signatures
  html = html.replace(/<h1\b[^>]*>[\s\S]*?<\/h1>/i, '');
  html = html.replace(/<p>\s*<strong>\s*SIGNED FOR SEVENTH SKY[\s\S]*$/i, '');
  html = html.replace(/<h3\b[^>]*>\s*(?:\d+\.\s*)?Execution\s*<\/h3>[\s\S]*$/i, '');
  html = html.replace(/Signature:\s*_{5,}\s*(?:<[^>]+>\s*)*Date:\s*_{5,}/gi, '');
  html = html.replace(/Signature:\s*_{5,}/gi, '');

  const sl = (typeof getServiceLine === 'function') ? getServiceLine(serviceLine) : null;
  const divisionSubtitle = (PROVIDER_DOC[serviceLine] || {}).subtitle || (sl?.label ? `${sl.label.toUpperCase()} SERVICES & SOLUTIONS` : 'PROPERTY CARE SERVICES');
  const serviceTitle = (PROVIDER_DOC[serviceLine] || {}).category_title || (sl?.ui?.full_label || sl?.label || 'Service Delivery');

  // Body typography normalization
  html = html.replace(/<p(?![^>]*\sstyle=)([^>]*)>/gi, '<p$1 style="margin:8px 0;line-height:1.65;font-size:12.5px;color:#334155;">');
  html = html.replace(/<ul(?![^>]*\sstyle=)([^>]*)>/gi, '<ul$1 style="margin:8px 0 8px 4px;padding-left:20px;line-height:1.65;font-size:12.5px;color:#334155;">');
  html = html.replace(/<li(?![^>]*\sstyle=)([^>]*)>/gi, '<li$1 style="margin:4px 0;">');

  // Parse into structured sections by <h3>
  const rawSections = html.split(/(?=<h3\b[^>]*>)/i);
  const clauses = [];
  const schedules = {};
  let preamble = '';

  rawSections.forEach((sec) => {
    const m = sec.match(/^<h3\b[^>]*>([\s\S]*?)<\/h3>([\s\S]*)$/i);
    if (!m) {
      if (sec.trim()) preamble += sec;
      return;
    }
    const rawLabel = m[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
    const secBody = m[2];
    const schedMatch = rawLabel.match(/^schedule\s+([a-d])(?:\s*[—-]\s*(.*))?$/i);

    if (schedMatch) {
      const letter = schedMatch[1].toUpperCase();
      const schedTitle = schedMatch[2] ? schedMatch[2].trim() : `Schedule ${letter}`;
      schedules[letter] = { letter, title: schedTitle, body: secBody };
      return;
    }

    if (/^execution/i.test(rawLabel)) {
      return; // Skip legacy execution heading
    }

    const cleanTitle = rawLabel.replace(/^(\d+[\.\s]*)+/g, '').trim();
    const clauseIdx = clauses.length + 1;
    clauses.push({
      id: `cl-${clauseIdx}`,
      num: clauseIdx,
      title: cleanTitle,
      body: secBody,
    });
  });

  const providerName = provider.business_name || 'Service Provider';

  // ── page 1: dedicated minimalist luxury cover page ──
  const cover = `
  <div class="agreement-page agreement-cover-page" style="box-sizing:border-box;min-height:760px;max-height:920px;page-break-after:always;break-after:page;display:flex;flex-direction:column;justify-content:space-between;padding:32px 44px 24px;background:#ffffff;border-bottom:2px solid #e2e8f0;position:relative;">
    <!-- Top Header & Document Metadata Badge -->
    <div>
      <div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:1.5px solid #012a4e;padding-bottom:16px;">
        <div style="display:flex;align-items:center;gap:12px;">
          <div style="width:42px;height:42px;border-radius:10px;background:linear-gradient(135deg,#012a4e 0%,#003768 50%,#00AEEF 100%);display:flex;align-items:center;justify-content:center;color:#ffffff;font-weight:800;font-size:19px;letter-spacing:-0.5px;box-shadow:0 3px 10px rgba(1,42,78,0.18);">7S</div>
          <div>
            <div style="font-size:15px;font-weight:800;color:#012a4e;letter-spacing:0.8px;text-transform:uppercase;">Seventh Sky Property Care</div>
            <div style="font-size:10.5px;font-weight:600;color:#00AEEF;letter-spacing:1px;text-transform:uppercase;">${esc(divisionSubtitle)}</div>
          </div>
        </div>
        <div style="text-align:right;">
          <span style="display:inline-block;padding:3px 10px;border-radius:9999px;background:#e0f2fe;color:#0369a1;font-size:10.5px;font-weight:700;border:1px solid #bae6fd;">SERVICE DELIVERY PROVIDER MASTER AGREEMENT</span>
          <div style="font-size:10.5px;color:#64748b;margin-top:3px;font-weight:500;">DOC REF: ${docNo} · v${version || '0.2'}</div>
        </div>
      </div>

      <!-- Center Hero Title Block -->
      <div style="margin-top:36px;text-align:left;">
        <div style="display:inline-flex;align-items:center;gap:8px;font-size:11.5px;font-weight:700;color:#00AEEF;text-transform:uppercase;letter-spacing:2px;margin-bottom:12px;">
          <span style="width:20px;height:2px;background:#00AEEF;display:inline-block;"></span>
          MASTER AGREEMENT · SERVICE DELIVERY PARTNERSHIP
        </div>
        <h1 style="font-size:30px;font-weight:800;color:#012a4e;line-height:1.2;margin:0 0 14px;letter-spacing:-0.5px;">
          ${esc(serviceTitle)}<br/>
          <span style="font-size:24px;color:#003768;font-weight:700;">Service Delivery Provider Master Agreement</span>
        </h1>
        <div style="width:70px;height:4px;background:linear-gradient(90deg,#012a4e,#00AEEF);border-radius:2px;margin-bottom:16px;"></div>
        <p style="font-size:13px;color:#475569;line-height:1.6;max-width:580px;margin:0;font-weight:400;">
          A comprehensive master service delivery agreement establishing operational standards, authorised service schedules, pre-approved commercial rate cards, quality compliance, and legal obligations between Seventh Sky Property Care and the Service Provider.
        </p>
      </div>
    </div>

    <!-- Bottom Dossier Grid -->
    <div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-bottom:24px;">
        <!-- Provider Dossier -->
        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:16px 18px;box-shadow:0 1px 3px rgba(0,0,0,0.02);">
          <div style="font-size:10.5px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;color:#00AEEF;margin-bottom:8px;display:flex;align-items:center;gap:6px;">
            <span style="width:6px;height:6px;border-radius:50%;background:#00AEEF;"></span>
            Appointed Service Provider · Delivery Partner
          </div>
          <div style="font-size:14px;font-weight:700;color:#0f172a;margin-bottom:4px;">${esc(providerName)}</div>
          <div style="font-size:11.5px;color:#475569;line-height:1.5;">
            <div><strong>Represented By:</strong> ${or(provider.represented_by || provider.contact_person)} (${or(provider.position, 'Authorized Representative')})</div>
            <div><strong>Registered Address:</strong> ${or(provider.address || provider.registered_address)}</div>
            <div><strong>Trade Licence:</strong> ${or(provider.trade_licence_no || provider.trade_licence)} · <strong>TIN:</strong> ${or(provider.tin)}</div>
            ${provider.bin ? `<div><strong>BIN:</strong> ${or(provider.bin)}</div>` : ''}
            <div><strong>Contact:</strong> ${or(provider.phone || provider.contact_phone)} · ${or(provider.email || provider.contact_email)}</div>
          </div>
        </div>

        <!-- Management Agency Dossier -->
        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:16px 18px;box-shadow:0 1px 3px rgba(0,0,0,0.02);">
          <div style="font-size:10.5px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;color:#012a4e;margin-bottom:8px;display:flex;align-items:center;gap:6px;">
            <span style="width:6px;height:6px;border-radius:50%;background:#012a4e;"></span>
            Management Agency · Principal
          </div>
          <div style="font-size:14px;font-weight:700;color:#0f172a;margin-bottom:4px;">${esc(org.name || 'Seventh Sky Property Care')}</div>
          <div style="font-size:11.5px;color:#475569;line-height:1.5;">
            <div><strong>Represented By:</strong> ${or(org.represented_by, 'Authorized Signatory')}</div>
            <div><strong>Position:</strong> ${or(org.position, 'Managing Director')}</div>
            <div><strong>Contact:</strong> ${or(org.phone, '+880 1819-000000')} · ${or(org.email, 'admin@seventhskyproperty.com')}</div>
            <div><strong>Jurisdiction:</strong> Dhaka, People's Republic of Bangladesh</div>
          </div>
        </div>
      </div>

      <!-- Bottom Status Strip -->
      <div style="border-top:1px solid #e2e8f0;padding-top:14px;display:flex;justify-content:space-between;align-items:center;font-size:11px;color:#64748b;">
        <div>Effective Date: <strong style="color:#0f172a;">${or(effectiveDate, 'Upon Execution')}</strong> · Governing Law: <strong style="color:#0f172a;">Laws of Bangladesh</strong></div>
        <div style="display:flex;align-items:center;gap:6px;">
          <span style="display:inline-block;width:6px;height:6px;background:#10b981;border-radius:50%;"></span>
          <span>Electronic Signature &amp; SHA-256 Audit Trail Protected</span>
        </div>
      </div>
    </div>
  </div>`;

  // ── page 2: dedicated 1-page table of contents ──
  const splitIdx = Math.min(13, Math.ceil(clauses.length / 2) + 1);
  const leftClauses = clauses.slice(0, splitIdx);
  const rightClauses = clauses.slice(splitIdx);

  const renderTocSection = (sectionTitle, items) => {
    if (!items || !items.length) return '';
    return `
    <div style="margin-bottom:12px;">
      <div style="font-size:10px;font-weight:800;color:#00AEEF;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:4px;border-bottom:1px solid #e2e8f0;padding-bottom:2px;">
        ${sectionTitle}
      </div>
      ${items.map((t) => `
        <div style="display:flex;justify-content:space-between;align-items:baseline;padding:2px 0;">
          <a href="#${t.id}" style="color:#1e293b;text-decoration:none;font-size:11px;font-weight:500;display:inline-flex;align-items:center;gap:5px;">
            <span style="color:#00AEEF;font-weight:700;">${String(t.num).padStart(2, '0')}.</span>
            <span>${esc(t.title)}</span>
          </a>
          <span style="flex:1;border-bottom:1px dotted #cbd5e1;margin:0 6px;"></span>
          <span style="font-size:10px;color:#94a3b8;font-weight:600;">§${t.num}</span>
        </div>`).join('')}
    </div>`;
  };

  const tocHtml = `
  <div class="agreement-page agreement-toc-page" style="box-sizing:border-box;min-height:760px;max-height:920px;page-break-after:always;break-after:page;padding:28px 44px 20px;background:#ffffff;border-bottom:2px solid #e2e8f0;display:flex;flex-direction:column;justify-content:space-between;">
    <div>
      <div style="display:flex;justify-content:space-between;align-items:flex-end;border-bottom:2px solid #012a4e;padding-bottom:12px;margin-bottom:20px;">
        <div>
          <div style="font-size:10.5px;font-weight:700;color:#00AEEF;letter-spacing:1.2px;text-transform:uppercase;">Document Roadmap</div>
          <h2 style="font-size:22px;font-weight:800;color:#012a4e;margin:2px 0 0;">Table of Contents</h2>
        </div>
        <div>
          <span style="display:inline-block;padding:3px 10px;border-radius:9999px;background:#f1f5f9;color:#334155;font-size:10.5px;font-weight:700;border:1px solid #e2e8f0;">${clauses.length} CLAUSES · 4 SCHEDULES</span>
        </div>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;column-gap:28px;align-items:start;">
        <!-- Left Column -->
        <div>
          ${renderTocSection('PART I — PURPOSE, APPOINTMENT & SERVICE SCOPE', leftClauses.slice(0, 6))}
          ${renderTocSection('PART II — COMPLIANCE, STANDARDS & COMMERCIALS', leftClauses.slice(6))}
        </div>

        <!-- Right Column -->
        <div>
          ${renderTocSection('PART III — LIABILITIES, CLIENT PROTECTION & GOVERNANCE', rightClauses)}

          <!-- Operational Schedules & Attestation Block in TOC -->
          <div style="margin-top:8px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:8px 12px;">
            <div style="font-size:10px;font-weight:800;color:#012a4e;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:4px;border-bottom:1px solid #e2e8f0;padding-bottom:2px;">
              Operational Schedules &amp; Signatures
            </div>
            <div style="display:flex;justify-content:space-between;align-items:baseline;padding:2px 0;">
              <a href="#sched-a" style="color:#1e293b;text-decoration:none;font-size:11px;font-weight:600;"><span style="color:#00AEEF;">A.</span> Schedule A — Authorised Services</a>
              <span style="flex:1;border-bottom:1px dotted #cbd5e1;margin:0 6px;"></span>
              <span style="font-size:10px;color:#94a3b8;font-weight:600;">Scope</span>
            </div>
            <div style="display:flex;justify-content:space-between;align-items:baseline;padding:2px 0;">
              <a href="#sched-b" style="color:#1e293b;text-decoration:none;font-size:11px;font-weight:600;"><span style="color:#00AEEF;">B.</span> Schedule B — Standard Service Price Schedule</a>
              <span style="flex:1;border-bottom:1px dotted #cbd5e1;margin:0 6px;"></span>
              <span style="font-size:10px;color:#94a3b8;font-weight:600;">Rates</span>
            </div>
            <div style="display:flex;justify-content:space-between;align-items:baseline;padding:2px 0;">
              <a href="#sched-c" style="color:#1e293b;text-decoration:none;font-size:11px;font-weight:600;"><span style="color:#00AEEF;">C.</span> Schedule C — Insurance &amp; Licence Checklist</a>
              <span style="flex:1;border-bottom:1px dotted #cbd5e1;margin:0 6px;"></span>
              <span style="font-size:10px;color:#94a3b8;font-weight:600;">Compliance</span>
            </div>
            <div style="display:flex;justify-content:space-between;align-items:baseline;padding:2px 0;">
              <a href="#sched-d" style="color:#1e293b;text-decoration:none;font-size:11px;font-weight:600;"><span style="color:#00AEEF;">D.</span> Schedule D — Work Order Summary &amp; Protocol</a>
              <span style="flex:1;border-bottom:1px dotted #cbd5e1;margin:0 6px;"></span>
              <span style="font-size:10px;color:#94a3b8;font-weight:600;">Protocol</span>
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

    <!-- Bottom Page 2 Footer -->
    <div style="border-top:1px dashed #cbd5e1;padding-top:10px;display:flex;justify-content:space-between;font-size:10.5px;color:#64748b;">
      <span>Document: ${docNo}</span>
      <span>Page 2 · Table of Contents</span>
    </div>
  </div>`;

  // ── page 3: the parties in full ──
  const partiesHtml = `
  <div class="agreement-parties-page" style="box-sizing:border-box;margin:0 0 24px;border-bottom:1.5px solid #e2e8f0;padding-bottom:18px;page-break-after:always;break-after:page;">
    <h2 style="font-size:17px;color:#012a4e;font-weight:800;margin:0 0 4px;">The Parties</h2>
    <p style="margin:0 0 14px;font-size:12.5px;color:#64748b;">
      This Master Service Delivery Agreement is entered into on <strong>${or(contractDate || effectiveDate, 'the execution date')}</strong> by and between the following Parties:
    </p>
    <div style="font-size:11px;font-weight:800;color:#00AEEF;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:6px;">1. SEVENTH SKY PROPERTIES (&ldquo;SEVENTH SKY&rdquo;)</div>
    ${partyTable([
      ['Legal Name', org.name || 'Seventh Sky Property Care'],
      ['Division', divisionSubtitle],
      ['Registered Address', org.address || 'Dhaka, Bangladesh'],
      ['Phone', org.phone || '+880 1819-000000'],
      ['Email', org.email || 'admin@seventhskyproperty.com'],
      ['Represented By', org.represented_by || 'Authorized Signatory'],
      ['Position', org.position || 'Managing Director'],
    ])}
    <div style="font-size:11px;font-weight:800;color:#00AEEF;text-transform:uppercase;letter-spacing:0.8px;margin:18px 0 6px;">2. ${esc(providerName).toUpperCase()} (&ldquo;SERVICE PROVIDER&rdquo;)</div>
    ${partyTable([
      ['Business Name', provider.business_name || ''],
      ['Legal / Trading Name', provider.legal_name || provider.business_name || ''],
      ['Business Type', provider.business_type || 'Private Limited / Proprietorship'],
      ['Registered Address', provider.address || provider.registered_address || ''],
      ['District', provider.district || ''],
      ['Trade Licence No.', provider.trade_licence_no || provider.trade_licence || ''],
      ['Company Registration No.', provider.registration_no || provider.company_registration_no || ''],
      ['TIN', provider.tin || ''],
      ['BIN', provider.bin || ''],
      ['Contact Person', provider.contact_person || ''],
      ['Represented By', provider.represented_by || provider.contact_person || ''],
      ['Position', provider.position || 'Authorized Signatory'],
      ['Phone', provider.phone || provider.contact_phone || ''],
      ['Email', provider.email || provider.contact_email || ''],
      ['Years of Experience', provider.years_experience ? `${provider.years_experience} Years` : ''],
      ['Coverage', provider.coverage || ''],
    ])}
  </div>`;

  // Clauses rendered into modern cards with pill badges
  const clausesHtml = clauses.map((c) => `
    <div class="clause-card" style="margin:14px 0;padding:14px 18px;border:1px solid #f1f5f9;border-radius:10px;background:#ffffff;box-shadow:0 1px 3px rgba(0,0,0,0.02);page-break-inside:avoid;break-inside:avoid;">
      <h3 id="${c.id}" style="font-size:13.5px;font-weight:800;color:#012a4e;margin:0 0 6px;display:flex;align-items:center;gap:8px;">
        <span style="display:inline-block;background:#e0f2fe;color:#0369a1;font-size:10.5px;font-weight:800;padding:2px 6px;border-radius:4px;border:1px solid #bae6fd;">${String(c.num).padStart(2, '0')}</span>
        <span>${esc(c.title)}</span>
      </h3>
      <div style="font-size:12.5px;color:#334155;line-height:1.65;">${c.body}</div>
    </div>`).join('');

  // Schedules rendered into clean card containers
  const schedAHtml = schedules['A'] ? `
    <div id="sched-a" class="schedule-card" style="margin:28px 0 16px;">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;">
        <span style="background:#012a4e;color:#fff;font-size:10px;font-weight:800;padding:2px 7px;border-radius:4px;letter-spacing:0.8px;">SCHEDULE A</span>
        <h2 style="font-size:15px;color:#012a4e;font-weight:800;margin:0;">Schedule A — ${esc(schedules['A'].title || 'Authorised Services')}</h2>
      </div>
      <div style="border:1px solid #e2e8f0;border-radius:10px;padding:16px 20px;background:#f8fafc;">
        ${schedules['A'].body}
      </div>
    </div>` : '';

  const schedBHtml = schedules['B'] ? `
    <div id="sched-b" class="schedule-card" style="margin:28px 0 16px;">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;">
        <span style="background:#012a4e;color:#fff;font-size:10px;font-weight:800;padding:2px 7px;border-radius:4px;letter-spacing:0.8px;">SCHEDULE B</span>
        <h2 style="font-size:15px;color:#012a4e;font-weight:800;margin:0;">Schedule B — ${esc(schedules['B'].title || 'Standard Service Price Schedule')}</h2>
      </div>
      ${schedules['B'].body}
    </div>` : '';

  const schedCHtml = schedules['C'] ? `
    <div id="sched-c" class="schedule-card" style="margin:28px 0 16px;page-break-inside:avoid;break-inside:avoid;">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;">
        <span style="background:#012a4e;color:#fff;font-size:10px;font-weight:800;padding:2px 7px;border-radius:4px;letter-spacing:0.8px;">SCHEDULE C</span>
        <h2 style="font-size:15px;color:#012a4e;font-weight:800;margin:0;">Schedule C — ${esc(schedules['C'].title || 'Insurance & Licence Checklist')}</h2>
      </div>
      <div style="border:1px solid #e2e8f0;border-radius:10px;padding:16px 20px;background:#f8fafc;">
        ${schedules['C'].body}
      </div>
    </div>` : '';

  const schedDHtml = schedules['D'] ? `
    <div id="sched-d" class="schedule-card" style="margin:28px 0 16px;page-break-inside:avoid;break-inside:avoid;">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;">
        <span style="background:#012a4e;color:#fff;font-size:10px;font-weight:800;padding:2px 7px;border-radius:4px;letter-spacing:0.8px;">SCHEDULE D</span>
        <h2 style="font-size:15px;color:#012a4e;font-weight:800;margin:0;">Schedule D — ${esc(schedules['D'].title || 'Work Order Summary & Operating Protocol')}</h2>
      </div>
      <div style="border:1px solid #e2e8f0;border-radius:10px;padding:16px 20px;background:#f8fafc;">
        ${schedules['D'].body}
      </div>
    </div>` : '';

  return `
  <div class="provider-doc" style="font-family:'Plus Jakarta Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1e293b;line-height:1.65;font-size:13.5px;max-width:840px;margin:0 auto;background:#ffffff;">
    <style>
      @media print {
        @page { size: A4 portrait; margin: 10mm; }
        body { background:#fff !important; padding:0 !important; }
        .provider-doc { max-width:100% !important; margin:0 !important; }
        .agreement-cover-page { min-height:auto !important; max-height:none !important; page-break-after:always !important; break-after:page !important; }
        .agreement-toc-page { min-height:auto !important; max-height:none !important; page-break-after:always !important; break-after:page !important; }
        .agreement-parties-page { page-break-after:always !important; break-after:page !important; }
        .clause-card { page-break-inside:avoid !important; break-inside:avoid !important; }
        .no-break { page-break-inside:avoid !important; break-inside:avoid !important; }
      }
      .provider-doc a:hover { color:#00AEEF !important; }
    </style>
    ${cover}
    ${tocHtml}
    <div class="agreement-page agreement-body-page" style="padding:32px 48px 48px;">
      ${partiesHtml}
      <div style="text-align:center;border-bottom:2px solid #012a4e;padding-bottom:10px;margin-bottom:18px;">
        <div style="font-size:16px;font-weight:800;color:#012a4e;letter-spacing:0.5px;">Seventh Sky Property Care</div>
        <div style="font-size:13px;font-weight:700;color:#00AEEF;margin-top:4px;text-transform:uppercase;letter-spacing:1px;">${esc(title)}</div>
      </div>
      ${preamble}
      ${clausesHtml}
      ${schedAHtml}
      ${schedBHtml}
      ${schedCHtml}
      ${schedDHtml}
      <div style="margin-top:24px;padding:12px 16px;border-radius:8px;background:#f8fafc;border:1px solid #e2e8f0;font-size:11px;color:#64748b;line-height:1.5;">
        This Agreement becomes effective when signed by both Parties through the Seventh Sky electronic signing system. The electronic record, audit trail and content hash constitute proof of execution.
      </div>
      ${signatures}
    </div>
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

// The provider master agreement body lives in an AgreementTemplate row, one per
// service line (vertical = the service line key: water_tank / air_conditioning).
// Selecting by vertical + category lets each console render its own template
// through the same builder.
const PROVIDER_DOC = {
  water_tank: {
    doc_no: 'SSPC-WTCM-SDPMA-01',
    subtitle: 'WATER TANK CLEANING & MAINTENANCE SOLUTIONS',
    category_title: 'Water Tank Cleaning & Maintenance',
    seed: 'node scripts/seedProviderAgreement.js',
  },
  air_conditioning: {
    doc_no: 'SSPC-ACS-SDPMA-01',
    subtitle: 'AIR CONDITIONING SOLUTIONS & HVAC SERVICES',
    category_title: 'Air Conditioning Solutions',
    seed: 'node scripts/seedAcProviderAgreement.js',
  },
  land_property_assessment: {
    doc_no: 'SSPC-SVS-SDPMA-01',
    subtitle: 'LAND & PROPERTY SURVEY / ASSESSMENT SOLUTIONS',
    category_title: 'Land & Property Assessment',
    seed: 'node scripts/seedLpaProviderAgreement.js',
  },
};
// Resolve a service-line key from a vertical / related_type / key. Matches any
// registered service line by exact or prefix, defaulting to Water Tank.
const serviceLineOf = (v) => {
  const s = String(v || '');
  return SERVICE_LINE_KEYS.find((k) => s === k || s.startsWith(k)) || 'water_tank';
};

async function getMasterTemplate(serviceLine = 'water_tank') {
  const template = await AgreementTemplate.findOne({
    where: { category: 'provider_master', vertical: serviceLine, status: 'active' },
    order: [['id', 'DESC']],
  });
  if (!template) {
    const err = new Error(`The Service Provider Master Agreement for "${serviceLine}" is not seeded. Run ${(PROVIDER_DOC[serviceLine] || PROVIDER_DOC.water_tank).seed} from backend/.`);
    err.status = 409;
    throw err;
  }
  return template;
}

async function getTemplateFields(serviceLine = 'water_tank') {
  const template = await getMasterTemplate(serviceLine);
  let fields = template.fields || [];
  if (typeof fields === 'string') { try { fields = JSON.parse(fields); } catch { fields = []; } }
  return fields;
}

/** Build the canonical 63-clause Provider Master Agreement plus Schedule F rates. */
async function buildAgreement(data = {}, options = {}) {
  const serviceLine = serviceLineOf(data.vertical || data.serviceLine || options.serviceLine);
  const template = await getMasterTemplate(serviceLine);
  const fields = await getTemplateFields(serviceLine);
  const org = data.org || {};
  const p = data.provider || {};
  const pricingInput = data.pricing || {};
  const pricing = {
    lines: Array.isArray(pricingInput.lines) ? pricingInput.lines : (Array.isArray(pricingInput.selected) ? pricingInput.selected : []),
    summary: pricingInput.summary || {},
    payment_schedule: pricingInput.payment_schedule || [],
  };
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
  const rateScheduleHtml = scheduleB(pricing, !hasRatePlaceholder, serviceLine);
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
    // The provider stores its contact as contact_person/contact_phone/contact_email
    // (what the onboarding invitation collects); read those first so the agreement
    // actually carries the provider's real representative, phone and email.
    sp_rep_name: p.represented_by || p.contact_person || '', sp_rep_position: p.position || '',
    sp_rep_phone: p.contact_phone || p.phone || '', sp_rep_email: p.contact_email || p.email || '',
    sp_business_name: p.business_name || '',
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
  const doc_no = (PROVIDER_DOC[serviceLine] || PROVIDER_DOC.water_tank).doc_no;
  const title = 'Master Service Delivery Provider Agreement';

  /*
   * Execution block — modern 2x2 luxury card grid matching Customer & Sales Agreements:
   * 1. Service Provider (Partner)
   * 2. Seventh Sky (Management Agency)
   * 3. Witness 1
   * 4. Witness 2
   */
  const signSlot = (label) => `
    <div data-sign-anchor="${esc(label)}" style="margin-top:8px;">
      <div style="font-size:10.5px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;">Signature</div>
      <div data-sign-field="signature" data-sign-party="${esc(label)}"
           style="min-height:46px;border-bottom:1.5px solid #0f2942;margin:2px 0 6px;display:flex;align-items:flex-end;"></div>
      <div style="font-size:10.5px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;">Date signed</div>
      <div data-sign-field="date_signed" data-sign-party="${esc(label)}"
           style="min-height:20px;border-bottom:1.5px solid #0f2942;display:flex;align-items:flex-end;"></div>
    </div>`;

  const partyCard = (eyebrow, name, sub, anchor) => `
    <div style="background:#ffffff;border:1.5px solid #cbd5e1;border-radius:12px;padding:16px;box-shadow:0 1px 3px rgba(0,0,0,0.03);">
      <div style="font-size:10.5px;font-weight:700;color:#00AEEF;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:4px;">${esc(eyebrow)}</div>
      <div style="font-size:13.5px;font-weight:800;color:#012a4e;">${esc(name)}</div>
      ${sub}
      ${signSlot(anchor)}
    </div>`;

  const spCard = partyCard(
    'Appointed Service Provider · Delivery Partner',
    p.business_name || 'Service Provider',
    `<div style="font-size:11.5px;color:#475569;margin-top:2px;">Representative: <strong>${or(p.represented_by || p.contact_person)}</strong></div><div style="font-size:11.5px;color:#475569;">Position: <strong>${or(p.position, 'Authorized Signatory')}</strong></div>${(p.email || p.contact_email) ? `<div style="font-size:11px;color:#64748b;">Email: ${esc(p.email || p.contact_email)}</div>` : ''}`,
    'Service Provider'
  );

  const ssCard = partyCard(
    'Management Agency · Principal',
    org.name || 'Seventh Sky Property Care',
    `<div style="font-size:11.5px;color:#475569;margin-top:2px;">Representative: <strong>${or(org.represented_by, 'Authorized Signatory')}</strong></div><div style="font-size:11.5px;color:#475569;">Position: <strong>${or(org.position, 'Managing Director')}</strong></div>${org.email ? `<div style="font-size:11px;color:#64748b;">Email: ${esc(org.email)}</div>` : ''}`,
    'Seventh Sky'
  );

  const witnessList = (Array.isArray(witnesses) && witnesses.length) ? witnesses : [{}, {}];
  const witnessCards = witnessList.slice(0, 2).map((w, i) => `
    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:14px;">
      <div style="font-size:10.5px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:4px;">Witness Attestation</div>
      <div style="font-size:13px;font-weight:800;color:#012a4e;">Witness ${i + 1}</div>
      <div style="font-size:11.5px;color:#475569;margin-top:2px;">Name: <strong>${or(w.name)}</strong></div>
      <div style="font-size:11.5px;color:#475569;">NID / Passport: <strong>${or(w.nid)}</strong></div>
      ${signSlot(`Witness ${i + 1}`)}
    </div>`);

  const signatures = `
  <div id="signatures-section" style="margin-top:32px;page-break-inside:avoid;break-inside:avoid;">
    <h2 style="font-size:16px;color:#012a4e;font-weight:800;margin:0 0 14px;border-bottom:1.5px solid #e2e8f0;padding-bottom:6px;">Execution &amp; Attestation</h2>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
      ${spCard}
      ${ssCard}
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:14px;">
      ${witnessCards.join('')}
    </div>
  </div>`;

  // Remove old execution text and raw signing lines from the template body
  html = html.replace(/<h3\b[^>]*>\s*(?:\d+\.\s*)?Execution\s*<\/h3>[\s\S]*?(?=<h3[^>]*>\s*Schedule\s+[A-D]|<p[^>]*>\s*<strong>\s*END\b|$)/i, '');
  html = html.replace(/<p>\s*<strong>\s*SIGNED FOR SEVENTH SKY[\s\S]*?(?=<h3[^>]*>\s*Schedule\s+[A-D]|<p[^>]*>\s*<strong>\s*END\b|$)/i, '');
  html = html.replace(/<p>\s*<strong>\s*SIGNED FOR SEVENTH SKY[\s\S]*$/i, '');
  html = html.replace(/Signature:\s*_{5,}\s*(?:<[^>]+>\s*)*Date:\s*_{5,}/gi, '');
  html = html.replace(/Signature:\s*_{5,}/gi, '');

  html = decorate(html, {
    title, docNo: doc_no, version: '0.2', effectiveDate: data.effective_date,
    provider: p, org, contractDate: data.signed_date || data.contract_date || null,
    signatures,
    serviceLine,
  });

  const terms = {
    agreement_type: `${serviceLine}_provider_master`, template_id: template.id,
    provider_id: data.provider_id || data.related_id || null,
    effective_date: data.effective_date || null,
    term_months: Number(data.term_months || 12), notice_days: Number(data.notice_days || 30),
    commission_pct: Number(data.commission_pct || 0), payment_model: data.payment_model || 'Project Based',
    payout_trigger: data.payout_trigger || 'Completion Verified', payment_due_days: Number(data.payment_due_days || 7),
    payment_terms: data.payment_terms || '', fee_notes: data.fee_notes || '', bank_details: bank,
    authorised_services: data.services || [], compliance_checklist: data.checklist || [],
    cumilla_exclusive: !!data.cumilla_exclusive,
    provider: p, org, witnesses, template_values: templateValues,
    agreed_lines: (pricing.lines || []).map((l) => ({ id: l.id, code: l.code, name: l.name, unit: l.unit, standard_price: l.standard_price, agreed_price: l.agreed_price, group: l.group })),
  };
  return { title, doc_no, html, terms, template_id: template.id };
}

module.exports = { getCatalog, computePricing, buildAgreement, getTemplateFields, SERVICE_GROUPS, CHECKLIST_GROUPS };
