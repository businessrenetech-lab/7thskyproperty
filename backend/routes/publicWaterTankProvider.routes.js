const express = require('express');
const rateLimit = require('express-rate-limit');
const upload = require('../utils/uploadAny');
const ctrl = require('../controllers/publicWaterTankProvider.controller');

const router = express.Router();
router.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 120, standardHeaders: true, legacyHeaders: false }));
router.get('/:token', ctrl.view);
router.patch('/:token', ctrl.save);
router.post('/:token/upload', (req, res, next) => { req.uploadFolder = 'documents'; next(); }, upload.single('file'), ctrl.upload);
router.delete('/:token/documents/:id', ctrl.removeDocument);
router.post('/:token/submit', ctrl.submit);

module.exports = router;
