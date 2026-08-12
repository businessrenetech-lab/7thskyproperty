/**
 * wtLedger.service.js — the only place Water Tank money is written.
 *
 * Before this, a client receipt could be posted by two different routes and a
 * provider payout by one more, each incrementing a column in place with its own
 * validation. Incrementing a column is the problem: read 5,000, add 2,000, write
 * 7,000. Two requests that read before either writes both write 7,000, and the
 * second payment vanishes. Nothing in the data shows it ever happened.
 *
 * Three rules fix that, and every function here exists to enforce one of them.
 *
 *   1. ONE TRANSACTION, ONE LOCK. Every post takes the subject row with
 *      SELECT … FOR UPDATE, so a second concurrent request waits rather than
 *      reading a balance that is about to change.
 *
 *   2. THE LEDGER IS THE TRUTH. The balance is SUM(amount) over the rows, never
 *      a column plus an increment. The columns on wt_invoices / wt_work_orders
 *      are kept in step as a CACHE for the registers, recomputed from the sum.
 *      If the two ever disagree, the ledger is right by definition.
 *
 *   3. NOTHING IS EVER EDITED. A wrong receipt is corrected by a compensating
 *      row with a negative amount pointing at the original. Both stay visible.
 *      An auditor can see the error and the fix; an edited row shows neither.
 *
 * Idempotency: every post carries a key, unique per branch. A double-clicked
 * button or a retried request reuses the key, collides with the unique index and
 * gets the ORIGINAL row back — the money moves exactly once. Callers that do not
 * supply a key get one derived from the subject, amount, reference and day, which
 * catches the double-click case without needing frontend cooperation.
 */
const { Op } = require('sequelize');
const crypto = require('crypto');
const sequelize = require('../config/db.config');
const M = require('../models/waterTankOps');

const num = (v) => Number(v || 0);
const round2 = (v) => Math.round((num(v) + Number.EPSILON) * 100) / 100;
const today = () => new Date().toISOString().slice(0, 10);

const EVENT_TYPES = {
  client_receipt: { direction: 'in', subject: 'invoice' },
  client_receipt_reversal: { direction: 'in', subject: 'invoice' },
  provider_payout: { direction: 'out', subject: 'work_order' },
  provider_payout_reversal: { direction: 'out', subject: 'work_order' },
};

class LedgerError extends Error {
  constructor(status, message, extra = {}) { super(message); this.status = status; Object.assign(this, extra); }
}

/** A stable key for a request that did not bring its own. */
function derivedKey({ subject_type, subject_id, event_type, amount, reference, received_on }) {
  const basis = [subject_type, subject_id, event_type, round2(amount), reference || '', received_on || today()].join('|');
  return `auto:${crypto.createHash('sha1').update(basis).digest('hex').slice(0, 32)}`;
}

/**
 * Sum the ledger for one subject. This is the authoritative balance.
 * Reversals carry negative amounts, so they net out here with no special case.
 */
async function balanceOf({ branch_id, subject_type, subject_id }, { transaction } = {}) {
  const rows = await M.WtMoneyEvent.findAll({
    where: { branch_id, subject_type, subject_id },
    attributes: ['amount'], raw: true, transaction,
  });
  return round2(rows.reduce((s, r) => s + num(r.amount), 0));
}

/** Every movement against one subject, oldest first, for the audit trail. */
async function historyOf({ branch_id, subject_type, subject_id }, { transaction } = {}) {
  return M.WtMoneyEvent.findAll({
    where: { branch_id, subject_type, subject_id },
    order: [['created_at', 'ASC'], ['id', 'ASC']], raw: true, transaction,
  });
}

/**
 * Append one row. Private — callers go through recordClientReceipt or
 * recordProviderPayout, which apply the business rules for their side.
 *
 * Returns { event, duplicate } so the caller can tell a fresh post from a
 * replayed one and report honestly rather than claiming a second payment landed.
 */
