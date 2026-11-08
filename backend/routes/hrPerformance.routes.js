/**
 * /api/hr/performance: performance reviews ported from Hadi Real Estate (plan Task 28). Who may review whom is
 * checked in the controller: HR (perf.manage) anyone, a supervisor the people below them, the employee their own.
 */
const express = require('express');
const ctrl = require('../controllers/hrPerformance.controller');
const { authMiddleware } = require('../middleware/auth.middleware');

const router = express.Router();
router.use(authMiddleware);

router.get('/meta', ctrl.meta);
router.get('/mine', ctrl.mine);
router.get('/', ctrl.list);
router.post('/', ctrl.create);
router.patch('/:id', ctrl.update);
router.post('/:id/submit', ctrl.submit);
router.post('/:id/acknowledge', ctrl.acknowledge);
router.delete('/:id', ctrl.remove);

module.exports = router;
