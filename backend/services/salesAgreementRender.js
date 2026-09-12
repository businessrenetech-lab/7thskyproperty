// backend/services/salesAgreementRender.js
//
// Shared rendering + pricing for the residential sales service agreements
// (RPPS / RPSS). Mirrors rprmAgreement.service's building blocks, generalised
// to take a vertical (catalogue scope) and a kind config (clauses, doc no,
// party). Each build returns { title, doc_no, html, terms }.
const ServiceItem = require('../models/ServiceItem');

const money = (v) => '৳' + Number(v || 0).toLocaleString('en-US', { maximumFractionDigits: 0 });
const or = (v, f = '__________') => (v == null || v === '' ? f : v);
const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// ── Catalogue (Schedule C standard prices) for a sales vertical ──────────
async function getCatalog(vertical, branchId) {
  const where = { vertical, is_active: true };
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
      percent: tags.percent || null,
    };
  });
}

function stdLabel(line) {
  if (line.price_label) return line.price_label;
  if (line.price_type === 'from') return `From ${money(line.standard_price)}`;
  if (line.price_type === 'included') return 'Included';
  if (line.price_type === 'percent') return line.price_label || '% as agreed';
  return money(line.standard_price);
}

function agreedAmount(line, agreed) {
  if (agreed != null && agreed !== '') return Number(agreed) || 0;
  if (line.price_type === 'included' || line.price_type === 'percent') return 0;
  return Number(line.standard_price || 0);
}

// input: { selected:[{code, agreed_price}], discount, vat_percent, third_party_costs, admin_charges, payment_overrides }
async function computePricing(vertical, input = {}, branchId) {
  const catalog = await getCatalog(vertical, branchId);
  const byCode = Object.fromEntries(catalog.map((c) => [c.code, c]));
  const selected = (input.selected || []).map((s) => {
    const line = byCode[s.code]; if (!line) return null;
    return { ...line, std_label: stdLabel(line), agreed_price: agreedAmount(line, s.agreed_price) };
  }).filter(Boolean);

  const professional = selected.reduce((s, l) => s + Number(l.agreed_price || 0), 0);
  const third_party = Number(input.third_party_costs || 0);
  const admin = Number(input.admin_charges || 0);
  const discount = Number(input.discount || 0);

  // Commission / success fee — percent of the purchase/sale price OR a fixed
  // amount (Schedule C row RPPS-013 / RPSS-013). Flows into the total, the
  // payment schedule, the terms (for invoice drafting) and the fees report.
  const cm = input.commission || {};
  const commission_mode = cm.mode === 'fixed' ? 'fixed' : 'percent';
  const commission_base = Number(cm.base_price || 0);
  const commission_percent = Number(cm.percent || 0);
  const commission = commission_mode === 'fixed'
    ? Math.round(Number(cm.amount || 0))
    : Math.round((commission_base * commission_percent) / 100);

  const preVat = professional + third_party + admin + commission - discount;
  const vat = Math.round((preVat * Number(input.vat_percent || 0)) / 100);
  const total = preVat + vat;

  const summary = {
    professional_service_fees: professional, coordination_fees: 0,
    third_party_costs: third_party, administrative_charges: admin,
    commission, commission_mode, commission_percent, commission_base,
    discount, vat_percent: Number(input.vat_percent || 0), vat, total_contract_value: total,
  };
  const payment_schedule = input.payment_overrides || [
    { stage: 'Deposit (on acceptance)', amount: Math.round(professional * 0.5), due: 'On acceptance' },
    { stage: 'Balance of professional fees', amount: professional - Math.round(professional * 0.5), due: 'On completion / settlement' },
    ...(commission > 0 ? [{ stage: 'Commission / Success Fee', amount: commission, due: 'On completion / settlement' }] : []),
    { stage: 'Other approved charges', amount: third_party + admin, due: 'As incurred' },
  ];
  return { lines: selected, summary, payment_schedule };
}

