// backend/controllers/dealSettlement.controller.js
const PropertyDeal = require('../models/PropertyDeal');
const DealDisbursement = require('../models/DealDisbursement');
const DealEvent = require('../models/DealEvent');
const svc = require('../services/dealSettlement.service');
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

exports.prepare = asyncHandler(async (req, res) => {
  const deal = await findDeal(req);
  if (!deal) return res.status(404).json({ error: 'Deal not found.' });
  await deal.update({
    ...pick(req.body, ['expected_fee', 'expected_commission', 'deductions_total']),
    settlement_status: 'in_progress',
  });
  await svc.logEvent(deal.id, deal.branch_id, 'settlement_prepared', { detail: pick(req.body, ['expected_fee', 'expected_commission', 'deductions_total']), actor: req.user?.id });
  res.json({ data: deal });
});

exports.approve = asyncHandler(async (req, res) => {
  if (!isApprover(req)) return res.status(403).json({ error: 'Only a branch admin or super admin can approve a settlement.' });
  const deal = await findDeal(req);
  if (!deal) return res.status(404).json({ error: 'Deal not found.' });
  const money = await svc.computeDealMoney(deal);
  if (money.statuses.payment !== 'received') return res.status(400).json({ error: 'Cannot approve — expected money not fully received yet.' });
  await deal.update({ settlement_approved_by: req.user?.id || null, settlement_approved_at: new Date() });
  await svc.logEvent(deal.id, deal.branch_id, 'settlement_approved', { actor: req.user?.id });
  res.json({ data: deal });
});
