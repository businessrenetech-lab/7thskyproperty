/**
 * wtWorkQueue.service.js — what actually needs someone today.
 *
 * The console's sidebar had no counts at all, and the obvious fix — put the
 * number of rows next to each link — is the wrong one. "Invoices 48" tells an
 * operator nothing they can act on; it is the same number tomorrow whether they
 * worked or not, so it stops being read within a week.
 *
 * Every count here answers "how many of these are waiting on me". A badge that
 * reaches zero is the point: it means that queue is clear. Anything that cannot
 * be cleared by doing work does not belong in this file.
 *
 * The counts are also the data behind a single work queue, so the sidebar badge
 * and the queue can never disagree — they are the same query.
 */
const { Op } = require('sequelize');
const M = require('../models/waterTankOps');

const num = (v) => Number(v || 0);
const today = () => new Date().toISOString().slice(0, 10);
const inDays = (n) => new Date(Date.now() + n * 864e5).toISOString().slice(0, 10);
const lower = (v) => String(v || '').trim().toLowerCase();

/** Case-insensitive "status is one of", done in JS because the data is mixed-case. */
const isOneOf = (v, list) => list.includes(lower(v));

/**
 * Every queue, with the rows behind it.
 *
 * `severity` drives presentation only: 'due' is work in hand, 'late' is work
 * that has already missed something a client or a provider was promised.
 */
async function buildQueues(scope) {
  const [requests, assessments, quotes, workOrders, invoices, complaints, amcs, visits, envelopes] = await Promise.all([
    M.WtServiceRequest.findAll({ where: scope, raw: true }).catch(() => []),
    M.WtSiteAssessment.findAll({ where: scope, raw: true }).catch(() => []),
    M.WtQuotation.findAll({ where: scope, raw: true }).catch(() => []),
    M.WtWorkOrder.findAll({ where: scope, raw: true }).catch(() => []),
    M.WtInvoice.findAll({ where: scope, raw: true }).catch(() => []),
    M.WtComplaint.findAll({ where: scope, raw: true }).catch(() => []),
    M.WtAmcContract.findAll({ where: scope, raw: true }).catch(() => []),
    M.WtAmcVisit.findAll({ where: scope, raw: true }).catch(() => []),
    (async () => {
      const SigningEnvelope = require('../models/SigningEnvelope');
      /*
       * 'viewed' matters as much as 'sent': the client has opened the document
       * and not signed, which is exactly the state worth chasing. Leaving it out
       * would have hidden 12 of the 30 live envelopes on this database.
       */
      return SigningEnvelope.findAll({
        where: { status: { [Op.in]: ['sent', 'viewed', 'partially_signed'] } },
        raw: true, limit: 200,
      });
    })().catch(() => []),
  ]);

  const now = today();
  const soon = inDays(14);

  const q = [];
  /*
   * `ids` is carried so the sidebar badge can count DISTINCT records rather than
   * summing the queues. A work order that is both unassigned and past its target
   * date appears in two queues — correctly, they are two different things to do
   * — but it is one work order, and a badge reading 24 when 18 records need
   * attention teaches the operator to distrust the number.
   */
  const add = (key, label, to, rows, severity = 'due', hint) => {
    if (!rows.length) return;
    q.push({
      key, label, to, count: rows.length, severity, hint,
      ids: rows.map((r) => r.id).filter((id) => id != null),
      rows: rows.slice(0, 8),
    });
  };

  /* ── intake ───────────────────────────────────────────────────────────── */
  add('unqualified_requests', 'Service requests not yet qualified', '/water-tank/service-requests',
    requests.filter((r) => isOneOf(r.status, ['new', 'received', ''])),
    'due', 'A client has asked for something and nobody has picked it up.');

  add('assessments_due', 'Site assessments booked but not completed', '/water-tank/site-assessments',
    assessments.filter((a) => !isOneOf(a.status, ['completed', 'cancelled'])
      && a.assessed_date && a.assessed_date <= now),
    'late', 'The visit date has passed with no findings recorded.');

  add('quotes_unsent', 'Quotations prepared but never sent', '/water-tank/quotations',
    quotes.filter((x) => isOneOf(x.decision, ['pending', '']) && !x.sent_at),
    'due', 'Work has been priced and the client has not seen it.');

  /* ── signature ────────────────────────────────────────────────────────── */
  add('awaiting_signature', 'Agreements awaiting signature', '/water-tank/agreements',
    envelopes, 'due', 'Sent for signing and not yet complete.');

  /* ── delivery ─────────────────────────────────────────────────────────── */
  add('unassigned_work', 'Work orders with no provider', '/water-tank/work-orders',
    workOrders.filter((w) => !isOneOf(w.status, ['completed', 'verified', 'closed', 'cancelled']) && !w.provider_name),
    'due', 'Scheduled work with nobody to do it.');

  add('overdue_work', 'Work orders past their target date', '/water-tank/work-orders',
    workOrders.filter((w) => !isOneOf(w.status, ['completed', 'verified', 'closed', 'cancelled'])
      && w.target_date && w.target_date < now),
    'late', 'The date promised to the client has passed.');

  add('awaiting_verification', 'Completed work awaiting verification', '/water-tank/work-orders',
    workOrders.filter((w) => isOneOf(w.status, ['completed']) && !w.verified_at),
    'due', 'Completion has to be verified before the provider can be paid.');

  /* ── money ────────────────────────────────────────────────────────────── */
  add('overdue_invoices', 'Invoices overdue', '/water-tank/invoices',
    invoices.filter((i) => !isOneOf(i.status, ['paid', 'void', 'draft'])
      && num(i.outstanding) > 0.009 && i.due_date && i.due_date < now),
    'late', 'Past the due date with money still outstanding.');

  add('invoices_undrafted', 'Invoices still in draft', '/water-tank/invoices',
    invoices.filter((i) => isOneOf(i.status, ['draft'])),
    'due', 'Raised but never sent, so nothing is being collected.');

  add('payouts_due', 'Provider payouts due', '/water-tank/payments',
    workOrders.filter((w) => w.provider_name
      && num(w.provider_fee) - num(w.provider_paid_amount) > 0.009
      && (w.verified_at || isOneOf(w.payout_status, ['pending']))),
    'due', 'Work is verified and the provider has not been paid in full.');

  /* ── care ─────────────────────────────────────────────────────────────── */
  add('open_complaints', 'Complaints open', '/water-tank/complaints',
    complaints.filter((c) => !isOneOf(c.status, ['resolved', 'closed'])),
    'due', 'A client is waiting for an answer.');

  add('critical_complaints', 'High-severity complaints unresolved', '/water-tank/complaints',
    complaints.filter((c) => isOneOf(c.severity, ['high', 'critical']) && !isOneOf(c.status, ['resolved', 'closed'])),
    'late', 'These are the ones that lose clients.');

  /* ── recurring ────────────────────────────────────────────────────────── */
  add('visits_due', 'AMC visits due', '/water-tank/amc',
    visits.filter((v) => !isOneOf(v.status, ['completed', 'cancelled']) && v.due_date && v.due_date <= now),
    'late', 'A contracted visit is due or overdue.');

  add('amc_expiring', 'AMC contracts expiring within 14 days', '/water-tank/amc',
    amcs.filter((a) => isOneOf(a.status, ['active']) && a.end_date && a.end_date <= soon && a.end_date >= now),
    'due', 'Renew before the cover lapses.');

  return q;
}

