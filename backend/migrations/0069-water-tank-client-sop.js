'use strict';

/**
 * Migration 0069: Water Tank — Client / End User Management (SSPC-WTCM-SOP-01).
 *
 *   wt_clients        extended for the Sec. 4 eleven-stage client workflow,
 *                     Sec. 5 enquiry + consultation, Sec. 7 agreement, deposit,
 *                     Sec. 9 Step 10 handover, Sec. 12 closure and the Sec. 13 KPIs
 *   wt_client_events  client lifecycle timeline
 *   wt_complaints     Sec. 11 acknowledgement within 1 business day
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

    // ── Sec. 4 workflow + the data each phase collects ──
    const clientCols = {
      // Sec. 4 position
      workflow_stage: { type: S.STRING(40), defaultValue: 'Lead Enquiry' },
      stage_updated_at: S.DATE,
      // Sec. 5 Step 1 — register client
      enquiry_date: S.DATEONLY,
      enquiry_channel: S.STRING(60),
      requested_service: S.STRING(200),
      service_category: S.STRING(80),
      alt_contact_name: S.STRING(120),
      alt_contact_phone: S.STRING(40),
      // Sec. 5 Step 2 — initial consultation
      consultation_date: S.DATEONLY,
      consultation_by: S.STRING(120),
      consultation_notes: S.TEXT,
      water_quality_concerns: S.TEXT,
      amc_required: { type: S.BOOLEAN, defaultValue: false },
      // Sec. 7 Step 6 — customer service agreement
      agreement_status: { type: S.STRING(40), defaultValue: 'Not Started' },
      agreement_code: S.STRING(40),
      agreement_envelope_id: S.INTEGER,
      agreement_signed_date: S.DATEONLY,
      // deposit collection (Sec. 4)
      deposit_required: { type: S.BOOLEAN, defaultValue: false },
      deposit_amount: { type: S.DECIMAL(15, 2), defaultValue: 0 },
      deposit_paid_amount: { type: S.DECIMAL(15, 2), defaultValue: 0 },
      deposit_date: S.DATEONLY,
      // Sec. 9 Step 10 — client handover
      handover_date: S.DATEONLY,
      handover_docs: S.JSON,
      maintenance_recommendations: S.TEXT,
      // Sec. 12 — project closure
      final_payment_confirmed: { type: S.BOOLEAN, defaultValue: false },
      satisfaction_score: { type: S.DECIMAL(3, 1), defaultValue: 0 },
      satisfaction_date: S.DATEONLY,
      satisfaction_notes: S.TEXT,
      closure_checklist: S.JSON,
      closed_date: S.DATEONLY,
      archived: { type: S.BOOLEAN, defaultValue: false },
      // service history / Sec. 13 KPI support
      first_service_date: S.DATEONLY,
      last_service_date: S.DATEONLY,
      converted: { type: S.BOOLEAN, defaultValue: false },
      converted_date: S.DATEONLY,
    };
    for (const [col, spec] of Object.entries(clientCols)) {
      if (!(await hasCol('wt_clients', col))) await queryInterface.addColumn('wt_clients', col, spec);
    }

    // ── client lifecycle timeline ──
    if (!(await has('wt_client_events'))) await queryInterface.createTable('wt_client_events', {
      id: { type: S.INTEGER, autoIncrement: true, primaryKey: true },
      branch_id: { type: S.INTEGER, allowNull: false, defaultValue: 1 },
      client_id: { type: S.INTEGER, allowNull: false },
      event_type: { type: S.STRING(60), allowNull: false },
      title: { type: S.STRING(200), allowNull: false },
      detail: S.TEXT,
      actor: S.STRING(120),
      occurred_at: { type: S.DATE, allowNull: false, defaultValue: S.literal('CURRENT_TIMESTAMP') },
      ...ts(),
    });
    try { await queryInterface.addIndex('wt_client_events', ['client_id'], { name: 'wt_client_events_client' }); } catch { /* present */ }

    // ── Sec. 11 complaint acknowledgement within 1 business day ──
    for (const [col, spec] of Object.entries({
      acknowledged_at: S.DATE,
      acknowledged_by: S.STRING(120),
      ack_due_at: S.DATE,
    })) {
      if (!(await hasCol('wt_complaints', col))) await queryInterface.addColumn('wt_complaints', col, spec);
    }
  },

  down: async (queryInterface) => {
    const rm = async (t, c) => { try { await queryInterface.removeColumn(t, c); } catch { /* not present */ } };
    try { await queryInterface.dropTable('wt_client_events'); } catch { /* not present */ }
    for (const c of ['workflow_stage', 'stage_updated_at', 'enquiry_date', 'enquiry_channel', 'requested_service',
      'service_category', 'alt_contact_name', 'alt_contact_phone', 'consultation_date', 'consultation_by',
      'consultation_notes', 'water_quality_concerns', 'amc_required', 'agreement_status', 'agreement_code',
      'agreement_envelope_id', 'agreement_signed_date', 'deposit_required', 'deposit_amount', 'deposit_paid_amount',
      'deposit_date', 'handover_date', 'handover_docs', 'maintenance_recommendations', 'final_payment_confirmed',
      'satisfaction_score', 'satisfaction_date', 'satisfaction_notes', 'closure_checklist', 'closed_date',
      'archived', 'first_service_date', 'last_service_date', 'converted', 'converted_date']) await rm('wt_clients', c);
    for (const c of ['acknowledged_at', 'acknowledged_by', 'ack_due_at']) await rm('wt_complaints', c);
  },
};
