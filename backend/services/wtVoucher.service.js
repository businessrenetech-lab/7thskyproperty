/**
 * wtVoucher.service.js — the branded payment voucher.
 *
 * A voucher is not a receipt and not an invoice. It is the document the business
 * produces when money LEAVES: the recipient signs it, the person who authorised
 * it signs it, and it is the first thing an auditor asks for when they see cash
 * going out. Until now Water Tank produced nothing at all for an outward payment
 * — a provider was paid and the only trace was a row in a table.
 *
 * Three details are not decoration.
 *
 *   THE AMOUNT IN WORDS. A figure alone can be altered with a pen; the words are
 *   what makes a voucher hold up. This is standard practice on every payment
 *   voucher in Bangladesh and its absence would be noticed immediately.
 *
 *   THREE SIGNATURE BLOCKS — prepared, approved, received. A voucher signed by
 *   only the person who paid proves nothing about authority.
 *
 *   THE PAID STAMP carries its method and reference. "Paid" with no trace of how
 *   is the claim an auditor is being asked to take on trust.
 *
 * Drawn with pdfkit rather than HTML, for the same reason as the invoice and the
 * work order: these are produced from server-side callbacks where no browser
 * exists. House style is deliberately identical — navy/cyan letterhead, ruled
 * blocks, muted labels.
 */
const PDFDocument = require('pdfkit');

const NAVY = '#003768';
const CYAN = '#12b6f3';
const INK = '#1f2430';
const MUTED = '#6b7280';
const LINE = '#d9dee6';
const SOFT = '#f6f8fb';
const GREEN = '#047857';

const M = 48;
const W = 595.28 - M * 2;

const num = (v) => (v == null || v === '' || Number.isNaN(Number(v)) ? 0 : Number(v));
const money = (v) => Number(num(v)).toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const txt = (v, f = '—') => (v == null || v === '' ? f : String(v));
const dateText = (v) => (v ? new Date(v).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');

/* ── amount in words ───────────────────────────────────────────────────── */

const ONES = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
  'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

const under100 = (n) => (n < 20 ? ONES[n] : `${TENS[Math.floor(n / 10)]}${n % 10 ? ` ${ONES[n % 10]}` : ''}`);
const under1000 = (n) => (n < 100 ? under100(n)
  : `${ONES[Math.floor(n / 100)]} Hundred${n % 100 ? ` ${under100(n % 100)}` : ''}`);

/**
 * Bangladeshi numbering — lakh and crore, not million. Writing "One Million"
 * on a voucher issued in Dhaka would be read as a foreign document.
 */
function amountInWords(value) {
  const whole = Math.floor(Math.abs(num(value)));
  const paisa = Math.round((Math.abs(num(value)) - whole) * 100);
  if (whole === 0 && paisa === 0) return 'Zero Taka Only';

  const parts = [];
  let n = whole;
  const crore = Math.floor(n / 10000000); n %= 10000000;
  const lakh = Math.floor(n / 100000); n %= 100000;
  const thousand = Math.floor(n / 1000); n %= 1000;

  if (crore) parts.push(`${under1000(crore)} Crore`);
  if (lakh) parts.push(`${under1000(lakh)} Lakh`);
  if (thousand) parts.push(`${under1000(thousand)} Thousand`);
  if (n) parts.push(under1000(n));

  let out = parts.join(' ') || 'Zero';
  out = `${out} Taka`;
  if (paisa) out += ` and ${under100(paisa)} Paisa`;
  return `${out} Only`;
}

/* ── drawing ───────────────────────────────────────────────────────────── */

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
        .text('Computer-generated payment voucher · valid without signature only when accompanied by the bank record',
          M, 792, { width: W, align: 'center' });
      doc.text(`Page ${i - range.start + 1} of ${range.count}`, M, 803, { width: W, align: 'center' });
    }
    doc.end();
  });
}

function letterhead(doc, branding, y = M) {
  doc.fontSize(17).fillColor(NAVY).font('Helvetica-Bold')
    .text(branding.name || branding.company_name || 'Seventh Sky Property Care', M, y, { width: W * 0.6 });
  doc.fontSize(8.5).fillColor(CYAN).font('Helvetica-Bold')
    .text('WATER TANK CLEANING & MAINTENANCE', { width: W * 0.6 });
  doc.fontSize(8).fillColor(MUTED).font('Helvetica');
  [branding.address, branding.phone && `Phone: ${branding.phone}`, branding.email,
    branding.bin && `BIN: ${branding.bin}`, branding.tin && `TIN: ${branding.tin}`]
    .filter(Boolean).forEach((l) => doc.text(l, { width: W * 0.6 }));
  return doc.y;
}

