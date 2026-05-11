require('dotenv').config();
const sequelize = require('./config/db.config');

const BlogPost = require('./models/BlogPost');
const Resource = require('./models/Resource');
const BlogResource = require('./models/BlogResource');

async function syncModels() {
  try {
    await sequelize.authenticate();
    console.log('DB connected');

    await BlogPost.sync({ alter: true });
    console.log('BlogPost synced');

    await Resource.sync({ alter: true });
    console.log('Resource synced');

    await BlogResource.sync({ alter: true });
    console.log('BlogResource synced');

    console.log('Done');
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

syncModels();
