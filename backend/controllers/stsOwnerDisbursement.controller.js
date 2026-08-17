/**
 * stsOwnerDisbursement.controller.js — paying property owners.
 *
 * An owner statement says what an owner is owed for a period. Settling it used
 * to mean stamping a date and a reference on that statement — no voucher for the
 * owner to sign, no way to reverse a mistake, and nothing in any journal.
 *
 * This gives owner money the treatment provider money already has: one writer,
 * an immutable ledger entry, a numbered branded voucher, and a payment run that
 * settles several owners in the single banking act it actually was.
 *
 * The amount is taken from the STATEMENT rather than from the request. An
 * operator typing a figure into a payout box is how an owner is underpaid by a
 * digit; the statement is the calculation everyone has agreed on.
 */
const { Op } = require('sequelize');
const { asyncHandler, branchScope, resolveBranchId } = require('../utils/controllerHelpers');
const ledger = require('../services/stsLedger.service');
const shortTermStayService = require('../services/shortTermStay.service');
const { StsOwnerDisbursement } = require('../models/shortStayMoney');
const OwnerStatement = require('../models/OwnerStatement');
const Contact = require('../models/Contact');
const voucherSvc = require('../services/wtVoucher.service');
const { getBranding } = require('../services/wtBranding.service');

const num = (v) => Number(v || 0);
const round2 = (v) => Math.round((num(v) + Number.EPSILON) * 100) / 100;
const actorOf = (req) => req.user?.name || req.user?.email || 'Operations';
const today = () => {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

/** GET /reference — the lists the dialogs need. */
exports.reference = asyncHandler(async (req, res) => {
  res.json({ methods: ledger.PAYMENT_METHODS });
});

/**
 * GET /due — every owner with money waiting, and how much is left on each.
 *
 * Built from statements rather than from the live calculation, because a payment
 * must settle a figure that was agreed and sent, not one that moves whenever a
 * booking is amended. `paid` and `remaining` come from the LEDGER, so a
 * part-paid statement shows what is genuinely still outstanding.
 */
exports.due = asyncHandler(async (req, res) => {
  const scope = branchScope(req);
  /*
   * `branchScope` returns {} for a super_admin — no filter, every branch. That
   * is right for the LIST, but the ledger lookup needs a concrete branch, and
   * passing `scope.branch_id` there hands Sequelize an undefined and throws.
   */
  const branchId = resolveBranchId(req);
  const statements = await OwnerStatement.findAll({
    where: {
      ...scope,
      notes: 'Short Term Stay owner statement',
      status: { [Op.in]: ['ready', 'sent', 'paid'] },
    },
    order: [['period_start', 'DESC'], ['id', 'DESC']],
    raw: true,
  }).catch(() => []);

  const owners = await Contact.findAll({
    where: scope, attributes: ['id', 'full_name', 'company_name'], raw: true,
  }).catch(() => []);
  const nameOf = Object.fromEntries(owners.map((c) => [c.id, c.full_name || c.company_name || `Contact #${c.id}`]));

  const lines = [];
  for (const s of statements) {
    const due = round2(s.net_disbursement);
    if (due <= 0.009) continue;
    const paid = Math.abs(await ledger.balanceOf({
      branch_id: branchId, subject_type: 'owner_statement', subject_id: s.id,
    }));
    const remaining = round2(due - paid);
    lines.push({
      statement_id: s.id,
      statement_code: s.statement_code,
      owner_contact_id: s.owner_contact_id,
      owner_name: nameOf[s.owner_contact_id] || 'Owner',
      property_id: s.property_id,
      period_label: s.period_label,
      period_start: s.period_start,
      period_end: s.period_end,
      revenue: round2(s.total_credits),
      fees: round2(s.management_fee),
      deductions: round2(s.total_deductions),
      due,
      paid: round2(paid),
      remaining,
      status: s.status,
      // A statement the owner has not been sent should not normally be paid —
      // shown, but flagged, rather than hidden as though it did not exist.
      blocked_reason: s.status === 'ready' ? 'Not yet sent to the owner' : null,
    });
  }

  res.json({
    payable: lines.filter((l) => l.remaining > 0.009 && !l.blocked_reason),
    blocked: lines.filter((l) => l.remaining > 0.009 && l.blocked_reason),
    settled: lines.filter((l) => l.remaining <= 0.009),
    totals: {
      payable: round2(lines.filter((l) => !l.blocked_reason).reduce((s, l) => s + Math.max(0, l.remaining), 0)),
      owners: new Set(lines.filter((l) => l.remaining > 0.009).map((l) => l.owner_contact_id)).size,
    },
  });
});

/** GET / — the disbursement register, newest first. */
exports.list = asyncHandler(async (req, res) => {
  const scope = branchScope(req);
  const where = { ...scope };
  if (req.query.status) where.status = req.query.status;
  if (req.query.owner) where.owner_contact_id = req.query.owner;
  if (req.query.q) {
    const like = { [Op.like]: `%${String(req.query.q).trim()}%` };
    where[Op.or] = [{ code: like }, { voucher_no: like }, { owner_name: like }, { reference: like }, { statement_code: like }];
  }

  const rows = await StsOwnerDisbursement.findAll({
    where, order: [['id', 'DESC']], limit: 300, raw: true,
  }).catch(() => []);
  const paid = rows.filter((r) => String(r.status).toLowerCase() === 'paid');

  const byOwner = {};
  for (const r of paid) byOwner[r.owner_name || 'Owner'] = round2((byOwner[r.owner_name || 'Owner'] || 0) + num(r.amount));

  res.json({
    rows,
    totals: {
      paid: round2(paid.reduce((s, r) => s + num(r.amount), 0)),
      paid_count: paid.length,
      reversed: rows.filter((r) => String(r.status).toLowerCase() === 'reversed').length,
      by_owner: Object.entries(byOwner).sort((a, b) => b[1] - a[1]).map(([name, total]) => ({ name, total })),
    },
  });
});

/** POST /:statementId/pay — settle one owner statement. */
exports.pay = asyncHandler(async (req, res) => {
  const branchId = resolveBranchId(req);
  const b = req.body || {};
  if (b.paid_on && b.paid_on > today()) return res.status(400).json({ error: 'A payment cannot be dated in the future.' });

  try {
    const out = await ledger.recordOwnerDisbursement({
      branch_id: branchId,
      statement_id: Number(req.params.statementId),
      amount: b.amount != null ? num(b.amount) : undefined,
      owner_name: b.owner_name || null,
      property_label: b.property_label || null,
      method: b.method || 'Bank Transfer',
      reference: b.reference,
      paid_on: b.paid_on || today(),
      note: b.note || null,
      idempotency_key: b.idempotency_key || null,
      actor: actorOf(req),
      actor_id: req.user?.id || null,
    });

    res.json({
      disbursement: out.disbursement,
      event: out.event,
      duplicate: out.duplicate,
      paid: out.paid,
      due: out.due,
      remaining: out.remaining,
      settled: out.settled,
      message: out.duplicate
        ? 'This payment was already recorded — nothing was posted twice.'
        : `${out.disbursement?.voucher_no || 'Voucher'} issued — ${out.settled ? 'statement settled in full' : `${out.remaining} still owing`}.`,
    });
  } catch (e) {
    if (e instanceof ledger.LedgerError) {
      return res.status(e.status).json({ error: e.message, ...(e.remaining != null ? { remaining: e.remaining } : {}) });
    }
    throw e;
  }
});

/** POST /run — pay several owners in one banking act. */
exports.run = asyncHandler(async (req, res) => {
  const branchId = resolveBranchId(req);
  const b = req.body || {};
  const lines = Array.isArray(b.lines) ? b.lines : [];
  if (!lines.length) return res.status(400).json({ error: 'Choose at least one owner to pay.' });
  if (b.paid_on && b.paid_on > today()) return res.status(400).json({ error: 'A payment run cannot be dated in the future.' });
  if (!String(b.reference || '').trim()) {
    return res.status(400).json({ error: 'A reference is required — it is what matches this run to the bank statement.' });
  }

  try {
    const out = await ledger.recordOwnerDisbursementRun({
      branch_id: branchId,
      lines,
      method: b.method || 'Bank Transfer',
      reference: b.reference,
      paid_on: b.paid_on || today(),
      note: b.note || null,
      idempotency_key: b.idempotency_key || null,
      actor: actorOf(req),
      actor_id: req.user?.id || null,
    });

    const fresh = out.paid.filter((p) => !p.duplicate);
    res.json({
      ...out,
      message: fresh.length
        ? `${out.paid.length} owner${out.paid.length === 1 ? '' : 's'} paid — ${out.batch_ref}.`
        : 'This run was already recorded — nothing was posted twice.',
    });
  } catch (e) {
    if (e instanceof ledger.LedgerError) return res.status(e.status).json({ error: e.message });
    throw e;
  }
});

/** GET /:code/voucher — the branded PDF for one owner payment. */
exports.voucher = asyncHandler(async (req, res) => {
  const row = await StsOwnerDisbursement.findOne({
    where: { ...branchScope(req), [Op.or]: [{ code: String(req.params.code) }, { voucher_no: String(req.params.code) }] },
    raw: true,
  });
  if (!row) return res.status(404).json({ error: 'Voucher not found.' });

  const branding = await getBranding().catch(() => ({}));
  const buf = await voucherSvc.buildVoucherPdf(voucherShape(row), branding);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="${row.voucher_no || row.code}.pdf"`);
  res.send(buf);
});

/** GET /run/:batch/voucher — the whole run as one document. */
exports.runVoucher = asyncHandler(async (req, res) => {
  const rows = await StsOwnerDisbursement.findAll({
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
    vouchers: rows.map(voucherShape),
  }, branding);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="${req.params.batch}.pdf"`);
  res.send(buf);
});

