/**
 * wtWorkOrder.service.js — the water-tank work order lifecycle.
 *
 * A work order is raised automatically the moment the Customer Service
 * Agreement is signed (SOP-01 Sec. 7 Step 6 → Sec. 8 Step 7). From then on it
 * carries the delivery stages that drive the progress bar everywhere it appears.
 */
const M = require('../models/waterTankOps');

const num = (v) => Number(v || 0);
const today = () => new Date().toISOString().slice(0, 10);
const addDays = (n) => new Date(Date.now() + n * 864e5).toISOString().slice(0, 10);

/**
 * The delivery stages every water-tank job passes through. Progress is simply
 * how far down this list the job has got — so the bar can never disagree with
 * the record.
 */
const STAGES = [
  { key: 'raised', label: 'Work order raised', weight: 5, sop: 'Sec. 8 Step 7' },
  { key: 'assigned', label: 'Provider assigned', weight: 10, sop: 'Sec. 8 Step 7' },
  { key: 'accepted', label: 'Provider accepted', weight: 10, sop: 'Sec. 7 Step 7' },
  { key: 'scheduled', label: 'Visit scheduled', weight: 10, sop: 'Sec. 8 Step 8' },
  { key: 'attended', label: 'Crew attended site', weight: 15, sop: 'Sec. 8 Step 8' },
  { key: 'work_done', label: 'Service delivered', weight: 25, sop: 'Sec. 8 Step 8' },
  { key: 'reports', label: 'Reports & photos submitted', weight: 10, sop: 'Sec. 8 Step 10' },
  { key: 'verified', label: 'Completion verified', weight: 10, sop: 'Sec. 9 Step 9' },
  { key: 'invoiced', label: 'Invoiced', weight: 5, sop: 'Sec. 9' },
];

const blankStages = () => Object.fromEntries(STAGES.map((s) => [s.key, false]));

const asObject = (v) => {
  if (v && typeof v === 'object' && !Array.isArray(v)) return v;
  if (typeof v === 'string') { try { const p = JSON.parse(v); return p && typeof p === 'object' ? p : {}; } catch { return {}; } }
  return {};
};
const asArray = (v) => {
  if (Array.isArray(v)) return v;
  if (typeof v === 'string') { try { const p = JSON.parse(v); return Array.isArray(p) ? p : []; } catch { return []; } }
  return [];
};

/** Progress = the summed weight of every completed stage. */
function computeProgress(stages) {
  const s = asObject(stages);
  return STAGES.reduce((total, stage) => total + (s[stage.key] ? stage.weight : 0), 0);
}

/**
 * Derive the stage flags from the record itself, so the bar reflects reality
 * even when someone edits a field directly rather than ticking a stage.
 */
function deriveStages(wo) {
  const s = { ...blankStages(), ...asObject(wo.stages) };
  s.raised = true;
  if (wo.provider_name || wo.provider_id) s.assigned = true;
  if (wo.accepted_at) s.accepted = true;
  if (wo.scheduled_date || wo.target_date) s.scheduled = true;
  if (wo.started_at) s.attended = true;
  if (String(wo.status || '').toLowerCase() === 'completed') { s.work_done = true; s.attended = true; }
  if (wo.reports_submitted && wo.photos_collected) s.reports = true;
  if (wo.verified_at) s.verified = true;
  return s;
}

/** Recalculate stages + progress and persist them. */
async function refreshProgress(wo, patch = {}, options = {}) {
  const merged = { ...wo.get({ plain: true }), ...patch };
  const stages = deriveStages(merged);
  const progress = computeProgress(stages);
  await wo.update({ ...patch, stages, progress }, options);
  return wo;
}

async function nextCode(branchId, transaction) {
  const rows = await M.WtWorkOrder.findAll({ where: { branch_id: branchId }, attributes: ['code'], raw: true, transaction });
  let max = 481;
  rows.forEach((r) => {
    const n = parseInt(String(r.code || '').replace('WO-', ''), 10);
    if (!Number.isNaN(n) && n > max) max = n;
  });
  return `WO-${String(max + 1).padStart(4, '0')}`;
}

/**
 * Raise the work order for a signed Customer Service Agreement.
 * Idempotent — an agreement that is somehow completed twice will not produce
 * two work orders.
 */
