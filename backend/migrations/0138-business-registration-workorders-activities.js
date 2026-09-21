'use strict';

/**
 * Migration 0138: Business Registration — provider work orders & registration
 * activities (SOP Phase 5 provider assignment + Phase 6 service delivery).
 *
 *   - business_registration_workorders  : the Project Work Order (SSPC-BR-PWO-01)
 *     issued to an approved provider — service category, scope, deliverables,
 *     4-milestone fee and non-circumvention flag.
 *   - business_registration_activities   : the registration steps coordinated
 *     with government authorities (name clearance, trade licence, RJSC, TIN/BIN/
 *     VAT, authority liaison) and their outcome.
 * Idempotent: skips creation when the table already exists.
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    const S = Sequelize;
    const existing = (await queryInterface.showAllTables()).map((t) => (typeof t === 'string' ? t : t.tableName).toLowerCase());

    if (!existing.includes('business_registration_workorders')) {
      await queryInterface.createTable('business_registration_workorders', {
        id: { type: S.INTEGER, autoIncrement: true, primaryKey: true },
        branch_id: { type: S.INTEGER, allowNull: false },
        project_id: { type: S.INTEGER, allowNull: false },
        work_order_no: { type: S.STRING(40), unique: true }, // SSPC-BRWO-000001
        provider_contact_id: S.INTEGER,
        provider_name: S.STRING,
        provider_category: S.STRING(80),    // Trade Licence Consultant / RJSC Consultant / Corporate Secretary …
        service_category: { type: S.JSON, allowNull: true }, // selected PWO service checkboxes
        scope: { type: S.JSON, allowNull: true },            // scope-of-work items
        deliverables: { type: S.JSON, allowNull: true },     // deliverable items
        total_fee: S.DECIMAL(16, 2),
        milestones: { type: S.JSON, allowNull: true },       // [{ label, amount, status }] — 4 PWO milestones
        non_circumvention_flag: { type: S.BOOLEAN, defaultValue: true },
        status: { type: S.STRING(20), defaultValue: 'issued' }, // issued / accepted / in_progress / completed / cancelled
        special_instructions: S.TEXT,
        commencement_date: S.DATEONLY,
        target_completion_date: S.DATEONLY,
        issued_at: S.DATE,
        accepted_at: S.DATE,
        completed_at: S.DATE,
        notes: S.TEXT,
        created_by: S.INTEGER,
        created_at: { type: S.DATE, allowNull: false, defaultValue: S.literal('CURRENT_TIMESTAMP') },
        updated_at: { type: S.DATE, allowNull: false, defaultValue: S.literal('CURRENT_TIMESTAMP') },
      });
      await queryInterface.addIndex('business_registration_workorders', ['project_id']);
      await queryInterface.addIndex('business_registration_workorders', ['status']);
      await queryInterface.addIndex('business_registration_workorders', ['provider_contact_id']);
    }

    if (!existing.includes('business_registration_activities')) {
      await queryInterface.createTable('business_registration_activities', {
        id: { type: S.INTEGER, autoIncrement: true, primaryKey: true },
        branch_id: { type: S.INTEGER, allowNull: false },
        project_id: { type: S.INTEGER, allowNull: false },
        work_order_id: S.INTEGER,
        activity_type: { type: S.STRING(40), allowNull: false }, // name_clearance / trade_licence / rjsc / tin / bin / vat / authority_liaison / documentation
        title: S.STRING,
        authority: S.STRING(120),           // RJSC / NBR / City Corporation / Municipality …
        reference_no: S.STRING(120),        // application / tracking number
        status: { type: S.STRING(20), defaultValue: 'pending' }, // pending / submitted / in_review / approved / rejected / completed
        submitted_at: S.DATE,
        completed_at: S.DATE,
        outcome: S.STRING,
        notes: S.TEXT,
        created_by: S.INTEGER,
        created_at: { type: S.DATE, allowNull: false, defaultValue: S.literal('CURRENT_TIMESTAMP') },
        updated_at: { type: S.DATE, allowNull: false, defaultValue: S.literal('CURRENT_TIMESTAMP') },
      });
      await queryInterface.addIndex('business_registration_activities', ['project_id']);
      await queryInterface.addIndex('business_registration_activities', ['status']);
      await queryInterface.addIndex('business_registration_activities', ['activity_type']);
    }
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('business_registration_activities').catch(() => {});
    await queryInterface.dropTable('business_registration_workorders').catch(() => {});
  },
};
