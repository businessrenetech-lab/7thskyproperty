const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const ctrl = require('../controllers/signing.controller');

// Public, token-gated signing endpoints (no login). Rate-limited.
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 60, standardHeaders: true, legacyHeaders: false });
router.use(limiter);

router.get('/:token', ctrl.viewByToken);
router.post('/:token/sign', ctrl.signByToken);
router.post('/:token/decline', ctrl.declineByToken);

module.exports = router;
