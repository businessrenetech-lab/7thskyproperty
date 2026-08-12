'use strict';

/**
 * Migration 0074: work-order lifecycle.
 *
 * A work order now carries the whole delivery story — where it came from, who
 * accepted it, when crew attended, the stage checklist that drives the progress
 * bar, and the completion evidence the SOP asks for (Sec. 8 Steps 7–10, Sec. 9 Step 9).
 * Idempotent.
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    const S = Sequelize;
    const hasCol = async (t, c) => { try { return !!(await queryInterface.describeTable(t))[c]; } catch { return false; } };

    const cols = {
      // provenance
      source_quotation: S.STRING(30),
      source_agreement: S.STRING(40),
      agreement_envelope_id: S.INTEGER,
      source_request: S.STRING(30),
      client_code: S.STRING(30),
      site_address: S.STRING(255),
      client_phone: S.STRING(40),
      // assignment (Sec. 8 Step 7)
      provider_id: S.INTEGER,
      assigned_at: S.DATE,
      assigned_by: S.STRING(120),
      // acceptance (Sec. 7 Step 7 of the provider SOP)
      accepted_at: S.DATE,
      accepted_by: S.STRING(120),
      declined_reason: S.TEXT,
      // delivery (Sec. 8 Step 8)
      scheduled_date: S.DATEONLY,
      started_at: S.DATE,
      completed_at: S.DATE,
      crew_size: { type: S.INTEGER, defaultValue: 0 },
      attendance: S.JSON,
      // the stage checklist behind the progress bar
      stages: S.JSON,
      progress: { type: S.INTEGER, defaultValue: 0 },
      // completion verification (Sec. 9 Step 9)
      site_cleaned: { type: S.BOOLEAN, defaultValue: false },
      reports_submitted: { type: S.BOOLEAN, defaultValue: false },
      photos_collected: { type: S.BOOLEAN, defaultValue: false },
      client_satisfied: { type: S.BOOLEAN, defaultValue: false },
      verified_by: S.STRING(120),
      verified_at: S.DATE,
      completion_notes: S.TEXT,
      lines: S.JSON,
    };
    for (const [col, spec] of Object.entries(cols)) {
      if (!(await hasCol('wt_work_orders', col))) await queryInterface.addColumn('wt_work_orders', col, spec);
    }
  },

  down: async (queryInterface) => {
    for (const c of ['source_quotation', 'source_agreement', 'agreement_envelope_id', 'source_request',
      'client_code', 'site_address', 'client_phone', 'provider_id', 'assigned_at', 'assigned_by',
      'accepted_at', 'accepted_by', 'declined_reason', 'scheduled_date', 'started_at', 'completed_at',
      'crew_size', 'attendance', 'stages', 'progress', 'site_cleaned', 'reports_submitted',
      'photos_collected', 'client_satisfied', 'verified_by', 'verified_at', 'completion_notes', 'lines']) {
      try { await queryInterface.removeColumn('wt_work_orders', c); } catch { /* not present */ }
    }
  },
};
