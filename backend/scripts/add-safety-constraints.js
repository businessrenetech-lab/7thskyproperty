const sequelize = require('../config/db.config');

const APPLY = process.argv.includes('--apply');

const qi = (identifier) => {
  if (!/^[A-Za-z0-9_]+$/.test(identifier)) {
    throw new Error(`Unsafe SQL identifier: ${identifier}`);
  }
  return `\`${identifier}\``;
};

const constraints = [
  {
    name: 'ux_invoices_invoice_no',
    table: 'invoices',
    columns: ['invoice_no'],
    duplicateWhere: "`invoice_no` IS NOT NULL AND `invoice_no` <> ''",
    reason: 'Protects invoice number uniqueness across all invoice creation paths.',
  },
  {
    name: 'ux_payrolls_branch_staff_month_year',
    table: 'payrolls',
    columns: ['branch_id', 'staff_id', 'month', 'year'],
    reason: 'Prevents duplicate payroll rows for the same staff member and salary month.',
  },
  {
    name: 'ux_transactions_branch_source_ref',
    table: 'transactions',
    columns: ['branch_id', 'source', 'transaction_ref'],
    duplicateWhere: '`transaction_ref` IS NOT NULL',
    reason: 'Prevents duplicate successful payment references; MySQL still permits multiple NULL refs.',
  },
  {
    name: 'ux_reconciliation_sessions_branch_date',
    table: 'reconciliation_sessions',
    columns: ['branch_id', 'recon_date'],
    reason: 'Prevents duplicate reconciliation sessions for the same branch and date.',
  },
  {
    name: 'ux_reconciliation_lines_session_account_channel',
    table: 'reconciliation_lines',
    columns: ['session_id', 'account_id', 'channel'],
    duplicateWhere: '`account_id` IS NOT NULL',
    reason: 'Prevents duplicate reconciliation lines for one session/account/channel.',
  },
];

const getRows = async (sql, replacements = []) => {
  const [rows] = await sequelize.query(sql, { replacements });
  return rows;
};

const tableExists = async (table) => {
  const rows = await getRows(
    'SELECT COUNT(*) AS count FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?',
    [table]
  );
  return Number(rows[0]?.count || 0) > 0;
};

const missingColumns = async (table, columns) => {
  const rows = await getRows(
    'SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?',
    [table]
  );
  const existing = new Set(rows.map((row) => row.COLUMN_NAME));
  return columns.filter((column) => !existing.has(column));
};

const indexExists = async (table, indexName) => {
  const rows = await getRows(
    'SELECT COUNT(*) AS count FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND INDEX_NAME = ?',
    [table, indexName]
  );
  return Number(rows[0]?.count || 0) > 0;
};

const findDuplicates = async ({ table, columns, duplicateWhere }) => {
  const columnSql = columns.map(qi).join(', ');
  const whereSql = duplicateWhere ? `WHERE ${duplicateWhere}` : '';
  return getRows(
    `SELECT ${columnSql}, COUNT(*) AS duplicate_count FROM ${qi(table)} ${whereSql} GROUP BY ${columnSql} HAVING COUNT(*) > 1 LIMIT 20`
  );
};

const addUniqueIndex = async ({ table, name, columns }) => {
  const columnSql = columns.map(qi).join(', ');
  await sequelize.query(`ALTER TABLE ${qi(table)} ADD UNIQUE INDEX ${qi(name)} (${columnSql})`);
};

const inspectConstraint = async (constraint) => {
  const result = {
    name: constraint.name,
    table: constraint.table,
    columns: constraint.columns,
    reason: constraint.reason,
    exists: false,
    skipped: false,
    duplicateCount: 0,
    duplicateSamples: [],
  };

  if (!(await tableExists(constraint.table))) {
    return { ...result, skipped: true, skipReason: 'table_missing' };
  }

  const missing = await missingColumns(constraint.table, constraint.columns);
  if (missing.length > 0) {
    return { ...result, skipped: true, skipReason: 'columns_missing', missingColumns: missing };
  }

  result.exists = await indexExists(constraint.table, constraint.name);
  if (result.exists) return result;

  const duplicateSamples = await findDuplicates(constraint);
  result.duplicateCount = duplicateSamples.length;
  result.duplicateSamples = duplicateSamples;
  return result;
};

const run = async () => {
  await sequelize.authenticate();

  const inspected = [];
  for (const constraint of constraints) {
    inspected.push(await inspectConstraint(constraint));
  }

  const blockers = inspected.filter((item) => !item.exists && !item.skipped && item.duplicateCount > 0);
  if (blockers.length > 0) {
    return {
      ok: false,
      mode: APPLY ? 'apply' : 'dry-run',
      error: 'Duplicate rows must be resolved before constraints can be added.',
      constraints: inspected,
    };
  }

  const added = [];
  if (APPLY) {
    for (const constraint of constraints) {
      const item = inspected.find((entry) => entry.name === constraint.name);
      if (item.exists || item.skipped) continue;
      await addUniqueIndex(constraint);
      added.push(constraint.name);
    }
  }

  return {
    ok: true,
    mode: APPLY ? 'apply' : 'dry-run',
    changed: added,
    message: APPLY
      ? 'Safety constraints applied. Re-run in dry-run mode to confirm all indexes exist.'
      : 'Dry run only. Re-run with --apply to add missing indexes after reviewing this output.',
    constraints: inspected,
  };
};

run()
  .then(async (result) => {
    console.log(JSON.stringify(result, null, 2));
    await sequelize.close();
    if (!result.ok) process.exit(1);
  })
  .catch(async (error) => {
    console.error(JSON.stringify({
      ok: false,
      mode: APPLY ? 'apply' : 'dry-run',
      name: error.name,
      error: error.message || String(error),
      sql: error.sql,
      parent: error.parent?.message || error.original?.message,
      stack: error.stack,
    }, null, 2));
    await sequelize.close().catch(() => {});
    process.exit(1);
  });
