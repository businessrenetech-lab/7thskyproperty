/**
 * Correct the work orders on in-house service lines.
 *
 * Two faults, both consequences of the same thing: eleven service lines are
 * delivered by Seventh Sky's own crew (`no_provider`), and the work order was
 * treating them as though a contractor were involved.
 *
 *   1. THE MONEY. `ss_fee` came from the quotation's provider_allocation_fee,
 *      which is 0 when nothing is allocated, and `provider_fee` took the
 *      remainder — so the whole contract read as owed to a provider that does
 *      not exist, with no margin recorded. The derivation is fixed in
 *      services/wtWorkOrder.service.js (splitFees); this corrects the rows
 *      already stored. On an in-house line the contract is entirely ours:
 *      ss_fee = total_contract, provider_fee = 0, provider_net_payable = 0.
 *
 *   2. THE PROVIDER LINK. Five jobs on the Doc Verification lines name a
 *      provider, on lines whose provider register has answered 409 since
 *      2026-09-13. The link is cleared; the jobs, their invoices and their
 *      service reports are left exactly as they are. Nothing is deleted.
 *
 * DRY RUN BY DEFAULT — prints what it would change and writes nothing.
 * Pass --apply to write. Every prior value is written to a timestamped JSON
 * file first, so any change can be put back.
 *
 * Run from backend/:
 *   node scripts/fixInHouseWorkOrderMoney.js           # report
 *   node scripts/fixInHouseWorkOrderMoney.js --apply   # write
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const M = require('../models/waterTankOps');
const LINES = require('../config/serviceLines');

const APPLY = process.argv.includes('--apply');
const num = (v) => Number(v || 0);
const money = (v) => num(v).toLocaleString('en-BD', { minimumFractionDigits: 2 });

const inHouse = LINES.SERVICE_LINE_KEYS.filter((k) => LINES.getServiceLine(k).no_provider);

(async () => {
  console.log(`\n${APPLY ? 'APPLYING' : 'DRY RUN — nothing will be written'}`);
  console.log(`In-house lines: ${inHouse.length}\n`);

  const jobs = await M.WtWorkOrder.findAll({
    where: { service_line: inHouse },
    attributes: ['id', 'code', 'service_line', 'client_name', 'status',
      'total_contract', 'provider_fee', 'ss_fee', 'provider_net_payable',
      'provider_id', 'provider_name'],
    raw: true,
  });

  // ── 1. the money ───────────────────────────────────────────────────────────
  // Anything whose ss_fee does not already equal the contract is wrong, which
  // covers both the jobs that booked the contract as a provider fee and the ones
  // that recorded no split at all.
  const wrongMoney = jobs.filter((w) => num(w.ss_fee) !== num(w.total_contract));
  const committed = wrongMoney.filter((w) => String(w.status || '').toLowerCase() !== 'draft');

  console.log(`── Money: ${wrongMoney.length} job(s) to correct ──`);
  for (const w of wrongMoney) {
    console.log(`  ${w.code}  ${w.client_name}  [${w.status}]`);
    console.log(`     contract ${money(w.total_contract)}`);
    console.log(`     provider_fee ${money(w.provider_fee)} → 0.00`);
    console.log(`     ss_fee       ${money(w.ss_fee)} → ${money(w.total_contract)}`);
  }
  if (committed.length) {
    // A job past Draft may already have been invoiced or paid against these
    // figures. Correcting it silently would move money behind the books.
    console.log(`\n  !! ${committed.length} of those are past Draft and are NOT touched:`);
    committed.forEach((w) => console.log(`     ${w.code} [${w.status}] — needs a finance decision`));
  }

  // ── 2. the provider link ───────────────────────────────────────────────────
  const linked = jobs.filter((w) => w.provider_id || w.provider_name);
  console.log(`\n── Provider link: ${linked.length} job(s) to clear ──`);
  linked.forEach((w) => console.log(
    `  ${w.code}  [${w.status}]  provider ${w.provider_id} "${w.provider_name}" → none`,
  ));

  const toFixMoney = wrongMoney.filter((w) => String(w.status || '').toLowerCase() === 'draft');

  if (!APPLY) {
    console.log(`\nWould correct ${toFixMoney.length} money row(s) and clear ${linked.length} provider link(s).`);
    console.log('Nothing written. Re-run with --apply to write.');
    process.exit(0);
  }

  // Keep the prior values before touching anything.
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backup = path.join(__dirname, '..', 'uploads', `inhouse-money-backup-${stamp}.json`);
  fs.writeFileSync(backup, JSON.stringify({ when: stamp, jobs }, null, 2));
  console.log(`\nPrior values saved to ${backup}`);

  let m = 0;
  for (const w of toFixMoney) {
    await M.WtWorkOrder.update(
      { ss_fee: num(w.total_contract), provider_fee: 0, provider_net_payable: 0 },
      { where: { id: w.id } },
    );
    m += 1;
  }

  let p = 0;
  for (const w of linked) {
    await M.WtWorkOrder.update({ provider_id: null, provider_name: null }, { where: { id: w.id } });
    p += 1;
  }

  console.log(`\nCorrected ${m} money row(s); cleared ${p} provider link(s).`);

  // Read back and prove it.
  const after = await M.WtWorkOrder.findAll({
    where: { service_line: inHouse },
    attributes: ['code', 'status', 'total_contract', 'provider_fee', 'ss_fee', 'provider_id'],
    raw: true,
  });
  const stillWrong = after.filter((w) => String(w.status || '').toLowerCase() === 'draft'
    && num(w.ss_fee) !== num(w.total_contract));
  const stillLinked = after.filter((w) => w.provider_id);
  console.log(`Verified: ${stillWrong.length} draft job(s) with a wrong split, ${stillLinked.length} still naming a provider.`);
  process.exit(stillWrong.length || stillLinked.length ? 1 : 0);
})();
