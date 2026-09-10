'use strict';
module.exports = {
  up: async (q, S) => {
    const ts = {
      created_at: { type: S.DATE, allowNull: false, defaultValue: S.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: S.DATE, allowNull: false, defaultValue: S.literal('CURRENT_TIMESTAMP') },
    };
    if (!(await q.describeTable('buyer_mandates').catch(() => null))) {
      await q.createTable('buyer_mandates', {
        id: { type: S.INTEGER, autoIncrement: true, primaryKey: true },
        branch_id: { type: S.INTEGER, allowNull: false, defaultValue: 1 },
        mandate_code: { type: S.STRING(40), allowNull: false },
        buyer_client_id: S.INTEGER, buyer_contact_id: S.INTEGER,
        status: { type: S.ENUM('active', 'engaged', 'fulfilled', 'cancelled'), allowNull: false, defaultValue: 'active' },
        budget_min: S.DECIMAL(15, 2), budget_max: S.DECIMAL(15, 2),
        areas: S.STRING, property_type: S.STRING, beds_min: S.INTEGER, baths_min: S.INTEGER,
        timeframe: S.STRING, notes: S.TEXT, assigned_to: S.INTEGER, cancel_reason: S.TEXT,
        created_by: S.INTEGER, ...ts,
      });
    }
    if (!(await q.describeTable('mandate_candidates').catch(() => null))) {
      await q.createTable('mandate_candidates', {
        id: { type: S.INTEGER, autoIncrement: true, primaryKey: true },
        branch_id: { type: S.INTEGER, allowNull: false, defaultValue: 1 },
        mandate_id: { type: S.INTEGER, allowNull: false },
        property_id: { type: S.INTEGER, allowNull: false },
        status: { type: S.ENUM('shortlisted', 'viewing', 'rejected', 'converted'), allowNull: false, defaultValue: 'shortlisted' },
        fit_note: S.TEXT, feedback: S.TEXT, converted_deal_id: S.INTEGER,
        created_by: S.INTEGER, ...ts,
      });
    }
  },
  down: async (q) => {
    await q.dropTable('mandate_candidates').catch(() => {});
    await q.dropTable('buyer_mandates').catch(() => {});
  },
};
