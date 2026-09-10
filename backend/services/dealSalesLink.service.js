// backend/services/dealSalesLink.service.js
//
// Read-only bridge from a PropertyDeal to the /sales trust-settlement engine.
// Resolves the deal's linked SaleTransaction (bridge: SaleTransaction.property_deal_id)
// and assembles a money picture from the existing settlement + agencyFees services.
// This module never creates/updates rows — it only reads.
const { SaleTransaction, SaleSettlement } = require('../models/SalesModels');
const agencyFees = require('./agencyFees.service');

// Latest SaleTransaction linked to this deal (bridge = property_deal_id).
async function resolveTransaction(deal) {
  return SaleTransaction.findOne({ where: { property_deal_id: deal.id }, order: [['id', 'DESC']] });
}

async function assemblePicture(deal) {
  const transaction = await resolveTransaction(deal);
  if (!transaction) {
    return {
      linked: false,
      offer_required: true,
      transaction: null,
      settlement: null,
      money: null,
      badges: null,
      next_action: { key: 'offer', label: 'Accept an offer to open a transaction' },
    };
  }
  // SaleSettlement links to SaleTransaction via `transaction_id` (see SalesModels.js).
  const settlement = await SaleSettlement.findOne({ where: { transaction_id: transaction.id }, order: [['id', 'DESC']] });
  if (!settlement) {
    return { linked: true, transaction, settlement: null, money: null, badges: null, next_action: { key: 'settlement', label: 'Open the settlement' } };
  }
  const lines = await agencyFees.agencyLinesFor(settlement.id).catch(() => []);
  const figures = agencyFees.invoiceFigures(lines);
  const money = { drafted_fees: figures, settlement_status: settlement.status };
  const badges = {
    contract: deal.contract_status,
    settlement: settlement.status,
    payment: settlement.payment_status || null,
    payout: settlement.disbursement_status || null,
  };
  const next_action = settlement.status === 'locked'
    ? { key: 'done', label: 'Settlement locked' }
    : { key: 'settlement', label: `Settlement is ${settlement.status}` };
  return { linked: true, transaction, settlement, money, badges, next_action };
}

module.exports = { resolveTransaction, assemblePicture };
