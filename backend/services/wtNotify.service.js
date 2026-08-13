/**
 * wtNotify.service.js — telling people things happened.
 *
 * SMTP has been configured in this environment the whole time and the module has
 * never used it for anything except signing invitations. Everything else was
 * "someone will ring them": a quotation sat unsent because nobody knew it was
 * ready, an invoice went overdue because the reminder was a diary note.
 *
 * Four rules, each of which exists because the obvious version is worse:
 *
 *   1. NOTIFICATION NEVER BREAKS THE ACTION. Every send is best-effort and
 *      caught. An invoice that was issued must not appear to have failed because
 *      a mail server was slow.
 *
 *   2. NOTHING IS SENT TWICE. Each notification records what it was about, and a
 *      repeat for the same event is skipped. Systems that re-notify on every
 *      poll are how clients learn to filter you.
 *
 *   3. TEMPLATES CARRY THE FACTS, NOT THE PERSUASION. These go to clients and
 *      contractors; the tone stays plain and the figures come from the record
 *      rather than being restated.
 *
 *   4. NOTHING GOES OUT WITHOUT A REAL ADDRESS. A missing email is ordinary and
 *      is reported as a skip, not an error.
 */
const sequelize = require('../config/db.config');
const M = require('../models/waterTankOps');

const num = (v) => Number(v || 0);
const money = (v) => `BDT ${num(v).toLocaleString('en-BD')}`;
const day = (v) => (v ? String(v).slice(0, 10) : '—');
const lower = (v) => String(v || '').trim().toLowerCase();

const baseUrl = () => process.env.APP_BASE_URL || 'http://localhost:3005';

/* ────────────────────────────────────────────────────────────────────────────
 * De-duplication
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * Has this exact notification already gone out?
 *
 * Reads `wt_notifications`, which exists specifically for this. The first
 * version used `wt_comm_log.ref_code` — a VARCHAR(30) that MySQL silently
 * truncated the keys into, so the lookup never matched and de-duplication NEVER
 * WORKED. The sweep would have emailed the same client about the same overdue
 * invoice on every run.
 */
async function alreadySent(branchId, key) {
  const [rows] = await sequelize.query(
    'SELECT id FROM wt_notifications WHERE branch_id = :b AND event_key = :k LIMIT 1',
    { replacements: { b: branchId || 1, k: key } },
  ).catch(() => [[]]);
  return (rows || []).length > 0;
}

/**
 * Claim the right to send, atomically.
 *
 * The INSERT is the claim: a unique index on (branch_id, event_key) means the
 * second caller collides rather than sending. Checking first and inserting after
 * is a race two concurrent sweeps would both lose — and both send.
 */
async function claim({ branch_id, key, to, subject, ref_type }) {
  try {
    await sequelize.query(
      `INSERT INTO wt_notifications (branch_id, event_key, recipient, subject, ref_type, status, sent_at)
       VALUES (:b, :k, :to, :subject, :ref, 'sending', :at)`,
      { replacements: { b: branch_id || 1, k: key, to, subject: String(subject).slice(0, 255), ref: ref_type || null, at: new Date() } },
    );
    return true;
  } catch (e) {
    /*
     * Duplicate key: somebody else has it, so this caller does not send.
     *
     * Matched on the error NAME and the driver's code, not on the message text.
     * Sequelize sets `message` to a generic string and puts "must be unique" in
     * `errors[0].message`, so an earlier version that grepped `e.message` never
     * matched and rethrew — which surfaced as an unhandled rejection rather than
     * a suppressed duplicate. Any OTHER error still throws: a broken insert must
     * never be mistaken for "already sent".
     */
    const duplicate = e.name === 'SequelizeUniqueConstraintError'
      || e.parent?.code === 'ER_DUP_ENTRY'
      || e.original?.code === 'ER_DUP_ENTRY';
    if (duplicate) return false;
    throw e;
  }
}

const settle = (branchId, key, status, error) => sequelize.query(
  'UPDATE wt_notifications SET status = :s, error = :e WHERE branch_id = :b AND event_key = :k',
  { replacements: { s: status, e: error ? String(error).slice(0, 255) : null, b: branchId || 1, k: key } },
).catch(() => {});

/** The human-readable line, on the client's own file beside the phone calls. */
async function record({ branch_id, to, subject, client_name, ref_type, ref_code }) {
  await M.WtCommLog.create({
    branch_id,
    client_name: client_name || to,
    channel: 'email',
    direction: 'outbound',
    summary: `${subject} → ${to}`,
    ref_type: ref_type || 'notification',
    // ref_code is VARCHAR(30) and is for the RECORD the operator reads, not for
    // de-duplication — so it carries the document code, which fits.
    ref_code: ref_code ? String(ref_code).slice(0, 30) : null,
    logged_at: new Date(),
  }).catch(() => {});
}

