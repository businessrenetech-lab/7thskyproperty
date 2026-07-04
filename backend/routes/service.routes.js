const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/service.controller');
const { authMiddleware } = require('../middleware/auth.middleware');

router.use(authMiddleware);
router.get('/verticals', ctrl.verticals);
router.get('/workflows', ctrl.workflows);
router.get('/registers', ctrl.registers);
router.get('/', ctrl.catalog);

module.exports = router;