async function append(spec, { transaction }) {
  const meta = EVENT_TYPES[spec.event_type];
  if (!meta) throw new LedgerError(400, `Unknown ledger event type "${spec.event_type}".`);

  const key = spec.idempotency_key || derivedKey(spec);
  const existing = await M.WtMoneyEvent.findOne({
    where: { branch_id: spec.branch_id, idempotency_key: key }, transaction,
  });
  if (existing) return { event: existing.toJSON ? existing.toJSON() : existing, duplicate: true };

  try {
    const event = await M.WtMoneyEvent.create({
      branch_id: spec.branch_id,
      event_type: spec.event_type,
      direction: meta.direction,
      subject_type: spec.subject_type,
      subject_id: spec.subject_id,
      subject_code: spec.subject_code || null,
      amount: round2(spec.amount),
      currency: spec.currency || 'BDT',
      method: spec.method || null,
      reference: spec.reference || null,
      received_on: spec.received_on || today(),
      idempotency_key: key,
      reverses_event_id: spec.reverses_event_id || null,
      reversal_reason: spec.reversal_reason || null,
      project_id: spec.project_id || null,
      client_name: spec.client_name || null,
      provider_name: spec.provider_name || null,
      note: spec.note || null,
      origin: spec.origin || 'api',
      actor: spec.actor || null,
      actor_id: spec.actor_id || null,
      created_at: new Date(),
    }, { transaction });
    return { event: event.toJSON(), duplicate: false };
  } catch (e) {
    // Lost the race to a concurrent request carrying the same key: the unique
    // index did its job. Return what the winner wrote rather than failing.
    if (e.name === 'SequelizeUniqueConstraintError') {
      const won = await M.WtMoneyEvent.findOne({
        where: { branch_id: spec.branch_id, idempotency_key: key }, transaction,
      });
      if (won) return { event: won.toJSON(), duplicate: true };
    }
    throw e;
  }
}

/* ────────────────────────────────────────────────────────────────────────────
 * Client receipts
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * What an invoice is worth and what is still owed, derived — never read from the
 * cached columns, which is the whole point of having a ledger.
 */
function invoiceStanding(inv, received) {
  const svc = require('./wtInvoice.service');
  const totals = svc.computeTotals({ ...inv, paid_amount: received });
  return {
    amount: totals.amount,
    received: round2(received),
    outstanding: totals.outstanding,
    totals,
  };
}

/**
 * Record money received against an invoice.
 *
 * Refuses to over-collect and refuses to collect against a draft — a draft has
 * not been sent, so a payment against it means the operator picked the wrong
 * row, and silently accepting it makes the books harder to unpick later.
 */
async function recordClientReceipt(opts, { transaction } = {}) {
  const run = async (t) => {
    const inv = await M.WtInvoice.findOne({
      where: { id: opts.invoice_id, branch_id: opts.branch_id },
      transaction: t, lock: t.LOCK.UPDATE,
    });
    if (!inv) throw new LedgerError(404, 'Invoice not found.');

    const status = String(inv.status || '').trim().toLowerCase();
    if (status === 'draft') throw new LedgerError(409, 'Send the invoice before recording a payment against it.');
    if (status === 'void') throw new LedgerError(409, 'This invoice is void — it cannot take a payment.');

    const amount = round2(opts.amount);
    if (!(amount > 0)) throw new LedgerError(400, 'Enter an amount greater than zero.');

    const received = await balanceOf(
      { branch_id: opts.branch_id, subject_type: 'invoice', subject_id: inv.id }, { transaction: t },
    );
    const before = invoiceStanding(inv.toJSON(), received);
    if (amount > before.outstanding + 0.009) {
      throw new LedgerError(400, `Payment exceeds the outstanding balance of ${before.outstanding}.`, {
        outstanding: before.outstanding,
      });
    }

    const { event, duplicate } = await append({
      branch_id: opts.branch_id,
      event_type: 'client_receipt',
      subject_type: 'invoice',
      subject_id: inv.id,
      subject_code: inv.code,
      amount,
      method: opts.method,
      reference: opts.reference,
      received_on: opts.received_on,
      idempotency_key: opts.idempotency_key,
      project_id: inv.project_id,
      client_name: inv.client_name,
      note: opts.note,
      actor: opts.actor,
      actor_id: opts.actor_id,
    }, { transaction: t });

    const after = await syncInvoiceCache(inv, { transaction: t });
    return { event, duplicate, invoice: inv, standing: after };
  };

  return transaction ? run(transaction) : sequelize.transaction(run);
}

/**
 * Recompute an invoice's cached money columns from the ledger.
 *
 * `payments` is rebuilt from the ledger rather than appended to, so the JSON the
 * screens read can never drift from the rows that are actually authoritative.
 */
