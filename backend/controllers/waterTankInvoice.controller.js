/**
 * waterTankInvoice.controller.js — Water Tank invoicing.
 *
 * Lifecycle the user asked for: a signed contract DRAFTS an invoice, the operator
 * edits the draft, and only then does it go out. So editing is allowed while the
 * status is Draft and refused afterwards — once a client holds the document, its
 * figures must not move underneath them.
 */
const { Op } = require('sequelize');
const { asyncHandler, branchScope, resolveBranchId, pick, serviceScope, resolveServiceLine, catalogueVertical } = require('../utils/controllerHelpers');
// Branch + service-line scope for wt_* reads; the reference() ServiceItem query keeps plain branchScope.
const scoped = (req) => ({ ...branchScope(req), ...serviceScope(req) });
const M = require('../models/waterTankOps');
const svc = require('../services/wtInvoice.service');
const ledger = require('../services/wtLedger.service');
const sm = require('../services/wtStateMachine.service');
const pdfSvc = require('../services/wtInvoicePdf.service');
const { getBranding } = require('../services/wtBranding.service');

const { num, round2, today, eq, asArray } = svc;
const actorOf = (req) => req.user?.name || req.user?.email || 'Operations';
const daysTo = (d) => (d ? Math.ceil((new Date(d) - Date.now()) / 864e5) : null);
const bdtish = (v) => `৳${round2(num(v)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/*
 * Sequelize hands JSON columns back as STRINGS on this MySQL setup, so an
 * invoice row straight from the DB has `lines` as text. Every consumer then has
 * to remember to parse it, and the one that forgets crashes on .map(). Normalise
 * once here, at the API boundary, so the client always receives real arrays.
 */
const shape = (row) => ({
  ...row,
  lines: asArray(row.lines),
  payments: asArray(row.payments),
  issued_snapshot: typeof row.issued_snapshot === 'string'
    ? (() => { try { return JSON.parse(row.issued_snapshot); } catch { return null; } })()
    : (row.issued_snapshot || null),
});

const loadInvoice = async (req, res) => {
  const key = req.params.code;
  const inv = await M.WtInvoice.findOne({
    where: {
      ...scoped(req),
      [Op.or]: [{ id: Number.isNaN(Number(key)) ? -1 : Number(key) }, { code: String(key) }],
    },
  });
  if (!inv) { res.status(404).json({ error: 'Invoice not found.' }); return null; }
  return inv;
};

/** Recompute and persist the derived money for an invoice row. */
async function syncTotals(inv, patch = {}) {
  const merged = { ...inv.toJSON(), ...patch };
  const t = svc.computeTotals(merged);
  await inv.update({
    ...patch,
    lines: t.lines,
    subtotal: t.subtotal, discount: t.discount,
    transport: t.transport, govt_fees: t.govt_fees, other_charges: t.other_charges,
    vat_percent: t.vat_percent, vat_amount: t.vat_amount,
    advance_applied: t.advance_applied,
    amount: t.amount, outstanding: t.outstanding,
    status: svc.deriveStatus(merged, t),
  });
  return t;
}

/* ── reference ── */
exports.reference = asyncHandler(async (req, res) => {
  const scope = branchScope(req);
  const ServiceItem = require('../models/ServiceItem');
  const [catalogRows, amcs] = await Promise.all([
    ServiceItem.findAll({ where: { ...scope, vertical: catalogueVertical(req), is_active: true }, order: [['sort_order', 'ASC']], raw: true }).catch(() => []),
    M.WtAmcContract.findAll({ where: scope, attributes: ['code', 'client_name', 'package'], order: [['id', 'DESC']], limit: 50, raw: true }).catch(() => []),
  ]);
  res.json({
    next_code: await svc.nextInvoiceCode(resolveBranchId(req), undefined, resolveServiceLine(req)),
    statuses: svc.INVOICE_STATUSES,
    types: svc.INVOICE_TYPES,
    editable_statuses: svc.EDITABLE_STATUSES,
    /*
     * Payment methods live on the server so the reference an operator is asked
     * for matches the method: a bKash payment needs a TrxID, a cheque needs its
     * number, and a screen carrying its own list drifts from what the ledger and
     * the reconciliation expect.
     */
    payment_methods: ledger.PAYMENT_METHODS,
    catalog: catalogRows.map((i) => {
      let tags = i.tags; if (typeof tags === 'string') { try { tags = JSON.parse(tags); } catch { tags = {}; } }
      return { code: i.code, name: i.name, unit: i.unit, standard_price: num(i.base_price), group: (tags || {}).group || 'service' };
    }),
    amc_contracts: amcs,
  });
});

/**
 * Client lookup for the invoice dialog. Searches the water-tank client book by
 * name, email, mobile or client code — and ALSO by project code, because an
 * operator raising an invoice usually has the project reference to hand rather
 * than the client's details.
 */
exports.clientLookup = asyncHandler(async (req, res) => {
  const q = String(req.query.q || '').trim();
  if (q.length < 2) return res.json([]);
  const scope = scoped(req);
  const like = { [Op.like]: `%${q}%` };

  // A project reference resolves to whoever the project is for.
  const projects = await M.WtProject.findAll({
    where: { ...scope, [Op.or]: [{ code: like }, { name: like }] },
    attributes: ['code', 'name', 'client_name', 'client_code', 'site_address', 'contract_value'],
    limit: 8, raw: true,
  }).catch(() => []);

  const clients = await M.WtClient.findAll({
    where: {
      ...scope,
      [Op.or]: [
        { name: like }, { email: like }, { mobile: like }, { code: like }, { service_address: like },
        ...(projects.length ? [{ code: { [Op.in]: projects.map((p) => p.client_code).filter(Boolean) } }] : []),
      ],
    },
    limit: 10, order: [['id', 'DESC']], raw: true,
  });

  const byClient = projects.reduce((acc, p) => {
    if (!p.client_code) return acc;
    (acc[p.client_code] = acc[p.client_code] || []).push({ code: p.code, name: p.name, value: num(p.contract_value) });
    return acc;
  }, {});

  res.json(clients.map((c) => ({
    id: c.id, code: c.code, name: c.name, email: c.email, mobile: c.mobile,
    address: c.service_address, district: c.district, client_type: c.client_type,
    agreement_status: c.agreement_status, agreement_code: c.agreement_code,
    projects: byClient[c.code] || [],
    // why this row matched, so the operator can see the search worked
    matched_on: [
      c.name && c.name.toLowerCase().includes(q.toLowerCase()) && 'name',
      c.email && c.email.toLowerCase().includes(q.toLowerCase()) && 'email',
      c.mobile && c.mobile.includes(q) && 'mobile',
      c.code && c.code.toLowerCase().includes(q.toLowerCase()) && 'client code',
      (byClient[c.code] || []).length && 'project',
    ].filter(Boolean),
  })));
});

/* ── list + overview ── */
exports.list = asyncHandler(async (req, res) => {
  const scope = scoped(req);
  const { q, status, source, client } = req.query;
  const where = { ...scope };
  if (status) where.status = status;
  if (source) where.source_type = source;
  if (client) where.client_code = client;
  if (q && String(q).trim()) {
    const like = { [Op.like]: `%${String(q).trim()}%` };
    where[Op.or] = [{ code: like }, { client_name: like }, { agreement_code: like }, { amc_code: like }, { project_id: like }];
  }
  const rows = await M.WtInvoice.findAll({ where, order: [['id', 'DESC']], raw: true });
  res.json(rows.map((raw) => {
    const r = shape(raw);
    const t = svc.computeTotals(r);
    const dte = daysTo(r.due_date);
    return {
      ...r,
      amount: t.amount,
      // A draft is not money owed yet, and a void never was — so it carries no
      // "outstanding". `amount` still shows what the draft will bill when raised.
      outstanding: (eq(r.status, 'draft') || eq(r.status, 'void')) ? 0 : t.outstanding,
      line_count: t.lines.length,
      days_to_due: dte,
      overdue: !eq(r.status, 'draft') && !eq(r.status, 'void') && t.outstanding > 0 && dte != null && dte < 0,
      editable: svc.EDITABLE_STATUSES.some((s) => eq(s, r.status)),
    };
  }));
});

exports.overview = asyncHandler(async (req, res) => {
  const rows = await M.WtInvoice.findAll({ where: scoped(req), raw: true });
  const live = rows.filter((r) => !eq(r.status, 'void'));
  const totals = live.map((r) => svc.computeTotals(r));
  const drafts = live.filter((r) => eq(r.status, 'draft'));
  const overdue = live.filter((r, i) => !eq(r.status, 'draft') && totals[i].outstanding > 0
    && r.due_date && r.due_date < today());
  res.json({
    total: rows.length,
    drafts: drafts.length,
    sent: live.filter((r) => eq(r.status, 'sent') || eq(r.status, 'viewed')).length,
    paid: live.filter((r) => eq(r.status, 'paid')).length,
    overdue: overdue.length,
    invoiced: round2(totals.reduce((s, t) => s + t.amount, 0)),
    collected: round2(totals.reduce((s, t) => s + t.paid_amount + t.advance_applied, 0)),
    // Drafts are billed value, not receivables — they live in `draft_value`, not here.
    outstanding: round2(live.reduce((s, r, i) => s + (eq(r.status, 'draft') ? 0 : totals[i].outstanding), 0)),
    overdue_value: round2(overdue.reduce((s, r) => s + svc.computeTotals(r).outstanding, 0)),
    draft_value: round2(drafts.reduce((s, r) => s + svc.computeTotals(r).amount, 0)),
  });
});

/* ── create ── */
exports.create = asyncHandler(async (req, res) => {
  const branchId = resolveBranchId(req);
  // Stamp the active service line so a manually-raised invoice belongs to the
  // console it was created in (and gets that service line's INV/ACI- code).
  const inv = await svc.persistDraft({ ...(req.body || {}), service_line: resolveServiceLine(req) }, { branchId, actor: actorOf(req) });
  res.status(201).json(inv);
});

/** Raise the instalment schedule for an AMC as drafts. */
exports.createFromAmc = asyncHandler(async (req, res) => {
  const branchId = resolveBranchId(req);
  const amc = await M.WtAmcContract.findOne({
    where: { ...scoped(req), code: req.params.amcCode },
  });
  if (!amc) return res.status(404).json({ error: 'AMC contract not found.' });
  const created = await svc.createFromAmc(amc, {
    branchId, actor: actorOf(req), onlyFirst: req.body?.only_first === true,
  });
  if (!created.length) {
    return res.status(409).json({ error: 'This AMC already has invoices. Delete or void them first to re-raise the schedule.' });
  }
  res.status(201).json({ created: created.length, invoices: created });
});

/** Preview the AMC instalment schedule without persisting it. */
exports.previewAmc = asyncHandler(async (req, res) => {
  const amc = await M.WtAmcContract.findOne({ where: { ...scoped(req), code: req.params.amcCode } });
  if (!amc) return res.status(404).json({ error: 'AMC contract not found.' });
  res.json(svc.buildAmcSchedule(amc));
});

/* ── read ── */
exports.detail = asyncHandler(async (req, res) => {
  const inv = await loadInvoice(req, res); if (!inv) return;
  const row = shape(inv.toJSON());
  res.json({
    invoice: row,
    totals: svc.computeTotals(row),
    editable: svc.EDITABLE_STATUSES.some((s) => eq(s, row.status)),
    payments: row.payments,
  });
});

/* ── edit (drafts only) ── */
const EDITABLE_FIELDS = [
  'client_name', 'client_code', 'client_id',
  'bill_to_name', 'bill_to_address', 'bill_to_phone', 'bill_to_email', 'site_address',
  'inv_type', 'lines', 'discount', 'discount_note', 'transport', 'govt_fees',
  'other_charges', 'vat_percent', 'advance_applied', 'advance_note',
  'issue_date', 'due_date', 'payment_terms', 'notes', 'footer_note', 'reference',
  'project_id', 'agreement_code', 'amc_code', 'quotation_code', 'work_order_code',
  'currency', 'period_start', 'period_end',
];

exports.update = asyncHandler(async (req, res) => {
  const inv = await loadInvoice(req, res); if (!inv) return;
  if (!svc.EDITABLE_STATUSES.some((s) => eq(s, inv.status))) {
    return res.status(409).json({
      error: `This invoice is ${inv.status} and can no longer be edited. Void it and raise a replacement if the figures are wrong.`,
      status: inv.status,
    });
  }
  const patch = pick(req.body || {}, EDITABLE_FIELDS);
  const t = await syncTotals(inv, patch);
  res.json({ invoice: shape(inv.toJSON()), totals: t });
});

/* ── send: freeze the document and hand it to the client ── */
exports.send = asyncHandler(async (req, res) => {
  const inv = await loadInvoice(req, res); if (!inv) return;
  if (eq(inv.status, 'void')) return res.status(409).json({ error: 'This invoice is void.' });

  const row = inv.toJSON();
  const t = svc.computeTotals(row);
  const blocking = [];
  if (!t.lines.length) blocking.push('The invoice has no line items.');
  if (t.amount <= 0) blocking.push('The invoice total is zero.');
  const to = req.body?.email || row.bill_to_email;
  if (!to) blocking.push('No client email address to send to.');
  if (blocking.length) return res.status(400).json({ error: 'Cannot send this invoice.', blocking });

  // Freeze what the client receives. The snapshot is the record of what was sent,
  // even if the row is later voided and replaced.
  const branding = await getBranding().catch(() => ({}));
  await inv.update({
    status: 'Sent',
    sent_at: new Date(),
    sent_to: to,
    sent_by: actorOf(req),
    due_date: row.due_date || svc.addDays(today(), 7),
    issued_snapshot: { ...row, totals: t, branding_snapshot: { company_name: branding.company_name } },
  });

  /*
   * Actually email it.
   *
   * The comment that used to sit here said SMTP was not configured, so the
   * endpoint marked an invoice "Sent" while sending nothing and handed back a
   * PDF path instead. SMTP has in fact been configured throughout — the claim
   * was stale, and an invoice recorded as sent that nobody received is the
   * worst version of this to be wrong about.
   *
   * Best-effort: the invoice IS issued either way, and the response says plainly
   * whether the message went, so the operator knows to share the PDF by hand.
   */
  const notify = require('../services/wtNotify.service');
  const mail = await notify.onInvoiceIssued({ ...inv.toJSON(), bill_to_email: to });

  res.json({
    invoice: shape(inv.toJSON()),
    sent_to: to,
    email_sent: mail.sent,
    pdf_path: `/api/wt-invoices/${inv.code}/pdf`,
    message: mail.sent
      ? `Invoice emailed to ${to}.`
      : `Invoice issued, but the email did not send (${mail.reason}). Share the PDF instead.`,
  });
});

/* ── PDF ── */
exports.pdf = asyncHandler(async (req, res) => {
  const inv = await loadInvoice(req, res); if (!inv) return;
  const branding = await getBranding().catch(() => ({}));
  const buf = await pdfSvc.buildInvoicePdf(inv.toJSON(), branding);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="${inv.code}.pdf"`);
  res.send(buf);
});

