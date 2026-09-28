/**
 * The five rural service registers the CRM workbook defines but that were never
 * seeded: complaint, communication log, owner feedback, closure (with record
 * retention) and tenant feedback.
 *
 * Owner Sheets 19-22 and tenant Sheets 21-23. Thirteen other rural_rent registers
 * were seeded on 2026-06-26; these were missed. Definitions are DATA, so this is
 * a seed script rather than a migration, matching how the other thirteen arrived.
 *
 * Idempotent and additive: it matches on (vertical_key, register_key), updates
 * the columns of one it already created, and never touches the thirteen.
 *
 * Run from backend/:  node scripts/seedRuralServiceRegisters.js
 */
const sequelize = require('../config/db.config');

const col = (key, label, type = 'text') => ({ key, label, type });

const RURAL_SERVICE_REGISTERS = [
  {
    vertical_key: 'rural_rent',
    register_key: 'complaint_register',
    name: 'Complaint Register',
    columns: [
      col('date', 'Date', 'date'),
      col('party', 'Party'),
      col('complaint', 'Complaint', 'textarea'),
      col('severity', 'Severity', 'select'),
      col('action_taken', 'Action taken', 'textarea'),
      col('resolved_on', 'Resolved on', 'date'),
      col('outcome', 'Outcome'),
    ],
  },
  {
    vertical_key: 'rural_rent',
    register_key: 'communication_log',
    name: 'Communication Log',
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
    vertical_key: 'rural_rent',
    register_key: 'owner_feedback_register',
    name: 'Owner Feedback Register',
    columns: [
      col('date', 'Date', 'date'),
      col('owner', 'Owner'),
      col('rating', 'Rating', 'select'),
      col('feedback', 'Feedback', 'textarea'),
      col('action', 'Action', 'textarea'),
    ],
  },
  {
    vertical_key: 'rural_rent',
    register_key: 'closure_register',
    name: 'Project Closure Register',
    columns: [
      col('project', 'Project'),
      col('closed_on', 'Closed on', 'date'),
      col('final_reconciliation', 'Final reconciliation'),
      col('records_archived', 'Records archived', 'select'),
      // SOP §14: record retention compliance is an attribute of closure, not a
      // register of its own.
      col('retention_until', 'Retention until', 'date'),
      col('notes', 'Notes', 'textarea'),
    ],
  },
  {
    vertical_key: 'rural_tenancy',
    register_key: 'tenant_feedback_register',
    name: 'Tenant Feedback Register',
    columns: [
      col('date', 'Date', 'date'),
      col('tenant', 'Tenant'),
      col('rating', 'Rating', 'select'),
      col('feedback', 'Feedback', 'textarea'),
      col('action', 'Action', 'textarea'),
    ],
  },
];

async function run() {
  const [before] = await sequelize.query(
    "SELECT COUNT(*) AS c FROM register_definitions WHERE vertical_key LIKE 'rural%'",
  );

  for (const def of RURAL_SERVICE_REGISTERS) {
    const [existing] = await sequelize.query(
      'SELECT id FROM register_definitions WHERE vertical_key = :v AND register_key = :k LIMIT 1',
      { replacements: { v: def.vertical_key, k: def.register_key } },
    );
    if (existing.length) {
      await sequelize.query(
        'UPDATE register_definitions SET name = :n, columns = :c WHERE id = :id',
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
    "SELECT COUNT(*) AS c FROM register_definitions WHERE vertical_key LIKE 'rural%'",
  );
  console.log(`rural register definitions: ${before[0].c} -> ${after[0].c}`);
}

module.exports = { RURAL_SERVICE_REGISTERS };

if (require.main === module) {
  run().then(() => process.exit(0)).catch((e) => { console.error(e.message); process.exit(1); });
}
