/* Seventh Sky Property Care — branded client-side PDF builder (html2pdf.js).
   Do NOT reuse utils/pdfUtils.js (it carries Language Academy branding). */

const NAVY = '#003768';
const CYAN = '#12b6f3';

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function headerHtml(title, subtitle) {
  return `
  <div style="display:flex;align-items:center;gap:12px;border-bottom:4px solid ${CYAN};padding-bottom:12px;margin-bottom:6px;">
    <div style="width:44px;height:44px;border-radius:10px;background:linear-gradient(135deg,${NAVY},${CYAN});color:#fff;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:18px;font-family:Arial;">7S</div>
    <div style="font-family:Arial;">
      <div style="font-size:17px;font-weight:800;color:${NAVY};">Seventh Sky Property Care</div>
      <div style="font-size:11px;color:#64748b;">Property management &amp; care — Bangladesh</div>
    </div>
    <div style="margin-left:auto;text-align:right;font-family:Arial;">
      <div style="font-size:14px;font-weight:800;color:${NAVY};">${esc(title)}</div>
      <div style="font-size:11px;color:#64748b;">${esc(subtitle || '')}</div>
    </div>
  </div>`;
}

const mark = (v) => (v === true ? '<span style="color:#15803d;font-weight:700;">Yes</span>' : v === false ? '<span style="color:#b91c1c;font-weight:700;">No</span>' : '<span style="color:#94a3b8;">—</span>');

const bdt = (v) => '৳' + Number(v || 0).toLocaleString();

async function htmlToBlob(html, filename) {
  const { default: html2pdf } = await import('html2pdf.js');
  const container = document.createElement('div');
  container.innerHTML = html;
  return html2pdf().set({
    margin: [12, 12, 14, 12], filename, image: { type: 'jpeg', quality: 0.95 },
    html2canvas: { scale: 2, useCORS: true }, jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
  }).from(container).outputPdf('blob');
}

/** Branded rent receipt → PDF Blob (printable / handable to the tenant). */
export async function buildRentReceiptBlob({ receipt = {}, tenancy = {}, property = {} }) {
  const today = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  const paid = receipt.status === 'paid';
  const partial = !paid && Number(receipt.amount_paid) > 0;
  const stamp = paid ? { t: 'PAID', c: '#15803d', bg: '#dcfce7' } : partial ? { t: 'PARTIAL', c: '#b45309', bg: '#fef3c7' } : { t: 'DUE', c: '#b91c1c', bg: '#fee2e2' };
  const row = (label, val, opt = {}) => `<tr><td style="padding:7px 10px;border:1px solid #e2e8f0;${opt.b ? 'font-weight:700;' : ''}${opt.c ? `color:${opt.c};` : ''}">${label}</td><td style="padding:7px 10px;border:1px solid #e2e8f0;text-align:right;${opt.b ? 'font-weight:700;' : ''}${opt.c ? `color:${opt.c};` : ''}">${bdt(val)}</td></tr>`;
  const tenantName = tenancy.tenant?.full_name || '';
  const html = `
  <div style="font-family:Arial;color:#0f172a;padding:6px;">
    ${headerHtml('Rent Receipt', `${esc(receipt.receipt_code || '')} · ${today}`)}
    <table style="width:100%;font-size:12.5px;margin:8px 0;">
      <tr><td style="padding:3px 0;color:#64748b;width:120px;">Property</td><td style="font-weight:700;">${esc(property.title || '')}</td>
          <td style="padding:3px 0;color:#64748b;width:90px;">Period</td><td style="font-weight:700;">${esc(receipt.period_label || '')}</td></tr>
      <tr><td style="padding:3px 0;color:#64748b;">Tenant</td><td>${esc(tenantName)}</td>
          <td style="padding:3px 0;color:#64748b;">Status</td><td><span style="background:${stamp.bg};color:${stamp.c};padding:2px 10px;border-radius:6px;font-weight:800;font-size:11px;">${stamp.t}</span></td></tr>
    </table>
    <table style="width:100%;border-collapse:collapse;font-size:13px;margin-top:6px;">
      ${row('Monthly rent', receipt.rent_amount)}
      ${row('Service charge', receipt.service_charge)}
      ${row('Total', receipt.total_amount, { b: true })}
      ${row('Amount paid', receipt.amount_paid, { c: '#15803d' })}
      ${row('Balance', receipt.balance, { b: true, c: Number(receipt.balance) > 0 ? '#b91c1c' : '#15803d' })}
    </table>
    ${Number(receipt.balance) > 0
      ? `<p style="font-size:12.5px;color:#b45309;">Balance of ${bdt(receipt.balance)} remains due${receipt.due_date ? ` (due ${esc(receipt.due_date)})` : ''}.</p>`
      : '<p style="font-size:12.5px;color:#15803d;">Thank you — this period is fully paid.</p>'}
    <div style="margin-top:26px;display:flex;gap:40px;font-size:11.5px;">
      <div style="flex:1;border-top:1px solid #94a3b8;padding-top:5px;">Received by — Seventh Sky Property Care</div>
      <div style="flex:1;border-top:1px solid #94a3b8;padding-top:5px;">Date: ${today}</div>
    </div>
    <div style="margin-top:10px;font-size:9.5px;color:#94a3b8;">Computer-generated rent receipt. Retain for your records.</div>
  </div>`;
  return htmlToBlob(html, `rent-receipt-${receipt.receipt_code || 'receipt'}.pdf`);
}

