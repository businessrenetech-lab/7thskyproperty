'use strict';

/**
 * Migration 0095: widen signing_envelopes.related_type from VARCHAR(40) to VARCHAR(100).
 *
 * Service-line-scoped related_types are `<service_line>_customer_agreement` /
 * `<service_line>_provider_agreement` / `<service_line>_work_order`. Water Tank
 * (29) and Air Conditioning (35) fit in 40, but Land & Property Assessment's
 * `land_property_assessment_customer_agreement` is 43 chars and was silently
 * truncated to 40 on write — so the endsWith('_customer_agreement') /
 * endsWith('_provider_agreement') completion hooks (partyRoleActivation,
 * wtAgreementCompletion) never matched, leaving the work order un-raised and the
 * provider agreement stuck at "Sent". Widening fixes it for this line and the
 * three longer Doc-Verification sub-services still to come. Additive; nullable.
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    const described = await queryInterface.describeTable('signing_envelopes').catch(() => null);
    if (described && described.related_type) {
      await queryInterface.changeColumn('signing_envelopes', 'related_type', {
        type: Sequelize.STRING(100),
        allowNull: true,
      });
    }
  },
  down: async (queryInterface, Sequelize) => {
    // Reverting to 40 would re-truncate; keep the wider column on down as a no-op
    // safety, or narrow only if you are certain no long related_types exist.
    await queryInterface.changeColumn('signing_envelopes', 'related_type', {
      type: Sequelize.STRING(40),
      allowNull: true,
    }).catch(() => {});
  },
};
