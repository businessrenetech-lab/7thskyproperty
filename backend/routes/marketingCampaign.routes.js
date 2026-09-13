'use strict';

const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/marketingCampaign.controller');
const { authMiddleware, roleMiddleware } = require('../middleware/auth.middleware');

const ROLES = ['super_admin', 'branch_admin', 'property_manager', 'sales_executive', 'accounts'];
router.use(authMiddleware, roleMiddleware(ROLES));

// ── Templates ──
router.get('/templates', ctrl.listTemplates);
router.get('/templates/:id', ctrl.getTemplate);
router.post('/templates', ctrl.createTemplate);
router.put('/templates/:id', ctrl.updateTemplate);
router.delete('/templates/:id', ctrl.deleteTemplate);
router.post('/templates/preview', ctrl.previewTemplate);

// ── Campaigns ──
router.get('/campaigns', ctrl.listCampaigns);
router.get('/campaigns/:id', ctrl.getCampaign);
router.post('/campaigns', ctrl.createCampaign);
router.post('/campaigns/:id/send', ctrl.sendCampaign);
router.post('/campaigns/auto-draft/:propertyId', ctrl.autoDraftForProperty);

// ── Quick Direct Broadcast & Test ──
router.post('/broadcast', ctrl.quickBroadcast);
router.post('/test-send', ctrl.testSend);

// ── Audience & Segments ──
router.post('/audience-count', ctrl.getAudienceCount);
router.get('/segments', ctrl.listSegments);
router.post('/segments', ctrl.createSegment);
router.delete('/segments/:id', ctrl.deleteSegment);

// ── Analytics & Logs ──
router.get('/analytics', ctrl.getAnalytics);
router.get('/logs', ctrl.getOutboxLogs);

module.exports = router;
