'use strict';

/**
 * Migration 0140: split business invoices by deal side (sale / buy / rent).
 *
 * The Business area is being separated into dedicated Buy / Sale / Rent consoles
 * (like Commercial). Each console shows only its own invoices, so an invoice now
 * carries a `deal_side`. Buy invoices are raised against an acquisition mandate
 * (no listing), so `business_listing_id` becomes nullable and a `mandate_id` is
 * added. Existing rows are backfilled from their listing's listing_type.
 * Idempotent: guarded by describeTable.
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    const S = Sequelize;
    const t = await queryInterface.describeTable('business_invoices');

    if (!t.deal_side) {
      await queryInterface.addColumn('business_invoices', 'deal_side', { type: S.STRING(10), allowNull: false, defaultValue: 'sale' });
    }
    if (!t.mandate_id) {
      await queryInterface.addColumn('business_invoices', 'mandate_id', { type: S.INTEGER, allowNull: true });
    }
    // Allow buy invoices with no listing.
    if (t.business_listing_id && t.business_listing_id.allowNull === false) {
      await queryInterface.changeColumn('business_invoices', 'business_listing_id', { type: S.INTEGER, allowNull: true });
    }
    // Backfill deal_side from the linked listing's listing_type (sale vs rent).
    await queryInterface.sequelize.query(
      "UPDATE business_invoices bi JOIN business_listings bl ON bl.id = bi.business_listing_id "
      + "SET bi.deal_side = bl.listing_type WHERE bl.listing_type IN ('sale','rent')",
    ).catch(() => {});
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn('business_invoices', 'deal_side').catch(() => {});
    await queryInterface.removeColumn('business_invoices', 'mandate_id').catch(() => {});
  },
};
