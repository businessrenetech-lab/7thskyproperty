'use strict';

/**
 * Scope marketing templates to a property category.
 *
 * `marketing_templates.category` already exists but means the CAMPAIGN type
 * (new_listing, market_report, sold_update, buyer_nurture, seller_engagement), so
 * there was no way to tell a residential email from a commercial one. Every
 * console's Marketing hub therefore listed all 20 templates, 19 of which are
 * written about residential apartments.
 *
 * NULL means "any category" — a market report or an NRB campaign is not specific
 * to one property class — so existing rows keep working untouched until a seed
 * stamps the ones that really are residential.
 *
 * Additive and re-runnable.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const t = await queryInterface.describeTable('marketing_templates');

    if (!t.property_category) {
      await queryInterface.addColumn('marketing_templates', 'property_category', {
        type: Sequelize.STRING(20),
        allowNull: true,
        comment: 'residential | commercial | business | rural; NULL = applies to any category',
      });
    }

    const [idx] = await queryInterface.sequelize.query(
      "SHOW INDEX FROM marketing_templates WHERE Key_name = 'marketing_templates_property_category'",
    );
    if (!idx.length) {
      await queryInterface.addIndex('marketing_templates', ['property_category'], {
        name: 'marketing_templates_property_category',
      });
    }
  },

  async down(queryInterface) {
    const t = await queryInterface.describeTable('marketing_templates');
    if (t.property_category) {
      await queryInterface.removeIndex('marketing_templates', 'marketing_templates_property_category').catch(() => {});
      await queryInterface.removeColumn('marketing_templates', 'property_category');
    }
  },
};
