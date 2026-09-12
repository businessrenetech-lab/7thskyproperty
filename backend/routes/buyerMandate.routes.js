const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/buyerMandate.controller');
const { authMiddleware, roleMiddleware } = require('../middleware/auth.middleware');

const ROLES = ['super_admin', 'branch_admin', 'property_manager', 'sales_executive'];
router.use(authMiddleware, roleMiddleware(ROLES));

router.get('/', ctrl.list);
router.post('/', ctrl.create);
router.get('/:id', ctrl.getOne);
router.put('/:id', ctrl.update);
router.post('/:id/approve-to-proceed', ctrl.approveToProceed);
router.post('/:id/candidates', ctrl.addCandidate);
router.patch('/candidates/:cid', ctrl.patchCandidate);
router.delete('/candidates/:cid', ctrl.removeCandidate);
router.post('/:id/candidates/:cid/convert', ctrl.convert);

module.exports = router;
