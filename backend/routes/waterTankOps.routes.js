/**
 * waterTankOps.routes.js — the console's shared read surface.
 *
 * This router carries the cross-entity reads (dashboard, search, pipeline,
 * payments) and a generic CRUD family that predates the specialist controllers.
 * Two things about it were wrong and are fixed here:
 *
 *   1. It had NO role guard of any kind, only authMiddleware. Any signed-in
 *      user — including a tenant or an owner — could post money against an
 *      invoice or delete a record. It was also the one water-tank route file the
 *      Phase 1 guard sweep missed, because the sweep listed the specialist
 *      routers by name.
 *   2. It owned two money endpoints that duplicated the specialist ones with
 *      different rules and no transaction. Those now live on the invoice and
 *      work-order controllers and write through wtLedger.service; the old paths
 *      answer 410 with the replacement, so an old client fails loudly rather
 *      than silently posting through a second, weaker path.
 */
const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth.middleware');
const { canRead, canOperate, canAdminister } = require('../middleware/wtRoles');
const ctrl = require('../controllers/waterTankOps.controller');

router.use(authMiddleware);

// Operations Dashboard aggregate
router.get('/dashboard', canRead, ctrl.dashboard);
// Console-wide search (must precede /:entity)
router.get('/search', canRead, ctrl.search);
// Pipeline map: which entity advances to which
router.get('/pipeline', canRead, ctrl.pipeline);
// Payments & Disbursements: client receivables + provider payables
router.get('/payments', canRead, ctrl.payments);
// The money ledger itself — every receipt and payout, newest first
router.get('/money-journal', canRead, ctrl.moneyJournal);
// Everything waiting on someone — drives both the work queue and the sidebar badges
router.get('/work-queue', canRead, ctrl.workQueue);

// Site assessment reference data (checklist templates, equipment, categories)
router.get('/assessment-reference', canRead, ctrl.assessmentReference);

// Running commentary on any commentable record.
// Declared before the generic /:entity/:id family so they are not swallowed.
router.get('/:entityType/:id/comments', canRead, ctrl.listComments);
router.post('/:entityType/:id/comments', canOperate, ctrl.addComment);
router.patch('/:entityType/:id/comments/:commentId', canOperate, ctrl.updateComment);
router.delete('/:entityType/:id/comments/:commentId', canOperate, ctrl.deleteComment);

/*
 * Retired money endpoints. Kept as explicit 410s rather than deleted so that a
 * stale frontend or an integration gets a message naming the replacement,
 * instead of a 404 that looks like a routing bug.
 */
router.post('/work-orders/:id/pay-provider', ctrl.retiredMoneyRoute('POST /api/wt-work-orders/:id/pay-provider'));
router.post('/invoices/:id/record-payment', ctrl.retiredMoneyRoute('POST /api/wt-invoices/:code/payments'));

// Generic CRUD per entity (clients, service-requests, site-assessments, quotations,
// work-orders, amc, invoices, complaints, providers, comms)
router.get('/:entity', canRead, ctrl.list);
router.post('/:entity', canOperate, ctrl.create);
// Advance a record to the next stage of the service operation
router.post('/:entity/:id/advance', canOperate, ctrl.advance);
router.get('/:entity/:id', canRead, ctrl.detail);
router.patch('/:entity/:id', canOperate, ctrl.update);
router.delete('/:entity/:id', canAdminister, ctrl.remove);

module.exports = router;
