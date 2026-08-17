const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth.middleware');
const ctrl = require('../controllers/shortStayVerification.controller');

router.use(authMiddleware);

// Guest verification for a short-stay booking
router.get('/bookings/:id', ctrl.getVerification);
router.post('/bookings/:id/document', ctrl.attachDocument);
router.post('/bookings/:id/review-member', ctrl.reviewMember);
router.post('/bookings/:id/state', ctrl.setState);
router.post('/bookings/:id/risk', ctrl.saveRisk);
router.post('/bookings/:id/protected-doc', ctrl.addProtectedDoc);

module.exports = router;
