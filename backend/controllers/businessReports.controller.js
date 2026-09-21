const { fn, col, Op } = require('sequelize');
const BusinessListing = require('../models/BusinessListing');
const BusinessEnquiry = require('../models/BusinessEnquiry');
const BusinessOffer = require('../models/BusinessOffer');
const BusinessSettlement = require('../models/BusinessSettlement');
const BusinessInvoice = require('../models/BusinessInvoice');
const { asyncHandler, branchScope } = require('../utils/controllerHelpers');

const groupCount = async (Model, where, field) => {
  const rows = await Model.findAll({ where, attributes: [field, [fn('COUNT', col('id')), 'n']], group: [field], raw: true });
  return Object.fromEntries(rows.map((r) => [r[field] || 'unknown', Number(r.n)]));
};
const num = (v) => Number(v || 0);

// GET /api/business-reports/overview — the Business Sale financial + pipeline rollup (isolated).
exports.overview = asyncHandler(async (req, res) => {
  const w = branchScope(req);
  const [
    listingTotal, byStage, byStatus, byType, pipelineValue,
    enqTotal, enqByStage,
    offerTotal, offerByStatus,
    settleCount, commissionEarned, commissionCollected,
    invTotal, invInvoiced, invCollected,
  ] = await Promise.all([
    BusinessListing.count({ where: w }),
    groupCount(BusinessListing, w, 'stage'),
    groupCount(BusinessListing, w, 'status'),
    groupCount(BusinessListing, w, 'business_type'),
    BusinessListing.sum('indicative_price', { where: { ...w, status: { [Op.in]: ['active', 'under_offer'] } } }),
    BusinessEnquiry.count({ where: w }),
    groupCount(BusinessEnquiry, w, 'stage'),
    BusinessOffer.count({ where: w }),
    groupCount(BusinessOffer, w, 'status'),
    BusinessSettlement.count({ where: w }),
    BusinessSettlement.sum('commission_amount', { where: w }),
    BusinessSettlement.sum('commission_amount', { where: { ...w, commission_status: 'collected' } }),
    BusinessInvoice.count({ where: w }),
    BusinessInvoice.sum('total_amount', { where: { ...w, status: { [Op.ne]: 'void' } } }),
    BusinessInvoice.sum('paid_amount', { where: { ...w, status: { [Op.ne]: 'void' } } }),
  ]);

  res.json({
    data: {
      listings: { total: listingTotal, by_stage: byStage, by_status: byStatus, by_type: byType, pipeline_value: num(pipelineValue) },
      enquiries: { total: enqTotal, by_stage: enqByStage },
      offers: { total: offerTotal, by_status: offerByStatus },
      settlements: { count: settleCount, commission_earned: num(commissionEarned), commission_collected: num(commissionCollected) },
      invoices: { count: invTotal, total_invoiced: num(invInvoiced), total_collected: num(invCollected), outstanding: Math.max(0, num(invInvoiced) - num(invCollected)) },
    },
  });
});
