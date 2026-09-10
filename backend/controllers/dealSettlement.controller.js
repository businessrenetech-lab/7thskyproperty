// backend/controllers/dealSettlement.controller.js
const PropertyDeal = require('../models/PropertyDeal');
const DealDisbursement = require('../models/DealDisbursement');
const DealEvent = require('../models/DealEvent');
const svc = require('../services/dealSettlement.service');
const dealSalesLink = require('../services/dealSalesLink.service');
const { asyncHandler, branchScope, resolveBranchId, pick } = require('../utils/controllerHelpers');
const { generateCode } = require('../utils/codeGenerator');

const isApprover = (req) => ['super_admin', 'branch_admin'].includes(req.user?.role);
const findDeal = (req) => PropertyDeal.findOne({ where: { id: req.params.id, ...branchScope(req) } });

exports.getSettlement = asyncHandler(async (req, res) => {
  const deal = await findDeal(req);
  if (!deal) return res.status(404).json({ error: 'Deal not found.' });
  const money = await svc.computeDealMoney(deal);
  const disbursements = await DealDisbursement.findAll({ where: { deal_id: deal.id }, order: [['created_at', 'DESC']], raw: true });
  const events = await DealEvent.findAll({ where: { deal_id: deal.id }, order: [['occurred_at', 'DESC']], limit: 50, raw: true });
  res.json({ data: { deal, money, disbursements, events } });
});

// prepare / approve / receive / createDisbursement / payDisbursement / settle
// were removed on 2026-09-10. They wrote a deal's money outside the /sales
// engine: receipts matched on a `DEAL:<code>` text reference, payment recorded
// over an internal HTTP call, a "paid" status with no journal posting, and no
// lock around the held-funds check. Deal money is written by /api/sales/* only
// and read back through salesPicture below.

exports.bulkData = asyncHandler(async (req, res) => {
  const where = { ...branchScope(req), settlement_status: ['not_started', 'in_progress'] };
  if (req.query.deal_type) where.deal_type = req.query.deal_type;
  const deals = await PropertyDeal.findAll({ where, order: [['id', 'ASC']], limit: 500 });
  const rows = [];
  for (const d of deals) {
    const m = await svc.computeDealMoney(d);
    rows.push({ deal_id: d.id, deal_code: d.deal_code, deal_type: d.deal_type, expected: m.expected.total, received: m.received, remaining: m.remaining, net_held: m.net_held, statuses: m.statuses, next_action: m.next_action });
  }
  res.json({ data: rows, summary: { deals: rows.length, awaiting: rows.filter((r) => r.statuses.payment !== 'received').length, ready_to_settle: rows.filter((r) => r.statuses.payment === 'received').length } });
});

exports.bulkSettle = asyncHandler(async (req, res) => {
  const ids = Array.isArray(req.body.deal_ids) ? req.body.deal_ids.map(Number) : [];
  if (!ids.length) return res.status(400).json({ error: 'No deals selected.' });
  const results = []; let settled = 0; let skipped = 0;
  for (const id of ids) {
    const deal = await PropertyDeal.findOne({ where: { id, ...branchScope(req) } });
    if (!deal) { results.push({ deal_id: id, status: 'failed', error: 'not found' }); continue; }
    const m = await svc.computeDealMoney(deal);
    if (m.statuses.payment !== 'received') { results.push({ deal_id: id, status: 'skipped', reason: 'not fully received' }); skipped += 1; continue; }
    await deal.update({ settlement_status: 'settled', settlement_date: deal.settlement_date || new Date() });
    await svc.logEvent(deal.id, deal.branch_id, 'settled', { detail: 'bulk', actor: req.user?.id });
    results.push({ deal_id: id, status: 'settled' }); settled += 1;
  }
  res.json({ results, summary: { settled, skipped } });
});

// Read-only: a deal's money picture assembled from its linked /sales settlement.
exports.salesPicture = asyncHandler(async (req, res) => {
  const deal = await PropertyDeal.findOne({ where: { id: req.params.id, ...branchScope(req) } });
  if (!deal) return res.status(404).json({ error: 'Deal not found.' });
  res.json({ data: await dealSalesLink.assemblePicture(deal) });
});
