/**
 * waterTankQuotation.controller.js
 * Quotation builder for the Water Tank service line (SSPC-WTCM-SOP-01 Sec. 7 Step 5).
 *
 * A quotation is built FROM a site assessment: the assessor's recommended
 * services are pre-selected, priced from the Customer Service Agreement
 * catalogue (Schedule C standard pricing), and any extra fee can be added.
 * Prices are editable per line — the standard price is kept alongside so the
 * document can show what was agreed vs. what is standard.
 */
const { Op } = require('sequelize');
const sequelize = require('../config/db.config');
const { asyncHandler, branchScope, resolveBranchId, serviceScope, resolveServiceLine, catalogueVertical } = require('../utils/controllerHelpers');
// Branch + service-line scope (this controller queries only wt_* tables).
const scoped = (req) => ({ ...branchScope(req), ...serviceScope(req) });
const M = require('../models/waterTankOps');
const ServiceItem = require('../models/ServiceItem');
const { getBranding } = require('../services/wtBranding.service');
const { sendEmail } = require('../services/communication.service');
// Mint quote codes through the shared identity service so each service line gets
// its own prefix + series (Water Tank Q-…, Air Conditioning ACQ-…), never WT's.
const { nextCode } = require('../services/wtIdentity.service');

const num = (v) => Number(v || 0);
const today = () => new Date().toISOString().slice(0, 10);
const addDays = (n) => new Date(Date.now() + n * 864e5).toISOString().slice(0, 10);
const money = (v) => '৳' + num(v).toLocaleString('en-BD', { maximumFractionDigits: 2 });
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const VAT_RATE = 0.05;

/**
 * Recompute a quotation's money from its lines. Single source of truth —
 * the client sends lines, the server decides the totals.
 */
function computeTotals(lines = [], opts = {}) {
  const services = lines.filter((l) => l.kind !== 'fee');
  const fees = lines.filter((l) => l.kind === 'fee');
  const lineTotal = (l) => num(l.price) * (num(l.qty) || 1);

  const service_charges = services.reduce((s, l) => s + lineTotal(l), 0);
  const other_fees = fees.reduce((s, l) => s + lineTotal(l), 0);
  const provider_allocation_fee = num(opts.provider_allocation_fee);
  const discount = num(opts.discount);
  const net = Math.max(0, service_charges + other_fees + provider_allocation_fee - discount);
  const vatable = opts.vat_exempt ? 0 : net;
  const vat = Math.round(vatable * VAT_RATE * 100) / 100;

  return {
    service_charges: Math.round(service_charges * 100) / 100,
    other_fees: Math.round(other_fees * 100) / 100,
    provider_allocation_fee,
    discount,
    vat,
    total: Math.round((net + vat) * 100) / 100,
  };
}

/* ═══ BUILDER DATA ════════════════════════════════════════════ */

/**
 * GET /wt-quotes/builder/:assessmentId
 * Everything the builder screen needs in one call: the assessment, the client,
 * the priced catalogue, and any quotation already raised for this project.
 */
/**
 * Does this client already have a Customer Service Agreement in force?
 *
 * Clause 1 makes the agreement the umbrella for the engagement — "the specific
 * services, pricing and project requirements for each engagement will be
 * confirmed in the relevant Quotation and Work Order". So a client who signed
 * one does NOT have to sign again for each job. The operator still gets the
 * choice, because a materially different engagement may warrant a fresh
 * agreement, so this reports the position rather than deciding it.
 */
async function agreementPosition(scope, clientName, clientCode) {
  if (!clientName && !clientCode) return { has_signed_agreement: false };
  const where = { ...scope };
  where[Op.or] = [
    ...(clientCode ? [{ code: clientCode }] : []),
    ...(clientName ? [{ name: clientName }] : []),
  ];
  const client = await M.WtClient.findOne({ where, raw: true }).catch(() => null);
  if (!client) return { has_signed_agreement: false };

  const signed = String(client.agreement_status || '').toLowerCase() === 'signed';
  return {
    client_code: client.code,
    client_name: client.name,
    has_signed_agreement: signed,
    agreement_code: client.agreement_code || null,
    agreement_envelope_id: client.agreement_envelope_id || null,
    signed_date: client.agreement_signed_date || null,
    // What the operator is being asked to choose between.
    options: signed
      ? [
        { key: 'continue', label: 'Continue under the existing agreement', recommended: true,
          detail: `${client.agreement_code || 'The signed agreement'} governs this engagement (Clause 1). The quotation and work order confirm the specifics — no new signature needed.` },
        { key: 'new', label: 'Raise a new agreement', recommended: false,
          detail: 'Use this when the scope, pricing basis or parties differ materially from what was signed.' },
      ]
      : [
        { key: 'new', label: 'Raise a Customer Service Agreement', recommended: true,
          detail: 'Sec. 7 Step 6 requires a signed agreement before work commences.' },
        { key: 'continue', label: 'Quote only for now', recommended: false,
          detail: 'The quotation can be sent, but work cannot start until an agreement is signed.' },
      ],
  };
}

/** GET /wt-quotes/agreement-position?client=CODE — used by the direct-quote flow. */
exports.agreementPosition = asyncHandler(async (req, res) => {
  res.json(await agreementPosition(scoped(req), req.query.name, req.query.client));
});

/**
 * POST /wt-quotes/direct — raise a quotation with no site assessment behind it
 * (Sec. 7 Step 5: the job is understood well enough to price straight away).
 *
 * Creates the quotation and, when asked, immediately DRAFTS the work order so
 * the job is queued without anything being dispatched.
 */
