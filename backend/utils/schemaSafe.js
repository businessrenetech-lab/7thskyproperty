const sequelize = require('../config/db.config');

const tableColumnCache = new Map();

const TRANSIENT_DB_ERROR_CODES = new Set([
  'ECONNREFUSED',
  'ECONNRESET',
  'ETIMEDOUT',
  'PROTOCOL_CONNECTION_LOST',
  'ER_CON_COUNT_ERROR',
  'ER_USER_LIMIT_REACHED',
]);

const isTransientDbError = (error) => {
  const code = error?.original?.code || error?.parent?.code || error?.code;
  const message = error?.message || '';
  return TRANSIENT_DB_ERROR_CODES.has(code)
    || message.includes('max_connections_per_hour')
    || message.includes('Too many connections');
};

const getTableColumns = async (tableName) => {
  if (tableColumnCache.has(tableName)) return tableColumnCache.get(tableName);

  try {
    const definition = await sequelize.getQueryInterface().describeTable(tableName);
    const columns = new Set(Object.keys(definition || {}));
    tableColumnCache.set(tableName, columns);
    return columns;
  } catch (error) {
    if (isTransientDbError(error)) throw error;
    console.warn(`[schemaSafe] Could not describe ${tableName}: ${error.message}`);
    tableColumnCache.set(tableName, null);
    return null;
  }
};

const hasColumn = (columns, columnName) => {
  if (!columns) return true; // Fail open if schema check fails on live server
  return columns.has(columnName);
};

const pickExisting = (columns, attributes) => {
  if (!columns) return attributes;
  return attributes.filter((attribute) => {
    if (Array.isArray(attribute)) return true;
    return columns.has(attribute);
  });
};

module.exports = { getTableColumns, hasColumn, pickExisting, isTransientDbError };
