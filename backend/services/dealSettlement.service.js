// backend/services/dealSettlement.service.js
const { Op } = require('sequelize');
const sequelize = require('../config/db.config');
const PropertyDeal = require('../models/PropertyDeal');
const DealDisbursement = require('../models/DealDisbursement');
const DealEvent = require('../models/DealEvent');
const num = (v) => Number(v || 0);

// Money received for a deal = completed payments on invoices tagged to it.
// Invoices carry no deal_id, so we tag them notes/title with the deal_code and
// match payments by reference `DEAL:<deal_code>` OR invoice title `Deal <code>`.
async function receivedFor(deal) {
  const [[r]] = await sequelize.query(
    `SELECT COALESCE(SUM(p.amount),0) AS total
       FROM payments p
      WHERE p.status = 'completed' AND p.branch_id = :b
        AND (p.reference LIKE :ref OR p.notes LIKE :ref)`,
    { replacements: { b: deal.branch_id, ref: `%DEAL:${deal.deal_code}%` } },
  );
  return num(r.total);
}

async function disbursedFor(dealId) {
  const rows = await DealDisbursement.findAll({ where: { deal_id: dealId, status: 'paid' }, attributes: ['amount'], raw: true });
  return rows.reduce((s, x) => s + num(x.amount), 0);
}

async function computeDealMoney(deal) {
  const expected = {
    fee: num(deal.expected_fee),
    commission: num(deal.expected_commission || deal.commission_amount),
  };
  expected.total = expected.fee + expected.commission;
  const received = await receivedFor(deal);
  const disbursed = await disbursedFor(deal.id);
  const deductions = num(deal.deductions_total);
  const remaining = expected.total - received;
  const net_held = received - disbursed; // money in hand not yet paid out
  const statuses = {
    contract: deal.contract_status,
    settlement: deal.settlement_status,
    payment: received <= 0 ? 'unpaid' : received + 0.001 >= expected.total ? 'received' : 'partial',
    disbursement: deal.disbursement_status,
  };
  let next_action = null;
  if (statuses.contract !== 'signed') next_action = { key: 'contract', label: 'Sign the service agreement' };
  else if (deal.settlement_status === 'not_started') next_action = { key: 'prepare', label: 'Prepare settlement (set expected amounts)' };
  else if (statuses.payment !== 'received') next_action = { key: 'receive', label: `Receive ${(remaining).toLocaleString()} outstanding` };
  else if (!deal.settlement_approved_at) next_action = { key: 'approve', label: 'Approve settlement' };
  else if (net_held > 0.001) next_action = { key: 'disburse', label: `Disburse ${net_held.toLocaleString()} held` };
  else if (deal.settlement_status !== 'settled') next_action = { key: 'settle', label: 'Mark settled' };
  return { expected, received, disbursed, deductions, remaining, net_held, statuses, next_action };
}

async function recomputeStatuses(deal) {
  const m = await computeDealMoney(deal);
  const disbursement_status = m.disbursed <= 0 ? (deal.disbursement_status === 'pending' ? 'pending' : 'none')
    : m.net_held > 0.001 ? 'partial' : 'disbursed';
  await deal.update({ payment_status: m.statuses.payment, disbursement_status });
  return m;
}

async function logEvent(deal_id, branch_id, event_type, { detail = null, amount = null, actor = null } = {}) {
  return DealEvent.create({ deal_id, branch_id, event_type, detail: typeof detail === 'string' ? detail : JSON.stringify(detail), amount, actor_user_id: actor });
}

module.exports = { computeDealMoney, recomputeStatuses, logEvent, receivedFor, disbursedFor };