exports.createDirect = asyncHandler(async (req, res) => {
  const branchId = resolveBranchId(req);
  const scope = scoped(req);
  const b = req.body || {};

  if (!b.client_name) return res.status(400).json({ error: 'A client is required.' });
  const lines = Array.isArray(b.lines) ? b.lines : [];
  if (!lines.length) return res.status(400).json({ error: 'Add at least one service or fee to the quotation.' });

  const totals = computeTotals(lines, b);
  const position = await agreementPosition(scope, b.client_name, b.client_code);

  const out = await sequelize.transaction(async (transaction) => {
    const quoteCode = await nextCode('quotations', branchId, transaction, resolveServiceLine(req));

    const advTotal = Number(totals.total || 0);
    const basis = b.advance_basis === 'amount' ? 'amount' : 'percent';
    const rawAdv = basis === 'amount' ? num(b.advance_amount) : Math.round((advTotal * num(b.advance_percent)) / 100);
    const advance = Math.max(0, Math.min(rawAdv, advTotal));

    const quote = await M.WtQuotation.create({
      branch_id: branchId,
      service_line: resolveServiceLine(req),
      code: quoteCode,
      client_name: b.client_name,
      client_code: b.client_code || position.client_code || null,
      site_address: b.site_address || null,
      project_id: b.project_id || null,
      source_assessment: null,
      direct_quote: true,
      lines,
      ...totals,
      validity: b.validity || '15 Days',
      payment_terms: b.payment_terms || null,
      notes: b.notes || null,
      vat_exempt: !!b.vat_exempt,
      decision: b.decision || 'Pending',
      advance_basis: basis,
      advance_amount: advance,
      advance_percent: advTotal > 0 ? Math.round((advance / advTotal) * 1000) / 10 : 0,
    }, { transaction });

    // Draft the work order straight away when the client is already covered by a
    // signed agreement, or when the operator explicitly asked for it.
    let workOrder = null;
    const wantsWo = b.draft_work_order !== false
      && (position.has_signed_agreement || b.agreement_choice === 'continue');
    if (wantsWo) {
      const { createFromQuotation } = require('../services/wtWorkOrder.service');
      workOrder = await createFromQuotation(quote, {
        branchId, actor: req.user?.name || 'Operations', transaction,
      }).catch((e) => { console.warn('[waterTank] draft WO from quote:', e.message); return null; });
    }

    return { quote, workOrder };
  });

  res.status(201).json({
    quote: out.quote,
    work_order: out.workOrder,
    agreement: position,
    next: position.has_signed_agreement
      ? 'Covered by the existing agreement — work order drafted.'
      : 'No signed agreement on file. Raise one before work commences (Sec. 7 Step 6).',
  });
});

/*
 * Quotation decision — a NAMED action, replacing the generic PATCH that let any
 * caller set `decision` (and anything else on the row) with no validation.
 *
 * Sec. 7 Step 5: the decision is what turns a priced offer into a commitment,
 * so it validates the target state, refuses to move a quotation that is already
 * bound to a signed agreement, and records who decided.
 */
const QUOTE_DECISIONS = ['Pending', 'Sent', 'Approved', 'Rejected'];

exports.setDecision = asyncHandler(async (req, res) => {
  const scope = scoped(req);
  const key = req.params.id;
  const quote = await M.WtQuotation.findOne({
    where: { ...scope, [Op.or]: [{ id: Number.isNaN(Number(key)) ? -1 : Number(key) }, { code: key }] },
  });
  if (!quote) return res.status(404).json({ error: 'Quotation not found.' });

  const decision = String(req.body?.decision || '').trim();
  const match = QUOTE_DECISIONS.find((d) => d.toLowerCase() === decision.toLowerCase());
  if (!match) {
    return res.status(400).json({ error: `Unknown decision "${decision}".`, allowed: QUOTE_DECISIONS });
  }

  // Once an agreement has been raised from a quotation, its commercial terms are
  // what the client signed. Re-deciding it would leave the two disagreeing.
  if (quote.agreement_envelope_id && !['approved'].includes(match.toLowerCase())) {
    return res.status(409).json({
      error: `${quote.code} is already bound to a signed agreement and cannot be re-decided.`,
      hint: 'Void the agreement first, or raise a revised quotation.',
    });
  }

  await quote.update({ decision: match });

  // Approval is where a project opens — the engagement is now won. Before this the
  // request, assessment and quotation existed without a project; here we open (or
  // reuse the client's existing open) project and attach the whole chain to it.
  if (match.toLowerCase() === 'approved') {
    const identity = require('../services/wtIdentity.service');
    const client = await M.WtClient.findOne({
      where: { ...scope, [Op.or]: [{ code: quote.client_code || ' ' }, { name: quote.client_name }] },
    }) || { code: quote.client_code, name: quote.client_name };
    // Repeat jobs STACK under the client's one ongoing project: an explicit link
    // wins, else the client's existing OPEN project is reused, else a fresh one is
    // opened (client has none, or their last project was closed). No forceNew — a
    // new quotation joins the running engagement rather than opening a parallel one.
    const project = await identity.ensureProject(quote.branch_id, client, {
      project_id: quote.project_id || undefined,
      service_line: quote.service_line || resolveServiceLine(req),
      // Omit title so ensureProject derives the service-line label (AC vs Water Tank).
      stage: 'Agreement',
      detail: `Opened on approval of quotation ${quote.code}`,
    });
    if (project && project.code) {
      await quote.update({ project_id: project.code });
      if (quote.source_assessment) {
        await M.WtSiteAssessment.update({ project_id: project.code }, { where: { ...scope, code: quote.source_assessment } }).catch(() => {});
      }
      await M.WtServiceRequest.update({ project_id: project.code }, { where: { ...scope, quotation_code: quote.code } }).catch(() => {});
      const timeline = (() => { try { return JSON.parse(project.timeline) || []; } catch { return Array.isArray(project.timeline) ? project.timeline : []; } })();
      timeline.push({ title: 'Quotation approved — project opened', detail: `${quote.code} approved`, at: new Date().toISOString(), by: req.user?.name || req.user?.email || 'Client Service' });
      await M.WtProject.update({ timeline, stage: 'Agreement' }, { where: { ...scope, code: project.code } }).catch(() => {});
    }
  }

  // The decision is worth a trace even without dedicated audit columns.
  await M.WtCommLog.create({
    branch_id: quote.branch_id,
    client_name: quote.client_name,
    channel: 'note',
    direction: 'outbound',
    summary: `Quotation ${quote.code} → ${match}`,
    ref_type: 'quotations',
    ref_code: quote.code,
    logged_at: new Date(),
  }).catch(() => { /* the decision stands even if the note fails */ });

  res.json(quote);
});

