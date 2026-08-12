/**
 * wtInvoicePdf.service.js — the branded invoice the client actually receives.
 *
 * Drawn with pdfkit rather than rendered from HTML because invoices are emailed
 * as attachments from a signing callback where no browser is available — the
 * same reason wtWorkOrderPdf.service.js draws its documents. House style is
 * deliberately identical to the work order and the agreements: navy/cyan
 * letterhead, ruled tables, muted labels.
 */
const PDFDocument = require('pdfkit');
const svc = require('./wtInvoice.service');

const NAVY = '#003768';
const CYAN = '#12b6f3';
const INK = '#1f2430';
const MUTED = '#6b7280';
const LINE = '#d9dee6';
const SOFT = '#f6f8fb';
const RED = '#b91c1c';
const GREEN = '#047857';

const M = 48;
const W = 595.28 - M * 2;

const num = (v) => (v == null || v === '' || Number.isNaN(Number(v)) ? 0 : Number(v));
const money = (v) => Number(num(v)).toLocaleString('en-BD', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
const txt = (v, f = '—') => (v == null || v === '' ? f : String(v));
const dateText = (v) => (v ? new Date(v).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');

function render(build) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: M, bufferPages: true });
    const chunks = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
    try { build(doc); } catch (e) { reject(e); return; }
    const range = doc.bufferedPageRange();
    for (let i = range.start; i < range.start + range.count; i += 1) {
      doc.switchToPage(i);
      doc.fontSize(7.5).fillColor(MUTED).font('Helvetica')
        .text(`Seventh Sky Property Care · Water Tank Cleaning & Maintenance · Page ${i - range.start + 1} of ${range.count}`,
          M, 800, { width: W, align: 'center' });
    }
    doc.end();
  });
}

/** Letterhead + the big INVOICE / DRAFT badge. */
function letterhead(doc, inv, branding) {
  doc.fontSize(17).fillColor(NAVY).font('Helvetica-Bold')
    .text(branding.company_name || 'Seventh Sky Property Care', M, M, { width: W * 0.62 });
  doc.fontSize(8.5).fillColor(CYAN).font('Helvetica-Bold')
    .text('WATER TANK CLEANING & MAINTENANCE', { width: W * 0.62 });
  doc.fontSize(8).fillColor(MUTED).font('Helvetica');
  [branding.address, branding.phone && `Phone: ${branding.phone}`, branding.email, branding.bin && `BIN: ${branding.bin}`]
    .filter(Boolean).forEach((l) => doc.text(l, { width: W * 0.62 }));

  // right-hand document block
  const isDraft = svc.eq(inv.status, 'draft');
  const isVoid = svc.eq(inv.status, 'void');
  const label = isVoid ? 'VOID' : isDraft ? 'DRAFT INVOICE' : 'TAX INVOICE';
  doc.fontSize(20).fillColor(isVoid ? RED : NAVY).font('Helvetica-Bold')
    .text(label, M + W * 0.62, M, { width: W * 0.38, align: 'right' });
  doc.fontSize(9).fillColor(INK).font('Helvetica-Bold')
    .text(txt(inv.code), { width: W * 0.38, align: 'right' });
  doc.fontSize(8.5).fillColor(MUTED).font('Helvetica')
    .text(`Issued ${dateText(inv.issue_date)}`, { width: W * 0.38, align: 'right' });
  if (inv.due_date) doc.text(`Due ${dateText(inv.due_date)}`, { width: W * 0.38, align: 'right' });
  if (inv.inv_type) doc.text(txt(inv.inv_type), { width: W * 0.38, align: 'right' });

  const y = Math.max(doc.y, M + 74) + 6;
  doc.moveTo(M, y).lineTo(M + W, y).lineWidth(2).strokeColor(NAVY).stroke();
  doc.y = y + 12;
  doc.lineWidth(1);
}

