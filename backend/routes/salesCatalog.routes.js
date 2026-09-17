const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth.middleware');
const ctrl = require('../controllers/salesCatalog.controller');

router.use(authMiddleware);

router.get('/schedules', ctrl.schedules);   // list of editable price schedules
router.get('/', ctrl.list);                  // ?vertical= → one schedule's items
router.post('/', ctrl.create);               // add an item to a schedule
router.patch('/:id', ctrl.update);           // edit an item's price / name / type

module.exports = router;
