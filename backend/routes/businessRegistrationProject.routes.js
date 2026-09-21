const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/businessRegistrationProject.controller');
const child = require('../controllers/businessRegistrationChildren.controller');
const { authMiddleware, roleMiddleware } = require('../middleware/auth.middleware');

const ROLES = ['super_admin', 'branch_admin', 'property_manager', 'sales_executive', 'accounts'];
router.use(authMiddleware, roleMiddleware(ROLES));

router.get('/', ctrl.list);
router.get('/stats', ctrl.stats);
router.post('/', ctrl.create);
router.get('/:id', ctrl.getOne);
router.put('/:id', ctrl.update);
router.patch('/:id/move', ctrl.move);
router.delete('/:id', ctrl.remove);

// Nested child resources (Phase 2): consultation assessment, parties, documents.
router.get('/:id/assessment', child.getAssessment);
router.put('/:id/assessment', child.saveAssessment);
router.get('/:id/parties', child.listParties);
router.post('/:id/parties', child.createParty);
router.put('/:id/parties/:pid', child.updateParty);
router.delete('/:id/parties/:pid', child.removeParty);
router.get('/:id/documents', child.listDocuments);
router.post('/:id/documents', child.createDocument);
router.put('/:id/documents/:did', child.updateDocument);
router.delete('/:id/documents/:did', child.removeDocument);

// Phase 3: provider work orders + registration activities.
router.get('/:id/work-orders', child.listWorkOrders);
router.post('/:id/work-orders', child.createWorkOrder);
router.put('/:id/work-orders/:wid', child.updateWorkOrder);
router.delete('/:id/work-orders/:wid', child.removeWorkOrder);
router.get('/:id/activities', child.listActivities);
router.post('/:id/activities', child.createActivity);
router.put('/:id/activities/:aid', child.updateActivity);
router.delete('/:id/activities/:aid', child.removeActivity);

module.exports = router;
