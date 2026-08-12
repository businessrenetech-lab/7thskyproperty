/**
 * /api/wt-invoices — Water Tank invoicing.
 */
const express = require('express');

const router = express.Router();
const { authMiddleware } = require('../middleware/auth.middleware');
const ctrl = require('../controllers/waterTankInvoice.controller');

router.use(authMiddleware);

router.get('/reference', ctrl.reference);
router.get('/overview', ctrl.overview);
router.get('/client-lookup', ctrl.clientLookup);

// AMC billing — preview the instalment schedule, or raise it as drafts.
router.get('/amc/:amcCode/preview', ctrl.previewAmc);
router.post('/amc/:amcCode/generate', ctrl.createFromAmc);

router.get('/', ctrl.list);
router.post('/', ctrl.create);

// Nested actions before /:code so they win the match.
router.get('/:code/pdf', ctrl.pdf);
router.post('/:code/send', ctrl.send);
router.post('/:code/payments', ctrl.recordPayment);
router.post('/:code/void', ctrl.void);

router.get('/:code', ctrl.detail);
router.patch('/:code', ctrl.update);
router.delete('/:code', ctrl.remove);

module.exports = router;
