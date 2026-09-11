// backend/controllers/salesInbox.controller.js
//
// A dedicated residential-sales inbox over the shared Communication model.
// Self-contained key/resolve/write helpers (sales_enquiry / property / deal
// keys) so the rental communications controller is never touched. Internal
// messages are logged only (never emailed).
const { Op } = require('sequelize');
const Communication = require('../models/Communication');
const CommParticipant = require('../models/CommParticipant');
const SalesEnquiry = require('../models/SalesEnquiry');
const Property = require('../models/Property');
const Contact = require('../models/Contact');
const { asyncHandler, branchScope, resolveBranchId } = require('../utils/controllerHelpers');

const snippet = (s) => (s ? String(s).replace(/\s+/g, ' ').slice(0, 120) : '');

function saleKey(c) {
  if (c.entity_type === 'sales_enquiry') return `sales_enquiry:${c.entity_id}`;
  if (c.entity_type === 'sale_deal' || c.entity_type === 'deal') return `deal:${c.entity_id}`;
  if (c.property_id) return `property:${c.property_id}`;
  if (c.entity_type === 'property') return `property:${c.entity_id}`;
  return `comm:${c.id}`;
}
async function resolveSaleKey(key, scope) {
  const [type, idStr] = String(key || '').split(':'); const id = Number(idStr);
  if (type === 'sales_enquiry') { const enquiry = await SalesEnquiry.findOne({ where: { id, ...scope }, include: [{ model: Property, as: 'property' }] }); return { type, id, enquiry, where: { entity_type: 'sales_enquiry', entity_id: id } }; }
  if (type === 'property') { const property = await Property.findByPk(id); return { type, id, property, where: { [Op.or]: [{ property_id: id }, { entity_type: 'property', entity_id: id }] } }; }
  if (type === 'deal') return { type, id, where: { entity_type: 'sale_deal', entity_id: id } };
  return { type: 'comm', id, where: { id } };
}
async function recipientOf(r) {
  if (r.type === 'sales_enquiry') {
    const e = r.enquiry;
    let contact = null;
    if (e?.contact_id) contact = await Contact.findByPk(e.contact_id).catch(() => null);
    return { email: e?.email, phone: e?.phone, name: e?.enquirer_name, suppress_email: !!contact?.do_not_email, suppress_sms: !!contact?.do_not_sms };
  }
  if (r.type === 'property') return { email: null, phone: null, name: r.property?.title, suppress_email: false, suppress_sms: false };
  return { suppress_email: false, suppress_sms: false };
}

// Fill {{token}} placeholders from a context object (unknown tokens → blank).
function renderTemplate(str, ctx) {
  return String(str || '').replace(/\{\{(\w+)\}\}/g, (_, k) => (ctx && ctx[k] != null ? String(ctx[k]) : ''));
}

// Dispatch via the right provider and persist the delivery result onto the row.
async function dispatchAndRecord(row, { channel, to, subject, body, visibility, suppressed }) {
  const upd = { sent_at: new Date() };
  if (visibility === 'internal') { upd.delivery_status = 'logged'; upd.sent_at = null; }
  else if (suppressed) { upd.delivery_status = 'suppressed'; upd.sent_at = null; }
  else if (channel === 'email') {
    if (!to.email) { upd.delivery_status = 'logged'; upd.sent_at = null; }
    else {
      try {
        const { sendEmail } = require('../services/communication.service');
        const res = await sendEmail(to.email, subject || 'Seventh Sky Residential Property Services', `<p>${String(body).replace(/\n/g, '<br>')}</p>`);
        if (res && res.success) { upd.delivery_status = res.simulated ? 'simulated' : 'sent'; upd.provider_message_id = res.message || null; }
        else { upd.delivery_status = 'failed'; upd.delivery_error = (res && res.error) || 'send failed'; }
      } catch (e) { upd.delivery_status = 'failed'; upd.delivery_error = e.message; }
    }
  } else if (channel === 'sms') {
    if (!to.phone) { upd.delivery_status = 'logged'; upd.sent_at = null; }
    else {
      try {
        const { sendSMS } = require('../services/communication.service');
        const res = await sendSMS(to.phone, String(body));
        if (res && res.success) { upd.delivery_status = res.simulated ? 'simulated' : 'sent'; upd.provider_message_id = res.response ? (res.response.message_id || JSON.stringify(res.response)).slice(0, 250) : null; }
        else { upd.delivery_status = 'failed'; upd.delivery_error = (res && res.error) || 'sms failed'; }
      } catch (e) { upd.delivery_status = 'failed'; upd.delivery_error = e.message; }
    }
  } else { upd.delivery_status = 'logged'; upd.sent_at = null; }
  await row.update(upd);
  return upd.delivery_status;
}
async function writeOutbound(req, r, { channel, subject, body, is_draft = false, visibility = 'client' }) {
  const branch_id = resolveBranchId(req);
  const base = { branch_id, channel: channel || 'note', direction: 'outbound', subject: subject || null, body: body || null, user_id: req.user?.id || null, status: 'done', occurred_at: new Date(), is_draft: !!is_draft, visibility, delivery_status: 'pending' };
  if (r.type === 'sales_enquiry') return Communication.create({ ...base, entity_type: 'sales_enquiry', entity_id: r.id, property_id: r.enquiry?.property_id || null });
  if (r.type === 'property') return Communication.create({ ...base, entity_type: 'property', entity_id: r.id, property_id: r.id });
  if (r.type === 'deal') return Communication.create({ ...base, entity_type: 'sale_deal', entity_id: r.id });
  return Communication.create({ ...base, entity_type: 'contact', entity_id: r.id || 0 });
}

