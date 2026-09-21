'use strict';

/**
 * Migration 0134: Business Rent — add rent/lease fields to business_listings so
 * the same table serves listing_type='rent' (Business Rental Management).
 * Idempotent: guarded by column existence.
 */
module.exports = {
  up: async (queryInterface, S) => {
    const t = await queryInterface.describeTable('business_listings').catch(() => ({}));
    const add = async (name, spec) => { if (!t[name]) await queryInterface.addColumn('business_listings', name, spec); };
    await add('monthly_rent', { type: S.DECIMAL(16, 2), allowNull: true });
    await add('security_deposit', { type: S.DECIMAL(16, 2), allowNull: true });
    await add('lease_term_months', { type: S.INTEGER, allowNull: true });
    await add('rent_review_structure', { type: S.STRING(120), allowNull: true });
    await add('available_from', { type: S.DATEONLY, allowNull: true });
    await add('operational_status', { type: S.STRING(60), allowNull: true }); // operating / vacant / partially_operating
  },
  down: async (queryInterface) => {
    for (const c of ['monthly_rent', 'security_deposit', 'lease_term_months', 'rent_review_structure', 'available_from', 'operational_status']) {
      await queryInterface.removeColumn('business_listings', c).catch(() => {});
    }
  },
};
