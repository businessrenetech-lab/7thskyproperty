/**
 * wtCalendar.service.js — everything with a date, in one place.
 *
 * Four things in this module are scheduled and each lived on its own screen:
 * site assessments carry an `assessed_date`, work orders a `target_date` and a
 * `scheduled_date`, AMC contracts generate a whole visit plan with `due_date`
 * per visit, and invoices fall due. The AMC visit plan is the sharpest example —
 * it produces dated rows on creation that nothing ever showed next to anything
 * else, so a week with four AMC visits and two assessments looked empty until
 * someone opened two different registers.
 *
 * This does not introduce a scheduling model. It reads the dates that already
 * exist and returns them as one sorted list of events, each knowing what it is,
 * where it lives and whether it has slipped.
 */
const M = require('../models/waterTankOps');

const lower = (v) => String(v || '').trim().toLowerCase();
const today = () => new Date().toISOString().slice(0, 10);
const isDone = (v, done) => done.includes(lower(v));

/** A date column can be a Date, a string, or null; the calendar wants YYYY-MM-DD or nothing. */
const dayOf = (v) => {
  if (!v) return null;
  if (typeof v === 'string') return v.slice(0, 10);
  try { return new Date(v).toISOString().slice(0, 10); } catch { return null; }
};

const KINDS = {
  assessment: { label: 'Site assessment', colour: 'violet' },
  service: { label: 'Service visit', colour: 'blue' },
  amc_visit: { label: 'AMC visit', colour: 'teal' },
  invoice_due: { label: 'Invoice due', colour: 'amber' },
};

/**
 * Build the event list for a window.
 *
 * `from`/`to` are inclusive YYYY-MM-DD. Everything is filtered in JS rather than
 * SQL because the date lives in a different column per entity and half of them
 * are DATEONLY strings — one place doing the normalising beats four WHERE
 * clauses that each get it subtly wrong.
 */
async function events({ scope, from, to }) {
  const [assessments, workOrders, visits, invoices] = await Promise.all([
    M.WtSiteAssessment.findAll({ where: scope, raw: true }).catch(() => []),
    M.WtWorkOrder.findAll({ where: scope, raw: true }).catch(() => []),
    M.WtAmcVisit.findAll({ where: scope, raw: true }).catch(() => []),
    M.WtInvoice.findAll({ where: scope, raw: true }).catch(() => []),
  ]);

  const now = today();
  const out = [];
  const push = (e) => {
    if (!e.date) return;
    if (from && e.date < from) return;
    if (to && e.date > to) return;
    out.push(e);
  };

  assessments.forEach((a) => push({
    id: `assessment-${a.id}`,
    kind: 'assessment',
    date: dayOf(a.assessed_date),
    title: a.client_name || a.code,
    code: a.code,
    subtitle: [a.provider, a.site_address].filter(Boolean).join(' · ') || null,
    status: a.status,
    // "Overdue" means the date has passed and the thing did not happen — not
    // merely that the date is in the past.
    overdue: !isDone(a.status, ['completed', 'cancelled']) && dayOf(a.assessed_date) < now,
    done: isDone(a.status, ['completed']),
    to: `/water-tank/site-assessments/${a.code}`,
  }));

  workOrders.forEach((w) => {
    const date = dayOf(w.scheduled_date) || dayOf(w.target_date);
    push({
      id: `service-${w.id}`,
      kind: 'service',
      date,
      title: w.client_name || w.code,
      code: w.code,
      subtitle: [w.provider_name || 'unassigned', w.specific_service || w.category].filter(Boolean).join(' · ') || null,
      status: w.status,
      overdue: !isDone(w.status, ['completed', 'verified', 'closed', 'cancelled']) && date && date < now,
      done: isDone(w.status, ['completed', 'verified', 'closed']),
      // Surfaced because an unassigned job on the calendar is the one that
      // silently fails to happen.
      unassigned: !w.provider_name,
      to: `/water-tank/work-orders/${w.code}`,
    });
  });

  visits.forEach((v) => {
    const date = dayOf(v.scheduled_date) || dayOf(v.due_date);
    push({
      id: `amc-${v.id}`,
      kind: 'amc_visit',
      date,
      title: v.client_name || v.amc_code,
      code: v.code,
      subtitle: [`${v.visit_type || 'Visit'} ${v.visit_no ? `#${v.visit_no}` : ''}`.trim(), v.provider_name].filter(Boolean).join(' · '),
      status: v.status,
      overdue: !isDone(v.status, ['completed', 'cancelled']) && date && date < now,
      done: isDone(v.status, ['completed']),
      contract: v.amc_code,
      to: `/water-tank/amc/${v.amc_code}`,
    });
  });

  invoices.forEach((i) => {
    if (isDone(i.status, ['paid', 'void', 'draft'])) return;
    if (Number(i.outstanding || 0) <= 0.009) return;
    push({
      id: `invoice-${i.id}`,
      kind: 'invoice_due',
      date: dayOf(i.due_date),
      title: i.client_name || i.code,
      code: i.code,
      subtitle: `${Number(i.outstanding || 0).toLocaleString('en-BD')} outstanding`,
      status: i.status,
      overdue: dayOf(i.due_date) < now,
      done: false,
      amount: Number(i.outstanding || 0),
      to: `/water-tank/invoices/${i.code}`,
    });
  });

  out.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.kind.localeCompare(b.kind)));
  return out;
}

/** Group into { 'YYYY-MM-DD': [events] } so a month grid can render without regrouping. */
function byDay(list) {
  const map = {};
  list.forEach((e) => { (map[e.date] = map[e.date] || []).push(e); });
  return map;
}

async function calendar({ scope, from, to }) {
  const list = await events({ scope, from, to });
  const now = today();
  return {
    events: list,
    by_day: byDay(list),
    kinds: KINDS,
    range: { from: from || null, to: to || null },
    counts: {
      total: list.length,
      overdue: list.filter((e) => e.overdue).length,
      today: list.filter((e) => e.date === now).length,
      unassigned: list.filter((e) => e.unassigned).length,
      by_kind: Object.fromEntries(Object.keys(KINDS).map((k) => [k, list.filter((e) => e.kind === k).length])),
    },
  };
}

module.exports = { events, byDay, calendar, KINDS, dayOf };
