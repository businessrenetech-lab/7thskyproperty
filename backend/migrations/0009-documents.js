'use strict';

/**
 * 0009 — Document management: central document store with versioning,
 * polymorphic linking (client/property/project/work_order/provider),
 * categories, role-based access level, and audit-friendly metadata.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const { INTEGER, STRING, TEXT, BOOLEAN, ENUM, JSON, DATE } = Sequelize;
    const ts = {
      created_at: { type: DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    };
    const fkUser = (allowNull = true) => ({ type: INTEGER, allowNull, references: { model: 'users', key: 'id' }, onDelete: 'SET NULL' });

    await queryInterface.createTable('documents', {
      id: { type: INTEGER, autoIncrement: true, primaryKey: true },
      branch_id: { type: INTEGER, allowNull: false, references: { model: 'branches', key: 'id' }, onDelete: 'RESTRICT' },
      doc_code: { type: STRING(40), unique: true },
      category: { type: STRING },          // Agreement, Report, Quotation, WorkOrder, Invoice, Inspection, SOP, Checklist, KYC...
      title: { type: STRING, allowNull: false },
      file_url: { type: STRING },
      file_name: { type: STRING },
      mime_type: { type: STRING(120) },
      version: { type: INTEGER, defaultValue: 1 },
      related_type: { type: STRING(40) },  // client | property | project | work_order | provider | inspection
      related_id: { type: INTEGER },
      access_level: { type: ENUM('public', 'internal', 'client', 'provider', 'restricted'), defaultValue: 'internal' },
      tags: { type: JSON, defaultValue: [] },
      is_signed: { type: BOOLEAN, defaultValue: false },
      signing_envelope_id: { type: INTEGER },   // FK added in 0010 after envelopes exist
      notes: { type: TEXT },
      uploaded_by: fkUser(true),
      ...ts,
    });

    await queryInterface.createTable('document_versions', {
      id: { type: INTEGER, autoIncrement: true, primaryKey: true },
      document_id: { type: INTEGER, allowNull: false, references: { model: 'documents', key: 'id' }, onDelete: 'CASCADE' },
      version: { type: INTEGER, allowNull: false },
      file_url: { type: STRING, allowNull: false },
      file_name: { type: STRING },
      change_note: { type: STRING },
      changed_by: fkUser(true),
      ...ts,
    });

    await queryInterface.addIndex('documents', ['related_type', 'related_id']);
    await queryInterface.addIndex('documents', ['category']);
    await queryInterface.addIndex('document_versions', ['document_id']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('document_versions');
    await queryInterface.dropTable('documents');
  },
};
