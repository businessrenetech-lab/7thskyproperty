/**
 * wtReportPdf.service.js — the branded PDF for any report.
 *
 * ONE renderer, driven by the same column definitions the screen uses. That is
 * the whole design: a report's printed version cannot show different columns, a
 * different order or differently-formatted money from the table it was printed
 * from, because neither one owns the list. Two renderers would agree at first
 * and quietly diverge on the third change.
 *
 * Landscape, because these are wide tables and a portrait page would either clip
 * columns or shrink the type past reading. House style is the invoice's and the
 * voucher's — navy/cyan letterhead, ruled rows, muted labels.
 */
const PDFDocument = require('pdfkit');

const NAVY = '#003768';
const CYAN = '#12b6f3';
const INK = '#1f2430';
const MUTED = '#6b7280';
const LINE = '#d9dee6';
const SOFT = '#f6f8fb';
const GREEN = '#047857';
const RED = '#b91c1c';

const M = 34;
const PAGE_W = 841.89;          // A4 landscape
const PAGE_H = 595.28;
const W = PAGE_W - M * 2;

const num = (v) => (v == null || v === '' || Number.isNaN(Number(v)) ? 0 : Number(v));
const money = (v) => Number(num(v)).toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const dateText = (v) => (v ? new Date(v).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }) : '—');

/** A cell's printed value, formatted the way its column declares. */
function cellText(col, row) {
  const v = row[col.key];
  if (col.money) return num(v) === 0 ? '—' : money(v);
  if (col.key === 'date' || col.key.endsWith('_at') || col.key === 'completed_at') return dateText(v);
  if (v == null || v === '') return '—';
  return String(v);
}

/**
 * Scale the declared widths to the page.
 *
 * The definitions are written in rough proportion rather than exact points, so
 * a column added later does not require every other number to be recomputed by
 * hand — which is the sort of chore that ends with a table running off the page.
 */
function layout(columns) {
  const declared = columns.reduce((s, c) => s + (c.width || 80), 0);
  const scale = W / declared;
  let x = M;
  return columns.map((c) => {
    const w = (c.width || 80) * scale;
    const col = { ...c, x, w };
    x += w;
    return col;
  });
}

function letterhead(doc, report, branding) {
  doc.fontSize(14).fillColor(NAVY).font('Helvetica-Bold')
    .text(branding.name || 'Seventh Sky Property Care', M, M, { width: W * 0.55 });
  doc.fontSize(7.5).fillColor(CYAN).font('Helvetica-Bold')
    .text('WATER TANK CLEANING & MAINTENANCE', { width: W * 0.55 });
  doc.fontSize(7.5).fillColor(MUTED).font('Helvetica');
  [branding.address, branding.phone, branding.email].filter(Boolean)
    .forEach((l) => doc.text(l, { width: W * 0.55 }));

  const rx = M + W * 0.55;
  const rw = W * 0.45;
  doc.fontSize(15).fillColor(NAVY).font('Helvetica-Bold')
    .text(report.title.toUpperCase(), rx, M, { width: rw, align: 'right' });
  doc.fontSize(8).fillColor(MUTED).font('Helvetica')
    .text(report.subtitle, { width: rw, align: 'right' });
  doc.fontSize(8.5).fillColor(INK).font('Helvetica-Bold')
    .text(`${report.range.label}  ·  ${report.range.from} to ${report.range.to}`, { width: rw, align: 'right' });

  // Any filter narrowing the report is stated. A report headed "Provider
  // Payouts" that silently covers one provider is how a total gets quoted at a
  // meeting and turns out to mean something else.
  const applied = Object.entries(report.filters || {}).filter(([, v]) => v);
  if (applied.length) {
    doc.fontSize(7.5).fillColor(RED).font('Helvetica-Bold')
      .text(`Filtered: ${applied.map(([k, v]) => `${k} = ${v}`).join(' · ')}`, { width: rw, align: 'right' });
  }
}

/** The headline figures, as a row of boxes. */
function headline(doc, summary, y) {
  const items = (summary?.headline || []).slice(0, 5);
  if (!items.length) return y;
  const gap = 8;
  const bw = (W - gap * (items.length - 1)) / items.length;
  items.forEach((it, i) => {
    const x = M + i * (bw + gap);
    doc.roundedRect(x, y, bw, 40, 4).fillAndStroke(SOFT, LINE);
    doc.fontSize(7).fillColor(MUTED).font('Helvetica-Bold').text(it.label.toUpperCase(), x + 9, y + 8, { width: bw - 18 });
    const colour = it.tone === 'in' ? GREEN : it.tone === 'out' ? RED : NAVY;
    doc.fontSize(13).fillColor(colour).font('Helvetica-Bold')
      .text(it.money ? `BDT ${money(it.value)}` : String(it.value), x + 9, y + 19, { width: bw - 18 });
  });
  return y + 52;
}

function tableHeader(doc, cols, y) {
  doc.rect(M, y - 4, W, 17).fill(NAVY);
  cols.forEach((c) => {
    doc.fontSize(7.5).fillColor('#ffffff').font('Helvetica-Bold')
      .text(c.label, c.x + 4, y, { width: c.w - 8, align: c.align === 'right' ? 'right' : 'left', lineBreak: false });
  });
  return y + 17;
}

