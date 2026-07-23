'use strict';
/** Property wizard fields: per-utility toggles, structured access contacts,
 *  ownership intent (sole/joint), drawing/dining room counts. */
module.exports = {
  async up(queryInterface, Sequelize) {
    const t = await queryInterface.describeTable('properties');
    if (!t.utilities) {
      await queryInterface.addColumn('properties', 'utilities', { type: Sequelize.JSON, allowNull: true });
    }
    if (!t.access_contacts) {
      await queryInterface.addColumn('properties', 'access_contacts', { type: Sequelize.JSON, allowNull: true });
    }
    if (!t.ownership_type) {
      await queryInterface.addColumn('properties', 'ownership_type', { type: Sequelize.ENUM('sole', 'joint'), allowNull: true });
    }
    if (!t.drawing_rooms) {
      await queryInterface.addColumn('properties', 'drawing_rooms', { type: Sequelize.INTEGER, allowNull: true });
    }
    if (!t.dining_rooms) {
      await queryInterface.addColumn('properties', 'dining_rooms', { type: Sequelize.INTEGER, allowNull: true });
    }
  },
  async down(queryInterface) {
    for (const col of ['utilities', 'access_contacts', 'ownership_type', 'drawing_rooms', 'dining_rooms']) {
      await queryInterface.removeColumn('properties', col).catch(() => {});
    }
  },
};
