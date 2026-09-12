// backend/controllers/invoiceGateway.controller.js
//
// SSLCommerz online collection for any PropertyInvoice. The admin/portal creates
// a pay-link; SSLCommerz redirects the payer to the gateway; on success it calls
// our public callbacks, we validate the transaction, and record the payment
// through the SAME recordPayment path as manual entry (so folio + owner fees +
// reconciliation stay correct). Manual recording is untouched.
const PropertyInvoice = require('../models/PropertyInvoice');
const Contact = require('../models/Contact');
const Payment = require('../models/Payment');
const jwt = require('jsonwebtoken');
const SystemSetting = require('../models/SystemSetting');
const gateway = require('../services/sslCommerzInvoice.service');
const invoicing = require('./invoicing.controller');
const { asyncHandler, branchScope } = require('../utils/controllerHelpers');

// Signed pay-token: authorizes paying ONE invoice (money IN only) without a
// login — used by emailed "Pay Now" buttons and portal buttons alike.
function signPayToken(invoiceId) {
  return jwt.sign({ inv: Number(invoiceId), purpose: 'invoice_pay' }, process.env.JWT_SECRET, { expiresIn: '30d' });
}
// Public pay URL for an invoice, or null when no public base is configured yet.
function payUrlFor(invoiceId) {
  const base = String(process.env.PUBLIC_API_URL || process.env.BACKEND_URL || '').replace(/\/$/, '');
  if (!base) return null;
  return `${base}/api/invoice-pay/checkout/${signPayToken(invoiceId)}`;
}
// Is SSLCommerz wired up (store id present)? Used to decide whether to show the
// Pay Now button on emails — per the requirement, it appears once connected.
async function gatewayConfigured() {
  try {
    const row = await SystemSetting.findOne({ where: { setting_key: 'SSLCOMMERZ_STORE_ID' } });
    return !!(row?.setting_value || process.env.SSLCOMMERZ_STORE_ID);
  } catch { return false; }
}
exports.signPayToken = signPayToken;
exports.payUrlFor = payUrlFor;
exports.gatewayConfigured = gatewayConfigured;

const PAGE = (title, body) => `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${title}</title></head><body style="font-family:system-ui,Arial,sans-serif;max-width:520px;margin:60px auto;padding:0 20px;color:#1f2430;text-align:center;"><h2 style="color:#003768;">${title}</h2>${body}</body></html>`;

// POST /api/invoices/:id/pay-link (auth) — returns { gateway_url, tran_id }.
exports.payLink = asyncHandler(async (req, res) => {
  const inv = await PropertyInvoice.findOne({ where: { id: req.params.id, ...branchScope(req) } });
  if (!inv) return res.status(404).json({ error: 'Invoice not found.' });
  const contact = inv.contact_id ? await Contact.findByPk(inv.contact_id, { attributes: ['id', 'full_name', 'email', 'primary_phone'] }) : null;
  const { transactionId, gatewayUrl } = await gateway.initiateInvoiceCollection({ invoice: inv, contact });
  res.status(201).json({ data: { tran_id: transactionId, gateway_url: gatewayUrl, invoice_code: inv.invoice_code, pay_url: payUrlFor(inv.id) } });
});

