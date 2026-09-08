/**
 * waterTankClientDocs.controller.js — the client Document Manager for Property Doc
 * Verification & Transfer service lines (manifest `doc_manager: true`).
 *
 * Staff-facing: list/search documents, attach a document to a client, verify or
 * reject it, delete it, and generate a tokenised request link so the client can
 * upload the required documents themselves (public flow in
 * publicClientDocRequest.controller.js). Everything is scoped by branch +
 * service_line, so one line never sees another's documents.
 */
const crypto = require('crypto');
const { Op } = require('sequelize');
const { asyncHandler, branchScope, serviceScope, resolveServiceLine, serviceUi } = require('../utils/controllerHelpers');
const { getServiceLine } = require('../config/serviceLines');
const { generateCode } = require('../utils/codeGenerator');
const { WtClientDocument, WtClientDocRequest } = require('../models/waterTankClientDocs');
const M = require('../models/waterTankOps');

const scoped = (req) => ({ ...branchScope(req), ...serviceScope(req) });

// The manifest's required-documents definition for the active line.
const clientDocSpecs = (req) => (serviceUi(req).client_docs || []);

// Guard: this whole module only makes sense for lines with the Doc Manager on.
function ensureDocManager(req, res) {
  if (!getServiceLine(resolveServiceLine(req)).doc_manager) {
    res.status(404).json({ error: 'The Document Manager is not enabled for this service line.' });
    return false;
  }
  return true;
}

async function findClient(req, { client_id, client_code }) {
  const where = { ...scoped(req) };
  if (client_id) where.id = client_id;
  else if (client_code) where.code = client_code;
  else return null;
  return M.WtClient.findOne({ where });
}

/** GET /reference — the required-document checklist for this line. */
exports.reference = asyncHandler(async (req, res) => {
  if (!ensureDocManager(req, res)) return;
  const specs = clientDocSpecs(req);
  const groups = [];
  specs.forEach((s) => {
    let g = groups.find((x) => x.group === s.group);
    if (!g) { g = { group: s.group, items: [] }; groups.push(g); }
    g.items.push(s);
  });
  res.json({ doc_manager: true, client_docs: specs, groups });
});

/**
 * GET / — documents for the line. Filters: client_id, client_code, status,
 * category, doc_key, q (free text). Each row carries the client's name/code so the
 * Doc Manager can group by client without a second call.
 */
exports.list = asyncHandler(async (req, res) => {
  if (!ensureDocManager(req, res)) return;
  const where = { ...scoped(req) };
  const { client_id, client_code, status, category, doc_key, q } = req.query;
  if (client_id) where.client_id = Number(client_id);
  if (client_code) where.client_code = client_code;
  if (status) where.status = status;
  if (category) where.category = category;
  if (doc_key) where.doc_key = doc_key;
  if (q) {
    const like = { [Op.like]: `%${q}%` };
    where[Op.or] = [
      { doc_type: like }, { client_code: like }, { doc_number: like },
      { original_name: like }, { notes: like }, { assessment_code: like }, { project_id: like },
    ];
  }
  const rows = await WtClientDocument.findAll({ where, order: [['createdAt', 'DESC']], raw: true });
  // Attach client names in one query.
  const ids = [...new Set(rows.map((r) => r.client_id))];
  const clients = ids.length
    ? await M.WtClient.findAll({ where: { ...scoped(req), id: { [Op.in]: ids } }, attributes: ['id', 'code', 'name'], raw: true })
    : [];
  const nameById = Object.fromEntries(clients.map((c) => [c.id, c.name]));
  res.json(rows.map((r) => ({ ...r, client_name: nameById[r.client_id] || r.client_code || '—' })));
});

/**
 * GET /summary — one row per client that has documents (or a request), with counts,
 * so the Doc Manager can show an organised per-client index.
 */
