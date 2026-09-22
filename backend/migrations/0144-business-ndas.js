'use strict';

/**
 * Migration 0144: business_ndas — a buyer's confidentiality agreement for one
 * business listing (Sale SOP Step 13 / Purchase SOP Step 11).
 * requested → sent (approved) → signed → released, or declined.
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    const S = Sequelize;
    const tables = (await queryInterface.showAllTables()).map((t) => (typeof t === 'string' ? t : t.tableName).toLowerCase());
    if (tables.includes('business_ndas')) return;
    await queryInterface.createTable('business_ndas', {
      id: { type: S.INTEGER, autoIncrement: true, primaryKey: true },
      branch_id: { type: S.INTEGER, allowNull: false },
      property_id: { type: S.INTEGER, allowNull: false },
      contact_id: { type: S.INTEGER, allowNull: false },
      enquiry_id: S.INTEGER,
      envelope_id: S.INTEGER,
      status: { type: S.STRING(20), allowNull: false, defaultValue: 'requested' },
      buyer_company: S.STRING(160),
      approved_by: S.INTEGER, approved_at: S.DATE,
      signed_at: S.DATE,
      released_by: S.INTEGER, released_at: S.DATE,
      release_token: { type: S.STRING(64), unique: true },
      token_expires_at: S.DATE,
      decline_reason: S.TEXT,
      last_error: S.TEXT,
      created_at: { type: S.DATE, allowNull: false, defaultValue: S.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: S.DATE, allowNull: false, defaultValue: S.literal('CURRENT_TIMESTAMP') },
    });
    await queryInterface.addIndex('business_ndas', ['property_id']);
    await queryInterface.addIndex('business_ndas', ['contact_id']);
    await queryInterface.addIndex('business_ndas', ['status']);
  },
  down: async (queryInterface) => { await queryInterface.dropTable('business_ndas').catch(() => {}); },
};
