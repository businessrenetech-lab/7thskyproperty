const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/workOrder.controller');
const { authMiddleware, roleMiddleware } = require('../middleware/auth.middleware');

router.use(authMiddleware, roleMiddleware(['super_admin', 'branch_admin', 'property_manager', 'accounts']));
router.get('/', ctrl.list);
router.post('/', ctrl.create);
router.get('/:id', ctrl.getOne);
router.put('/:id', ctrl.update);

// Lifecycle
router.post('/:id/triage', ctrl.triage);
router.post('/:id/decide', ctrl.decide);
router.post('/:id/assign', ctrl.assign);
router.post('/:id/start', ctrl.start);
router.post('/:id/complete', ctrl.complete);

// Quotes
router.get('/:id/quotes', ctrl.listQuotes);
router.post('/:id/quotes', ctrl.addQuote);
router.post('/:id/quotes/:quoteId/select', ctrl.selectQuote);
router.delete('/:id/quotes/:quoteId', ctrl.removeQuote);

module.exports = router;
