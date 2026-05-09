const sequelize = require('../config/db.config');
const { runAssetSchemaUpgrade } = require('../utils/assetSchema');

const dryRun = process.argv.includes('--dry-run');

const run = async () => {
  await sequelize.authenticate();
  const changes = await runAssetSchemaUpgrade({ dryRun });
  console.log(JSON.stringify({ ok: true, dryRun, changed: changes }, null, 2));
};

run()
  .then(() => sequelize.close())
  .catch(async (error) => {
    console.error(JSON.stringify({ ok: false, dryRun, error: error.message, sql: error.sql }, null, 2));
    await sequelize.close().catch(() => {});
    process.exit(1);
  });
