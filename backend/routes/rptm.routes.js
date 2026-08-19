const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth.middleware');
const ctrl = require('../controllers/rptm.controller');

router.use(authMiddleware);

// Residential Property Tenancy Management agreement — catalog, meta, preview, create/list
router.get('/catalog', ctrl.getCatalog);
router.get('/meta', ctrl.getMeta);
router.post('/preview', ctrl.preview);
router.get('/agreements', ctrl.listAgreements);
router.post('/agreements', ctrl.createAgreement);

module.exports = router;
