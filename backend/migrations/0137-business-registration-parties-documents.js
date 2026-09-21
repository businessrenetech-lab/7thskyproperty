'use strict';

/**
 * Migration 0137: Business Registration — consultation, parties & documents.
 *
 * Three child tables of a registration project:
 *   - business_registration_assessments : consultation / business-structure
 *     assessment (SOP Phase 2, Steps 3-4).
 *   - business_registration_parties      : shareholders & directors (workbook
 *     Sheets 5 & 6) — one table, party_role tells them apart.
 *   - business_registration_documents    : the document register / Schedule D
 *     KYC checklist (SOP Phase 4, workbook Sheet 7).
 * Idempotent: skips creation when the table already exists.
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    const S = Sequelize;
    const existing = (await queryInterface.showAllTables()).map((t) => (typeof t === 'string' ? t : t.tableName).toLowerCase());

    if (!existing.includes('business_registration_assessments')) {
      await queryInterface.createTable('business_registration_assessments', {
        id: { type: S.INTEGER, autoIncrement: true, primaryKey: true },
        branch_id: { type: S.INTEGER, allowNull: false },
        project_id: { type: S.INTEGER, allowNull: false },
        business_objectives: S.TEXT,
        ownership_structure: S.STRING(160),
        proposed_activities: S.TEXT,
        regulatory_requirements: S.TEXT,
        recommended_structure: S.STRING(120),
        estimated_timeline: S.STRING(120),
        risks_notes: S.TEXT,
        assessed_by: S.INTEGER,
        assessed_at: S.DATE,
        created_by: S.INTEGER,
        created_at: { type: S.DATE, allowNull: false, defaultValue: S.literal('CURRENT_TIMESTAMP') },
        updated_at: { type: S.DATE, allowNull: false, defaultValue: S.literal('CURRENT_TIMESTAMP') },
      });
      await queryInterface.addIndex('business_registration_assessments', ['project_id']);
    }

    if (!existing.includes('business_registration_parties')) {
      await queryInterface.createTable('business_registration_parties', {
        id: { type: S.INTEGER, autoIncrement: true, primaryKey: true },
        branch_id: { type: S.INTEGER, allowNull: false },
        project_id: { type: S.INTEGER, allowNull: false },
        party_role: { type: S.STRING(20), defaultValue: 'shareholder' }, // shareholder / director
        name: { type: S.STRING, allowNull: false },
        nid: S.STRING(80),
        designation: S.STRING(80),          // director designation (Managing Director / Director …)
        share_percentage: S.DECIMAL(6, 2),  // shareholders
        mobile: S.STRING,
        email: S.STRING,
        address: S.STRING,
        nationality: S.STRING(60),
        notes: S.TEXT,
        created_by: S.INTEGER,
        created_at: { type: S.DATE, allowNull: false, defaultValue: S.literal('CURRENT_TIMESTAMP') },
        updated_at: { type: S.DATE, allowNull: false, defaultValue: S.literal('CURRENT_TIMESTAMP') },
      });
      await queryInterface.addIndex('business_registration_parties', ['project_id']);
      await queryInterface.addIndex('business_registration_parties', ['party_role']);
    }

    if (!existing.includes('business_registration_documents')) {
      await queryInterface.createTable('business_registration_documents', {
        id: { type: S.INTEGER, autoIncrement: true, primaryKey: true },
        branch_id: { type: S.INTEGER, allowNull: false },
        project_id: { type: S.INTEGER, allowNull: false },
        category: S.STRING(60),             // client_identification / business_information / company_registration / tax_regulatory
        doc_type: { type: S.STRING(120), allowNull: false }, // NID / Passport / Utility Bill / MoA / …
        file_url: S.STRING,                 // private /uploads/documents path
        status: { type: S.STRING(20), defaultValue: 'pending' }, // pending / received / verified / rejected
        verified_by: S.INTEGER,
        verified_at: S.DATE,
        notes: S.TEXT,
        created_by: S.INTEGER,
        created_at: { type: S.DATE, allowNull: false, defaultValue: S.literal('CURRENT_TIMESTAMP') },
        updated_at: { type: S.DATE, allowNull: false, defaultValue: S.literal('CURRENT_TIMESTAMP') },
      });
      await queryInterface.addIndex('business_registration_documents', ['project_id']);
      await queryInterface.addIndex('business_registration_documents', ['status']);
    }
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('business_registration_documents').catch(() => {});
    await queryInterface.dropTable('business_registration_parties').catch(() => {});
    await queryInterface.dropTable('business_registration_assessments').catch(() => {});
  },
};
