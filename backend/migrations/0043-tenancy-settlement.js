'use strict';
/** End/terminate settlement: signed net (refund vs collect) + money-movement columns;
 *  tenancy end metadata. */
module.exports = {
  async up(queryInterface, Sequelize) {
    const ds = await queryInterface.describeTable('deposit_settlements');
    const addDs = async (col, spec) => { if (!ds[col]) await queryInterface.addColumn('deposit_settlements', col, spec); };
    if (!ds.settlement_direction) {
      await queryInterface.addColumn('deposit_settlements', 'settlement_direction', { type: Sequelize.ENUM('refund', 'collect', 'nil'), allowNull: false, defaultValue: 'nil' });
    }
    await addDs('net_position', { type: Sequelize.DECIMAL(15, 2), defaultValue: 0 });
    await addDs('amount_to_collect', { type: Sequelize.DECIMAL(15, 2), defaultValue: 0 });
    await addDs('owner_funded', { type: Sequelize.BOOLEAN, defaultValue: false });
    await addDs('collected_at', { type: Sequelize.DATE, allowNull: true });
    await addDs('collection_method', { type: Sequelize.STRING(40), allowNull: true });
    await addDs('collection_reference', { type: Sequelize.STRING, allowNull: true });

    const tn = await queryInterface.describeTable('tenancies');
    const addTn = async (col, spec) => { if (!tn[col]) await queryInterface.addColumn('tenancies', col, spec); };
    if (!tn.end_type) {
      await queryInterface.addColumn('tenancies', 'end_type', { type: Sequelize.ENUM('expiry', 'termination'), allowNull: true });
    }
    await addTn('termination_reason', { type: Sequelize.STRING, allowNull: true });
    await addTn('termination_effective_date', { type: Sequelize.DATEONLY, allowNull: true });
  },
  async down(queryInterface) {
    for (const c of ['settlement_direction', 'net_position', 'amount_to_collect', 'owner_funded', 'collected_at', 'collection_method', 'collection_reference']) {
      await queryInterface.removeColumn('deposit_settlements', c).catch(() => {});
    }
    for (const c of ['end_type', 'termination_reason', 'termination_effective_date']) {
      await queryInterface.removeColumn('tenancies', c).catch(() => {});
    }
  },
};
