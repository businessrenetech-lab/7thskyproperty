/**
 * leadSequence.scheduler.js
 * ------------------------------------------------------------------
 * Daily job: for each enquiry actively enrolled in a follow-up sequence, send
 * every step whose business-day offset has arrived and that has not been sent
 * yet. Idempotency is a Communication subject marker `[SEQ:<seqId>:<idx>]`
 * (no per-step log table). Auto-stops when the lead advances past
 * viewing_scheduled or when all steps have gone out. Mirrors
 * arrearsReminder.scheduler.js; the provider seam (communication.service) is
 * only called, never changed.
 */
const { Op } = require('sequelize');
const SalesEnquiry = require('../models/SalesEnquiry');
const LeadSequence = require('../models/LeadSequence');
const MessageTemplate = require('../models/MessageTemplate');
const Contact = require('../models/Contact');
const Communication = require('../models/Communication');
const { addBusinessDays } = require('../utils/businessDays');

const arr = (v) => { if (Array.isArray(v)) return v; try { const p = JSON.parse(v || '[]'); return Array.isArray(p) ? p : []; } catch { return []; } };
const STOP_STAGES = ['viewed', 'offer_made', 'converted', 'rejected'];
const marker = (seqId, idx) => `[SEQ:${seqId}:${idx}]`;
const render = (str, ctx) => String(str || '').replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k) => (ctx[k] != null ? String(ctx[k]) : ''));

// Enrol an enquiry into a sequence (no-op if already active).
async function enrollEnquiry(enquiry, sequenceId, { transaction = null } = {}) {
  if (!sequenceId || enquiry.sequence_status === 'active') return enquiry;
  await enquiry.update({ sequence_id: sequenceId, sequence_status: 'active', sequence_enrolled_at: new Date() }, { transaction });
  return enquiry;
}

// Send one due step for an enquiry, idempotent via the subject marker.
// Returns 'sent' | 'suppressed' | 'skipped' (already sent / no template).
async function sendStep(enquiry, contact, step, idx, seqId) {
  const mk = marker(seqId, idx);
  const already = await Communication.findOne({ where: { entity_type: 'sales_enquiry', entity_id: enquiry.id, subject: { [Op.like]: `%${mk}%` } } });
  if (already) return 'skipped';

  const template = step.template_id ? await MessageTemplate.findByPk(step.template_id) : null;
  if (!template) return 'skipped';

  const channel = step.channel || template.channel || 'email';
  const ctx = { name: enquiry.enquirer_name, first_name: (enquiry.enquirer_name || '').split(' ')[0], enquiry_code: enquiry.enquiry_code };
  const subject = `${render(template.subject || 'Following up on your enquiry', ctx)} ${mk}`;
  const body = render(template.body, ctx);

  // Suppression per Phase 5B do-not-contact flags.
  const suppressed = channel === 'email' ? !!contact?.do_not_email : channel === 'sms' ? !!contact?.do_not_sms : false;

  const row = await Communication.create({
    branch_id: enquiry.branch_id, channel, direction: 'outbound', subject, body,
    entity_type: 'sales_enquiry', entity_id: enquiry.id, property_id: enquiry.property_id || null,
    status: 'done', occurred_at: new Date(), visibility: 'client', delivery_status: 'pending',
  });

  const upd = {};
  if (suppressed) { upd.delivery_status = 'suppressed'; }
  else if (channel === 'email') {
    const to = contact?.email || enquiry.email;
    if (!to) { upd.delivery_status = 'logged'; }
    else {
      try {
        const { sendEmail } = require('./communication.service');
        const res = await sendEmail(to, subject, `<p>${String(body).replace(/\n/g, '<br>')}</p>`);
        if (res && res.success) { upd.delivery_status = res.simulated ? 'simulated' : 'sent'; upd.sent_at = new Date(); upd.provider_message_id = res.message || null; }
        else { upd.delivery_status = 'failed'; upd.delivery_error = (res && res.error) || 'send failed'; }
      } catch (e) { upd.delivery_status = 'failed'; upd.delivery_error = e.message; }
    }
  } else if (channel === 'sms') {
    const to = contact?.primary_phone || enquiry.phone;
    if (!to) { upd.delivery_status = 'logged'; }
    else {
      try {
        const { sendSMS } = require('./communication.service');
        const res = await sendSMS(to, String(body));
        if (res && res.success) { upd.delivery_status = res.simulated ? 'simulated' : 'sent'; upd.sent_at = new Date(); }
        else { upd.delivery_status = 'failed'; upd.delivery_error = (res && res.error) || 'sms failed'; }
      } catch (e) { upd.delivery_status = 'failed'; upd.delivery_error = e.message; }
    }
  } else { upd.delivery_status = 'logged'; }

  await row.update(upd);
  return suppressed ? 'suppressed' : 'sent';
}

// The daily job. Pass { enquiry_id } to process just one (used by tests/QA).
async function runLeadSequences({ enquiry_id = null } = {}) {
  const where = { sequence_status: 'active', sequence_id: { [Op.ne]: null } };
  if (enquiry_id) where.id = enquiry_id;
  const enquiries = await SalesEnquiry.findAll({ where });
  let sent = 0;

  for (const enq of enquiries) {
    // Advanced past the nurture window → stop nurturing.
    if (STOP_STAGES.includes(enq.stage)) { await enq.update({ sequence_status: 'completed' }); continue; }

    const seq = await LeadSequence.findOne({ where: { id: enq.sequence_id, active: true } });
    const steps = seq ? arr(seq.steps) : [];
    if (!steps.length) { await enq.update({ sequence_status: 'completed' }); continue; }

    const contact = enq.contact_id ? await Contact.findByPk(enq.contact_id) : null;
    const anchor = enq.sequence_enrolled_at || enq.created_at || new Date();
    const today = new Date();
    let allDue = true;

    for (let i = 0; i < steps.length; i++) {
      const due = addBusinessDays(anchor, Number(steps[i].day_offset || 0)) <= today;
      if (!due) { allDue = false; continue; }
      const r = await sendStep(enq, contact, steps[i], i, seq.id);
      if (r === 'sent' || r === 'suppressed') sent++;
    }
    if (allDue) await enq.update({ sequence_status: 'completed' });
  }
  return { enrolled: enquiries.length, sent };
}

function startLeadSequenceScheduler() {
  const run = async () => {
    try { const r = await runLeadSequences(); if (r.sent) console.log(`[LeadSequence] enrolled=${r.enrolled} sent=${r.sent}`); }
    catch (e) { console.warn(`[LeadSequence] skipped: ${e.message}`); }
  };
  run();
  setInterval(run, 24 * 60 * 60 * 1000);
}

module.exports = { enrollEnquiry, sendStep, runLeadSequences, startLeadSequenceScheduler };