/* ── payments ──
 *
 * Receipts are not written here. They go through wtLedger.service, which is the
 * single writer for Water Tank money: it locks the invoice row, posts an
 * append-only ledger entry under an idempotency key, and recomputes the cached
 * columns from the ledger. This endpoint's job is to translate HTTP to that call
 * and back — the validation and the arithmetic live in one place.
 */
exports.recordPayment = asyncHandler(async (req, res) => {
  const inv = await loadInvoice(req, res); if (!inv) return;
  try {
    const out = await ledger.recordClientReceipt({
      branch_id: inv.branch_id,
      service_line: inv.service_line,
      invoice_id: inv.id,
      amount: num(req.body?.amount),
      method: req.body?.method || null,
      reference: req.body?.reference || null,
      received_on: req.body?.received_on || today(),
      note: req.body?.note || null,
      // The client may send a key so a retry after a dropped response cannot
      // post twice; without one the service derives a stable key itself.
      idempotency_key: req.body?.idempotency_key || null,
      actor: actorOf(req),
      actor_id: req.user?.id || null,
    });
    await inv.reload();

    /*
     * A receipt the client can see without asking. Only on a NEW posting — a
     * replayed request must not send a second thank-you for the same money —
     * and only if the operator asked for one. Some payments are internal
     * adjustments the client should not be emailed about, and a checkbox that
     * quietly did nothing would be worse than not offering the choice.
     */
    let receiptMailed = false;
    if (!out.duplicate && req.body?.email_receipt !== false) {
      const notify = require('../services/wtNotify.service');
      const m = await notify.onPaymentReceived(inv.toJSON(), out.event.amount);
      receiptMailed = m.sent;
    }

    res.json({
      invoice: shape(inv.toJSON()),
      totals: out.standing.totals,
      event: out.event,
      receipt_emailed: receiptMailed,
      // Told plainly, so the UI never reports a second payment that did not happen.
      duplicate: out.duplicate,
      message: out.duplicate
        ? 'This payment was already recorded — nothing was posted twice.'
        : 'Payment recorded.',
    });
  } catch (e) {
    if (e instanceof ledger.LedgerError) return res.status(e.status).json({ error: e.message, ...(e.outstanding != null ? { outstanding: e.outstanding } : {}) });
    throw e;
  }
});

