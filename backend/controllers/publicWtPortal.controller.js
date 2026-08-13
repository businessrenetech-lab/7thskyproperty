/**
 * publicWtPortal.controller.js — the provider and customer portals.
 *
 * Unauthenticated by design: the token IS the credential. That makes this the
 * most exposed surface in the module, so three things hold throughout:
 *
 *   1. Every handler resolves the token first and scopes every query to the
 *      party it resolved to. No handler takes a party id from the request.
 *   2. Responses are built by wtPortal.service's whitelists, never by returning
 *      a model row.
 *   3. State changes go through wtStateMachine, the same table the admin API
 *      obeys — a provider accepting through the portal is subject to exactly the
 *      rules as an operator accepting on their behalf.
 */
const { asyncHandler } = require('../utils/controllerHelpers');
const M = require('../models/waterTankOps');
const P = require('../models/waterTankProviders');
const portal = require('../services/wtPortal.service');
const sm = require('../services/wtStateMachine.service');

const { num, lower } = portal;
const today = () => new Date().toISOString().slice(0, 10);

const fail = (res, e) => {
  if (e instanceof portal.PortalError) return res.status(e.status).json({ error: e.message });
  if (e instanceof sm.TransitionError) return res.status(e.status).json({ error: e.message, blockers: e.blockers });
  throw e;
};

/** Resolve the token and stamp that the link was used. */
async function open(req, expectedType) {
  const { party_type, row } = await portal.resolve(req.params.token, expectedType);
  await row.update({ portal_last_seen_at: new Date() }).catch(() => {});
  return { party_type, row };
}

const auditOf = (req, ctx, action, extra = {}) => portal.logEvent({
  branch_id: ctx.row.branch_id,
  party_type: ctx.party_type,
  party_id: ctx.row.id,
  party_code: ctx.row.code,
  action,
  ip: req.headers['x-forwarded-for'] || req.ip,
  user_agent: req.headers['user-agent'],
  ...extra,
});

/* ────────────────────────────────────────────────────────────────────────────
 * Shared
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * GET /:token — everything this party may see.
 *
 * One endpoint for both kinds of party. The response says which it is, so the
 * frontend renders the right portal without the token needing to encode a type.
 */
exports.view = asyncHandler(async (req, res) => {
  try {
    const ctx = await open(req);
    const data = ctx.party_type === 'provider'
      ? await portal.providerDossier(ctx.row)
      : await portal.clientDossier(ctx.row);
    await auditOf(req, ctx, 'viewed_portal');
    res.json({ party_type: ctx.party_type, ...data });
  } catch (e) { fail(res, e); }
});

/* ────────────────────────────────────────────────────────────────────────────
 * Provider actions
 * ──────────────────────────────────────────────────────────────────────────── */

/** Load a work order that genuinely belongs to this provider. */
async function providerWorkOrder(ctx, code) {
  const wo = await M.WtWorkOrder.findOne({
    where: { branch_id: ctx.row.branch_id, code: String(code) },
  });
  if (!wo) throw new portal.PortalError(404, 'That work order was not found.');
  // The ownership check is the whole security boundary here: without it any
  // provider with a valid token could act on any work order by guessing a code.
  const mine = wo.provider_id === ctx.row.id
    || (wo.provider_name && wo.provider_name === ctx.row.business_name);
  if (!mine) throw new portal.PortalError(404, 'That work order was not found.');
  return wo;
}

/**
 * POST /:token/work-orders/:code/respond  { accept: true|false, reason?, date? }
 *
 * The decision that most obviously belongs to the provider and was previously
 * made for them by whoever answered the phone.
 */
exports.respond = asyncHandler(async (req, res) => {
  try {
    const ctx = await open(req, 'provider');
    const wo = await providerWorkOrder(ctx, req.params.code);
    const accept = req.body?.accept !== false;

    const step = sm.assertAction('work_order', accept ? 'accept' : 'decline', wo.toJSON(), {});
    await wo.update(accept
      ? { status: 'Accepted', accepted_at: new Date() }
      : { status: 'Draft', provider_name: null, provider_id: null });

    await M.WtCommLog.create({
      branch_id: wo.branch_id, client_name: wo.client_name, channel: 'portal', direction: 'inbound',
      summary: accept
        ? `${ctx.row.business_name} accepted ${wo.code} through the provider portal`
        : `${ctx.row.business_name} declined ${wo.code}${req.body?.reason ? ` — ${req.body.reason}` : ''}`,
      ref_type: 'work-orders', ref_code: wo.code, logged_at: new Date(),
    }).catch(() => {});

    await auditOf(req, ctx, accept ? 'accepted_work_order' : 'declined_work_order', {
      subject_type: 'work_order', subject_code: wo.code, detail: req.body?.reason || null,
    });

    res.json({
      work_order: portal.providerWorkOrder(wo.toJSON()),
      warnings: step.warnings,
      message: accept ? 'Thank you — the job is yours.' : 'Declined. Seventh Sky will reassign it.',
    });
  } catch (e) { fail(res, e); }
});