/** Bill-to on the left, service site and references on the right. */
function parties(doc, inv) {
  const top = doc.y;
  const colW = W / 2 - 10;

  doc.fontSize(8).fillColor(MUTED).font('Helvetica-Bold').text('BILL TO', M, top, { width: colW });
  doc.fontSize(10.5).fillColor(INK).font('Helvetica-Bold')
    .text(txt(inv.bill_to_name || inv.client_name), M, doc.y + 2, { width: colW });
  doc.fontSize(8.5).fillColor(MUTED).font('Helvetica');
  [inv.client_code, inv.bill_to_address, inv.bill_to_phone, inv.bill_to_email]
    .filter(Boolean).forEach((l) => doc.text(String(l), M, doc.y, { width: colW }));
  const leftEnd = doc.y;

  const rx = M + W / 2 + 10;
  doc.fontSize(8).fillColor(MUTED).font('Helvetica-Bold').text('SERVICE SITE & REFERENCES', rx, top, { width: colW });
  doc.fontSize(8.5).fillColor(INK).font('Helvetica');
  const refs = [
    inv.site_address && String(inv.site_address),
    inv.agreement_code && `Agreement: ${inv.agreement_code}`,
    inv.amc_code && `AMC: ${inv.amc_code}`,
    inv.project_id && `Project: ${inv.project_id}`,
    inv.quotation_code && `Quotation: ${inv.quotation_code}`,
    inv.work_order_code && `Work Order: ${inv.work_order_code}`,
    inv.instalment_no && `Instalment ${inv.instalment_no} of ${inv.instalment_of}`,
    inv.period_start && `Period: ${dateText(inv.period_start)} – ${dateText(inv.period_end)}`,
  ].filter(Boolean);
  (refs.length ? refs : ['—']).forEach((l) => doc.text(l, rx, doc.y, { width: colW }));

  doc.y = Math.max(leftEnd, doc.y) + 16;
}

/** The line items — what the client is actually being charged for. */
function items(doc, lines) {
  const cols = [
    { key: 'code', label: 'Code', w: 62, align: 'left' },
    { key: 'name', label: 'Description', w: W - 62 - 44 - 74 - 82, align: 'left' },
    { key: 'qty', label: 'Qty', w: 44, align: 'center' },
    { key: 'unit_price', label: 'Rate', w: 74, align: 'right' },
    { key: 'line_total', label: 'Amount', w: 82, align: 'right' },
  ];

  const header = () => {
    const y = doc.y;
    doc.rect(M, y, W, 20).fill(NAVY);
    let x = M;
    doc.fontSize(8).fillColor('#ffffff').font('Helvetica-Bold');
    cols.forEach((c) => { doc.text(c.label, x + 6, y + 6, { width: c.w - 12, align: c.align }); x += c.w; });
    doc.y = y + 20;
  };
  header();

  doc.font('Helvetica').fontSize(8.5);
  (lines || []).forEach((l, i) => {
    // keep the table off the footer
    if (doc.y > 700) { doc.addPage(); header(); }
    const desc = l.description ? `${txt(l.name)}\n${l.description}` : txt(l.name);
    const h = Math.max(20, doc.heightOfString(desc, { width: cols[1].w - 12 }) + 10);
    if (i % 2 === 1) doc.rect(M, doc.y, W, h).fill(SOFT);
    const y = doc.y;
    let x = M;
    cols.forEach((c) => {
      let v = l[c.key];
      if (c.key === 'name') v = desc;
      else if (c.key === 'unit_price' || c.key === 'line_total') v = money(v);
      else if (c.key === 'qty') v = String(num(l.qty) || 1);
      doc.fillColor(c.key === 'line_total' ? INK : MUTED)
        .font(c.key === 'line_total' ? 'Helvetica-Bold' : 'Helvetica')
        .text(txt(v), x + 6, y + 5, { width: c.w - 12, align: c.align });
      x += c.w;
    });
    doc.y = y + h;
    doc.moveTo(M, doc.y).lineTo(M + W, doc.y).strokeColor(LINE).stroke();
  });

  if (!(lines || []).length) {
    doc.fillColor(MUTED).fontSize(9).text('No items on this invoice.', M + 6, doc.y + 8, { width: W - 12 });
    doc.y += 26;
  }
}

