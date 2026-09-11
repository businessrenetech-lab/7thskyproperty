const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/savedView.controller');
const { authMiddleware } = require('../middleware/auth.middleware');

router.use(authMiddleware); // any authenticated staff; views are per-user

router.get('/', ctrl.list);
router.post('/', ctrl.create);
router.delete('/:id', ctrl.remove);

module.exports = router;
