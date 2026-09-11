'use strict';
// Extend non_circumvention_records (rental-shaped) so it also carries sales
// introductions. Additive columns only; existing rental rows are marked
// context='rental' so sales lists exclude them.
module.exports = {
  up: async (q, S) => {
    const t = await q.describeTable('non_circumvention_records');
    if (!t.context) await q.addColumn('non_circumvention_records', 'context', { type: S.STRING(20), allowNull: false, defaultValue: 'sale' });
    if (!t.deal_id) await q.addColumn('non_circumvention_records', 'deal_id', { type: S.INTEGER, allowNull: true });
    if (!t.introduced_by) await q.addColumn('non_circumvention_records', 'introduced_by', { type: S.INTEGER, allowNull: true });
    // Existing rows predate sales — mark them rental so sales lists exclude them.
    await q.sequelize.query("UPDATE non_circumvention_records SET context='rental' WHERE tenancy_id IS NOT NULL");
  },
  down: async (q) => {
    for (const c of ['context', 'deal_id', 'introduced_by']) { await q.removeColumn('non_circumvention_records', c).catch(() => {}); }
  },
};