exports.summary = asyncHandler(async (req, res) => {
  if (!ensureDocManager(req, res)) return;
  const required = clientDocSpecs(req).filter((s) => s.required).map((s) => s.key);
  const docs = await WtClientDocument.findAll({ where: scoped(req), raw: true });
  const byClient = new Map();
  docs.forEach((d) => {
    if (!byClient.has(d.client_id)) byClient.set(d.client_id, { client_id: d.client_id, client_code: d.client_code, total: 0, verified: 0, submitted: 0, rejected: 0, keys: new Set() });
    const e = byClient.get(d.client_id);
    e.total += 1;
    if (d.status === 'Verified') e.verified += 1;
    else if (d.status === 'Rejected') e.rejected += 1;
    else if (d.status === 'Submitted') e.submitted += 1;
    if (d.file_url) e.keys.add(d.doc_key);
  });
  const ids = [...byClient.keys()];
  const clients = ids.length
    ? await M.WtClient.findAll({ where: { ...scoped(req), id: { [Op.in]: ids } }, attributes: ['id', 'code', 'name'], raw: true })
    : [];
  const nameById = Object.fromEntries(clients.map((c) => [c.id, c.name]));
  const out = [...byClient.values()].map((e) => ({
    client_id: e.client_id,
    client_code: e.client_code,
    client_name: nameById[e.client_id] || e.client_code || '—',
    total: e.total, verified: e.verified, submitted: e.submitted, rejected: e.rejected,
    required_missing: required.filter((k) => !e.keys.has(k)),
  })).sort((a, b) => (a.client_name || '').localeCompare(b.client_name || ''));
  res.json(out);
});

/** POST / — staff attaches a document to a client. */
exports.create = asyncHandler(async (req, res) => {
  if (!ensureDocManager(req, res)) return;
  const b = req.body || {};
  const client = await findClient(req, b);
  if (!client) return res.status(404).json({ error: 'Client not found in this service line.' });
  const spec = clientDocSpecs(req).find((s) => s.key === b.doc_key);
  const doc = await WtClientDocument.create({
    ...scoped(req),
    client_id: client.id,
    client_code: client.code,
    request_id: b.request_id || null,
    doc_key: b.doc_key || 'other',
    doc_type: b.doc_type || spec?.label || 'Document',
    category: b.category || spec?.category || 'other',
    file_url: b.file_url || null,
    original_name: b.original_name || null,
    size: b.size || null,
    mime: b.mime || null,
    doc_number: b.doc_number || null,
    issue_date: b.issue_date || null,
    expiry_date: b.expiry_date || null,
    status: b.file_url ? (b.status || 'Submitted') : 'Requested',
    source: 'staff',
    assessment_code: b.assessment_code || null,
    request_code: b.request_code || null,
    project_id: b.project_id || null,
    uploaded_by: req.user?.name || req.user?.email || 'Staff',
    notes: b.notes || null,
  });
  res.status(201).json(doc);
});

/** PATCH /:id — verify / reject / edit a document. */
exports.update = asyncHandler(async (req, res) => {
  if (!ensureDocManager(req, res)) return;
  const doc = await WtClientDocument.findOne({ where: { ...scoped(req), id: req.params.id } });
  if (!doc) return res.status(404).json({ error: 'Document not found.' });
  const b = req.body || {};
  const patch = {};
  ['doc_type', 'category', 'file_url', 'original_name', 'size', 'mime', 'doc_number', 'issue_date', 'expiry_date', 'notes', 'assessment_code', 'project_id'].forEach((k) => {
    if (b[k] !== undefined) patch[k] = b[k];
  });
  if (b.status) {
    patch.status = b.status;
    if (b.status === 'Verified') {
      patch.verified_by = req.user?.name || req.user?.email || 'Staff';
      patch.verified_date = new Date();
    }
  }
  await doc.update(patch);
  res.json(doc);
});

/** DELETE /:id — remove a document record. */
exports.remove = asyncHandler(async (req, res) => {
  if (!ensureDocManager(req, res)) return;
  const doc = await WtClientDocument.findOne({ where: { ...scoped(req), id: req.params.id } });
  if (!doc) return res.status(404).json({ error: 'Document not found.' });
  await doc.destroy();
  res.json({ ok: true });
});

