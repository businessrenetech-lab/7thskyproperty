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
  /*
   * A refund is NOT a reversal, and the distinction is the point.
   *
   *   reversal — the entry was wrong. The money was never ours. The books
   *              should read as though it had not been recorded, with the
   *              mistake and its correction both visible.
   *   refund   — the money DID arrive and we gave it back. Overpayment, a
   *              cancelled job, a goodwill settlement. It is a real outward
   *              movement that has to appear on the bank reconciliation and on
   *              the client's statement as two events, not none.
   *
   * Conflating them is how a business ends up unable to explain where its cash
   * went. So a refund carries a negative amount against the invoice — which
   * makes the outstanding balance rise again, correctly — but its own type.
   */
  client_refund: { direction: 'out', subject: 'invoice' },
  client_refund_reversal: { direction: 'out', subject: 'invoice' },
  provider_payout: { direction: 'out', subject: 'work_order' },
  provider_payout_reversal: { direction: 'out', subject: 'work_order' },
  /*
   * Money Seventh Sky spends ITSELF: chemicals, transport, a government fee, a
   * day-labourer, equipment hire. Not every payment goes to a service provider,
   * and until this existed those payments were either unrecorded or parked in a
   * table the ledger never read — so "disbursed" counted provider payouts only
   * and the margin derived from it was overstated by everything the business
   * spent on its own account.
   *
   * There is no gate here, deliberately. A provider payout is gated by the
   * signed agreement because it is a promise about WHEN to pay. A direct cost is
   * recorded AFTER the money has gone; refusing to record it would not stop the
   * spending, it would only hide it.
   */
  direct_disbursement: { direction: 'out', subject: 'disbursement' },
  direct_disbursement_reversal: { direction: 'out', subject: 'disbursement' },
};

/** What Seventh Sky spends money on directly, in rough order of frequency. */
const DISBURSEMENT_CATEGORIES = [
  'Chemicals & Consumables', 'Transport & Fuel', 'Labour & Wages', 'Equipment Hire',
  'Equipment Purchase', 'Government & Licence Fees', 'Testing & Laboratory',
  'Repairs & Spares', 'Site Expenses', 'Refreshments', 'Office & Admin', 'Other',
];

/** Methods a Bangladeshi client actually pays by, in the order they are used. */
const PAYMENT_METHODS = [
  { value: 'Cash', reference_label: 'Receipt number', reference_hint: 'Your own receipt book number, if you issued one.' },
  { value: 'bKash', reference_label: 'TrxID', reference_hint: 'The 10-character transaction ID from the bKash message.', reference_required: true },
  { value: 'Nagad', reference_label: 'TrxID', reference_hint: 'The transaction ID from the Nagad confirmation.', reference_required: true },
  { value: 'Rocket', reference_label: 'TrxID', reference_hint: 'The transaction ID from the Rocket confirmation.', reference_required: true },
  { value: 'Bank Transfer', reference_label: 'Transaction / slip number', reference_hint: 'What the bank statement will show.', reference_required: true },
  { value: 'Cheque', reference_label: 'Cheque number & bank', reference_hint: 'Record it now; it is still uncleared money.', reference_required: true },
  { value: 'Card', reference_label: 'Authorisation code', reference_hint: 'From the terminal slip.' },
  { value: 'Adjustment', reference_label: 'Authority', reference_hint: 'Who approved writing this off against the balance.', reference_required: true },
];

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
      batch_ref: spec.batch_ref || null,
      refund_reason: spec.refund_reason || null,
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
      batch_ref: opts.batch_ref,
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
 * One payment, several invoices — the lump sum.
 *
 * A client on an AMC pays ৳50,000 covering four months' invoices. Posting those
 * one at a time through four separate requests has two failure modes that matter:
 * the third can fail and leave the books half-applied with no record of intent,
 * and the client's statement then shows four payments they did not make.
 *
 * So the whole allocation runs in ONE transaction — all of it lands or none of
 * it does — and every row carries the same `batch_ref`, so the statement can
 * show one payment applied across four invoices, which is what happened.
 *
 * The allocation is decided by the CALLER and validated here rather than being
 * inferred: an operator who wants to pay the newest invoice first has a reason,
 * and silently applying oldest-first would quietly overrule them.
 */
