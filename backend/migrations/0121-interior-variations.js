'use strict';
// Interior Design variations: a client-approved, re-priced change to an in-flight
// project (added scope, changed layout/materials/furniture). Kept in its own
// table — a variation is semantically distinct from a quotation or work order and
// carries a signed-off price delta. Scoped by service_line like the shared ops
// tables. Completion Sign-Off is NOT a table: it reuses WtServiceReport with
// report_type 'Completion Sign-Off'.
module.exports = {
  up: async (q, S) => {
    const exists = await q.describeTable('interior_variations').catch(() => null);
    if (exists) return;
    await q.createTable('interior_variations', {
      id: { type: S.INTEGER, autoIncrement: true, primaryKey: true },
      branch_id: { type: S.INTEGER, allowNull: false, defaultValue: 1 },
      service_line: { type: S.STRING(40), allowNull: false, defaultValue: 'residential_interior_design' },
      variation_code: { type: S.STRING(40), allowNull: false, unique: true },
      project_id: { type: S.STRING(30), allowNull: true },
      work_order_code: { type: S.STRING(30), allowNull: true },
      client_name: { type: S.STRING(200), allowNull: true },
      description: { type: S.TEXT, allowNull: true },
      reason: { type: S.STRING(255), allowNull: true },
      amount_delta: { type: S.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
      timeline_impact: { type: S.STRING(255), allowNull: true },
      status: { type: S.ENUM('draft', 'sent', 'approved', 'rejected'), allowNull: false, defaultValue: 'draft' },
      decided_at: { type: S.DATE, allowNull: true },
      decided_by: { type: S.STRING(120), allowNull: true },
      created_by: { type: S.INTEGER, allowNull: true },
      created_at: { type: S.DATE, allowNull: false, defaultValue: S.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: S.DATE, allowNull: false, defaultValue: S.literal('CURRENT_TIMESTAMP') },
    });
    await q.addIndex('interior_variations', ['branch_id', 'service_line'], { name: 'idx_intvar_branch_line' });
    await q.addIndex('interior_variations', ['project_id'], { name: 'idx_intvar_project' });
  },
  down: async (q) => {
    await q.dropTable('interior_variations').catch(() => {});
  },
};
