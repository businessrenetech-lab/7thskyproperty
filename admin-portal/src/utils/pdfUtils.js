/**
 * Language Academy — PDF Generation Utilities
 * Shared module for generating branded receipts, vouchers, and report headers.
 * Loads html2pdf.js only when a PDF is exported.
 */
import logoSrc from '../assets/logo.png';

const loadHtml2Pdf = async () => (await import('html2pdf.js')).default;

// ── Institution Info ──
export const getInstitutionInfo = () => ({
  name: 'Language Academy',
  address: 'SEL SUFI SQUARE, Unit: 1104, Level: 11, Dhanmondi R/A, Dhaka 1209',
  phone: '+880 1913-373581',
  email: 'hello@languageacademy.com.bd',
  website: 'languageacademy.com.bd'
});

// ── Logo as base64 (preloaded from import) ──
let logoBase64Cache = null;

export const getLogoBase64 = () => {
  return new Promise((resolve) => {
    if (logoBase64Cache) { resolve(logoBase64Cache); return; }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      logoBase64Cache = canvas.toDataURL('image/png');
      resolve(logoBase64Cache);
    };
    img.onerror = () => resolve('');
    img.src = logoSrc;
  });
};

// ── Number to Words (BDT) ──
export const numberToWords = (num) => {
  if (num === 0) return 'Zero Taka Only';
  const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const n = ('000000000' + Math.floor(Math.abs(num))).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
  if (!n) return String(num) + ' Taka Only';
  let str = '';
  str += (n[1] != 0) ? (a[Number(n[1])] || b[n[1][0]] + ' ' + a[n[1][1]]) + 'Crore ' : '';
  str += (n[2] != 0) ? (a[Number(n[2])] || b[n[2][0]] + ' ' + a[n[2][1]]) + 'Lakh ' : '';
  str += (n[3] != 0) ? (a[Number(n[3])] || b[n[3][0]] + ' ' + a[n[3][1]]) + 'Thousand ' : '';
  str += (n[4] != 0) ? (a[Number(n[4])] || b[n[4][0]] + ' ' + a[n[4][1]]) + 'Hundred ' : '';
  str += (n[5] != 0) ? ((str !== '') ? 'and ' : '') + (a[Number(n[5])] || b[n[5][0]] + ' ' + a[n[5][1]]) : '';
  return str.trim() + ' Taka Only';
};

// ── Branded PDF Header HTML (for reports) ──
export const buildPdfHeaderHtml = async (reportTitle, periodText) => {
  const info = getInstitutionInfo();
  const logo = await getLogoBase64();
  return `
    <div style="margin-bottom:0; padding:0;">
      <!-- Top Accent Bar -->
      <div style="height:5px; background:linear-gradient(90deg, #275fa7, #7bc62e); border-radius:3px 3px 0 0;"></div>
      
      <!-- Header Row -->
      <div style="display:flex; justify-content:space-between; align-items:center; padding:16px 24px 14px; background:#fafbfc; border-bottom:1px solid #e2e8f0;">
        <div style="display:flex; align-items:center; gap:12px;">
          ${logo ? `<img src="${logo}" style="height:44px;" />` : ''}
          <div>
            <div style="font-size:17px; font-weight:800; color:#275fa7; letter-spacing:0.5px; font-family:'Outfit','Inter',sans-serif;">LANGUAGE ACADEMY</div>
            <div style="font-size:9px; color:#64748b; margin-top:2px;">${info.address}</div>
            <div style="font-size:9px; color:#64748b;">Phone: ${info.phone} | ${info.email} | ${info.website}</div>
          </div>
        </div>
        ${reportTitle ? `
        <div style="text-align:right;">
          <div style="font-size:15px; font-weight:700; color:#275fa7; border:2px solid #275fa7; padding:5px 18px; border-radius:6px; letter-spacing:1px; text-transform:uppercase;">${reportTitle}</div>
          ${periodText ? `<div style="font-size:10px; color:#64748b; margin-top:6px;">${periodText}</div>` : ''}
        </div>
        ` : ''}
      </div>
    </div>
  `;
};

