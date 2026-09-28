/**
 * The commercial registers the workbooks define and the system does not already
 * hold as a table.
 *
 * Only ONE commercial register definition existed: #123
 * `commercial_rent/commercial_rent-lease`, with 0 entries and a malformed key —
 * auto-generated from the sheet name "Commercial Rent-Lease", with a hyphen where
 * every other register_key in the system uses underscores. It is DEACTIVATED here
 * rather than deleted: nothing can have used it (0 entries), but deactivating is
 * reversible and deleting is not.
 *
 * WHAT DELIBERATELY DOES NOT BECOME A REGISTER. The rent workbook's Sheet 1 names
 * a "CRM Record Required" per task, and most of those are already real tables.
 * Measured on 2026-09-27:
 *
 *   Owner Profile          -> property_owner_profiles  (41 rows)
 *   Property Profile       -> properties               (207 rows)
 *   Document Register      -> property_documents       (41 rows)
 *   Work Progress Tracker  -> work_orders              (12 rows)
 *   Marketing Record       -> marketing_campaigns      (225 rows)
 *   Screening Notes        -> tenant_applications      (59 rows)
 *   Inspection Schedule    -> inspections              (5 rows)
 *   Lease Draft            -> signing_envelopes        (297 rows)
 *   Payment Record         -> invoices
 *   Rental Ledger          -> rental_ledger            (62 rows)
 *   Maintenance Tracker    -> work_orders (the PM maintenance path)
 *
 * Duplicating any of those as a register would split the truth in two, which is
 * the same decision the rural build recorded. The four below have NO table:
 * negotiation, handover, exit checklist and the sale-side offer trail, so those
 * are the registers that genuinely need to exist.
 *
 * Idempotent on (vertical_key, register_key). Run from backend/:
 *   node scripts/seedCommercialRegisters.js
 */
const sequelize = require('../config/db.config');

const col = (key, label, type = 'text') => ({ key, label, type });

// The malformed definition to retire. 0 entries; deactivated, not deleted.
const MALFORMED = { vertical_key: 'commercial_rent', register_key: 'commercial_rent-lease' };

// ── commercial_rent — the lease-side gaps ────────────────────────────────────
const RENT_REGISTERS = [
  {
    register_key: 'negotiation_register',
    name: 'Negotiation Register',
    // Sheet 1 "Negotiation Record" / Sheet 2 "Negotiation Logs". No table holds
    // lease negotiation rounds; sale_offers is the SALE side only.
    columns: [
      col('round', 'Round #'),
      col('date', 'Date', 'date'),
      col('party', 'Party'),
      col('offer', 'Offered terms'),
      col('counter_offer', 'Counter terms'),
      col('outcome', 'Outcome', 'select'),
      col('notes', 'Notes', 'textarea'),
    ],
  },
  {
    register_key: 'handover_register',
    name: 'Handover Register',
    // Sheet 1 "Handover Record" / Sheet 2 "Handover Checklist" + asset
    // verification. No table holds a commercial handover.
    columns: [
      col('date', 'Handover date', 'date'),
      col('party', 'Handed to'),
      col('meter_readings', 'Meter readings'),
      col('keys_issued', 'Keys / access issued'),
      col('assets_verified', 'Assets verified', 'select'),
      col('condition_noted', 'Condition noted', 'textarea'),
      col('signed_by', 'Signed by'),
    ],
  },
  {
    register_key: 'exit_checklist',
    name: 'Exit Checklist',
    // Sheet 1 "Exit Checklist" / Sheet 2 closure + record retention.
    columns: [
      col('item', 'Item', 'select'),
      col('required', 'Required', 'select'),
      col('completed', 'Completed', 'select'),
      col('date', 'Date', 'date'),
      col('deductions', 'Deductions'),
      col('retention_until', 'Retention until', 'date'),
      col('notes', 'Notes', 'textarea'),
    ],
  },
  {
    register_key: 'communication_log',
    name: 'Communication Log',
    // Sheet 2 requires client communication at every stage and names the evidence
    // per stage, but no commercial communication register existed.
    columns: [
      col('date', 'Date', 'date'),
      col('party', 'Party'),
      col('channel', 'Channel', 'select'),
      col('subject', 'Subject'),
      col('summary', 'Summary', 'textarea'),
      col('follow_up', 'Follow-up', 'date'),
    ],
  },
];

