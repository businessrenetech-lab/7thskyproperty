/**
 * Branch Public Pages — Safe Database Migration
 * Adds public branch fields and backfills SEO-friendly slugs.
 * Run: node scripts/migrate-branches-public.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', 'backend', '.env') });
const sequelize = require('../backend/config/db.config');
const Branch = require('../backend/models/Branch');
const { uniqueSlug } = require('../backend/utils/slug');

const addColumnIfMissing = async (table, column, definition) => {
  const [rows] = await sequelize.query(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    { replacements: [table, column] }
  );

  if (rows.length > 0) {
    console.log(`  SKIP ${table}.${column} already exists`);
    return false;
  }

  await sequelize.query(`ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${definition}`);
  console.log(`  ADDED ${table}.${column}`);
  return true;
};

const runOptionalQuery = async (label, sql) => {
  try {
    await sequelize.query(sql);
    console.log(`  OK ${label}`);
  } catch (err) {
    console.log(`  SKIP ${label}: ${err.message}`);
  }
};

(async () => {
  console.log('\nBRANCH PUBLIC PAGES — DATABASE MIGRATION\n');
  try {
    await sequelize.authenticate();
    console.log('Database connected\n');

    await addColumnIfMissing('branches', 'slug', 'VARCHAR(255) NULL');
    await addColumnIfMissing('branches', 'public_title', 'VARCHAR(255) NULL');
    await addColumnIfMissing('branches', 'public_description', 'TEXT NULL');
    await addColumnIfMissing('branches', 'seo_title', 'VARCHAR(255) NULL');
    await addColumnIfMissing('branches', 'seo_description', 'VARCHAR(500) NULL');
    await addColumnIfMissing('branches', 'hero_image_url', 'VARCHAR(255) NULL');
    await addColumnIfMissing('branches', 'opening_hours', 'VARCHAR(255) NULL');
    await addColumnIfMissing('branches', 'map_url', 'TEXT NULL');
    await addColumnIfMissing('branches', 'coming_soon_message', 'VARCHAR(500) NULL');
    await runOptionalQuery('branches.slug unique index', 'CREATE UNIQUE INDEX branches_slug_unique ON `branches` (`slug`)');

    const branches = await Branch.findAll({ order: [['id', 'ASC']] });
    for (const branch of branches) {
      if (branch.slug) continue;
      branch.slug = await uniqueSlug(Branch, branch.name || branch.code || `branch-${branch.id}`, { fallback: 'branch', excludeId: branch.id });
      await branch.save();
      console.log(`  SLUG ${branch.name}: ${branch.slug}`);
    }

    console.log('\nBranch public migration complete\n');
    process.exit(0);
  } catch (err) {
    console.error(`\nMigration failed: ${err.message}`);
    process.exit(1);
  }
})();