async function syncInvoiceCache(inv, { transaction } = {}) {
  const svc = require('./wtInvoice.service');
  const events = await historyOf(
    { branch_id: inv.branch_id, subject_type: 'invoice', subject_id: inv.id }, { transaction },
  );
  const received = round2(events.reduce((s, e) => s + num(e.amount), 0));
  const standing = invoiceStanding(inv.toJSON(), received);

  const payments = events.map((e) => ({
    event_id: e.id,
    amount: num(e.amount),
    method: e.method,
    reference: e.reference,
    received_on: e.received_on,
    by: e.actor,
    at: e.created_at,
    reversal: num(e.amount) < 0,
    reverses_event_id: e.reverses_event_id || null,
    reason: e.reversal_reason || null,
  }));

  const patch = {
    payments,
    paid_amount: received,
    amount: standing.amount,
    outstanding: standing.outstanding,
    status: svc.deriveStatus(inv.toJSON(), standing.totals),
  };
  // Once the client has settled, the provider payout falls due — unless it has
  // already cleared, which must not be walked back by a later recalculation.
  if (standing.outstanding <= 0.009 && String(inv.provider_payout || '').toLowerCase() !== 'cleared') {
    patch.provider_payout = 'Pending';
  }
  if (standing.outstanding <= 0.009 && received > 0 && !inv.paid_at) patch.paid_at = new Date();
  if (standing.outstanding > 0.009 && inv.paid_at) patch.paid_at = null;

  await inv.update(patch, { transaction });
  return standing;
}

/* ────────────────────────────────────────────────────────────────────────────
 * Provider payouts
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * Pay a provider against a work order.
 *
 * The gates come from the SIGNED provider agreement, not from a preference: if
 * the agreement says payment follows client receipt, that is a term the provider
 * agreed to and the system must hold to it.
 */
async function recordProviderPayout(opts, { transaction } = {}) {
  const P = require('../models/waterTankProviders');

  const run = async (t) => {
    const wo = await M.WtWorkOrder.findOne({
      where: { id: opts.work_order_id, branch_id: opts.branch_id },
      transaction: t, lock: t.LOCK.UPDATE,
    });
    if (!wo) throw new LedgerError(404, 'Work order not found.');

    const agreement = wo.provider_agreement_id
      ? await P.WtProviderAgreement.findOne({ where: { id: wo.provider_agreement_id, branch_id: opts.branch_id }, transaction: t })
      : null;
    if (!agreement) throw new LedgerError(400, 'This payout has no signed provider agreement snapshot.');

    if (!opts.skip_gates) {
      const trigger = String(agreement.payout_trigger || '').trim();
      if (trigger === 'Client Payment Received') {
        const invoices = wo.project_id
          ? await M.WtInvoice.findAll({ where: { branch_id: opts.branch_id, project_id: wo.project_id }, raw: true, transaction: t })
          : [];
        const live = invoices.filter((i) => String(i.status || '').toLowerCase() !== 'void');
        const clientPaid = live.length > 0 && live.every((i) => num(i.outstanding) <= 0.009);
        if (!clientPaid) throw new LedgerError(400, 'The signed agreement requires client payment before provider payout.');
      }
      if ((trigger === 'Approved Milestone' || trigger === 'Completion Verified') && !wo.verified_at) {
        throw new LedgerError(400, `The signed agreement requires ${trigger === 'Approved Milestone' ? 'an approved completion milestone' : 'verified completion'} before provider payout.`);
      }
    }

    const amount = round2(opts.amount);
    if (!(amount > 0)) throw new LedgerError(400, 'Enter a payout amount greater than zero.');

    const fee = round2(wo.provider_fee);
    const paidSoFar = Math.abs(await balanceOf(
      { branch_id: opts.branch_id, subject_type: 'work_order', subject_id: wo.id }, { transaction: t },
    ));
    const remaining = round2(fee - paidSoFar);
    if (amount > remaining + 0.009) {
      throw new LedgerError(400, `Payout exceeds the remaining balance of ${remaining}.`, { remaining });
    }

    const { event, duplicate } = await append({
      branch_id: opts.branch_id,
      event_type: 'provider_payout',
      subject_type: 'work_order',
      subject_id: wo.id,
      subject_code: wo.code,
      amount,
      method: opts.method,
      reference: opts.reference,
      received_on: opts.paid_on,
      idempotency_key: opts.idempotency_key,
      project_id: wo.project_id,
      client_name: wo.client_name,
      provider_name: wo.provider_name,
      note: opts.note,
      actor: opts.actor,
      actor_id: opts.actor_id,
    }, { transaction: t });

    const standing = await syncWorkOrderCache(wo, { transaction: t });
    return { event, duplicate, workOrder: wo, standing };
  };

  return transaction ? run(transaction) : sequelize.transaction(run);
}

