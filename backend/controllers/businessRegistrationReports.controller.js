const { Op, fn, col } = require('sequelize');
const BusinessRegistrationProject = require('../models/BusinessRegistrationProject');
const BusinessRegistrationEnquiry = require('../models/BusinessRegistrationEnquiry');
const BusinessRegistrationWorkOrder = require('../models/BusinessRegistrationWorkOrder');
const BusinessRegistrationActivity = require('../models/BusinessRegistrationActivity');
const BusinessRegistrationInvoice = require('../models/BusinessRegistrationInvoice');
const { asyncHandler, branchScope } = require('../utils/controllerHelpers');

const num = (v) => Number(v || 0);
const groupMap = (rows, key) => Object.fromEntries(rows.filter((r) => r[key] != null).map((r) => [r[key], Number(r.n)]));

// GET /api/business-registration-reports/overview — every SOP-recommended dashboard,
// scoped to the Business Registration module only.
exports.overview = asyncHandler(async (req, res) => {
  const where = { ...branchScope(req) };

  const [
    projTotal, projByStage, projByStatus, projByType, projByUrgency,
    contractValue, govFees, depositSum,
    enqTotal, enqConverted,
    woByStatus, providerCost,
    actByType, actByStatus,
    invoiced, collected,
  ] = await Promise.all([
    BusinessRegistrationProject.count({ where }),
    BusinessRegistrationProject.findAll({ where, attributes: ['stage', [fn('COUNT', col('id')), 'n']], group: ['stage'], raw: true }),
    BusinessRegistrationProject.findAll({ where, attributes: ['status', [fn('COUNT', col('id')), 'n']], group: ['status'], raw: true }),
    BusinessRegistrationProject.findAll({ where, attributes: ['business_type', [fn('COUNT', col('id')), 'n']], group: ['business_type'], raw: true }),
    BusinessRegistrationProject.findAll({ where, attributes: ['urgency', [fn('COUNT', col('id')), 'n']], group: ['urgency'], raw: true }),
    BusinessRegistrationProject.sum('contract_value', { where }),
    BusinessRegistrationProject.sum('government_fees', { where }),
    BusinessRegistrationProject.sum('deposit_amount', { where }),
    BusinessRegistrationEnquiry.count({ where }),
    BusinessRegistrationEnquiry.count({ where: { ...where, converted: true } }),
    BusinessRegistrationWorkOrder.findAll({ where, attributes: ['status', [fn('COUNT', col('id')), 'n']], group: ['status'], raw: true }),
    BusinessRegistrationWorkOrder.sum('total_fee', { where: { ...where, status: { [Op.ne]: 'cancelled' } } }),
    BusinessRegistrationActivity.findAll({ where, attributes: ['activity_type', [fn('COUNT', col('id')), 'n']], group: ['activity_type'], raw: true }),
    BusinessRegistrationActivity.findAll({ where, attributes: ['status', [fn('COUNT', col('id')), 'n']], group: ['status'], raw: true }),
    BusinessRegistrationInvoice.sum('total_amount', { where: { ...where, status: { [Op.ne]: 'void' } } }),
    BusinessRegistrationInvoice.sum('paid_amount', { where: { ...where, status: { [Op.ne]: 'void' } } }),
  ]);

  const byStage = groupMap(projByStage, 'stage');
  const byStatus = groupMap(projByStatus, 'status');
  const actByTypeMap = groupMap(actByType, 'activity_type');
  const actByStatusMap = groupMap(actByStatus, 'status');
  const revenue = num(invoiced);
  const cost = num(providerCost);

  // Government-liaison cases — group the activity types the SOP dashboard tracks.
  const liaison = {
    name_clearance: actByTypeMap.name_clearance || 0,
    trade_licence: actByTypeMap.trade_licence || 0,
    rjsc: actByTypeMap.rjsc || 0,
    tax_registration: (actByTypeMap.tin || 0) + (actByTypeMap.bin || 0) + (actByTypeMap.vat || 0),
    authority_liaison: actByTypeMap.authority_liaison || 0,
  };

  res.json({
    data: {
      // Registration dashboard
      projects: {
        total: projTotal,
        new_applications: (byStage.consultation || 0) + (byStage.quotation || 0) + (byStage.agreement || 0),
        pending: (byStage.documents || 0) + (byStage.provider || 0) + (byStage.registration || 0) + (byStage.qa || 0),
        completed: (byStatus.completed || 0),
        by_stage: byStage,
        by_status: byStatus,
        by_type: groupMap(projByType, 'business_type'),
        by_urgency: groupMap(projByUrgency, 'urgency'),
      },
      enquiries: { total: enqTotal, converted: enqConverted, conversion_rate: enqTotal ? Math.round((enqConverted / enqTotal) * 100) : 0 },
      // Revenue dashboard
      revenue: {
        contract_value: num(contractValue),
        government_fees: num(govFees),
        deposits: num(depositSum),
        invoiced: revenue,
        collected: num(collected),
        outstanding: Math.max(0, revenue - num(collected)),
      },
      // Government-liaison dashboard
      government_liaison: liaison,
      activities: { by_type: actByTypeMap, by_status: actByStatusMap },
      // Provider dashboard
      providers: { by_status: groupMap(woByStatus, 'status'), provider_cost: cost },
      // Risk dashboard
      risk: {
        priority_projects: (groupMap(projByUrgency, 'urgency').priority || 0) + (groupMap(projByUrgency, 'urgency').urgent || 0),
        on_hold: byStatus.on_hold || 0,
        rejected_activities: actByStatusMap.rejected || 0,
        overdue_reviews: byStage.qa || 0,
      },
      // Profitability dashboard
      profitability: {
        revenue,
        provider_cost: cost,
        gross_margin: revenue - cost,
        margin_percent: revenue ? Math.round(((revenue - cost) / revenue) * 100) : 0,
      },
    },
  });
});
