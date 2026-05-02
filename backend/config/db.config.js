const { Sequelize } = require('sequelize');
require('dotenv').config();

const isProduction = process.env.NODE_ENV === 'production';

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASS,
  {
    host: process.env.DB_HOST,
    dialect: 'mysql',
    // Performance: Disable SQL logging in production
    logging: isProduction ? false : console.log,
    pool: {
      max: 10,          // Increased from 5 for better concurrency
      min: 2,           // Keep 2 warm connections ready
      acquire: 30000,
      idle: 10000,
    },
    // Performance: Reduce connection overhead
    dialectOptions: {
      connectTimeout: 10000,
    },
    // Retry on connection drops
    retry: {
      max: 3,
    },
  }
);

module.exports = sequelize;
