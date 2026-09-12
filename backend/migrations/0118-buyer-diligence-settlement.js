'use strict';
// Buyer service Phase C — stage 5 (documentation review & risk) fields on the buy
// deal, and stage 7 (agreement & settlement COORDINATION — non-trust) tracker.
module.exports = {
  up: async (q, S) => {
    // Stage 5 — doc-review / risk on the buy PropertyDeal.
    const d = await q.describeTable('property_deals').catch(() => ({}));
    const addD = async (name, spec) => { if (!d[name]) await q.addColumn('property_deals', name, spec); };
    await addD('risk_flags', { type: S.JSON, allowNull: true });          // [{label, level, note}]
    await addD('risk_acknowledged', { type: S.BOOLEAN, defaultValue: false });
    await addD('risk_ack_at', { type: S.DATE, allowNull: true });

    // Stage 7 — settlement coordination (Seventh Sky does NOT hold funds).
    if (!(await q.describeTable('buyer_settlement_coordination').catch(() => null))) {
      await q.createTable('buyer_settlement_coordination', {
        id: { type: S.INTEGER, autoIncrement: true, primaryKey: true },
        branch_id: { type: S.INTEGER, allowNull: false },
        property_deal_id: { type: S.INTEGER, allowNull: false },
        agreement_date: { type: S.DATEONLY, allowNull: true },
        registration_status: { type: S.ENUM('not_started', 'in_progress', 'registered', 'delayed'), defaultValue: 'not_started' },
        external_settlement_date: { type: S.DATEONLY, allowNull: true },
        payment_tracking_notes: { type: S.TEXT, allowNull: true },
        handover_confirmed: { type: S.BOOLEAN, defaultValue: false },
        notes: { type: S.TEXT, allowNull: true },
        created_by: { type: S.INTEGER, allowNull: true },
        created_at: { type: S.DATE, defaultValue: S.literal('CURRENT_TIMESTAMP') },
        updated_at: { type: S.DATE, defaultValue: S.literal('CURRENT_TIMESTAMP') },
      });
      await q.addIndex('buyer_settlement_coordination', ['branch_id', 'property_deal_id']);
    }
  },
  down: async (q) => {
    await q.dropTable('buyer_settlement_coordination').catch(() => {});
    for (const c of ['risk_flags', 'risk_acknowledged', 'risk_ack_at']) {
      await q.removeColumn('property_deals', c).catch(() => {});
    }
  },
};
