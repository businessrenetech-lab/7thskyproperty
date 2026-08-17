const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth.middleware');
const ctrl = require('../controllers/sts.controller');

router.use(authMiddleware);

// Short-Term Rental Management agreement — catalog, meta, preview, create/list
router.get('/catalog', ctrl.getCatalog);
router.get('/meta', ctrl.getMeta);
router.post('/preview', ctrl.preview);
router.get('/agreements', ctrl.listAgreements);
router.post('/agreements', ctrl.createAgreement);

module.exports = router;
