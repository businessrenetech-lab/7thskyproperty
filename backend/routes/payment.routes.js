const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/payment.controller');
const { authMiddleware } = require('../middleware/auth.middleware');

// Public endpoints
router.get('/config', paymentController.getPaymentConfig);
router.post('/initiate', paymentController.initiateCheckout);
router.post('/success', paymentController.paymentSuccess);
router.post('/fail', paymentController.paymentFail);
router.post('/cancel', paymentController.paymentCancel);
router.get('/status/:reference', paymentController.paymentStatus);

// Simulate payment and upgrade plan (Auth required)
router.post('/simulate', authMiddleware, paymentController.simulatePayment);

module.exports = router;
