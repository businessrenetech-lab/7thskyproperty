/**
 * waterTankRegisters.controller.js — warranties, complaints and incidents.
 *
 * All three are records ABOUT a job, and all three used to be captured with the
 * client, work order and project as free text and no property field at all. So
 * a warranty could cover a client who was not the client on the job it came
 * from, and nothing would object.
 *
 * Here the caller chooses a job; the SERVER resolves client, project, property
 * and provider from it. What is left to supply is the part the system genuinely
 * cannot know — what the cover includes, what the client is unhappy about, what
 * happened on site.
 *
 * Complaints additionally record HOW they arrived. One logged by staff at a desk
 * and one raised by a client through their portal are both complaints, and the
 * register has to show which — until now a customer complaint went only to the
 * communication log and never appeared on this screen at all.
 */
const { Op } = require('sequelize');
const { asyncHandler, branchScope, resolveBranchId, serviceScope, resolveServiceLine } = require('../utils/controllerHelpers');
// Branch + service-line scope so each service line sees only its own data.
const scoped = (req) => ({ ...branchScope(req), ...serviceScope(req) });
const M = require('../models/waterTankOps');
const jobs = require('../services/wtJobContext.service');
const identity = require('../services/wtIdentity.service');

const actorOf = (req) => req.user?.name || req.user?.email || 'Operations';
const today = () => new Date().toISOString().slice(0, 10);
/*
 * A DATE column comes back as a Date object, not a 'YYYY-MM-DD' string, so
 * slicing it produces "Wed Jul 01" and every date built from it is invalid.
 * Everything here goes through this rather than assuming which it received.
 */
