const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/ownerStatement.controller');
const { authMiddleware, roleMiddleware } = require('../middleware/auth.middleware');

const ROLES = ['super_admin', 'branch_admin', 'property_manager', 'accounts'];

// Printable HTML endpoint is auth-gated (uses ?token= param path in browser).
router.get('/:id/pdf.html', authMiddleware, roleMiddleware(ROLES), ctrl.printable);

router.use(authMiddleware, roleMiddleware(ROLES));
router.get('/', ctrl.list);
router.post('/', ctrl.create);
router.post('/preview', ctrl.preview);
router.post('/bulk-generate', ctrl.bulkGenerate);
router.get('/:id', ctrl.getOne);
router.patch('/:id', ctrl.update);
router.post('/:id/mark-sent', ctrl.markSent);

module.exports = router;