/** Totals block, right-aligned, with the advance credited and the balance due. */
function totals(doc, t, inv) {
  const boxW = 250;
  const x = M + W - boxW;
  doc.y += 10;

  const row = (label, value, opts = {}) => {
    const y = doc.y;
    doc.fontSize(opts.big ? 10.5 : 9)
      .fillColor(opts.color || (opts.big ? INK : MUTED))
      .font(opts.big || opts.bold ? 'Helvetica-Bold' : 'Helvetica')
      .text(label, x, y, { width: boxW - 96, align: 'left' })
      .text(value, x + boxW - 96, y, { width: 96, align: 'right' });
    doc.y = y + (opts.big ? 17 : 14);
  };

  row('Subtotal', money(t.subtotal));
  if (t.discount > 0) row(inv.discount_note ? `Discount — ${inv.discount_note}` : 'Discount', `− ${money(t.discount)}`, { color: GREEN });
  if (t.transport > 0) row('Transport', money(t.transport));
  if (t.govt_fees > 0) row('Government fees / permits', money(t.govt_fees));
  if (t.other_charges > 0) row('Other charges', money(t.other_charges));
  if (t.vat_percent > 0) row(`VAT (${t.vat_percent}%)`, money(t.vat_amount));

  doc.moveTo(x, doc.y + 2).lineTo(x + boxW, doc.y + 2).strokeColor(NAVY).lineWidth(1).stroke();
  doc.y += 6;
  row('Invoice total', `${inv.currency || 'BDT'} ${money(t.amount)}`, { big: true });

  if (t.advance_applied > 0) row('Less advance already paid', `− ${money(t.advance_applied)}`, { color: GREEN, bold: true });
  if (t.paid_amount > 0) row('Less payments received', `− ${money(t.paid_amount)}`, { color: GREEN, bold: true });

  const y = doc.y;
  doc.rect(x, y, boxW, 26).fill(t.outstanding > 0 ? NAVY : GREEN);
  doc.fontSize(10.5).fillColor('#ffffff').font('Helvetica-Bold')
    .text(t.outstanding > 0 ? 'BALANCE DUE' : 'PAID IN FULL', x + 10, y + 8, { width: boxW - 106 })
    .text(`${inv.currency || 'BDT'} ${money(t.outstanding)}`, x + boxW - 96, y + 8, { width: 86, align: 'right' });
  doc.y = y + 34;
}

/** Advance note, payment terms, bank details and the closing note. */
function footerBlocks(doc, inv, branding) {
  const block = (title, body) => {
    if (!body) return;
    if (doc.y > 690) doc.addPage();
    doc.fontSize(8).fillColor(MUTED).font('Helvetica-Bold').text(title.toUpperCase(), M, doc.y, { width: W });
    doc.fontSize(8.5).fillColor(INK).font('Helvetica').text(body, M, doc.y + 2, { width: W });
    doc.y += 8;
  };

  block('Advance payment', inv.advance_note);
  block('Payment terms', inv.payment_terms);

  const bank = [
    branding.bank_account_name && `Account name: ${branding.bank_account_name}`,
    branding.bank_name && `Bank: ${branding.bank_name}`,
    branding.bank_branch && `Branch: ${branding.bank_branch}`,
    branding.bank_account_number && `Account no: ${branding.bank_account_number}`,
    branding.bank_routing && `Routing: ${branding.bank_routing}`,
    branding.mobile_banking && `bKash / Nagad: ${branding.mobile_banking}`,
  ].filter(Boolean).join('\n');
  block('Remit to', bank);

  block('Notes', inv.notes);
  block(' ', inv.footer_note);

  if (doc.y > 740) doc.addPage();
  doc.y = Math.max(doc.y + 6, 730);
  doc.moveTo(M, doc.y).lineTo(M + W, doc.y).strokeColor(LINE).stroke();
  doc.fontSize(7.5).fillColor(MUTED).font('Helvetica')
    .text(svc.eq(inv.status, 'draft')
      ? 'DRAFT — this document has not been issued to the client and is not a demand for payment.'
      : 'Thank you for your business. Please quote the invoice number with your payment.',
    M, doc.y + 6, { width: W, align: 'center' });
}

/** Build the invoice PDF. `inv` is a plain wt_invoices row. */
async function buildInvoicePdf(inv, branding = {}) {
  const t = svc.computeTotals(inv);
  return render((doc) => {
    letterhead(doc, inv, branding);
    parties(doc, inv);
    items(doc, t.lines);
    totals(doc, t, inv);
    footerBlocks(doc, inv, branding);
  });
}

module.exports = { buildInvoicePdf };
