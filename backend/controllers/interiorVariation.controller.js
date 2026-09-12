// interiorVariation.controller.js — Variation Requests for Interior Design
// projects (Schedule/scope changes → re-priced, client-approved). Scoped by
// service_line + branch like the shared ops surface.
const InteriorVariation = require('../models/InteriorVariation');
const { generateCode } = require('../utils/codeGenerator');
const { asyncHandler, branchScope, resolveBranchId, resolveServiceLine, serviceScope, codePrefix, pick } = require('../utils/controllerHelpers');

const num = (v) => Number(v || 0);

const scoped = (req) => ({ ...branchScope(req), ...serviceScope(req) });

// GET /api/interior-variations?project_id=&work_order_code=&status=
exports.list = asyncHandler(async (req, res) => {
  const where = { ...scoped(req) };
  if (req.query.project_id) where.project_id = req.query.project_id;
  if (req.query.work_order_code) where.work_order_code = req.query.work_order_code;
  if (req.query.status) where.status = req.query.status;
  const rows = await InteriorVariation.findAll({ where, order: [['id', 'DESC']], limit: Math.min(Number(req.query.limit) || 200, 500) });
  res.json({ data: rows });
});

// GET /api/interior-variations/:code
exports.detail = asyncHandler(async (req, res) => {
  const row = await InteriorVariation.findOne({ where: { variation_code: req.params.code, ...scoped(req) } });
  if (!row) return res.status(404).json({ error: 'Variation not found.' });
  res.json({ data: row });
});

// POST /api/interior-variations
exports.create = asyncHandler(async (req, res) => {
  const data = pick(req.body, ['project_id', 'work_order_code', 'client_name', 'description', 'reason', 'amount_delta', 'timeline_impact']);
  data.branch_id = resolveBranchId(req);
  data.service_line = resolveServiceLine(req);
  data.status = 'draft';
  data.created_by = req.user?.id || null;
  data.variation_code = await generateCode(InteriorVariation, 'variation_code', `${codePrefix(req, 'work_order')}V-`);
  const row = await InteriorVariation.create(data);
  res.status(201).json({ data: row, message: `Variation ${row.variation_code} created.` });
});

// PATCH /api/interior-variations/:code
exports.update = asyncHandler(async (req, res) => {
  const row = await InteriorVariation.findOne({ where: { variation_code: req.params.code, ...scoped(req) } });
  if (!row) return res.status(404).json({ error: 'Variation not found.' });
  if (row.status !== 'draft') return res.status(409).json({ error: 'Only a draft variation can be edited.' });
  await row.update(pick(req.body, ['project_id', 'work_order_code', 'client_name', 'description', 'reason', 'amount_delta', 'timeline_impact', 'status']));
  res.json({ data: row });
});

// POST /api/interior-variations/:code/decision  { decision: 'approved'|'rejected', by? }
exports.decision = asyncHandler(async (req, res) => {
  const decision = String(req.body?.decision || '').toLowerCase();
  if (!['approved', 'rejected'].includes(decision)) return res.status(400).json({ error: "decision must be 'approved' or 'rejected'." });
  const row = await InteriorVariation.findOne({ where: { variation_code: req.params.code, ...scoped(req) } });
  if (!row) return res.status(404).json({ error: 'Variation not found.' });
  const invoice = await applyDecision(row, decision, req.body?.by || req.user?.name || req.user?.email || 'Staff');
  res.json({ data: row, invoice_code: row.invoice_code, message: decision === 'approved' && invoice ? `Variation approved — invoice ${invoice.code} drafted.` : `Variation ${decision}.` });
});

/**
 * Apply an approve/reject decision to a variation. On approval, auto-draft the
 * invoice for the price delta (idempotent) and link it. Shared by the admin
 * decision endpoint and the client portal approval, so both behave identically.
 */
async function applyDecision(row, decision, by) {
  await row.update({ status: decision, decided_at: new Date(), decided_by: by || null });
  if (decision !== 'approved' || num(row.amount_delta) <= 0) return null;
  const wtInvoice = require('../services/wtInvoice.service');
  const invoice = await wtInvoice.createFromVariation(row, { branchId: row.branch_id, actor: by || 'Staff' });
  if (invoice && !row.invoice_code) await row.update({ invoice_code: invoice.code });
  return invoice;
}
exports.applyDecision = applyDecision;

// POST /api/interior-variations/:code/send — send to the client for approval.
// Marks the variation 'sent', issues/refreshes the client's portal link and
// emails it. The client then approves from their portal (or a colleague clicks
// approve here); on approval the invoice is auto-drafted.
exports.sendForApproval = asyncHandler(async (req, res) => {
  const row = await InteriorVariation.findOne({ where: { variation_code: req.params.code, ...scoped(req) } });
  if (!row) return res.status(404).json({ error: 'Variation not found.' });
  if (['approved', 'rejected'].includes(row.status)) return res.status(409).json({ error: `This variation is already ${row.status}.` });

  const M = require('../models/waterTankOps');
  const client = row.client_name
    ? await M.WtClient.findOne({ where: { branch_id: row.branch_id, name: row.client_name } })
    : null;

  let portal_url = null; let emailed = false;
  if (client) {
    try {
      const portal = require('../services/wtPortal.service');
      const { token } = await portal.issueToken({ party_type: 'client', party_id: client.id, branch_id: row.branch_id });
      const base = process.env.PORTAL_BASE_URL || `${req.protocol}://${req.get('host')}/admin/portal`;
      portal_url = `${base}/${token}`;
      if (client.email) {
        const { sendEmail } = require('../services/communication.service');
        emailed = await sendEmail(client.email, `Please approve variation ${row.variation_code}`,
          `<p>Dear ${client.name || 'Sir/Madam'},</p>`
          + `<p>A variation to your project has been prepared for your approval:</p>`
          + `<p><strong>${row.description || row.variation_code}</strong><br/>Additional cost: <strong>BDT ${num(row.amount_delta).toLocaleString()}</strong>${row.timeline_impact ? `<br/>Timeline impact: ${row.timeline_impact}` : ''}</p>`
          + `<p>Please review and approve it in your portal:</p><p><a href="${portal_url}">${portal_url}</a></p>`
          + `<p>Thank you,<br/>Seventh Sky Property Care</p>`).then(() => true).catch(() => false);
      }
    } catch (e) { console.warn('[interior-variation-send]', e.message); }
  }
  await row.update({ status: 'sent', sent_at: new Date() });
  res.json({
    data: row, portal_url, emailed_to: emailed ? client.email : null, email_sent: emailed,
    message: emailed ? `Sent to ${client.email} for approval.`
      : portal_url ? 'Marked as sent. Share the portal link with the client — no email on file.'
        : 'Marked as sent. No client record matched to issue a portal link.',
  });
});
