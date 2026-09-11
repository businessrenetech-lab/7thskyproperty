const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth.middleware');
const ctrl = require('../controllers/salesAgreement.controller');

router.use(authMiddleware);

// kind = purchase | sale
router.get('/:kind/catalog', ctrl.getCatalog);
router.get('/:kind/meta', ctrl.getMeta);
router.post('/:kind/preview', ctrl.preview);
router.get('/:kind/agreements', ctrl.listAgreements);
router.post('/:kind/agreements', ctrl.createAgreement);

module.exports = router;
