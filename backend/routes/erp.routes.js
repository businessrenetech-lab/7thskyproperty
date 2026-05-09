const express = require('express');
const router = express.Router();
const erpController = require('../controllers/erp.controller');
const { authMiddleware, roleMiddleware } = require('../middleware/auth.middleware');
const { branchMiddleware } = require('../middleware/branch.middleware');

router.use(authMiddleware);
router.use(roleMiddleware(['super_admin', 'branch_admin']));
router.use(branchMiddleware);

router.get('/rooms', erpController.getRooms);
router.post('/rooms', erpController.createRoom);
router.get('/bookings', erpController.getBookings);
router.post('/bookings', erpController.bookRoom);
router.delete('/bookings/:id', erpController.deleteBooking);

module.exports = router;