const isoDate = (v) => {
  if (!v) return null;
  const d = v instanceof Date ? v : new Date(String(v).length === 10 ? `${v}T00:00:00Z` : v);
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
};
/** Cover of N months, counted in months rather than 30-day approximations. */
const addMonths = (v, n) => {
  const base = isoDate(v);
  if (!base) return null;
  const d = new Date(`${base}T00:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + n);
  return d.toISOString().slice(0, 10);
};

/* ── reference data, so the UI never hard-codes a list ─────────────────── */

const WARRANTY_TYPES = [
  'Cleaning & Disinfection', 'Waterproofing', 'Crack Repair', 'Structural Reinforcement',
  'Valve & Fittings', 'Pump Service', 'Filtration System', 'General Workmanship',
];
const WARRANTY_STATUSES = ['Active', 'Expiring', 'Expired', 'Claimed', 'Void'];
/** Typical cover, in months, per warranty type — the form defaults from this. */
const WARRANTY_MONTHS = {
  'Cleaning & Disinfection': 6, Waterproofing: 24, 'Crack Repair': 12,
  'Structural Reinforcement': 24, 'Valve & Fittings': 12, 'Pump Service': 12,
  'Filtration System': 12, 'General Workmanship': 12,
};

const COMPLAINT_TYPES = [
  'Service Quality', 'Water Discolouration', 'Incomplete Work', 'Damage During Service',
  'Staff Conduct', 'Late Attendance', 'Billing Dispute', 'Repeat Fault', 'Other',
];
const COMPLAINT_STATUSES = ['Open', 'Investigating', 'Resolved', 'Closed'];
const INCIDENT_TYPES = ['Injury', 'Contamination', 'Property Damage', 'Environmental', 'Equipment Failure', 'Other'];
const INCIDENT_STATUSES = ['Open', 'Investigating', 'Closed'];
const SEVERITIES = ['Low', 'Medium', 'High', 'Critical'];
/** Sec. 11 — acknowledge within one business day; response time follows severity. */
const SLA_HOURS = { Critical: 4, High: 8, Medium: 24, Low: 48 };

const REGISTERS = {
  warranties: { model: () => M.WtWarranty, label: 'warranty', slug: 'warranties' },
  complaints: { model: () => M.WtComplaint, label: 'complaint', slug: 'complaints' },
  incidents: { model: () => M.WtIncident, label: 'incident', slug: 'incidents' },
};

/** GET /wt-ops/registers/reference — every list the three dialogs need. */
exports.reference = asyncHandler(async (req, res) => {
  const scope = scoped(req);
  const [providers, warranties, complaints, incidents] = await Promise.all([
    M.WtProvider.findAll({ where: scope, attributes: ['id', 'code', 'business_name', 'status'], order: [['business_name', 'ASC']], raw: true }).catch(() => []),
    M.WtWarranty.findAll({ where: scope, attributes: ['status'], raw: true }).catch(() => []),
    M.WtComplaint.findAll({ where: scope, attributes: ['status', 'severity', 'raised_via'], raw: true }).catch(() => []),
    M.WtIncident.findAll({ where: scope, attributes: ['status', 'severity'], raw: true }).catch(() => []),
  ]);

  const is = (rows, key, v) => rows.filter((r) => String(r[key] || '').toLowerCase() === v).length;

  res.json({
    warranty: { types: WARRANTY_TYPES, statuses: WARRANTY_STATUSES, default_months: WARRANTY_MONTHS },
    complaint: { types: COMPLAINT_TYPES, statuses: COMPLAINT_STATUSES, severities: SEVERITIES, sla_hours: SLA_HOURS },
    incident: { types: INCIDENT_TYPES, statuses: INCIDENT_STATUSES, severities: SEVERITIES },
    providers: providers.map((p) => ({ id: p.id, code: p.code, name: p.business_name, status: p.status })),
    summary: {
      warranties: { total: warranties.length, active: is(warranties, 'status', 'active'), claimed: is(warranties, 'status', 'claimed') },
      complaints: {
        total: complaints.length,
        open: complaints.filter((c) => !['resolved', 'closed'].includes(String(c.status || '').toLowerCase())).length,
        // Named so the operator can see how many came from the client directly.
        from_clients: complaints.filter((c) => String(c.raised_via || '') === 'client').length,
      },
      incidents: { total: incidents.length, open: is(incidents, 'status', 'open') },
    },
  });
});

/** GET /wt-ops/registers/jobs?q= — the shared job lookup. */
exports.jobs = asyncHandler(async (req, res) => {
  res.json(await jobs.search({
    scope: scoped(req),
    q: String(req.query.q || '').trim(),
    provider_id: req.query.provider_id || null,
  }));
});

/* ── create, with the job resolved server-side ─────────────────────────── */

exports.create = asyncHandler(async (req, res) => {
  const spec = REGISTERS[req.params.register];
  if (!spec) return res.status(404).json({ error: 'Unknown register.' });

  const branchId = resolveBranchId(req);
  const body = req.body || {};

  let context = {};
  let workOrder = null;
  /*
   * A warranty or an incident without a job is meaningless — both describe work
   * that was done. A complaint can legitimately have none: a client may be
   * unhappy about something that never became a work order.
   */
  const jobRequired = req.params.register !== 'complaints';
  if (jobRequired || body.work_order_code) {
    try {
      const out = await jobs.resolve({ branch_id: branchId, work_order: body.work_order_code });
      context = out.context;
      workOrder = out.workOrder;
    } catch (e) {
      return res.status(e.status || 400).json({ error: e.message });
    }
  }

  const common = {
    branch_id: branchId,
    service_line: resolveServiceLine(req),
    code: await identity.nextCode(spec.slug, branchId),
    ...context,
    // Who raised it, and how. 'client' means it came in through their portal.
    raised_via: ['client', 'provider'].includes(body.raised_via) ? body.raised_via : 'staff',
    logged_by: body.logged_by || actorOf(req),
  };

  let row;
  if (req.params.register === 'warranties') {
    const type = body.warranty_type || WARRANTY_TYPES[0];
    /*
     * Cover runs from the day the work was FINISHED, not the day somebody got
     * round to registering it — otherwise a warranty entered a fortnight late
     * silently gives the client a fortnight less than they were promised.
     * Read from the work order rather than the resolved context, because
     * `completed_at` is a fact about the job and not a column on this record.
     */
    const start = isoDate(body.start_date) || isoDate(workOrder?.completed_at) || today();
    row = await M.WtWarranty.create({
      ...common,
      warranty_type: type,
      coverage: body.coverage || null,
      terms: body.terms || null,
      start_date: start,
      // Defaulted from the type rather than left to be typed, then adjustable.
      expiry_date: isoDate(body.expiry_date) || addMonths(start, WARRANTY_MONTHS[type] || 12),
      status: body.status || 'Active',
      provider_name: body.provider_name || context.provider_name || null,
    });
  } else if (req.params.register === 'complaints') {
    const severity = SEVERITIES.includes(body.severity) ? body.severity : 'Medium';
    const logged = isoDate(body.logged_date) || today();
    row = await M.WtComplaint.create({
      ...common,
      // A complaint with no job still needs a client.
      client_name: context.client_name || body.client_name || null,
      client_code: context.client_code || body.client_code || null,
      incident_type: body.incident_type || 'Service Quality',
      severity,
      details: body.details || null,
      disclosure: body.disclosure || body.details || null,
      status: body.status || 'Open',
      logged_date: logged,
      // Sec. 11: acknowledge within one business day; the response clock follows
      // severity rather than being typed as free text like "6 Hours Left".
      ack_due_at: new Date(Date.now() + 24 * 3600e3),
      sla_due: `${SLA_HOURS[severity]} hours`,
      provider_name: body.provider_name || context.provider_name || null,
    });
  } else {
    row = await M.WtIncident.create({
      ...common,
      incident_type: body.incident_type || 'Other',
      severity: SEVERITIES.includes(body.severity) ? body.severity : 'Medium',
      incident_date: isoDate(body.incident_date) || today(),
      location: body.location || context.site_address || null,
      description: body.description || null,
      action_taken: body.action_taken || null,
      reported_by: body.reported_by || actorOf(req),
      status: body.status || 'Open',
      provider_name: body.provider_name || context.provider_name || null,
    });
  }

  if (workOrder) {
    await M.WtCommLog.create({
      branch_id: branchId, service_line: resolveServiceLine(req),
      client_name: row.client_name || context.client_name,
      channel: 'note', direction: 'internal',
      summary: `${spec.label} ${row.code} raised against ${workOrder.code}`,
      ref_type: spec.slug, ref_code: row.code, logged_at: new Date(),
    }).catch(() => {});
  }

  res.status(201).json(row);
});