// ── Build a branded report table HTML for PDF export ──
export const buildReportTableHtml = (columns, rows, formatCell, reportTitle, periodText) => {
  const money = (v) => `BDT ${Number(v || 0).toLocaleString()}`;
  const dateF = (v) => (v ? new Date(v).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '-');
  const sumKeys = ['amount', 'due', 'debit', 'credit', 'balance'];

  const defaultFormat = (key, val) => {
    if (['amount', 'due', 'debit', 'credit', 'balance'].includes(key)) return money(val);
    if (['date', 'due_date', 'start_date', 'expiry_date', 'enrollment_date'].includes(key)) return dateF(val);
    return val || '-';
  };
  const fmt = formatCell || defaultFormat;

  // Calculate totals
  const totals = {};
  columns.forEach((key) => {
    if (sumKeys.includes(key)) {
      totals[key] = rows.reduce((sum, row) => sum + Number(row[key] || 0), 0);
    }
  });
  const hasTotals = rows.length > 0 && Object.keys(totals).length > 0;

  const thStyle = `padding:10px 12px; font-size:10px; font-weight:700; color:#fff; text-align:left; text-transform:uppercase; letter-spacing:0.5px; border-bottom:2px solid #1e4d8a; white-space:nowrap;`;
  const thStyleRight = `padding:10px 12px; font-size:10px; font-weight:700; color:#fff; text-align:right; text-transform:uppercase; letter-spacing:0.5px; border-bottom:2px solid #1e4d8a; white-space:nowrap;`;
  
  const headerCells = columns.map(key => {
    const align = sumKeys.includes(key) ? thStyleRight : thStyle;
    return `<th style="${align}">${key.replace(/_/g, ' ')}</th>`;
  }).join('');

  const bodyRows = rows.map((row, i) => {
    const bg = i % 2 === 0 ? '#ffffff' : '#f8fafc';
    const cells = columns.map(key => {
      const isNum = sumKeys.includes(key);
      return `<td style="padding:9px 12px; font-size:11px; color:#334155; border-bottom:1px solid #eef2f6; ${isNum ? 'text-align:right; font-weight:600; font-variant-numeric:tabular-nums;' : ''} white-space:nowrap;">${fmt(key, row[key])}</td>`;
    }).join('');
    return `<tr style="background:${bg};">${cells}</tr>`;
  }).join('');

  let footerRow = '';
  if (hasTotals) {
    const footCells = columns.map((key, i) => {
      if (i === 0) return `<td style="padding:10px 12px; font-size:12px; font-weight:800; color:#1e293b; border-top:2px solid #275fa7; background:#f0f7ff;">Total (${rows.length} records)</td>`;
      if (sumKeys.includes(key)) return `<td style="padding:10px 12px; font-size:12px; font-weight:800; color:#275fa7; text-align:right; border-top:2px solid #275fa7; background:#f0f7ff; font-variant-numeric:tabular-nums;">${money(totals[key])}</td>`;
      return `<td style="padding:10px 12px; border-top:2px solid #275fa7; background:#f0f7ff;"></td>`;
    }).join('');
    footerRow = `<tr>${footCells}</tr>`;
  }

  return `
    <table style="width:100%; border-collapse:collapse; margin-top:0; border:1px solid #e2e8f0; border-radius:6px;">
      <thead>
        <tr style="background:linear-gradient(135deg, #275fa7 0%, #1e4d8a 100%);">${headerCells}</tr>
      </thead>
      <tbody>${bodyRows}</tbody>
      ${footerRow ? `<tfoot>${footerRow}</tfoot>` : ''}
    </table>
  `;
};

// ── Signature Block HTML ──
export const buildSignatureBlockHtml = (signatures = ['Created by', 'Received by', 'Approved by']) => {
  const cols = signatures.map(label => `
    <div style="flex:1; text-align:center; padding:0 16px;">
      <div style="border-bottom:1px solid #334155; width:100%; margin-bottom:8px; height:40px;"></div>
      <div style="font-size:11px; font-weight:600; color:#334155;">${label}</div>
    </div>
  `).join('');
  return `
    <div style="display:flex; justify-content:space-between; margin-top:48px; padding-top:16px;">
      ${cols}
    </div>
  `;
};

// ── Watermark HTML (transparent logo) ──
const buildWatermarkHtml = (logoData, opacity = 0.04) => {
  if (!logoData) return '';
  return `
    <div style="position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); z-index:0; pointer-events:none;">
      <img src="${logoData}" style="width:280px; height:280px; opacity:${opacity}; object-fit:contain;" />
    </div>
  `;
};

// ══════════════════════════════════════════════════
// RECEIPT — Colorful, Brand-Friendly
// Supports both Student Enrollment and Custom Income
// ══════════════════════════════════════════════════

