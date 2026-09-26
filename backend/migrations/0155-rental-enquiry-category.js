'use strict';

// A rental enquiry belongs to a console. Until now it was inferred by inner-joining
// the property, so enquiries with no property were invisible in every console.
// Back-filled from the joined property only — never guessed.
module.exports = {
  async up(queryInterface, Sequelize) {
    const t = await queryInterface.describeTable('rental_enquiries');
    if (!t.category) {
      await queryInterface.addColumn('rental_enquiries', 'category', { type: Sequelize.STRING(20), allowNull: true });
      await queryInterface.sequelize.query(`
        UPDATE rental_enquiries re
          JOIN properties p ON p.id = re.property_id
           SET re.category = p.category
         WHERE re.category IS NULL`);
      // Enquiries with no property: residential, so they appear on a desk.
      await queryInterface.sequelize.query(
        "UPDATE rental_enquiries SET category = 'residential' WHERE category IS NULL");
    }
  },
  async down(queryInterface) {
    const t = await queryInterface.describeTable('rental_enquiries');
    if (t.category) await queryInterface.removeColumn('rental_enquiries', 'category');
  },
};
