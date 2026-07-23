/**
 * arrearsReminder.scheduler.js
 * ------------------------------------------------------------------
 * Daily job: find tenancies with overdue rent/service invoices and send the
 * tenant a staged reminder (3 / 7 / 15 / 30 / 60 days overdue). Idempotent per
 * bucket via a Communication subject marker. Advances an existing ArrearsAction
 * (it does NOT auto-create the arrears tracker). Reads live from `invoices`.
 */
const { Op } = require('sequelize');
const sequelize = require('../config/db.config');
const Tenancy = require('../models/Tenancy');
const Contact = require('../models/Contact');
const Property = require('../models/Property');
const Communication = require('../models/Communication');
const ArrearsAction = require('../models/ArrearsAction');

const THRESHOLDS = [60, 30, 15, 7, 3]; // highest first
const bdt = (v) => '৳' + Number(v || 0).toLocaleString(undefined, { maximumFractionDigits: 2 });
const iso = (d) => d.toISOString().slice(0, 10);

// Aggregate overdue client invoices per tenancy (optionally one tenancy).
async function overdueByTenancy({ tenancy_id = null } = {}) {
  const today = iso(new Date());
  const [rows] = await sequelize.query(
    `SELECT i.tenancy_id, i.property_id, i.branch_id,
            SUM(i.balance) AS amount_due, MIN(i.due_date) AS oldest_due, COUNT(*) AS invoice_count
       FROM invoices i
      WHERE i.invoice_kind = 'client' AND i.tenancy_id IS NOT NULL
        AND i.balance > 0 AND i.due_date IS NOT NULL AND i.due_date < :today
        AND i.status NOT IN ('paid','cancelled','refunded','draft')
        ${tenancy_id ? 'AND i.tenancy_id = :tid' : ''}
      GROUP BY i.tenancy_id, i.property_id, i.branch_id`,
    { replacements: { today, tid: tenancy_id } }
  );
  return rows.map((r) => ({
    ...r, amount_due: Number(r.amount_due),
    days_overdue: Math.floor((new Date(today) - new Date(r.oldest_due)) / 86400000),
  }));
}
async function overdueForTenancy(tenancy_id) { return (await overdueByTenancy({ tenancy_id }))[0] || null; }

function reminderStageFor(days) {
  if (days >= 30) return { stage: 'final_notice', escalation: days >= 60 ? 'legal_review' : 'manager_review' };
  if (days >= 15) return { stage: '15_plus_days', escalation: 'reminder_2' };
  if (days >= 8) return { stage: '8_14_days', escalation: 'reminder_1' };
  return { stage: '1_7_days', escalation: 'reminder_1' };
}

// Email + log a reminder for one overdue tenancy. `force` bypasses the per-bucket
// idempotency check (used by the manual "send reminder now" button).
async function remindTenancy(row, { force = false, user_id = null } = {}) {
  const t = await Tenancy.findByPk(row.tenancy_id);
  if (!t) return { emailed: false };
  const [tenant, property] = await Promise.all([
    t.tenant_contact_id ? Contact.findByPk(t.tenant_contact_id) : null,
    t.property_id ? Property.findByPk(t.property_id) : null,
  ]);
  const bucket = THRESHOLDS.find((x) => row.days_overdue >= x) || 3;
  const marker = `[arrears-reminder:${bucket}]`;
  if (!force) {
    const existing = await Communication.findOne({ where: { entity_type: 'property', entity_id: t.property_id, subject: { [Op.like]: `%${marker}%` } } });
    if (existing) return { emailed: false, skipped: true, bucket };
  }

  const html = `
    <p>Dear ${tenant?.full_name || 'Tenant'},</p>
    <p>Our records show an overdue balance of <b>${bdt(row.amount_due)}</b> on your tenancy at
    <b>${property?.title || 'your property'}</b>, now <b>${row.days_overdue} day(s) overdue</b>
    (oldest amount due ${row.oldest_due}).</p>
    <p>Please arrange payment at your earliest convenience. If you have already paid, kindly disregard this notice.</p>
    <p>— Seventh Sky Property Care</p>`;
  let emailed = false;
  if (tenant?.email) { try { const { sendEmail } = require('./communication.service'); await sendEmail(tenant.email, `Overdue rent reminder — ${bdt(row.amount_due)}`, html); emailed = true; } catch { /* best-effort */ } }
  await Communication.create({
    branch_id: t.branch_id, entity_type: 'property', entity_id: t.property_id, channel: 'email', direction: 'outbound',
    subject: `Overdue rent reminder ${marker} — ${t.tenancy_code}`,
    body: `${bdt(row.amount_due)} overdue ${row.days_overdue} day(s); reminder ${emailed ? 'emailed to ' + tenant.email : 'logged (no email)'}.`,
    user_id,
  }).catch(() => {});

  // Advance an existing ArrearsAction (do NOT create one — out of scope).
  const { stage, escalation } = reminderStageFor(row.days_overdue);
  await ArrearsAction.update(
    { reminder_stage: stage, reminder_sent_at: new Date(), escalation_level: escalation, days_overdue: row.days_overdue, outstanding_amount: row.amount_due },
    { where: { tenant_contact_id: t.tenant_contact_id, property_id: t.property_id, status: { [Op.in]: ['open', 'in_progress'] } } }
  ).catch(() => {});

  return { emailed, bucket, amount_due: row.amount_due, days_overdue: row.days_overdue };
}

async function runOverdueReminders() {
  const overdue = await overdueByTenancy();
  let sent = 0;
  for (const row of overdue) { const r = await remindTenancy(row); if (!r.skipped) sent++; }
  return { overdue: overdue.length, sent };
}

function startArrearsReminderScheduler() {
  const run = async () => {
    try { const r = await runOverdueReminders(); if (r.sent) console.log(`[ArrearsReminder] overdue=${r.overdue} sent=${r.sent}`); }
    catch (e) { console.warn(`[ArrearsReminder] skipped: ${e.message}`); }
  };
  run();
  setInterval(run, 24 * 60 * 60 * 1000);
}

module.exports = { overdueByTenancy, overdueForTenancy, remindTenancy, runOverdueReminders, startArrearsReminderScheduler };
