/**
 * backfillWaterTankIdentifiers.js
 *
 * Repairs records saved before the identity resolver existed — anything with a
 * blank Client ID or Project ID gets one, creating the client or project where
 * none exists. Matches what the API now does automatically on every write.
 *
 * Idempotent.  Usage: node scripts/backfillWaterTankIdentifiers.js [--dry]
 */
const sequelize = require('./../config/db.config');
const M = require('../models/waterTankOps');
const identity = require('../services/wtIdentity.service');

const DRY = process.argv.includes('--dry');

const ENTITIES = [
  ['service-requests', () => M.WtServiceRequest],
  ['site-assessments', () => M.WtSiteAssessment],
  ['quotations', () => M.WtQuotation],
  ['work-orders', () => M.WtWorkOrder],
  ['invoices', () => M.WtInvoice],
  ['warranties', () => M.WtWarranty],
  ['incidents', () => M.WtIncident],
];

(async () => {
  const summary = { checked: 0, fixed: 0, clients_created: 0, projects_created: 0, skipped: 0 };
  const clientsBefore = await M.WtClient.count();
  const projectsBefore = await M.WtProject.count();

  for (const [entity, getModel] of ENTITIES) {
    const link = identity.LINKS[entity];
    if (!link) continue;
    const rows = await getModel().findAll();
    for (const row of rows) {
      summary.checked++;
      const plain = row.get({ plain: true });
      const needsClient = link.client && !plain[link.client];
      const needsProject = link.project && !plain[link.project];
      if (!needsClient && !needsProject) { summary.skipped++; continue; }
      if (!plain[link.name]) { summary.skipped++; continue; }

      const merged = await identity.attachIdentifiers(entity, plain, plain.branch_id || 1, undefined, DRY);
      const patch = {};
      if (needsClient && merged[link.client]) patch[link.client] = merged[link.client];
      if (needsProject && merged[link.project]) patch[link.project] = merged[link.project];
      if (!Object.keys(patch).length) { summary.skipped++; continue; }

      console.log(`  ${entity} ${plain.code || plain.id} (${plain[link.name]}): ${Object.entries(patch).map(([k, v]) => `${k}=${v}`).join(', ')}`);
      if (!DRY) await row.update(patch);
      summary.fixed++;
    }
  }

  summary.clients_created = (await M.WtClient.count()) - clientsBefore;
  summary.projects_created = (await M.WtProject.count()) - projectsBefore;
  console.log(`\n${DRY ? '[DRY RUN] would fix' : 'Fixed'}:`, summary);
  await sequelize.close();
})().catch((e) => { console.error('Backfill failed:', e.message); process.exit(1); });
