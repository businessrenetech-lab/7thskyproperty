/**
 * wtWorkOrderPdf.service.js
 * ------------------------------------------------------------------
 * Server-rendered branded PDFs for the Water Tank Project Work Order.
 *
 * The interactive screens convert the document HTML in the browser with html2pdf,
 * but the post-signature emails fire from the signing callback where no browser
 * exists — so these are drawn directly with pdfkit, using the same brand marks
 * (navy #003768, cyan rule, document number block) as the HTML deed.
 *
 * Two documents are produced:
 *   buildWorkOrderPdf   — the Project Work Order itself (Sections 1–10)
 *   buildExecutionPdf   — the signature/execution certificate for a completed envelope
 */
const PDFDocument = require('pdfkit');
const doc0 = require('./wtWorkOrderDoc.service');

const NAVY = '#003768';
const CYAN = '#12b6f3';
const INK = '#1f2430';
const MUTED = '#6b7280';
const LINE = '#d9dee6';

const num = (v) => (v == null || v === '' || Number.isNaN(Number(v)) ? 0 : Number(v));
const money = (v) => Number(num(v)).toLocaleString('en-BD', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
const txt = (v, fallback = '—') => (v == null || v === '' ? fallback : String(v));
const asArray = (v) => { if (Array.isArray(v)) return v; if (!v) return []; try { const p = JSON.parse(v); return Array.isArray(p) ? p : []; } catch { return []; } };
const asObject = (v) => { if (!v) return {}; if (typeof v === 'object' && !Array.isArray(v)) return v; try { const p = JSON.parse(v); return p && typeof p === 'object' ? p : {}; } catch { return {}; } };
const dateText = (v) => (v ? new Date(v).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');

const M = 48;                       // page margin
const W = 595.28 - M * 2;           // A4 content width

function render(build) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: M, bufferPages: true });
    const chunks = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
    try { build(doc); } catch (e) { reject(e); return; }
    addPageNumbers(doc);
    doc.end();
  });
}

function addPageNumbers(doc) {
  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i += 1) {
    doc.switchToPage(i);
    doc.fontSize(7.5).fillColor(MUTED).font('Helvetica')
      .text(`Water Tank C & M — Project Work Order  ·  V0.2  ·  © Seventh Sky Pty Ltd  ·  Page ${i - range.start + 1} of ${range.count}`,
        M, 800, { width: W, align: 'center' });
  }
}

function letterhead(doc, title, subtitle, meta) {
  doc.fontSize(16).fillColor(NAVY).font('Helvetica-Bold').text('Seventh Sky Property Care', M, M, { width: W, align: 'center' });
  doc.fontSize(9).fillColor(CYAN).font('Helvetica-Bold').text('WATER TANK CLEANING & MAINTENANCE', { width: W, align: 'center' });
  doc.moveDown(0.5);
  doc.fontSize(13).fillColor(INK).font('Helvetica-Bold').text(String(title).toUpperCase(), { width: W, align: 'center' });
  if (subtitle) doc.fontSize(8.5).fillColor('#4b5563').font('Helvetica').text(subtitle, { width: W, align: 'center' });
  if (meta) doc.fontSize(8).fillColor(MUTED).font('Helvetica').text(meta, { width: W, align: 'center' });
  doc.moveDown(0.4);
  const y = doc.y;
  doc.moveTo(M, y).lineTo(M + W, y).lineWidth(2).strokeColor(NAVY).stroke();
  doc.moveTo(M, y + 3).lineTo(M + W, y + 3).lineWidth(0.7).strokeColor(CYAN).stroke();
  doc.y = y + 14;
  doc.lineWidth(1);
}

function space(doc, height) {
  if (doc.y + height > 770) { doc.addPage(); doc.y = M; }
}

function heading(doc, label) {
  space(doc, 46);
  doc.moveDown(0.5);
  doc.fontSize(10.5).fillColor(NAVY).font('Helvetica-Bold').text(label, M, doc.y, { width: W });
  doc.moveDown(0.25);
}

