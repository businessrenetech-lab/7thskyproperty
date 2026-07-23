const axios = require('axios');
const SystemSetting = require('../models/SystemSetting');
const { toMinor, decimalFromMinor } = require('../utils/money');

async function setting(key) {
  const row = await SystemSetting.findOne({ where: { setting_key: key } }).catch(() => null);
  return row?.setting_value || null;
}

async function config() {
  const [storeIdSetting, passwordSetting, liveSetting] = await Promise.all([
    setting('SSLCOMMERZ_STORE_ID'), setting('SSLCOMMERZ_STORE_PASS'), setting('SSLCOMMERZ_IS_LIVE'),
  ]);
  const storeId = storeIdSetting || process.env.SSLCOMMERZ_STORE_ID;
  const storePassword = passwordSetting || process.env.SSLCOMMERZ_STORE_PASS;
  const live = String(liveSetting ?? process.env.SSLCOMMERZ_IS_LIVE ?? 'false').toLowerCase() === 'true';
  const callbackBase = String(process.env.PUBLIC_API_URL || process.env.BACKEND_URL || '').replace(/\/$/, '');
  if (!storeId || !storePassword) throw Object.assign(new Error('SSLCommerz credentials are not configured'), { status: 409 });
  if (!callbackBase || !/^https:\/\//i.test(callbackBase)) throw Object.assign(new Error('PUBLIC_API_URL must be a public HTTPS URL for SSLCommerz callbacks'), { status: 409 });
  return { storeId, storePassword, live, callbackBase, baseUrl: live ? 'https://securepay.sslcommerz.com' : 'https://sandbox.sslcommerz.com' };
}

async function initiateCollection({ fundingRequest, buyer, property }) {
  const cfg = await config();
  const amountMinor = toMinor(fundingRequest.amount);
  if (amountMinor < 1000 || amountMinor > 50000000) throw Object.assign(new Error('SSLCommerz collections must be between BDT 10.00 and BDT 500,000.00 per transaction'), { status: 400 });
  const transactionId = fundingRequest.provider_reference || `SSPCSF${fundingRequest.id}${Date.now().toString().slice(-8)}`.slice(0, 30);
  const payload = new URLSearchParams({
    store_id: cfg.storeId,
    store_passwd: cfg.storePassword,
    total_amount: decimalFromMinor(amountMinor),
    currency: 'BDT',
    tran_id: transactionId,
    success_url: `${cfg.callbackBase}/api/sales-payments/sslcommerz/success`,
    fail_url: `${cfg.callbackBase}/api/sales-payments/sslcommerz/fail`,
    cancel_url: `${cfg.callbackBase}/api/sales-payments/sslcommerz/cancel`,
    ipn_url: `${cfg.callbackBase}/api/sales-payments/sslcommerz/ipn`,
    cus_name: buyer.snapshot_name || 'Property buyer',
    cus_email: buyer.snapshot_email || 'accounts@seventhskyproperty.com',
    cus_add1: 'Dhaka',
    cus_city: 'Dhaka',
    cus_postcode: '1000',
    cus_country: 'Bangladesh',
    cus_phone: buyer.snapshot_phone || '00000000000',
    shipping_method: 'NO',
    product_name: `Property settlement ${property?.property_code || fundingRequest.settlement_id}`,
    product_category: 'property-settlement',
    product_profile: 'non-physical-goods',
    value_a: String(fundingRequest.id),
    value_b: String(fundingRequest.settlement_id),
  });
  const response = await axios.post(`${cfg.baseUrl}/gwprocess/v4/api.php`, payload, { headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, timeout: 30000 });
  if (response.data?.status !== 'SUCCESS' || !response.data?.GatewayPageURL) throw Object.assign(new Error(response.data?.failedreason || 'SSLCommerz session creation failed'), { status: 502 });
  return { transactionId, gatewayUrl: response.data.GatewayPageURL, sessionKey: response.data.sessionkey || null };
}

async function validateCollection(validationId) {
  const cfg = await config();
  const response = await axios.get(`${cfg.baseUrl}/validator/api/validationserverAPI.php`, {
    params: { val_id: validationId, store_id: cfg.storeId, store_passwd: cfg.storePassword, format: 'json' },
    timeout: 30000,
  });
  const data = response.data || {};
  if (!['VALID', 'VALIDATED'].includes(data.status)) throw Object.assign(new Error('SSLCommerz payment validation failed'), { status: 400 });
  return data;
}

async function initiateRefund({ originalPayment, disbursement, refundTransactionId }) {
  const cfg = await config();
  if (!originalPayment.provider_payment_id) throw Object.assign(new Error('Original SSLCommerz bank transaction ID is missing'), { status: 409 });
  const response = await axios.get(`${cfg.baseUrl}/validator/api/merchantTransIDvalidationAPI.php`, {
    params: {
      bank_tran_id: originalPayment.provider_payment_id,
      refund_trans_id: refundTransactionId.slice(0, 30),
      refund_amount: decimalFromMinor(toMinor(disbursement.amount)),
      refund_remarks: `Property settlement refund ${disbursement.id}`,
      refe_id: String(disbursement.id),
      store_id: cfg.storeId,
      store_passwd: cfg.storePassword,
      format: 'json',
      v: 1,
    },
    timeout: 30000,
  });
  const data = response.data || {};
  if (data.APIConnect !== 'DONE' || !['success', 'processing'].includes(String(data.status).toLowerCase())) {
    throw Object.assign(new Error(data.errorReason || 'SSLCommerz refund initiation failed'), { status: 502 });
  }
  return data;
}

async function queryRefund(refundReference) {
  const cfg = await config();
  const response = await axios.get(`${cfg.baseUrl}/validator/api/merchantTransIDvalidationAPI.php`, {
    params: { refund_ref_id: refundReference, store_id: cfg.storeId, store_passwd: cfg.storePassword, format: 'json' },
    timeout: 30000,
  });
  return response.data || {};
}

module.exports = { initiateCollection, validateCollection, initiateRefund, queryRefund };
