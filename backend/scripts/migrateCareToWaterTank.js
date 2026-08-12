/**
 * migrateCareToWaterTank.js
 *
 * Carries the water-tank records that were sitting in the shared Property Care
 * module over to the Water Tank service line, now that "Payments & Disbursements"
 * and "Warranty & Issues" live in the Water Tank console:
 *
 *   care_warranties      → wt_warranties
 *   care_complaints      → wt_complaints
 *   care_incidents       → wt_incidents
 *   care_work_orders     → wt_work_orders   (vertical = 'water_tank' only)
 *
 * Idempotent: every carried row keeps a source_ref ("care_warranties:CODE") and
 * is skipped on re-run. Nothing is deleted from the care_* tables — Property Care
 * keeps its own view of the same jobs until that module is retired.
 *
 * Usage:  node scripts/migrateCareToWaterTank.js [--dry]
 */
const sequelize = require('../config/db.config');
const M = require('../models/waterTankOps');

const DRY = process.argv.includes('--dry');
const num = (v) => Number(v || 0);
const titleCase = (s) => String(s || '').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

// care status vocab → the Title Case vocab the water-tank screens use
const WARRANTY_STATUS = { active: 'Active', expiring: 'Expiring', expired: 'Expired', claimed: 'Claimed', void: 'Void' };
const COMPLAINT_STATUS = { open: 'Open', investigating: 'Investigating', resolved: 'Resolved', closed: 'Closed', escalated: 'Investigating' };
const INCIDENT_STATUS = { open: 'Open', investigating: 'Investigating', closed: 'Closed' };
const SEVERITY = { low: 'Low', medium: 'Medium', high: 'High', critical: 'Critical' };
const WO_STATUS = {
  draft: 'Draft', scheduled: 'Issued', assigned: 'Issued', in_progress: 'In Progress',
  completed: 'Completed', inspected: 'Completed', invoiced: 'Completed', paid: 'Completed', cancelled: 'Cancelled',
};

/**
 * Code allocator: reads the current high-water mark once, then hands out
 * sequential codes in memory — so a batch (and a --dry run, which writes
 * nothing) still numbers each record distinctly.
 */
async function codeAllocator(model, prefix, pad, start) {
  const rows = await model.findAll({ attributes: ['code'], raw: true });
  let max = start - 1;
  for (const r of rows) {
    const n = parseInt(String(r.code || '').replace(prefix, ''), 10);
    if (!Number.isNaN(n) && n > max) max = n;
  }
  return () => prefix + String(++max).padStart(pad, '0');
}

