// backend/controllers/wtInvoiceGateway.controller.js
//
// SSLCommerz online collection for a Water-Tank / service invoice (WtInvoice) —
// the same "Pay Now" experience the PropertyInvoice gateway gives, but routed to
// its OWN callback namespace (/api/wt-invoice-pay/*) so a WtInvoice id can never
// be confused with a PropertyInvoice id, and recorded through wtLedger so the
// service ledger + invoice cache stay correct. Manual recording is untouched;
// this is an additional online option and covers EVERY service line (water tank,
// air-conditioning, and the rest) because they all share this invoice model.
const jwt = require('jsonwebtoken');
const M = require('../models/waterTankOps');
const gateway = require('../services/sslCommerzInvoice.service');
const ledger = require('../services/wtLedger.service');
const { gatewayConfigured } = require('./invoiceGateway.controller');
const { asyncHandler } = require('../utils/controllerHelpers');

const CALLBACK_PATH = '/api/wt-invoice-pay/sslcommerz';

// Signed pay-token: authorizes paying ONE service invoice (money IN only) with
// no login — used by the client portal button and emailed "Pay Now" alike.
function signPayToken(invoiceId) {
  return jwt.sign({ wtinv: Number(invoiceId), purpose: 'wt_invoice_pay' }, process.env.JWT_SECRET, { expiresIn: '30d' });
}
// Public pay URL for a WtInvoice, or null when no public base is configured yet.
function payUrlFor(invoiceId) {
  const base = String(process.env.PUBLIC_API_URL || process.env.BACKEND_URL || '').replace(/\/$/, '');
  if (!base || !invoiceId) return null;
  return `${base}/api/wt-invoice-pay/checkout/${signPayToken(invoiceId)}`;
}
exports.signPayToken = signPayToken;
exports.payUrlFor = payUrlFor;
exports.gatewayConfigured = gatewayConfigured;

const PAGE = (title, body) => `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${title}</title></head><body style="font-family:system-ui,Arial,sans-serif;max-width:520px;margin:60px auto;padding:0 20px;color:#1f2430;text-align:center;"><h2 style="color:#003768;">${title}</h2>${body}</body></html>`;

const num = (v) => Number(v || 0);
const outstandingOf = (inv) => num(inv.outstanding != null ? inv.outstanding : (num(inv.amount) - num(inv.paid_amount)));
const contactOf = (inv) => ({ full_name: inv.bill_to_name || inv.client_name || 'Client', email: inv.bill_to_email || null, primary_phone: inv.bill_to_phone || null });
const initOptions = (inv) => ({
  callbackPath: CALLBACK_PATH, tranPrefix: 'SSPCWT',
  balance: outstandingOf(inv),
  productName: `Invoice ${inv.code}`, productCategory: inv.inv_type || 'service',
  valueA: inv.id, valueB: inv.code,
});

// POST /api/wt-invoices/:code/pay-link (auth) — returns { gateway_url, pay_url }.
exports.payLink = asyncHandler(async (req, res) => {
  const where = { code: req.params.code };
  if (req.branchId) where.branch_id = req.branchId;
  const inv = await M.WtInvoice.findOne({ where });
  if (!inv) return res.status(404).json({ error: 'Invoice not found.' });
  if (String(inv.status || '').toLowerCase() === 'draft') return res.status(409).json({ error: 'Send the invoice before creating a pay-link.' });
  if (outstandingOf(inv) <= 0) return res.status(409).json({ error: 'This invoice has nothing left to pay.' });
  const { transactionId, gatewayUrl } = await gateway.initiateInvoiceCollection({ invoice: inv, contact: contactOf(inv), options: initOptions(inv) });
  res.status(201).json({ data: { tran_id: transactionId, gateway_url: gatewayUrl, invoice_code: inv.code, pay_url: payUrlFor(inv.id) } });
});

