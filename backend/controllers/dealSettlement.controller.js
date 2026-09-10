// backend/controllers/dealSettlement.controller.js
//
// A deal's money lives in the /sales trust-settlement engine. This controller
// only READS that money picture back onto the deal — it never writes money.
//   GET /api/deals/:id/sales-picture        one deal's money picture
//   GET /api/deals/settlement/sales-bulk-data   readiness feed for bulk settle
// The deal's own money-writing endpoints were retired on 2026-09-10, and the
// last weak read/flip paths (GET /:id/settlement, /settlement/bulk{,-data}) on
// 2026-09-11 — see deal.routes.js for the history.
const PropertyDeal = require('../models/PropertyDeal');
const { SaleSettlement } = require('../models/SalesModels');
const dealSalesLink = require('../services/dealSalesLink.service');
const { complianceBlockers } = require('../services/salesSettlement.service');
const { asyncHandler, branchScope } = require('../utils/controllerHelpers');

// Read-only: a deal's money picture assembled from its linked /sales settlement.
exports.salesPicture = asyncHandler(async (req, res) => {
  const deal = await PropertyDeal.findOne({ where: { id: req.params.id, ...branchScope(req) } });
  if (!deal) return res.status(404).json({ error: 'Deal not found.' });
  res.json({ data: await dealSalesLink.assemblePicture(deal) });
});

// Read-only: for every deal with a linked, not-yet-locked /sales settlement,
// report its settlement status and — for approved settlements — whether the
// /sales compliance blockers are clear. `ready` rows are the ones the bulk
// screen can lock; the lock itself goes through /api/sales/settlements/:id/lock,
// so this endpoint carries no money authority of its own.
exports.salesBulkData = asyncHandler(async (req, res) => {
  const where = { ...branchScope(req) };
  if (req.query.deal_type) where.deal_type = req.query.deal_type;
  const deals = await PropertyDeal.findAll({ where, order: [['id', 'ASC']], limit: 500 });
  const rows = [];
  for (const deal of deals) {
    const transaction = await dealSalesLink.resolveTransaction(deal);
    if (!transaction) continue;
    const settlement = await SaleSettlement.findOne({ where: { transaction_id: transaction.id }, order: [['id', 'DESC']] });
    if (!settlement || settlement.status === 'locked') continue;
    let blockers = [];
    // Only an approved settlement is a lock candidate; run the full blocker
    // check just for those (it is the same rule the lock enforces).
    if (settlement.status === 'approved') ({ blockers } = await complianceBlockers(transaction, settlement));
    rows.push({
      deal_id: deal.id,
      deal_code: deal.deal_code,
      property_id: deal.property_id, // lets the bulk screen deep-link into the desk
      settlement_id: settlement.id,
      settlement_code: settlement.settlement_code,
      status: settlement.status,
      ready: settlement.status === 'approved' && blockers.length === 0,
      blockers,
    });
  }
  const ready = rows.filter((r) => r.ready).length;
  res.json({ data: rows, summary: { deals: rows.length, ready_to_settle: ready, awaiting: rows.length - ready } });
});
