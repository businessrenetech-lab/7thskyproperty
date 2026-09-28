/**
 * Dry-run inventory of the E2E leftovers that contradict in-house delivery.
 * Run from backend/:  node scripts/e2e/staleInHouseProviders.js
 *
 * Four service lines (Land & Property Assessment, Loan & Financial Support,
 * Property Documentation & Verification, Property Will & Succession) were moved
 * to in-house delivery on 2026-09-13: `no_provider: true`, and the whole
 * /api/wt-providers surface answers 409. Provider rows and provider-assigned
 * work orders on those lines therefore name contractors that no console can
 * open and no operator can verify.
 *
 * The rows that remain are E2E fixtures — client "LPA Full 563651" against
 * provider "LPA Provider 563651" is the harness STAMP on both sides, with a
 * contract value of 0.00. This script only REPORTS them, together with
 * everything that references them, so the removal can be judged on evidence.
 *
 * It writes nothing. Deleting is a separate, explicit decision.
 */
require('dotenv').config();
const M = require('../../models/waterTankOps');
const P = require('../../models/waterTankProviders');
const LINES = require('../../config/serviceLines');

const inHouse = LINES.SERVICE_LINE_KEYS.filter((k) => LINES.getServiceLine(k).no_provider);

const count = async (model, where, label) => {
  if (!model) return `${label}: (model not loaded)`;
  try {
    const n = await model.count({ where });
    return `${label}: ${n}`;
  } catch (e) { return `${label}: (${e.original?.code || e.name})`; }
};

(async () => {
  console.log(`In-house lines (no_provider): ${inHouse.length}`);
  inHouse.forEach((k) => console.log(`  - ${k}`));

  const providers = await M.WtProvider.findAll({
    where: { service_line: inHouse },
    attributes: ['id', 'code', 'business_name', 'status', 'service_line', 'branch_id'],
    raw: true,
  });
  const jobs = await M.WtWorkOrder.findAll({
    where: { service_line: inHouse },
    attributes: ['id', 'code', 'client_name', 'provider_id', 'provider_name', 'status',
      'total_contract', 'provider_fee', 'ss_fee'],
    raw: true,
  });

  console.log(`\n${providers.length} provider row(s) on lines that have no provider register:`);
  providers.forEach((p) => console.log(`  ${p.code}  id=${p.id}  ${p.business_name}  [${p.status}]  ${p.service_line}`));

  const assigned = jobs.filter((w) => w.provider_id);
  console.log(`\n${jobs.length} work order(s) on those lines, ${assigned.length} naming a provider:`);
  jobs.forEach((w) => console.log(
    `  ${w.code}  client=${w.client_name}  provider=${w.provider_id || '—'} ${w.provider_name || ''}`
    + `  [${w.status}]  contract=${w.total_contract} provider_fee=${w.provider_fee} ss_fee=${w.ss_fee}`,
  ));

  // What would be orphaned or left dangling if these went.
  console.log('\nReferences held by those providers:');
  const ids = providers.map((p) => p.id);
  if (ids.length) {
    for (const [model, label] of [
      [P.WtProviderDocument, 'provider documents'],
      [P.WtProviderAudit, 'provider audits'],
      [P.WtProviderAgreement, 'provider agreements'],
      [P.WtProviderAgreementRate, 'agreed rate lines'],
    ]) console.log('  ' + await count(model, { provider_id: ids }, label));
  }

  console.log('\nReferences held by those work orders:');
  const codes = jobs.map((w) => w.code);
  if (codes.length) {
    console.log('  ' + await count(M.WtInvoice, { work_order_code: codes }, 'invoices'));
    console.log('  ' + await count(P.WtServiceReport, { work_order_code: codes }, 'service reports'));
    console.log('  ' + await count(M.WtComplaint, { work_order_code: codes }, 'complaints'));
  }

  // Money is the thing that must never be deleted quietly.
  const withMoney = jobs.filter((w) => Number(w.total_contract) || Number(w.provider_fee) || Number(w.ss_fee));
  console.log(`\nJobs carrying a non-zero value: ${withMoney.length}`
    + (withMoney.length ? ` — ${withMoney.map((w) => w.code).join(', ')}` : ' (none — consistent with fixtures)'));

  console.log('\nNothing was changed. This is a report.');
  process.exit(0);
})();
