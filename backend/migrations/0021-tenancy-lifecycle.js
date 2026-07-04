'use strict';

/**
 * 0021 — Tenancy lifecycle (renewal + vacancy + deposit settlement).
 *
 * Extends tenancies with renewal state + adds vacancy_notices and
 * deposit_settlements tables. Move-in checklist reuses the existing
 * `move_in_entry_checklist` stage from the 18-stage leasing workflow, so
 * no new checklist table is needed.
 *
 * Renewal flow (fields on tenancies):
 *   renewal_status: none → proposed → owner_approved → tenant_accepted → activated | declined
 *   renewal_offer_rent / _service_charge / _lease_end
 *
 * Vacancy flow (dedicated entity):
 *   vacancy_notices: submitted (by tenant) → acknowledged → exit_scheduled → completed | cancelled
 *
 * Deposit settlement (dedicated entity, one-to-one with tenancy):
 *   deposit_settlements: computing → pending_owner → approved | disputed → refunded
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const { INTEGER, STRING, DECIMAL, ENUM, TEXT, DATEONLY, DATE, JSON: JSONT, BOOLEAN } = Sequelize;
    const stamps = {
      created_at: { type: DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP') },
    };
    const qi = queryInterface;
    const addCol = async (table, col, spec) => {
      const desc = await qi.describeTable(table).catch(() => ({}));
      if (!desc[col]) await qi.addColumn(table, col, spec);
    };
    const createTable = async (name, cols) => {
      try { await qi.describeTable(name); } catch { await qi.createTable(name, cols); }
    };

    // 1. RENEWAL fields on tenancies
    await addCol('tenancies', 'renewal_status',        { type: ENUM('none', 'proposed', 'owner_approved', 'tenant_accepted', 'activated', 'declined'), defaultValue: 'none' });
    await addCol('tenancies', 'renewal_offer_rent',    { type: DECIMAL(15, 2) });
    await addCol('tenancies', 'renewal_offer_service', { type: DECIMAL(15, 2) });
    await addCol('tenancies', 'renewal_offer_lease_end', { type: DATEONLY });
    await addCol('tenancies', 'renewal_proposed_at',   { type: DATE });
    await addCol('tenancies', 'renewal_owner_approved_at', { type: DATE });
    await addCol('tenancies', 'renewal_tenant_accepted_at', { type: DATE });
    await addCol('tenancies', 'renewal_activated_at',  { type: DATE });
    await addCol('tenancies', 'renewal_notes',         { type: TEXT });

    // 2. VACANCY notices
    await createTable('vacancy_notices', {
      id: { type: INTEGER, autoIncrement: true, primaryKey: true },
      branch_id: { type: INTEGER, allowNull: false },
      notice_code: { type: STRING(40), unique: true },
      tenancy_id: { type: INTEGER, allowNull: false, references: { model: 'tenancies', key: 'id' }, onDelete: 'CASCADE' },
      property_id: { type: INTEGER },
      tenant_contact_id: { type: INTEGER },
      submitted_by_type: { type: ENUM('tenant', 'staff', 'owner'), defaultValue: 'tenant' },
      intended_vacate_date: { type: DATEONLY, allowNull: false },
      notice_received_date: { type: DATEONLY },
      notice_period_days: { type: INTEGER },
      notice_period_met: { type: BOOLEAN },
      reason: { type: STRING },
      status: { type: ENUM('submitted', 'acknowledged', 'exit_scheduled', 'exit_completed', 'closed', 'cancelled'), defaultValue: 'submitted' },
      exit_inspection_id: { type: INTEGER },
      exit_inspection_date: { type: DATEONLY },
      keys_returned_at: { type: DATE },
      settlement_id: { type: INTEGER },
      notes: { type: TEXT },
      created_by: { type: INTEGER },
      ...stamps,
    });

    // 3. DEPOSIT settlements
    await createTable('deposit_settlements', {
      id: { type: INTEGER, autoIncrement: true, primaryKey: true },
      branch_id: { type: INTEGER, allowNull: false },
      settlement_code: { type: STRING(40), unique: true },
      tenancy_id: { type: INTEGER, allowNull: false, references: { model: 'tenancies', key: 'id' }, onDelete: 'CASCADE' },
      vacancy_notice_id: { type: INTEGER },
      bond_record_id: { type: INTEGER },
      property_id: { type: INTEGER },
      tenant_contact_id: { type: INTEGER },
      owner_contact_id: { type: INTEGER },
      // Hold + deductions
      deposit_held: { type: DECIMAL(15, 2), defaultValue: 0 },
      advance_rent_held: { type: DECIMAL(15, 2), defaultValue: 0 },
      unpaid_rent: { type: DECIMAL(15, 2), defaultValue: 0 },
      unpaid_service_charge: { type: DECIMAL(15, 2), defaultValue: 0 },
      damages: { type: DECIMAL(15, 2), defaultValue: 0 },
      cleaning: { type: DECIMAL(15, 2), defaultValue: 0 },
      utility_dues: { type: DECIMAL(15, 2), defaultValue: 0 },
      other_deductions: { type: DECIMAL(15, 2), defaultValue: 0 },
      total_deductions: { type: DECIMAL(15, 2), defaultValue: 0 },
      refund_amount: { type: DECIMAL(15, 2), defaultValue: 0 },
      // Detailed items (per-damage line for the tenant settlement PDF)
      deduction_lines: { type: JSONT, defaultValue: [] },
      // Owner sign-off + payment
      status: { type: ENUM('computing', 'pending_owner', 'approved', 'disputed', 'refunded', 'closed'), defaultValue: 'computing' },
      owner_decision_at: { type: DATE },
      owner_decision_note: { type: TEXT },
      refunded_at: { type: DATE },
      refund_method: { type: STRING(40) },
      refund_reference: { type: STRING },
      notes: { type: TEXT },
      created_by: { type: INTEGER },
      ...stamps,
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('deposit_settlements').catch(() => {});
    await queryInterface.dropTable('vacancy_notices').catch(() => {});
    const cols = ['renewal_status', 'renewal_offer_rent', 'renewal_offer_service', 'renewal_offer_lease_end',
      'renewal_proposed_at', 'renewal_owner_approved_at', 'renewal_tenant_accepted_at', 'renewal_activated_at', 'renewal_notes'];
    for (const c of cols) await queryInterface.removeColumn('tenancies', c).catch(() => {});
  },
};
