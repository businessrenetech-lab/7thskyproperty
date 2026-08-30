/**
 * wtInvoice.service.js — Water Tank invoicing.
 *
 * The rule the whole module follows: an invoice must reconcile with the contract
 * that was signed. The client agreed to Schedule C; the invoice they receive has
 * to show those same lines at those same prices, less the advance they already
 * paid. So invoices are BUILT FROM the signed agreement's terms rather than
 * retyped, and every total is derived from the lines on each read.
 *
 * Two shapes of invoice:
 *
 *   PROJECT / ONE-OFF  (from a signed Customer Service Agreement)
 *     The agreement carries a payment schedule — typically an advance on
 *     acceptance and a balance on completion. Each stage becomes its own invoice.
 *     The advance invoice is raised immediately on signature; the balance
 *     invoice is raised but held as a draft until the work completes, so the
 *     operator is never chasing money for work not yet done.
 *
 *   AMC  (from a contract)
 *     An AMC bills on a cycle — Clause 9 allows monthly, quarterly, half-yearly
 *     or annually. The contract value is split across the instalments that fall
 *     inside the term, each with the period it covers. Any advance is credited
 *     against the FIRST instalment only, never spread, so the client sees it
 *     discharged where they paid it.
 *
 * Nothing is auto-SENT. A signed contract produces a DRAFT the operator reviews,
 * edits and then sends — invoices are the one thing you cannot un-send.
 */
const { Op } = require('sequelize');
const M = require('../models/waterTankOps');
const amcSvc = require('./wtAmc.service');

const num = (v) => Number(v || 0);
const round2 = (v) => Math.round(num(v) * 100) / 100;
const today = () => new Date().toISOString().slice(0, 10);
const eq = (a, b) => String(a || '').trim().toLowerCase() === String(b || '').trim().toLowerCase();
const asArray = (v) => {
  if (Array.isArray(v)) return v;
  if (typeof v === 'string') { try { const p = JSON.parse(v); return Array.isArray(p) ? p : []; } catch { return []; } }
  return [];
};
const asObject = (v) => {
  if (v && typeof v === 'object' && !Array.isArray(v)) return v;
  if (typeof v === 'string') { try { const p = JSON.parse(v); return p && typeof p === 'object' ? p : {}; } catch { return {}; } }
  return {};
};
const addDays = (d, n) => new Date(new Date(`${d}T00:00:00Z`).getTime() + n * 864e5).toISOString().slice(0, 10);

const INVOICE_STATUSES = ['Draft', 'Sent', 'Viewed', 'Part Paid', 'Paid', 'Overdue', 'Void'];
const INVOICE_TYPES = ['Advance', 'Progress', 'Final', 'AMC Instalment', 'Additional Work', 'Emergency Call-out'];
/* Only a draft may be edited; once a client has the document it is frozen. */
const EDITABLE_STATUSES = ['Draft'];

/* ────────────────────────────────────────────────────────────────────────────
 * Totals — derived from the lines, every time
 * ──────────────────────────────────────────────────────────────────────────── */
// A line's unit price. The invoice model stores it as `unit_price`, but a line
// coming from a quotation, work order or the intake wizard carries it as
// `price` / `agreed_price` — so normalise, and a hand-built line can never total
// zero just because the field was named differently.
const unitPriceOf = (l) => {
  for (const k of ['unit_price', 'price', 'agreed_price', 'rate', 'amount']) {
    if (l[k] != null && l[k] !== '') return num(l[k]);
  }
  return 0;
};
const lineTotal = (l) => round2(unitPriceOf(l) * (num(l.qty) || 1));

function computeTotals(input = {}) {
  // Persist the resolved unit_price so the stored line is self-consistent.
  const lines = asArray(input.lines).map((l) => ({ ...l, unit_price: unitPriceOf(l), line_total: lineTotal(l) }));
  const subtotal = round2(lines.reduce((s, l) => s + l.line_total, 0));

  const discount = Math.max(0, num(input.discount));
  const transport = num(input.transport);
  const govt = num(input.govt_fees);
  const other = num(input.other_charges);

  const net = Math.max(0, round2(subtotal + transport + govt + other - discount));
  const vatPct = num(input.vat_percent);
  const vat = round2((net * vatPct) / 100);
  const total = round2(net + vat);

  // The advance is a CREDIT against this invoice, never more than the invoice.
  const advanceApplied = Math.max(0, Math.min(num(input.advance_applied), total));
  const paid = Math.max(0, num(input.paid_amount));
  const outstanding = round2(Math.max(0, total - advanceApplied - paid));

  return {
    lines,
    subtotal,
    discount: round2(discount),
    transport: round2(transport),
    govt_fees: round2(govt),
    other_charges: round2(other),
    net,
    vat_percent: vatPct,
    vat_amount: vat,
    amount: total,
    advance_applied: round2(advanceApplied),
    paid_amount: round2(paid),
    outstanding,
    fully_settled: outstanding <= 0.009,
  };
}

