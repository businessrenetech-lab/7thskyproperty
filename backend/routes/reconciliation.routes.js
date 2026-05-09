const express = require('express');
const router = express.Router();
const recon = require('../controllers/reconciliation.controller');
const { authMiddleware, roleMiddleware } = require('../middleware/auth.middleware');
const { branchMiddleware } = require('../middleware/branch.middleware');

router.use(authMiddleware);
router.use(roleMiddleware(['super_admin', 'branch_admin', 'accounts']));
router.use(branchMiddleware);

// ─── Stats ────────────────────────────────────────────────────────────────────
router.get('/stats', recon.getStats);
router.get('/dashboard', recon.getLiquidityDashboard);
router.get('/reports', recon.getLiquidityReports);

// ─── Bank Accounts (compatibility) ────────────────────────────────────────────
router.get('/accounts', recon.getBankAccounts);

// ─── Mappings ─────────────────────────────────────────────────────────────────
router.get('/mappings', recon.getMappings);
router.post('/mappings', recon.createMapping);
router.put('/mappings/:id', recon.updateMapping);
router.delete('/mappings/:id', recon.deleteMapping);

// ─── Sessions ─────────────────────────────────────────────────────────────────
router.post('/generate', recon.generateSession);
router.post('/opening-balance', recon.recordOpeningBalance);
router.post('/collections', recon.recordCollection);
router.post('/transfers', recon.recordTransfer);
router.post('/closing-balance', recon.recordClosingBalance);
router.get('/sessions', recon.getSessions);
router.get('/sessions/:id', recon.getSessionDetail);
router.post('/sessions/:id/review', recon.reviewSession);
router.post('/sessions/:id/approve', recon.approveSession);
router.post('/sessions/:id/reopen', recon.reopenSession);
router.post('/sessions/:id/lock', recon.lockSession);

// ─── Line Detail & Edit ───────────────────────────────────────────────────────
router.get('/lines/:lineId/detail', recon.getLineDetail);
router.patch('/lines/:lineId', recon.updateLineNotes);

module.exports = router;