// GET /api/invoice-pay/checkout/:token (PUBLIC) — the "Pay Now" landing used by
// emailed invoices and portal buttons. Verifies the signed token, creates an
// SSLCommerz session for the invoice's balance, and redirects to the gateway.
exports.checkout = asyncHandler(async (req, res) => {
  let invoiceId;
  try {
    const decoded = jwt.verify(req.params.token, process.env.JWT_SECRET);
    if (decoded.purpose !== 'invoice_pay') throw new Error('bad purpose');
    invoiceId = Number(decoded.inv);
  } catch {
    return res.status(400).send(PAGE('Link expired', '<p>This payment link is invalid or has expired. Please contact Seventh Sky for a fresh link.</p>'));
  }
  const inv = await PropertyInvoice.findByPk(invoiceId);
  if (!inv) return res.status(404).send(PAGE('Not found', '<p>We could not find this invoice.</p>'));
  const balance = Number(inv.balance != null ? inv.balance : (Number(inv.total || 0) - Number(inv.amount_paid || 0)));
  if (balance <= 0 || ['paid', 'cancelled', 'voided'].includes(inv.status)) {
    return res.send(PAGE('Already paid', `<p>Invoice <strong>${inv.invoice_code}</strong> has no outstanding balance. Thank you.</p>`));
  }
  const contact = inv.contact_id ? await Contact.findByPk(inv.contact_id, { attributes: ['id', 'full_name', 'email', 'primary_phone'] }) : null;
  try {
    const { gatewayUrl } = await gateway.initiateInvoiceCollection({ invoice: inv, contact });
    return res.redirect(302, gatewayUrl);
  } catch (e) {
    return res.status(e.status || 502).send(PAGE('Online payment unavailable', `<p>${e.message || 'The payment gateway is not available right now.'}</p><p>Please try again later or contact Seventh Sky.</p>`));
  }
});

// Record the validated online payment on the invoice by reusing recordPayment
// in-process (super_admin context so branch scope is open and the invoice is
// found by id). Idempotent: a second callback for the same tran_id is a no-op.
async function recordOnInvoice({ invoiceId, amount, tranId, method }) {
  const already = await Payment.findOne({ where: { reference: tranId } });
  if (already) return { duplicate: true };
  const inv = await PropertyInvoice.findByPk(invoiceId);
  if (!inv) throw Object.assign(new Error('Invoice not found for this transaction.'), { status: 404 });

  // Synthesized in-process request → real recordPayment (folio + owner fees).
  const fakeReq = {
    params: { id: String(invoiceId) },
    body: { amount, method: method || 'sslcommerz', reference: tranId, notes: `Online payment via SSLCommerz (${tranId})` },
    user: { role: 'super_admin', id: null }, branchId: inv.branch_id, headers: {}, header: () => undefined,
  };
  return await new Promise((resolve, reject) => {
    const fakeRes = { status: (c) => ({ json: (b) => (c >= 400 ? reject(Object.assign(new Error(b?.error || 'record failed'), { status: c })) : resolve(b)) }), json: (b) => resolve(b) };
    Promise.resolve(invoicing.recordPayment(fakeReq, fakeRes)).catch(reject);
  });
}

// Public callbacks (no auth — SSLCommerz posts here). We ALWAYS re-validate the
// transaction server-to-server before trusting it.
exports.success = asyncHandler(async (req, res) => {
  const valId = req.body?.val_id || req.query?.val_id;
  const invoiceId = Number(req.body?.value_a || req.query?.value_a);
  const tranId = req.body?.tran_id || req.query?.tran_id;
  try {
    if (valId) {
      const v = await gateway.validateCollection(valId);
      const amount = Number(v.amount || req.body?.amount || 0);
      if (invoiceId && amount > 0) await recordOnInvoice({ invoiceId, amount, tranId: v.tran_id || tranId, method: 'sslcommerz' });
    }
  } catch (e) { console.warn('[invoice-gateway] success handler:', e.message); }
  // Redirect the payer back to a friendly page (the SPA handles the query).
  res.redirect(302, `/admin/property-management/agency-income?paid=${encodeURIComponent(tranId || '')}`);
});

exports.ipn = asyncHandler(async (req, res) => {
  const valId = req.body?.val_id;
  const invoiceId = Number(req.body?.value_a);
  const tranId = req.body?.tran_id;
  if (valId && String(req.body?.status).toUpperCase() === 'VALID') {
    try {
      const v = await gateway.validateCollection(valId);
      const amount = Number(v.amount || 0);
      if (invoiceId && amount > 0) await recordOnInvoice({ invoiceId, amount, tranId: v.tran_id || tranId, method: 'sslcommerz' });
    } catch (e) { console.warn('[invoice-gateway] ipn:', e.message); }
  }
  res.json({ received: true });
});

exports.fail = asyncHandler(async (req, res) => res.redirect(302, `/admin/property-management/agency-income?failed=1`));
exports.cancel = asyncHandler(async (req, res) => res.redirect(302, `/admin/property-management/agency-income?cancelled=1`));