/**
 * Send one notification.
 *
 * `key` identifies the EVENT, not the message — "invoice INV-0501 issued" — so
 * re-running the sweep that found it cannot send it again.
 */
async function notify({ branch_id, key, to, subject, html, client_name, ref_type, ref_code, force = false }) {
  if (!to || !String(to).includes('@')) return { sent: false, reason: 'no email address on file' };

  if (force) {
    await sequelize.query('DELETE FROM wt_notifications WHERE branch_id = :b AND event_key = :k',
      { replacements: { b: branch_id || 1, k: key } }).catch(() => {});
  }

  const mine = await claim({ branch_id, key, to, subject, ref_type });
  if (!mine) return { sent: false, reason: 'already sent' };

  try {
    const { sendEmail } = require('./communication.service');
    await sendEmail(to, subject, html);
    await settle(branch_id, key, 'sent');
    await record({ branch_id, to, subject, client_name, ref_type, ref_code });
    return { sent: true };
  } catch (e) {
    /*
     * The send failed after the claim. The claim is RELEASED rather than left
     * as a tombstone: a mail server being briefly unavailable must not mean the
     * client is never told, and the next sweep should try again.
     */
    await sequelize.query('DELETE FROM wt_notifications WHERE branch_id = :b AND event_key = :k',
      { replacements: { b: branch_id || 1, k: key } }).catch(() => {});
    console.warn(`[waterTank] notify ${key}:`, e.message);
    return { sent: false, reason: e.message };
  }
}

/* ────────────────────────────────────────────────────────────────────────────
 * Templates
 * ──────────────────────────────────────────────────────────────────────────── */

const wrap = (body) => `
  <div style="font-family:system-ui,-apple-system,'Segoe UI',sans-serif;font-size:14px;color:#0f172a">
    ${body}
    <hr style="border:0;border-top:1px solid #e2e8f0;margin:22px 0 12px"/>
    <p style="font-size:12px;color:#64748b;margin:0">
      Seventh Sky Property Care — Water Tank Services<br/>
      This is an automated message about your account. Please reply if anything looks wrong.
    </p>
  </div>`;

