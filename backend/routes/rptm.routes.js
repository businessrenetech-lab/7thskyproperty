const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth.middleware');
const ctrl = require('../controllers/rptm.controller');

router.use(authMiddleware);

// Residential Property Tenancy Management agreement — catalog, meta, preview, create/list
router.get('/catalog', ctrl.getCatalog);
router.get('/meta', ctrl.getMeta);
router.get('/property-defaults/:propertyId', ctrl.getPropertyDefaults);
router.post('/preview', ctrl.preview);
router.get('/agreements', ctrl.listAgreements);
router.post('/agreements', ctrl.createAgreement);
router.put('/agreements/:id', ctrl.updateAgreement);      // edit a draft
router.post('/agreements/:id/send', ctrl.sendAgreement);  // send / re-send a draft

module.exports = router;
