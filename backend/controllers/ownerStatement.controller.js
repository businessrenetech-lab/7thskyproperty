const { Op } = require('sequelize');
const OwnerStatement = require('../models/OwnerStatement');
const Contact = require('../models/Contact');
const Property = require('../models/Property');
const PropertyOwnerProfile = require('../models/PropertyOwnerProfile');
const Tenancy = require('../models/Tenancy');
const { asyncHandler, branchScope, resolveBranchId, getPagination, pick } = require('../utils/controllerHelpers');
const { computeStatement, generateStatement } = require('../services/ownerStatement.service');

const ownerInc = { model: Contact, as: 'owner', attributes: ['id', 'full_name', 'primary_phone', 'email'] };
const propInc = { model: Property, as: 'property', attributes: ['id', 'property_code', 'title', 'area', 'district'] };

// ─── LIST ───────────────────────────────────────────────────────────────────
exports.list = asyncHandler(async (req, res) => {
  const { limit, offset, page } = getPagination(req);
  const where = { ...branchScope(req) };
  if (req.query.owner_contact_id) where.owner_contact_id = req.query.owner_contact_id;
  if (req.query.property_id) where.property_id = req.query.property_id;
  if (req.query.period_label) where.period_label = req.query.period_label;
  if (req.query.status) where.status = req.query.status;
  const { rows, count } = await OwnerStatement.findAndCountAll({
    where, include: [ownerInc, propInc], limit, offset,
    order: [['period_label', 'DESC'], ['created_at', 'DESC']],
  });

  let status_counts;
  if (req.query.include_counts === 'true') {
    const base = { ...branchScope(req) };
    const [d, r, s, p, c] = await Promise.all([
      OwnerStatement.count({ where: { ...base, status: 'draft' } }),
      OwnerStatement.count({ where: { ...base, status: 'ready' } }),
      OwnerStatement.count({ where: { ...base, status: 'sent' } }),
      OwnerStatement.count({ where: { ...base, status: 'paid' } }),
      OwnerStatement.count({ where: { ...base, status: 'closed' } }),
    ]);
    status_counts = { draft: d, ready: r, sent: s, paid: p, closed: c, all: d + r + s + p + c };
  }
  res.json({ data: rows, pagination: { page, limit, total: count, pages: Math.ceil(count / limit) }, status_counts });
});

exports.getOne = asyncHandler(async (req, res) => {
  const s = await OwnerStatement.findOne({ where: { id: req.params.id, ...branchScope(req) }, include: [ownerInc, propInc] });
  if (!s) return res.status(404).json({ error: 'Statement not found.' });
  res.json({ data: s });
});

// ─── PREVIEW (compute without persisting) ───────────────────────────────────
exports.preview = asyncHandler(async (req, res) => {
  const { owner_contact_id, property_id, period_label } = req.body || {};
  if (!owner_contact_id || !period_label) return res.status(400).json({ error: 'owner_contact_id and period_label required.' });
  const preview = await computeStatement({ owner_contact_id, property_id: property_id || null, period_label });
  const owner = await Contact.findByPk(owner_contact_id, { attributes: ['id', 'full_name', 'primary_phone', 'email'] });
  const property = property_id ? await Property.findByPk(property_id, { attributes: ['id', 'property_code', 'title', 'address', 'area', 'district'] }) : null;
  res.json({ data: preview, owner, property });
});

// ─── GENERATE / REGENERATE ──────────────────────────────────────────────────
exports.create = asyncHandler(async (req, res) => {
  const { owner_contact_id, property_id, period_label, regenerate } = req.body || {};
  if (!owner_contact_id || !period_label) return res.status(400).json({ error: 'owner_contact_id and period_label required.' });
  const stmt = await generateStatement({
    owner_contact_id, property_id: property_id || null, period_label,
    generated_by: req.user?.id || null,
    branch_id: resolveBranchId(req, req.body.branch_id),
    regenerate: !!regenerate,
  });
  res.status(201).json({ data: stmt, message: `Statement ${stmt.statement_code} ${regenerate ? 'regenerated' : 'generated'}.` });
});

// ─── BULK GENERATE for a period ─────────────────────────────────────────────
// Finds every owner+property that has folio activity in the period and generates statements.
exports.bulkGenerate = asyncHandler(async (req, res) => {
  const { period_label, regenerate } = req.body || {};
  if (!period_label) return res.status(400).json({ error: 'period_label required.' });

  // Enumerate every managed rental property + its current owner.
  const props = await Property.findAll({
    where: { listing_type: 'rent', owner_contact_id: { [Op.not]: null }, ...branchScope(req) },
    attributes: ['id', 'owner_contact_id', 'branch_id'],
  });
  let created = 0, skipped = 0;
  for (const p of props) {
    try {
      await generateStatement({
        owner_contact_id: p.owner_contact_id, property_id: p.id, period_label,
        generated_by: req.user?.id || null,
        branch_id: p.branch_id,
        regenerate: !!regenerate,
      });
      created++;
    } catch (e) { skipped++; }
  }
  res.json({ message: `Generated ${created} statement(s) for ${period_label}. Skipped ${skipped}.`, created, skipped, period_label });
});

