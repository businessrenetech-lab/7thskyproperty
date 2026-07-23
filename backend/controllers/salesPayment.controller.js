const sequelize = require('../config/db.config');
const { Op } = require('sequelize');
const { SalePayment } = require('../models/SalesModels');
const { SaleFundingRequest } = require('../models/SalesTrustModels');
const sslCommerzSales = require('../services/sslCommerzSales.service');
const { toMinor, decimalFromMinor } = require('../utils/money');

async function processValidatedPayment(payload) {
  const validationId = payload.val_id;
  if (!validationId) throw Object.assign(new Error('val_id is required'), { status: 400 });
  const provider = await sslCommerzSales.validateCollection(validationId);
  return sequelize.transaction(async (transaction) => {
    const request = await SaleFundingRequest.findOne({ where: { provider: 'sslcommerz', provider_reference: provider.tran_id }, transaction, lock: transaction.LOCK.UPDATE });
    if (!request) throw Object.assign(new Error('Funding request not found'), { status: 404 });
    if (String(provider.currency || provider.currency_type || '').toUpperCase() !== 'BDT') throw Object.assign(new Error('Funding currency must be BDT'), { status: 400 });
    if (toMinor(provider.amount) !== toMinor(request.amount)) throw Object.assign(new Error('Validated amount does not match the funding request'), { status: 400 });
    const idempotencyKey = `sslcollection:${provider.tran_id}`;
    let payment = await SalePayment.findOne({ where: { branch_id: request.branch_id, idempotency_key: idempotencyKey }, transaction });
    if (!payment) {
      const netMinor = toMinor(provider.store_amount || provider.amount);
      const grossMinor = toMinor(provider.amount);
      payment = await SalePayment.create({
        branch_id: request.branch_id,
        settlement_id: request.settlement_id,
        funding_request_id: request.id,
        direction: 'incoming',
        reference: provider.tran_id,
        payment_at: provider.tran_date || new Date(),
        value_date: provider.tran_date || new Date(),
        amount: decimalFromMinor(netMinor),
        gross_amount: decimalFromMinor(grossMinor),
        fee_amount: decimalFromMinor(grossMinor - netMinor),
        method: 'sslcommerz',
        from_account_name: provider.card_issuer || provider.card_brand || 'SSLCommerz payer',
        from_account_number: provider.card_no || null,
        status: 'pending',
        reconciliation_status: 'unreconciled',
        transaction_party_id: request.transaction_party_id,
        payment_kind: 'buyer_receipt',
        provider: 'sslcommerz',
        provider_payment_id: provider.bank_tran_id,
        provider_status: 'validated',
        idempotency_key: idempotencyKey,
      }, { transaction });
    }
    await request.update({ status: 'paid', paid_payment_id: payment.id }, { transaction });
    return { request, payment };
  });
}

exports.ipn = async (req, res) => {
  try {
    const result = await processValidatedPayment(req.body || {});
    res.status(200).json({ received: true, payment_id: result.payment.id });
  } catch (error) {
    res.status(error.status || 400).json({ error: error.message });
  }
};

exports.success = async (req, res) => {
  try {
    const result = await processValidatedPayment(req.body || {});
    res.status(200).json({ status: 'received', message: 'Payment confirmed. It will be credited to trust after bank settlement.', payment_id: result.payment.id });
  } catch (error) {
    res.status(error.status || 400).json({ status: 'verification_failed', error: error.message });
  }
};

async function markRequest(req, res, status) {
  const transactionId = req.body?.tran_id;
  if (transactionId) await SaleFundingRequest.update({ status }, { where: { provider: 'sslcommerz', provider_reference: transactionId, status: { [Op.ne]: 'paid' } } });
  res.status(200).json({ status });
}

exports.fail = (req, res) => markRequest(req, res, 'failed');
exports.cancel = (req, res) => markRequest(req, res, 'cancelled');
