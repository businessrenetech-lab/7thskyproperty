const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const ctrl = require('../controllers/intake.controller');
const upload = require('../utils/uploadAny');

// Public, token-gated intake (no login). The signer token authenticates every call.
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 120, standardHeaders: true, legacyHeaders: false });
router.use(limiter);

router.get('/:token', ctrl.view);
router.post('/:token/values', ctrl.saveValues);
router.post('/:token/upload', upload.single('file'), ctrl.upload);
router.delete('/:token/document/:id', ctrl.removeDoc);
router.post('/:token/sign', ctrl.sign);

module.exports = router;
