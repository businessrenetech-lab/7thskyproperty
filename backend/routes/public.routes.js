const express = require('express');
const router = express.Router();
const publicController = require('../controllers/public.controller');

// Unauthenticated public routes for the website
router.get('/courses', publicController.getPublishedCourses);
router.get('/courses/:slug', publicController.getCourseDetails);
router.get('/courses/:slug/batches', publicController.getCourseBatches);

router.get('/blog', publicController.getPublishedBlogs);
router.get('/blog/:slug', publicController.getBlogDetails);

router.post('/contact', publicController.submitContactForm);
router.post('/enquiries', publicController.submitCourseEnquiry);
router.post('/student-bookings', publicController.submitStudentBooking);

// Note: Registration and Payment points are handled separately or via another route file
module.exports = router;
