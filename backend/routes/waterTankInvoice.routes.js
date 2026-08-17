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

// Who owes what, grouped by client rather than by invoice — the question an
// operator asks when someone turns up to pay. Declared before /:code.
router.get('/collections', canRead, ctrl.collections);
// One lump sum across several invoices, posted atomically.
router.post('/payments/bulk', canTransact, ctrl.bulkPayment);

router.get('/', canRead, ctrl.list);
router.post('/', canTransact, ctrl.create);

// Nested actions before /:code so they win the match.
router.get('/:code/pdf', canRead, ctrl.pdf);
router.post('/:code/send', canTransact, ctrl.send);
router.get('/:code/actions', canRead, ctrl.actions);
router.get('/:code/payments', canRead, ctrl.paymentHistory);
router.post('/:code/payments', canTransact, ctrl.recordPayment);
// Reversing a receipt is a correction to the books, so it sits with the people
// who can bind the business rather than with everyone who can record one.
router.post('/:code/payments/:eventId/reverse', canAdminister, ctrl.reversePayment);
// Refunding is money LEAVING the business — not a correction to a mistake — so
// it sits with administrators alongside reversal rather than with everyone who
// can take a payment in.
router.post('/:code/refunds', canAdminister, ctrl.refund);
router.post('/:code/void', canTransact, ctrl.void);

router.get('/:code', canRead, ctrl.detail);
router.patch('/:code', canTransact, ctrl.update);
// Deleting a financial record — even a draft — stays with administrators.
router.delete('/:code', canAdminister, ctrl.remove);

module.exports = router;
