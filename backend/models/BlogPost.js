const { DataTypes } = require('sequelize');
const sequelize = require('../config/db.config');
const User = require('./User');
const Branch = require('./Branch');

const BlogPost = sequelize.define('BlogPost', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  branch_id: {
    type: DataTypes.INTEGER,
    references: {
      model: Branch,
      key: 'id',
    },
  },
  author_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: User,
      key: 'id',
    },
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  slug: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false,
  },
  excerpt: {
    type: DataTypes.STRING,
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  image_url: {
    type: DataTypes.STRING,
  },
  category: {
    type: DataTypes.STRING,
  },
  tags: {
    type: DataTypes.JSON,
  },
  course_relation: {
    type: DataTypes.STRING,
  },
  reading_time: {
    type: DataTypes.INTEGER,
  },
  seo_title: {
    type: DataTypes.STRING,
  },
  seo_description: {
    type: DataTypes.STRING,
  },
  is_published: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  is_featured: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  published_at: {
    type: DataTypes.DATE,
  },
}, {
  tableName: 'blog_posts',
  underscored: true,
});

BlogPost.belongsTo(User, { as: 'author', foreignKey: 'author_id' });
User.hasMany(BlogPost, { foreignKey: 'author_id' });

BlogPost.belongsTo(Branch, { foreignKey: 'branch_id' });
Branch.hasMany(BlogPost, { foreignKey: 'branch_id' });

module.exports = BlogPost;
