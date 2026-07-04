const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/registerEntry.controller');
const { authMiddleware, roleMiddleware } = require('../middleware/auth.middleware');

router.use(authMiddleware, roleMiddleware(['super_admin', 'branch_admin', 'property_manager', 'sales_executive']));
router.get('/definitions', ctrl.definitions);
router.get('/entries', ctrl.listEntries);
router.post('/entries', ctrl.createEntry);
router.put('/entries/:id', ctrl.updateEntry);
router.delete('/entries/:id', ctrl.removeEntry);

module.exports = router;
