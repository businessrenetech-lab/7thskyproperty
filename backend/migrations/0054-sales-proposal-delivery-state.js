'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.changeColumn('sale_proposals', 'status', {
      type: Sequelize.ENUM('draft', 'generated', 'sending', 'sent', 'accepted', 'rejected', 'expired'),
      allowNull: false,
      defaultValue: 'draft',
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.query("UPDATE sale_proposals SET status = 'generated' WHERE status = 'sending'");
    await queryInterface.changeColumn('sale_proposals', 'status', {
      type: Sequelize.ENUM('draft', 'generated', 'sent', 'accepted', 'rejected', 'expired'),
      allowNull: false,
      defaultValue: 'draft',
    });
  },
};