/** The document title block, right-aligned against the letterhead. */
function titleBlock(doc, v, y = M) {
  const x = M + W * 0.62;
  const w = W * 0.38;
  doc.fontSize(20).fillColor(NAVY).font('Helvetica-Bold')
    .text('PAYMENT VOUCHER', x, y, { width: w, align: 'right' });
  doc.fontSize(8).fillColor(MUTED).font('Helvetica')
    .text('Money paid out by Seventh Sky', { width: w, align: 'right' });
  doc.moveDown(0.5);
  doc.fontSize(9).fillColor(INK).font('Helvetica-Bold')
    .text(txt(v.voucher_no), { width: w, align: 'right' });
  doc.fontSize(8).fillColor(MUTED).font('Helvetica')
    .text(`Dated ${dateText(v.paid_on || v.incurred_on)}`, { width: w, align: 'right' });
  if (v.batch_ref) doc.text(`Payment run ${v.batch_ref}`, { width: w, align: 'right' });
}

/** label: value pairs in a ruled box. */
function block(doc, title, rows, y) {
  const pad = 10;
  const lineH = 15;
  const h = 20 + rows.length * lineH;
  doc.roundedRect(M, y, W, h, 4).fillAndStroke(SOFT, LINE);
  doc.fontSize(8).fillColor(CYAN).font('Helvetica-Bold').text(title.toUpperCase(), M + pad, y + 7);
  rows.forEach(([label, value, opts = {}], i) => {
    const ry = y + 20 + i * lineH;
    doc.fontSize(8.5).fillColor(MUTED).font('Helvetica').text(label, M + pad, ry, { width: 120 });
    doc.fontSize(opts.big ? 10 : 8.5).fillColor(opts.colour || INK)
      .font(opts.bold ? 'Helvetica-Bold' : 'Helvetica')
      .text(txt(value), M + pad + 126, ry, { width: W - pad * 2 - 126 });
  });
  return y + h + 12;
}

/** The figure, the words, and the PAID mark. */
function amountBlock(doc, v, y) {
  const h = 62;
  doc.roundedRect(M, y, W, h, 4).fillAndStroke('#ffffff', NAVY);
  doc.fontSize(8).fillColor(MUTED).font('Helvetica').text('AMOUNT PAID', M + 12, y + 10);
  doc.fontSize(22).fillColor(NAVY).font('Helvetica-Bold').text(`BDT ${money(v.amount)}`, M + 12, y + 22);

  doc.fontSize(8).fillColor(MUTED).font('Helvetica').text('IN WORDS', M + 12, y + 46);
  doc.fontSize(8.5).fillColor(INK).font('Helvetica-Oblique')
    .text(amountInWords(v.amount), M + 68, y + 46, { width: W - 210 });

  // The paid stamp. Angled would be cuter and harder to read; this is a record.
  const sx = M + W - 132;
  doc.roundedRect(sx, y + 12, 120, 38, 4).fillAndStroke('#ecfdf5', GREEN);
  doc.fontSize(13).fillColor(GREEN).font('Helvetica-Bold').text('PAID', sx, y + 18, { width: 120, align: 'center' });
  doc.fontSize(7.5).fillColor(GREEN).font('Helvetica')
    .text(txt(v.method, 'method not recorded'), sx, y + 34, { width: 120, align: 'center' });
  return y + h + 12;
}

/** Prepared / approved / received. A voucher with one signature proves nothing. */
function signatures(doc, v, y) {
  const cols = [
    ['Prepared by', txt(v.requested_by || v.paid_by, '')],
    ['Approved by', txt(v.approved_by, '')],
    ['Received by', txt(v.payee, '')],
  ];
  const cw = W / 3;
  doc.fontSize(8).fillColor(CYAN).font('Helvetica-Bold').text('SIGNATURES', M, y);
  const ly = y + 48;
  cols.forEach(([label, name], i) => {
    const x = M + i * cw;
    doc.moveTo(x, ly).lineTo(x + cw - 18, ly).strokeColor(LINE).lineWidth(0.8).stroke();
    doc.fontSize(8).fillColor(MUTED).font('Helvetica').text(label, x, ly + 5, { width: cw - 18 });
    if (name) doc.fontSize(8.5).fillColor(INK).font('Helvetica-Bold').text(name, x, ly + 16, { width: cw - 18 });
  });
  return ly + 40;
}

