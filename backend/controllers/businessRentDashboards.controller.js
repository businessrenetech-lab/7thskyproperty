/**
 * The six Business Rent dashboards (SOP §8): leasing pipeline, occupancy,
 * tenant screening & risk, financial, protection and operations.
 *
 * Every query is scoped to category 'business' AND listing_type 'rent'. Category
 * alone would pull in the Business SALE book, which shares the category.
 */
const { Op } = require('sequelize');
const Property = require('../models/Property');
const Tenancy = require('../models/Tenancy');
const Project = require('../models/Project');
const ProjectStage = require('../models/ProjectStage');
const { TenantApplication } = require('../models/TenantApplication');
const NonCircumventionRecord = require('../models/NonCircumventionRecord');
const TenancyDeposit = require('../models/TenancyDeposit');
const PropertyInvoice = require('../models/PropertyInvoice');
const { asyncHandler, branchScope } = require('../utils/controllerHelpers');
const { pipelineByStage, occupancy, arrearsAgeing } = require('../services/businessRentDashboardMath');
const { screeningVerdict } = require('../services/businessScreening');
const { advanceState, depositSummary } = require('../services/advanceSchedule');
const { protectionState } = require('../services/protectionWindow');

const plain = (rows) => rows.map((r) => (r.toJSON ? r.toJSON() : r));

exports.dashboard = asyncHandler(async (req, res) => {
  const key = String(req.params.key || '');
  const props = plain(await Property.findAll({
    where: { ...branchScope(req), category: 'business', listing_type: 'rent' },
  }));
  const propIds = props.map((p) => p.id);
  const tenancies = propIds.length
    ? plain(await Tenancy.findAll({ where: { ...branchScope(req), property_id: { [Op.in]: propIds } } }))
    : [];
  const apps = async () => (propIds.length
    ? plain(await TenantApplication.findAll({ where: { ...branchScope(req), property_id: { [Op.in]: propIds } } }))
    : []);

  if (key === 'pipeline') {
    const projects = plain(await Project.findAll({ where: { ...branchScope(req), vertical_key: 'business_rent' } }));
    // The Negotiation stage warns while screening is unresolved (SOP Rental §11).
    const screeningOutstanding = (await apps()).filter((a) => !screeningVerdict(a).ready).length;
    return res.json({ data: { stages: pipelineByStage(projects, undefined, { screeningOutstanding }), total: projects.length } });
  }

  if (key === 'occupancy') {
    return res.json({ data: occupancy(props, tenancies) });
  }

  if (key === 'screening') {
    const rows = await apps();
    const byVerdict = { pending: 0, suitable: 0, conditional: 0, declined: 0 };
    let outstanding = 0;
    for (const a of rows) {
      const s = screeningVerdict(a);
      byVerdict[s.verdict] += 1;
      if (!s.ready) outstanding += 1;
    }
    return res.json({ data: { total: rows.length, byVerdict, screeningOutstanding: outstanding } });
  }

  if (key === 'financial') {
    const deposits = tenancies.length
      ? plain(await TenancyDeposit.findAll({ where: { tenancy_id: { [Op.in]: tenancies.map((t) => t.id) } } }))
      : [];
    const advance = tenancies.reduce((acc, t) => {
      const a = advanceState(t, []);
      return {
        agreed: acc.agreed + a.agreed,
        received: acc.received + a.received,
        outstanding: acc.outstanding + a.outstanding,
      };
    }, { agreed: 0, received: 0, outstanding: 0 });
    const commission = tenancies.reduce((acc, t) => ({
      charged: acc.charged + Number(t.commission_amount || 0),
      paid: acc.paid + Number(t.commission_paid_amount || 0),
    }), { charged: 0, paid: 0 });
    commission.outstanding = Math.max(0, commission.charged - commission.paid);
    // Arrears from the PM invoices raised against these tenancies. PropertyInvoice
    // is the PM invoice — Invoice.js belongs to the academy app.
    const invoices = tenancies.length
      ? plain(await PropertyInvoice.findAll({
        where: {
          ...branchScope(req),
          tenancy_id: { [Op.in]: tenancies.map((t) => t.id) },
          status: { [Op.notIn]: ['paid', 'cancelled', 'refunded', 'draft'] },
        },
      }))
      : [];
    const arrears = arrearsAgeing(invoices.map((i) => ({ amount: i.balance, due_date: i.due_date })));
    return res.json({ data: { advance, commission, deposits: depositSummary(deposits), arrears } });
  }

  if (key === 'protection') {
    const recs = plain(await NonCircumventionRecord.findAll({
      where: { ...branchScope(req), context: 'rental', category: 'business' },
    }));
    const counts = { active: 0, expiring: 0, expired: 0 };
    for (const r of recs) counts[protectionState(r).state] += 1;
    return res.json({
      data: { total: recs.length, ...counts, breached: recs.filter((r) => r.status === 'breached').length },
    });
  }

  if (key === 'operations') {
    // An escalation is a blocked stage, reported with the SOP trigger that
    // applies to it — the triggers are data on the stage, not decorative text.
    const projects = plain(await Project.findAll({ where: { ...branchScope(req), vertical_key: 'business_rent' } }));
    const stages = projects.length
      ? plain(await ProjectStage.findAll({
        where: { project_id: { [Op.in]: projects.map((p) => p.id) }, status: 'blocked' },
      }))
      : [];
    const escalations = stages.map((s) => ({
      project_id: s.project_id, stage: s.stage_name, department: s.department, trigger: s.escalation_trigger,
    }));
    return res.json({
      data: {
        properties: props.length,
        tenancies: tenancies.length,
        escalations,
        escalationCount: escalations.length,
      },
    });
  }

  return res.status(404).json({ error: `Unknown dashboard '${key}'.` });
});
