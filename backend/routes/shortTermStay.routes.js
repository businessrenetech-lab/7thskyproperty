/**
 * shortTermStay.routes.js — Protected Express Router for Short Term Stay.
 */
const express = require('express');
const router = express.Router();
const { authMiddleware, roleMiddleware } = require('../middleware/auth.middleware');
const ctrl = require('../controllers/shortTermStay.controller');

router.use(authMiddleware);

const READ_ROLES = ['super_admin', 'branch_admin', 'property_manager', 'accounts', 'sales_executive'];
const WRITE_ROLES = ['super_admin', 'branch_admin', 'property_manager'];
const BOOKING_WRITE_ROLES = [...WRITE_ROLES, 'sales_executive'];
const FINANCE_ROLES = ['super_admin', 'branch_admin', 'property_manager', 'accounts'];
const read = roleMiddleware(READ_ROLES);
const write = roleMiddleware(WRITE_ROLES);
const bookingWrite = roleMiddleware(BOOKING_WRITE_ROLES);
const finance = roleMiddleware(FINANCE_ROLES);

// Hub Dashboard
router.get('/dashboard', read, ctrl.getDashboardSummary);

// Module settings (defaults for rates, policy, rules, checklists)
router.get('/settings', read, ctrl.getSettings);
router.put('/settings', roleMiddleware(['super_admin', 'branch_admin']), ctrl.saveSettings);

// Properties & Profile Setup
router.get('/properties', read, ctrl.getProperties);
router.post('/properties', write, ctrl.upsertPropertyProfile);
router.post('/properties/onboard', write, ctrl.onboardProperty);
router.get('/properties/:id/dashboard', write, ctrl.getPropertyDashboard);
router.put('/properties/:id', write, ctrl.updatePropertyProfile);
router.patch('/properties/:id/website-toggle', write, ctrl.toggleWebsiteListing);
router.patch('/properties/:id/status', write, ctrl.setPropertyStatus);
router.put('/properties/:id/readiness', write, ctrl.savePropertyReadiness);
router.get('/properties/:id/rate-plans', read, ctrl.getRatePlans);
router.post('/properties/:id/rate-plans', write, ctrl.createRatePlan);
router.patch('/rate-plans/:id', write, ctrl.updateRatePlan);
router.delete('/rate-plans/:id', write, ctrl.deleteRatePlan);

// Availability timeline
router.get('/availability', read, ctrl.getAvailability);
router.post('/availability/blocks', write, ctrl.createAvailabilityBlock);
router.patch('/availability/blocks/:id', write, ctrl.updateAvailabilityBlock);
router.delete('/availability/blocks/:id', write, ctrl.deleteAvailabilityBlock);

// Enquiries & Guests
router.get('/enquiries', read, ctrl.getEnquiries);
router.post('/enquiries/:id/qualify', bookingWrite, ctrl.qualifyEnquiry);
router.post('/enquiries/:id/convert', bookingWrite, ctrl.convertEnquiry);
router.get('/guests', read, ctrl.getGuests);

// Owner Agreements
router.get('/owner-agreements', read, ctrl.getOwnerAgreements);
router.post('/owner-agreements/build', write, ctrl.buildOwnerAgreement);

// Bookings & Guest Agreements
router.get('/bookings', read, ctrl.getBookings);
router.post('/bookings', bookingWrite, ctrl.createBooking);
router.get('/bookings/:id', read, ctrl.getBookingDetail);
router.patch('/bookings/:id', bookingWrite, ctrl.amendBooking);
router.post('/bookings/:id/confirm', bookingWrite, ctrl.confirmBooking);
router.post('/bookings/:id/cancel', bookingWrite, ctrl.cancelBooking);
router.get('/guest-agreements', read, ctrl.getGuestAgreements);
router.post('/guest-agreements/build', bookingWrite, ctrl.buildGuestAgreement);

// Finance & Reports
router.get('/payments', finance, ctrl.getPayments);
router.get('/owner-statements', finance, ctrl.getOwnerStatements);
router.post('/owner-statements/generate', finance, ctrl.generateOwnerStatements);
router.patch('/owner-statements/:id/status', finance, ctrl.updateOwnerStatementStatus);
router.get('/reports', finance, ctrl.getReports);

// Operations: Check-In & Check-Out
router.get('/checkinout', read, ctrl.getCheckInOutBoard);
router.post('/check-in', write, ctrl.executeCheckIn);
router.post('/check-out', write, ctrl.executeCheckOut);
router.post('/readiness', write, ctrl.saveReadiness);
router.get('/bookings/:id/readiness', read, ctrl.getReadiness);

// Housekeeping
router.get('/housekeeping', read, ctrl.getHousekeepingTasks);
router.post('/housekeeping', write, ctrl.createHousekeepingTask);
router.patch('/housekeeping/:id', write, ctrl.updateHousekeepingTask);

// Incidents & Damage Claims
router.get('/incidents', read, ctrl.getIncidents);
router.post('/incidents', write, ctrl.createIncident);
router.patch('/incidents/:id', write, ctrl.updateIncident);

module.exports = router;
