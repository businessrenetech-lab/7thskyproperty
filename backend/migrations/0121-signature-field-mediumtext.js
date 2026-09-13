'use strict';

/**
 * Migration 0121: widen signature_fields.value from TEXT (64KB) to MEDIUMTEXT (16MB).
 *
 * Supports uploaded base64 signature images and drawn signatures with full fidelity
 * without risk of ER_DATA_TOO_LONG errors.
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    const described = await queryInterface.describeTable('signature_fields').catch(() => null);
    if (described && described.value) {
      await queryInterface.changeColumn('signature_fields', 'value', {
        type: Sequelize.TEXT('medium'),
        allowNull: true,
      });
    }
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.changeColumn('signature_fields', 'value', {
      type: Sequelize.TEXT,
      allowNull: true,
    }).catch(() => {});
  },
};
