const BlogPost = require('../models/BlogPost');
const Course = require('../models/Course');
const { injectBranchFilter } = require('../middleware/branch.middleware');

const getEffectiveBranchId = (req) => req.scopedBranchId || req.branchId;
const scopedById = (req, id) => injectBranchFilter(req, { where: { id } });

// --- BLOG POSTS ---

exports.getAllBlogPosts = async (req, res) => {
  try {
    // Bypass branch filtering so admin can see all blogs
    const posts = await BlogPost.findAll({
      order: [['created_at', 'DESC']],
      include: [
        { model: require('../models/User'), as: 'author', attributes: ['id', 'name'] }
      ]
    });
    res.json(posts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.createBlogPost = async (req, res) => {
  try {
    const { title, slug, excerpt, content, image_url, is_published, category, tags, course_relation, reading_time, seo_title, seo_description, is_featured } = req.body;
    const branch_id = getEffectiveBranchId(req);
    if (!branch_id) return res.status(400).json({ error: 'Please select a specific branch' });
    const author_id = req.user.id;

    const post = await BlogPost.create({
      branch_id,
      author_id,
      title,
      slug,
      excerpt,
      content,
      image_url,
      category,
      tags,
      course_relation,
      reading_time,
      seo_title,
      seo_description,
      is_featured,
      is_published,
      published_at: is_published ? new Date() : null
    });

    res.status(201).json(post);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateBlogPost = async (req, res) => {
  try {
    const { id } = req.params;
    const post = await BlogPost.findOne(scopedById(req, id));
    if (!post) return res.status(404).json({ error: 'Blog post not found' });

    const { title, slug, excerpt, content, image_url, is_published, category, tags, course_relation, reading_time, seo_title, seo_description, is_featured } = req.body;
    
    const updateData = { title, slug, excerpt, content, image_url, category, tags, course_relation, reading_time, seo_title, seo_description, is_featured, is_published };
    if (is_published && !post.is_published) {
      updateData.published_at = new Date();
    } else if (!is_published) {
      updateData.published_at = null;
    }

    await post.update(updateData);
    res.json(post);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.deleteBlogPost = async (req, res) => {
  try {
    const { id } = req.params;
    const post = await BlogPost.findOne(scopedById(req, id));
    if (!post) return res.status(404).json({ error: 'Blog post not found' });

    await post.destroy();
    res.json({ message: 'Blog post deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// --- COURSES ---

exports.getWebsiteCourses = async (req, res) => {
  try {
    const courses = await Course.findAll({
      order: [['created_at', 'DESC']]
    });
    res.json(courses);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateWebsiteCourse = async (req, res) => {
  try {
    const { id } = req.params;
    const course = await Course.findOne(scopedById(req, id));
    if (!course) return res.status(404).json({ error: 'Course not found' });

    const allowedFields = ['is_published', 'image_url', 'short_description'];
    const updateData = {};
    allowedFields.forEach((field) => {
      if (Object.prototype.hasOwnProperty.call(req.body, field)) {
        updateData[field] = req.body[field];
      }
    });

    await course.update(updateData);
    
    res.json(course);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.uploadCourseImage = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No image file provided' });
    res.json({ url: `/uploads/courses/${req.file.filename}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.uploadBlogImage = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No image file provided' });
    res.json({ url: `/uploads/blogs/${req.file.filename}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// --- RESOURCES ---

exports.getAllResources = async (req, res) => {
  try {
    const ResourceModel = require('../models/Resource');
    const resources = await ResourceModel.findAll({
      order: [['created_at', 'DESC']]
    });
    res.json(resources);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.createResource = async (req, res) => {
  try {
    const { title, slug, description, type, category, level, file_url, external_url, thumbnail_url, is_free, status } = req.body;
    const branch_id = getEffectiveBranchId(req);
    const ResourceModel = require('../models/Resource');
    
    if (!branch_id) return res.status(400).json({ error: 'Please select a specific branch' });

    const resource = await ResourceModel.create({
      branch_id,
      title,
      slug,
      description,
      type,
      category,
      level,
      file_url,
      external_url,
      thumbnail_url,
      is_free,
      status
    });

    res.status(201).json(resource);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateResource = async (req, res) => {
  try {
    const { id } = req.params;
    const ResourceModel = require('../models/Resource');

    const resource = await ResourceModel.findOne(scopedById(req, id));
    if (!resource) return res.status(404).json({ error: 'Resource not found' });

    const { title, slug, description, type, category, level, file_url, external_url, thumbnail_url, is_free, status } = req.body;
    
    await resource.update({
      title, slug, description, type, category, level, file_url, external_url, thumbnail_url, is_free, status
    });
    
    res.json(resource);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.deleteResource = async (req, res) => {
  try {
    const { id } = req.params;
    const ResourceModel = require('../models/Resource');

    const resource = await ResourceModel.findOne(scopedById(req, id));
    if (!resource) return res.status(404).json({ error: 'Resource not found' });

    await resource.destroy();
    res.json({ message: 'Resource deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.uploadResourceFile = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file provided' });
    res.json({ url: `/uploads/resources/${req.file.filename}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