// ── HTML blocks ─────────────────────────────────────────────────────────
const kvTable = (rows) => `<table style="width:100%;border-collapse:collapse;margin:8px 0;">${rows.map(([k, v]) => `<tr><td style="padding:6px 10px;border:1px solid #d9dee6;background:#f6f8fb;width:38%;font-weight:600;font-size:12.5px;">${esc(k)}</td><td style="padding:6px 10px;border:1px solid #d9dee6;font-size:12.5px;">${v == null ? '__________' : esc(v)}</td></tr>`).join('')}</table>`;

function scheduleC(pricing) {
  const rows = pricing.lines.map((l) => `<tr>
    <td style="padding:6px 8px;border:1px solid #d9dee6;font-size:12px;">${esc(l.code)}</td>
    <td style="padding:6px 8px;border:1px solid #d9dee6;font-size:12px;">${esc(l.name)}</td>
    <td style="padding:6px 8px;border:1px solid #d9dee6;font-size:12px;">${esc(l.unit || '')}</td>
    <td style="padding:6px 8px;border:1px solid #d9dee6;font-size:12px;text-align:right;color:#6b7280;">${esc(l.std_label)}</td>
    <td style="padding:6px 8px;border:1px solid #d9dee6;font-size:12px;text-align:right;font-weight:700;">${l.price_type === 'included' ? 'Included' : l.price_type === 'percent' ? esc(l.price_label || 'As agreed') : money(l.agreed_price)}</td>
  </tr>`).join('');
  const s = pricing.summary;
  const commissionLabel = s.commission_mode === 'percent' && s.commission_percent
    ? `Professional Success Fee / Commission (${s.commission_percent}%)`
    : 'Professional Success Fee / Commission';
  const sumRows = [
    ['Professional Service Fees', money(s.professional_service_fees)],
    ['Coordination Fees', money(s.coordination_fees)],
    [commissionLabel, money(s.commission)],
    ['Third-Party Costs (if applicable)', money(s.third_party_costs)],
    ['Administrative Charges', money(s.administrative_charges)],
    ['Discount', '– ' + money(s.discount)],
    [`VAT (${s.vat_percent}%)`, money(s.vat)],
  ].map(([k, v]) => `<tr><td style="padding:5px 10px;border:1px solid #d9dee6;font-size:12.5px;">${k}</td><td style="padding:5px 10px;border:1px solid #d9dee6;font-size:12.5px;text-align:right;">${v}</td></tr>`).join('');
  const payRows = pricing.payment_schedule.map((p) => `<tr><td style="padding:5px 10px;border:1px solid #d9dee6;font-size:12.5px;">${esc(p.stage)}</td><td style="padding:5px 10px;border:1px solid #d9dee6;font-size:12.5px;text-align:right;">${money(p.amount)}</td><td style="padding:5px 10px;border:1px solid #d9dee6;font-size:12.5px;">${esc(p.due || '')}</td></tr>`).join('');

  return `
  <h2 id="sched-c" style="font-size:15px;color:#003768;margin:22px 0 6px;">SCHEDULE C — Standard Price Schedule (Standard vs Agreed)</h2>
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

// A grouped checkbox list (Schedule A services / Schedule D checklist). Every
// taxonomy item renders with a ticked box (☑, bold) when its label is in the
// selected set, otherwise an empty box (☐) — so the signed agreement shows
// exactly what was chosen.
function checkboxGroups(groups, selected) {
  const set = new Set((selected || []).map((s) => String(s).trim().toLowerCase()));
  return (groups || []).map(([group, items]) => `
    <div style="margin:12px 0 4px;font-weight:700;font-size:12.5px;color:#003768;">${esc(group)}</div>
    <div style="columns:2;column-gap:28px;font-size:12.5px;line-height:2;">
      ${items.map((it) => {
    const on = set.has(String(it).trim().toLowerCase());
    return `<div style="break-inside:avoid;">${on ? '☑' : '☐'} <span style="${on ? 'font-weight:700;color:#0f172a;' : 'color:#4b5563;'}">${esc(it)}</span></div>`;
  }).join('')}
    </div>`).join('');
}

const signSlot = (label) => `
  <div data-sign-anchor="${esc(label)}" style="margin-top:8px;">
    <div style="font-size:11px;color:#6b7280;">Signature</div>
    <div data-sign-field="signature" data-sign-party="${esc(label)}" style="height:46px;border-bottom:1px solid #333;margin:2px 0 6px;"></div>
    <div style="font-size:11px;color:#6b7280;">Date signed</div>
    <div data-sign-field="date_signed" data-sign-party="${esc(label)}" style="height:20px;border-bottom:1px solid #333;"></div>
  </div>`;

/**
 * Generic builder. `cfg` = { doc_no, version, title, party ('Buyer'|'Seller'),
 * clauses:[[title, htmlBody]] }. `data` = { effective_date, org, client{...},
 * property_type, services[], schedule_b{...}, pricing, checklist[] }.
 */
function buildAgreement(cfg, data = {}) {
  const org = data.org || {};
  const c = data.client || {};
  const b = data.schedule_b || {};
  const pricing = data.pricing || { lines: [], summary: {}, payment_schedule: [] };
  const CLAUSES = cfg.clauses;

  const toc = `
  <div style="border:1px solid #d9dee6;border-radius:10px;padding:14px 18px;margin:14px 0;background:#f8fafc;">
    <div style="font-weight:700;font-size:13px;color:#003768;margin-bottom:8px;">Table of Contents</div>
    <ol style="columns:2;column-gap:32px;margin:0;padding-left:18px;font-size:12.5px;line-height:1.9;list-style:none;">
      ${CLAUSES.map(([t], i) => `<li><a href="#cl-${i + 1}" style="color:#1e3a8a;text-decoration:none;">${esc(t)}</a></li>`).join('')}
      <li><a href="#sched-a" style="color:#1e3a8a;text-decoration:none;">Schedule A — Selected Services</a></li>
      <li><a href="#sched-b" style="color:#1e3a8a;text-decoration:none;">Schedule B — Engagement Summary</a></li>
      <li><a href="#sched-c" style="color:#1e3a8a;text-decoration:none;">Schedule C — Price Schedule</a></li>
      ${cfg.schedule_d ? `<li><a href="#sched-d" style="color:#1e3a8a;text-decoration:none;">${esc((cfg.schedule_d_title || 'Schedule D').replace(/^SCHEDULE /, 'Schedule '))}</a></li>` : ''}
    </ol>
  </div>`;

  const parties = `
  <p style="margin:14px 0 6px;">This Agreement is made on: <b>${or(data.effective_date)}</b></p>
  <div style="font-weight:700;color:#003768;margin-top:8px;">BETWEEN — SEVENTH SKY PRIVATE LIMITED</div>
  ${kvTable([['Trading Name', org.name || 'Seventh Sky Property Care'], ['Address', org.address], ['Phone', org.phone], ['Email', org.email], ['Represented by', org.represented_by], ['Position', org.position]])}
  <div style="font-weight:700;color:#003768;margin-top:8px;">AND — ${esc(cfg.client_heading || `${cfg.party} (Client)`)}</div>
  ${kvTable([['Full Name', c.full_name], ['National ID / Passport No.', c.nid], ['Current Address', c.property_address || c.address], ['Phone', c.phone], ['Email', c.email], ['Represented by (if applicable)', c.rep], ['Relationship / Position', c.rep_position]])}
  <p style="font-size:12px;color:#4b5563;margin:6px 0 0;">(${esc(cfg.client_footer || 'the Client')}.) Together referred to as "the Parties."</p>`;

  const clausesHtml = CLAUSES.map(([t, body], i) => `
    <div style="margin:16px 0;">
      <h2 id="cl-${i + 1}" style="font-size:14.5px;color:#003768;margin:0 0 4px;">${esc(t)}</h2>
      <div style="font-size:13px;">${body}</div>
    </div>`).join('');

  const schedA = `<h2 id="sched-a" style="font-size:15px;color:#003768;margin:22px 0 6px;">${esc(cfg.schedule_a_title || 'SCHEDULE A — Selected Services')}</h2>
    <p style="font-size:12px;color:#4b5563;margin:0 0 4px;">Only the services ticked below form part of this Agreement.</p>
    ${cfg.schedule_a ? checkboxGroups(cfg.schedule_a, data.services) : `<div style="font-size:12.5px;">${(data.services && data.services.length) ? esc(data.services.join(', ')) : 'As selected in Schedule C and the approved Work Order.'}</div>`}`;

  // Schedule B — summary field list is per-kind; values come from schedule_b +
  // the client/property context, with a computed selected-services string.
  const bValues = {
    ...b,
    client_name: c.full_name, property_address: c.property_address || b.property_address,
    property_type: data.property_type || b.property_type,
    selected_services_text: (data.services && data.services.length) ? data.services.join(', ') : null,
  };
  const schedB = `<h2 id="sched-b" style="font-size:15px;color:#003768;margin:22px 0 6px;">${esc(cfg.schedule_b_title || 'SCHEDULE B — Engagement Summary')}</h2>${kvTable(
    (cfg.schedule_b_fields || [['Client', 'client_name'], ['Special Requirements', 'special_requirements']]).map(([label, key]) => [label, bValues[key]]),
  )}`;
  const schedC = scheduleC(pricing);

  const schedD = cfg.schedule_d ? `<h2 id="sched-d" style="font-size:15px;color:#003768;margin:22px 0 6px;">${esc(cfg.schedule_d_title || 'SCHEDULE D — Checklist')}</h2>
    ${checkboxGroups(cfg.schedule_d, data.checklist)}` : '';

  const signatures = `
  <h2 style="font-size:15px;color:#003768;margin:26px 0 6px;">Signatures</h2>
  <table style="width:100%;margin-top:6px;"><tr>
    <td style="width:50%;vertical-align:top;padding-right:16px;"><div style="border-top:1px solid #333;padding-top:6px;font-size:12px;"><b>Seventh Sky Private Limited</b><br/>Name: ${or(org.represented_by)}<br/>Position: ${or(org.position)}${signSlot('Seventh Sky')}</div></td>
    <td style="width:50%;vertical-align:top;padding-left:16px;"><div style="border-top:1px solid #333;padding-top:6px;font-size:12px;"><b>Client (${esc(cfg.party)})</b><br/>Name: ${or(c.full_name)}${signSlot('Client')}</div></td>
  </tr></table>
  <table style="width:100%;margin-top:14px;"><tr>
    ${(data.witnesses || [{}, {}]).slice(0, 2).map((w, i) => `<td style="width:50%;vertical-align:top;padding:0 16px;"><div style="border-top:1px solid #333;padding-top:6px;font-size:12px;"><b>Witness ${i + 1}</b><br/>Name: ${or(w.name)}<br/>NID / Passport: ${or(w.nid)}${signSlot(`Witness ${i + 1}`)}</div></td>`).join('')}
  </tr></table>`;

  const html = `
  <div style="font-family: Georgia,'Times New Roman',serif;color:#1f2430;line-height:1.6;font-size:14px;max-width:820px;margin:0 auto;">
    <div style="text-align:center;border-bottom:3px double #003768;padding-bottom:12px;">
      <div style="font-size:20px;font-weight:bold;color:#003768;">Seventh Sky Residential Property Services</div>
      <div style="font-size:16px;font-weight:bold;margin-top:12px;text-transform:uppercase;">${esc(cfg.title)}</div>
      <div style="font-size:11px;color:#6b7280;margin-top:4px;">Document No: ${cfg.doc_no} · Version: ${cfg.version} · Effective Date: ${or(data.effective_date)}</div>
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
    doc_no: cfg.doc_no, version: cfg.version, party: cfg.party,
    selected_services: data.services || [], checklist: data.checklist || [], schedule_b: b,
    pricing_summary: pricing.summary, payment_schedule: pricing.payment_schedule,
    commission: pricing.summary.commission || 0,
    commission_mode: pricing.summary.commission_mode, commission_percent: pricing.summary.commission_percent,
    agreed_lines: pricing.lines.map((l) => ({ code: l.code, name: l.name, agreed_price: l.agreed_price, price_type: l.price_type })),
  };
  return { title: cfg.title, doc_no: cfg.doc_no, html, terms };
}

module.exports = { getCatalog, computePricing, buildAgreement, money, esc };
