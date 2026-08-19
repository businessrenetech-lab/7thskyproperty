const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth.middleware');
const ctrl = require('../controllers/rprm.controller');

router.use(authMiddleware);

// Residential Property Rental Management agreement — catalog, builder meta, live preview
router.get('/catalog', ctrl.getCatalog);
router.get('/meta', ctrl.getMeta);
router.post('/preview', ctrl.preview);
router.get('/agreements', ctrl.listAgreements);
router.post('/agreements', ctrl.createAgreement);

module.exports = router;