function subheading(doc, label) {
  space(doc, 30);
  doc.fontSize(8.8).fillColor('#334155').font('Helvetica-Bold').text(label, M, doc.y, { width: W });
  doc.moveDown(0.15);
}

function paragraph(doc, value) {
  space(doc, 26);
  doc.fontSize(8.8).fillColor(INK).font('Helvetica').text(txt(value), M, doc.y, { width: W, align: 'left' });
  doc.moveDown(0.3);
}

/** Two-column key/value block used for Sections 1, 2, 4, 7. */
function keyValues(doc, rows) {
  const labelW = W * 0.38;
  rows.forEach(([label, value]) => {
    const text = txt(value, '__________');
    const h = Math.max(doc.heightOfString(text, { width: W - labelW - 16 }), 11) + 7;
    space(doc, h);
    const y = doc.y;
    doc.rect(M, y, labelW, h).fillColor('#f6f8fb').fill();
    doc.rect(M, y, W, h).lineWidth(0.5).strokeColor(LINE).stroke();
    doc.moveTo(M + labelW, y).lineTo(M + labelW, y + h).strokeColor(LINE).stroke();
    doc.fontSize(8.3).fillColor(INK).font('Helvetica-Bold').text(label, M + 6, y + 4, { width: labelW - 12 });
    doc.fontSize(8.3).fillColor(INK).font('Helvetica').text(text, M + labelW + 8, y + 4, { width: W - labelW - 16 });
    doc.y = y + h;
  });
  doc.moveDown(0.4);
}

/** Bordered data table with an optional right-aligned numeric tail. */
function table(doc, columns, rows, emptyText) {
  if (!rows.length) {
    doc.fontSize(8.3).fillColor('#9aa4b2').font('Helvetica-Oblique').text(emptyText, M, doc.y, { width: W });
    doc.moveDown(0.4);
    doc.font('Helvetica');
    return;
  }
  const widths = columns.map((c) => W * c.w);
  const drawRow = (cells, opts = {}) => {
    const heights = cells.map((c, i) => doc.heightOfString(String(c == null ? '' : c), { width: widths[i] - 10 }));
    const h = Math.max(...heights, 10) + 6;
    space(doc, h);
    const y = doc.y;
    if (opts.head) { doc.rect(M, y, W, h).fillColor('#eef3f8').fill(); }
    else if (opts.total) { doc.rect(M, y, W, h).fillColor('#eef3f8').fill(); }
    let x = M;
    cells.forEach((c, i) => {
      doc.rect(x, y, widths[i], h).lineWidth(0.5).strokeColor(LINE).stroke();
      doc.fontSize(opts.head ? 7.6 : 8.2)
        .fillColor(opts.muted && i === opts.muted ? MUTED : INK)
        .font(opts.head || opts.total ? 'Helvetica-Bold' : 'Helvetica')
        .text(String(c == null ? '' : c), x + 5, y + 3.5, { width: widths[i] - 10, align: columns[i].right ? 'right' : 'left' });
      x += widths[i];
    });
    doc.y = y + h;
  };
  drawRow(columns.map((c) => c.label), { head: true });
  rows.forEach((r) => drawRow(r.cells, { total: r.total }));
  doc.moveDown(0.4);
  doc.font('Helvetica');
}

