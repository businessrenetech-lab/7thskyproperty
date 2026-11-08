const express = require('express');

const router = express.Router();
const { authMiddleware, roleMiddleware } = require('../middleware/auth.middleware');
const ctrl = require('../controllers/appearance.controller');

router.use(authMiddleware);
router.get('/', ctrl.get);
router.put('/', roleMiddleware(['super_admin']), ctrl.update);

module.exports = router;