/**
 * POST /:code/payments/:eventId/reverse — undo a receipt.
 *
 * A wrongly-entered payment is corrected by a compensating entry, never by
 * deleting the original: the client's statement has to show what happened, and
 * "it was entered and then reversed on this date for this reason" is what
 * happened.
 */
exports.reversePayment = asyncHandler(async (req, res) => {
  const inv = await loadInvoice(req, res); if (!inv) return;
  try {
    const out = await ledger.reverse({
      branch_id: inv.branch_id,
      service_line: inv.service_line,
      event_id: Number(req.params.eventId),
      reason: req.body?.reason,
      actor: actorOf(req),
      actor_id: req.user?.id || null,
    });
    await inv.reload();
    res.json({ invoice: shape(inv.toJSON()), totals: out.standing?.totals, event: out.event, message: 'Payment reversed.' });
  } catch (e) {
    if (e instanceof ledger.LedgerError) return res.status(e.status).json({ error: e.message });
    throw e;
  }
});

/** GET /:code/payments — the ledger rows behind this invoice. */
exports.paymentHistory = asyncHandler(async (req, res) => {
  const inv = await loadInvoice(req, res); if (!inv) return;
  const rows = await ledger.historyOf({ branch_id: inv.branch_id, subject_type: 'invoice', subject_id: inv.id });
  res.json({ rows, received: await ledger.balanceOf({ branch_id: inv.branch_id, subject_type: 'invoice', subject_id: inv.id }) });
});

