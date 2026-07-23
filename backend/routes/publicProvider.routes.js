const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const ctrl = require('../controllers/provider.controller');

// Public, no-login provider self-registration (token-gated). Rate limited.
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 60 });
router.use(limiter);

router.get('/:token', ctrl.publicView);
router.post('/:token', ctrl.publicSubmit);

module.exports = router;