const TEMPLATES = {
  quotation_sent: (q) => ({
    subject: `Your quotation ${q.code} from Seventh Sky`,
    html: wrap(`
      <p>Dear ${q.client_name || 'Sir/Madam'},</p>
      <p>Your quotation <b>${q.code}</b> is ready, totalling <b>${money(q.total)}</b>${q.validity ? `, valid for ${q.validity}` : ''}.</p>
      <p>You can review and accept it in your portal, or reply to this message.</p>
      <p><a href="${baseUrl()}/admin/portal">Open your portal</a></p>`),
  }),

  invoice_issued: (i) => ({
    subject: `Invoice ${i.code} from Seventh Sky`,
    html: wrap(`
      <p>Dear ${i.client_name || 'Sir/Madam'},</p>
      <p>Invoice <b>${i.code}</b> for <b>${money(i.amount)}</b> has been issued${i.due_date ? `, due <b>${day(i.due_date)}</b>` : ''}.</p>
      ${num(i.advance_applied) > 0 ? `<p>An advance of ${money(i.advance_applied)} has been credited against it.</p>` : ''}
      <p>The full invoice and your receipts are in your portal.</p>
      <p><a href="${baseUrl()}/admin/portal">Open your portal</a></p>`),
  }),

  invoice_overdue: (i) => ({
    subject: `Invoice ${i.code} is now overdue`,
    html: wrap(`
      <p>Dear ${i.client_name || 'Sir/Madam'},</p>
      <p>Invoice <b>${i.code}</b> fell due on <b>${day(i.due_date)}</b> and <b>${money(i.outstanding)}</b> is still outstanding.</p>
      <p>If it has been paid in the last day or two, please ignore this — otherwise let us know if there is a problem.</p>
      <p><a href="${baseUrl()}/admin/portal">Open your portal</a></p>`),
  }),

  payment_received: (i, amount) => ({
    subject: `Payment received — ${i.code}`,
    html: wrap(`
      <p>Dear ${i.client_name || 'Sir/Madam'},</p>
      <p>Thank you. We have received <b>${money(amount)}</b> against invoice <b>${i.code}</b>.</p>
      <p>${num(i.outstanding) > 0.009
    ? `<b>${money(i.outstanding)}</b> remains outstanding.`
    : 'That settles the invoice in full.'}</p>`),
  }),

  amc_visit_due: (v) => ({
    subject: `Your maintenance visit is due — ${day(v.due_date)}`,
    html: wrap(`
      <p>Dear ${v.client_name || 'Sir/Madam'},</p>
      <p>Visit ${v.visit_no} of your maintenance contract (<b>${v.visit_type}</b>) is due on <b>${day(v.due_date)}</b>.</p>
      <p>We will be in touch to arrange a time. Reply if a particular day suits you better.</p>`),
  }),

  amc_expiring: (a, days) => ({
    subject: `Your maintenance contract ${a.code} expires on ${day(a.end_date)}`,
    html: wrap(`
      <p>Dear ${a.client_name || 'Sir/Madam'},</p>
      <p>Your ${a.package || 'maintenance contract'} <b>${a.code}</b> expires in <b>${days} day${days === 1 ? '' : 's'}</b>, on <b>${day(a.end_date)}</b>.</p>
      <p>Let us know if you would like to renew and we will prepare the paperwork.</p>`),
  }),

  work_order_assigned: (w) => ({
    subject: `New job assigned — ${w.code}`,
    html: wrap(`
      <p>Dear ${w.provider_name || 'Sir/Madam'},</p>
      <p>A job has been assigned to you: <b>${w.code}</b> for ${w.client_name}${w.site_address ? ` at ${w.site_address}` : ''}${w.target_date ? `, target date <b>${day(w.target_date)}</b>` : ''}.</p>
      <p>Please accept or decline it in your portal, and book a date once accepted.</p>
      <p><a href="${baseUrl()}/admin/portal">Open your portal</a></p>`),
  }),

  provider_paid: (w, amount) => ({
    subject: `Payment sent — ${w.code}`,
    html: wrap(`
      <p>Dear ${w.provider_name || 'Sir/Madam'},</p>
      <p><b>${money(amount)}</b> has been paid to you for <b>${w.code}</b>.</p>
      <p>Your full payment history is in your portal.</p>`),
  }),
};

/* ────────────────────────────────────────────────────────────────────────────
 * Event hooks — called at the moment something happens
 * ──────────────────────────────────────────────────────────────────────────── */

const clientEmailFor = async (branchId, row) => {
  if (row.bill_to_email) return row.bill_to_email;
  if (row.email) return row.email;
  const client = row.client_code
    ? await M.WtClient.findOne({ where: { branch_id: branchId, code: row.client_code }, raw: true }).catch(() => null)
    : await M.WtClient.findOne({ where: { branch_id: branchId, name: row.client_name }, raw: true }).catch(() => null);
  return client?.email || null;
};

async function onQuotationSent(q) {
  const t = TEMPLATES.quotation_sent(q);
  return notify({
    branch_id: q.branch_id, key: `quotation_sent:${q.code}`,
    to: await clientEmailFor(q.branch_id, q),
    client_name: q.client_name, ref_type: 'quotations', ref_code: q.code, ...t,
  });
}

async function onInvoiceIssued(inv) {
  const t = TEMPLATES.invoice_issued(inv);
  return notify({
    branch_id: inv.branch_id, key: `invoice_issued:${inv.code}`,
    to: await clientEmailFor(inv.branch_id, inv),
    client_name: inv.client_name, ref_type: 'invoices', ref_code: inv.code, ...t,
  });
}

async function onPaymentReceived(inv, amount) {
  const t = TEMPLATES.payment_received(inv, amount);
  return notify({
    branch_id: inv.branch_id,
    // Keyed on the amount as well as the invoice: a second, genuinely different
    // instalment must not be suppressed as a duplicate of the first.
    key: `payment_received:${inv.code}:${num(amount)}`,
    to: await clientEmailFor(inv.branch_id, inv),
    client_name: inv.client_name, ref_type: 'invoices', ref_code: inv.code, ...t,
  });
}

async function onWorkOrderAssigned(wo) {
  const provider = wo.provider_id
    ? await M.WtProvider.findByPk(wo.provider_id, { raw: true }).catch(() => null)
    : await M.WtProvider.findOne({ where: { branch_id: wo.branch_id, business_name: wo.provider_name }, raw: true }).catch(() => null);
  const t = TEMPLATES.work_order_assigned(wo);
  return notify({
    branch_id: wo.branch_id, key: `wo_assigned:${wo.code}:${wo.provider_id || wo.provider_name}`,
    to: provider?.contact_email, client_name: wo.provider_name, ref_type: 'work-orders', ref_code: wo.code, ...t,
  });
}