/* ────────────────────────────────────────────────────────────────────────────
 * Collections: what a client owes, one lump sum, and money given back
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * GET /collections?q= — clients with money outstanding, newest debt first.
 *
 * Built for the question an operator actually asks at the counter: "someone is
 * paying — what do they owe?" Searching invoice by invoice cannot answer that,
 * because a client with four unpaid invoices appears four times and their total
 * debt appears nowhere.
 */
exports.collections = asyncHandler(async (req, res) => {
  const scope = scoped(req);
  const q = String(req.query.q || '').trim().toLowerCase();

  const invoices = await M.WtInvoice.findAll({
    where: { ...scope, status: { [Op.notIn]: ['Draft', 'Void', 'Cancelled'] } },
    order: [['due_date', 'ASC'], ['id', 'ASC']], raw: true,
  }).catch(() => []);

  const byClient = new Map();
  for (const inv of invoices) {
    const outstanding = round2(num(inv.outstanding));
    if (outstanding <= 0.009) continue;
    // Group on the client CODE where there is one; a name is not an identity,
    // and two clients called "Hasan Villa" must not share a balance.
    const key = inv.client_code || `name:${inv.client_name || 'Unknown'}`;
    if (!byClient.has(key)) {
      byClient.set(key, {
        key,
        client_code: inv.client_code || null,
        client_name: inv.client_name || 'Unknown',
        outstanding: 0,
        invoice_count: 0,
        oldest_due: inv.due_date || null,
        overdue_count: 0,
        invoices: [],
      });
    }
    const c = byClient.get(key);
    const overdue = inv.due_date ? daysTo(inv.due_date) < 0 : false;
    c.outstanding = round2(c.outstanding + outstanding);
    c.invoice_count += 1;
    if (overdue) c.overdue_count += 1;
    c.invoices.push({
      id: inv.id,
      code: inv.code,
      inv_type: inv.inv_type,
      project_id: inv.project_id,
      amount: round2(num(inv.amount)),
      paid: round2(num(inv.paid_amount)),
      outstanding,
      due_date: inv.due_date,
      days_overdue: overdue ? Math.abs(daysTo(inv.due_date)) : 0,
      status: inv.status,
    });
  }

  let list = [...byClient.values()];
  if (q) list = list.filter((c) => `${c.client_name} ${c.client_code || ''}`.toLowerCase().includes(q));
  // Most owed first: that is the order the money matters in.
  list.sort((a, b) => b.outstanding - a.outstanding);
  res.json(list.slice(0, 60));
});