export const generateReceiptHtml = async (tx) => {
  const info = getInstitutionInfo();
  const logo = await getLogoBase64();
  const amount = parseFloat(tx.amount || 0);
  const amountWords = numberToWords(Math.floor(amount));
  const receiptNo = tx.receipt_no || `RCP-${tx.id}-${Date.now().toString().slice(-4)}`;
  const paidAt = tx.paid_at ? new Date(tx.paid_at).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' }) : new Date().toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' });
  const method = (tx.method || 'cash').toUpperCase();
  const branch = tx.Branch?.name || tx.branch_name || 'Head Office';

  // Detect if this is a custom income or enrollment receipt
  const isCustom = tx.source === 'manual' || (!tx.enrollment_id && tx.invoice_id) || tx.Invoice?.invoice_type === 'custom';

  const recipientName = isCustom
    ? (tx.Invoice?.customer_name || tx.Invoice?.Customer?.name || tx.customer_name || 'Customer')
    : (tx.Enrollment?.Student?.User?.name || tx.Invoice?.Student?.User?.name || tx.student_name || 'Student');
  const recipientLabel = isCustom ? 'Name' : 'Student Name';
  const recipientSuffix = isCustom
    ? (tx.Invoice?.Customer?.company ? ` (${tx.Invoice.Customer.company})` : '')
    : ` <span style="color:#64748b; font-weight:500;">(STU-${tx.Enrollment?.student_id || tx.Invoice?.student_id || tx.student_id || '-'})</span>`;

  const forLabel = isCustom ? 'For' : 'Course Name';
  const forValue = isCustom
    ? (tx.Invoice?.IncomeCategory?.name || 'Custom Income')
    : (tx.Enrollment?.Batch?.Course?.title || tx.course_name || 'Tuition Fee');
  const forSuffix = isCustom
    ? ''
    : ` <span style="color:#64748b; font-size:11px;">(Batch: ${tx.Enrollment?.Batch?.code || tx.batch_code || '-'})</span>`;

  const notesValue = isCustom
    ? (tx.Invoice?.notes || tx.transaction_ref || 'Custom Income Payment')
    : (tx.transaction_ref ? `Ref: ${tx.transaction_ref}` : 'Tuition Fee Payment');

  return `
    <div style="width:100%; font-family:'Inter','Segoe UI',sans-serif; position:relative; overflow:hidden; background:#ffffff; padding:0;">
      
      <!-- Top Accent Bar -->
      <div style="height:4px; background:linear-gradient(90deg, #275fa7, #7bc62e);"></div>
      
      <!-- Header -->
      <div style="padding:20px 28px 14px; display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #e2e8f0;">
        <div style="display:flex; align-items:center; gap:12px;">
          ${logo ? `<img src="${logo}" style="height:48px;" />` : ''}
          <div>
            <div style="font-size:18px; font-weight:800; color:#275fa7; font-family:'Outfit',sans-serif;">LANGUAGE ACADEMY</div>
            <div style="font-size:9px; color:#64748b;">${info.address}</div>
            <div style="font-size:9px; color:#64748b;">Phone: ${info.phone} | ${info.email} | ${info.website}</div>
          </div>
        </div>
        <div style="text-align:right;">
          <div style="font-size:16px; font-weight:800; color:#275fa7; letter-spacing:2px; border:2px solid #275fa7; padding:4px 14px; border-radius:6px;">MONEY RECEIPT</div>
        </div>
      </div>

      <!-- Body -->
      <div style="padding:18px 28px; position:relative;">
        ${buildWatermarkHtml(logo, 0.04)}

        <!-- Receipt Meta Row -->
        <div style="display:flex; justify-content:space-between; margin-bottom:18px; position:relative; z-index:1;">
          <div style="display:flex; gap:28px;">
            <div>
              <div style="font-size:10px; color:#64748b; text-transform:uppercase; letter-spacing:1px; margin-bottom:3px;">Receipt No</div>
              <div style="font-size:13px; font-weight:700; color:#275fa7;">${receiptNo}</div>
            </div>
            <div>
              <div style="font-size:10px; color:#64748b; text-transform:uppercase; letter-spacing:1px; margin-bottom:3px;">Date / Time</div>
              <div style="font-size:13px; font-weight:600;">${paidAt}</div>
            </div>
            <div>
              <div style="font-size:10px; color:#64748b; text-transform:uppercase; letter-spacing:1px; margin-bottom:3px;">Branch</div>
              <div style="font-size:13px; font-weight:600;">${branch}</div>
            </div>
          </div>
        </div>

        <!-- Detail Table -->
        <table style="width:100%; border-collapse:collapse; margin-bottom:18px; position:relative; z-index:1;">
          <tr style="background:#f8fafc;">
            <td style="padding:10px 14px; font-size:11px; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:0.5px; border:1px solid #e2e8f0; width:30%;">${recipientLabel}</td>
            <td style="padding:10px 14px; font-size:13px; font-weight:700; color:#1e293b; border:1px solid #e2e8f0;">${recipientName}${recipientSuffix}</td>
          </tr>
          <tr>
            <td style="padding:10px 14px; font-size:11px; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:0.5px; border:1px solid #e2e8f0;">${forLabel}</td>
            <td style="padding:10px 14px; font-size:13px; font-weight:600; color:#1e293b; border:1px solid #e2e8f0;">${forValue}${forSuffix}</td>
          </tr>
          <tr style="background:#f8fafc;">
            <td style="padding:10px 14px; font-size:11px; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:0.5px; border:1px solid #e2e8f0;">Payment Method</td>
            <td style="padding:10px 14px; font-size:13px; font-weight:600; color:#1e293b; border:1px solid #e2e8f0;">${method}</td>
          </tr>
          <tr>
            <td style="padding:10px 14px; font-size:11px; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:0.5px; border:1px solid #e2e8f0;">Amount (BDT)</td>
            <td style="padding:10px 14px; font-size:20px; font-weight:800; color:#275fa7; border:1px solid #e2e8f0;">৳${amount.toLocaleString()}</td>
          </tr>
          <tr style="background:#f8fafc;">
            <td style="padding:10px 14px; font-size:11px; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:0.5px; border:1px solid #e2e8f0;">Amount in Words</td>
            <td style="padding:10px 14px; font-size:12px; font-weight:600; color:#475569; border:1px solid #e2e8f0; text-transform:uppercase;">${amountWords}</td>
          </tr>
          <tr>
            <td style="padding:10px 14px; font-size:11px; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:0.5px; border:1px solid #e2e8f0;">Notes</td>
            <td style="padding:10px 14px; font-size:13px; color:#334155; border:1px solid #e2e8f0;">${notesValue}</td>
          </tr>
        </table>

        <!-- Signatures -->
        ${buildSignatureBlockHtml(['Created by', 'Received by', 'Approved by'])}
      </div>

      <!-- Bottom Accent Bar -->
      <div style="height:3px; background:linear-gradient(90deg, #7bc62e, #275fa7); margin-top:8px;"></div>
    </div>
  `;
};

