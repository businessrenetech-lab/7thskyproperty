const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/portal.controller');
const { authMiddleware } = require('../middleware/auth.middleware');

// Any authenticated user; the controller scopes strictly to their own records.
router.use(authMiddleware);
router.get('/dashboard', ctrl.dashboard);

module.exports = router;
