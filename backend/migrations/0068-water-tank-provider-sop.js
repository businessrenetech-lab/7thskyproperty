'use strict';

/**
 * Migration 0068: Water Tank — Third-Party Service Provider Management.
 * Implements SSPC-WTCM-SOP-02 end to end:
 *
 *   wt_providers            extended for the 7-stage onboarding workflow,
 *                           capability assessment, agreement, Cumilla briefing
 *                           and the SOP Sec. 16 KPI measures
 *   wt_provider_documents   Sec. 5 Step 2 compliance + Step 3 insurance registers
 *                           (one row per document, with expiry tracking)
 *   wt_provider_audits      Sec. 14 annual compliance / insurance / safety /
 *                           service-quality audits
 *   wt_provider_events      lifecycle timeline — every stage change, briefing,
 *                           suspension and audit outcome
 *   wt_protected_clients    Sec. 12 non-circumvention register (24-month protection)
 *   wt_service_reports      Sec. 8 Step 10 provider reporting (site assessment,
 *                           cleaning, inspection, testing, repair, AMC)
 *
 * Idempotent.
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    const S = Sequelize;
    const has = async (t) => { try { await queryInterface.describeTable(t); return true; } catch { return false; } };
    const hasCol = async (t, c) => { try { return !!(await queryInterface.describeTable(t))[c]; } catch { return false; } };
    const ts = () => ({
      createdAt: { type: S.DATE, allowNull: false, defaultValue: S.literal('CURRENT_TIMESTAMP') },
      updatedAt: { type: S.DATE, allowNull: false, defaultValue: S.literal('CURRENT_TIMESTAMP') },
    });
    const base = () => ({ id: { type: S.INTEGER, autoIncrement: true, primaryKey: true }, branch_id: { type: S.INTEGER, allowNull: false, defaultValue: 1 } });

    // ── wt_providers: everything the SOP asks us to hold on a provider ──
    const providerCols = {
      // Sec. 5 Step 1 — business profile
      application_date: S.DATEONLY,
      legal_name: S.STRING(200),
      business_type: S.STRING(80),
      registration_no: S.STRING(80),
      years_experience: { type: S.INTEGER, defaultValue: 0 },
      team_size: { type: S.INTEGER, defaultValue: 0 },
      equipment_summary: S.TEXT,
      address: S.STRING(255),
      district: S.STRING(80),
      contact_email: S.STRING(160),
      contact_phone: S.STRING(40),
      website: S.STRING(160),
      // Sec. 2 scope — service categories + coverage
      service_categories: S.JSON,
      coverage_areas: S.JSON,
      capacity_per_week: { type: S.INTEGER, defaultValue: 0 },
      // Sec. 4 workflow position
      onboarding_stage: { type: S.STRING(40), defaultValue: 'Application' },
      stage_updated_at: S.DATE,
      approved_date: S.DATEONLY,
      approved_by: S.STRING(120),
      suspended_date: S.DATEONLY,
      suspension_reason: S.TEXT,
      terminated_date: S.DATEONLY,
      termination_reason: S.TEXT,
      // Sec. 5 Step 1 — capability assessment
      capability_score: { type: S.INTEGER, defaultValue: 0 },
      capability_notes: S.TEXT,
      assessed_by: S.STRING(120),
      assessed_date: S.DATEONLY,
      // Sec. 6 Step 4 — master agreement
      agreement_status: { type: S.STRING(40), defaultValue: 'Not Started' },
      agreement_envelope_id: S.INTEGER,
      agreement_code: S.STRING(40),
      agreement_signed_date: S.DATEONLY,
      agreement_expiry_date: S.DATEONLY,
      // Sec. 6 Step 5 + Sec. 11 — Cumilla territory
      cumilla_briefed: { type: S.BOOLEAN, defaultValue: false },
      cumilla_briefing_date: S.DATEONLY,
      cumilla_acknowledged_by: S.STRING(120),
      cumilla_exclusive: { type: S.BOOLEAN, defaultValue: false },
      territory_breaches: { type: S.INTEGER, defaultValue: 0 },
      // Sec. 12 — non-circumvention
      circumvention_breaches: { type: S.INTEGER, defaultValue: 0 },
      // Sec. 16 — KPI measures not already on the table
      response_time_hours: { type: S.DECIMAL(6, 1), defaultValue: 0 },
      warranty_claim_rate: { type: S.DECIMAL(5, 2), defaultValue: 0 },
      satisfaction_score: { type: S.DECIMAL(3, 1), defaultValue: 0 },
      revenue_generated: { type: S.DECIMAL(15, 2), defaultValue: 0 },
      repeat_project_rate: { type: S.DECIMAL(5, 2), defaultValue: 0 },
      // Sec. 14/Sec. 15 — audits and renewal
      last_audit_date: S.DATEONLY,
      next_audit_date: S.DATEONLY,
      renewal_decision: S.STRING(40),
      renewal_date: S.DATEONLY,
      next_renewal_date: S.DATEONLY,
    };
    for (const [col, spec] of Object.entries(providerCols)) {
      if (!(await hasCol('wt_providers', col))) await queryInterface.addColumn('wt_providers', col, spec);
    }

    // ── Sec. 5 Steps 2 & 3: compliance + insurance document registers ──
    if (!(await has('wt_provider_documents'))) await queryInterface.createTable('wt_provider_documents', {
      ...base(),
      provider_id: { type: S.INTEGER, allowNull: false },
      category: { type: S.STRING(20), allowNull: false, defaultValue: 'compliance' }, // compliance | insurance
      doc_type: { type: S.STRING(80), allowNull: false },
      doc_number: S.STRING(120),
      issuer: S.STRING(160),
      sum_insured: { type: S.DECIMAL(15, 2), defaultValue: 0 },
      issue_date: S.DATEONLY,
      expiry_date: S.DATEONLY,
      file_url: S.STRING(500),
      verified: { type: S.BOOLEAN, defaultValue: false },
      verified_by: S.STRING(120),
      verified_date: S.DATEONLY,
      status: { type: S.STRING(30), defaultValue: 'Pending' }, // Pending | Verified | Rejected | Expired
      notes: S.TEXT,
      ...ts(),
    });

    // ── Sec. 14: provider audits ──
    if (!(await has('wt_provider_audits'))) await queryInterface.createTable('wt_provider_audits', {
      ...base(),
      code: { type: S.STRING(30), allowNull: false, unique: true },
      provider_id: { type: S.INTEGER, allowNull: false },
      provider_name: S.STRING(200),
      audit_type: { type: S.STRING(60), allowNull: false }, // Compliance | Insurance | Safety | Service Quality
      scheduled_date: S.DATEONLY,
      conducted_date: S.DATEONLY,
      auditor: S.STRING(120),
      score: { type: S.INTEGER, defaultValue: 0 },
      outcome: { type: S.STRING(40), defaultValue: 'Scheduled' }, // Scheduled | Passed | Conditional | Failed
      findings: S.TEXT,
      corrective_actions: S.TEXT,
      action_due_date: S.DATEONLY,
      closed: { type: S.BOOLEAN, defaultValue: false },
      next_due_date: S.DATEONLY,
      checklist: S.JSON,
      ...ts(),
    });

    // ── lifecycle timeline ──
    if (!(await has('wt_provider_events'))) await queryInterface.createTable('wt_provider_events', {
      ...base(),
      provider_id: { type: S.INTEGER, allowNull: false },
      event_type: { type: S.STRING(60), allowNull: false },
      title: { type: S.STRING(200), allowNull: false },
      detail: S.TEXT,
      actor: S.STRING(120),
      occurred_at: { type: S.DATE, allowNull: false, defaultValue: S.literal('CURRENT_TIMESTAMP') },
      ...ts(),
    });

    // ── Sec. 12: protected clients / non-circumvention register ──
    if (!(await has('wt_protected_clients'))) await queryInterface.createTable('wt_protected_clients', {
      ...base(),
      code: { type: S.STRING(30), allowNull: false, unique: true },
      client_name: { type: S.STRING(200), allowNull: false },
      provider_id: S.INTEGER,
      provider_name: S.STRING(200),
      project_id: S.STRING(30),
      work_order_code: S.STRING(30),
      trigger_event: { type: S.STRING(60), defaultValue: 'Project Completion' },
      protection_start: S.DATEONLY,
      protection_end: S.DATEONLY,
      status: { type: S.STRING(30), defaultValue: 'Protected' }, // Protected | Expired | Breached | Waived
      breach_notes: S.TEXT,
      breach_reported_date: S.DATEONLY,
      ...ts(),
    });

    // ── Sec. 8 Step 10: provider service reports ──
    if (!(await has('wt_service_reports'))) await queryInterface.createTable('wt_service_reports', {
      ...base(),
      code: { type: S.STRING(30), allowNull: false, unique: true },
      report_type: { type: S.STRING(60), allowNull: false }, // Site Assessment | Cleaning | Inspection | Testing | Repair | AMC
      work_order_code: S.STRING(30),
      project_id: S.STRING(30),
      client_name: S.STRING(200),
      provider_id: S.INTEGER,
      provider_name: S.STRING(200),
      submitted_date: S.DATEONLY,
      summary: S.TEXT,
      findings: S.TEXT,
      data: S.JSON,
      photos_before: S.JSON,
      photos_after: S.JSON,
      status: { type: S.STRING(30), defaultValue: 'Submitted' }, // Draft | Submitted | Accepted | Rework
      reviewed_by: S.STRING(120),
      reviewed_date: S.DATEONLY,
      review_notes: S.TEXT,
      ...ts(),
    });

    // ── Sec. 8 Step 8: richer, structured site assessments ──
    const assessmentCols = {
      tank_type: S.STRING(120),
      tank_capacity: S.STRING(120),
      tank_material: S.STRING(120),
      tank_location: S.STRING(120),
      last_cleaned: S.STRING(120),
      water_source: S.STRING(120),
      risks: S.JSON,
      variations: S.JSON,
      scope_confirmed: { type: S.BOOLEAN, defaultValue: false },
      recommended_services: S.JSON,
      water_test: S.JSON,
      structural_notes: S.TEXT,
      access_notes: S.TEXT,
      assessor: S.STRING(120),
      signed_off_by: S.STRING(120),
      signed_off_date: S.DATEONLY,
      photos_after: S.JSON,
    };
    for (const [col, spec] of Object.entries(assessmentCols)) {
      if (!(await hasCol('wt_site_assessments', col))) await queryInterface.addColumn('wt_site_assessments', col, spec);
    }

    // helpful lookups
    const addIndex = async (table, fields, name) => {
      try { await queryInterface.addIndex(table, fields, { name }); } catch { /* already present */ }
    };
    await addIndex('wt_provider_documents', ['provider_id'], 'wt_provider_documents_provider');
    await addIndex('wt_provider_audits', ['provider_id'], 'wt_provider_audits_provider');
    await addIndex('wt_provider_events', ['provider_id'], 'wt_provider_events_provider');
    await addIndex('wt_protected_clients', ['provider_id'], 'wt_protected_clients_provider');
    await addIndex('wt_service_reports', ['provider_id'], 'wt_service_reports_provider');
  },

  down: async (queryInterface) => {
    const drop = async (t) => { try { await queryInterface.dropTable(t); } catch { /* not present */ } };
    const rm = async (t, c) => { try { await queryInterface.removeColumn(t, c); } catch { /* not present */ } };
    for (const t of ['wt_provider_documents', 'wt_provider_audits', 'wt_provider_events', 'wt_protected_clients', 'wt_service_reports']) await drop(t);
    for (const c of ['application_date', 'legal_name', 'business_type', 'registration_no', 'years_experience', 'team_size',
      'equipment_summary', 'address', 'district', 'contact_email', 'contact_phone', 'website', 'service_categories',
      'coverage_areas', 'capacity_per_week', 'onboarding_stage', 'stage_updated_at', 'approved_date', 'approved_by',
      'suspended_date', 'suspension_reason', 'terminated_date', 'termination_reason', 'capability_score', 'capability_notes',
      'assessed_by', 'assessed_date', 'agreement_status', 'agreement_envelope_id', 'agreement_code', 'agreement_signed_date',
      'agreement_expiry_date', 'cumilla_briefed', 'cumilla_briefing_date', 'cumilla_acknowledged_by', 'cumilla_exclusive',
      'territory_breaches', 'circumvention_breaches', 'response_time_hours', 'warranty_claim_rate', 'satisfaction_score',
      'revenue_generated', 'repeat_project_rate', 'last_audit_date', 'next_audit_date', 'renewal_decision', 'renewal_date',
      'next_renewal_date']) await rm('wt_providers', c);
    for (const c of ['tank_type', 'tank_capacity', 'tank_material', 'tank_location', 'last_cleaned', 'water_source', 'risks',
      'variations', 'scope_confirmed', 'recommended_services', 'water_test', 'structural_notes', 'access_notes', 'assessor',
      'signed_off_by', 'signed_off_date', 'photos_after']) await rm('wt_site_assessments', c);
  },
};
