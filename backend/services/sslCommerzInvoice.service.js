// backend/services/sslCommerzInvoice.service.js
//
// Generic "pay this invoice online via SSLCommerz" — a payment link for ANY
// PropertyInvoice (rent, tenant invoices, our agency fees, …). Reuses the store
// config + validation from sslCommerzSales.service; manual recording is
// unaffected (this is an additional online option).
//
// PREREQUISITES (set by the account owner, not in code):
//   • Settings → Integrations: SSLCOMMERZ_STORE_ID / SSLCOMMERZ_STORE_PASS / live
//   • PUBLIC_API_URL = a public https:// base (SSLCommerz posts callbacks to it)
// Until both are set, initiate throws a clear 409 — the paths are ready, the
// gateway just isn't wired to a store yet.
const axios = require('axios');
const { config, validateCollection } = require('./sslCommerzSales.service');
const { toMinor, decimalFromMinor } = require('../utils/money');

// Create an SSLCommerz session for an invoice's outstanding balance.
// Returns { transactionId, gatewayUrl }.
//
// `options` lets a non-PropertyInvoice caller (e.g. the Water-Tank / service
// invoices) reuse this same store config + session creation while routing its
// own callback namespace and carrying its own identifiers. All defaults
// preserve the original PropertyInvoice behaviour, so existing callers are
// unaffected:
//   callbackPath  – e.g. '/api/wt-invoice-pay/sslcommerz' (default PM path)
//   tranPrefix    – transaction-id prefix (default 'SSPCINV')
//   balance       – override the outstanding computed from the invoice
//   productName / productCategory / valueA / valueB – identifiers for the callback
async function initiateInvoiceCollection({ invoice, contact, options = {} }) {
  const cfg = await config();
  const balance = Number(
    options.balance != null ? options.balance
      : (invoice.balance != null ? invoice.balance : (Number(invoice.total || 0) - Number(invoice.amount_paid || 0))),
  );
  const amountMinor = toMinor(balance);
  if (amountMinor <= 0) throw Object.assign(new Error('This invoice has nothing left to pay.'), { status: 400 });
  if (amountMinor < 1000 || amountMinor > 50000000) throw Object.assign(new Error('SSLCommerz collections must be between BDT 10.00 and BDT 500,000.00 per transaction.'), { status: 400 });

  // tran_id encodes the invoice; value_a carries the id for the callback lookup.
  const tranPrefix = options.tranPrefix || 'SSPCINV';
  const transactionId = `${tranPrefix}${invoice.id}${Date.now().toString().slice(-8)}`.slice(0, 30);
  const base = `${cfg.callbackBase}${options.callbackPath || '/api/invoice-pay/sslcommerz'}`;
  const payload = new URLSearchParams({
    store_id: cfg.storeId, store_passwd: cfg.storePassword,
    total_amount: decimalFromMinor(amountMinor), currency: 'BDT', tran_id: transactionId,
    success_url: `${base}/success`, fail_url: `${base}/fail`, cancel_url: `${base}/cancel`, ipn_url: `${base}/ipn`,
    cus_name: contact?.full_name || 'Client',
    cus_email: contact?.email || 'accounts@seventhskyproperty.com',
    cus_add1: 'Dhaka', cus_city: 'Dhaka', cus_postcode: '1000', cus_country: 'Bangladesh',
    cus_phone: contact?.primary_phone || '00000000000',
    shipping_method: 'NO',
    product_name: String(options.productName || invoice.title || `Invoice ${invoice.invoice_code}`).slice(0, 120),
    product_category: options.productCategory || invoice.invoice_type || 'invoice', product_profile: 'non-physical-goods',
    value_a: String(options.valueA != null ? options.valueA : invoice.id),
    value_b: String(options.valueB != null ? options.valueB : (invoice.invoice_code || '')),
  });
  const response = await axios.post(`${cfg.baseUrl}/gwprocess/v4/api.php`, payload, { headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, timeout: 30000 });
  if (response.data?.status !== 'SUCCESS' || !response.data?.GatewayPageURL) {
    throw Object.assign(new Error(response.data?.failedreason || 'SSLCommerz session creation failed'), { status: 502 });
  }
  return { transactionId, gatewayUrl: response.data.GatewayPageURL, sessionKey: response.data.sessionkey || null };
}

module.exports = { initiateInvoiceCollection, validateCollection };
