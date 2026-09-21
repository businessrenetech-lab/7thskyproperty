'use strict';

/**
 * Migration 0130: Business Sale module — Phase 2.
 *   - business_assessments : SOP Step 2 (viability / readiness scoring), Step 3
 *                            (risk identification) and Step 6 (presentation).
 *   - business_documents   : SOP Step 7 (document collection) + Step 19 (due
 *                            diligence) register, tied to Schedule D.
 *   - business_listings.workflow_state : JSON tracker for the 14-stage SOP
 *                            pipeline (per-stage status / notes / timestamps).
 * Idempotent: guarded by table + column existence checks.
 */
module.exports = {
  up: async (queryInterface, S) => {
    const existing = (await queryInterface.showAllTables()).map((t) => (typeof t === 'string' ? t : t.tableName).toLowerCase());

    if (!existing.includes('business_assessments')) {
      await queryInterface.createTable('business_assessments', {
        id: { type: S.INTEGER, autoIncrement: true, primaryKey: true },
        branch_id: { type: S.INTEGER, allowNull: false },
        business_listing_id: { type: S.INTEGER, allowNull: false },
        assessment_type: { type: S.STRING(30), defaultValue: 'preliminary' }, // preliminary / presentation / risk / due_diligence
        assessor_id: S.INTEGER,
        assessment_date: S.DATEONLY,
        // SOP Step 2 — 1..5 ratings
        operational_condition: S.INTEGER,
        market_attractiveness: S.INTEGER,
        business_readiness: S.INTEGER,
        commercial_viability: S.INTEGER,
        growth_potential: S.INTEGER,
        transaction_feasibility: S.INTEGER,
        // SOP Step 6 — presentation
        presentation_score: S.INTEGER,
        // SOP Step 3 — risks: [{ type, severity, note }]
        risks: { type: S.JSON, defaultValue: null },
        overall_rating: S.INTEGER,
        recommendation: S.STRING(30),   // proceed / hold / decline
        summary: S.TEXT,
        next_steps: S.TEXT,
        status: { type: S.STRING(20), defaultValue: 'draft' }, // draft / completed
        created_by: S.INTEGER,
        created_at: { type: S.DATE, allowNull: false, defaultValue: S.literal('CURRENT_TIMESTAMP') },
        updated_at: { type: S.DATE, allowNull: false, defaultValue: S.literal('CURRENT_TIMESTAMP') },
      });
      await queryInterface.addIndex('business_assessments', ['business_listing_id']);
      await queryInterface.addIndex('business_assessments', ['branch_id']);
    }

    if (!existing.includes('business_documents')) {
      await queryInterface.createTable('business_documents', {
        id: { type: S.INTEGER, autoIncrement: true, primaryKey: true },
        branch_id: { type: S.INTEGER, allowNull: false },
        business_listing_id: { type: S.INTEGER, allowNull: false },
        doc_type: S.STRING(50),   // trade_licence / company_registration / tin_bin / financial_statements / tax_records / lease_agreement / supplier_agreement / employee_info / operational_licence / asset_register / other
        name: S.STRING,
        status: { type: S.STRING(20), defaultValue: 'required' }, // required / collected / verified / rejected / na
        file_url: S.STRING,
        is_confidential: { type: S.BOOLEAN, defaultValue: true },
        verified_by: S.INTEGER,
        verified_at: S.DATE,
        notes: S.TEXT,
        created_by: S.INTEGER,
        created_at: { type: S.DATE, allowNull: false, defaultValue: S.literal('CURRENT_TIMESTAMP') },
        updated_at: { type: S.DATE, allowNull: false, defaultValue: S.literal('CURRENT_TIMESTAMP') },
      });
      await queryInterface.addIndex('business_documents', ['business_listing_id']);
      await queryInterface.addIndex('business_documents', ['branch_id']);
    }

    const bl = await queryInterface.describeTable('business_listings').catch(() => ({}));
    if (!bl.workflow_state) {
      await queryInterface.addColumn('business_listings', 'workflow_state', { type: S.JSON, allowNull: true });
    }
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('business_documents').catch(() => {});
    await queryInterface.dropTable('business_assessments').catch(() => {});
    await queryInterface.removeColumn('business_listings', 'workflow_state').catch(() => {});
  },
};