exports.inbox = asyncHandler(async (req, res) => {
  const scope = branchScope(req); const { status, channel, property_id, q, assigned_to, mine } = req.query;
  const enqWhere = { ...scope }; if (property_id) enqWhere.property_id = Number(property_id);
  const enquiries = await SalesEnquiry.findAll({ where: enqWhere, include: [{ model: Property, as: 'property', attributes: ['id', 'title', 'property_code'] }], order: [['updated_at', 'DESC']], limit: 500 });
  const comms = await Communication.findAll({ where: { ...scope, entity_type: { [Op.in]: ['sales_enquiry', 'sale_deal', 'property'] } }, order: [['occurred_at', 'DESC']], limit: 2000, raw: true });
  const byKey = new Map(); for (const c of comms) { const k = saleKey(c); if (!byKey.has(k)) byKey.set(k, []); byKey.get(k).push(c); }

  const parts = await CommParticipant.findAll({ where: { ...scope }, raw: true });
  const cIds = [...new Set(parts.filter((p) => p.contact_id).map((p) => p.contact_id))];
  const contacts = cIds.length ? await Contact.findAll({ where: { id: cIds }, attributes: ['id', 'full_name'], raw: true }) : [];
  const cName = new Map(contacts.map((c) => [c.id, c.full_name]));
  const partsByKey = new Map();
  for (const p of parts) { if (!partsByKey.has(p.thread_key)) partsByKey.set(p.thread_key, []); partsByKey.get(p.thread_key).push({ id: p.id, name: p.contact_id ? cName.get(p.contact_id) : `User ${p.user_id}`, role: p.role }); }

  const items = [];
  for (const e of enquiries) {
    const j = e.toJSON(); const key = `sales_enquiry:${e.id}`; const thread = byKey.get(key) || [];
    const last = thread[0]; const assignee = last?.assigned_to || j.assigned_officer_id || null;
    items.push({ key, source: 'sales_enquiry', title: j.enquirer_name, subtitle: j.property?.title || j.preferred_area || 'Sales enquiry', channel: (j.source || 'web'), snippet: snippet(last?.body || j.next_action || 'New sales enquiry'), last_at: last ? last.occurred_at : (j.updated_at || j.created_at), status: j.stage, needs_reply: !thread.some((c) => c.direction === 'outbound') || j.stage === 'new', unread: thread.some((c) => c.direction === 'inbound' && !c.read_at) || j.stage === 'new', messages: thread.length + 1, property_id: j.property_id, participants: partsByKey.get(key) || [], assigned_to: assignee });
  }
  for (const [key, thread] of byKey) {
    if (key.startsWith('sales_enquiry:')) continue;
    const last = thread[0];
    items.push({ key, source: key.split(':')[0], title: key, subtitle: '', channel: last?.channel || 'note', snippet: snippet(last?.body), last_at: last?.occurred_at, status: last?.status, needs_reply: false, unread: thread.some((c) => c.direction === 'inbound' && !c.read_at), messages: thread.length, property_id: last?.property_id || null, participants: partsByKey.get(key) || [], assigned_to: last?.assigned_to || null });
  }

  let out = items;
  if (status) out = out.filter((i) => i.status === status);
  if (channel) out = out.filter((i) => i.channel === channel);
  if (q) out = out.filter((i) => JSON.stringify(i).toLowerCase().includes(String(q).toLowerCase()));
  if (assigned_to) out = out.filter((i) => String(i.assigned_to) === String(assigned_to));
  if (mine === '1' && req.user?.id) out = out.filter((i) => String(i.assigned_to) === String(req.user.id));
  out.sort((a, b) => new Date(b.last_at || 0) - new Date(a.last_at || 0));
  res.json({ data: out });
});

