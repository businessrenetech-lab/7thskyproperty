/**
 * publicClientDocRequest.routes.js — PUBLIC document-upload flow for a client.
 * The token in the path is the credential; no login. Rate-limited and mounted
 * outside auth. Mirrors the provider self-onboarding public routes.
 */
const express = require('express');
const rateLimit = require('express-rate-limit');
const upload = require('../utils/uploadAny');
const ctrl = require('../controllers/publicClientDocRequest.controller');

const router = express.Router();
router.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 120, standardHeaders: true, legacyHeaders: false }));
router.get('/:token', ctrl.view);
router.post('/:token/upload', (req, res, next) => { req.uploadFolder = 'documents'; next(); }, upload.single('file'), ctrl.upload);
router.delete('/:token/documents/:id', ctrl.removeDocument);
router.post('/:token/submit', ctrl.submit);

module.exports = router;
