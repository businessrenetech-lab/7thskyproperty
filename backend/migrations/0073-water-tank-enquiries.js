'use strict';

/**
 * Migration 0073: Water Tank enquiries + service-request routing.
 *
 *   wt_enquiries              website / phone / walk-in enquiries for water tank
 *                             services. The public site posts here; the console
 *                             triages them into service requests.
 *   wt_service_requests +     the Sec. 6 decision: does this need a site
 *                             assessment first, or can it go straight to a
 *                             quotation? Plus what it produced.
 * Idempotent.
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    const S = Sequelize;
    const has = async (t) => { try { await queryInterface.describeTable(t); return true; } catch { return false; } };
    const hasCol = async (t, c) => { try { return !!(await queryInterface.describeTable(t))[c]; } catch { return false; } };

    if (!(await has('wt_enquiries'))) await queryInterface.createTable('wt_enquiries', {
      id: { type: S.INTEGER, autoIncrement: true, primaryKey: true },
      branch_id: { type: S.INTEGER, allowNull: false, defaultValue: 1 },
      code: { type: S.STRING(30), allowNull: false, unique: true },
      // what the website form collects
      client_name: { type: S.STRING(200), allowNull: false },
      phone: { type: S.STRING(40), allowNull: false },
      email: S.STRING(160),
      site_address: S.STRING(255),
      district: S.STRING(80),
      property_type: S.STRING(80),
      services_requested: S.JSON,
      tank_type: S.STRING(120),
      tanks_count: { type: S.INTEGER, defaultValue: 0 },
      preferred_date: S.DATEONLY,
      message: S.TEXT,
      // where it came from and where it went
      source: { type: S.STRING(60), defaultValue: 'Website' },
      page_url: S.STRING(500),
      status: { type: S.STRING(30), defaultValue: 'New' },
      assigned_officer: S.STRING(120),
      contacted_at: S.DATE,
      notes: S.TEXT,
      converted_request_code: S.STRING(30),
      converted_client_code: S.STRING(30),
      converted_at: S.DATE,
      createdAt: { type: S.DATE, allowNull: false, defaultValue: S.literal('CURRENT_TIMESTAMP') },
      updatedAt: { type: S.DATE, allowNull: false, defaultValue: S.literal('CURRENT_TIMESTAMP') },
    });
    try { await queryInterface.addIndex('wt_enquiries', ['status'], { name: 'wt_enquiries_status' }); } catch { /* present */ }

    const reqCols = {
      client_code: S.STRING(30),
      email: S.STRING(160),
      phone: S.STRING(40),
      district: S.STRING(80),
      property_type: S.STRING(80),
      services_requested: S.JSON,
      // the routing decision
      needs_assessment: { type: S.BOOLEAN, defaultValue: true },
      assessment_date: S.DATEONLY,
      assessment_code: S.STRING(30),
      quotation_code: S.STRING(30),
      project_id: S.STRING(30),
      source: { type: S.STRING(60), defaultValue: 'Direct' },
      enquiry_code: S.STRING(30),
    };
    for (const [col, spec] of Object.entries(reqCols)) {
      if (!(await hasCol('wt_service_requests', col))) await queryInterface.addColumn('wt_service_requests', col, spec);
    }
  },

  down: async (queryInterface) => {
    try { await queryInterface.dropTable('wt_enquiries'); } catch { /* not present */ }
    for (const c of ['client_code', 'email', 'phone', 'district', 'property_type', 'services_requested',
      'needs_assessment', 'assessment_date', 'assessment_code', 'quotation_code', 'project_id',
      'source', 'enquiry_code']) {
      try { await queryInterface.removeColumn('wt_service_requests', c); } catch { /* not present */ }
    }
  },
};
