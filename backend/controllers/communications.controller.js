/**
 * communications.controller.js — the admin unified Inbox for Property Management.
 * One place where staff see every incoming tenant/landlord message and rental
 * enquiry (website / email / SMS / portal note) and can reply, compose and draft.
 *
 * Built on the existing `communications` store (no parallel message system) +
 * `rental_enquiries` as lead conversations. A conversation is a computed key:
 *   enquiry:<id>   — a rental enquiry and any messages logged against it
 *   property:<id>  — messages scoped to a property (tenant/landlord/manager)
 *   contact:<id>   — messages tied to a contact but no property
 * Replies go out through the existing sendEmail (email) or are logged (sms/note),
 * always written back as an outbound `communications` row on the same entity.
 */
const { Op } = require('sequelize');
const sequelize = require('../config/db.config');
const Communication = require('../models/Communication');
const RentalEnquiry = require('../models/RentalEnquiry');
const Property = require('../models/Property');
const Contact = require('../models/Contact');
const { asyncHandler, branchScope, resolveBranchId } = require('../utils/controllerHelpers');

const snippet = (s, n = 120) => { const t = String(s || '').replace(/\s+/g, ' ').trim(); return t.length > n ? t.slice(0, n) + '…' : t; };

// Conversation key for a communications row.
function commKey(c) {
  if (c.entity_type === 'rental_enquiry') return `enquiry:${c.entity_id}`;
  if (c.property_id) return `property:${c.property_id}`;
  if (c.entity_type === 'property') return `property:${c.entity_id}`;
  if (c.tenant_contact_id) return `contact:${c.tenant_contact_id}`;
  if (c.owner_contact_id) return `contact:${c.owner_contact_id}`;
  return `comm:${c.id}`;
}

