const express = require('express');
const router = express.Router();
const crmController = require('../controllers/crm.controller');
const { authMiddleware, roleMiddleware } = require('../middleware/auth.middleware');
const { branchMiddleware } = require('../middleware/branch.middleware');

router.use(authMiddleware);
router.use(roleMiddleware(['super_admin', 'branch_admin', 'counselor', 'staff']));
router.use(branchMiddleware);

// ── Courses (for CRM course dropdown) ─────────────────────
router.get('/courses', crmController.getCourses);

// ── Leads ─────────────────────────────────────────────────
router.get('/leads', crmController.getAllLeads);
router.post('/leads', crmController.createLead);
router.put('/leads/:id', crmController.updateLead);
router.patch('/leads/:id/status', crmController.updateLeadStatus);
router.delete('/leads/:id', crmController.deleteLead);
router.post('/leads/:id/convert', crmController.convertLead);
router.post('/leads/:id/enroll', crmController.enrollLead);
router.post('/leads/:id/successful', crmController.markSuccessful);

// ── Contacts ──────────────────────────────────────────────
router.get('/contacts', crmController.getContacts);
router.post('/contacts', crmController.createContact);
router.post('/contacts/bulk-upload', crmController.bulkUploadContacts);
router.patch('/contacts/bulk-status', crmController.bulkUpdateContactLeadStatus);
router.get('/contacts/:id', crmController.getContact);
router.put('/contacts/:id', crmController.updateContact);
router.delete('/contacts/:id', crmController.deleteContact);

// ── Opportunities (Deals) ─────────────────────────────────
router.get('/opportunities', crmController.getOpportunities);
router.post('/opportunities', crmController.createOpportunity);
router.put('/opportunities/:id', crmController.updateOpportunity);
router.delete('/opportunities/:id', crmController.deleteOpportunity);
router.post('/opportunities/:id/win', crmController.winOpportunity);
router.post('/opportunities/:id/lose', crmController.loseOpportunity);

// ── Activities ────────────────────────────────────────────
router.get('/activities', crmController.getActivities);
router.post('/activities', crmController.createActivity);
router.patch('/activities/:id/complete', crmController.completeActivity);

// ── Campaigns ─────────────────────────────────────────────
router.get('/campaigns', crmController.getCampaigns);
router.post('/campaigns', crmController.createCampaign);
router.post('/campaigns/:id/send', crmController.sendCampaign);
router.delete('/campaigns/:id', crmController.deleteCampaign);

// ── Analytics ─────────────────────────────────────────────
router.get('/analytics/funnel', crmController.getFunnel);
router.get('/analytics/source', crmController.getSourceAnalysis);
router.get('/analytics/forecast', crmController.getRevenueForecast);
router.get('/analytics/success-results', crmController.getSuccessResultsAnalysis);
router.get('/analytics/destination-countries', crmController.getSuccessDestinationAnalysis);

module.exports = router;
