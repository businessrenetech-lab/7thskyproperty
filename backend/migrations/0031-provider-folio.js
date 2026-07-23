'use strict';

/**
 * 0031 — provider folios. Each third-party provider has its own folio for payouts
 * (like landlord folios). Adds folios.provider_id and extends the type/scope enums.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const qi = queryInterface;
    const d = await qi.describeTable('folios').catch(() => ({}));
    if (!d.provider_id) await qi.addColumn('folios', 'provider_id', { type: Sequelize.INTEGER });
    await qi.sequelize.query("ALTER TABLE folios MODIFY COLUMN folio_type ENUM('tenant','landlord','provider') DEFAULT 'tenant'").catch(() => {});
    await qi.sequelize.query("ALTER TABLE folios MODIFY COLUMN folio_scope ENUM('tenancy','landlord','landlord_property','provider') DEFAULT 'tenancy'").catch(() => {});
  },
  async down() { /* additive */ },
};
