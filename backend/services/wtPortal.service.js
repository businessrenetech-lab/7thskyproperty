/**
 * wtPortal.service.js — what external parties may see and do.
 *
 * Providers and clients have had no way to do their own steps. A provider
 * accepts a job by telephoning the office, who click Accept on their behalf; a
 * client asks for their invoice and someone emails a PDF. Both are staff
 * impersonating someone else, and for anything meant to be the other party's
 * decision it is not really their decision at all.
 *
 * The whole of this file is written around one rule: THE PORTAL RETURNS A
 * WHITELIST, NEVER A RECORD. Every other API in this module hands back rows and
 * lets the caller pick; that is fine behind an admin session and dangerous here,
 * because these payloads leave the building. Two leaks in particular would be
 * expensive and are structurally prevented rather than remembered:
 *
 *   A CLIENT must never see `provider_fee` or `ss_fee`. Those are on the work
 *   order beside everything the client legitimately sees, and returning the row
 *   would hand them Seventh Sky's margin on their own job.
 *
 *   A PROVIDER must never see what the client was charged. They see their own
 *   agreed fee and what has been paid against it, nothing else.
 *
 * So each shape below lists fields explicitly. Adding a column to a model can
 * therefore never widen a portal payload by accident — the new field simply does
 * not appear until someone decides it should.
 */
const crypto = require('crypto');
const { Op } = require('sequelize');
const sequelize = require('../config/db.config');
const M = require('../models/waterTankOps');

const num = (v) => Number(v || 0);
const round2 = (v) => Math.round((num(v) + Number.EPSILON) * 100) / 100;
const today = () => new Date().toISOString().slice(0, 10);
const lower = (v) => String(v || '').trim().toLowerCase();
const asArray = (v) => {
  if (Array.isArray(v)) return v;
  if (typeof v === 'string') { try { const p = JSON.parse(v); return Array.isArray(p) ? p : []; } catch { return []; } }
  return [];
};

const hash = (token) => crypto.createHash('sha256').update(String(token || '')).digest('hex');

class PortalError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

const PARTY = {
  provider: { model: () => M.WtProvider, label: 'provider' },
  client: { model: () => M.WtClient, label: 'client' },
};

/* ────────────────────────────────────────────────────────────────────────────
 * Tokens
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * Issue a portal link.
 *
 * The token is returned exactly once, here, and only its SHA-256 is stored — so
 * a database dump yields no working links and the column can be compared but
 * never reversed. Re-issuing replaces the hash, which invalidates the old link:
 * that is the intended way to cut off access when a contact leaves.
 */
async function issueToken({ party_type, party_id, branch_id, days = 180 }) {
  const spec = PARTY[party_type];
  if (!spec) throw new PortalError(400, 'Unknown party type.');
  const row = await spec.model().findOne({ where: { id: party_id, branch_id } });
  if (!row) throw new PortalError(404, `That ${spec.label} was not found.`);

  const token = crypto.randomBytes(32).toString('hex');
  const expires = new Date(Date.now() + Math.max(1, num(days)) * 864e5);
  await row.update({
    portal_token_hash: hash(token),
    portal_token_expires_at: expires,
    portal_revoked_at: null,
  });
  return { token, expires_at: expires, party: { id: row.id, code: row.code } };
}

async function revokeToken({ party_type, party_id, branch_id }) {
  const spec = PARTY[party_type];
  if (!spec) throw new PortalError(400, 'Unknown party type.');
  const row = await spec.model().findOne({ where: { id: party_id, branch_id } });
  if (!row) throw new PortalError(404, `That ${spec.label} was not found.`);
  // The hash is cleared as well as stamped: a revoked link must not merely be
  // flagged, it must stop matching anything.
  await row.update({ portal_token_hash: null, portal_revoked_at: new Date() });
  return { ok: true };
}

/**
 * Resolve a token to its party.
 *
 * Deliberately returns the same message for "no such token" and "wrong kind of
 * token" — distinguishing them tells someone probing links which guesses were
 * closer.
 */
async function resolve(token, expectedType) {
  if (!token || String(token).length < 32) throw new PortalError(404, 'This link is not valid.');
  const h = hash(token);

  const types = expectedType ? [expectedType] : Object.keys(PARTY);
  for (const type of types) {
    const row = await PARTY[type].model().findOne({ where: { portal_token_hash: h } });
    if (!row) continue;
    if (row.portal_revoked_at) throw new PortalError(410, 'This link has been withdrawn. Please ask Seventh Sky for a new one.');
    if (row.portal_token_expires_at && new Date(row.portal_token_expires_at) < new Date()) {
      throw new PortalError(410, 'This link has expired. Please ask Seventh Sky for a new one.');
    }
    return { party_type: type, row };
  }
  throw new PortalError(404, 'This link is not valid.');
}