/** POST /:token/work-orders/:code/schedule  { date } */
exports.schedule = asyncHandler(async (req, res) => {
  try {
    const ctx = await open(req, 'provider');
    const wo = await providerWorkOrder(ctx, req.params.code);
    const date = req.body?.date;
    if (!date) throw new portal.PortalError(400, 'Give the date you plan to attend.');

    sm.assertAction('work_order', 'schedule', wo.toJSON(), {});
    await wo.update({ status: 'Scheduled', scheduled_date: date });
    await auditOf(req, ctx, 'scheduled_work_order', { subject_type: 'work_order', subject_code: wo.code, detail: date });
    res.json({ work_order: portal.providerWorkOrder(wo.toJSON()), message: `Booked for ${date}.` });
  } catch (e) { fail(res, e); }
});

/** POST /:token/work-orders/:code/start */
exports.start = asyncHandler(async (req, res) => {
  try {
    const ctx = await open(req, 'provider');
    const wo = await providerWorkOrder(ctx, req.params.code);
    sm.assertAction('work_order', 'start', wo.toJSON(), {});
    await wo.update({ status: 'In Progress', started_at: new Date() });
    await auditOf(req, ctx, 'started_work_order', { subject_type: 'work_order', subject_code: wo.code });
    res.json({ work_order: portal.providerWorkOrder(wo.toJSON()), message: 'Marked as started.' });
  } catch (e) { fail(res, e); }
});

/**
 * POST /:token/work-orders/:code/complete  { notes, summary, findings, photos_before[], photos_after[] }
 *
 * Completion and the report are one action deliberately. Separating them is how
 * a job ends up marked complete with no evidence behind it, and completion is
 * what releases the provider's own money on most agreements.
 */
exports.complete = asyncHandler(async (req, res) => {
  try {
    const ctx = await open(req, 'provider');
    const wo = await providerWorkOrder(ctx, req.params.code);
    const step = sm.assertAction('work_order', 'complete', wo.toJSON(), {});

    // Photos uploaded through the portal as the job progressed, plus anything
    // passed in the body — the report keeps its own copy so it stands alone.
    const before = [...portal.asArray(wo.portal_photos_before).map((p) => p.url), ...portal.asArray(req.body?.photos_before)];
    const after = [...portal.asArray(wo.portal_photos_after).map((p) => p.url), ...portal.asArray(req.body?.photos_after)];

    const report = await P.WtServiceReport.create({
      branch_id: wo.branch_id,
      code: `SR-${Date.now().toString().slice(-8)}`,
      report_type: 'Completion',
      work_order_code: wo.code,
      project_id: wo.project_id,
      client_name: wo.client_name,
      provider_id: ctx.row.id,
      provider_name: ctx.row.business_name,
      submitted_date: today(),
      summary: req.body?.summary || req.body?.notes || null,
      findings: req.body?.findings || null,
      photos_before: before,
      photos_after: after,
      // Submitted, NOT approved: Seventh Sky still verifies (SOP-01 Sec. 9
      // Step 11). The portal lets a provider report; it does not let them
      // sign off their own work.
      status: 'Submitted',
    }).catch(() => null);

    await wo.update({
      status: 'Completed',
      completed_at: new Date(),
      completion_notes: req.body?.notes || wo.completion_notes,
      reports_submitted: !!report,
      photos_collected: before.length + after.length > 0,
    });

    await auditOf(req, ctx, 'completed_work_order', {
      subject_type: 'work_order', subject_code: wo.code,
      detail: `${before.length + after.length} photo(s)${report ? `, report ${report.code}` : ''}`,
    });

    res.json({
      work_order: portal.providerWorkOrder(wo.toJSON()),
      report_code: report?.code || null,
      warnings: step.warnings,
      message: 'Thank you. Seventh Sky will verify the work and release payment.',
    });
  } catch (e) { fail(res, e); }
});

