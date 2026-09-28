const M = require('../models/waterTankOps');
const BusinessRegistrationActivity = require('../models/BusinessRegistrationActivity');
const { getServiceLine } = require('../config/serviceLines');
const { asyncHandler, branchScope, serviceScope, resolveServiceLine } = require('../utils/controllerHelpers');
const { projectMargin } = require('../services/registrationMargin');
const { quoteForProject, lineRevenue } = require('../services/registrationDashboardMath');
const { stagesFor } = require('../services/wtProject.service');

// The six dashboards named in the Business Registration workbook: Registration,
// Revenue, Government Liaison, Provider, Risk, Profitability.
const DELAY_DAYS = 14; // submitted longer ago than this and still open = delayed
// SOP phases 1-3: an application is "new" until the client has paid and documents start.
const NEW_STAGE_KEYS = ['lead_management', 'consultation', 'commercial_approval'];

exports.dashboards = asyncHandler(async (req, res) => {
  const line = resolveServiceLine(req);
  if (!getServiceLine(line).registration_register) {
    return res.status(403).json({ error: 'Not available for this service line.' });
  }
  const scope = { ...branchScope(req), ...serviceScope(req) };

  const [projects, quotes, invoices, providers, activities] = await Promise.all([
    M.WtProject.findAll({ where: scope }),
    M.WtQuotation.findAll({ where: scope }),
    M.WtInvoice.findAll({ where: scope }),
    M.WtProvider.findAll({ where: scope }),
    BusinessRegistrationActivity.findAll({ where: branchScope(req) }),
  ]);

  // Projects store the stage LABEL; the manifest's stage machine owns the keys.
  const stages = stagesFor(line);
  const keyOf = (p) => (stages.find((s) => s.label === p.stage) || {}).key || null;
  const registration = {
    new_applications: projects.filter((p) => !p.closed_at && NEW_STAGE_KEYS.includes(keyOf(p))).length,
    pending: projects.filter((p) => !p.closed_at).length,
    completed: projects.filter((p) => !!p.closed_at).length,
    rejected: activities.filter((a) => a.status === 'rejected').length,
    by_stage: stages.map((s) => ({ stage: s.label, count: projects.filter((p) => p.stage === s.label).length })),
  };

  // Revenue and margin count the professional fee only — government fees are pass-through.
  // Quotations join on the project CODE (project_id is a string), and a project may
  // carry superseded quotes, so take the one that actually speaks for it.
  const perProject = projects.map((p) => {
    const q = quoteForProject(quotes, p);
    return {
      project: p.code,
      name: p.name,
      ...projectMargin({ quoteLines: q ? q.lines : [], providerCost: p.provider_cost, quote: q || undefined }),
    };
  });

  // Revenue counts one quotation per project (superseded ones are not re-billed)
  // plus direct quotes not yet tied to a project — the common intake path.
  const quoted = lineRevenue(quotes);

  const revenue = {
    professional_total: quoted.professional,
    government_collected: quoted.government,
    invoiced: invoices.reduce((n, i) => n + Number(i.amount || 0), 0),
    by_service: [...new Set(projects.map((p) => p.project_type))].filter(Boolean).map((t) => ({
      service: t,
      total: projects.reduce((n, p, i) => (p.project_type === t ? n + perProject[i].professional : n), 0),
    })),
  };

  const byType = (t) => activities.filter((a) => a.activity_type === t);
  const government_liaison = {
    municipality_cases: byType('trade_licence').length,
    rjsc_cases: byType('rjsc').length,
    tax_cases: byType('tin').length + byType('bin').length + byType('vat').length,
    open: activities.filter((a) => !['completed', 'rejected'].includes(a.status)).length,
  };

  const provider = {
    active: providers.filter((p) => String(p.status || '').toLowerCase() === 'approved').length,
    total: providers.length,
    jobs_assigned: activities.filter((a) => a.work_order_id).length,
    jobs_completed: activities.filter((a) => a.work_order_id && a.status === 'completed').length,
    ratings: providers.filter((p) => p.satisfaction_score != null)
      .map((p) => ({ provider: p.business_name, score: Number(p.satisfaction_score) })),
  };

  const cutoff = new Date(Date.now() - DELAY_DAYS * 864e5);
  const risk = {
    delayed_applications: activities.filter((a) => a.submitted_at && !a.completed_at && new Date(a.submitted_at) < cutoff).length,
    name_clearance_rejections: byType('name_clearance').filter((a) => a.status === 'rejected').length,
    government_queries: activities.filter((a) => a.status === 'submitted').length,
    rejections: activities.filter((a) => a.status === 'rejected')
      .map((a) => ({ activity: a.activity_type, reason: a.rejection_reason, project: a.wt_project_id })),
  };

  const profitability = {
    per_project: perProject,
    provider_cost_total: perProject.reduce((n, r) => n + r.provider_cost, 0),
    gross_margin_total: perProject.reduce((n, r) => n + r.gross_margin, 0),
  };

  res.json({ data: { registration, revenue, government_liaison, provider, risk, profitability } });
});