/** Checkbox grid — ☑ / ☐ are not in the standard PDF fonts, so draw boxes. */
function checkGrid(doc, options, selectedSet, columns = 3) {
  const colW = W / columns;
  let i = 0;
  while (i < options.length) {
    const row = options.slice(i, i + columns);
    const h = 13;
    space(doc, h);
    const y = doc.y;
    row.forEach((option, c) => {
      const x = M + c * colW;
      const on = selectedSet.has(String(option).toLowerCase());
      doc.rect(x, y + 2, 7, 7).lineWidth(0.6).strokeColor(on ? NAVY : '#94a3b8').stroke();
      if (on) {
        doc.moveTo(x + 1.4, y + 5.6).lineTo(x + 3, y + 7.4).lineTo(x + 5.7, y + 3.4)
          .lineWidth(1.1).strokeColor(NAVY).stroke();
      }
      doc.fontSize(8).fillColor(on ? INK : '#64748b').font(on ? 'Helvetica-Bold' : 'Helvetica')
        .text(String(option), x + 12, y + 2.2, { width: colW - 16, ellipsis: true });
    });
    doc.y = y + h;
    i += columns;
  }
  doc.moveDown(0.35);
  doc.font('Helvetica');
}

/* ── the Project Work Order ─────────────────────────────────────────── */

