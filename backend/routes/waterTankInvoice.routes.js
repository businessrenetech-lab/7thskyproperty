/**
 * /api/wt-invoices — Water Tank invoicing.
 */
const express = require('express');

const router = express.Router();
const { authMiddleware } = require('../middleware/auth.middleware');
const { canRead, canTransact, canAdminister } = require('../middleware/wtRoles');
const ctrl = require('../controllers/waterTankInvoice.controller');

router.use(authMiddleware);

// Reading the ledger is open to anyone who works the operation.
router.get('/reference', canRead, ctrl.reference);
router.get('/overview', canRead, ctrl.overview);
router.get('/client-lookup', canRead, ctrl.clientLookup);

// AMC billing — previewing a schedule is free; raising it commits money.
router.get('/amc/:amcCode/preview', canRead, ctrl.previewAmc);
router.post('/amc/:amcCode/generate', canTransact, ctrl.createFromAmc);

router.get('/', canRead, ctrl.list);
router.post('/', canTransact, ctrl.create);

// Nested actions before /:code so they win the match.
router.get('/:code/pdf', canRead, ctrl.pdf);
router.post('/:code/send', canTransact, ctrl.send);
router.post('/:code/payments', canTransact, ctrl.recordPayment);
router.post('/:code/void', canTransact, ctrl.void);

router.get('/:code', canRead, ctrl.detail);
router.patch('/:code', canTransact, ctrl.update);
// Deleting a financial record — even a draft — stays with administrators.
router.delete('/:code', canAdminister, ctrl.remove);

module.exports = router;
