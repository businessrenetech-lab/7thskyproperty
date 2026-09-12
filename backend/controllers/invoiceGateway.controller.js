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
const gateway = require('../services/sslCommerzInvoice.service');
const invoicing = require('./invoicing.controller');
const { asyncHandler, branchScope } = require('../utils/controllerHelpers');

// POST /api/invoices/:id/pay-link (auth) — returns { gateway_url, tran_id }.
exports.payLink = asyncHandler(async (req, res) => {
  const inv = await PropertyInvoice.findOne({ where: { id: req.params.id, ...branchScope(req) } });
  if (!inv) return res.status(404).json({ error: 'Invoice not found.' });
  const contact = inv.contact_id ? await Contact.findByPk(inv.contact_id, { attributes: ['id', 'full_name', 'email', 'primary_phone'] }) : null;
  const { transactionId, gatewayUrl } = await gateway.initiateInvoiceCollection({ invoice: inv, contact });
  res.status(201).json({ data: { tran_id: transactionId, gateway_url: gatewayUrl, invoice_code: inv.invoice_code } });
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
