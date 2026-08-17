/**
 * waterTankDisbursement.controller.js — money leaving Seventh Sky.
 *
 * Two kinds, one register, one voucher.
 *
 *   PROVIDER PAYOUT — against a work order, gated by the signed provider
 *   agreement's payout trigger. Those gates stay exactly where they were.
 *
 *   DIRECT COST — Seventh Sky paid it itself: chemicals, a hired vehicle, a
 *   government fee, a day-labourer. Free-text payee, because the whole point is
 *   that this payee is on no list. No gate, because the money has already gone
 *   and refusing to record it would only hide it.
 *
 * The reason for putting both in one place is arithmetic. The Payments screen
 * derives its margin as collected minus disbursed, and "disbursed" counted
 * provider payouts alone — so every taka the business spent on its own account
 * made the margin look better than it was. Both kinds now write to the same
 * ledger, so the figure is the truth.
 *
 * Every payment produces a numbered, branded voucher. A voucher is what the
 * recipient signs and the first thing an auditor asks for; a business that pays
 * money out and produces no document for it cannot answer the simplest question
 * about its own cash.
 */
const { Op } = require('sequelize');
const { asyncHandler, branchScope, resolveBranchId } = require('../utils/controllerHelpers');
const M = require('../models/waterTankOps');
const P = require('../models/waterTankProviders');
const ledger = require('../services/wtLedger.service');
const voucherSvc = require('../services/wtVoucher.service');
const { getBranding } = require('../services/wtBranding.service');

const num = (v) => Number(v || 0);
const round2 = (v) => Math.round((num(v) + Number.EPSILON) * 100) / 100;
const today = () => new Date().toISOString().slice(0, 10);
const actorOf = (req) => req.user?.name || req.user?.email || 'Operations';

const PAYEE_TYPES = ['Supplier', 'Service Provider', 'Labour', 'Government', 'Transport', 'Staff', 'Other'];

/** Next sequential code, scoped to the branch, for a prefix on this table. */
async function nextSeq(prefix, branchId, field = 'code') {
  const rows = await M.WtProjectDisbursement.findAll({
    where: { branch_id: branchId }, attributes: [field], raw: true,
  });
  let max = 0;
  for (const r of rows) {
    const m = String(r[field] || '').match(new RegExp(`^${prefix}(\\d+)$`));
    if (m) max = Math.max(max, Number(m[1]));
  }
  return `${prefix}${String(max + 1).padStart(4, '0')}`;
}

/* ── reference ─────────────────────────────────────────────────────────── */

/** GET /wt-disbursements/reference — every list the dialogs need. */
exports.reference = asyncHandler(async (req, res) => {
  const scope = branchScope(req);
  const [projects, providers] = await Promise.all([
    M.WtProject.findAll({ where: scope, attributes: ['code', 'name', 'client_name'], order: [['id', 'DESC']], limit: 60, raw: true }).catch(() => []),
    M.WtProvider.findAll({ where: scope, attributes: ['id', 'business_name'], order: [['business_name', 'ASC']], raw: true }).catch(() => []),
  ]);
  res.json({
    categories: ledger.DISBURSEMENT_CATEGORIES,
    payee_types: PAYEE_TYPES,
    // The same method list receipts use, so a bank statement reconciles against
    // one vocabulary rather than two.
    methods: ledger.PAYMENT_METHODS,
    projects: projects.map((p) => ({ code: p.code, name: p.name, client_name: p.client_name })),
    providers: providers.map((p) => ({ id: p.id, name: p.business_name })),
  });
});

/* ── the register ──────────────────────────────────────────────────────── */

/**
 * GET /wt-disbursements — direct costs, newest first.
 *
 * Provider payouts are NOT listed here: they live on the work order and are
 * shown by the payments screen from there. Duplicating them would mean two
 * places to look and two chances to double-pay.
 */
exports.list = asyncHandler(async (req, res) => {
  const scope = branchScope(req);
  const where = { ...scope };
  if (req.query.status) where.status = req.query.status;
  if (req.query.project) where.project_code = req.query.project;
  if (req.query.q) {
    const like = { [Op.like]: `%${String(req.query.q).trim()}%` };
    where[Op.or] = [{ code: like }, { payee: like }, { description: like }, { category: like }, { voucher_no: like }, { reference: like }];
  }

  const rows = await M.WtProjectDisbursement.findAll({ where, order: [['id', 'DESC']], limit: 300, raw: true });
  const paid = rows.filter((r) => String(r.status).toLowerCase() === 'paid');
  const pending = rows.filter((r) => !['paid', 'reversed', 'cancelled'].includes(String(r.status).toLowerCase()));

  const byCategory = {};
  for (const r of paid) byCategory[r.category || 'Other'] = round2((byCategory[r.category || 'Other'] || 0) + num(r.amount));

  res.json({
    rows,
    totals: {
      paid: round2(paid.reduce((s, r) => s + num(r.amount), 0)),
      paid_count: paid.length,
      pending: round2(pending.reduce((s, r) => s + num(r.amount), 0)),
      pending_count: pending.length,
      // Where the money actually goes, which is the question a monthly review
      // asks and no screen could previously answer.
      by_category: Object.entries(byCategory).sort((a, b) => b[1] - a[1]).map(([name, total]) => ({ name, total })),
    },
  });
});