/**
 * POST /:token/work-orders/:code/signing-link
 *
 * Minted on demand rather than carried in the dossier: a signing token in a list
 * payload is a signing token in every browser cache and proxy log that ever saw
 * it. The same reasoning retired `access_token` from the agreement hub in Phase 1.
 */
exports.signingLink = asyncHandler(async (req, res) => {
  try {
    const ctx = await open(req, 'provider');
    const wo = await providerWorkOrder(ctx, req.params.code);
    if (!wo.wo_envelope_id) throw new portal.PortalError(400, 'This work order has not been issued for signature yet.');
    if (wo.wo_signed_at) throw new portal.PortalError(409, 'You have already signed this work order.');

    const EnvelopeSigner = require('../models/EnvelopeSigner');
    const signer = await EnvelopeSigner.findOne({
      where: { envelope_id: wo.wo_envelope_id, role: 'provider' },
      order: [['signer_order', 'ASC']],
    });
    if (!signer) throw new portal.PortalError(404, 'No signature is outstanding for you on this document.');

    await auditOf(req, ctx, 'requested_signing_link', { subject_type: 'work_order', subject_code: wo.code });
    res.json({ signing_path: `/admin/sign/${signer.access_token}` });
  } catch (e) { fail(res, e); }
});

/* ────────────────────────────────────────────────────────────────────────────
 * Customer actions
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * POST /:token/quotations/:code/decision  { decision: 'Approved'|'Rejected', note? }
 *
 * The client accepting their own quotation, rather than telling someone who then
 * clicks Approve for them.
 */
exports.quotationDecision = asyncHandler(async (req, res) => {
  try {
    const ctx = await open(req, 'client');
    const decision = String(req.body?.decision || '').trim();
    if (!['Approved', 'Rejected'].includes(decision)) {
      throw new portal.PortalError(400, 'Choose whether you accept or decline this quotation.');
    }

    const q = await M.WtQuotation.findOne({
      where: {
        branch_id: ctx.row.branch_id, code: String(req.params.code),
        ...(ctx.row.code ? { client_code: ctx.row.code } : { client_name: ctx.row.name }),
      },
    });
    if (!q) throw new portal.PortalError(404, 'That quotation was not found.');

    sm.assertAction('quotation', decision === 'Approved' ? 'approve' : 'reject', q.toJSON(), {});
    await q.update({ decision });

    await M.WtCommLog.create({
      branch_id: q.branch_id, client_name: q.client_name, channel: 'portal', direction: 'inbound',
      summary: `Client ${decision.toLowerCase()} quotation ${q.code} through the customer portal${req.body?.note ? ` — ${req.body.note}` : ''}`,
      ref_type: 'quotations', ref_code: q.code, logged_at: new Date(),
    }).catch(() => {});

    await auditOf(req, ctx, `quotation_${decision.toLowerCase()}`, {
      subject_type: 'quotation', subject_code: q.code, detail: req.body?.note || null,
    });

    res.json({
      quotation: portal.clientQuotation(q.toJSON()),
      message: decision === 'Approved'
        ? 'Thank you — Seventh Sky will be in touch to arrange the work.'
        : 'Noted. Seventh Sky will follow up.',
    });
  } catch (e) { fail(res, e); }
});

/** GET /:token/invoices/:code/pdf — the client's own invoice. */
exports.invoicePdf = asyncHandler(async (req, res) => {
  try {
    const ctx = await open(req, 'client');
    const inv = await M.WtInvoice.findOne({
      where: {
        branch_id: ctx.row.branch_id, code: String(req.params.code),
        ...(ctx.row.code ? { client_code: ctx.row.code } : { client_name: ctx.row.name }),
      },
    });
    if (!inv) throw new portal.PortalError(404, 'That invoice was not found.');
    if (lower(inv.status) === 'draft') throw new portal.PortalError(404, 'That invoice was not found.');

    const pdfSvc = require('../services/wtInvoicePdf.service');
    const { getBranding } = require('../services/wtBranding.service');
    const branding = await getBranding().catch(() => ({}));
    const buf = await pdfSvc.buildInvoicePdf(inv.toJSON(), branding);

    await auditOf(req, ctx, 'downloaded_invoice', { subject_type: 'invoice', subject_code: inv.code });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${inv.code}.pdf"`);
    res.send(buf);
  } catch (e) { fail(res, e); }
});