// ─── UPDATE ─────────────────────────────────────────────────────────────────
exports.update = asyncHandler(async (req, res) => {
  const s = await OwnerStatement.findOne({ where: { id: req.params.id, ...branchScope(req) } });
  if (!s) return res.status(404).json({ error: 'Statement not found.' });
  await s.update(pick(req.body, ['status', 'notes', 'disbursement_date', 'disbursement_reference', 'disbursement_method']));
  res.json({ data: s, message: 'Statement updated.' });
});

// ─── MARK SENT ──────────────────────────────────────────────────────────────
exports.markSent = asyncHandler(async (req, res) => {
  const s = await OwnerStatement.findOne({ where: { id: req.params.id, ...branchScope(req) } });
  if (!s) return res.status(404).json({ error: 'Statement not found.' });
  await s.update({
    status: 'sent',
    sent_at: new Date(),
    sent_channel: req.body.channel || 'email',
    sent_evidence_url: req.body.evidence_url || null,
  });
  res.json({ data: s, message: 'Statement marked sent.' });
});

// ─── PRINTABLE HTML for PDF (browser Ctrl+P) ────────────────────────────────
// GET /api/owner-statements/:id/pdf.html
// Returns a self-contained HTML page styled for A4 print → Ctrl+P → save-as-PDF.
exports.printable = asyncHandler(async (req, res) => {
  const s = await OwnerStatement.findOne({
    where: { id: req.params.id, ...branchScope(req) },
    include: [ownerInc, propInc],
  });
  if (!s) return res.status(404).send('Statement not found.');

  const owner = s.owner;
  const property = s.property;
  const money = (v) => 'BDT ' + Number(v || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const rows = Array.isArray(s.line_items) ? s.line_items : (JSON.parse(s.line_items || '[]'));

  const html = `<!doctype html>
<html><head>
<meta charset="utf-8">
<title>Owner Statement ${s.statement_code}</title>
<style>
  @page { size: A4; margin: 20mm; }
  * { box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif; color: #1f2937; margin: 0; padding: 24px; font-size: 12px; line-height: 1.5; }
  .head { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; padding-bottom: 12px; border-bottom: 2px solid #2563eb; }
  .brand { font-size: 22px; font-weight: 800; color: #2563eb; }
  .brand-sub { color: #6b7280; font-size: 11px; }
  .meta { text-align: right; font-size: 11px; color: #6b7280; }
  .meta strong { color: #111; font-size: 12px; display: block; }
  h1 { font-size: 18px; margin: 0 0 4px; }
  .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin: 16px 0; }
  .box { border: 1px solid #e5e7eb; border-radius: 6px; padding: 12px; background: #f9fafb; }
  .box h3 { margin: 0 0 8px; font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.4px; }
  .box .val { font-weight: 700; font-size: 13px; }
  table { width: 100%; border-collapse: collapse; margin: 12px 0; }
  th, td { padding: 8px 10px; border-bottom: 1px solid #e5e7eb; text-align: left; font-size: 11px; }
  th { background: #f3f4f6; font-size: 10px; text-transform: uppercase; color: #6b7280; letter-spacing: 0.3px; }
  td.num, th.num { text-align: right; font-variant-numeric: tabular-nums; }
  .summary { margin-top: 16px; padding: 16px; background: #eff6ff; border: 1px solid #2563eb; border-radius: 8px; }
  .summary-row { display: flex; justify-content: space-between; padding: 4px 0; font-size: 12px; }
  .summary-row.total { font-weight: 800; font-size: 14px; border-top: 2px solid #2563eb; padding-top: 8px; margin-top: 6px; color: #1e40af; }
  .footer { margin-top: 24px; padding-top: 12px; border-top: 1px solid #e5e7eb; font-size: 10px; color: #6b7280; }
  .status { display: inline-block; padding: 2px 8px; border-radius: 12px; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.4px; background: #dbeafe; color: #1e40af; }
  @media print { .no-print { display: none !important; } body { padding: 0; } }
</style>
</head><body>
  <div class="head">
    <div>
      <div class="brand">Seventh Sky Property Care</div>
      <div class="brand-sub">Residential Property Management · Bangladesh</div>
    </div>
    <div class="meta">
      <strong>Owner Statement</strong>
      ${s.statement_code}<br>
      Period ${s.period_label} · ${s.period_start} → ${s.period_end}<br>
      Generated ${new Date(s.generated_at).toLocaleDateString()}<br>
      <span class="status">${s.status}</span>
    </div>
  </div>

  <div class="grid-2">
    <div class="box">
      <h3>Owner</h3>
      <div class="val">${owner?.full_name || '—'}</div>
      <div>${owner?.primary_phone || ''} · ${owner?.email || ''}</div>
    </div>
    <div class="box">
      <h3>Property</h3>
      <div class="val">${property?.title || 'Portfolio-wide'}</div>
      <div>${property?.property_code || ''} · ${[property?.area, property?.district].filter(Boolean).join(', ')}</div>
    </div>
  </div>

  <div class="summary">
    <div class="summary-row"><span>Opening balance</span><strong>${money(s.opening_balance)}</strong></div>
    <div class="summary-row"><span>Rent collected</span><span>${money(s.rent_collected)}</span></div>
    <div class="summary-row"><span>Service charge collected</span><span>${money(s.service_charge_collected)}</span></div>
    ${Number(s.arrears_recovered) > 0 ? `<div class="summary-row"><span>Arrears recovered</span><span>${money(s.arrears_recovered)}</span></div>` : ''}
    ${Number(s.other_credits) > 0 ? `<div class="summary-row"><span>Other credits</span><span>${money(s.other_credits)}</span></div>` : ''}
    <div class="summary-row"><span>Total credits</span><strong>${money(s.total_credits)}</strong></div>
    <div class="summary-row"><span>Management fee</span><span>(${money(s.management_fee)})</span></div>
    ${Number(s.maintenance_deductions) > 0 ? `<div class="summary-row"><span>Maintenance deductions</span><span>(${money(s.maintenance_deductions)})</span></div>` : ''}
    ${Number(s.utility_deductions) > 0 ? `<div class="summary-row"><span>Utility deductions</span><span>(${money(s.utility_deductions)})</span></div>` : ''}
    ${Number(s.landlord_bills_deductions) > 0 ? `<div class="summary-row"><span>Landlord bills</span><span>(${money(s.landlord_bills_deductions)})</span></div>` : ''}
    ${Number(s.other_deductions) > 0 ? `<div class="summary-row"><span>Other deductions</span><span>(${money(s.other_deductions)})</span></div>` : ''}
    <div class="summary-row"><span>Total deductions</span><strong>(${money(s.total_deductions)})</strong></div>
    <div class="summary-row total"><span>Net disbursement</span><span>${money(s.net_disbursement)}</span></div>
    <div class="summary-row"><span>Closing balance</span><strong>${money(s.closing_balance)}</strong></div>
  </div>

  ${rows.length ? `
    <h3 style="margin-top: 24px; font-size: 13px;">Transaction detail</h3>
    <table>
      <thead>
        <tr>
          <th>Date</th>
          <th>Description</th>
          <th>Category</th>
          <th class="num">Debit</th>
          <th class="num">Credit</th>
        </tr>
      </thead>
      <tbody>
        ${rows.map((r) => `
          <tr>
            <td>${r.date || ''}</td>
            <td>${r.description || ''}</td>
            <td>${(r.bucket || '').replace(/_/g, ' ')}</td>
            <td class="num">${r.debit > 0 ? money(r.debit) : ''}</td>
            <td class="num">${r.credit > 0 ? money(r.credit) : ''}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  ` : `<div style="margin-top: 24px; color: #6b7280; font-style: italic;">No transactions in this period.</div>`}

  <div class="footer">
    <div><strong>Payment reference:</strong> ${s.disbursement_reference || '—'}${s.disbursement_date ? ` · Paid ${s.disbursement_date}` : ''}${s.disbursement_method ? ` · ${s.disbursement_method}` : ''}</div>
    ${s.notes ? `<div style="margin-top: 4px;"><strong>Notes:</strong> ${s.notes}</div>` : ''}
    <div style="margin-top: 8px;">Seventh Sky Property Care · Built on Trust, Driven by Care · Owner remains responsible for tax/accounting obligations relating to rental income.</div>
  </div>

  <div class="no-print" style="margin-top: 20px; text-align: center; padding: 12px; background: #f3f4f6; border-radius: 6px; color: #6b7280; font-size: 11px;">
    Press <strong>Ctrl+P</strong> (or Cmd+P on Mac) to save this statement as PDF.
  </div>
</body></html>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(html);
});
