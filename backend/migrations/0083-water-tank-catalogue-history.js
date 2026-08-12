'use strict';

/**
 * Migration 0083: Water Tank — catalogue price history.
 *
 * The catalogue (care_services, vertical water_tank_csa) is the price list every
 * quotation, agreement, invoice and provider rate is built from. Today it can be
 * edited freely and the edit leaves no trace: nobody can answer "what did this
 * service cost in March, and who changed it?" — which is the first question
 * asked when a client disputes a figure.
 *
 * Two problems were verified against this database before writing any of this:
 *
 *   1. Renaming an item REWRITES the name and unit on any Schedule C that is
 *      recomputed, because wtCustomerAgreement.computePricing() resolves each
 *      selected line against the LIVE catalogue and spreads that row in.
 *   2. Archiving an item makes its line SILENTLY VANISH from Schedule C —
 *      computePricing drops any code it cannot resolve. Two lines went in, one
 *      came out, no error.
 *
 * Stored quotation lines were checked too and they do NOT drift — they already
 * snapshot code, name, unit and price. The exposure is specifically on recompute.
 *
 * This table is append-only for the same reason the money ledger is: a price
 * history you can edit is not a history. Every row records what changed, who
 * changed it and when it takes effect.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const D = Sequelize;

    const existing = await queryInterface.describeTable('wt_catalogue_history').catch(() => null);
    if (existing) return;

    await queryInterface.createTable('wt_catalogue_history', {
      id: { type: D.INTEGER, autoIncrement: true, primaryKey: true },
      branch_id: { type: D.INTEGER, allowNull: false, defaultValue: 1 },

      item_id: { type: D.INTEGER, allowNull: false },
      code: { type: D.STRING(60) },
      vertical: { type: D.STRING(60), defaultValue: 'water_tank_csa' },

      // created | price_changed | renamed | archived | restored | cloned
      change_type: { type: D.STRING(30), allowNull: false },

      old_price: { type: D.DECIMAL(15, 2) },
      new_price: { type: D.DECIMAL(15, 2) },
      old_name: { type: D.STRING(255) },
      new_name: { type: D.STRING(255) },
      old_unit: { type: D.STRING(40) },
      new_unit: { type: D.STRING(40) },
      old_active: { type: D.BOOLEAN },
      new_active: { type: D.BOOLEAN },

      // A price agreed today may be intended to apply from next month. Keeping
      // that separate from changed_at is what makes the history answer
      // "what did this cost on <date>" rather than only "when was it edited".
      effective_from: { type: D.DATEONLY },
      reason: { type: D.STRING(255) },

      actor: { type: D.STRING(120) },
      actor_id: { type: D.INTEGER },
      changed_at: { type: D.DATE, allowNull: false, defaultValue: D.literal('CURRENT_TIMESTAMP') },
    });

    await queryInterface.addIndex('wt_catalogue_history', ['branch_id', 'item_id'], { name: 'wt_cat_hist_item' });
    await queryInterface.addIndex('wt_catalogue_history', ['branch_id', 'code'], { name: 'wt_cat_hist_code' });
    await queryInterface.addIndex('wt_catalogue_history', ['changed_at'], { name: 'wt_cat_hist_when' });

    /*
     * Opening row per existing item. Without this the history starts empty and
     * the first edit looks like the item sprang into existence at that price;
     * an opening entry means every item has a knowable starting point.
     */
    const [items] = await queryInterface.sequelize.query(
      "SELECT id, branch_id, code, name, unit, base_price, is_active, created_at FROM care_services WHERE vertical = 'water_tank_csa'",
    );
    for (const it of items || []) {
      await queryInterface.sequelize.query(
        `INSERT INTO wt_catalogue_history
           (branch_id, item_id, code, vertical, change_type, new_price, new_name, new_unit,
            new_active, effective_from, reason, actor, changed_at)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        {
          replacements: [
            it.branch_id || 1, it.id, it.code, 'water_tank_csa', 'created',
            it.base_price, it.name, it.unit, it.is_active == null ? 1 : it.is_active,
            it.created_at ? new Date(it.created_at).toISOString().slice(0, 10) : null,
            'Opening entry — the item as it stood when history began.',
            'System (backfill)', it.created_at || new Date(),
          ],
        },
      );
    }
  },

  async down(queryInterface) {
    await queryInterface.dropTable('wt_catalogue_history').catch(() => {});
  },
};
