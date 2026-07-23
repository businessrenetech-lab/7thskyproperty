'use strict';

/**
 * 0034 — Property Care client service lifecycle:
 *   care_quotations   — site assessment + quote → customer agreement → work order
 *   care_amc_contracts— recurring AMC contracts that generate scheduled visits
 *   care_warranties   — warranty register on completed work
 *   care_complaints   — complaint register
 *   care_incidents    — incident register (injury / contamination / damage / env)
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const { INTEGER, STRING, TEXT, DECIMAL, ENUM, DATE, DATEONLY } = Sequelize;
    const qi = queryInterface;
    const has = async (t) => { try { await qi.describeTable(t); return true; } catch { return false; } };
    const stamps = {
      created_at: { type: DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP') },
    };
    const base = { id: { type: INTEGER, autoIncrement: true, primaryKey: true }, branch_id: { type: INTEGER } };

    if (!(await has('care_quotations'))) {
      await qi.createTable('care_quotations', {
        ...base,
        quote_code: { type: STRING(40), unique: true },
        enquiry_id: { type: INTEGER },
        customer_contact_id: { type: INTEGER },
        customer_name: { type: STRING }, mobile: { type: STRING }, email: { type: STRING },
        vertical: { type: STRING(60) }, service_id: { type: INTEGER }, category_id: { type: INTEGER }, service_name: { type: STRING },
        site_address: { type: TEXT }, district: { type: STRING(80) }, city: { type: STRING(80) },
        // site assessment
        tank_type: { type: STRING(60) }, tank_capacity: { type: STRING(60) }, tank_count: { type: INTEGER }, water_source: { type: STRING(60) },
        findings: { type: TEXT }, issues: { type: TEXT },
        amount: { type: DECIMAL(15, 2), defaultValue: 0 }, materials_estimate: { type: DECIMAL(15, 2), defaultValue: 0 },
        valid_until: { type: DATEONLY }, terms: { type: TEXT },
        status: { type: ENUM('draft', 'assessed', 'sent', 'accepted', 'rejected', 'expired', 'converted'), defaultValue: 'draft' },
        agreement_envelope_id: { type: INTEGER }, agreement_status: { type: ENUM('none', 'sent', 'signed'), defaultValue: 'none' },
        work_order_id: { type: INTEGER },
        notes: { type: TEXT }, created_by: { type: INTEGER }, ...stamps,
      });
      await qi.addIndex('care_quotations', ['status'], { name: 'idx_cq_status' });
    }

    if (!(await has('care_amc_contracts'))) {
      await qi.createTable('care_amc_contracts', {
        ...base,
        contract_code: { type: STRING(40), unique: true },
        customer_contact_id: { type: INTEGER }, customer_name: { type: STRING }, mobile: { type: STRING },
        service_id: { type: INTEGER }, service_name: { type: STRING }, site_address: { type: TEXT }, district: { type: STRING(80) },
        frequency: { type: ENUM('monthly', 'quarterly', 'half_yearly', 'annual'), defaultValue: 'quarterly' },
        visits_per_year: { type: INTEGER, defaultValue: 4 }, annual_value: { type: DECIMAL(15, 2), defaultValue: 0 },
        start_date: { type: DATEONLY }, end_date: { type: DATEONLY }, next_visit_date: { type: DATEONLY },
        visits_done: { type: INTEGER, defaultValue: 0 },
        assigned_provider_id: { type: INTEGER },
        status: { type: ENUM('active', 'paused', 'expired', 'cancelled'), defaultValue: 'active' },
        notes: { type: TEXT }, created_by: { type: INTEGER }, ...stamps,
      });
    }

    if (!(await has('care_warranties'))) {
      await qi.createTable('care_warranties', {
        ...base,
        warranty_code: { type: STRING(40), unique: true },
        work_order_id: { type: INTEGER }, customer_contact_id: { type: INTEGER }, customer_name: { type: STRING },
        warranty_type: { type: STRING(60) }, start_date: { type: DATEONLY }, expiry_date: { type: DATEONLY },
        terms: { type: TEXT }, status: { type: ENUM('active', 'expiring', 'expired', 'claimed', 'void'), defaultValue: 'active' },
        notes: { type: TEXT }, created_by: { type: INTEGER }, ...stamps,
      });
    }

    if (!(await has('care_complaints'))) {
      await qi.createTable('care_complaints', {
        ...base,
        complaint_code: { type: STRING(40), unique: true },
        customer_contact_id: { type: INTEGER }, customer_name: { type: STRING },
        work_order_id: { type: INTEGER }, provider_id: { type: INTEGER },
        complaint_type: { type: STRING(60) }, severity: { type: ENUM('low', 'medium', 'high'), defaultValue: 'medium' },
        description: { type: TEXT }, investigation: { type: TEXT }, resolution: { type: TEXT },
        status: { type: ENUM('open', 'investigating', 'resolved', 'closed', 'escalated'), defaultValue: 'open' },
        reported_date: { type: DATEONLY }, resolved_date: { type: DATEONLY },
        created_by: { type: INTEGER }, ...stamps,
      });
    }

    if (!(await has('care_incidents'))) {
      await qi.createTable('care_incidents', {
        ...base,
        incident_code: { type: STRING(40), unique: true },
        work_order_id: { type: INTEGER }, provider_id: { type: INTEGER },
        incident_type: { type: ENUM('injury', 'contamination', 'property_damage', 'environmental', 'other'), defaultValue: 'other' },
        severity: { type: ENUM('low', 'medium', 'high', 'critical'), defaultValue: 'medium' },
        description: { type: TEXT }, action_taken: { type: TEXT },
        status: { type: ENUM('open', 'investigating', 'closed'), defaultValue: 'open' },
        incident_date: { type: DATEONLY },
        created_by: { type: INTEGER }, ...stamps,
      });
    }
  },

  async down(queryInterface) {
    for (const t of ['care_quotations', 'care_amc_contracts', 'care_warranties', 'care_complaints', 'care_incidents']) await queryInterface.dropTable(t).catch(() => {});
  },
};
