'use strict';

// Dispute management on property_risks (SOP Rural Rental Management §6 Step 4 / §14).
//
// Additive and nullable. The existing `status` enum is NOT altered: status is how
// the risk is managed, dispute_stage is where the dispute has got to. Existing
// rows read as is_dispute = 0, i.e. an ordinary risk, so every current caller and
// the Risk Register screen behave exactly as before.
module.exports = {
  async up(queryInterface, Sequelize) {
    const t = await queryInterface.describeTable('property_risks');
    const add = async (name, type, extra = {}) => {
      if (!t[name]) await queryInterface.addColumn('property_risks', name, { type, allowNull: true, ...extra });
    };
    await add('is_dispute', Sequelize.BOOLEAN, { allowNull: false, defaultValue: false });
    await add('dispute_stage', Sequelize.STRING(20));
    await add('escalated_at', Sequelize.DATE);
    await add('escalated_to', Sequelize.STRING(120));
    await add('resolved_on', Sequelize.DATEONLY);
    await add('resolution', Sequelize.TEXT);
    await add('stage_history', Sequelize.JSON);

    const idx = await queryInterface.showIndex('property_risks');
    if (!idx.map((i) => i.name).includes('property_risks_is_dispute')) {
      await queryInterface.addIndex('property_risks', ['is_dispute'], { name: 'property_risks_is_dispute' });
    }
  },
  async down(queryInterface) {
    const t = await queryInterface.describeTable('property_risks');
    for (const c of ['is_dispute', 'dispute_stage', 'escalated_at', 'escalated_to',
      'resolved_on', 'resolution', 'stage_history']) {
      if (t[c]) await queryInterface.removeColumn('property_risks', c);
    }
  },
};