/** Record what an external party did. Best-effort: never block the action. */
async function logEvent(spec) {
  await sequelize.query(
    `INSERT INTO wt_portal_events
       (branch_id, party_type, party_id, party_code, action, subject_type, subject_code, detail, ip, user_agent, created_at)
     VALUES (:branch_id,:party_type,:party_id,:party_code,:action,:subject_type,:subject_code,:detail,:ip,:ua,:at)`,
    {
      replacements: {
        branch_id: spec.branch_id || 1,
        party_type: spec.party_type,
        party_id: spec.party_id,
        party_code: spec.party_code || null,
        action: spec.action,
        subject_type: spec.subject_type || null,
        subject_code: spec.subject_code || null,
        detail: spec.detail || null,
        ip: (spec.ip || '').slice(0, 60) || null,
        ua: (spec.user_agent || '').slice(0, 255) || null,
        at: new Date(),
      },
    },
  ).catch(() => {});
}

/* ────────────────────────────────────────────────────────────────────────────
 * Provider portal
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * A work order as the PROVIDER may see it.
 *
 * `provider_fee` and what has been paid against it are theirs and are included.
 * Nothing about what the client was charged appears — no invoice figures, no
 * ss_fee, no margin.
 */
const providerWorkOrder = (w, paid = 0) => ({
  code: w.code,
  status: w.status,
  client_name: w.client_name,
  site_address: w.site_address,
  category: w.category,
  scope: w.scope,
  target_date: w.target_date,
  scheduled_date: w.scheduled_date,
  accepted_at: w.accepted_at,
  started_at: w.started_at,
  completed_at: w.completed_at,
  verified_at: w.verified_at,
  completion_notes: w.completion_notes,
  reports_submitted: !!w.reports_submitted,
  photos_collected: !!w.photos_collected,
  lines: asArray(w.lines).map((l) => ({ code: l.code, name: l.name, qty: l.qty, unit: l.unit })),
  // their money, and only theirs
  fee: round2(w.provider_fee),
  paid: round2(paid),
  outstanding: round2(num(w.provider_fee) - num(paid)),
  payout_status: w.payout_status,
  payout_date: w.payout_date,
  // the signing link is minted on demand, never stored in a list payload
  needs_signature: !!(w.wo_envelope_id && !w.wo_signed_at),
  signed_at: w.wo_signed_at,
});

async function providerDossier(provider) {
  const scope = { branch_id: provider.branch_id };
  const [workOrders, payouts] = await Promise.all([
    M.WtWorkOrder.findAll({
      where: {
        ...scope,
        [Op.or]: [{ provider_id: provider.id }, { provider_name: provider.business_name }],
      },
      order: [['id', 'DESC']], raw: true,
    }).catch(() => []),
    M.WtMoneyEvent.findAll({
      where: { ...scope, subject_type: 'work_order' }, raw: true,
    }).catch(() => []),
  ]);

  const paidBy = {};
  payouts.forEach((p) => { paidBy[p.subject_id] = (paidBy[p.subject_id] || 0) + num(p.amount); });

  const shaped = workOrders.map((w) => providerWorkOrder(w, Math.abs(paidBy[w.id] || 0)));
  const open = shaped.filter((w) => !['completed', 'verified', 'closed', 'cancelled'].includes(lower(w.status)));

  return {
    provider: {
      code: provider.code,
      business_name: provider.business_name,
      contact_person: provider.contact_person,
      status: provider.status,
      approved_services: asArray(provider.approved_services),
      rating: provider.rating,
    },
    work_orders: shaped,
    queues: {
      awaiting_response: shaped.filter((w) => lower(w.status) === 'issued'),
      scheduled: shaped.filter((w) => ['accepted', 'scheduled'].includes(lower(w.status))),
      in_progress: shaped.filter((w) => lower(w.status) === 'in progress'),
      awaiting_signature: shaped.filter((w) => w.needs_signature),
    },
    totals: {
      open: open.length,
      earned: round2(shaped.reduce((s, w) => s + w.fee, 0)),
      paid: round2(shaped.reduce((s, w) => s + w.paid, 0)),
      outstanding: round2(shaped.reduce((s, w) => s + Math.max(0, w.outstanding), 0)),
    },
  };
}

/* ────────────────────────────────────────────────────────────────────────────
 * Customer portal
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * A work order as the CLIENT may see it.
 *
 * Note what is absent: provider_fee, ss_fee, provider_paid_amount, payout_status.
 * Those are the commercial arrangement between Seventh Sky and its provider and
 * are none of the client's business — returning the row would publish the margin
 * on their own job.
 */
const clientWorkOrder = (w) => ({
  code: w.code,
  status: w.status,
  category: w.category,
  scope: w.scope,
  site_address: w.site_address,
  provider_name: w.provider_name,
  target_date: w.target_date,
  scheduled_date: w.scheduled_date,
  completed_at: w.completed_at,
  verified_at: w.verified_at,
  completion_notes: w.completion_notes,
});