/** Rent / service-charge increment (review) notice → PDF Blob. */
export async function buildIncrementNoticeBlob({ tenancy = {}, increment = {}, effective_date }) {
  const today = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  const rows = [];
  if (Number(increment.rent_to) > Number(increment.rent_from)) rows.push(['Monthly rent', bdt(increment.rent_from), bdt(increment.rent_to)]);
  if (Number(increment.service_to) > Number(increment.service_from)) rows.push(['Service charge', bdt(increment.service_from), bdt(increment.service_to)]);
  const html = `
  <div style="font-family:Arial;color:#0f172a;padding:6px;">
    ${headerHtml('Rent / Service Review Notice', `${esc(tenancy.tenancy_code || '')} · ${today}`)}
    <p style="font-size:12.5px;">Dear ${esc(tenancy.tenant?.full_name || 'Tenant')},</p>
    <p style="font-size:12.5px;">This is a formal notice of a review to the terms of your tenancy, taking effect on
    <b>${esc(effective_date || 'the renewal date')}</b>:</p>
    <table style="width:100%;border-collapse:collapse;font-size:12px;margin:8px 0;">
      <thead><tr style="background:#f1f5f9;"><th style="text-align:left;padding:7px 9px;border:1px solid #e2e8f0;">Charge</th><th style="padding:7px 9px;border:1px solid #e2e8f0;">Current</th><th style="padding:7px 9px;border:1px solid #e2e8f0;">Revised</th></tr></thead>
      <tbody>${rows.map((r) => `<tr><td style="padding:7px 9px;border:1px solid #e2e8f0;">${r[0]}</td><td style="text-align:center;padding:7px 9px;border:1px solid #e2e8f0;">${r[1]}</td><td style="text-align:center;padding:7px 9px;border:1px solid #e2e8f0;font-weight:700;">${r[2]}</td></tr>`).join('')}</tbody>
    </table>
    <p style="font-size:12.5px;">A renewal agreement reflecting these terms will follow for your review and electronic signature.
    Please contact us with any questions.</p>
    <p style="font-size:12.5px;margin-top:22px;">Yours sincerely,<br/><b>Seventh Sky Property Care</b></p>
    <div style="margin-top:10px;font-size:9.5px;color:#94a3b8;">This notice is issued as part of the tenancy's rent-review process under the tenancy agreement.</div>
  </div>`;
  return htmlToBlob(html, `rent-notice-${tenancy.tenancy_code || 'notice'}.pdf`);
}

