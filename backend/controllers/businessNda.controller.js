const BusinessNda = require('../models/BusinessNda');
const Contact = require('../models/Contact');
const svc = require('../services/businessNda.service');
const { asyncHandler, branchScope } = require('../utils/controllerHelpers');

const load = (req) => BusinessNda.findOne({ where: { id: req.params.id, ...branchScope(req) } });
const fail = (res, e) => res.status(e.status || 500).json({ error: e.message });
const shape = (n, contacts) => { const j = n.toJSON(); delete j.release_token; const c = contacts.get(j.contact_id); return { ...j, buyer_name: c?.full_name || null, buyer_email: c?.email || null, buyer_phone: c?.primary_phone || null }; };

exports.list = asyncHandler(async (req, res) => {
  const where = { ...branchScope(req) };
  if (req.query.property_id) where.property_id = req.query.property_id;
  if (req.query.contact_id) where.contact_id = req.query.contact_id;
  const rows = await BusinessNda.findAll({ where, order: [['created_at', 'DESC']] });
  const ids = [...new Set(rows.map((r) => r.contact_id))];
  const contacts = new Map((ids.length ? await Contact.findAll({ where: { id: ids }, attributes: ['id', 'full_name', 'email', 'primary_phone'], raw: true }) : []).map((c) => [c.id, c]));
  res.json({ data: rows.map((r) => shape(r, contacts)) });
});

exports.approve = asyncHandler(async (req, res) => {
  const nda = await load(req); if (!nda) return res.status(404).json({ error: 'NDA not found.' });
  try { await svc.approveAndSend(nda, req); res.json({ data: nda, message: 'NDA sent for e-signature.' }); } catch (e) { fail(res, e); }
});

exports.release = asyncHandler(async (req, res) => {
  const nda = await load(req); if (!nda) return res.status(404).json({ error: 'NDA not found.' });
  try { const { link } = await svc.release(nda, req); res.json({ data: { nda: { id: nda.id, status: nda.status, released_at: nda.released_at, token_expires_at: nda.token_expires_at }, link }, message: 'Full details released and emailed.' }); } catch (e) { fail(res, e); }
});

exports.decline = asyncHandler(async (req, res) => {
  const nda = await load(req); if (!nda) return res.status(404).json({ error: 'NDA not found.' });
  try { await svc.decline(nda, req.body.reason, req); res.json({ data: nda, message: 'Request declined.' }); } catch (e) { fail(res, e); }
});