/** POST /:token/message  { subject?, body } — a way to reply without email. */
exports.message = asyncHandler(async (req, res) => {
  try {
    const ctx = await open(req);
    const body = String(req.body?.body || '').trim();
    if (!body) throw new portal.PortalError(400, 'Write a message first.');
    if (body.length > 4000) throw new portal.PortalError(400, 'That message is too long.');

    const name = ctx.party_type === 'provider' ? ctx.row.business_name : ctx.row.name;
    await M.WtCommLog.create({
      branch_id: ctx.row.branch_id,
      client_name: name,
      channel: 'portal', direction: 'inbound',
      summary: `${req.body?.subject ? `${req.body.subject}: ` : ''}${body.slice(0, 500)}`,
      ref_type: ctx.party_type === 'provider' ? 'providers' : 'clients',
      ref_code: ctx.row.code, logged_at: new Date(),
    });

    await auditOf(req, ctx, 'sent_message', { detail: (req.body?.subject || '').slice(0, 200) || null });
    res.json({ message: 'Sent. Seventh Sky will come back to you.' });
  } catch (e) { fail(res, e); }
});

/* ────────────────────────────────────────────────────────────────────────────
 * Signed-in portal users
 *
 * The token routes above stay — a magic link still suits a one-off. These serve
 * the party who has a real account, and reuse the SAME dossier builders and the
 * SAME ownership checks, so a provider sees exactly the same whitelisted data
 * whichever way they arrived. Two code paths producing two payloads is how one
 * of them ends up leaking something the other does not.
 * ──────────────────────────────────────────────────────────────────────────── */

/** Resolve the signed-in user to their party, or refuse. */
async function openSession(req) {
  const accounts = require('../services/wtPortalAccount.service');
  const found = await accounts.partyForUser(req.user);
  if (!found) throw new portal.PortalError(403, 'This account is not linked to a provider or client.');
  await found.row.update({ portal_last_seen_at: new Date() }).catch(() => {});
  return { party_type: found.party_type, row: found.row };
}

/** GET /api/wt-portal/me — the dossier for the signed-in party. */
exports.sessionView = asyncHandler(async (req, res) => {
  try {
    const ctx = await openSession(req);
    const data = ctx.party_type === 'provider'
      ? await portal.providerDossier(ctx.row)
      : await portal.clientDossier(ctx.row);
    await auditOf(req, ctx, 'viewed_portal');
    res.json({ party_type: ctx.party_type, signed_in: true, ...data });
  } catch (e) { fail(res, e); }
});

/** Resolve the party from the session, then run the handler. */
const sessionAction = (handler) => asyncHandler(async (req, res) => {
  try {
    const ctx = await openSession(req);
    await handler(req, res, ctx);
  } catch (e) { fail(res, e); }
});

exports.sessionRespond = sessionAction(async (req, res, ctx) => {
  if (ctx.party_type !== 'provider') throw new portal.PortalError(403, 'Only a provider can respond to a work order.');
  const wo = await providerWorkOrder(ctx, req.params.code);
  const accept = req.body?.accept !== false;
  const step = sm.assertAction('work_order', accept ? 'accept' : 'decline', wo.toJSON(), {});
  await wo.update(accept
    ? { status: 'Accepted', accepted_at: new Date() }
    : { status: 'Draft', provider_name: null, provider_id: null });
  await auditOf(req, ctx, accept ? 'accepted_work_order' : 'declined_work_order', {
    subject_type: 'work_order', subject_code: wo.code, detail: req.body?.reason || null,
  });
  res.json({
    work_order: portal.providerWorkOrder(wo.toJSON()),
    warnings: step.warnings,
    message: accept ? 'Thank you — the job is yours.' : 'Declined. Seventh Sky will reassign it.',
  });
});

exports.sessionSchedule = sessionAction(async (req, res, ctx) => {
  if (ctx.party_type !== 'provider') throw new portal.PortalError(403, 'Only a provider can schedule a work order.');
  const wo = await providerWorkOrder(ctx, req.params.code);
  if (!req.body?.date) throw new portal.PortalError(400, 'Give the date you plan to attend.');
  sm.assertAction('work_order', 'schedule', wo.toJSON(), {});
  await wo.update({ status: 'Scheduled', scheduled_date: req.body.date });
  await auditOf(req, ctx, 'scheduled_work_order', { subject_type: 'work_order', subject_code: wo.code, detail: req.body.date });
  res.json({ work_order: portal.providerWorkOrder(wo.toJSON()), message: `Booked for ${req.body.date}.` });
});

