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
      max: Number(process.env.DB_POOL_MAX || 2),
      min: Number(process.env.DB_POOL_MIN || 0),
      acquire: Number(process.env.DB_POOL_ACQUIRE || 30000),
      idle: Number(process.env.DB_POOL_IDLE || 300000),
      evict: Number(process.env.DB_POOL_EVICT || 60000),
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
