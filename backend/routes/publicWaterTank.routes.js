/**
 * publicWaterTank.routes.js — what the marketing website may call.
 * UNAUTHENTICATED. Exposes the service menu (names only, no pricing) and the
 * enquiry form. Nothing here reads or returns internal records.
 */
const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/waterTankIntake.controller');

router.get('/services', ctrl.publicServices);
router.post('/enquiry', ctrl.publicEnquiry);

module.exports = router;
