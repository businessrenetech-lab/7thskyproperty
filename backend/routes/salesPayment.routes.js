const express = require('express');
const rateLimit = require('express-rate-limit');
const controller = require('../controllers/salesPayment.controller');

const router = express.Router();
router.use(rateLimit({ windowMs: 60 * 1000, max: 120, standardHeaders: true, legacyHeaders: false }));
router.post('/sslcommerz/ipn', controller.ipn);
router.post('/sslcommerz/success', controller.success);
router.post('/sslcommerz/fail', controller.fail);
router.post('/sslcommerz/cancel', controller.cancel);

module.exports = router;
