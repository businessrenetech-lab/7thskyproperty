const BlogPost = require('../models/BlogPost');
const Course = require('../models/Course');
const { injectBranchFilter } = require('../middleware/branch.middleware');

const getEffectiveBranchId = (req) => req.scopedBranchId || req.branchId;

// --- BLOG POSTS ---

exports.getAllBlogPosts = async (req, res) => {
  try {
    const branchWhere = injectBranchFilter(req, {});
    const posts = await BlogPost.findAll({
      where: branchWhere,
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
    const { title, slug, excerpt, content, image_url, is_published } = req.body;
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
    const branchWhere = injectBranchFilter(req, { id });

    const post = await BlogPost.findOne({ where: branchWhere });
    if (!post) return res.status(404).json({ error: 'Blog post not found' });

    const { title, slug, excerpt, content, image_url, is_published } = req.body;
    
    const updateData = { title, slug, excerpt, content, image_url, is_published };
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
    const branchWhere = injectBranchFilter(req, { id });

    const post = await BlogPost.findOne({ where: branchWhere });
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
    const branchWhere = injectBranchFilter(req, {});
    const courses = await Course.findAll({
      where: branchWhere,
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
    const branchWhere = injectBranchFilter(req, { id });

    const course = await Course.findOne({ where: branchWhere });
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