/* ── create and pay ────────────────────────────────────────────────────── */

/**
 * POST /wt-disbursements — record a direct cost.
 *
 * `pay_now` defaults TRUE, because the overwhelmingly common case is recording
 * something already paid for out of the float. Setting it false files the cost
 * as Requested, for the case where it needs approving before the money moves.
 */
exports.create = asyncHandler(async (req, res) => {
  const branchId = resolveBranchId(req);
  const b = req.body || {};

  const amount = round2(b.amount);
  if (!(amount > 0)) return res.status(400).json({ error: 'Enter an amount greater than zero.' });
  if (!String(b.payee || '').trim()) return res.status(400).json({ error: 'Who was paid? A payment with no payee cannot be vouched for.' });
  if (!String(b.description || '').trim()) return res.status(400).json({ error: 'Say what the money was for — that is the whole purpose of a voucher.' });
  if (b.paid_on && b.paid_on > today()) return res.status(400).json({ error: 'A payment cannot be made in the future.' });

  const payNow = b.pay_now !== false;

  const row = await M.WtProjectDisbursement.create({
    branch_id: branchId,
    code: await nextSeq('DSB-', branchId),
    disbursement_type: 'direct',
    project_code: b.project_code || null,
    work_order_code: b.work_order_code || null,
    category: b.category || 'Other',
    payee: String(b.payee).trim(),
    payee_type: PAYEE_TYPES.includes(b.payee_type) ? b.payee_type : 'Supplier',
    payee_details: b.payee_details || null,
    description: String(b.description).trim(),
    amount,
    status: payNow ? 'Requested' : 'Requested',
    incurred_on: b.incurred_on || today(),
    method: b.method || null,
    reference: b.reference || null,
    billable_to_client: !!b.billable_to_client,
    requested_by: actorOf(req),
    notes: b.notes || null,
  });

  if (!payNow) {
    return res.status(201).json({ disbursement: row, paid: false, message: `${row.code} filed for approval. Nothing has been paid yet.` });
  }

  try {
    const out = await ledger.recordDirectDisbursement({
      branch_id: branchId,
      disbursement_id: row.id,
      amount,
      method: b.method || null,
      reference: b.reference || null,
      paid_on: b.paid_on || today(),
      note: b.notes || null,
      idempotency_key: b.idempotency_key || null,
      actor: actorOf(req),
      actor_id: req.user?.id || null,
    });
    const voucher = await issueVoucher(out.disbursement, branchId, actorOf(req));
    return res.status(201).json({
      disbursement: voucher, paid: true, event: out.event, duplicate: out.duplicate,
      message: `${voucher.voucher_no} issued — ${voucher.payee} paid.`,
    });
  } catch (e) {
    // The row exists but the money did not move; leaving it as a phantom
    // "Requested" with no explanation would be worse than removing it.
    await row.destroy().catch(() => {});
    if (e instanceof ledger.LedgerError) return res.status(e.status).json({ error: e.message });
    throw e;
  }
});

/** Stamp a voucher number on a paid disbursement, once. */
async function issueVoucher(row, branchId, actor) {
  if (row.voucher_no) return row;
  await row.update({
    voucher_no: await nextSeq('PV-', branchId, 'voucher_no'),
    voucher_issued_at: new Date(),
    approved_by: row.approved_by || actor,
  });
  return row;
}

/** POST /wt-disbursements/:code/pay — pay one that was filed for approval. */
exports.pay = asyncHandler(async (req, res) => {
  const branchId = resolveBranchId(req);
  const row = await M.WtProjectDisbursement.findOne({
    where: { ...branchScope(req), [Op.or]: [{ code: String(req.params.code) }, { voucher_no: String(req.params.code) }] },
  });
  if (!row) return res.status(404).json({ error: 'Disbursement not found.' });

  try {
    const out = await ledger.recordDirectDisbursement({
      branch_id: branchId,
      disbursement_id: row.id,
      amount: req.body?.amount != null ? num(req.body.amount) : num(row.amount),
      method: req.body?.method || row.method,
      reference: req.body?.reference || row.reference,
      paid_on: req.body?.paid_on || today(),
      note: req.body?.note || null,
      idempotency_key: req.body?.idempotency_key || null,
      actor: actorOf(req),
      actor_id: req.user?.id || null,
    });
    const voucher = await issueVoucher(out.disbursement, branchId, actorOf(req));
    res.json({ disbursement: voucher, event: out.event, duplicate: out.duplicate, message: `${voucher.voucher_no} issued.` });
  } catch (e) {
    if (e instanceof ledger.LedgerError) return res.status(e.status).json({ error: e.message });
    throw e;
  }
});

