'use strict';

// Guarded, idempotent rename of camelCase timestamp columns to snake_case
// on deal_disbursements / deal_events. The 0103 migration originally created
// these with createdAt/updatedAt, but the Sequelize models declare
// `underscored: true` (expecting created_at/updated_at), causing inserts
// and ordered queries to 500 against an already-migrated dev DB. 0103 itself
// has been fixed to create snake_case columns on fresh installs; this
// migration brings already-migrated databases in line.
//
// deal_events is append-only and has no updatedAt column — the guard below
// skips it cleanly for that table.

const RENAMES = [
  { table: 'deal_disbursements', from: 'createdAt', to: 'created_at' },
  { table: 'deal_disbursements', from: 'updatedAt', to: 'updated_at' },
  { table: 'deal_events', from: 'createdAt', to: 'created_at' },
  // deal_events has no updatedAt; included here only so the reverse (down)
  // direction is symmetric with the guard doing nothing when absent.
  { table: 'deal_events', from: 'updatedAt', to: 'updated_at' },
];

async function renameIfNeeded(q, table, from, to) {
  const desc = await q.describeTable(table).catch(() => null);
  if (!desc) return; // table doesn't exist, nothing to do
  if (!desc[from] || desc[to]) return; // camelCase absent, or snake_case already present

  const col = desc[from];
  const rawDefault = col.defaultValue;
  const isCurrentTimestamp = typeof rawDefault === 'string' && /current_timestamp/i.test(rawDefault);

  if (isCurrentTimestamp) {
    // Sequelize's queryInterface.renameColumn() re-quotes a CURRENT_TIMESTAMP
    // default as the string literal 'current_timestamp()' when it rebuilds the
    // CHANGE COLUMN clause for MySQL/MariaDB, which the server then rejects
    // with "Invalid default value" for a DATETIME column. Do the rename via
    // raw SQL instead, preserving the function default unquoted.
    const nullClause = col.allowNull ? 'NULL' : 'NOT NULL';
    const type = (col.type || 'DATETIME').toUpperCase();
    await q.sequelize.query(
      `ALTER TABLE \`${table}\` CHANGE \`${from}\` \`${to}\` ${type} ${nullClause} DEFAULT CURRENT_TIMESTAMP`
    );
  } else {
    await q.renameColumn(table, from, to);
  }
}

module.exports = {
  up: async (q) => {
    for (const { table, from, to } of RENAMES) {
      try {
        await renameIfNeeded(q, table, from, to);
      } catch (e) {
        console.warn(`[0104] rename ${table}.${from} -> ${to} failed:`, e.message);
      }
    }
  },
  down: async (q) => {
    for (const { table, from, to } of RENAMES) {
      try {
        // reverse direction: rename snake_case back to camelCase, guarded
        await renameIfNeeded(q, table, to, from);
      } catch (e) {
        console.warn(`[0104] revert ${table}.${to} -> ${from} failed:`, e.message);
      }
    }
  },
};
