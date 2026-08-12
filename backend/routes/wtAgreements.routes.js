const express = require('express');
const router = express.Router();
const { authMiddleware, roleMiddleware } = require('../middleware/auth.middleware');
const ctrl = require('../controllers/wtAgreements.controller');

router.use(authMiddleware);
const MANAGE = roleMiddleware(['super_admin', 'branch_admin', 'property_manager']);

// Customer Service Agreement (signed with the client)
router.get('/customer/catalog', ctrl.customer.getCatalog);
router.get('/customer/meta', ctrl.customer.getMeta);
router.post('/customer/preview', ctrl.customer.preview);
router.get('/customer/agreements', ctrl.customer.listAgreements);
router.post('/customer/agreements', ctrl.customer.createAgreement);

// Service Delivery Provider Master Agreement (signed with the provider)
router.get('/provider/catalog', ctrl.provider.getCatalog);
router.get('/provider/meta', ctrl.provider.getMeta);
router.post('/provider/preview', ctrl.provider.preview);
router.get('/provider/agreements', ctrl.provider.listAgreements);
router.get('/provider/agreements/:id', ctrl.provider.detailAgreement);
router.post('/provider/agreements', MANAGE, ctrl.provider.createAgreement);
router.patch('/provider/agreements/:id', MANAGE, ctrl.provider.updateAgreement);
router.post('/provider/agreements/:id/send', MANAGE, ctrl.provider.sendAgreement);

module.exports = router;
