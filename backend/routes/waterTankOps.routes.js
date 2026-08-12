const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth.middleware');
const ctrl = require('../controllers/waterTankOps.controller');

router.use(authMiddleware);

// Operations Dashboard aggregate
router.get('/dashboard', ctrl.dashboard);
// Console-wide search (must precede /:entity)
router.get('/search', ctrl.search);
// Pipeline map: which entity advances to which
router.get('/pipeline', ctrl.pipeline);
// Payments & Disbursements: client receivables + provider payables
router.get('/payments', ctrl.payments);

// Site assessment reference data (checklist templates, equipment, categories)
router.get('/assessment-reference', ctrl.assessmentReference);

// Running commentary on any commentable record.
// Declared before the generic /:entity/:id family so they are not swallowed.
router.get('/:entityType/:id/comments', ctrl.listComments);
router.post('/:entityType/:id/comments', ctrl.addComment);
router.patch('/:entityType/:id/comments/:commentId', ctrl.updateComment);
router.delete('/:entityType/:id/comments/:commentId', ctrl.deleteComment);

// Money movements (must precede the generic /:entity/:id routes)
router.post('/work-orders/:id/pay-provider', ctrl.payProvider);
router.post('/invoices/:id/record-payment', ctrl.recordPayment);

// Generic CRUD per entity (clients, service-requests, site-assessments, quotations,
// work-orders, amc, invoices, complaints, providers, comms)
router.get('/:entity', ctrl.list);
router.post('/:entity', ctrl.create);
// Advance a record to the next stage of the service operation
router.post('/:entity/:id/advance', ctrl.advance);
router.get('/:entity/:id', ctrl.detail);
router.patch('/:entity/:id', ctrl.update);
router.delete('/:entity/:id', ctrl.remove);

module.exports = router;