/**
 * POST /payments/bulk — one payment, several invoices.
 *
 * The whole allocation posts in ONE transaction. A lump sum that half-applies is
 * worse than one that fails outright: the operator sees a success for part of it,
 * the client's balance is wrong, and nothing records what was meant to happen.
 */
exports.bulkPayment = asyncHandler(async (req, res) => {
  const branchId = resolveBranchId(req);
  const body = req.body || {};
  const allocations = Array.isArray(body.allocations) ? body.allocations : [];

  try {
    const out = await ledger.recordBatchClientReceipt({
      branch_id: branchId,
      service_line: resolveServiceLine(req),
      allocations: allocations.map((a) => ({ invoice_id: Number(a.invoice_id), amount: num(a.amount) })),
      total: body.total != null ? num(body.total) : null,
      method: body.method || null,
      reference: body.reference || null,
      received_on: body.received_on || today(),
      note: body.note || null,
      idempotency_key: body.idempotency_key || null,
      actor: actorOf(req),
      actor_id: req.user?.id || null,
    });

    /*
     * One email for the batch, not one per invoice. A client who made a single
     * payment should not receive four receipts for it.
     */
    let receiptMailed = false;
    const fresh = out.applied.filter((a) => !a.duplicate);
    if (fresh.length && body.email_receipt !== false) {
      const first = await M.WtInvoice.findOne({ where: { branch_id: branchId, id: allocations[0]?.invoice_id } });
      if (first) {
        const notify = require('../services/wtNotify.service');
        const m = await notify.onPaymentReceived(first.toJSON(), out.total).catch(() => ({ sent: false }));
        receiptMailed = m.sent;
      }
    }

    res.json({
      ...out,
      receipt_emailed: receiptMailed,
      message: fresh.length
        ? `${bdtish(out.total)} applied across ${out.applied.length} invoice${out.applied.length === 1 ? '' : 's'}.`
        : 'This payment was already recorded — nothing was posted twice.',
    });
  } catch (e) {
    if (e instanceof ledger.LedgerError) return res.status(e.status).json({ error: e.message });
    throw e;
  }
});