exports.sessionStart = sessionAction(async (req, res, ctx) => {
  if (ctx.party_type !== 'provider') throw new portal.PortalError(403, 'Only a provider can start a work order.');
  const wo = await providerWorkOrder(ctx, req.params.code);
  sm.assertAction('work_order', 'start', wo.toJSON(), {});
  await wo.update({ status: 'In Progress', started_at: new Date() });
  await auditOf(req, ctx, 'started_work_order', { subject_type: 'work_order', subject_code: wo.code });
  res.json({ work_order: portal.providerWorkOrder(wo.toJSON()), message: 'Marked as started.' });
});

exports.sessionComplete = sessionAction(async (req, res, ctx) => {
  if (ctx.party_type !== 'provider') throw new portal.PortalError(403, 'Only a provider can complete a work order.');
  const wo = await providerWorkOrder(ctx, req.params.code);
  const step = sm.assertAction('work_order', 'complete', wo.toJSON(), {});
  // Same as the token path: photos uploaded while the job was under way, plus
  // anything in the body. The report keeps its own copy so it stands alone.
  const before = [...portal.asArray(wo.portal_photos_before).map((p) => p.url), ...portal.asArray(req.body?.photos_before)];
  const after = [...portal.asArray(wo.portal_photos_after).map((p) => p.url), ...portal.asArray(req.body?.photos_after)];

  const report = await P.WtServiceReport.create({
    branch_id: wo.branch_id,
    code: `SR-${Date.now().toString().slice(-8)}`,
    report_type: 'Completion',
    work_order_code: wo.code, project_id: wo.project_id, client_name: wo.client_name,
    provider_id: ctx.row.id, provider_name: ctx.row.business_name,
    submitted_date: today(),
    summary: req.body?.summary || req.body?.notes || null,
    findings: req.body?.findings || null,
    photos_before: before, photos_after: after,
    // Submitted, never approved: reporting belongs to the provider, sign-off
    // belongs to Seventh Sky (SOP-01 Sec. 9 Step 11).
    status: 'Submitted',
  }).catch(() => null);

  await wo.update({
    status: 'Completed', completed_at: new Date(),
    completion_notes: req.body?.notes || wo.completion_notes,
    reports_submitted: !!report,
    photos_collected: before.length + after.length > 0,
  });
  await auditOf(req, ctx, 'completed_work_order', {
    subject_type: 'work_order', subject_code: wo.code,
    detail: `${before.length + after.length} photo(s)${report ? `, report ${report.code}` : ''}`,
  });
  res.json({
    work_order: portal.providerWorkOrder(wo.toJSON()),
    report_code: report?.code || null,
    warnings: step.warnings,
    message: 'Thank you. Seventh Sky will verify the work and release payment.',
  });
});

exports.sessionQuotationDecision = sessionAction(async (req, res, ctx) => {
  if (ctx.party_type !== 'client') throw new portal.PortalError(403, 'Only a client can decide a quotation.');
  const decision = String(req.body?.decision || '').trim();
  if (!['Approved', 'Rejected'].includes(decision)) {
    throw new portal.PortalError(400, 'Choose whether you accept or decline this quotation.');
  }
  const q = await M.WtQuotation.findOne({
    where: {
      branch_id: ctx.row.branch_id, code: String(req.params.code),
      ...(ctx.row.code ? { client_code: ctx.row.code } : { client_name: ctx.row.name }),
    },
  });
  if (!q) throw new portal.PortalError(404, 'That quotation was not found.');
  sm.assertAction('quotation', decision === 'Approved' ? 'approve' : 'reject', q.toJSON(), {});
  await q.update({ decision });
  await auditOf(req, ctx, `quotation_${decision.toLowerCase()}`, {
    subject_type: 'quotation', subject_code: q.code, detail: req.body?.note || null,
  });
  res.json({
    quotation: portal.clientQuotation(q.toJSON()),
    message: decision === 'Approved'
      ? 'Thank you — Seventh Sky will be in touch to arrange the work.'
      : 'Noted. Seventh Sky will follow up.',
  });
});