exports.thread = asyncHandler(async (req, res) => {
  const scope = branchScope(req);
  const r = await resolveSaleKey(req.query.key, scope);
  const rows = await Communication.findAll({ where: { ...scope, ...r.where }, order: [['occurred_at', 'ASC']], raw: true });
  const messages = rows.map((c) => ({ id: c.id, channel: c.channel, direction: c.direction, subject: c.subject, body: c.body, at: c.occurred_at, is_draft: !!c.is_draft, read_at: c.read_at, visibility: c.visibility || 'client', assigned_to: c.assigned_to || null, delivery_status: c.delivery_status || null, provider_message_id: c.provider_message_id || null, delivery_error: c.delivery_error || null, sent_at: c.sent_at || null }));
  let context = {};
  if (r.type === 'sales_enquiry' && r.enquiry) {
    const e = r.enquiry.toJSON();
    messages.unshift({ id: `enq-${e.id}`, channel: (e.source || 'web'), direction: 'inbound', subject: `Sales enquiry — ${e.enquirer_name}`, body: e.next_action || `${e.enquirer_name} enquired${e.property?.title ? ' about ' + e.property.title : ''}${e.preferred_area ? ' (area: ' + e.preferred_area + ')' : ''}.`, at: e.created_at, seed: true, visibility: 'client' });
    context = { kind: 'sales_enquiry', enquiry: e, name: e.enquirer_name, email: e.email, phone: e.phone, property: e.property, status: e.stage };
  } else if (r.type === 'property' && r.property) {
    context = { kind: 'property', property: r.property, name: r.property.title };
  } else if (r.type === 'deal') {
    context = { kind: 'deal', name: `Deal ${r.id}` };
  }
  await Communication.update({ read_at: new Date() }, { where: { ...scope, ...r.where, direction: 'inbound', read_at: null } }).catch(() => {});
  res.json({ data: { key: req.query.key, context, messages } });
});

exports.reply = asyncHandler(async (req, res) => {
  const scope = branchScope(req);
  const { key, channel = 'email', subject, body, visibility = 'client' } = req.body || {};
  if (!body) return res.status(400).json({ error: 'Message body is required.' });
  const r = await resolveSaleKey(key, scope);
  const to = await recipientOf(r);
  const suppressed = visibility === 'client' && (channel === 'email' ? to.suppress_email : channel === 'sms' ? to.suppress_sms : false);

  const row = await writeOutbound(req, r, { channel, subject, body, visibility });
  const delivery = await dispatchAndRecord(row, { channel, to, subject, body, visibility, suppressed });
  await Communication.update({ read_at: new Date() }, { where: { ...scope, ...r.where, direction: 'inbound', read_at: null } }).catch(() => {});
  if (r.type === 'sales_enquiry' && r.enquiry && r.enquiry.stage === 'new') await r.enquiry.update({ stage: 'contacted' }).catch(() => {});
  res.status(201).json({ data: row, delivery });
});

exports.compose = asyncHandler(async (req, res) => {
  const scope = branchScope(req);
  const { key, channel = 'email', subject, body, is_draft = false, visibility = 'client' } = req.body || {};
  if (!body && !is_draft) return res.status(400).json({ error: 'Message body is required.' });
  const r = await resolveSaleKey(key, scope);
  const to = await recipientOf(r);
  const row = await writeOutbound(req, r, { channel, subject, body, is_draft, visibility });
  let delivery = 'pending';
  if (is_draft) { await row.update({ delivery_status: 'pending' }); delivery = 'draft'; }
  else {
    const suppressed = visibility === 'client' && (channel === 'email' ? to.suppress_email : channel === 'sms' ? to.suppress_sms : false);
    delivery = await dispatchAndRecord(row, { channel, to, subject, body, visibility, suppressed });
  }
  res.status(201).json({ data: row, delivery });
});

exports.participants = asyncHandler(async (req, res) => {
  res.json({ data: await CommParticipant.findAll({ where: { ...branchScope(req), thread_key: req.params.threadKey }, order: [['created_at', 'ASC']] }) });
});
exports.addParticipant = asyncHandler(async (req, res) => {
  const { contact_id, user_id, role } = req.body || {};
  if (!contact_id && !user_id) return res.status(400).json({ error: 'A contact or user is required.' });
  const row = await CommParticipant.create({ branch_id: resolveBranchId(req), thread_key: req.params.threadKey, contact_id: contact_id || null, user_id: user_id || null, role: role || 'other', added_by: req.user?.id || null });
  res.status(201).json({ data: row });
});
exports.removeParticipant = asyncHandler(async (req, res) => {
  const n = await CommParticipant.destroy({ where: { id: req.params.id, ...branchScope(req) } });
  if (!n) return res.status(404).json({ error: 'Participant not found.' });
  res.json({ ok: true });
});
exports.assign = asyncHandler(async (req, res) => {
  const r = await resolveSaleKey(req.params.threadKey, branchScope(req));
  await Communication.update({ assigned_to: req.body.assigned_to || null }, { where: { ...branchScope(req), ...r.where } });
  res.json({ assigned_to: req.body.assigned_to || null });
});