// ── commercial_sale — the sale-side gaps ─────────────────────────────────────
const SALE_REGISTERS = [
  {
    register_key: 'ownership_verification',
    name: 'Ownership Verification Register',
    // Sale checklist stage 3 "Review ownership and legal records" — the stage
    // exists in the pipeline but had nowhere to record the documents.
    columns: [
      col('document', 'Document', 'select'),
      col('required', 'Required', 'select'),
      col('received', 'Received', 'select'),
      col('verified', 'Verified', 'select'),
      col('verification_method', 'Verification method'),
      col('remarks', 'Remarks', 'textarea'),
    ],
  },
  {
    register_key: 'marketing_register',
    name: 'Marketing Register',
    // Sale checklist stage 6 / CRM sheet "Campaign and enquiry tracking".
    // marketing_campaigns holds the SEND; this holds the per-property activity
    // plan the workbook tracks (photography, signboard, portals).
    columns: [
      col('activity', 'Activity', 'select'),
      col('required', 'Required', 'select'),
      col('completed', 'Completed', 'select'),
      col('date', 'Date', 'date'),
      col('cost', 'Cost'),
      col('remarks', 'Remarks', 'textarea'),
    ],
  },
  {
    register_key: 'negotiation_register',
    name: 'Negotiation Register',
    // CRM sheet "Offer and negotiation history". sale_offers holds the offer
    // record; this holds the round-by-round trail the workbook asks for.
    columns: [
      col('round', 'Round #'),
      col('date', 'Date', 'date'),
      col('buyer', 'Buyer'),
      col('offer', 'Offer'),
      col('counter_offer', 'Counter offer'),
      col('outcome', 'Outcome', 'select'),
      col('notes', 'Notes', 'textarea'),
    ],
  },
  {
    register_key: 'due_diligence_register',
    name: 'Due Diligence Register',
    // Sale checklist stage 10 "Coordinate buyer verification and review".
    columns: [
      col('item', 'Item', 'select'),
      col('required', 'Required', 'select'),
      col('completed', 'Completed', 'select'),
      col('date', 'Date', 'date'),
      col('reviewer', 'Reviewer'),
      col('findings', 'Findings', 'textarea'),
    ],
  },
  {
    register_key: 'communication_log',
    name: 'Communication Log',
    // Every sale checklist stage carries a "Client Update Requirement".
    columns: [
      col('date', 'Date', 'date'),
      col('party', 'Party'),
      col('channel', 'Channel', 'select'),
      col('subject', 'Subject'),
      col('summary', 'Summary', 'textarea'),
      col('follow_up', 'Follow-up', 'date'),
    ],
  },
  {
    register_key: 'closure_register',
    name: 'Project Closure Register',
    // Sale checklist stage 13 "Final Reporting" + the CRM sheet's historical
    // audit trail. Retention is a column here, not a register, matching rural.
    columns: [
      col('project', 'Project'),
      col('closed_on', 'Closed on', 'date'),
      col('commission_reconciled', 'Commission reconciled', 'select'),
      col('final_report_issued', 'Final report issued', 'select'),
      col('records_archived', 'Records archived', 'select'),
      col('retention_until', 'Retention until', 'date'),
      col('notes', 'Notes', 'textarea'),
    ],
  },
];

const COMMERCIAL_REGISTERS = [
  ...RENT_REGISTERS.map((d) => ({ ...d, vertical_key: 'commercial_rent' })),
  ...SALE_REGISTERS.map((d) => ({ ...d, vertical_key: 'commercial_sale' })),
];

async function run() {
  const [before] = await sequelize.query(
    "SELECT COUNT(*) AS c FROM register_definitions WHERE vertical_key LIKE 'commercial%'",
  );

  // Retire the malformed auto-generated definition, if it is still active and unused.
  const [bad] = await sequelize.query(
    'SELECT id, is_active FROM register_definitions WHERE vertical_key = :v AND register_key = :k LIMIT 1',
    { replacements: { v: MALFORMED.vertical_key, k: MALFORMED.register_key } },
  );
  if (bad.length) {
    const [entries] = await sequelize.query(
      'SELECT COUNT(*) AS c FROM register_entries WHERE register_definition_id = :id',
      { replacements: { id: bad[0].id } },
    );
    if (Number(entries[0].c) > 0) {
      console.log(`  KEPT     #${bad[0].id} ${MALFORMED.register_key} — it has ${entries[0].c} entr(ies), so it is in use.`);
    } else if (Number(bad[0].is_active) === 0) {
      console.log(`  already retired  #${bad[0].id} ${MALFORMED.register_key}`);
    } else {
      await sequelize.query('UPDATE register_definitions SET is_active = 0 WHERE id = :id',
        { replacements: { id: bad[0].id } });
      console.log(`  retired  #${bad[0].id} ${MALFORMED.register_key} (malformed key, 0 entries) — deactivated, not deleted`);
    }
  }

  for (const def of COMMERCIAL_REGISTERS) {
    const [existing] = await sequelize.query(
      'SELECT id FROM register_definitions WHERE vertical_key = :v AND register_key = :k LIMIT 1',
      { replacements: { v: def.vertical_key, k: def.register_key } },
    );
    if (existing.length) {
      await sequelize.query(
        'UPDATE register_definitions SET name = :n, columns = :c, is_active = 1 WHERE id = :id',
        { replacements: { n: def.name, c: JSON.stringify(def.columns), id: existing[0].id } },
      );
      console.log(`  updated  ${def.vertical_key}/${def.register_key} (#${existing[0].id})`);
      continue;
    }
    const [[{ next }]] = await sequelize.query(
      'SELECT COALESCE(MAX(sort_order), 0) + 1 AS next FROM register_definitions WHERE vertical_key = :v',
      { replacements: { v: def.vertical_key } },
    );
    await sequelize.query(
      `INSERT INTO register_definitions (vertical_key, register_key, name, columns, sort_order, is_active, created_at, updated_at)
       VALUES (:v, :k, :n, :c, :s, 1, NOW(), NOW())`,
      { replacements: { v: def.vertical_key, k: def.register_key, n: def.name, c: JSON.stringify(def.columns), s: next } },
    );
    console.log(`  created  ${def.vertical_key}/${def.register_key} (sort ${next})`);
  }

  const [after] = await sequelize.query(
    "SELECT COUNT(*) AS c FROM register_definitions WHERE vertical_key LIKE 'commercial%' AND is_active = 1",
  );
  console.log(`active commercial register definitions: ${before[0].c} -> ${after[0].c}`);
}

module.exports = { COMMERCIAL_REGISTERS, RENT_REGISTERS, SALE_REGISTERS, MALFORMED };

if (require.main === module) {
  run().then(() => process.exit(0)).catch((e) => { console.error(e.message); process.exit(1); });
}
