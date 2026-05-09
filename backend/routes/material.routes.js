const express = require('express');
const router = express.Router();
const materialController = require('../controllers/material.controller');
const { authMiddleware, roleMiddleware } = require('../middleware/auth.middleware');
const { branchMiddleware } = require('../middleware/branch.middleware');

router.use(authMiddleware);
router.use(branchMiddleware);

router.get('/batch/:batch_id', materialController.getMaterialsByBatch);

router.use(roleMiddleware(['super_admin', 'branch_admin', 'trainer']));
router.post('/', materialController.createMaterial);
router.delete('/:id', materialController.deleteMaterial);
router.post('/share', materialController.shareToBatch);

module.exports = router;