/**
 * POST /:code/refunds — give money back.
 *
 * Kept apart from the reversal endpoint on purpose. Reversing says the entry was
 * wrong; refunding says the money arrived and we returned it. They read
 * differently on a client statement and reconcile differently against the bank,
 * so offering one control for both would guarantee the wrong one gets used.
 */
exports.refund = asyncHandler(async (req, res) => {
  const inv = await loadInvoice(req, res); if (!inv) return;
  try {
    const out = await ledger.recordClientRefund({
      branch_id: inv.branch_id,
      service_line: inv.service_line,
      invoice_id: inv.id,
      amount: num(req.body?.amount),
      reason: req.body?.reason,
      method: req.body?.method || null,
      reference: req.body?.reference || null,
      refunded_on: req.body?.refunded_on || today(),
      note: req.body?.note || null,
      idempotency_key: req.body?.idempotency_key || null,
      actor: actorOf(req),
      actor_id: req.user?.id || null,
    });
    await inv.reload();

    await M.WtCommLog.create({
      branch_id: inv.branch_id, client_name: inv.client_name,
      channel: 'note', direction: 'internal',
      summary: `Refund of ${bdtish(Math.abs(num(out.event.amount)))} on ${inv.code} — ${req.body?.reason}`,
      ref_type: 'invoices', ref_code: inv.code, logged_at: new Date(),
    }).catch(() => {});

    res.json({
      invoice: shape(inv.toJSON()),
      totals: out.standing.totals,
      event: out.event,
      refundable: out.refundable,
      duplicate: out.duplicate,
      message: out.duplicate
        ? 'This refund was already recorded — nothing was posted twice.'
        : `Refund of ${bdtish(Math.abs(num(out.event.amount)))} recorded. ${inv.code} now shows ${bdtish(inv.outstanding)} outstanding.`,
    });
  } catch (e) {
    if (e instanceof ledger.LedgerError) {
      return res.status(e.status).json({ error: e.message, ...(e.refundable != null ? { refundable: e.refundable } : {}) });
    }
    throw e;
  }
});