export const downloadReceiptPdf = async (tx) => {
  const html = await generateReceiptHtml(tx);
  const container = document.createElement('div');
  container.innerHTML = html;
  container.style.background = 'white';

  const opt = {
    margin: [6, 6, 6, 6],
    filename: `Receipt-${tx.receipt_no || tx.id}.pdf`,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff' },
    jsPDF: { unit: 'mm', format: 'a5', orientation: 'landscape' }
  };

  const html2pdf = await loadHtml2Pdf();
  await html2pdf().set(opt).from(container).save();
};


// ══════════════════════════════════════════════════
// INVOICE PDF — Branded Invoice Export
// ══════════════════════════════════════════════════

export const generateInvoiceHtml = async (inv) => {
  const info = getInstitutionInfo();
  const logo = await getLogoBase64();
  const amount = parseFloat(inv.amount || 0);
  const paid = parseFloat(inv.paid || 0);
  const due = amount - paid;
  const amountWords = numberToWords(Math.floor(amount));
  const issuedAt = inv.issued_at ? new Date(inv.issued_at).toLocaleDateString('en-GB', { dateStyle: 'medium' }) : new Date().toLocaleDateString('en-GB', { dateStyle: 'medium' });
  const dueDate = inv.due_date ? new Date(inv.due_date).toLocaleDateString('en-GB', { dateStyle: 'medium' }) : 'N/A';

  const isCustom = inv.invoice_type === 'custom';
  const recipientName = isCustom
    ? (inv.customer_name || inv.Customer?.name || 'Customer')
    : (inv.Student?.User?.name || inv.Enrollment?.Student?.User?.name || 'Student');
  const recipientCompany = isCustom ? (inv.customer_company || inv.Customer?.company || '') : '';
  const recipientPhone = isCustom ? (inv.customer_phone || inv.Customer?.phone || '') : '';
  const recipientEmail = isCustom ? (inv.customer_email || inv.Customer?.email || '') : (inv.Student?.User?.email || '');
  const recipientAddress = isCustom ? (inv.customer_address || inv.Customer?.address || '') : '';
  const forText = isCustom
    ? (inv.IncomeCategory?.name || 'Custom Income')
    : (inv.Enrollment?.Batch?.Course?.title || 'Tuition Fee');

  const statusColor = { paid: '#10b981', pending: '#f59e0b', overdue: '#ef4444', partial: '#3b82f6', draft: '#64748b' }[inv.status] || '#64748b';

  return `
    <div style="width:100%; font-family:'Inter','Segoe UI',sans-serif; position:relative; overflow:hidden; background:#ffffff; padding:0;">
      
      <!-- Top Accent Bar -->
      <div style="height:4px; background:linear-gradient(90deg, #275fa7, #7bc62e);"></div>
      
      <!-- Header -->
      <div style="padding:24px 32px 16px; display:flex; justify-content:space-between; align-items:flex-start; border-bottom:1px solid #e2e8f0;">
        <div style="display:flex; align-items:center; gap:14px;">
          ${logo ? `<img src="${logo}" style="height:52px;" />` : ''}
          <div>
            <div style="font-size:20px; font-weight:800; color:#275fa7; font-family:'Outfit',sans-serif;">LANGUAGE ACADEMY</div>
            <div style="font-size:10px; color:#64748b; margin-top:2px;">${info.address}</div>
            <div style="font-size:10px; color:#64748b;">Phone: ${info.phone} | ${info.email}</div>
            <div style="font-size:10px; color:#64748b;">Web: ${info.website}</div>
          </div>
        </div>
        <div style="text-align:right;">
          <div style="font-size:20px; font-weight:800; color:#275fa7; letter-spacing:3px; border:2px solid #275fa7; padding:6px 18px; border-radius:6px;">INVOICE</div>
          <div style="margin-top:10px; font-size:12px; color:#64748b;">Invoice #: <strong style="color:#1e293b;">${inv.invoice_no || 'N/A'}</strong></div>
          <div style="font-size:12px; color:#64748b;">Date: <strong style="color:#1e293b;">${issuedAt}</strong></div>
          <div style="font-size:12px; color:#64748b;">Due: <strong style="color:#1e293b;">${dueDate}</strong></div>
          <div style="margin-top:6px;"><span style="padding:4px 12px; border-radius:12px; font-size:11px; font-weight:700; background:${statusColor}20; color:${statusColor}; text-transform:uppercase;">${inv.status}</span></div>
        </div>
      </div>

      <!-- Body -->
      <div style="padding:24px 32px; position:relative;">
        ${buildWatermarkHtml(logo, 0.03)}

        <!-- Bill To -->
        <div style="margin-bottom:24px; position:relative; z-index:1;">
          <div style="font-size:10px; color:#64748b; text-transform:uppercase; letter-spacing:1.5px; margin-bottom:6px; font-weight:700;">Bill To</div>
          <div style="font-size:15px; font-weight:700; color:#1e293b;">${recipientName}</div>
          ${recipientCompany ? `<div style="font-size:12px; color:#475569;">${recipientCompany}</div>` : ''}
          ${recipientPhone ? `<div style="font-size:12px; color:#64748b;">📱 ${recipientPhone}</div>` : ''}
          ${recipientEmail ? `<div style="font-size:12px; color:#64748b;">✉ ${recipientEmail}</div>` : ''}
          ${recipientAddress ? `<div style="font-size:12px; color:#64748b;">📍 ${recipientAddress}</div>` : ''}
        </div>

        <!-- Items Table -->
        <table style="width:100%; border-collapse:collapse; margin-bottom:20px; position:relative; z-index:1;">
          <thead>
            <tr style="background:#275fa7;">
              <th style="padding:10px 14px; font-size:10px; font-weight:700; color:#fff; text-align:left; text-transform:uppercase; letter-spacing:0.5px; border:1px solid #1e4d8a;">#</th>
              <th style="padding:10px 14px; font-size:10px; font-weight:700; color:#fff; text-align:left; text-transform:uppercase; letter-spacing:0.5px; border:1px solid #1e4d8a;">Description</th>
              <th style="padding:10px 14px; font-size:10px; font-weight:700; color:#fff; text-align:right; text-transform:uppercase; letter-spacing:0.5px; border:1px solid #1e4d8a;">Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr style="background:#f8fafc;">
              <td style="padding:12px 14px; font-size:12px; border:1px solid #e2e8f0;">1</td>
              <td style="padding:12px 14px; font-size:13px; font-weight:600; color:#1e293b; border:1px solid #e2e8f0;">
                ${forText}
                ${inv.notes ? `<div style="font-size:11px; color:#64748b; margin-top:4px;">${inv.notes}</div>` : ''}
              </td>
              <td style="padding:12px 14px; font-size:14px; font-weight:700; color:#1e293b; border:1px solid #e2e8f0; text-align:right;">৳${amount.toLocaleString()}</td>
            </tr>
          </tbody>
        </table>

        <!-- Totals -->
        <div style="display:flex; justify-content:flex-end; position:relative; z-index:1;">
          <table style="width:260px; border-collapse:collapse;">
            <tr>
              <td style="padding:8px 14px; font-size:12px; font-weight:600; color:#64748b; border:1px solid #e2e8f0;">Subtotal</td>
              <td style="padding:8px 14px; font-size:13px; font-weight:600; text-align:right; border:1px solid #e2e8f0;">৳${amount.toLocaleString()}</td>
            </tr>
            <tr>
              <td style="padding:8px 14px; font-size:12px; font-weight:600; color:#10b981; border:1px solid #e2e8f0;">Paid</td>
              <td style="padding:8px 14px; font-size:13px; font-weight:600; text-align:right; color:#10b981; border:1px solid #e2e8f0;">৳${paid.toLocaleString()}</td>
            </tr>
            <tr style="background:#f0f9ff;">
              <td style="padding:10px 14px; font-size:13px; font-weight:800; color:#275fa7; border:1px solid #e2e8f0;">Balance Due</td>
              <td style="padding:10px 14px; font-size:16px; font-weight:800; text-align:right; color:#275fa7; border:1px solid #e2e8f0;">৳${due.toLocaleString()}</td>
            </tr>
          </table>
        </div>

        <!-- Amount in Words -->
        <div style="margin-top:16px; padding:10px 14px; background:#f8fafc; border:1px solid #e2e8f0; border-radius:6px; position:relative; z-index:1;">
          <span style="font-size:10px; color:#64748b; text-transform:uppercase; letter-spacing:1px; font-weight:700;">Amount in Words: </span>
          <span style="font-size:12px; font-weight:600; color:#475569; text-transform:uppercase;">${amountWords}</span>
        </div>

        <!-- Signatures -->
        ${buildSignatureBlockHtml(['Prepared by', 'Received by', 'Authorized by'])}
      </div>

      <!-- Footer -->
      <div style="padding:10px 32px; border-top:1px solid #e2e8f0; text-align:center;">
        <div style="font-size:10px; color:#94a3b8;">Thank you for your business · ${info.name} · ${info.website}</div>
      </div>
      
      <!-- Bottom Accent Bar -->
      <div style="height:3px; background:linear-gradient(90deg, #7bc62e, #275fa7);"></div>
    </div>
  `;
};

