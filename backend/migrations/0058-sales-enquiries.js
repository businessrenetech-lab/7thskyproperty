'use strict';
/** Buyer enquiries for sale properties — the pipeline before an offer. */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tables = (await queryInterface.showAllTables()).map((t) => String(t).toLowerCase());
    if (tables.includes('sales_enquiries')) return;
    await queryInterface.createTable('sales_enquiries', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      branch_id: { type: Sequelize.INTEGER, allowNull: false },
      enquiry_code: { type: Sequelize.STRING(40), unique: true },
      property_id: { type: Sequelize.INTEGER },
      contact_id: { type: Sequelize.INTEGER },
      client_id: { type: Sequelize.INTEGER },
      enquirer_name: { type: Sequelize.STRING, allowNull: false },
      phone: { type: Sequelize.STRING },
      email: { type: Sequelize.STRING },
      source: { type: Sequelize.STRING },
      budget: { type: Sequelize.DECIMAL(15, 2) },
      preferred_area: { type: Sequelize.STRING },
      message: { type: Sequelize.TEXT },
      viewing_date: { type: Sequelize.DATE },
      stage: { type: Sequelize.ENUM('new', 'contacted', 'viewing_scheduled', 'viewed', 'offer_made', 'converted', 'rejected'), allowNull: false, defaultValue: 'new' },
      assigned_officer_id: { type: Sequelize.INTEGER },
      next_action: { type: Sequelize.STRING },
      follow_up_date: { type: Sequelize.DATEONLY },
      notes: { type: Sequelize.TEXT },
      converted_offer_id: { type: Sequelize.INTEGER },
      created_by: { type: Sequelize.INTEGER },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });
    await queryInterface.addIndex('sales_enquiries', ['branch_id', 'stage'], { name: 'idx_sales_enquiries_branch_stage' });
    await queryInterface.addIndex('sales_enquiries', ['property_id'], { name: 'idx_sales_enquiries_property' });
    await queryInterface.addIndex('sales_enquiries', ['contact_id'], { name: 'idx_sales_enquiries_contact' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('sales_enquiries').catch(() => {});
  },
};