/** One voucher on the current page. */
function voucherPage(doc, v, branding) {
  letterhead(doc, branding);
  titleBlock(doc, v);

  let y = Math.max(doc.y, M + 96) + 6;
  doc.moveTo(M, y).lineTo(M + W, y).strokeColor(CYAN).lineWidth(1.4).stroke();
  y += 14;

  y = block(doc, 'Paid to', [
    ['Payee', v.payee, { bold: true, big: true }],
    ['Payee type', v.payee_type],
    ['Details', v.payee_details],
  ], y);

  y = amountBlock(doc, v, y);

  y = block(doc, 'What this payment is for', [
    ['Category', v.category],
    ['Description', v.description],
    ['Project', v.project_code],
    ['Work order', v.work_order_code],
    ['Client', v.client_name],
  ], y);

  y = block(doc, 'How it was paid', [
    ['Method', v.method],
    ['Reference', v.reference],
    ['Paid on', dateText(v.paid_on)],
    ['Recorded by', v.paid_by],
    ['Voucher type', v.disbursement_type === 'provider'
      ? 'Provider payout — against a signed work order'
      : 'Direct cost — paid by Seventh Sky'],
    ['Recharged to client', v.billable_to_client ? 'Yes — billed on to the client' : 'No — absorbed by Seventh Sky'],
  ], y);

  if (v.notes) y = block(doc, 'Notes', [['', v.notes]], y);

  signatures(doc, v, y + 4);
}

/** A payment run: the summary first, then a voucher for each line. */
function runSummary(doc, run, branding) {
  letterhead(doc, branding);
  const x = M + W * 0.62;
  const w = W * 0.38;
  doc.fontSize(20).fillColor(NAVY).font('Helvetica-Bold').text('PAYMENT RUN', x, M, { width: w, align: 'right' });
  doc.fontSize(9).fillColor(INK).font('Helvetica-Bold').text(txt(run.batch_ref), { width: w, align: 'right' });
  doc.fontSize(8).fillColor(MUTED).font('Helvetica')
    .text(`${run.vouchers.length} payment${run.vouchers.length === 1 ? '' : 's'} · ${dateText(run.paid_on)}`, { width: w, align: 'right' });

  let y = Math.max(doc.y, M + 96) + 6;
  doc.moveTo(M, y).lineTo(M + W, y).strokeColor(CYAN).lineWidth(1.4).stroke();
  y += 16;

  // header row
  const cols = [[M, 78, 'Voucher'], [M + 78, 210, 'Paid to'], [M + 288, 118, 'For'], [M + 406, 93, 'Method'], [M + W - 84, 84, 'Amount']];
  doc.rect(M, y - 4, W, 18).fill(SOFT);
  cols.forEach(([cx, cw, label], i) => {
    doc.fontSize(8).fillColor(MUTED).font('Helvetica-Bold')
      .text(label, cx + 4, y, { width: cw - 8, align: i === 4 ? 'right' : 'left' });
  });
  y += 20;

  run.vouchers.forEach((v) => {
    doc.fontSize(8.5).fillColor(INK).font('Helvetica');
    doc.text(txt(v.voucher_no), M + 4, y, { width: 70 });
    doc.font('Helvetica-Bold').text(txt(v.payee), M + 82, y, { width: 202 });
    doc.font('Helvetica').fillColor(MUTED).text(txt(v.category || v.work_order_code), M + 292, y, { width: 110 });
    doc.text(txt(v.method), M + 410, y, { width: 85 });
    doc.fillColor(INK).font('Helvetica-Bold').text(money(v.amount), M + W - 84, y, { width: 80, align: 'right' });
    y += 17;
    doc.moveTo(M, y - 4).lineTo(M + W, y - 4).strokeColor(LINE).lineWidth(0.5).stroke();
  });

  y += 6;
  doc.rect(M, y, W, 26).fillAndStroke(SOFT, NAVY);
  doc.fontSize(9).fillColor(NAVY).font('Helvetica-Bold').text('TOTAL PAID OUT', M + 10, y + 8);
  doc.fontSize(12).text(`BDT ${money(run.total)}`, M + W - 184, y + 6, { width: 180, align: 'right' });
  y += 34;
  doc.fontSize(8.5).fillColor(MUTED).font('Helvetica-Oblique')
    .text(amountInWords(run.total), M, y, { width: W, align: 'right' });
  y += 22;

  doc.fontSize(8.5).fillColor(MUTED).font('Helvetica')
    .text(`Reference for the whole run: ${txt(run.reference)}. A voucher for each payment follows.`, M, y, { width: W });

  signatures(doc, { requested_by: run.paid_by, payee: '' }, y + 22);
}

/** One voucher. */
async function buildVoucherPdf(v, branding = {}) {
  return render((doc) => voucherPage(doc, v, branding));
}

/** A run: summary page, then one voucher per payment. */
async function buildRunPdf(run, branding = {}) {
  return render((doc) => {
    runSummary(doc, run, branding);
    run.vouchers.forEach((v) => {
      doc.addPage();
      voucherPage(doc, v, branding);
    });
  });
}

module.exports = { buildVoucherPdf, buildRunPdf, amountInWords };
