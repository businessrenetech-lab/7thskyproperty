const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth.middleware');
const { canRead, canBind } = require('../middleware/wtRoles');
const ctrl = require('../controllers/wtAgreements.controller');

router.use(authMiddleware);

// Customer Service Agreement (signed with the client)
router.get('/customer/catalog', canRead, ctrl.customer.getCatalog);
router.get('/customer/meta', canRead, ctrl.customer.getMeta);
router.post('/customer/preview', canBind, ctrl.customer.preview);
router.get('/customer/agreements', canRead, ctrl.customer.listAgreements);
router.post('/customer/agreements', canBind, ctrl.customer.createAgreement);
// Service Delivery Provider Master Agreement (signed with the provider)
router.get('/provider/catalog', canRead, ctrl.provider.getCatalog);
router.get('/provider/meta', canRead, ctrl.provider.getMeta);
router.post('/provider/preview', canBind, ctrl.provider.preview);
router.get('/provider/agreements', canRead, ctrl.provider.listAgreements);
router.get('/provider/agreements/:id', canRead, ctrl.provider.detailAgreement);
router.post('/provider/agreements', canBind, ctrl.provider.createAgreement);
router.patch('/provider/agreements/:id', canBind, ctrl.provider.updateAgreement);
router.post('/provider/agreements/:id/send', canBind, ctrl.provider.sendAgreement);

module.exports = router;
