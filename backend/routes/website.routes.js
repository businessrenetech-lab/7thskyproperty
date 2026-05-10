const express = require('express');
const router = express.Router();
const websiteController = require('../controllers/website.controller');
const { protect, authorize } = require('../middleware/auth.middleware');
const { branchMiddleware } = require('../middleware/branch.middleware');
const uploadCourseImage = require('../utils/uploadCourseImage');
const uploadBlogImage = require('../utils/uploadBlogImage');

// Protect all website management routes
router.use(protect);
router.use(authorize(['super_admin', 'branch_admin', 'hr']));
router.use(branchMiddleware);

// Blog Posts
router.get('/blogs', websiteController.getAllBlogPosts);
router.post('/blogs', websiteController.createBlogPost);
router.put('/blogs/:id', websiteController.updateBlogPost);
router.delete('/blogs/:id', websiteController.deleteBlogPost);
router.post('/blogs/upload-image', uploadBlogImage.single('image'), websiteController.uploadBlogImage);

// Courses (Website specific settings)
router.get('/courses', websiteController.getWebsiteCourses);
router.post('/courses/upload-image', uploadCourseImage.single('image'), websiteController.uploadCourseImage);
router.put('/courses/:id', websiteController.updateWebsiteCourse);

// Resources
const uploadResourceFile = require('../utils/uploadResourceFile');
router.get('/resources', websiteController.getAllResources);
router.post('/resources', websiteController.createResource);
router.put('/resources/:id', websiteController.updateResource);
router.delete('/resources/:id', websiteController.deleteResource);
router.post('/resources/upload', uploadResourceFile.single('file'), websiteController.uploadResourceFile);

module.exports = router;