/* ── Request links ─────────────────────────────────────────────────────── */

/** GET /requests — the request links for this line (optionally by client). */
exports.listRequests = asyncHandler(async (req, res) => {
  if (!ensureDocManager(req, res)) return;
  const where = { ...scoped(req) };
  if (req.query.client_code) where.client_code = req.query.client_code;
  if (req.query.client_id) where.client_id = Number(req.query.client_id);
  const rows = await WtClientDocRequest.findAll({ where, order: [['createdAt', 'DESC']], raw: true });
  // Never leak the hash; normalise requested_docs (stored JSON can read back as a string).
  res.json(rows.map(({ token_hash, ...r }) => {
    let rd = r.requested_docs;
    if (typeof rd === 'string') { try { rd = JSON.parse(rd); } catch { rd = []; } }
    return { ...r, requested_docs: Array.isArray(rd) ? rd : [] };
  }));
});

/**
 * POST /requests — generate a tokenised upload link for a client. Body:
 * { client_id|client_code, requested_docs?[keys], message?, expires_days? }.
 * Emails the client if an email is on file. Returns the raw link once.
 */
exports.createRequest = asyncHandler(async (req, res) => {
  if (!ensureDocManager(req, res)) return;
  const b = req.body || {};
  const client = await findClient(req, b);
  if (!client) return res.status(404).json({ error: 'Client not found in this service line.' });

  const specs = clientDocSpecs(req);
  const keys = Array.isArray(b.requested_docs) && b.requested_docs.length ? b.requested_docs : specs.map((s) => s.key);
  const requested = specs.filter((s) => keys.includes(s.key)).map((s) => ({ key: s.key, label: s.label, category: s.category, required: !!s.required }));

  const token = crypto.randomBytes(32).toString('hex');
  const token_hash = crypto.createHash('sha256').update(token).digest('hex');
  const days = Math.min(Math.max(Number(b.expires_days) || 30, 1), 90);
  const expires = new Date(Date.now() + days * 864e5);
  const code = await generateCode(WtClientDocRequest, 'code', 'DOCREQ-', 4);

  const reqRow = await WtClientDocRequest.create({
    ...scoped(req),
    code,
    client_id: client.id,
    client_code: client.code,
    client_name: client.name,
    client_email: client.email || null,
    client_phone: client.mobile || null,
    token_hash,
    token_expires_at: expires,
    requested_docs: requested,
    message: b.message || null,
    status: 'Sent',
  });

  const sl = getServiceLine(resolveServiceLine(req));
  const base = process.env.PUBLIC_APP_URL || `${req.protocol}://${req.get('host')}/admin`;
  const link = `${base}/document-request/${token}`;

  let emailed = false;
  if (client.email) {
    try {
      const { sendEmail } = require('../services/communication.service');
      const svcName = sl.ui?.full_label || sl.label || 'Property Documentation';
      await sendEmail(
        client.email,
        `Seventh Sky ${svcName} — please upload your property documents`,
        `<p>Dear ${client.name},</p><p>To proceed with your ${svcName} assessment, please upload the required property documents using the secure link below:</p><p><a href="${link}">${link}</a></p><p>This link expires on ${expires.toISOString().slice(0, 10)}.</p>`,
      );
      emailed = true;
    } catch { /* best effort — the link is returned regardless */ }
  }

  res.status(201).json({ request: { ...reqRow.toJSON(), token_hash: undefined }, link, emailed });
});

/** POST /requests/:id/cancel — expire a link early. */
exports.cancelRequest = asyncHandler(async (req, res) => {
  if (!ensureDocManager(req, res)) return;
  const row = await WtClientDocRequest.findOne({ where: { ...scoped(req), id: req.params.id } });
  if (!row) return res.status(404).json({ error: 'Request not found.' });
  await row.update({ status: 'Expired', token_hash: null });
  res.json({ ok: true });
});
