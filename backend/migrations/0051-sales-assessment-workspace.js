'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const { INTEGER, STRING, TEXT, ENUM, DECIMAL, DATE, DATEONLY, BOOLEAN, JSON } = Sequelize;
    const tables = new Set((await queryInterface.showAllTables()).map((name) => String(name).toLowerCase()));
    const timestamps = {
      created_at: { type: DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    };
    const branch = { type: INTEGER, allowNull: false, references: { model: 'branches', key: 'id' }, onDelete: 'RESTRICT' };
    const requiredFk = (table) => ({ type: INTEGER, allowNull: false, references: { model: table, key: 'id' }, onDelete: 'CASCADE' });
    const nullableFk = (table) => ({ type: INTEGER, allowNull: true, references: { model: table, key: 'id' }, onDelete: 'SET NULL' });
    const money = (allowNull = true) => ({ type: DECIMAL(15, 2), allowNull });

    const ensureTable = async (name, columns, indexes) => {
      if (!tables.has(name)) {
        await queryInterface.createTable(name, columns);
        tables.add(name);
      } else {
        const current = await queryInterface.describeTable(name);
        for (const [column, definition] of Object.entries(columns)) {
          if (!current[column]) await queryInterface.addColumn(name, column, definition);
        }
      }
      for (const index of indexes) {
        await queryInterface.addIndex(name, index.fields, {
          name: index.name,
          unique: !!index.unique,
        }).catch(() => {});
      }
    };

    await ensureTable('sale_assessments', {
      id: { type: INTEGER, autoIncrement: true, primaryKey: true },
      branch_id: branch,
      property_id: requiredFk('properties'),
      owner_contact_id: nullableFk('contacts'),
      assessed_by: nullableFk('users'),
      scheduled_at: DATE,
      assessment_date: DATEONLY,
      status: { type: ENUM('draft', 'submitted', 'changes_requested', 'approved'), allowNull: false, defaultValue: 'draft' },
      overall_score: { type: DECIMAL(5, 2), allowNull: true },
      condition_summary: TEXT,
      access_notes: TEXT,
      marketability_notes: TEXT,
      recommended_actions: TEXT,
      photos: JSON,
      blockers: JSON,
      submitted_by: nullableFk('users'),
      submitted_at: DATE,
      approved_by: nullableFk('users'),
      approved_at: DATE,
      approval_notes: TEXT,
      reopen_reason: TEXT,
      created_by: nullableFk('users'),
      updated_by: nullableFk('users'),
      ...timestamps,
    }, [
      { fields: ['property_id'], name: 'uq_sale_assessments_property', unique: true },
      { fields: ['branch_id', 'status'], name: 'idx_sale_assessments_branch_status' },
    ]);

    await ensureTable('sale_assessment_items', {
      id: { type: INTEGER, autoIncrement: true, primaryKey: true },
      branch_id: branch,
      assessment_id: requiredFk('sale_assessments'),
      section: { type: STRING(80), allowNull: false },
      item_key: { type: STRING(100), allowNull: false },
      label: { type: STRING, allowNull: false },
      condition_status: { type: ENUM('not_assessed', 'poor', 'fair', 'good', 'excellent', 'not_applicable'), allowNull: false, defaultValue: 'not_assessed' },
      score: { type: DECIMAL(5, 2), allowNull: true },
      priority: { type: ENUM('low', 'medium', 'high', 'critical'), allowNull: false, defaultValue: 'low' },
      notes: TEXT,
      recommendation: TEXT,
      estimated_cost: money(),
      photos: JSON,
      sort_order: { type: INTEGER, allowNull: false, defaultValue: 0 },
      created_by: nullableFk('users'),
      updated_by: nullableFk('users'),
      ...timestamps,
    }, [
      { fields: ['assessment_id', 'sort_order'], name: 'idx_sale_assessment_items_order' },
      { fields: ['branch_id', 'assessment_id'], name: 'idx_sale_assessment_items_branch' },
    ]);

    await ensureTable('sale_appraisals', {
      id: { type: INTEGER, autoIncrement: true, primaryKey: true },
      branch_id: branch,
      property_id: requiredFk('properties'),
      assessment_id: requiredFk('sale_assessments'),
      appraiser_id: nullableFk('users'),
      appraisal_date: DATEONLY,
      status: { type: ENUM('draft', 'submitted', 'changes_requested', 'approved'), allowNull: false, defaultValue: 'draft' },
      currency: { type: STRING(8), allowNull: false, defaultValue: 'BDT' },
      market_value_min: money(),
      recommended_value: money(),
      market_value_max: money(),
      confidence_score: { type: DECIMAL(5, 2), allowNull: true },
      valuation_method: STRING(80),
      market_summary: TEXT,
      condition_adjustment_percent: { type: DECIMAL(6, 2), allowNull: true },
      location_adjustment_percent: { type: DECIMAL(6, 2), allowNull: true },
      assumptions: TEXT,
      disclaimer: TEXT,
      blockers: JSON,
      report_url: STRING,
      pdf_url: STRING,
      submitted_by: nullableFk('users'),
      submitted_at: DATE,
      approved_by: nullableFk('users'),
      approved_at: DATE,
      approval_notes: TEXT,
      created_by: nullableFk('users'),
      updated_by: nullableFk('users'),
      ...timestamps,
    }, [
      { fields: ['branch_id', 'assessment_id'], name: 'uq_sale_appraisals_branch_assessment', unique: true },
      { fields: ['branch_id', 'property_id', 'status'], name: 'idx_sale_appraisals_property_status' },
    ]);

    await ensureTable('sale_appraisal_comparables', {
      id: { type: INTEGER, autoIncrement: true, primaryKey: true },
      branch_id: branch,
      appraisal_id: requiredFk('sale_appraisals'),
      title: STRING,
      address: TEXT,
      property_type: STRING(80),
      transaction_type: { type: ENUM('sale', 'listing'), allowNull: false, defaultValue: 'sale' },
      transaction_date: DATEONLY,
      asking_price: money(),
      sale_price: money(),
      adjusted_value: money(),
      area: STRING(80),
      land_size: STRING(80),
      building_size: STRING(80),
      bedrooms: INTEGER,
      bathrooms: INTEGER,
      distance_km: { type: DECIMAL(8, 2), allowNull: true },
      adjustment_percent: { type: DECIMAL(6, 2), allowNull: true },
      source: STRING,
      source_url: STRING,
      notes: TEXT,
      photos: JSON,
      sort_order: { type: INTEGER, allowNull: false, defaultValue: 0 },
      created_by: nullableFk('users'),
      updated_by: nullableFk('users'),
      ...timestamps,
    }, [
      { fields: ['appraisal_id', 'sort_order'], name: 'idx_sale_appraisal_comparables_order' },
      { fields: ['branch_id', 'appraisal_id'], name: 'idx_sale_appraisal_comparables_branch' },
    ]);

    await ensureTable('sale_proposals', {
      id: { type: INTEGER, autoIncrement: true, primaryKey: true },
      branch_id: branch,
      property_id: requiredFk('properties'),
      assessment_id: requiredFk('sale_assessments'),
      appraisal_id: nullableFk('sale_appraisals'),
      vendor_contact_id: nullableFk('contacts'),
      proposal_number: { type: STRING(50), allowNull: false },
      status: { type: ENUM('draft', 'generated', 'sent', 'accepted', 'rejected', 'expired'), allowNull: false, defaultValue: 'draft' },
      proposal_date: DATEONLY,
      valid_until: DATEONLY,
      currency: { type: STRING(8), allowNull: false, defaultValue: 'BDT' },
      proposed_asking_price: money(),
      proposed_reserve_price: money(),
      agency_type: { type: ENUM('exclusive', 'open', 'sole', 'joint'), allowNull: true },
      commission_percent: { type: DECIMAL(6, 2), allowNull: true },
      commission_fixed: money(),
      marketing_budget: money(),
      marketing_plan: JSON,
      included_services: JSON,
      summary: TEXT,
      terms: TEXT,
      assumptions: TEXT,
      disclaimer: TEXT,
      report_url: STRING,
      pdf_url: STRING,
      generated_at: DATE,
      sent_at: DATE,
      accepted_at: DATE,
      rejected_at: DATE,
      rejection_reason: TEXT,
      created_by: nullableFk('users'),
      updated_by: nullableFk('users'),
      ...timestamps,
    }, [
      { fields: ['branch_id', 'proposal_number'], name: 'uq_sale_proposals_branch_number', unique: true },
      { fields: ['branch_id', 'assessment_id', 'status'], name: 'idx_sale_proposals_assessment_status' },
      { fields: ['vendor_contact_id'], name: 'idx_sale_proposals_vendor' },
    ]);

    await ensureTable('sale_report_versions', {
      id: { type: INTEGER, autoIncrement: true, primaryKey: true },
      branch_id: branch,
      property_id: requiredFk('properties'),
      assessment_id: nullableFk('sale_assessments'),
      appraisal_id: nullableFk('sale_appraisals'),
      proposal_id: nullableFk('sale_proposals'),
      report_type: { type: ENUM('appraisal', 'proposal'), allowNull: false },
      version_number: { type: INTEGER, allowNull: false },
      status: { type: ENUM('generated', 'superseded'), allowNull: false, defaultValue: 'generated' },
      snapshot: JSON,
      snapshot_hash: { type: STRING(64), allowNull: false },
      file_name: { type: STRING, allowNull: false },
      report_url: { type: STRING, allowNull: false },
      pdf_url: { type: STRING, allowNull: false },
      mime_type: { type: STRING(80), allowNull: false, defaultValue: 'application/pdf' },
      generated_by: nullableFk('users'),
      generated_at: { type: DATE, allowNull: false },
      ...timestamps,
    }, [
      { fields: ['branch_id', 'property_id', 'report_type'], name: 'idx_sale_report_versions_property' },
      { fields: ['branch_id', 'appraisal_id', 'version_number'], name: 'uq_sale_report_versions_appraisal', unique: true },
      { fields: ['branch_id', 'proposal_id', 'version_number'], name: 'uq_sale_report_versions_proposal', unique: true },
    ]);
  },

  async down(queryInterface) {
    for (const table of [
      'sale_report_versions',
      'sale_proposals',
      'sale_appraisal_comparables',
      'sale_appraisals',
      'sale_assessment_items',
      'sale_assessments',
    ]) {
      await queryInterface.dropTable(table).catch(() => {});
    }
  },
};
