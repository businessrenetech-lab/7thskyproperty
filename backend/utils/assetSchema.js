const sequelize = require('../config/db.config');

const ASSET_TYPE_ENUM = "ENUM('hardware','furniture','appliance','stationery','electronics','electrical','av_equipment','computers','security','books','other') DEFAULT 'hardware'";
const ASSET_STATUS_ENUM = "ENUM('active','good','maintenance','repair','retired','disposed','lost') DEFAULT 'active'";

let ensureAssetSchemaPromise = null;

const tableColumnExists = async (tableName, columnName) => {
  const [rows] = await sequelize.query(
    'SELECT COUNT(*) AS count FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?',
    { replacements: [tableName, columnName] }
  );
  return Number(rows[0]?.count || 0) > 0;
};

const addColumnIfMissing = async (tableName, columnName, definition, changes, dryRun = false) => {
  if (await tableColumnExists(tableName, columnName)) return;
  const sql = `ALTER TABLE \`${tableName}\` ADD COLUMN \`${columnName}\` ${definition}`;
  changes.push(sql);
  if (!dryRun) await sequelize.query(sql);
};

const runAssetSchemaUpgrade = async ({ dryRun = false } = {}) => {
  const changes = [];

  await addColumnIfMissing('assets', 'asset_tag', 'VARCHAR(255) NULL COMMENT \'Unique human-readable tag like AST-001\' AFTER `branch_id`', changes, dryRun);
  await addColumnIfMissing('assets', 'category', 'VARCHAR(255) NULL COMMENT \'Display category label e.g. A/V, Electronics, Furniture\' AFTER `type`', changes, dryRun);
  await addColumnIfMissing('assets', 'location', 'VARCHAR(255) NULL COMMENT \'Physical location e.g. Room 201, Admin Office, Hall A\' AFTER `serial_no`', changes, dryRun);
  await addColumnIfMissing('assets', 'image_url', 'VARCHAR(255) NULL COMMENT \'Uploaded asset image URL\' AFTER `location`', changes, dryRun);
  await addColumnIfMissing('assets', 'book_value', 'DECIMAL(12,2) NULL COMMENT \'Current book value after depreciation\' AFTER `cost`', changes, dryRun);
  await addColumnIfMissing('assets', 'depreciation_rate', 'DECIMAL(5,2) DEFAULT 20.00 COMMENT \'Annual depreciation rate in percent\' AFTER `book_value`', changes, dryRun);
  await addColumnIfMissing('assets', 'warranty_expiry', 'DATE NULL AFTER `depreciation_rate`', changes, dryRun);
  await addColumnIfMissing('assets', 'condition_notes', 'TEXT NULL COMMENT \'Current condition description\' AFTER `status`', changes, dryRun);

  const typeSql = `ALTER TABLE \`assets\` MODIFY COLUMN \`type\` ${ASSET_TYPE_ENUM}`;
  const statusSql = `ALTER TABLE \`assets\` MODIFY COLUMN \`status\` ${ASSET_STATUS_ENUM}`;
  const backfillTagSql = "UPDATE `assets` SET `asset_tag` = CONCAT('AST-', LPAD(`id`, 3, '0')) WHERE `asset_tag` IS NULL OR `asset_tag` = ''";
  const backfillBookValueSql = "UPDATE `assets` SET `book_value` = `cost` WHERE `book_value` IS NULL";

  changes.push(typeSql, statusSql, backfillTagSql, backfillBookValueSql);

  if (!dryRun) {
    await sequelize.query(typeSql);
    await sequelize.query(statusSql);
    if (await tableColumnExists('assets', 'asset_tag')) await sequelize.query(backfillTagSql);
    if (await tableColumnExists('assets', 'book_value')) await sequelize.query(backfillBookValueSql);
  }

  return changes;
};

const ensureAssetSchema = async () => {
  if (!ensureAssetSchemaPromise) {
    ensureAssetSchemaPromise = runAssetSchemaUpgrade().catch((error) => {
      ensureAssetSchemaPromise = null;
      throw error;
    });
  }
  return ensureAssetSchemaPromise;
};

module.exports = { ensureAssetSchema, runAssetSchemaUpgrade };
