'use strict';

/**
 * Migration 0091: disbursements Seventh Sky makes itself, and their vouchers.
 *
 * The gap this closes was named plainly: not every payment goes to a service
 * provider. Seventh Sky buys chemicals, hires a vehicle, pays a government fee,
 * settles a day-labourer. Today that money either goes unrecorded or lands in
 * `wt_project_disbursements`, which the money ledger has never seen — so the
 * Payments screen's "disbursed" figure counts provider payouts only, and the
 * margin it derives is overstated by every taka the business spent on itself.
 *
 * Three changes make this table a first-class part of the books.
 *
 *   `project_code` becomes NULLABLE. A direct cost is often not attributable to
 *   one project — a drum of hypochlorite covers six jobs — and forcing a project
 *   onto it means someone picks one at random, which is worse than no answer.
 *
 *   `voucher_no` and `batch_ref`. Every disbursement produces a numbered,
 *   branded payment voucher: it is what the recipient signs and what an auditor
 *   asks for. `batch_ref` groups the ones paid in a single banking run.
 *
 *   `money_event_id` ties the row to its ledger entry, so the register and the
 *   journal can never disagree about whether the money actually moved.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const D = Sequelize;
    const table = 'wt_project_disbursements';
    const described = await queryInterface.describeTable(table).catch(() => null);
    if (!described) return;

    // A direct cost need not belong to a project.
    await queryInterface.changeColumn(table, 'project_code', { type: D.STRING(30), allowNull: true }).catch(() => {});

    const columns = {
      // 'provider' — a payout against a work order, gated by the signed
      // agreement. 'direct' — Seventh Sky paid it itself; there is nothing to
      // gate because the money has already gone.
      disbursement_type: { type: D.STRING(20), defaultValue: 'direct' },
      voucher_no: { type: D.STRING(30) },
      batch_ref: { type: D.STRING(40) },
      work_order_id: { type: D.INTEGER },
      money_event_id: { type: D.INTEGER },
      // Free text, because the whole point is that this payee is not on any
      // list — a hardware shop, a rickshaw van, a ward office.
      payee_details: { type: D.TEXT },
      paid_by: { type: D.STRING(120) },
      voucher_issued_at: { type: D.DATE },
    };

    for (const [name, spec] of Object.entries(columns)) {
      if (described[name]) continue;
      await queryInterface.addColumn(table, name, spec);
    }

    await queryInterface.addIndex(table, ['branch_id', 'batch_ref'], { name: 'wt_disb_batch' }).catch(() => {});
    await queryInterface.addIndex(table, ['branch_id', 'voucher_no'], { name: 'wt_disb_voucher' }).catch(() => {});
  },

  async down(queryInterface) {
    const table = 'wt_project_disbursements';
    for (const idx of ['wt_disb_batch', 'wt_disb_voucher']) {
      await queryInterface.removeIndex(table, idx).catch(() => {});
    }
    for (const c of ['disbursement_type', 'voucher_no', 'batch_ref', 'work_order_id',
      'money_event_id', 'payee_details', 'paid_by', 'voucher_issued_at']) {
      await queryInterface.removeColumn(table, c).catch(() => {});
    }
  },
};