/**
 * The register row as the shared voucher renderer expects it.
 *
 * One voucher design for the whole company: a provider fee, a direct cost and an
 * owner payout all use the same document, with `disbursement_type` deciding the
 * one line that describes what kind of payment it is.
 */
const voucherShape = (r) => ({
  voucher_no: r.voucher_no,
  code: r.code,
  disbursement_type: 'owner',
  payee: r.owner_name || 'Property owner',
  payee_type: 'Property Owner',
  category: 'Owner disbursement',
  description: r.description,
  statement_code: r.statement_code,
  period_label: r.period_label,
  property_label: r.property_label,
  amount: r.amount,
  method: r.method,
  reference: r.reference,
  paid_on: r.paid_on,
  batch_ref: r.batch_ref,
  requested_by: r.paid_by,
  approved_by: r.approved_by,
  paid_by: r.paid_by,
  notes: r.notes,
});

/** POST /:code/reverse — this payment was recorded in error. */
exports.reverse = asyncHandler(async (req, res) => {
  const row = await StsOwnerDisbursement.findOne({
    where: { ...branchScope(req), [Op.or]: [{ code: String(req.params.code) }, { voucher_no: String(req.params.code) }] },
  });
  if (!row) return res.status(404).json({ error: 'Disbursement not found.' });
  if (!row.money_event_id) return res.status(409).json({ error: 'Nothing to reverse — this payment was already undone.' });

  try {
    const out = await ledger.reverse({
      branch_id: row.branch_id,
      event_id: row.money_event_id,
      reason: req.body?.reason,
      actor: actorOf(req),
      actor_id: req.user?.id || null,
    });
    await row.reload();
    res.json({
      disbursement: row,
      event: out.event,
      message: `${row.code} reversed. The voucher stays on the record marked reversed.`,
    });
  } catch (e) {
    if (e instanceof ledger.LedgerError) return res.status(e.status).json({ error: e.message });
    throw e;
  }
});

/** GET /journal — every owner payment, for reconciliation. */
exports.journal = asyncHandler(async (req, res) => {
  res.json(await ledger.journal({
    branch_id: resolveBranchId(req),
    from: req.query.from || null,
    to: req.query.to || null,
    limit: Math.min(500, Number(req.query.limit) || 200),
  }));
});