// GET /api/wt-invoice-pay/checkout/:token (PUBLIC) — the "Pay Now" landing.
exports.checkout = asyncHandler(async (req, res) => {
  let invoiceId;
  try {
    const decoded = jwt.verify(req.params.token, process.env.JWT_SECRET);
    if (decoded.purpose !== 'wt_invoice_pay') throw new Error('bad purpose');
    invoiceId = Number(decoded.wtinv);
  } catch {
    return res.status(400).send(PAGE('Link expired', '<p>This payment link is invalid or has expired. Please contact Seventh Sky for a fresh link.</p>'));
  }
  const inv = await M.WtInvoice.findByPk(invoiceId);
  if (!inv) return res.status(404).send(PAGE('Not found', '<p>We could not find this invoice.</p>'));
  const status = String(inv.status || '').toLowerCase();
  if (outstandingOf(inv) <= 0 || ['paid', 'void', 'voided', 'cancelled'].includes(status)) {
    return res.send(PAGE('Already paid', `<p>Invoice <strong>${inv.code}</strong> has no outstanding balance. Thank you.</p>`));
  }
  if (status === 'draft') return res.status(409).send(PAGE('Not ready', '<p>This invoice is not finalised yet. Please contact Seventh Sky.</p>'));
  try {
    const { gatewayUrl } = await gateway.initiateInvoiceCollection({ invoice: inv, contact: contactOf(inv), options: initOptions(inv) });
    return res.redirect(302, gatewayUrl);
  } catch (e) {
    return res.status(e.status || 502).send(PAGE('Online payment unavailable', `<p>${e.message || 'The payment gateway is not available right now.'}</p><p>Please try again later or contact Seventh Sky.</p>`));
  }
});

// Record the validated online payment through wtLedger (idempotent on tran_id).
async function recordOnInvoice({ invoiceId, amount, tranId }) {
  const inv = await M.WtInvoice.findByPk(invoiceId);
  if (!inv) throw Object.assign(new Error('Invoice not found for this transaction.'), { status: 404 });
  // recordClientReceipt is idempotent on idempotency_key — a replayed callback
  // reports duplicate rather than double-recording.
  return ledger.recordClientReceipt({
    invoice_id: inv.id, branch_id: inv.branch_id, service_line: inv.service_line,
    amount, method: 'sslcommerz', reference: tranId, idempotency_key: tranId,
    received_on: new Date(), note: `Online payment via SSLCommerz (${tranId})`,
    actor: 'SSLCommerz', actor_id: null,
  });
}

// Public callbacks (no auth — SSLCommerz posts here). Always re-validate S2S.
exports.success = asyncHandler(async (req, res) => {
  const valId = req.body?.val_id || req.query?.val_id;
  const invoiceId = Number(req.body?.value_a || req.query?.value_a);
  const tranId = req.body?.tran_id || req.query?.tran_id;
  let paid = false;
  try {
    if (valId) {
      const v = await gateway.validateCollection(valId);
      const amount = Number(v.amount || req.body?.amount || 0);
      if (invoiceId && amount > 0) { await recordOnInvoice({ invoiceId, amount, tranId: v.tran_id || tranId }); paid = true; }
    }
  } catch (e) { console.warn('[wt-invoice-gateway] success:', e.message); }
  res.send(PAGE(paid ? 'Payment received' : 'Payment processing',
    paid ? '<p>Thank you — your payment has been received and your invoice updated.</p>'
      : '<p>Your payment is being confirmed. If the invoice still shows a balance shortly, please contact Seventh Sky.</p>'));
});

exports.ipn = asyncHandler(async (req, res) => {
  const valId = req.body?.val_id;
  const invoiceId = Number(req.body?.value_a);
  const tranId = req.body?.tran_id;
  if (valId && String(req.body?.status).toUpperCase() === 'VALID') {
    try {
      const v = await gateway.validateCollection(valId);
      const amount = Number(v.amount || 0);
      if (invoiceId && amount > 0) await recordOnInvoice({ invoiceId, amount, tranId: v.tran_id || tranId });
    } catch (e) { console.warn('[wt-invoice-gateway] ipn:', e.message); }
  }
  res.json({ received: true });
});

exports.fail = asyncHandler(async (req, res) => res.send(PAGE('Payment not completed', '<p>Your payment was not completed. No money has been taken. You can try again from your portal.</p>')));
exports.cancel = asyncHandler(async (req, res) => res.send(PAGE('Payment cancelled', '<p>You cancelled the payment. No money has been taken.</p>')));