/* ── void ── */
/**
 * Void an invoice.
 *
 * This used to void unconditionally and set outstanding to 0 — including on an
 * invoice the client had already paid, which silently erased the receivable
 * while the receipts stayed in the ledger. The books stopped balancing and
 * nothing said so. The state machine now refuses it and names the correct route:
 * reverse the receipt first, so the correction is on the record.
 */
exports.void = asyncHandler(async (req, res) => {
  const inv = await loadInvoice(req, res); if (!inv) return;
  const received = await ledger.balanceOf({ branch_id: inv.branch_id, subject_type: 'invoice', subject_id: inv.id });
  try {
    const step = sm.assertAction('invoice', 'void', inv.toJSON(), { received });
    await inv.update({
      status: 'Void', voided_at: new Date(),
      void_reason: req.body?.reason || null, outstanding: 0,
    });
    res.json({ ...shape(inv.toJSON()), warnings: step.warnings });
  } catch (e) {
    if (e instanceof sm.TransitionError) return res.status(e.status).json({ error: e.message, blockers: e.blockers });
    throw e;
  }
});

exports.remove = asyncHandler(async (req, res) => {
  const inv = await loadInvoice(req, res); if (!inv) return;
  // Only a draft may be deleted outright; an issued invoice is voided so the
  // numbering stays continuous and auditable.
  try {
    sm.assertAction('invoice', 'remove', inv.toJSON(), {});
  } catch (e) {
    if (e instanceof sm.TransitionError) return res.status(e.status).json({ error: e.message, blockers: e.blockers });
    throw e;
  }
  await inv.destroy();
  res.json({ ok: true });
});

/**
 * GET /:code/actions — what may happen to this invoice next, and why not.
 *
 * The UI asks this rather than reimplementing the rules, so a button is never
 * offered for something the API will refuse, and a refusal always comes with the
 * reason rather than a dead control.
 */
exports.actions = asyncHandler(async (req, res) => {
  const inv = await loadInvoice(req, res); if (!inv) return;
  const received = await ledger.balanceOf({ branch_id: inv.branch_id, subject_type: 'invoice', subject_id: inv.id });
  const ctx = { received };
  const row = inv.toJSON();
  res.json({
    state: sm.stateOf('invoice', row),
    states: sm.MACHINES.invoice.states,
    actions: sm.availableActions('invoice', row, ctx),
    next: sm.nextRecommended('invoice', row, ctx),
  });
});
