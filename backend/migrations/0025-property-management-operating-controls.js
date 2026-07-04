'use strict';

/**
 * 0025 — Property-management operating controls.
 * Adds only missing first-class controls from the workbook reference. Existing
 * property, tenancy, application, rent, statement, inspection, maintenance,
 * deposit, non-circumvention and communication modules remain the source of truth.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const qi = queryInterface;
    const { INTEGER, STRING, TEXT, DATE, DATEONLY, DECIMAL, BOOLEAN, ENUM, JSON: JSONT } = Sequelize;
    const money = () => ({ type: DECIMAL(15, 2), defaultValue: 0 });
    const hasTable = async (table) => !!(await qi.describeTable(table).catch(() => null));
    const create = async (table, cols) => { if (!(await hasTable(table))) await qi.createTable(table, cols); };
    const addCol = async (table, col, spec) => {
      const desc = await qi.describeTable(table).catch(() => ({}));
      if (!desc[col]) await qi.addColumn(table, col, spec);
    };

    const base = {
      id: { type: INTEGER, autoIncrement: true, primaryKey: true },
      branch_id: { type: INTEGER, allowNull: false },
      created_by: { type: INTEGER },
      created_at: { type: DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    };

    await create('utility_bills', {
      ...base,
      utility_code: { type: STRING(40), unique: true },
      property_id: { type: INTEGER }, tenancy_id: { type: INTEGER }, tenant_contact_id: { type: INTEGER }, owner_contact_id: { type: INTEGER },
      utility_type: { type: ENUM('electricity', 'gas', 'water', 'internet', 'building_charge', 'other'), defaultValue: 'electricity' },
      responsibility: { type: ENUM('tenant', 'owner', 'shared', 'seventh_sky', 'tbc'), defaultValue: 'tenant' },
      provider: { type: STRING }, bill_period: { type: STRING(30) }, amount: money(), due_date: { type: DATEONLY },
      paid_by: { type: ENUM('tenant', 'owner', 'seventh_sky', 'tbc'), defaultValue: 'tbc' },
      payment_status: { type: ENUM('pending', 'paid', 'overdue', 'waived', 'disputed'), defaultValue: 'pending' },
      evidence_url: { type: STRING }, notes: { type: TEXT }, invoice_id: { type: INTEGER }, landlord_bill_id: { type: INTEGER },
    });

    await create('tenant_requests', {
      ...base,
      request_code: { type: STRING(40), unique: true },
      tenant_contact_id: { type: INTEGER }, property_id: { type: INTEGER }, tenancy_id: { type: INTEGER }, work_order_id: { type: INTEGER },
      request_date: { type: DATEONLY }, request_type: { type: ENUM('maintenance', 'utility', 'move_in', 'billing', 'complaint', 'document', 'general'), defaultValue: 'general' },
      details: { type: TEXT }, priority: { type: ENUM('low', 'medium', 'high', 'critical'), defaultValue: 'medium' },
      assigned_to: { type: INTEGER }, owner_approval_required: { type: BOOLEAN, defaultValue: false },
      status: { type: ENUM('open', 'in_progress', 'waiting_owner', 'waiting_tenant', 'resolved', 'closed', 'cancelled'), defaultValue: 'open' },
      resolution_notes: { type: TEXT },
    });

    await create('arrears_actions', {
      ...base,
      arrears_code: { type: STRING(40), unique: true },
      rental_ledger_id: { type: INTEGER }, property_id: { type: INTEGER }, owner_contact_id: { type: INTEGER }, tenant_contact_id: { type: INTEGER },
      due_date: { type: DATEONLY }, amount_due: money(), amount_received: money(), outstanding_amount: money(), days_overdue: { type: INTEGER, defaultValue: 0 },
      reminder_stage: { type: ENUM('none', '1_7_days', '8_14_days', '15_plus_days', 'final_notice'), defaultValue: 'none' },
      reminder_sent_at: { type: DATE }, notice_issued: { type: BOOLEAN, defaultValue: false },
      escalation_level: { type: ENUM('monitor', 'reminder_1', 'reminder_2', 'manager_review', 'legal_review'), defaultValue: 'monitor' },
      action_required: { type: STRING }, status: { type: ENUM('open', 'in_progress', 'resolved', 'written_off', 'closed'), defaultValue: 'open' }, notes: { type: TEXT },
    });

    await create('marketing_activities', {
      ...base,
      marketing_code: { type: STRING(40), unique: true },
      property_id: { type: INTEGER }, owner_contact_id: { type: INTEGER },
      channel: { type: STRING(80) }, asset_task: { type: STRING }, start_date: { type: DATEONLY }, end_date: { type: DATEONLY }, budget: money(),
      status: { type: ENUM('planned', 'active', 'paused', 'completed', 'cancelled'), defaultValue: 'planned' },
      enquiries_generated: { type: INTEGER, defaultValue: 0 }, inspections_booked: { type: INTEGER, defaultValue: 0 }, next_action: { type: STRING }, notes: { type: TEXT },
    });

    await create('expense_approvals', {
      ...base,
      expense_code: { type: STRING(40), unique: true },
      property_id: { type: INTEGER }, owner_contact_id: { type: INTEGER }, work_order_id: { type: INTEGER }, landlord_bill_id: { type: INTEGER },
      expense_type: { type: STRING(80) }, description: { type: TEXT }, estimated_amount: money(), approved_amount: money(),
      owner_approval_required: { type: BOOLEAN, defaultValue: true }, approval_method: { type: STRING(80) }, approved_by: { type: STRING }, approval_date: { type: DATEONLY },
      invoice_received: { type: BOOLEAN, defaultValue: false }, deduct_from_rent: { type: BOOLEAN, defaultValue: true },
      status: { type: ENUM('pending', 'approved', 'rejected', 'invoice_received', 'deducted', 'closed'), defaultValue: 'pending' }, notes: { type: TEXT },
    });

    await create('property_risks', {
      ...base,
      risk_code: { type: STRING(40), unique: true },
      property_id: { type: INTEGER }, tenancy_id: { type: INTEGER }, owner_contact_id: { type: INTEGER }, tenant_contact_id: { type: INTEGER },
      risk_category: { type: STRING(80) }, description: { type: TEXT }, likelihood: { type: ENUM('low', 'medium', 'high'), defaultValue: 'medium' },
      impact: { type: ENUM('low', 'medium', 'high'), defaultValue: 'medium' }, risk_rating: { type: ENUM('low', 'medium', 'high', 'critical'), defaultValue: 'medium' },
      mitigation: { type: TEXT }, owner_user_id: { type: INTEGER }, review_date: { type: DATEONLY }, status: { type: ENUM('open', 'monitoring', 'mitigated', 'closed'), defaultValue: 'open' },
    });

    await create('move_in_checklist_items', {
      ...base,
      checklist_code: { type: STRING(40), unique: true },
      tenancy_id: { type: INTEGER, allowNull: false }, property_id: { type: INTEGER }, tenant_contact_id: { type: INTEGER },
      checklist_item: { type: STRING, allowNull: false }, required: { type: BOOLEAN, defaultValue: true },
      status: { type: ENUM('pending', 'in_progress', 'done', 'na'), defaultValue: 'pending' }, evidence_required: { type: STRING }, evidence_url: { type: STRING },
      responsible_id: { type: INTEGER }, notes: { type: TEXT }, completed_at: { type: DATE }, sort_order: { type: INTEGER, defaultValue: 0 },
    });

    await addCol('inspections', 'tenancy_id', { type: INTEGER });
    await addCol('inspections', 'tenant_contact_id', { type: INTEGER });
    await addCol('inspections', 'owner_contact_id', { type: INTEGER });
    await addCol('inspections', 'photo_video_evidence', { type: JSONT, defaultValue: [] });
    await addCol('inspections', 'follow_up_required', { type: BOOLEAN, defaultValue: false });
    await addCol('inspections', 'report_sent_to_owner', { type: BOOLEAN, defaultValue: false });
    await addCol('inspection_items', 'required', { type: BOOLEAN, defaultValue: true });
    await addCol('inspection_items', 'finding', { type: TEXT });
    await addCol('inspection_items', 'photo_required', { type: BOOLEAN, defaultValue: false });
    await addCol('inspection_items', 'risk_rating', { type: ENUM('low', 'medium', 'high', 'critical', 'na'), defaultValue: 'na' });
    await addCol('inspection_items', 'deduction_required', { type: BOOLEAN, defaultValue: false });
    await addCol('inspection_items', 'action_required', { type: STRING });
    await addCol('inspection_items', 'responsible_id', { type: INTEGER });

    await addCol('communications', 'property_id', { type: INTEGER });
    await addCol('communications', 'tenancy_id', { type: INTEGER });
    await addCol('communications', 'owner_contact_id', { type: INTEGER });
    await addCol('communications', 'tenant_contact_id', { type: INTEGER });
    await addCol('communications', 'action_required', { type: STRING });
    await addCol('communications', 'responsible_id', { type: INTEGER });
    await addCol('communications', 'due_date', { type: DATEONLY });
    await addCol('communications', 'status', { type: ENUM('open', 'in_progress', 'done', 'closed'), defaultValue: 'open' });
  },

  async down(queryInterface) {
    const qi = queryInterface;
    for (const table of ['move_in_checklist_items', 'property_risks', 'expense_approvals', 'marketing_activities', 'arrears_actions', 'tenant_requests', 'utility_bills']) {
      await qi.dropTable(table).catch(() => {});
    }
    for (const c of ['tenancy_id', 'tenant_contact_id', 'owner_contact_id', 'photo_video_evidence', 'follow_up_required', 'report_sent_to_owner']) await qi.removeColumn('inspections', c).catch(() => {});
    for (const c of ['required', 'finding', 'photo_required', 'risk_rating', 'deduction_required', 'action_required', 'responsible_id']) await qi.removeColumn('inspection_items', c).catch(() => {});
    for (const c of ['property_id', 'tenancy_id', 'owner_contact_id', 'tenant_contact_id', 'action_required', 'responsible_id', 'due_date', 'status']) await qi.removeColumn('communications', c).catch(() => {});
  },
};