// ── GET /api/communications/inbox ──────────────────────────────────────────
exports.inbox = asyncHandler(async (req, res) => {
  const scope = branchScope(req);
  const { source, channel, status, property_id, q } = req.query;

  // A) Rental enquiries as lead conversations.
  const enqWhere = { ...scope };
  if (property_id) enqWhere.property_id = Number(property_id);
  const enquiries = await RentalEnquiry.findAll({ where: enqWhere, include: [{ model: Property, as: 'property', attributes: ['id', 'title', 'property_code'] }], order: [['updated_at', 'DESC']], limit: 500 });

  // B) All communications (to group into conversations + attach to enquiries).
  const comms = await Communication.findAll({ where: { ...scope }, order: [['occurred_at', 'DESC']], limit: 2000, raw: true });

  // Group comms by conversation key.
  const byKey = new Map();
  for (const c of comms) {
    const k = commKey(c);
    if (!byKey.has(k)) byKey.set(k, []);
    byKey.get(k).push(c);
  }

  const items = [];

  // Enquiry conversations.
  for (const e of enquiries) {
    const j = e.toJSON();
    const thread = byKey.get(`enquiry:${e.id}`) || [];
    const lastReply = thread[0];
    const lastAt = lastReply ? new Date(lastReply.occurred_at) : new Date(j.updated_at || j.created_at);
    const seedInbound = !thread.some((c) => c.direction === 'outbound');
    items.push({
      key: `enquiry:${e.id}`, source: 'enquiry',
      title: j.enquirer_name, subtitle: j.property?.title || j.preferred_area || 'General enquiry',
      channel: (j.source || 'web').toLowerCase().includes('email') ? 'email' : (j.source || 'web').toLowerCase().includes('phone') ? 'call' : 'web',
      snippet: snippet(lastReply?.body || j.notes || j.next_action || 'New rental enquiry'),
      last_at: lastAt, stage: j.stage, status_label: j.stage,
      needs_reply: seedInbound || ['new'].includes(j.stage),
      unread: thread.some((c) => c.direction === 'inbound' && !c.read_at) || j.stage === 'new',
      messages: thread.length + 1, property_id: j.property_id,
    });
  }

  // Message conversations (everything not tied to an enquiry).
  for (const [k, thread] of byKey) {
    if (k.startsWith('enquiry:')) continue;
    if (property_id && !thread.some((c) => Number(c.property_id) === Number(property_id) || (c.entity_type === 'property' && Number(c.entity_id) === Number(property_id)))) continue;
    const last = thread[0];
    const contactId = last.tenant_contact_id || last.owner_contact_id || null;
    const propId = last.property_id || (last.entity_type === 'property' ? last.entity_id : null);
    let title = last.subject || 'Message';
    if (contactId) { const c = await Contact.findByPk(contactId, { attributes: ['full_name'] }); if (c) title = c.full_name; }
    let subtitle = '';
    if (propId) { const p = await Property.findByPk(propId, { attributes: ['title', 'property_code'] }); subtitle = p?.title || ''; }
    items.push({
      key: k, source: 'message',
      title, subtitle: subtitle || (last.tenant_contact_id ? 'Tenant' : last.owner_contact_id ? 'Landlord' : last.channel),
      channel: last.channel, snippet: snippet(last.body || last.subject),
      last_at: new Date(last.occurred_at), status_label: last.direction,
      needs_reply: last.direction === 'inbound',
      unread: thread.some((c) => c.direction === 'inbound' && !c.read_at),
      is_draft: thread.some((c) => c.is_draft), messages: thread.length, property_id: propId,
    });
  }

  let list = items;
  if (source) list = list.filter((i) => i.source === source);
  if (channel) list = list.filter((i) => i.channel === channel);
  if (status === 'unread') list = list.filter((i) => i.unread);
  else if (status === 'needs_reply') list = list.filter((i) => i.needs_reply);
  else if (status === 'drafts') list = list.filter((i) => i.is_draft);
  if (q) {
    const s = q.toLowerCase();
    list = list.filter((i) => [i.title, i.subtitle, i.snippet].some((v) => String(v || '').toLowerCase().includes(s)));
  }
  list.sort((a, b) => b.last_at - a.last_at);

  const summary = {
    conversations: items.length,
    unread: items.filter((i) => i.unread).length,
    needs_reply: items.filter((i) => i.needs_reply).length,
    drafts: items.filter((i) => i.is_draft).length,
  };
  res.json({ data: list, summary });
});

// Resolve a conversation key → { type, id, enquiry?, property?, contact?, where }
async function resolveKey(key, scope) {
  const [type, idStr] = String(key || '').split(':');
  const id = Number(idStr);
  if (type === 'enquiry') {
    const enquiry = await RentalEnquiry.findOne({ where: { id, ...scope }, include: [{ model: Property, as: 'property' }, { model: Contact, as: 'contact' }] });
    return { type, id, enquiry, where: { entity_type: 'rental_enquiry', entity_id: id } };
  }
  if (type === 'property') {
    const property = await Property.findByPk(id);
    return { type, id, property, where: { [Op.or]: [{ property_id: id }, { entity_type: 'property', entity_id: id }] } };
  }
  if (type === 'contact') {
    const contact = await Contact.findByPk(id);
    return { type, id, contact, where: { [Op.or]: [{ tenant_contact_id: id }, { owner_contact_id: id }] } };
  }
  return { type: 'comm', id, where: { id } };
}

