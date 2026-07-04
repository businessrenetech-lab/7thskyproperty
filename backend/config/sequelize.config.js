/**
 * sequelize-cli configuration.
 * Reads the SAME env vars the app uses (DB_NAME / DB_USER / DB_PASS / DB_HOST).
 * Migrations are the source of truth for the Seventh Sky schema.
 */
require('dotenv').config();

const base = {
  username: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 3306),
  dialect: 'mysql',
  define: { underscored: true },
  dialectOptions: { connectTimeout: 15000 },
  logging: false,
};

module.exports = {
  development: base,
  test: base,
  production: base,
};