async function buildWorkOrderPdf(wo, extra = {}) {
  const provider = extra.provider || {};
  const org = extra.org || {};
  const summary = doc0.computeTotals(wo);
  const schedule = doc0.computePaymentSchedule(wo, summary.total);
  const selections = asObject(wo.service_selections);
  const tank = asObject(wo.tank_details);
  const timeline = asObject(wo.timeline_dates);
  const warranty = asObject(wo.warranty_terms);
  const checklist = asObject(wo.project_checklist);

  return render((doc) => {
    letterhead(doc, 'Project Work Order', '(Under Service Delivery Provider Master Agreement)',
      `Document No: SSPC-WTCM-PWO-01  ·  Version: 0.2  ·  Effective Date: ${dateText(wo.date_issued)}`);

    heading(doc, 'Section 1 — Project Information');
    keyValues(doc, [
      ['Work Order No.', wo.code], ['Quotation No.', wo.quotation_no], ['Project No.', wo.project_id],
      ['Agreement Reference', wo.agreement_reference], ['Date Issued', wo.date_issued ? dateText(wo.date_issued) : null],
      ['Project Manager', wo.project_manager], ['Assigned Service Provider', wo.provider_name || provider.business_name],
    ]);

    heading(doc, 'Section 2 — Client Details');
    keyValues(doc, [
      ['Client Name', wo.client_name], ['Company (if applicable)', wo.client_company],
      ['Contact Person', wo.client_contact_person], ['Phone', wo.client_phone], ['Email', wo.client_email],
      ['Service Address', wo.site_address],
    ]);
    subheading(doc, 'Property Type');
    checkGrid(doc, doc0.PROPERTY_TYPES, new Set([String(wo.property_type || '').toLowerCase()]), 4);

    heading(doc, 'Section 3 — Services Requested');
    Object.entries(doc0.SERVICE_GROUPS).forEach(([group, options]) => {
      const chosen = new Set(asArray(selections[group]).map((v) => String(v).toLowerCase()));
      subheading(doc, group);
      checkGrid(doc, options, chosen, 3);
    });

    heading(doc, 'Section 4 — Tank Details');
    keyValues(doc, doc0.TANK_FIELDS.map(([key, label]) => [label, tank[key]]));

    heading(doc, 'Section 5 — Scope of Work');
    subheading(doc, 'Description');
    paragraph(doc, wo.scope || '__________');
    subheading(doc, 'Expected Deliverables');
    paragraph(doc, wo.deliverables || '__________');

    heading(doc, 'Section 6 — Materials & Equipment');
    [['Materials Required', wo.materials_required, 'No materials recorded.'],
      ['Chemicals Required', wo.chemicals_required, 'No chemicals recorded.'],
      ['Equipment Required', wo.equipment_required, 'No equipment recorded.']].forEach(([label, list, empty]) => {
      subheading(doc, label);
      table(doc, [{ label: 'Item', w: 0.72 }, { label: 'Qty', w: 0.28 }],
        asArray(list).map((r) => ({ cells: [r.item || r.name || '', r.qty ?? ''] })), empty);
    });

    heading(doc, 'Section 7 — Project Timeline');
    keyValues(doc, doc0.TIMELINE_FIELDS.map(([key, label]) => [label, timeline[key] ? dateText(timeline[key]) : null]));
    subheading(doc, 'For Annual Maintenance Contracts (AMC)');
    keyValues(doc, doc0.AMC_FIELDS.map(([key, label]) => [label, timeline[key] ? dateText(timeline[key]) : null]));

    heading(doc, 'Section 8 — Pricing Summary');
    subheading(doc, 'A. Selected Services');
    table(doc, [
      { label: 'Code', w: 0.11 }, { label: 'Service Description', w: 0.35 }, { label: 'Qty', w: 0.07 },
      { label: 'Unit', w: 0.1 }, { label: 'Standard', w: 0.12, right: true },
      { label: 'Agreed', w: 0.12, right: true }, { label: 'Total', w: 0.13, right: true },
    ], asArray(wo.lines).map((l) => {
      const qty = l.qty == null || l.qty === '' ? 1 : num(l.qty);
      const standard = l.standard_price != null ? l.standard_price : l.price;
      const agreed = l.agreed_price != null && l.agreed_price !== '' ? l.agreed_price : standard;
      return { cells: [l.code || '', l.name || l.description || '', qty, l.unit || '', money(standard), money(agreed),
        money(l.line_total != null ? l.line_total : qty * num(agreed))] };
    }), 'No services selected on this work order.');

    subheading(doc, 'B. Materials & Consumables');
    table(doc, [
      { label: 'Code', w: 0.13 }, { label: 'Item', w: 0.42 }, { label: 'Qty', w: 0.12 },
      { label: 'Unit Price', w: 0.16, right: true }, { label: 'Total', w: 0.17, right: true },
    ], asArray(wo.material_lines).map((l) => ({ cells: [l.code || '', l.name || l.item || '', l.qty ?? '',
      money(l.unit_price), money(l.line_total != null ? l.line_total : num(l.qty) * num(l.unit_price))] })),
    'No materials or consumables charged.');

    subheading(doc, 'C. Labour Charges');
    table(doc, [
      { label: 'Code', w: 0.13 }, { label: 'Description', w: 0.42 }, { label: 'Hours', w: 0.12 },
      { label: 'Rate', w: 0.16, right: true }, { label: 'Total', w: 0.17, right: true },
    ], asArray(wo.labour_lines).map((l) => ({ cells: [l.code || '', l.name || l.description || '', l.hours ?? '',
      money(l.rate), money(l.line_total != null ? l.line_total : num(l.hours) * num(l.rate))] })),
    'No labour charged separately.');

    subheading(doc, 'D. Project Cost Summary');
    table(doc, [{ label: 'Description', w: 0.68 }, { label: 'Amount (BDT)', w: 0.32, right: true }],
      doc0.COST_ROWS.map(([key, label]) => ({ cells: [label, summary[key] ? `${key === 'discount' ? '- ' : ''}${money(summary[key])}` : '—'] }))
        .concat([{ cells: ['TOTAL PROJECT VALUE', `BDT ${money(summary.total)}`], total: true }]), '');

    subheading(doc, 'E. Payment Schedule');
    table(doc, [
      { label: 'Stage', w: 0.34 }, { label: 'Percentage', w: 0.18 },
      { label: 'Amount (BDT)', w: 0.24, right: true }, { label: 'Due Date', w: 0.24 },
    ], schedule.map((r) => ({ cells: [r.stage, `${r.percentage}%`, money(r.amount), r.due_date ? dateText(r.due_date) : ''] })),
    'No payment schedule recorded.');
    subheading(doc, 'Payment Method');
    checkGrid(doc, doc0.PAYMENT_METHODS, new Set([String(wo.payment_method || '').toLowerCase()]), 5);

    heading(doc, 'Section 9 — Warranty');
    table(doc, [{ label: 'Warranty', w: 0.6 }, { label: 'Period', w: 0.4 }],
      doc0.WARRANTY_ROWS.map(([key, label]) => ({ cells: [label, warranty[key] || '—'] })), '');

    heading(doc, 'Section 10 — Project Checklist');
    Object.entries(doc0.CHECKLIST_GROUPS).forEach(([group, options]) => {
      const chosen = new Set(asArray(checklist[group]).map((v) => String(v).toLowerCase()));
      subheading(doc, group);
      checkGrid(doc, options, chosen, 2);
    });

    heading(doc, 'Execution');
    paragraph(doc, 'This Project Work Order is issued under, and governed by, the Master Service Delivery Provider Agreement between the Parties. By signing, the Service Provider accepts the scope, timeline, agreed pricing and warranty terms set out above, and is thereby onboarded to this project.');
    space(doc, 92);
    const y = doc.y + 8;
    const colW = W / 2 - 10;
    [['For Seventh Sky Property Care', [`Name: ${txt(org.represented_by, '__________')}`, `Position: ${txt(org.position, 'Project Manager')}`,
      `Signed: ${wo.wo_signed_at ? dateText(wo.wo_signed_at) : '__________'}`]],
    ['For the Service Provider', [`Business: ${txt(provider.business_name || wo.provider_name, '__________')}`,
      `Name: ${txt(provider.contact_person, '__________')}`, `Signed: ${wo.wo_signed_at ? dateText(wo.wo_signed_at) : '__________'}`]],
    ].forEach(([label, lines], i) => {
      const x = M + i * (colW + 20);
      doc.moveTo(x, y).lineTo(x + colW, y).lineWidth(0.8).strokeColor('#333').stroke();
      doc.fontSize(8.4).fillColor(INK).font('Helvetica-Bold').text(label, x, y + 5, { width: colW });
      doc.fontSize(8).font('Helvetica').text(lines.join('\n'), x, doc.y + 1, { width: colW });
    });
    doc.y = y + 74;

    doc.fontSize(7.6).fillColor(MUTED).font('Helvetica').text(
      'This Work Order becomes effective when signed by both Parties through the Seventh Sky electronic signing system. The electronic record, audit trail and content hash constitute proof of execution.',
      M, doc.y, { width: W },
    );
  });
}

