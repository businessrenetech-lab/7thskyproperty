const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/property.controller');
const { authMiddleware, roleMiddleware } = require('../middleware/auth.middleware');

const ROLES = ['super_admin', 'branch_admin', 'property_manager', 'sales_executive'];
router.use(authMiddleware, roleMiddleware(ROLES));

// Core CRUD
router.get('/', ctrl.list);
router.post('/', ctrl.create);
router.get('/:id', ctrl.getOne);
router.put('/:id', ctrl.update);
router.delete('/:id', ctrl.remove);

// Property tenancies
router.get('/:id/tenancies', ctrl.propertyTenancies);
router.post('/:id/tenancies', ctrl.createPropertyTenancy);

// Financials
router.get('/:id/financials', ctrl.propertyFinancials);
router.get('/:id/transactions', ctrl.propertyTransactions);

// Lifecycle state + next action + blockers (Phase 2)
router.get('/:id/state', ctrl.getState);

// Media gallery (photos/videos — public assets)
const uploadAny = require('../utils/uploadAny');
const forcePublicFolder = (req, res, next) => { req.uploadFolder = 'properties'; next(); };
router.post('/:id/media', forcePublicFolder, uploadAny.single('file'), ctrl.addMedia);
router.patch('/:id/media/:mediaId', ctrl.updateMedia);
router.delete('/:id/media/:mediaId', ctrl.removeMedia);

// Unified documents
router.get('/:id/documents', ctrl.propertyDocuments);
router.post('/:id/documents', ctrl.uploadDocument);
router.patch('/:id/documents/:docId/verify', ctrl.verifyDocument);

// Owner profile (KYC + banking + fees)
router.get('/:id/owner-profile', ctrl.getOwnerProfile);
router.post('/:id/owner-profile', ctrl.saveOwnerProfile);

// Rental-management workflow + owner onboarding checklist
router.get('/:id/pm-workflow', ctrl.getPmWorkflow);
router.post('/:id/start-workflow', ctrl.startPmWorkflow);
router.get('/:id/onboarding-items', ctrl.getOnboardingItems);
router.patch('/:id/onboarding-items/:itemId', ctrl.updateOnboardingItem);

// Fee schedule
router.post('/:id/fees', ctrl.addFee);
router.delete('/:id/fees/:feeId', ctrl.removeFee);

// Property communications
router.get('/:id/communications', ctrl.propertyCommunications);
router.post('/:id/communications', ctrl.createPropertyCommunication);

module.exports = router;