/**
 * Sidebar badges: one number per destination, counting DISTINCT records.
 *
 * Summing the queues would double-count — a work order that is unassigned AND
 * overdue is two things to do but one record, and an inflated badge is a badge
 * nobody trusts. `severity` is the worst of the contributing queues, so
 * something late is never hidden behind something merely due.
 */
function badgesFrom(queues) {
  const out = {};
  for (const q of queues) {
    const b = out[q.to] || (out[q.to] = { count: 0, severity: 'due', queues: [], _ids: new Set() });
    q.ids.forEach((id) => b._ids.add(id));
    if (q.severity === 'late') b.severity = 'late';
    b.queues.push({ key: q.key, label: q.label, count: q.count, severity: q.severity });
  }
  for (const b of Object.values(out)) {
    b.count = b._ids.size;
    delete b._ids;
  }
  return out;
}

async function summary(scope) {
  const queues = await buildQueues(scope);
  const badges = badgesFrom(queues);
  // Totals are counted the same distinct way, so the header figure and the
  // badges beneath it add up.
  const distinct = Object.values(badges).reduce((s, b) => s + b.count, 0);
  return {
    queues: queues.map(({ ids, ...q }) => q),
    badges,
    total: distinct,
    late: Object.values(badges).filter((b) => b.severity === 'late').reduce((s, b) => s + b.count, 0),
    generated_at: new Date().toISOString(),
  };
}

module.exports = { buildQueues, badgesFrom, summary };