async function recordBatchClientReceipt(opts, { transaction } = {}) {
  const lines = Array.isArray(opts.allocations) ? opts.allocations.filter((a) => round2(a.amount) > 0) : [];
  if (!lines.length) throw new LedgerError(400, 'Allocate the payment to at least one invoice.');

  const total = round2(lines.reduce((s, l) => s + num(l.amount), 0));
  if (opts.total != null && Math.abs(round2(opts.total) - total) > 0.009) {
    throw new LedgerError(400,
      `The allocation comes to ${total}, but the payment received is ${round2(opts.total)}. Every taka has to be placed.`);
  }

  const batch = opts.batch_ref || `BATCH-${crypto.randomBytes(6).toString('hex').toUpperCase()}`;

  const run = async (t) => {
    const results = [];
    for (const line of lines) {
      // Deliberately sequential. Each call locks its invoice row; running them
      // concurrently inside one transaction would deadlock against itself.
      const out = await recordClientReceipt({
        branch_id: opts.branch_id,
        invoice_id: line.invoice_id,
        amount: line.amount,
        method: opts.method,
        reference: opts.reference,
        received_on: opts.received_on,
        note: opts.note,
        batch_ref: batch,
        // Each line needs its OWN key, or the second invoice in a batch of
        // identical amounts would be swallowed as a duplicate of the first.
        idempotency_key: opts.idempotency_key ? `${opts.idempotency_key}:${line.invoice_id}` : null,
        actor: opts.actor,
        actor_id: opts.actor_id,
      }, { transaction: t });
      results.push({
        invoice_id: line.invoice_id,
        invoice_code: out.invoice.code,
        amount: round2(line.amount),
        duplicate: out.duplicate,
        outstanding: out.standing.outstanding,
        status: out.invoice.status,
      });
    }
    return { batch_ref: batch, total, applied: results };
  };

  return transaction ? run(transaction) : sequelize.transaction(run);
}

/**
 * Give money back to a client.
 *
 * Bounded by what was actually received on this invoice — you cannot refund
 * money that never arrived, and the check runs inside the lock so two refunds
 * racing cannot together exceed the receipts.
 *
 * A refund raises the outstanding balance again, which is correct: the invoice
 * is once more unpaid to that extent. If the refund is because the work is not
 * happening, the invoice should be voided or credited separately — refunding
 * alone leaves a debt the client does not owe, and that is a decision for a
 * person, not something to infer here.
 */