/* ── execution certificate for the completed envelope ───────────────── */

async function buildExecutionPdf(envelope, signers = [], wo = {}) {
  return render((doc) => {
    letterhead(doc, 'Certificate of Execution', 'Electronic signature record',
      `Envelope: ${txt(envelope.envelope_code)}  ·  Document: ${txt(envelope.title)}`);

    heading(doc, 'Document');
    keyValues(doc, [
      ['Work Order No.', wo.code], ['Project No.', wo.project_id], ['Client', wo.client_name],
      ['Service Provider', wo.provider_name], ['Envelope Code', envelope.envelope_code],
      ['Status', envelope.status], ['Completed At', envelope.completed_at ? dateText(envelope.completed_at) : null],
    ]);

    heading(doc, 'Signatories');
    table(doc, [
      { label: '#', w: 0.07 }, { label: 'Name', w: 0.28 }, { label: 'Role', w: 0.22 },
      { label: 'Email', w: 0.27 }, { label: 'Signed', w: 0.16 },
    ], [...signers].sort((a, b) => (a.signer_order || 0) - (b.signer_order || 0)).map((s) => ({
      cells: [s.signer_order, s.name || '', String(s.role || '').replace(/_/g, ' '), s.email || '',
        s.signed_at ? dateText(s.signed_at) : String(s.status || '')],
    })), 'No signatories recorded.');

    doc.moveDown(0.6);
    doc.fontSize(7.8).fillColor(MUTED).font('Helvetica').text(
      'Each signature above was captured through the Seventh Sky electronic signing system against a single-use access token. The stored document, the audit trail and the content hash held against this envelope together constitute proof of execution.',
      M, doc.y, { width: W },
    );
  });
}

module.exports = { buildWorkOrderPdf, buildExecutionPdf };