/** The rows, paginating as needed. Returns the y after the last one. */
function tableBody(doc, report, cols, startY, branding) {
  let y = startY;
  const rowH = 14;
  const bottom = PAGE_H - M - 26;

  report.rows.forEach((row, i) => {
    if (y + rowH > bottom) {
      doc.addPage({ size: 'A4', layout: 'landscape', margin: M });
      letterhead(doc, report, branding);
      y = tableHeader(doc, cols, M + 74);
    }
    if (i % 2 === 1) doc.rect(M, y - 3, W, rowH).fill('#fbfcfe');

    cols.forEach((c) => {
      const text = cellText(c, row);
      // Money that moved OUT is red and money IN is green, everywhere, so a
      // reader never has to work out which column they are looking at.
      const colour = c.money && num(row[c.key]) !== 0
        ? (c.key === 'out' ? RED : c.key === 'in' ? GREEN : INK)
        : INK;
      doc.fontSize(7.5).fillColor(colour)
        .font(c.money && num(row[c.key]) !== 0 ? 'Helvetica-Bold' : 'Helvetica')
        .text(text, c.x + 4, y, {
          width: c.w - 8,
          align: c.align === 'right' ? 'right' : 'left',
          lineBreak: false,
          ellipsis: true,
        });
    });
    y += rowH;
    doc.moveTo(M, y - 3).lineTo(M + W, y - 3).strokeColor(LINE).lineWidth(0.4).stroke();
  });

  return y;
}

/** A totals strip under the table, for every money column. */
function totalsRow(doc, report, cols, y) {
  const moneyCols = cols.filter((c) => c.money && c.key !== 'balance');
  if (!moneyCols.length || !report.rows.length) return y;

  doc.rect(M, y - 1, W, 18).fillAndStroke(SOFT, NAVY);
  doc.fontSize(8).fillColor(NAVY).font('Helvetica-Bold').text('TOTAL', M + 6, y + 4, { width: 120 });
  moneyCols.forEach((c) => {
    const total = report.rows.reduce((s, r) => s + num(r[c.key]), 0);
    doc.fontSize(8.5).fillColor(c.key === 'out' ? RED : c.key === 'in' ? GREEN : NAVY).font('Helvetica-Bold')
      .text(money(total), c.x + 4, y + 4, { width: c.w - 8, align: 'right', lineBreak: false });
  });
  return y + 26;
}

/** The breakdowns, on their own page so they are never half-cut. */
function breakdowns(doc, report, branding) {
  const blocks = (report.summary?.breakdowns || []).filter((b) => b.items?.length);
  if (!blocks.length) return;

  doc.addPage({ size: 'A4', layout: 'landscape', margin: M });
  letterhead(doc, report, branding);
  let y = M + 78;
  doc.fontSize(11).fillColor(NAVY).font('Helvetica-Bold').text('Breakdown', M, y);
  y += 18;

  const colW = (W - 20) / Math.min(blocks.length, 2);
  blocks.slice(0, 2).forEach((b, i) => {
    const x = M + i * (colW + 20);
    let by = y;
    doc.fontSize(8).fillColor(CYAN).font('Helvetica-Bold').text(b.title.toUpperCase(), x, by);
    by += 14;
    // Capped: a breakdown with 200 lines is a table, not a summary.
    b.items.slice(0, 22).forEach((it) => {
      doc.fontSize(8).fillColor(INK).font('Helvetica')
        .text(String(it.name), x, by, { width: colW - 96, lineBreak: false, ellipsis: true });
      doc.fontSize(8).fillColor(NAVY).font('Helvetica-Bold')
        .text(money(it.total), x + colW - 92, by, { width: 88, align: 'right' });
      by += 13;
      doc.moveTo(x, by - 3).lineTo(x + colW - 4, by - 3).strokeColor(LINE).lineWidth(0.4).stroke();
    });
    if (b.items.length > 22) {
      doc.fontSize(7.5).fillColor(MUTED).font('Helvetica-Oblique')
        .text(`… and ${b.items.length - 22} more`, x, by + 2);
    }
  });
}

async function buildReportPdf(report, branding = {}) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: M, bufferPages: true });
    const chunks = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    try {
      letterhead(doc, report, branding);
      let y = headline(doc, report.summary, M + 78);
      const cols = layout(report.columns);

      if (!report.rows.length) {
        doc.fontSize(10).fillColor(MUTED).font('Helvetica-Oblique')
          .text('No transactions in this period.', M, y + 10, { width: W, align: 'center' });
      } else {
        y = tableHeader(doc, cols, y);
        y = tableBody(doc, report, cols, y, branding);
        totalsRow(doc, report, cols, y + 4);
        breakdowns(doc, report, branding);
      }

      // Footer on every page, stamped with when it was produced — a report
      // passed around without a generation time is one nobody can date.
      const range = doc.bufferedPageRange();
      const stamp = new Date(report.generated_at || Date.now())
        .toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
      for (let i = range.start; i < range.start + range.count; i += 1) {
        doc.switchToPage(i);
        doc.fontSize(7).fillColor(MUTED).font('Helvetica')
          .text(`${branding.name || 'Seventh Sky Property Care'} · ${report.title} · generated ${stamp} · page ${i - range.start + 1} of ${range.count}`,
            M, PAGE_H - M + 4, { width: W, align: 'center' });
      }
    } catch (e) { reject(e); return; }

    doc.end();
  });
}

module.exports = { buildReportPdf };
