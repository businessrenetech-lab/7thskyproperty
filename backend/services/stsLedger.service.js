/**
 * stsLedger.service.js — the only place Short Term Stay money is written.
 *
 * Paying an owner used to mean stamping three columns on their statement and
 * flipping a status. That records that money moved; it does not record the
 * movement. It could not be reversed, produced no document, and appeared in no
 * journal — so "did we pay the Gulshan owner in July, and can you prove it?"
 * had no answer beyond a date field somebody could overwrite.
 *
 * The same three rules the provider ledger runs on, applied to owner money:
 *
 *   1. ONE TRANSACTION, ONE LOCK. Every post takes the statement row with
 *      SELECT … FOR UPDATE, so a second concurrent request waits rather than
 *      reading a status that is about to change.
 *
 *   2. THE LEDGER IS THE TRUTH. What an owner has been paid is SUM(amount) over
 *      their rows, never a column somebody set. The statement's own fields are a
 *      CACHE for the register, recomputed from the sum. If the two disagree, the
 *      ledger is right by definition.
 *
 *   3. NOTHING IS EVER EDITED. A wrong payment is corrected by a compensating
 *      row pointing at the original. Both stay visible, because an auditor needs
 *      to see the error and the fix — an edited row shows neither.
 *
 * Idempotency: every post carries a key, unique per branch. A double-clicked
 * button or a retried request reuses the key, collides with the unique index and
 * gets the ORIGINAL row back. Callers that bring no key get one derived from the
 * subject, amount, reference and day, which catches the double-click without
 * needing the frontend to cooperate.
 *
 * NOTE ON DUPLICATION: this deliberately mirrors `wtLedger.service.js` rather
 * than sharing code with it. The two are the same discipline over different
 * books — Water Tank's journal and bank statement query on branch alone, so one
 * shared table would silently move Water Tank's reported cash. Extracting a
 * common append/reverse core is worth doing, but as its own change with the
 * money suites as the safety net, not folded into a feature.
 */
const { Op } = require('sequelize');
const crypto = require('crypto');
const sequelize = require('../config/db.config');
const { StsMoneyEvent, StsOwnerDisbursement } = require('../models/shortStayMoney');
const OwnerStatement = require('../models/OwnerStatement');