// ── GET /api/communications/thread?key= ────────────────────────────────────
exports.thread = asyncHandler(async (req, res) => {
  const scope = branchScope(req);
  const r = await resolveKey(req.query.key, scope);
  const rows = await Communication.findAll({ where: { ...scope, ...r.where }, order: [['occurred_at', 'ASC']], raw: true });

  const messages = rows.map((c) => ({
    id: c.id, channel: c.channel, direction: c.direction, subject: c.subject, body: c.body,
    at: c.occurred_at, is_draft: !!c.is_draft, read_at: c.read_at,
  }));

  let context = {};
  if (r.type === 'enquiry' && r.enquiry) {
    const e = r.enquiry.toJSON();
    // Seed the thread with the enquiry itself as the first inbound message.
    messages.unshift({ id: `enq-${e.id}`, channel: (e.source || 'web'), direction: 'inbound', subject: `Rental enquiry — ${e.enquirer_name}`, body: e.notes || `${e.enquirer_name} enquired${e.property?.title ? ' about ' + e.property.title : ''}${e.preferred_area ? ' (area: ' + e.preferred_area + ')' : ''}.`, at: e.created_at, seed: true });
    context = { kind: 'enquiry', enquiry: e, name: e.enquirer_name, email: e.email, phone: e.phone, property: e.property, stage: e.stage };
  } else if (r.type === 'property' && r.property) {
    context = { kind: 'property', property: r.property, name: r.property.title };
  } else if (r.type === 'contact' && r.contact) {
    context = { kind: 'contact', contact: r.contact, name: r.contact.full_name, email: r.contact.email, phone: r.contact.primary_phone };
  }

  // Opening a thread marks its inbound messages read.
  await Communication.update({ read_at: new Date() }, { where: { ...scope, ...r.where, direction: 'inbound', read_at: null } }).catch(() => {});
  res.json({ data: { key: req.query.key, context, messages } });
});

// Shared writer: create an outbound communication on a conversation's entity.
async function writeOutbound(req, r, { channel, subject, body, is_draft = false }) {
  const branch_id = resolveBranchId(req);
  const base = { branch_id, channel: channel || 'note', direction: 'outbound', subject: subject || null, body: body || null, user_id: req.user?.id || null, status: 'done', occurred_at: new Date(), is_draft: !!is_draft };
  if (r.type === 'enquiry') return Communication.create({ ...base, entity_type: 'rental_enquiry', entity_id: r.id, property_id: r.enquiry?.property_id || null });
  if (r.type === 'property') return Communication.create({ ...base, entity_type: 'property', entity_id: r.id, property_id: r.id });
  if (r.type === 'contact') return Communication.create({ ...base, entity_type: 'contact', entity_id: r.id, tenant_contact_id: r.id });
  return Communication.create({ ...base, entity_type: 'contact', entity_id: r.id || 0 });
}

function recipientOf(r) {
  if (r.type === 'enquiry') return { email: r.enquiry?.email, phone: r.enquiry?.phone, name: r.enquiry?.enquirer_name };
  if (r.type === 'contact') return { email: r.contact?.email, phone: r.contact?.primary_phone, name: r.contact?.full_name };
  return {};
}

// ── POST /api/communications/reply  { key, channel, subject, body } ─────────
exports.reply = asyncHandler(async (req, res) => {
  const scope = branchScope(req);
  const { key, channel = 'email', subject, body } = req.body || {};
  if (!body) return res.status(400).json({ error: 'Message body is required.' });
  const r = await resolveKey(key, scope);
  const to = recipientOf(r);

  let delivery = 'logged';
  if (channel === 'email') {
    if (!to.email) return res.status(400).json({ error: 'No email address on file for this conversation — reply by note or add an email first.' });
    try {
      const { sendEmail } = require('../services/communication.service');
      await sendEmail(to.email, subject || 'Reply from Seventh Sky Property Care', `<p>${String(body).replace(/\n/g, '<br>')}</p>`);
      delivery = 'emailed';
    } catch (e) { delivery = 'email_failed'; }
  } else if (channel === 'sms') {
    // No SMS gateway configured yet — logged behind a clean seam for a future provider.
    delivery = to.phone ? 'sms_logged' : 'logged';
  }

  const row = await writeOutbound(req, r, { channel, subject, body });
  // Reading + replying clears the unread state; nudge a brand-new enquiry forward.
  await Communication.update({ read_at: new Date() }, { where: { ...scope, ...r.where, direction: 'inbound', read_at: null } }).catch(() => {});
  if (r.type === 'enquiry' && r.enquiry && r.enquiry.stage === 'new') await r.enquiry.update({ stage: 'contacted' }).catch(() => {});

  res.status(201).json({ data: row, delivery, message: delivery === 'emailed' ? `Reply emailed to ${to.email}.` : delivery === 'sms_logged' ? 'SMS logged (no gateway configured).' : delivery === 'email_failed' ? 'Saved, but email delivery failed (check SMTP).' : 'Reply logged.' });
});

