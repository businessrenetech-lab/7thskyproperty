'use strict';

/**
 * Migration 0092: owner disbursements for Short Term Stay.
 *
 * Paying an owner today means setting three columns on their statement —
 * `disbursement_date`, `disbursement_reference`, `disbursement_method` — and
 * flipping a status. That is a note that money moved, not a record of it. It
 * cannot be reversed (a paid statement may only go to `closed`), it produces no
 * document the owner can be given, and the payment appears in no journal.
 *
 * This gives owner money the same treatment provider money already has:
 *
 *   `sts_money_events` — append-only. A correction is a new row with a negative
 *   amount pointing at what it reverses, never an edit. Every post carries an
 *   idempotency key unique per branch, so a double-clicked button or a retried
 *   request gets the ORIGINAL row back and the money moves exactly once.
 *
 *   `sts_owner_disbursements` — the register, one row per payment, carrying the
 *   numbered voucher the owner signs and the batch reference that groups a
 *   payment run into the single bank line it actually was.
 *
 * A SEPARATE table from `wt_money_events`, deliberately. The Water Tank journal
 * and bank statement query on branch alone with no vertical filter, so putting
 * short-stay money in that table would silently change Water Tank's reported
 * cash and margin. Two service lines, two sets of books.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const D = Sequelize;

    const described = await queryInterface.describeTable('sts_money_events').catch(() => null);
    if (!described) {
      await queryInterface.createTable('sts_money_events', {
        id: { type: D.INTEGER, autoIncrement: true, primaryKey: true },
        branch_id: { type: D.INTEGER, allowNull: false },
        event_type: { type: D.STRING(40), allowNull: false },
        direction: { type: D.STRING(4), allowNull: false },
        // 'owner_statement' today; the column exists so a guest refund or a
        // supplier payment can join the same books without a migration.
        subject_type: { type: D.STRING(20), allowNull: false },
        subject_id: { type: D.INTEGER, allowNull: false },
        subject_code: D.STRING(40),
        amount: { type: D.DECIMAL(15, 2), allowNull: false },
        currency: { type: D.STRING(8), defaultValue: 'BDT' },
        method: D.STRING(40),
        reference: D.STRING(120),
        received_on: D.DATEONLY,
        // Unique per branch: this is what makes a replayed request safe.
        idempotency_key: { type: D.STRING(120), allowNull: false },
        reverses_event_id: D.INTEGER,
        reversal_reason: D.STRING(255),
        batch_ref: D.STRING(40),
        owner_contact_id: D.INTEGER,
        owner_name: D.STRING(200),
        property_id: D.INTEGER,
        note: D.TEXT,
        origin: { type: D.STRING(40), defaultValue: 'api' },
        actor: D.STRING(120),
        actor_id: D.INTEGER,
        created_at: { type: D.DATE, defaultValue: D.NOW },
      });
      await queryInterface.addIndex('sts_money_events', ['branch_id', 'idempotency_key'], {
        unique: true, name: 'sts_money_events_idem',
      });
      await queryInterface.addIndex('sts_money_events', ['branch_id', 'subject_type', 'subject_id'], {
        name: 'sts_money_events_subject',
      });
      await queryInterface.addIndex('sts_money_events', ['branch_id', 'batch_ref'], {
        name: 'sts_money_events_batch',
      });
    }

    const disb = await queryInterface.describeTable('sts_owner_disbursements').catch(() => null);
    if (!disb) {
      await queryInterface.createTable('sts_owner_disbursements', {
        id: { type: D.INTEGER, autoIncrement: true, primaryKey: true },
        branch_id: { type: D.INTEGER, allowNull: false },
        code: { type: D.STRING(30), allowNull: false, unique: true },
        voucher_no: D.STRING(30),
        batch_ref: D.STRING(40),
        // The statement being settled. Nullable so an ad-hoc payment to an owner
        // — an advance, a correction agreed by hand — can still be vouched for
        // rather than going unrecorded because it fits no statement.
        statement_id: D.INTEGER,
        statement_code: D.STRING(40),
        owner_contact_id: { type: D.INTEGER, allowNull: false },
        owner_name: D.STRING(200),
        property_id: D.INTEGER,
        property_label: D.STRING(255),
        period_label: D.STRING(60),
        description: D.TEXT,
        amount: { type: D.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
        method: D.STRING(40),
        reference: D.STRING(120),
        paid_on: D.DATEONLY,
        status: { type: D.STRING(30), defaultValue: 'Paid' },
        money_event_id: D.INTEGER,
        paid_by: D.STRING(120),
        approved_by: D.STRING(120),
        voucher_issued_at: D.DATE,
        notes: D.TEXT,
        created_at: { type: D.DATE, defaultValue: D.NOW },
        updated_at: { type: D.DATE, defaultValue: D.NOW },
      });
      await queryInterface.addIndex('sts_owner_disbursements', ['branch_id', 'batch_ref'], { name: 'sts_disb_batch' });
      await queryInterface.addIndex('sts_owner_disbursements', ['branch_id', 'voucher_no'], { name: 'sts_disb_voucher' });
      await queryInterface.addIndex('sts_owner_disbursements', ['branch_id', 'statement_id'], { name: 'sts_disb_statement' });
    }
  },

  async down(queryInterface) {
    await queryInterface.dropTable('sts_owner_disbursements').catch(() => {});
    await queryInterface.dropTable('sts_money_events').catch(() => {});
  },
};
