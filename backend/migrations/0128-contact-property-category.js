'use strict';
// Contacts get a hard `category` (residential | commercial | null) so the
// residential vs commercial consoles can isolate their directories exactly,
// instead of the best-effort keyword heuristic. Existing rows are backfilled
// from the same commercial keyword signals so legacy data is classified once.
module.exports = {
  up: async (q, S) => {
    const d = await q.describeTable('contacts').catch(() => ({}));
    if (!d.category) {
      await q.addColumn('contacts', 'category', { type: S.STRING(20), allowNull: true });
    }
    // Backfill: tag clearly-commercial rows; everything else becomes residential.
    await q.sequelize.query(`
      UPDATE contacts SET category = 'commercial'
       WHERE category IS NULL
         AND ( looking_for = 'commercial'
            OR property_types LIKE '%commercial%'
            OR property_types LIKE '%office%'
            OR property_types LIKE '%retail%'
            OR property_types LIKE '%shop%'
            OR property_types LIKE '%showroom%'
            OR property_types LIKE '%warehouse%'
            OR property_types LIKE '%industrial%' )
    `);
    await q.sequelize.query(`UPDATE contacts SET category = 'residential' WHERE category IS NULL`);
  },
  down: async (q) => {
    await q.removeColumn('contacts', 'category').catch(() => {});
  },
};
