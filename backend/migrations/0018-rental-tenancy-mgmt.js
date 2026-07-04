'use strict';

/**
 * 0018 — Rental & Tenancy Management (client workbook + SOP alignment).
 *
 * Adds the structured tables that back the rental-management workflow:
 *   - rental_assessments / rental_assessment_items   (Stage: Rental Assessment & Setup)
 *   - rental_enquiries                               (Marketing & Enquiry Kanban)
 *   - tenant_applications / _documents / _verifications / tenant_occupants
 *   - owner_onboarding_items                         (Owner Onboarding Checklist)
 *   - bond_deposit_records                           (Bond & Deposit Register)
 *   - non_circumvention_records                      (Non-Circumvention Register)
 *
 * Extends properties / property_owner_profiles / tenancies with the workbook's
 * Property Master, Owner Master and Lease Register fields.
 *
 * Idempotent-ish: createTable/addColumn guarded so re-runs don't hard-fail.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const { INTEGER, STRING, DECIMAL, ENUM, BOOLEAN, TEXT, DATEONLY, DATE } = Sequelize;
    const now = Sequelize.literal('CURRENT_TIMESTAMP');
    const onUpdate = Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP');
    const stamps = {
      created_at: { type: DATE, defaultValue: now },
      updated_at: { type: DATE, defaultValue: onUpdate },
    };

    const qi = queryInterface;
    const tableExists = async (name) => {
      try { await qi.describeTable(name); return true; } catch { return false; }
    };
    const addCol = async (table, col, spec) => {
      const desc = await qi.describeTable(table).catch(() => ({}));
      if (!desc[col]) await qi.addColumn(table, col, spec);
    };
    const createTable = async (name, cols) => {
      if (!(await tableExists(name))) await qi.createTable(name, cols);
    };

    // ─────────────────────────────────────────────────────────────────────────
    // 1. PROPERTY extensions — Property Master Register fields
    // ─────────────────────────────────────────────────────────────────────────
    await addCol('properties', 'occupancy_status', { type: ENUM('vacant', 'occupied', 'caretaker', 'notice_period'), defaultValue: 'vacant' });
    await addCol('properties', 'utilities_active', { type: BOOLEAN, defaultValue: false });
    await addCol('properties', 'market_rent_min', { type: DECIMAL(15, 2) });
    await addCol('properties', 'market_rent_max', { type: DECIMAL(15, 2) });
    await addCol('properties', 'approved_monthly_rent', { type: DECIMAL(15, 2) });
    await addCol('properties', 'rent_due_day', { type: INTEGER, defaultValue: 5 });
    await addCol('properties', 'management_fee_pct', { type: DECIMAL(6, 2), defaultValue: 5 });
    await addCol('properties', 'lease_min_period_months', { type: INTEGER, defaultValue: 6 });
    await addCol('properties', 'property_condition', { type: STRING });
    await addCol('properties', 'access_contact', { type: STRING });
    await addCol('properties', 'remarks', { type: TEXT });
    // Rental-management lifecycle (kept separate from the listing `status` enum)
    await addCol('properties', 'pm_status', { type: ENUM('not_managed', 'onboarding', 'assessment_pending', 'marketing', 'tenanted', 'closed'), defaultValue: 'not_managed' });
    await addCol('properties', 'rental_readiness_status', { type: ENUM('not_ready', 'action_required', 'ready_for_marketing'), defaultValue: 'not_ready' });
    await addCol('properties', 'listing_status', { type: ENUM('not_listed', 'drafting', 'live', 'paused', 'let'), defaultValue: 'not_listed' });
    await addCol('properties', 'pm_project_id', { type: INTEGER });

    // ─────────────────────────────────────────────────────────────────────────
    // 2. PROPERTY OWNER PROFILE extensions — Owner Master + SOP onboarding
    // ─────────────────────────────────────────────────────────────────────────
    await addCol('property_owner_profiles', 'owner_type', { type: ENUM('individual', 'joint', 'nrb', 'company'), defaultValue: 'individual' });
    await addCol('property_owner_profiles', 'ownership_status', { type: ENUM('sole', 'joint', 'company', 'inherited'), defaultValue: 'sole' });
    await addCol('property_owner_profiles', 'current_address', { type: TEXT });
    await addCol('property_owner_profiles', 'property_address', { type: TEXT });
    await addCol('property_owner_profiles', 'district', { type: STRING });
    await addCol('property_owner_profiles', 'bank_details_collected', { type: BOOLEAN, defaultValue: false });
    await addCol('property_owner_profiles', 'lawful_authority_confirmed', { type: BOOLEAN, defaultValue: false });
    await addCol('property_owner_profiles', 'joint_consent_collected', { type: BOOLEAN, defaultValue: false });
    await addCol('property_owner_profiles', 'poa_verified', { type: BOOLEAN, defaultValue: false });
    await addCol('property_owner_profiles', 'tax_responsibility_ack', { type: BOOLEAN, defaultValue: false });
    await addCol('property_owner_profiles', 'owner_obligations_accepted', { type: BOOLEAN, defaultValue: false });
    await addCol('property_owner_profiles', 'indemnity_accepted', { type: BOOLEAN, defaultValue: false });
    await addCol('property_owner_profiles', 'management_commission', { type: DECIMAL(6, 2), defaultValue: 5 });
    await addCol('property_owner_profiles', 'onboarding_fee', { type: DECIMAL(15, 2) });
    await addCol('property_owner_profiles', 'maintenance_responsibility', { type: STRING });
    await addCol('property_owner_profiles', 'assigned_officer_id', { type: INTEGER });
    await addCol('property_owner_profiles', 'next_action', { type: STRING });
    await addCol('property_owner_profiles', 'next_follow_up', { type: DATEONLY });
    await addCol('property_owner_profiles', 'agreement_status', { type: ENUM('not_started', 'draft', 'sent', 'signed'), defaultValue: 'not_started' });
    await addCol('property_owner_profiles', 'onboarding_status', { type: ENUM('new', 'in_progress', 'completed'), defaultValue: 'new' });

    // ─────────────────────────────────────────────────────────────────────────
    // 3. TENANCY extensions — Lease Register fields
    // ─────────────────────────────────────────────────────────────────────────
    await addCol('tenancies', 'lease_status', { type: ENUM('draft', 'sent_for_signature', 'signed', 'active', 'expired', 'terminated'), defaultValue: 'draft' });
    await addCol('tenancies', 'advance_rent', { type: DECIMAL(15, 2) });
    await addCol('tenancies', 'minimum_lease_period_months', { type: INTEGER, defaultValue: 6 });
    await addCol('tenancies', 'payment_method', { type: STRING });
    await addCol('tenancies', 'agreement_sent_date', { type: DATEONLY });
    await addCol('tenancies', 'signed_date', { type: DATEONLY });
    await addCol('tenancies', 'renewal_reminder_date', { type: DATEONLY });
    await addCol('tenancies', 'application_id', { type: INTEGER });

    // ─────────────────────────────────────────────────────────────────────────
    // 4. RENTAL ENQUIRIES — Marketing & Enquiry Kanban
    // ─────────────────────────────────────────────────────────────────────────
    await createTable('rental_enquiries', {
      id: { type: INTEGER, autoIncrement: true, primaryKey: true },
      branch_id: { type: INTEGER, allowNull: false },
      enquiry_code: { type: STRING(40), unique: true },
      property_id: { type: INTEGER, references: { model: 'properties', key: 'id' }, onDelete: 'SET NULL' },
      contact_id: { type: INTEGER, references: { model: 'contacts', key: 'id' }, onDelete: 'SET NULL' },
      enquirer_name: { type: STRING, allowNull: false },
      phone: { type: STRING },
      email: { type: STRING },
      source: { type: STRING },
      budget: { type: DECIMAL(15, 2) },
      preferred_area: { type: STRING },
      bedrooms_wanted: { type: INTEGER },
      preferred_move_in: { type: DATEONLY },
      occupancy_requirement: { type: STRING },
      lease_period: { type: STRING },
      viewing_date: { type: DATE },
      stage: { type: ENUM('new', 'contacted', 'viewing_scheduled', 'viewed', 'application_requested', 'application_received', 'shortlisted', 'rejected', 'converted'), defaultValue: 'new' },
      assigned_officer_id: { type: INTEGER },
      next_action: { type: STRING },
      follow_up_date: { type: DATEONLY },
      notes: { type: TEXT },
      converted_application_id: { type: INTEGER },
      created_by: { type: INTEGER },
      ...stamps,
    });

    // ─────────────────────────────────────────────────────────────────────────
    // 5. TENANT APPLICATIONS
    // ─────────────────────────────────────────────────────────────────────────
    await createTable('tenant_applications', {
      id: { type: INTEGER, autoIncrement: true, primaryKey: true },
      branch_id: { type: INTEGER, allowNull: false },
      application_code: { type: STRING(40), unique: true },
      property_id: { type: INTEGER, references: { model: 'properties', key: 'id' }, onDelete: 'SET NULL' },
      tenant_contact_id: { type: INTEGER, references: { model: 'contacts', key: 'id' }, onDelete: 'SET NULL' },
      enquiry_id: { type: INTEGER },
      applicant_name: { type: STRING, allowNull: false },
      mobile: { type: STRING },
      email: { type: STRING },
      occupation: { type: STRING },
      employer: { type: STRING },
      monthly_income: { type: DECIMAL(15, 2) },
      application_date: { type: DATEONLY },
      preferred_move_in: { type: DATEONLY },
      lease_period: { type: STRING },
      occupancy_requirement: { type: STRING },
      budget: { type: DECIMAL(15, 2) },
      source: { type: STRING },
      id_received: { type: BOOLEAN, defaultValue: false },
      employment_verified: { type: BOOLEAN, defaultValue: false },
      income_verified: { type: BOOLEAN, defaultValue: false },
      references_checked: { type: BOOLEAN, defaultValue: false },
      background_check_status: { type: ENUM('pending', 'in_progress', 'clear', 'flagged', 'na'), defaultValue: 'pending' },
      status: { type: ENUM('draft', 'submitted', 'screening', 'verification', 'awaiting_documents', 'awaiting_owner_approval', 'approved', 'rejected', 'withdrawn', 'converted'), defaultValue: 'draft' },
      recommendation: { type: ENUM('pending', 'recommend', 'hold', 'reject'), defaultValue: 'pending' },
      owner_approval_required: { type: BOOLEAN, defaultValue: true },
      owner_decision: { type: ENUM('pending', 'approved', 'hold', 'rejected', 'na'), defaultValue: 'pending' },
      approved_rent: { type: DECIMAL(15, 2) },
      lease_start_target: { type: DATEONLY },
      risk_level: { type: ENUM('low', 'medium', 'high'), defaultValue: 'medium' },
      screening_notes: { type: TEXT },
      assigned_officer_id: { type: INTEGER },
      notes: { type: TEXT },
      converted_tenancy_id: { type: INTEGER },
      created_by: { type: INTEGER },
      ...stamps,
    });

    await createTable('tenant_application_documents', {
      id: { type: INTEGER, autoIncrement: true, primaryKey: true },
      application_id: { type: INTEGER, allowNull: false, references: { model: 'tenant_applications', key: 'id' }, onDelete: 'CASCADE' },
      title: { type: STRING },
      doc_type: { type: STRING },
      file_url: { type: STRING },
      file_name: { type: STRING },
      uploaded_by: { type: INTEGER },
      ...stamps,
    });

    await createTable('tenant_verifications', {
      id: { type: INTEGER, autoIncrement: true, primaryKey: true },
      application_id: { type: INTEGER, allowNull: false, references: { model: 'tenant_applications', key: 'id' }, onDelete: 'CASCADE' },
      item: { type: STRING, allowNull: false },
      required: { type: BOOLEAN, defaultValue: true },
      status: { type: ENUM('pending', 'in_progress', 'passed', 'failed', 'na'), defaultValue: 'pending' },
      evidence_required: { type: STRING },
      evidence_url: { type: STRING },
      responsible_id: { type: INTEGER },
      notes: { type: TEXT },
      completed_at: { type: DATE },
      sort_order: { type: INTEGER, defaultValue: 0 },
      ...stamps,
    });

    await createTable('tenant_occupants', {
      id: { type: INTEGER, autoIncrement: true, primaryKey: true },
      application_id: { type: INTEGER, references: { model: 'tenant_applications', key: 'id' }, onDelete: 'CASCADE' },
      tenancy_id: { type: INTEGER, references: { model: 'tenancies', key: 'id' }, onDelete: 'CASCADE' },
      property_id: { type: INTEGER },
      name: { type: STRING, allowNull: false },
      relationship: { type: STRING },
      id_received: { type: BOOLEAN, defaultValue: false },
      contact: { type: STRING },
      occupation: { type: STRING },
      approved: { type: BOOLEAN, defaultValue: false },
      subletting_concern: { type: BOOLEAN, defaultValue: false },
      notes: { type: TEXT },
      ...stamps,
    });

    // ─────────────────────────────────────────────────────────────────────────
    // 6. RENTAL ASSESSMENTS
    // ─────────────────────────────────────────────────────────────────────────
    await createTable('rental_assessments', {
      id: { type: INTEGER, autoIncrement: true, primaryKey: true },
      branch_id: { type: INTEGER, allowNull: false },
      assessment_code: { type: STRING(40), unique: true },
      property_id: { type: INTEGER, allowNull: false, references: { model: 'properties', key: 'id' }, onDelete: 'CASCADE' },
      owner_contact_id: { type: INTEGER },
      assessment_date: { type: DATEONLY },
      inspector_id: { type: INTEGER },
      market_rent_min: { type: DECIMAL(15, 2) },
      market_rent_max: { type: DECIMAL(15, 2) },
      recommended_rent: { type: DECIMAL(15, 2) },
      approved_rent: { type: DECIMAL(15, 2) },
      readiness_score: { type: INTEGER, defaultValue: 0 },
      readiness_status: { type: ENUM('not_ready', 'action_required', 'ready_for_marketing'), defaultValue: 'not_ready' },
      ready_for_marketing: { type: BOOLEAN, defaultValue: false },
      summary: { type: TEXT },
      status: { type: ENUM('draft', 'in_progress', 'completed'), defaultValue: 'draft' },
      created_by: { type: INTEGER },
      ...stamps,
    });

    await createTable('rental_assessment_items', {
      id: { type: INTEGER, autoIncrement: true, primaryKey: true },
      assessment_id: { type: INTEGER, allowNull: false, references: { model: 'rental_assessments', key: 'id' }, onDelete: 'CASCADE' },
      section: { type: STRING },
      assessment_item: { type: STRING, allowNull: false },
      finding: { type: TEXT },
      required_action: { type: TEXT },
      responsible_id: { type: INTEGER },
      due_date: { type: DATEONLY },
      status: { type: ENUM('pending', 'in_progress', 'done', 'na'), defaultValue: 'pending' },
      is_blocking: { type: BOOLEAN, defaultValue: false },
      maintenance_recommendation: { type: TEXT },
      safety_observation: { type: TEXT },
      condition_rating: { type: ENUM('good', 'fair', 'poor', 'damaged', 'na'), defaultValue: 'na' },
      photo_url: { type: STRING },
      work_order_id: { type: INTEGER },
      notes: { type: TEXT },
      sort_order: { type: INTEGER, defaultValue: 0 },
      ...stamps,
    });

    // ─────────────────────────────────────────────────────────────────────────
    // 7. OWNER ONBOARDING ITEMS — Owner Onboarding Checklist sheet
    // ─────────────────────────────────────────────────────────────────────────
    await createTable('owner_onboarding_items', {
      id: { type: INTEGER, autoIncrement: true, primaryKey: true },
      branch_id: { type: INTEGER, allowNull: false },
      property_id: { type: INTEGER, references: { model: 'properties', key: 'id' }, onDelete: 'CASCADE' },
      owner_contact_id: { type: INTEGER },
      owner_profile_id: { type: INTEGER },
      checklist_item: { type: STRING, allowNull: false },
      required: { type: BOOLEAN, defaultValue: true },
      status: { type: ENUM('pending', 'in_progress', 'done', 'na'), defaultValue: 'pending' },
      evidence_required: { type: STRING },
      evidence_url: { type: STRING },
      responsible_id: { type: INTEGER },
      action_required: { type: STRING },
      notes: { type: TEXT },
      completed_at: { type: DATE },
      sort_order: { type: INTEGER, defaultValue: 0 },
      ...stamps,
    });

    // ─────────────────────────────────────────────────────────────────────────
    // 8. BOND & DEPOSIT RECORDS
    // ─────────────────────────────────────────────────────────────────────────
    await createTable('bond_deposit_records', {
      id: { type: INTEGER, autoIncrement: true, primaryKey: true },
      branch_id: { type: INTEGER, allowNull: false },
      bond_code: { type: STRING(40), unique: true },
      tenancy_id: { type: INTEGER, references: { model: 'tenancies', key: 'id' }, onDelete: 'SET NULL' },
      application_id: { type: INTEGER },
      property_id: { type: INTEGER },
      tenant_contact_id: { type: INTEGER },
      monthly_rent: { type: DECIMAL(15, 2) },
      advance_rent_required: { type: DECIMAL(15, 2) },
      security_deposit_required: { type: DECIMAL(15, 2) },
      advance_rent_received: { type: DECIMAL(15, 2), defaultValue: 0 },
      security_deposit_received: { type: DECIMAL(15, 2), defaultValue: 0 },
      total_received: { type: DECIMAL(15, 2), defaultValue: 0 },
      receipt_evidence: { type: STRING },
      bond_status: { type: ENUM('pending_collection', 'held', 'refunded', 'adjusted'), defaultValue: 'pending_collection' },
      total_deductions: { type: DECIMAL(15, 2), defaultValue: 0 },
      refund_amount: { type: DECIMAL(15, 2) },
      refund_status: { type: STRING },
      notes: { type: TEXT },
      created_by: { type: INTEGER },
      ...stamps,
    });

    // ─────────────────────────────────────────────────────────────────────────
    // 9. NON-CIRCUMVENTION RECORDS
    // ─────────────────────────────────────────────────────────────────────────
    await createTable('non_circumvention_records', {
      id: { type: INTEGER, autoIncrement: true, primaryKey: true },
      branch_id: { type: INTEGER, allowNull: false },
      record_code: { type: STRING(40), unique: true },
      owner_contact_id: { type: INTEGER },
      tenant_contact_id: { type: INTEGER },
      property_id: { type: INTEGER },
      tenancy_id: { type: INTEGER },
      protected_relationship: { type: STRING },
      introduction_date: { type: DATEONLY },
      protection_basis: { type: STRING },
      direct_communication_allowed: { type: BOOLEAN, defaultValue: false },
      breach_risk: { type: ENUM('low', 'medium', 'high'), defaultValue: 'medium' },
      monitoring_notes: { type: TEXT },
      status: { type: ENUM('pending', 'active', 'breached', 'closed'), defaultValue: 'active' },
      created_by: { type: INTEGER },
      ...stamps,
    });
  },

  async down(queryInterface) {
    const qi = queryInterface;
    await qi.dropTable('non_circumvention_records').catch(() => {});
    await qi.dropTable('bond_deposit_records').catch(() => {});
    await qi.dropTable('owner_onboarding_items').catch(() => {});
    await qi.dropTable('rental_assessment_items').catch(() => {});
    await qi.dropTable('rental_assessments').catch(() => {});
    await qi.dropTable('tenant_occupants').catch(() => {});
    await qi.dropTable('tenant_verifications').catch(() => {});
    await qi.dropTable('tenant_application_documents').catch(() => {});
    await qi.dropTable('tenant_applications').catch(() => {});
    await qi.dropTable('rental_enquiries').catch(() => {});

    const dropCols = async (table, cols) => {
      for (const c of cols) await qi.removeColumn(table, c).catch(() => {});
    };
    await dropCols('tenancies', ['lease_status', 'advance_rent', 'minimum_lease_period_months', 'payment_method', 'agreement_sent_date', 'signed_date', 'renewal_reminder_date', 'application_id']);
    await dropCols('property_owner_profiles', ['owner_type', 'ownership_status', 'current_address', 'property_address', 'district', 'bank_details_collected', 'lawful_authority_confirmed', 'joint_consent_collected', 'poa_verified', 'tax_responsibility_ack', 'owner_obligations_accepted', 'indemnity_accepted', 'management_commission', 'onboarding_fee', 'maintenance_responsibility', 'assigned_officer_id', 'next_action', 'next_follow_up', 'agreement_status', 'onboarding_status']);
    await dropCols('properties', ['occupancy_status', 'utilities_active', 'market_rent_min', 'market_rent_max', 'approved_monthly_rent', 'rent_due_day', 'management_fee_pct', 'lease_min_period_months', 'property_condition', 'access_contact', 'remarks', 'pm_status', 'rental_readiness_status', 'listing_status', 'pm_project_id']);
  },
};
