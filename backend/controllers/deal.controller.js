const PropertyDeal = require('../models/PropertyDeal');
const Property = require('../models/Property');
const Contact = require('../models/Contact');
const Client = require('../models/Client');
const Agreement = require('../models/Agreement');
const User = require('../models/User');
const DealEvent = require('../models/DealEvent');
const { generateCode } = require('../utils/codeGenerator');
const { asyncHandler, branchScope, resolveBranchId, getPagination, pick } = require('../utils/controllerHelpers');

const FIELDS = ['property_id', 'deal_type', 'buyer_client_id', 'seller_contact_id', 'owner_contact_id', 'agreement_id',
  'agreement_date', 'sale_price', 'commission_amount', 'commission_percent', 'expenses_total', 'status', 'settlement_date', 'assigned_to', 'notes', 'contract_status'];

const propInc = (category) => ({
  model: Property,
  attributes: ['id', 'property_code', 'title', 'category', 'listing_type', 'area', 'district', 'price'],
  ...(category ? { where: { category }, required: true } : {}),
});
const buyerInc = { model: Client, as: 'buyer', include: [{ model: Contact, attributes: ['id', 'full_name', 'primary_phone'] }] };
const sellerInc = { model: Contact, as: 'seller', attributes: ['id', 'full_name', 'primary_phone'] };
const ownerInc = { model: Contact, as: 'owner', attributes: ['id', 'full_name', 'primary_phone'] };
const assigneeInc = { model: User, as: 'assignee', attributes: ['id', 'name'] };

exports.list = asyncHandler(async (req, res) => {
  const { limit, offset, page } = getPagination(req, 25, 1000); // board pulls a full page
  const where = { ...branchScope(req) };
  if (req.query.deal_type) where.deal_type = req.query.deal_type;
  if (req.query.status) where.status = req.query.status;
  const { rows, count } = await PropertyDeal.findAndCountAll({
    where, include: [propInc(req.query.category), buyerInc, sellerInc, ownerInc, assigneeInc],
    limit, offset, order: [['created_at', 'DESC']], distinct: true,
  });
  res.json({ data: rows, pagination: { page, limit, total: count, pages: Math.ceil(count / limit) } });
});

exports.getOne = asyncHandler(async (req, res) => {
  const d = await PropertyDeal.findOne({
    where: { id: req.params.id, ...branchScope(req) },
    include: [propInc(), buyerInc, sellerInc, ownerInc, { model: Agreement }],
  });
  if (!d) return res.status(404).json({ error: 'Deal not found.' });
  res.json({ data: d });
});

exports.create = asyncHandler(async (req, res) => {
  const data = pick(req.body, FIELDS);
  if (!data.deal_type) return res.status(400).json({ error: 'deal_type (buy|sell) is required.' });
  data.branch_id = resolveBranchId(req, req.body.branch_id);
  data.created_by = req.user?.id || null;
  data.deal_code = await generateCode(PropertyDeal, 'deal_code', 'SSPC-DL-');
  const d = await PropertyDeal.create(data);
  res.status(201).json({ data: d, message: 'Deal created.' });
});

exports.update = asyncHandler(async (req, res) => {
  const d = await PropertyDeal.findOne({ where: { id: req.params.id, ...branchScope(req) } });
  if (!d) return res.status(404).json({ error: 'Deal not found.' });
  await d.update(pick(req.body, FIELDS));
  res.json({ data: d, message: 'Deal updated.' });
});

// Guarded stage move for the Kanban board. Only early-pipeline transitions are
// allowed here; agreed/settlement/completed are reached by their real flows
// (accept offer / lock settlement), so the board can never mark money or legal
// status. Same endpoint backs drag/drop and the keyboard Move-to-stage menu.
const ALLOWED_TRANSITIONS = {
  lead: ['negotiation', 'cancelled'],
  negotiation: ['lead', 'cancelled'],
};
const BLOCK_MSG = {
  agreed: 'Accept an offer in the property file to move this deal to Agreed.',
  settlement: 'Open the Settlement Desk — settlement status is set there.',
  completed: 'Open the Settlement Desk — completion happens when the settlement is locked.',
};
exports.transition = asyncHandler(async (req, res) => {
  const to = String(req.body.to_status || '');
  const reason = String(req.body.reason || '').trim();
  const deal = await PropertyDeal.findOne({ where: { id: req.params.id, ...branchScope(req) } });
  if (!deal) return res.status(404).json({ error: 'Deal not found.' });
  const from = deal.status;
  const allowed = ALLOWED_TRANSITIONS[from] || [];
  if (!allowed.includes(to)) {
    const msg = BLOCK_MSG[to]
      || (['agreed', 'settlement', 'completed'].includes(from) ? 'This deal is past negotiation; changes happen in the offer/settlement flow.' : `Cannot move a ${from} deal to ${to}.`);
    return res.status(409).json({ error: msg });
  }
  if (to === 'cancelled' && !reason) return res.status(400).json({ error: 'A reason is required to cancel a deal.' });
  await deal.update({ status: to });
  await DealEvent.create({ branch_id: deal.branch_id, deal_id: deal.id, event_type: 'STAGE_CHANGED', detail: `${from} → ${to}${reason ? ` — ${reason}` : ''}`, actor_user_id: req.user.id });
  res.json({ data: deal });
});