async function onProviderPaid(wo, amount) {
  const provider = wo.provider_id ? await M.WtProvider.findByPk(wo.provider_id, { raw: true }).catch(() => null) : null;
  const t = TEMPLATES.provider_paid(wo, amount);
  return notify({
    branch_id: wo.branch_id, key: `provider_paid:${wo.code}:${num(amount)}`,
    to: provider?.contact_email, client_name: wo.provider_name, ref_type: 'work-orders', ref_code: wo.code, ...t,
  });
}

/* ────────────────────────────────────────────────────────────────────────────
 * The sweep — for things that become true with the passage of time
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * Nothing tells the system an invoice went overdue or a visit fell due; those
 * become true because a date passed. This is the sweep that notices.
 *
 * `dryRun` returns exactly what WOULD go out without sending, which is how this
 * gets tested and how an operator can see the effect before enabling it.
 */
async function sweep({ branch_id, dryRun = false } = {}) {
  const today = new Date().toISOString().slice(0, 10);
  const soon = new Date(Date.now() + 14 * 864e5).toISOString().slice(0, 10);
  const scope = branch_id ? { branch_id } : {};
  const planned = [];

  const send = async (spec) => {
    if (dryRun) {
      const skip = await alreadySent(spec.branch_id, spec.key);
      planned.push({ ...spec, html: undefined, would_send: !skip && !!spec.to, reason: skip ? 'already sent' : (!spec.to ? 'no email address on file' : null) });
      return;
    }
    const out = await notify(spec);
    planned.push({ key: spec.key, to: spec.to, subject: spec.subject, ...out });
  };

  const [invoices, visits, amcs] = await Promise.all([
    M.WtInvoice.findAll({ where: scope, raw: true }).catch(() => []),
    M.WtAmcVisit.findAll({ where: scope, raw: true }).catch(() => []),
    M.WtAmcContract.findAll({ where: scope, raw: true }).catch(() => []),
  ]);

  // Overdue invoices — past the due date with money still on them.
  for (const i of invoices) {
    if (['paid', 'void', 'draft'].includes(lower(i.status))) continue;
    if (num(i.outstanding) <= 0.009) continue;
    if (!i.due_date || day(i.due_date) >= today) continue;
    const t = TEMPLATES.invoice_overdue(i);
    await send({
      branch_id: i.branch_id, key: `invoice_overdue:${i.code}:${day(i.due_date)}`,
      to: await clientEmailFor(i.branch_id, i), client_name: i.client_name, ref_type: 'invoices', ref_code: i.code, ...t,
    });
  }

  // AMC visits falling due within a week.
  const weekOut = new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10);
  for (const v of visits) {
    if (['completed', 'cancelled'].includes(lower(v.status))) continue;
    if (!v.due_date || day(v.due_date) > weekOut) continue;
    const client = await M.WtClient.findOne({ where: { branch_id: v.branch_id, name: v.client_name }, raw: true }).catch(() => null);
    const t = TEMPLATES.amc_visit_due(v);
    await send({
      branch_id: v.branch_id, key: `amc_visit_due:${v.code}`,
      to: client?.email, client_name: v.client_name, ref_type: 'amc', ref_code: v.code, ...t,
    });
  }

  // Contracts inside their renewal window.
  for (const a of amcs) {
    if (lower(a.status) !== 'active' || !a.end_date) continue;
    if (day(a.end_date) < today || day(a.end_date) > soon) continue;
    const days = Math.ceil((new Date(a.end_date) - Date.now()) / 864e5);
    const client = await M.WtClient.findOne({ where: { branch_id: a.branch_id, name: a.client_name }, raw: true }).catch(() => null);
    const t = TEMPLATES.amc_expiring(a, days);
    await send({
      branch_id: a.branch_id, key: `amc_expiring:${a.code}:${day(a.end_date)}`,
      to: client?.email || a.email, client_name: a.client_name, ref_type: 'amc', ref_code: a.code, ...t,
    });
  }

  return {
    dry_run: dryRun,
    considered: planned.length,
    would_send: planned.filter((p) => p.would_send).length,
    sent: planned.filter((p) => p.sent).length,
    items: planned,
  };
}

module.exports = {
  notify, sweep, alreadySent, TEMPLATES,
  onQuotationSent, onInvoiceIssued, onPaymentReceived, onWorkOrderAssigned, onProviderPaid,
  clientEmailFor,
};