// ── POST /api/communications  compose new (optionally a draft) ──────────────
exports.compose = asyncHandler(async (req, res) => {
  const scope = branchScope(req);
  const { property_id, contact_id, channel = 'email', subject, body, is_draft = false, to_email } = req.body || {};
  if (!body && !is_draft) return res.status(400).json({ error: 'Message body is required.' });
  const key = property_id ? `property:${property_id}` : contact_id ? `contact:${contact_id}` : null;
  const r = key ? await resolveKey(key, scope) : { type: 'contact', id: contact_id || 0 };
  const to = recipientOf(r);
  const email = to.email || to_email;

  let delivery = 'draft';
  if (!is_draft && channel === 'email') {
    if (!email) return res.status(400).json({ error: 'No recipient email — add one or save as draft.' });
    try { const { sendEmail } = require('../services/communication.service'); await sendEmail(email, subject || 'Seventh Sky Property Care', `<p>${String(body).replace(/\n/g, '<br>')}</p>`); delivery = 'emailed'; }
    catch { delivery = 'email_failed'; }
  } else if (!is_draft) { delivery = channel === 'sms' ? 'sms_logged' : 'logged'; }

  const row = await writeOutbound(req, r, { channel, subject, body, is_draft });
  res.status(201).json({ data: row, delivery });
});

// ── PATCH /api/communications/:id  (edit/send a draft, or mark read) ────────
exports.update = asyncHandler(async (req, res) => {
  const scope = branchScope(req);
  const row = await Communication.findOne({ where: { id: req.params.id, ...scope } });
  if (!row) return res.status(404).json({ error: 'Message not found.' });
  const b = req.body || {};
  if (b.mark_read) { await row.update({ read_at: new Date() }); return res.json({ data: row }); }

  const patch = {};
  ['subject', 'body', 'channel'].forEach((k) => { if (b[k] !== undefined) patch[k] = b[k]; });
  // Sending a draft.
  if (b.send && row.is_draft) {
    patch.is_draft = false; patch.occurred_at = new Date();
    if ((b.channel || row.channel) === 'email') {
      // Resolve recipient from the row's entity.
      let email = b.to_email;
      if (!email && row.tenant_contact_id) email = (await Contact.findByPk(row.tenant_contact_id))?.email;
      if (!email && row.entity_type === 'rental_enquiry') email = (await RentalEnquiry.findByPk(row.entity_id))?.email;
      if (email) { try { const { sendEmail } = require('../services/communication.service'); await sendEmail(email, patch.subject || row.subject || 'Seventh Sky Property Care', `<p>${String(patch.body || row.body || '').replace(/\n/g, '<br>')}</p>`); } catch { /* logged anyway */ } }
    }
  }
  await row.update(patch);
  res.json({ data: row });
});

// ── DELETE /api/communications/:id  (discard a draft) ───────────────────────
exports.remove = asyncHandler(async (req, res) => {
  const scope = branchScope(req);
  const row = await Communication.findOne({ where: { id: req.params.id, ...scope } });
  if (!row) return res.status(404).json({ error: 'Message not found.' });
  if (!row.is_draft) return res.status(400).json({ error: 'Only drafts can be deleted.' });
  await row.destroy();
  res.json({ ok: true });
});

// ── POST /api/communications/read  { key }  mark a thread read ──────────────
exports.markRead = asyncHandler(async (req, res) => {
  const scope = branchScope(req);
  const r = await resolveKey(req.body.key, scope);
  await Communication.update({ read_at: new Date() }, { where: { ...scope, ...r.where, direction: 'inbound', read_at: null } });
  res.json({ ok: true });
});