async function createFromSignedAgreement(envelope, options = {}) {
  const { transaction } = options;
  const branchId = envelope.branch_id || 1;

  const existing = await M.WtWorkOrder.findOne({
    where: { branch_id: branchId, agreement_envelope_id: envelope.id },
    transaction,
  });
  if (existing) return existing;

  // terms carry the pricing summary the agreement was built with
  let terms = envelope.terms;
  if (typeof terms === 'string') { try { terms = JSON.parse(terms); } catch { terms = {}; } }
  const summary = (terms || {}).pricing_summary || {};

  // the quotation this agreement came from, if any
  const quote = await M.WtQuotation.findOne({
    where: { branch_id: branchId, agreement_envelope_id: envelope.id },
    transaction,
  });

  const clientName = (terms?.client?.full_name)
    || (quote && quote.client_name)
    || String(envelope.title || '').split('—').pop().trim();

  const client = clientName
    ? await M.WtClient.findOne({ where: { branch_id: branchId, name: clientName }, transaction })
    : null;

  const lines = quote ? asArray(quote.lines) : [];
  const totalContract = num(summary.total_contract_value) || num(quote?.total);
  const ssFee = num(quote?.provider_allocation_fee);
  const providerFee = Math.max(0, num(quote?.service_charges) || (totalContract - ssFee));

  const stages = { ...blankStages(), raised: true };

  const wo = await M.WtWorkOrder.create({
    branch_id: branchId,
    code: await nextCode(branchId, transaction),
    client_name: clientName || 'Unknown client',
    client_code: client?.code || null,
    client_phone: client?.mobile || terms?.client?.phone || null,
    site_address: client?.service_address || terms?.property?.address || null,
    project_id: quote?.project_id || null,
    category: lines[0]?.name || terms?.project?.summary || 'Water Tank Service',
    scope: terms?.project?.scope || quote?.notes || null,
    special_conditions: quote?.payment_terms || null,
    target_date: terms?.project?.start_date || addDays(7),
    scheduled_date: terms?.project?.start_date || null,
    status: 'Draft',
    provider_fee: providerFee,
    ss_fee: ssFee,
    total_contract: totalContract,
    lines,
    source_quotation: quote?.code || null,
    source_agreement: envelope.envelope_code,
    agreement_envelope_id: envelope.id,
    stages,
    progress: computeProgress(stages),
    payout_status: 'Not Due',
  }, { transaction });

  // keep the client and project file in step
  if (client) {
    await client.update({
      workflow_stage: 'Provider Assignment',
      stage_updated_at: new Date(),
      agreement_status: 'Signed',
      agreement_code: envelope.envelope_code,
      agreement_envelope_id: envelope.id,
      agreement_signed_date: today(),
    }, { transaction });
    await M.WtClientEvent.create({
      branch_id: branchId, client_id: client.id, event_type: 'work_order',
      title: `Work order ${wo.code} raised automatically`,
      detail: `Customer Service Agreement ${envelope.envelope_code} signed — job ready for provider assignment.`,
      actor: 'System', occurred_at: new Date(),
    }, { transaction });
  }

  if (quote) {
    await quote.update({ decision: 'Approved' }, { transaction });
  }

  if (wo.project_id) {
    const project = await M.WtProject.findOne({ where: { branch_id: branchId, code: wo.project_id }, transaction });
    if (project) {
      const timeline = asArray(project.timeline);
      timeline.push({
        title: 'Work order raised on signed agreement',
        detail: `${envelope.envelope_code} → ${wo.code}`,
        at: new Date().toISOString(), by: 'System',
      });
      const linked = asObject(project.linked);
      linked['work-orders'] = { code: wo.code, title: 'Work Order', status: 'Draft' };
      await project.update({ timeline, linked, stage: 'Agreement' }, { transaction });
    }
  }

  await M.WtCommLog.create({
    branch_id: branchId, client_name: wo.client_name, channel: 'note', direction: 'outbound',
    summary: `Work order ${wo.code} raised automatically on signed agreement ${envelope.envelope_code}`,
    ref_type: 'work-orders', ref_code: wo.code, logged_at: new Date(),
  }, { transaction }).catch(() => {});

  return wo;
}

/**
 * Draft a work order straight from a quotation, without waiting for a signature.
 *
 * Used when a quotation is raised directly (Sec. 7 Step 5, no assessment) and the
 * client is already under a signed Customer Service Agreement — that agreement
 * governs the engagement, so re-signing for each job is not required. The order
 * is created as a DRAFT so nothing is dispatched until an operator issues it.
 *
 * Idempotent per quotation.
 */
async function createFromQuotation(quote, { branchId, actor = 'System', transaction } = {}) {
  const bid = branchId || quote.branch_id || 1;
  const existing = await M.WtWorkOrder.findOne({
    where: { branch_id: bid, source_quotation_code: quote.code }, transaction,
  });
  if (existing) return existing;

  const client = quote.client_name
    ? await M.WtClient.findOne({ where: { branch_id: bid, name: quote.client_name }, transaction })
    : null;

  const lines = asArray(quote.lines);
  const total = num(quote.total);
  const ssFee = num(quote.provider_allocation_fee);
  const providerFee = Math.max(0, num(quote.service_charges) || (total - ssFee));
  const stages = { ...blankStages(), raised: true };

  const wo = await M.WtWorkOrder.create({
    branch_id: bid,
    code: await nextCode(bid, transaction),
    client_name: quote.client_name || 'Unknown client',
    client_code: quote.client_code || client?.code || null,
    client_phone: client?.mobile || null,
    site_address: quote.site_address || client?.service_address || null,
    project_id: quote.project_id || null,
    category: lines[0]?.name || 'Water Tank Service',
    scope: quote.notes || null,
    special_conditions: quote.payment_terms || null,
    target_date: addDays(7),
    status: 'Draft',
    provider_fee: providerFee,
    ss_fee: ssFee,
    total_contract: total,
    lines,
    source_quotation: quote.code,
    source_quotation_code: quote.code,
    source_agreement: client?.agreement_code || null,
    agreement_envelope_id: client?.agreement_envelope_id || null,
    stages,
    progress: computeProgress(stages),
    payout_status: 'Not Due',
  }, { transaction });

  await quote.update({ work_order_code: wo.code }, { transaction });

  await M.WtCommLog.create({
    branch_id: bid, client_name: wo.client_name, channel: 'note', direction: 'outbound',
    summary: `Work order ${wo.code} drafted from quotation ${quote.code}`,
    ref_type: 'work-orders', ref_code: wo.code, logged_at: new Date(),
  }, { transaction }).catch(() => {});

  return wo;
}

module.exports = {
  STAGES,
  createFromQuotation,
  blankStages,
  computeProgress,
  deriveStages,
  refreshProgress,
  createFromSignedAgreement,
  asArray,
  asObject,
};
