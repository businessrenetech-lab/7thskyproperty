const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/invoiceGateway.controller');

// Public SSLCommerz callbacks for invoice payments — no auth (the gateway posts
// here); every callback re-validates the transaction server-to-server.
// Public "Pay Now" landing (emailed invoices + portal buttons) — signed token.
router.get('/checkout/:token', ctrl.checkout);

router.post('/sslcommerz/ipn', ctrl.ipn);
router.post('/sslcommerz/success', ctrl.success);
router.get('/sslcommerz/success', ctrl.success);
router.post('/sslcommerz/fail', ctrl.fail);
router.get('/sslcommerz/fail', ctrl.fail);
router.post('/sslcommerz/cancel', ctrl.cancel);
router.get('/sslcommerz/cancel', ctrl.cancel);

module.exports = router;
