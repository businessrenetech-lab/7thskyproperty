const { fn, col, Op } = require('sequelize');
const BusinessListing = require('../models/BusinessListing');
const BusinessEnquiry = require('../models/BusinessEnquiry');
const BusinessOffer = require('../models/BusinessOffer');
const BusinessSettlement = require('../models/BusinessSettlement');
const BusinessInvoice = require('../models/BusinessInvoice');
const BusinessLease = require('../models/BusinessLease');
const BusinessRentCollection = require('../models/BusinessRentCollection');
const BusinessMandate = require('../models/BusinessMandate');
const BusinessTarget = require('../models/BusinessTarget');
const { asyncHandler, branchScope } = require('../utils/controllerHelpers');

const groupCount = async (Model, where, field) => {
  const rows = await Model.findAll({ where, attributes: [field, [fn('COUNT', col('id')), 'n']], group: [field], raw: true });
  return Object.fromEntries(rows.map((r) => [r[field] || 'unknown', Number(r.n)]));
};
const num = (v) => Number(v || 0);

// GET /api/business-reports/buy-overview — the Business BUY (acquisition) rollup.
// Buy is mandate-driven (no listings), so it aggregates mandates, target shortlist
// and buy-side invoices — kept isolated from the sale/rent pipeline.
exports.buyOverview = asyncHandler(async (req, res) => {
  const w = branchScope(req);
  const wBuyInv = { ...w, deal_side: 'buy' };
  const [
    mandateTotal, mandateByStage, mandateByStatus, targetTotal, targetByStatus,
    invTotal, invInvoiced, invCollected,
  ] = await Promise.all([
    BusinessMandate.count({ where: w }),
    groupCount(BusinessMandate, w, 'stage'),
    groupCount(BusinessMandate, w, 'status'),
    BusinessTarget.count({ where: w }),
    groupCount(BusinessTarget, w, 'status'),
    BusinessInvoice.count({ where: wBuyInv }),
    BusinessInvoice.sum('total_amount', { where: { ...wBuyInv, status: { [Op.ne]: 'void' } } }),
    BusinessInvoice.sum('paid_amount', { where: { ...wBuyInv, status: { [Op.ne]: 'void' } } }),
  ]);
  res.json({
    data: {
      mandates: { total: mandateTotal, by_stage: mandateByStage, by_status: mandateByStatus },
      targets: { total: targetTotal, by_status: targetByStatus },
      invoices: { count: invTotal, total_invoiced: num(invInvoiced), total_collected: num(invCollected), outstanding: Math.max(0, num(invInvoiced) - num(invCollected)) },
    },
  });
});

// GET /api/business-reports/overview — the Business Sale/Rent financial + pipeline rollup (isolated).
exports.overview = asyncHandler(async (req, res) => {
  const w = branchScope(req);
  // Optional listing_type split (sale vs rent) — listings/leases/invoices/enquiries scope to it.
  const lt = req.query.listing_type;               // 'sale' | 'rent' | undefined (all)
  const isRent = lt === 'rent';
  const wListings = lt ? { ...w, listing_type: lt } : w;
  const wInvoices = lt ? { ...w, deal_side: lt } : w;          // scope invoices to this side
  const wEnq = lt ? { ...w, enquiry_type: isRent ? 'tenant' : 'buyer' } : w;
  const priceCol = isRent ? 'monthly_rent' : 'indicative_price';
  const [
    listingTotal, byStage, byStatus, byType, pipelineValue,
    enqTotal, enqByStage,
    offerTotal, offerByStatus,
    settleCount, commissionEarned, commissionCollected,
    invTotal, invInvoiced, invCollected,
    leaseActive, rentDue, rentReceived,
  ] = await Promise.all([
    BusinessListing.count({ where: wListings }),
    groupCount(BusinessListing, wListings, 'stage'),
    groupCount(BusinessListing, wListings, 'status'),
    groupCount(BusinessListing, wListings, 'business_type'),
    BusinessListing.sum(priceCol, { where: { ...wListings, status: { [Op.in]: ['active', 'under_offer'] } } }),
    BusinessEnquiry.count({ where: wEnq }),
    groupCount(BusinessEnquiry, wEnq, 'stage'),
    BusinessOffer.count({ where: w }),
    groupCount(BusinessOffer, w, 'status'),
    BusinessSettlement.count({ where: w }),
    BusinessSettlement.sum('commission_amount', { where: w }),
    BusinessSettlement.sum('commission_amount', { where: { ...w, commission_status: 'collected' } }),
    BusinessInvoice.count({ where: wInvoices }),
    BusinessInvoice.sum('total_amount', { where: { ...wInvoices, status: { [Op.ne]: 'void' } } }),
    BusinessInvoice.sum('paid_amount', { where: { ...wInvoices, status: { [Op.ne]: 'void' } } }),
    BusinessLease.count({ where: { ...w, status: 'active' } }),
    BusinessRentCollection.sum('rent_due', { where: w }),
    BusinessRentCollection.sum('rent_received', { where: w }),
  ]);

  res.json({
    data: {
      listings: { total: listingTotal, by_stage: byStage, by_status: byStatus, by_type: byType, pipeline_value: num(pipelineValue), value_basis: isRent ? 'monthly_rent' : 'indicative_price' },
      enquiries: { total: enqTotal, by_stage: enqByStage },
      offers: { total: offerTotal, by_status: offerByStatus },
      settlements: { count: settleCount, commission_earned: num(commissionEarned), commission_collected: num(commissionCollected) },
      invoices: { count: invTotal, total_invoiced: num(invInvoiced), total_collected: num(invCollected), outstanding: Math.max(0, num(invInvoiced) - num(invCollected)) },
      leases: { active: leaseActive, rent_due: num(rentDue), rent_collected: num(rentReceived), rent_arrears: Math.max(0, num(rentDue) - num(rentReceived)) },
    },
  });
});