/**
 * Delete a quotation. Only ever a draft-stage clean-up: anything sent, approved
 * or bound to an agreement is part of the commercial record and must be
 * superseded rather than erased.
 */
exports.removeQuotation = asyncHandler(async (req, res) => {
  const scope = scoped(req);
  const key = req.params.id;
  const quote = await M.WtQuotation.findOne({
    where: { ...scope, [Op.or]: [{ id: Number.isNaN(Number(key)) ? -1 : Number(key) }, { code: key }] },
  });
  if (!quote) return res.status(404).json({ error: 'Quotation not found.' });

  const blocking = [];
  if (quote.agreement_envelope_id) blocking.push('an agreement has been raised from it');
  if (quote.work_order_code) blocking.push(`work order ${quote.work_order_code} references it`);
  if (String(quote.decision || '').toLowerCase() === 'approved') blocking.push('it has been approved');
  if (quote.sent_at) blocking.push('it has already been sent to the client');
  if (blocking.length) {
    return res.status(409).json({
      error: `${quote.code} cannot be deleted because ${blocking.join(', and ')}.`,
      hint: 'Raise a revised quotation instead — the commercial record must stay intact.',
    });
  }

  await quote.destroy();
  res.json({ ok: true });
});

exports.builder = asyncHandler(async (req, res) => {
  const scope = scoped(req);
  const key = req.params.assessmentId;
  const byKey = (k) => ({ [Op.or]: [{ id: Number.isNaN(Number(k)) ? -1 : Number(k) }, { code: k }] });

  let assessment = await M.WtSiteAssessment.findOne({ where: { ...scope, ...byKey(key) } });

  // The builder is also reachable from a quotation that has no assessment
  // behind it (Q-1048 and friends, raised before the builder existed). In that
  // case we synthesise just enough of an assessment header to edit against.
  let standalone = null;
  if (!assessment) {
    standalone = await M.WtQuotation.findOne({ where: { ...scope, ...byKey(key) } });
    if (!standalone) return res.status(404).json({ error: 'Assessment or quotation not found' });
  }

  const a = assessment ? assessment.toJSON() : {
    id: null,
    code: standalone.source_assessment || null,
    client_name: standalone.client_name,
    project_id: standalone.project_id,
    recommended_services: [],
    variations: [],
    standalone_quote: standalone.code,
  };

  const [client, catalogRows, existing, branding] = await Promise.all([
    M.WtClient.findOne({ where: { ...scope, name: a.client_name }, raw: true }),
    // Schedule C of the Customer Service Agreement — the standard price schedule.
    // ServiceItem (care_services) is separated by `vertical`, NOT service_line, so
    // it must be scoped by branch + vertical — never the full service scope.
    ServiceItem.findAll({
      where: { ...branchScope(req), vertical: catalogueVertical(req) },
      order: [['sort_order', 'ASC'], ['code', 'ASC']],
      raw: true,
    }),
    standalone || M.WtQuotation.findOne({ where: { ...scope, client_name: a.client_name, source_assessment: a.code } }),
    getBranding(),
  ]);

  // Schedule C groups live in tags.group ('service' | 'material' | 'labour'),
  // matching how the Customer Service Agreement reads the same catalogue.
  const GROUP_LABEL = { service: 'Services', material: 'Materials', labour: 'Labour' };
  const catalog = catalogRows.map((i) => {
    let tags = i.tags;
    if (typeof tags === 'string') { try { tags = JSON.parse(tags); } catch { tags = {}; } }
    const g = (tags || {}).group || 'service';
    return {
      id: i.id,
      code: i.code,
      name: i.name,
      group: GROUP_LABEL[g] || 'Services',
      group_key: g,
      unit: i.unit || null,
      standard_price: num(i.base_price),
      description: i.description || null,
    };
  });

  // the assessor's recommendations, matched to catalogue entries by name
  const recommended = (() => {
    const raw = a.recommended_services;
    const list = Array.isArray(raw) ? raw : (() => { try { return JSON.parse(raw || '[]'); } catch { return []; } })();
    return list.map((label) => {
      const hit = catalog.find((c) => c.name.toLowerCase().includes(String(label).toLowerCase())
        || String(label).toLowerCase().includes(c.name.toLowerCase()));
      return { label, match: hit || null };
    });
  })();

  // variations found on site become suggested extra fee lines
  const variations = (() => {
    const raw = a.variations;
    const list = Array.isArray(raw) ? raw : (() => { try { return JSON.parse(raw || '[]'); } catch { return []; } })();
    return list.filter((v) => v.item).map((v) => ({ label: v.item, reason: v.reason, estimate: num(v.estimate) }));
  })();

  res.json({
    assessment: a,
    client: client || null,
    catalog,
    groups: [...new Set(catalog.map((c) => c.group))],
    recommended,
    variations,
    existing_quotation: existing ? existing.toJSON() : null,
    branding,
    vat_rate: VAT_RATE,
  });
});

