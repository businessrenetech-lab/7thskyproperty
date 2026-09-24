'use strict';

// Business Rent reuses non_circumvention_records with context 'rental'. category
// tells the three PM consoles apart and protection_expires_on carries the SOP's
// engagement-plus-12-months window. Existing rows keep category NULL, so an
// unscoped query still returns everything exactly as before.
module.exports = {
  async up(queryInterface, Sequelize) {
    const t = await queryInterface.describeTable('non_circumvention_records');
    if (!t.category) {
      await queryInterface.addColumn('non_circumvention_records', 'category', { type: Sequelize.STRING(20), allowNull: true });
    }
    if (!t.protection_expires_on) {
      await queryInterface.addColumn('non_circumvention_records', 'protection_expires_on', { type: Sequelize.DATEONLY, allowNull: true });
    }
    if (!t.evidence_trail) {
      await queryInterface.addColumn('non_circumvention_records', 'evidence_trail', { type: Sequelize.JSON, allowNull: true });
    }
  },
  async down(queryInterface) {
    const t = await queryInterface.describeTable('non_circumvention_records');
    for (const c of ['category', 'protection_expires_on', 'evidence_trail']) {
      if (t[c]) await queryInterface.removeColumn('non_circumvention_records', c);
    }
  },
};
