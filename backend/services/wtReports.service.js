/**
 * wtReports.service.js — the accounting reports, as one engine.
 *
 * Five reports were asked for and a sixth will be asked for next month, so this
 * is deliberately not five report screens. It is ONE engine with five
 * definitions, each declaring what it selects, what its columns are and how it
 * summarises. Three things follow from that, and all three are the point:
 *
 *   THE DATE FILTER CANNOT DRIFT. "Last 30 days" means the same thing on every
 *   report because there is one resolver. Five hand-written filters would agree
 *   for about a fortnight.
 *
 *   THE COLUMNS ARE DATA. The screen renders whatever the definition declares
 *   and the PDF draws the same list, so a table and its printed version cannot
 *   disagree about what is in it — which is the classic way a report becomes
 *   untrustworthy.
 *
 *   THE SIXTH REPORT IS CHEAP. It is a definition, not a screen, an endpoint,
 *   a PDF builder and a date picker.
 *
 * Four of the five read the money ledger, which is the only place Water Tank
 * money is written. They are therefore views of the same truth rather than five
 * independent tallies that might disagree — the failure this whole module has
 * been built to avoid.
 */
const { Op, fn, col, where: sqlWhere } = require('sequelize');
const M = require('../models/waterTankOps');
const ledger = require('./wtLedger.service');

const num = (v) => Number(v || 0);
const round2 = (v) => Math.round((num(v) + Number.EPSILON) * 100) / 100;
/**
 * A calendar date in LOCAL time.
 *
 * Not `toISOString().slice(0, 10)`, which is the obvious thing and is wrong
 * here. The server runs on Asia/Dhaka; local midnight is 18:00 UTC the previous
 * day, so converting it to an ISO string moves every boundary back by one. The
 * effect is that an operator in Dhaka runs "Today" at nine in the morning and
 * sees yesterday's takings — a reporting module's worst possible failure, and a
 * silent one.
 */
const iso = (d) => {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};
const startOfDay = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };

/* ────────────────────────────────────────────────────────────────────────────
 * Dates
 * ──────────────────────────────────────────────────────────────────────────── */

const PRESETS = [
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: '7d', label: 'Last 7 days' },
  { value: '14d', label: 'Last 14 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: '1y', label: 'Last 12 months' },
  { value: 'custom', label: 'Custom range' },
];

/**
 * Turn a preset into a concrete range, INCLUSIVE at both ends.
 *
 * Inclusive matters more than it sounds: a report whose end date silently
 * excludes today is one an operator will reconcile against the bank, find short,
 * and stop trusting. "Last 7 days" here means today and the six before it.
 */
function resolveRange({ preset, from, to } = {}) {
  const today = startOfDay(new Date());
  const back = (days) => startOfDay(new Date(today.getTime() - days * 864e5));

  let start; let end = today; let label;
  switch (String(preset || '30d')) {
    case 'today': start = today; label = 'Today'; break;
    case 'yesterday': start = back(1); end = back(1); label = 'Yesterday'; break;
    case '7d': start = back(6); label = 'Last 7 days'; break;
    case '14d': start = back(13); label = 'Last 14 days'; break;
    case '30d': start = back(29); label = 'Last 30 days'; break;
    case '1y': start = back(364); label = 'Last 12 months'; break;
    case 'all': start = new Date(2000, 0, 1); label = 'All time'; break;
    case 'custom': {
      start = from ? startOfDay(new Date(from)) : back(29);
      end = to ? startOfDay(new Date(to)) : today;
      if (Number.isNaN(start.getTime())) start = back(29);
      if (Number.isNaN(end.getTime())) end = today;
      // A range typed backwards is a slip, not a request for nothing.
      if (start > end) { const t = start; start = end; end = t; }
      label = `${iso(start)} to ${iso(end)}`;
      break;
    }
    default: start = back(29); label = 'Last 30 days';
  }

  return {
    preset: preset || '30d',
    from: iso(start),
    to: iso(end),
    label,
    // The exclusive upper bound for a timestamp comparison: everything that
    // happened ON the end date is inside the range.
    fromAt: start,
    toAt: new Date(end.getTime() + 864e5 - 1),
  };
}

/* ────────────────────────────────────────────────────────────────────────────
 * Shared loaders
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * Money events in a range.
 *
 * Filtered on the day the money actually MOVED rather than on `created_at`,
 * which is when somebody got round to typing it. A payment taken on the 30th and
 * entered on the 2nd belongs in the month it was received, and an accountant
 * reconciling against a bank statement needs it there. See `effectiveDate` for
 * why that is a COALESCE and not simply `received_on`.
 */