/** Roll the status forward from the money, without ever un-voiding an invoice. */
function deriveStatus(inv, totals) {
  if (eq(inv.status, 'void')) return 'Void';
  if (totals.fully_settled && (totals.paid_amount > 0 || totals.advance_applied > 0)) return 'Paid';
  if (totals.paid_amount > 0) return 'Part Paid';
  if (eq(inv.status, 'draft')) return 'Draft';
  if (inv.due_date && inv.due_date < today() && totals.outstanding > 0) return 'Overdue';
  return inv.status || 'Sent';
}

/* ────────────────────────────────────────────────────────────────────────────
 * Codes
 * ──────────────────────────────────────────────────────────────────────────── */
async function nextInvoiceCode(branchId, transaction, serviceLine = 'water_tank') {
  const { codePrefix } = require('../config/serviceLines');
  const prefix = codePrefix(serviceLine, 'invoice');
  const start = serviceLine === 'water_tank' ? 482 : 1; // WT register already starts at INV-0482
  const rows = await M.WtInvoice.findAll({
    where: { branch_id: branchId }, attributes: ['code'], raw: true, transaction,
  });
  let max = start - 1;
  const re = new RegExp('^' + prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
  rows.forEach((r) => {
    const n = parseInt(String(r.code || '').replace(re, ''), 10);
    if (!Number.isNaN(n) && n > max) max = n;
  });
  return `${prefix}${String(max + 1).padStart(4, '0')}`;
}

/* ────────────────────────────────────────────────────────────────────────────
 * From a signed Customer Service Agreement
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * Turn the agreement's own terms into invoice drafts.
 *
 * `terms` is what buildAgreement() stored on the envelope: agreed_lines,
 * pricing_summary and payment_schedule. Using them rather than re-pricing is the
 * point — the client signed those figures, so the invoice cannot drift from them.
 */
function buildFromAgreement(envelope, terms, ctx = {}) {
  const t = asObject(terms);
  const summary = asObject(t.pricing_summary);
  const schedule = asArray(t.payment_schedule);
  const agreed = asArray(t.agreed_lines);
  const b = asObject(t.schedule_b);

  const lines = agreed.map((l) => ({
    code: l.code,
    name: l.name,
    description: null,
    qty: num(l.qty) || 1,
    unit: l.unit || null,
    unit_price: num(l.agreed_price),
    line_total: round2(num(l.agreed_price) * (num(l.qty) || 1)),
    group: l.group || 'service',
  }));

  const advance = num(summary.advance_amount);
  const contractTotal = num(summary.total_contract_value);
  const issue = ctx.issueDate || today();

  /*
   * One invoice per payment stage. The first stage is the advance, so it is
   * raised due immediately; later stages are drafted with a due date but held
   * for the operator, because billing for work not yet done is a good way to
   * lose a client.
   */
  const stages = schedule.length ? schedule : [{ stage: 'Full payment', amount: contractTotal, due: 'On invoice' }];

  return stages.map((s, i) => {
    const isFirst = i === 0;
    const stageAmount = num(s.amount);
    // Each stage bills its share of the contract; the lines are shown in full so
    // the client can see what they are paying towards, with the stage share as
    // the charge.
    const proportional = contractTotal > 0 ? stageAmount / contractTotal : 0;

    return {
      inv_type: isFirst && advance > 0 ? 'Advance' : (i === stages.length - 1 ? 'Final' : 'Progress'),
      stage_label: s.stage,
      issue_date: issue,
      due_date: isFirst ? issue : null,
      /*
       * A single-stage contract bills its lines as they stand. A staged one
       * bills a SHARE of the whole: every component — the lines, the discount,
       * transport and government fees — is scaled by the same proportion, and
       * the VAT rate is unchanged. Scaling the lines alone would silently drop
       * the discount and the VAT, so the stages would sum to the gross subtotal
       * instead of the price the client actually signed for.
       */
      lines: stages.length === 1 ? lines : lines.map((l) => ({
        ...l,
        qty: l.qty,
        unit_price: round2(l.unit_price * proportional),
        line_total: round2(l.line_total * proportional),
        description: `${s.stage} — ${Math.round(proportional * 100)}% of the agreed price`,
      })),
      discount: round2(num(summary.discount) * (stages.length === 1 ? 1 : proportional)),
      transport: round2(num(summary.transport) * (stages.length === 1 ? 1 : proportional)),
      govt_fees: round2(num(summary.govt_fees) * (stages.length === 1 ? 1 : proportional)),
      vat_percent: num(summary.vat_percent),
      // The advance is not "applied" to the advance invoice — the advance invoice
      // IS the request for it. It is credited against the following stage.
      advance_applied: 0,
      advance_note: isFirst && advance > 0
        ? 'This invoice is the advance payable on acceptance of the agreement.'
        : (advance > 0 ? `Advance of ${advance.toLocaleString('en-BD')} already invoiced separately.` : null),
      payment_terms: s.due || null,
      source_type: 'Agreement',
      agreement_code: envelope?.envelope_code || null,
      agreement_envelope_id: envelope?.id || null,
      client_name: t.client_name || ctx.clientName || null,
      site_address: b.property_address || null,
      project_id: t.project_code || b.project_no || null,
      quotation_code: b.quotation_no || null,
      work_order_code: b.work_order_no || null,
      notes: `Raised automatically from signed agreement ${envelope?.envelope_code || ''}.`.trim(),
      status: 'Draft',
      // Only the first stage is ready to go out; the rest wait for their trigger.
      hold: !isFirst,
    };
  });
}

/* ────────────────────────────────────────────────────────────────────────────
 * From an AMC contract
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * Split an AMC's contract value across the instalments that fall inside its term.
 *
 * Rounding: dividing a total by N almost never divides evenly, so every
 * instalment takes the rounded share and the LAST one absorbs the remainder.
 * The schedule therefore always sums to exactly the contract value — a client
 * must never be billed a total that differs from what they signed.
 */
function buildAmcSchedule(amc, ctx = {}) {
  const a = asObject(amc.toJSON ? amc.toJSON() : amc);
  const billing = amcSvc.computeBilling({ ...a, visits_planned: a.visits_planned });
  const total = billing.contract_value;
  const count = Math.max(1, billing.instalments);

  const freq = amcSvc.PAYMENT_FREQUENCIES.find((f) => eq(f.key, billing.payment_frequency))
    || amcSvc.PAYMENT_FREQUENCIES[3];
  const monthsPerInstalment = Math.max(1, Math.round(12 / freq.per_year));

  const perInstalment = round2(total / count);
  const advance = num(a.advance_amount);
  const visitTypes = asArray(a.visit_types);
  const visitsPerInstalment = count ? Math.round(num(a.visits_planned) / count) : 0;

  const out = [];
  for (let i = 0; i < count; i++) {
    const periodStart = amcSvc.addMonths(a.start_date || today(), monthsPerInstalment * i);
    const periodEnd = addDays(amcSvc.addMonths(periodStart, monthsPerInstalment), -1);
    const isLast = i === count - 1;
    // last instalment absorbs the rounding remainder
    const amount = isLast ? round2(total - perInstalment * (count - 1)) : perInstalment;

    out.push({
      inv_type: 'AMC Instalment',
      instalment_no: i + 1,
      instalment_of: count,
      period_start: periodStart,
      period_end: periodEnd,
      issue_date: periodStart,
      due_date: addDays(periodStart, 7),
      lines: [{
        code: a.package_tier || 'AMC',
        name: `${a.package || 'Annual Maintenance Contract'} — instalment ${i + 1} of ${count}`,
        description: [
          `Period ${periodStart} to ${periodEnd}`,
          visitsPerInstalment ? `${visitsPerInstalment} scheduled visit(s)` : null,
          visitTypes.length
            ? visitTypes.filter((v) => num(v.per_year) > 0).map((v) => `${v.per_year}× ${v.key}/yr`).join(', ')
            : null,
        ].filter(Boolean).join(' · '),
        qty: 1, unit: 'instalment',
        unit_price: amount, line_total: amount, group: 'service',
      }],
      // VAT is already inside the contract value; re-applying it would double-charge.
      vat_percent: 0,
      discount: 0,
      // The advance discharges against the first instalment only, where it was paid.
      advance_applied: i === 0 ? Math.min(advance, amount) : 0,
      advance_note: i === 0 && advance > 0
        ? `Advance of ${advance.toLocaleString('en-BD')} received on signing, credited here.`
        : null,
      payment_terms: `${billing.payment_frequency} instalment — due within 7 days of issue`,
      source_type: 'AMC',
      amc_code: a.code,
      agreement_code: a.agreement_code || null,
      client_name: a.client_name,
      client_code: a.client_code, client_id: a.client_id,
      bill_to_email: a.email, bill_to_phone: a.phone,
      site_address: a.site_address,
      notes: `AMC ${a.code} — ${a.package || 'contract'} covering ${periodStart} to ${periodEnd}.`,
      status: 'Draft',
      hold: i > 0, // only the first instalment is due now
    });
  }
  return { schedule: out, billing, total_check: round2(out.reduce((s, x) => s + num(x.lines[0].unit_price), 0)) };
}

/* ────────────────────────────────────────────────────────────────────────────
 * Persist
 * ──────────────────────────────────────────────────────────────────────────── */

/** Create one invoice row from a draft spec produced by either builder. */
async function persistDraft(spec, { branchId, actor }, transaction) {
  const totals = computeTotals(spec);
  const code = await nextInvoiceCode(branchId, transaction, spec.service_line || 'water_tank');
  return M.WtInvoice.create({
    branch_id: branchId,
    service_line: spec.service_line || 'water_tank',
    code,
    client_name: spec.client_name || 'Client',
    client_code: spec.client_code || null,
    client_id: spec.client_id || null,
    bill_to_name: spec.bill_to_name || spec.client_name || null,
    bill_to_address: spec.bill_to_address || spec.site_address || null,
    bill_to_phone: spec.bill_to_phone || null,
    bill_to_email: spec.bill_to_email || null,
    site_address: spec.site_address || null,
    project_id: spec.project_id || null,
    inv_type: spec.inv_type || 'Final',
    lines: totals.lines,
    subtotal: totals.subtotal,
    discount: totals.discount, discount_note: spec.discount_note || null,
    transport: totals.transport, govt_fees: totals.govt_fees,
    other_charges: totals.other_charges,
    vat_percent: totals.vat_percent, vat_amount: totals.vat_amount,
    advance_applied: totals.advance_applied, advance_note: spec.advance_note || null,
    amount: totals.amount,
    paid_amount: 0,
    outstanding: totals.outstanding,
    issue_date: spec.issue_date || today(),
    due_date: spec.due_date || null,
    status: 'Draft',
    source_type: spec.source_type || 'Manual',
    agreement_code: spec.agreement_code || null,
    agreement_envelope_id: spec.agreement_envelope_id || null,
    amc_code: spec.amc_code || null,
    quotation_code: spec.quotation_code || null,
    work_order_code: spec.work_order_code || null,
    instalment_no: spec.instalment_no || null,
    instalment_of: spec.instalment_of || null,
    period_start: spec.period_start || null,
    period_end: spec.period_end || null,
    payment_terms: spec.payment_terms || null,
    notes: spec.notes || null,
    prepared_by: actor || null,
  }, { transaction });
}

/**
 * Called from the envelope-completion hook when a Customer Service Agreement is
 * fully signed. Raises the agreement's payment stages as DRAFT invoices.
 * Idempotent: an agreement that already has invoices is left alone.
 */
async function createFromSignedAgreement(envelope, { transaction } = {}) {
  if (!envelope) return [];
  const existing = await M.WtInvoice.count({
    where: { branch_id: envelope.branch_id, agreement_envelope_id: envelope.id },
    transaction,
  });
  if (existing) return [];

  const terms = asObject(envelope.terms);
  const specs = buildFromAgreement(envelope, terms, {});
  if (!specs.length) return [];

  // The invoice belongs to the same service line as the agreement it bills.
  const { serviceLineForRelatedType } = require('../config/serviceLines');
  const sl = serviceLineForRelatedType(envelope.related_type) || 'water_tank';

  const out = [];
  for (const spec of specs) {
    // Later stages are drafted too — the operator needs to see the whole billing
    // plan — but they carry no due date until their trigger fires.
    out.push(await persistDraft({ ...spec, service_line: sl }, { branchId: envelope.branch_id, actor: 'System (agreement signed)' }, transaction));
  }
  return out;
}

/** Raise the AMC's instalment invoices as drafts. Idempotent per contract. */
async function createFromAmc(amc, { branchId, actor, transaction, onlyFirst = false } = {}) {
  const existing = await M.WtInvoice.count({
    where: { branch_id: branchId, amc_code: amc.code }, transaction,
  });
  if (existing) return [];

  const { schedule } = buildAmcSchedule(amc);
  const specs = onlyFirst ? schedule.slice(0, 1) : schedule;
  const sl = amc.service_line || 'water_tank';
  const out = [];
  for (const spec of specs) {
    out.push(await persistDraft({ ...spec, service_line: sl }, { branchId, actor }, transaction));
  }
  return out;
}

module.exports = {
  INVOICE_STATUSES, INVOICE_TYPES, EDITABLE_STATUSES,
  computeTotals, deriveStatus, lineTotal, nextInvoiceCode,
  buildFromAgreement, buildAmcSchedule,
  persistDraft, createFromSignedAgreement, createFromAmc,
  num, round2, today, eq, asArray, asObject, addDays,
};
