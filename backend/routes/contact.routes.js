const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/contact.controller');
const { authMiddleware, roleMiddleware } = require('../middleware/auth.middleware');

// Staff roles that may manage CRM contacts
const CRM_ROLES = ['super_admin', 'branch_admin', 'property_manager', 'sales_executive'];

router.use(authMiddleware);
router.use(roleMiddleware(CRM_ROLES));

router.get('/', ctrl.list);
router.post('/', ctrl.create);
router.get('/:id', ctrl.getOne);
router.put('/:id', ctrl.update);
router.delete('/:id', ctrl.remove);

router.post('/:id/documents', ctrl.addDocument);
router.delete('/:id/documents/:docId', ctrl.removeDocument);

router.post('/:id/communications', ctrl.addCommunication);

router.post('/:id/convert', ctrl.convertToClient);

module.exports = router;
