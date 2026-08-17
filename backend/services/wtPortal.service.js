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
const P = require('../models/waterTankProviders');

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

/**
 * A day counter that answers "is this about to bite me?".
 *
 * Compliance is the single most common reason a provider is suspended, and the
 * provider is always the last to know because the expiry lives in Seventh Sky's
 * system and not theirs. Surfacing the number of days is the whole value.
 */
const daysUntil = (d) => (d ? Math.ceil((new Date(d) - Date.now()) / 864e5) : null);

async function providerDossier(provider) {
  const scope = { branch_id: provider.branch_id };
  const mine = { [Op.or]: [{ provider_id: provider.id }, { provider_name: provider.business_name }] };

  const [
    workOrders, payouts, reports, documents, audits, agreements, rates,
    protectedClients, complaints, incidents, messages, vouchers,
  ] = await Promise.all([
    M.WtWorkOrder.findAll({ where: { ...scope, ...mine }, order: [['id', 'DESC']], raw: true }).catch(() => []),
    M.WtMoneyEvent.findAll({ where: { ...scope, subject_type: 'work_order' }, raw: true }).catch(() => []),
    P.WtServiceReport.findAll({ where: { ...scope, ...mine }, order: [['id', 'DESC']], raw: true }).catch(() => []),
    P.WtProviderDocument.findAll({ where: { ...scope, provider_id: provider.id }, order: [['expiry_date', 'ASC']], raw: true }).catch(() => []),
    P.WtProviderAudit.findAll({ where: { ...scope, provider_id: provider.id }, order: [['id', 'DESC']], raw: true }).catch(() => []),
    P.WtProviderAgreement.findAll({ where: { ...scope, provider_id: provider.id }, order: [['version_no', 'DESC']], raw: true }).catch(() => []),
    P.WtProviderAgreementRate.findAll({ where: { ...scope }, raw: true }).catch(() => []),
    P.WtProtectedClient.findAll({ where: { ...scope, provider_id: provider.id }, raw: true }).catch(() => []),
    M.WtComplaint.findAll({ where: { ...scope, provider_name: provider.business_name }, order: [['id', 'DESC']], raw: true }).catch(() => []),
    M.WtIncident.findAll({ where: { ...scope, provider_name: provider.business_name }, order: [['id', 'DESC']], raw: true }).catch(() => []),
    M.WtCommLog.findAll({ where: { ...scope, client_name: provider.business_name }, order: [['logged_at', 'DESC']], limit: 60, raw: true }).catch(() => []),
    // Payment vouchers ARE the provider's receipt. They had no way to see one.
    M.WtProjectDisbursement.findAll({
      where: { ...scope, payee: provider.business_name, status: 'Paid' },
      order: [['paid_on', 'DESC']], raw: true,
    }).catch(() => []),
  ]);

  const paidBy = {};
  payouts.forEach((p) => { paidBy[p.subject_id] = (paidBy[p.subject_id] || 0) + num(p.amount); });

  const shaped = workOrders.map((w) => providerWorkOrder(w, Math.abs(paidBy[w.id] || 0)));
  const open = shaped.filter((w) => !['completed', 'verified', 'closed', 'cancelled'].includes(lower(w.status)));

  const live = agreements.find((a) => lower(a.status) === 'active') || agreements[0] || null;
  const liveRates = live ? rates.filter((r) => r.agreement_id === live.id) : [];

  const docs = documents.map((d) => ({
    id: d.id,
    category: d.category,
    doc_type: d.doc_type,
    doc_number: d.doc_number,
    issuer: d.issuer,
    sum_insured: round2(d.sum_insured),
    issue_date: d.issue_date,
    expiry_date: d.expiry_date,
    verified: !!d.verified,
    status: d.status,
    days_to_expiry: daysUntil(d.expiry_date),
    // `file_url` is deliberately withheld — the provider uploaded it, and
    // re-serving arbitrary stored paths from a token-authenticated route is a
    // file-read primitive waiting to be found. They can see WHAT is on file and
    // when it lapses, which is what they actually need.
  }));

  const expiring = docs.filter((d) => d.days_to_expiry != null && d.days_to_expiry <= 45);

  return {
    provider: {
      code: provider.code,
      business_name: provider.business_name,
      contact_person: provider.contact_person,
      contact_email: provider.contact_email,
      contact_phone: provider.contact_phone,
      status: provider.status,
      approved_services: asArray(provider.approved_services),
      coverage: provider.coverage,
      specialty: provider.specialty,
      onboarded_since: provider.onboarded_since,
      rating: num(provider.rating),
    },
    work_orders: shaped,
    queues: {
      awaiting_response: shaped.filter((w) => lower(w.status) === 'issued'),
      scheduled: shaped.filter((w) => ['accepted', 'scheduled'].includes(lower(w.status))),
      in_progress: shaped.filter((w) => lower(w.status) === 'in progress'),
      awaiting_signature: shaped.filter((w) => w.needs_signature),
    },

    /* What they did — their own filed reports, with the photos they took. */
    reports: reports.map((r) => ({
      code: r.code,
      report_type: r.report_type,
      work_order_code: r.work_order_code,
      client_name: r.client_name,
      site_address: r.site_address,
      submitted_date: r.submitted_date,
      status: r.status,
      summary: r.summary,
      findings: r.findings,
      review_notes: r.review_notes,
      reviewed_date: r.reviewed_date,
      photos_before: asArray(r.photos_before),
      photos_after: asArray(r.photos_after),
      filed_via: r.filed_via,
    })),

    /* What they are paid, and on what terms. */
    agreement: live ? {
      code: live.code,
      version_no: live.version_no,
      status: live.status,
      term_months: live.term_months,
      notice_days: live.notice_days,
      commission_pct: num(live.commission_pct),
      payment_model: live.payment_model,
      payout_trigger: live.payout_trigger,
      payment_due_days: num(live.payment_due_days),
      payment_terms: live.payment_terms,
      effective_date: live.effective_date,
      expiry_date: live.expiry_date,
      completed_at: live.completed_at,
      rates: liveRates.map((r) => ({
        service_code: r.service_code, service_name: r.service_name,
        // The AGREED rate is what they are actually paid; the proposed one is
        // a negotiating position and showing it would invite an argument that
        // has already been settled.
        unit: r.unit, rate: round2(r.agreed_rate != null ? r.agreed_rate : r.standard_rate),
        rate_status: r.rate_status, effective_from: r.effective_from,
      })),
    } : null,

    /* Every payout, as a statement they can reconcile — with its voucher. */
    payouts: vouchers.map((v) => ({
      voucher_no: v.voucher_no,
      code: v.code,
      work_order_code: v.work_order_code,
      description: v.description,
      amount: round2(v.amount),
      method: v.method,
      reference: v.reference,
      paid_on: v.paid_on,
      batch_ref: v.batch_ref,
    })),

    compliance: {
      documents: docs,
      expiring,
      audits: audits.map((a) => ({
        code: a.code, audit_type: a.audit_type, scheduled_date: a.scheduled_date,
        conducted_date: a.conducted_date, score: a.score, outcome: a.outcome,
        findings: a.findings, corrective_actions: a.corrective_actions,
        action_due_date: a.action_due_date, closed: !!a.closed, next_due_date: a.next_due_date,
      })),
    },

    /*
     * Complaints and incidents involving them. Shown because a provider whose
     * rating is falling deserves to know why, and because the first they hear of
     * a complaint should not be a suspension. The client's identity is included
     * — they were on that client's site — but nothing about the client's billing.
     */
    issues: {
      complaints: complaints.map((c) => ({
        code: c.code, incident_type: c.incident_type, severity: c.severity,
        status: c.status, logged_date: c.logged_date, work_order_code: c.work_order_code,
        client_name: c.client_name, details: c.details, resolution: c.resolution,
      })),
      incidents: incidents.map((i) => ({
        code: i.code, incident_type: i.incident_type, severity: i.severity,
        status: i.status, incident_date: i.incident_date, location: i.location,
        description: i.description, action_taken: i.action_taken,
      })),
    },

    performance: {
      jobs_completed: num(provider.jobs_completed),
      completion_rate: num(provider.completion_rate),
      complaint_rate: num(provider.complaint_rate),
      rating: num(provider.rating),
      rank: provider.rank,
      protected_clients: protectedClients.length,
      reports_filed: reports.length,
      open_issues: complaints.filter((c) => !['resolved', 'closed'].includes(lower(c.status))).length,
    },

    messages: messages.map((m) => ({
      channel: m.channel, direction: m.direction, summary: m.summary,
      ref_type: m.ref_type, ref_code: m.ref_code, logged_at: m.logged_at,
    })),

    totals: {
      open: open.length,
      earned: round2(shaped.reduce((s, w) => s + w.fee, 0)),
      paid: round2(shaped.reduce((s, w) => s + w.paid, 0)),
      outstanding: round2(shaped.reduce((s, w) => s + Math.max(0, w.outstanding), 0)),
      expiring_documents: expiring.length,
      open_issues: complaints.filter((c) => !['resolved', 'closed'].includes(lower(c.status))).length,
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

  const [
    quotes, workOrders, invoices, amcs, visits, warranties,
    reports, assessments, complaints, requests, projects, messages,
  ] = await Promise.all([
    M.WtQuotation.findAll({ where: { ...scope, ...byClient }, order: [['id', 'DESC']], raw: true }).catch(() => []),
    M.WtWorkOrder.findAll({ where: { ...scope, ...byClient }, order: [['id', 'DESC']], raw: true }).catch(() => []),
    M.WtInvoice.findAll({ where: { ...scope, ...byClient }, order: [['id', 'DESC']], raw: true }).catch(() => []),
    M.WtAmcContract.findAll({ where: { ...scope, ...byClient }, order: [['id', 'DESC']], raw: true }).catch(() => []),
    M.WtAmcVisit.findAll({ where: { ...scope, client_name: client.name }, order: [['due_date', 'ASC']], raw: true }).catch(() => []),
    M.WtWarranty.findAll({ where: { ...scope, client_name: client.name }, order: [['id', 'DESC']], raw: true }).catch(() => []),
    /*
     * The service reports and site assessments for their OWN property, with the
     * photographs taken inside their own tanks. This is the single largest thing
     * the portal was missing: the evidence of the work exists, the client paid
     * for it, and they had no way to look at it.
     */
    P.WtServiceReport.findAll({ where: { ...scope, ...byClient }, order: [['id', 'DESC']], raw: true }).catch(() => []),
    M.WtSiteAssessment.findAll({ where: { ...scope, client_name: client.name }, order: [['id', 'DESC']], raw: true }).catch(() => []),
    /*
     * Their complaints. A client could RAISE one from this portal and then had
     * no way to see whether anything had happened to it — which is worse than
     * not offering the button, because it teaches them the button does nothing.
     */
    M.WtComplaint.findAll({ where: { ...scope, ...byClient }, order: [['id', 'DESC']], raw: true }).catch(() => []),
    M.WtServiceRequest.findAll({ where: { ...scope, client_name: client.name }, order: [['id', 'DESC']], raw: true }).catch(() => []),
    M.WtProject.findAll({ where: { ...scope, ...byClient }, order: [['id', 'DESC']], raw: true }).catch(() => []),
    M.WtCommLog.findAll({ where: { ...scope, client_name: client.name }, order: [['logged_at', 'DESC']], limit: 60, raw: true }).catch(() => []),
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
      days_to_expiry: daysUntil(w.expiry_date),
    })),

    /*
     * The evidence. `reviewed`/`review_notes` are Seventh Sky's internal
     * verification and are withheld — a client reading "photos unclear, sent
     * back" would reasonably conclude the job was botched when it was the
     * paperwork. What they get is what was found and what it looked like.
     */
    reports: reports.filter((r) => !['draft', 'sent back'].includes(lower(r.status))).map((r) => ({
      code: r.code,
      report_type: r.report_type,
      work_order_code: r.work_order_code,
      site_address: r.site_address,
      provider_name: r.provider_name,
      submitted_date: r.submitted_date,
      summary: r.summary,
      findings: r.findings,
      photos_before: asArray(r.photos_before),
      photos_after: asArray(r.photos_after),
    })),

    /* What was found at the property, including the tank profile. */
    assessments: assessments.filter((a) => lower(a.status) !== 'draft').map((a) => ({
      code: a.code,
      assessed_date: a.assessed_date,
      status: a.status,
      tank_type: a.tank_type, tank_capacity: a.tank_capacity,
      tank_material: a.tank_material, tank_location: a.tank_location,
      water_source: a.water_source, last_cleaned: a.last_cleaned,
      contamination: a.contamination, leakage: a.leakage,
      access_safe: !!a.access_safe,
      findings: a.findings,
      structural_notes: a.structural_notes,
      risks: asArray(a.risks),
      recommended_services: asArray(a.recommended_services),
      water_test: a.water_test || null,
      photos: asArray(a.photos),
      photos_after: asArray(a.photos_after),
      assessor: a.assessor,
    })),

    /* Their own complaints, and what happened to them. */
    complaints: complaints.map((c) => ({
      code: c.code,
      incident_type: c.incident_type,
      severity: c.severity,
      status: c.status,
      logged_date: c.logged_date,
      work_order_code: c.work_order_code,
      details: c.details || c.disclosure,
      resolution: c.resolution,
      resolved_date: c.resolved_date,
      acknowledged_at: c.acknowledged_at,
      sla_due: c.sla_due,
      raised_via: c.raised_via,
    })),

    /* Requests they made that have not yet become a job. */
    requests: requests.map((r) => ({
      code: r.code,
      category: r.category,
      specific_service: r.specific_service,
      status: r.status,
      priority: r.priority,
      request_date: r.request_date,
      preferred_date: r.preferred_date,
      description: r.description,
      // `assigned_officer` is withheld: which member of staff holds it is
      // internal, and naming them invites the client to chase a person rather
      // than the business.
    })),

    /* Where the work has got to, for anything running as a project. */
    projects: projects.filter((p) => lower(p.status) !== 'draft').map((p) => ({
      code: p.code, name: p.name, status: p.status,
      site_address: p.site_address, progress: num(p.progress_pct),
      start_date: p.start_date, scheduled_date: p.scheduled_date,
      stage: p.stage,
    })),

    /*
     * The conversation, so a client who writes in can see their own message on
     * the record rather than sending it into silence. Internal notes are
     * excluded — `channel: 'note'` is staff talking to each other.
     */
    messages: messages.filter((m) => lower(m.channel) !== 'note').map((m) => ({
      channel: m.channel, direction: m.direction, summary: m.summary,
      ref_type: m.ref_type, ref_code: m.ref_code, logged_at: m.logged_at,
    })),

    property: {
      service_address: client.service_address,
      district: client.district,
      property_type: client.property_type,
      tanks_count: num(client.tanks_count),
      tank_type: client.tank_type,
      tank_capacity: client.tank_capacity,
      last_cleaning: client.last_cleaning,
      amc_package: client.amc_package,
      amc_status: client.amc_status,
    },

    totals: {
      outstanding,
      invoices: liveInvoices.length,
      open_quotations: liveQuotes.filter((q) => lower(q.decision) === 'pending' || lower(q.decision) === 'sent').length,
      active_amc: amcs.filter((a) => lower(a.status) === 'active').length,
      upcoming_visits: visits.filter((v) => !['completed', 'cancelled'].includes(lower(v.status)) && v.due_date >= today()).length,
      reports: reports.length,
      open_complaints: complaints.filter((c) => !['resolved', 'closed'].includes(lower(c.status))).length,
      active_warranties: warranties.filter((w) => lower(w.status) === 'active').length,
      // Cover that lapses inside two months, so it can be renewed rather than
      // discovered missing at the moment it is needed.
      expiring_warranties: warranties.filter((w) => {
        const d = daysUntil(w.expiry_date);
        return lower(w.status) === 'active' && d != null && d >= 0 && d <= 60;
      }).length,
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
