'use strict';

/**
 * 0012 — Master Agreement Library (under signing/DocuSign management).
 *
 * A master "agreement" has a PERMANENT id + agreement_code that never changes.
 * Each upload over time creates an immutable agreement_version with its own
 * version number and effective_date. The latest effective version is marked
 * current and is what gets used when preparing an envelope for signing.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const { INTEGER, STRING, TEXT, BOOLEAN, ENUM, DATE, DATEONLY } = Sequelize;
    const ts = {
      created_at: { type: DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    };
    const fkUser = (allowNull = true) => ({ type: INTEGER, allowNull, references: { model: 'users', key: 'id' }, onDelete: 'SET NULL' });

    // ── agreements (stable master record) ──────────────────────────────────
    await queryInterface.createTable('agreements', {
      id: { type: INTEGER, autoIncrement: true, primaryKey: true },   // FIXED — never changes
      branch_id: { type: INTEGER, references: { model: 'branches', key: 'id' }, onDelete: 'SET NULL' },
      agreement_code: { type: STRING(40), allowNull: false, unique: true },  // FIXED — e.g. SSPC-AGR-000001
      title: { type: STRING, allowNull: false },
      category: { type: STRING },        // Service Agreement, Lease, Provider Master Agreement, Work Order, SOP...
      vertical_key: { type: STRING(40) },
      description: { type: TEXT },
      purpose: { type: TEXT },           // where/how this agreement is used
      current_version: { type: INTEGER, defaultValue: 0 },
      current_effective_date: { type: DATEONLY },
      current_file_url: { type: STRING },     // denormalised pointer to latest version file
      status: { type: ENUM('draft', 'active', 'archived'), defaultValue: 'active' },
      created_by: fkUser(true),
      ...ts,
    });

    // ── agreement_versions (immutable per-upload history) ───────────────────
    await queryInterface.createTable('agreement_versions', {
      id: { type: INTEGER, autoIncrement: true, primaryKey: true },
      agreement_id: { type: INTEGER, allowNull: false, references: { model: 'agreements', key: 'id' }, onDelete: 'CASCADE' },
      version: { type: INTEGER, allowNull: false },
      file_url: { type: STRING, allowNull: false },
      file_name: { type: STRING },
      mime_type: { type: STRING(120) },
      effective_date: { type: DATEONLY },
      change_note: { type: STRING },
      is_current: { type: BOOLEAN, defaultValue: false },
      uploaded_by: fkUser(true),
      created_at: { type: DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });

    await queryInterface.addIndex('agreements', ['branch_id', 'status']);
    await queryInterface.addIndex('agreements', ['category']);
    await queryInterface.addIndex('agreement_versions', ['agreement_id', 'version']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('agreement_versions');
    await queryInterface.dropTable('agreements');
  },
};