async function recordClientRefund(opts, { transaction } = {}) {
  const run = async (t) => {
    const inv = await M.WtInvoice.findOne({
      where: { id: opts.invoice_id, branch_id: opts.branch_id },
      transaction: t, lock: t.LOCK.UPDATE,
    });
    if (!inv) throw new LedgerError(404, 'Invoice not found.');

    const amount = round2(opts.amount);
    if (!(amount > 0)) throw new LedgerError(400, 'Enter a refund amount greater than zero.');
    if (!opts.reason || !String(opts.reason).trim()) {
      throw new LedgerError(400, 'Give a reason — a refund is money leaving the business and the books must say why.');
    }

    const received = await balanceOf(
      { branch_id: opts.branch_id, subject_type: 'invoice', subject_id: inv.id }, { transaction: t },
    );
    if (amount > received + 0.009) {
      throw new LedgerError(400,
        `You can refund at most ${round2(received)} — that is what has actually been received against this invoice.`,
        { refundable: round2(received) });
    }

    const { event, duplicate } = await append({
      branch_id: opts.branch_id,
      event_type: 'client_refund',
      subject_type: 'invoice',
      subject_id: inv.id,
      subject_code: inv.code,
      // Negative, so the derived balance falls and the invoice owes again.
      amount: -amount,
      method: opts.method,
      reference: opts.reference,
      received_on: opts.refunded_on,
      idempotency_key: opts.idempotency_key,
      refund_reason: String(opts.reason).trim(),
      project_id: inv.project_id,
      client_name: inv.client_name,
      note: opts.note,
      actor: opts.actor,
      actor_id: opts.actor_id,
    }, { transaction: t });

    const after = await syncInvoiceCache(inv, { transaction: t });
    return { event, duplicate, invoice: inv, standing: after, refundable: round2(received - amount) };
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

  /*
   * `kind` rather than a bare `reversal` flag, because three different things
   * now carry a negative amount and a screen that cannot tell them apart will
   * describe a refund as a correction. They are not the same event to a client.
   */
  const payments = events.map((e) => ({
    event_id: e.id,
    kind: e.event_type === 'client_refund' ? 'refund'
      : num(e.amount) < 0 ? 'reversal' : 'receipt',
    amount: num(e.amount),
    method: e.method,
    reference: e.reference,
    received_on: e.received_on,
    by: e.actor,
    at: e.created_at,
    reversal: num(e.amount) < 0 && e.event_type !== 'client_refund',
    reverses_event_id: e.reverses_event_id || null,
    batch_ref: e.batch_ref || null,
    reason: e.reversal_reason || e.refund_reason || null,
    note: e.note || null,
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
      batch_ref: opts.batch_ref,
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
 * Direct disbursements — money Seventh Sky spends itself
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * Record money paid out that is NOT a provider payout.
 *
 * The disbursement row is created by the caller and passed in; this posts the
 * ledger entry against it and links the two, so the register and the journal can
 * never disagree about whether the money moved.
 *
 * Unlike a receipt there is no ceiling to check — a direct cost is not "against"
 * a balance, it IS the balance. What is checked is that it has a payee and a
 * reason, because an unexplained payment out is exactly what a voucher exists to
 * prevent.
 */
async function recordDirectDisbursement(opts, { transaction } = {}) {
  const run = async (t) => {
    const row = await M.WtProjectDisbursement.findOne({
      where: { id: opts.disbursement_id, branch_id: opts.branch_id },
      transaction: t, lock: t.LOCK.UPDATE,
    });
    if (!row) throw new LedgerError(404, 'Disbursement not found.');

    const amount = round2(opts.amount != null ? opts.amount : row.amount);
    if (!(amount > 0)) throw new LedgerError(400, 'Enter an amount greater than zero.');
    if (!String(row.payee || '').trim()) throw new LedgerError(400, 'A disbursement needs a payee — who received the money.');

    const already = await balanceOf(
      { branch_id: opts.branch_id, subject_type: 'disbursement', subject_id: row.id }, { transaction: t },
    );
    if (Math.abs(already) > 0.009) {
      throw new LedgerError(409, 'This disbursement has already been paid. Reverse it first if it was wrong.');
    }

    const { event, duplicate } = await append({
      branch_id: opts.branch_id,
      event_type: 'direct_disbursement',
      subject_type: 'disbursement',
      subject_id: row.id,
      subject_code: row.code,
      /*
       * POSITIVE, matching provider payouts. Outflows are stored positive here
       * and identified as outflows by `direction`; only client refunds are
       * stored negative, and for a specific reason — they hang off the INVOICE,
       * whose balance is the sum of its rows, so a refund has to subtract from
       * what that invoice has received. A disbursement has its own subject, so
       * there is nothing to subtract from and the house convention wins.
       */
      amount,
      method: opts.method,
      reference: opts.reference,
      received_on: opts.paid_on,
      idempotency_key: opts.idempotency_key,
      batch_ref: opts.batch_ref,
      project_id: row.project_code,
      provider_name: row.payee,
      note: opts.note || row.description,
      actor: opts.actor,
      actor_id: opts.actor_id,
    }, { transaction: t });

    await row.update({
      status: 'Paid',
      amount,
      paid_on: opts.paid_on || today(),
      method: opts.method || row.method,
      reference: opts.reference || row.reference,
      batch_ref: opts.batch_ref || row.batch_ref,
      money_event_id: event.id,
      paid_by: opts.actor || row.paid_by,
    }, { transaction: t });

    return { event, duplicate, disbursement: row };
  };

  return transaction ? run(transaction) : sequelize.transaction(run);
}

/**
 * A payment run: several disbursements settled in one banking act.
 *
 * Atomic for the same reason a bulk receipt is — a run that half-posts leaves
 * the operator believing they have paid people they have not. Lines may mix
 * provider payouts and direct costs, because a Thursday payment run does.
 */
async function recordDisbursementRun(opts, { transaction } = {}) {
  const lines = Array.isArray(opts.lines) ? opts.lines.filter((l) => round2(l.amount) > 0) : [];
  if (!lines.length) throw new LedgerError(400, 'Choose at least one payment to make.');

  const batch = opts.batch_ref || `RUN-${crypto.randomBytes(6).toString('hex').toUpperCase()}`;

  const run = async (t) => {
    const paid = [];
    for (const line of lines) {
      // Sequential on purpose: each call takes a row lock, and running them
      // concurrently inside one transaction would deadlock against itself.
      const key = opts.idempotency_key ? `${opts.idempotency_key}:${line.kind}:${line.id}` : null;
      const common = {
        branch_id: opts.branch_id,
        amount: line.amount,
        method: opts.method,
        reference: opts.reference,
        paid_on: opts.paid_on,
        note: opts.note,
        batch_ref: batch,
        idempotency_key: key,
        actor: opts.actor,
        actor_id: opts.actor_id,
      };

      if (line.kind === 'provider') {
        const out = await recordProviderPayout({ ...common, work_order_id: line.id }, { transaction: t });
        paid.push({
          kind: 'provider', id: line.id, code: out.workOrder.code,
          payee: out.workOrder.provider_name, amount: round2(line.amount),
          duplicate: out.duplicate, remaining: out.standing.remaining, event_id: out.event.id,
        });
      } else {
        const out = await recordDirectDisbursement({ ...common, disbursement_id: line.id }, { transaction: t });
        paid.push({
          kind: 'direct', id: line.id, code: out.disbursement.code,
          payee: out.disbursement.payee, amount: round2(line.amount),
          duplicate: out.duplicate, remaining: 0, event_id: out.event.id,
        });
      }
    }
    return { batch_ref: batch, total: round2(paid.reduce((s, p) => s + p.amount, 0)), paid };
  };

  return transaction ? run(transaction) : sequelize.transaction(run);
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
    /*
     * A refund carries a negative amount but IS reversible — one entered by
     * mistake has to be correctable like any other. What cannot be reversed is a
     * reversal, because that is just the original entry again by another name.
     */
    if (String(original.event_type).endsWith('_reversal')) {
      throw new LedgerError(409, 'This entry is itself a reversal — reverse the original instead.');
    }

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
    } else if (original.subject_type === 'disbursement') {
      /*
       * Without this branch a reversed disbursement would still read "Paid" on
       * the register while the ledger said otherwise — the register is a cache,
       * and a cache nobody invalidates is just a lie with a timestamp.
       */
      const row = await M.WtProjectDisbursement.findOne({
        where: { id: original.subject_id, branch_id: opts.branch_id }, transaction: t, lock: t.LOCK.UPDATE,
      });
      if (row) {
        await row.update({
          status: 'Reversed', paid_on: null, money_event_id: null,
          notes: [row.notes, `Reversed: ${String(opts.reason).trim()}`].filter(Boolean).join('\n'),
        }, { transaction: t });
        standing = { paid: 0 };
      }
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

  /*
   * The totals are computed over EVERY matching row, not over the page that was
   * fetched for display. Summing the limited set is the kind of bug that works
   * perfectly until the business has been running a year: the page still shows
   * 200 rows, and the "collected" figure above it quietly stops being the truth
   * with nothing on screen to say so.
   */
  const all = await M.WtMoneyEvent.findAll({
    where, attributes: ['direction', 'amount', 'event_type'], raw: true,
  });
  const collected = round2(all.filter((r) => r.direction === 'in').reduce((s, r) => s + num(r.amount), 0));
  const disbursed = round2(all.filter((r) => r.direction === 'out').reduce((s, r) => s + cashOut(r), 0));
  return {
    rows,
    totals: { collected, disbursed, margin: round2(collected - disbursed), event_count: all.length },
    truncated: all.length > rows.length,
  };
}

/**
 * How much cash an outward row actually moved.
 *
 * Nearly all outflows are stored positive. Client refunds are the exception:
 * they hang off the INVOICE, whose balance is the sum of its own rows, so a
 * refund must be negative there to reduce what that invoice has received. That
 * makes its stored sign the opposite of its cash effect, and summing the raw
 * amounts would make a refund look like money coming BACK to the business.
 *
 * This is the one place that difference is reconciled, rather than each caller
 * remembering it — which is how it would eventually be forgotten.
 */
function cashOut(row) {
  const signed = num(row.amount);
  return String(row.event_type || '').startsWith('client_refund') ? -signed : signed;
}

module.exports = {
  LedgerError, EVENT_TYPES, PAYMENT_METHODS, DISBURSEMENT_CATEGORIES,
  balanceOf, historyOf, journal, cashOut,
  recordClientReceipt, recordBatchClientReceipt, recordClientRefund,
  recordProviderPayout, recordDirectDisbursement, recordDisbursementRun, reverse,
  syncInvoiceCache, syncWorkOrderCache,
  round2,
};
