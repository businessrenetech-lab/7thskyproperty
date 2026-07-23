const express = require('express');
const router = express.Router();
const wo = require('../controllers/careWorkOrder.controller');
const enq = require('../controllers/careEnquiry.controller');
const dash = require('../controllers/careDashboard.controller');
const quote = require('../controllers/careQuotation.controller');
const amc = require('../controllers/careAmc.controller');
const reg = require('../controllers/careRegisters.controller');
const { authMiddleware, roleMiddleware } = require('../middleware/auth.middleware');

const ROLES = ['super_admin', 'branch_admin', 'property_manager', 'sales_executive', 'accounts'];
router.use(authMiddleware, roleMiddleware(ROLES));

// Dashboard + customers + KPIs
router.get('/dashboard', dash.metrics);
router.get('/customers', dash.customers);
router.get('/kpis', reg.kpis);

// Quotations (site assessment → agreement → work order)
router.get('/quotations', quote.list);
router.post('/quotations', quote.create);
router.post('/quotations/from-enquiry/:enquiryId', quote.fromEnquiry);
router.get('/quotations/:id', quote.getOne);
router.put('/quotations/:id', quote.update);
router.post('/quotations/:id/send-agreement', quote.sendAgreement);
router.post('/quotations/:id/convert', quote.convert);

// AMC contracts
router.get('/amc', amc.list);
router.post('/amc', amc.create);
router.put('/amc/:id', amc.update);
router.post('/amc/:id/generate-visit', amc.generateVisit);

// Registers
router.get('/warranties', reg.warranty.list);
router.post('/warranties', reg.warranty.create);
router.put('/warranties/:id', reg.warranty.update);
router.get('/complaints', reg.complaint.list);
router.post('/complaints', reg.complaint.create);
router.put('/complaints/:id', reg.complaint.update);
router.get('/incidents', reg.incident.list);
router.post('/incidents', reg.incident.create);
router.put('/incidents/:id', reg.incident.update);

// Work orders & service tracking
router.get('/work-orders', wo.list);
router.post('/work-orders', wo.create);
router.get('/work-orders/matches', wo.matchProviders);      // ?category_id=&district=
router.get('/work-orders/:id', wo.getOne);
router.put('/work-orders/:id', wo.update);
router.get('/work-orders/:id/matches', wo.matchProviders);
router.post('/work-orders/:id/assign', wo.assign);
router.patch('/work-orders/:id/status', wo.setStatus);
router.post('/work-orders/:id/invoice', wo.invoice);
router.post('/work-orders/:id/pay-provider', wo.payProvider);

// Enquiries & leads
router.get('/enquiries', enq.list);
router.post('/enquiries', enq.create);
router.put('/enquiries/:id', enq.update);
router.patch('/enquiries/:id/stage', enq.setStage);
router.post('/enquiries/:id/convert', enq.convert);

module.exports = router;
