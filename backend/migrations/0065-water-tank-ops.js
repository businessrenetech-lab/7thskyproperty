'use strict';

/**
 * Migration 0065: Water Tank Services operations module.
 * Schema carries the fields shown in the Figma "7th Sky Watermanagement" screens
 * (client-list/detail, service-requests, site-assessments, quotations, work-orders,
 * project-detail, provider-management, amc-register, invoices-payments, complaints).
 * Status/label fields are STRINGs (design vocab); rich detail is JSON. Idempotent.
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    const S = Sequelize;
    const has = async (t) => { try { await queryInterface.describeTable(t); return true; } catch { return false; } };
    const ts = () => ({ createdAt: { type: S.DATE, allowNull: false, defaultValue: S.literal('CURRENT_TIMESTAMP') }, updatedAt: { type: S.DATE, allowNull: false, defaultValue: S.literal('CURRENT_TIMESTAMP') } });
    const base = () => ({ id: { type: S.INTEGER, autoIncrement: true, primaryKey: true }, branch_id: { type: S.INTEGER, allowNull: false, defaultValue: 1 } });

    if (!(await has('wt_clients'))) await queryInterface.createTable('wt_clients', {
      ...base(),
      code: { type: S.STRING(30), allowNull: false, unique: true },
      name: { type: S.STRING(200), allowNull: false },
      client_type: { type: S.STRING(30), defaultValue: 'Residential' },
      mobile: S.STRING(40), email: S.STRING(160),
      district: S.STRING(80), property_type: S.STRING(80),
      current_status: { type: S.STRING(40), defaultValue: 'New Lead' },
      assigned_officer: S.STRING(120),
      service_address: S.STRING(255), lead_source: S.STRING(80),
      tanks_count: { type: S.INTEGER, defaultValue: 0 },
      // detail
      tank_type: S.STRING(120), tank_capacity: S.STRING(120),
      key_issues: S.TEXT, last_cleaning: S.STRING(120),
      amc_package: S.STRING(120), amc_annual_value: { type: S.DECIMAL(15, 2), defaultValue: 0 },
      amc_status: S.STRING(40),
      active_project_name: S.STRING(160), active_project_scope: S.TEXT, active_project_progress: { type: S.INTEGER, defaultValue: 0 },
      notes: S.TEXT,
      ...ts(),
    });

    if (!(await has('wt_service_requests'))) await queryInterface.createTable('wt_service_requests', {
      ...base(),
      code: { type: S.STRING(30), allowNull: false, unique: true },
      request_date: S.DATEONLY,
      client_name: { type: S.STRING(200), allowNull: false },
      category: S.STRING(120), specific_service: S.STRING(160),
      priority: { type: S.STRING(20), defaultValue: 'Medium' },
      preferred_date: S.DATEONLY,
      visit_required: { type: S.BOOLEAN, defaultValue: false },
      deposit_required: { type: S.BOOLEAN, defaultValue: false },
      provider_name: S.STRING(160),
      status: { type: S.STRING(40), defaultValue: 'New' },
      assigned_officer: S.STRING(120),
      address: S.STRING(255), description: S.TEXT,
      ...ts(),
    });

    if (!(await has('wt_site_assessments'))) await queryInterface.createTable('wt_site_assessments', {
      ...base(),
      code: { type: S.STRING(30), allowNull: false, unique: true },
      project_id: S.STRING(30),
      client_name: { type: S.STRING(200), allowNull: false },
      provider: S.STRING(160),
      assessed_date: S.DATEONLY,
      access_safe: { type: S.BOOLEAN, defaultValue: true },
      contamination: S.STRING(120), leakage: S.STRING(120),
      photos_count: { type: S.INTEGER, defaultValue: 0 },
      status: { type: S.STRING(40), defaultValue: 'Scheduled' },
      checklist: S.JSON, findings: S.TEXT, photos: S.JSON,
      ...ts(),
    });

    if (!(await has('wt_quotations'))) await queryInterface.createTable('wt_quotations', {
      ...base(),
      code: { type: S.STRING(30), allowNull: false, unique: true },
      project_id: S.STRING(30),
      client_name: { type: S.STRING(200), allowNull: false },
      lines: S.JSON,
      service_charges: { type: S.DECIMAL(15, 2), defaultValue: 0 },
      provider_allocation_fee: { type: S.DECIMAL(15, 2), defaultValue: 0 },
      vat: { type: S.DECIMAL(15, 2), defaultValue: 0 },
      total: { type: S.DECIMAL(15, 2), defaultValue: 0 },
      validity: S.STRING(40),
      decision: { type: S.STRING(30), defaultValue: 'Pending' },
      ...ts(),
    });

    if (!(await has('wt_work_orders'))) await queryInterface.createTable('wt_work_orders', {
      ...base(),
      code: { type: S.STRING(30), allowNull: false, unique: true },
      project_id: S.STRING(30),
      client_name: { type: S.STRING(200), allowNull: false },
      provider_name: S.STRING(160),
      category: S.STRING(120),
      target_date: S.DATEONLY,
      status: { type: S.STRING(30), defaultValue: 'Draft' },
      provider_fee: { type: S.DECIMAL(15, 2), defaultValue: 0 },
      ss_fee: { type: S.DECIMAL(15, 2), defaultValue: 0 },
      total_contract: { type: S.DECIMAL(15, 2), defaultValue: 0 },
      scope: S.TEXT, special_conditions: S.TEXT, warranty: S.STRING(120),
      ...ts(),
    });

    if (!(await has('wt_projects'))) await queryInterface.createTable('wt_projects', {
      ...base(),
      code: { type: S.STRING(30), allowNull: false, unique: true },
      name: { type: S.STRING(200), allowNull: false },
      client_name: S.STRING(200),
      assigned_provider: S.STRING(160),
      start_date: S.DATEONLY, target_completion: S.DATEONLY,
      health_index: { type: S.STRING(40), defaultValue: 'Normal/Clear' },
      stage: { type: S.STRING(40), defaultValue: 'Lead' },
      status: { type: S.STRING(30), defaultValue: 'Open' },
      timeline: S.JSON, linked: S.JSON, milestones: S.JSON,
      ...ts(),
    });

    if (!(await has('wt_providers'))) await queryInterface.createTable('wt_providers', {
      ...base(),
      code: { type: S.STRING(30), allowNull: false, unique: true },
      business_name: { type: S.STRING(200), allowNull: false },
      contact_person: S.STRING(120),
      specialty: S.STRING(160),
      approved_services: S.JSON,
      status: { type: S.STRING(30), defaultValue: 'Pending' },
      onboarded_since: S.STRING(40),
      completion_rate: { type: S.DECIMAL(5, 2), defaultValue: 0 },
      rating: { type: S.DECIMAL(2, 1), defaultValue: 0 },
      complaint_rate: { type: S.DECIMAL(5, 2), defaultValue: 0 },
      jobs_completed: { type: S.INTEGER, defaultValue: 0 },
      coverage: S.STRING(255),
      compliance: S.JSON, rank: S.INTEGER, notes: S.TEXT,
      ...ts(),
    });

    if (!(await has('wt_amc_contracts'))) await queryInterface.createTable('wt_amc_contracts', {
      ...base(),
      code: { type: S.STRING(30), allowNull: false, unique: true },
      client_name: { type: S.STRING(200), allowNull: false },
      package: S.STRING(120),
      frequency: { type: S.STRING(40), defaultValue: 'Quarterly' },
      start_date: S.DATEONLY, end_date: S.DATEONLY,
      next_visit: S.STRING(40),
      annual_value: { type: S.DECIMAL(15, 2), defaultValue: 0 },
      status: { type: S.STRING(30), defaultValue: 'Active' },
      ...ts(),
    });

    if (!(await has('wt_invoices'))) await queryInterface.createTable('wt_invoices', {
      ...base(),
      code: { type: S.STRING(30), allowNull: false, unique: true },
      project_id: S.STRING(30),
      client_name: { type: S.STRING(200), allowNull: false },
      inv_type: S.STRING(60),
      amount: { type: S.DECIMAL(15, 2), defaultValue: 0 },
      due_date: S.DATEONLY,
      outstanding: { type: S.DECIMAL(15, 2), defaultValue: 0 },
      status: { type: S.STRING(30), defaultValue: 'Draft' },
      provider_payout: { type: S.STRING(30), defaultValue: 'Not Due' },
      ...ts(),
    });

    if (!(await has('wt_complaints'))) await queryInterface.createTable('wt_complaints', {
      ...base(),
      code: { type: S.STRING(30), allowNull: false, unique: true },
      client_name: { type: S.STRING(200), allowNull: false },
      incident_type: S.STRING(160),
      severity: { type: S.STRING(20), defaultValue: 'Medium' },
      sla_due: S.STRING(60),
      status: { type: S.STRING(30), defaultValue: 'Open' },
      disclosure: S.TEXT, timeline: S.JSON,
      resolution_hours: { type: S.DECIMAL(6, 1), defaultValue: 0 },
      logged_date: S.DATEONLY, resolved_date: S.DATEONLY,
      ...ts(),
    });

    if (!(await has('wt_comm_logs'))) await queryInterface.createTable('wt_comm_logs', {
      ...base(),
      client_name: { type: S.STRING(200), allowNull: false },
      channel: { type: S.STRING(20), defaultValue: 'call' },
      direction: { type: S.STRING(20), defaultValue: 'outbound' },
      summary: S.TEXT, ref_type: S.STRING(40), ref_code: S.STRING(30),
      logged_at: S.DATE,
      ...ts(),
    });
  },

  down: async (queryInterface) => {
    for (const t of ['wt_comm_logs', 'wt_complaints', 'wt_invoices', 'wt_amc_contracts', 'wt_providers', 'wt_projects', 'wt_work_orders', 'wt_quotations', 'wt_site_assessments', 'wt_service_requests', 'wt_clients']) {
      try { await queryInterface.dropTable(t); } catch { /* noop */ }
    }
  },
};
