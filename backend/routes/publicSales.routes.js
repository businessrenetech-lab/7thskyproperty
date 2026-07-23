const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/publicSales.controller');

// Unauthenticated — website buyer enquiries on sale properties.
router.post('/sales-enquiries', ctrl.submitSalesEnquiry);

module.exports = router;
