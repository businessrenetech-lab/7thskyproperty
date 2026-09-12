const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/wtInvoiceGateway.controller');

// Public SSLCommerz callbacks for WATER-TANK / service invoice payments — no auth
// (the gateway posts here); every callback re-validates the transaction S2S.
// Own namespace so a WtInvoice id is never confused with a PropertyInvoice id.
router.get('/checkout/:token', ctrl.checkout);

router.post('/sslcommerz/ipn', ctrl.ipn);
router.post('/sslcommerz/success', ctrl.success);
router.get('/sslcommerz/success', ctrl.success);
router.post('/sslcommerz/fail', ctrl.fail);
router.get('/sslcommerz/fail', ctrl.fail);
router.post('/sslcommerz/cancel', ctrl.cancel);
router.get('/sslcommerz/cancel', ctrl.cancel);

module.exports = router;