/* ═══ SAVE ════════════════════════════════════════════════════ */

/**
 * POST /wt-quotes/from-assessment/:assessmentId — create or update the
 * quotation for an assessment. Idempotent per assessment: saving again
 * updates the same quotation rather than raising a second one.
 */
exports.save = asyncHandler(async (req, res) => {
  const scope = scoped(req);
  const branchId = resolveBranchId(req);
  const key = req.params.assessmentId;
  const byKey = (k) => ({ [Op.or]: [{ id: Number.isNaN(Number(k)) ? -1 : Number(k) }, { code: k }] });
  const assessment = await M.WtSiteAssessment.findOne({ where: { ...scope, ...byKey(key) } });

  // editing a quotation that was never raised from an assessment
  const standalone = assessment ? null : await M.WtQuotation.findOne({ where: { ...scope, ...byKey(key) } });
  if (!assessment && !standalone) return res.status(404).json({ error: 'Assessment or quotation not found' });

  const lines = Array.isArray(req.body.lines) ? req.body.lines : [];
  if (!lines.length) return res.status(400).json({ error: 'Add at least one service or fee to the quotation.' });

  const totals = computeTotals(lines, req.body);
  const owner = assessment || standalone;
  const payload = {
    client_name: owner.client_name,
    project_id: owner.project_id || null,
    source_assessment: assessment ? assessment.code : (standalone.source_assessment || null),
    lines,
    ...totals,
    validity: req.body.validity || '15 Days',
    notes: req.body.notes || null,
    payment_terms: req.body.payment_terms || null,
    vat_exempt: !!req.body.vat_exempt,
    decision: req.body.decision || 'Pending',
    // Structured advance (migration 0078). Recomputed against the authoritative
    // server-side total so the stored figure can never exceed the contract or
    // disagree with what the Customer Service Agreement will quote.
    ...(() => {
      const total = Number(totals.total || 0);
      const basis = req.body.advance_basis === 'amount' ? 'amount' : 'percent';
      const raw = basis === 'amount'
        ? Number(req.body.advance_amount || 0)
        : Math.round((total * Number(req.body.advance_percent || 0)) / 100);
      const amount = Math.max(0, Math.min(raw, total));
      return {
        advance_basis: basis,
        advance_amount: amount,
        advance_percent: total > 0 ? Math.round((amount / total) * 1000) / 10 : 0,
      };
    })(),
  };

  let quote = standalone || await M.WtQuotation.findOne({ where: { ...scope, source_assessment: assessment.code } });
  if (quote) {
    await quote.update(payload);
    // Keep any draft work order raised from this quote in step with the edit.
    const { refreshDraftFromQuotation } = require('../services/wtWorkOrder.service');
    await refreshDraftFromQuotation(quote, { branchId }).catch((e) => console.warn('[waterTank] sync draft WO from quote:', e.message));
  } else {
    const quoteCode = await nextCode('quotations', branchId, undefined, resolveServiceLine(req));
    quote = await M.WtQuotation.create({ ...payload, branch_id: branchId, service_line: resolveServiceLine(req), code: quoteCode });

    // keep the assessment and its project in step
    if (assessment) await assessment.update({ status: assessment.status === 'Scheduled' ? 'Completed' : assessment.status });
    if (assessment && assessment.project_id) {
      const project = await M.WtProject.findOne({ where: { ...scope, code: assessment.project_id } });
      if (project) {
        const timeline = (() => { try { return JSON.parse(project.timeline) || []; } catch { return Array.isArray(project.timeline) ? project.timeline : []; } })();
        timeline.push({
          title: 'Quotation raised', detail: `${assessment.code} → ${quote.code} (${money(totals.total)})`,
          at: new Date().toISOString(), by: req.user?.name || req.user?.email || 'Operations',
        });
        await project.update({ timeline, stage: 'Quotation' });
      }
    }
    await M.WtCommLog.create({
      branch_id: branchId, client_name: assessment.client_name, channel: 'note', direction: 'outbound',
      summary: assessment
        ? `Quotation ${quote.code} raised from assessment ${assessment.code} — ${money(totals.total)}`
        : `Quotation ${quote.code} raised — ${money(totals.total)}`,
      ref_type: 'quotations', ref_code: quote.code, logged_at: new Date(),
    });
  }

  res.json(quote);
});

/* ═══ DOCUMENT ════════════════════════════════════════════════ */

async function quoteContext(req, id) {
  const scope = scoped(req);
  const quote = await M.WtQuotation.findOne({
    where: { ...scope, [Op.or]: [{ id: Number.isNaN(Number(id)) ? -1 : Number(id) }, { code: id }] },
  });
  if (!quote) return null;
  const q = quote.toJSON();
  const [client, branding] = await Promise.all([
    M.WtClient.findOne({ where: { ...scope, name: q.client_name }, raw: true }),
    getBranding(),
  ]);
  const lines = Array.isArray(q.lines) ? q.lines : (() => { try { return JSON.parse(q.lines || '[]'); } catch { return []; } })();
  return { quote: q, model: quote, client, branding, lines };
}