exports.sessionMessage = sessionAction(async (req, res, ctx) => {
  const body = String(req.body?.body || '').trim();
  if (!body) throw new portal.PortalError(400, 'Write a message first.');
  if (body.length > 4000) throw new portal.PortalError(400, 'That message is too long.');
  const name = ctx.party_type === 'provider' ? ctx.row.business_name : ctx.row.name;
  await M.WtCommLog.create({
    branch_id: ctx.row.branch_id, client_name: name,
    channel: 'portal', direction: 'inbound',
    summary: `${req.body?.subject ? `${req.body.subject}: ` : ''}${body.slice(0, 500)}`,
    ref_type: ctx.party_type === 'provider' ? 'providers' : 'clients',
    ref_code: ctx.row.code, logged_at: new Date(),
  });
  await auditOf(req, ctx, 'sent_message');
  res.json({ message: 'Sent. Seventh Sky will come back to you.' });
});

exports.sessionInvoicePdf = sessionAction(async (req, res, ctx) => {
  if (ctx.party_type !== 'client') throw new portal.PortalError(403, 'Only a client can download an invoice.');
  const inv = await M.WtInvoice.findOne({
    where: {
      branch_id: ctx.row.branch_id, code: String(req.params.code),
      ...(ctx.row.code ? { client_code: ctx.row.code } : { client_name: ctx.row.name }),
    },
  });
  if (!inv || lower(inv.status) === 'draft') throw new portal.PortalError(404, 'That invoice was not found.');
  const pdfSvc = require('../services/wtInvoicePdf.service');
  const { getBranding } = require('../services/wtBranding.service');
  const branding = await getBranding().catch(() => ({}));
  const buf = await pdfSvc.buildInvoicePdf(inv.toJSON(), branding);
  await auditOf(req, ctx, 'downloaded_invoice', { subject_type: 'invoice', subject_code: inv.code });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="${inv.code}.pdf"`);
  res.send(buf);
});

/* ────────────────────────────────────────────────────────────────────────────
 * Photo upload
 *
 * Completion previously took photo URLs, which meant a provider had to host the
 * pictures somewhere first — so in practice nobody attached any, and completion
 * evidence went in as prose. A phone camera straight into the report is the only
 * version of this anyone will actually use.
 *
 * Both the token and the session paths share this handler, because the ownership
 * check and the storage rules must not differ by how the provider arrived.
 * ──────────────────────────────────────────────────────────────────────────── */

const pathMod = require('path');

/** Shared by the two entry points; `resolve` supplies the party. */
async function handleUpload(req, res, ctx) {
  if (ctx.party_type !== 'provider') throw new portal.PortalError(403, 'Only a provider can attach job photos.');
  if (!req.file) throw new portal.PortalError(400, 'Choose a photo to upload.');

  // The work order must be theirs before anything is written anywhere.
  const wo = await providerWorkOrder(ctx, req.params.code);

  const stage = ['before', 'after'].includes(String(req.body?.stage)) ? req.body.stage : 'after';
  const url = `/uploads/documents/${pathMod.basename(req.file.path)}`;

  /*
   * Held on the work order rather than the report, because photos are taken as
   * the job proceeds and the report is filed at the end — waiting for the report
   * to exist would mean the first pictures had nowhere to go.
   */
  const key = stage === 'before' ? 'portal_photos_before' : 'portal_photos_after';
  const current = portal.asArray(wo[key]);
  const next = [...current, { url, at: new Date().toISOString(), name: req.file.originalname }];

  await wo.update({ [key]: next, photos_collected: true });

  await auditOf(req, ctx, 'uploaded_photo', {
    subject_type: 'work_order', subject_code: wo.code, detail: `${stage}: ${req.file.originalname}`,
  });

  res.status(201).json({
    url,
    stage,
    count: next.length,
    message: `Photo added to the ${stage} set.`,
  });
}

/** POST /public/wt-portal/:token/work-orders/:code/photos */
exports.uploadPhoto = asyncHandler(async (req, res) => {
  try {
    const ctx = await open(req, 'provider');
    await handleUpload(req, res, ctx);
  } catch (e) { fail(res, e); }
});

/** POST /api/wt-portal/work-orders/:code/photos */
exports.sessionUploadPhoto = asyncHandler(async (req, res) => {
  try {
    const ctx = await openSession(req);
    await handleUpload(req, res, ctx);
  } catch (e) { fail(res, e); }
});

/* ────────────────────────────────────────────────────────────────────────────
 * Serving a photo back to the party who uploaded it
 *
 * Job photos live in the PRIVATE uploads folder, which is JWT-gated. A provider
 * on a magic link has no JWT and no cookie, so they could upload a photo and
 * then not see it — the thumbnail came back 401.
 *
 * This route authorises with the portal token instead. Two things make it a
 * photo route rather than a file reader, and both matter:
 *
 *   1. The filename is sanitised to a bare basename. Anything with a slash or a
 *      `..` is rejected outright, so `?file=../../.env` cannot escape the folder.
 *   2. The file must actually be referenced by one of THIS party's records.
 *      A valid token for provider A therefore cannot fetch provider B's photos
 *      by guessing a filename.
 * ──────────────────────────────────────────────────────────────────────────── */

const pathLib = require('path');
const fsLib = require('fs');

/** Only ever a bare filename inside the documents folder. */
function safeUploadName(raw) {
  const name = pathLib.basename(String(raw || ''));
  if (!name || name !== String(raw || '').replace(/^\/uploads\/documents\//, '')) return null;
  if (name.includes('/') || name.includes('\\') || name.includes('..')) return null;
  if (!/^[A-Za-z0-9._-]+$/.test(name)) return null;
  return name;
}

/** Every photo URL this party legitimately has, as a Set of basenames. */
async function photosOwnedBy(ctx) {
  const owned = new Set();
  const add = (list) => portal.asArray(list).forEach((p) => {
    const url = typeof p === 'string' ? p : p?.url;
    if (url) owned.add(pathLib.basename(String(url)));
  });

  if (ctx.party_type === 'provider') {
    const [wos, reports] = await Promise.all([
      M.WtWorkOrder.findAll({
        where: {
          branch_id: ctx.row.branch_id,
          [require('sequelize').Op.or]: [{ provider_id: ctx.row.id }, { provider_name: ctx.row.business_name }],
        },
        attributes: ['portal_photos_before', 'portal_photos_after'], raw: true,
      }).catch(() => []),
      P.WtServiceReport.findAll({
        where: { branch_id: ctx.row.branch_id, provider_id: ctx.row.id },
        attributes: ['photos_before', 'photos_after'], raw: true,
      }).catch(() => []),
    ]);
    wos.forEach((w) => { add(w.portal_photos_before); add(w.portal_photos_after); });
    reports.forEach((r) => { add(r.photos_before); add(r.photos_after); });
  } else {
    // A client sees the evidence for their own jobs.
    const reports = await P.WtServiceReport.findAll({
      where: { branch_id: ctx.row.branch_id, client_name: ctx.row.name },
      attributes: ['photos_before', 'photos_after'], raw: true,
    }).catch(() => []);
    reports.forEach((r) => { add(r.photos_before); add(r.photos_after); });
  }
  return owned;
}

/** GET /public/wt-portal/:token/photo?file=<basename> */
exports.photo = asyncHandler(async (req, res) => {
  try {
    const ctx = await open(req);
    const name = safeUploadName(req.query.file);
    if (!name) throw new portal.PortalError(400, 'That is not a valid file reference.');

    const owned = await photosOwnedBy(ctx);
    // Same 404 for "no such file" and "not yours" — distinguishing them would
    // confirm which filenames exist.
    if (!owned.has(name)) throw new portal.PortalError(404, 'Photo not found.');

    const full = pathLib.join(__dirname, '..', 'uploads', 'documents', name);
    if (!fsLib.existsSync(full)) throw new portal.PortalError(404, 'Photo not found.');

    res.setHeader('Cache-Control', 'private, max-age=3600');
    res.sendFile(full);
  } catch (e) { fail(res, e); }
});

/** GET /api/wt-portal/photo?file= — the same, for a signed-in portal user. */
exports.sessionPhoto = asyncHandler(async (req, res) => {
  try {
    const ctx = await openSession(req);
    const name = safeUploadName(req.query.file);
    if (!name) throw new portal.PortalError(400, 'That is not a valid file reference.');
    const owned = await photosOwnedBy(ctx);
    if (!owned.has(name)) throw new portal.PortalError(404, 'Photo not found.');
    const full = pathLib.join(__dirname, '..', 'uploads', 'documents', name);
    if (!fsLib.existsSync(full)) throw new portal.PortalError(404, 'Photo not found.');
    res.setHeader('Cache-Control', 'private, max-age=3600');
    res.sendFile(full);
  } catch (e) { fail(res, e); }
});
