'use strict';

/**
 * Migration 0079: Water Tank — the AMC contract as a real agreement.
 *
 * Migration 0065 created wt_amc_contracts as a nine-column summary row
 * (client_name, package, frequency, start/end, next_visit, annual_value, status)
 * because the Figma AMC register only ever showed a table. The SOP and the
 * Customer Service Agreement ask for considerably more:
 *
 *   SOP-01 §10 (Phase 6 — AMC Management)
 *     schedule  : cleaning visits, inspection visits, water testing, pump inspections
 *     monitor   : visit completion, renewal dates, client satisfaction
 *     KPI §13   : AMC Renewal Rate
 *   Customer Service Agreement
 *     Clause 2  : "For AMC, this Agreement remains effective for the duration
 *                  specified in the approved Work Order" → start + expiry
 *     Clause 9  : payment "Monthly / Quarterly / Half-Yearly / Annually"
 *     Schedule A: seven package tiers (Residential Basic/Standard/Premium,
 *                 Commercial Building, Hotel & Restaurant, School & Hospital,
 *                 Industrial Facility)
 *
 * A visit schedule is the substance of an AMC — the client is buying N visits a
 * year — so wt_amc_visits gives each planned visit its own row: due date, type,
 * completion, the work order it was delivered under, and findings. Without it
 * "visit completion" cannot be monitored and the renewal conversation has no
 * evidence behind it.
 *
 * Idempotent.
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    const S = Sequelize;
    const has = async (t) => { try { await queryInterface.describeTable(t); return true; } catch { return false; } };
    const hasCol = async (t, c) => { try { return !!(await queryInterface.describeTable(t))[c]; } catch { return false; } };
    const add = async (t, c, spec) => { if (!(await hasCol(t, c))) await queryInterface.addColumn(t, c, spec); };
    const ts = () => ({
      createdAt: { type: S.DATE, allowNull: false, defaultValue: S.literal('CURRENT_TIMESTAMP') },
      updatedAt: { type: S.DATE, allowNull: false, defaultValue: S.literal('CURRENT_TIMESTAMP') },
    });

    // ── wt_amc_contracts ────────────────────────────────────────────────
    const cols = {
      // who / where — the AMC follows a client and a site
      client_code: S.STRING(30), client_id: S.INTEGER,
      client_type: { type: S.STRING(30), defaultValue: 'Residential' },
      contact_person: S.STRING(120), phone: S.STRING(40), email: S.STRING(160),
      property_id: S.INTEGER, property_code: S.STRING(40),
      site_address: S.STRING(255), area: S.STRING(120), district: S.STRING(80),
      site_contact_name: S.STRING(120), site_contact_phone: S.STRING(40), access_notes: S.TEXT,

      // the tank estate the contract covers
      tank_type: S.STRING(120), tanks_count: { type: S.INTEGER, defaultValue: 0 },
      tank_capacity: S.STRING(120), water_source: S.STRING(120),

      // Schedule A package tier + what the tier includes
      package_tier: S.STRING(80),
      included_services: S.JSON,   // [{ code, name, visits_per_year }]
      inclusions: S.TEXT, exclusions: S.TEXT,

      // term — Clause 2
      duration_months: { type: S.INTEGER, defaultValue: 12 },
      auto_renew: { type: S.BOOLEAN, defaultValue: false },
      renewal_notice_days: { type: S.INTEGER, defaultValue: 30 },
      renewed_from: S.STRING(30),   // the contract this one supersedes
      renewed_to: S.STRING(30),     // the contract that superseded this one
      renewal_decision: S.STRING(30), // Pending | Renewed | Declined | Lapsed
      renewal_due_at: S.DATEONLY,

      // visit plan (SOP §10)
      visits_per_year: { type: S.INTEGER, defaultValue: 4 },
      visit_types: S.JSON,          // [{ key, label, per_year }]
      first_visit_date: S.DATEONLY,
      last_visit_date: S.DATEONLY,
      visits_completed: { type: S.INTEGER, defaultValue: 0 },
      visits_planned: { type: S.INTEGER, defaultValue: 0 },

      // billing — Clause 9
      payment_frequency: { type: S.STRING(30), defaultValue: 'Annually' },
      instalment_amount: { type: S.DECIMAL(15, 2), defaultValue: 0 },
      advance_amount: { type: S.DECIMAL(15, 2), defaultValue: 0 },
      per_visit_value: { type: S.DECIMAL(15, 2), defaultValue: 0 },
      vat_percent: { type: S.DECIMAL(5, 2), defaultValue: 0 },
      discount: { type: S.DECIMAL(15, 2), defaultValue: 0 },
      contract_value: { type: S.DECIMAL(15, 2), defaultValue: 0 },
      billed_to_date: { type: S.DECIMAL(15, 2), defaultValue: 0 },
      collected_to_date: { type: S.DECIMAL(15, 2), defaultValue: 0 },
      payment_terms: S.STRING(200),

      // service level
      response_hours: { type: S.INTEGER, defaultValue: 24 },
      emergency_included: { type: S.BOOLEAN, defaultValue: false },
      emergency_callouts_included: { type: S.INTEGER, defaultValue: 0 },
      water_testing_included: { type: S.BOOLEAN, defaultValue: false },
      reports_included: { type: S.BOOLEAN, defaultValue: true },

      // linkage — the agreement gates it, the provider delivers it
      agreement_code: S.STRING(40), agreement_envelope_id: S.INTEGER,
      agreement_status: { type: S.STRING(30), defaultValue: 'Not Started' },
      project_code: S.STRING(30), quotation_code: S.STRING(30),
      provider_code: S.STRING(30), provider_id: S.INTEGER, provider_name: S.STRING(160),
      assigned_officer: S.STRING(120),

      // quality (SOP §13 KPIs)
      satisfaction_score: S.INTEGER,
      timeline: S.JSON, notes: S.TEXT,
      cancelled_at: S.DATE, cancel_reason: S.TEXT,
    };
    for (const [c, spec] of Object.entries(cols)) await add('wt_amc_contracts', c, spec);

    try {
      await queryInterface.changeColumn('wt_amc_contracts', 'next_visit', { type: S.STRING(60) });
    } catch { /* leave as-is if the dialect refuses */ }

    for (const [name, fields] of Object.entries({
      wt_amc_client_code: ['client_code'],
      wt_amc_status: ['status'],
      wt_amc_renewal_due: ['renewal_due_at'],
    })) {
      try { await queryInterface.addIndex('wt_amc_contracts', fields, { name }); } catch { /* exists */ }
    }

    // ── wt_amc_visits — the schedule the client is actually buying ──────
    if (!(await has('wt_amc_visits'))) {
      await queryInterface.createTable('wt_amc_visits', {
        id: { type: S.INTEGER, autoIncrement: true, primaryKey: true },
        branch_id: { type: S.INTEGER, allowNull: false, defaultValue: 1 },
        code: { type: S.STRING(30), allowNull: false, unique: true },
        amc_code: { type: S.STRING(30), allowNull: false },
        client_name: S.STRING(200),
        visit_no: { type: S.INTEGER, defaultValue: 1 },
        // Cleaning | Inspection | Water Testing | Pump Inspection (SOP §10)
        visit_type: { type: S.STRING(60), allowNull: false, defaultValue: 'Cleaning' },
        due_date: S.DATEONLY,
        scheduled_date: S.DATEONLY,
        completed_date: S.DATEONLY,
        // Planned | Scheduled | Completed | Missed | Cancelled
        status: { type: S.STRING(30), defaultValue: 'Planned' },
        provider_name: S.STRING(160),
        work_order_code: S.STRING(30),
        assessment_code: S.STRING(30),
        report_url: S.STRING(500),
        findings: S.TEXT,
        water_test_result: S.STRING(120),
        photos: S.JSON,
        client_signed_off: { type: S.BOOLEAN, defaultValue: false },
        satisfaction_score: S.INTEGER,
        notes: S.TEXT,
        ...ts(),
      });
      try { await queryInterface.addIndex('wt_amc_visits', ['amc_code'], { name: 'wt_amc_visits_amc' }); } catch { /* exists */ }
      try { await queryInterface.addIndex('wt_amc_visits', ['due_date'], { name: 'wt_amc_visits_due' }); } catch { /* exists */ }
    }
  },

  down: async (queryInterface) => {
    const rm = async (t, c) => { try { await queryInterface.removeColumn(t, c); } catch { /* not present */ } };
    try { await queryInterface.dropTable('wt_amc_visits'); } catch { /* not present */ }
    const cols = [
      'client_code', 'client_id', 'client_type', 'contact_person', 'phone', 'email',
      'property_id', 'property_code', 'site_address', 'area', 'district',
      'site_contact_name', 'site_contact_phone', 'access_notes',
      'tank_type', 'tanks_count', 'tank_capacity', 'water_source',
      'package_tier', 'included_services', 'inclusions', 'exclusions',
      'duration_months', 'auto_renew', 'renewal_notice_days', 'renewed_from', 'renewed_to',
      'renewal_decision', 'renewal_due_at',
      'visits_per_year', 'visit_types', 'first_visit_date', 'last_visit_date',
      'visits_completed', 'visits_planned',
      'payment_frequency', 'instalment_amount', 'advance_amount', 'per_visit_value',
      'vat_percent', 'discount', 'contract_value', 'billed_to_date', 'collected_to_date',
      'payment_terms',
      'response_hours', 'emergency_included', 'emergency_callouts_included',
      'water_testing_included', 'reports_included',
      'agreement_code', 'agreement_envelope_id', 'agreement_status',
      'project_code', 'quotation_code', 'provider_code', 'provider_id', 'provider_name',
      'assigned_officer', 'satisfaction_score', 'timeline', 'notes',
      'cancelled_at', 'cancel_reason',
    ];
    for (const c of cols) await rm('wt_amc_contracts', c);
  },
};