async function run() {
  const q = async (sql) => (await sequelize.query(sql))[0];
  const summary = { warranties: 0, complaints: 0, incidents: 0, workOrders: 0, skipped: 0 };

  // provider id → company name, so carried work orders name their provider
  const providers = await q('SELECT id, company_name FROM service_providers');
  const providerName = Object.fromEntries(providers.map((p) => [p.id, p.company_name]));

  const nextWarranty = await codeAllocator(M.WtWarranty, 'WTY-', 4, 1);
  const nextComplaint = await codeAllocator(M.WtComplaint, 'COMP-', 3, 11);
  const nextIncident = await codeAllocator(M.WtIncident, 'INC-', 4, 1);
  const nextWorkOrder = await codeAllocator(M.WtWorkOrder, 'WO-', 4, 482);

  // ── warranties ──
  for (const w of await q('SELECT * FROM care_warranties')) {
    const ref = `care_warranties:${w.warranty_code}`;
    if (await M.WtWarranty.findOne({ where: { source_ref: ref } })) { summary.skipped++; continue; }
    const row = {
      branch_id: w.branch_id || 1,
      code: nextWarranty(),
      client_name: w.customer_name || 'Unknown client',
      warranty_type: w.warranty_type || null,
      start_date: w.start_date || null,
      expiry_date: w.expiry_date || null,
      status: WARRANTY_STATUS[String(w.status || '').toLowerCase()] || 'Active',
      terms: w.terms || null,
      claim_notes: w.notes || null,
      source_ref: ref,
    };
    console.log(`  warranty ${w.warranty_code} → ${row.code} (${row.client_name} · ${row.warranty_type})`);
    if (!DRY) await M.WtWarranty.create(row);
    summary.warranties++;
  }

  // ── complaints ──
  for (const c of await q('SELECT * FROM care_complaints')) {
    const ref = `care_complaints:${c.complaint_code}`;
    if (await M.WtComplaint.findOne({ where: { source_ref: ref } })) { summary.skipped++; continue; }
    const resolution = [c.investigation, c.resolution].filter(Boolean).join('\n\n');
    const row = {
      branch_id: c.branch_id || 1,
      code: nextComplaint(),
      client_name: c.customer_name || 'Unknown client',
      incident_type: c.complaint_type || null,
      severity: SEVERITY[String(c.severity || '').toLowerCase()] || 'Medium',
      status: COMPLAINT_STATUS[String(c.status || '').toLowerCase()] || 'Open',
      disclosure: [c.description, resolution].filter(Boolean).join('\n\n') || null,
      logged_date: c.reported_date || (c.created_at ? new Date(c.created_at).toISOString().slice(0, 10) : null),
      resolved_date: c.resolved_date || null,
      timeline: [{ title: 'Carried over from Property Care', detail: `Originally ${c.complaint_code}`, at: new Date().toISOString() }],
      source_ref: ref,
    };
    console.log(`  complaint ${c.complaint_code} → ${row.code} (${row.client_name} · ${row.incident_type})`);
    if (!DRY) await M.WtComplaint.create(row);
    summary.complaints++;
  }

  // ── incidents ──
  for (const i of await q('SELECT * FROM care_incidents')) {
    const ref = `care_incidents:${i.incident_code}`;
    if (await M.WtIncident.findOne({ where: { source_ref: ref } })) { summary.skipped++; continue; }
    const row = {
      branch_id: i.branch_id || 1,
      code: nextIncident(),
      incident_type: titleCase(i.incident_type) || 'Other',
      severity: SEVERITY[String(i.severity || '').toLowerCase()] || 'Medium',
      incident_date: i.incident_date || (i.created_at ? new Date(i.created_at).toISOString().slice(0, 10) : null),
      provider_name: providerName[i.provider_id] || null,
      description: i.description || null,
      action_taken: i.action_taken || null,
      status: INCIDENT_STATUS[String(i.status || '').toLowerCase()] || 'Open',
      source_ref: ref,
    };
    console.log(`  incident ${i.incident_code} → ${row.code} (${row.incident_type} · ${row.severity})`);
    if (!DRY) await M.WtIncident.create(row);
    summary.incidents++;
  }

  // ── water-tank work orders (so their provider payouts appear on Payments) ──
  for (const w of await q("SELECT * FROM care_work_orders WHERE vertical = 'water_tank'")) {
    const ref = `care_work_orders:${w.work_order_code}`;
    if (await M.WtWorkOrder.findOne({ where: { source_ref: ref } })) { summary.skipped++; continue; }
    const row = {
      branch_id: w.branch_id || 1,
      code: nextWorkOrder(),
      client_name: w.customer_name || 'Unknown client',
      provider_name: providerName[w.assigned_provider_id] || null,
      category: w.service_name || null,
      target_date: w.scheduled_date || w.requested_date || null,
      status: WO_STATUS[String(w.status || '').toLowerCase()] || 'Issued',
      provider_fee: num(w.provider_charge),
      ss_fee: num(w.sspc_fee),
      total_contract: num(w.service_value),
      scope: w.scope || w.service_name || null,
      special_conditions: w.notes || null,
      provider_paid_amount: num(w.provider_paid_amount),
      payout_status: num(w.provider_paid_amount) >= num(w.provider_charge) && num(w.provider_charge) > 0
        ? 'Cleared' : num(w.provider_paid_amount) > 0 ? 'Partially Paid' : 'Not Due',
      source_ref: ref,
    };
    console.log(`  work order ${w.work_order_code} → ${row.code} (${row.provider_name || 'no provider'} · charge ${row.provider_fee}, paid ${row.provider_paid_amount})`);
    if (!DRY) await M.WtWorkOrder.create(row);
    summary.workOrders++;
  }

  console.log(`\n${DRY ? '[DRY RUN] would carry' : 'Carried'} over:`, summary);
  await sequelize.close();
}

run().catch((e) => { console.error('Carry-over failed:', e); process.exit(1); });
