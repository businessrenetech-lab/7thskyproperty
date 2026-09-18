// backend/services/salesAgreementRender.js
//
// Shared rendering + pricing for the property sales service agreements
// (RPPS / RPSS / CPPS / CPSS). Generalised to take a vertical (catalogue scope)
// and a kind config (clauses, doc no, party, schedules). Each build returns
// { title, doc_no, html, terms }.
//
// The document design matches the Property Management / Tenancy agreements — a
// dedicated cover page, a one-page Table of Contents, card-style schedules and a
// styled execution block — so every agreement window and PDF looks the same.
// The eSign anchors (data-sign-*) are preserved exactly, and multi-party
// (co-owner / co-buyer) signing still works.
const ServiceItem = require('../models/ServiceItem');

const money = (v) => '৳' + Number(v || 0).toLocaleString('en-US', { maximumFractionDigits: 0 });
const or = (v, f = '__________') => (v == null || v === '' ? f : v);
const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const cleanTitle = (t) => String(t || '').replace(/^\d{1,2}[A-Z]?\.\s*/, '').trim();

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

// ── HTML building blocks (Property Management design language) ────────────

// A rounded card key/value table (used for the parties and Schedule B).
const kvTable = (rows) => `
<div style="border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;background:#ffffff;box-shadow:0 1px 3px rgba(0,0,0,0.02);margin:8px 0;">
  <table style="width:100%;border-collapse:collapse;">
    ${rows.map(([k, v]) => `
      <tr style="border-bottom:1px solid #f1f5f9;">
        <td style="padding:9px 14px;background:#f8fafc;width:36%;font-weight:600;font-size:12px;color:#475569;border-right:1px solid #f1f5f9;">${esc(k)}</td>
        <td style="padding:9px 14px;font-size:12.5px;color:#0f172a;font-weight:500;">${v == null || v === '' ? '<span style="color:#94a3b8;">__________</span>' : esc(v)}</td>
      </tr>`).join('')}
  </table>
</div>`;

// A schedule section wrapper: navy badge + title.
const scheduleHead = (id, code, title) => `
  <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;">
    <span style="background:#012a4e;color:#fff;font-size:10px;font-weight:800;padding:2px 7px;border-radius:4px;letter-spacing:0.8px;">${esc(code)}</span>
    <h2 id="${id}" style="font-size:15px;color:#012a4e;font-weight:800;margin:0;">${esc(title)}</h2>
  </div>`;

