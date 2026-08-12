'use strict';

/**
 * Migration 0067: source_ref on the water-tank register/work-order tables.
 *
 * Records carried over from the shared Property Care module keep a pointer to
 * the row they came from (e.g. "care_warranties:SSPC-WR-000001"). That makes the
 * carry-over idempotent and keeps the provenance visible. Idempotent.
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    const S = Sequelize;
    const hasCol = async (t, c) => { try { return !!(await queryInterface.describeTable(t))[c]; } catch { return false; } };
    for (const table of ['wt_warranties', 'wt_incidents', 'wt_complaints', 'wt_work_orders']) {
      if (!(await hasCol(table, 'source_ref'))) {
        await queryInterface.addColumn(table, 'source_ref', { type: S.STRING(80), allowNull: true });
      }
    }
  },

  down: async (queryInterface) => {
    for (const table of ['wt_warranties', 'wt_incidents', 'wt_complaints', 'wt_work_orders']) {
      try { await queryInterface.removeColumn(table, 'source_ref'); } catch { /* not present */ }
    }
  },
};
