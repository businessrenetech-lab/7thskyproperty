/**
 * ═══════════════════════════════════════════════════════════════
 *  BIOMETRIC ROUTES
 *  
 *  TWO route groups mounted at different paths in server.js:
 *  
 *  1. /iclock/*   → ADMS protocol (no auth — device-facing)
 *  2. /api/biometric/* → Admin management (JWT + role auth)
 *  
 *  The /iclock routes use text/plain body parser because ZKTeco
 *  devices send data as plain text, not JSON.
 * ═══════════════════════════════════════════════════════════════
 */

const express = require('express');
const biometric = require('../controllers/biometric.controller');
const { authMiddleware, roleMiddleware } = require('../middleware/auth.middleware');
const { branchMiddleware } = require('../middleware/branch.middleware');

/* ═══════════════════════════════════════════════════════════════
   GROUP 1: ADMS Protocol Routes (/iclock/*)
   Called by ZKTeco devices — NO authentication
   ═══════════════════════════════════════════════════════════════ */

const admsRouter = express.Router();

// ZKTeco sends ATTLOG as plain text body (not JSON)
admsRouter.use(express.text({ type: '*/*', limit: '5mb' }));

// Device handshake + push attendance logs
admsRouter.get('/cdata', biometric.handleCdata);
admsRouter.post('/cdata', biometric.handleCdata);

// Device polls for pending commands
admsRouter.get('/getrequest', biometric.handleGetRequest);

// Device reports command execution results
admsRouter.post('/devicecmd', biometric.handleDeviceCmd);

/* ═══════════════════════════════════════════════════════════════
   GROUP 2: Admin API Routes (/api/biometric/*)
   Called by admin portal — JWT + role authentication
   ═══════════════════════════════════════════════════════════════ */

const apiRouter = express.Router();

apiRouter.use(authMiddleware);
apiRouter.use(roleMiddleware(['super_admin', 'branch_admin', 'hr']));
apiRouter.use(branchMiddleware);

// ─── Dashboard ───────────────────────────────────────────────
apiRouter.get('/dashboard', biometric.getDashboard);

// ─── Device Management ──────────────────────────────────────
apiRouter.get('/devices', biometric.getDevices);
apiRouter.get('/devices/health', biometric.getDeviceHealth);
apiRouter.get('/devices/:id', biometric.getDevice);
apiRouter.post('/devices', biometric.createDevice);
apiRouter.patch('/devices/:id', biometric.updateDevice);
apiRouter.delete('/devices/:id', biometric.deleteDevice);
apiRouter.post('/devices/:id/sync', biometric.syncDevice);


// ─── User PIN Mappings ──────────────────────────────────────
apiRouter.get('/mappings', biometric.getMappings);
apiRouter.post('/mappings', biometric.createMapping);
apiRouter.post('/mappings/bulk', biometric.createBulkMappings);
apiRouter.patch('/mappings/:id', biometric.updateMapping);
apiRouter.delete('/mappings/:id', biometric.deleteMapping);

// ─── Raw Logs & Processing ──────────────────────────────────
apiRouter.get('/logs', biometric.getLogs);
apiRouter.get('/logs/unmatched', biometric.getUnmatchedLogs);
apiRouter.post('/logs/reprocess', biometric.reprocessLogs);
apiRouter.post('/process', biometric.triggerProcessing);

// ─── Device Commands ────────────────────────────────────────
apiRouter.get('/commands', biometric.getCommands);
apiRouter.post('/commands', biometric.sendCommand);

module.exports = { admsRouter, apiRouter };