function scheduleC(pricing) {
  const rows = pricing.lines.map((l) => `
    <tr style="border-bottom:1px solid #f1f5f9;">
      <td style="padding:9px 12px;font-size:11.5px;font-weight:700;color:#003768;">${esc(l.code)}</td>
      <td style="padding:9px 12px;font-size:12px;color:#1e293b;font-weight:600;">${esc(l.name)}</td>
      <td style="padding:9px 12px;font-size:11.5px;color:#64748b;">${esc(l.unit || '')}</td>
      <td style="padding:9px 12px;font-size:11.5px;text-align:right;color:#64748b;">${esc(l.std_label)}</td>
      <td style="padding:9px 12px;font-size:12px;text-align:right;font-weight:700;color:#0f172a;">${l.price_type === 'included' ? '<span style="display:inline-block;padding:2px 8px;border-radius:9999px;background:#e0f2fe;color:#0369a1;font-size:10.5px;font-weight:700;">Included</span>' : l.price_type === 'percent' ? esc(l.price_label || 'As agreed') : money(l.agreed_price)}</td>
    </tr>`).join('');
  const s = pricing.summary;
  const commissionLabel = s.commission_mode === 'percent' && s.commission_percent
    ? `Professional Success Fee / Commission (${s.commission_percent}%)`
    : 'Professional Success Fee / Commission';
  const sumRows = [
    ['Professional Service Fees', money(s.professional_service_fees)],
    [commissionLabel, money(s.commission)],
    ['Third-Party Costs (if applicable)', money(s.third_party_costs)],
    ['Administrative Charges', money(s.administrative_charges)],
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
    ${scheduleHead('sched-c', 'SCHEDULE C', 'Price Schedule (Standard vs Agreed)')}
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

// Grouped checkbox card list (Schedule A services / Schedule D checklist). Every
// taxonomy item renders selected (navy tick + highlighted chip) or not.
function checkboxGroups(id, code, title, groups, selected) {
  const set = new Set((selected || []).map((s) => String(s).trim().toLowerCase()));
  const body = (groups || []).map(([g, items]) => `
    <div style="background:#ffffff;border:1px solid #e2e8f0;border-radius:12px;padding:12px 16px;margin-bottom:10px;box-shadow:0 1px 2px rgba(0,0,0,0.02);">
      <div style="margin:0 0 8px;font-weight:700;font-size:11.5px;color:#003768;text-transform:uppercase;letter-spacing:0.5px;display:flex;align-items:center;gap:6px;">
        <span style="width:5px;height:5px;border-radius:50%;background:#00AEEF;"></span>${esc(g)}
      </div>
      <div style="display:flex;flex-wrap:wrap;gap:6px 14px;">
        ${items.map((it) => {
    const on = set.has(String(it).trim().toLowerCase());
    const box = on
      ? '<span style="display:inline-block;width:13px;height:13px;border:1.5px solid #003768;background:#003768;color:#fff;text-align:center;line-height:12px;font-size:11px;font-weight:700;vertical-align:middle;margin-right:6px;">&#10003;</span>'
      : '<span style="display:inline-block;width:13px;height:13px;border:1.5px solid #9aa4b2;background:#fff;vertical-align:middle;margin-right:6px;"></span>';
    return `<span style="font-size:11.5px;display:inline-flex;align-items:center;padding:3px 7px;border-radius:6px;${on ? 'background:#f0f9ff;font-weight:700;color:#0f172a;border:1px solid #bae6fd;' : 'color:#475569;background:#f8fafc;border:1px solid #f1f5f9;'}">${box}${esc(it)}</span>`;
  }).join('')}
      </div>
    </div>`).join('');
  return `<div style="margin:26px 0 16px;">${scheduleHead(id, code, title)}${body}</div>`;
}

// Signature slot — anchors match the SignatureField labels so a captured
// signature lands in its own box. Preserved exactly from the eSign contract.
const signSlot = (label) => `
  <div data-sign-anchor="${esc(label)}" style="margin-top:8px;">
    <div style="font-size:10.5px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;">Signature</div>
    <div data-sign-field="signature" data-sign-party="${esc(label)}"
         style="min-height:46px;border-bottom:1.5px solid #0f2942;margin:2px 0 6px;display:flex;align-items:flex-end;"></div>
    <div style="font-size:10.5px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;">Date signed</div>
    <div data-sign-field="date_signed" data-sign-party="${esc(label)}"
         style="min-height:20px;border-bottom:1.5px solid #0f2942;display:flex;align-items:flex-end;"></div>
  </div>`;

/**
 * Generic builder. `cfg` = { doc_no, version, title, header_label, party,
 * client_heading, client_footer, clauses:[[title, htmlBody]], schedule_a,
 * schedule_b_fields, schedule_d, schedule_*_title }. `data` = { effective_date,
 * org, client{...}/clients[], property_type, services[], schedule_b{...},
 * pricing, checklist[], witnesses[] }.
 */
function buildAgreement(cfg, data = {}) {
  const org = data.org || {};
  const c = data.client || {};
  const b = data.schedule_b || {};
  const pricing = data.pricing || { lines: [], summary: {}, payment_schedule: [] };
  const CLAUSES = cfg.clauses || [];
  const nClauses = CLAUSES.length;
  const partyWord = cfg.party || 'Client';
  const headerLabel = cfg.header_label || 'Seventh Sky Residential Property Services';
  const tagline = headerLabel.replace(/^Seventh Sky\s*/i, '') || 'Property Services';

  // Multiple co-owners (vendors) or co-buyers, each of whom must sign.
  const clients = (Array.isArray(data.clients) && data.clients.length) ? data.clients : [c];
  const multiParty = clients.length > 1;
  const clientAnchor = (i) => (multiParty ? `Client ${i + 1}` : 'Client');
  const clientHeading = (i) => (multiParty ? `${partyWord.toUpperCase()} ${i + 1}` : (cfg.client_heading || `${partyWord} (Client)`));
  const primary = clients[0] || c;

  // ── 1. Cover page ─────────────────────────────────────────────────────────
  const coverPage = `
  <div class="agreement-page agreement-cover-page" style="box-sizing:border-box;min-height:760px;max-height:920px;page-break-after:always;break-after:page;display:flex;flex-direction:column;justify-content:space-between;padding:32px 44px 24px;background:#ffffff;border-bottom:2px solid #e2e8f0;">
    <div>
      <div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:1.5px solid #012a4e;padding-bottom:18px;">
        <div style="display:flex;align-items:center;gap:12px;">
          <div style="width:42px;height:42px;border-radius:10px;background:linear-gradient(135deg,#012a4e 0%,#003768 50%,#00AEEF 100%);display:flex;align-items:center;justify-content:center;color:#ffffff;font-weight:800;font-size:19px;letter-spacing:-0.5px;box-shadow:0 3px 10px rgba(1,42,78,0.18);">7S</div>
          <div>
            <div style="font-size:15px;font-weight:800;color:#012a4e;letter-spacing:0.8px;text-transform:uppercase;">Seventh Sky Property Care</div>
            <div style="font-size:10.5px;font-weight:600;color:#00AEEF;letter-spacing:1px;text-transform:uppercase;">${esc(tagline)}</div>
          </div>
        </div>
        <div style="text-align:right;">
          <span style="display:inline-block;padding:3px 10px;border-radius:9999px;background:#e0f2fe;color:#0369a1;font-size:10.5px;font-weight:700;border:1px solid #bae6fd;">STANDARD SERVICE AGREEMENT</span>
          <div style="font-size:10.5px;color:#64748b;margin-top:3px;font-weight:500;">DOC REF: ${esc(cfg.doc_no)} · v${esc(cfg.version || '0.2')}</div>
        </div>
      </div>
      <div style="margin-top:80px;">
        <div style="display:inline-flex;align-items:center;gap:8px;font-size:11.5px;font-weight:700;color:#00AEEF;text-transform:uppercase;letter-spacing:2px;margin-bottom:14px;">
          <span style="width:20px;height:2px;background:#00AEEF;display:inline-block;"></span>Property Advisory &amp; Transaction Services
        </div>
        <h1 style="font-size:32px;font-weight:800;color:#012a4e;line-height:1.2;margin:0 0 16px;letter-spacing:-0.6px;">${esc(cfg.title)}</h1>
        <div style="width:70px;height:4px;background:linear-gradient(90deg,#012a4e,#00AEEF);border-radius:2px;margin-bottom:20px;"></div>
        <p style="font-size:13.5px;color:#475569;line-height:1.65;max-width:580px;margin:0;">
          The terms under which Seventh Sky provides the agreed property services, setting out scope, fees, coordination standards and execution between Seventh Sky Property Care and the ${esc(partyWord)}.
        </p>
      </div>
    </div>
    <div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-bottom:24px;">
        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:16px 18px;box-shadow:0 1px 3px rgba(0,0,0,0.02);">
          <div style="font-size:10.5px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;color:#00AEEF;margin-bottom:8px;display:flex;align-items:center;gap:6px;"><span style="width:6px;height:6px;border-radius:50%;background:#00AEEF;"></span>Prepared For · ${esc(cfg.client_heading || `${partyWord} (Client)`)}</div>
          <div style="font-size:14px;font-weight:700;color:#0f172a;margin-bottom:4px;">${or(primary.full_name)}${multiParty ? ` <span style="font-size:11px;color:#64748b;font-weight:500;">(+${clients.length - 1} co-${partyWord.toLowerCase()})</span>` : ''}</div>
          <div style="font-size:11.5px;color:#475569;line-height:1.5;">
            <div><strong>Address:</strong> ${or(primary.property_address || primary.address)}</div>
            <div><strong>NID / Passport:</strong> ${or(primary.nid)}</div>
            <div><strong>Contact:</strong> ${or(primary.phone)} · ${or(primary.email)}</div>
          </div>
        </div>
        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:16px 18px;box-shadow:0 1px 3px rgba(0,0,0,0.02);">
          <div style="font-size:10.5px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;color:#012a4e;margin-bottom:8px;display:flex;align-items:center;gap:6px;"><span style="width:6px;height:6px;border-radius:50%;background:#012a4e;"></span>Service Provider</div>
          <div style="font-size:14px;font-weight:700;color:#0f172a;margin-bottom:4px;">${esc(org.name || 'Seventh Sky Private Limited')}</div>
          <div style="font-size:11.5px;color:#475569;line-height:1.5;">
            <div><strong>Represented By:</strong> ${or(org.represented_by, 'Authorized Signatory')}</div>
            <div><strong>Position:</strong> ${or(org.position, 'Sales & Acquisition Director')}</div>
            <div><strong>Contact:</strong> ${or(org.phone)} · ${or(org.email)}</div>
            <div><strong>Jurisdiction:</strong> Dhaka, People's Republic of Bangladesh</div>
          </div>
        </div>
      </div>
      <div style="border-top:1px solid #e2e8f0;padding-top:14px;display:flex;justify-content:space-between;align-items:center;font-size:11px;color:#64748b;">
        <div>Effective Date: <strong style="color:#0f172a;">${or(data.effective_date)}</strong> · Governing Law: <strong style="color:#0f172a;">Laws of Bangladesh</strong></div>
        <div style="display:flex;align-items:center;gap:6px;"><span style="display:inline-block;width:6px;height:6px;background:#10b981;border-radius:50%;"></span><span>Electronic Signature &amp; SHA-256 Audit Trail Protected</span></div>
      </div>
    </div>
  </div>`;

  // ── 2. Dedicated Table of Contents (Page 2) ───────────────────────────────
  const half = Math.ceil(nClauses / 2);
  const tocClause = ([t], i) => `
    <div style="display:flex;justify-content:space-between;align-items:baseline;padding:2px 0;">
      <a href="#cl-${i + 1}" style="color:#1e293b;text-decoration:none;font-size:11px;font-weight:500;display:inline-flex;align-items:center;gap:5px;">
        <span style="color:#00AEEF;font-weight:700;">${String(i + 1).padStart(2, '0')}.</span><span>${esc(cleanTitle(t))}</span>
      </a>
      <span style="flex:1;border-bottom:1px dotted #cbd5e1;margin:0 6px;"></span>
      <span style="font-size:10px;color:#94a3b8;font-weight:600;">§${i + 1}</span>
    </div>`;
  const schedLink = (id, letter, label, tag) => `
    <div style="display:flex;justify-content:space-between;align-items:baseline;padding:2px 0;">
      <a href="#${id}" style="color:#1e293b;text-decoration:none;font-size:11px;font-weight:600;"><span style="color:#00AEEF;">${letter}.</span> ${esc(label)}</a>
      <span style="flex:1;border-bottom:1px dotted #cbd5e1;margin:0 6px;"></span>
      <span style="font-size:10px;color:#94a3b8;font-weight:600;">${esc(tag)}</span>
    </div>`;
  const tocPage = `
  <div class="agreement-page agreement-toc-page" style="box-sizing:border-box;min-height:760px;max-height:920px;page-break-after:always;break-after:page;padding:28px 44px 20px;background:#ffffff;border-bottom:2px solid #e2e8f0;display:flex;flex-direction:column;justify-content:space-between;">
    <div>
      <div style="display:flex;justify-content:space-between;align-items:flex-end;border-bottom:2px solid #012a4e;padding-bottom:12px;margin-bottom:20px;">
        <div>
          <div style="font-size:10.5px;font-weight:700;color:#00AEEF;letter-spacing:1.2px;text-transform:uppercase;">Document Roadmap</div>
          <h2 style="font-size:22px;font-weight:800;color:#012a4e;margin:2px 0 0;">Table of Contents</h2>
        </div>
        <span style="display:inline-block;padding:3px 10px;border-radius:9999px;background:#f1f5f9;color:#334155;font-size:10.5px;font-weight:700;border:1px solid #e2e8f0;">${nClauses} CLAUSES · 4 SCHEDULES</span>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;column-gap:28px;align-items:start;">
        <div>${CLAUSES.slice(0, half).map((cl, i) => tocClause(cl, i)).join('')}</div>
        <div>
          ${CLAUSES.slice(half).map((cl, i) => tocClause(cl, half + i)).join('')}
          <div style="margin-top:8px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:8px 12px;">
            <div style="font-size:10px;font-weight:800;color:#012a4e;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:4px;border-bottom:1px solid #e2e8f0;padding-bottom:2px;">Schedules &amp; Signatures</div>
            ${schedLink('sched-a', 'A', 'Schedule A — Selected Services', 'Scope')}
            ${schedLink('sched-b', 'B', 'Schedule B — Engagement Summary', 'Details')}
            ${schedLink('sched-c', 'C', 'Schedule C — Price Schedule', 'Pricing')}
            ${schedLink('sched-d', 'D', 'Schedule D — Checklist', 'Checklist')}
            <div style="display:flex;justify-content:space-between;align-items:baseline;padding:2px 0;margin-top:2px;">
              <a href="#signatures-section" style="color:#012a4e;text-decoration:none;font-size:11px;font-weight:700;"><span style="color:#10b981;">✓</span> Execution Block — Signatures</a>
              <span style="flex:1;border-bottom:1px dotted #cbd5e1;margin:0 6px;"></span>
              <span style="font-size:10px;color:#10b981;font-weight:700;">Attest</span>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div style="border-top:1px dashed #cbd5e1;padding-top:10px;display:flex;justify-content:space-between;font-size:10.5px;color:#64748b;">
      <span>Document: ${esc(cfg.doc_no)}</span><span>Page 2 · Table of Contents</span>
    </div>
  </div>`;

  // ── 3. Body ───────────────────────────────────────────────────────────────
  const clientPartyBlocks = clients.map((cl, i) => `
    <div style="font-size:11px;font-weight:800;color:#00AEEF;text-transform:uppercase;letter-spacing:0.8px;margin:12px 0 4px;">${i === 0 ? 'AND — ' : ''}${esc(clientHeading(i))}</div>
    ${kvTable([['Full Name', cl.full_name], ['National ID / Passport No.', cl.nid], ['Address', cl.property_address || cl.address], ['Phone', cl.phone], ['Email', cl.email], ['Represented by (if applicable)', cl.rep], ['Relationship / Position', cl.rep_position]])}`).join('');

  const parties = `
  <div style="margin:8px 0 16px;">
    <p style="margin:0 0 10px;font-size:13px;color:#334155;">This Agreement is made on: <b style="color:#012a4e;">${or(data.effective_date)}</b></p>
    <div style="font-size:11px;font-weight:800;color:#00AEEF;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:4px;">BETWEEN — SEVENTH SKY PRIVATE LIMITED</div>
    ${kvTable([['Trading Name', org.name || 'Seventh Sky Property Care'], ['Address', org.address], ['Phone', org.phone], ['Email', org.email], ['Represented by', org.represented_by], ['Position', org.position]])}
    ${clientPartyBlocks}
    <p style="font-size:11.5px;color:#64748b;margin:6px 0 0;">(${esc(cfg.client_footer || 'the Client')}${multiParty ? ', jointly and severally' : ''}.) Together referred to as "the Parties."</p>
  </div>`;

  const clausesHtml = CLAUSES.map(([t, body], i) => `
    <div style="margin:14px 0;padding:12px 16px;border:1px solid #f1f5f9;border-radius:10px;background:#ffffff;box-shadow:0 1px 2px rgba(0,0,0,0.01);">
      <h2 id="cl-${i + 1}" style="font-size:13.5px;color:#012a4e;font-weight:800;margin:0 0 6px;display:flex;align-items:center;gap:8px;">
        <span style="display:inline-block;background:#e0f2fe;color:#0369a1;font-size:10.5px;font-weight:800;padding:2px 6px;border-radius:4px;border:1px solid #bae6fd;">${String(i + 1).padStart(2, '0')}</span>${esc(cleanTitle(t))}
      </h2>
      <div style="font-size:12.5px;color:#334155;line-height:1.65;">${body}</div>
    </div>`).join('');

  const schedA = cfg.schedule_a
    ? checkboxGroups('sched-a', 'SCHEDULE A', cfg.schedule_a_title || 'SCHEDULE A — Selected Services', cfg.schedule_a, data.services)
    : `<div style="margin:26px 0 16px;">${scheduleHead('sched-a', 'SCHEDULE A', cfg.schedule_a_title || 'SCHEDULE A — Selected Services')}<div style="font-size:12.5px;color:#334155;">${(data.services && data.services.length) ? esc(data.services.join(', ')) : 'As selected in Schedule C and the approved Work Order.'}</div></div>`;

  const bValues = {
    ...b,
    client_name: clients.map((cl) => cl.full_name).filter(Boolean).join(' & ') || c.full_name,
    property_address: (clients[0] || c).property_address || b.property_address,
    property_type: data.property_type || b.property_type,
    preferred_location: b.preferred_location || b.property_address || '',
    budget_range: b.budget_range || (b.target_value ? `${b.target_value} BDT` : ''),
    finance_method: b.finance_method || '',
    intended_use: b.intended_use || '',
    expected_date: b.expected_date || b.timeframe || '',
    selected_services_text: (data.services && data.services.length) ? data.services.join(', ') : null,
  };
  const schedB = `<div style="margin:26px 0 16px;">${scheduleHead('sched-b', 'SCHEDULE B', cfg.schedule_b_title || 'SCHEDULE B — Engagement Summary')}${kvTable(
    (cfg.schedule_b_fields || [['Client', 'client_name'], ['Special Requirements', 'special_requirements']]).map(([label, key]) => [label, bValues[key]]),
  )}</div>`;
  const schedC = scheduleC(pricing);
  const schedD = cfg.schedule_d
    ? checkboxGroups('sched-d', 'SCHEDULE D', cfg.schedule_d_title || 'SCHEDULE D — Checklist', cfg.schedule_d, data.checklist)
    : `<div style="margin:26px 0 16px;">${scheduleHead('sched-d', 'SCHEDULE D', cfg.schedule_d_title || 'SCHEDULE D — Checklist')}</div>`;

  // Execution block — Seventh Sky, then one card per client, then witnesses.
  const partyCard = (eyebrow, name, sub, anchor) => `
    <div style="background:#ffffff;border:1.5px solid #cbd5e1;border-radius:12px;padding:16px;box-shadow:0 1px 3px rgba(0,0,0,0.03);">
      <div style="font-size:10.5px;font-weight:700;color:#00AEEF;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:4px;">${esc(eyebrow)}</div>
      <div style="font-size:13.5px;font-weight:800;color:#012a4e;">${esc(name)}</div>
      ${sub}
      ${signSlot(anchor)}
    </div>`;
  const ssCard = partyCard('Service Provider', org.name || 'Seventh Sky Private Limited',
    `<div style="font-size:11.5px;color:#475569;margin-top:2px;">Name: <strong>${or(org.represented_by)}</strong></div><div style="font-size:11.5px;color:#475569;">Position: <strong>${or(org.position)}</strong></div>${org.email ? `<div style="font-size:11px;color:#64748b;">Email: ${esc(org.email)}</div>` : ''}`, 'Seventh Sky');
  const clientCards = clients.map((cl, i) => partyCard(
    multiParty ? `${partyWord} ${i + 1}` : `${partyWord} (Client)`,
    or(cl.full_name),
    `<div style="font-size:11.5px;color:#475569;margin-top:2px;">NID / Passport: <strong>${or(cl.nid)}</strong></div>`,
    clientAnchor(i)));
  const execCards = [ssCard, ...clientCards];
  const execRows = [];
  for (let i = 0; i < execCards.length; i += 2) {
    execRows.push(`<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:${i === 0 ? '0' : '14px'};">${execCards[i]}${execCards[i + 1] || '<div></div>'}</div>`);
  }
  const signatures = `
  <div id="signatures-section" style="margin-top:24px;page-break-inside:avoid;break-inside:avoid;">
    <h2 style="font-size:16px;color:#012a4e;font-weight:800;margin:0 0 12px;">Signatures</h2>
    ${execRows.join('')}
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:14px;">
      ${(data.witnesses || [{}, {}]).slice(0, 2).map((w, i) => `
        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:14px;">
          <div style="font-size:10.5px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:4px;">Witness Attestation</div>
          <div style="font-size:13px;font-weight:800;color:#012a4e;">Witness ${i + 1}</div>
          <div style="font-size:11.5px;color:#475569;margin-top:2px;">Name: <strong>${or(w.name)}</strong></div>
          <div style="font-size:11.5px;color:#475569;">NID / Passport: <strong>${or(w.nid)}</strong></div>
          ${signSlot(`Witness ${i + 1}`)}
        </div>`).join('')}
    </div>
  </div>`;

  const html = `
  <div class="sales-doc" style="font-family:'Plus Jakarta Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1e293b;line-height:1.65;font-size:13.5px;max-width:840px;margin:0 auto;background:#ffffff;">
    <style>
      @media print {
        body { background:#fff !important; padding:0 !important; }
        .sales-doc { max-width:100% !important; margin:0 !important; }
        .agreement-cover-page { min-height:auto !important; max-height:none !important; page-break-after:always !important; break-after:page !important; }
        .agreement-toc-page { min-height:auto !important; max-height:none !important; page-break-after:always !important; break-after:page !important; }
        .no-break { page-break-inside:avoid !important; break-inside:avoid !important; }
      }
      .sales-doc a:hover { color:#00AEEF !important; }
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
        This Agreement becomes effective when signed by all Parties through the Seventh Sky electronic signing system. The electronic record, audit trail and content hash constitute proof of execution.
      </div>
      ${signatures}
    </div>
  </div>`;

  const terms = {
    doc_no: cfg.doc_no, version: cfg.version, party: cfg.party,
    effective_date: data.effective_date,
    property_id: data.property_id,
    property_type: data.property_type,
    client: data.client || (data.clients && data.clients[0]) || {},
    clients: data.clients || (data.client ? [data.client] : []),
    additional_clients: data.additional_clients || [],
    org: data.org || {},
    witnesses: data.witnesses || [],
    pricing_input: data.pricing_input || {},
    services: data.services || [],
    selected_services: data.services || [],
    checklist: data.checklist || [],
    schedule_b: b,
    pricing_summary: pricing.summary,
    payment_schedule: pricing.payment_schedule,
    commission: pricing.summary.commission || 0,
    commission_mode: pricing.summary.commission_mode,
    commission_percent: pricing.summary.commission_percent,
    agreed_lines: pricing.lines.map((l) => ({ code: l.code, name: l.name, agreed_price: l.agreed_price, price_type: l.price_type })),
  };
  return { title: cfg.title, doc_no: cfg.doc_no, html, terms, pricing };
}

module.exports = { getCatalog, computePricing, buildAgreement, money, esc };
