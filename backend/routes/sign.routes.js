const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const ctrl = require('../controllers/signing.controller');

// Public, token-gated signing endpoints (no login).
// Reads (loading/reloading the page or the signed copy) are generous — a party may
// refresh several times, and several signers can share one office/NAT IP, so a tight
// cap here just breaks legitimate loads with a 429. Writes stay tighter to blunt
// brute-force, but not so tight that a couple of validation retries lock the signer out.
const readLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 600, standardHeaders: true, legacyHeaders: false });
const writeLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 60, standardHeaders: true, legacyHeaders: false });

router.get('/:token', readLimiter, ctrl.viewByToken);
router.get('/:token/signed-document', readLimiter, ctrl.signedByToken);
router.post('/:token/sign', writeLimiter, ctrl.signByToken);
router.post('/:token/decline', writeLimiter, ctrl.declineByToken);

module.exports = router;
