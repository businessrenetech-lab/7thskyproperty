'use strict';

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(
      "UPDATE tenancies SET renewal_status = 'none' WHERE renewal_status = 'activated'"
    );
  },

  async down() {
    // Completed renewal cycles cannot be distinguished safely from ordinary rows.
  },
};
