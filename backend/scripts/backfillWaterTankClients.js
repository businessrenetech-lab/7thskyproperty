/**
 * backfillWaterTankClients.js
 *
 * Places clients registered before SSPC-WTCM-SOP-01 onto the Sec. 4 workflow, so
 * the console shows where each one actually stands instead of parking everyone
 * at "Lead Enquiry".
 *
 *   current_status      → workflow_stage
 *   createdAt           → enquiry_date
 *   work-order history  → converted / first & last service dates
 *   amc_status          → amc_required
 *
 * Conservative by design: agreements are NOT marked signed (Sec. 7 Step 6 needs
 * evidence), so the client dashboard keeps flagging them.
 *
 * Idempotent.  Usage: node scripts/backfillWaterTankClients.js [--dry]
 */
const sequelize = require('../config/db.config');
const M = require('../models/waterTankOps');

const DRY = process.argv.includes('--dry');
const iso = (d) => (d ? new Date(d).toISOString().slice(0, 10) : null);

// what the old free-text status implies about Sec. 4 position
const STAGE_FOR = {
  'new lead': 'Lead Enquiry',
  'assessment scheduled': 'Site Assessment',
  'active (amc)': 'AMC / Ongoing Support',
  completed: 'Completion',
  dormant: 'Lead Enquiry',
};

async function run() {
  const [clients, workOrders, quotations, assessments] = await Promise.all([
    M.WtClient.findAll(),
    M.WtWorkOrder.findAll({ raw: true }),
    M.WtQuotation.findAll({ raw: true }),
    M.WtSiteAssessment.findAll({ raw: true }),
  ]);
  const summary = { updated: 0, skipped: 0, events: 0 };

  for (const c of clients) {
    const jobs = workOrders.filter((w) => w.client_name === c.name);
    const quotes = quotations.filter((q) => q.client_name === c.name);
    const assessed = assessments.filter((a) => a.client_name === c.name);
    const done = jobs.filter((w) => String(w.status || '').toLowerCase() === 'completed');

    // pick the furthest stage the evidence supports
    let stage = STAGE_FOR[String(c.current_status || '').toLowerCase()] || 'Lead Enquiry';
    if (done.length) stage = 'Completion';
    else if (jobs.length) stage = 'Service Delivery';
    else if (quotes.some((q) => String(q.decision || '').toLowerCase() === 'approved')) stage = 'Agreement Signing';
    else if (quotes.length) stage = 'Quotation';
    else if (assessed.length) stage = 'Site Assessment';
    if (String(c.current_status || '').toLowerCase() === 'active (amc)') stage = 'AMC / Ongoing Support';

    const patch = {};
    if (c.workflow_stage === 'Lead Enquiry' && stage !== 'Lead Enquiry') patch.workflow_stage = stage;
    if (!c.stage_updated_at) patch.stage_updated_at = new Date();
    if (!c.enquiry_date) patch.enquiry_date = iso(c.createdAt);
    if (!c.converted && jobs.length) { patch.converted = true; patch.converted_date = iso(jobs[jobs.length - 1].createdAt); }
    if (!c.amc_required && /active|proposed/i.test(c.amc_status || '')) patch.amc_required = true;

    const serviceDates = jobs.map((w) => w.target_date).filter(Boolean).sort();
    if (!c.first_service_date && serviceDates.length) [patch.first_service_date] = serviceDates;
    if (!c.last_service_date && serviceDates.length) patch.last_service_date = serviceDates[serviceDates.length - 1];

    if (!Object.keys(patch).length) { summary.skipped++; continue; }

    console.log(`  ${c.code} ${c.name}: ${Object.keys(patch).join(', ')}${patch.workflow_stage ? ` → ${patch.workflow_stage}` : ''}`);
    if (!DRY) {
      await c.update(patch);
      await M.WtClientEvent.create({
        branch_id: c.branch_id, client_id: c.id, event_type: 'migration',
        title: 'Brought onto SSPC-WTCM-SOP-01 workflow',
        detail: `Placed at "${patch.workflow_stage || c.workflow_stage}" from ${jobs.length} work order(s), ${quotes.length} quotation(s), ${assessed.length} assessment(s). Customer Service Agreement still to be recorded.`,
        actor: 'System', occurred_at: new Date(),
      });
      summary.events++;
    }
    summary.updated++;
  }

  console.log(`\n${DRY ? '[DRY RUN] would update' : 'Updated'}:`, summary);
  console.log('Note: Customer Service Agreements (Sec. 7 Step 6) are NOT backfilled — the dashboard will keep flagging them until recorded.');
  await sequelize.close();
}

run().catch((e) => { console.error('Backfill failed:', e); process.exit(1); });
