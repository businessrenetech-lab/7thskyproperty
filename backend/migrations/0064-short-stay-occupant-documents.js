'use strict';

/**
 * Migration 0064: add identity-document fields to short_stay_booking_occupants so the
 * Guest Verification modal can attach/view each party member's ID document. Idempotent.
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    const occ = await queryInterface.describeTable('short_stay_booking_occupants');
    if (!occ.id_document_url) {
      await queryInterface.addColumn('short_stay_booking_occupants', 'id_document_url', { type: Sequelize.STRING, allowNull: true });
    }
    if (!occ.id_document_type) {
      await queryInterface.addColumn('short_stay_booking_occupants', 'id_document_type', { type: Sequelize.STRING(60), allowNull: true });
    }
    // Booking-level verification metadata: { state, risk_notes, occupation, emergency_contact, timeline:[{state,at,by}], protected_docs:[] }
    const bk = await queryInterface.describeTable('short_stay_bookings');
    if (!bk.verification_meta) {
      await queryInterface.addColumn('short_stay_bookings', 'verification_meta', { type: Sequelize.JSON, allowNull: true });
    }
  },
  down: async (queryInterface) => {
    const occ = await queryInterface.describeTable('short_stay_booking_occupants');
    if (occ.id_document_url) await queryInterface.removeColumn('short_stay_booking_occupants', 'id_document_url');
    if (occ.id_document_type) await queryInterface.removeColumn('short_stay_booking_occupants', 'id_document_type');
    const bk = await queryInterface.describeTable('short_stay_bookings');
    if (bk.verification_meta) await queryInterface.removeColumn('short_stay_bookings', 'verification_meta');
  },
};