/** Build the room-by-room assessment report HTML and return a PDF Blob. */
export async function buildAssessmentReportBlob({ assessment, property, fileSrc }) {
  const items = assessment.items || [];
  const rooms = [...new Set(items.map((i) => i.section || 'General'))];
  const today = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

  const roomTables = rooms.map((room) => {
    const rows = items.filter((i) => (i.section || 'General') === room).map((i) => {
      const photos = (Array.isArray(i.photos) ? i.photos : []).slice(0, 4)
        .map((u) => `<img src="${esc(fileSrc ? fileSrc(u) : u)}" style="width:52px;height:40px;object-fit:cover;border-radius:4px;margin:1px;border:1px solid #e5e7eb;" />`)
        .join('');
      return `<tr>
        <td style="padding:6px 8px;border:1px solid #e2e8f0;font-size:11px;">${esc(i.assessment_item)}</td>
        <td style="padding:6px 8px;border:1px solid #e2e8f0;text-align:center;font-size:11px;">${mark(i.is_clean)}</td>
        <td style="padding:6px 8px;border:1px solid #e2e8f0;text-align:center;font-size:11px;">${mark(i.is_undamaged)}</td>
        <td style="padding:6px 8px;border:1px solid #e2e8f0;text-align:center;font-size:11px;">${mark(i.is_working)}</td>
        <td style="padding:6px 8px;border:1px solid #e2e8f0;font-size:11px;">${esc(i.finding || i.notes || '')}</td>
        <td style="padding:4px;border:1px solid #e2e8f0;">${photos}</td>
      </tr>`;
    }).join('');
    return `
    <div class="room-block" style="margin-top:14px;">
      <div style="background:${NAVY};color:#fff;font-weight:800;font-size:12.5px;padding:7px 10px;border-radius:6px 6px 0 0;font-family:Arial;">${esc(room)}</div>
      <table style="width:100%;border-collapse:collapse;font-family:Arial;">
        <thead><tr style="background:#f1f5f9;">
          <th style="padding:6px 8px;border:1px solid #e2e8f0;font-size:10.5px;text-align:left;width:26%;">Area item</th>
          <th style="padding:6px 8px;border:1px solid #e2e8f0;font-size:10.5px;width:9%;">Clean</th>
          <th style="padding:6px 8px;border:1px solid #e2e8f0;font-size:10.5px;width:11%;">Undamaged</th>
          <th style="padding:6px 8px;border:1px solid #e2e8f0;font-size:10.5px;width:9%;">Working</th>
          <th style="padding:6px 8px;border:1px solid #e2e8f0;font-size:10.5px;text-align:left;">Comment</th>
          <th style="padding:6px 8px;border:1px solid #e2e8f0;font-size:10.5px;width:20%;">Photos</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
  }).join('');

  const html = `
  <div style="padding:8px;font-family:Arial;color:#0f172a;">
    ${headerHtml('Property Assessment Report', `${assessment.assessment_code || ''} · ${today}`)}
    <table style="width:100%;font-size:11.5px;margin-top:8px;font-family:Arial;">
      <tr>
        <td style="padding:3px 0;color:#64748b;width:110px;">Property</td><td style="font-weight:700;">${esc(property?.title || '')}</td>
        <td style="padding:3px 0;color:#64748b;width:110px;">Address</td><td>${esc([property?.address, property?.area, property?.city].filter(Boolean).join(', '))}</td>
      </tr>
      <tr>
        <td style="padding:3px 0;color:#64748b;">Assessment date</td><td>${esc(assessment.assessment_date || today)}</td>
        <td style="padding:3px 0;color:#64748b;">Readiness</td><td style="font-weight:700;">${esc(assessment.readiness_score ?? 0)}% — ${esc(String(assessment.readiness_status || '').replace(/_/g, ' '))}</td>
      </tr>
      <tr>
        <td style="padding:3px 0;color:#64748b;">Market rent</td><td>${esc(assessment.market_rent_min || '—')} – ${esc(assessment.market_rent_max || '—')}</td>
        <td style="padding:3px 0;color:#64748b;">Recommended rent</td><td style="font-weight:700;">${esc(assessment.recommended_rent || '—')}</td>
      </tr>
    </table>
    ${assessment.summary ? `<p style="font-size:11.5px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:8px;">${esc(assessment.summary)}</p>` : ''}
    ${roomTables}
    <div style="margin-top:26px;display:flex;gap:40px;font-family:Arial;font-size:11.5px;">
      <div style="flex:1;border-top:1px solid #94a3b8;padding-top:5px;">Assessed by — Seventh Sky Property Care</div>
      <div style="flex:1;border-top:1px solid #94a3b8;padding-top:5px;">Date: ${today}</div>
    </div>
    <div style="margin-top:10px;font-size:9.5px;color:#94a3b8;font-family:Arial;">Generated by the Seventh Sky property management system. This report forms part of the property's rental management records and may be attached to the owner's management agreement.</div>
  </div>`;

  const { default: html2pdf } = await import('html2pdf.js');
  const container = document.createElement('div');
  container.innerHTML = html;
  const blob = await html2pdf().set({
    margin: [10, 8, 12, 8],
    filename: `assessment-${assessment.assessment_code || assessment.id}.pdf`,
    image: { type: 'jpeg', quality: 0.9 },
    html2canvas: { scale: 2, useCORS: true },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
    pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
  }).from(container).outputPdf('blob');
  return blob;
}
