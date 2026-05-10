const { DataTypes } = require('sequelize');
const sequelize = require('../config/db.config');
const BlogPost = require('./BlogPost');
const Resource = require('./Resource');

const BlogResource = sequelize.define('BlogResource', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  blog_post_id: {
    type: DataTypes.INTEGER,
    references: {
      model: BlogPost,
      key: 'id',
    },
    allowNull: false,
  },
  resource_id: {
    type: DataTypes.INTEGER,
    references: {
      model: Resource,
      key: 'id',
    },
    allowNull: false,
  },
}, {
  tableName: 'blog_resources',
  underscored: true,
  timestamps: false, // It's just a junction table, standard timestamps might not be heavily needed, but we can add them if needed. Let's keep it simple.
});

// Setup relationships
BlogPost.belongsToMany(Resource, { through: BlogResource, foreignKey: 'blog_post_id', as: 'resources' });
Resource.belongsToMany(BlogPost, { through: BlogResource, foreignKey: 'resource_id', as: 'blogs' });

module.exports = BlogResource;