export const downloadInvoicePdf = async (inv) => {
  const html = await generateInvoiceHtml(inv);
  const container = document.createElement('div');
  container.innerHTML = html;
  container.style.background = 'white';

  const opt = {
    margin: [8, 8, 8, 8],
    filename: `Invoice-${inv.invoice_no || inv.id}.pdf`,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff' },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
  };

  const html2pdf = await loadHtml2Pdf();
  await html2pdf().set(opt).from(container).save();
};


// ══════════════════════════════════════════════════
// VOUCHER — White background, Brand-color accents (A5 Landscape)
// ══════════════════════════════════════════════════

export const generateVoucherHtml = async (expense) => {
  const info = getInstitutionInfo();
  const logo = await getLogoBase64();
  const amount = parseFloat(expense.amount || 0);
  const amountWords = numberToWords(Math.floor(amount));
  const voucherNo = `VCH-${expense.id}-${Date.now().toString().slice(-4)}`;
  const expDate = expense.date ? new Date(expense.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  const branch = expense.Branch?.name || expense.branch_name || 'Head Office';
  const payee = expense.category || 'Office Expense';
  const method = (expense.payment_method || 'cash').replace(/_/g, ' ').toUpperCase();
  const reason = expense.description || 'Office Expense';

  return `
    <div style="width:100%; font-family:'Inter','Segoe UI',sans-serif; position:relative; overflow:hidden; background:#ffffff; padding:0;">
      
      <!-- Top Accent Bar -->
      <div style="height:4px; background:linear-gradient(90deg, #275fa7, #7bc62e);"></div>
      
      <!-- Header -->
      <div style="padding:20px 28px 14px; display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #e2e8f0;">
        <div style="display:flex; align-items:center; gap:12px;">
          ${logo ? `<img src="${logo}" style="height:48px;" />` : ''}
          <div>
            <div style="font-size:18px; font-weight:800; color:#275fa7; font-family:'Outfit',sans-serif;">LANGUAGE ACADEMY</div>
            <div style="font-size:9px; color:#64748b;">${info.address}</div>
            <div style="font-size:9px; color:#64748b;">Phone: ${info.phone} | ${info.email} | ${info.website}</div>
          </div>
        </div>
        <div style="text-align:right;">
          <div style="font-size:16px; font-weight:800; color:#275fa7; letter-spacing:2px; border:2px solid #275fa7; padding:4px 14px; border-radius:6px;">MONEY VOUCHER</div>
        </div>
      </div>

      <!-- Body -->
      <div style="padding:18px 28px; position:relative;">
        ${buildWatermarkHtml(logo, 0.04)}

        <!-- Voucher Meta Row -->
        <div style="display:flex; justify-content:space-between; margin-bottom:18px; position:relative; z-index:1;">
          <div style="display:flex; gap:28px;">
            <div>
              <div style="font-size:10px; color:#64748b; text-transform:uppercase; letter-spacing:1px; margin-bottom:3px;">Voucher No</div>
              <div style="font-size:13px; font-weight:700; color:#275fa7;">${voucherNo}</div>
            </div>
            <div>
              <div style="font-size:10px; color:#64748b; text-transform:uppercase; letter-spacing:1px; margin-bottom:3px;">Date</div>
              <div style="font-size:13px; font-weight:600;">${expDate}</div>
            </div>
            <div>
              <div style="font-size:10px; color:#64748b; text-transform:uppercase; letter-spacing:1px; margin-bottom:3px;">Branch</div>
              <div style="font-size:13px; font-weight:600;">${branch}</div>
            </div>
          </div>
        </div>

        <!-- Detail Table -->
        <table style="width:100%; border-collapse:collapse; margin-bottom:18px; position:relative; z-index:1;">
          <tr style="background:#f8fafc;">
            <td style="padding:10px 14px; font-size:11px; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:0.5px; border:1px solid #e2e8f0; width:30%;">Payee</td>
            <td style="padding:10px 14px; font-size:13px; font-weight:600; color:#1e293b; border:1px solid #e2e8f0;">${payee}</td>
          </tr>
          <tr>
            <td style="padding:10px 14px; font-size:11px; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:0.5px; border:1px solid #e2e8f0;">Payment Method</td>
            <td style="padding:10px 14px; font-size:13px; font-weight:600; color:#1e293b; border:1px solid #e2e8f0;">${method}</td>
          </tr>
          <tr style="background:#f8fafc;">
            <td style="padding:10px 14px; font-size:11px; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:0.5px; border:1px solid #e2e8f0;">Amount (BDT)</td>
            <td style="padding:10px 14px; font-size:20px; font-weight:800; color:#275fa7; border:1px solid #e2e8f0;">৳${amount.toLocaleString()}</td>
          </tr>
          <tr>
            <td style="padding:10px 14px; font-size:11px; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:0.5px; border:1px solid #e2e8f0;">Amount in Words</td>
            <td style="padding:10px 14px; font-size:12px; font-weight:600; color:#475569; border:1px solid #e2e8f0; text-transform:uppercase;">${amountWords}</td>
          </tr>
          <tr style="background:#f8fafc;">
            <td style="padding:10px 14px; font-size:11px; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:0.5px; border:1px solid #e2e8f0;">Reason / Description</td>
            <td style="padding:10px 14px; font-size:13px; color:#334155; border:1px solid #e2e8f0;">${reason}</td>
          </tr>
        </table>

        <!-- Signatures -->
        ${buildSignatureBlockHtml(['Created by', 'Checked by', 'Approved by'])}
      </div>

      <!-- Bottom Accent Bar -->
      <div style="height:3px; background:linear-gradient(90deg, #7bc62e, #275fa7); margin-top:8px;"></div>
    </div>
  `;
};

export const downloadVoucherPdf = async (expense) => {
  const html = await generateVoucherHtml(expense);
  const container = document.createElement('div');
  container.innerHTML = html;
  container.style.background = 'white';

  const opt = {
    margin: [6, 6, 6, 6],
    filename: `Voucher-${expense.id}.pdf`,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff' },
    jsPDF: { unit: 'mm', format: 'a5', orientation: 'landscape' }
  };

  const html2pdf = await loadHtml2Pdf();
  await html2pdf().set(opt).from(container).save();
};


// ══════════════════════════════════════════════════
// EXPENSE LIST PDF EXPORT
// ══════════════════════════════════════════════════

export const downloadExpenseListPdf = async (expenses, dateRange) => {
  const info = getInstitutionInfo();
  const periodText = dateRange?.from && dateRange?.to
    ? `Period: ${dateRange.from} to ${dateRange.to}`
    : `Generated: ${new Date().toLocaleDateString('en-GB', { dateStyle: 'medium' })}`;

  const header = await buildPdfHeaderHtml('Expense Report', periodText);
  const totalAmount = expenses.reduce((s, e) => s + (e.status === 'deleted' ? 0 : parseFloat(e.amount || 0)), 0);

  const thStyle = `padding:10px 12px; font-size:10px; font-weight:700; color:#fff; text-transform:uppercase; letter-spacing:0.5px; border-bottom:2px solid #1e4d8a; white-space:nowrap;`;

  const tableRows = expenses.map((e, i) => {
    const isDeleted = e.status === 'deleted';
    const dec = isDeleted ? 'line-through' : 'none';
    const col = isDeleted ? '#94a3b8' : '#334155';
    const bg = i % 2 === 0 ? '#ffffff' : '#f8fafc';
    
    return `
    <tr style="background:${bg};">
      <td style="padding:9px 12px; border-bottom:1px solid #eef2f6; font-size:11px; color:${col}; white-space:nowrap;">${e.date ? new Date(e.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}</td>
      <td style="padding:9px 12px; border-bottom:1px solid #eef2f6; font-size:11px; color:${col};">
        <span style="text-decoration:${dec}">${e.description || '-'}</span>
        ${isDeleted ? `<div style="font-size:9px; color:#ef4444; margin-top:2px;">Reversed: ${e.deletion_reason || 'N/A'}</div>` : ''}
      </td>
      <td style="padding:9px 12px; border-bottom:1px solid #eef2f6; font-size:11px; color:${col};">${e.category || '-'}</td>
      <td style="padding:9px 12px; border-bottom:1px solid #eef2f6; font-size:11px; text-align:right; font-weight:600; text-decoration:${dec}; color:${col}; font-variant-numeric:tabular-nums;">৳${parseFloat(e.amount).toLocaleString()}</td>
      <td style="padding:9px 12px; border-bottom:1px solid #eef2f6; font-size:11px; color:${col}; text-transform:capitalize;">${(e.payment_method || '').replace(/_/g, ' ')}</td>
      <td style="padding:9px 12px; border-bottom:1px solid #eef2f6; font-size:11px; color:${isDeleted ? '#ef4444' : '#10b981'}; font-weight:600; text-transform:uppercase;">${isDeleted ? 'REVERSED' : e.status}</td>
    </tr>`;
  }).join('');

  const html = `
    <div style="font-family:'Inter','Segoe UI',sans-serif; background:#fff; color:#1e293b; padding:0;">
      ${header}
      <div style="padding:18px 24px 24px;">
        <table style="width:100%; border-collapse:collapse; border:1px solid #e2e8f0;">
          <thead>
            <tr style="background:linear-gradient(135deg, #275fa7 0%, #1e4d8a 100%);">
              <th style="${thStyle} text-align:left;">Date</th>
              <th style="${thStyle} text-align:left;">Description</th>
              <th style="${thStyle} text-align:left;">Category</th>
              <th style="${thStyle} text-align:right;">Amount</th>
              <th style="${thStyle} text-align:left;">Method</th>
              <th style="${thStyle} text-align:left;">Status</th>
            </tr>
          </thead>
          <tbody>${tableRows}</tbody>
          <tfoot>
            <tr>
              <td colspan="3" style="padding:10px 12px; font-size:12px; font-weight:800; color:#1e293b; text-align:right; border-top:2px solid #275fa7; background:#f0f7ff;">Total (${expenses.filter(e => e.status !== 'deleted').length} active records)</td>
              <td style="padding:10px 12px; font-size:13px; font-weight:800; color:#275fa7; text-align:right; border-top:2px solid #275fa7; background:#f0f7ff; font-variant-numeric:tabular-nums;">৳${totalAmount.toLocaleString()}</td>
              <td colspan="2" style="border-top:2px solid #275fa7; background:#f0f7ff;"></td>
            </tr>
          </tfoot>
        </table>

        <!-- Footer -->
        <div style="margin-top:28px; padding-top:10px; border-top:1px solid #e2e8f0; display:flex; justify-content:space-between; align-items:center;">
          <div style="font-size:9px; color:#94a3b8;">Generated on ${new Date().toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}</div>
          <div style="font-size:9px; color:#94a3b8;">${info.name} Finance System · ${info.website}</div>
        </div>
      </div>
      <!-- Bottom Accent Bar -->
      <div style="height:4px; background:linear-gradient(90deg, #7bc62e, #275fa7); border-radius:0 0 3px 3px;"></div>
    </div>
  `;

  const container = document.createElement('div');
  container.innerHTML = html;
  container.style.background = 'white';

  const opt = {
    margin: [8, 8, 8, 8],
    filename: `Expense-Report-${new Date().toISOString().split('T')[0]}.pdf`,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff' },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' }
  };

  const html2pdf = await loadHtml2Pdf();
  await html2pdf().set(opt).from(container).save();
};