const clientInvoice = (i) => ({
  code: i.code,
  inv_type: i.inv_type,
  status: i.status,
  issue_date: i.issue_date,
  due_date: i.due_date,
  amount: round2(i.amount),
  paid_amount: round2(i.paid_amount),
  outstanding: round2(i.outstanding),
  lines: asArray(i.lines).map((l) => ({
    code: l.code, name: l.name, description: l.description,
    qty: l.qty, unit: l.unit, unit_price: round2(l.unit_price), line_total: round2(l.line_total),
  })),
  discount: round2(i.discount),
  vat_amount: round2(i.vat_amount),
  advance_applied: round2(i.advance_applied),
  payment_terms: i.payment_terms,
  // Receipts, so a client can reconcile without asking. `by` (which member of
  // staff keyed it) is deliberately dropped — internal detail.
  receipts: asArray(i.payments)
    .filter((p) => num(p.amount) > 0)
    .map((p) => ({ amount: round2(p.amount), method: p.method, reference: p.reference, received_on: p.received_on || p.at })),
});

const clientQuotation = (q) => ({
  code: q.code,
  decision: q.decision,
  validity: q.validity,
  total: round2(q.total),
  service_charges: round2(q.service_charges),
  vat: round2(q.vat),
  sent_at: q.sent_at,
  lines: asArray(q.lines).map((l) => ({
    code: l.code, name: l.name, qty: l.qty, unit: l.unit,
    price: round2(l.price != null ? l.price : l.agreed_price),
  })),
});

async function clientDossier(client) {
  const scope = { branch_id: client.branch_id };
  // Records are matched on the client CODE where it exists and fall back to the
  // name only when it does not — matching on name alone would show one client
  // another's records the moment two share a name.
  const byClient = client.code
    ? { [Op.or]: [{ client_code: client.code }, { client_name: client.name }] }
    : { client_name: client.name };

  const [quotes, workOrders, invoices, amcs, visits, warranties] = await Promise.all([
    M.WtQuotation.findAll({ where: { ...scope, ...byClient }, order: [['id', 'DESC']], raw: true }).catch(() => []),
    M.WtWorkOrder.findAll({ where: { ...scope, ...byClient }, order: [['id', 'DESC']], raw: true }).catch(() => []),
    M.WtInvoice.findAll({ where: { ...scope, ...byClient }, order: [['id', 'DESC']], raw: true }).catch(() => []),
    M.WtAmcContract.findAll({ where: { ...scope, ...byClient }, order: [['id', 'DESC']], raw: true }).catch(() => []),
    M.WtAmcVisit.findAll({ where: { ...scope, client_name: client.name }, order: [['due_date', 'ASC']], raw: true }).catch(() => []),
    M.WtWarranty.findAll({ where: { ...scope, client_name: client.name }, order: [['id', 'DESC']], raw: true }).catch(() => []),
  ]);

  // Drafts are not shown: an invoice or quotation the operator has not sent is
  // not yet a document the client is meant to have.
  const liveInvoices = invoices.filter((i) => lower(i.status) !== 'draft');
  const liveQuotes = quotes.filter((q) => q.sent_at || !['pending', ''].includes(lower(q.decision)));

  const outstanding = round2(liveInvoices.reduce((s, i) => s + Math.max(0, num(i.outstanding)), 0));

  return {
    client: {
      code: client.code,
      name: client.name,
      client_type: client.client_type,
      email: client.email,
      mobile: client.mobile,
      service_address: client.service_address,
    },
    quotations: liveQuotes.map(clientQuotation),
    work_orders: workOrders.filter((w) => lower(w.status) !== 'draft').map(clientWorkOrder),
    invoices: liveInvoices.map(clientInvoice),
    amc: amcs.map((a) => ({
      code: a.code, package: a.package, status: a.status,
      start_date: a.start_date, end_date: a.end_date,
      frequency: a.frequency, contract_value: round2(a.annual_value),
      visits: visits.filter((v) => v.amc_code === a.code).map((v) => ({
        visit_no: v.visit_no, visit_type: v.visit_type, due_date: v.due_date,
        scheduled_date: v.scheduled_date, completed_date: v.completed_date,
        status: v.status, findings: v.findings,
      })),
    })),
    warranties: warranties.map((w) => ({
      code: w.code, warranty_type: w.warranty_type, status: w.status,
      start_date: w.start_date, expiry_date: w.expiry_date,
      coverage: w.coverage, terms: w.terms, work_order_code: w.work_order_code,
    })),
    totals: {
      outstanding,
      invoices: liveInvoices.length,
      open_quotations: liveQuotes.filter((q) => lower(q.decision) === 'pending' || lower(q.decision) === 'sent').length,
      active_amc: amcs.filter((a) => lower(a.status) === 'active').length,
      upcoming_visits: visits.filter((v) => !['completed', 'cancelled'].includes(lower(v.status)) && v.due_date >= today()).length,
    },
  };
}

module.exports = {
  PortalError, hash,
  issueToken, revokeToken, resolve, logEvent,
  providerDossier, clientDossier,
  providerWorkOrder, clientWorkOrder, clientInvoice, clientQuotation,
  num, round2, lower, asArray,
};