/* ── the payment run ───────────────────────────────────────────────────── */

/**
 * GET /wt-disbursements/due — everything waiting to be paid out, both kinds.
 *
 * One list, because a Thursday payment run does not care whether a line is a
 * contractor's fee or a hardware bill — it cares who is owed money today.
 */
exports.due = asyncHandler(async (req, res) => {
  const scope = branchScope(req);
  const [workOrders, agreements, invoices, direct] = await Promise.all([
    M.WtWorkOrder.findAll({ where: scope, order: [['id', 'DESC']], raw: true }),
    P.WtProviderAgreement.findAll({ where: scope, raw: true }).catch(() => []),
    M.WtInvoice.findAll({ where: scope, raw: true }),
    M.WtProjectDisbursement.findAll({
      where: { ...scope, status: { [Op.notIn]: ['Paid', 'Reversed', 'Cancelled'] } },
      order: [['id', 'DESC']], raw: true,
    }).catch(() => []),
  ]);

  const eq = (v, s) => String(v || '').toLowerCase() === s;
  const agreementById = Object.fromEntries(agreements.map((a) => [a.id, a]));

  // Same eligibility rule the payments screen uses; kept in one shape here so a
  // run cannot offer a line the payout endpoint would then refuse.
  const providerLines = workOrders.map((w) => {
    const agreement = agreementById[w.provider_agreement_id];
    const remaining = round2(Math.max(0, num(w.provider_fee) - num(w.provider_paid_amount)));
    let blocked = null;
    if (!agreement) blocked = 'No signed provider agreement snapshot';
    else if (agreement.payout_trigger === 'Client Payment Received') {
      const projectInvoices = invoices.filter((i) => w.project_id && i.project_id === w.project_id && !eq(i.status, 'void'));
      const clientPaid = projectInvoices.length > 0 && projectInvoices.every((i) => num(i.outstanding) <= 0.009);
      if (!clientPaid) blocked = 'Waiting for client payment';
    } else if ((agreement.payout_trigger === 'Approved Milestone' || agreement.payout_trigger === 'Completion Verified') && !w.verified_at) {
      blocked = `Waiting for ${agreement.payout_trigger === 'Approved Milestone' ? 'an approved milestone' : 'completion verification'}`;
    }
    return {
      kind: 'provider',
      id: w.id,
      code: w.code,
      payee: w.provider_name,
      category: w.category || 'Provider fee',
      description: w.scope,
      project_code: w.project_id,
      client_name: w.client_name,
      amount: remaining,
      blocked_reason: blocked,
    };
  }).filter((l) => l.payee && l.amount > 0.009);

  res.json({
    provider: providerLines.filter((l) => !l.blocked_reason),
    provider_blocked: providerLines.filter((l) => l.blocked_reason),
    direct: direct.map((d) => ({
      kind: 'direct',
      id: d.id,
      code: d.code,
      payee: d.payee,
      category: d.category,
      description: d.description,
      project_code: d.project_code,
      amount: round2(num(d.amount)),
      blocked_reason: null,
    })),
  });
});

/**
 * POST /wt-disbursements/run — pay several at once.
 *
 * Atomic. A run that half-posts leaves an operator believing they have paid
 * people they have not, which is the single most expensive way for this to fail.
 */
