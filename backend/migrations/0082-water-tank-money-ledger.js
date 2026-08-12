'use strict';

/**
 * Migration 0082: Water Tank — the money ledger.
 *
 * Until now, money lived only as mutable columns: wt_invoices.paid_amount and
 * wt_work_orders.provider_paid_amount, each incremented in place, with a JSON
 * `payments` array alongside as an informal receipt list. Two different routes
 * wrote them with different rules, neither in a transaction, so a double-clicked
 * "record payment" posted twice and a correction meant editing history until the
 * columns and the JSON no longer agreed.
 *
 * This table replaces that with an APPEND-ONLY ledger.
 *
 *   - A receipt or a payout is one row. Rows are never updated or deleted.
 *   - A correction is a COMPENSATING ROW carrying a negative amount and pointing
 *     at what it reverses, so the mistake and the fix both stay on the record.
 *     That is what an auditor needs to see; an edited row destroys the evidence.
 *   - `amount` is therefore SIGNED — the balance of anything is simply the sum of
 *     its rows, which is an arithmetic that cannot drift.
 *   - `idempotency_key` is unique per branch. A retried or double-clicked request
 *     carrying the same key hits the unique index and returns the ORIGINAL row
 *     instead of posting a second one.
 *
 * The existing columns stay as a derived cache so the registers keep working;
 * they are recomputed from this table rather than incremented. History already
 * recorded in the JSON `payments` arrays is backfilled below so no receipt is
 * lost, and each backfilled row is marked with its origin.
 *
 * There is no updated_at: a row that can be updated is not a ledger.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const D = Sequelize;
    const table = await queryInterface.describeTable('wt_invoices').catch(() => null);
    if (!table) return; // water-tank tables absent — nothing to extend

    const existing = await queryInterface.describeTable('wt_money_events').catch(() => null);
    if (!existing) {
      await queryInterface.createTable('wt_money_events', {
        id: { type: D.INTEGER, autoIncrement: true, primaryKey: true },
        branch_id: { type: D.INTEGER, allowNull: false, defaultValue: 1 },

        // client_receipt | provider_payout, and their *_reversal counterparts
        event_type: { type: D.STRING(40), allowNull: false },
        // 'in' = money received from a client, 'out' = money paid to a provider.
        // A reversal keeps its original direction and flips the sign instead, so
        // "everything received" stays one filter rather than two.
        direction: { type: D.STRING(4), allowNull: false },

        subject_type: { type: D.STRING(20), allowNull: false }, // invoice | work_order
        subject_id: { type: D.INTEGER, allowNull: false },
        subject_code: { type: D.STRING(30) },

        // Signed: positive posts, negative reverses. Balance = SUM(amount).
        amount: { type: D.DECIMAL(15, 2), allowNull: false },
        currency: { type: D.STRING(8), defaultValue: 'BDT' },

        method: { type: D.STRING(40) },
        reference: { type: D.STRING(120) },
        received_on: { type: D.DATEONLY },

        idempotency_key: { type: D.STRING(120), allowNull: false },
        reverses_event_id: { type: D.INTEGER },
        reversal_reason: { type: D.STRING(255) },

        // denormalised for reporting without a join
        project_id: { type: D.STRING(30) },
        client_name: { type: D.STRING(200) },
        provider_name: { type: D.STRING(160) },

        note: { type: D.TEXT },
        origin: { type: D.STRING(40), defaultValue: 'api' }, // api | backfill | system
        actor: { type: D.STRING(120) },
        actor_id: { type: D.INTEGER },
        created_at: { type: D.DATE, allowNull: false, defaultValue: D.literal('CURRENT_TIMESTAMP') },
      });

      await queryInterface.addIndex('wt_money_events', ['branch_id', 'idempotency_key'], {
        unique: true, name: 'wt_money_events_idem',
      });
      await queryInterface.addIndex('wt_money_events', ['branch_id', 'subject_type', 'subject_id'], {
        name: 'wt_money_events_subject',
      });
      await queryInterface.addIndex('wt_money_events', ['branch_id', 'created_at'], {
        name: 'wt_money_events_created',
      });
    }

    /*
     * Backfill. Every payment already recorded in wt_invoices.payments becomes a
     * ledger row, so the ledger is the complete history from day one rather than
     * only from deployment. Keyed by invoice + index so re-running is safe.
     */
    const [invoices] = await queryInterface.sequelize.query(
      "SELECT id, branch_id, code, client_name, project_id, payments, paid_amount FROM wt_invoices WHERE payments IS NOT NULL AND payments <> '[]'",
    );
    for (const inv of invoices || []) {
      let rows = inv.payments;
      if (typeof rows === 'string') { try { rows = JSON.parse(rows); } catch { rows = []; } }
      if (!Array.isArray(rows)) rows = [];
      for (let i = 0; i < rows.length; i++) {
        const p = rows[i] || {};
        const amount = Number(p.amount || 0);
        if (!(amount > 0)) continue;
        await queryInterface.sequelize.query(
          `INSERT IGNORE INTO wt_money_events
             (branch_id, event_type, direction, subject_type, subject_id, subject_code,
              amount, method, reference, received_on, idempotency_key, project_id,
              client_name, note, origin, actor, created_at)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
          {
            replacements: [
              inv.branch_id || 1, 'client_receipt', 'in', 'invoice', inv.id, inv.code,
              amount, p.method || null, p.reference || null,
              (p.received_on || String(p.at || '').slice(0, 10)) || null,
              `backfill:invoice:${inv.id}:${i}`, inv.project_id || null,
              inv.client_name || null, 'Backfilled from the invoice payments history.',
              'backfill', p.by || null, p.at ? new Date(p.at) : new Date(),
            ],
          },
        );
      }
    }

    /*
     * Provider payouts were only ever a running total (provider_paid_amount) with
     * no per-payment history, so the best available truth is a single opening row
     * per work order for the amount paid to date.
     */
    const [wos] = await queryInterface.sequelize.query(
      'SELECT id, branch_id, code, client_name, provider_name, project_id, provider_paid_amount, payout_date, payout_method, payout_reference FROM wt_work_orders WHERE provider_paid_amount > 0',
    );
    for (const wo of wos || []) {
      await queryInterface.sequelize.query(
        `INSERT IGNORE INTO wt_money_events
           (branch_id, event_type, direction, subject_type, subject_id, subject_code,
            amount, method, reference, received_on, idempotency_key, project_id,
            client_name, provider_name, note, origin, created_at)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        {
          replacements: [
            wo.branch_id || 1, 'provider_payout', 'out', 'work_order', wo.id, wo.code,
            Number(wo.provider_paid_amount || 0), wo.payout_method || null,
            wo.payout_reference || null, wo.payout_date || null,
            `backfill:work_order:${wo.id}:opening`, wo.project_id || null,
            wo.client_name || null, wo.provider_name || null,
            'Opening balance backfilled from the payout total recorded before the ledger existed.',
            'backfill', new Date(),
          ],
        },
      );
    }
  },

  async down(queryInterface) {
    await queryInterface.dropTable('wt_money_events').catch(() => {});
  },
};
