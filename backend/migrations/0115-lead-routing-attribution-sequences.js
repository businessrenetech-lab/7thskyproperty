'use strict';
// Phase 6 sub-project B — lead routing rules, first-touch UTM attribution, and
// follow-up sequences. Additive: two config tables + columns on sales_enquiries.
module.exports = {
  up: async (q, S) => {
    // ── sales_enquiries: attribution + routing audit + sequence state ──
    const cols = await q.describeTable('sales_enquiries').catch(() => ({}));
    const add = async (name, spec) => { if (!cols[name]) await q.addColumn('sales_enquiries', name, spec); };
    await add('utm_source', { type: S.STRING, allowNull: true });
    await add('utm_medium', { type: S.STRING, allowNull: true });
    await add('utm_campaign', { type: S.STRING, allowNull: true });
    await add('routing_rule_id', { type: S.INTEGER, allowNull: true });
    await add('sequence_id', { type: S.INTEGER, allowNull: true });
    await add('sequence_status', { type: S.ENUM('active', 'paused', 'completed', 'stopped'), allowNull: true });
    await add('sequence_enrolled_at', { type: S.DATE, allowNull: true });

    // ── lead_routing_rules ──
    if (!(await q.describeTable('lead_routing_rules').catch(() => null))) {
      await q.createTable('lead_routing_rules', {
        id: { type: S.INTEGER, autoIncrement: true, primaryKey: true },
        branch_id: { type: S.INTEGER, allowNull: false },
        name: { type: S.STRING, allowNull: false },
        priority: { type: S.INTEGER, defaultValue: 100 },
        match_category: { type: S.STRING, allowNull: true },
        match_area: { type: S.STRING, allowNull: true },
        match_source: { type: S.STRING, allowNull: true },
        assign_to: { type: S.INTEGER, allowNull: true },
        assign_pool: { type: S.JSON, allowNull: true },
        default_sequence_id: { type: S.INTEGER, allowNull: true },
        active: { type: S.BOOLEAN, defaultValue: true },
        created_by: { type: S.INTEGER, allowNull: true },
        created_at: { type: S.DATE, defaultValue: S.literal('CURRENT_TIMESTAMP') },
        updated_at: { type: S.DATE, defaultValue: S.literal('CURRENT_TIMESTAMP') },
      });
      await q.addIndex('lead_routing_rules', ['branch_id', 'active', 'priority']);
    }

    // ── lead_sequences ──
    if (!(await q.describeTable('lead_sequences').catch(() => null))) {
      await q.createTable('lead_sequences', {
        id: { type: S.INTEGER, autoIncrement: true, primaryKey: true },
        branch_id: { type: S.INTEGER, allowNull: false },
        name: { type: S.STRING, allowNull: false },
        active: { type: S.BOOLEAN, defaultValue: true },
        steps: { type: S.JSON, allowNull: true },
        created_by: { type: S.INTEGER, allowNull: true },
        created_at: { type: S.DATE, defaultValue: S.literal('CURRENT_TIMESTAMP') },
        updated_at: { type: S.DATE, defaultValue: S.literal('CURRENT_TIMESTAMP') },
      });
      await q.addIndex('lead_sequences', ['branch_id', 'active']);
    }
  },
  down: async (q) => {
    await q.dropTable('lead_sequences').catch(() => {});
    await q.dropTable('lead_routing_rules').catch(() => {});
    for (const c of ['utm_source', 'utm_medium', 'utm_campaign', 'routing_rule_id', 'sequence_id', 'sequence_status', 'sequence_enrolled_at']) {
      await q.removeColumn('sales_enquiries', c).catch(() => {});
    }
  },
};