async function eventsIn({ branch_id, range, subject_type, where = {} }) {
  const clause = {
    branch_id,
    ...(subject_type ? { subject_type } : {}),
    [Op.and]: [effectiveDateBetween(range.from, range.to)],
    ...where,
  };
  const rows = await M.WtMoneyEvent.findAll({
    where: clause,
    /*
     * Ordered by the SAME coalesced date the filter uses. Ordering by
     * `received_on` alone sorts the null-dated rows to the front, which on the
     * bank statement produced a running balance that went 12 Aug, 12 Aug,
     * 09 Aug, 17 Aug — arithmetically correct and useless to anyone trying to
     * reconcile it against a bank line.
     */
    order: [[effectiveDateExpr(), 'ASC'], ['id', 'ASC']],
    raw: true,
  });
  // Give every row a usable date, so a report never shows a blank one.
  return rows.map((r) => ({ ...r, received_on: effectiveDate(r) }));
}

/**
 * The date a movement counts on.
 *
 * `received_on` is the day the money actually moved and is what an accountant
 * reconciles against. But some rows carry none — provider payouts posted before
 * that field was always supplied — and filtering on it alone made those events
 * INVISIBLE to every dated report, including the bank statement whose whole job
 * is to reconcile. Money silently missing from a financial report is the worst
 * failure this module has, so the fallback is to the day the entry was written.
 * Slightly wrong beats absent.
 */
const effectiveDate = (row) => row.received_on
  || (row.created_at ? String(new Date(row.created_at).toISOString()).slice(0, 10) : null);

const effectiveDateExpr = () => fn('COALESCE', col('received_on'), fn('DATE', col('created_at')));
const effectiveDateBetween = (from, to) => sqlWhere(effectiveDateExpr(), { [Op.between]: [from, to] });
const effectiveDateBefore = (from) => sqlWhere(effectiveDateExpr(), { [Op.lt]: from });

/** A signed, human label for what an event did. */
const EVENT_LABEL = {
  client_receipt: 'Payment received',
  client_receipt_reversal: 'Payment reversed',
  client_refund: 'Refund to client',
  client_refund_reversal: 'Refund reversed',
  provider_payout: 'Provider payout',
  provider_payout_reversal: 'Payout reversed',
  direct_disbursement: 'Direct cost',
  direct_disbursement_reversal: 'Direct cost reversed',
};

/** Totals by some key, biggest first — the shape every summary block uses. */
function groupTotals(rows, keyOf, amountOf) {
  const map = new Map();
  for (const r of rows) {
    const k = keyOf(r) || '—';
    map.set(k, round2((map.get(k) || 0) + num(amountOf(r))));
  }
  return [...map.entries()]
    .map(([name, total]) => ({ name, total }))
    .sort((a, b) => b.total - a.total);
}

/* ────────────────────────────────────────────────────────────────────────────
 * The five definitions
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * Every report declares its columns here rather than in the screen.
 *
 * `align: 'right'` and `money: true` are read by BOTH the table and the PDF, so
 * a column cannot be a currency on screen and a bare number in print.
 */