const num = (v) => Number(v || 0);
const round2 = (v) => Math.round((num(v) + Number.EPSILON) * 100) / 100;
const today = () => {
  // Local calendar date. `toISOString()` on local midnight is the previous day
  // in Asia/Dhaka, which would date every payment one day early.
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

const EVENT_TYPES = {
  owner_disbursement: { direction: 'out', subject: 'owner_statement' },
  owner_disbursement_reversal: { direction: 'out', subject: 'owner_statement' },
};

/** How an owner is actually paid. Shared vocabulary with the provider side. */
const PAYMENT_METHODS = [
  { value: 'Bank Transfer', reference_label: 'Transaction / slip number', reference_hint: 'What the bank statement will show.', reference_required: true },
  { value: 'bKash', reference_label: 'TrxID', reference_hint: 'The 10-character transaction ID from the bKash message.', reference_required: true },
  { value: 'Nagad', reference_label: 'TrxID', reference_hint: 'The transaction ID from the Nagad confirmation.', reference_required: true },
  { value: 'Cheque', reference_label: 'Cheque number & bank', reference_hint: 'Record it now; it is still uncleared money.', reference_required: true },
  { value: 'Cash', reference_label: 'Receipt number', reference_hint: 'Your own receipt book number, if you issued one.' },
  { value: 'Adjustment', reference_label: 'Authority', reference_hint: 'Who approved settling this without money moving.', reference_required: true },
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
 * Sum the ledger for one subject. This is the authoritative figure.
 * Reversals carry negative amounts, so they net out with no special case.
 */
async function balanceOf({ branch_id, subject_type, subject_id }, { transaction } = {}) {
  const rows = await StsMoneyEvent.findAll({
    where: { branch_id, subject_type, subject_id },
    attributes: ['amount'], raw: true, transaction,
  });
  return round2(rows.reduce((s, r) => s + num(r.amount), 0));
}

/** Every movement against one subject, oldest first, for the audit trail. */
async function historyOf({ branch_id, subject_type, subject_id }, { transaction } = {}) {
  return StsMoneyEvent.findAll({
    where: { branch_id, subject_type, subject_id },
    order: [['created_at', 'ASC'], ['id', 'ASC']], raw: true, transaction,
  });
}

/**
 * Append one row. Private — callers go through recordOwnerDisbursement, which
 * applies the business rules.
 *
 * Returns { event, duplicate } so the caller can tell a fresh post from a
 * replayed one and report honestly rather than claiming a second payment landed.
 */
async function append(spec, { transaction }) {
  const meta = EVENT_TYPES[spec.event_type];
  if (!meta) throw new LedgerError(400, `Unknown ledger event type "${spec.event_type}".`);

  const key = spec.idempotency_key || derivedKey(spec);
  const existing = await StsMoneyEvent.findOne({
    where: { branch_id: spec.branch_id, idempotency_key: key }, transaction,
  });
  if (existing) return { event: existing.toJSON(), duplicate: true };

  try {
    const event = await StsMoneyEvent.create({
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
      owner_contact_id: spec.owner_contact_id || null,
      owner_name: spec.owner_name || null,
      property_id: spec.property_id || null,
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
      const won = await StsMoneyEvent.findOne({
        where: { branch_id: spec.branch_id, idempotency_key: key }, transaction,
      });
      if (won) return { event: won.toJSON(), duplicate: true };
    }
    throw e;
  }
}

/** Next sequential code for a prefix, scoped to the branch. */
async function nextSeq(prefix, branchId, field = 'code', transaction) {
  const rows = await StsOwnerDisbursement.findAll({
    where: { branch_id: branchId }, attributes: [field], raw: true, transaction,
  });
  let max = 0;
  for (const r of rows) {
    const m = String(r[field] || '').match(new RegExp(`^${prefix}(\\d+)$`));
    if (m) max = Math.max(max, Number(m[1]));
  }
  return `${prefix}${String(max + 1).padStart(4, '0')}`;
}

/**
 * Pay an owner what a statement says they are owed.
 *
 * The amount is taken from the STATEMENT, not from the request. An operator
 * typing a figure into a payout box is how an owner gets underpaid by a digit;
 * the statement is the calculation everybody has agreed on. A part payment is
 * allowed and is checked against what remains, so the same statement cannot be
 * paid twice over.
 */
async function recordOwnerDisbursement(opts, { transaction } = {}) {
  const run = async (t) => {
    const statement = await OwnerStatement.findOne({
      where: {
        id: opts.statement_id,
        branch_id: opts.branch_id,
        notes: 'Short Term Stay owner statement',
      },
      transaction: t,
      lock: t.LOCK.UPDATE,
    });
    if (!statement) throw new LedgerError(404, 'That owner statement was not found.');

    const status = String(statement.status || '').toLowerCase();
    if (status === 'draft') throw new LedgerError(409, 'This statement is still a draft — generate it before paying against it.');

    const due = round2(statement.net_disbursement);
    if (!(due > 0)) throw new LedgerError(409, 'This statement has nothing payable — the owner owes Seventh Sky for the period.');

    const alreadyPaid = Math.abs(await balanceOf(
      { branch_id: opts.branch_id, subject_type: 'owner_statement', subject_id: statement.id }, { transaction: t },
    ));
    const remaining = round2(due - alreadyPaid);
    if (remaining <= 0.009) throw new LedgerError(409, 'This statement has already been paid in full.');

    const amount = opts.amount != null ? round2(opts.amount) : remaining;
    if (!(amount > 0)) throw new LedgerError(400, 'Enter an amount greater than zero.');
    if (amount > remaining + 0.009) {
      throw new LedgerError(400, `That is more than the ${remaining} still owed on this statement.`, { remaining });
    }
    if (!String(opts.reference || '').trim()) {
      throw new LedgerError(400, 'A payment reference is required — it is what matches this voucher to the bank statement.');
    }

    const { event, duplicate } = await append({
      branch_id: opts.branch_id,
      event_type: 'owner_disbursement',
      subject_type: 'owner_statement',
      subject_id: statement.id,
      subject_code: statement.statement_code,
      // Positive, identified as an outflow by `direction` — the house
      // convention, so a journal can sum without reading each type.
      amount,
      method: opts.method,
      reference: opts.reference,
      received_on: opts.paid_on,
      idempotency_key: opts.idempotency_key,
      batch_ref: opts.batch_ref,
      owner_contact_id: statement.owner_contact_id,
      owner_name: opts.owner_name,
      property_id: statement.property_id,
      note: opts.note,
      actor: opts.actor,
      actor_id: opts.actor_id,
    }, { transaction: t });

    const paidNow = Math.abs(await balanceOf(
      { branch_id: opts.branch_id, subject_type: 'owner_statement', subject_id: statement.id }, { transaction: t },
    ));
    const settled = paidNow >= due - 0.009;

    /*
     * The statement's own columns are kept in step as a CACHE. They are what the
     * existing screens read, and they must never contradict the ledger — so they
     * are recomputed from it rather than incremented.
     */
    await statement.update({
      status: settled ? 'paid' : statement.status,
      disbursement_date: opts.paid_on || today(),
      disbursement_reference: opts.reference,
      disbursement_method: opts.method || 'bank_transfer',
    }, { transaction: t });

    let row = null;
    if (!duplicate) {
      row = await StsOwnerDisbursement.create({
        branch_id: opts.branch_id,
        code: await nextSeq('OD-', opts.branch_id, 'code', t),
        voucher_no: await nextSeq('OPV-', opts.branch_id, 'voucher_no', t),
        voucher_issued_at: new Date(),
        batch_ref: opts.batch_ref || null,
        statement_id: statement.id,
        statement_code: statement.statement_code,
        owner_contact_id: statement.owner_contact_id,
        owner_name: opts.owner_name || null,
        property_id: statement.property_id,
        property_label: opts.property_label || null,
        period_label: statement.period_label,
        description: opts.description
          || `Owner disbursement for ${statement.period_label || 'the period'}${settled ? '' : ' (part payment)'}`,
        amount,
        method: opts.method || null,
        reference: opts.reference || null,
        paid_on: opts.paid_on || today(),
        status: 'Paid',
        money_event_id: event.id,
        paid_by: opts.actor || null,
        approved_by: opts.actor || null,
        notes: opts.note || null,
        created_at: new Date(),
        updated_at: new Date(),
      }, { transaction: t });
    } else {
      row = await StsOwnerDisbursement.findOne({
        where: { branch_id: opts.branch_id, money_event_id: event.id }, transaction: t,
      });
    }

    return {
      event, duplicate, statement, disbursement: row,
      paid: round2(paidNow), due, remaining: round2(due - paidNow), settled,
    };
  };

  return transaction ? run(transaction) : sequelize.transaction(run);
}

/**
 * A payment run: several owners settled in one banking act.
 *
 * Atomic, for the reason that matters most here — a run that half-posts leaves
 * the operator believing they have paid owners they have not, and owners are
 * the people most likely to notice and least likely to forgive it.
 */
async function recordOwnerDisbursementRun(opts, { transaction } = {}) {
  const lines = Array.isArray(opts.lines) ? opts.lines.filter((l) => Number(l.statement_id)) : [];
  if (!lines.length) throw new LedgerError(400, 'Choose at least one owner to pay.');

  const batch = opts.batch_ref || `OWNRUN-${crypto.randomBytes(6).toString('hex').toUpperCase()}`;

  const run = async (t) => {
    const paid = [];
    for (const line of lines) {
      // Sequential on purpose: each call takes a row lock, and running them
      // concurrently inside one transaction would deadlock against itself.
      const out = await recordOwnerDisbursement({
        branch_id: opts.branch_id,
        statement_id: Number(line.statement_id),
        amount: line.amount != null ? line.amount : undefined,
        owner_name: line.owner_name,
        property_label: line.property_label,
        method: opts.method,
        reference: opts.reference,
        paid_on: opts.paid_on,
        note: opts.note,
        batch_ref: batch,
        idempotency_key: opts.idempotency_key ? `${opts.idempotency_key}:${line.statement_id}` : null,
        actor: opts.actor,
        actor_id: opts.actor_id,
      }, { transaction: t });

      paid.push({
        statement_id: Number(line.statement_id),
        statement_code: out.statement.statement_code,
        owner_contact_id: out.statement.owner_contact_id,
        owner_name: line.owner_name || out.disbursement?.owner_name || null,
        voucher_no: out.disbursement?.voucher_no || null,
        amount: round2(out.event.amount),
        duplicate: out.duplicate,
        remaining: out.remaining,
        settled: out.settled,
      });
    }
    return { batch_ref: batch, total: round2(paid.reduce((s, p) => s + p.amount, 0)), paid };
  };

  return transaction ? run(transaction) : sequelize.transaction(run);
}

/**
 * Undo a payment by posting its mirror image.
 *
 * Deliberately NOT a delete. The original stays, the reversal points at it, and
 * the balance is the sum of both. A reversal cannot itself be reversed and a row
 * can only be reversed once — otherwise the same mistake could be credited
 * twice, which is a way to make money appear.
 */
async function reverse(opts, { transaction } = {}) {
  const run = async (t) => {
    const original = await StsMoneyEvent.findOne({
      where: { id: opts.event_id, branch_id: opts.branch_id }, transaction: t,
    });
    if (!original) throw new LedgerError(404, 'That payment was not found.');
    if (String(original.event_type).endsWith('_reversal')) {
      throw new LedgerError(409, 'This entry is itself a reversal — reverse the original instead.');
    }

    const already = await StsMoneyEvent.findOne({
      where: { branch_id: opts.branch_id, reverses_event_id: original.id }, transaction: t,
    });
    if (already) throw new LedgerError(409, 'That payment has already been reversed.');

    if (!opts.reason || !String(opts.reason).trim()) {
      throw new LedgerError(400, 'Give a reason — a reversal is a permanent part of the audit trail.');
    }

    const { event } = await append({
      branch_id: opts.branch_id,
      event_type: 'owner_disbursement_reversal',
      subject_type: original.subject_type,
      subject_id: original.subject_id,
      subject_code: original.subject_code,
      amount: -round2(original.amount),
      method: original.method,
      reference: original.reference,
      received_on: opts.paid_on,
      idempotency_key: `reversal:${original.id}`,
      reverses_event_id: original.id,
      reversal_reason: String(opts.reason).trim(),
      batch_ref: original.batch_ref,
      owner_contact_id: original.owner_contact_id,
      owner_name: original.owner_name,
      property_id: original.property_id,
      note: opts.note,
      actor: opts.actor,
      actor_id: opts.actor_id,
    }, { transaction: t });

    /*
     * The register row and the statement are both brought back into line. A
     * reversed payment that still reads "Paid" on the register is a cache
     * nobody invalidated — which is a lie with a timestamp on it.
     */
    const row = await StsOwnerDisbursement.findOne({
      where: { branch_id: opts.branch_id, money_event_id: original.id }, transaction: t, lock: t.LOCK.UPDATE,
    });
    if (row) {
      await row.update({
        status: 'Reversed',
        money_event_id: null,
        notes: [row.notes, `Reversed: ${String(opts.reason).trim()}`].filter(Boolean).join('\n'),
        updated_at: new Date(),
      }, { transaction: t });
    }

    const statement = await OwnerStatement.findOne({
      where: { id: original.subject_id, branch_id: opts.branch_id }, transaction: t, lock: t.LOCK.UPDATE,
    });
    if (statement) {
      const paidNow = Math.abs(await balanceOf(
        { branch_id: opts.branch_id, subject_type: 'owner_statement', subject_id: statement.id }, { transaction: t },
      ));
      const due = round2(statement.net_disbursement);
      await statement.update({
        // Back to `sent` if it is no longer settled: `sent` is the state a
        // statement is in when the owner has it and the money has not moved.
        status: paidNow >= due - 0.009 ? 'paid' : 'sent',
        ...(paidNow <= 0.009 ? { disbursement_date: null, disbursement_reference: null } : {}),
      }, { transaction: t });
    }

    return { event, reversed: original.toJSON(), disbursement: row, statement };
  };

  return transaction ? run(transaction) : sequelize.transaction(run);
}

/**
 * Every movement, newest first, with totals over the WHOLE matching set rather
 * than the page — a total computed over a limited page is correct until the
 * business has been running a year, then quietly stops being.
 */
async function journal({ branch_id, from, to, limit = 200 }) {
  const where = { branch_id };
  if (from || to) {
    where.received_on = {};
    if (from) where.received_on[Op.gte] = from;
    if (to) where.received_on[Op.lte] = to;
  }
  const rows = await StsMoneyEvent.findAll({
    where, order: [['received_on', 'DESC'], ['id', 'DESC']], limit, raw: true,
  });
  const all = await StsMoneyEvent.findAll({ where, attributes: ['direction', 'amount'], raw: true });
  const disbursed = round2(all.reduce((s, r) => s + num(r.amount), 0));
  return { rows, totals: { disbursed, event_count: all.length }, truncated: all.length > rows.length };
}

module.exports = {
  LedgerError, EVENT_TYPES, PAYMENT_METHODS,
  balanceOf, historyOf, journal, nextSeq,
  recordOwnerDisbursement, recordOwnerDisbursementRun, reverse,
  round2,
};
