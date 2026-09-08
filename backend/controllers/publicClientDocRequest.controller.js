/**
 * publicClientDocRequest.controller.js — the PUBLIC (no-login) document-upload
 * flow for a client of a Property Doc Verification & Transfer service line. The
 * token in the URL is the credential; a staff member generates it from the Doc
 * Manager. The client sees the requested-document checklist, uploads each file
 * with its details, and submits. Everything is filed against the client and the
 * originating request, scoped to the request's own service line.
 */
const crypto = require('crypto');
const path = require('path');
const { asyncHandler } = require('../utils/controllerHelpers');
const { getServiceLine } = require('../config/serviceLines');
const { WtClientDocument, WtClientDocRequest } = require('../models/waterTankClientDocs');

const hash = (token) => crypto.createHash('sha256').update(String(token || '')).digest('hex');

async function load(token) {
  const request = await WtClientDocRequest.findOne({ where: { token_hash: hash(token) } });
  if (!request) return { status: 404, error: 'This document-upload link is invalid.' };
  if (request.status === 'Expired') return { status: 410, error: 'This document-upload link has been cancelled.' };
  if (request.token_expires_at && new Date(request.token_expires_at) < new Date()) {
    return { status: 410, error: 'This document-upload link has expired. Ask Seventh Sky to send a new one.' };
  }
  return { request };
}

const requestedList = (request) => {
  let v = request.requested_docs;
  if (typeof v === 'string') { try { v = JSON.parse(v); } catch { v = []; } }
  return Array.isArray(v) ? v : [];
};

async function currentDocs(request) {
  const rows = await WtClientDocument.findAll({
    where: { branch_id: request.branch_id, request_id: request.id },
    order: [['createdAt', 'ASC']], raw: true,
  });
  return rows.map((d) => ({
    id: d.id, doc_key: d.doc_key, doc_type: d.doc_type, category: d.category,
    file_url: d.file_url, original_name: d.original_name, doc_number: d.doc_number,
    issue_date: d.issue_date, expiry_date: d.expiry_date, status: d.status,
  }));
}

exports.view = asyncHandler(async (req, res) => {
  const ctx = await load(req.params.token);
  if (!ctx.request) return res.status(ctx.status).json({ error: ctx.error });
  const request = ctx.request;
  const sl = getServiceLine(request.service_line || 'water_tank');
  res.json({
    service_line: request.service_line,
    service_label: sl.ui?.full_label || sl.label,
    org: 'Seventh Sky Property Care',
    request: {
      code: request.code, client_name: request.client_name, message: request.message,
      status: request.status, expires_at: request.token_expires_at,
    },
    requested_docs: requestedList(request),
    documents: await currentDocs(request),
  });
});

exports.upload = asyncHandler(async (req, res) => {
  const ctx = await load(req.params.token);
  if (!ctx.request) return res.status(ctx.status).json({ error: ctx.error });
  if (!req.file) return res.status(400).json({ error: 'Choose a document to upload.' });
  const request = ctx.request;

  const specs = requestedList(request);
  const docKey = String(req.body.doc_key || 'other');
  const spec = specs.find((s) => s.key === docKey);
  // Only accept a key that was actually requested (or 'other').
  if (docKey !== 'other' && !spec) return res.status(400).json({ error: 'That document is not part of this request.' });
  const docType = spec?.label || String(req.body.doc_type || '').trim() || 'Other Supporting Document';
  const fileUrl = `/uploads/documents/${path.basename(req.file.path)}`;

  const values = {
    branch_id: request.branch_id,
    service_line: request.service_line,
    client_id: request.client_id,
    client_code: request.client_code,
    request_id: request.id,
    request_code: request.code,
    doc_key: docKey,
    doc_type: docType,
    category: spec?.category || 'other',
    file_url: fileUrl,
    original_name: req.file.originalname || null,
    size: req.file.size || null,
    mime: req.file.mimetype || null,
    doc_number: req.body.doc_number || null,
    issue_date: req.body.issue_date || null,
    expiry_date: req.body.expiry_date || null,
    status: 'Submitted',
    source: 'client_link',
    uploaded_by: request.client_name || 'Client',
  };
  // Replace an earlier upload for the same requested item rather than duplicating.
  const existing = docKey === 'other'
    ? null
    : await WtClientDocument.findOne({ where: { branch_id: request.branch_id, request_id: request.id, doc_key: docKey } });
  const doc = existing ? await existing.update(values) : await WtClientDocument.create(values);
  res.status(201).json({ id: doc.id, doc_key: doc.doc_key, file_url: doc.file_url, status: doc.status });
});

exports.removeDocument = asyncHandler(async (req, res) => {
  const ctx = await load(req.params.token);
  if (!ctx.request) return res.status(ctx.status).json({ error: ctx.error });
  const doc = await WtClientDocument.findOne({ where: { id: req.params.id, request_id: ctx.request.id, branch_id: ctx.request.branch_id } });
  if (!doc) return res.status(404).json({ error: 'Document not found.' });
  if (doc.status === 'Verified') return res.status(409).json({ error: 'A verified document cannot be removed. Please contact Seventh Sky.' });
  await doc.destroy();
  res.json({ ok: true });
});

exports.submit = asyncHandler(async (req, res) => {
  const ctx = await load(req.params.token);
  if (!ctx.request) return res.status(ctx.status).json({ error: ctx.error });
  const request = ctx.request;
  const specs = requestedList(request);
  const uploaded = await currentDocs(request);
  const haveKeys = new Set(uploaded.filter((d) => d.file_url).map((d) => d.doc_key));
  const missing = specs.filter((s) => s.required && !haveKeys.has(s.key)).map((s) => s.label);
  if (missing.length) {
    return res.status(422).json({ error: `Please upload the required documents before submitting: ${missing.join(', ')}.`, missing });
  }
  await request.update({ status: 'Submitted', submitted_at: new Date() });
  res.json({ ok: true, status: 'Submitted', message: 'Your documents have been submitted to Seventh Sky. Thank you.' });
});