const REPORTS = {
  /* 1 ─ Client payment transactions */
  'client-payments': {
    title: 'Client Payment Transactions',
    subtitle: 'Every receipt, refund and correction against a client invoice',
    columns: [
      { key: 'date', label: 'Date', width: 62 },
      { key: 'kind', label: 'Type', width: 92 },
      { key: 'client_name', label: 'Client', width: 128 },
      { key: 'invoice', label: 'Invoice', width: 62 },
      { key: 'method', label: 'Method', width: 62 },
      { key: 'reference', label: 'Reference', width: 82 },
      { key: 'in', label: 'Received', width: 68, align: 'right', money: true },
      { key: 'out', label: 'Refunded', width: 68, align: 'right', money: true },
    ],
    async build({ branch_id, range, filters }) {
      const where = {};
      if (filters.client) {
        where[Op.or] = [{ client_name: filters.client }, { subject_code: filters.client }];
      }
      const rows = await eventsIn({ branch_id, range, subject_type: 'invoice', where });

      const shaped = rows.map((e) => {
        const cash = ledger.cashOut(e);
        const isOut = e.direction === 'out';
        return {
          date: e.received_on,
          kind: EVENT_LABEL[e.event_type] || e.event_type,
          client_name: e.client_name,
          invoice: e.subject_code,
          method: e.method,
          reference: e.reference,
          in: isOut ? 0 : num(e.amount),
          out: isOut ? cash : 0,
          _actor: e.actor,
        };
      });

      const received = round2(shaped.reduce((s, r) => s + r.in, 0));
      const refunded = round2(shaped.reduce((s, r) => s + r.out, 0));
      return {
        rows: shaped,
        summary: {
          headline: [
            { label: 'Received', value: received, money: true, tone: 'in' },
            { label: 'Refunded', value: refunded, money: true, tone: 'out' },
            { label: 'Net collected', value: round2(received - refunded), money: true, tone: 'net' },
            { label: 'Transactions', value: shaped.length },
          ],
          breakdowns: [
            { title: 'By client', items: groupTotals(shaped, (r) => r.client_name, (r) => r.in - r.out) },
            { title: 'By method', items: groupTotals(shaped, (r) => r.method, (r) => r.in - r.out) },
          ],
        },
      };
    },
  },

  /* 2 ─ Provider payout transactions */
  'provider-payouts': {
    title: 'Provider Payout Transactions',
    subtitle: 'What Seventh Sky has paid its service providers',
    columns: [
      { key: 'date', label: 'Date', width: 62 },
      { key: 'kind', label: 'Type', width: 88 },
      { key: 'provider_name', label: 'Provider', width: 134 },
      { key: 'work_order', label: 'Work order', width: 66 },
      { key: 'project_id', label: 'Project', width: 78 },
      { key: 'method', label: 'Method', width: 66 },
      { key: 'reference', label: 'Reference', width: 78 },
      { key: 'amount', label: 'Paid', width: 68, align: 'right', money: true },
    ],
    async build({ branch_id, range, filters }) {
      const where = {};
      if (filters.provider) where.provider_name = filters.provider;
      const rows = await eventsIn({ branch_id, range, subject_type: 'work_order', where });

      const shaped = rows.map((e) => ({
        date: e.received_on,
        kind: EVENT_LABEL[e.event_type] || e.event_type,
        provider_name: e.provider_name,
        work_order: e.subject_code,
        project_id: e.project_id,
        method: e.method,
        reference: e.reference,
        amount: ledger.cashOut(e),
      }));

      const paid = round2(shaped.reduce((s, r) => s + r.amount, 0));
      return {
        rows: shaped,
        summary: {
          headline: [
            { label: 'Paid to providers', value: paid, money: true, tone: 'out' },
            { label: 'Payments', value: shaped.filter((r) => r.amount > 0).length },
            { label: 'Providers paid', value: new Set(shaped.map((r) => r.provider_name)).size },
          ],
          breakdowns: [
            { title: 'By provider', items: groupTotals(shaped, (r) => r.provider_name, (r) => r.amount) },
            { title: 'By method', items: groupTotals(shaped, (r) => r.method, (r) => r.amount) },
          ],
        },
      };
    },
  },

  /* 3 ─ What Seventh Sky spends on itself */
  'seventh-sky': {
    title: 'Seventh Sky Payments',
    subtitle: "What the business paid for directly — not through a service provider",
    columns: [
      { key: 'date', label: 'Date', width: 62 },
      { key: 'voucher_no', label: 'Voucher', width: 62 },
      { key: 'payee', label: 'Paid to', width: 140 },
      { key: 'category', label: 'Category', width: 118 },
      { key: 'project_code', label: 'Project', width: 74 },
      { key: 'method', label: 'Method', width: 62 },
      { key: 'recharge', label: 'Recharged', width: 62 },
      { key: 'amount', label: 'Amount', width: 68, align: 'right', money: true },
    ],
    async build({ branch_id, range, filters }) {
      /*
       * Read from the disbursement register rather than the ledger, because this
       * report's value is the CATEGORY and the payee details — what the money
       * was for — and those live on the register row. The amounts are still the
       * ledger's: a row only reaches "Paid" by way of a posted event.
       */
      const where = {
        branch_id,
        status: 'Paid',
        paid_on: { [Op.between]: [range.from, range.to] },
      };
      if (filters.category) where.category = filters.category;
      if (filters.project) where.project_code = filters.project;

      const rows = await M.WtProjectDisbursement.findAll({
        where, order: [['paid_on', 'ASC'], ['id', 'ASC']], raw: true,
      });

      const shaped = rows.map((d) => ({
        date: d.paid_on,
        voucher_no: d.voucher_no || d.code,
        payee: d.payee,
        category: d.category,
        project_code: d.project_code,
        method: d.method,
        recharge: d.billable_to_client ? 'Yes' : 'No',
        amount: round2(num(d.amount)),
        _type: d.disbursement_type,
      }));

      const total = round2(shaped.reduce((s, r) => s + r.amount, 0));
      const rechargeable = round2(shaped.filter((r) => r.recharge === 'Yes').reduce((s, r) => s + r.amount, 0));
      return {
        rows: shaped,
        summary: {
          headline: [
            { label: 'Total paid out', value: total, money: true, tone: 'out' },
            { label: 'Recoverable from clients', value: rechargeable, money: true, tone: 'in' },
            { label: "Absorbed by Seventh Sky", value: round2(total - rechargeable), money: true, tone: 'net' },
            { label: 'Vouchers', value: shaped.length },
          ],
          breakdowns: [
            { title: 'By category', items: groupTotals(shaped, (r) => r.category, (r) => r.amount) },
            { title: 'By payee', items: groupTotals(shaped, (r) => r.payee, (r) => r.amount) },
          ],
        },
      };
    },
  },

  /* 4 ─ Service completion */
  'service-completion': {
    title: 'Service Completion Report',
    subtitle: 'Jobs finished in the period, and how long they took',
    columns: [
      { key: 'completed_at', label: 'Completed', width: 66 },
      { key: 'code', label: 'Work order', width: 66 },
      { key: 'client_name', label: 'Client', width: 122 },
      { key: 'site_address', label: 'Property', width: 132 },
      { key: 'provider_name', label: 'Provider', width: 112 },
      { key: 'category', label: 'Service', width: 104 },
      { key: 'days', label: 'Days', width: 42, align: 'right' },
      { key: 'verified', label: 'Verified', width: 54 },
      { key: 'total_contract', label: 'Value', width: 66, align: 'right', money: true },
    ],
    async build({ branch_id, range, filters }) {
      const where = {
        branch_id,
        completed_at: { [Op.between]: [range.fromAt, range.toAt] },
      };
      if (filters.provider) where.provider_name = filters.provider;
      if (filters.client) where[Op.or] = [{ client_name: filters.client }, { client_code: filters.client }];

      const rows = await M.WtWorkOrder.findAll({
        where, order: [['completed_at', 'ASC']], raw: true,
      });

      const shaped = rows.map((w) => {
        // Time on site: from the day work started, or was scheduled if it was
        // never explicitly started, to the day it finished.
        const started = w.started_at || w.scheduled_date || w.assigned_at;
        const days = started && w.completed_at
          ? Math.max(0, Math.round((new Date(w.completed_at) - new Date(started)) / 864e5))
          : null;
        return {
          completed_at: w.completed_at ? String(w.completed_at).slice(0, 10) : null,
          code: w.code,
          client_name: w.client_name,
          site_address: w.site_address,
          provider_name: w.provider_name || 'Seventh Sky',
          category: w.category,
          days,
          verified: w.verified_at ? 'Yes' : 'No',
          total_contract: round2(num(w.total_contract)),
          _fee: round2(num(w.provider_fee)),
          _ss: round2(num(w.ss_fee)),
          _late: w.target_date && w.completed_at
            ? new Date(w.completed_at) > new Date(w.target_date) : false,
        };
      });

      const withDays = shaped.filter((r) => r.days != null);
      const onTime = shaped.filter((r) => !r._late).length;
      const value = round2(shaped.reduce((s, r) => s + r.total_contract, 0));
      return {
        rows: shaped,
        summary: {
          headline: [
            { label: 'Jobs completed', value: shaped.length },
            { label: 'Verified', value: shaped.filter((r) => r.verified === 'Yes').length },
            {
              label: 'On time',
              value: shaped.length ? `${Math.round((onTime / shaped.length) * 100)}%` : '—',
            },
            {
              label: 'Average days',
              value: withDays.length
                ? Math.round(withDays.reduce((s, r) => s + r.days, 0) / withDays.length) : '—',
            },
            { label: 'Contract value', value, money: true, tone: 'in' },
          ],
          breakdowns: [
            { title: 'By provider', items: groupTotals(shaped, (r) => r.provider_name, (r) => r.total_contract) },
            { title: 'By service', items: groupTotals(shaped, (r) => r.category, (r) => r.total_contract) },
          ],
        },
      };
    },
  },

  /* 5 ─ The reconciliation report */
  'bank-statement': {
    title: 'Bank Statement — Money In and Out',
    subtitle: 'Every movement in date order, with a running balance',
    columns: [
      { key: 'date', label: 'Date', width: 62 },
      { key: 'particulars', label: 'Particulars', width: 216 },
      { key: 'method', label: 'Method', width: 66 },
      { key: 'reference', label: 'Reference', width: 92 },
      { key: 'in', label: 'Money in', width: 68, align: 'right', money: true },
      { key: 'out', label: 'Money out', width: 68, align: 'right', money: true },
      { key: 'balance', label: 'Balance', width: 74, align: 'right', money: true },
    ],
    async build({ branch_id, range, filters }) {
      const where = {};
      if (filters.method) where.method = filters.method;
      const rows = await eventsIn({ branch_id, range, where });

      /*
       * The opening balance is everything that happened BEFORE the range. A
       * statement that starts from zero mid-year is not a statement — the
       * running balance has to continue from somewhere real or it cannot be
       * reconciled against an actual bank account.
       */
      const prior = await M.WtMoneyEvent.findAll({
        where: { branch_id, [Op.and]: [effectiveDateBefore(range.from)] },
        attributes: ['direction', 'amount', 'event_type'], raw: true,
      });
      const opening = round2(prior.reduce((s, e) => s
        + (e.direction === 'in' ? num(e.amount) : -ledger.cashOut(e)), 0));

      let balance = opening;
      const shaped = rows.map((e) => {
        const isIn = e.direction === 'in';
        const inAmt = isIn ? num(e.amount) : 0;
        const outAmt = isIn ? 0 : ledger.cashOut(e);
        balance = round2(balance + inAmt - outAmt);
        const who = e.client_name || e.provider_name || '';
        return {
          date: e.received_on,
          particulars: [EVENT_LABEL[e.event_type] || e.event_type, who, e.subject_code]
            .filter(Boolean).join(' · '),
          method: e.method,
          reference: e.reference || e.batch_ref,
          in: inAmt,
          out: outAmt,
          balance,
        };
      });

      const totalIn = round2(shaped.reduce((s, r) => s + r.in, 0));
      const totalOut = round2(shaped.reduce((s, r) => s + r.out, 0));
      return {
        rows: shaped,
        summary: {
          headline: [
            { label: 'Opening balance', value: opening, money: true, tone: 'net' },
            { label: 'Money in', value: totalIn, money: true, tone: 'in' },
            { label: 'Money out', value: totalOut, money: true, tone: 'out' },
            { label: 'Closing balance', value: round2(opening + totalIn - totalOut), money: true, tone: 'net' },
          ],
          breakdowns: [
            { title: 'Money in by method', items: groupTotals(shaped.filter((r) => r.in > 0), (r) => r.method, (r) => r.in) },
            { title: 'Money out by method', items: groupTotals(shaped.filter((r) => r.out > 0), (r) => r.method, (r) => r.out) },
          ],
        },
        meta: { opening, closing: round2(opening + totalIn - totalOut) },
      };
    },
  },
};

/* ────────────────────────────────────────────────────────────────────────────
 * The engine
 * ──────────────────────────────────────────────────────────────────────────── */

class ReportError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

/** Build one report. Returns everything both the table and the PDF need. */
async function run({ branch_id, kind, preset, from, to, filters = {} }) {
  const def = REPORTS[kind];
  if (!def) throw new ReportError(404, `There is no "${kind}" report.`);

  const range = resolveRange({ preset, from, to });
  const out = await def.build({ branch_id, range, filters });

  return {
    kind,
    title: def.title,
    subtitle: def.subtitle,
    range: { preset: range.preset, from: range.from, to: range.to, label: range.label },
    columns: def.columns,
    rows: out.rows,
    summary: out.summary,
    meta: out.meta || {},
    filters,
    generated_at: new Date().toISOString(),
  };
}

/** What the reports hub needs to render its chooser. */
const catalogue = () => Object.entries(REPORTS).map(([kind, d]) => ({
  kind, title: d.title, subtitle: d.subtitle,
}));

module.exports = { run, catalogue, resolveRange, PRESETS, REPORTS, ReportError };
