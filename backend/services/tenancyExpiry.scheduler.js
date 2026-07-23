/**
 * tenancyExpiry.scheduler.js
 * ------------------------------------------------------------------
 * Daily job: detect active tenancies approaching their lease_end and remind
 * staff (90 / 60 / 30-day buckets). It ONLY alerts — it never changes status
 * or billing (staff decide to renew or end). Idempotent per bucket via a
 * marker in the Communication subject.
 */
const { Op } = require('sequelize');
const Tenancy = require('../models/Tenancy');
const Contact = require('../models/Contact');
const Communication = require('../models/Communication');

const iso = (d) => d.toISOString().slice(0, 10);

async function runExpiryReminders() {
  const now = new Date();
  const plus = (days) => { const d = new Date(now); d.setDate(d.getDate() + days); return iso(d); };

  // Active tenancies not already in a renewal flow, with lease_end within 90 days.
  const tenancies = await Tenancy.findAll({
    where: {
      status: 'active',
      renewal_status: 'none',
      lease_end: { [Op.ne]: null, [Op.lte]: plus(90) },
    },
    include: [{ model: Contact, as: 'tenant', attributes: ['full_name'] }],
  });

  let reminded = 0;
  for (const t of tenancies) {
    const days = Math.ceil((new Date(t.lease_end) - now) / 86400000);
    const bucket = days < 0 ? 'overdue' : days <= 30 ? '30' : days <= 60 ? '60' : '90';
    const marker = `[renewal-reminder:${bucket}]`;

    // Skip if this bucket was already logged for this tenancy.
    const existing = await Communication.findOne({
      where: { entity_type: 'property', entity_id: t.property_id, subject: { [Op.like]: `%${marker}%` } },
    });
    if (existing) continue;

    await Communication.create({
      branch_id: t.branch_id, entity_type: 'property', entity_id: t.property_id,
      channel: 'note', direction: 'internal',
      subject: `Lease ${days < 0 ? 'expired' : 'ending'} — ${t.tenancy_code} ${marker}`,
      body: `${t.tenant?.full_name || 'Tenant'}'s lease ${days < 0 ? `ended ${-days} day(s) ago` : `ends in ${days} day(s)`} (${t.lease_end}). Renew or begin ending the tenancy.`,
    }).catch(() => {});
    // Record the reminder date on the tenancy (no billing/status change).
    await t.update({ renewal_reminder_date: t.lease_end }).catch(() => {});
    reminded++;
  }
  return { checked: tenancies.length, reminded };
}

function startTenancyExpiryScheduler() {
  const run = async () => {
    try { const r = await runExpiryReminders(); if (r.reminded) console.log(`[TenancyExpiry] reminded=${r.reminded}/${r.checked}`); }
    catch (err) { console.warn(`[TenancyExpiry] skipped: ${err.message}`); }
  };
  run();
  setInterval(run, 24 * 60 * 60 * 1000);
}

module.exports = { runExpiryReminders, startTenancyExpiryScheduler };
