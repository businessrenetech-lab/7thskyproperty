/**
 * backfillWaterTankProviders.js
 *
 * Brings providers onboarded before SSPC-WTCM-SOP-02 was implemented onto the
 * new Sec. 4 workflow, so the console reflects what is actually known about them
 * rather than showing everyone stuck at "Application":
 *
 *   compliance JSON  → wt_provider_documents rows (Trade Licence, TIN,
 *                      Public Liability Insurance), marked verified
 *   cumilla_exclusivity → provider.cumilla_exclusive
 *   approved_services   → service_categories (mapped to the Sec. 2 vocabulary)
 *   coverage free text  → coverage_areas (districts recognised in the string)
 *   onboarded_since     → application_date / approved_date
 *   status              → onboarding_stage
 *
 * Deliberately conservative: it never invents evidence. Documents get no
 * number, issuer or expiry — those still have to be collected, and the
 * watchtower will keep asking for them. Agreements and territory briefings are
 * NOT marked done, because there is no record that they happened.
 *
 * Idempotent.  Usage: node scripts/backfillWaterTankProviders.js [--dry]
 */
const sequelize = require('../config/db.config');
const M = require('../models/waterTankOps');
const P = require('../models/waterTankProviders');

const DRY = process.argv.includes('--dry');
const parse = (v, f) => { if (v == null) return f; if (typeof v !== 'string') return v; try { return JSON.parse(v) ?? f; } catch { return f; } };

// old free-text services → Sec. 2 Scope categories
const CATEGORY_MAP = {
  cleaning: 'Tank Cleaning Contractor',
  disinfection: 'Water Treatment Specialist',
  repairs: 'Repair Contractor',
  repair: 'Repair Contractor',
  'full amc': 'AMC Provider',
  amc: 'AMC Provider',
  maintenance: 'Tank Maintenance Contractor',
  waterproofing: 'Waterproofing Contractor',
  plumbing: 'Plumbing Contractor',
  testing: 'Water Testing Laboratory',
  pump: 'Pump Service Technician',
};
// old compliance flags → document register entries
const DOC_MAP = {
  trade_licence: { category: 'compliance', doc_type: 'Trade Licence' },
  tin: { category: 'compliance', doc_type: 'TIN' },
  bin: { category: 'compliance', doc_type: 'BIN' },
  liability_insurance: { category: 'insurance', doc_type: 'Public Liability Insurance' },
};
const DISTRICTS = ['Dhaka', 'Cumilla', 'Chattogram', 'Sylhet', 'Rajshahi', 'Khulna', 'Barishal', 'Rangpur', 'Mymensingh', 'Gazipur', 'Narayanganj'];
const STAGE_FOR = { approved: 'Approved', conditional: 'Approved', suspended: 'Approved', terminated: 'Approved' };

const monthToDate = (s) => {
  if (!s) return null;
  const d = new Date(`1 ${s}`);
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
};

async function run() {
  const providers = await M.WtProvider.findAll();
  const summary = { providers: 0, documents: 0, skipped: 0 };

  for (const p of providers) {
    const compliance = parse(p.compliance, {}) || {};
    const services = parse(p.approved_services, []) || [];
    const status = String(p.status || '').toLowerCase();

    // ── categories from the old free-text service list ──
    const categories = [...new Set(services
      .map((s) => CATEGORY_MAP[String(s).toLowerCase().trim()])
      .filter(Boolean))];

    // ── districts recognised inside the coverage sentence ──
    const areas = DISTRICTS.filter((d) => String(p.coverage || '').toLowerCase().includes(d.toLowerCase()));

    const applied = monthToDate(p.onboarded_since);
    const patch = {};
    if (!p.service_categories && categories.length) patch.service_categories = categories;
    if (!p.coverage_areas && areas.length) patch.coverage_areas = areas;
    if (!p.application_date && applied) patch.application_date = applied;
    if (!p.approved_date && applied && ['approved', 'conditional'].includes(status)) patch.approved_date = applied;
    if (p.onboarding_stage === 'Application' && STAGE_FOR[status]) patch.onboarding_stage = STAGE_FOR[status];
    if (!p.stage_updated_at) patch.stage_updated_at = new Date();
    if (compliance.cumilla_exclusivity && !p.cumilla_exclusive) patch.cumilla_exclusive = true;
    if (!p.district && areas.length) [patch.district] = areas;
    if (!p.satisfaction_score && Number(p.rating) > 0) patch.satisfaction_score = Number(p.rating);

    if (Object.keys(patch).length) {
      console.log(`  ${p.code} ${p.business_name}: ${Object.keys(patch).join(', ')}`);
      if (!DRY) await p.update(patch);
      summary.providers++;
    }

    // ── carry the old compliance ticks into the document register ──
    for (const [flag, spec] of Object.entries(DOC_MAP)) {
      if (!compliance[flag]) continue;
      const exists = await P.WtProviderDocument.findOne({
        where: { branch_id: p.branch_id, provider_id: p.id, category: spec.category, doc_type: spec.doc_type },
      });
      if (exists) { summary.skipped++; continue; }
      console.log(`    + ${spec.doc_type} (${spec.category}) — verified, details outstanding`);
      if (!DRY) {
        await P.WtProviderDocument.create({
          branch_id: p.branch_id, provider_id: p.id,
          category: spec.category, doc_type: spec.doc_type,
          verified: true, status: 'Verified', verified_by: 'Migrated record',
          verified_date: new Date().toISOString().slice(0, 10),
          notes: 'Carried over from the pre-SOP compliance checklist. Document number, issuer and expiry still to be collected.',
        });
      }
      summary.documents++;
    }

    if (!DRY && Object.keys(patch).length) {
      await P.WtProviderEvent.create({
        branch_id: p.branch_id, provider_id: p.id, event_type: 'migration',
        title: 'Brought onto SSPC-WTCM-SOP-02 workflow',
        detail: 'Existing record mapped to the Sec. 4 workflow. Master agreement and Cumilla briefing still outstanding.',
        actor: 'System', occurred_at: new Date(),
      });
    }
  }

  console.log(`\n${DRY ? '[DRY RUN] would update' : 'Updated'}:`, summary);
  console.log('Note: master agreements (Sec. 6 Step 4) and territory briefings (Sec. 6 Step 5) are NOT backfilled — there is no evidence they happened, so the watchtower will keep flagging them.');
  await sequelize.close();
}

run().catch((e) => { console.error('Backfill failed:', e); process.exit(1); });
