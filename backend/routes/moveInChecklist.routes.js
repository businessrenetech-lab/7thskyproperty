const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/moveInChecklist.controller');
const { authMiddleware, roleMiddleware } = require('../middleware/auth.middleware');
router.use(authMiddleware, roleMiddleware(['super_admin', 'branch_admin', 'property_manager', 'accounts']));
router.get('/', ctrl.list); router.post('/', ctrl.create); router.post('/tenancies/:tenancyId/seed', ctrl.seedForTenancy); router.get('/:id', ctrl.getOne); router.put('/:id', ctrl.update); router.delete('/:id', ctrl.remove);
module.exports = router;
