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

const num = (v) => Number(v || 0);
exports.receive = asyncHandler(async (req, res) => {
  const deal = await findDeal(req);
  if (!deal) return res.status(404).json({ error: 'Deal not found.' });
  const amount = num(req.body.amount);
  if (amount <= 0) return res.status(400).json({ error: 'Amount must be greater than zero.' });

  // Reuse the existing money engine. Create (or reuse) a client invoice for this
  // deal, then record the payment via the app's own endpoint so folio/receipt
  // behaviour is identical to every other payment — no parallel money path.
  const PropertyInvoice = require('../models/PropertyInvoice');
  const { generateCode: gc } = require('../utils/codeGenerator');
  let invoiceId = req.body.invoice_id;
  if (!invoiceId) {
    const inv = await PropertyInvoice.create({
      branch_id: deal.branch_id, invoice_code: await gc(PropertyInvoice, 'invoice_code', 'SSPC-IN-'),
      invoice_kind: 'client', contact_id: deal.seller_contact_id || null, property_id: deal.property_id,
      billed_to_type: 'client', service_for: 'deal', title: `Deal ${deal.deal_code} — ${req.body.kind || 'fee'}`,
      subtotal: amount, total: amount, balance: amount, amount_paid: 0, status: 'sent',
      issue_date: new Date(), created_by: req.user?.id || null,
    });
    invoiceId = inv.id;
  }
  const base = `http://127.0.0.1:${process.env.PORT || 50001}`;
  const r = await fetch(`${base}/api/invoices/${invoiceId}/payments`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: req.headers.authorization, 'X-Branch-Id': req.headers['x-branch-id'] || String(resolveBranchId(req) || '') },
    body: JSON.stringify({ amount, method: req.body.method || 'bank', reference: `DEAL:${deal.deal_code} ${req.body.reference || ''}`.trim(), notes: `Deal ${deal.deal_code} ${req.body.kind || 'fee'}` }),
  });
  if (!r.ok) { const e = await r.json().catch(() => ({})); return res.status(502).json({ error: e.error || 'Payment failed.' }); }
  await svc.recomputeStatuses(deal);
  await svc.logEvent(deal.id, deal.branch_id, 'money_received', { amount, detail: { kind: req.body.kind || 'fee', invoice_id: invoiceId }, actor: req.user?.id });
  const money = await svc.computeDealMoney(deal);
  res.status(201).json({ data: { money }, message: `Recorded ${amount.toLocaleString()} received.` });
});
