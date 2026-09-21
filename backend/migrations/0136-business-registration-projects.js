'use strict';

/**
 * Migration 0136: Business Registration module — core project tables.
 *
 * Business Registration is a service-delivery project line (not a marketplace
 * listing), so it has its own subject model: a registration PROJECT that runs
 * the 9-phase / 16-step SOP (SSPC-BR-SOP-01). Two tables:
 *   - business_registration_projects  : the client file / project (SOP Step 2 —
 *     Client ID + Project ID) and its pipeline stage + service selection.
 *   - business_registration_enquiries : Phase 1 leads (SOP Step 1), optionally
 *     converted into a project.
 * Idempotent: skips creation when the table already exists.
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    const S = Sequelize;
    const existing = (await queryInterface.showAllTables()).map((t) => (typeof t === 'string' ? t : t.tableName).toLowerCase());

    if (!existing.includes('business_registration_projects')) {
      await queryInterface.createTable('business_registration_projects', {
        id: { type: S.INTEGER, autoIncrement: true, primaryKey: true },
        branch_id: { type: S.INTEGER, allowNull: false },
        project_code: { type: S.STRING(40), unique: true }, // SSPC-BRP-000001
        // Client (SOP Step 2)
        client_contact_id: S.INTEGER,
        client_type: { type: S.STRING(20), defaultValue: 'individual' }, // individual / business
        client_name: { type: S.STRING, allowNull: false },
        client_nid: S.STRING(80),
        client_phone: S.STRING,
        client_email: S.STRING,
        client_address: S.STRING,
        // Business being registered (Sheet 3 — Business Information Register)
        business_name: S.STRING,            // proposed / existing business name
        business_type: S.STRING(60),        // sole_proprietorship / partnership / private_limited / public_limited / business_name / rjsc
        registration_type: S.STRING(80),    // headline service (New Trade Licence / Pvt Ltd Registration / …)
        nature_of_business: S.STRING,
        business_address: S.STRING,
        number_of_owners: S.INTEGER,
        number_of_directors: S.INTEGER,
        capital_structure: S.STRING(160),
        existing_trade_licence_no: S.STRING(80),
        existing_registration_no: S.STRING(80),
        // Intake
        lead_source: S.STRING(60),          // website / social / whatsapp / referral / walk_in / existing_client
        urgency: { type: S.STRING(20), defaultValue: 'normal' }, // normal / urgent / priority
        assigned_to: S.INTEGER,             // coordinator
        service_selection: { type: S.JSON, allowNull: true }, // Schedule A checklist (selected service labels)
        authorities: S.STRING,              // government authorities involved (RJSC / NBR / City Corporation …)
        // Commercials (Phase 3)
        quoted_amount: S.DECIMAL(16, 2),
        deposit_amount: S.DECIMAL(16, 2),
        government_fees: S.DECIMAL(16, 2),
        contract_value: S.DECIMAL(16, 2),
        currency: { type: S.STRING(8), defaultValue: 'BDT' },
        // Workflow
        stage: { type: S.STRING(40), defaultValue: 'consultation' }, // SOP pipeline stage
        status: { type: S.STRING(30), defaultValue: 'active' },      // active / on_hold / completed / cancelled
        workflow_state: { type: S.JSON, allowNull: true },           // per-step completion map
        scope_of_work: S.TEXT,
        special_requirements: S.TEXT,
        commencement_date: S.DATEONLY,
        target_completion_date: S.DATEONLY,
        completion_date: S.DATEONLY,
        notes: S.TEXT,
        created_by: S.INTEGER,
        created_at: { type: S.DATE, allowNull: false, defaultValue: S.literal('CURRENT_TIMESTAMP') },
        updated_at: { type: S.DATE, allowNull: false, defaultValue: S.literal('CURRENT_TIMESTAMP') },
      });
      await queryInterface.addIndex('business_registration_projects', ['branch_id']);
      await queryInterface.addIndex('business_registration_projects', ['stage']);
      await queryInterface.addIndex('business_registration_projects', ['status']);
      await queryInterface.addIndex('business_registration_projects', ['client_contact_id']);
    }

    if (!existing.includes('business_registration_enquiries')) {
      await queryInterface.createTable('business_registration_enquiries', {
        id: { type: S.INTEGER, autoIncrement: true, primaryKey: true },
        branch_id: { type: S.INTEGER, allowNull: false },
        enquiry_code: { type: S.STRING(40), unique: true }, // SSPC-BRE-000001
        enquirer_name: S.STRING,
        company_name: S.STRING,
        phone: S.STRING,
        email: S.STRING,
        client_type: { type: S.STRING(20), defaultValue: 'individual' },
        service_requested: S.STRING,        // free text / Schedule A summary
        registration_type: S.STRING(80),
        source: S.STRING(60),
        message: S.TEXT,
        // Pipeline (Phase 1 lead management)
        stage: { type: S.STRING(30), defaultValue: 'new' }, // new / qualified / consultation / converted / lost
        assigned_to: S.INTEGER,
        contact_id: S.INTEGER,
        converted: { type: S.BOOLEAN, defaultValue: false },
        project_id: S.INTEGER,              // the project it converted into
        next_action: S.STRING,
        follow_up_date: S.DATEONLY,
        notes: S.TEXT,
        created_by: S.INTEGER,
        created_at: { type: S.DATE, allowNull: false, defaultValue: S.literal('CURRENT_TIMESTAMP') },
        updated_at: { type: S.DATE, allowNull: false, defaultValue: S.literal('CURRENT_TIMESTAMP') },
      });
      await queryInterface.addIndex('business_registration_enquiries', ['branch_id']);
      await queryInterface.addIndex('business_registration_enquiries', ['stage']);
      await queryInterface.addIndex('business_registration_enquiries', ['project_id']);
    }
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('business_registration_enquiries').catch(() => {});
    await queryInterface.dropTable('business_registration_projects').catch(() => {});
  },
};