exports.run = asyncHandler(async (req, res) => {
  const branchId = resolveBranchId(req);
  const b = req.body || {};
  const lines = Array.isArray(b.lines) ? b.lines : [];
  if (!lines.length) return res.status(400).json({ error: 'Choose at least one payment to make.' });
  if (b.paid_on && b.paid_on > today()) return res.status(400).json({ error: 'A payment run cannot be dated in the future.' });

  try {
    const out = await ledger.recordDisbursementRun({
      branch_id: branchId,
      lines: lines.map((l) => ({ kind: l.kind === 'provider' ? 'provider' : 'direct', id: Number(l.id), amount: num(l.amount) })),
      method: b.method || null,
      reference: b.reference || null,
      paid_on: b.paid_on || today(),
      note: b.note || null,
      idempotency_key: b.idempotency_key || null,
      actor: actorOf(req),
      actor_id: req.user?.id || null,
    });

    /*
     * A voucher for every line, including provider payouts — which had none
     * before, so a contractor was paid and signed nothing. Provider payouts have
     * no disbursement row of their own, so one is written here to carry the
     * voucher: the ledger entry remains the money, this is the paperwork.
     */
    const vouchers = [];
    for (const p of out.paid) {
      if (p.kind === 'direct') {
        const row = await M.WtProjectDisbursement.findOne({ where: { branch_id: branchId, id: p.id } });
        if (row) vouchers.push((await issueVoucher(row, branchId, actorOf(req))).toJSON());
      } else {
        const wo = await M.WtWorkOrder.findOne({ where: { branch_id: branchId, id: p.id }, raw: true });
        const row = await M.WtProjectDisbursement.create({
          branch_id: branchId,
          code: await nextSeq('DSB-', branchId),
          disbursement_type: 'provider',
          project_code: wo?.project_id || null,
          work_order_code: wo?.code || null,
          work_order_id: p.id,
          category: 'Provider fee',
          payee: p.payee,
          payee_type: 'Service Provider',
          description: `Provider payout against ${wo?.code || 'work order'}${wo?.scope ? ` — ${wo.scope}` : ''}`,
          amount: p.amount,
          status: 'Paid',
          incurred_on: b.paid_on || today(),
          paid_on: b.paid_on || today(),
          method: b.method || null,
          reference: b.reference || null,
          batch_ref: out.batch_ref,
          money_event_id: p.event_id,
          requested_by: actorOf(req),
          paid_by: actorOf(req),
        });
        vouchers.push((await issueVoucher(row, branchId, actorOf(req))).toJSON());
      }
    }

    res.json({
      ...out,
      vouchers: vouchers.map((v) => ({ voucher_no: v.voucher_no, code: v.code, payee: v.payee, amount: num(v.amount) })),
      message: `${out.paid.length} payment${out.paid.length === 1 ? '' : 's'} made — ${out.batch_ref}.`,
    });
  } catch (e) {
    if (e instanceof ledger.LedgerError) return res.status(e.status).json({ error: e.message });
    throw e;
  }
});

/* ── the voucher itself ────────────────────────────────────────────────── */

/** GET /wt-disbursements/:code/voucher — the branded PDF for one payment. */
exports.voucher = asyncHandler(async (req, res) => {
  const row = await M.WtProjectDisbursement.findOne({
    where: { ...branchScope(req), [Op.or]: [{ code: String(req.params.code) }, { voucher_no: String(req.params.code) }] },
    raw: true,
  });
  if (!row) return res.status(404).json({ error: 'Voucher not found.' });
  if (!row.voucher_no) return res.status(409).json({ error: 'No voucher yet — this payment has not been made.' });

  const branding = await getBranding().catch(() => ({}));
  const buf = await voucherSvc.buildVoucherPdf(row, branding);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="${row.voucher_no}.pdf"`);
  res.send(buf);
});

/** GET /wt-disbursements/run/:batch/voucher — the whole run as one document. */
exports.runVoucher = asyncHandler(async (req, res) => {
  const rows = await M.WtProjectDisbursement.findAll({
    where: { ...branchScope(req), batch_ref: String(req.params.batch) },
    order: [['id', 'ASC']], raw: true,
  });
  if (!rows.length) return res.status(404).json({ error: 'That payment run was not found.' });

  const branding = await getBranding().catch(() => ({}));
  const buf = await voucherSvc.buildRunPdf({
    batch_ref: req.params.batch,
    paid_on: rows[0].paid_on,
    reference: rows[0].reference,
    paid_by: rows[0].paid_by,
    total: round2(rows.reduce((s, r) => s + num(r.amount), 0)),
    vouchers: rows,
  }, branding);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="${req.params.batch}.pdf"`);
  res.send(buf);
});

/** POST /wt-disbursements/:code/reverse — this payment was recorded in error. */
exports.reverse = asyncHandler(async (req, res) => {
  const row = await M.WtProjectDisbursement.findOne({
    where: { ...branchScope(req), [Op.or]: [{ code: String(req.params.code) }, { voucher_no: String(req.params.code) }] },
  });
  if (!row) return res.status(404).json({ error: 'Disbursement not found.' });
  if (!row.money_event_id) return res.status(409).json({ error: 'Nothing to reverse — this was never paid.' });

  try {
    const out = await ledger.reverse({
      branch_id: row.branch_id,
      event_id: row.money_event_id,
      reason: req.body?.reason,
      actor: actorOf(req),
      actor_id: req.user?.id || null,
    });
    await row.reload();
    res.json({ disbursement: row, event: out.event, message: `${row.code} reversed. The voucher stays on the record marked reversed.` });
  } catch (e) {
    if (e instanceof ledger.LedgerError) return res.status(e.status).json({ error: e.message });
    throw e;
  }
});