/** Branded, print-ready quotation document. */
function renderQuotationHtml({ quote, client, branding, lines }) {
  const services = lines.filter((l) => l.kind !== 'fee');
  const fees = lines.filter((l) => l.kind === 'fee');
  const lineTotal = (l) => num(l.price) * (num(l.qty) || 1);
  const dateStr = (d) => (d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '');

  const row = (l, i) => `
    <tr>
      <td class="n">${i + 1}</td>
      <td class="c">${esc(l.code || '—')}</td>
      <td>
        <strong>${esc(l.name)}</strong>
        ${l.description ? `<div class="sub">${esc(l.description)}</div>` : ''}
        ${num(l.standard_price) > 0 && num(l.standard_price) !== num(l.price)
          ? `<div class="sub adj">Standard ${money(l.standard_price)} · agreed ${money(l.price)}</div>` : ''}
      </td>
      <td class="u">${esc(l.unit || '—')}</td>
      <td class="q">${num(l.qty) || 1}</td>
      <td class="p">${money(l.price)}</td>
      <td class="t">${money(lineTotal(l))}</td>
    </tr>`;

  const section = (title, rows, startIndex) => (rows.length ? `
    <tr class="grp"><td colspan="7">${esc(title)}</td></tr>
    ${rows.map((l, i) => row(l, startIndex + i)).join('')}` : '');

  const totalRow = (label, value, cls = '') => (num(value) !== 0
    ? `<tr class="${cls}"><td>${esc(label)}</td><td class="v">${money(value)}</td></tr>` : '');

  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8" /><title>Quotation ${esc(quote.code)}</title>
<style>
  *{box-sizing:border-box}
  body{margin:0;font-family:Arial,Helvetica,sans-serif;color:#0f172a;font-size:12px;background:#fff}
  .page{padding:0}
  .hd{display:flex;align-items:flex-start;gap:14px;border-bottom:4px solid ${branding.primary};padding-bottom:14px}
  .logo{width:52px;height:52px;border-radius:12px;background:linear-gradient(135deg,${branding.accent},${branding.primary});color:#fff;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:19px;flex:none}
  .logo img{width:100%;height:100%;object-fit:contain;border-radius:12px}
  .brand .nm{font-size:18px;font-weight:800;color:${branding.accent}}
  .brand .tg{font-size:11px;color:#64748b;margin-top:2px}
  .brand .cx{font-size:10px;color:#64748b;margin-top:5px;line-height:1.6}
  .doc{margin-left:auto;text-align:right;flex:none}
  .doc .ti{font-size:20px;font-weight:800;color:${branding.accent};letter-spacing:.5px}
  .doc .no{font-size:13px;font-weight:700;color:${branding.primary};margin-top:2px}
  .doc .dt{font-size:10.5px;color:#64748b;margin-top:4px;line-height:1.6}
  .meta{display:flex;gap:14px;margin:16px 0}
  .box{flex:1;border:1px solid #e2e8f0;border-radius:8px;padding:11px 13px}
  .box h4{margin:0 0 6px;font-size:9.5px;text-transform:uppercase;letter-spacing:.8px;color:${branding.primary}}
  .box .l{font-size:12px;line-height:1.65;color:#334155}
  .box .l strong{color:#0f172a}
  table{width:100%;border-collapse:collapse;margin-top:4px}
  thead th{background:${branding.accent};color:#fff;font-size:10px;text-transform:uppercase;letter-spacing:.5px;padding:8px 9px;text-align:left}
  tbody td{padding:9px;border-bottom:1px solid #e2e8f0;vertical-align:top}
  tbody tr.grp td{background:#f1f5f9;font-weight:800;font-size:10px;text-transform:uppercase;letter-spacing:.6px;color:${branding.accent};padding:6px 9px}
  td.n{width:26px;color:#94a3b8}
  td.c{width:78px;font-family:monospace;font-size:10.5px;color:${branding.primary};font-weight:700}
  td.u{width:74px;color:#64748b}
  td.q{width:42px;text-align:center}
  td.p{width:92px;text-align:right}
  td.t{width:100px;text-align:right;font-weight:700}
  .sub{font-size:10px;color:#64748b;margin-top:2px}
  .sub.adj{color:${branding.primary}}
  .tot{margin-left:auto;width:300px;margin-top:14px}
  .tot table{border:1px solid #e2e8f0;border-radius:8px;overflow:hidden}
  .tot td{padding:7px 12px;font-size:12px;border-bottom:1px solid #f1f5f9}
  .tot td.v{text-align:right;font-weight:700}
  .tot tr.disc td{color:#059669}
  .tot tr.grand td{background:${branding.accent};color:#fff;font-size:14px;font-weight:800;border:0}
  .terms{margin-top:20px;border-top:1px solid #e2e8f0;padding-top:12px}
  .terms h4{margin:0 0 6px;font-size:10px;text-transform:uppercase;letter-spacing:.7px;color:${branding.accent}}
  .terms p,.terms li{font-size:10.5px;color:#475569;line-height:1.7;margin:0 0 4px}
  .terms ul{margin:0;padding-left:16px}
  .sign{display:flex;gap:40px;margin-top:26px}
  .sign div{flex:1;border-top:1px solid #94a3b8;padding-top:6px;font-size:10.5px;color:#64748b}
  .ft{margin-top:22px;border-top:2px solid ${branding.primary};padding-top:9px;text-align:center;font-size:9.5px;color:#94a3b8;line-height:1.6}
</style></head>
<body><div class="page">

  <div class="hd">
    <div class="logo">${branding.logo_url ? `<img src="${esc(branding.logo_url)}" alt="" />` : '7S'}</div>
    <div class="brand">
      <div class="nm">${esc(branding.name)}</div>
      <div class="tg">${esc(branding.tagline)}</div>
      <div class="cx">${branding.contact_lines.map((c) => `${esc(c.label)}: ${esc(c.value)}`).join(' &nbsp;|&nbsp; ')}</div>
    </div>
    <div class="doc">
      <div class="ti">QUOTATION</div>
      <div class="no">${esc(quote.code)}</div>
      <div class="dt">
        Date: ${dateStr(quote.createdAt || new Date())}<br />
        Valid for: ${esc(quote.validity || '15 Days')}
        ${quote.project_id ? `<br />Project: ${esc(quote.project_id)}` : ''}
      </div>
    </div>
  </div>

  <div class="meta">
    <div class="box">
      <h4>Quotation For</h4>
      <div class="l">
        <strong>${esc(quote.client_name)}</strong><br />
        ${client?.service_address ? `${esc(client.service_address)}<br />` : ''}
        ${client?.district ? `${esc(client.district)}<br />` : ''}
        ${client?.mobile ? `Mobile: ${esc(client.mobile)}<br />` : ''}
        ${client?.email ? `Email: ${esc(client.email)}` : ''}
      </div>
    </div>
    <div class="box">
      <h4>Service Details</h4>
      <div class="l">
        ${client?.property_type ? `Property: <strong>${esc(client.property_type)}</strong><br />` : ''}
        ${client?.tank_type ? `Tank: <strong>${esc(client.tank_type)}</strong>${client.tank_capacity ? ` · ${esc(client.tank_capacity)}` : ''}<br />` : ''}
        ${num(client?.tanks_count) > 0 ? `Number of tanks: <strong>${num(client.tanks_count)}</strong><br />` : ''}
        ${quote.source_assessment ? `Site assessment: <strong>${esc(quote.source_assessment)}</strong>` : ''}
      </div>
    </div>
  </div>

  <table>
    <thead><tr>
      <th>#</th><th>Code</th><th>Description</th><th>Unit</th><th style="text-align:center">Qty</th>
      <th style="text-align:right">Rate</th><th style="text-align:right">Amount</th>
    </tr></thead>
    <tbody>
      ${section('Services', services, 0)}
      ${section('Additional Fees & Materials', fees, services.length)}
      ${!lines.length ? '<tr><td colspan="7" style="text-align:center;color:#94a3b8;padding:20px">No items on this quotation.</td></tr>' : ''}
    </tbody>
  </table>

  <div class="tot"><table>
    ${totalRow('Service charges', quote.service_charges)}
    ${totalRow('Additional fees', quote.other_fees)}
    ${totalRow('Provider allocation fee', quote.provider_allocation_fee)}
    ${num(quote.discount) ? `<tr class="disc"><td>Discount</td><td class="v">- ${money(quote.discount)}</td></tr>` : ''}
    ${quote.vat_exempt
      ? '<tr><td>VAT</td><td class="v">Exempt</td></tr>'
      : totalRow(`VAT &amp; processing (${Math.round(VAT_RATE * 100)}%)`, quote.vat)}
    <tr class="grand"><td>Total Payable</td><td class="v">${money(quote.total)}</td></tr>
    ${num(quote.advance_amount) ? `
    <tr><td><strong>Advance on acceptance (${num(quote.advance_percent)}%)</strong></td><td class="v"><strong>${money(quote.advance_amount)}</strong></td></tr>
    <tr><td>Balance on completion</td><td class="v">${money(num(quote.total) - num(quote.advance_amount))}</td></tr>` : ''}
  </table></div>

  <div class="terms">
    <h4>Terms &amp; Conditions</h4>
    ${quote.payment_terms ? `<p><strong>Payment:</strong> ${esc(quote.payment_terms)}</p>` : ''}
    ${num(quote.advance_amount) ? `<p><strong>Advance:</strong> ${money(quote.advance_amount)} (${num(quote.advance_percent)}%) is payable on acceptance of this quotation. Work commences once the advance is received; the balance of ${money(num(quote.total) - num(quote.advance_amount))} falls due on practical completion.</p>` : ''}
    <ul>
      <li>This quotation is valid for ${esc(quote.validity || '15 Days')} from the date of issue.</li>
      <li>Work commences only after the Customer Service Agreement is signed by both parties.</li>
      <li>Prices are inclusive of labour and standard consumables unless stated otherwise.</li>
      <li>Variations discovered during works will be quoted separately and require written approval.</li>
      <li>All work is carried out to ${esc(branding.name)} safety and hygiene standards.</li>
    </ul>
    ${quote.notes ? `<p style="margin-top:8px"><strong>Notes:</strong> ${esc(quote.notes)}</p>` : ''}
  </div>

  <div class="sign">
    <div>For and on behalf of<br /><strong style="color:#0f172a">${esc(branding.name)}</strong></div>
    <div>Accepted by the Client<br /><strong style="color:#0f172a">${esc(quote.client_name)}</strong></div>
  </div>

  <div class="ft">
    ${esc(branding.name)}${branding.trade_licence ? ` · Trade Licence ${esc(branding.trade_licence)}` : ''}${branding.bin ? ` · BIN ${esc(branding.bin)}` : ''}
    <br />This is a computer-generated quotation. For queries contact ${esc(branding.email || branding.phone)}.
  </div>

</div></body></html>`;
}

/** GET /wt-quotes/:id/document — branded HTML for preview / PDF rendering. */
exports.document = asyncHandler(async (req, res) => {
  const ctx = await quoteContext(req, req.params.id);
  if (!ctx) return res.status(404).json({ error: 'Quotation not found' });
  const html = renderQuotationHtml(ctx);
  if (req.query.format === 'html') { res.type('html').send(html); return; }
  res.json({ quote: ctx.quote, client: ctx.client, branding: ctx.branding, html });
});

/* ═══ EMAIL ═══════════════════════════════════════════════════ */

/** The branded covering email the client actually receives. */
function renderEmailHtml({ quote, client, branding, message }) {
  const year = new Date().getFullYear();
  const contact = branding.contact_lines
    .map((c) => `<span style="white-space:nowrap">${esc(c.label)}: <strong style="color:#0f172a">${esc(c.value)}</strong></span>`)
    .join('<span style="color:#cbd5e1"> &nbsp;•&nbsp; </span>');

  return `<!DOCTYPE html><html><head><meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" /></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:26px 12px">
<tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 2px 12px rgba(15,23,42,.08)">

  <tr><td style="background:linear-gradient(135deg,${branding.accent},${branding.primary});padding:26px 30px">
    <table role="presentation" width="100%"><tr>
      <td>
        <div style="font-size:20px;font-weight:800;color:#fff;letter-spacing:.3px">${esc(branding.name)}</div>
        <div style="font-size:12px;color:rgba(255,255,255,.82);margin-top:3px">${esc(branding.tagline)}</div>
      </td>
      <td align="right" style="color:#fff">
        <div style="font-size:11px;text-transform:uppercase;letter-spacing:1px;opacity:.8">Quotation</div>
        <div style="font-size:17px;font-weight:800">${esc(quote.code)}</div>
      </td>
    </tr></table>
  </td></tr>

  <tr><td style="padding:30px">
    <p style="margin:0 0 14px;font-size:15px;color:#0f172a">Dear ${esc(client?.name || quote.client_name)},</p>
    <p style="margin:0 0 16px;font-size:14px;line-height:1.7;color:#334155">
      ${message ? esc(message).replace(/\n/g, '<br />') : `Thank you for your enquiry. Please find attached our quotation for the water tank services at your property, prepared following our site assessment.`}
    </p>

    <table role="presentation" width="100%" style="border:1px solid #e2e8f0;border-radius:10px;margin:18px 0">
      <tr><td style="padding:16px 18px">
        <table role="presentation" width="100%" style="font-size:13px;color:#475569">
          <tr><td style="padding:4px 0">Quotation number</td><td align="right" style="font-weight:700;color:#0f172a">${esc(quote.code)}</td></tr>
          <tr><td style="padding:4px 0">Valid for</td><td align="right" style="font-weight:700;color:#0f172a">${esc(quote.validity || '15 Days')}</td></tr>
          <tr><td style="padding:10px 0 0;border-top:1px solid #e2e8f0;font-size:15px;color:#0f172a;font-weight:700">Total payable</td>
              <td align="right" style="padding:10px 0 0;border-top:1px solid #e2e8f0;font-size:19px;font-weight:800;color:${branding.accent}">${money(quote.total)}</td></tr>
        </table>
      </td></tr>
    </table>

    <p style="margin:0 0 6px;font-size:13.5px;line-height:1.7;color:#334155">
      The full quotation is attached as a PDF. Once you are happy to proceed, we will prepare the
      Customer Service Agreement for signature — work begins only after that is signed.
    </p>
    <p style="margin:16px 0 0;font-size:13.5px;line-height:1.7;color:#334155">
      If anything needs adjusting, reply to this email or call us and we will revise it.
    </p>

    <p style="margin:22px 0 0;font-size:14px;color:#0f172a">
      Kind regards,<br /><strong>${esc(branding.name)}</strong>
    </p>
  </td></tr>

  <tr><td style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:18px 30px">
    <div style="font-size:11.5px;color:#64748b;line-height:1.9">${contact}</div>
  </td></tr>

  <tr><td style="background:${branding.accent};padding:14px 30px;text-align:center">
    <div style="font-size:11px;color:rgba(255,255,255,.75)">
      &copy; ${year} ${esc(branding.name)}${branding.trade_licence ? ` &nbsp;•&nbsp; Trade Licence ${esc(branding.trade_licence)}` : ''}
    </div>
  </td></tr>

</table>
</td></tr></table>
</body></html>`;
}

/* ═══ AGREEMENT HAND-OFF ══════════════════════════════════════ */

/**
 * GET /wt-quotes/:id/agreement-draft
 * Everything needed to pre-fill the Customer Service Agreement from this
 * quotation. The agreement itself is still built and sent by the existing
 * /wt-agreements/customer flow — this only supplies the draft, so there is
 * one agreement engine, not two.
 */
exports.agreementDraft = asyncHandler(async (req, res) => {
  const ctx = await quoteContext(req, req.params.id);
  if (!ctx) return res.status(404).json({ error: 'Quotation not found' });
  const { quote, client, lines } = ctx;

  const assessment = quote.source_assessment
    ? await M.WtSiteAssessment.findOne({ where: { ...scoped(req), code: quote.source_assessment }, raw: true })
    : null;

  // quotation lines → the agreement's pricing_input.selected shape
  const selected = lines
    .filter((l) => l.kind !== 'fee' && l.code)
    .map((l) => ({ code: l.code, qty: num(l.qty) || 1, agreed_price: num(l.price) }));

  // Fees that aren't catalogue items ride along as the agreement's "transport /
  // other" figure. The provider allocation fee goes here too — without it the
  // agreement's contract value would come out lower than the quoted total.
  const feeTotal = lines.filter((l) => l.kind === 'fee')
    .reduce((s, l) => s + num(l.price) * (num(l.qty) || 1), 0)
    + num(quote.provider_allocation_fee);

  res.json({
    quote,
    draft: {
      related_id: quote.id,
      client: {
        full_name: quote.client_name,
        email: client?.email || '',
        phone: client?.mobile || '',
        address: client?.service_address || '',
        nid: '',
      },
      property: {
        address: client?.service_address || '',
        type: client?.property_type || '',
        tank_type: assessment?.tank_type || client?.tank_type || '',
        tank_capacity: assessment?.tank_capacity || client?.tank_capacity || '',
        tanks_count: num(client?.tanks_count) || 1,
      },
      project: {
        summary: assessment
          ? `Water tank services at ${client?.service_address || quote.client_name}, following site assessment ${assessment.code}.`
          : `Water tank services for ${quote.client_name}.`,
        scope: assessment?.findings || '',
        start_date: addDays(7),
        duration: '',
      },
      pricing_input: {
        selected,
        transport: feeTotal,
        govt_fees: 0,
        discount: num(quote.discount),
        vat_percent: quote.vat_exempt ? 0 : Math.round(VAT_RATE * 100),
        // The advance the client already accepted on the quotation. Carried as an
        // amount, not a percentage, so the agreement quotes the same figure even
        // if the agreement's totals differ slightly from the quoted ones.
        advance_amount: num(quote.advance_amount) || null,
        advance_percent: num(quote.advance_percent) || null,
      },
      // Schedule B references — system generated, never typed.
      schedule_b: {
        project_no: quote.project_id || '',
        quotation_no: quote.code,
        work_order_no: '',
        property_address: client?.service_address || '',
        property_type: client?.property_type || '',
        tank_type: assessment?.tank_type || client?.tank_type || '',
        tank_capacity: assessment?.tank_capacity || client?.tank_capacity || '',
        tanks_count: num(client?.tanks_count) || '',
        scope: assessment?.findings || '',
        start_date: addDays(7),
      },
      quotation_ref: quote.code,
      assessment_ref: quote.source_assessment || null,
    },
  });
});

/** POST /wt-quotes/:id/link-agreement — remember which envelope came from this quote. */
exports.linkAgreement = asyncHandler(async (req, res) => {
  const ctx = await quoteContext(req, req.params.id);
  if (!ctx) return res.status(404).json({ error: 'Quotation not found' });

  await ctx.model.update({
    agreement_envelope_id: req.body.envelope_id || null,
    agreement_code: req.body.envelope_code || null,
    decision: 'Approved',
  });

  const client = await M.WtClient.findOne({ where: { ...scoped(req), name: ctx.quote.client_name } });
  if (client) {
    await client.update({
      agreement_status: 'Sent',
      agreement_code: req.body.envelope_code || client.agreement_code,
      agreement_envelope_id: req.body.envelope_id || client.agreement_envelope_id,
      workflow_stage: 'Agreement Signing',
      stage_updated_at: new Date(),
    });
    await M.WtClientEvent.create({
      branch_id: resolveBranchId(req), client_id: client.id, event_type: 'agreement',
      title: 'Customer Service Agreement sent for signature',
      detail: `${req.body.envelope_code || 'Agreement'} raised from quotation ${ctx.quote.code}`,
      actor: req.user?.name || req.user?.email || 'Operations', occurred_at: new Date(),
    });
  }

  await M.WtCommLog.create({
    branch_id: resolveBranchId(req), client_name: ctx.quote.client_name,
    channel: 'email', direction: 'outbound',
    summary: `Customer Service Agreement ${req.body.envelope_code || ''} sent for signature (from ${ctx.quote.code})`,
    ref_type: 'agreements', ref_code: req.body.envelope_code || null, logged_at: new Date(),
  });

  res.json({ ok: true });
});

/** GET /wt-quotes/:id/email-preview — see the covering email before sending. */
exports.emailPreview = asyncHandler(async (req, res) => {
  const ctx = await quoteContext(req, req.params.id);
  if (!ctx) return res.status(404).json({ error: 'Quotation not found' });
  const html = renderEmailHtml({ ...ctx, message: req.query.message });
  res.json({
    to: ctx.client?.email || null,
    subject: `Quotation ${ctx.quote.code} — ${ctx.branding.name}`,
    html,
    client_name: ctx.quote.client_name,
  });
});

/**
 * POST /wt-quotes/:id/send — email the quotation to the client.
 * The PDF is rendered in the browser (same renderer as the download, so the
 * attachment is byte-identical to what the operator previewed) and posted here
 * as base64.
 */
exports.send = asyncHandler(async (req, res) => {
  const ctx = await quoteContext(req, req.params.id);
  if (!ctx) return res.status(404).json({ error: 'Quotation not found' });

  const to = (req.body.to || ctx.client?.email || '').trim();
  if (!to) return res.status(400).json({ error: 'No client email address. Add one on the client record or type one in.' });
  if (!req.body.pdf_base64) return res.status(400).json({ error: 'The PDF was not generated. Try again.' });

  const subject = req.body.subject || `Quotation ${ctx.quote.code} — ${ctx.branding.name}`;
  const html = renderEmailHtml({ ...ctx, message: req.body.message });
  const attachments = [{
    filename: `Quotation-${ctx.quote.code}.pdf`,
    content: Buffer.from(String(req.body.pdf_base64).replace(/^data:[^,]+,/, ''), 'base64'),
    contentType: 'application/pdf',
  }];

  try {
    await sendEmail(to, subject, html, attachments, 'info');
  } catch (e) {
    return res.status(502).json({ error: `Could not send the email: ${e.message}. Check the SMTP settings.` });
  }

  await ctx.model.update({
    decision: ['Pending', 'Draft'].includes(ctx.quote.decision) ? 'Sent' : ctx.quote.decision,
    sent_at: new Date(),
    sent_to: to,
  });
  await M.WtCommLog.create({
    branch_id: resolveBranchId(req),
    client_name: ctx.quote.client_name, channel: 'email', direction: 'outbound',
    summary: `Quotation ${ctx.quote.code} emailed to ${to} — ${money(ctx.quote.total)}`,
    ref_type: 'quotations', ref_code: ctx.quote.code, logged_at: new Date(),
  });

  res.json({ ok: true, to, message: `Quotation sent to ${to}` });
});
