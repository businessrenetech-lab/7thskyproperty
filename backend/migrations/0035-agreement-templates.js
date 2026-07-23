'use strict';

/**
 * 0035 — dynamic agreement templates. An uploaded .docx becomes a reusable
 * template: fixed HTML with {{field}} tokens + a field schema + signer roles.
 * Staff fill the fields from the frontend; the merged document goes to eSign.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const { INTEGER, STRING, TEXT, JSON: JSONT, DATE, ENUM } = Sequelize;
    const qi = queryInterface;
    if (await qi.describeTable('agreement_templates').then(() => true).catch(() => false)) return;
    await qi.createTable('agreement_templates', {
      id: { type: INTEGER, autoIncrement: true, primaryKey: true },
      branch_id: { type: INTEGER },
      name: { type: STRING, allowNull: false },
      category: { type: STRING(60), defaultValue: 'other' },   // customer_service / provider_master / tenancy / …
      vertical: { type: STRING(60) },
      description: { type: TEXT },
      content_html: { type: 'LONGTEXT' },
      fields: { type: JSONT, defaultValue: [] },
      signers: { type: JSONT, defaultValue: [] },
      source_filename: { type: STRING },
      status: { type: ENUM('draft', 'active', 'archived'), defaultValue: 'active' },
      created_by: { type: INTEGER },
      created_at: { type: DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP') },
    });
    await qi.addIndex('agreement_templates', ['category'], { name: 'idx_agrtpl_category' });
  },
  async down(queryInterface) { await queryInterface.dropTable('agreement_templates').catch(() => {}); },
};