/** Recompute a work order's cached payout columns from the ledger. */
async function syncWorkOrderCache(wo, { transaction } = {}) {
  const events = await historyOf(
    { branch_id: wo.branch_id, subject_type: 'work_order', subject_id: wo.id }, { transaction },
  );
  const paid = round2(events.reduce((s, e) => s + num(e.amount), 0));
  const fee = round2(wo.provider_fee);
  const last = events.filter((e) => num(e.amount) > 0).slice(-1)[0];

  await wo.update({
    provider_paid_amount: paid,
    payout_status: paid <= 0.009 ? (String(wo.payout_status || '') === 'Not Due' ? 'Not Due' : 'Pending')
      : (paid >= fee - 0.009 ? 'Cleared' : 'Partially Paid'),
    payout_date: last ? (last.received_on || String(last.created_at).slice(0, 10)) : null,
    payout_method: last ? last.method : wo.payout_method,
    payout_reference: last ? last.reference : wo.payout_reference,
  }, { transaction });

  return { fee, paid, remaining: round2(fee - paid) };
}

/* ────────────────────────────────────────────────────────────────────────────
 * Reversals
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * Undo a movement by posting its mirror image.
 *
 * Deliberately NOT a delete. The original row stays, the reversal points at it,
 * and the balance is the sum of both. A reversal cannot itself be reversed and a
 * row can only be reversed once — otherwise the same mistake could be credited
 * twice, which is a way to make money appear.
 */
async function reverse(opts, { transaction } = {}) {
  const run = async (t) => {
    const original = await M.WtMoneyEvent.findOne({
      where: { id: opts.event_id, branch_id: opts.branch_id }, transaction: t,
    });
    if (!original) throw new LedgerError(404, 'That money movement was not found.');
    if (num(original.amount) < 0) throw new LedgerError(409, 'This entry is itself a reversal.');

    const already = await M.WtMoneyEvent.findOne({
      where: { branch_id: opts.branch_id, reverses_event_id: original.id }, transaction: t,
    });
    if (already) throw new LedgerError(409, 'That movement has already been reversed.');

    if (!opts.reason || !String(opts.reason).trim()) {
      throw new LedgerError(400, 'Give a reason — a reversal is a permanent part of the audit trail.');
    }

    const { event } = await append({
      branch_id: opts.branch_id,
      event_type: `${original.event_type}_reversal`,
      subject_type: original.subject_type,
      subject_id: original.subject_id,
      subject_code: original.subject_code,
      amount: -round2(original.amount),
      method: original.method,
      reference: original.reference,
      received_on: opts.received_on,
      idempotency_key: `reversal:${original.id}`,
      reverses_event_id: original.id,
      reversal_reason: String(opts.reason).trim(),
      project_id: original.project_id,
      client_name: original.client_name,
      provider_name: original.provider_name,
      note: opts.note,
      actor: opts.actor,
      actor_id: opts.actor_id,
    }, { transaction: t });

    let standing;
    if (original.subject_type === 'invoice') {
      const inv = await M.WtInvoice.findOne({
        where: { id: original.subject_id, branch_id: opts.branch_id }, transaction: t, lock: t.LOCK.UPDATE,
      });
      if (inv) standing = await syncInvoiceCache(inv, { transaction: t });
    } else {
      const wo = await M.WtWorkOrder.findOne({
        where: { id: original.subject_id, branch_id: opts.branch_id }, transaction: t, lock: t.LOCK.UPDATE,
      });
      if (wo) standing = await syncWorkOrderCache(wo, { transaction: t });
    }
    return { event, reversed: original.toJSON(), standing };
  };

  return transaction ? run(transaction) : sequelize.transaction(run);
}

/* ────────────────────────────────────────────────────────────────────────────
 * Reporting
 * ──────────────────────────────────────────────────────────────────────────── */

/** Everything that moved in a window, for the Payments & Disbursements screen. */
async function journal({ branch_id, from, to, direction, limit = 200 }) {
  const where = { branch_id };
  if (direction) where.direction = direction;
  if (from || to) {
    where.created_at = {};
    if (from) where.created_at[Op.gte] = new Date(`${from}T00:00:00`);
    if (to) where.created_at[Op.lte] = new Date(`${to}T23:59:59`);
  }
  const rows = await M.WtMoneyEvent.findAll({
    where, order: [['created_at', 'DESC'], ['id', 'DESC']], limit, raw: true,
  });
  const collected = round2(rows.filter((r) => r.direction === 'in').reduce((s, r) => s + num(r.amount), 0));
  const disbursed = round2(rows.filter((r) => r.direction === 'out').reduce((s, r) => s + num(r.amount), 0));
  return { rows, totals: { collected, disbursed, margin: round2(collected - disbursed) } };
}

module.exports = {
  LedgerError, EVENT_TYPES,
  balanceOf, historyOf, journal,
  recordClientReceipt, recordProviderPayout, reverse,
  syncInvoiceCache, syncWorkOrderCache,
  round2,
};
